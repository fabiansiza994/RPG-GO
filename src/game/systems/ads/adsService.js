/* ============================================================
   AdsService — única puerta de entrada que main.js debe usar. Coordina
   AdsProvider + ConsentManager + RewardedAdManager + AdsFrequencyController +
   transacciones + persistencia + analítica.

   IMPORTANTE: este servicio NUNCA toca `player` — devuelve QUÉ recompensa
   corresponde tras un anuncio completado; aplicarla (oro, HP, etc.) y
   llamar a saveGame() es responsabilidad de main.js, exactamente igual que
   dailyMissionsService/adventurerContractsService. Así ningún sistema de
   monetización queda acoplado a los componentes de combate.
   ============================================================ */
import {
  ADS_CONFIG, PLACEMENT_CONFIG, GLOBAL_LIMITS, MAX_PROCESSED_TRANSACTION_IDS, HISTORY_MAX_ENTRIES,
} from "../../config/ads.config.js";
import { createAdsProvider } from "./adsProvider.js";
import { createNoOpAdsProvider } from "./noOpAdsProvider.js";
import { createConsentManager } from "./consentManager.js";
import { createRewardedAdManager } from "./rewardedAdManager.js";
import { createAdsRepository, createInMemoryStorage } from "./adsRepository.js";
import {
  ensureFreshDay, resetSession, checkEligibility, recordUsage, forgetBattle as forgetBattleFrequency,
} from "./adsFrequencyController.js";
import { getNextAvailability, detectSuspiciousTimeChange } from "./adsClock.js";
import {
  createTransaction, markAdStarted, markRewardEarned, markApplied, markFailed, markCancelled,
} from "./adRewardTransactions.js";
import { trackAdEvent, AD_ANALYTICS_EVENTS as EVT } from "./adsAnalytics.js";

export function createAdsService(){
  let provider = createNoOpAdsProvider();
  let consentManager = null;
  let rewardedAdManager = null;
  let repository = null;
  let root = null;
  let sessionId = null;
  let initPromise = null;
  let clockSuspicious = false;
  const showingMutex = new Set(); // placements con un anuncio mostrándose AHORA — nunca dos a la vez

  async function persist(){ if(repository) await repository.save(root); }

  function moveTransactionToHistory(tx){
    delete root.transactions.active[tx.id];
    root.transactions.history.push({
      id: tx.id, placement: tx.placement, status: tx.status, rewardType: tx.rewardType,
      rewardAmount: tx.rewardAmount, createdAt: tx.createdAt, appliedAt: tx.appliedAt, errorCode: tx.errorCode,
    });
    if(root.transactions.history.length > HISTORY_MAX_ENTRIES){
      root.transactions.history.splice(0, root.transactions.history.length - HISTORY_MAX_ENTRIES);
    }
  }

  async function init({ storage, getSessionId, forceMock, mockOptions } = {}){
    if(initPromise) return initPromise;
    initPromise = (async ()=>{
      sessionId = (getSessionId && getSessionId()) || `session_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      repository = createAdsRepository(storage || createInMemoryStorage());
      root = await repository.load();

      const now = new Date();
      clockSuspicious = detectSuspiciousTimeChange(root.lastKnownTimestamp, now);
      if(clockSuspicious){
        console.warn("[ADS] retroceso de reloj sospechoso — recompensas publicitarias desactivadas temporalmente hasta que el reloj sea coherente de nuevo.");
      } else {
        root.lastKnownTimestamp = Math.max(root.lastKnownTimestamp||0, now.getTime());
      }
      ensureFreshDay(root.frequency, now);
      resetSession(root.frequency); // nueva sesión de la app — contadores de sesión en cero
      await persist();

      try{
        provider = await createAdsProvider({ forceMock, mockOptions });
        await provider.initialize();
      }catch(e){
        console.warn("[ADS] no se pudo inicializar el proveedor de anuncios — el juego sigue funcionando sin publicidad.", e);
        provider = createNoOpAdsProvider();
      }
      consentManager = createConsentManager(provider);
      rewardedAdManager = createRewardedAdManager(provider);

      if(provider.isSupported()){
        await consentManager.requestConsentInfoUpdate();
        if(consentManager.getStatus() === "REQUIRED"){
          await consentManager.loadAndShowConsentFormIfRequired();
        }
        trackAdEvent(EVT.CONSENT_UPDATED, { status: consentManager.getStatus() });
      }

      return { ready: true, adsSupported: provider.isSupported() };
    })();
    return initPromise;
  }

  function isPlacementConfigured(placement){
    return !!PLACEMENT_CONFIG[placement];
  }

  /**
   * Disponibilidad "dura" (la que de verdad decide si se puede pedir el
   * anuncio) — no confundir con getPlacementUiState(), que además distingue
   * "elegible pero todavía cargando" para no dejar la UI en blanco.
   */
  function checkAvailability(placement, context = {}){
    if(!ADS_CONFIG.enabled) return { available: false, reason: "ADS_DISABLED" };
    const placementCfg = PLACEMENT_CONFIG[placement];
    if(!placementCfg || !placementCfg.enabled) return { available: false, reason: "PLACEMENT_DISABLED" };
    if(!provider.isSupported()) return { available: false, reason: "NOT_SUPPORTED" };
    if(clockSuspicious) return { available: false, reason: "CLOCK_SUSPICIOUS" };
    if(!consentManager || !consentManager.canRequestAds()) return { available: false, reason: "CONSENT_REQUIRED" };
    const freq = checkEligibility(root.frequency, placement, placementCfg, GLOBAL_LIMITS, context);
    if(!freq.eligible) return { available: false, reason: freq.reason };
    if(!rewardedAdManager.isReady(placement)) return { available: false, reason: "NOT_READY" };
    return { available: true };
  }

  /**
   * Estado pensado directamente para pintar el botón/tarjeta de un
   * placement: HIDDEN (nunca mostrar nada), LIMIT_REACHED, COOLDOWN,
   * LOADING, NOT_LOADED (elegible, todavía sin precargar), READY.
   */
  function getPlacementUiState(placement, context = {}){
    const placementCfg = PLACEMENT_CONFIG[placement];
    if(!ADS_CONFIG.enabled || !placementCfg || !placementCfg.enabled) return { state: "HIDDEN" };
    if(!provider.isSupported()) return { state: "HIDDEN" };
    if(clockSuspicious) return { state: "HIDDEN" };
    if(!consentManager || !consentManager.canRequestAds()) return { state: "HIDDEN" };

    const freq = checkEligibility(root.frequency, placement, placementCfg, GLOBAL_LIMITS, context);
    if(!freq.eligible){
      if(freq.reason === "daily_limit" || freq.reason === "global_daily_limit"){
        return { state: "LIMIT_REACHED", reason: freq.reason };
      }
      if(freq.reason === "cooldown" || freq.reason === "global_cooldown"){
        const lastShownAt = (root.frequency.lastShownAt||{})[placement];
        return { state: "COOLDOWN", reason: freq.reason, availableAt: getNextAvailability(lastShownAt, placementCfg.cooldownSeconds) };
      }
      return { state: "UNAVAILABLE", reason: freq.reason };
    }
    if(rewardedAdManager.isReady(placement)) return { state: "READY" };
    const status = rewardedAdManager.getStatus(placement).status;
    if(status === "LOADING") return { state: "LOADING" };
    return { state: "NOT_LOADED" };
  }

  async function preloadPlacement(placement, context = {}){
    if(!provider.isSupported() || !consentManager || !consentManager.canRequestAds()) return;
    const placementCfg = PLACEMENT_CONFIG[placement];
    if(!placementCfg || !placementCfg.enabled) return;
    const freq = checkEligibility(root.frequency, placement, placementCfg, GLOBAL_LIMITS, context);
    if(!freq.eligible) return; // no malgastar una carga si de todos modos no se podría mostrar
    trackAdEvent(EVT.LOAD_STARTED, { placement });
    const result = await rewardedAdManager.loadWithBackoff(placement);
    trackAdEvent(result.ok ? EVT.LOADED : EVT.LOAD_FAILED, { placement, reason: result.reason });
  }

  /**
   * Punto único para "el jugador tocó el botón de anuncio". Válida
   * elegibilidad, evita doble-tap (mutex por placement), muestra el
   * anuncio, y SOLO si el SDK confirma la recompensa crea+avanza la
   * transacción y registra el uso en el controlador de frecuencia.
   *
   * Nunca aplica la recompensa al jugador acá — devuelve
   * {ok:true, transactionId, rewardType, rewardAmount} para que main.js la
   * aplique y luego llame a confirmRewardApplied(transactionId).
   */
  async function requestReward(placement, context = {}){
    if(showingMutex.has(placement)) return { ok: false, reason: "ALREADY_SHOWING" };
    const availability = checkAvailability(placement, context);
    if(!availability.available){
      trackAdEvent(EVT.OFFER_DECLINED, { placement, reason: availability.reason });
      return { ok: false, reason: availability.reason };
    }

    showingMutex.add(placement);
    try{
      trackAdEvent(EVT.OFFER_CLICKED, { placement });
      const placementCfg = PLACEMENT_CONFIG[placement];
      const tx = createTransaction({
        placement, sessionId, rewardType: placementCfg.rewardType, rewardAmount: placementCfg.rewardAmount,
        characterId: context.characterId, battleId: context.battleId, metadata: context.metadata,
      });
      root.transactions.active[tx.id] = tx;
      await persist();

      markAdStarted(tx);
      await persist();
      trackAdEvent(EVT.SHOW_STARTED, { placement });

      const showResult = await rewardedAdManager.show(placement, { rewardType: tx.rewardType, rewardAmount: tx.rewardAmount, ...context });

      if(!showResult.ok){
        markFailed(tx, showResult.reason);
        moveTransactionToHistory(tx);
        await persist();
        trackAdEvent(showResult.reason === "CLOSED_WITHOUT_REWARD" ? EVT.CLOSED : EVT.SHOW_FAILED, { placement, reason: showResult.reason });
        // Nunca se consume límite ni se marca recompensa entregada si el anuncio no se completó.
        preloadPlacement(placement, context); // deja uno nuevo precargándose para el próximo intento
        return { ok: false, reason: showResult.reason };
      }

      const earnResult = markRewardEarned(tx, showResult.adResponseId);
      if(!earnResult.ok){
        // Estado inesperado (ej. doble callback) — no se aplica nada.
        moveTransactionToHistory(tx);
        await persist();
        return { ok: false, reason: "DUPLICATE_CALLBACK" };
      }
      trackAdEvent(EVT.REWARD_EARNED, { placement, rewardType: tx.rewardType, rewardAmount: tx.rewardAmount });
      recordUsage(root.frequency, placement, { battleId: context.battleId });
      await persist();

      // A propósito se usa SIEMPRE tx.rewardType/tx.rewardAmount (definidos por
      // PLACEMENT_CONFIG al crear la transacción), no lo que reporte el SDK: el
      // "reward item" de AdMob es una configuración propia de cada unidad en la
      // consola de Google, no tiene por qué coincidir con nuestra economía del
      // juego — el SDK solo confirma QUE se ganó una recompensa, nunca decide CUÁL.
      return {
        ok: true, transactionId: tx.id, placement,
        rewardType: tx.rewardType,
        rewardAmount: tx.rewardAmount,
      };
    } finally {
      showingMutex.delete(placement);
    }
  }

  /** main.js llama a esto INMEDIATAMENTE después de aplicar la recompensa
   *  real al `player` — persiste la transacción como APPLIED y la archiva.
   *  Idempotente: una segunda llamada con el mismo transactionId no hace nada. */
  async function confirmRewardApplied(transactionId){
    const tx = root.transactions.active[transactionId];
    if(!tx){
      if((root.appliedTransactionIds||[]).includes(transactionId)) return { ok: false, reason: "already_applied" };
      return { ok: false, reason: "not_found" };
    }
    const result = markApplied(tx);
    if(!result.ok) return result;
    if(!root.appliedTransactionIds) root.appliedTransactionIds = [];
    root.appliedTransactionIds.push(transactionId);
    if(root.appliedTransactionIds.length > MAX_PROCESSED_TRANSACTION_IDS){
      root.appliedTransactionIds.splice(0, root.appliedTransactionIds.length - MAX_PROCESSED_TRANSACTION_IDS);
    }
    moveTransactionToHistory(tx);
    trackAdEvent(EVT.REWARD_APPLIED, { placement: tx.placement, rewardType: tx.rewardType });
    await persist();
    return { ok: true };
  }

  /** Si main.js decide NO aplicar una recompensa ya ganada (caso extremo,
   *  ej. el combate ya no existe) — cancela la transacción sin marcarla
   *  aplicada, para que quede trazada en el historial en vez de perdida. */
  async function cancelTransaction(transactionId){
    const tx = root.transactions.active[transactionId];
    if(!tx) return { ok: false, reason: "not_found" };
    markCancelled(tx);
    moveTransactionToHistory(tx);
    await persist();
    return { ok: true };
  }

  function forgetBattle(battleId){
    if(root) forgetBattleFrequency(root.frequency, battleId);
  }

  function getPlacementConfig(placement){ return PLACEMENT_CONFIG[placement]; }
  function isPrivacyOptionsRequired(){ return !!(consentManager && consentManager.isPrivacyOptionsRequired()); }
  async function openPrivacyOptions(){ if(consentManager) await consentManager.showPrivacyOptionsForm(); }
  function isSupported(){ return provider.isSupported(); }

  return {
    init, isPlacementConfigured, checkAvailability, getPlacementUiState, preloadPlacement,
    requestReward, confirmRewardApplied, cancelTransaction, forgetBattle,
    getPlacementConfig, isPrivacyOptionsRequired, openPrivacyOptions, isSupported,
    // Solo para tests de integración (ver __tests__/adsService.test.js) — nunca se llama desde main.js.
    __getProviderForTesting: ()=> provider,
  };
}

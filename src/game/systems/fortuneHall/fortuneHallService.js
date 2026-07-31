/* ============================================================
   SALÓN DE LA FORTUNA — servicio de aplicación
   ------------------------------------------------------------
   Única puerta de entrada que main.js debe usar. Coordina reloj +
   repositorio, y expone una API mínima:

     init({storage})                          — carga/frescura del día
     getState()                               — snapshot actual (o null antes de init)
     getGameStatus(gameId)                    -> "FREE_AVAILABLE"|"SECOND_CHANCE_AVAILABLE"|"LOCKED"
     consumeFreeAttempt(gameId)               -> {ok}
     consumePremiumAttempt(gameId)            -> {ok}
     subscribe(fn)                            -> unsubscribe
     getMillisecondsUntilReset()

   Nunca toca `player` (oro/xp/diamantes/inventario) ni sabe qué recompensa
   corresponde — eso vive en fortuneRewardService.js y se aplica desde
   main.js (ver applyFortuneHallReward), exactamente igual que
   dailyMissionsService/adventurerContractsService/adsService.
   ============================================================ */
import {
  getCurrentDateKey, getMillisecondsUntilReset as clockMsUntilReset, hasDailyResetOccurred,
} from "./fortuneHallResetClock.js";
import { createFortuneHallRepository, createInMemoryStorage } from "./fortuneHallRepository.js";
import { MINIGAME_DEFS } from "./fortuneMinigames.js";
import { DEV_UNLIMITED_ATTEMPTS } from "../../config/fortuneHall.config.js";

export function createFortuneHallService({
  storage, onDailyReset, onCorruptedState,
  // Inyectable (por defecto lee el flag de config) para que los tests puedan
  // fijar el comportamiento real sin importar el valor actual de
  // DEV_UNLIMITED_ATTEMPTS — mismo criterio que `storage`/`rng` en el resto
  // del sistema. main.js nunca lo pasa: siempre respeta el flag de config.
  unlimitedAttempts = DEV_UNLIMITED_ATTEMPTS,
} = {}){
  const repository = createFortuneHallRepository(storage || createInMemoryStorage(), { onDiscarded: onCorruptedState });
  let root = null;
  let initPromise = null;
  let resetTimer = null;
  const listeners = new Set();

  function notify(){
    const snapshot = getState();
    listeners.forEach(fn => { try{ fn(snapshot); }catch(e){ console.error("[SALÓN DE LA FORTUNA] listener falló", e); } });
  }

  async function persist(){ await repository.save(root); }

  function resetAllGames(dateKey){
    MINIGAME_DEFS.forEach(def => { root.games[def.id] = { freeUsed: false, premiumUsed: false }; });
    root.lastResetDateKey = dateKey;
  }

  /** Revisa si toca reiniciar el día. Devuelve {regenerated}. */
  async function ensureFreshState(now = new Date()){
    if(hasDailyResetOccurred(root.lastResetDateKey, now)){
      resetAllGames(getCurrentDateKey(now));
      await persist();
      return { regenerated: true };
    }
    return { regenerated: false };
  }

  function scheduleResetTimer(){
    if(resetTimer) clearTimeout(resetTimer);
    const ms = Math.min(clockMsUntilReset() + 500, 2147483647); // +500ms de margen; cap por límite de setTimeout
    resetTimer = setTimeout(async ()=>{
      const { regenerated } = await ensureFreshState();
      if(regenerated){
        notify();
        if(onDailyReset) onDailyReset();
      }
      scheduleResetTimer();
    }, ms);
  }

  function getState(){
    return root ? { lastResetDateKey: root.lastResetDateKey, games: { ...root.games } } : null;
  }

  async function init(){
    if(initPromise) return initPromise;
    initPromise = (async ()=>{
      root = await repository.load();
      await ensureFreshState();
      scheduleResetTimer();
      return getState();
    })();
    return initPromise;
  }

  function gameState(gameId){
    return root && root.games[gameId];
  }

  /** "FREE_AVAILABLE"   — todavía no jugó hoy, puede jugar gratis.
   *  "SECOND_CHANCE_AVAILABLE" — ya usó el gratuito, puede intentar el
   *    segundo (anuncio o diamantes) o simplemente salir sin perder la
   *    oferta para más tarde el mismo día.
   *  "LOCKED"            — ya usó ambos intentos hoy.
   *  "UNKNOWN"            — servicio no inicializado o gameId inexistente. */
  function getGameStatus(gameId){
    const g = gameState(gameId);
    if(!g) return "UNKNOWN";
    if(g.premiumUsed) return "LOCKED";
    if(g.freeUsed) return "SECOND_CHANCE_AVAILABLE";
    return "FREE_AVAILABLE";
  }

  /** unlimitedAttempts (DEV_UNLIMITED_ATTEMPTS) deja pasar por el ciclo REAL
   *  completo — gratis -> "¿otra oportunidad?" -> anuncio/diamantes — para
   *  poder probar ese flujo tal cual lo vería un jugador; lo único que
   *  cambia es que, en vez de quedar LOCKED al terminar el premium, el
   *  minijuego vuelve a fresh de inmediato para poder repetir el ciclo
   *  entero sin esperar al reinicio diario. */
  async function consumeFreeAttempt(gameId){
    const g = gameState(gameId);
    if(!g) return { ok: false, reason: "not_found" };
    await ensureFreshState();
    if(g.freeUsed) return { ok: false, reason: "already_used" };
    g.freeUsed = true;
    await persist();
    notify();
    return { ok: true };
  }

  async function consumePremiumAttempt(gameId){
    const g = gameState(gameId);
    if(!g) return { ok: false, reason: "not_found" };
    await ensureFreshState();
    if(!g.freeUsed) return { ok: false, reason: "free_not_used_yet" };
    if(g.premiumUsed) return { ok: false, reason: "already_used" };
    g.premiumUsed = true;
    if(unlimitedAttempts) root.games[gameId] = { freeUsed: false, premiumUsed: false };
    await persist();
    notify();
    return { ok: true };
  }

  function subscribe(fn){
    listeners.add(fn);
    return ()=> listeners.delete(fn);
  }

  function getMillisecondsUntilReset(){
    return clockMsUntilReset();
  }

  return {
    init, getState, getGameStatus, consumeFreeAttempt, consumePremiumAttempt,
    subscribe, getMillisecondsUntilReset,
  };
}

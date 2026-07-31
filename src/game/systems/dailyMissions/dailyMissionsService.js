/* ============================================================
   MISIONES DIARIAS — servicio de aplicación
   ------------------------------------------------------------
   Única puerta de entrada que main.js debe usar. Coordina reloj + motor de
   dominio + repositorio, y expone una API mínima:

     init()                                  — carga/crea el estado del día
     getState()                              — snapshot actual (o null antes de init)
     reportEvent({type, payload, eventId, dedupeKey})
     claimMission(missionId, rewardedCharacterId) -> {ok, reward, rewardedCharacterId}
     claimFinalReward()                      -> {ok, reward}
     subscribe(fn)                           -> unsubscribe
     getMillisecondsUntilReset()

   main.js sigue siendo dueño de `player` — este servicio nunca toca oro/xp/
   diamantes directo, solo devuelve QUÉ recompensa corresponde; aplicarla al
   `player` real y llamar a saveGame() es responsabilidad de quien llama.
   ============================================================ */
import { getCurrentDateKey, getMillisecondsUntilReset as clockMsUntilReset, hasDailyResetOccurred } from "./dailyResetClock.js";
import {
  generateDailyMissions, applyProgress, claimMission as engineClaimMission,
  claimFinalReward as engineClaimFinalReward, buildHistoryEntry, appendHistory,
  isClockRollbackSuspicious,
} from "./dailyMissionsEngine.js";
import { createDailyMissionsRepository, createInMemoryStorage } from "./dailyMissionsRepository.js";

export function createDailyMissionsService({
  storage,
  getPlayerLevel = ()=> 1,
  onDailyReset,
  onMissionsCompleted,
  onCorruptedState, // opcional: (reason)=>void — el guardado local no se pudo leer y se reinició desde cero
} = {}){
  const repository = createDailyMissionsRepository(storage || createInMemoryStorage(), { onDiscarded: onCorruptedState });
  let root = null;
  let initPromise = null;
  let resetTimer = null;
  const listeners = new Set();

  function notify(){
    const snapshot = getState();
    listeners.forEach(fn => { try{ fn(snapshot); }catch(e){ console.error("[MISIONES DIARIAS] listener falló", e); } });
  }

  async function persist(){
    await repository.save(root);
  }

  /** Genera un día nuevo, archivando el anterior (si había uno) en el historial. */
  function regenerate(dateKey, now){
    if(root.current) root.history = appendHistory(root.history, buildHistoryEntry(root.current));
    root.current = generateDailyMissions(dateKey, { level: getPlayerLevel() }, now);
    root.lastKnownTimestamp = now.getTime();
  }

  /** Revisa si toca reiniciar el día. Devuelve {regenerated, isFirstEver, rollbackSuspicious}. */
  async function ensureFreshState(now = new Date()){
    const isFirstEver = !root.current;
    if(isFirstEver){
      regenerate(getCurrentDateKey(now), now);
      await persist();
      return { regenerated: true, isFirstEver: true, rollbackSuspicious: false };
    }
    if(isClockRollbackSuspicious(root.lastKnownTimestamp, now)){
      // Retroceso sospechoso del reloj del dispositivo: no se toca el progreso
      // global ni se generan misiones/recompensas nuevas mientras el reloj no
      // vuelva a superar el último timestamp legítimo conocido.
      return { regenerated: false, isFirstEver: false, rollbackSuspicious: true };
    }
    if(hasDailyResetOccurred(root.current.dateKey, now)){
      regenerate(getCurrentDateKey(now), now);
      await persist();
      return { regenerated: true, isFirstEver: false, rollbackSuspicious: false };
    }
    root.lastKnownTimestamp = Math.max(root.lastKnownTimestamp || 0, now.getTime());
    return { regenerated: false, isFirstEver: false, rollbackSuspicious: false };
  }

  function scheduleResetTimer(){
    if(resetTimer) clearTimeout(resetTimer);
    const ms = Math.min(clockMsUntilReset() + 500, 2147483647); // +500ms de margen; cap por límite de setTimeout
    resetTimer = setTimeout(async ()=>{
      const { regenerated, rollbackSuspicious } = await ensureFreshState();
      if(regenerated){
        notify();
        if(onDailyReset) onDailyReset();
      }
      if(!rollbackSuspicious) scheduleResetTimer();
      else resetTimer = setTimeout(()=> scheduleResetTimer(), 60000); // reintenta en 1 min si el reloj sigue raro
    }, ms);
  }

  function getState(){
    return root ? root.current : null;
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

  async function reportEvent({ type, payload = {}, eventId, dedupeKey } = {}){
    if(!root) return; // el servicio todavía no se inicializó — no debería pasar si main.js llama init() al boot
    await ensureFreshState(); // red de seguridad si el timer todavía no disparó
    const amount = payload.amount != null ? payload.amount : 1;
    const { changed, completedMissions } = applyProgress(root.current, type, amount, {
      meta: payload, eventId, dedupeKey,
    });
    if(changed){
      await persist();
      notify();
      if(completedMissions.length && onMissionsCompleted) onMissionsCompleted(completedMissions);
    }
  }

  async function claimMission(missionId, rewardedCharacterId){
    if(!root) return { ok: false, reason: "not_initialized" };
    await ensureFreshState();
    const result = engineClaimMission(root.current, missionId, rewardedCharacterId);
    if(result.ok){ await persist(); notify(); }
    return result;
  }

  async function claimFinalReward(){
    if(!root) return { ok: false, reason: "not_initialized" };
    await ensureFreshState();
    const result = engineClaimFinalReward(root.current);
    if(result.ok){ await persist(); notify(); }
    return result;
  }

  function subscribe(fn){
    listeners.add(fn);
    return ()=> listeners.delete(fn);
  }

  function getMillisecondsUntilReset(){
    return clockMsUntilReset();
  }

  return { init, getState, reportEvent, claimMission, claimFinalReward, subscribe, getMillisecondsUntilReset };
}

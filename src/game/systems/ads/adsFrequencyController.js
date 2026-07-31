/* ============================================================
   AdsFrequencyController (dominio puro) — decide si un placement puede
   ofrecerse AHORA, y registra su uso. No sabe nada de SDK, DOM ni storage:
   recibe un `state` plano (persistido por adsRepository) y lo muta in-place,
   mismo criterio que el resto de los motores de dominio del proyecto.
   ============================================================ */
import { hasCooldownElapsed, getDateKey } from "./adsClock.js";

export function freshFrequencyState(now = new Date()){
  return {
    dateKey: getDateKey(now),
    dailyCounts: {}, dailyTotal: 0,
    sessionCounts: {}, sessionTotal: 0,
    lastShownAt: {}, lastAnyShownAt: 0,
    perBattleUsed: {},
  };
}

/** Reinicia contadores diarios si cambió el dateKey — se llama al inicio de
 *  cada chequeo de elegibilidad, así nunca hace falta un timer separado. */
export function ensureFreshDay(state, now = new Date()){
  const key = getDateKey(now);
  if(state.dateKey !== key){
    state.dateKey = key;
    state.dailyCounts = {};
    state.dailyTotal = 0;
  }
}

/** Límite de sesión: se reinicia al arrancar una sesión nueva de la app
 *  (ver adsService.init()) — nunca se persiste como "activo" entre reinicios. */
export function resetSession(state){
  state.sessionCounts = {};
  state.sessionTotal = 0;
}

/**
 * @returns {{eligible:boolean, reason?:string}}
 */
export function checkEligibility(state, placement, placementCfg, globalLimits, opts = {}, now = new Date()){
  if(!placementCfg || !placementCfg.enabled) return { eligible: false, reason: "placement_disabled" };
  ensureFreshDay(state, now);

  const dailyCount = (state.dailyCounts||{})[placement] || 0;
  if(dailyCount >= placementCfg.dailyLimit) return { eligible: false, reason: "daily_limit" };

  const sessionCount = (state.sessionCounts||{})[placement] || 0;
  if(sessionCount >= placementCfg.sessionLimit) return { eligible: false, reason: "session_limit" };

  if((state.dailyTotal||0) >= globalLimits.globalDailyLimit) return { eligible: false, reason: "global_daily_limit" };
  if((state.sessionTotal||0) >= globalLimits.globalSessionLimit) return { eligible: false, reason: "global_session_limit" };

  const lastShownAt = (state.lastShownAt||{})[placement];
  if(!hasCooldownElapsed(lastShownAt, placementCfg.cooldownSeconds, now)) return { eligible: false, reason: "cooldown" };

  if(state.lastAnyShownAt && !hasCooldownElapsed(state.lastAnyShownAt, globalLimits.minSecondsBetweenAnyAds, now)){
    return { eligible: false, reason: "global_cooldown" };
  }

  if(placementCfg.perBattleLimit != null && opts.battleId){
    const usedInBattle = ((state.perBattleUsed||{})[opts.battleId]||[]).filter(p=> p===placement).length;
    if(usedInBattle >= placementCfg.perBattleLimit) return { eligible: false, reason: "per_battle_limit" };
  }

  return { eligible: true };
}

/** Registra que el placement se usó AHORA (llamar solo tras REWARD_EARNED,
 *  nunca al solo ofrecer/cargar el anuncio). */
export function recordUsage(state, placement, opts = {}, now = new Date()){
  ensureFreshDay(state, now);
  if(!state.dailyCounts) state.dailyCounts = {};
  if(!state.sessionCounts) state.sessionCounts = {};
  if(!state.lastShownAt) state.lastShownAt = {};
  if(!state.perBattleUsed) state.perBattleUsed = {};

  state.dailyCounts[placement] = (state.dailyCounts[placement]||0) + 1;
  state.sessionCounts[placement] = (state.sessionCounts[placement]||0) + 1;
  state.dailyTotal = (state.dailyTotal||0) + 1;
  state.sessionTotal = (state.sessionTotal||0) + 1;
  state.lastShownAt[placement] = now.getTime();
  state.lastAnyShownAt = now.getTime();

  if(opts.battleId){
    if(!state.perBattleUsed[opts.battleId]) state.perBattleUsed[opts.battleId] = [];
    state.perBattleUsed[opts.battleId].push(placement);
  }
}

/** Poda `perBattleUsed` para que no crezca sin límite en una sesión larga —
 *  se llama al terminar cada combate (ya no hace falta recordar su battleId). */
export function forgetBattle(state, battleId){
  if(state.perBattleUsed) delete state.perBattleUsed[battleId];
}

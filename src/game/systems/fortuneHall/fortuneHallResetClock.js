/* ============================================================
   FortuneHallResetClock — único punto que sabe "qué día es" para el Salón de
   la Fortuna. Nada más en el sistema debe llamar a `new Date()` directo para
   decidir si toca reiniciar. Mismo criterio (y misma limitación conocida:
   hora LOCAL del dispositivo) que dailyMissions/dailyResetClock.js — se deja
   como archivo propio en vez de importar el de misiones diarias para que el
   Salón de la Fortuna pueda evolucionar su propia hora de reinicio sin
   acoplarse a ese otro sistema (mismo criterio que adsClock.js, que también
   tiene su propio reloj pese a resolver un problema parecido).
   ============================================================ */
import { RESET_HOUR_LOCAL } from "../../config/fortuneHall.config.js";

function pad2(n){ return String(n).padStart(2, "0"); }

function effectiveDateForKey(date){
  if(!RESET_HOUR_LOCAL) return date;
  return new Date(date.getTime() - RESET_HOUR_LOCAL * 3600000);
}

export function getCurrentDateKey(now = new Date()){
  const d = effectiveDateForKey(now);
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}

export function getNextResetAt(now = new Date()){
  const d = effectiveDateForKey(now);
  const nextEffectiveMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()+1, 0, 0, 0, 0);
  return nextEffectiveMidnight.getTime() + RESET_HOUR_LOCAL * 3600000;
}

export function getMillisecondsUntilReset(now = new Date()){
  return Math.max(0, getNextResetAt(now) - now.getTime());
}

/** true si `previousDateKey` (el guardado la última vez) ya quedó
 *  desactualizado respecto al dateKey de ahora mismo — o si nunca hubo uno. */
export function hasDailyResetOccurred(previousDateKey, now = new Date()){
  if(!previousDateKey) return true;
  return previousDateKey !== getCurrentDateKey(now);
}

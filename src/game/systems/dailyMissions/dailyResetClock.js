/* ============================================================
   DailyResetClock — único punto que sabe "qué día es" para las misiones
   diarias. Nada más en el sistema debe llamar a `new Date()` directo para
   decidir si toca reiniciar: todo pasa por acá, para poder reemplazarlo más
   adelante por hora de servidor sin tocar el resto del código (pedido
   explícito del diseño).
   ------------------------------------------------------------
   v1: usa la hora LOCAL del dispositivo (RESET_HOUR_LOCAL, por defecto
   medianoche). Esto significa que la fecha del dispositivo puede manipularse
   — ver dailyMissionsEngine.js (detección de retrocesos sospechosos) y el
   informe final para el detalle de esta limitación conocida.
   ============================================================ */
import { RESET_HOUR_LOCAL } from "../../config/dailyMissions.config.js";

function pad2(n){ return String(n).padStart(2, "0"); }

/** "YYYY-MM-DD" de la fecha "efectiva" del día de misiones — si el reinicio
 *  fuera a una hora distinta de medianoche, restamos esa hora antes de leer
 *  año/mes/día para que el "día de misiones" no cambie hasta esa hora. */
function effectiveDateForKey(date){
  if(!RESET_HOUR_LOCAL) return date;
  const shifted = new Date(date.getTime() - RESET_HOUR_LOCAL * 3600000);
  return shifted;
}

export function getCurrentDateKey(now = new Date()){
  const d = effectiveDateForKey(now);
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}

/** Próximo instante (timestamp ms) en el que el "día de misiones" cambia,
 *  tomando como referencia `now`. */
export function getNextResetAt(now = new Date()){
  const d = effectiveDateForKey(now);
  const nextEffectiveMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()+1, 0, 0, 0, 0);
  return nextEffectiveMidnight.getTime() + RESET_HOUR_LOCAL * 3600000;
}

export function getMillisecondsUntilReset(now = new Date()){
  return Math.max(0, getNextResetAt(now) - now.getTime());
}

/** true si `previousDateKey` (el dateKey guardado la última vez) ya quedó
 *  desactualizado respecto al dateKey de ahora mismo — o si nunca hubo uno. */
export function hasDailyResetOccurred(previousDateKey, now = new Date()){
  if(!previousDateKey) return true;
  return previousDateKey !== getCurrentDateKey(now);
}

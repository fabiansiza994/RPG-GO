/* ============================================================
   AdsClock — único punto que sabe "qué día es" y "cuánto falta" para el
   módulo de publicidad. Nada más en este sistema debe llamar a `new Date()`
   directo para decidir límites/cooldowns — mismo criterio que
   DailyResetClock/ContractClock, reloj propio porque ads tiene su propia
   noción de "día" (límites diarios) y de "cooldown" (independiente de
   cualquier otro sistema).
   ============================================================ */

function pad2(n){ return String(n).padStart(2, "0"); }

export function now(){ return new Date(); }

export function getDateKey(date = new Date()){
  return `${date.getFullYear()}-${pad2(date.getMonth()+1)}-${pad2(date.getDate())}`;
}

export function hasCooldownElapsed(lastTimestampMs, cooldownSeconds, date = new Date()){
  if(!lastTimestampMs) return true;
  if(!cooldownSeconds) return true;
  return date.getTime() >= lastTimestampMs + cooldownSeconds*1000;
}

export function getNextAvailability(lastTimestampMs, cooldownSeconds){
  if(!lastTimestampMs) return 0;
  return lastTimestampMs + (cooldownSeconds||0)*1000;
}

export function getMillisecondsUntilAvailable(lastTimestampMs, cooldownSeconds, date = new Date()){
  return Math.max(0, getNextAvailability(lastTimestampMs, cooldownSeconds) - date.getTime());
}

/** Retroceso sospechoso del reloj del dispositivo (>1 min hacia atrás
 *  respecto al último timestamp legítimo visto) — no es a prueba de
 *  manipulación, solo evita resetear límites diarios en loop adelantando y
 *  atrasando la fecha del sistema. Mismo umbral que dailyMissions/adventurerContracts. */
export function detectSuspiciousTimeChange(lastKnownTimestamp, date = new Date()){
  if(!lastKnownTimestamp) return false;
  return date.getTime() < lastKnownTimestamp - 60000;
}

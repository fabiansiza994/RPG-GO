/* ============================================================
   ContractClock — único punto que sabe "cuándo toca generar un contrato
   nuevo" y "cuánto tiempo le queda a uno activo". A diferencia de
   DailyResetClock (que resetea a una hora fija del día), el Contrato del
   Aventurero se rige por INTERVALOS de 24h desde la última generación —
   por eso es un reloj propio y no una reutilización del de Misiones Diarias.
   ------------------------------------------------------------
   v1: hora LOCAL del dispositivo. Misma limitación conocida que
   DailyResetClock — ver adventurerContractsEngine.js (detección de
   retrocesos sospechosos) y el informe final.
   ============================================================ */
import { CONTRACT_GENERATION_INTERVAL_MS, CONTRACT_DURATION_MS_BY_DIFFICULTY } from "../../config/adventurerContracts.config.js";

export function getNextGenerationAt(lastGeneratedAt){
  if(!lastGeneratedAt) return 0; // nunca se generó nada — toca generar ya
  return lastGeneratedAt + CONTRACT_GENERATION_INTERVAL_MS;
}

export function hasGenerationIntervalElapsed(lastGeneratedAt, now = new Date()){
  return now.getTime() >= getNextGenerationAt(lastGeneratedAt);
}

export function getMillisecondsUntilNextGeneration(lastGeneratedAt, now = new Date()){
  return Math.max(0, getNextGenerationAt(lastGeneratedAt) - now.getTime());
}

/** Fecha límite real de un contrato ACEPTADO, según su dificultad. */
export function computeExpiresAt(acceptedAtMs, difficulty, now = new Date()){
  const base = acceptedAtMs || now.getTime();
  const durationMs = CONTRACT_DURATION_MS_BY_DIFFICULTY[difficulty] || CONTRACT_DURATION_MS_BY_DIFFICULTY.NORMAL;
  return base + durationMs;
}

export function hasExpired(expiresAtMs, now = new Date()){
  if(!expiresAtMs) return false;
  return now.getTime() >= expiresAtMs;
}

export function getMillisecondsUntilExpiration(expiresAtMs, now = new Date()){
  if(!expiresAtMs) return Infinity;
  return Math.max(0, expiresAtMs - now.getTime());
}

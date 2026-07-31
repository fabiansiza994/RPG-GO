/* ============================================================
   Transacciones de recompensa publicitaria (dominio puro)
   ------------------------------------------------------------
   Toda recompensa de un rewarded ad pasa por una transacción con estados
   explícitos — nunca se aplica una recompensa "directo" desde el callback
   del SDK. Esto es lo que hace posible garantizar:
     - nunca aplicar la misma recompensa dos veces (doble callback, doble
       tap, recarga de pantalla a mitad de camino),
     - conservar un historial para reconciliar si la app se reinicia con una
       transacción a mitad de camino,
     - y, el día que haya backend, enchufar Server-Side Verification sin
       tocar el resto del sistema (ver SERVER_SIDE_VERIFICATION en
       ads.config.js) — solo agregaría los estados VERIFICATION_PENDING/
       VERIFIED/REJECTED al mismo flujo.
   ============================================================ */

let counter = 0;
function generateTransactionId(){
  return `adtx_${Date.now()}_${(++counter).toString(36)}_${Math.random().toString(36).slice(2,8)}`;
}

/**
 * @typedef {'CREATED'|'AD_STARTED'|'REWARD_EARNED'|'APPLIED'|'FAILED'|'CANCELLED'|'VERIFICATION_PENDING'|'VERIFIED'|'REJECTED'} AdRewardTransactionStatus
 */

export function createTransaction({ placement, sessionId, rewardType, rewardAmount, characterId, battleId, metadata }, now = new Date()){
  return {
    id: generateTransactionId(),
    placement, sessionId, rewardType, rewardAmount,
    characterId: characterId || undefined,
    battleId: battleId || undefined,
    adResponseId: undefined,
    status: "CREATED",
    createdAt: now.toISOString(),
    adStartedAt: undefined, rewardEarnedAt: undefined, appliedAt: undefined, failedAt: undefined,
    errorCode: undefined,
    metadata: metadata ? { ...metadata } : undefined,
  };
}

export function markAdStarted(tx, now = new Date()){
  if(tx.status !== "CREATED") return { ok: false, reason: "invalid_state" };
  tx.status = "AD_STARTED";
  tx.adStartedAt = now.toISOString();
  return { ok: true };
}

/** El único paso que de verdad "gana" la recompensa — llamado desde el
 *  callback de recompensa del SDK, nunca desde el cierre del anuncio. */
export function markRewardEarned(tx, adResponseId, now = new Date()){
  if(tx.status !== "AD_STARTED") return { ok: false, reason: "invalid_state" };
  tx.status = "REWARD_EARNED";
  tx.rewardEarnedAt = now.toISOString();
  tx.adResponseId = adResponseId || undefined;
  return { ok: true };
}

export function markFailed(tx, errorCode, now = new Date()){
  if(["APPLIED", "FAILED", "CANCELLED", "REJECTED"].includes(tx.status)) return { ok: false, reason: "invalid_state" };
  tx.status = "FAILED";
  tx.failedAt = now.toISOString();
  tx.errorCode = errorCode || "UNKNOWN";
  return { ok: true };
}

export function markCancelled(tx, now = new Date()){
  if(["APPLIED", "FAILED", "CANCELLED", "REJECTED"].includes(tx.status)) return { ok: false, reason: "invalid_state" };
  tx.status = "CANCELLED";
  tx.failedAt = now.toISOString();
  return { ok: true };
}

/** true si esta transacción tiene una recompensa ganada y lista para
 *  aplicarse (nunca ya aplicada). Server-Side Verification, cuando exista,
 *  agregaría `tx.status === "VERIFIED"` acá. */
export function canApply(tx){
  return !!tx && tx.status === "REWARD_EARNED";
}

/** Marca la transacción como aplicada — es responsabilidad de quien llama
 *  (adsService) haber otorgado la recompensa real ANTES de invocar esto, y
 *  nunca llamarlo dos veces para la misma transacción. */
export function markApplied(tx, now = new Date()){
  if(tx.status === "APPLIED") return { ok: false, reason: "already_applied" };
  if(!canApply(tx)) return { ok: false, reason: "invalid_state" };
  tx.status = "APPLIED";
  tx.appliedAt = now.toISOString();
  return { ok: true };
}

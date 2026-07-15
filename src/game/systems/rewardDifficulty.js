/* ============================================================
   REWARD DIFFICULTY — Capa 7: Combat Power & Difficulty Director.

   Responsabilidad de este archivo: SOLO traducir una variante de dificultad a un multiplicador de
   recompensa. Arquitectura lista para cuando se decida usarla — a propósito, NADIE en el juego
   aplica todavía este multiplicador a oro/xp/loot reales (el pedido es explícito: "no modificar
   todavía la economía, solo preparar la arquitectura"). Conectarlo a una recompensa real es una
   tarea futura separada.
   ============================================================ */

/** Multiplicador de recompensa para una variante — 1.0 si la variante no está en la tabla (nunca
 *  penaliza por una clave desconocida). */
export function getRewardMultiplier(tierKey, rewardMultiplierByTier){
  if(!rewardMultiplierByTier) return 1.0;
  const mult = rewardMultiplierByTier[tierKey];
  return mult == null ? 1.0 : mult;
}

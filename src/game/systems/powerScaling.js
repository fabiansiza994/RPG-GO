/* ============================================================
   POWER SCALING — Capa 7: Combat Power & Difficulty Director.

   Responsabilidad de este archivo: traducir un CP objetivo a un NIVEL concreto de enemigo, sin
   tocar ni duplicar la generación real de monstruos. `estimateMonsterStats` es un espejo de
   propósito, de solo lectura, de la fórmula que ya usa `makeMonster()` en main.js
   (hp/atk/def/spd a partir de nivel + multiplicadores de plantilla) — existe acá porque este
   módulo necesita estimar el CP de un monstruo ANTES de decidir qué nivel pedirle a
   `makeMonster()`, nunca para reemplazarla ni para generar el monstruo en sí (eso lo sigue
   haciendo exclusivamente `makeMonster()`, sin cambios).

   Si el balance de `makeMonster()` cambia alguna vez, esta fórmula espejo debe actualizarse junto
   con ella para que la estimación de CP siga siendo representativa — están intencionalmente
   separadas (no importadas una de la otra) porque una vive en el motor de combate real
   (`main.js`) y la otra es solo una estimación para elegir dificultad.
   ============================================================ */

/** Mismo cálculo que makeMonster() en main.js — ver nota de archivo. */
export function estimateMonsterStats(tpl, level){
  return {
    hp: Math.round((18 + level*12) * (tpl.hpM||1)),
    atk: +((1.5 + level*2.8) * (tpl.atkM||1)).toFixed(1),
    def: +((3 + level*1.9) * (tpl.defM||1)).toFixed(1),
    spd: 4 + Math.floor(level*0.6),
  };
}

/** CP estimado de un monstruo a un nivel dado — usa los mismos pesos por-stat que
 *  CombatPowerCalculator (atk/def/maxHp/spd) para que el número quede en la misma escala que el
 *  CP del jugador y las variantes de DIFFICULTY_TIERS tengan sentido. Los monstruos no tienen
 *  equipo/mascotas/pasivas ni matk propio, así que el CP de un monstruo es solo su parte de
 *  estadísticas — comparable, no idéntico en composición, al del jugador. */
export function estimateMonsterCP(tpl, level, statWeights){
  const stats = estimateMonsterStats(tpl, level);
  return Math.round(
    stats.atk * statWeights.atk
    + stats.def * statWeights.def
    + stats.hp * statWeights.maxHp
    + stats.spd * statWeights.spd
    + level * statWeights.level
  );
}

/** Busca (búsqueda binaria — estimateMonsterCP es monótona creciente en `level`) el nivel entero
 *  que acerca más el CP del monstruo a `targetCP`, dentro de `bounds` ({min,max}, por defecto
 *  1..300 — un techo generoso y defensivo, nunca alcanzado en la práctica). Nunca lanza ni
 *  devuelve algo fuera de bounds. */
export function findLevelForTargetCP(tpl, targetCP, statWeights, bounds){
  bounds = bounds || {min:1, max:300};
  let lo = bounds.min, hi = bounds.max;
  if(estimateMonsterCP(tpl, lo, statWeights) >= targetCP) return lo;
  if(estimateMonsterCP(tpl, hi, statWeights) <= targetCP) return hi;
  while(hi - lo > 1){
    const mid = Math.floor((lo+hi)/2);
    if(estimateMonsterCP(tpl, mid, statWeights) < targetCP) lo = mid; else hi = mid;
  }
  // de los dos niveles candidatos vecinos, devolver el que quede más cerca del objetivo real
  const cpLo = estimateMonsterCP(tpl, lo, statWeights), cpHi = estimateMonsterCP(tpl, hi, statWeights);
  return Math.abs(cpLo-targetCP) <= Math.abs(cpHi-targetCP) ? lo : hi;
}

/* ============================================================
   ENEMY POWER GENERATOR — Capa 7: Combat Power & Difficulty Director.

   Responsabilidad de este archivo: ser el ÚNICO punto de entrada que el resto del juego debería
   usar para generar un desafío basado en Combat Power. Compone, en orden:

     combatPowerCalculator (CP del jugador)  →  difficultyDirector (sortea variante + CP objetivo)
     →  powerScaling (traduce ese CP objetivo a un nivel concreto)

   El resultado es SOLO un nivel + una etiqueta de variante — quien llama a esto sigue usando
   `makeMonster(tpl, level, pos, opts)` exactamente igual que siempre (sin cambios). Esta capa
   nunca genera el monstruo en sí, nunca toca combate/economía/inventario/progresión.

   A propósito, esta capa NO se usa para los spawns ambientales normales del mapa
   (spawnMonsters/maybeSpawnBoss/emboscadas de recolección/monstruos de misión) — esos siguen
   ligados al nivel del jugador tal como ya funcionaban. Se usa solo donde el pedido lo especifica:
   eventos dinámicos, Coliseo, jefes opcionales (Guardián de Parque) y variantes élite/legendarias.
   Ver docs/COMBAT_POWER.md.
   ============================================================ */

import { computeCombatPower } from "./combatPowerCalculator.js";
import { rollDifficulty } from "./difficultyDirector.js";
import { findLevelForTargetCP } from "./powerScaling.js";

/** Genera un desafío: calcula el CP real del jugador, sortea una variante de dificultad, y
 *  devuelve el nivel de enemigo que mejor se acerca al CP objetivo de esa variante — listo para
 *  pasarle a `makeMonster(tpl, level, ...)` tal cual.
 *
 *  `config` = { difficultyTiers, statWeights, rarityByKey, equipmentConfig, petConfig,
 *  passiveWeights, levelBounds } — todo opcional salvo `difficultyTiers` y `statWeights`.
 *  `rng` opcional (testing determinístico). */
export function generateEnemyChallenge(player, tpl, config, rng){
  const playerCP = computeCombatPower(player, {
    rarityByKey: config.rarityByKey,
    statWeights: config.statWeights,
    equipmentConfig: config.equipmentConfig,
    petConfig: config.petConfig,
    passiveWeights: config.passiveWeights,
  });
  const { tier, targetCP } = rollDifficulty(config.difficultyTiers, playerCP, rng);
  const level = findLevelForTargetCP(tpl, targetCP, config.statWeights, config.levelBounds);
  return { level, tier, targetCP, playerCP };
}

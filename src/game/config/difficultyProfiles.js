/* ============================================================
   DIFFICULTY PROFILES — Capa 7: Combat Power & Difficulty Director. Solo configuración.

   Responsabilidad de este archivo: SOLO datos — qué variantes de dificultad existen (con su
   probabilidad y su rango de Combat Power relativo al del jugador), el multiplicador de
   recompensa que le correspondería a cada una (arquitectura lista, ver RewardDifficulty — todavía
   NADIE la aplica a oro/xp/loot reales, tal como pide el pedido), y el CP recomendado de
   referencia por región (solo informativo, nunca bloquea acceso).

   Nada de esto decide todavía qué enemigo generar — eso es DifficultyDirector/EnemyPowerGenerator
   (./game/systems/), que leen esta tabla.
   ============================================================ */

import { BIOME_KEYS } from "./biomes.js";

/** Variantes de dificultad — `weight` es un peso relativo (no hace falta que sumen 100; el
 *  director las normaliza), `cpMin`/`cpMax` son fracciones del Combat Power del jugador (1.0 =
 *  mismo CP que el jugador). "legendary" no tiene `cpMax` (sin techo real, "CP superior al
 *  jugador" tal como pide el pedido) — se resuelve con `cpMaxFallbackMult` para no generar un
 *  número absurdo cuando hace falta un techo para el sorteo. */
export const DIFFICULTY_TIERS = [
  { key: "normal",    label: "Normal",     weight: 70, cpMin: 0.60, cpMax: 0.80 },
  { key: "strong",    label: "Fuerte",     weight: 20, cpMin: 0.90, cpMax: 1.10 },
  { key: "elite",     label: "Élite",      weight: 8,  cpMin: 1.20, cpMax: 1.40 },
  { key: "legendary", label: "Legendario", weight: 2,  cpMin: 1.50, cpMax: null, cpMaxFallbackMult: 1.90 },
];

/** Multiplicador de recompensa por variante — listo para usar, pero NO aplicado todavía a
 *  oro/xp/loot reales en ningún lugar del juego (el pedido pide preparar la arquitectura, no
 *  modificar la economía todavía). Ver RewardDifficulty (systems/rewardDifficulty.js). */
export const REWARD_MULTIPLIER_BY_TIER = {
  normal: 1.0,
  strong: 1.25,
  elite: 1.6,
  legendary: 2.5,
};

/** CP recomendado de referencia por bioma — SOLO informativo (el pedido es explícito: "no
 *  bloquear el acceso, solo informar"). Mantiene el mismo orden relativo que ya tiene
 *  REGION_LEVEL_RANGE en regions.js (que no se tocó): Bosque/Llanura primero, Ciudad/Río en
 *  medio, Industrial/Ruinas/Montaña al final. */
export const REGION_RECOMMENDED_CP = {
  [BIOME_KEYS.FOREST]:     { min: 100, max: 200 },
  [BIOME_KEYS.PLAINS]:     { min: 100, max: 200 },
  [BIOME_KEYS.CITY]:       { min: 120, max: 220 },
  [BIOME_KEYS.RIVER]:      { min: 150, max: 260 },
  [BIOME_KEYS.INDUSTRIAL]: { min: 220, max: 380 },
  [BIOME_KEYS.RUINS]:      { min: 350, max: 550 },
  [BIOME_KEYS.MOUNTAIN]:   { min: 380, max: 600 },
};

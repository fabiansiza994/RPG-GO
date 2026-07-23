/* ============================================================
   COMBAT POWER — Capa 7: Combat Power & Difficulty Director. Solo configuración.

   Responsabilidad de este archivo: SOLO los pesos/parámetros del cálculo de Combat Power (CP) —
   un número interno que nunca se muestra al jugador (a diferencia del "Poder total" que ya existe
   en la hoja de personaje, `$("csPowerTotal")` en main.js, que es solo una cifra decorativa de
   atk/matk/def/spd/maxHp/maxMp con pesos fijos). El CP de esta capa es un cálculo aparte, más
   completo (también pesa equipo, mascotas y bonos pasivos), pensado para decidir dificultad — no
   para mostrarse. No se tocó ni se reutilizó el "Poder total" existente.

   Nada de esto decide todavía qué enemigo generar (eso es DifficultyDirector/EnemyPowerGenerator,
   en ./game/systems/) — este archivo es solo los números.
   ============================================================ */

/** Peso de cada estadística base del jugador en el cálculo de CP. Ajustar acá alcanza para
 *  rebalancear todo el sistema sin tocar la fórmula. */
export const COMBAT_POWER_STAT_WEIGHTS = {
  level: 1.2,     // el nivel sigue contando, pero como un factor más entre varios — no el principal
  atk: 3.0,
  matk: 3.0,
  def: 3.2,
  maxHp: 0.6,
  maxMp: 0.3,
  spd: 2.0,
};

/** Calidad de equipo: por cada pieza equipada (arma, offhand, armadura, casco, botas, cada
 *  accesorio), se suma `perSlotWeight * rarity.mult * (1 + upgradeLevel * upgradeStepBonus)`.
 *  `rarity.mult` viene de RARITY_TIERS (items.js, Capa de equipo existente — no se tocó);
 *  `upgradeLevel` es 0..EQUIP_UPGRADE_MAX. Así una pieza legendaria +5 pesa mucho más que una
 *  común +0, más allá de la diferencia que ya reflejan sus stats planos. */
export const EQUIPMENT_QUALITY_CONFIG = {
  perSlotWeight: 6,
  upgradeStepBonus: 0.15, // +15% de ese término por cada nivel de mejora (0..5)
};

/** Mascotas: se toman hasta `maxPetsCounted` mascotas (las de mayor `atk+def+maxHp*0.1`, la misma
 *  noción que ya usa petDamageBonus() en batalla, pero aplicada al roster completo del jugador en
 *  vez de solo a las convocadas) y se suma `perPetWeight * (basePoints + level*levelWeight)` de
 *  cada una. */
export const PET_POWER_CONFIG = {
  maxPetsCounted: 2,
  perPetWeight: 1,
  basePoints: 4,
  levelWeight: 1.5,
};

/** Bonificaciones pasivas permanentes existentes en `player` (críticos, escudo con vida baja —
 *  ambos son fracciones, ej. 0.12 = 12%). El peso convierte esa fracción en puntos de CP. Agregar
 *  una bonificación pasiva nueva en el futuro es una fila más acá. */
export const PASSIVE_BONUS_WEIGHTS = {
  critBonus: 220,
  lowHpShield: 180,
};

/* ============================================================
   COMBAT POWER CALCULATOR — Capa 7: Combat Power & Difficulty Director.

   Responsabilidad de este archivo: calcular el Combat Power (CP) real del jugador — un número
   interno, nunca mostrado — a partir de sus estadísticas, equipo (rareza + nivel de mejora),
   mascotas y bonificaciones pasivas permanentes. Modular a propósito: cada factor es una función
   aparte, así que agregar un factor nuevo en el futuro no obliga a tocar los demás.

   Función pura: recibe `player` (y la config) por parámetro, nunca lo modifica ni importa estado
   del juego directamente — mismo contrato que el resto del Mapa Vivo (ver AI_RULES.md §3).
   ============================================================ */

import { COMBAT_POWER_STAT_WEIGHTS, EQUIPMENT_QUALITY_CONFIG, PET_POWER_CONFIG, PASSIVE_BONUS_WEIGHTS } from "../config/combatPower.js";

/** Suma pesada de las estadísticas base — el factor más grande, pero ya NO el único (a diferencia
 *  del sistema anterior, que usaba directamente `player.level` para decidir enemigos). */
export function computeStatScore(player, weights){
  weights = weights || COMBAT_POWER_STAT_WEIGHTS;
  return (player.level||1) * weights.level
    + (player.atk||0) * weights.atk
    + (player.matk||0) * weights.matk
    + (player.def||0) * weights.def
    + (player.maxHp||0) * weights.maxHp
    + (player.maxMp||0) * weights.maxMp
    + (player.spd||0) * weights.spd;
}

/** Calidad del equipo: rareza + nivel de mejora de cada pieza equipada, más allá de lo que esas
 *  piezas ya suman a atk/def/etc (eso ya está contado en computeStatScore vía player.atk/def
 *  reales). `rarityByKey` es RARITY_BY_KEY de items.js (se pasa por parámetro para no importar
 *  ese archivo acá y mantener este módulo desacoplado del catálogo de items). */
export function computeEquipmentQualityScore(equipment, rarityByKey, config){
  config = config || EQUIPMENT_QUALITY_CONFIG;
  if(!equipment || !rarityByKey) return 0;
  let score = 0;
  const scoreItem = (item)=>{
    if(!item || !item.rarity) return;
    const rarity = rarityByKey[item.rarity];
    if(!rarity) return;
    const upgradeLevel = item.upgradeLevel || 0;
    score += config.perSlotWeight * rarity.mult * (1 + upgradeLevel * config.upgradeStepBonus);
  };
  scoreItem(equipment.weapon);
  scoreItem(equipment.offhand);
  scoreItem(equipment.armor);
  scoreItem(equipment.helmet);
  scoreItem(equipment.boots);
  (equipment.accessory || []).forEach(scoreItem);
  return score;
}

/** Mascotas: toma hasta `maxPetsCounted` (las más fuertes del roster, por atk+def+maxHp*0.1 — la
 *  misma noción que ya usa petDamageBonus() en main.js, aplicada acá al roster completo en vez de
 *  solo a las convocadas en batalla). Cada mascota ya viene con sus stats resueltas
 *  (ensurePetStats en main.js, no se toca) — este cálculo solo las pesa. */
export function computePetPowerScore(pets, config){
  config = config || PET_POWER_CONFIG;
  if(!pets || !pets.length) return 0;
  const ranked = [...pets]
    .map(p=> ({ pet:p, strength: (p.atk||0) + (p.def||0) + (p.maxHp||0)*0.1 }))
    .sort((a,b)=> b.strength - a.strength)
    .slice(0, config.maxPetsCounted);
  return ranked.reduce((sum, {pet})=> sum + config.perPetWeight * (config.basePoints + (pet.level||1)*config.levelWeight), 0);
}

/** Bonificaciones pasivas permanentes (críticos, escudo con vida baja, y cualquiera que se agregue
 *  a PASSIVE_BONUS_WEIGHTS a futuro) — son fracciones (ej. 0.12 = 12%), el peso las convierte en
 *  puntos de CP. */
export function computePassiveBonusScore(player, weights){
  weights = weights || PASSIVE_BONUS_WEIGHTS;
  let score = 0;
  Object.keys(weights).forEach(key=>{
    if(player[key]) score += player[key] * weights[key];
  });
  return score;
}

/** Punto de entrada principal: Combat Power total del jugador. `deps` opcional para inyectar
 *  tablas externas sin acoplar este módulo a config/items.js directamente:
 *  `{ rarityByKey, statWeights, equipmentConfig, petConfig, passiveWeights }`. */
export function computeCombatPower(player, deps){
  deps = deps || {};
  if(!player) return 0;
  const statScore = computeStatScore(player, deps.statWeights);
  const equipScore = computeEquipmentQualityScore(player.equipment, deps.rarityByKey, deps.equipmentConfig);
  const petScore = computePetPowerScore(player.pets, deps.petConfig);
  const passiveScore = computePassiveBonusScore(player, deps.passiveWeights);
  return Math.round(statScore + equipScore + petScore + passiveScore);
}

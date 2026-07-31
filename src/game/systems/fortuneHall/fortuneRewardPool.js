/* ============================================================
   FortuneRewardPool — primitivas de sorteo puras del Salón de la Fortuna.
   ------------------------------------------------------------
   Cada función acá es un sorteo ponderado sobre UNA tabla/objeto de
   fortuneHall.config.js. No conoce a `player` ni a EQUIP_TABLE — eso vive un
   nivel arriba, en fortuneRewardService.js (que sí sabe resolver la
   categoría "equipment" contra el inventario real de objetos). `rng` es
   inyectable (por defecto Math.random) para que los tests sean deterministas.
   ============================================================ */
import {
  CATEGORY_WEIGHTS, GOLD_REWARD_TABLE, MATERIAL_REWARD_TABLE,
  CONSUMABLE_REWARD_TABLE, DIAMOND_REWARD_TABLE, EQUIPMENT_RARITY_WEIGHTS,
} from "../../config/fortuneHall.config.js";

/** Sorteo ponderado genérico sobre una lista de entradas con `.weight`. */
export function rollWeighted(table, rng = Math.random){
  const total = table.reduce((s, e) => s + e.weight, 0);
  let r = rng() * total;
  for(const entry of table){
    r -= entry.weight;
    if(r <= 0) return entry;
  }
  return table[table.length - 1];
}

/** Igual que rollWeighted pero sobre un objeto {clave: peso} en vez de una
 *  lista — devuelve la CLAVE elegida (usado para categorías/rarezas, donde
 *  no hace falta más forma que el nombre). */
export function rollWeightedKey(weightsObj, rng = Math.random){
  const entries = Object.entries(weightsObj).map(([key, weight]) => ({ key, weight }));
  return rollWeighted(entries, rng).key;
}

export function rollCategory(rng = Math.random){
  return rollWeightedKey(CATEGORY_WEIGHTS, rng);
}

export function rollGoldAmount(rng = Math.random){
  return rollWeighted(GOLD_REWARD_TABLE, rng).amount;
}

export function rollMaterial(rng = Math.random){
  const entry = rollWeighted(MATERIAL_REWARD_TABLE, rng);
  return { materialId: entry.materialId, quantity: entry.quantity };
}

export function rollConsumableItemId(rng = Math.random){
  return rollWeighted(CONSUMABLE_REWARD_TABLE, rng).itemId;
}

export function rollDiamondAmount(rng = Math.random){
  return rollWeighted(DIAMOND_REWARD_TABLE, rng).amount;
}

export function rollEquipmentRarity(rng = Math.random){
  return rollWeightedKey(EQUIPMENT_RARITY_WEIGHTS, rng);
}

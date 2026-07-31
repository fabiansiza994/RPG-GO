/* ============================================================
   FortuneRewardService — única puerta de entrada para "tirar una
   recompensa" del Salón de la Fortuna. Coordina fortuneRewardPool.js (los
   sorteos puros) con EQUIP_TABLE (config/items.js) para resolver la
   categoría "equipment" contra una pieza real.

   IMPORTANTE: igual que dailyMissionsService/adventurerContractsService,
   este módulo NUNCA toca `player` — recibe {classKey, level} como contexto
   y devuelve un descriptor de recompensa normalizado. Aplicarlo de verdad
   (oro, inventario, etc.) es responsabilidad de main.js
   (ver applyFortuneHallReward).
   ============================================================ */
import { EQUIP_TABLE } from "../../config/items.js";
import { FORTUNE_WHEEL_REWARDS } from "../../config/fortuneHall.config.js";
import {
  rollCategory, rollGoldAmount, rollMaterial, rollConsumableItemId,
  rollDiamondAmount, rollEquipmentRarity, rollWeighted,
} from "./fortuneRewardPool.js";

const EQUIPMENT_RARITY_FALLBACK_ORDER = ["common", "uncommon", "rare"];

/** Piezas de equipTable que mi clase puede usar YA (nivel alcanzado), de una
 *  rareza puntual — mismo predicado que equipPoolForMyClass() en main.js,
 *  pero parametrizado en vez de leer el `player` global. */
function equipmentPoolFor(equipTable, classKey, level, rarity){
  return equipTable.filter(it =>
    (!it.classKey || it.classKey === classKey) &&
    (!it.reqLevel || it.reqLevel <= level) &&
    it.rarity === rarity
  );
}

/** RARITY_REQ_OFFSET es 0 para common/uncommon/rare (ver items.js), así que
 *  en la práctica esto nunca hace falta a partir de nivel 1 — se deja como
 *  red de seguridad si esa config cambiara más adelante. Exportada para que
 *  otros minijuegos (ver rollWheelReward más abajo) resuelvan equipo real
 *  sin duplicar este predicado de clase/nivel/rareza. */
export function resolveEquipmentItem(equipTable, classKey, level, preferredRarity, rng){
  const order = [preferredRarity, ...EQUIPMENT_RARITY_FALLBACK_ORDER.filter(r => r !== preferredRarity)];
  for(const rarity of order){
    const pool = equipmentPoolFor(equipTable, classKey, level, rarity);
    if(pool.length) return pool[Math.floor(rng() * pool.length)];
  }
  return null;
}

/** Sortea UNA recompensa. Devuelve un descriptor normalizado:
 *  {category:"gold", gold}
 *  {category:"material", materialId, quantity}
 *  {category:"consumable", itemId}
 *  {category:"diamonds", diamonds}
 *  {category:"equipment", equipItemId}
 *  Si por algún motivo no hubiera equipo disponible (no debería pasar,
 *  ver resolveEquipmentItem), cae a oro en vez de devolver un premio vacío.
 *
 *  `equipTable` es inyectable (por defecto EQUIP_TABLE de items.js) por el
 *  mismo motivo que `storage`/`rng` lo son en el resto del sistema: EQUIP_TABLE
 *  se puebla en tiempo de ejecución desde main.js (ver pushEquip() ahí), así
 *  que en un entorno de test aislado (sin cargar main.js) está vacío —
 *  inyectar una tabla propia permite testear la lógica de filtrado sin
 *  depender de eso. */
export function rollReward({ classKey, level, equipTable = EQUIP_TABLE } = {}, rng = Math.random){
  const category = rollCategory(rng);
  switch(category){
    case "gold":
      return { category: "gold", gold: rollGoldAmount(rng) };
    case "materials": {
      const { materialId, quantity } = rollMaterial(rng);
      return { category: "material", materialId, quantity };
    }
    case "consumables":
      return { category: "consumable", itemId: rollConsumableItemId(rng) };
    case "diamonds":
      return { category: "diamonds", diamonds: rollDiamondAmount(rng) };
    case "equipment": {
      const rarity = rollEquipmentRarity(rng);
      const item = resolveEquipmentItem(equipTable, classKey, level || 1, rarity, rng);
      if(item) return { category: "equipment", equipItemId: item.id };
      return { category: "gold", gold: rollGoldAmount(rng) };
    }
    default:
      return { category: "gold", gold: rollGoldAmount(rng) };
  }
}

/** Sortea UNA recompensa de la Ruleta de la Fortuna — a diferencia de
 *  rollReward() (categoría -> subtabla), acá la tabla YA es la lista plana
 *  de segmentos fijos de la rueda (FORTUNE_WHEEL_REWARDS, un peso por
 *  premio) — se reutiliza rollWeighted() de fortuneRewardPool.js
 *  directamente en vez de duplicar esa selección ponderada acá.
 *
 *  Devuelve el mismo shape de descriptor que rollReward() (mismo
 *  applyFortuneHallReward/describeFortuneReward de main.js sirven para
 *  ambos) más `segmentId`: el id del segmento visual sobre el que debe
 *  detenerse la rueda — SOLO para apuntar la animación, nunca se usa para
 *  decidir ni aplicar la recompensa (la recompensa ya quedó decidida acá,
 *  antes de que exista ninguna animación). */
export function rollWheelReward({ classKey, level, equipTable = EQUIP_TABLE } = {}, rng = Math.random){
  const segment = rollWeighted(FORTUNE_WHEEL_REWARDS, rng);
  const base = { segmentId: segment.id };
  switch(segment.type){
    case "gold":
      return { ...base, category: "gold", gold: segment.amount };
    case "material":
      return { ...base, category: "material", materialId: segment.itemId, quantity: segment.amount };
    case "consumable":
      return { ...base, category: "consumable", itemId: segment.itemId };
    case "diamond":
      return { ...base, category: "diamonds", diamonds: segment.amount };
    case "equipment": {
      const item = resolveEquipmentItem(equipTable, classKey, level || 1, segment.rarity, rng);
      if(item) return { ...base, category: "equipment", equipItemId: item.id };
      return { ...base, category: "gold", gold: rollGoldAmount(rng) };
    }
    default:
      return { ...base, category: "gold", gold: rollGoldAmount(rng) };
  }
}

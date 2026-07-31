import { describe, it, expect } from "vitest";
import {
  rollWeighted, rollWeightedKey, rollCategory, rollGoldAmount, rollMaterial,
  rollConsumableItemId, rollDiamondAmount, rollEquipmentRarity,
} from "../fortuneRewardPool.js";
import {
  CATEGORY_WEIGHTS, GOLD_REWARD_TABLE, MATERIAL_REWARD_TABLE,
  CONSUMABLE_REWARD_TABLE, DIAMOND_REWARD_TABLE, EQUIPMENT_RARITY_WEIGHTS,
} from "../../../config/fortuneHall.config.js";

const SAMPLES = 500;

describe("FortuneRewardPool", ()=>{
  it("rollWeighted respeta los extremos del rng (0 -> primera entrada, casi 1 -> última)", ()=>{
    const table = [{ id: "a", weight: 1 }, { id: "b", weight: 1 }, { id: "c", weight: 1 }];
    expect(rollWeighted(table, ()=> 0).id).toBe("a");
    expect(rollWeighted(table, ()=> 0.999999).id).toBe("c");
  });

  it("rollWeightedKey nunca devuelve una clave fuera del objeto de pesos", ()=>{
    for(let i=0;i<SAMPLES;i++){
      expect(Object.keys(EQUIPMENT_RARITY_WEIGHTS)).toContain(rollWeightedKey(EQUIPMENT_RARITY_WEIGHTS));
    }
  });

  it("rollCategory siempre devuelve una categoría configurada", ()=>{
    for(let i=0;i<SAMPLES;i++){
      expect(Object.keys(CATEGORY_WEIGHTS)).toContain(rollCategory());
    }
  });

  it("rollGoldAmount solo devuelve montos de GOLD_REWARD_TABLE", ()=>{
    const validAmounts = GOLD_REWARD_TABLE.map(e=> e.amount);
    for(let i=0;i<SAMPLES;i++){
      expect(validAmounts).toContain(rollGoldAmount());
    }
  });

  it("rollMaterial solo devuelve combinaciones de MATERIAL_REWARD_TABLE", ()=>{
    for(let i=0;i<SAMPLES;i++){
      const { materialId, quantity } = rollMaterial();
      const match = MATERIAL_REWARD_TABLE.some(e=> e.materialId===materialId && e.quantity===quantity);
      expect(match).toBe(true);
    }
  });

  it("rollConsumableItemId nunca devuelve un consumible de máxima potencia (elixir_total/mana_total)", ()=>{
    const validIds = CONSUMABLE_REWARD_TABLE.map(e=> e.itemId);
    expect(validIds).not.toContain("elixir_total");
    expect(validIds).not.toContain("mana_total");
    for(let i=0;i<SAMPLES;i++){
      expect(validIds).toContain(rollConsumableItemId());
    }
  });

  it("rollDiamondAmount nunca supera 5 y 5 es mucho menos frecuente que 1", ()=>{
    let count1 = 0, count5 = 0;
    for(let i=0;i<SAMPLES;i++){
      const amount = rollDiamondAmount();
      expect(amount).toBeLessThanOrEqual(5);
      expect(DIAMOND_REWARD_TABLE.map(e=>e.amount)).toContain(amount);
      if(amount===1) count1++;
      if(amount===5) count5++;
    }
    expect(count5).toBeLessThan(count1);
  });

  it("rollEquipmentRarity nunca devuelve epic/legendary", ()=>{
    for(let i=0;i<SAMPLES;i++){
      const rarity = rollEquipmentRarity();
      expect(rarity).not.toBe("epic");
      expect(rarity).not.toBe("legendary");
      expect(Object.keys(EQUIPMENT_RARITY_WEIGHTS)).toContain(rarity);
    }
  });
});

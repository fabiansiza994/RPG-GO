import { describe, it, expect } from "vitest";
import { rollReward, rollWheelReward } from "../fortuneRewardService.js";
import { FORTUNE_WHEEL_REWARDS } from "../../../config/fortuneHall.config.js";

const CLASS_KEYS = ["guerrero", "mago", "arquero", "berserker"];

/** Tabla de equipo falsa y chica — deliberadamente incluye piezas de las 4
 *  clases + universales (classKey:null), en las 3 rarezas permitidas y en
 *  epic/legendary (para probar que estas últimas JAMÁS se eligen). Se
 *  inyecta vía el parámetro `equipTable` de rollReward (ver comentario ahí:
 *  la EQUIP_TABLE real de items.js solo se puebla al cargar main.js, que no
 *  se carga en este test). */
const FAKE_EQUIP_TABLE = [
  { id: "sword_common", classKey: "guerrero", rarity: "common", reqLevel: 1 },
  { id: "sword_rare",   classKey: "guerrero", rarity: "rare",   reqLevel: 1 },
  { id: "sword_epic",   classKey: "guerrero", rarity: "epic",   reqLevel: 1 },
  { id: "staff_common", classKey: "mago",     rarity: "common", reqLevel: 1 },
  { id: "staff_uncommon", classKey: "mago",   rarity: "uncommon", reqLevel: 1 },
  { id: "bow_common",   classKey: "arquero",  rarity: "common", reqLevel: 1 },
  { id: "bow_legendary",classKey: "arquero",  rarity: "legendary", reqLevel: 1 },
  { id: "axe_common",   classKey: "berserker",rarity: "common", reqLevel: 1 },
  { id: "armor_common", classKey: null,       rarity: "common", reqLevel: 1 },
  { id: "armor_rare",   classKey: null,       rarity: "rare",   reqLevel: 30 }, // alto nivel requerido
];

function findFakeItem(id){ return FAKE_EQUIP_TABLE.find(it=> it.id===id); }

/** Fuerza siempre la categoría "equipment" (última en CATEGORY_WEIGHTS de
 *  fortuneHall.config.js — rng casi 1 cae ahí) y una rareza concreta
 *  encadenando dos llamadas de rng consecutivas: la primera para la
 *  categoría, la segunda para la rareza dentro de EQUIPMENT_RARITY_WEIGHTS. */
function makeEquipmentRng(rarityRng){
  const calls = [0.999999, rarityRng];
  let i = 0;
  return ()=> calls[Math.min(i++, calls.length-1)];
}

describe("FortuneRewardService.rollReward", ()=>{
  it("un reward de oro/material/consumible/diamante nunca incluye equipItemId", ()=>{
    for(let i=0;i<200;i++){
      const reward = rollReward({ classKey: "guerrero", level: 50 }, Math.random);
      if(reward.category !== "equipment"){
        expect(reward.equipItemId).toBeUndefined();
      }
    }
  });

  CLASS_KEYS.forEach(classKey => {
    it(`equipItemId para ${classKey} nunca pertenece a otra clase ni es epic/legendary`, ()=>{
      for(let r=0; r<50; r++){
        const rarityRng = r / 50;
        const reward = rollReward(
          { classKey, level: 50, equipTable: FAKE_EQUIP_TABLE },
          makeEquipmentRng(rarityRng),
        );
        if(reward.category === "equipment"){
          const item = findFakeItem(reward.equipItemId);
          expect(item).toBeDefined();
          expect(item.classKey === null || item.classKey === classKey).toBe(true);
          expect(["common", "uncommon", "rare"]).toContain(item.rarity);
        }
      }
    });
  });

  it("nunca devuelve una pieza cuyo reqLevel supera el nivel del jugador", ()=>{
    for(let r=0; r<50; r++){
      const reward = rollReward(
        { classKey: "guerrero", level: 1, equipTable: FAKE_EQUIP_TABLE },
        makeEquipmentRng(r/50),
      );
      if(reward.category === "equipment"){
        const item = findFakeItem(reward.equipItemId);
        expect(item.reqLevel).toBeLessThanOrEqual(1);
      }
    }
  });

  it("si no hay ningún equipo elegible cae a oro en vez de romper", ()=>{
    const reward = rollReward(
      { classKey: "guerrero", level: 1, equipTable: [] },
      makeEquipmentRng(0),
    );
    expect(reward.category).toBe("gold");
    expect(typeof reward.gold).toBe("number");
  });
});

describe("FortuneRewardService.rollWheelReward", ()=>{
  const WHEEL_SEGMENT_IDS = FORTUNE_WHEEL_REWARDS.map(r=> r.id);

  /** Fuerza el sorteo del segmento en `segmentRng` (0..1, ubicación dentro
   *  del peso acumulado de FORTUNE_WHEEL_REWARDS) y, si ese segmento resulta
   *  ser de equipo, usa `itemPickRng` para el segundo sorteo (qué pieza
   *  puntual del pool filtrado le toca) — mismo patrón de dos llamadas de
   *  rng encadenadas que makeEquipmentRng() más arriba. */
  function makeWheelRng(segmentRng, itemPickRng = 0){
    const calls = [segmentRng, itemPickRng];
    let i = 0;
    return ()=> calls[Math.min(i++, calls.length-1)];
  }

  it("segmentId siempre es uno de los ids reales de FORTUNE_WHEEL_REWARDS", ()=>{
    for(let i=0;i<300;i++){
      const reward = rollWheelReward({ classKey: "guerrero", level: 50 }, Math.random);
      expect(WHEEL_SEGMENT_IDS).toContain(reward.segmentId);
    }
  });

  it("nunca devuelve más de 2 diamantes, y 1 diamante sale más seguido que 2", ()=>{
    let count1 = 0, count2 = 0;
    for(let i=0;i<2000;i++){
      const reward = rollWheelReward({ classKey: "guerrero", level: 50 }, Math.random);
      if(reward.category === "diamonds"){
        expect([1,2]).toContain(reward.diamonds);
        if(reward.diamonds===1) count1++; else count2++;
      }
    }
    expect(count1).toBeGreaterThan(0);
    expect(count2).toBeGreaterThan(0);
    expect(count2).toBeLessThan(count1);
  });

  CLASS_KEYS.forEach(classKey => {
    it(`equipo del segmento "poco común" para ${classKey} nunca es de otra clase ni epic/legendary`, ()=>{
      // uncommon_equipment cae justo antes del final del acumulado (98 a 99.5 de 100).
      const reward = rollWheelReward(
        { classKey, level: 50, equipTable: FAKE_EQUIP_TABLE },
        makeWheelRng(0.985, 0),
      );
      expect(reward.segmentId).toBe("uncommon_equipment");
      if(reward.category === "equipment"){
        const item = findFakeItem(reward.equipItemId);
        expect(item).toBeDefined();
        expect(item.classKey === null || item.classKey === classKey).toBe(true);
        expect(["common", "uncommon", "rare"]).toContain(item.rarity);
      }
    });

    it(`equipo del segmento "raro" para ${classKey} nunca es de otra clase ni epic/legendary`, ()=>{
      // rare_equipment es el último segmento (99.5 a 100 de 100).
      const reward = rollWheelReward(
        { classKey, level: 50, equipTable: FAKE_EQUIP_TABLE },
        makeWheelRng(0.999, 0),
      );
      expect(reward.segmentId).toBe("rare_equipment");
      if(reward.category === "equipment"){
        const item = findFakeItem(reward.equipItemId);
        expect(item).toBeDefined();
        expect(item.classKey === null || item.classKey === classKey).toBe(true);
        expect(["common", "uncommon", "rare"]).toContain(item.rarity);
      }
    });
  });

  it("si el segmento de equipo cae y no hay pieza elegible, cae a oro pero conserva el segmentId original", ()=>{
    const reward = rollWheelReward(
      { classKey: "guerrero", level: 1, equipTable: [] },
      makeWheelRng(0.999, 0),
    );
    expect(reward.segmentId).toBe("rare_equipment");
    expect(reward.category).toBe("gold");
    expect(typeof reward.gold).toBe("number");
  });

  it("las recompensas de oro/material/consumible/diamante coinciden con el segmento sorteado", ()=>{
    // gold_100 es el primer segmento (0 a 30 de 100).
    const reward = rollWheelReward({ classKey: "guerrero", level: 50 }, makeWheelRng(0.01));
    expect(reward.segmentId).toBe("gold_100");
    expect(reward.category).toBe("gold");
    expect(reward.gold).toBe(100);
  });
});

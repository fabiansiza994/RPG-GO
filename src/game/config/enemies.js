export const MONSTER_TEMPLATES = [
  {name:"Slime Salvaje", emoji:"🟢", tier:1, hpM:1.0, atkM:0.8, defM:0.8},
  {name:"Rata Mutante", emoji:"🐀", tier:1, hpM:0.85, atkM:0.95, defM:0.7},
  {name:"Cuervo Corrupto", emoji:"🐦‍⬛", tier:1, hpM:0.8, atkM:1.0, defM:0.7},
  {name:"Espectro", emoji:"👻", tier:2, hpM:1.05, atkM:1.1, defM:0.9, debuffOnHit:{stat:"atk", amount:0.15, chance:0.3}},
  {name:"Trasgo", emoji:"👺", tier:2, hpM:1.15, atkM:1.0, defM:1.0},
  {name:"Golem de Roca", emoji:"🗿", tier:3, hpM:1.5, atkM:0.9, defM:1.6, debuffOnHit:{stat:"def", amount:0.15, chance:0.3}},
  {name:"Lobo Umbrío", emoji:"🐺", tier:2, hpM:1.0, atkM:1.2, defM:0.85, aggressive:true},
  {name:"Araña Gigante", emoji:"🕷️", tier:2, hpM:0.95, atkM:1.15, defM:0.85, aggressive:true, debuffOnHit:{stat:"def", amount:0.2, chance:0.35}},
  {name:"Dragón Menor", emoji:"🐉", tier:4, hpM:1.8, atkM:1.5, defM:1.2},
  {name:"Demonio Menor", emoji:"👹", tier:3, hpM:1.3, atkM:1.3, defM:1.0, aggressive:true, debuffOnHit:{stat:"atk", amount:0.2, chance:0.3}},
];

export const THIEF_TEMPLATE = {name:"Ladrón Errante", emoji:"🥷", tier:3, hpM:1.15, atkM:1.25, defM:0.95, aggressive:true};
export const MERCHANT_TEMPLATE = {name:"Comerciante Errante", emoji:"🧙‍♂️", tier:1, hpM:1, atkM:1, defM:1};
export const VAGABUNDO_TEMPLATE = {name:"Vagabundo", emoji:"🧔", tier:1, hpM:1, atkM:1, defM:1};
export const VAGABUNDO_COST = 40;

/** Enemigo especial: solo aparece de noche, rarísima vez, justo a medianoche. Nivel fijo, muy fuerte,
 *  se cura con Aullido Lunar y golpea más fuerte cuando le queda poca vida. No se puede atrapar
 *  (el intento de captura simplemente falla siempre, como si tuviera muy mala suerte). */
export const LOBO_NOCTURNO_TEMPLATE = {name:"Lobo Nocturno", emoji:"🐺", tier:5, hpM:3.4, atkM:2.0, defM:1.5,
  fixedLevel:50, uncapturable:true, aggressive:true, canSelfHeal:true, enrageBelow:0.3, enrageMult:1.6};

/** Reto especial nocturno para personajes de Nv.50+: el Lobo Sombrío. Sale sin aviso, esquiva muy
 *  bien (incluso ataques cargados), puede desatar un súper ataque cargado de 2 turnos que hay que
 *  esquivar con un patrón de gestos, se cura al 100% una sola vez al cruzar el 30% de vida, y huye
 *  si baja del 20% (para volver más fuerte la próxima vez). Sus stats se calibran en tiempo real
 *  según los del jugador (ver makeShadowWolfMonster en main.js), no usa hpM/atkM/defM fijos. */
export const LOBO_SOMBRIO_TEMPLATE = {name:"Lobo Sombrío", emoji:"🐺", tier:6,
  uncapturable:true, aggressive:true, isShadowWolf:true,
  fullHealOnceBelow:0.3, fleeBelow:0.2, evasionChance:0.45};

export const BOSS_TEMPLATES = [
  {name:"Behemot de Piedra", emoji:"🗿", hpM:5.5, atkM:2.0, defM:2.2},
  {name:"Dragón Ancestral", emoji:"🐉", hpM:5.0, atkM:2.3, defM:1.8},
  {name:"Señor Demonio", emoji:"👹", hpM:5.2, atkM:2.1, defM:2.0},
  {name:"Rey Trasgo", emoji:"👺", hpM:4.8, atkM:2.0, defM:1.9},
];

export const PROC_LABELS = {burn:"🔥 Quema", poison:"☠️ Envenena", haste:"💨 Acelera"};

export const BOSS_LOOT_THEMES = {
  "Behemot de Piedra": {
    slot:"armor", name:"Armadura de Behemot", emoji:"🗿", auraColor:"#aab2c5",
    baseBonuses:{def:2, maxHp:3}, proc:null
  },
  "Dragón Ancestral": {
    slot:"weapon", auraColor:"#c98bf0", emoji:"🐉",
    weaponNames:{ guerrero:"Espada de Hoja de Dragón", mago:"Cetro de Escamas de Dragón",
      arquero:"Arco de Colmillo de Dragón", berserker:"Hacha de Garra de Dragón" },
    baseBonuses:{atk:1.4}, proc:{type:"burn", chance:0.25, mult:0.5}
  },
  "Señor Demonio": {
    slot:"weapon", auraColor:"#ef5d6f", emoji:"👹",
    weaponNames:{ guerrero:"Espada Demoníaca", mago:"Cetro Demoníaco",
      arquero:"Arco Demoníaco", berserker:"Hacha Demoníaca" },
    baseBonuses:{atk:1, matk:1}, proc:{type:"poison", chance:0.25, mult:0.5}
  },
  "Rey Trasgo": {
    slot:"accessory", name:"Anillo del Rey Trasgo", emoji:"💍", auraColor:"#4fd67a",
    baseBonuses:{spd:1, atk:1}, proc:{type:"haste", chance:0.25}
  },
  "Lobo Nocturno": {
    slot:"weapon", auraColor:"#7ec8e3", emoji:"🌙",
    weaponNames:{ guerrero:"Espada Lunar", mago:"Cetro Lunar",
      arquero:"Arco Lunar", berserker:"Hacha Lunar" },
    baseBonuses:{atk:1.8, spd:1}, proc:{type:"haste", chance:0.2}
  }
};

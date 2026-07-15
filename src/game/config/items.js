export const ITEM_TABLE = [
  {id:"potion_s", name:"Poción pequeña", emoji:"🧪", type:"heal", amount:0.3, weight:34, value:20, desc:"Restaura 30% de tu HP."},
  {id:"potion_m", name:"Poción de maná", emoji:"🔵", type:"mana", amount:0.4, weight:22, value:18, desc:"Restaura 40% de tu MP."},
  {id:"elixir", name:"Elixir mayor", emoji:"⚗️", type:"heal", amount:0.6, weight:10, value:45, desc:"Restaura 60% de tu HP."},
  {id:"elixir_total", name:"Elixir de Vida Total", emoji:"💖", type:"heal", amount:1.0, weight:4, value:95, desc:"Restaura 100% de tu HP."},
  {id:"mana_total", name:"Cristal de Maná Puro", emoji:"💠", type:"mana", amount:1.0, weight:4, value:85, desc:"Restaura 100% de tu MP."},
  {id:"gem_atk", name:"Gema de Fuerza", emoji:"🔺", type:"stat", stat:"atk", amount:1, weight:12, value:35, desc:"+1 ATQ permanente."},
  {id:"gem_def", name:"Gema de Defensa", emoji:"🔷", type:"stat", stat:"def", amount:1, weight:12, value:35, desc:"+1 DEF permanente."},
  {id:"gem_spd", name:"Gema de Viento", emoji:"🟡", type:"stat", stat:"spd", amount:1, weight:8, value:30, desc:"+1 VEL permanente."},
  {id:"gem_hp", name:"Núcleo Vital", emoji:"❤️", type:"stat", stat:"maxHp", amount:4, weight:8, value:30, desc:"+4 HP máx. permanente."},
  {id:"gem_mp", name:"Núcleo Arcano", emoji:"💙", type:"stat", stat:"maxMp", amount:3, weight:8, value:30, desc:"+3 MP máx. permanente."},
  {id:"gem_matk", name:"Gema Astral", emoji:"🟣", type:"stat", stat:"matk", amount:1, weight:10, value:35, desc:"+1 AT.MÁG permanente."},
  {id:"gem_atk_big", name:"Gema de Fuerza Mayor", emoji:"🔻", type:"stat", stat:"atk", amount:3, weight:3, value:95, desc:"+3 ATQ permanente."},
  {id:"gem_def_big", name:"Gema de Defensa Mayor", emoji:"🔹", type:"stat", stat:"def", amount:3, weight:3, value:95, desc:"+3 DEF permanente."},
];

export const PET_ITEM_TABLE = [
  {id:"pet_treat", name:"Golosina de Entrenamiento", emoji:"🦴", type:"pet_item", petLevelUp:1, value:60, desc:"Sube el nivel de una mascota +1."},
  {id:"pet_collar", name:"Collar de Vínculo", emoji:"🎗️", type:"pet_item", petLevelUp:2, value:120, desc:"Sube el nivel de una mascota +2."},
];

export const TEST_SHOP_ITEMS = [
  {id:"capture_card_test", name:"Carta de Captura", emoji:"🎴", type:"capture_card", tradeable:false, value:150,
    desc:"[PRUEBA] Úsala en combate cuando el enemigo tenga poca vida para capturarlo como mascota."},
];

export const RARITY_TIERS = [
  {key:"common",    label:"Común",          color:"#aab2c5", mult:1.0, priceMult:1,  weight:30},
  {key:"uncommon",  label:"Poco Común",     color:"#4fd67a", mult:1.7, priceMult:2.4, weight:18},
  {key:"rare",      label:"Raro",           color:"#4aa3e0", mult:2.6, priceMult:5,  weight:10},
  {key:"epic",      label:"✨ Épico",        color:"#c98bf0", mult:6.5, priceMult:22, weight:4},
  {key:"legendary", label:"👑 Legendario",   color:"#e8c468", mult:11,  priceMult:55, weight:1},
];

export const RARITY_BY_KEY = Object.fromEntries(RARITY_TIERS.map(t=>[t.key,t]));
export const STAT_LABEL = {atk:"ATQ", matk:"AT.MÁG", def:"DEF", spd:"VEL", maxHp:"HP máx.", maxMp:"MP máx.", critBonus:"% crítico", lowHpShield:"escudo con vida baja"};

export const LEVEL_TIERS = [
  {reqBase:1,  mult:1.0, priceMult:1.0, suffix:""},
  {reqBase:30, mult:1.9, priceMult:2.6, suffix:" Real"},
  {reqBase:45, mult:3.0, priceMult:4.8, suffix:" Ancestral"},
  {reqBase:60, mult:4.6, priceMult:8,   suffix:" Celestial"},
  {reqBase:75, mult:6.8, priceMult:13,  suffix:" Divina"},
  {reqBase:90, mult:9.5, priceMult:20,  suffix:" Primordial"},
];

export const WEAPON_BASE = {
  guerrero:  {name:"Espada",  emoji:"⚔️", bonuses:{atk:3}},
  mago:      {name:"Cetro",   emoji:"🔮", bonuses:{atk:1, matk:4, maxMp:4}},
  arquero:   {name:"Arco",    emoji:"🏹", bonuses:{atk:3, spd:1}},
  berserker: {name:"Hacha",   emoji:"🪓", bonuses:{atk:4}},
};

export const ARMOR_BASE   = {name:"Armadura", emoji:"🛡️", bonuses:{def:3, maxHp:5}};
export const HELMET_BASE  = {name:"Casco",    emoji:"⛑️", bonuses:{def:2, maxHp:3, maxMp:2}};
export const BOOTS_BASE   = {name:"Botas",    emoji:"👢", bonuses:{spd:2, def:1}};
export const ACCESSORY_BASES = [
  {name:"Anillo",    emoji:"💍", bonuses:{atk:2, matk:1}},
  {name:"Collar",    emoji:"📿", bonuses:{maxHp:4, maxMp:2}},
  {name:"Talismán",  emoji:"🧿", bonuses:{spd:1, matk:2}},
  {name:"Brazalete", emoji:"⛓️", bonuses:{def:2, spd:1}},
  {name:"Amuleto",   emoji:"🪬", bonuses:{atk:1, def:1, maxHp:2}},
];

/** Accesorios exclusivos del arquero: uno sube la probabilidad de crítico, el otro da un escudo cuando la vida está baja. */
export const ARCHER_ACCESSORY_BASES = [
  {name:"Brazalete de Precisión", emoji:"🎯", classKey:"arquero", bonuses:{critBonus:0.12}, desc:"+12% de probabilidad de golpe crítico."},
  {name:"Capa de Resguardo",      emoji:"🧣", classKey:"arquero", bonuses:{lowHpShield:0.2}, desc:"Cuando tu vida baje del 30%, absorbes el siguiente golpe (una vez por combate)."},
];

/** Mano secundaria: el berserker pelea a dos armas (dagas), el guerrero se cubre con un escudo. */
export const DAGGER_BASE = {name:"Dagas Gemelas", emoji:"🗡️", bonuses:{atk:3, spd:2, def:-1}};
export const SHIELD_BASE = {name:"Escudo de Guerra", emoji:"🛡️", bonuses:{def:5, maxHp:8}};

/** Libros de hechizo: accesorios exclusivos del mago. Mientras lo lleves puesto, aprendes su movimiento;
 *  si no tienes espacio, reemplaza temporalmente el último movimiento aprendido (vuelve solo al quitarlo). */
export const BOOK_BASES = {
  fuego:  {name:"Libro de Fuego",  emoji:"📕", moveName:"Bola de Fuego",   moveType:"magic", movePower:1.6, moveCost:5},
  trueno: {name:"Libro de Trueno", emoji:"📘", moveName:"Rayo",            moveType:"magic", movePower:1.9, moveCost:6},
  hielo:  {name:"Libro de Hielo",  emoji:"📗", moveName:"Lanza de Hielo",  moveType:"magic", movePower:1.5, moveCost:5, slow:0.2},
};
export const BOOK_RARITY_TIERS = [
  {key:"common",    label:"Común",        mult:1.0, priceMult:1,  weight:30},
  {key:"rare",      label:"Raro",         mult:1.4, priceMult:3,  weight:12},
  {key:"epic",      label:"✨ Épico",      mult:1.9, priceMult:9,  weight:4},
  {key:"legendary", label:"👑 Legendario", mult:2.6, priceMult:20, weight:1},
];

/** Libros únicos que sueltan los jefes de región al derrotarlos (no se venden en la tienda, solo para el mago). */
export const BOSS_BOOK_TABLE = [
  {id:"book_boss_lobo", name:"Libro del Lobo Umbrío", emoji:"📓", type:"book", slot:"accessory", classKey:"mago", rarity:"legendary", value:0,
    teachMove:{id:"libro_boss_lobo", name:"Aullido Sombrío", type:"phys", power:2.2, cost:4, debuff:{stat:"def",amount:0.2}, desc:"Movimiento único enseñado por el Libro del Lobo Umbrío."},
    desc:"Botín único del guardián de esta región. Mientras lo lleves puesto, aprendes Aullido Sombrío."},
  {id:"book_boss_demonio", name:"Libro del Demonio Menor", emoji:"📓", type:"book", slot:"accessory", classKey:"mago", rarity:"legendary", value:0,
    teachMove:{id:"libro_boss_demonio", name:"Llama Infernal", type:"magic", power:2.4, cost:6, desc:"Movimiento único enseñado por el Libro del Demonio Menor."},
    desc:"Botín único del guardián de esta región. Mientras lo lleves puesto, aprendes Llama Infernal."},
  {id:"book_boss_golem", name:"Libro del Golem de Roca", emoji:"📓", type:"book", slot:"accessory", classKey:"mago", rarity:"legendary", value:0,
    teachMove:{id:"libro_boss_golem", name:"Puño Sísmico", type:"phys", power:2.0, cost:5, stun:0.25, desc:"Movimiento único enseñado por el Libro del Golem de Roca."},
    desc:"Botín único del guardián de esta región. Mientras lo lleves puesto, aprendes Puño Sísmico."},
  {id:"book_boss_dragon", name:"Libro del Dragón Menor", emoji:"📓", type:"book", slot:"accessory", classKey:"mago", rarity:"legendary", value:0,
    teachMove:{id:"libro_boss_dragon", name:"Aliento Dracónico", type:"magic", power:2.6, cost:7, desc:"Movimiento único enseñado por el Libro del Dragón Menor."},
    desc:"Botín único del guardián de esta región. Mientras lo lleves puesto, aprendes Aliento Dracónico."},
];

/** Genera un libro comprable por cada combinación tipo × rareza (más rareza = hechizo más fuerte). */
function buildBook(key, base, tier){
  const name = tier.key==="common" ? base.name : `${base.name} ${tier.label.replace(/^✨ |^👑 /,'')}`;
  return {
    id:`book_${key}_${tier.key}`, name, emoji:base.emoji, type:"book", slot:"accessory", classKey:"mago", rarity:tier.key,
    value: Math.round(70*tier.priceMult),
    teachMove:{ id:`libro_${key}_${tier.key}`, name:base.moveName, type:base.moveType,
      power:+(base.movePower*tier.mult).toFixed(2), cost:base.moveCost, slow:base.slow,
      desc:`Movimiento enseñado por ${name}.` },
    desc:`Mientras lo lleves puesto, aprendes ${base.moveName}. Al quitarlo, recuperas tu movimiento de antes.`
  };
}
export const BOOK_TABLE = [];
Object.entries(BOOK_BASES).forEach(([key, base])=>{
  BOOK_RARITY_TIERS.forEach(tier=> BOOK_TABLE.push(buildBook(key, base, tier)));
});

export const EQUIP_TABLE = [];
export const RARITY_REQ_OFFSET = {common:0, uncommon:0, rare:0, epic:30, legendary:45};

export const EQUIP_SLOTS = [
  {key:"weapon",    label:"Arma",      emoji:"🗡️"},
  {key:"offhand",   label:"Mano secundaria", emoji:"🛡️", classOnly:["berserker","guerrero"]},
  {key:"armor",     label:"Armadura",  emoji:"🛡️"},
  {key:"helmet",    label:"Casco",     emoji:"⛑️"},
  {key:"boots",     label:"Botas",     emoji:"👢"},
  {key:"accessory", label:"Accesorio", emoji:"💍"},
];

export const EXCLUSIVE_TABLE = [
  {id:"ex_cape", name:"Capa del Cazador de Sombras", emoji:"🧣", type:"equip", slot:"accessory", classKey:null, rarity:"legendary",
    bonuses:{spd:4, atk:3, matk:3}, value:420, desc:"+4 VEL, +3 ATQ, +3 AT.MÁG · exclusivo del comerciante"},
  {id:"ex_crown", name:"Corona del Vacío", emoji:"👑", type:"equip", slot:"helmet", classKey:null, rarity:"legendary",
    bonuses:{maxHp:20, maxMp:20, def:4}, value:430, desc:"+20 HP, +20 MP, +4 DEF · exclusivo del comerciante"},
  {id:"ex_elixir", name:"Elixir Prohibido", emoji:"🧪", type:"heal", amount:1.0, value:120, desc:"Restaura 100% de tu HP · exclusivo del comerciante"},
  {id:"ex_boots", name:"Botas del Viento Fantasma", emoji:"👢", type:"equip", slot:"boots", classKey:null, rarity:"epic",
    bonuses:{spd:6, def:2}, value:260, desc:"+6 VEL, +2 DEF · exclusivo del comerciante"},
  {id:"ex_orb", name:"Orbe del Archimago Perdido", emoji:"🔮", type:"equip", slot:"weapon", classKey:"mago", rarity:"legendary",
    bonuses:{atk:2, matk:18, maxMp:16}, value:440, desc:"+2 ATQ, +18 AT.MÁG, +16 MP máx. · exclusivo del comerciante"},
];

/** Catálogo grande de armas especiales (con efecto propio) usado para armar la Oferta Semanal de la tienda
 *  y el surtido de los comerciantes errantes. No se muestran todas a la vez — cada semana / cada aparición
 *  del comerciante se elige un subconjunto distinto, así siempre hay algo nuevo que ver. */
export const ROTATING_WEAPON_POOL = [
  {id:"rot_gflame",  name:"Espadón Flamígero",     emoji:"🔥", classKey:"guerrero",  rarity:"epic",
    bonuses:{atk:14, def:2}, proc:{type:"burn", chance:0.28}, desc:"+14 ATQ, +2 DEF"},
  {id:"rot_gvenom",  name:"Filo Serpentino",       emoji:"☠️", classKey:"guerrero",  rarity:"epic",
    bonuses:{atk:12, spd:2}, proc:{type:"poison", chance:0.3}, desc:"+12 ATQ, +2 VEL"},
  {id:"rot_gstorm",  name:"Espada del Vendaval",   emoji:"💨", classKey:"guerrero",  rarity:"rare",
    bonuses:{atk:9, spd:4}, proc:{type:"haste", chance:0.25}, desc:"+9 ATQ, +4 VEL"},
  {id:"rot_gtitan",  name:"Mandoble del Titán",    emoji:"🗿", classKey:"guerrero",  rarity:"legendary",
    bonuses:{atk:18, def:4}, proc:null, desc:"+18 ATQ, +4 DEF"},
  {id:"rot_grisk",   name:"Espada del Temerario",  emoji:"⚡", classKey:"guerrero",  rarity:"epic",
    bonuses:{atk:22, def:-4}, proc:null, desc:"+22 ATQ, -4 DEF · todo ataque, nada de defensa"},
  {id:"rot_gguard",  name:"Espada Disciplinada",   emoji:"🛡️", classKey:"guerrero",  rarity:"rare",
    bonuses:{atk:7, def:6}, proc:null, desc:"+7 ATQ, +6 DEF · rinde menos pero aguanta mucho más"},

  {id:"rot_mfrost",  name:"Cetro del Frío Eterno", emoji:"❄️", classKey:"mago",      rarity:"epic",
    bonuses:{matk:15, maxMp:10}, proc:{type:"haste", chance:0.2}, desc:"+15 AT.MÁG, +10 MP máx."},
  {id:"rot_mvenom",  name:"Cetro de la Plaga",     emoji:"☠️", classKey:"mago",      rarity:"epic",
    bonuses:{matk:13, def:1}, proc:{type:"poison", chance:0.32}, desc:"+13 AT.MÁG, +1 DEF"},
  {id:"rot_minferno",name:"Cetro del Averno",      emoji:"🔥", classKey:"mago",      rarity:"rare",
    bonuses:{matk:10, maxMp:8}, proc:{type:"burn", chance:0.3}, desc:"+10 AT.MÁG, +8 MP máx."},
  {id:"rot_marchsage",name:"Cetro del Archisabio", emoji:"📘", classKey:"mago",      rarity:"legendary",
    bonuses:{matk:19, maxMp:14}, proc:null, desc:"+19 AT.MÁG, +14 MP máx."},
  {id:"rot_mrisk",   name:"Cetro del Riesgo Arcano", emoji:"⚡", classKey:"mago",    rarity:"epic",
    bonuses:{matk:20, maxHp:-10}, proc:null, desc:"+20 AT.MÁG, -10 HP máx. · poder puro, a cambio de fragilidad"},
  {id:"rot_mguard",  name:"Cetro Protector",       emoji:"🛡️", classKey:"mago",     rarity:"rare",
    bonuses:{matk:8, def:4, maxMp:5}, proc:null, desc:"+8 AT.MÁG, +4 DEF, +5 MP máx. · más equilibrado"},

  {id:"rot_awind",   name:"Arco del Viento Cortante", emoji:"💨", classKey:"arquero", rarity:"epic",
    bonuses:{atk:11, spd:5}, proc:{type:"haste", chance:0.3}, desc:"+11 ATQ, +5 VEL"},
  {id:"rot_avenom",  name:"Arco de Puntas Venenosas", emoji:"☠️", classKey:"arquero", rarity:"epic",
    bonuses:{atk:10, spd:2}, proc:{type:"poison", chance:0.3}, desc:"+10 ATQ, +2 VEL"},
  {id:"rot_afire",   name:"Arco de Flechas Ardientes",emoji:"🔥", classKey:"arquero", rarity:"rare",
    bonuses:{atk:9, def:1}, proc:{type:"burn", chance:0.26}, desc:"+9 ATQ, +1 DEF"},
  {id:"rot_ahawk",   name:"Arco del Halcón Real",     emoji:"🦅", classKey:"arquero", rarity:"legendary",
    bonuses:{atk:15, spd:6}, proc:null, desc:"+15 ATQ, +6 VEL"},
  {id:"rot_asniper", name:"Arco de Precisión Letal",  emoji:"🎯", classKey:"arquero", rarity:"epic",
    bonuses:{atk:19, spd:-4}, proc:null, desc:"+19 ATQ, -4 VEL · golpes durísimos, pero más lento"},
  {id:"rot_askirmish",name:"Arco Ágil de Escaramuza", emoji:"🌬️", classKey:"arquero", rarity:"rare",
    bonuses:{atk:6, spd:8}, proc:null, desc:"+6 ATQ, +8 VEL · pega poco pero casi siempre golpea primero"},

  {id:"rot_bblood",  name:"Hacha de Sangre Hirviente", emoji:"🔥", classKey:"berserker", rarity:"epic",
    bonuses:{atk:16, def:-1}, proc:{type:"burn", chance:0.3}, desc:"+16 ATQ, -1 DEF"},
  {id:"rot_bvenom",  name:"Hacha Ponzoñosa",           emoji:"☠️", classKey:"berserker", rarity:"epic",
    bonuses:{atk:13, spd:1}, proc:{type:"poison", chance:0.32}, desc:"+13 ATQ, +1 VEL"},
  {id:"rot_brage",   name:"Hacha de la Furia Veloz",   emoji:"💨", classKey:"berserker", rarity:"rare",
    bonuses:{atk:11, spd:3}, proc:{type:"haste", chance:0.28}, desc:"+11 ATQ, +3 VEL"},
  {id:"rot_bworld",  name:"Hacha Rompemundos",         emoji:"🌋", classKey:"berserker", rarity:"legendary",
    bonuses:{atk:20}, proc:null, desc:"+20 ATQ"},
  {id:"rot_bsacrifice",name:"Hacha del Sacrificio",    emoji:"⚡", classKey:"berserker", rarity:"epic",
    bonuses:{atk:24, def:-3, maxHp:-6}, proc:null, desc:"+24 ATQ, -3 DEF, -6 HP máx. · el mayor golpe posible, al precio más alto"},
  {id:"rot_bguard",  name:"Hacha Defensiva de Guardia", emoji:"🛡️", classKey:"berserker", rarity:"rare",
    bonuses:{atk:9, def:5}, proc:null, desc:"+9 ATQ, +5 DEF · un berserker que también aguanta golpes"},
];

export const EQUIP_UPGRADE_MAX = 5;

export const ATTR_DEFS = [
  {key:"maxHp", label:"Vida", emoji:"❤️", per:4},
  {key:"maxMp", label:"Maná", emoji:"🔵", per:2},
  {key:"atk",   label:"Ataque físico", emoji:"⚔️", per:1},
  {key:"matk",  label:"Ataque mágico", emoji:"🔮", per:1},
  {key:"def",   label:"Defensa", emoji:"🛡️", per:1},
  {key:"spd",   label:"Velocidad", emoji:"💨", per:0.6},
];

export const SHOP_CATEGORIES = [
  {key:"weekly",    label:"🌟 Oferta Semanal", test:it=> it.isWeeklyOffer},
  {key:"weapon",    label:"Armas",           test:it=> it.slot==="weapon" && !it.isWeeklyOffer},
  {key:"offhand",   label:"Mano secundaria", test:it=> it.slot==="offhand", classOnly:["berserker","guerrero"]},
  {key:"armor",     label:"Armaduras",       test:it=> it.slot==="armor"},
  {key:"helmet",    label:"Cascos",          test:it=> it.slot==="helmet"},
  {key:"boots",     label:"Botas",           test:it=> it.slot==="boots"},
  {key:"accessory", label:"Accesorios",      test:it=> it.slot==="accessory" && it.type!=="book"},
  {key:"books",     label:"📖 Libros",        test:it=> it.type==="book", classOnly:["mago"]},
  {key:"potion",    label:"Pociones",        test:it=> it.type==="heal"||it.type==="mana"},
  {key:"special",   label:"Objetos especiales", test:it=> it.type==="stat"},
  {key:"pets",      label:"🐾 Mascotas",     test:it=> it.type==="pet_item", requiresPet:true},
  {key:"test",      label:"🧪 Pruebas",      test:it=> it.type==="capture_card", hidden:true},
];

export const SHOP_PREVIEW_LEVEL_CAP = 50;

/** Códigos de regalo canjeables desde la tienda. Cada uno se puede usar una sola vez por personaje. */
export const GIFT_CODES = {
  "SHOWMETHEMONEY": {type:"gold", amount:500},
  "GIVEMETHEPOWER": {type:"weapon"},
  "CAPTORS": {type:"capture_card", reusable:true},
};

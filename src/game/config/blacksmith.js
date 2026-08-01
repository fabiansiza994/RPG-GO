/* ============================================================
   HERRERO — fabricación de armas exclusivas a partir de materiales.

   Responsabilidad de este archivo: SOLO los datos — qué materiales sueltan qué monstruos
   (CRAFT_MATERIALS) y qué recetas ofrece el Herrero (BLACKSMITH_RECIPES). Vive dentro de la Forja
   existente (ver forgeOverlay/renderForge en main.js, pestaña "Fabricar") en vez de una pantalla
   aparte — la Forja ya es accesible desde el mapa (menú ☰ → 🔨) y desde la Base, y temáticamente
   YA es "el herrero" (repara equipo con oro + material); esto solo le agrega fabricar piezas
   nuevas, no crea un segundo NPC/pantalla redundante.

   Cada receta ES el molde del objeto final (id/name/emoji/type/slot/classKey/rarity/bonuses/proc/
   value/desc, exactamente como cualquier fila de EQUIP_TABLE — findItemById en main.js también
   busca acá) más `materials`, la lista de lo que hay que pagar para forjarla. `materials` mezcla
   sin distinción recursos del mundo (wood/stone/iron/crystals, en player.<key>) y materiales de
   combate (player.craftMats[key], ver CRAFT_MATERIALS) — resolveMaterialQty/spendMaterial en
   main.js saben leer los dos por igual.
   ============================================================ */

/** Material de combate que sueltan monstruos puntuales al derrotarlos — aparte del oro/ítems de
 *  siempre (ver rollCraftMaterialDrops en main.js), nunca ocupa espacio del inventario (vive en
 *  player.craftMats, un objeto aparte). Agregar un material nuevo es una fila más acá; no hace
 *  falta tocar ninguna otra tabla de monstruos para que empiece a soltarlo.
 *  `sellValue` es lo que paga la tienda por unidad (ver renderShopSellList en main.js) — precio
 *  bajo a propósito, ya que sirven principalmente para fabricar en la Forja, no para vender. */
/** Cuánto tarda en completarse la fabricación, según la rareza de la receta — pedido explícito:
 *  "por qué deberíamos poner tiempo [de fabricación], que pueda acortarse viendo anuncio o con
 *  diamantes". No hay opción de acelerar con oro acá a propósito (a diferencia de las mejoras de
 *  equipo): estas son armas exclusivas de alto valor, el freno real debe venir de diamantes/
 *  anuncios, no de oro (que se junta fácil). Ver startCraftWeapon/checkForgeCraftTimers en main.js. */
export const CRAFT_DURATION_MIN_BY_RARITY = {common:10, rare:20, epic:45, legendary:90};
export const CRAFT_DEFAULT_DURATION_MIN = 30;
/** Acelerar la fabricación en curso con diamantes: Math.ceil(minutosRestantes / este valor),
 *  mínimo 1 diamante. */
export const CRAFT_RUSH_MIN_PER_DIAMOND = 8;

export const CRAFT_MATERIALS = [
  {key:"colmillo_lobo",   label:"Colmillo de Lobo",        emoji:"🦷", monsterName:"Lobo Umbrío",   dropChance:0.35, min:1, max:2, sellValue:4},
  {key:"piel_lobo",       label:"Piel de Lobo",            emoji:"🐺", monsterName:"Lobo Umbrío",   dropChance:0.30, min:1, max:2, sellValue:3},
  {key:"telarana_arana",  label:"Telaraña de Araña",       emoji:"🕸️", monsterName:"Araña Gigante", dropChance:0.40, min:1, max:3, sellValue:3},
  {key:"cuerno_demonio",  label:"Cuerno de Demonio Menor", emoji:"👹", monsterName:"Demonio Menor",  dropChance:0.30, min:1, max:1, sellValue:6},
  {key:"alma_espectro",   label:"Alma de Espectro",        emoji:"👻", monsterName:"Espectro",       dropChance:0.30, min:1, max:2, sellValue:5},
];

/** Recetas disponibles en el Herrero — arma exclusiva, solo se consigue fabricándola (no aparece
 *  en la tienda ni como botín aleatorio). `nightDmgBonus` (0..1, ej. 0.35 = +35%) es opcional —
 *  mismo mecanismo que ya usa la Espada Lunar del Lobo Nocturno (ver isEspadaLunarEquipped/
 *  effectiveAtk en main.js), generalizado para que cualquier arma fabricada pueda tenerlo. */
export const BLACKSMITH_RECIPES = [
  {
    id:"craft_espada_colmillo_lobo", name:"Espada Colmillo de Lobo", emoji:"🗡️",
    type:"equip", slot:"weapon", classKey:"guerrero", rarity:"epic", value:600,
    bonuses:{atk:17, spd:3}, proc:{type:"haste", chance:0.3},
    materials:[{key:"iron", amount:100}, {key:"colmillo_lobo", amount:20}, {key:"wood", amount:40}, {key:"piel_lobo", amount:60}],
    desc:"+17 ATQ, +3 VEL · 30% de acelerarte al golpear. Forjada con las presas de la manada.",
  },
  {
    id:"craft_arco_demoniaco", name:"Arco Demoníaco", emoji:"🏹",
    type:"equip", slot:"weapon", classKey:"arquero", rarity:"epic", value:600,
    bonuses:{atk:15, spd:2}, proc:{type:"burn", chance:0.25}, nightDmgBonus:0.35,
    materials:[{key:"telarana_arana", amount:100}, {key:"wood", amount:100}, {key:"cuerno_demonio", amount:15}],
    desc:"+15 ATQ, +2 VEL · 25% de quemar al golpear, y 35% de daño extra durante la noche.",
  },
  {
    // `defShred`/`stunChance` son campos genéricos (mismo criterio que `nightDmgBonus` en el Arco
    // Demoníaco de arriba): CUALQUIER arma con estos campos aplica el efecto sola, sin hacer falta
    // un caso especial por arma — ver applyWeaponOnHitEffects en main.js.
    id:"craft_hacha_espectral", name:"Hacha Espectral", emoji:"🪓",
    type:"equip", slot:"weapon", classKey:"berserker", rarity:"epic", value:650,
    bonuses:{atk:18}, defShred:0.06, stunChance:0.2,
    materials:[{key:"alma_espectro", amount:100}, {key:"iron", amount:100}, {key:"wood", amount:40}],
    desc:"+18 ATQ · cada golpe desgasta un poco la DEF del rival, y puede dejarlo aturdido un turno. Forjada con almas atrapadas entre este mundo y el siguiente.",
  },
];

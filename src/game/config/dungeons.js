/* ============================================================
   MAZMORRAS LEGENDARIAS — Capa de contenido nueva, config-driven (mismo espíritu que
   regions.js/biomes.js: el motor genérico vive en main.js y nunca cambia; una mazmorra
   nueva es agregar una entrada más acá).

   Esta primera entrada ("Fortaleza del Señor Oscuro") es la mazmorra piloto — sirve de
   plantilla para las que vengan después. Alcance de este piloto (acordado en el diseño
   antes de implementar): una sola dificultad (escala por nivel del jugador, como el
   Coliseo), 4 tipos de evento de piso (combate/élite/cofre/bendición — comerciante y
   sala secreta quedan para v2), sin grupo por proximidad todavía, sin selector de
   título/marco (se auto-equipan al completar el set).
   ============================================================ */

/** El jefe final vive acá (no en BOSS_TEMPLATES de enemies.js) a propósito: ese array
 *  alimenta el pool aleatorio de jefes de torre y de rondas de Coliseo — si "Señor
 *  Oscuro" estuviera ahí, podría aparecer como jefe genérico fuera de su mazmorra,
 *  rompiendo la idea de que es un jefe EXCLUSIVO de este contenido. */
export const DUNGEON_BOSS_TEMPLATES = {
  senor_oscuro: {name:"Señor Oscuro", emoji:"🖤", hpM:6.2, atkM:2.4, defM:2.1},
};

/** Enemigos que rondan la niebla oscura alrededor del portal (no dentro de la mazmorra en sí) —
 *  viven acá, separados de MONSTER_TEMPLATES, para que solo aparezcan DENTRO del radio del aura de
 *  su propio portal y no en el spawn genérico de toda la ciudad (mismo criterio que ya se usa
 *  para separar DUNGEON_BOSS_TEMPLATES de BOSS_TEMPLATES). `aggressive:true` hace que
 *  checkAmbush() lo ataque solo si te acercas, igual que cualquier otro enemigo agresivo del
 *  mundo — no hizo falta inventar un sistema de combate nuevo. `nightMult` escala sus stats
 *  (no las de otros monstruos) cuando es de noche. Cada clave es un ARRAY: un portal puede tener
 *  más de un tipo de esbirro rondando su niebla (maybeSpawnDungeonAuraEnemy elige uno al azar en
 *  cada spawn), en vez de forzar una entrada nueva por enemigo. `spriteKey` identifica cuál set
 *  de sprites de spriteRegistry.js usar (ver ese mapeo en main.js, junto a DEMONIO_OSCURO_SPRITES). */
export const DUNGEON_AURA_ENEMY_TEMPLATES = {
  senor_oscuro: [
    {name:"Demonio Oscuro", emoji:"😈", spriteKey:"demonio_oscuro", hpM:1.6, atkM:1.5, defM:1.2, aggressive:true, nightMult:1.45, dropsDarkEssence:true},
    {name:"Sabueso Oscuro", emoji:"🐺", spriteKey:"sabueso_oscuro", hpM:1.3, atkM:1.75, defM:1.0, aggressive:true, nightMult:1.45, dropsDarkEssence:true},
  ],
};

/** Rareza de las piezas de set: un pool propio (no el de la tienda/cofres normales,
 *  que está inclinado hacia "común") — una mazmorra que cuesta caminar y pelear varios
 *  pisos nunca debería soltar una pieza "común", se sentiría mal. Reusa el MISMO
 *  RARITY_TIERS del resto del juego (mismos colores/multiplicadores), solo con otros
 *  pesos de sorteo. */
export const DUNGEON_LOOT_RARITY_WEIGHTS = {rare:50, epic:35, legendary:15};

/** Ya NO decide si una habitación es combate — eso ahora lo fija `pisoRoomPattern` (cada piso
 *  SIEMPRE trae combate + élite, garantizado). Este mazo solo se usa para sortear el tipo de la
 *  habitación "bonus" de cada piso (cofre o bendición), con estos pesos relativos entre sí. */
const DEFAULT_FLOOR_DECK = [
  {type:"chest",   weight:55},
  {type:"blessing",weight:45},
];

export const DUNGEON_REGISTRY = [
  {
    id: "senor_oscuro",
    name: "Fortaleza del Señor Oscuro",
    portalEmoji: "🌀",
    themeColor: "#9d3fff",
    themeIcon: "🏰",
    loreShort: "Una fortaleza en ruinas donde algo antiguo y hostil sigue despierto.",
    loreLong: "Antes de caer, el Señor Oscuro gobernó estas tierras desde una fortaleza que nadie se atrevía a nombrar. Sus muros siguen en pie entre las ruinas, y quienes se acercan lo suficiente juran sentir que todavía hay alguien — o algo — esperando adentro.",
    biome: "RUINS",
    revealRadiusM: 600, // mismo criterio que MEDIUM en visibility.js
    auraRadiusM: 600, // radio de la niebla oscura donde ronda el Demonio Oscuro — mismo que el de revelado del portal
    auraEnemyKey: "senor_oscuro", // referencia a DUNGEON_AURA_ENEMY_TEMPLATES
    cooldownMs: 60 * 60000, // 1h, mismo valor que PARK_GUARDIAN_COOLDOWN_MS
    // 9 pisos de exploración × 3 habitaciones fijas por piso (combate, élite, bonus) + 1 piso de
    // jefe al final = 10 pisos en total, tal como se ve en el HUD ("Piso X/10"). Cada piso GARANTIZA
    // al menos 2 combates reales (combate + élite) antes de poder subir — el "bonus" (cofre o
    // bendición, ver floorDeck) es un tercer cuarto extra, no reemplaza a ninguno de los dos combates.
    pisoRoomPattern: ["combat", "elite", "bonus"],
    floorCount: 27, // 9 pisos × 3 habitaciones — derivado de pisoRoomPattern.length, ver rollDungeonFloorSequence
    roomsPerFloor: 3, // debe coincidir con pisoRoomPattern.length
    floorDeck: DEFAULT_FLOOR_DECK,
    bossKey: "senor_oscuro", // referencia a DUNGEON_BOSS_TEMPLATES

    /** Piezas del set — cada una es una definición base única (mismo shape que una
     *  entrada de EQUIP_TABLE); la rareza y el nivel del jugador escalan sus bonuses
     *  EN EL MOMENTO DEL DROP (ver rollDungeonSetPiece en main.js), nunca se pre-generan
     *  todas las combinaciones como sí hace pushEquip() para el equipo normal — con
     *  varias mazmorras esa combinatoria explotaría rápido. */
    setPieces: [
      {id:"do_weapon",  name:"Espada del Señor Oscuro",   emoji:"⚔️", slot:"weapon",    bonuses:{atk:6, matk:2}},
      {id:"do_armor",   name:"Pechera del Señor Oscuro",  emoji:"🖤", slot:"armor",     bonuses:{def:5, maxHp:8}},
      {id:"do_helmet",  name:"Casco del Señor Oscuro",    emoji:"👑", slot:"helmet",    bonuses:{def:3, maxHp:5, matk:2}},
      {id:"do_boots",   name:"Botas del Señor Oscuro",    emoji:"🥾", slot:"boots",     bonuses:{spd:3, def:2}},
      {id:"do_cape",    name:"Capa del Señor Oscuro",     emoji:"🧥", slot:"accessory", bonuses:{spd:2, atk:2, matk:2}},
      {id:"do_amulet",  name:"Amuleto del Señor Oscuro",  emoji:"🔮", slot:"accessory", bonuses:{maxHp:6, maxMp:4, def:2}},
    ],

    /** Bonos por umbral de piezas EQUIPADAS (no solo en inventario). 2 y 4 piezas dan
     *  estadísticas reales (mismo mecanismo que cualquier otro bono de equipo, por
     *  delta); 6 piezas (el set completo) es puramente cosmético — activa el aura Y
     *  dispara el Legado (título + marco de perfil + decoración de base). "Invocar
     *  sombras en combate" del diseño original queda para cuando el sistema de combate
     *  soporte efectos activos — no es parte de este piloto. */
    setBonusTiers: [
      {count:2, bonuses:{atk:4, matk:4}, desc:"+4 ATQ, +4 AT.MÁG"},
      {count:4, bonuses:{def:6, maxHp:10}, desc:"+6 DEF, +10 HP máx."},
      {count:6, bonuses:null, auraClass:"hud-icon-aura-senor-oscuro", mapAuraClass:"me-marker-aura-senor-oscuro", desc:"Aura oscura + Legado del Señor Oscuro"},
    ],

    legacy: {
      title: "Azote de la Fortaleza",
      frameClass: "hud-icon-frame-senor-oscuro",
      baseDecorationClass: "base-room-legacy-banner-senor-oscuro",
      achievementDesc: "Completaste el set del Señor Oscuro — su legado ahora es tuyo.",
    },
  },
];

export function getDungeonDef(dungeonId){
  return DUNGEON_REGISTRY.find(d=> d.id===dungeonId) || null;
}

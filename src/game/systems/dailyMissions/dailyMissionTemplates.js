/* ============================================================
   MISIONES DIARIAS — catálogo de tipos y plantillas
   ------------------------------------------------------------
   Este archivo es solo DATOS (igual que src/game/config/*.js) — sin lógica de
   juego, sin tocar `player` ni el DOM. La generación real vive en
   dailyMissionsEngine.js.
   ============================================================ */

/** Los 20 tipos de misión previstos por diseño. No todos están "activos" en
 *  esta primera versión — solo se generan los que ya tienen un evento de
 *  juego real y confiable enganchado (ver ACTIVE_MISSION_TYPES más abajo).
 *  El resto queda catalogado para activarlo cuando el sistema correspondiente
 *  exista o tenga un punto de enganche único y seguro. */
export const MISSION_TYPES = Object.freeze([
  "DEFEAT_ENEMIES", "WIN_BATTLES", "EARN_GOLD", "USE_CONSUMABLES", "WALK_DISTANCE",
  "INTERACT_WITH_NPCS", "UPGRADE_EQUIPMENT", "COLLECT_RESOURCES", "VISIT_POIS",
  "DEFEAT_SPECIFIC_ENEMY_TYPE", "COMPLETE_TOWER", "USE_CAMPFIRE", "USE_SANCTUARY",
  "OPEN_CHESTS", "COMPLETE_DUNGEON_BATTLE", "DEAL_DAMAGE", "HEAL_HP", "EQUIP_ITEM",
  "CRAFT_OR_REPAIR", "CHANGE_CHARACTER",
]);

/** Qué evento del juego hace avanzar cada tipo de misión (ver dailyMissionsService.js
 *  para dónde se emite cada uno desde main.js). Varios tipos comparten el mismo
 *  evento subyacente (ej. UPGRADE_EQUIPMENT y CRAFT_OR_REPAIR reusan la Forja). */
export const TYPE_EVENT_MAP = Object.freeze({
  DEFEAT_ENEMIES: "ENEMY_DEFEATED",
  WIN_BATTLES: "BATTLE_WON",
  DEFEAT_SPECIFIC_ENEMY_TYPE: "ENEMY_DEFEATED",
  EARN_GOLD: "GOLD_EARNED",
  USE_CONSUMABLES: "CONSUMABLE_USED",
  WALK_DISTANCE: "DISTANCE_WALKED",
  INTERACT_WITH_NPCS: "NPC_INTERACTED",
  UPGRADE_EQUIPMENT: "EQUIPMENT_UPGRADED",
  CRAFT_OR_REPAIR: "EQUIPMENT_UPGRADED",
  COLLECT_RESOURCES: "RESOURCE_COLLECTED",
  VISIT_POIS: "POI_VISITED",
  COMPLETE_TOWER: "TOWER_COMPLETED",
  USE_CAMPFIRE: "CAMPFIRE_USED",
  USE_SANCTUARY: "SANCTUARY_USED",
  OPEN_CHESTS: "CHEST_OPENED",
  COMPLETE_DUNGEON_BATTLE: "DUNGEON_BATTLE_WON",
  DEAL_DAMAGE: "DAMAGE_DEALT",
  HEAL_HP: "HP_HEALED",
  EQUIP_ITEM: "ITEM_EQUIPPED",
  CHANGE_CHARACTER: "CHARACTER_SELECTED",
});

/** Tipos generables hoy: todos tienen un único punto de enganche confiable ya
 *  identificado en main.js. DEAL_DAMAGE/HEAL_HP (dispersos en varios sitios de
 *  combate), VISIT_POIS y COMPLETE_DUNGEON_BATTLE quedan fuera de esta primera
 *  versión — activarlos es agregar su nombre acá una vez tengan un hook único. */
export const ACTIVE_MISSION_TYPES = Object.freeze([
  "DEFEAT_ENEMIES", "WIN_BATTLES", "EARN_GOLD", "USE_CONSUMABLES", "WALK_DISTANCE",
  "INTERACT_WITH_NPCS", "UPGRADE_EQUIPMENT", "COLLECT_RESOURCES",
  "DEFEAT_SPECIFIC_ENEMY_TYPE", "COMPLETE_TOWER", "USE_CAMPFIRE", "USE_SANCTUARY",
  "OPEN_CHESTS", "EQUIP_ITEM", "CRAFT_OR_REPAIR", "CHANGE_CHARACTER",
]);

/** Pool de enemigos comunes para DEFEAT_SPECIFIC_ENEMY_TYPE — nombres ya
 *  existentes en MONSTER_TEMPLATES (src/game/config/enemies.js), elegidos por
 *  ser genéricos y encontrarse desde el comienzo del juego. Se duplican como
 *  strings acá a propósito para no acoplar este catálogo de datos al de
 *  enemigos — si un nombre cambiara allá, esta misión simplemente dejaría de
 *  emparejar (nunca rompe nada, solo no progresaría). */
const COMMON_ENEMY_POOL = ["Slime Salvaje", "Lobo Umbrío", "Cuervo Corrupto"];

/**
 * @typedef {"EASY"|"NORMAL"|"ADVANCED"} DailyMissionDifficulty
 * @typedef {"combat"|"exploration"|"resources"|"varied"} DailyMissionCategory
 * @typedef {Object} DailyMissionTemplate
 * @property {string} id
 * @property {string} type
 * @property {DailyMissionDifficulty} difficulty
 * @property {DailyMissionCategory} category
 * @property {string} title
 * @property {string} description  // puede incluir "{target}" y/o "{enemyName}"
 * @property {string} icon
 * @property {number} baseTarget
 * @property {boolean} scalable    // si el objetivo puede escalar suavemente con el nivel
 * @property {string[]=} enemyPool // solo DEFEAT_SPECIFIC_ENEMY_TYPE
 */

/** @type {DailyMissionTemplate[]} */
export const DAILY_MISSION_TEMPLATES = Object.freeze([
  { id: "walk_250", type: "WALK_DISTANCE", difficulty: "EASY", category: "exploration",
    title: "Primeros pasos", description: "Recorre {target} metros por el mundo.",
    icon: "🥾", baseTarget: 250, scalable: false },
  { id: "walk_750", type: "WALK_DISTANCE", difficulty: "NORMAL", category: "exploration",
    title: "Explorador activo", description: "Recorre {target} metros por el mundo.",
    icon: "🚶", baseTarget: 750, scalable: true },
  { id: "walk_1500", type: "WALK_DISTANCE", difficulty: "ADVANCED", category: "exploration",
    title: "Explorador incansable", description: "Recorre {target} metros por el mundo.",
    icon: "🏃", baseTarget: 1500, scalable: true },

  { id: "defeat_5", type: "DEFEAT_ENEMIES", difficulty: "EASY", category: "combat",
    title: "Cazador novato", description: "Derrota {target} enemigos.",
    icon: "⚔️", baseTarget: 5, scalable: false },
  { id: "defeat_10", type: "DEFEAT_ENEMIES", difficulty: "NORMAL", category: "combat",
    title: "Cazador experimentado", description: "Derrota {target} enemigos.",
    icon: "🗡️", baseTarget: 10, scalable: true },
  { id: "defeat_20", type: "DEFEAT_ENEMIES", difficulty: "ADVANCED", category: "combat",
    title: "Cazador implacable", description: "Derrota {target} enemigos.",
    icon: "💀", baseTarget: 20, scalable: true },

  { id: "win_3", type: "WIN_BATTLES", difficulty: "EASY", category: "combat",
    title: "Sin descanso", description: "Gana {target} combates.",
    icon: "🛡️", baseTarget: 3, scalable: false },
  { id: "win_5", type: "WIN_BATTLES", difficulty: "NORMAL", category: "combat",
    title: "Racha de victorias", description: "Gana {target} combates.",
    icon: "🏹", baseTarget: 5, scalable: true },
  { id: "win_10", type: "WIN_BATTLES", difficulty: "ADVANCED", category: "combat",
    title: "Racha imparable", description: "Gana {target} combates.",
    icon: "🏆", baseTarget: 10, scalable: true },

  { id: "gold_300", type: "EARN_GOLD", difficulty: "EASY", category: "varied",
    title: "Bolsa llena", description: "Obtén {target} de oro.",
    icon: "💰", baseTarget: 300, scalable: false },
  { id: "gold_750", type: "EARN_GOLD", difficulty: "NORMAL", category: "varied",
    title: "Buen botín", description: "Obtén {target} de oro.",
    icon: "💵", baseTarget: 750, scalable: true },
  { id: "gold_1200", type: "EARN_GOLD", difficulty: "ADVANCED", category: "varied",
    title: "Fortuna mayor", description: "Obtén {target} de oro.",
    icon: "👑", baseTarget: 1200, scalable: true },

  { id: "consumables_1", type: "USE_CONSUMABLES", difficulty: "EASY", category: "varied",
    title: "Preparado para todo", description: "Usa {target} poción o consumible.",
    icon: "🧪", baseTarget: 1, scalable: false },
  { id: "consumables_3", type: "USE_CONSUMABLES", difficulty: "NORMAL", category: "varied",
    title: "Superviviente", description: "Usa {target} consumibles.",
    icon: "🧴", baseTarget: 3, scalable: false },

  { id: "collect_10", type: "COLLECT_RESOURCES", difficulty: "EASY", category: "resources",
    title: "Recolector", description: "Recolecta {target} recursos.",
    icon: "🪵", baseTarget: 10, scalable: false },
  { id: "collect_25", type: "COLLECT_RESOURCES", difficulty: "NORMAL", category: "resources",
    title: "Manos trabajadoras", description: "Recolecta {target} recursos.",
    icon: "🪨", baseTarget: 25, scalable: true },
  { id: "collect_50", type: "COLLECT_RESOURCES", difficulty: "ADVANCED", category: "resources",
    title: "Maestro recolector", description: "Recolecta {target} recursos.",
    icon: "⛏️", baseTarget: 50, scalable: true },

  { id: "npc_1", type: "INTERACT_WITH_NPCS", difficulty: "EASY", category: "exploration",
    title: "Una visita amistosa", description: "Habla con {target} NPC.",
    icon: "🗣️", baseTarget: 1, scalable: false },
  { id: "npc_3", type: "INTERACT_WITH_NPCS", difficulty: "NORMAL", category: "exploration",
    title: "Habitante del mundo", description: "Interactúa con {target} NPC diferentes.",
    icon: "🧑‍🌾", baseTarget: 3, scalable: false },

  { id: "upgrade_1", type: "UPGRADE_EQUIPMENT", difficulty: "NORMAL", category: "resources",
    title: "Equipo preparado", description: "Mejora o repara {target} pieza de equipo.",
    icon: "⚒️", baseTarget: 1, scalable: false },
  { id: "craft_1", type: "CRAFT_OR_REPAIR", difficulty: "NORMAL", category: "resources",
    title: "Trabajo del herrero", description: "Repara o mejora {target} objeto en la Forja.",
    icon: "🔨", baseTarget: 1, scalable: false },

  { id: "campfire_1", type: "USE_CAMPFIRE", difficulty: "EASY", category: "varied",
    title: "Descanso del guerrero", description: "Utiliza una fogata para curarte.",
    icon: "🔥", baseTarget: 1, scalable: false },
  { id: "sanctuary_1", type: "USE_SANCTUARY", difficulty: "EASY", category: "varied",
    title: "Bendición antigua", description: "Utiliza un santuario.",
    icon: "⛲", baseTarget: 1, scalable: false },

  { id: "chests_2", type: "OPEN_CHESTS", difficulty: "NORMAL", category: "resources",
    title: "Buscador de tesoros", description: "Abre {target} cofres.",
    icon: "🗝️", baseTarget: 2, scalable: false },

  { id: "equip_1", type: "EQUIP_ITEM", difficulty: "EASY", category: "resources",
    title: "Nueva estrategia", description: "Equipa {target} objeto diferente.",
    icon: "🛡️", baseTarget: 1, scalable: false },

  { id: "change_character_2", type: "CHANGE_CHARACTER", difficulty: "ADVANCED", category: "varied",
    title: "Héroe versátil", description: "Juega al menos un combate con {target} héroes diferentes.",
    icon: "🎭", baseTarget: 2, scalable: false },

  { id: "tower_1", type: "COMPLETE_TOWER", difficulty: "ADVANCED", category: "combat",
    title: "Conquistador de torres", description: "Conquista {target} torre.",
    icon: "🗼", baseTarget: 1, scalable: false },

  { id: "defeat_specific_3", type: "DEFEAT_SPECIFIC_ENEMY_TYPE", difficulty: "NORMAL", category: "combat",
    title: "Cazador especializado", description: "Derrota {target} {enemyName}.",
    icon: "🎯", baseTarget: 3, scalable: false, enemyPool: COMMON_ENEMY_POOL },

  // --- Catalogadas pero inactivas en v1 (sin hook único/confiable todavía) ---
  { id: "damage_1000", type: "DEAL_DAMAGE", difficulty: "NORMAL", category: "combat",
    title: "Golpe contundente", description: "Inflige {target} puntos de daño acumulado.",
    icon: "💥", baseTarget: 1000, scalable: true },
  { id: "damage_3000", type: "DEAL_DAMAGE", difficulty: "ADVANCED", category: "combat",
    title: "Poder desatado", description: "Inflige {target} puntos de daño acumulado.",
    icon: "☄️", baseTarget: 3000, scalable: true },
  { id: "heal_200", type: "HEAL_HP", difficulty: "EASY", category: "varied",
    title: "Recuperación", description: "Recupera {target} puntos de vida.",
    icon: "💚", baseTarget: 200, scalable: false },
  { id: "visit_pois_2", type: "VISIT_POIS", difficulty: "NORMAL", category: "exploration",
    title: "Visitante frecuente", description: "Visita {target} puntos de interés.",
    icon: "📍", baseTarget: 2, scalable: false },
  { id: "visit_pois_3", type: "VISIT_POIS", difficulty: "NORMAL", category: "exploration",
    title: "Guardián errante", description: "Visita {target} puntos de interés.",
    icon: "🧭", baseTarget: 3, scalable: false },
  { id: "dungeon_1", type: "COMPLETE_DUNGEON_BATTLE", difficulty: "ADVANCED", category: "combat",
    title: "Desafío de mazmorra", description: "Gana {target} batalla dentro de una mazmorra.",
    icon: "🏰", baseTarget: 1, scalable: false },
]);

export function templatesForActiveTypes(){
  return DAILY_MISSION_TEMPLATES.filter(t => ACTIVE_MISSION_TYPES.includes(t.type));
}

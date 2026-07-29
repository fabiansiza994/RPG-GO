/* ============================================================
   CONTRATO DEL AVENTURERO — catálogo de tipos y plantillas
   ------------------------------------------------------------
   Solo DATOS (mismo criterio que dailyMissionTemplates.js) — sin lógica de
   juego, sin tocar `player` ni el DOM.

   NOTA DE ALCANCE (leer antes de agregar plantillas nuevas): varias de las
   15 plantillas del diseño original mencionaban mecánicas que hoy no existen
   en el juego (ruinas visitables, altares, guardianes de santuario, "mantener"
   una torre, zonas de rastro). Para que la v1 sea 100% real (nada simulado),
   cada plantilla de acá SOLO usa objetivos que un evento real del juego puede
   completar — ver adventurerContractsService.js para el detalle de cada hook.
   Las simplificaciones puntuales están comentadas en la plantilla misma.
   ============================================================ */

/** Catálogo completo de tipos de contrato (para clasificación/filtros futuros
 *  — el motor de generación no distingue comportamiento por esto, solo por
 *  los objetivos que trae cada plantilla). */
export const CONTRACT_TYPES = Object.freeze([
  "HUNT", "EXTERMINATION", "RESOURCE_GATHERING", "EXPLORATION", "DELIVERY",
  "BLACKSMITH_ORDER", "TOWER_ASSAULT", "DUNGEON_CLEAR", "ELITE_HUNT",
  "NPC_ASSISTANCE", "REGION_DEFENSE", "RECOVERY", "BOUNTY", "MIXED",
]);

/** Tipos de objetivo soportados hoy + su evento del gameEventBus. Los tipos
 *  RETURN_TO_NPC/DELIVER_ITEM-a-NPC NO están acá: el motor los trata aparte
 *  (no progresan por evento, sino por la acción explícita `turnIn()` una vez
 *  que el resto de los objetivos ya terminó — ver adventurerContractsEngine.js). */
export const OBJECTIVE_TYPE_EVENT_MAP = Object.freeze({
  DEFEAT_ENEMIES: "ENEMY_DEFEATED",
  WALK_DISTANCE: "DISTANCE_WALKED",
  DEFEAT_SPECIFIC_ENEMY: "ENEMY_DEFEATED",   // objetivo marcado — ver metadata.contractTargetOf
  DEFEAT_ENEMY_TYPE: "ENEMY_DEFEATED",       // metadata.enemyName o metadata.isThief
  DEFEAT_ELITE: "ENEMY_DEFEATED",            // metadata.isBoss
  WIN_BATTLES: "BATTLE_WON",
  COLLECT_RESOURCE: "RESOURCE_COLLECTED",    // metadata.resourceKind
  COLLECT_SPECIFIC_ITEM: "ITEM_OBTAINED",    // metadata.materialId
  VISIT_REGION: "REGION_ENTERED",
  COMPLETE_TOWER: "TOWER_COMPLETED",
  COMPLETE_DUNGEON_FLOOR: "DUNGEON_BATTLE_WON", // metadata.isBossFloor opcional
  COMPLETE_DUNGEON: "DUNGEON_COMPLETED",
  OPEN_CHEST: "CHEST_OPENED",
  UPGRADE_ITEM: "EQUIPMENT_UPGRADED",
  REPAIR_ITEM: "EQUIPMENT_UPGRADED",
  DELIVER_ITEM: "BLACKSMITH_VISITED",        // "entregar" a un sistema (Forja), no a un NPC del mapa
  USE_CAMPFIRE: "CAMPFIRE_USED",
  USE_SANCTUARY: "SANCTUARY_USED",
});

/** Tipos que nunca avanzan por evento: se completan solos al aceptar el
 *  contrato (flavor narrativo real: "hablaste con el cliente" = aceptaste). */
export const AUTO_COMPLETE_ON_ACCEPT_TYPES = Object.freeze(["INTERACT_WITH_NPC"]);

/** Tipos que el motor resuelve con la acción explícita `turnIn()` en vez de
 *  con un evento del bus (ver comentario arriba). */
export const TURN_IN_OBJECTIVE_TYPES = Object.freeze(["RETURN_TO_NPC"]);

/**
 * @typedef {Object} ContractObjectiveTemplate
 * @property {string} id
 * @property {string} type
 * @property {string} title
 * @property {string} description
 * @property {number} target
 * @property {Record<string,unknown>=} metadata
 */

/**
 * @typedef {Object} AdventurerContractTemplate
 * @property {string} id
 * @property {string} title
 * @property {string=} subtitle
 * @property {string} description
 * @property {string} contractType
 * @property {"COMMON"|"UNCOMMON"|"RARE"|"EPIC"|"LEGENDARY"} rarity
 * @property {"EASY"|"NORMAL"|"HARD"|"ELITE"} difficulty
 * @property {string} clientName
 * @property {string} clientPortrait
 * @property {"PARALLEL"|"SEQUENTIAL"} objectiveMode
 * @property {ContractObjectiveTemplate[]} objectives
 * @property {{turnInNpcId:string, turnInLabel:string}=} turnIn
 * @property {object} reward
 * @property {{minLevel?:number, minReputation?:number}=} requirements
 */

/** @type {AdventurerContractTemplate[]} */
export const ADVENTURER_CONTRACT_TEMPLATES = Object.freeze([
  {
    id: "contract_forest_threat",
    title: "La amenaza del bosque",
    contractType: "EXTERMINATION",
    rarity: "COMMON",
    difficulty: "EASY",
    clientName: "Maestro del Gremio",
    clientPortrait: "🛡️",
    description: "Los caminos cercanos a la aldea están siendo atacados por criaturas corrompidas. El gremio busca aventureros capaces de limpiar la zona.",
    objectiveMode: "PARALLEL",
    objectives: [
      { id: "o1", type: "DEFEAT_ENEMY_TYPE", title: "Derrota Lobos Umbríos", description: "Derrota 8 Lobos Umbríos.", target: 8, metadata: { enemyName: "Lobo Umbrío" } },
      { id: "o2", type: "DEFEAT_ENEMY_TYPE", title: "Derrota Cuervos Corruptos", description: "Derrota 4 Cuervos Corruptos.", target: 4, metadata: { enemyName: "Cuervo Corrupto" } },
      { id: "o3", type: "RETURN_TO_NPC", title: "Regresa con el Maestro del Gremio", description: "Regresa con el Maestro del Gremio.", target: 1 },
    ],
    turnIn: { turnInNpcId: "guild_master", turnInLabel: "Maestro del Gremio" },
    reward: { gold: 1000, experience: 300, diamonds: 2, reputation: 10 },
  },
  {
    id: "contract_blacksmith_request",
    title: "Pedido del herrero",
    contractType: "BLACKSMITH_ORDER",
    rarity: "COMMON",
    difficulty: "EASY",
    clientName: "Herrero",
    clientPortrait: "🔨",
    description: "El herrero necesita materiales para reparar el equipo de los guardias.",
    objectiveMode: "PARALLEL",
    objectives: [
      { id: "o1", type: "COLLECT_RESOURCE", title: "Recolecta hierro", description: "Recolecta 15 de hierro.", target: 15, metadata: { resourceKind: "iron" } },
      { id: "o2", type: "COLLECT_RESOURCE", title: "Recolecta madera", description: "Recolecta 10 de madera.", target: 10, metadata: { resourceKind: "wood" } },
      // "Entrega los materiales" se resuelve abriendo la Forja (no hay NPC de mapa para el herrero) — ver BLACKSMITH_VISITED.
      { id: "o3", type: "DELIVER_ITEM", title: "Entrega los materiales", description: "Visita la Forja para entregar los materiales.", target: 1 },
    ],
    reward: { gold: 900, experience: 250, diamonds: 0, reputation: 10, materials: [{ materialId: "iron", quantity: 6 }] },
  },
  {
    id: "contract_unsafe_roads",
    title: "Caminos inseguros",
    contractType: "REGION_DEFENSE",
    rarity: "COMMON",
    difficulty: "NORMAL",
    clientName: "Capitán Aldren",
    clientPortrait: "🎖️",
    description: "Las patrullas no dan abasto. El gremio pide un aventurero que refuerce la defensa de la región.",
    objectiveMode: "PARALLEL",
    objectives: [
      { id: "o1", type: "WIN_BATTLES", title: "Gana combates", description: "Gana 5 combates.", target: 5 },
      { id: "o2", type: "DEFEAT_ENEMIES", title: "Derrota enemigos", description: "Derrota 12 enemigos.", target: 12 },
      { id: "o3", type: "RETURN_TO_NPC", title: "Regresa con el Capitán", description: "Regresa con el Capitán Aldren.", target: 1 },
    ],
    turnIn: { turnInNpcId: "captain_aldren", turnInLabel: "Capitán Aldren" },
    reward: { gold: 1300, experience: 400, diamonds: 2, reputation: 15 },
  },
  {
    id: "contract_violet_eyed_crow",
    title: "El cuervo de ojos violeta",
    contractType: "BOUNTY",
    rarity: "UNCOMMON",
    difficulty: "NORMAL",
    clientName: "Cazarrecompensas",
    clientPortrait: "🏹",
    description: "Un cuervo corrupto fuera de lo común lidera bandadas cada vez más agresivas. El gremio ofrece una recompensa por su cabeza.",
    objectiveMode: "SEQUENTIAL",
    objectives: [
      { id: "o1", type: "DEFEAT_ENEMY_TYPE", title: "Derrota Cuervos Corruptos", description: "Derrota 6 Cuervos Corruptos.", target: 6, metadata: { enemyName: "Cuervo Corrupto" } },
      // Al activarse este paso, se genera al Cuervo Alfa cerca del jugador (mismo patrón que ya usa
      // el juego para el Ladrón/Vagabundo) — "encontrarlo" y "derrotarlo" quedan unidos en un paso.
      { id: "o2", type: "DEFEAT_SPECIFIC_ENEMY", title: "Derrota al Cuervo Alfa", description: "Localiza y derrota al Cuervo Alfa.", target: 1, metadata: { spawnOnActivate: "cuervo_alfa" } },
      { id: "o3", type: "RETURN_TO_NPC", title: "Regresa con el cliente", description: "Regresa con el cliente.", target: 1 },
    ],
    turnIn: { turnInNpcId: "bounty_client", turnInLabel: "Cazarrecompensas" },
    reward: { gold: 1600, experience: 500, diamonds: 3, reputation: 20, chestId: "uncommon" },
  },
  {
    id: "contract_fangs_for_alchemist",
    title: "Colmillos para el alquimista",
    contractType: "DELIVERY",
    rarity: "UNCOMMON",
    difficulty: "NORMAL",
    clientName: "Alquimista",
    clientPortrait: "🧪",
    description: "El alquimista necesita colmillos de lobo frescos para sus pociones.",
    objectiveMode: "SEQUENTIAL",
    objectives: [
      { id: "o1", type: "INTERACT_WITH_NPC", title: "Habla con el alquimista", description: "Habla con el alquimista.", target: 1 },
      { id: "o2", type: "COLLECT_SPECIFIC_ITEM", title: "Consigue Colmillos de Lobo", description: "Derrota Lobos Umbríos hasta obtener 8 Colmillos de Lobo.", target: 8, metadata: { materialId: "colmillo_lobo" } },
      { id: "o3", type: "RETURN_TO_NPC", title: "Entrega los colmillos", description: "Entrega los colmillos al alquimista.", target: 1 },
    ],
    turnIn: { turnInNpcId: "alchemist", turnInLabel: "Alquimista" },
    reward: { gold: 1400, experience: 450, diamonds: 0, reputation: 20, materials: [{ materialId: "colmillo_lobo", quantity: 2 }] },
  },
  {
    id: "contract_tower_under_siege",
    title: "Torre bajo asedio",
    contractType: "TOWER_ASSAULT",
    rarity: "RARE",
    difficulty: "HARD",
    clientName: "Capitán Aldren",
    clientPortrait: "🎖️",
    description: "Una torre fronteriza está rodeada. El gremio necesita que alguien la libere y la mantenga bajo control del reino.",
    objectiveMode: "PARALLEL",
    objectives: [
      { id: "o1", type: "DEFEAT_ENEMIES", title: "Despeja la zona", description: "Derrota 10 enemigos.", target: 10 },
      { id: "o2", type: "COMPLETE_TOWER", title: "Conquista la torre", description: "Conquista una torre.", target: 1 },
      { id: "o3", type: "RETURN_TO_NPC", title: "Regresa con el Capitán", description: "Regresa con el Capitán.", target: 1 },
    ],
    turnIn: { turnInNpcId: "captain_aldren", turnInLabel: "Capitán Aldren" },
    reward: { gold: 2500, experience: 700, diamonds: 5, reputation: 35, chestId: "rare" },
  },
  {
    id: "contract_echo_in_ruins",
    title: "Eco en las ruinas",
    contractType: "EXPLORATION",
    rarity: "UNCOMMON",
    difficulty: "NORMAL",
    clientName: "Erudito Errante",
    clientPortrait: "📜",
    description: "Un erudito busca a alguien que documente regiones inexploradas y regrese con hallazgos.",
    objectiveMode: "PARALLEL",
    objectives: [
      { id: "o1", type: "VISIT_REGION", title: "Explora regiones nuevas", description: "Descubre 3 regiones nuevas.", target: 3 },
      { id: "o2", type: "USE_CAMPFIRE", title: "Usa una fogata", description: "Usa una fogata para curarte.", target: 1 },
      { id: "o3", type: "OPEN_CHEST", title: "Abre cofres", description: "Abre 2 cofres.", target: 2 },
    ],
    reward: { gold: 1500, experience: 450, diamonds: 0, reputation: 20, materials: [{ materialId: "stone", quantity: 10 }] },
  },
  {
    id: "contract_fire_for_the_forge",
    title: "Fuego para la forja",
    contractType: "RESOURCE_GATHERING",
    rarity: "COMMON",
    difficulty: "EASY",
    clientName: "Herrero",
    clientPortrait: "🔨",
    description: "El herrero necesita reservas de madera y hierro antes del invierno.",
    objectiveMode: "PARALLEL",
    objectives: [
      { id: "o1", type: "COLLECT_RESOURCE", title: "Recolecta madera", description: "Recolecta 20 de madera.", target: 20, metadata: { resourceKind: "wood" } },
      { id: "o2", type: "COLLECT_RESOURCE", title: "Recolecta hierro", description: "Recolecta 8 de hierro.", target: 8, metadata: { resourceKind: "iron" } },
      { id: "o3", type: "DELIVER_ITEM", title: "Visita al herrero", description: "Visita la Forja.", target: 1 },
    ],
    reward: { gold: 1000, experience: 300, diamonds: 0, reputation: 10, freeRepairCount: 1 },
  },
  {
    id: "contract_shadows_on_the_path",
    title: "Sombras en el sendero",
    contractType: "MIXED",
    rarity: "UNCOMMON",
    difficulty: "NORMAL",
    clientName: "Maestro del Gremio",
    clientPortrait: "🛡️",
    description: "Viajeros reportan sombras extrañas en el camino principal. El gremio pide investigar y limpiar la ruta.",
    objectiveMode: "PARALLEL",
    objectives: [
      { id: "o1", type: "WALK_DISTANCE", title: "Recorre el sendero", description: "Recorre 750 metros.", target: 750 },
      { id: "o2", type: "DEFEAT_ENEMIES", title: "Derrota enemigos", description: "Derrota 10 enemigos.", target: 10 },
      { id: "o3", type: "USE_CAMPFIRE", title: "Usa una fogata", description: "Usa una fogata.", target: 1 },
      { id: "o4", type: "RETURN_TO_NPC", title: "Regresa al gremio", description: "Regresa al gremio.", target: 1 },
    ],
    turnIn: { turnInNpcId: "guild_master", turnInLabel: "Maestro del Gremio" },
    reward: { gold: 1600, experience: 500, diamonds: 3, reputation: 20 },
  },
  {
    id: "contract_minor_demon_hunt",
    title: "Caza del demonio menor",
    contractType: "ELITE_HUNT",
    rarity: "RARE",
    difficulty: "HARD",
    clientName: "Exorcista Viajero",
    clientPortrait: "⛪",
    description: "Una manada de demonios menores creció demasiado. Uno de ellos, marcado por rituales oscuros, lidera al resto.",
    objectiveMode: "SEQUENTIAL",
    objectives: [
      { id: "o1", type: "DEFEAT_ENEMY_TYPE", title: "Derrota Demonios Menores", description: "Derrota 5 Demonios Menores.", target: 5, metadata: { enemyName: "Demonio Menor" } },
      { id: "o2", type: "DEFEAT_SPECIFIC_ENEMY", title: "Derrota al Demonio Marcado", description: "Localiza y derrota al Demonio Marcado.", target: 1, metadata: { spawnOnActivate: "demonio_marcado" } },
    ],
    reward: { gold: 2700, experience: 800, diamonds: 5, reputation: 40, materials: [{ materialId: "cuerno_demonio", quantity: 3 }] },
  },
  {
    id: "contract_forgotten_sanctuary",
    title: "El santuario olvidado",
    contractType: "EXPLORATION",
    rarity: "RARE",
    difficulty: "HARD",
    clientName: "Médium Errante",
    clientPortrait: "🔮",
    description: "Un santuario perdido despertó de golpe. El gremio quiere saber por qué — y qué guarda dentro.",
    objectiveMode: "SEQUENTIAL",
    objectives: [
      { id: "o1", type: "DEFEAT_ENEMIES", title: "Despeja los alrededores", description: "Derrota 6 enemigos.", target: 6 },
      { id: "o2", type: "USE_SANCTUARY", title: "Activa el santuario", description: "Activa un santuario.", target: 1 },
    ],
    reward: { gold: 2400, experience: 700, diamonds: 3, reputation: 35, chestId: "rare" },
  },
  {
    id: "contract_recover_the_cargo",
    title: "Recupera el cargamento",
    contractType: "RECOVERY",
    rarity: "UNCOMMON",
    difficulty: "NORMAL",
    clientName: "Mercader",
    clientPortrait: "💼",
    description: "Un mercader fue asaltado en el camino. Necesita que alguien recupere su cargamento antes de que desaparezca.",
    objectiveMode: "SEQUENTIAL",
    objectives: [
      { id: "o1", type: "INTERACT_WITH_NPC", title: "Habla con el mercader", description: "Habla con el mercader.", target: 1 },
      // El Ladrón/Ninja Errante ya existe como enemigo especial (mon.isThief) — derrotarlo
      // "recupera el cargamento" en el mismo paso, sin inventar un ítem de misión nuevo.
      { id: "o2", type: "DEFEAT_ENEMY_TYPE", title: "Recupera el cargamento", description: "Derrota al ladrón y recupera el cargamento.", target: 1, metadata: { isThief: true } },
      { id: "o3", type: "RETURN_TO_NPC", title: "Entrégalo al mercader", description: "Entrégalo al mercader.", target: 1 },
    ],
    turnIn: { turnInNpcId: "merchant", turnInLabel: "Mercader" },
    reward: { gold: 1800, experience: 550, diamonds: 3, reputation: 25 },
  },
  {
    id: "contract_steel_worthy_of_a_hero",
    title: "Acero digno de un héroe",
    contractType: "BLACKSMITH_ORDER",
    rarity: "RARE",
    difficulty: "HARD",
    clientName: "Herrero",
    clientPortrait: "🔨",
    description: "El herrero quiere forjar algo especial — pero necesita materiales poco comunes y ver el resultado en combate.",
    objectiveMode: "SEQUENTIAL",
    objectives: [
      { id: "o1", type: "COLLECT_RESOURCE", title: "Consigue hierro", description: "Recolecta 20 de hierro.", target: 20, metadata: { resourceKind: "iron" } },
      { id: "o2", type: "UPGRADE_ITEM", title: "Mejora tu equipo", description: "Mejora o repara una pieza de equipo.", target: 1 },
      { id: "o3", type: "WIN_BATTLES", title: "Gana combates", description: "Gana 3 combates.", target: 3 },
      { id: "o4", type: "DELIVER_ITEM", title: "Regresa con el herrero", description: "Visita la Forja.", target: 1 },
    ],
    reward: { gold: 2500, experience: 750, diamonds: 5, reputation: 40, freeRepairCount: 1 },
  },
  {
    id: "contract_dark_lair",
    title: "La guarida oscura",
    contractType: "DUNGEON_CLEAR",
    rarity: "EPIC",
    difficulty: "ELITE",
    clientName: "Maestro del Gremio",
    clientPortrait: "🛡️",
    description: "El portal hacia la Fortaleza del Señor Oscuro volvió a abrirse. El gremio necesita un grupo capaz de cerrarlo por dentro.",
    objectiveMode: "SEQUENTIAL",
    objectives: [
      { id: "o1", type: "INTERACT_WITH_NPC", title: "Encuentra el portal", description: "Encuentra el portal de la mazmorra.", target: 1 },
      { id: "o2", type: "COMPLETE_DUNGEON_FLOOR", title: "Completa pisos de la mazmorra", description: "Completa 3 batallas de mazmorra.", target: 3 },
      { id: "o3", type: "COMPLETE_DUNGEON_FLOOR", title: "Derrota al jefe", description: "Derrota al jefe de la mazmorra.", target: 1, metadata: { isBossFloor: true } },
      { id: "o4", type: "COMPLETE_DUNGEON", title: "Reclama el cofre final", description: "Reclama el cofre final de la mazmorra.", target: 1 },
    ],
    reward: { gold: 4500, experience: 1200, diamonds: 10, reputation: 75, chestId: "epic" },
  },
  {
    id: "contract_ancestral_predator",
    title: "El depredador ancestral",
    contractType: "BOUNTY",
    rarity: "LEGENDARY",
    difficulty: "ELITE",
    clientName: "Maestro del Gremio",
    clientPortrait: "🛡️",
    description: "Algo antiguo despertó en la región. El Maestro del Gremio solo confía este encargo a quien ya demostró su valía.",
    objectiveMode: "SEQUENTIAL",
    requirements: { minLevel: 25, minReputation: 1500 },
    objectives: [
      { id: "o1", type: "DEFEAT_ENEMIES", title: "Investiga la región", description: "Derrota 20 criaturas de la región.", target: 20 },
      { id: "o2", type: "DEFEAT_SPECIFIC_ENEMY", title: "Derrota al Depredador Ancestral", description: "Localiza y derrota al Depredador Ancestral.", target: 1, metadata: { spawnOnActivate: "depredador_ancestral" } },
      { id: "o3", type: "RETURN_TO_NPC", title: "Regresa con el Maestro del Gremio", description: "Regresa con el Maestro del Gremio.", target: 1 },
    ],
    turnIn: { turnInNpcId: "guild_master", turnInLabel: "Maestro del Gremio" },
    reward: { gold: 8000, experience: 2000, diamonds: 20, reputation: 150, chestId: "legendary" },
  },
]);

export function templateById(id){
  return ADVENTURER_CONTRACT_TEMPLATES.find(t=> t.id === id);
}

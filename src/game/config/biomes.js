/* ============================================================
   BIOMAS — Mapa Vivo, Capa 4: Ecosistema del Mundo.

   Responsabilidad de este archivo: SOLO la definición de qué biomas existen y qué contenido es
   apropiado (o no) para cada uno — enemigos, recursos, tipos de NPC, tipos de evento y sus pesos
   de aparición. Nada de esto decide todavía qué aparece de verdad en el mapa (eso lo hace el
   Ecosystem Engine, en ./game/systems/ecosystemEngine.js, y por ahora nadie más lo consulta para
   filtrar spawns reales — es la base que usarán las capas futuras).

   Agregar un bioma nuevo es una fila más en BIOMES, nunca lógica repetida en otro lado.
   ============================================================ */

export const BIOME_KEYS = {
  FOREST: "FOREST",
  CITY: "CITY",
  MOUNTAIN: "MOUNTAIN",
  RIVER: "RIVER",
  PLAINS: "PLAINS",
  RUINS: "RUINS",
  INDUSTRIAL: "INDUSTRIAL",
};

/** Catálogo de biomas. Cada uno declara qué es "lógico" que aparezca ahí — nombres de plantillas
 *  de enemigo que YA existen (MONSTER_TEMPLATES), tipos de recurso que YA existen
 *  (RESOURCE_NODE_TYPES: wood/stone/iron), tipos de NPC dinámico y de evento que YA existen —
 *  nunca contenido nuevo. `spawnWeights` son pesos relativos (no tienen que sumar 100), y
 *  `eventChance` es la probabilidad relativa de que ahí aparezca un evento en vez de otra cosa.
 *  `modifiers` queda vacío a propósito: es el enganche para futuros modificadores (clima,
 *  estación, hora, control de torres...) sin tener que cambiar esta forma. */
export const BIOMES = {
  [BIOME_KEYS.FOREST]: {
    label: "Bosque",
    allowedEnemies: ["Lobo Umbrío", "Araña Gigante", "Trasgo", "Espectro"],
    allowedResources: ["wood"],
    allowedNpcTypes: ["wandering_merchant"],
    allowedEventTypes: ["traveler_attacked", "ambush"],
    spawnWeights: { enemy: { "Lobo Umbrío": 45, "Araña Gigante": 25, "Trasgo": 20, "Espectro": 10 }, resource: { wood: 80, stone: 15, iron: 5 } },
    eventChance: 0.10,
    modifiers: {}, // futuro: clima, estación, hora...
  },
  [BIOME_KEYS.MOUNTAIN]: {
    label: "Montaña",
    allowedEnemies: ["Golem de Roca", "Dragón Menor", "Demonio Menor"],
    allowedResources: ["iron", "stone"],
    allowedNpcTypes: [],
    allowedEventTypes: ["guarded_chest", "ambush"],
    spawnWeights: { enemy: { "Golem de Roca": 55, "Dragón Menor": 20, "Demonio Menor": 25 }, resource: { iron: 45, stone: 45, wood: 10 } },
    eventChance: 0.12,
    modifiers: {},
  },
  [BIOME_KEYS.CITY]: {
    label: "Ciudad",
    allowedEnemies: ["Rata Mutante", "Cuervo Corrupto", "Slime Salvaje"],
    allowedResources: ["wood"],
    allowedNpcTypes: ["wandering_merchant"],
    allowedEventTypes: ["traveler_attacked", "guarded_chest"],
    spawnWeights: { enemy: { "Rata Mutante": 40, "Cuervo Corrupto": 35, "Slime Salvaje": 25 }, resource: { wood: 60, stone: 30, iron: 10 } },
    eventChance: 0.06,
    modifiers: {},
    // las estructuras permanentes (Coliseo, santuarios) ya son parte de la Capa 1 y no dependen
    // del bioma — se listan acá solo como referencia de qué "tiene sentido" en una ciudad.
    permanentPoiTypes: ["coliseo", "shrine", "tower"],
  },
  [BIOME_KEYS.INDUSTRIAL]: {
    label: "Zona Industrial",
    allowedEnemies: ["Golem de Roca", "Demonio Menor", "Rata Mutante"],
    allowedResources: ["iron"],
    allowedNpcTypes: [],
    allowedEventTypes: ["guarded_chest"],
    spawnWeights: { enemy: { "Golem de Roca": 40, "Demonio Menor": 30, "Rata Mutante": 30 }, resource: { iron: 70, stone: 25, wood: 5 } },
    eventChance: 0.08,
    modifiers: {},
  },
  [BIOME_KEYS.RUINS]: {
    label: "Ruinas",
    allowedEnemies: ["Demonio Menor", "Dragón Menor", "Espectro"],
    allowedResources: ["stone"],
    allowedNpcTypes: [],
    allowedEventTypes: ["guarded_chest", "ambush"],
    spawnWeights: { enemy: { "Demonio Menor": 40, "Dragón Menor": 20, "Espectro": 40 }, resource: { stone: 65, iron: 25, wood: 10 } },
    eventChance: 0.14,
    modifiers: {},
  },
  [BIOME_KEYS.RIVER]: {
    label: "Río",
    allowedEnemies: ["Slime Salvaje", "Araña Gigante"],
    allowedResources: ["wood", "stone"],
    allowedNpcTypes: [],
    allowedEventTypes: ["traveler_attacked"],
    spawnWeights: { enemy: { "Slime Salvaje": 60, "Araña Gigante": 40 }, resource: { wood: 45, stone: 45, iron: 10 } },
    eventChance: 0.08,
    modifiers: {},
  },
  [BIOME_KEYS.PLAINS]: {
    label: "Llanura",
    allowedEnemies: ["Jabalí Salvaje", "Trasgo", "Rata Mutante"],
    allowedResources: ["wood", "stone"],
    allowedNpcTypes: ["wandering_merchant"],
    allowedEventTypes: ["traveler_attacked", "ambush"],
    spawnWeights: { enemy: { "Jabalí Salvaje": 50, "Trasgo": 30, "Rata Mutante": 20 }, resource: { wood: 50, stone: 40, iron: 10 } },
    eventChance: 0.08,
    modifiers: {},
  },
};

/** Bioma de respaldo si no se puede clasificar nada (nunca debe quedar sin bioma). */
export const DEFAULT_BIOME_KEY = BIOME_KEYS.CITY;

/** Tabla de referencia: qué tag de OpenStreetMap corresponde a qué bioma — todavía no se consulta
 *  contra datos reales de OSM (este juego no trae esa capa de datos hoy), pero deja lista la
 *  regla para cuando se integre. classifyBiomeFromOsmTags() en ecosystemEngine.js ya sabe leer
 *  esta tabla; solo falta conectarla a una fuente real de tags cuando exista. */
export const OSM_TAG_TO_BIOME = [
  { tag: "natural=wood", biome: BIOME_KEYS.FOREST },
  { tag: "landuse=forest", biome: BIOME_KEYS.FOREST },
  { tag: "leisure=park", biome: BIOME_KEYS.FOREST },
  { tag: "natural=water", biome: BIOME_KEYS.RIVER },
  { tag: "waterway=river", biome: BIOME_KEYS.RIVER },
  { tag: "landuse=industrial", biome: BIOME_KEYS.INDUSTRIAL },
  { tag: "landuse=residential", biome: BIOME_KEYS.CITY },
  { tag: "leisure=stadium", biome: BIOME_KEYS.CITY },
  { tag: "natural=peak", biome: BIOME_KEYS.MOUNTAIN },
  { tag: "landuse=quarry", biome: BIOME_KEYS.MOUNTAIN },
  { tag: "historic=ruins", biome: BIOME_KEYS.RUINS },
  { tag: "landuse=meadow", biome: BIOME_KEYS.PLAINS },
  { tag: "landuse=farmland", biome: BIOME_KEYS.PLAINS },
];

/** Palabras dentro del NOMBRE de una zona/parque que sugieren un bioma — la regla configurable
 *  de respaldo mientras no haya datos reales de OSM (ver classifyBiomeForZone en el motor). */
export const ZONE_NAME_BIOME_HINTS = [
  { keywords: ["parque", "bosque", "valle", "cumbayá", "carolina"], biome: BIOME_KEYS.FOREST },
  { keywords: ["industrial", "zona franca", "bodega"], biome: BIOME_KEYS.INDUSTRIAL },
  { keywords: ["histórico", "ruinas", "colonial"], biome: BIOME_KEYS.RUINS },
  { keywords: ["río", "rio", "malecón"], biome: BIOME_KEYS.RIVER },
];

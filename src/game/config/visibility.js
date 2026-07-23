/* ============================================================
   VISIBILIDAD DEL MUNDO — sistema de prioridades de renderizado.

   Responsabilidad de este archivo: SOLO la configuración — qué prioridad de visibilidad tiene
   cada tipo de entidad y a qué distancia se activa cada nivel. Nada de esto decide todavía cómo
   se dibuja ni cuándo se llama (eso vive en main.js, usando ./game/systems/visibilityEngine.js
   como intermediario puro).

   Tres niveles:
   - ALWAYS:    siempre visible (Torres "landmark" — una por zona, para orientarse —, Jefes de
                región, Coliseo) — hoy ya están acotados al "área cargada" (los datos de la ciudad
                actual), así que no hace falta un filtro de distancia adicional para las torres
                landmark ni los jefes de región (nacen cerca del jugador y nunca se ocultan por
                distancia); el Coliseo si necesita mostrarse siempre porque es un destino fijo que
                conviene ver de lejos para poder ir hacia él.
   - MEDIUM:    visibilidad media (Torres normales — la segunda de cada zona, no "landmark" —,
                Santuarios, Fogatas, Estaciones de mejora de equipo, Mercader Ambulante, NPCs
                dinámicos) — se dibujan solo dentro de MEDIUM_DISTANCE_M. Antes TODAS las torres
                eran siempre visibles; para no saturar el mapa con demasiados íconos permanentes,
                ahora solo la mitad (la "landmark" de cada zona) lo es — la otra mitad aparece por
                proximidad, igual que un santuario. Las estaciones de mejora (una por cada parque/
                centro comercial de TODAS las ciudades) seguían el mismo criterio viejo: pedido
                explícito, ahora también aparecen solo por cercanía.
   - DISCOVERY: descubrimiento (árboles, rocas, hierro, cofres, Eventos Aleatorios) — se dibujan
                solo dentro de DISCOVERY_DISTANCE_M, mucho más cerca.
   ============================================================ */

export const VISIBILITY_PRIORITY = {
  ALWAYS: "always",
  MEDIUM: "medium",
  DISCOVERY: "discovery",
};

/** Distancias centralizadas — nunca hardcodeadas en el componente visual. Cambiarlas acá alcanza
 *  para ajustar todo el sistema. */
export const VISIBILITY_DISTANCES = {
  mediumDistanceM: 600,     // Coliseo, Torres por proximidad, Santuarios, Fogatas, Mercader, NPCs dinámicos
  discoveryDistanceM: 130,  // árboles, rocas, hierro, cofres, Eventos Aleatorios
  hysteresisM: 80,          // colchón extra antes de OCULTAR (no antes de mostrar), para que no parpadee justo en el borde
};

/** Qué prioridad de visibilidad tiene cada tipo de entidad del mundo — agregar un tipo nuevo es
 *  una fila más acá, nunca una rama de código nueva en el resto del sistema. */
export const ENTITY_VISIBILITY = {
  tower: { priority: VISIBILITY_PRIORITY.ALWAYS },              // torres "landmark" (una por zona)
  tower_proximity: { priority: VISIBILITY_PRIORITY.MEDIUM },    // el resto de las torres (la otra mitad de cada zona)
  region_boss: { priority: VISIBILITY_PRIORITY.ALWAYS },
  coliseo: { priority: VISIBILITY_PRIORITY.ALWAYS },
  shrine: { priority: VISIBILITY_PRIORITY.MEDIUM },
  campfire: { priority: VISIBILITY_PRIORITY.MEDIUM },
  upgrade_station: { priority: VISIBILITY_PRIORITY.MEDIUM },
  wandering_merchant: { priority: VISIBILITY_PRIORITY.MEDIUM },
  dynamic_npc: { priority: VISIBILITY_PRIORITY.MEDIUM },
  dungeon_portal: { priority: VISIBILITY_PRIORITY.MEDIUM },      // portal de mazmorra (Fortaleza del Señor Oscuro, etc.)
  resource_node: { priority: VISIBILITY_PRIORITY.DISCOVERY },
  chest: { priority: VISIBILITY_PRIORITY.DISCOVERY },
  world_event: { priority: VISIBILITY_PRIORITY.DISCOVERY },
};

/* ============================================================
   GENERACIÓN AUTOMÁTICA DE UBICACIONES A PARTIR DE POI REALES (preparación para el futuro)

   Esta tabla no se consulta todavía contra datos reales de OpenStreetMap (este proyecto no trae
   esa capa de datos hoy) — es la regla YA lista para cuando se integre, igual que
   OSM_TAG_TO_BIOME en biomes.js. La idea: en vez de posiciones completamente al azar, las
   próximas capas podrán preguntar "¿qué POI real hay cerca?" y usar esta tabla para saber qué
   tipo de contenido tiene sentido ahí.
   ============================================================ */
export const OSM_POI_TO_CONTENT_HINTS = [
  { osmType: "park",              suggests: ["resource_node:wood", "region_boss:forest-type", "dynamic_npc:none"] },
  { osmType: "mall",              suggests: ["wandering_merchant", "dynamic_npc:commercial"] },
  { osmType: "stadium",           suggests: ["coliseo"] },
  { osmType: "plaza",             suggests: ["world_event", "wandering_merchant"] },
  { osmType: "monument",          suggests: ["shrine"] },
  { osmType: "industrial",        suggests: ["resource_node:iron", "region_boss:golem-type", "dynamic_npc:blacksmith(futuro)"] },
];

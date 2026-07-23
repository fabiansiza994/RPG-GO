/* ============================================================
   INTEGRACIÓN CON OPENSTREETMAP — Mapa Vivo, Capa 6: solo configuración.

   Responsabilidad de este archivo: SOLO datos — qué GameFeature existen, qué tag de OpenStreetMap
   se traduce a cuál, y los parámetros de consulta/cache. Nada de esto hace fetch ni toca el mapa
   (eso vive en ./game/systems/osmProvider.js y ./game/systems/geoWorldAdapter.js). Ninguna capa
   anterior (biomes.js, visibility.js, ecosystemEngine.js, world.js, etc.) se modificó para esto.

   Agregar un tipo de lugar nuevo es una fila más en OSM_TAG_TO_GAME_FEATURE, nunca una rama de
   código nueva en el normalizador.
   ============================================================ */

/** GameFeature: el único vocabulario que el resto del juego debería llegar a conocer algún día.
 *  Nunca una etiqueta cruda de OSM (natural=wood, amenity=place_of_worship, etc.) — esas quedan
 *  encapsuladas en OSM_TAG_TO_GAME_FEATURE, abajo. */
export const GAME_FEATURE_KEYS = {
  PARK: "PARK",
  FOREST_AREA: "FOREST_AREA",
  LAKE: "LAKE",
  RIVER: "RIVER",
  MARKET_LOCATION: "MARKET_LOCATION",
  PLAZA: "PLAZA",
  MONUMENT: "MONUMENT",
  SANCTUARY_LOCATION: "SANCTUARY_LOCATION",
  ARENA_LOCATION: "ARENA_LOCATION",
  HOSPITAL: "HOSPITAL",
  INDUSTRIAL_ZONE: "INDUSTRIAL_ZONE",
  UNIVERSITY: "UNIVERSITY",
  BRIDGE: "BRIDGE",
  STATION: "STATION",
  PARKING: "PARKING",
  TRAIL: "TRAIL",
  CEMETERY: "CEMETERY",
  BEACH: "BEACH",
  MOUNTAIN_AREA: "MOUNTAIN_AREA",
  VIEWPOINT: "VIEWPOINT",
  OTHER: "OTHER", // cualquier elemento con tag reconocible por Overpass pero sin mapeo específico todavía
};

/** Nombres legibles por si alguna UI futura quisiera mostrar el tipo de lugar (hoy nadie los usa). */
export const GAME_FEATURE_LABELS = {
  [GAME_FEATURE_KEYS.PARK]: "Parque",
  [GAME_FEATURE_KEYS.FOREST_AREA]: "Bosque",
  [GAME_FEATURE_KEYS.LAKE]: "Lago",
  [GAME_FEATURE_KEYS.RIVER]: "Río",
  [GAME_FEATURE_KEYS.MARKET_LOCATION]: "Centro comercial",
  [GAME_FEATURE_KEYS.PLAZA]: "Plaza",
  [GAME_FEATURE_KEYS.MONUMENT]: "Monumento",
  [GAME_FEATURE_KEYS.SANCTUARY_LOCATION]: "Templo",
  [GAME_FEATURE_KEYS.ARENA_LOCATION]: "Estadio",
  [GAME_FEATURE_KEYS.HOSPITAL]: "Hospital",
  [GAME_FEATURE_KEYS.INDUSTRIAL_ZONE]: "Zona industrial",
  [GAME_FEATURE_KEYS.UNIVERSITY]: "Universidad",
  [GAME_FEATURE_KEYS.BRIDGE]: "Puente",
  [GAME_FEATURE_KEYS.STATION]: "Estación",
  [GAME_FEATURE_KEYS.PARKING]: "Parqueadero",
  [GAME_FEATURE_KEYS.TRAIL]: "Sendero",
  [GAME_FEATURE_KEYS.CEMETERY]: "Cementerio",
  [GAME_FEATURE_KEYS.BEACH]: "Playa",
  [GAME_FEATURE_KEYS.MOUNTAIN_AREA]: "Montaña",
  [GAME_FEATURE_KEYS.VIEWPOINT]: "Mirador",
  [GAME_FEATURE_KEYS.OTHER]: "Punto de interés",
};

/** Tabla de normalización OSM → GameFeature. Formato de cada fila: {key, value, feature}. Se
 *  evalúa en orden (la primera fila cuyo tag calce gana), así que reglas más específicas deben ir
 *  antes que reglas genéricas si se agregan más adelante. Agregar un elemento nuevo del mundo real
 *  es SOLO agregar una fila acá — nunca tocar osmFeatureNormalizer.js. */
export const OSM_TAG_TO_GAME_FEATURE = [
  { key: "leisure", value: "park", feature: GAME_FEATURE_KEYS.PARK },
  { key: "leisure", value: "garden", feature: GAME_FEATURE_KEYS.PARK },
  { key: "natural", value: "wood", feature: GAME_FEATURE_KEYS.FOREST_AREA },
  { key: "landuse", value: "forest", feature: GAME_FEATURE_KEYS.FOREST_AREA },
  { key: "natural", value: "water", feature: GAME_FEATURE_KEYS.LAKE },
  { key: "landuse", value: "reservoir", feature: GAME_FEATURE_KEYS.LAKE },
  { key: "waterway", value: "river", feature: GAME_FEATURE_KEYS.RIVER },
  { key: "waterway", value: "stream", feature: GAME_FEATURE_KEYS.RIVER },
  { key: "shop", value: "mall", feature: GAME_FEATURE_KEYS.MARKET_LOCATION },
  { key: "shop", value: "department_store", feature: GAME_FEATURE_KEYS.MARKET_LOCATION },
  { key: "place", value: "square", feature: GAME_FEATURE_KEYS.PLAZA },
  { key: "leisure", value: "common", feature: GAME_FEATURE_KEYS.PLAZA },
  { key: "historic", value: "monument", feature: GAME_FEATURE_KEYS.MONUMENT },
  { key: "historic", value: "memorial", feature: GAME_FEATURE_KEYS.MONUMENT },
  { key: "amenity", value: "place_of_worship", feature: GAME_FEATURE_KEYS.SANCTUARY_LOCATION },
  { key: "leisure", value: "stadium", feature: GAME_FEATURE_KEYS.ARENA_LOCATION },
  { key: "amenity", value: "hospital", feature: GAME_FEATURE_KEYS.HOSPITAL },
  { key: "landuse", value: "industrial", feature: GAME_FEATURE_KEYS.INDUSTRIAL_ZONE },
  { key: "amenity", value: "university", feature: GAME_FEATURE_KEYS.UNIVERSITY },
  { key: "amenity", value: "college", feature: GAME_FEATURE_KEYS.UNIVERSITY },
  { key: "man_made", value: "bridge", feature: GAME_FEATURE_KEYS.BRIDGE },
  { key: "bridge", value: "yes", feature: GAME_FEATURE_KEYS.BRIDGE },
  { key: "railway", value: "station", feature: GAME_FEATURE_KEYS.STATION },
  { key: "amenity", value: "bus_station", feature: GAME_FEATURE_KEYS.STATION },
  { key: "amenity", value: "parking", feature: GAME_FEATURE_KEYS.PARKING },
  { key: "highway", value: "path", feature: GAME_FEATURE_KEYS.TRAIL },
  { key: "highway", value: "footway", feature: GAME_FEATURE_KEYS.TRAIL },
  { key: "landuse", value: "cemetery", feature: GAME_FEATURE_KEYS.CEMETERY },
  { key: "amenity", value: "grave_yard", feature: GAME_FEATURE_KEYS.CEMETERY },
  { key: "natural", value: "beach", feature: GAME_FEATURE_KEYS.BEACH },
  { key: "natural", value: "peak", feature: GAME_FEATURE_KEYS.MOUNTAIN_AREA },
  { key: "natural", value: "mountain_range", feature: GAME_FEATURE_KEYS.MOUNTAIN_AREA },
  { key: "tourism", value: "viewpoint", feature: GAME_FEATURE_KEYS.VIEWPOINT },
];

/** Las claves de tag que de verdad se piden a Overpass (ver osmProvider.js) — mantenidas acá para
 *  que agregar un GameFeature nuevo cuyo `key` no esté en esta lista todavía sea evidente (si no
 *  está acá, Overpass ni siquiera va a traer ese elemento). */
export const OSM_QUERY_TAG_KEYS = [
  "leisure", "natural", "landuse", "waterway", "shop", "place", "historic",
  "amenity", "man_made", "bridge", "railway", "highway", "tourism",
];

/** Sugerencia opcional (débil, no vinculante) de a qué bioma existente (biomes.js) se parece cada
 *  GameFeature — pensado para que una capa futura pueda usarlo como una señal más al clasificar,
 *  nunca para reemplazar la clasificación real de biomes.js/ecosystemEngine.js (esos archivos no
 *  se tocaron). Los GameFeature sin entrada acá (plazas, estaciones, cementerios, etc.) simplemente
 *  no aportan una sugerencia de bioma. */
export const GAME_FEATURE_TO_BIOME_HINT = {
  [GAME_FEATURE_KEYS.PARK]: "FOREST",
  [GAME_FEATURE_KEYS.FOREST_AREA]: "FOREST",
  [GAME_FEATURE_KEYS.LAKE]: "RIVER",
  [GAME_FEATURE_KEYS.RIVER]: "RIVER",
  [GAME_FEATURE_KEYS.INDUSTRIAL_ZONE]: "INDUSTRIAL",
  [GAME_FEATURE_KEYS.MOUNTAIN_AREA]: "MOUNTAIN",
  [GAME_FEATURE_KEYS.CEMETERY]: "RUINS",
  [GAME_FEATURE_KEYS.MARKET_LOCATION]: "CITY",
  [GAME_FEATURE_KEYS.PLAZA]: "CITY",
  [GAME_FEATURE_KEYS.ARENA_LOCATION]: "CITY",
};

/** Parámetros de consulta y cache — todos ajustables desde un solo lugar.
 *  - overpassEndpoints: varios espejos públicos, en orden de preferencia (resiliencia ante
 *    caídas/rate-limit de uno solo).
 *  - queryRadiusM: radio real que se pide alrededor del jugador (nunca ciudad/país completos).
 *  - requeryDistanceM: cuánto tiene que moverse el jugador desde el último punto consultado antes
 *    de volver a consultar (si se queda en la misma zona, se reutiliza el cache).
 *  - cacheTtlMs: tiempo de expiración del cache aunque el jugador no se mueva (por si el mundo
 *    real cambió — nuevo edificio, etc. — algo poco probable pero razonable).
 *  - requestTimeoutMs: corta la consulta si Overpass tarda demasiado, para no bloquear nada.
 *  - maxElements: tope defensivo de elementos aceptados por respuesta. */
export const OSM_QUERY_CONFIG = {
  overpassEndpoints: [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ],
  queryRadiusM: 500,
  requeryDistanceM: 250,
  cacheTtlMs: 20 * 60 * 1000,
  requestTimeoutMs: 8000,
  maxElements: 200,
};

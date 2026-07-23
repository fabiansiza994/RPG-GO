/* ============================================================
   ZONAS PELIGROSAS — configuración de la generación por manzanas reales.

   Responsabilidad de este archivo: SOLO datos — qué vías cuentan para formar una manzana, qué
   tolerancias usa la normalización de la red vial, qué tamaños de zona existen y los parámetros de
   consulta/cache/fallback. Nada de esto hace fetch, toca turf ni el mapa (eso vive en
   ../systems/dangerZonePolygonizer.js, ../systems/osmProvider.js y ../systems/dangerZoneOsmCache.js).

   Por qué un archivo de config separado de osm.js: osm.js es del sistema de Puntos de Interés
   (Mapa Vivo, Capa 6 — parques, plazas, tiendas...), con su propia forma de consulta (`out center;`,
   un GameFeature por elemento). Las zonas peligrosas necesitan la GEOMETRÍA completa de las vías
   (`out geom;`) para poder formar polígonos de manzana — un problema distinto, con su propia
   sintonía fina (tolerancias de metros, área mínima/máxima de manzana), que no tiene sentido mezclar
   con la config de POIs.
   ============================================================ */

/** Valores de `highway` que SÍ delimitan una manzana caminable — vías vehiculares/urbanas normales.
 *  Deliberadamente NO incluye vías peatonales/ciclovías sueltas (footway, path, steps, cycleway):
 *  esas casi nunca encierran una manzana completa por sí solas y meterlas generaría polígonos
 *  irregulares chiquitos que no representan una cuadra real. */
export const DANGER_ZONE_ELIGIBLE_HIGHWAY = new Set([
  "residential", "living_street", "service", "unclassified",
  "tertiary", "secondary", "primary",
  "tertiary_link", "secondary_link", "primary_link",
  "trunk", "trunk_link", "motorway", "motorway_link",
]);

/** Valores de `highway` explícitamente EXCLUIDOS aunque aparezcan en la respuesta de Overpass (la
 *  consulta ya filtra por esto, pero se deja la lista acá también como documentación/segunda
 *  barrera si algún día la consulta cambia). */
export const DANGER_ZONE_EXCLUDED_HIGHWAY = new Set([
  "footway", "path", "steps", "cycleway", "construction", "proposed", "pedestrian",
  "bridleway", "corridor", "platform", "raceway", "rest_area", "services",
]);

/** Parámetros de consulta/cache/normalización — todos ajustables desde un solo lugar. */
export const DANGER_ZONE_CONFIG = {
  // --- Consulta a Overpass ---
  overpassEndpoints: [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ],
  queryRadiusM: 350,        // radio alrededor del punto de generación — unas pocas manzanas alrededor
  requestTimeoutMs: 9000,   // corta la consulta si Overpass tarda demasiado
  maxRetries: 2,            // reintentos controlados ADEMÁS de los espejos (osmProvider ya prueba cada endpoint una vez)
  retryBackoffMs: 1200,     // espera entre reintentos (se duplica en cada uno)

  // --- Normalización de la red vial ---
  nodeSnapToleranceM: 4,    // nodos a menos de esta distancia se funden en uno solo (variación GPS/digitalización)
  gapCloseToleranceM: 6,    // extremos de vías a menos de esta distancia se consideran "el mismo punto" (huecos chicos)

  // --- Filtrado de polígonos candidatos ---
  minBlockAreaM2: 400,      // por debajo de esto es ruido de digitalización, no una manzana real
  maxBlockAreaM2: 60000,    // por encima de esto probablemente es el polígono exterior (o una manzana gigante atípica)
  maxExteriorAreaRatio: 6,  // un candidato con área > (mediana de las demás áreas × esto) se descarta como "exterior"
  minCompactnessRatio: 0.12,// area / (perimetro/4)^2 — cuadrado perfecto = 1; por debajo de esto se considera "forma delgada"

  // --- Selección de tamaño ---
  blockCountBySize: { small: 1, medium: 3, large: 6 },
  adjacencyBufferM: 3,      // tolerancia de "se tocan" entre manzanas vecinas (borde a borde, con margen chico)

  // --- Cache (IndexedDB) ---
  cacheGridCellM: 300,      // tamaño de celda de la cuadrícula de cache (ver dangerZoneOsmCache.js)
  cacheTtlMs: 30 * 24 * 60 * 60 * 1000, // 30 días — la red vial real cambia muy rara vez

  // --- Fallback (cuando Overpass falla o no se detecta ningún polígono válido) ---
  fallbackHalfWidthM: 42,   // más chico que el rectángulo original (55×40) — "una forma más chica", como pide el pedido
  fallbackHalfHeightM: 30,
  fallbackGridStepM: 95,    // separación de la cuadrícula calle/carrera aproximada (ver snapToStreetGrid en main.js)
};

/** Nombre técnico de cada modo de generación — se guarda en cada zona (`block.generationMode`) y
 *  se imprime en los logs de depuración (pedido explícito: "modo final de generación"). */
export const DANGER_ZONE_GENERATION_MODE = {
  OSM_BLOCK: "osm-block",                 // polígono real de manzana(s), formado por vías reales
  ROAD_ALIGNED_FALLBACK: "road-aligned-fallback", // Overpass falló o no dio un polígono válido
  MANUAL: "manual",                       // trazado a mano en Modo Constructor — nunca se re-sortea ni se pisa con Overpass
};

/* ============================================================
   DANGER ZONE POLYGONIZER — módulo independiente: zonas peligrosas por manzanas REALES.

   Responsabilidad de este archivo: convertir vías crudas de OpenStreetMap (Overpass, con
   geometría completa — ver fetchOsmWays en ../systems/osmProvider.js) en el polígono de una o
   varias manzanas reales, listo para pintar en el mapa y para el chequeo de "¿el jugador está
   adentro?". Todo acá (salvo `generateDangerZone`, el único punto async) son funciones puras:
   reciben todo por parámetro, nunca tocan player/map/DOM — mismo contrato que el resto del Mapa
   Vivo (osmFeatureNormalizer.js, ecosystemEngine.js, etc.), así se puede probar con datos de
   prueba sin red real ni navegador.

   Encadenamiento del pipeline (buildDangerZonePolygonFromWays, el corazón del archivo):

     elementos Overpass → LineStrings → filtrar vías elegibles → normalizar la red (nodar
     intersecciones reales, cerrar huecos chicos, fundir nodos cercanos) → turf.polygonize →
     filtrar polígonos inválidos → encontrar la manzana semilla (la que contiene el punto, o la
     más cercana) → agregar manzanas vecinas según el tamaño pedido → unir todo en un solo
     Polygon/MultiPolygon.

   Por qué "nodar" la red antes de polygonize: turf.polygonize (como cualquier polygonizer de
   grafos planos) exige que las líneas SOLO se toquen en sus extremos — dos calles que se cruzan a
   mitad de camino (una intersección en X) o que una termine sobre el cuerpo de otra (una
   intersección en T, la más común en cualquier ciudad) no cuentan como "tocarse" hasta que se
   inserta un vértice compartido ahí. Sin este paso, turf.polygonize devuelve 0 polígonos casi
   siempre — confirmado a mano con datos de prueba antes de escribir este archivo (ver tarea de
   verificación con fixtures).
   ============================================================ */

import {
  lineString, featureCollection, point as turfPoint, polygonize, area as turfArea,
  kinks, buffer as turfBuffer, union as turfUnion, distance as turfDistance,
  pointToLineDistance, nearestPointOnLine, booleanPointInPolygon, booleanIntersects,
  lineIntersect, lineSplit, length as turfLength, pointOnFeature,
} from "@turf/turf";
import { fetchOsmWays } from "./osmProvider.js";
import { getCachedWays, setCachedWays } from "./dangerZoneOsmCache.js";
import {
  DANGER_ZONE_ELIGIBLE_HIGHWAY, DANGER_ZONE_CONFIG, DANGER_ZONE_GENERATION_MODE,
} from "../config/dangerZones.js";

/* ------------------------------------------------------------
   1) Elementos Overpass → GeoJSON LineString
   ------------------------------------------------------------ */

/** Un elemento `way` de Overpass (con `out geom;`, trae `.geometry:[{lat,lon},...]`) a un Feature
 *  LineString — conserva highway/bridge/tunnel/layer en `properties` (necesarios más abajo para no
 *  nodar vías que en realidad pasan una sobre otra). Ignora elementos sin geometría útil (menos de
 *  2 puntos) o que no sean `way`. */
export function waysToLineStrings(elements){
  const out = [];
  for(const el of (elements || [])){
    if(el.type !== "way" || !Array.isArray(el.geometry) || el.geometry.length < 2) continue;
    const coords = el.geometry.map(p=> [p.lon, p.lat]);
    const tags = el.tags || {};
    out.push(lineString(coords, {
      osmId: el.id,
      highway: tags.highway || null,
      bridge: tags.bridge && tags.bridge !== "no",
      tunnel: tags.tunnel && tags.tunnel !== "no",
      layer: tags.layer ? parseInt(tags.layer, 10) || 0 : 0,
    }));
  }
  return out;
}

/** Solo las vías cuyo `highway` sirve para delimitar una manzana caminable (ver
 *  DANGER_ZONE_ELIGIBLE_HIGHWAY) — segunda barrera además del filtro que ya aplica la consulta
 *  Overpass del lado del servidor (osmProvider.js), por si algún día esa consulta se vuelve menos
 *  estricta. */
export function filterEligibleWays(lineFeatures, eligibleSet){
  eligibleSet = eligibleSet || DANGER_ZONE_ELIGIBLE_HIGHWAY;
  return lineFeatures.filter(f=> eligibleSet.has(f.properties.highway));
}

/* ------------------------------------------------------------
   2) Normalización de la red vial
   ------------------------------------------------------------ */

function distMApprox(a, b){
  const dLat = (a[1]-b[1]) * 111111;
  const dLng = (a[0]-b[0]) * 111111 * Math.cos(((a[1]+b[1])/2) * Math.PI/180);
  return Math.hypot(dLat, dLng);
}

/** ¿Dos vías pueden compartir un nodo real donde su geometría se toca? No, si pasan una sobre/bajo
 *  la otra: capas (`layer`) distintas, o una es puente/túnel y la otra no — esa "intersección" es
 *  solo aparente (vista desde arriba), nunca un cruce peatonal real. Pedido explícito: "conserva
 *  información de bridge, tunnel y layer para no crear intersecciones falsas". */
export function canRoadsIntersect(propsA, propsB){
  if((propsA.layer||0) !== (propsB.layer||0)) return false;
  if(!!propsA.bridge !== !!propsB.bridge) return false;
  if(!!propsA.tunnel !== !!propsB.tunnel) return false;
  return true;
}

/** Funde en un solo punto canónico todos los vértices de `lines` que caigan a `toleranceM` metros
 *  entre sí — clustering voraz (simple, suficiente para la cantidad de vértices de unas pocas
 *  manzanas): cada vértice nuevo se suma al primer cluster existente dentro de tolerancia, o crea
 *  uno propio. Se usa DOS veces en normalizeRoadNetwork: antes de nodar (para que extremos de vías
 *  distintas que representan la misma esquina real ya lleguen unificados) y después (para limpiar
 *  el ruido de precisión de los puntos de corte, calculados de forma independiente por cada par de
 *  vías que se cruza). */
export function snapNodes(lines, toleranceM){
  const clusters = [];
  function clusterFor(coord){
    for(const c of clusters){ if(distMApprox(coord, c.center) <= toleranceM) return c; }
    const c = { center: coord.slice() };
    clusters.push(c);
    return c;
  }
  return lines.map(line=> lineString(
    line.geometry.coordinates.map(c=> clusterFor(c).center.slice()),
    line.properties
  ));
}

/** Índice del vértice de `line` que coincide (bit a bit, tras el clustering de snapNodes ya deberían
 *  quedar exactos) con `pt`, o -1 si no hay ninguno. */
function exactVertexIndex(line, pt){
  const coords = line.geometry.coordinates;
  const [px, py] = pt.geometry.coordinates;
  for(let i=0; i<coords.length; i++){
    if(Math.abs(coords[i][0]-px) < 1e-9 && Math.abs(coords[i][1]-py) < 1e-9) return i;
  }
  return -1;
}

/** Parte `line` en el punto `pt`, devolviendo [antes, después] (o `null` si el punto queda pegado
 *  a uno de los dos extremos — nada que partir ahí). turf.lineSplit() SOLO sirve para un punto que
 *  cae a mitad de un segmento (interpola uno nuevo); si `pt` coincide EXACTAMENTE con un vértice ya
 *  existente de la línea (el caso más común acá, precisamente porque snapNodes ya dejó los nodos
 *  compartidos con coordenadas idénticas), lineSplit devuelve la línea SIN partir — confirmado a
 *  mano antes de escribir este archivo — así que ese caso se resuelve con un corte directo del
 *  arreglo de coordenadas, sin pasar por lineSplit en absoluto. */
function splitLineAtOnePoint(line, pt){
  const idx = exactVertexIndex(line, pt);
  if(idx !== -1){
    const coords = line.geometry.coordinates;
    if(idx <= 0 || idx >= coords.length-1) return null; // coincide con un extremo — no hay nada que partir
    return [
      lineString(coords.slice(0, idx+1), line.properties),
      lineString(coords.slice(idx), line.properties),
    ];
  }
  try{
    const split = lineSplit(line, pt);
    if(split.features.length < 2) return null;
    return [split.features[0], split.features[split.features.length-1]];
  }catch(e){
    return null; // punto degenerado (fuera de la línea por más del tolerable, etc.) — se ignora
  }
}

function splitLineAtPoints(line, points){
  if(!points.length) return [line];
  const start = turfPoint(line.geometry.coordinates[0]);
  const withDist = points
    .map(pt=> ({ pt, dist: turfDistance(start, pt) }))
    .sort((a, b)=> a.dist - b.dist);
  const segments = [];
  let current = line;
  let consumedDist = 0;
  for(const { pt, dist } of withDist){
    if(dist - consumedDist < 1e-6) continue; // pegado al punto ya consumido — evita segmentos de largo ~0
    const pair = splitLineAtOnePoint(current, pt);
    if(!pair) continue;
    segments.push(pair[0]);
    current = pair[1];
    consumedDist = dist;
  }
  segments.push(current);
  return segments;
}

/** El paso central de la normalización: inserta un vértice compartido en cada punto donde dos
 *  vías (que SÍ pueden cruzarse de verdad, ver canRoadsIntersect) se tocan — sea un cruce en X
 *  (mitad de una vía con la mitad de otra, via lineIntersect) o en T (el EXTREMO de una vía cae
 *  sobre el CUERPO de otra, el caso más común en cualquier ciudad — lineIntersect por sí solo NO
 *  detecta esto de forma confiable, hace falta buscarlo aparte con pointToLineDistance). Devuelve
 *  la red partida en segmentos que solo se tocan en sus extremos — lista para turf.polygonize. */
export function nodeRoadNetwork(lines, toleranceM){
  const cutPointsByLine = lines.map(()=> []);
  // cruces en X
  for(let i=0; i<lines.length; i++){
    for(let j=i+1; j<lines.length; j++){
      if(!canRoadsIntersect(lines[i].properties, lines[j].properties)) continue;
      const inter = lineIntersect(lines[i], lines[j]);
      inter.features.forEach(pt=>{ cutPointsByLine[i].push(pt); cutPointsByLine[j].push(pt); });
    }
  }
  // cruces en T (y nodos compartidos entre vías con varios vértices propios): CUALQUIER vértice de
  // `lines[i]` — no solo sus dos extremos, también los intermedios, que es donde caen la mayoría de
  // los nodos de intersección reales en una vía de OSM con más de 2 puntos — que caiga cerca del
  // CUERPO de `lines[j]` se trata como un punto de corte para AMBAS vías: la propia `lines[i]` (en
  // ese vértice exacto, ya es parte de su geometría) y `lines[j]` (proyectado sobre ella). Sin
  // cortar también `lines[i]` ahí, quedaría como una sola LineString larga sin partir en ese punto
  // aunque `lines[j]` sí se partiera — rompiendo igual el "solo se tocan en los extremos" que pide
  // turf.polygonize.
  for(let i=0; i<lines.length; i++){
    const coords = lines[i].geometry.coordinates;
    coords.forEach(vertex=>{
      const vertexPt = turfPoint(vertex);
      for(let j=0; j<lines.length; j++){
        if(j===i || !canRoadsIntersect(lines[i].properties, lines[j].properties)) continue;
        const d = pointToLineDistance(vertexPt, lines[j], { units: "meters" });
        if(d <= toleranceM){
          cutPointsByLine[i].push(vertexPt);
          const proj = nearestPointOnLine(lines[j], vertexPt);
          cutPointsByLine[j].push(turfPoint(proj.geometry.coordinates));
        }
      }
    });
  }
  const out = [];
  lines.forEach((line, i)=> out.push(...splitLineAtPoints(line, cutPointsByLine[i])));
  return out;
}

/** Descarta segmentos de largo ~0 — artefacto esperado de nodar+fundir nodos cercanos (dos puntos
 *  de corte que terminan fundiéndose en el mismo cluster dejan un segmento degenerado entre
 *  ellos), no una manzana real. */
export function dropDegenerateLines(lines, minLengthM){
  return lines.filter(l=>{
    const c = l.geometry.coordinates;
    return distMApprox(c[0], c[c.length-1]) > minLengthM || turfLength(l, { units: "kilometers" })*1000 > minLengthM;
  });
}

/** Descarta vías repetidas o casi idénticas (Overpass a veces devuelve la misma vía física dos
 *  veces si aparece en más de una relación) — mismo criterio de "clave = extremos redondeados" que
 *  ya usa el resto del juego para deduplicar por posición (worldFeatureRepository.js). */
export function dedupeLines(lines){
  const seen = new Set();
  const out = [];
  for(const l of lines){
    const c = l.geometry.coordinates;
    const a = c[0], b = c[c.length-1];
    const key1 = `${a[0].toFixed(6)},${a[1].toFixed(6)}|${b[0].toFixed(6)},${b[1].toFixed(6)}`;
    const key2 = `${b[0].toFixed(6)},${b[1].toFixed(6)}|${a[0].toFixed(6)},${a[1].toFixed(6)}`;
    if(seen.has(key1) || seen.has(key2)) continue;
    seen.add(key1);
    out.push(l);
  }
  return out;
}

/** Orquesta la normalización completa, en el orden que de verdad funciona (confirmado a mano con
 *  datos de prueba — el orden importa): deduplicar → fundir nodos cercanos (cierra huecos chicos
 *  y unifica esquinas compartidas por vías distintas) → nodar intersecciones reales (X y T) →
 *  fundir nodos cercanos OTRA VEZ (limpia el ruido de precisión de los puntos de corte, calculados
 *  de forma independiente por cada par) → descartar segmentos degenerados. */
export function normalizeRoadNetwork(lineFeatures, config){
  const deduped = dedupeLines(lineFeatures);
  const preSnapped = snapNodes(deduped, config.nodeSnapToleranceM);
  const noded = nodeRoadNetwork(preSnapped, Math.max(config.nodeSnapToleranceM, config.gapCloseToleranceM));
  const postSnapped = snapNodes(noded, config.nodeSnapToleranceM);
  return dropDegenerateLines(postSnapped, 0.5);
}

/* ------------------------------------------------------------
   3) Polygonize + filtrado de polígonos válidos
   ------------------------------------------------------------ */

export function polygonizeNetwork(normalizedLines){
  if(normalizedLines.length < 3) return []; // no alcanza para cerrar ni una manzana
  try{
    return polygonize(featureCollection(normalizedLines)).features;
  }catch(e){
    return []; // red todavía mal noded pese a la normalización — el llamador cae al fallback
  }
}

/** area / (perímetro/4)² — 1.0 para un cuadrado perfecto, cae rápido para formas alargadas/finas.
 *  Heurística simple pero suficiente para descartar tiras delgadas (artefactos de vías casi
 *  paralelas muy próximas) sin necesitar un "rectángulo mínimo rotado" completo. */
function compactnessRatio(polygonFeature){
  const areaM2 = turfArea(polygonFeature);
  const perimeterKm = turfLength(polygonFeature, { units: "kilometers" });
  const perimeterM = perimeterKm * 1000;
  if(perimeterM <= 0) return 0;
  return areaM2 / Math.pow(perimeterM/4, 2);
}

/** Filtra los polígonos que turf.polygonize devolvió, quedándose solo con los que de verdad
 *  representan una manzana razonable: área mínima/máxima, no autointersectado (kinks), no
 *  extremadamente delgado, y no el "polígono exterior" (el que envuelve a los demás — se detecta
 *  por ser mucho más grande que la mediana de los candidatos, además del tope absoluto de área). */
export function filterValidPolygons(polygonFeatures, config){
  const withArea = polygonFeatures
    .map(f=> ({ f, areaM2: turfArea(f) }))
    .filter(({areaM2})=> areaM2 >= config.minBlockAreaM2 && areaM2 <= config.maxBlockAreaM2);
  if(!withArea.length) return [];
  const sorted = withArea.map(w=> w.areaM2).slice().sort((a,b)=> a-b);
  const median = sorted[Math.floor(sorted.length/2)];
  const exteriorCutoff = median * config.maxExteriorAreaRatio;
  return withArea
    .filter(({areaM2})=> withArea.length < 3 || areaM2 <= exteriorCutoff) // con pocos candidatos no hay "mediana" confiable, no descarta por esto
    .filter(({f})=> kinks(f).features.length === 0)
    .filter(({f})=> compactnessRatio(f) >= config.minCompactnessRatio)
    .map(({f})=> f);
}

/* ------------------------------------------------------------
   4) Selección de la manzana semilla + vecinas según el tamaño pedido
   ------------------------------------------------------------ */

/** La manzana que contiene `pt`, o si cae justo sobre una calle (no dentro de ninguna), la más
 *  cercana por distancia al BORDE (más intuitivo que por distancia al centro para formas
 *  irregulares — un polígono alargado puede tener el centro lejos pero un borde muy cerca). */
export function findSeedBlock(validPolygons, pt){
  const p = turfPoint([pt.lng, pt.lat]);
  const containing = validPolygons.find(poly=> booleanPointInPolygon(p, poly));
  if(containing) return containing;
  if(!validPolygons.length) return null;
  let best = null, bestDist = Infinity;
  for(const poly of validPolygons){
    const ring = poly.geometry.type === "Polygon" ? poly.geometry.coordinates[0] : poly.geometry.coordinates[0][0];
    const d = pointToLineDistance(p, lineString(ring), { units: "meters" });
    if(d < bestDist){ bestDist = d; best = poly; }
  }
  return best;
}

/** ¿Se tocan (o casi) dos manzanas? Infla `a` por `bufferM` y ve si toca `b` — mismo criterio que
 *  pide el pedido ("contacto de bordes o una pequeña tolerancia mediante buffer"), evita que dos
 *  manzanas que solo comparten una esquina lejana cuenten como vecinas de verdad. */
function blocksAreAdjacent(a, b, bufferM){
  try{
    const inflatedA = turfBuffer(a, bufferM, { units: "meters" });
    return booleanIntersects(inflatedA, b);
  }catch(e){
    return false;
  }
}

/** BFS desde la manzana semilla sobre el grafo de adyacencia real (no "las más cercanas por
 *  centro", que podría saltarse una manzana intermedia) hasta juntar `count` manzanas o quedarse
 *  sin vecinas nuevas — así "medium"/"large" siempre son un grupo CONTIGUO, nunca manzanas
 *  sueltas de zonas separadas de la ciudad. */
export function selectAdjacentBlocks(validPolygons, seed, count, bufferM){
  if(!seed) return [];
  const selected = [seed];
  const remaining = validPolygons.filter(p=> p !== seed);
  while(selected.length < count && remaining.length){
    let foundIdx = -1;
    for(let i=0; i<remaining.length; i++){
      if(selected.some(s=> blocksAreAdjacent(s, remaining[i], bufferM))){ foundIdx = i; break; }
    }
    if(foundIdx === -1) break; // no quedan vecinas contiguas — el grupo se queda con lo que ya tiene
    selected.push(remaining[foundIdx]);
    remaining.splice(foundIdx, 1);
  }
  return selected;
}

/** Une las manzanas seleccionadas en un solo Polygon (si quedaron contiguas y turf pudo fusionarlas
 *  del todo) o MultiPolygon (si alguna quedó separada — igual de válido para GeoJSON/MapLibre). */
export function mergeBlocks(blocks){
  if(blocks.length === 1) return blocks[0];
  try{
    return turfUnion(featureCollection(blocks));
  }catch(e){
    // turf.union puede fallar con geometría casi-degenerada — MultiPolygon "a mano" como respaldo
    // (cada manzana como un polígono separado dentro del mismo MultiPolygon), sigue siendo un
    // GeoJSON válido para pintar y para booleanPointInPolygon.
    const coordinates = [];
    blocks.forEach(b=>{
      if(b.geometry.type === "Polygon") coordinates.push(b.geometry.coordinates);
      else if(b.geometry.type === "MultiPolygon") coordinates.push(...b.geometry.coordinates);
    });
    return { type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates } };
  }
}

/* ------------------------------------------------------------
   5) Orquestador puro (sin red) + punto de entrada async (con red + cache)
   ------------------------------------------------------------ */

/** El pipeline completo, pero puro — recibe los elementos de Overpass YA obtenidos (por
 *  generateDangerZone, más abajo, o por un test con datos de prueba) y devuelve
 *  `{polygon, generationMode, debug}` o `null` si no se pudo formar ninguna manzana válida (el
 *  llamador decide el fallback). `debug` trae los conteos de cada etapa (pedido explícito: "logs
 *  de depuración... cantidad de vías obtenidas, segmentos normalizados, polígonos detectados,
 *  descartados y motivo, modo final") y, si `opts.includeDebugLayers`, las capas intermedias para
 *  el modo de depuración visual. */
export function buildDangerZonePolygonFromWays(elements, point, sizeKey, config, opts){
  opts = opts || {};
  const debug = { elementsFetched: (elements||[]).length };

  const allLines = waysToLineStrings(elements);
  const eligible = filterEligibleWays(allLines);
  debug.eligibleWays = eligible.length;
  if(!eligible.length) return { result: null, debug };

  const normalized = normalizeRoadNetwork(eligible, config);
  debug.normalizedSegments = normalized.length;

  const rawPolygons = polygonizeNetwork(normalized);
  debug.candidatePolygons = rawPolygons.length;

  const validPolygons = filterValidPolygons(rawPolygons, config);
  debug.validPolygons = validPolygons.length;
  debug.discardedPolygons = rawPolygons.length - validPolygons.length;

  if(!validPolygons.length){
    return { result: null, debug, layers: opts.includeDebugLayers ? { lines: normalized, candidates: rawPolygons, selected: [] } : null };
  }

  const seed = findSeedBlock(validPolygons, point);
  if(!seed) return { result: null, debug, layers: opts.includeDebugLayers ? { lines: normalized, candidates: rawPolygons, selected: [] } : null };

  const targetCount = (config.blockCountBySize && config.blockCountBySize[sizeKey]) || 1;
  const selected = selectAdjacentBlocks(validPolygons, seed, targetCount, config.adjacencyBufferM);
  debug.selectedBlocks = selected.length;

  const merged = mergeBlocks(selected);
  debug.generationMode = DANGER_ZONE_GENERATION_MODE.OSM_BLOCK;

  return {
    result: { polygon: merged, generationMode: DANGER_ZONE_GENERATION_MODE.OSM_BLOCK, blockCount: selected.length },
    debug,
    layers: opts.includeDebugLayers ? { lines: normalized, candidates: rawPolygons, selected } : null,
  };
}

/** Punto de entrada público, único que de verdad toca red/cache: consulta el cache local (por
 *  celda de cuadrícula, ver dangerZoneOsmCache.js) y solo si no hay nada vigente ahí llama a
 *  Overpass (fetchOsmWays, con sus propios reintentos/timeout/espejos). Nunca lanza — cualquier
 *  fallo (red caída, IndexedDB no disponible, polygonize sin resultado válido) devuelve `null` y
 *  el llamador (main.js) cae a su propio rectángulo de respaldo, tal como pide el punto 17 del
 *  pedido. `deps.signal` (opcional): permite cancelar una generación vieja si el jugador ya
 *  cambió de ciudad antes de que termine (ver rollTodaysDangerZones en main.js). */
export async function generateDangerZone(point, sizeKey, config, deps){
  config = config || DANGER_ZONE_CONFIG;
  deps = deps || {};
  const debug = {};
  try{
    let elements = await getCachedWays(point, config, deps);
    debug.fromCache = !!elements;
    if(!elements){
      elements = await fetchOsmWays(point, config.queryRadiusM, DANGER_ZONE_ELIGIBLE_HIGHWAY, config, deps);
      if(deps.signal && deps.signal.aborted) return { result: null, debug: { ...debug, aborted: true } };
      if(elements && elements.length) await setCachedWays(point, config, elements, deps);
    }
    const { result, debug: pipelineDebug, layers } = buildDangerZonePolygonFromWays(
      elements, point, sizeKey, config, { includeDebugLayers: opts_includeDebugLayers(deps) }
    );
    return { result, debug: { ...debug, ...pipelineDebug }, layers };
  }catch(e){
    return { result: null, debug: { ...debug, error: e && e.message } };
  }
}

function opts_includeDebugLayers(deps){ return !!(deps && deps.includeDebugLayers); }

/** Punto para anclar la insignia "PELIGRO" cerca del centro visual del polígono — pointOnFeature
 *  (a diferencia de un centroide simple) garantiza un punto que cae DENTRO de la forma, incluso
 *  para manzanas cóncavas o un MultiPolygon con partes separadas. */
export function dangerZoneLabelPoint(polygonFeature){
  const p = pointOnFeature(polygonFeature);
  return { lat: p.geometry.coordinates[1], lng: p.geometry.coordinates[0] };
}

/** ¿`pt` cae dentro del polígono de esta zona? — reemplazo directo de pointInRotatedRect/pointInRect
 *  de versiones anteriores, ahora contra la forma real (Polygon o MultiPolygon). */
export function isPointInDangerZone(pt, polygonFeature){
  return booleanPointInPolygon(turfPoint([pt.lng, pt.lat]), polygonFeature);
}

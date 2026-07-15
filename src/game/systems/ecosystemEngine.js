/* ============================================================
   ECOSYSTEM ENGINE — Mapa Vivo, Capa 4: Ecosistema del Mundo.

   Responsabilidad de este archivo: dado un lugar (y, a futuro, hora/clima/nivel del jugador),
   decidir a qué BIOMA pertenece y qué contenido es apropiado ahí (enemigos/recursos/NPC/eventos
   posibles, con sus pesos). Es el "cerebro" que consultarán las próximas capas del Mapa Vivo
   antes de generar contenido — todavía NADIE lo consulta para filtrar spawns reales; esta capa
   solo deja la arquitectura lista, sin cambiar el comportamiento actual del mapa.

   Este archivo NO toca (a propósito, vive en main.js o en los otros sistemas):
   - el mapa, el jugador, el guardado;
   - la IA de combate ni las estadísticas;
   - qué aparece de verdad hoy (spawnMonsters, maybeSpawnResourceNode, etc. siguen igual).

   Mismo patrón de separación que dynamicWorld.js y randomEvents.js: solo lógica pura, recibe
   todo lo que necesita por parámetro (posiciones, listas de zonas/parques, una función de
   distancia) en vez de importar el estado del juego directamente.
   ============================================================ */

import { BIOMES, BIOME_KEYS, DEFAULT_BIOME_KEY, OSM_TAG_TO_BIOME, ZONE_NAME_BIOME_HINTS } from "../config/biomes.js";

/** Si en el futuro hay tags reales de OpenStreetMap para un lugar (natural=wood, landuse=industrial,
 *  etc.), esta función ya sabe traducirlos a un bioma — hoy nadie le pasa tags reales todavía
 *  (este juego no trae esa capa de datos), pero la regla queda lista para cuando exista. */
export function classifyBiomeFromOsmTags(tags){
  if(!tags) return null;
  const entries = Array.isArray(tags) ? tags : Object.entries(tags).map(([k,v])=> `${k}=${v}`);
  for(const entry of entries){
    const match = OSM_TAG_TO_BIOME.find(m=> m.tag === entry);
    if(match) return match.biome;
  }
  return null;
}

/** Regla configurable de respaldo (mientras no haya datos reales de OSM): mira el nombre de la
 *  zona/parque en busca de palabras que sugieran un bioma. Nunca hardcodea una posición — solo
 *  texto, así que sirve igual para cualquier ciudad nueva que se agregue. */
export function classifyBiomeFromName(name){
  if(!name) return null;
  const lower = name.toLowerCase();
  const hint = ZONE_NAME_BIOME_HINTS.find(h=> h.keywords.some(kw=> lower.includes(kw)));
  return hint ? hint.biome : null;
}

/** Bioma de una ZONA de ciudad (las que ya existen en world.js: centro/norte/sur/valle...) — por
 *  ahora, casi todas son CITY por defecto (son zonas urbanas de una ciudad real), salvo que su
 *  nombre sugiera otra cosa (ver classifyBiomeFromName). Punto de entrada único: si más adelante
 *  las zonas traen su propio campo `biome` o tags reales de OSM, alcanza con revisar acá. */
export function classifyBiomeForZone(zone){
  if(!zone) return DEFAULT_BIOME_KEY;
  if(zone.biome && BIOMES[zone.biome]) return zone.biome; // ya viene clasificada explícitamente
  if(zone.osmTags){
    const fromTags = classifyBiomeFromOsmTags(zone.osmTags);
    if(fromTags) return fromTags;
  }
  return classifyBiomeFromName(zone.name) || DEFAULT_BIOME_KEY;
}

/** Un parque es casi siempre FOREST — salvo que su nombre sugiera otra cosa (ruinas, malecón...). */
export function classifyBiomeForPark(park){
  if(!park) return BIOME_KEYS.FOREST;
  if(park.biome && BIOMES[park.biome]) return park.biome;
  return classifyBiomeFromName(park.name) || BIOME_KEYS.FOREST;
}

/** Bioma de una posición concreta: si cae cerca de un parque conocido, ese parque manda (casi
 *  siempre FOREST); si no, se usa el bioma de la zona más cercana; si no hay ninguna zona
 *  cercana, el bioma de respaldo. Recibe zonas/parques y una función de distancia desde afuera
 *  (nunca importa el estado del juego directamente). */
export function getBiomeAt(pos, zones, parks, distFn, parkRadiusM){
  parkRadiusM = parkRadiusM || 250;
  const nearPark = (parks||[]).find(p=> distFn(pos, p) <= parkRadiusM);
  if(nearPark) return classifyBiomeForPark(nearPark);
  let closest = null, closestDist = Infinity;
  (zones||[]).forEach(z=>{
    const center = z.center || z;
    const d = distFn(pos, center);
    if(d < closestDist){ closestDist = d; closest = z; }
  });
  return closest ? classifyBiomeForZone(closest) : DEFAULT_BIOME_KEY;
}

/** El punto de entrada principal: dado un lugar (y contexto opcional pensado para el futuro —
 *  hora del día, nivel del jugador — que hoy no cambia el resultado, solo queda declarado para
 *  cuando se implemente), devuelve qué es apropiado que exista ahí: bioma, enemigos posibles,
 *  recursos posibles, tipos de NPC posibles, tipos de evento posibles, y sus pesos relativos.
 *
 *  `context` acepta (todo opcional, sin efecto todavía): { hour, playerLevel, weather, season }. */
export function queryEcosystem(pos, worldData, context){
  worldData = worldData || {};
  context = context || {};
  const biomeKey = getBiomeAt(pos, worldData.zones, worldData.parks, worldData.distFn || defaultFlatDist);
  const biome = BIOMES[biomeKey] || BIOMES[DEFAULT_BIOME_KEY];
  return {
    biomeKey,
    biomeLabel: biome.label,
    allowedEnemies: biome.allowedEnemies,
    allowedResources: biome.allowedResources,
    allowedNpcTypes: biome.allowedNpcTypes,
    allowedEventTypes: biome.allowedEventTypes,
    spawnWeights: biome.spawnWeights,
    eventChance: biome.eventChance,
    modifiers: biome.modifiers,
    // preparado para futuro: estos campos viajan en el resultado para que quien consuma el motor
    // ya pueda leerlos, aunque hoy no influyan en el cálculo de arriba.
    context: { hour: context.hour ?? null, playerLevel: context.playerLevel ?? null, weather: context.weather ?? null, season: context.season ?? null },
  };
}

/** Distancia aproximada en metros entre dos puntos {lat,lng} — de respaldo únicamente, para que
 *  este módulo pueda usarse de forma aislada (por ejemplo en una prueba) sin depender de la
 *  función de distancia real del juego. main.js siempre debería pasar la suya (distMeters) en
 *  `worldData.distFn`, que ya considera la curvatura real con más precisión. */
function defaultFlatDist(a,b){
  const dLat = (a.lat-b.lat)*111111;
  const dLng = (a.lng-b.lng)*111111*Math.cos(((a.lat+b.lat)/2)*Math.PI/180);
  return Math.sqrt(dLat*dLat + dLng*dLng);
}

/** ¿Este nombre de enemigo/recurso/NPC/evento es "lógico" en el bioma dado? Ayuda genérica para
 *  cuando las capas futuras quieran filtrar una lista ya armada contra el ecosistema, sin tener
 *  que repetir el `includes` en cada una. */
export function isAllowedInBiome(biomeKey, category, name){
  const biome = BIOMES[biomeKey];
  if(!biome) return true; // sin bioma reconocido, no se bloquea nada (comportamiento actual)
  const list = biome["allowed"+category]; // category: "Enemies" | "Resources" | "NpcTypes" | "EventTypes"
  if(!list || !list.length) return true;
  return list.includes(name);
}

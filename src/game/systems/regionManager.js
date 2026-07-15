/* ============================================================
   REGION MANAGER — Mapa Vivo, Capa 5: Regiones del Mundo.

   Responsabilidad de este archivo: construir las Regiones de una ciudad a partir de sus zonas y
   parques YA EXISTENTES (nunca dibuja límites nuevos ni pide datos nuevos), asociarles bioma
   (reutilizando el Ecosystem Engine de la Capa 4) y nombre de fantasía, y detectar en qué región
   está el jugador ahora mismo.

   Por qué zonas/parques y no calles o barrios administrativos: las zonas de cada ciudad y sus
   parques YA representan accidentes geográficos y puntos de interés reales (un parque grande,
   una zona con centros comerciales, una zona industrial...) — construir regiones sobre esa base,
   en vez de sobre nombres de calle, es lo que hace que el mismo código sirva para cualquier
   ciudad nueva sin diseñar nada a mano. Un parque siempre "gana" sobre la zona que lo rodea
   (mismo criterio que ya usa getBiomeAt en el Ecosystem Engine), así que un parque grande dentro
   de una zona de Ciudad se siente como su propio Bosque, no como parte del distrito.

   RegionManager (este archivo) = RegionDefinitions + RegionDetector + RegionService juntos en un
   solo módulo, ya que las tres responsabilidades son pequeñas y muy relacionadas — cada una vive
   en su propia función exportada, así que separar en archivos distintos más adelante (si hiciera
   falta) es trivial.

   Este archivo NO toca (a propósito, vive en main.js): el mapa, el jugador, el guardado, el
   combate, los recursos, los NPCs, los eventos, las torres, las fogatas ni el Coliseo.
   ============================================================ */

import { BIOME_KEYS, DEFAULT_BIOME_KEY } from "../config/biomes.js";
import { classifyBiomeForZone, classifyBiomeForPark } from "./ecosystemEngine.js";
import {
  REGION_NAME_POOLS, REGION_PRESENTATION, REGION_LEVEL_RANGE,
  REGION_BOSS_BY_BIOME, REGION_DESCRIPTION_BY_BIOME,
} from "../config/regions.js";

/** PRNG chiquito y determinístico (mulberry32), sembrado con un hash de texto — la MISMA zona
 *  o parque siempre elige el MISMO nombre de fantasía, en cualquier dispositivo y sesión. */
function seededIndex(seedStr, length){
  let h = 1779033703 ^ seedStr.length;
  for(let i=0;i<seedStr.length;i++){
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return Math.abs(h) % length;
}

/** RegionDefinitions: arma UNA región a partir de una zona o parque ya existente + su bioma ya
 *  clasificado. No es obligatorio usar todos estos campos todavía (Capa 5 solo prepara el
 *  modelo) — quedan declarados con su valor por defecto para que las capas futuras (reputación,
 *  progreso, control por gremios, invasiones, clima propio, historia, misiones...) no tengan que
 *  rediseñar la forma, solo llenar estos campos. */
function buildRegion(sourceId, center, radiusM, biomeKey){
  const namePool = REGION_NAME_POOLS[biomeKey] || REGION_NAME_POOLS[DEFAULT_BIOME_KEY];
  const presentation = REGION_PRESENTATION[biomeKey] || REGION_PRESENTATION[DEFAULT_BIOME_KEY];
  const levelRange = REGION_LEVEL_RANGE[biomeKey] || [1, 20];
  return {
    id: "region_" + sourceId,
    name: namePool[seededIndex(sourceId, namePool.length)],
    description: REGION_DESCRIPTION_BY_BIOME[biomeKey] || "",
    recommendedLevel: { min: levelRange[0], max: levelRange[1] },
    biome: biomeKey,
    color: presentation.color,
    icon: presentation.icon,
    bounds: { lat: center.lat, lng: center.lng, radiusM },
    mainEnemies: null,   // se consulta al Ecosystem Engine en el momento (queryEcosystem), no se duplica acá
    mainResources: null, // ídem
    regionalBoss: REGION_BOSS_BY_BIOME[biomeKey] || null,
    futureMusic: null,        // placeholder — pista de música ambiental por región (futuro)
    allowedEventTypes: null,  // se consulta al Ecosystem Engine en el momento, no se duplica acá
    allowedNpcTypes: null,    // ídem
    // preparado para futuro — declarado pero sin implementar todavía:
    reputation: 0,
    exploredPct: 0,
    progress: 0,
    guildControl: null,
    regionalEvents: [],
    invasions: [],
    weather: null,
    history: [],
    quests: [],
  };
}

/** RegionDefinitions: arma TODAS las regiones de una ciudad a partir de sus zonas y parques ya
 *  existentes — un parque da su propia región (normalmente Bosque), y "gana" sobre la zona que
 *  lo rodea, igual que ya hace getBiomeAt() en el Ecosystem Engine. */
export function buildRegionsForCity(city){
  const zoneRegions = (city.zones||[]).map(z=>
    buildRegion(city.key+"_zone_"+z.key, z.center, z.radius||2500, classifyBiomeForZone(z))
  );
  const parkRegions = (city.parks||[]).map(p=>
    buildRegion(city.key+"_park_"+p.id, {lat:p.lat, lng:p.lng}, 250, classifyBiomeForPark(p))
  );
  // los parques van PRIMERO: RegionDetector revisa en orden y se queda con la primera que
  // contenga al jugador, así un parque dentro de una zona más grande manda sobre ella.
  return [...parkRegions, ...zoneRegions];
}

/** RegionDetector: ¿en qué región está esta posición? La primera región (en orden: parques
 *  primero, zonas después) cuyo radio la contenga. Si ninguna la contiene, se queda con la zona
 *  más cercana (nunca debería quedar sin región). Recibe la función de distancia desde afuera,
 *  igual que el resto de los sistemas del Mapa Vivo. */
export function detectRegionAt(pos, regions, distFn){
  if(!regions || !regions.length) return null;
  const inside = regions.find(r=> distFn(pos, r.bounds) <= r.bounds.radiusM);
  if(inside) return inside;
  let closest = regions[0], closestDist = Infinity;
  regions.forEach(r=>{
    const d = distFn(pos, r.bounds);
    if(d < closestDist){ closestDist = d; closest = r; }
  });
  return closest;
}

/* ============================================================
   GAME WORLD ADAPTER — Mapa Vivo, Capa 6: API interna hacia OpenStreetMap.

   Responsabilidad de este archivo: ser el ÚNICO punto de entrada que el resto del juego debería
   usar para preguntas sobre el mundo real. Compone, en orden:

     osmProvider (fetch)  →  osmFeatureNormalizer (OSM → GameFeature)  →  worldFeatureRepository
     (guardado)  ←→  osmMapCache (decide si hace falta volver a consultar)

   El resto del juego NUNCA debería importar osmProvider.js, osmFeatureNormalizer.js,
   worldFeatureRepository.js u osmMapCache.js directamente — solo este archivo. Eso es justo lo que
   pide la sección "API INTERNA" del pedido: main.js solo debería poder preguntar cosas como
   "¿qué tipo de zona es esta?" o "¿hay un parque cerca?", nunca hablar con Overpass directamente.

   Esta capa NO decide todavía qué aparece en el juego (ningún enemigo/NPC/recurso/evento la
   consulta hoy) — es solo la infraestructura, tal como pide el pedido ("No implementar todavía").
   ============================================================ */

import { fetchOsmFeatures } from "./osmProvider.js";
import { normalizeOsmElements } from "./osmFeatureNormalizer.js";
import { upsertFeatures, queryNearby, queryNearbyByType, hasNearbyType } from "./worldFeatureRepository.js";
import { shouldRequery, recordQuery } from "./osmMapCache.js";
import { GAME_FEATURE_TO_BIOME_HINT } from "../config/osm.js";

/** Punto de entrada para mantener el store al día. Se llama en cada movimiento del jugador (desde
 *  main.js), pero en la práctica casi siempre es un no-op: shouldRequery() decide si de verdad
 *  hace falta ir a buscar datos nuevos (jugador se alejó lo suficiente, o venció el TTL) — nunca
 *  consulta Overpass en cada llamada. Es asíncrona y nunca lanza: se puede invocar "fire and
 *  forget" sin bloquear el movimiento ni el resto del juego si Overpass no responde. */
export async function refreshWorldGeoData(pos, store, config, deps, distFn){
  if(!pos) return;
  if(!shouldRequery(store, pos, config, Date.now(), distFn)) return;
  recordQuery(store, pos, config.queryRadiusM, Date.now()); // se marca ANTES del fetch, para no
  // reintentar en loop si Overpass está caído — el próximo intento real llega recién cuando el
  // jugador se mueva requeryDistanceM de nuevo (ver osmMapCache.js).
  try{
    const elements = await fetchOsmFeatures(pos, config.queryRadiusM, config, deps);
    const features = normalizeOsmElements(elements);
    upsertFeatures(store, features);
  }catch(e){
    // nunca debería llegar acá (osmProvider ya atrapa sus propios errores), pero por las dudas:
    // un fallo acá jamás debe afectar al resto del juego.
  }
}

/** ¿Qué tipo de zona es esta? — el GameFeature más cercano dentro del radio, o null si todavía no
 *  hay datos suficientes (por ejemplo, la primera consulta no terminó). */
export function getZoneType(pos, store, radiusM, distFn){
  const nearby = queryNearby(store, pos, radiusM, distFn);
  return nearby.length ? nearby[0].feature.type : null;
}

/** ¿Qué puntos de interés existen cerca? — lista completa dentro del radio, más cercano primero. */
export function getNearbyFeatures(pos, store, radiusM, distFn){
  return queryNearby(store, pos, radiusM, distFn).map(e=> ({ ...e.feature, distanceM: e.distanceM }));
}

/** ¿Hay un GameFeature de este tipo cerca? (parque, iglesia, zona industrial, centro comercial...) */
export function hasNearbyFeature(pos, store, gameFeatureKey, radiusM, distFn){
  return hasNearbyType(store, pos, radiusM, gameFeatureKey, distFn);
}

/** ¿Qué bioma corresponde? — sugerencia (débil, no vinculante) basada en el GameFeature real más
 *  cercano; null si no hay ninguno con sugerencia de bioma conocida dentro del radio. Pensado para
 *  que una capa futura la combine con la clasificación existente de ecosystemEngine.js (que no se
 *  tocó), nunca para reemplazarla por sí sola. */
export function getBiomeHint(pos, store, radiusM, distFn){
  const nearby = queryNearby(store, pos, radiusM, distFn);
  for(const entry of nearby){
    const hint = GAME_FEATURE_TO_BIOME_HINT[entry.feature.type];
    if(hint) return hint;
  }
  return null;
}

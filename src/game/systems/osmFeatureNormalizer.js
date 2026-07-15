/* ============================================================
   OSM FEATURE NORMALIZER — Mapa Vivo, Capa 6: normalización.

   Responsabilidad de este archivo: convertir un elemento crudo de Overpass/OSM en un WorldFeature
   (forma intermedia, todavía con contexto geográfico) y de ahí a un GameFeature (la única forma
   que el resto del juego debería conocer — nunca una etiqueta OSM directa).

   OSM  →  WorldFeature  →  GameFeature

   Mismo contrato que el resto del Mapa Vivo (dynamicWorld.js, ecosystemEngine.js, etc.): funciones
   puras, reciben todo por parámetro, nunca importan player/map/DOM. La única pieza que hace fetch
   de verdad es osmProvider.js — este archivo solo transforma datos que ya llegaron.
   ============================================================ */

import { GAME_FEATURE_KEYS, OSM_TAG_TO_GAME_FEATURE } from "../config/osm.js";

/** Dado el objeto `tags` crudo de un elemento Overpass ({natural:"wood", name:"..."}), busca la
 *  primera fila de OSM_TAG_TO_GAME_FEATURE cuyo key/value calce. Devuelve GAME_FEATURE_KEYS.OTHER
 *  si el elemento tiene tags pero ninguno reconocido (nunca null — todo elemento normalizado tiene
 *  SIEMPRE un GameFeature, aunque sea genérico). */
export function mapTagsToGameFeature(tags){
  if(!tags) return GAME_FEATURE_KEYS.OTHER;
  for(const rule of OSM_TAG_TO_GAME_FEATURE){
    if(tags[rule.key] === rule.value) return rule.feature;
  }
  return GAME_FEATURE_KEYS.OTHER;
}

/** El centro de un elemento Overpass: los nodos ya traen lat/lon directo; los way/relation piden
 *  `out center;` en la query (ver osmProvider.js), que agrega un campo `center:{lat,lon}` — nunca
 *  hace falta promediar geometría manualmente acá. */
function centerOf(el){
  if(el.type === "node" && typeof el.lat === "number") return { lat: el.lat, lng: el.lon };
  if(el.center && typeof el.center.lat === "number") return { lat: el.center.lat, lng: el.center.lon };
  return null;
}

/** Paso 1: OSM → WorldFeature. Forma intermedia que todavía puede llevar los tags crudos (útil
 *  para depurar o para reglas futuras más finas), pero que YA tiene posición resuelta y un id
 *  estable. Nada fuera de este archivo y osmProvider.js debería necesitar mirar `rawTags`. */
export function toWorldFeature(el){
  const pos = centerOf(el);
  if(!pos) return null;
  const tags = el.tags || {};
  return {
    osmId: `${el.type}/${el.id}`,
    lat: pos.lat,
    lng: pos.lng,
    name: tags.name || null,
    rawTags: tags,
  };
}

/** Paso 2: WorldFeature → GameFeature. Esta es la forma que de verdad debería viajar hacia
 *  cualquier consumidor del resto del juego (vía geoWorldAdapter.js) — sin `rawTags`. */
export function toGameFeature(worldFeature){
  if(!worldFeature) return null;
  return {
    id: worldFeature.osmId,
    type: mapTagsToGameFeature(worldFeature.rawTags),
    name: worldFeature.name,
    lat: worldFeature.lat,
    lng: worldFeature.lng,
  };
}

/** Conveniencia: normaliza una lista completa de elementos Overpass directo a GameFeature[],
 *  descartando los que no tienen posición resoluble. Esta es la función que en la práctica usa
 *  geoWorldAdapter.js después de cada consulta. */
export function normalizeOsmElements(elements){
  const out = [];
  (elements || []).forEach(el=>{
    const wf = toWorldFeature(el);
    if(!wf) return;
    const gf = toGameFeature(wf);
    if(gf) out.push(gf);
  });
  return out;
}

/* ============================================================
   WORLD FEATURE REPOSITORY — Mapa Vivo, Capa 6: almacenamiento en memoria.

   Responsabilidad de este archivo: guardar y consultar por cercanía los GameFeature ya
   normalizados. Solo memoria (mismo criterio que worldEventEnemyCache en main.js: nunca se guarda
   en saveGame(), se reconstruye solo a partir de nuevas consultas). Funciones puras: reciben el
   store y una función de distancia por parámetro, nunca importan player/map directamente.
   ============================================================ */

/** Agrega (o reemplaza, si ya existía el mismo id) una lista de GameFeature al store. */
export function upsertFeatures(store, features){
  (features || []).forEach(f=>{
    if(!f || !f.id) return;
    if(!store.byId[f.id]) store.features.push(f);
    else Object.assign(store.byId[f.id], f);
    store.byId[f.id] = store.byId[f.id] || f;
  });
}

function dist(a, b, distFn){
  return distFn ? distFn(a, b) : Math.hypot((a.lat - b.lat) * 111111, (a.lng - b.lng) * 111111);
}

/** Todos los GameFeature dentro de `radiusM` de `pos`, más cercano primero. */
export function queryNearby(store, pos, radiusM, distFn){
  return (store.features || [])
    .map(f=> ({ feature: f, distanceM: dist(pos, f, distFn) }))
    .filter(e=> e.distanceM <= radiusM)
    .sort((a,b)=> a.distanceM - b.distanceM);
}

/** Solo los de un tipo (GAME_FEATURE_KEYS.X) dentro del radio, más cercano primero. */
export function queryNearbyByType(store, pos, radiusM, gameFeatureKey, distFn){
  return queryNearby(store, pos, radiusM, distFn).filter(e=> e.feature.type === gameFeatureKey);
}

/** ¿Hay al menos uno de ese tipo cerca? Atajo booleano para la pregunta más común
 *  ("¿hay una iglesia/parque/zona industrial cerca?"). */
export function hasNearbyType(store, pos, radiusM, gameFeatureKey, distFn){
  return queryNearbyByType(store, pos, radiusM, gameFeatureKey, distFn).length > 0;
}

/** Vacía el store por completo (no usado hoy por nadie; queda disponible por si una capa futura
 *  necesita forzar una recarga completa, por ejemplo al cambiar de ciudad). */
export function clearAll(store){
  store.features = [];
  store.byId = {};
}

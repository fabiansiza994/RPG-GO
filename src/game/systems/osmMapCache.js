/* ============================================================
   MAP DATA CACHE — Mapa Vivo, Capa 6: cache de consultas OSM.

   Responsabilidad de este archivo: decidir, sin tocar red ni mapa, si hace falta volver a
   consultar Overpass o si el cache que ya se tiene (para la posición actual del jugador) todavía
   sirve. Nunca hace fetch — eso es trabajo exclusivo de osmProvider.js.

   El "store" que recibe cada función es un objeto plano que vive en memoria en main.js (mismo
   patrón que worldEventEnemyCache: no se persiste en saveGame(), se reconstruye solo — no hay
   nada acá que el jugador deba conservar entre sesiones, es puramente una optimización de red).
   Forma esperada de `store.meta`: { lastQueryPos:{lat,lng}|null, lastQueryRadiusM:number,
   lastQueryAt:number }.
   ============================================================ */

/** Distancia default (Haversine aproximada) para poder usar este módulo aislado sin depender de
 *  la función de distancia real del juego — main.js siempre debería pasar la suya (distMeters). */
function defaultDist(a, b){
  const dLat = (a.lat - b.lat) * 111111;
  const dLng = (a.lng - b.lng) * 111111 * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/** Crea un store vacío con la forma correcta — llamar una sola vez en main.js al iniciar. */
export function createOsmStore(){
  return {
    features: [],           // GameFeature[] acumulados de todas las consultas vigentes
    byId: {},                // dedupe por id (osmId)
    meta: { lastQueryPos: null, lastQueryRadiusM: 0, lastQueryAt: 0 },
  };
}

/** ¿Hace falta consultar Overpass otra vez? Sí si: nunca se consultó antes, si el jugador se alejó
 *  más de `config.requeryDistanceM` del último punto consultado, o si pasó más de
 *  `config.cacheTtlMs` desde la última consulta (aunque no se haya movido — el mundo real puede
 *  cambiar, aunque rara vez). Nunca dispara una consulta solo porque el jugador se movió un par de
 *  metros dentro de la misma zona ya cacheada. */
export function shouldRequery(store, pos, config, now, distFn){
  distFn = distFn || defaultDist;
  now = now == null ? Date.now() : now;
  const meta = (store && store.meta) || {};
  if(!meta.lastQueryPos) return true;
  const movedM = distFn(pos, meta.lastQueryPos);
  if(movedM > config.requeryDistanceM) return true;
  if(now - (meta.lastQueryAt || 0) > config.cacheTtlMs) return true;
  return false;
}

/** Marca que se acaba de consultar (o intentar consultar) para esta posición/radio — se llama
 *  tanto si la consulta tuvo éxito como si falló (para no reintentar en loop contra un servicio
 *  caído; el próximo intento real llega cuando el jugador se mueva `requeryDistanceM` de nuevo). */
export function recordQuery(store, pos, radiusM, now){
  store.meta.lastQueryPos = { lat: pos.lat, lng: pos.lng };
  store.meta.lastQueryRadiusM = radiusM;
  store.meta.lastQueryAt = now == null ? Date.now() : now;
}

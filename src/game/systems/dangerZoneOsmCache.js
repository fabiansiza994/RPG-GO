/* ============================================================
   DANGER ZONE OSM CACHE — cache en IndexedDB de vías por celda geográfica.

   Responsabilidad de este archivo: decidir, sin tocar red, si ya hay vías guardadas para la celda
   de cuadrícula de un punto dado, y guardarlas cuando se consultan por primera vez. Nunca hace
   fetch — eso es trabajo exclusivo de osmProvider.js (fetchOsmWays), llamado desde
   dangerZonePolygonizer.js.

   Por qué IndexedDB y no localStorage (que ya usa el resto del juego vía AppStorage, ver main.js):
   localStorage tiene un límite práctico de unos 5-10MB compartido con TODO lo demás que guarda el
   juego (inventario, progreso, etc.) y es síncrono (bloquea el hilo principal) — la geometría de
   vías de varias manzanas puede pesar bastante más que una fila de guardado normal. IndexedDB es
   asíncrono, tiene cuota propia (mucho más alta) y es exactamente para este tipo de dato: bloques
   más grandes, consultados por clave, no todo el tiempo.

   Nunca lanza: si IndexedDB no está disponible (navegación privada en algunos navegadores, cuota
   llena, etc.), get/set devuelven null / no hacen nada — el juego sigue funcionando exactamente
   igual que sin cache, solo consultando Overpass más seguido (mismo criterio que el resto del Mapa
   Vivo: un dato "de más" nunca puede romper nada).
   ============================================================ */

const DB_NAME = "rpggo-danger-zones";
const DB_VERSION = 1;
const STORE_NAME = "waysByCell";

/** Clave de celda de cuadrícula para `point` — cuadrícula de `cellSizeM` metros, alineada a un
 *  origen fijo (no depende de la ciudad) para que la misma esquina real siempre caiga en la misma
 *  celda sin importar desde qué región del mundo se generó la zona. Distorsión menor lejos del
 *  ecuador (el ancho real de una celda en longitud varía con la latitud) — aceptable, esto es solo
 *  una clave de cache, no una medición. */
export function cellKeyFor(point, cellSizeM){
  const cellDegLat = cellSizeM / 111111;
  const cellDegLng = cellSizeM / (111111 * Math.cos(point.lat * Math.PI/180));
  const cellY = Math.floor(point.lat / cellDegLat);
  const cellX = Math.floor(point.lng / cellDegLng);
  return `${cellX}_${cellY}`;
}

function openDb(idbImpl){
  return new Promise((resolve, reject)=>{
    if(!idbImpl){ reject(new Error("IndexedDB no disponible")); return; }
    const req = idbImpl.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = ()=>{
      const db = req.result;
      if(!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "cellKey" });
    };
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error || new Error("No se pudo abrir la base de datos de cache"));
  });
}

function idbImplFrom(deps){
  return (deps && deps.indexedDBImpl) || (typeof indexedDB !== "undefined" ? indexedDB : null);
}

/** Vías cacheadas para la celda de `point`, o `null` si no hay nada vigente (nunca se consultó,
 *  venció el TTL, o IndexedDB falló por cualquier motivo). */
export async function getCachedWays(point, config, deps){
  try{
    const db = await openDb(idbImplFrom(deps));
    const cellKey = cellKeyFor(point, config.cacheGridCellM);
    const record = await new Promise((resolve, reject)=>{
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(cellKey);
      req.onsuccess = ()=> resolve(req.result || null);
      req.onerror = ()=> reject(req.error);
    });
    db.close();
    if(!record) return null;
    if(Date.now() - record.fetchedAt > config.cacheTtlMs) return null;
    return record.elements;
  }catch(e){
    return null; // sin cache disponible — el llamador consulta Overpass como si no existiera esta capa
  }
}

/** Guarda `elements` para la celda de `point`. Nunca lanza — un fallo acá (cuota llena, etc.)
 *  simplemente deja de cachear, no afecta la generación de la zona que ya se resolvió con estos
 *  mismos `elements` en memoria. */
export async function setCachedWays(point, config, elements, deps){
  try{
    const db = await openDb(idbImplFrom(deps));
    const cellKey = cellKeyFor(point, config.cacheGridCellM);
    await new Promise((resolve, reject)=>{
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put({ cellKey, fetchedAt: Date.now(), elements });
      tx.oncomplete = ()=> resolve();
      tx.onerror = ()=> reject(tx.error);
    });
    db.close();
  }catch(e){
    // sin cache disponible — no-op, ver comentario de arriba
  }
}

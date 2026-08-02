/* ============================================================
   CACHE COMPARTIDA ENTRE JUGADORES — Mapa Vivo, Capa 6b.

   Antes de gastar una consulta real a Overpass (osmProvider.js), pregunta primero a un Worker
   propio (world-cache-worker, repo aparte, ver src/game/config/worldCache.config.js) si algún
   OTRO jugador que pasó por esta misma zona ya la consultó recientemente — si sí, se reusan esos
   mismos `elements` crudos que devolvería Overpass y se ahorra la consulta. Si no, geoWorldAdapter
   consulta Overpass como siempre y sube el resultado acá para el próximo jugador que pase cerca.

   Nunca bloquea ni rompe nada: cualquier fallo (Worker caído, sin red, respuesta inválida, JSON
   corrupto) hace que esta capa se comporte como si no existiera — osmProvider.js/Overpass sigue
   siendo la fuente de verdad cuando esto falla. La clave de cada "celda" es una grilla aproximada
   de ~550m (WORLD_CACHE_CELL_DEG), no coordenadas exactas — así consultas cercanas entre sí (mismo
   barrio) comparten la misma entrada en vez de necesitar un pedido por cada metro caminado.
   ============================================================ */

import { WORLD_CACHE_CONFIG } from "../config/worldCache.config.js";

const WORLD_CACHE_CELL_DEG = 0.005; // ~550m por celda a la altura del ecuador — no hace falta más precisión

function cellKeyFor(pos){
  const cellLat = Math.round(pos.lat / WORLD_CACHE_CELL_DEG);
  const cellLng = Math.round(pos.lng / WORLD_CACHE_CELL_DEG);
  return `osm_${cellLat}_${cellLng}`;
}

function fetchWithTimeout(fetchImpl, url, opts, timeoutMs){
  const controller = (typeof AbortController !== "undefined") ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(()=> controller.abort(), timeoutMs) : null;
  return fetchImpl(url, { ...opts, signal: controller ? controller.signal : undefined })
    .finally(()=>{ if(timeoutId) clearTimeout(timeoutId); });
}

/** Devuelve los `elements` crudos de Overpass ya guardados por otro jugador para esta celda, o
 *  `null` si no hay nada todavía, están viejos (más de WORLD_CACHE_CONFIG.maxAgeMs), o algo falló
 *  (Worker caído, sin red, 404, JSON inválido) — en todos los casos de `null` el llamador debe
 *  seguir con Overpass como si esta capa no existiera. Nunca lanza. */
export async function getSharedOsmCache(pos, deps){
  if(!WORLD_CACHE_CONFIG.baseUrl) return null;
  const fetchImpl = (deps && deps.fetchImpl) || (typeof fetch !== "undefined" ? fetch : null);
  if(!fetchImpl) return null;
  try{
    const key = cellKeyFor(pos);
    const res = await fetchWithTimeout(fetchImpl, `${WORLD_CACHE_CONFIG.baseUrl}/world/${key}`, {}, WORLD_CACHE_CONFIG.requestTimeoutMs);
    if(!res.ok) return null; // 404 (nadie la generó todavía) u otro error — a Overpass como siempre
    const record = await res.json();
    if(!record || typeof record.savedAt !== "number" || !Array.isArray(record.data)) return null;
    if(Date.now() - record.savedAt > WORLD_CACHE_CONFIG.maxAgeMs) return null; // muy vieja, mejor refrescarla
    return record.data;
  }catch(e){
    return null;
  }
}

/** Sube los `elements` crudos recién obtenidos de Overpass para que el próximo jugador cerca de
 *  esta celda no tenga que volver a consultar — "fire and forget": nunca se espera ni se propaga
 *  su resultado/error hacia el llamador (Overpass ya se consultó de verdad, esto es pura cortesía
 *  hacia el futuro). Nunca lanza. */
export function putSharedOsmCache(pos, elements, deps){
  if(!WORLD_CACHE_CONFIG.baseUrl || !WORLD_CACHE_CONFIG.apiKey) return;
  const fetchImpl = (deps && deps.fetchImpl) || (typeof fetch !== "undefined" ? fetch : null);
  if(!fetchImpl) return;
  const key = cellKeyFor(pos);
  fetchWithTimeout(fetchImpl, `${WORLD_CACHE_CONFIG.baseUrl}/world/${key}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${WORLD_CACHE_CONFIG.apiKey}` },
    body: JSON.stringify(elements),
  }, WORLD_CACHE_CONFIG.requestTimeoutMs).catch(()=>{});
}

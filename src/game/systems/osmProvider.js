/* ============================================================
   OPENSTREETMAP PROVIDER — Mapa Vivo, Capa 6: única pieza que habla con Overpass.

   Responsabilidad de este archivo: construir la consulta Overpass QL y hacer el fetch real. Es la
   ÚNICA pieza de todo el Mapa Vivo que toca la red — por diseño, para que el resto del juego (y el
   resto de esta misma capa: cache, repositorio, normalizador) nunca necesite saber que existe
   OpenStreetMap. Nadie fuera de geoWorldAdapter.js debería importar este archivo.

   ------------------------------------------------------------
   POR QUÉ OVERPASS API (y no tiles vectoriales / descarga por ciudad / un backend propio)
   ------------------------------------------------------------
   El proyecto se despliega como sitio estático (Cloudflare Pages, ver docs/PROJECT_CONTEXT.md) sin
   backend propio, así que cualquier estrategia que necesite pre-procesar u hostear datos de OSM
   (extraer .pbf, generar tiles vectoriales enriquecidos propios, mantener una base de datos
   espacial) implicaría infraestructura nueva que este proyecto no tiene ni necesita para lo que se
   pide: no hace falta el mapa completo de una ciudad, solo "qué hay cerca del jugador ahora".
   Overpass API permite pedir exactamente eso — una consulta por posición+radio, en JSON, sin
   backend propio — a cambio de límites de uso públicos (por eso la Capa de Cache de
   osmMapCache.js es obligatoria: nunca se debe consultar en cada movimiento, solo cuando el
   jugador se alejó lo suficiente del último punto consultado o venció el TTL). Se usan dos
   endpoints públicos como espejos (overpass-api.de primero, overpass.kumi.systems de respaldo) para
   tolerar caídas o rate-limit puntual de uno solo, y un timeout corto para nunca bloquear el
   movimiento del jugador si Overpass no responde.
   ============================================================ */

import { OSM_QUERY_TAG_KEYS } from "../config/osm.js";

/** Arma la consulta Overpass QL: para cada tag key relevante (natural, landuse, leisure, amenity,
 *  shop, tourism, historic, man_made, railway, highway, waterway, place, bridge), pide nodos/ways
 *  con ESE key presente dentro de un círculo (radio en metros) alrededor de `pos`. `out center;`
 *  hace que Overpass devuelva un centro ya calculado para ways/relations, así el normalizador
 *  nunca tiene que promediar geometría manualmente. */
export function buildOverpassQuery(pos, radiusM){
  const around = `around:${radiusM},${pos.lat},${pos.lng}`;
  const clauses = OSM_QUERY_TAG_KEYS.map(key=> `  node["${key}"](${around});\n  way["${key}"](${around});`).join("\n");
  return `[out:json][timeout:25];\n(\n${clauses}\n);\nout center;`;
}

/** Hace el fetch real contra Overpass, con timeout y fallback entre endpoints. Nunca lanza — si
 *  todos los endpoints fallan (sin internet, rate-limit, timeout), devuelve `[]` silenciosamente y
 *  el juego sigue funcionando exactamente igual que antes de esta capa (mismo criterio que
 *  fetchWeatherForLocation en main.js: un dato "de más" nunca puede bloquear ni romper el juego).
 *  `deps.fetchImpl` se recibe por parámetro (normalmente el `fetch` global del navegador) para que
 *  este módulo también pueda probarse o simularse sin red real. */
export async function fetchOsmFeatures(pos, radiusM, config, deps){
  const fetchImpl = (deps && deps.fetchImpl) || (typeof fetch !== "undefined" ? fetch : null);
  if(!fetchImpl) return [];
  const query = buildOverpassQuery(pos, radiusM);
  for(const endpoint of config.overpassEndpoints){
    try{
      const controller = (typeof AbortController !== "undefined") ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(()=> controller.abort(), config.requestTimeoutMs) : null;
      const res = await fetchImpl(endpoint, {
        method: "POST",
        body: "data=" + encodeURIComponent(query),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: controller ? controller.signal : undefined,
      });
      if(timeoutId) clearTimeout(timeoutId);
      if(!res.ok) continue; // probar el siguiente espejo
      const data = await res.json();
      const elements = Array.isArray(data.elements) ? data.elements : [];
      return elements.slice(0, config.maxElements);
    }catch(e){
      // este endpoint falló (rate-limit, timeout, sin internet) — probar el siguiente espejo;
      // si era el último, el bucle termina solo y la función cae al `return []` de abajo.
    }
  }
  return []; // ningún endpoint respondió — el juego sigue igual que antes de esta capa
}

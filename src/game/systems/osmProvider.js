/* ============================================================
   OPENSTREETMAP PROVIDER — Mapa Vivo, Capa 6: única pieza que habla con Overpass.

   Responsabilidad de este archivo: construir la consulta Overpass QL y hacer el fetch real. Es la
   ÚNICA pieza de todo el Mapa Vivo que toca la red — por diseño, para que el resto del juego (y el
   resto de esta misma capa: cache, repositorio, normalizador) nunca necesite saber que existe
   OpenStreetMap. Nadie fuera de geoWorldAdapter.js debería importar este archivo para la consulta
   de Puntos de Interés (`fetchOsmFeatures`/`buildOverpassQuery`, out center;).

   `fetchOsmWays` (más abajo) es la excepción documentada: la generación de zonas peligrosas por
   manzanas reales (../systems/dangerZonePolygonizer.js) necesita la GEOMETRÍA completa de las vías
   (out geom;), no solo su centro — una consulta distinta a la de POIs, pero el mismo servicio
   (Overpass) y la misma necesidad de resiliencia ante red, así que vive acá en vez de duplicar el
   patrón de reintentos/espejos/timeout en un archivo aparte. dangerZonePolygonizer.js es el único
   otro módulo autorizado a importar de este archivo.

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

/* ------------------------------------------------------------
   VÍAS CON GEOMETRÍA COMPLETA — para dangerZonePolygonizer.js (zonas peligrosas por manzanas).
   ------------------------------------------------------------ */

/** Arma la consulta Overpass QL para vías (`way["highway"]`) dentro de un círculo alrededor de
 *  `pos`, filtrando ya del lado del servidor por los valores de `highway` que sirven para delimitar
 *  una manzana (`eligibleHighwayValues` — ver DANGER_ZONE_ELIGIBLE_HIGHWAY en
 *  ../config/dangerZones.js). `out geom;` devuelve, para cada way, su lista completa de nodos con
 *  lat/lon embebidos (`geometry:[{lat,lon},...]`) — así no hace falta una segunda consulta para
 *  resolver los nodos por separado, y `out tags` (implícito en `out geom` sin modificador `skel`)
 *  incluye bridge/tunnel/layer, necesarios para no unir vías que en realidad pasan una sobre otra. */
export function buildOverpassWaysQuery(pos, radiusM, eligibleHighwayValues){
  const around = `around:${radiusM},${pos.lat},${pos.lng}`;
  const valuesPattern = Array.from(eligibleHighwayValues).join("|");
  return `[out:json][timeout:20];\nway["highway"~"^(${valuesPattern})$"](${around});\nout geom;`;
}

/** Como fetchOsmFeatures, pero para vías con geometría completa: mismo patrón de resiliencia
 *  (varios espejos, timeout por intento, nunca lanza — un fallo total devuelve `[]`), ADEMÁS de
 *  `config.maxRetries` reintentos con backoff creciente sobre el conjunto completo de espejos (la
 *  generación de zonas peligrosas es más tolerante a esperar un par de segundos más que el resto
 *  del Mapa Vivo, ya que solo pasa una vez por región/día, no en cada movimiento).
 *  `deps.signal` (opcional): AbortSignal externo — si se activa entre reintentos, esta función
 *  corta y devuelve `[]` de inmediato (permite cancelar una consulta vieja cuando el jugador ya
 *  cambió de ciudad o se volvió a sortear el día antes de que la anterior terminara). */
export async function fetchOsmWays(pos, radiusM, eligibleHighwayValues, config, deps){
  const fetchImpl = (deps && deps.fetchImpl) || (typeof fetch !== "undefined" ? fetch : null);
  if(!fetchImpl) return [];
  const externalSignal = deps && deps.signal;
  const query = buildOverpassWaysQuery(pos, radiusM, eligibleHighwayValues);
  const maxRetries = Math.max(0, config.maxRetries || 0);
  let backoff = config.retryBackoffMs || 1000;
  for(let attempt = 0; attempt <= maxRetries; attempt++){
    if(externalSignal && externalSignal.aborted) return [];
    for(const endpoint of config.overpassEndpoints){
      if(externalSignal && externalSignal.aborted) return [];
      try{
        const controller = (typeof AbortController !== "undefined") ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(()=> controller.abort(), config.requestTimeoutMs) : null;
        const onExternalAbort = ()=> controller && controller.abort();
        if(externalSignal && controller) externalSignal.addEventListener("abort", onExternalAbort);
        let res;
        try{
          res = await fetchImpl(endpoint, {
            method: "POST",
            body: "data=" + encodeURIComponent(query),
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            signal: controller ? controller.signal : undefined,
          });
        } finally {
          if(timeoutId) clearTimeout(timeoutId);
          if(externalSignal && controller) externalSignal.removeEventListener("abort", onExternalAbort);
        }
        if(!res.ok) continue; // probar el siguiente espejo
        const data = await res.json();
        return Array.isArray(data.elements) ? data.elements : [];
      }catch(e){
        // este espejo falló (rate-limit, timeout, sin internet, abortado) — probar el siguiente;
        // si era el último de este intento, el bucle externo decide si reintentar.
      }
    }
    if(attempt < maxRetries){
      await new Promise(r=> setTimeout(r, backoff));
      backoff *= 2;
    }
  }
  return []; // ningún espejo respondió tras agotar los reintentos — el llamador cae a su fallback
}

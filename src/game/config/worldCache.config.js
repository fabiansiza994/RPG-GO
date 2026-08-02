/* ============================================================
   CONFIG DE LA CACHE COMPARTIDA DE MAPA VIVO (world-cache-worker, repo aparte, desplegado a
   Cloudflare Workers — ver ese repo para redesplegar o rotar la clave si hiciera falta).

   Antes de gastar una consulta real a Overpass (ver osmSharedCache.js/geoWorldAdapter.js), el
   juego le pregunta primero a este Worker si algún otro jugador ya consultó la misma zona
   recientemente. `apiKey` viaja dentro del bundle del cliente (visible con las devtools) — alcanza
   para frenar abuso al azar de internet, no a alguien que se tome el trabajo de mirar el bundle;
   ver la nota de seguridad en world-cache-worker/README.md.
   ============================================================ */
export const WORLD_CACHE_CONFIG = {
  baseUrl: "https://world-cache-worker.fabiansiza994.workers.dev",
  apiKey: "vYsPxZ21Xrr5SXpk4rqfNQPfhFHkRyfeomsrfzoePg",
  maxAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 días — el mundo real (parques, calles) no cambia tan seguido
  requestTimeoutMs: 6000,
};

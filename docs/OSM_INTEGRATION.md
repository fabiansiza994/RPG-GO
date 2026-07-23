# Mapa Vivo — Capa 6: Integración con OpenStreetMap

Estado: **implementada** (infraestructura). Ninguna capa de gameplay (spawns, NPCs, regiones,
eventos, combate, economía, inventario, recursos) se modificó ni consume esta capa todavía — eso
es intencional, tal como se pidió. Esta capa solo deja lista una fuente de información geográfica
real y confiable para que las próximas tareas la conecten.

## 1) Objetivo

Reemplazar, a futuro, las reglas manuales de clasificación de zonas (nombre de zona, hardcodeo por
ciudad) por información real de OpenStreetMap, sin que el resto del juego llegue a conocer nunca
una etiqueta OSM directamente.

## 2) Por qué Overpass API (justificación de la decisión)

Alternativas evaluadas: Overpass API, datos vectoriales OSM propios, tiles enriquecidos propios,
descarga por ciudad/país, un backend propio con base de datos espacial.

El proyecto se despliega como sitio **estático** (Cloudflare Pages, sin backend propio — ver
`PROJECT_CONTEXT.md §2`). Cualquier alternativa que requiera pre-procesar `.pbf`, generar tiles
vectoriales propios o mantener una base de datos espacial implica infraestructura nueva que no
existe hoy y que no hace falta para lo que se pide: el juego solo necesita saber "qué hay cerca del
jugador ahora", no el mapa completo de una ciudad.

**Overpass API** permite pedir exactamente eso: una consulta por posición + radio, devuelta en
JSON, sin backend propio. El costo es que es un servicio público con límites de uso — por eso el
cache (§4) es una pieza obligatoria del diseño, no un detalle opcional: nunca se consulta en cada
movimiento, solo cuando el jugador se alejó lo suficiente del último punto consultado o venció el
tiempo de expiración. Se usan dos endpoints públicos como espejos (`overpass-api.de` primero,
`overpass.kumi.systems` de respaldo) para tolerar una caída o un rate-limit puntual de uno solo.

## 3) Arquitectura (desacoplada, config + systems + integración liviana en main.js)

```text
osmProvider.js           (fetch real a Overpass — la ÚNICA pieza que toca la red)
     ↓ elementos crudos
osmFeatureNormalizer.js  (OSM → WorldFeature → GameFeature — funciones puras)
     ↓ GameFeature[]
worldFeatureRepository.js (guardado en memoria + consultas por cercanía — funciones puras)
     ↕
osmMapCache.js           (decide si hace falta volver a consultar — funciones puras)
     ↓
geoWorldAdapter.js       (API interna única — compone todo lo anterior)
     ↓
main.js                  (integración liviana: refresca el store al moverse, nada más)
```

- `src/game/config/osm.js`: SOLO datos — `GAME_FEATURE_KEYS`, `OSM_TAG_TO_GAME_FEATURE` (tabla de
  normalización configurable), `OSM_QUERY_CONFIG` (endpoints, radio, cache, timeout).
- `src/game/systems/osmProvider.js`: construye la consulta Overpass QL y hace el fetch. Nunca lanza
  — si todos los endpoints fallan, devuelve `[]` y el juego sigue igual que antes de esta capa.
- `src/game/systems/osmFeatureNormalizer.js`: OSM → `WorldFeature` (forma intermedia con posición
  resuelta) → `GameFeature` (la única forma que debería viajar hacia el resto del juego).
- `src/game/systems/worldFeatureRepository.js`: guarda `GameFeature[]` en memoria y responde
  consultas por cercanía (`queryNearby`, `queryNearbyByType`, `hasNearbyType`).
- `src/game/systems/osmMapCache.js`: dado el store y la posición actual, decide si hace falta
  volver a consultar (nunca por moverse unos metros dentro de la misma zona ya cacheada).
- `src/game/systems/geoWorldAdapter.js`: el ÚNICO punto de entrada que el resto del juego debería
  usar. Nadie más debería importar los cuatro archivos de arriba directamente.

Mismo contrato que el resto del Mapa Vivo (`AI_RULES.md §3`): todo en `systems/` es lógica pura,
recibe todo por parámetro (posición, store, función de distancia), nunca importa `player`/`map`
directamente. La única excepción necesaria es `osmProvider.js`, que sí hace una llamada de red real
— por eso queda aislado en un único archivo, igual que `fetchWeatherForLocation` en `main.js` ya
hace una llamada real a otra API pública (`open-meteo.com`) con el mismo criterio de "nunca
bloquear, nunca romper el juego si falla".

## 4) Cache — nunca se consulta continuamente

`osmWorldStore` vive **solo en memoria** en `main.js` (mismo criterio que `worldEventEnemyCache`:
nunca se guarda en `saveGame()`, no es estado de partida, es una optimización de red que se
reconstruye sola). Se actualiza en `initMap()` (primera posición) y en cada `movePlayerTo()`, pero
en la práctica casi siempre es un no-op: `shouldRequery()` solo dispara una consulta real si:

- nunca se consultó antes, o
- el jugador se alejó más de `OSM_QUERY_CONFIG.requeryDistanceM` (250 m) del último punto
  consultado, o
- pasaron más de `OSM_QUERY_CONFIG.cacheTtlMs` (20 min) desde la última consulta.

Nunca se descarga una ciudad ni un país completos — cada consulta pide solo un círculo de
`OSM_QUERY_CONFIG.queryRadiusM` (500 m, configurable) alrededor del jugador.

## 5) Normalización — el resto del juego nunca ve una etiqueta OSM

```
OSM              (natural=wood, amenity=place_of_worship, shop=mall, ...)
  ↓
WorldFeature     (posición resuelta + tags crudos — solo para uso interno del normalizador)
  ↓
GameFeature      (FOREST_AREA, SANCTUARY_LOCATION, MARKET_LOCATION, ... — esto es lo único
                  que geoWorldAdapter.js expone hacia afuera)
```

La tabla `OSM_TAG_TO_GAME_FEATURE` (en `config/osm.js`) cubre hoy: parques, bosques, lagos, ríos,
centros comerciales, plazas, monumentos, iglesias/templos, estadios, hospitales, zonas
industriales, universidades, puentes, estaciones, parqueaderos, senderos, cementerios, playas,
montañas y miradores — y cualquier elemento con un tag no reconocido cae en `OTHER` (nunca `null`:
todo elemento normalizado tiene siempre un GameFeature). Agregar un tipo de lugar nuevo es una fila
más en esa tabla — nunca lógica nueva en el normalizador.

## 6) API interna (lo único que el resto del juego debería usar)

Expuesta por `geoWorldAdapter.js` y ya conectada en `main.js` (funciones `queryRealWorldZoneType`,
`queryRealWorldNearbyFeatures`, `hasNearbyRealWorldFeature`, `queryRealWorldBiomeHint`) — ninguna
consumida todavía por gameplay real, a propósito:

- **¿Qué tipo de zona es esta?** → `getZoneType(pos, store, radiusM, distFn)`
- **¿Qué puntos de interés existen cerca?** → `getNearbyFeatures(pos, store, radiusM, distFn)`
- **¿Hay un parque/iglesia/zona industrial/centro comercial cerca?** →
  `hasNearbyFeature(pos, store, GAME_FEATURE_KEYS.X, radiusM, distFn)`
- **¿Qué bioma corresponde?** → `getBiomeHint(pos, store, radiusM, distFn)` (sugerencia débil, no
  vinculante, pensada para combinarse con `ecosystemEngine.js` a futuro — ese archivo no se tocó)

## 7) Integración futura (preparada, no implementada)

La tabla `GAME_FEATURE_TO_BIOME_HINT` en `config/osm.js` ya conecta cada `GameFeature` con un
bioma existente de `biomes.js` (sin modificar ese archivo) para cuando una tarea futura decida
usar esta señal real en vez de (o junto a) la clasificación por nombre de zona. Ninguna regla de
"parque → bosque → lobos → árboles" ni similar se implementó todavía — eso queda para las próximas
capas, tal como pide el pedido original.

## 8) Qué NO cambia con esta capa

- Ningún enemigo, NPC, recurso, evento o región nuevos.
- Ninguna regla de combate, economía o inventario.
- Ninguna capa anterior del Mapa Vivo (`biomes.js`, `ecosystemEngine.js`, `visibility.js`,
  `visibilityEngine.js`, `regions.js`, `regionManager.js`, `dynamicWorld.js`, `randomEvents.js`,
  `world.js`) fue modificada.

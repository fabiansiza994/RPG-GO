# ARCHITECTURE

## 1) Estructura actual (simplificada)

```text
rpg-go/
├─ index.html
├─ package.json
├─ vite.config.js
├─ public/
│  ├─ maplibre-leaflet-shim.js   (traductor Leaflet -> MapLibre, ver ARCHITECTURE §2)
│  ├─ maplibre-gl.js / .css      (MapLibre empaquetado localmente, sin depender de un CDN)
│  ├─ map-base-style.json        (estilo vectorial del mapa, OpenFreeMap)
│  └─ assets/
│     └─ sprites/
│        ├─ class-battle/
│        ├─ class-walk/
│        ├─ demonio-menor/
│        ├─ dragon-menor/
│        ├─ golem-roca/
│        ├─ lobo-umbrio/
│        ├─ lobo-sombrio/        (jefe especial nocturno — base/ataque/esquiva/carga/especial)
│        ├─ misc/
│        └─ thief/
└─ src/
   ├─ main.js                    (orquestador principal — ver §3)
   ├─ styles/
   │  └─ main.css
   └─ game/
      ├─ assets/
      │  └─ spriteRegistry.js
      ├─ config/
      │  ├─ classes.js
      │  ├─ world.js       (CITY_REGISTRY: neiva/bogota/itagui/quito/caracas/pitalito, SHRINE_TYPES,
      │  │                   POI_TYPES + getCityPOIs() — Capa 1 del Mapa Vivo)
      │  ├─ enemies.js     (incluye LOBO_SOMBRIO_TEMPLATE)
      │  ├─ items.js       (incluye ROTATING_WEAPON_POOL con procs de estado)
      │  ├─ progression.js
      │  ├─ pets.js
      │  ├─ multiplayer.js
      │  ├─ biomes.js      (Mapa Vivo, Capa 4 — biomas y sus reglas de contenido)
      │  ├─ visibility.js  (Mapa Vivo, Capa 5 — prioridades y distancias de renderizado)
      │  ├─ regions.js     (Mapa Vivo, Capa 5b — nombres/íconos/jefe por bioma)
      │  ├─ osm.js         (Mapa Vivo, Capa 6 — GameFeature, tabla OSM→GameFeature, config de consulta/cache)
      │  ├─ combatPower.js       (Capa 7 — pesos del cálculo de Combat Power)
      │  └─ difficultyProfiles.js (Capa 7 — variantes de dificultad, multiplicador de recompensa, CP recomendado por región)
      ├─ scenes/      (vacío, sin usar todavía)
      └─ systems/
         ├─ dynamicWorld.js     (Mapa Vivo, Capa 2 — entidades temporales, Mercader Ambulante)
         ├─ randomEvents.js     (Mapa Vivo, Capa 3 — Viajero Atacado / Cofre Custodiado / Emboscada)
         ├─ ecosystemEngine.js  (Mapa Vivo, Capa 4 — clasificación de bioma por posición)
         ├─ visibilityEngine.js (Mapa Vivo, Capa 5 — decide si algo debería renderizarse)
         ├─ regionManager.js    (Mapa Vivo, Capa 5b — construye/detecta regiones)
         ├─ osmProvider.js         (Mapa Vivo, Capa 6 — única pieza que hace fetch real a Overpass API)
         ├─ osmFeatureNormalizer.js (Mapa Vivo, Capa 6 — OSM → WorldFeature → GameFeature)
         ├─ worldFeatureRepository.js (Mapa Vivo, Capa 6 — guardado en memoria + consultas por cercanía)
         ├─ osmMapCache.js         (Mapa Vivo, Capa 6 — decide si hace falta volver a consultar)
         ├─ geoWorldAdapter.js     (Mapa Vivo, Capa 6 — API interna única hacia OpenStreetMap)
         ├─ combatPowerCalculator.js (Capa 7 — CP real del jugador)
         ├─ difficultyDirector.js    (Capa 7 — sortea variante de dificultad + CP objetivo)
         ├─ powerScaling.js          (Capa 7 — CP objetivo → nivel concreto de enemigo)
         ├─ enemyPowerGenerator.js   (Capa 7 — API interna única, compone las tres anteriores)
         └─ rewardDifficulty.js      (Capa 7 — multiplicador de recompensa por variante, arquitectura lista sin conectar)
```

## 2) Responsabilidad por módulo

### `index.html`
- Declara toda la estructura de overlays, HUD, botones y paneles.
- Carga (en este orden): `maplibre-gl.js` → `maplibre-leaflet-shim.js` → PubNub → `src/main.js`.

### `public/maplibre-leaflet-shim.js`
- **No es parte de `src/`** — es un script plano que Vite copia tal cual (los módulos empaquetados no sirven aquí porque tiene que existir como `window.L` global antes de que `main.js` se ejecute).
- Implementa la porción de la API de Leaflet que el juego usa (`L.map`, `L.marker`, `L.divIcon`, `L.circle`, `L.polyline`, `L.DomEvent`) pero por debajo crea y controla un `maplibregl.Map` real.
- Traduce coordenadas `[lat,lng]` (como escribe el juego) a `[lng,lat]` (como espera MapLibre) en ambos sentidos.
- Expone extensiones propias de MapLibre que Leaflet no tiene: `map.getBearing()/setBearing()`, `map.getPitch()/setPitch()`, `map.project(latlng)`, `map.resetNorthPitch()`, `map.flyTo()` (transición animada), `marker.setDraggable()`, `marker.setClickHandler()`.
- `marker.getLatLng()` siempre devuelve `{lat,lng}` normalizado, sin importar si el marcador se creó con un array `[lat,lng]` o un objeto — antes devolvía el valor crudo tal cual se guardó, y cualquier código que asumiera la forma `{lat,lng}` sobre un marcador creado con array (como la confirmación de colocar la base) recibía `undefined` en silencio.
- Los círculos (`L.circle`) soportan `dashArray` para bordes con trazo entrecortado (usado por las zonas de ciudad).
- Encola las operaciones que dependen del estilo (círculos, líneas, mosaicos) hasta que el estilo del mapa termina de cargar (`_whenReady`), porque a diferencia de Leaflet, MapLibre carga su estilo de forma asíncrona.

### `src/main.js`
Orquestador principal de:
- estado global,
- render de UI,
- mapa/GPS/cámara (zoom, bearing, pitch),
- spawns (enemigos, recursos, cofres),
- combate (PvE/PvP/grupo) y su vínculo con el resto de sistemas (durabilidad, Eventos Aleatorios),
- quests,
- inventario/equipo/durabilidad/Forja,
- cofres, santuarios, bases personales/Edificio, cristales, pico de recolección,
- Modo Constructor (solo `Hacker994`),
- multiplayer,
- persistencia,
- **integración de las capas del Mapa Vivo** — importa y llama a las funciones puras de `game/systems/*`, pero la lógica de datos/reglas en sí vive ahí, no acá.

### `src/game/config/*.js`
- `classes.js`: clases, move pools y sistema de ultimates.
- `world.js`: `CITY_REGISTRY` (neiva/bogota/itagui/quito/caracas/pitalito) con sus zonas/parques/malls/campfires/towers/shrines/**coliseo**, `SHRINE_TYPES`, `DEFAULT_CITY_KEY`, y (Mapa Vivo Capa 1) `POI_TYPES` + `getCityPOIs(city)` — catálogo genérico de puntos de interés permanentes. Las torres ahora traen `landmark:true/false` (una por zona siempre visible, la otra solo por proximidad — ver `visibility.js`).
- `enemies.js`: templates de enemigos, jefes y loot temático, incluyendo `LOBO_SOMBRIO_TEMPLATE` (jefe especial Nv.50+).
- `items.js`: tablas de ítems/equipo/rareza/categorías de tienda; `ROTATING_WEAPON_POOL` incluye armas con trade-offs (bono grande + penalización) y procs de estado (quemado/envenenado/acelera).
- `progression.js`: medallas, quests, cooldowns y constantes de progresión.
- `pets.js`: perfiles por especie para balance de mascotas.
- `multiplayer.js`: constantes de canales/prefijos PubNub.
- `biomes.js` (Mapa Vivo, Capa 4): `BIOME_KEYS`, `BIOMES` (contenido apropiado por bioma), `OSM_TAG_TO_BIOME` (tabla de referencia para integración futura con OSM real), `ZONE_NAME_BIOME_HINTS` (regla de respaldo por nombre).
- `visibility.js` (Mapa Vivo, Capa 5): `VISIBILITY_PRIORITY`, `VISIBILITY_DISTANCES`, `ENTITY_VISIBILITY` (qué prioridad tiene cada tipo de entidad), `OSM_POI_TO_CONTENT_HINTS`.
- `regions.js` (Mapa Vivo, Capa 5b): `REGION_NAME_POOLS`, `REGION_PRESENTATION`, `REGION_LEVEL_RANGE`, `REGION_BOSS_BY_BIOME`, `REGION_DESCRIPTION_BY_BIOME`.
- `osm.js` (Mapa Vivo, Capa 6): `GAME_FEATURE_KEYS`, `OSM_TAG_TO_GAME_FEATURE` (tabla configurable de normalización), `OSM_QUERY_CONFIG` (endpoints Overpass, radio, cache, timeout), `GAME_FEATURE_TO_BIOME_HINT`. Ver `OSM_INTEGRATION.md` para el detalle completo.
- `combatPower.js` / `difficultyProfiles.js` (Capa 7, sistema de progresión — no es parte del Mapa Vivo): pesos del cálculo de Combat Power y variantes de dificultad (`DIFFICULTY_TIERS`, `REWARD_MULTIPLIER_BY_TIER`, `REGION_RECOMMENDED_CP`). Ver `COMBAT_POWER.md`.

### `src/game/systems/*.js` (Mapa Vivo — lógica pura y desacoplada)
Todos siguen el mismo contrato: reciben posiciones/listas/una función de distancia por parámetro, **nunca** importan `player`/`map`/DOM directamente. `main.js` es el único que los conecta con el juego real.

- `dynamicWorld.js` (Capa 2): `DYNAMIC_ENTITY_STATE`, `DYNAMIC_ENTITY_TYPES`, `buildCandidateLocations`, `pickValidCandidateLocation`, `createDynamicEntity`, `entityStateNow`, `formatEntityTimeLeft`, `buildTradeInventory`.
- `randomEvents.js` (Capa 3): `EVENT_STATE`, `EVENT_TYPES`, `EVENT_LIMITS`, `EVENT_REWARD_TABLES`, `rollEventReward`, `isEventLocationValid`, `createWorldEvent`, `eventStateNow`, `formatEventTimeLeft`.
- `ecosystemEngine.js` (Capa 4): `classifyBiomeFromOsmTags`, `classifyBiomeFromName`, `classifyBiomeForZone`, `classifyBiomeForPark`, `getBiomeAt`, `queryEcosystem`, `isAllowedInBiome`.
- `visibilityEngine.js` (Capa 5): `isEntityVisible`, `diffVisibility` (versión en lote: dado un grupo de entidades y cuáles ya están dibujadas, devuelve cuáles mostrar/ocultar).
- `regionManager.js` (Capa 5b): `buildRegionsForCity`, `detectRegionAt`.
- `osmProvider.js` (Capa 6 — única excepción con red real): `buildOverpassQuery`, `fetchOsmFeatures` (nunca lanza; devuelve `[]` si Overpass no responde).
- `osmFeatureNormalizer.js` (Capa 6): `mapTagsToGameFeature`, `toWorldFeature`, `toGameFeature`, `normalizeOsmElements`.
- `worldFeatureRepository.js` (Capa 6): `upsertFeatures`, `queryNearby`, `queryNearbyByType`, `hasNearbyType`, `clearAll`.
- `osmMapCache.js` (Capa 6): `createOsmStore`, `shouldRequery`, `recordQuery`.
- `geoWorldAdapter.js` (Capa 6 — API interna única): `refreshWorldGeoData`, `getZoneType`, `getNearbyFeatures`, `hasNearbyFeature`, `getBiomeHint`.
- `combatPowerCalculator.js` (Capa 7): `computeCombatPower` y sus piezas (`computeStatScore`, `computeEquipmentQualityScore`, `computePetPowerScore`, `computePassiveBonusScore`).
- `difficultyDirector.js` (Capa 7): `rollDifficultyTier`, `computeTargetCPRange`, `pickTargetCP`, `rollDifficulty`.
- `powerScaling.js` (Capa 7): `estimateMonsterStats`/`estimateMonsterCP` (espejo de solo lectura de la fórmula de `makeMonster()`), `findLevelForTargetCP`.
- `enemyPowerGenerator.js` (Capa 7 — API interna única): `generateEnemyChallenge`.
- `rewardDifficulty.js` (Capa 7): `getRewardMultiplier` (listo, no conectado a recompensas reales).

### `src/game/assets/spriteRegistry.js`
- Fuente única de rutas a sprites y sets visuales por entidad/clase, incluyendo `LOBO_SOMBRIO_SPRITES` (base/attack/dodge/charge/special).

## 3) Flujo de ejecución

1. `index.html` carga MapLibre + el shim + PubNub, y luego inicia `src/main.js`.
2. `main.js` importa config, assets registry, y los módulos de `game/systems/*`.
3. Se construye UI inicial (`buildClassGrid`, `initContinueScreen`).
4. Al iniciar/continuar personaje:
   - se reconstruye `player` (`rebuildPlayerFromSave` — lista explícita de campos, ver `AI_RULES.md §8`),
   - se activa `setupBuilderModeUI()` (muestra el botón de Modo Constructor solo si `player.name === "Hacker994"`),
   - se levanta `initMap` (crea el mapa, dibuja Prioridad 1 siempre — torres — y llama al Sistema de Visibilidad para Coliseo/santuarios/fogatas/Mercader/Eventos, dibuja zonas/parques, arranca los timers de spawn/cofres/recolección/eventos/región/guardado),
   - se activan loops (`spawn`, `regen`, `save`, timers de Mundo Dinámico y Eventos Aleatorios, contexto del HUD).
5. Dentro de `initMap`, `initMultiplayer()` inicializa PubNub y presencia periódica — **recién ahí** se llama `loadMapEdits()` y se redibujan las capas editables con `refreshMapEditableLayers()` (que también respeta el Sistema de Visibilidad, no redibuja todo incondicionalmente).
6. En cada `movePlayerTo` (el jugador se mueve, real o simulado): se revisan, en orden, proximidad de zona/parque/fogata/misión, descubrimiento de Eventos Aleatorios, visibilidad de Prioridad 2, y la región actual (banner si cambió de verdad de región).

## 4) Modelo de estado en memoria

Estados principales en `main.js`:
- `player`, `playerLatLng`, `savedMapZoom`.
- `monsters`, `activeQuest`, `chests`, `resourceNodes`.
- `battleState` (PvE — incluye `eventId` si la pelea viene de un Evento Aleatorio), `pvp`, `groupBattle`.
- `party`, `friends`, `livePresence`.
- `TOWERS`, `CAMPFIRES`, `SHRINES`, `UPGRADE_STATIONS`, `COLISEO` — generados por ciudad y luego modificados por `mapEdits` (Modo Constructor).
- `WORLD_POIS` — catálogo genérico Capa 1 (no reemplaza los arrays de arriba, es la misma info con forma unificada).
- `CURRENT_CITY_BIOMES`, `CURRENT_CITY_REGIONS`, `currentRegionId` — Capas 4/5b (clasificación y detección, no filtran spawns reales todavía salvo Regiones que sí muestra presentación).
- `player.dynamicEntities` (Mercader Ambulante y futuros NPCs — Capa 2), `player.worldEvents` (Eventos Aleatorios — Capa 3), persistidos con el resto de la partida.
- `playerBases`, `baseMarkers` — caché de bases de todos los jugadores conocidos.
- `mapEdits` — `{moved:{}, deleted:[], added:[]}`, el estado compartido del Modo Constructor.
- `worldEventEnemyCache` — caché **solo en memoria** para monstruos vivos asociados a Eventos Aleatorios (nunca se persiste directamente, para no arriesgar referencias circulares en el guardado — ver `AI_RULES.md §8`). Los enemigos de la emboscada al recolectar (`maybeGatherAmbush`) son distintos: son monstruos normales del mapa, con su propio marcador, no usan esta caché.

Son estados mutables globales coordinados por eventos UI y callbacks de red/mapa.

## 5) Persistencia

### Capa de storage
- Abstracción `AppStorage`:
  - usa `window.storage` si existe (solo dentro de Claude),
  - fallback a `localStorage` con prefijos `priv:` y `shared:` — **este fallback NO sincroniza entre navegadores/dispositivos distintos**.
- **Por eso**: todo lo que otros jugadores deban ver (torres, bases, Modo Constructor, presencia) usa PubNub, nunca `AppStorage`.

### Estrategia de guardado del jugador
- Guardado por slot de clase: `player_<classKey>`.
- `saveGame()`/`rebuildPlayerFromSave()` son **listas explícitas de campos** (no serialización automática) — cualquier campo nuevo en `player` debe agregarse en ambos lugares (ver `AI_RULES.md §8`).
- Incluye stats, inventario, equipo, mejoras y **durabilidad** (`equipmentDurability`/`inventoryDurability`, separada porque `freshCopy()` reconstruye objetos desde tablas fijas y no trae ese estado por instancia), misión activa, posición, zoom, cristales, materiales (madera/piedra/hierro), pico (`player.pickaxe`), base/Edificio propios (ubicación, cofre, temporizadores de construcción), entidades dinámicas (`player.dynamicEntities`) y Eventos Aleatorios (`player.worldEvents`), última región visitada (`player.lastRegionId`), y registro de loot de jefes generado dinámicamente.
- Autoguardado periódico y guardado en acciones críticas.
- Migración automática desde clave legacy `player`.

## 6) Multiplayer y canales

Conexión en PubNub (inicializada dentro de `initMultiplayer()`, ver §3):
- Presencia global: `PN_PRESENCE_CHANNEL`.
- Mensajería directa: `ronda-gps-rpg-chal-<playerId>`.
- Duelo PvP: `PN_BATTLE_PREFIX + battleId`.
- Grupo: `PN_PARTY_PREFIX + partyId`.
- Lookup por código de amigo y anuncios globales (`PN_LOOKUP_CHANNEL`, `PN_ANNOUNCE_CHANNEL`).
- Torres: `PN_TOWERS_CHANNEL` — quién tiene cada torre.
- Bases: `PN_BASES_CHANNEL` — ubicación de la base de cada jugador.
- Modo Constructor: `PN_MAP_EDITS_CHANNEL` — se publica el objeto `mapEdits` completo cada vez que `Hacker994` guarda un cambio; todos los demás jugadores están **suscritos en vivo** a este canal (no solo lo consultan una vez al cargar).

Nota: el Mundo Dinámico (Mercader Ambulante) y los Eventos Aleatorios son **locales a cada jugador** (como los monstruos y cofres) — no viajan por PubNub, cada jugador tiene su propia instancia.

## 7) Carga de assets

- Los archivos físicos viven en `public/assets/sprites/*`.
- `spriteRegistry.js` expone rutas normalizadas para enemigos especiales (incluye `LOBO_SOMBRIO_SPRITES`), mascotas, retratos por clase/género, walk sprites y battle sprites.

## 8) Limitaciones arquitectónicas actuales

- Alta concentración de lógica de integración en `main.js` (aunque las reglas/datos puros del Mapa Vivo ya viven aparte).
- Acoplamiento fuerte entre estado + render + reglas de juego + red dentro de `main.js`.
- Carpeta `scenes/` aún no utilizada.
- El proyecto depende de overlays en un HTML único (sin routing/componentización).
- El shim de Leaflet→MapLibre cubre solo los métodos que el juego usa hoy; cualquier llamada nueva a una API de Leaflet no traducida ahí fallará en silencio o con error de "no es una función".
- El juego ya **consulta datos reales de OpenStreetMap** (Mapa Vivo Capa 6 — ver `OSM_INTEGRATION.md`) vía Overpass API, cacheados por posición/radio/TTL alrededor del jugador. La clasificación de bioma/región de las capas 4/5b sigue usando sus reglas de respaldo por nombre de zona sin cambios (no se tocaron); la Capa 6 deja una API interna (`geoWorldAdapter.js`) lista para que una tarea futura las combine.

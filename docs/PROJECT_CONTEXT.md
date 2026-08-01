# PROJECT_CONTEXT

## 1) Objetivo real del proyecto

`rpg-go` es un RPG de exploración en mapa real con progresión por combate, loot, equipo, mascotas, misiones, economía con dos monedas (oro y cristales), recolección de materiales, bases personales/edificios, y multijugador en tiempo real — todo por encima de un sistema de mundo por capas llamado **"Mapa Vivo"** (ver §5).

El flujo actual parte de:
- selección/carga de personaje,
- mapa interactivo (GPS real o simulación), con cámara orientable (zoom + rotación + inclinación),
- encuentros por proximidad,
- sistemas de progreso persistente.

## 2) Stack técnico confirmado

- Frontend: HTML + CSS + JavaScript vanilla (sin TypeScript en ningún lado — los `config/*.js` usan JSDoc en vez de `.ts`, a propósito, ver `package.json`/`vite.config.js`).
- Bundler/dev server: Vite (`vite` con scripts `dev`, `build`, `preview`) + Vitest (`npm test`, 21 archivos de test / ~204 tests, ver §10).
- **Empaquetado móvil: Capacitor 8** (`android/`, `capacitor.config.json`, `appId: com.rpggo.app`) — el mismo `dist/` de Vite se empaqueta como app Android real (WebView), no es una PWA. Plugins usados: `@capacitor/geolocation` (GPS nativo, con fallback a `navigator.geolocation` en web — ver `nativeGeolocation.js`), `@capacitor/filesystem` + `@capacitor/share` (exportar/compartir el save — ver `saveTransfer.js`), `@capacitor/local-notifications`, `@capacitor/app`, `@capacitor/splash-screen`, `@capacitor-community/admob`. Ver §10 y `ARCHITECTURE.md §9`.
- **Mapa: MapLibre GL JS** (no Leaflet — se migró durante un ciclo de desarrollo anterior). El código de `main.js` sigue **escribiendo con la sintaxis de Leaflet** (`L.marker(...)`, `map.setView(...)`, etc.) a propósito: existe una capa de compatibilidad (`public/maplibre-leaflet-shim.js`) que traduce esas llamadas a MapLibre por debajo, para no tener que reescribir cada punto del juego que usa el mapa.
  - Estilo del mapa: `public/map-base-style.json` (estilo vectorial de OpenFreeMap, con CORS real — los mosaicos raster de OSM **no funcionan con MapLibre** por falta de CORS).
  - La cámara soporta zoom, `bearing` (rotación) y `pitch` (inclinación) de forma nativa.
- Tiempo real multiplayer: PubNub (SDK por CDN, claves demo `pub-c-.../sub-c-...`).
- Publicidad: AdMob vía `@capacitor-community/admob`, solo rewarded ads en Fase 1 — ver §10.
- Persistencia:
  - **Guardado del propio jugador** (`player_<classKey>`): `window.storage` si existe, fallback a `localStorage`. Es una **lista explícita de campos** en `saveGame()`/`rebuildPlayerFromSave()`, no una serialización automática de `player` completo (ver `AI_RULES.md §8`).
  - **Cualquier dato que deban ver OTROS jugadores** (torres, bases, presencia, y los cambios del Modo Constructor): **PubNub, nunca `window.storage`**. `window.storage` (la API de `shared`/`priv`) **solo existe dentro del entorno de Claude** — una vez el juego está hosteado afuera, cada navegador tiene su propio `localStorage` y nunca se sincroniza con nadie más, aunque el código diga `shared:true`. Esto costó un bug real durante el desarrollo (ver `AI_RULES.md §6`).

## 3) Estado actual de arquitectura

Ya **no** es un monolito puro: desde la construcción del sistema "Mapa Vivo" (§5), `src/game/systems/` y `src/game/config/` están activamente en uso con una separación real entre datos puros, lógica pura desacoplada, e integración en `main.js`:

- **Datos/modificadores** modularizados en `src/game/config/*`.
- **Lógica pura y desacoplada** (recibe todo por parámetro, nunca toca `player`/`map`/DOM directamente) en `src/game/systems/*` — cada módulo del Mapa Vivo vive acá.
- **Sprites/rutas de assets** centralizados en `src/game/assets/spriteRegistry.js`.
- **Orquestación, render, integración entre sistemas y todo lo que sí toca `player`/`map`/DOM** sigue concentrado en `src/main.js` (archivo monolítico grande, pero cada vez más delgado en lógica de datos/reglas puras gracias a `config`/`systems`).
- **Compatibilidad de mapa** vive en `public/maplibre-leaflet-shim.js` (fuera de `src/` porque Vite necesita servirlo como script plano, no como módulo empaquetado).
- `src/main.js` todavía contiene **muchos bloques `if(false){...}`** con código legado/migrado — ver `AI_RULES.md §2`, es una trampa real si se inserta código nuevo ahí sin darse cuenta.

## 4) Sistemas funcionales implementados (confirmados en código)

- Creación y selección de personajes por clase/género.
- Guardado por slot de clase y migración automática desde guardado legado.
- Mapa multi-ciudad (Neiva, Bogotá, Itagüí, Quito, Caracas, Pitalito) con zonas, parques, estaciones de mejora y navegación de misión.
- Cámara de mapa: zoom, rotación (bearing) e inclinación (pitch) reales; personaje siempre "de frente" en pantalla.
- GPS robusto con diagnóstico, fallback de simulación, y gestos especiales cuando el GPS está activo.
- Spawns dinámicos: normales (en zigzag), manadas, ladrón, comerciante, vagabundo, NPCs de misión, jefes de zona, y el **Lobo Sombrío** (jefe especial nocturno Nv.50+, ver `GAME_MECHANICS.md §5.4`).
- Cofres del tesoro (4 rarezas, temporales).
- Santuarios (bonos temporales de combate).
- **Recolección de materiales** (madera/piedra/hierro): árboles/rocas/vetas cerca del jugador, requieren comprar un **pico** (3 tiers, con durabilidad propia) para poder recolectar — ver `GAME_MECHANICS.md §8`.
- **Durabilidad de equipo**: armas/armadura/casco/botas se desgastan en combate PvE y se reparan en la **Forja** con oro + material — ver `GAME_MECHANICS.md §17`.
- **Estados de combate persistentes** (quemado/envenenado): procs de arma que antes solo sumaban daño único ahora aplican daño por turno de verdad, con su propia animación — ver `GAME_MECHANICS.md §5.5`.
- **Cristales**: segunda moneda — cofres legendarios, primer jefe del día, y **bono diario** (+1 diamante al iniciar sesión).
- **Bases personales / Edificio**: se compran en la tienda, tardan tiempo real en construirse (acelerable pagando), y se pueden mejorar a Edificio (genera oro pasivo) — ver `GAME_MECHANICS.md §11`.
- **Modo Constructor** (solo cuenta `Hacker994`): mover/borrar/agregar torres, fogatas, santuarios, puntos de mejora y árboles directamente en el mapa, sincronizado por PubNub.
- Combate PvE: 1vE, manada, grupo cooperativo; PvP determinista por turnos.
- Quests tutorial y quests de entrega de ítem.
- Mascotas (captura, invocación, XP, nivelado, curación, liberación).
- Inventario como página completa, con comparación coloreada, selección múltiple para vender, y compra de espacio extra (por **tipo único de objeto**, no por copia apilada — ver `AI_RULES.md §9`).
- Equipo/atributos/tienda: catálogo con **Oferta Semanal** rotativa y **Arma Superior** (siempre disponible, siempre mejor que la actual, cuesta oro + % de materiales, escala con cada compra).
- Amigos, chat, invitaciones y grupo de hasta 5 jugadores.
- HUD simplificado con barra contextual dinámica (ahora también muestra Mercader Ambulante, Eventos Aleatorios descubiertos, y la presentación de región al entrar a una nueva).
- Modales del juego (`showConfirm`/`showAlert`) en vez de `confirm()`/`alert()` nativos del navegador, en todo el código.

## 5) Sistema "Mapa Vivo" (capas del mundo)

El mundo se construye por capas independientes y desacopladas, cada una en su propio `config/` + `systems/`:

| Capa | Nombre | Config | Systems | Qué agrega |
|---|---|---|---|---|
| 1 | Infraestructura del Mundo | (usa `world.js` existente) | — | Fogatas/Torres/Santuarios (ya existían) + Coliseo con ubicación física real por ciudad; `POI_TYPES`/`getCityPOIs()` en `world.js` como catálogo genérico de puntos de interés permanentes. |
| 2 | Mundo Dinámico | `world.js` (ubicaciones) | `dynamicWorld.js` | Entidades temporales con ciclo de vida (`scheduled/active/expired`) persistido por fechas reales. Primer NPC: **Mercader Ambulante** (inventario rotativo, existencias limitadas, descuentos). |
| 3 | Eventos Aleatorios | — | `randomEvents.js` | `WorldEvent` con ciclo de vida completo (`scheduled/active/engaged/completed/failed/expired`). Tres tipos: Viajero Atacado, Cofre Custodiado, Emboscada. Recompensa calculada una sola vez y persistida. |
| 4 | Ecosistema del Mundo | `biomes.js` | `ecosystemEngine.js` | Clasifica cada zona/parque en un **bioma** (Bosque/Montaña/Ciudad/Industrial/Ruinas/Río/Llanura) y qué contenido es apropiado ahí. **Todavía no filtra ningún spawn real** — es la base para que futuras capas lo consulten. |
| 5 | Sistema de Visibilidad | `visibility.js` | `visibilityEngine.js` | 3 prioridades de renderizado (Siempre / Media / Descubrimiento) con distancias centralizadas. Coliseo/Santuarios/Fogatas/Mercader/NPCs dinámicos y los Eventos Aleatorios ahora se agregan/quitan del mapa según distancia real (no solo CSS). Torres y jefes de región no necesitaron cambios: ya estaban acotados al área cargada / nacían cerca del jugador. |
| 5b | Regiones del Mundo | `regions.js` | `regionManager.js` | Cada zona/parque se convierte en una "Región" con nombre de fantasía estable (ej. "Bosque del Lobo Gris"), ícono, color, nivel recomendado y jefe regional asociado (solo etiqueta, no cambia el sistema de jefes). Presentación no bloqueante al entrar a una región nueva. |
| 6 | Integración con OpenStreetMap | `osm.js` | `osmProvider.js`, `osmFeatureNormalizer.js`, `worldFeatureRepository.js`, `osmMapCache.js`, `geoWorldAdapter.js` | Consulta real a Overpass API (cacheada por posición/radio/TTL) alrededor del jugador, normalizada a `GameFeature`. API interna lista (`getZoneType`, `getNearbyFeatures`, `hasNearbyFeature`, `getBiomeHint`) — ver `OSM_INTEGRATION.md`. **Ninguna capa de gameplay la consume todavía** (a propósito). |

Todas las capas reutilizan combate/inventario/economía/recursos ya existentes; ninguna los modifica. Ver `ARCHITECTURE.md §3` para el árbol de archivos real.

### Combat Power & Difficulty Director (Capa 7 — sistema de progresión, no es parte del Mapa Vivo)

Desde esta capa, el nivel del jugador ya no es el único indicador de dificultad: un **Combat
Power (CP)** interno (nunca mostrado) considera también equipo (rareza + mejora), mascotas y bonos
pasivos. Se usa SOLO en eventos dinámicos, Coliseo (variante extra opcional) y el Guardián de
Parque (jefe opcional) — los spawns ambientales normales del mapa siguen ligados al nivel del
jugador exactamente igual que antes, a propósito (para que volver a una región inicial se sienta
fácil y satisfactorio). Ver `COMBAT_POWER.md` para el detalle completo.

## 6) Alcance geográfico y contenido actual

- Ciudades registradas: `neiva`, `bogota`, `itagui`, `quito`, `caracas`, `pitalito` (`CITY_REGISTRY` en `src/game/config/world.js`).
- **Cualquier ciudad nueva debe registrarse ahí primero** (ver `AI_RULES.md §7`) — si un jugador está lejos de todas las registradas, el juego cae en `DEFAULT_CITY_KEY` ("neiva") como respaldo silencioso.
- Hay progresión avanzada (movimientos definitivos por tiers y desbloqueos por nivel).
- Hay botín especial por jefes y armas exclusivas por parques.

## 7) Estado de mantenimiento (observación técnica)

- `src/main.js` contiene múltiples bloques legacy marcados con `if(false){...}` — **trampa real** si se inserta código nuevo ahí por error (ver `AI_RULES.md §2`).
- `src/game/systems/` ya **no está vacío** y creció mucho más allá del Mapa Vivo: además de `dynamicWorld.js`, `randomEvents.js`, `ecosystemEngine.js`, `visibilityEngine.js`, `regionManager.js` y la Capa 6 OSM, ahora incluye subcarpetas propias completas para `ads/`, `dailyMissions/`, `adventurerContracts/`, `fortuneHall/`, `cloudShadows/`, más `audio/`, `notifications/`, `eventBus/`, `dangerZoneOsmCache.js`/`dangerZonePolygonizer.js`, `battlePerspective.js`, `nativeGeolocation.js`, `saveTransfer.js` — ver §10 para el detalle de cada uno.
- `src/game/scenes/` sigue vacío/sin usar.
- Hay deuda de separación por dominios (combate/mapa/red/UI/persistencia aún conviven en `main.js`), aunque el Mapa Vivo ya demuestra el patrón a seguir para separar mejor a futuro.

## 8) Convenciones implícitas del proyecto

- Nomenclatura de dominio en español para UI y contenido de juego.
- Estructura de datos de gameplay centrada en objetos planos.
- Uso de comentarios extensos para intención funcional (y para documentar *por qué* algo no se hizo de la forma obvia).
- Persistencia defensiva: si falla storage o PubNub, el juego continúa sin bloquearse.
- Módulos del Mapa Vivo (`systems/*`) son funciones puras: reciben posiciones/listas/función de distancia por parámetro, nunca importan `player`/`map` directamente — eso permite probarlos aislados y evita acoplar lógica de reglas con el motor del juego.

## 9) Principio para cambios futuros

Para mantener estabilidad:
- Preferir mover nueva lógica a `config`/`systems` en lugar de ampliar el bloque monolítico de `main.js`.
- Mantener compatibilidad con guardados existentes.
- Tratar el multiplayer como sistema eventual-consistente (mensajes pueden perderse, debe haber tolerancia).
- **Cualquier dato que deba verse entre jugadores distintos va por PubNub, nunca por `AppStorage`/`window.storage`** (ver `AI_RULES.md §6`).
- **Revisar `src/game/systems/`/`src/game/config/` antes de construir algo que "suena nuevo"** — puede que ya exista de una tarea anterior (ver `AI_RULES.md §3`).

## 10) Sistemas adicionales (más allá del Mapa Vivo) — live-ops, mundo, presentación y empaquetado

El proyecto creció bastante más allá de lo que cubren los §5-§7: hoy existen varios sistemas completos, cada uno siguiendo el mismo patrón `config/*.config.js` (datos puros) + `systems/<nombre>/` (motor + repositorio + servicio, funciones puras salvo el propio servicio que sí persiste) + integración liviana en `main.js`. Varios de ellos (misiones diarias, contrato del aventurero) se conectan a las acciones del jugador vía un **event bus genérico** en vez de que `main.js` los llame uno por uno.

### 10.1) Event bus (`src/game/systems/eventBus/gameEventBus.js`)
Pub/sub simple: cualquier acción relevante del jugador se emite UNA sola vez (`gameEventBus.emit({type, payload, eventId?, dedupeKey?})`, 25+ call sites reales en `main.js` — combate ganado, oro obtenido, región descubierta, ítem equipado, recurso recolectado, mazmorra completada, etc.) y cada sistema suscrito decide qué le importa. `dailyMissionsService.reportEvent` y `adventurerContractsService.reportEvent` están suscritos así — evita que cada sistema de misiones necesite un hook a mano en cada punto del código que genera progreso.

### 10.2) Publicidad / monetización (`src/game/systems/ads/*` + `ads.config.js`)
`AdsService` es la única puerta de entrada: coordina `AdsProvider` (3 implementaciones — `admobAdsProvider` real vía Capacitor con import dinámico [nunca se descarga en build web], `mockAdsProvider` para probar sin dispositivo, `noOpAdsProvider` para web/fallback), `ConsentManager` (UMP/GDPR), `RewardedAdManager`, `AdsFrequencyController` (límites diarios/sesión/cooldown/global) y transacciones idempotentes con historial — nunca toca `player` directo, devuelve qué recompensa corresponde y `main.js` la aplica.
- 10 placements definidos, solo 4 activos en Fase 1 (`PHASE_1_PLACEMENTS`): `BATTLE_REVIVE`, `POST_BATTLE_GOLD_BONUS`, `DAILY_AD_CHEST`, `BLACKSMITH_TIME_REDUCTION`. Las 3 del Salón de la Fortuna (`FORTUNE_*_SECOND_TRY`) también están activas. El resto (`DAILY_SECOND_CHANCE`, `EXPLORATION_BONUS`, `CONTRACT_BONUS`) existen pero `enabled:false` a propósito (Fase 2).
- Interruptor de emergencia `VITE_ADS_ENABLED=false` apaga toda la publicidad sin romper el resto del juego.
- **⚠️ Flag de desarrollo que hay que apagar antes de publicar**: `DEV_FORCE_MOCK_ADS` en `ads.config.js` está commiteado en `true` y se pasa directo a `adsService.init()` en `main.js:3252` — mientras siga así, **incluso un build de producción real usaría siempre el proveedor mock, nunca AdMob real**, sin importar `VITE_ADS_ENV`. El propio comentario del archivo ya lo advierte.
- 5 archivos de test (`adsService`, `adsFrequencyController`, `adRewardTransactions`, `adsClock`, `adsRepository`). Ver `ADS_RELEASE_CHECKLIST.md` para el checklist de publicación completo.

### 10.3) Misiones Diarias (`src/game/systems/dailyMissions/*` + `dailyMissions.config.js`)
10 misiones por día (5 fáciles/4 normales/1 avanzada, distribuidas por categoría combate/exploración/recursos/variadas), reinicio local a medianoche con detección de retroceso de reloj sospechoso, recompensa final por completar las 10. XP multiplicada x4 respecto al diseño original ("pedido explícito: que completar misiones se sienta como la mejor forma de subir de nivel"). Sin flags de desarrollo pendientes. 4 archivos de test.

### 10.4) Contrato del Aventurero (`src/game/systems/adventurerContracts/*` + `adventurerContracts.config.js`)
Sistema de reputación de gremio (6 rangos, Novato→Leyenda del Gremio) con contratos por rareza (Common→Legendary) filtrados por nivel Y reputación mínima ("no generar legendarios para jugadores nuevos"). Generación cada 24h, deadline real por dificultad (24h-96h). Sin flags de desarrollo pendientes. 3 archivos de test.

### 10.5) Salón de la Fortuna (`src/game/systems/fortuneHall/*` + `fortuneHall.config.js`)
3 minijuegos (cofres, cartas, ruleta) sobre el mismo servicio de reinicio diario/intentos. Filosofía explícita en el propio config: "NO regalar grandes premios, un momento breve y satisfactorio cada día" — pesos de recompensa nunca mostrados al jugador (oro 55%, materiales 20%, consumibles 18%, diamantes 5%, equipo 2%, nunca épico/legendario). Segunda oportunidad tras el intento gratis diario: ver anuncio o pagar 5 diamantes.
- **⚠️ Flag de desarrollo que hay que apagar antes de publicar**: `DEV_UNLIMITED_ATTEMPTS` en `fortuneHall.config.js` está commiteado en `true` — el propio comentario dice "el límite de 1 gratis + 1 con anuncio/diamantes por día es parte del diseño económico, no algo opcional". Combinar con `DEV_FORCE_MOCK_ADS` para probar el flujo completo en navegador.
- 5 archivos de test.

### 10.6) Notificaciones (`src/game/systems/notifications/dailyRewardNotifications.js` + `notifications.config.js`)
Fase 1 deliberadamente mínima: un único recordatorio LOCAL (Capacitor Local Notifications, sin backend) de que las misiones diarias están listas, con id fijo para reemplazar en vez de duplicar. Notificaciones push reales (ej. solicitud de amistad con la app cerrada) quedan explícitamente fuera de alcance — necesitarían Firebase Cloud Messaging + un endpoint backend que no vive en este repositorio.

### 10.7) Mazmorras (`src/game/config/dungeons.js`, motor en `main.js`)
Una sola mazmorra piloto implementada de punta a punta: "Fortaleza del Señor Oscuro" (9 pisos de combate+élite+bonus + 1 piso de jefe = 10 pisos, portal con niebla de esbirros propios, set de 6 piezas de equipo exclusivas con bonos por 2/4/6 piezas equipadas, título+marco+decoración de base al completar el set). `DUNGEON_REGISTRY` está pensado para agregar mazmorras nuevas sin tocar el motor genérico — hoy solo tiene esta entrada. Fuera de alcance a propósito para este piloto: comerciante/sala secreta como tipos de habitación, grupo por proximidad, selector de título/marco, "invocar sombras en combate" del set bonus (espera a que el motor de combate soporte efectos activos).

### 10.8) Zonas Peligrosas (`src/game/config/dangerZones.js` + `systems/dangerZoneOsmCache.js`/`dangerZonePolygonizer.js`)
Genera polígonos de "manzana real" a partir de la geometría de vías de OpenStreetMap (Overpass, `out geom;` — distinto del sistema de POIs de la Capa 6 del Mapa Vivo, que solo pide `out center;`) alrededor del jugador, con fallback a un rectángulo cuando Overpass no responde o la manzana no se puede formar. Se usan como zonas de desafío de mayor dificultad, escaladas por Combat Power (`DANGER_ZONE_DIFFICULTY_TIERS`, no por nivel plano) — comparten mecanismo con el Modo Constructor (`mapEdits.dangerZones`) para zonas trazadas a mano.

### 10.9) Escenarios de batalla con perspectiva (`src/game/config/battleScenes.js` + `systems/battlePerspective.js`)
Cada fondo de batalla (`public/assets/backgrounds/*.jpg`) tiene una configuración manual de horizonte, polígono transitable y anclajes recomendados (jugador, enemigos terrestres, voladores) en coordenadas fraccionales sobre la imagen nativa. El motor deriva la escala de profundidad automáticamente a partir de la posición Y del anclaje (nunca moviendo el sprite solo en Y a mano) y reubica anclajes mal puestos al punto transitable más cercano.

### 10.10) Sombras de nube (`src/game/systems/cloudShadows/*` + `cloudShadows.config.js`)
Puramente visual — recorta nubes reales de un spritesheet (detección de componentes conexos por alfa), las hornea en variantes de blur pre-calculadas, y las hace derivar lentamente sobre una capa MapLibre (`icon-pitch-alignment:'map'`) alrededor del jugador. Sistema terminado y ajustado con pruebas reales (varios parámetros de población/velocidad fueron recortados tras feedback directo). Un solo valor queda marcado como temporal en el propio config: `VARIATION.opacityMin/opacityMax` (0.55-0.75) está subido para verificación visual del pipeline; el comentario indica bajarlo a 0.10-0.22 ("el valor final realista") una vez confirmado.

### 10.11) Audio (`src/game/systems/audio/audioManager.js` + `audio.config.js`)
4 pistas de música (mapa/batalla/jefe/tienda, con crossfade) + 3 efectos (golpe/victoria/oro), volumen independiente por categoría (MAP/BATTLE/SHOP) persistido en `localStorage`. Acotado pero completo para el alcance actual.

### 10.12) Transferencia de guardado y backup automático (`src/game/systems/saveTransfer.js`, `src/game/systems/backupFolder.js`, `android/.../BackupFolderPlugin.java` + funciones en `main.js`)
`saveTransfer.js` exporta/importa el save del jugador como archivo real — en Android usa `@capacitor/filesystem` + `@capacitor/share` (escribe en caché y abre el panel de compartir de Android: Drive/WhatsApp/email/Archivos); en web usa el truco de `Blob` + `<a download>`. Sigue siendo el único mecanismo para MOVER una partida a mano entre dispositivos/navegadores — no existe sistema de cuenta con backend propio (el multiplayer vía PubNub no implica una cuenta ni guarda el progreso del jugador en la nube).

Además hay un **backup automático diario silencioso** (`maybeRunDailyAutoBackup` en `main.js`, como máximo una copia por día calendario, oportunista al abrir/reanudar la app — no hay tarea en segundo plano real, no hay plugin de background tasks instalado, así que no es puntual a una hora fija con la app cerrada). Arma el mismo payload que `exportSave()` (misma `SAVE_TRANSFER_FORMAT_VERSION` — un archivo de cualquiera de las fuentes sirve para todas), mantiene como máximo 5 copias y borra la más vieja al superar el límite. Vive en dos lugares posibles, en este orden de preferencia (`writeBackupFile`/`listAvailableBackups`/`readBackupEntry`/`deleteBackupEntry` en `main.js` abstraen cuál):
1. **Carpeta elegida por el jugador** (`src/game/systems/backupFolder.js` + `BackupFolderPlugin.java`, plugin nativo propio — no hay ninguno de Capacitor/npm que cubra esto) vía Storage Access Framework (`Intent.ACTION_OPEN_DOCUMENT_TREE` + `takePersistableUriPermission`). Es la ÚNICA forma real de que un backup sobreviva a una desinstalación en Android moderno: se investigó `Directory.ExternalStorage` de `@capacitor/filesystem` primero, pero según su propio README solo funciona en Android 9 o anterior, y `Directory.Documents` en Android 11+ sigue siendo privado de la app (se borra igual al desinstalar) — de ahí el plugin propio.
2. **Almacenamiento interno silencioso** (`writeLocalBackupFile`/etc. de `saveTransfer.js`, `Directory.Data` en Android / `localStorage` con prefijo propio en web) — fallback cuando el jugador no configuró una carpeta (o dijo "ahora no", o está en web). Sigue siendo útil contra un guardado corrupto, pero SE PIERDE si se desinstala la app.

Al entrar a la pantalla de selección de personaje (`enterGameFlow`), si nunca se preguntó antes en esta instalación (`maybeOfferBackupFolderSetup`, una sola vez por instalación — clave `rpgGo.backupFolder.askedOnce`), se ofrece elegir esa carpeta. Si el jugador la elige, se escanea de inmediato (`maybeOfferRestoreFromBackupFolder`) por si ya tiene backups de una instalación anterior en el mismo dispositivo (el caso "desinstalé y reinstalé la app") y se ofrece continuar con el más reciente — mismo flujo de confirmación que `importSave()` (`confirmAndApplySavePayload`, compartido entre ambos). El botón "Elegir/Cambiar carpeta" en Ajustes (`btnChangeBackupFolder`) permite hacer esto en cualquier momento. El export manual (`exportSave`) sigue ofreciendo el panel de compartir de siempre y, si hay carpeta configurada, guarda ADEMÁS una copia silenciosa ahí. Ninguna de las dos fuentes es explorable con el selector de archivos del sistema, por eso hay una pantalla propia en el juego (`autoBackupOverlay`/`btnAutoBackups` en Ajustes) para listar y restaurar una copia.

### 10.13) Geolocalización nativa (`src/game/systems/nativeGeolocation.js`)
Capa fina sobre `navigator.geolocation` (web) / `@capacitor/geolocation` (Android empaquetado, vía `Capacitor.isNativePlatform()`) — expone las mismas 3 operaciones (`getCurrentPosition`/`watchPosition`/`clearWatch`) con la misma forma de datos hacia `onGpsSuccess`/`onGpsError` en `main.js`, así el resto del código no necesita saber cuál está corriendo por debajo. Traduce los códigos de error nativos de Capacitor a los códigos numéricos 1/2/3 que ya maneja `onGpsError`.

### 10.14) Empaquetado Android/Capacitor (`android/`, `capacitor.config.json`)
`appId: com.rpggo.app`, `appName: "RPG GO"`. Firma de release vía `android/keystore.properties` (gitignored) + `android/app-release.jks`; sin ese archivo, `assembleRelease` falla al empaquetar en vez de generar un APK sin firmar en silencio. El AdMob App ID nativo se resuelve en build-time desde la variable de entorno `ADMOB_APP_ID_ANDROID` (sin prefijo `VITE_`, la lee Gradle directo — no confundir con las `VITE_ADMOB_*` que sí lee Vite), con fallback al ID de prueba oficial de Google si no está seteada. Requiere **JDK 21** para compilar (`compileOptions` en `capacitor.build.gradle`, generado por Capacitor) — un JDK 17 falla con "invalid source release: 21"; el JDK del propio Android Studio (`.../Android Studio/jbr`) sirve. `versionCode`/`versionName` siguen hardcodeados en `1`/`"1.0"` en `android/app/build.gradle` — hay que subirlos a mano en cada release real. Ver `ADS_RELEASE_CHECKLIST.md` para el checklist de publicación en Play Store (que a la fecha tiene varios ítems sin marcar, empezando por la cuenta de Google Play Developer todavía en revisión).

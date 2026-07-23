# PROJECT_CONTEXT

## 1) Objetivo real del proyecto

`rpg-go` es un RPG de exploración en mapa real con progresión por combate, loot, equipo, mascotas, misiones, economía con dos monedas (oro y cristales), recolección de materiales, bases personales/edificios, y multijugador en tiempo real — todo por encima de un sistema de mundo por capas llamado **"Mapa Vivo"** (ver §5).

El flujo actual parte de:
- selección/carga de personaje,
- mapa interactivo (GPS real o simulación), con cámara orientable (zoom + rotación + inclinación),
- encuentros por proximidad,
- sistemas de progreso persistente.

## 2) Stack técnico confirmado

- Frontend: HTML + CSS + JavaScript vanilla.
- Bundler/dev server: Vite (`vite` con scripts `dev`, `build`, `preview`).
- **Mapa: MapLibre GL JS** (no Leaflet — se migró durante un ciclo de desarrollo anterior). El código de `main.js` sigue **escribiendo con la sintaxis de Leaflet** (`L.marker(...)`, `map.setView(...)`, etc.) a propósito: existe una capa de compatibilidad (`public/maplibre-leaflet-shim.js`) que traduce esas llamadas a MapLibre por debajo, para no tener que reescribir cada punto del juego que usa el mapa.
  - Estilo del mapa: `public/map-base-style.json` (estilo vectorial de OpenFreeMap, con CORS real — los mosaicos raster de OSM **no funcionan con MapLibre** por falta de CORS).
  - La cámara soporta zoom, `bearing` (rotación) y `pitch` (inclinación) de forma nativa.
- Tiempo real multiplayer: PubNub (SDK por CDN, claves demo `pub-c-.../sub-c-...`).
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
- `src/game/systems/` ya **no está vacío**: `dynamicWorld.js`, `randomEvents.js`, `ecosystemEngine.js`, `visibilityEngine.js`, `regionManager.js`, y (Capa 6) `osmProvider.js`, `osmFeatureNormalizer.js`, `worldFeatureRepository.js`, `osmMapCache.js`, `geoWorldAdapter.js`.
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

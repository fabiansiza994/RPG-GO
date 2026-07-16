# TODO (estado inferido desde código)

> Convención:
> - `[x]` implementado y visible en código.
> - `[ ]` pendiente o no implementado de forma completa.

## 1) Arquitectura y mantenimiento

- [x] Modularización de catálogos en `src/game/config/*`.
- [x] Registro central de sprites en `src/game/assets/spriteRegistry.js`.
- [x] Migración de mapa de Leaflet a MapLibre GL JS vía capa de compatibilidad (`public/maplibre-leaflet-shim.js`).
- [ ] Descomponer `src/main.js` por dominios (`map`, `combat`, `ui`, `multiplayer`, `persistence`, `economy`) — el archivo creció bastante más este ciclo (mapa, cofres, santuarios, bases, Modo Constructor).
- [ ] Activar uso real de `src/game/scenes/` y `src/game/systems/` (actualmente vacíos).
- [ ] Eliminar/normalizar bloques legacy `if(false){...}` para reducir ruido y riesgo de divergencia.
- [x] Integración con OpenStreetMap (Mapa Vivo, Capa 6): Overpass API + cache por posición/radio/TTL + normalización OSM→GameFeature + API interna (`geoWorldAdapter.js`) — ver `OSM_INTEGRATION.md`. Ningún spawn/NPC/región/evento la consume todavía (a propósito).
- [x] Combat Power & Difficulty Director (Capa 7, sistema de progresión): CP interno (stats+equipo+mascotas+pasivas) + variantes normal/strong/elite/legendary, usado solo en eventos dinámicos, Coliseo (variante extra) y Guardián de Parque — ver `COMBAT_POWER.md`. Spawns ambientales normales del mapa siguen ligados al nivel del jugador, a propósito. `RewardDifficulty` lista pero sin conectar a recompensas reales.
- [x] **Bug confirmado y corregido (el personaje a veces no aparecía en el mapa, y por lo tanto tampoco se podía centrar)**: en `initMap()`, el marcador del jugador (`meMarker`) se creaba DESPUÉS de dibujar zonas/parques/torres/eventos/bases/estaciones de mejora — un error en cualquiera de esos pasos dejaba el resto de la función sin ejecutarse, así que `meMarker` nunca llegaba a crearse. Como `movePlayerTo()` llama a `meMarker.setLatLng(...)` en cada movimiento (y el centrado, `map.panTo(...)`, viene justo después en la misma línea de código), eso también explicaba por qué el mapa tampoco podía centrarse. Corregido: `meMarker` ahora se crea PRIMERO (antes de cualquier elemento decorativo), y cada paso decorativo (`drawNeivaZones`, `drawNeivaParks`, `drawTowers`, `updateMediumVisibility`, etc.) quedó aislado en su propio try/catch (`safeDrawStep`) — un fallo en cualquiera de ellos se avisa en la consola pero nunca vuelve a poder impedir que el personaje aparezca ni que el mapa se centre.

## 2) Gameplay y combate

- [x] PvE 1v1 implementado.
- [x] PvE manadas implementado.
- [x] PvP determinista por turnos implementado.
- [x] Combate de grupo implementado.
- [x] Ultimates por fases implementados.
- [x] Revivir en combate con cristales (una vez por combate).
- [x] Duplicar XP con oro tras ganar un combate normal.
- [ ] Revisar balance global de fórmulas de daño/recompensa (especialmente escalado entre modos, y el impacto real de los bonos de santuario).
- [ ] Consolidar reglas repetidas entre `startBattle`, `startPackBattle`, PvP y grupo en utilidades compartidas.
- [ ] El santuario del Viento (+VEL) no tiene ningún efecto real en combate todavía — la velocidad no participa en ningún cálculo de turno/daño actual.

## 3) Mundo, quests y contenido

- [x] Zonas de Neiva, Bogotá, Itagüí y Caracas con parque-guardianes implementados.
- [x] **Pitalito, Huila** agregada al `CITY_REGISTRY` — zonas (Centro/Solarte), Parque Principal José Hilario López (guardián de parque) y Centro Comercial Gran Plaza San Antonio, con fogatas/santuarios/torres derivados igual que las demás ciudades. Coliseo ubicado en las coordenadas reales del Coliseo Cubierto de Pitalito (dato de OpenStreetMap).
- [x] **Coordenadas de Coliseo corregidas** en Neiva/Bogotá/Itagüí/Quito/Caracas para coincidir con la ubicación real del estadio/coliseo de cada ciudad (antes eran aproximaciones; se verificaron contra OpenStreetMap/Wikipedia). El de Caracas estaba especialmente desviado (~7 km).
- [x] **Coliseo siempre visible** (`ENTITY_VISIBILITY.coliseo` → `ALWAYS`, antes `MEDIUM`/600 m) — al ser un destino fijo, conviene verlo de lejos para poder ir hacia él.
- [x] **Rayos de sol angulados + sombra de nubes más orgánica**: el "punto de luz" de luna/sol (ya anclado a una coordenada real, ver `GAME_MECHANICS.md §2`) ahora apunta siempre al Coliseo de la ciudad en vez de a un punto aleatorio cerca de donde arrancó el jugador. De día se ven 2-3 haces de luz con ángulo marcado (no verticales, para que se vea como luz de costado) convergiendo en ese punto; la sombra de nubes que pasa sobre el punto de luz dejó de ser un círculo perfecto (ahora dos elipses superpuestas con blur, más parecidas a una nube real).
- [x] **Torres ya no son TODAS siempre visibles**: cada zona sigue generando 2 (sin cambios en cantidad/ubicación), pero solo la primera (`landmark:true`) se ve siempre — la segunda solo aparece por proximidad (`tower_proximity`, 600 m, igual que un santuario), para no saturar el mapa con demasiados íconos permanentes.
- [x] Quests tutorial y quests de entrega implementadas.
- [x] Ruteo de misión con fallback resiliente.
- [x] Cofres del tesoro (4 rarezas, temporales).
- [x] Santuarios con bono temporal de combate.
- [x] Bases personales (compra, despliegue con vista previa, cofre propio, recoger/redesplegar).
- [x] **Escena visual del cuarto de la base** (`openBaseRoom`): al entrar se ve tu personaje de pie en un diorama (antorchas, banner) con 5 muebles tocables — cofre (de siempre), mesa de armas y mesa de consumibles (vistas filtradas de solo lo guardado en el cofre por categoría), mesa del mapa (Regiones de siempre, con detalle extra de bioma/nivel/jefe para zonas visitadas) y Forja (sin cambios en su lógica de reparación). Las sub-pantallas vuelven al cuarto al cerrarse si se abrieron desde ahí (`baseRoomReturnPending`), y siguen funcionando igual si se abren desde fuera (FAB, botón 🗺️).
- [x] **Bug confirmado y corregido (el marcador 🏠 de la base a veces no aparecía en el mapa en absoluto)**: causa real — `marker.getLatLng()` en `maplibre-leaflet-shim.js` devolvía el valor crudo guardado en el marcador (un array `[lat,lng]`, no `{lat,lng}`), así que `ll.lat`/`ll.lng` en la confirmación de "dónde colocar la base" siempre daban `undefined`, y **cada** despliegue guardaba una base sin coordenadas reales — no era un caso raro. `getLatLng()` ahora normaliza el array a `{lat,lng}`. De paso: `drawSingleBaseMarker` ignora (con aviso en consola, en vez de romper el resto del dibujado del mapa) cualquier base con coordenadas no numéricas; `drawAllBases` quita los marcadores previos antes de redibujar (antes, al terminar la construcción, el 🚧 viejo quedaba huérfano bajo el 🏠 nuevo); y el marcador de base ahora "flota" por encima del marcador del propio jugador (antes, si estabas parado sobre tu base, tu personaje la tapaba por completo al tener mayor z-index en el mismo punto de pantalla).
- [x] Modo Constructor para `Hacker994` (mover/borrar/agregar torres, fogatas, santuarios, puntos de mejora), compartido de verdad entre jugadores vía PubNub.
- [ ] Añadir más variedad de templates de misión sin duplicar lógica en `main.js`.
- [ ] Evaluar sistema de eventos por zona/hora para contenido dinámico más mantenible.
- [ ] Registrar cualquier ciudad nueva en `CITY_REGISTRY` (`world.js`) **antes** de usar el Modo Constructor ahí — si no, el contenido cae en la ciudad de respaldo (`neiva`) sin avisar.
- [x] **Bug confirmado y corregido (recolección se cancelaba sola con el mensaje "Te alejaste")**: causa real encontrada — `playerLatLng` se aplica siempre crudo desde el GPS (sin suavizar, ver `onGpsSuccess`/`movePlayerTo`), y el chequeo de cancelación de `startGatherProgress` comparaba esa lectura cruda contra `ENGAGE_RANGE_M` cada 400 ms sin ningún margen ni confirmación: un solo salto momentáneo de precisión del GPS (normal en celular) alcanzaba para cancelar, y al ser un polling por tiempo fijo (no atado a lecturas nuevas de posición) podía re-evaluar varias veces la misma lectura vieja. Corregido: el chequeo (`checkActiveGatherProximity`) ahora se dispara solo cuando hay una posición nueva de verdad (llamado desde `movePlayerTo`, cubre GPS real y simulación), exige `GATHER_CANCEL_RANGE_M` (`ENGAGE_RANGE_M` + margen de tolerancia) y `GATHER_CANCEL_STRIKES` lecturas reales seguidas fuera de rango antes de cancelar — mismo criterio de histéresis que ya usa `visibility.js` (Capa 5).
- [ ] Ideas de contenido pendientes de evaluar (de la lista original del dueño del producto): mochilas abandonadas, cristales de energía (como material de crafteo, distinto a la moneda), árboles ancestrales, campamentos enemigos con cofre de recompensa, NPCs viajeros que cambian de ubicación, ruinas con evento al descubrirlas, hadas raras y temporales, eventos aleatorios al caminar, biomas por zona con enemigos propios, mini aldeas con varios servicios, pergaminos coleccionables/lore, huellas que llevan a una recompensa, portales a mazmorras/eventos/jefes, grietas dimensionales cooperativas por tiempo limitado.

## 4) Mascotas

- [x] Captura con carta, invocación y progresión base.
- [x] Ítems de entrenamiento y curación de mascota.
- [x] Carta de captura ya no aparece como comprable en la tienda.
- [ ] Profundizar equipamiento/accesorios de mascota (UI indica "próximamente").
- [ ] Unificar cálculo de aporte de mascota para evitar diferencias entre modos de combate.

## 5) Multiplayer y resiliencia de red

- [x] Presencia, amigos, chat, invites y grupo por PubNub.
- [x] Punto verde/rojo de en línea para amigos (reutiliza la caché de presencia).
- [x] Torres, bases y Modo Constructor sincronizados de verdad entre navegadores/dispositivos vía PubNub (no vía `AppStorage`, que no cruza dispositivos fuera de Claude).
- [x] Timeouts/reintentos en partes críticas (duelo y combate de grupo).
- [ ] Persistir historial básico de chat/notificaciones para no perder contexto al recargar.
- [ ] Definir manejo explícito de reconexión en mitad de combate (estado autoritativo por turno).
- [ ] Confirmar en un dispositivo real (fuera del entorno de pruebas) que la sincronización de Modo Constructor entre dos navegadores distintos efectivamente se ve — no se pudo verificar el ciclo publicar→recibir en vivo desde el entorno de desarrollo por una restricción de CORS específica de `localhost`.

## 6) Economía (cristales, inventario, bases)

- [x] Segunda moneda (cristales) con fuentes (cofre legendario, primer jefe del día) y usos (revivir, espacio de inventario/base) implementados.
- [x] Límite real de inventario (antes solo era un número decorativo).
- [ ] Fuentes de cristales pendientes: logros persistentes (no existe el sistema todavía), ranking semanal con reseteo (el Coliseo actual no resetea semanalmente), eventos, misiones "largas" (las misiones no están categorizadas por duración), pase gratuito (tipo battle-pass, sistema aparte).
- [ ] Usos de cristales pendientes: skins, cambiar apariencia, cosméticos (dependen de definir contenido visual nuevo).
- [ ] Aplicar el límite de inventario de forma consistente en los ~20 lugares restantes donde se agregan objetos (hoy cubre las fuentes principales: cofres, combate, misiones, regalos; se dejaron sin tocar las rutas de desequipar para no arriesgar bloquear al jugador).

## 7) Persistencia y migraciones

- [x] Guardado por slot de clase + migración de formato legacy.
- [x] Fallback a localStorage cuando no existe `window.storage`.
- [x] Documentado que `window.storage`/`AppStorage` no sirve para compartir datos entre jugadores fuera del entorno de Claude (ver `AI_RULES.md §4`).
- [ ] Versionar esquema de save (`saveVersion`) para futuras migraciones seguras.
- [ ] Añadir validación/saneamiento de save al cargar (campos faltantes o corruptos).

## 8) UX y observabilidad

- [x] Diagnóstico GPS y mensajes de error específicos.
- [x] Feedback visual abundante (toasts, overlays, barras, paneles).
- [x] HUD simplificado para exploración con barra contextual dinámica.
- [x] Inventario rediseñado como página completa con comparación siempre visible.
- [ ] Añadir telemetría mínima de errores para producción (sin romper modo offline).
- [ ] Estandarizar textos de error/ayuda en una capa i18n simple (actualmente embebidos en funciones).

## 9) Build y tooling

- [x] Proyecto levantable con Vite (`npm install` + `npm run build`, ver README raíz o instrucciones entregadas junto al proyecto).
- [ ] Añadir lint/formateo automatizado (no visible en el repo actual).
- [ ] Definir pruebas mínimas para funciones puras críticas (daño, progresión, migración de save, generación determinista de cofres/rareza).

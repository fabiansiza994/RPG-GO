# AI_RULES

Reglas permanentes para cualquier asistente IA que modifique este proyecto.

## 1) Principio rector

Trabajar **solo con evidencia del código real**. No asumir módulos, features o flujos que no existan en `src/` y `index.html`. Antes de construir algo nuevo, revisar si ya existe (parcial o completo) — varias veces durante el desarrollo de este proyecto se descubrió, a mitad de una tarea, que la función pedida ya existía de una sesión anterior y había que completarla/corregirla en vez de duplicarla.

## 2) Regla crítica: el patrón `if(false){ ... }` — código muerto que atrapa cosas nuevas

`src/main.js` tiene **muchos** bloques `if(false){ ... }` repartidos por todo el archivo. Son restos deliberados de cuando ciertas tablas (`RARITY_TIERS`, `WEAPON_BASE`, `EQUIP_TABLE`, `EQUIP_SLOTS`, `SHOP_CATEGORIES`, `BOSS_LIFESPAN_MS`, `PROC_LABELS`, quests, NPCs viejos, etc.) se migraron a `src/game/config/*.js` y se importan al inicio del archivo. La copia vieja se dejó adentro de `if(false){}` **a propósito**, porque el `{}` de un `if` crea su propio scope de bloque: una `const`/`let` ahí adentro con el mismo nombre que el import **no choca** (no tira "already declared"), simplemente queda muerta y nunca se ejecuta.

**Por qué importa muchísimo**: si insertás código nuevo (una función, una constante, un bloque entero) *dentro* de uno de estos `if(false){}` — por ejemplo, porque hiciste una edición sobre un fragmento que resultó estar ahí adentro — ese código **nunca se ejecuta en el juego real**, pero **sí compila sin error** (JavaScript no avisa nada). Esto ya pasó de verdad más de una vez en este proyecto: se implementó un sistema entero (durabilidad de equipo, con sus funciones y constantes), pasó todos los `npm run build`, y **no funcionaba en el navegador** porque había quedado adentro de un `if(false)` preexistente.

**Antes de insertar código nuevo**:
1. Mirar varias líneas hacia arriba del punto de inserción — ¿hay un `if(false){` sin cerrar antes? Si no alcanza con mirar, usar un script que cuente llaves desde ahí.
2. Preferir insertar código nuevo **pegado a una función que ya sabés que funciona hoy en el juego** (por ejemplo, justo antes de `function maybeSpawnLoboNocturno()`, o dentro del cuerpo de una función que ya se llama desde algún lado activo) — nunca "en el medio" de una zona que no reconocés.

**Después de cualquier cambio en `main.js` (chico o grande), verificar que no cayó en una zona muerta:**
```bash
npx vite build --minify false --outDir dist-debug
grep -c "NombreDeTuFuncionNueva" dist-debug/assets/*.js
```
- Si el conteo es el esperado (declaración + cada uso real), el código está vivo.
- Si da `0` para algo que sabés que se llama desde otro lado activo, o si el build minificado normal (`npm run build`) deja ese identificador **literal sin renombrar** en medio del bundle (los identificadores vivos se acortan; uno atrapado en `if(false)` a veces sobrevive sin renombrar porque el minificador lo trata como referencia global no resuelta) — es la señal de que quedó en una zona muerta. Mover el bloque completo a un lugar confirmado como vivo y repetir el chequeo.

Este chequeo (`vite build --minify false` + `grep`) se volvió el método estándar en este proyecto para confirmar que algo nuevo realmente corre, no solo que compila.

## 3) Regla crítica: revisar `src/game/systems/` y `src/game/config/` ANTES de asumir que algo no existe

Este proyecto evolucionó por capas (ver `PROJECT_CONTEXT.md §5`, sistema "Mapa Vivo") a lo largo de varias sesiones/tareas distintas. Más de una vez se empezó a construir desde cero un sistema completo (con su propia arquitectura, nombres de función, variables de estado) que **ya existía**, armado en una tarea anterior, simplemente porque no se revisó a fondo antes de escribir.

**Antes de implementar cualquier sistema nuevo** (aunque el pedido diga explícitamente "implementemos esto ahora"):
```bash
find src -iname "*palabra_clave*"
grep -rn "NombreDelConceptoEnPascalCase\|NOMBRE_EN_MAYUSCULAS" src/main.js src/game/
```
- Revisar el **listado completo** de `src/game/systems/` y `src/game/config/` (`ls`), no solo buscar por el nombre exacto que trae el pedido — el nombre real en código puede diferir del nombre conceptual del pedido.
- Revisar el bloque de `import` al principio de `src/main.js` completo — ahí quedan enumerados todos los módulos que el juego ya usa de verdad.
- Si algo parcialmente existe (una función definida pero nunca llamada, un elemento HTML que el código ya referencia pero no existe en `index.html`, un `onclick` que pisa a otro definido más arriba/abajo del archivo para el mismo botón), **completar/corregir eso**, no reemplazarlo por una implementación paralela.

Cada capa del sistema "Mapa Vivo" (`dynamicWorld.js`, `randomEvents.js`, `ecosystemEngine.js`+`biomes.js`, `visibilityEngine.js`+`visibility.js`, `regionManager.js`+`regions.js`) sigue el mismo patrón: un archivo en `config/` con datos puros (nada de lógica), un archivo en `systems/` con funciones puras (reciben todo por parámetro — posiciones, listas, una función de distancia — nunca importan `player`/`map` directamente), e integración liviana en `main.js` que sí toca el juego real. Cualquier capa nueva del Mapa Vivo debería seguir esta misma separación.

## 4) Alcance de cambios

- Priorizar cambios quirúrgicos.
- No reescribir `main.js` completo en una sola tarea.
- Mantener compatibilidad con guardados existentes.
- No romper el flujo GPS/simulación, la capa de fallback de storage, ni la capa de compatibilidad de mapa (`public/maplibre-leaflet-shim.js`).

## 5) Mapa de responsabilidad obligatorio

Antes de tocar código, identificar si el cambio pertenece a:
- `config/*` (datos/constantes puras — biomas, regiones, visibilidad, tipos de evento/entidad dinámica, `CITY_REGISTRY` y `SHRINE_TYPES` en `world.js`),
- `systems/*` (lógica pura y desacoplada del Mapa Vivo — ciclo de vida, detección, cálculo; nunca tocan DOM/mapa/`player` directamente),
- `assets/spriteRegistry.js` (rutas de sprites),
- `main.js` (orquestación, integración entre sistemas, render, y lógica runtime que sí toca `player`/`map`/DOM),
- `public/maplibre-leaflet-shim.js` (compatibilidad de mapa — solo tocar si se necesita una API de MapLibre que el shim no traduce todavía),
- `index.html` (estructura de UI overlays — confirmar que cualquier elemento que `main.js` referencia con `$("...")` de verdad exista acá; ya pasó que una función escribía en un elemento que nunca se había agregado al HTML).

Si una regla/dato puede vivir en `config`, **no** dejarla hardcodeada nueva en `main.js`.

## 6) Regla crítica: `AppStorage`/`window.storage` NO sirve para compartir datos entre jugadores

`window.storage` (con su parámetro `shared`) **solo existe dentro del entorno de Claude**. Una vez el juego está hosteado afuera (Netlify, Vercel, un dominio propio, etc.), `AppStorage` cae en su fallback de `localStorage`, que es **estrictamente local a cada navegador/dispositivo** — el prefijo `"shared:"` en ese fallback es solo un nombre de clave, no sincroniza nada entre personas.

**Cualquier dato que otro jugador deba poder ver** (torres, bases, presencia, cambios del Modo Constructor, lo que sea) tiene que viajar por **PubNub** (`storeInHistory:true` al publicar, `fetchMessages` al consultar), replicando el patrón ya usado en `PN_TOWERS_CHANNEL`, `PN_BASES_CHANNEL` y `PN_MAP_EDITS_CHANNEL`. Este proyecto ya tuvo un bug real por usar `AppStorage` con `shared:true` pensando que eso alcanzaba — no repetir ese error.

Además: `pubnub` (la conexión) se inicializa dentro de `initMultiplayer()`, que se llama débilmente tarde en el flujo de arranque (dentro de `initMap`). Cualquier código que necesite `pubnub` para leer un canal compartido debe ejecutarse **después** de esa inicialización (o esperarla), no antes — otro bug real que ya ocurrió (cargar `mapEdits` antes de que `pubnub` existiera, que hacía que la consulta nunca trajera nada).

## 7) Regla crítica: ciudades nuevas van en `CITY_REGISTRY`

Si el contenido (Modo Constructor, zonas, eventos futuros) debe existir en una ciudad que no sea Neiva/Bogotá/Itagüí/Quito/Caracas, esa ciudad **debe registrarse primero** en `CITY_REGISTRY` (`world.js`), con al menos una zona mínima (y, si aplica, un `coliseo` para la Capa 1 del Mapa Vivo). Si no, `detectCityAndLoadWorldData` cae silenciosamente en `DEFAULT_CITY_KEY` ("neiva") como respaldo, y cualquier contenido agregado ahí queda mal etiquetado (asociado a la ciudad equivocada).

## 8) Regla crítica: `saveGame()`/`rebuildPlayerFromSave()` son listas explícitas de campos

El guardado **no serializa `player` completo** — es una lista de campos escrita a mano en `saveGame()`, y `rebuildPlayerFromSave(data)` restaura esa misma lista a mano. **Cualquier propiedad nueva que se le agregue a `player`** (un contador, un objeto de estado, un array) **hay que agregarla explícitamente en los dos lugares**, o se pierde al recargar la página — esto ya costó un bug real (madera/piedra/hierro recolectados no se guardaban porque se agregaron a `player` pero no a estas dos listas).

Al guardar una entidad que en algún momento tuvo una referencia a un marcador del mapa (Leaflet/MapLibre) o cualquier objeto vivo con referencias circulares, **nunca guardar esa referencia directamente** — separar el estado persistible (ids, coordenadas, fechas) del estado en memoria (el marcador en sí) en una caché aparte que nunca toca `saveGame()`. Guardar algo con una referencia circular puede romper `JSON.stringify` para **el guardado completo**, no solo para esa función.

## 9) Reglas de seguridad funcional

- No eliminar migraciones de save existentes.
- No cambiar ids de ítems/movimientos/canales sin migración explícita.
- No alterar prefijos/canales PubNub sin revisar todos los handlers asociados (publicador Y consumidor).
- En lógica de combate, respetar determinismo en PvP (seed + mismo algoritmo en ambos clientes).
- Al agregar objetos al inventario desde código nuevo, usar `pushItemSafe(item)` (revisa espacio y avisa si está lleno) en vez de `player.inventory.push(item)` directo — salvo en rutas de **desequipar**, que nunca deben bloquearse por espacio.
- `hasInventorySpace(itemId)` chequea espacio por **tipo único de objeto** (igual que se muestra en pantalla, "X/34"), no por copia apilada — si ya tenés ese id, siempre cabe una copia más. Pasar siempre el id del objeto que se quiere agregar; no llamarla sin argumento salvo que sea a propósito un chequeo genérico de "¿hay algún espacio libre?".

## 10) Convenciones de edición

- Mantener naming y tono actuales (dominio en español).
- Reusar helpers existentes antes de crear duplicados.
- Evitar introducir nuevas dependencias si no son estrictamente necesarias.
- Preservar comentarios explicativos cuando describen decisiones importantes de diseño (especialmente los que explican *por qué* algo no se hizo de la forma obvia — suelen documentar un bug ya encontrado).

## 11) Checklist previo a cerrar una tarea

1. ¿El cambio está respaldado por código existente y no por suposición?
2. ¿Se revisó `src/game/systems/`, `src/game/config/` y el bloque de imports de `main.js` para confirmar que la función pedida no existía ya (parcial o completa)?
3. ¿Se verificó (build sin minificar + `grep`) que el código nuevo no cayó dentro de un `if(false){}`?
4. ¿No se rompió compatibilidad de save? ¿Cualquier campo nuevo en `player` se agregó tanto a `saveGame()` como a `rebuildPlayerFromSave()`?
5. ¿Se mantiene fallback de GPS y storage?
6. ¿Cualquier dato nuevo que deba verse entre jugadores usa PubNub, no `AppStorage`?
7. ¿PvP sigue determinista para turnos equivalentes?
8. ¿Se actualizó documentación en `docs/` si cambió comportamiento real?

## 12) Checklist específico por dominio

### Si tocas combate
- Verificar impacto en: PvE solo, manada, grupo y PvP.
- Confirmar que costo de MP/HP se aplica en rutas equivalentes.
- Si el combate puede terminar por una vía especial (Coliseo, reto de torre, un Evento Aleatorio, un jefe especial como el Lobo Sombrío), confirmar que `winBattle`/`loseBattle`/`packWinBattle`/`packLoseBattle` chequean esa bandera **antes** de seguir con el flujo normal de recompensas.

### Si tocas multiplayer (torres, bases, Modo Constructor, presencia, amigos)
- Verificar publicación + recepción + timeout/reintento.
- Confirmar que `pubnub` ya está inicializado antes de usarlo.
- Confirmar que UI no queda bloqueada ante pérdida de mensajes.

### Si tocas quests/mundo/Mapa Vivo
- Revisar: tracker, ruta, spawn objetivo, entrega/cancelación, guardado.
- Si es contenido nuevo por ciudad, confirmar que la ciudad está en `CITY_REGISTRY`.
- Si es una capa nueva del Mapa Vivo, seguir el patrón `config/` (datos) + `systems/` (lógica pura) + integración liviana en `main.js` — ver §3.
- Confirmar que la capa nueva **no** rompe visibilidad/render de las capas anteriores (Infraestructura, Mundo Dinámico, Eventos, Ecosistema, Visibilidad, Regiones).

### Si tocas inventario/equipo/economía
- Revisar: equip/unequip, mejoras, guardado de `equipmentIds` + `equipmentUpgrades` + `equipmentDurability`/`inventoryDurability`.
- Confirmar que se usa `pushItemSafe` para agregar objetos nuevos (no aplica a desequipar).
- Si un objeto de equipo puede quedar en estado "Dañado" (durabilidad baja), confirmar que la penalización se aplica/revierte como delta puntual (`syncDamagedPenalty`), nunca recalculando todas las estadísticas desde cero.
- Si agregas una fuente/uso de cristales, verificar que la fuente subyacente exista de verdad (no inventar sistemas de logros/ranking/eventos que no están implementados).

### Si tocas el mapa (MapLibre)
- Confirmar que la llamada usa una API ya traducida en `maplibre-leaflet-shim.js`, o agregarla ahí si hace falta.
- Recordar el orden lat/lng: el juego escribe `[lat,lng]` (estilo Leaflet), el shim lo convierte a `[lng,lat]` para MapLibre — no invertir manualmente en `main.js`.
- Si el elemento nuevo debería tener un límite de visibilidad por distancia, usar el Sistema de Visibilidad (`visibilityEngine.js` + `visibility.js`) en vez de inventar un chequeo de distancia suelto.

## 13) Qué NO hacer

- No inventar APIs internas inexistentes.
- No mover masivamente lógica a nuevas carpetas sin plan incremental.
- No mezclar refactor grande + feature nueva + rebalance completo en una sola entrega.
- No usar `AppStorage`/`window.storage` para nada que otro jugador deba ver (ver §6).
- No agregar contenido de Modo Constructor a una ciudad no registrada (ver §7).
- No insertar código nuevo sin confirmar que el punto de inserción está fuera de un `if(false){}` (ver §2).
- No empezar a construir un sistema nuevo sin haber revisado `src/game/systems/`/`src/game/config/` primero (ver §3).

## 14) Resultado esperado de un buen cambio IA

- Cambio pequeño y verificable.
- Cero regresiones obvias en gameplay principal.
- Documentación consistente con el estado real del código.

# GAME_MECHANICS

## 1) Creación de personaje y progreso base

- Clases jugables: `guerrero`, `mago`, `berserker`, `arquero`.
- Cada clase define:
  - stats base,
  - growth por nivel,
  - move pool por nivel.
- Inicio estándar:
  - nivel 1,
  - oro inicial (20), cristales (0),
  - movimientos de nivel 1,
  - inventario vacío (límite de 30 espacios, ampliable — ver §12).

### Movimientos definitivos (Ultimate)
- Se desbloquean por nivel (`ULTIMATE_UNLOCK_LEVEL`, luego evolución por tiers).
- Fase I/II puede costar todo el MP + porcentaje de HP.
- Fase final consume todo el MP actual.

## 2) Mundo y exploración

- Mapa en **MapLibre GL JS** (migrado desde Leaflet; ver `ARCHITECTURE.md §2`), con soporte de ciudades múltiples: `CITY_REGISTRY` incluye Neiva, Bogotá, Itagüí y Caracas.
- Zoom por defecto: `DEFAULT_ZOOM = 18.50`. El botón de centrar también restablece zoom + inclinación (65°, el máximo).
- Zonas tienen: centro, radio, monstruos asociados.
- Hay parques con guardianes únicos y recompensa de arma exclusiva por primera victoria.
- Hay medallas por distancia real recorrida y progreso por zona.

### Cámara (zoom / bearing / pitch)
- La vista arranca **totalmente inclinada** (pitch 65°).
- Rotar el mapa (`bearing`) es soportado nativamente; el personaje **no rota visualmente** — en su lugar, se recalcula qué sprite de dirección (arriba/abajo/izq/der) le toca mostrar, comparando tu rumbo real de movimiento contra la rotación actual de la cámara (`recomputeScreenFacing`).
- El aro/aura alrededor de personajes, enemigos y fogatas se inclina junto con la cámara (`--ring-tilt-deg`), para que se vean apoyados en el suelo en vez de flotando planos.
- El "punto de luz" de luna/sol está anclado a una coordenada real del mundo (no a la pantalla) — si te alejas, se queda atrás, como cualquier otro objeto del mapa. La sombra de nubes es 100% independiente de la cámara (solo su propia animación).

### GPS y gestos especiales
- GPS real (activación explícita del usuario) o modo simulación (tap en mapa).
- Con GPS activo: arrastrar con **un dedo rota la cámara alrededor tuyo** (no mueve la vista, para no perder el foco de tu personaje); el zoom queda limitado a `DEFAULT_ZOOM - 1.5` como máximo alejamiento.
- Nunca solicita GPS automáticamente al cargar. Diagnóstico previo de contexto seguro/permisos/soporte. Fallback garantizado a simulación ante error.
- Movimiento real válido suma distancia (filtra saltos anómalos).

## 3) Spawns y población del mapa

### Tipos de spawn
- Monstruos normales (`spawnMonsters`) — se reparten en **zigzag** a los lados de tu última dirección de movimiento (aproximación de "junto al camino"), con separación mínima entre ellos para no amontonarse.
- Manadas (`spawnPack`) desde cierto nivel.
- NPCs especiales: ladrón, comerciante, vagabundo, NPC misión, jefes (`maybeSpawnBoss`).
- **Cofres del tesoro** (`maybeSpawnChest`) — ver §8.

### Zoom y visibilidad de enemigos
- A `DEFAULT_ZOOM` (o más cerca) los enemigos se ven a tamaño normal; al alejarte se van encogiendo hasta desaparecer 3 niveles de zoom por debajo (`ENEMY_HIDE_ZOOM`). **Los jefes nunca se achican.**

### Ciclo día/noche
- Noche: mayor densidad, más chance de spawn y más manadas/agresivos.

### Limpieza
- Enemigos fuera de rango o expirados se eliminan automáticamente.

## 4) Engagement por proximidad

- Distancia estándar para interactuar/entrar a combate: **`ENGAGE_RANGE_M = 100`** metros (antes 130). El aro/radar visual alrededor del jugador representa exactamente esta distancia real, calculada según el zoom y la latitud actuales — no es solo decorativo.
- Enemigos agresivos emboscan si el jugador entra en umbral corto (~25m) sin tocar marcador.
- `checkProximity` delega actualmente en emboscadas (`checkAmbush`).

## 5) Sistema de combate PvE

## 5.1 1v1
- `startBattle(mon)` crea `battleState` con buffs/log.
- Turno jugador: ataque, buff/debuff, heal, ítem (consume turno), invocar mascota (consume turno), huir.
- Si tu HP llega a 0, se ofrece **revivir con cristales** (`offerRevive`, costo fijo) antes de dar la derrota por perdida — solo una vez por combate.
- Turno enemigo: daño con variación, posibles debuffs según template.

## 5.2 Fórmula de daño (base)
- Daño usa ATK efectivo, DEF objetivo, poder del movimiento, varianza y crítico.
- Los santuarios activos multiplican ATK/AT.MÁG temporalmente (`shrineBuffMultiplier`).
- Soporta efectos: `execute`, `pierce`, `drain`, `stun`, `slow`, autodaño, multi-hit.

## 5.3 Jefes en PvE
- Jefes pueden invocar refuerzos al bajar de vida (conversión a modo manada en esa batalla).
- Jefes de zona tienen lock/fila por PubNub para evitar conflicto de múltiples jugadores simultáneos.
- Derrotar tu **primer jefe del día** da una recompensa única de cristales (se resetea por fecha, `player.lastBossCrystalDay`).
- Aparecen listados en un panel flotante (lado derecho del HUD) si tienen tiempo límite y están cerca, con distancia y cuenta regresiva; tocar la ficha centra la cámara ahí.

## 6) Combate de manada (PvE multi-enemigo)

- `startPackBattle(packMons)` crea estado con múltiples enemigos vivos.
- Se puede seleccionar objetivo.
- Soporta ataques single-target y AOE.
- Turno enemigo secuencial por cada miembro vivo de la manada.
- Recompensas agregadas por todos los enemigos derrotados.

## 7) Recompensas y loot

- Victoria otorga XP y oro con multiplicadores por tipo de enemigo.
- **Duplicar XP con oro**: tras ganar un combate normal, se puede pagar `~1.5x` el oro ganado en esa pelea para duplicar la XP obtenida; el bono queda resaltado en dorado directamente en la pantalla de resultado.
- Drop normal/élite/jefe con distinta probabilidad y cantidad.
- Puede otorgar: consumibles, ítems de stat permanente, equipables, botín especial de jefe.
- Si el inventario está lleno al recibir un objeto (de cualquier fuente — cofre, combate, misión, regalo), **nunca se bloquea el flujo**: se avisa con un mensaje y se pierde solo ese objeto puntual (`pushItemSafe`), el oro/XP/etc. se entrega igual.

## 8) Cofres del tesoro

- Aparecen cerca del jugador cada cierto tiempo (máx. 3 activos a la vez), con 4 rarezas ponderadas: Común (58%), Raro (27%), Épico (12%), Legendario (3%) — `CHEST_RARITIES`.
- Cada rareza da un rango de oro y XP, chance de un objeto (`rollLoot`), y **solo la rareza Legendario da cristales** (1-3).
- Tienen tiempo de vida (más corto cuanto más raros); si nadie los abre a tiempo, desaparecen solos.
- Hay que estar dentro de `ENGAGE_RANGE_M` para abrirlos.

## 9) Santuarios

- Tres tipos (`SHRINE_TYPES` en `world.js`): Guerrero (+ATK), Arcano (+AT.MÁG), Viento (+VEL) — el bono de velocidad no tiene efecto directo de combate actualmente (la velocidad no afecta cálculos de turno/daño en este juego).
- Se activan tocando el marcador estando cerca (`tryActivateShrine`); dan un bono temporal (`player.activeShrineBuff`) que se revierte solo al expirar (revisión perezosa vía `shrineBuffMultiplier`, no un timer aparte).
- Se reparten por ciudad junto a los centros comerciales (`shrinesFromMalls`).

## 10) Cristales (segunda moneda)

- Fuentes activas: cofres legendarios, primer jefe del día.
- Fuentes **no implementadas todavía** (requieren sistemas que no existen aún): logros persistentes, ranking semanal con reseteo, eventos, misiones "largas", pase gratuito.
- Usos activos: revivir en combate, espacio extra de inventario (progresivo: primeros 4 espacios con oro creciente 150/270/486/875, luego cristales fijos), espacio extra en el cofre de la base (cristales, precio creciente).
- Usos **no implementados todavía**: skins, cambiar apariencia, cosméticos (dependen de definir qué son visualmente).

## 11) Bases personales

- Se compran en la tienda (`BASE_PURCHASE_COST_GOLD = 500`, una sola vez por jugador) — la compra solo marca `player.hasBase = true`, **no** obliga a colocarla de inmediato.
- Desde el menú "🏠 Bases": si está "guardada" (comprada pero no desplegada), botón para desplegar; si ya está en el mapa, botones para entrar o **recogerla** (`BASE_PICKUP_COST_GOLD = 200`).
- Desplegar: primera vez gratis; cualquier despliegue posterior a una recogida cuesta `BASE_REDEPLOY_COST_GOLD = 150` (`player.baseEverPlaced` marca si ya se usó la gratuita).
- Colocación: se arma un modo de vista previa (marcador semitransparente que se mueve con cada toque del mapa) + dos botones flotantes (✕ cancelar, ✔ confirmar) — nada queda colocado hasta confirmar.
- Marcador en el mapa: emoji de casa con el nombre del dueño en una etiqueta arriba (`base-marker-simple`).
- Al entrar: pantalla de dos secciones (tu inventario arriba, cofre de la base abajo), cada objeto con botón "Pasar ⬇️/⬆️" para moverlo al otro lado. El cofre de la base tiene su propio límite (`BASE_STORAGE_SLOTS = 20`) ampliable con cristales.
- Otros jugadores ven la base en el mapa (sincronizada por PubNub, `PN_BASES_CHANNEL`) pero al tocarla solo reciben un aviso de quién es — no pueden entrar.

## 12) Modo Constructor (solo `Hacker994`)

- Botón visible únicamente si `player.name === "Hacker994"`.
- Permite: arrastrar torres/fogatas/santuarios/puntos de mejora para moverlos, tocarlos para borrarlos (con confirmación), y agregar nuevos de cada tipo tocando el mapa.
- Los cambios (`mapEdits = {moved, deleted, added}`) se comparten con **todos** los jugadores vía PubNub (`PN_MAP_EDITS_CHANNEL`) — no es una función solo-local. Ver `ARCHITECTURE.md §5-6` para el porqué de usar PubNub y no `AppStorage`.
- Los jefes **no** están incluidos en este sistema (son entidades que aparecen/desaparecen solas con el tiempo, no contenido fijo del mapa).
- Cualquier ciudad donde se quiera construir contenido debe existir primero en `CITY_REGISTRY` (`world.js`), o el contenido queda mal etiquetado bajo la ciudad de respaldo (`neiva`).

## 13) Guardianes de parque

- Cada parque tiene guardián con estado persistente: nivel fijo almacenado, cooldown tras derrota (`PARK_GUARDIAN_COOLDOWN_MS`).
- Primera victoria por parque entrega arma exclusiva por clase.
- Al derrotar guardianes de las 5 regiones, se habilita obtención de `Carta de Captura` (según estado).

## 14) Quests

## 14.1 Tutorial (`kill_count`)
- Se activa para niveles bajos. Objetivo: derrotar cierto número de enemigos (específico o genérico).

## 14.2 Quest de entrega de ítem
- NPC asigna monstruo objetivo + parque destino cercano.
- Se dibuja ruta (OSRM; fallback línea recta si falla/red ausente).
- Al acercarse al destino se fuerza spawn del objetivo.
- Al derrotarlo se obtiene ítem de misión y luego se entrega por tracker.

## 14.3 Cancelación
- Permite cancelar misión activa con limpieza de ruta/estado y pérdida de ítem de misión si ya fue obtenido.

## 15) Mascotas

## 15.1 Captura
- Requiere `capture_card` durante combate (**no se vende en la tienda** — se excluyó explícitamente de la categoría "Objetos especiales" para que no aparezca comprable).
- Solo éxito si objetivo está ≤20% de HP.
- La carta se consume siempre (éxito o fallo).

## 15.2 Uso en combate
- Se puede invocar mascota (actualmente 1 activa).
- Mascota aporta turno propio y/o bono de daño según lógica de combate.

## 15.3 Progresión
- Mascotas tienen XP, nivel, escalado por perfil de especie.
- Ítems de mascota permiten subir nivel fuera de combate.
- Existe panel de detalle, renombrar, curar y liberar.

## 16) Inventario, equipo y atributos

- **Inventario rediseñado como página completa** (no modal) — barra de recursos (oro/cristales), categorías, buscador + orden (rareza/nivel/poder/cantidad), tarjetas con estadística principal automática y cinta "EQUIPADO", modo de selección múltiple para vender en conjunto, y tarjeta "+" al final para comprar espacio extra.
- Detalle de un objeto: **comparación siempre visible** contra lo equipado en ese hueco (filas coloreadas verde/rojo por estadística); si no tienes nada puesto ahí todavía, lo avisa en vez de no mostrar nada.
- Límite real de inventario: 30 espacios base (antes solo era un número decorativo "/50" sin aplicar), ampliable de a uno (ver §10).
- Inventario agrupa por `id` de ítem. Tipos relevantes: heal, mana, stat, equip, capture_card, pet_item, quest.
- Equipo por slots: arma, armadura, casco, botas, accesorios (slots dinámicos por nivel). **Los huecos vacíos en el Perfil se pueden tocar** para abrir un selector con lo que tengas en el inventario para ese hueco, y equiparlo directo desde ahí.
- Mejoras de equipo hasta `+5` con costo escalado.
- Puntos de atributo distribuibles y reseteables.

## 17) HUD (barra superior)

- Simplificado para la pantalla de exploración: nombre, nivel, barras de vida/maná, oro/cristales en línea, GPS compacto. **ATK/AT.MÁG/DEF/VEL ya no se muestran aquí** (siguen existiendo y actualizándose en el código, solo se ocultaron de esta vista — se consultan en el Perfil).
- Barra contextual dinámica debajo del HUD principal: muestra jefe/enemigo/torre/fogata/tienda cercanos, o clima+hora si no hay nada relevante cerca — se actualiza sola cada pocos segundos y al moverte.

## 18) Tienda

### Tienda estática
- Comprar/vender por categorías. Catálogo de preview hasta nivel configurado para mostrar progresión futura.
- Incluye la tarjeta de compra de **Base personal** (ver §11).

### Comerciante errante
- Vende exclusivos (`EXCLUSIVE_TABLE`). Se retira al cerrar su modal.

### Vagabundo / estación de mejora
- Permiten recordar movimientos olvidados a cambio de oro. Estaciones también permiten mejora de equipo.

## 19) Multiplayer por proximidad

- Presencia en tiempo real con posición y stats resumidos.
- Marcadores de jugadores cercanos en mapa.
- Amigos: lista con punto verde (en línea, publicó presencia hace <90s) o rojo (desconectado) — reutiliza la misma caché de presencia, se refresca sola cada 10s mientras el panel está abierto.
- Interacciones: reto PvP, agregar amigo, invitar a grupo, regalo/intercambio (envía el objeto completo, no solo su id, para que funcione con cualquier tipo de objeto incluyendo los de la tienda rotativa), chat 1:1.

## 20) PvP por turnos (determinista)

- Diseño lockstep: cada cliente envía su movimiento, ambos resuelven localmente el mismo turno.
- Determinismo vía `seededRandom(battleId:turn)`.
- Incluye: prioridad por movimiento, desempate por velocidad + semilla, uso de ítems (heal/mana) gastando turno, rendición, apuesta previa de oro/ítems.

## 21) Grupo cooperativo

- Hasta `PARTY_MAX` miembros.
- El líder inicia combate de grupo.
- El enemigo se escala por tamaño de grupo (HP/ATK/DEF y factor de cantidad).
- Turnos sincronizados por mensajes `group_move`.
- Si falta movimiento de alguien, se resuelve por timeout.
- Tiene propuesta de huida por votación unánime de vivos.
- Incluye mecanismo de cierre forzado por pares para tolerar pérdida de mensajes.

## 22) Persistencia de mecánicas

Guardado incluye, entre otros:
- progreso del jugador, inventario/equipo/mejoras, mascotas,
- estado de guardianes/parques, quest activa, posición/zoom,
- oro, cristales, espacios extra de inventario,
- base propia (ubicación, cofre, espacios extra, si ya se desplegó alguna vez),
- registro de loot de jefes generado dinámicamente.

Esto permite continuidad entre sesiones sin recalcular progreso crítico. Los datos **compartidos con otros jugadores** (torres, bases de otros, Modo Constructor) NO viven en este guardado personal — se consultan en vivo por PubNub cada vez que hace falta (ver `ARCHITECTURE.md §5-6`).

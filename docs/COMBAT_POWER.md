# Capa 7 — Combat Power & Difficulty Director

Estado: **implementada**, con alcance deliberadamente acotado (ver §3). No es una capa del "Mapa
Vivo" (no depende de posición geográfica) — es una capa del sistema de progresión/dificultad, con
el mismo criterio de separación config + systems + integración liviana en `main.js`.

## 1) Objetivo

El nivel del jugador dejó de ser un buen indicador de dificultad por sí solo: dos jugadores del
mismo nivel pueden tener equipo/mascotas muy distintos. Esta capa agrega un **Combat Power (CP)**
interno — nunca mostrado al jugador — que sí considera equipo, mascotas y bonos pasivos, y un
**Difficulty Director** que lo usa para generar variedad de desafíos (normal/fuerte/élite/
legendario) en los lugares donde tiene sentido.

## 2) Combat Power (CP) — qué es y qué NO es

- Es un número **interno**, calculado por `combatPowerCalculator.js`, nunca mostrado en ninguna
  pantalla.
- **No es** el "Poder total" que ya existía en la hoja de personaje (`$("csPowerTotal")` en
  `main.js`) — esa cifra decorativa (`atk*3 + matk*3 + def*3 + spd*2 + maxHp*0.5 + maxMp*0.5`) no
  se tocó ni se reemplazó. El CP de esta capa es un cálculo aparte y más completo.
- Factores (todos con peso configurable en `config/combatPower.js`): nivel, atk, matk, def, maxHp,
  maxMp, spd, calidad de equipo (rareza × nivel de mejora de cada pieza equipada), mascotas del
  roster (hasta 2, las más fuertes), y bonos pasivos permanentes (`critBonus`, `lowHpShield`).
- Modular: cada factor es una función aparte en `combatPowerCalculator.js` — agregar un factor
  nuevo no obliga a tocar los demás.

## 3) Dónde se usa (y dónde NO) — decisión de alcance

El pedido original proponía usar Combat Power para generar enemigos en general; en una vuelta
posterior se acotó explícitamente a:

**SÍ usa Combat Power:**
- Eventos dinámicos (`buildEventEnemies` — Viajero Atacado / Cofre Custodiado / Emboscada).
- Coliseo: variante élite/legendaria opcional sobre las rondas normales (ver §5).
- Guardián de Parque (`getOrCreateParkGuardianState`) — el "jefe opcional" que el jugador reta por
  su cuenta, tocando el parque cuando quiere.

**NO usa Combat Power (sigue exactamente igual que antes):**
- Spawns ambientales normales del mapa (`spawnMonsters`).
- Jefe de zona ambiental (`maybeSpawnBoss`).
- Emboscadas al recolectar recursos (`maybeGatherAmbush`).
- Monstruos de misión (kill-count, entrega de ítem).

Esto es intencional, no un recorte por falta de tiempo: un jugador poderoso que vuelve a una región
inicial (ej. Bosque del Lobo Gris) debe seguir encontrando esos spawns ambientales fáciles — es la
"sensación de progreso" que pide el diseño. Quien quiera un reto real tiene los eventos, el
Coliseo, o el Guardián de Parque, todos con Combat Power real detrás. Las regiones mantienen su
identidad (`REGION_LEVEL_RANGE` en `regions.js`, sin tocar); esta capa solo agrega, en paralelo,
`REGION_RECOMMENDED_CP` (`config/difficultyProfiles.js`) como referencia informativa (no
bloqueante — nadie la consulta todavía para impedir nada, lista para una futura pantalla de mapa
o de selección de región).

## 4) Arquitectura

```text
combatPowerCalculator.js   (CP real del jugador — stats + equipo + mascotas + pasivas)
        ↓
difficultyDirector.js      (sortea variante normal/strong/elite/legendary + CP objetivo)
        ↓
powerScaling.js            (traduce ese CP objetivo a un NIVEL concreto — espejo de makeMonster)
        ↓
enemyPowerGenerator.js     (compone todo lo anterior — único punto de entrada)
        ↓
main.js                    (rollCombatPowerChallenge() — llama a lo anterior, sigue usando
                             makeMonster(tpl, level, ...) exactamente igual que siempre)

rewardDifficulty.js        (multiplicador de recompensa por variante — arquitectura lista,
                             NADIE lo aplica todavía a oro/xp/loot reales)
```

- `config/combatPower.js`: pesos del cálculo de CP (`COMBAT_POWER_STAT_WEIGHTS`,
  `EQUIPMENT_QUALITY_CONFIG`, `PET_POWER_CONFIG`, `PASSIVE_BONUS_WEIGHTS`).
- `config/difficultyProfiles.js`: `DIFFICULTY_TIERS` (variantes + pesos + rango de CP relativo),
  `REWARD_MULTIPLIER_BY_TIER`, `REGION_RECOMMENDED_CP`.
- `systems/combatPowerCalculator.js`: `computeCombatPower(player, deps)` y sus piezas
  (`computeStatScore`, `computeEquipmentQualityScore`, `computePetPowerScore`,
  `computePassiveBonusScore`) — todas funciones puras.
- `systems/difficultyDirector.js`: `rollDifficultyTier`, `computeTargetCPRange`, `pickTargetCP`,
  `rollDifficulty` — sorteo puro, `rng` inyectable para pruebas determinísticas.
- `systems/powerScaling.js`: `estimateMonsterStats`/`estimateMonsterCP` (espejo de propósito,
  de solo lectura, de la fórmula real de `makeMonster()` en `main.js` — nunca la reemplaza) y
  `findLevelForTargetCP` (búsqueda binaria, ya que el CP es monótono creciente en nivel).
- `systems/enemyPowerGenerator.js`: `generateEnemyChallenge(player, tpl, config, rng)` — el único
  punto de entrada que el resto del juego debería usar. Devuelve `{level, tier, targetCP,
  playerCP}`; quien lo llama sigue usando `makeMonster(tpl, level, ...)` sin cambios.
- `systems/rewardDifficulty.js`: `getRewardMultiplier(tierKey, table)` — lookup puro, listo pero
  no conectado a ninguna recompensa real todavía.

Mismo contrato que el resto de capas por systems: funciones puras, reciben todo por parámetro
(jugador, config, plantilla), nunca importan `player`/`map`/DOM directamente. `main.js` es el único
que las conecta con el juego real, vía `rollCombatPowerChallenge(tpl)` (helper único, config
central `COMBAT_POWER_DIRECTOR_CONFIG`, reutilizado por los tres puntos de integración).

## 5) Integración real en `main.js`

- **`buildEventEnemies`**: cada enemigo de un evento dinámico sortea su propia variante y nivel vía
  `rollCombatPowerChallenge(tpl)`, en vez del viejo `player.level ± offset`. Con varios enemigos
  por evento (manadas), cada uno puede salir con una variante distinta — variedad real dentro del
  mismo evento.
- **`getOrCreateParkGuardianState`**: el nivel fijo del guardián (al crearse por primera vez, y al
  regenerarse tras el cooldown de 1 hora) sale de `rollCombatPowerChallenge`, no de
  `player.level + 3`.
- **`startColiseoRound`**: la curva de dificultad por ronda existente **no se tocó** (calentamiento
  rondas 1-4, escalado + manada + jefe cada 5 rondas desde la 5). Solo en las rondas normales
  (no jefe fijo, no manada) se sortea además una variante — si sale élite o legendaria, el nivel ya
  calculado por la curva sube un poco más (+2 / +5) como un extra, con una insignia en el log de
  batalla (`⭐`/`👑✨`). El jefe fijo periódico de la curva nunca se convierte en un "clon" del
  jugador — sigue siendo el mismo `BOSS_TEMPLATES` de siempre.

## 6) Qué NO cambia con esta capa

- No se modificó el combate (daño, turnos, procs, durabilidad).
- No se modificó la economía (oro/xp/loot siguen exactamente igual — `RewardDifficulty` existe
  pero no está conectada a ninguna recompensa real).
- No se modificó el inventario ni la progresión (niveles, quests, medallas).
- No se modificaron `spawnMonsters`, `maybeSpawnBoss`, `maybeGatherAmbush`, ni los monstruos de
  misión — siguen ligados al nivel del jugador exactamente igual que antes.
- No se modificó ninguna capa del Mapa Vivo (`biomes.js`, `regions.js`, `ecosystemEngine.js`, etc.)
  ni el "Poder total" ya existente en la hoja de personaje.

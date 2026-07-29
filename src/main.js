/* ============================================================
   RONDA — demo RPG con GPS real (single-file)
   ============================================================ */

import {
  CLASSES,
  ULTIMATE_MOVES,
  ULTIMATE_TIER_NAMES,
  ULTIMATE_TIER_MULT,
  ULTIMATE_TIER_COST,
  ULTIMATE_UNLOCK_LEVEL,
  ULTIMATE_TIER2_LEVEL,
  ULTIMATE_TIER3_LEVEL,
  ULTIMATE_TIER_HP_COST,
  CLASS_ID_MAP,
} from "./game/config/classes.js";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { isGpsSupported, gpsGetCurrentPosition, gpsWatchPosition, gpsClearWatch } from "./game/systems/nativeGeolocation.js";
import { writeAndShareTextFile, pickAndReadTextFile } from "./game/systems/saveTransfer.js";
import { INVENTORY_CAPACITY_TIERS, INVENTORY_TIER_COST } from "./game/config/inventoryCapacity.js";
import { CRAFT_MATERIALS, BLACKSMITH_RECIPES } from "./game/config/blacksmith.js";
import { CITY_REGISTRY, DEFAULT_CITY_KEY, SHRINE_TYPES, POI_TYPES, getCityPOIs } from "./game/config/world.js";
import {
  DYNAMIC_ENTITY_STATE, DYNAMIC_ENTITY_TYPES, buildCandidateLocations, pickValidCandidateLocation,
  createDynamicEntity, entityStateNow, formatEntityTimeLeft, buildTradeInventory,
} from "./game/systems/dynamicWorld.js";
import {
  EVENT_STATE, EVENT_TYPES, EVENT_LIMITS, rollEventReward, isEventLocationValid,
  createWorldEvent, eventStateNow, formatEventTimeLeft,
} from "./game/systems/randomEvents.js";
import { BIOME_KEYS, BIOMES } from "./game/config/biomes.js";
import { queryEcosystem, getBiomeAt, classifyBiomeForZone, classifyBiomeForPark } from "./game/systems/ecosystemEngine.js";
import { VISIBILITY_PRIORITY, VISIBILITY_DISTANCES, ENTITY_VISIBILITY } from "./game/config/visibility.js";
import { isEntityVisible, diffVisibility } from "./game/systems/visibilityEngine.js";
import { buildRegionsForCity, detectRegionAt } from "./game/systems/regionManager.js";
import { OSM_QUERY_CONFIG } from "./game/config/osm.js";
import { createOsmStore } from "./game/systems/osmMapCache.js";
import { refreshWorldGeoData, getZoneType, getNearbyFeatures, hasNearbyFeature, getBiomeHint } from "./game/systems/geoWorldAdapter.js";
import { COMBAT_POWER_STAT_WEIGHTS, EQUIPMENT_QUALITY_CONFIG, PET_POWER_CONFIG, PASSIVE_BONUS_WEIGHTS } from "./game/config/combatPower.js";
import { DIFFICULTY_TIERS, DANGER_ZONE_DIFFICULTY_TIERS, REWARD_MULTIPLIER_BY_TIER, REGION_RECOMMENDED_CP } from "./game/config/difficultyProfiles.js";
import { computeCombatPower } from "./game/systems/combatPowerCalculator.js";
import { generateEnemyChallenge } from "./game/systems/enemyPowerGenerator.js";
import { getRewardMultiplier } from "./game/systems/rewardDifficulty.js";
import { DANGER_ZONE_CONFIG, DANGER_ZONE_GENERATION_MODE } from "./game/config/dangerZones.js";
import { generateDangerZone, isPointInDangerZone, dangerZoneLabelPoint } from "./game/systems/dangerZonePolygonizer.js";
import { getBattleSceneConfig, DEFAULT_BATTLE_SCENE_ID } from "./game/config/battleScenes.js";
import {
  positionEntityOnStage, resetEntityPosition, createPerspectiveShadow,
  pickGroundAnchor, pickFlyingAnchor, pickPackClusterAnchor,
} from "./game/systems/battlePerspective.js";
import {
  MONSTER_TEMPLATES,
  BOSS_TEMPLATES,
  PROC_LABELS,
  BOSS_LOOT_THEMES,
  VAGABUNDO_TEMPLATE,
  VAGABUNDO_COST,
  LOBO_NOCTURNO_TEMPLATE,
  LOBO_SOMBRIO_TEMPLATE,
  PACK_BUFF_ABILITIES,
} from "./game/config/enemies.js";
import {
  ITEM_TABLE,
  PET_ITEM_TABLE,
  TEST_SHOP_ITEMS,
  RARITY_TIERS,
  RARITY_BY_KEY,
  STAT_LABEL,
  LEVEL_TIERS,
  WEAPON_BASE,
  ARMOR_BASE,
  HELMET_BASE,
  BOOTS_BASE,
  ACCESSORY_BASES,
  ARCHER_ACCESSORY_BASES,
  DAGGER_BASE,
  SHIELD_BASE,
  BOOK_TABLE,
  BOSS_BOOK_TABLE,
  EQUIP_TABLE,
  RARITY_REQ_OFFSET,
  EQUIP_SLOTS,
  EXCLUSIVE_TABLE,
  ROTATING_WEAPON_POOL,
  EQUIP_UPGRADE_MAX,
  ATTR_DEFS,
  SHOP_CATEGORIES,
  SHOP_PREVIEW_LEVEL_CAP,
  GIFT_CODES,
} from "./game/config/items.js";
import {
  DISTANCE_MEDALS,
  ZONE_EXPLORE_TARGET_M,
  QUEST_TEMPLATES,
  TUTORIAL_QUEST_TEMPLATES,
  BOSS_LIFESPAN_MS,
  ULTIMATE_CHARGE_MS,
  PARK_GUARDIAN_COOLDOWN_MS,
} from "./game/config/progression.js";
import { PET_SPECIES_PROFILES, DEFAULT_PET_PROFILE, PET_MOVESETS, DEFAULT_PET_MOVESET, SUMMONABLE_PET_SPECIES } from "./game/config/pets.js";
import { DUNGEON_REGISTRY, DUNGEON_BOSS_TEMPLATES, DUNGEON_LOOT_RARITY_WEIGHTS, DUNGEON_AURA_ENEMY_TEMPLATES, getDungeonDef } from "./game/config/dungeons.js";
import {
  PN_BATTLE_PREFIX,
  PN_PARTY_PREFIX,
  PN_LOOKUP_CHANNEL,
  PN_ANNOUNCE_CHANNEL,
  PARTY_MAX,
  PN_PRESENCE_CHANNEL,
  PN_STALE_MS,
} from "./game/config/multiplayer.js";
import {
  THIEF_SPRITES,
  VAGABUNDO_SPRITES,
  WANDERING_MERCHANT_SPRITES,
  VETERANO_SPRITES,
  CAZADOR_SPRITES,
  TRAVELER_ATTACKED_SPRITES,
  LOBO_SOMBRIO_SPRITES,
  LOBO_UMBRIO_SPRITES,
  CUERVO_CORRUPTO_SPRITES,
  DEMONIO_MENOR_SPRITES,
  GOLEM_ROCA_SPRITES,
  DRAGON_MENOR_SPRITES,
  DRAGON_ANCESTRAL_SPRITES,
  LOBO_NOCTURNO_SPRITES,
  RATA_MUTANTE_SPRITES,
  SLIME_SALVAJE_SPRITES,
  ESPECTRO_SPRITES,
  CLASS_PORTRAITS,
  CLASS_WALK_SPRITES,
  CLASS_BATTLE_SPRITES,
  CLASS_MAGIC_CIRCLE_SPRITES,
  ARMOR_ICON_PATH,
  ESPADA_LUNAR_ICON_PATH,
  DUNGEON_PORTAL_SPRITES,
  SENOR_OSCURO_SPRITES,
  DEMONIO_OSCURO_SPRITES,
  SABUESO_OSCURO_SPRITES,
  GUERRERO_BATTLE_SPRITES,
  MAGO_BATTLE_SPRITES,
  BERSERKER_BATTLE_SPRITES,
  ARQUERO_BATTLE_SPRITES,
  CHAR_SELECT_ART,
} from "./game/assets/spriteRegistry.js";
import { createDailyMissionsService } from "./game/systems/dailyMissions/dailyMissionsService.js";
import { createAdventurerContractsService } from "./game/systems/adventurerContracts/adventurerContractsService.js";
import { REPUTATION_RANKS, CONTRACT_DURATION_MS_BY_DIFFICULTY } from "./game/config/adventurerContracts.config.js";
import { gameEventBus } from "./game/systems/eventBus/gameEventBus.js";

// Registro del service worker mínimo (public/sw.js) — solo existe para que el navegador considere
// el juego "instalable" como PWA (ver public/manifest.webmanifest), no cachea nada por su cuenta.
// Nunca corre en un entorno sin soporte (iframes de vista previa, navegadores viejos), por eso el
// chequeo de feature-detection en vez de asumir que existe.
if("serviceWorker" in navigator){
  window.addEventListener("load", ()=>{
    navigator.serviceWorker.register("./sw.js").catch(e=> console.warn("[PWA] No se pudo registrar el service worker:", e));
  });
}

// Esconde la splash nativa (#nativeSplashCover en index.html — HTML/CSS normal, ya visible desde
// el primer instante gracias al script inline síncrono, ver ese archivo) pasado un tiempo fijo.
// A propósito NO se usa SplashScreen.show() de @capacitor/splash-screen para esto: es una llamada
// ASÍNCRONA al puente nativo — el resto de la página (selección de personaje) podía terminar de
// pintarse ANTES de que esa llamada realmente mostrara algo, dando el bug real reportado ("splash,
// parpadeo, selección de personaje, y recién ahí aparece el splash" — llegaba tarde, después de
// que el juego ya se había mostrado). Con HTML/CSS puro no hay ida y vuelta al puente nativo, así
// que no hay ninguna carrera posible: se pinta en el mismo instante que el resto de la página.
if(Capacitor.isNativePlatform()){
  const splashCover = document.getElementById("nativeSplashCover");
  if(splashCover){
    setTimeout(()=>{
      splashCover.classList.add("hide");
      setTimeout(()=> splashCover.remove(), 320);
    }, 1800);
  }
}

// El Lobo Umbrío ya tenía arte de combate propio, pero en el mapa seguía cayendo al emoji 🐺
// genérico (MONSTER_TEMPLATES se mantiene como datos puros, sin importar spriteRegistry.js — ver
// nota en DUNGEON_AURA_ENEMY_MAP_SPRITES) — se le asigna su ilustración de marcador acá, una sola
// vez, así makeMonster() la toma directo de tpl.mapSprite para TODO spawn de esta especie
// (normal, emboscada, evento de mundo, misión, manada).
{
  const loboUmbrioTpl = MONSTER_TEMPLATES.find(t=>t.name==="Lobo Umbrío");
  if(loboUmbrioTpl) loboUmbrioTpl.mapSprite = LOBO_UMBRIO_SPRITES.map;
  const demonioMenorTpl = MONSTER_TEMPLATES.find(t=>t.name==="Demonio Menor");
  if(demonioMenorTpl) demonioMenorTpl.mapSprite = DEMONIO_MENOR_SPRITES.map;
  const cuervoCorruptoTpl = MONSTER_TEMPLATES.find(t=>t.name==="Cuervo Corrupto");
  if(cuervoCorruptoTpl) cuervoCorruptoTpl.mapSprite = CUERVO_CORRUPTO_SPRITES.map;
  const slimeSalvajeTpl = MONSTER_TEMPLATES.find(t=>t.name==="Slime Salvaje");
  if(slimeSalvajeTpl) slimeSalvajeTpl.mapSprite = SLIME_SALVAJE_SPRITES.map;
  const rataMutanteTpl = MONSTER_TEMPLATES.find(t=>t.name==="Rata Mutante");
  if(rataMutanteTpl) rataMutanteTpl.mapSprite = RATA_MUTANTE_SPRITES.map;
}

/** Construye la versión del movimiento definitivo para un nivel de evolución (1, 2 o 3). */
function buildUltimateMoveForTier(base, tier){
  const hpCost = ULTIMATE_TIER_HP_COST[tier-1];
  const costLine = tier===3
    ? "consume TODO tu maná actual"
    : `consume TODO tu maná actual y ${Math.round(hpCost*100)}% de tu HP máximo`;
  return {
    id: base.id, // mismo id en sus 3 etapas — así sabemos que sigue siendo "la misma" habilidad evolucionando
    name: `${base.baseName} ${ULTIMATE_TIER_NAMES[tier-1]}`,
    type: base.type,
    power: +(base.basePower * ULTIMATE_TIER_MULT[tier-1]).toFixed(2),
    hits: base.hits, aoe: base.aoe, crit: base.crit, pierce: base.pierce,
    execute: base.execute, selfDmg: base.selfDmg, drain: base.drain,
    cost: ULTIMATE_TIER_COST[tier-1],
    costsAllMp: tier===3,
    hpCost, // 0.40 en fase I, 0.25 en fase II, 0 en fase Maestro
    isUltimate: true,
    tier,
    desc: tier===3
      ? "El movimiento definitivo — daño devastador, consume TODO tu maná actual."
      : `Movimiento especial de tu clase — ${costLine}. Evoluciona solo en Nv.${tier===1?ULTIMATE_TIER2_LEVEL:ULTIMATE_TIER3_LEVEL}.`
  };
}
/** Costo real de un movimiento en el momento de usarlo (los definitivos en su forma final cuestan TODO el maná). */
function getMoveCost(mv, currentMp){
  return mv.costsAllMp ? currentMp : (mv.cost||0);
}
/** Ataque de respaldo que nunca cuesta maná — así ningún personaje se queda sin poder actuar. */
const BASIC_ATTACK_MOVE = {id:"basic_attack", name:"Golpe Básico", power:0.85, type:"phys", cost:0};

/** ¿Alcanza el maná (y, si aplica, la vida) actual para este movimiento? Los definitivos en fase I/II también
 *  cuestan un % de tu HP máximo — si no te alcanza para sobrevivir al costo, el botón aparece deshabilitado. */
function canAffordMove(mv, currentMp, currentHp, maxHp){
  const mpOk = mv.costsAllMp ? currentMp > 0 : currentMp >= (mv.cost||0);
  if(!mpOk) return false;
  if(mv.hpCost && currentHp!=null && maxHp!=null){
    const hpNeeded = Math.round(maxHp * mv.hpCost);
    if(currentHp <= hpNeeded) return false; // no te puede dejar en 0 o menos
  }
  return true;
}
/** Revisa si toca desbloquear o evolucionar el movimiento definitivo en el nivel actual. Se llama en cada level-up. */
function maybeHandleUltimateProgression(){
  const pool = ULTIMATE_MOVES[player.classKey] || [];
  if(pool.length===0) return null;
  if(player.level === ULTIMATE_UNLOCK_LEVEL && !player.ultimateMove){
    const base = pool[Math.floor(Math.random()*pool.length)];
    player.ultimateBaseId = base.id;
    player.ultimateMove = buildUltimateMoveForTier(base, 1);
    return {type:'ultimate_unlocked', move: player.ultimateMove};
  }
  if(player.level === ULTIMATE_TIER2_LEVEL && player.ultimateMove && player.ultimateMove.tier===1){
    const base = pool.find(b=>b.id===player.ultimateBaseId);
    if(base){ player.ultimateMove = buildUltimateMoveForTier(base, 2); return {type:'ultimate_evolved', move: player.ultimateMove}; }
  }
  if(player.level === ULTIMATE_TIER3_LEVEL && player.ultimateMove && player.ultimateMove.tier===2){
    const base = pool.find(b=>b.id===player.ultimateBaseId);
    if(base){ player.ultimateMove = buildUltimateMoveForTier(base, 3); return {type:'ultimate_evolved', move: player.ultimateMove}; }
  }
  return null;
}
/** Revisa si toca desbloquear la pasiva Desangrar del Berserker en el nivel actual — mismo criterio
 *  que maybeHandleUltimateProgression (el nivel solo sube, así que esto dispara una única vez). No
 *  hace falta guardar ninguna bandera propia: hasBerserkerBleedPassive() ya se calcula al vuelo a
 *  partir de player.level, esto es solo para el aviso de "la acabás de desbloquear". */
function maybeHandleBerserkerBleedUnlock(){
  if(player.classKey === "berserker" && player.level === BERSERKER_BLEED_UNLOCK_LEVEL){
    return {type:"desangrar_unlocked"};
  }
  return null;
}
/** Cuánta vida (en puntos) cuesta usar este movimiento, según el % de HP MÁXIMO que le toque en su fase actual. */
function getMoveHpCost(mv, maxHp){
  return mv.hpCost ? Math.round(maxHp * mv.hpCost) : 0;
}
/** Todos los movimientos que el jugador puede usar en combate (los 4 normales + el definitivo, si ya lo tiene). */
function getAllUsableMoves(){
  return player.ultimateMove ? [...player.moves, player.ultimateMove] : player.moves;
}

/* ============================================================
   ZONAS DE NEIVA, HUILA — dividen el mapa en 5 regiones reales de la ciudad.
   Nota de honestidad: los centros de Centro/Norte/Sur/Oriente/Occidente están
   ubicados con la orientación real de cada sector (ríos, comunas, aeropuerto,
   barrios) que describe la ciudad, pero como círculos aproximados — no son los
   polígonos exactos de las comunas oficiales (no tengo ese archivo geográfico).
   Parque Santander sí tiene sus coordenadas reales exactas.
   ============================================================ */

function getCurrentZone(){
  if(!playerLatLng) return null;
  let best = null, bestD = Infinity;
  NEIVA_ZONES.forEach(z=>{
    const d = distMeters(playerLatLng, z.center);
    if(d <= z.radius && d < bestD){ best = z; bestD = d; }
  });
  return best;
}
/** Última zona (por `key`) en la que se hizo la poda de abajo — `null` hasta el primer chequeo
 *  real, así el primer ingreso a una zona (arranque de partida) nunca poda nada de golpe. */
let lastPrunedZoneKey = null;
/** Al cruzar de una zona de la ciudad a otra, los monstruos del mundo abierto que ya NO
 *  pertenecen al pool de la zona nueva (ver monsterNames en world.js) se van dispersando pronto
 *  en vez de convivir 5-7 min con los recién aparecidos — así no se mezclan tipos de dos regiones
 *  distintas caminando unas cuadras. Nunca toca NPCs especiales/jefes/emboscadas de recolección
 *  (esos no llevan `envSpawn`, ver spawnMonsters/spawnPack). */
function pruneOutOfZoneMonsters(zone){
  const allowed = zone.monsterNames;
  let pruned = 0;
  const now = Date.now();
  monsters.forEach(m=>{
    if(!m.envSpawn || m.isBoss || allowed.includes(m.tpl.name)) return;
    const fadeMs = 20000 + Math.random()*10000; // 20-30s más, no un corte seco
    if((m.spawnedAt + m.lifespanMs) - now > fadeMs){
      m.lifespanMs = (now - m.spawnedAt) + fadeMs;
      pruned++;
    }
  });
  if(pruned > 0) toast(`🗺️ Te alejaste de esa región — sus enemigos se van dispersando.`, 2800);
}
function checkZoneDiscovery(){
  const zone = getCurrentZone();
  if(zone && zone.key !== lastPrunedZoneKey){
    if(lastPrunedZoneKey !== null) pruneOutOfZoneMonsters(zone);
    lastPrunedZoneKey = zone.key;
  }
  if(!zone || !player) return;
  if(!player.visitedZones) player.visitedZones = [];
  if(!player.visitedZones.includes(zone.key)){
    player.visitedZones.push(zone.key);
    gameEventBus.emit({ type: "REGION_ENTERED", payload: { amount: 1 }, dedupeKey: zone.key });
    toast(`🗺️ ¡Nueva región descubierta: ${zone.name}!`, 4000);
    saveGame();
  }
}

/* ============================================================
   ZONAS PELIGROSAS — CADA región de la ciudad actual tiene su propia "zona peligrosa", sorteada
   CADA DÍA (misma ubicación para todos los jugadores ese día, mismo criterio que ya usa la Oferta
   Semanal vía seededPick). Los enemigos que aparecen caminando DENTRO de esa zona escalan por
   Combat Power real (rollDangerZoneChallenge) en vez de por nivel plano — para que sean un reto de
   verdad sin importar qué tan equipado esté el jugador. NEIVA_ZONES ya apunta a las zonas de la
   ciudad ACTUAL (se reasigna en detectCityAndLoadWorldData), así que esto funciona igual en
   cualquier ciudad.

   La FORMA de la zona ahora es la manzana real (o varias manzanas contiguas), formada a partir de
   las calles reales de OpenStreetMap — ver ../game/systems/dangerZonePolygonizer.js. Esa consulta
   es asíncrona (Overpass, con cache/reintentos propios) y puede tardar unos segundos o fallar del
   todo (sin internet, servidor caído, red vial insuficiente en ese punto) — por eso cada zona
   arranca con un rectángulo de respaldo (instantáneo, alineado a una cuadrícula calle/carrera
   aproximada) que se ve de inmediato, y se REEMPLAZA en el mapa por la manzana real en cuanto esa
   consulta termina (si termina bien). El jugador nunca ve "nada" mientras tanto, y el juego nunca
   se bloquea esperando una respuesta de red.
   ============================================================ */
/** Tamaño del rectángulo de respaldo — más chico que la manzana típica (~90-100m), para que se
 *  note la diferencia con la forma real cuando esta llega (pedido explícito: "usa una forma más
 *  chica" para el fallback). */
const DANGER_BLOCK_HALF_WIDTH_M = DANGER_ZONE_CONFIG.fallbackHalfWidthM;
const DANGER_BLOCK_HALF_HEIGHT_M = DANGER_ZONE_CONFIG.fallbackHalfHeightM;
/** Hash simple y estable de un string a un entero — la semilla del día se combina con la ciudad y
 *  la zona para que cada región elija un punto distinto (y no todas caigan en el mismo lugar
 *  relativo dentro de su propio radio). */
function hashStr(s){
  let h = 0;
  for(let i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
/** Día calendario como entero — sube de a uno cada medianoche UTC, igual para todos los jugadores. */
function getDayNumber(){ return Math.floor(Date.now()/86400000); }
/** Generador con semilla — mismo LCG que ya usa seededPick(), reutilizado acá para sacar ángulo y
 *  distancia deterministas (misma cuadra para todos los jugadores el mismo día). */
function makeSeededRng(seed){
  let s = seed;
  return ()=>{ s = (s*9301+49297)%233280; return s/233280; };
}
/** Esquinas (4 puntos lat/lng, en orden) de un rectángulo `halfWidthM`×`halfHeightM` centrado en
 *  `center` y rotado `bearingDeg` grados (0 = alineado norte-sur) — reutiliza pointAtBearing() para
 *  cada esquina en vez de sumar/restar grados de lat/lng directo, así la rotación queda correcta
 *  sin duplicar la trigonometría. Solo se usa para el rectángulo de RESPALDO — la manzana real ya
 *  viene como polígono hecho desde dangerZonePolygonizer.js. */
function rotatedRectCorners(center, halfWidthM, halfHeightM, bearingDeg){
  const localCorners = [[-halfWidthM,-halfHeightM],[halfWidthM,-halfHeightM],[halfWidthM,halfHeightM],[-halfWidthM,halfHeightM]];
  return localCorners.map(([east,north])=>{
    const dist = Math.hypot(east, north);
    if(dist === 0) return {lat:center.lat, lng:center.lng};
    const localBearing = Math.atan2(east, north) * 180/Math.PI; // rumbo de la esquina SIN rotar
    return pointAtBearing(center, dist, localBearing + bearingDeg);
  });
}
/** Un array de puntos {lat,lng} (esquinas de rotatedRectCorners(), o un trazo a mano del Modo
 *  Constructor — a esta función le da igual el origen) como un GeoJSON Feature<Polygon>
 *  (coordenadas [lng,lat], anillo cerrado) — así el rectángulo de respaldo, la manzana real de
 *  dangerZonePolygonizer.js y la zona trazada a mano comparten la MISMA forma de dato en todo lo
 *  demás (dibujado en el mapa, chequeo de "¿está adentro?"), sin un camino especial por origen. */
function pointsToPolygonFeature(points){
  const ring = points.map(c=> [c.lng, c.lat]);
  ring.push(ring[0]);
  return { type:"Feature", properties:{}, geometry:{ type:"Polygon", coordinates:[ring] } };
}
/** Separación aproximada entre calle y calle (o carrera y carrera) en una cuadrícula urbana
 *  colombiana típica — no es exacta cuadra por cuadra, pero alcanza para que el rectángulo de
 *  RESPALDO "encaje" con la traza real de la ciudad en vez de flotar en cualquier punto intermedio,
 *  mientras se espera (o si falla del todo) la manzana real. */
function snapToStreetGrid(point, anchor, stepM){
  const dist = distMeters(anchor, point);
  if(dist < 1) return {lat:anchor.lat, lng:anchor.lng};
  const brg = bearingBetween(anchor, point) * Math.PI/180;
  const east = Math.round((dist*Math.sin(brg))/stepM) * stepM;
  const north = Math.round((dist*Math.cos(brg))/stepM) * stepM;
  const snappedDist = Math.hypot(east, north);
  if(snappedDist < 1) return {lat:anchor.lat, lng:anchor.lng};
  return pointAtBearing(anchor, snappedDist, Math.atan2(east, north) * 180/Math.PI);
}
/** Construye el rectángulo de respaldo de una zona — instantáneo, sin red. */
function buildFallbackDangerBlock(zone, center, bearing){
  const corners = rotatedRectCorners(center, DANGER_BLOCK_HALF_WIDTH_M, DANGER_BLOCK_HALF_HEIGHT_M, bearing||0);
  return {
    key: zone.key, name: zone.name, center, bearing: bearing||0,
    polygon: pointsToPolygonFeature(corners),
    generationMode: DANGER_ZONE_GENERATION_MODE.ROAD_ALIGNED_FALLBACK,
  };
}
/** Clave de mapEdits.dangerZones para la zona `zoneKey` de la ciudad `cityKey` — con ciudad
 *  incluida porque zonas de ciudades DISTINTAS pueden compartir el mismo `key` (ej. "centro" existe
 *  en varias ciudades de CITY_REGISTRY) y no deberían pisarse entre sí. */
function dangerZoneManualKey(cityKey, zoneKey){ return `${cityKey}:${zoneKey}`; }
/** Construye la zona a partir de un trazo guardado en Modo Constructor — nunca se re-sortea ni se
 *  pisa con el resultado de Overpass (ver rollTodaysDangerZones). El "centro" visual (insignia,
 *  ancla del rótulo) es el punto medio del trazo, ya que no hay rectángulo ni manzana real de la
 *  que sacar uno con dangerZoneLabelPoint(). */
function buildManualDangerBlock(zone, points){
  const avgLat = points.reduce((s,p)=> s+p.lat, 0) / points.length;
  const avgLng = points.reduce((s,p)=> s+p.lng, 0) / points.length;
  return {
    key: zone.key, name: zone.name, center: {lat:avgLat, lng:avgLng}, bearing: 0,
    polygon: pointsToPolygonFeature(points),
    generationMode: DANGER_ZONE_GENERATION_MODE.MANUAL,
  };
}
/** [{key, name, center, bearing, polygon, generationMode}] — una entrada por CADA zona de la
 *  ciudad actual. Arranca con el rectángulo de respaldo (ver buildFallbackDangerBlock) y
 *  rollTodaysDangerZones() dispara, además, la consulta real en segundo plano (ver
 *  regenerateDangerZoneBlock) que reemplaza `polygon`/`generationMode` por la manzana real si la
 *  consulta termina bien. */
let dangerBlocksToday = [];
/** Un AbortController por zona (clave = zone.key) para la consulta Overpass en curso — se cancela
 *  cada vez que se vuelve a sortear (nuevo día, cambio de ciudad) para no dejar una consulta vieja
 *  compitiendo con la nueva ni pisándole el resultado si termina después. */
let dangerZoneAbortControllers = {};
/** Sube cada vez que rollTodaysDangerZones() corre — cada llamada async de regenerateDangerZoneBlock
 *  guarda con qué época arrancó, y si para cuando termina la época global ya cambió, descarta su
 *  propio resultado en silencio (mismo efecto que abortar, pero también cubre el caso de una
 *  respuesta que ya venía en camino cuando se pidió el abort). */
let dangerZoneGenerationEpoch = 0;
/** ¿Se debe mostrar la capa de depuración visual (calles usadas, nodos, candidatos, seleccionados)?
 *  Activarla a mano desde la consola: `window.DANGER_ZONE_DEBUG = true`. Pedido explícito ("agrega
 *  una opción de debug para mostrar..."), pensada para desarrollo, no para el jugador final. */
function dangerZoneDebugEnabled(){ return !!window.DANGER_ZONE_DEBUG; }

/** Pide la manzana real para `block` (ya con su rectángulo de respaldo puesto) y, si la consulta
 *  termina bien Y nadie volvió a sortear el día mientras tanto (mismo epoch), reemplaza su
 *  polígono y vuelve a dibujar. Nunca lanza — un fallo (red, polygonize sin resultado) deja el
 *  rectángulo de respaldo tal cual, ya alineado a la cuadrícula (generationMode se queda en
 *  "road-aligned-fallback", como pide el punto 17 del pedido). */
async function regenerateDangerZoneBlock(block, epoch){
  const controller = (typeof AbortController !== "undefined") ? new AbortController() : null;
  if(controller) dangerZoneAbortControllers[block.key] = controller;
  const { result, debug, layers } = await generateDangerZone(block.center, "small", DANGER_ZONE_CONFIG, {
    fetchImpl: fetch, signal: controller ? controller.signal : undefined,
    includeDebugLayers: dangerZoneDebugEnabled(),
  });
  console.log(`[ZonaPeligrosa] ${block.key}:`, debug);
  if(epoch !== dangerZoneGenerationEpoch) return; // el jugador ya cambió de ciudad/día — resultado descartado
  // si Hacker994 trazó (o quitó) esta zona a mano MIENTRAS esta consulta estaba en vuelo, eso manda
  // — nunca pisar un trazo/borrado más nuevo con una respuesta de Overpass que arrancó antes.
  if((mapEdits.dangerZones||{})[dangerZoneManualKey(currentCityKey, block.key)]) return;
  const live = dangerBlocksToday.find(b=> b.key === block.key);
  if(!live) return; // la zona ya no existe en la lista actual (no debería pasar, pero por las dudas)
  if(result){
    live.polygon = result.polygon;
    live.generationMode = result.generationMode;
    live.center = dangerZoneLabelPoint(result.polygon); // el centro visual ahora es el de la manzana real, no el del rectángulo
  } // si no hay result, se queda con el rectángulo de respaldo (generationMode ya es road-aligned-fallback)
  if(dangerZoneDebugEnabled()){
    live.debugData = layers;
    updateSingleDangerBlockLayer(live); // redibuja igual en modo debug, aunque haya fallado, para ver qué se descartó
  } else if(result){
    updateSingleDangerBlockLayer(live);
  }
}
/** Sortea la cuadra peligrosa de HOY para cada región de la ciudad actual — se llama una sola vez
 *  al cargar la ciudad (detectCityAndLoadWorldData), no en cada movimiento; queda fija hasta la
 *  próxima medianoche (o hasta cambiar de ciudad, que vuelve a sortear con esas zonas). Pone de
 *  inmediato el rectángulo de respaldo de cada zona (sin esperar red) y dispara, sin bloquear, la
 *  consulta real de manzana por OpenStreetMap para cada una. */
function rollTodaysDangerZones(){
  Object.values(dangerZoneAbortControllers).forEach(c=> c && c.abort());
  dangerZoneAbortControllers = {};
  dangerZoneGenerationEpoch++;
  const epoch = dangerZoneGenerationEpoch;
  dangerBlocksToday = [];
  if(!NEIVA_ZONES || !NEIVA_ZONES.length) return;
  const daySeed = getDayNumber() + hashStr(currentCityKey||"");
  NEIVA_ZONES.forEach(z=>{
    // si Hacker994 trazó (o quitó) esta zona a mano en Modo Constructor, ESO manda — nunca se
    // sortea sola ni se pisa después con el resultado de Overpass (regenerateDangerZoneBlock ni
    // siquiera se llama para ella, así tampoco se gasta una consulta a la red por nada).
    const manual = (mapEdits.dangerZones||{})[dangerZoneManualKey(currentCityKey, z.key)];
    if(manual){
      if(manual.disabled) return; // se quitó a mano — sin zona peligrosa acá hasta que se trace una nueva
      if(manual.points && manual.points.length >= 3){
        dangerBlocksToday.push(buildManualDangerBlock(z, manual.points));
        return;
      }
    }
    const rng = makeSeededRng(daySeed + hashStr(z.key));
    const angle = rng()*360;
    const distFrac = 0.15 + rng()*0.55; // ni pegada al centro exacto, ni cerca del borde exterior
    const rawCenter = pointAtBearing(z.center, z.radius*distFrac, angle);
    const center = snapToStreetGrid(rawCenter, z.center, DANGER_ZONE_CONFIG.fallbackGridStepM);
    const block = buildFallbackDangerBlock(z, center, 0);
    dangerBlocksToday.push(block);
    regenerateDangerZoneBlock(block, epoch).catch(()=>{}); // fire-and-forget, nunca bloquea ni rompe el resto
  });
}
/** La zona peligrosa donde está el jugador ahora mismo, o null si no está en ninguna. */
function currentDangerZone(){
  if(!playerLatLng) return null;
  return dangerBlocksToday.find(b=> isPointInDangerZone(playerLatLng, b.polygon)) || null;
}
/** Avisa (una vez por entrada, no en cada paso) cuando el jugador cruza hacia/desde una zona
 *  peligrosa — mismo criterio de "avisar siempre que cambia de verdad" que ya usa updateCurrentRegion(). */
let lastDangerZoneKeySeen = null;
function checkDangerZoneEntry(){
  const dz = currentDangerZone();
  const key = dz ? dz.key : null;
  if(key === lastDangerZoneKeySeen) return;
  lastDangerZoneKeySeen = key;
  if(dz) toast(`☠️ Entras a una zona peligrosa de ${dz.name} — los enemigos aquí son mucho más fuertes.`, 4500);
}
function renderRegionsOverlay(){
  const titleEl = $("regionsTitle");
  if(titleEl) titleEl.textContent = `🗺️ Regiones de ${currentCityName || "tu ciudad"}`;
  const list = $("regionsList");
  list.innerHTML = "";
  const visited = player.visitedZones||[];
  NEIVA_ZONES.forEach(z=>{
    const known = visited.includes(z.key);
    const monEmojis = z.monsterNames.map(n=>{
      const t = MONSTER_TEMPLATES.find(m=>m.name===n);
      return t ? t.emoji : "❔";
    }).join(" ");
    const pct = Math.min(100, Math.round(((player.zoneDistanceM||{})[z.key]||0)/ZONE_EXPLORE_TARGET_M*100));
    const region = known ? CURRENT_CITY_REGIONS.find(r=> r.id === "region_"+currentCityKey+"_zone_"+z.key) : null;
    const biomeLabel = region ? (BIOMES[region.biome]||{}).label : null;
    const card = document.createElement("div");
    card.className = "region-card" + (known ? "" : " locked");
    card.style.borderLeftColor = z.color;
    card.innerHTML = `
      <div style="flex:1;">
        <div class="rc-name" style="color:${z.color}">${z.name}</div>
        <div class="rc-status">${known ? "✅ Explorada" : "🔒 Aún no la recorres"}</div>
        ${known ? `<div class="rc-status">${z.monsterNames.join(" · ")}</div>` : ""}
        ${known ? `<div class="rc-explore-bar"><div class="rc-explore-fill" style="width:${pct}%; background:${z.color};"></div></div>
          <div class="rc-status">${pct}% recorrida</div>` : ""}
        ${region ? `<div class="rc-status">${region.icon||"🗺️"} ${biomeLabel||""} · Nivel recomendado ${region.recommendedLevel.min}-${region.recommendedLevel.max}</div>
          ${region.description ? `<div class="rc-status" style="font-style:italic;">${region.description}</div>` : ""}
          ${region.regionalBoss ? `<div class="rc-status">👑 Jefe regional: ${region.regionalBoss}</div>` : ""}` : ""}
      </div>
      <div class="rc-mons${known ? "" : " blurred"}">${monEmojis}</div>`;
    list.appendChild(card);
  });
}
function rarityClass(rarity){
  return rarity==="epic" ? "rarity-epic" : rarity==="legendary" ? "rarity-legendary"
    : rarity==="rare" ? "rarity-rare" : rarity==="uncommon" ? "rarity-uncommon" : "rarity-common";
}
function rarityLabel(rarity){ return (RARITY_BY_KEY[rarity]||RARITY_TIERS[0]).label; }
function bonusDesc(bonuses){
  return Object.entries(bonuses).map(([k,v])=> `+${v} ${STAT_LABEL[k]||k}`).join(", ");
}
function scaleBonuses(base, mult){
  const out = {};
  Object.keys(base).forEach(k=> out[k] = Math.max(1, Math.round(base[k]*mult)));
  return out;
}
let _eqIdSeq = 0;
function pushEquip(slot, classKey, baseName, emoji, baseBonuses, basePrice){
  LEVEL_TIERS.forEach(lt=>{
    RARITY_TIERS.forEach(t=>{
      _eqIdSeq++;
      const bonuses = scaleBonuses(baseBonuses, t.mult*lt.mult);
      const reqLevel = lt.reqBase + (RARITY_REQ_OFFSET[t.key]||0);
      const tierName = t.key==="common" ? baseName : `${baseName} ${t.label.replace(/^✨ |^👑 /,'')}`;
      const name = lt.suffix ? `${tierName}${lt.suffix}` : tierName;
      EQUIP_TABLE.push({
        id: "eq"+_eqIdSeq,
        name, emoji, type:"equip", slot, classKey: classKey||null, requiredClass: CLASS_ID_MAP[classKey]||null,
        rarity:t.key, weight: t.weight,
        bonuses, value: Math.round(basePrice*t.priceMult*lt.priceMult),
        reqLevel,
        desc: bonusDesc(bonuses) + (reqLevel>1 ? ` · requiere Nv.${reqLevel}` : "")
      });
    });
  });
}
Object.entries(WEAPON_BASE).forEach(([ck,w])=> pushEquip("weapon", ck, w.name, w.emoji, w.bonuses, 30));
pushEquip("armor", null, ARMOR_BASE.name, ARMOR_BASE.emoji, ARMOR_BASE.bonuses, 28);
pushEquip("helmet", null, HELMET_BASE.name, HELMET_BASE.emoji, HELMET_BASE.bonuses, 24);
pushEquip("boots", null, BOOTS_BASE.name, BOOTS_BASE.emoji, BOOTS_BASE.bonuses, 24);
ACCESSORY_BASES.forEach(a=> pushEquip("accessory", null, a.name, a.emoji, a.bonuses, 26));
pushEquip("offhand", "berserker", DAGGER_BASE.name, DAGGER_BASE.emoji, DAGGER_BASE.bonuses, 28);
pushEquip("offhand", "guerrero", SHIELD_BASE.name, SHIELD_BASE.emoji, SHIELD_BASE.bonuses, 26);
// estos dos usan porcentajes (no números enteros), así que se agregan directo — el escalado por rareza de
// pushEquip está pensado para estadísticas enteras y redondearía mal un valor como 0.12 o 0.2.
ARCHER_ACCESSORY_BASES.forEach((a,i)=> EQUIP_TABLE.push({
  id:"eq_archer_acc_"+i, name:a.name, emoji:a.emoji, type:"equip", slot:"accessory", classKey:a.classKey,
  rarity:"epic", weight:2, bonuses:a.bonuses, value:140, reqLevel:15, desc:a.desc,
}));



let pvp = null;
let outgoingInvite = null;
let incomingInvite = null;
let shopActiveCategory = "weapon";
let shopPage = 0;
const SHOP_PAGE_SIZE = 10;

// Estas 4 variables guardan los datos del MUNDO de la ciudad detectada (Neiva por defecto, hasta que
// se detecte otra según la posición real/simulada del jugador — ver detectCityAndLoadWorldData más abajo).
let NEIVA_ZONES = [];
let NEIVA_PARKS = [];
let NEIVA_MALLS = [];
let CAMPFIRES = [];
let SHRINES = [];
let TOWERS = [];
let COLISEO = null;
let DUNGEON_PORTALS = []; // portales de mazmorra de esta ciudad (uno por cada DUNGEON_REGISTRY)
let dungeonPortalMarkers = {};
let dungeonAuraCircles = {}; // niebla oscura geo-anclada alrededor de cada portal (ver drawSingleDungeonPortalMarker)
let WORLD_POIS = [];
let CURRENT_CITY_BIOMES = {zones:[], parks:[]}; // clasificación de bioma por zona/parque (Capa 4) — solo consulta, no filtra spawns todavía
let CURRENT_CITY_REGIONS = []; // regiones de esta ciudad (Capa 5) — construidas sobre sus zonas/parques ya existentes
// Store de la Capa 6 (Integración con OpenStreetMap) — SOLO memoria, nunca se guarda en saveGame()
// (mismo criterio que worldEventEnemyCache): es una optimización de red, no estado de partida.
// Se llena solo, de a poco, a medida que el jugador se mueve — ver refreshWorldGeoData() más abajo.
let osmWorldStore = createOsmStore();
let currentRegionId = null; // en qué región está el jugador ahora mismo (solo en memoria; se resetea cada sesión, así que la presentación siempre se muestra de nuevo al entrar a una región, incluso si ya se había visitado antes)
let UPGRADE_STATIONS = [];
let currentCityKey = DEFAULT_CITY_KEY;
let currentCityName = "";

/** Según la posición (real o simulada) del jugador, detecta en cuál ciudad registrada está
 *  (la más cercana cuyo círculo lo contiene) y carga sus zonas/parques/centros comerciales.
 *  Si no está cerca de ninguna, usa Neiva como respaldo para no romper partidas ya iniciadas ahí. */
/** "Modo Constructor": solo para la cuenta Hacker994 — deja arrastrar/borrar/agregar torres,
 *  fogatas y puntos de mejora directamente sobre el mapa. Los cambios se guardan en tu propio
 *  dispositivo (por ciudad) y se aplican por encima de los datos normales del juego cada vez
 *  que cargan. No afecta a otros jugadores ni a otras cuentas. */
const BUILDER_MODE_USER = "Hacker994";
/** Interruptor general — pedido explícito: apagar el Modo Constructor por ahora, para nadie (ni
 *  siquiera Hacker994) hasta que se vuelva a habilitar a propósito. Un solo `true` acá lo
 *  reactiva sin tocar nada más del sistema (setupBuilderModeUI, saveMapEdits, etc. ya dependen
 *  de isBuilderUser()). */
const BUILDER_MODE_ENABLED = false;
function isBuilderUser(){ return BUILDER_MODE_ENABLED && !!(player && player.name === BUILDER_MODE_USER); }
/** `dangerZones`: dict de zonas peligrosas trazadas a mano — clave `${cityKey}:${zoneKey}`, valor
 *  `{points:[{lat,lng},...]}` (el trazo tal cual, en el mismo orden en que se tocó el mapa). Mismo
 *  criterio que moved/deleted/added: se guarda y viaja por PubNub, nunca expira sola. Ver
 *  dangerZoneManualKey() y rollTodaysDangerZones() más abajo. */
let mapEdits = {moved:{}, deleted:[], added:[], dangerZones:{}};

/** IMPORTANTE: no se puede usar AppStorage/window.storage aquí — eso solo existe DENTRO de
 *  Claude; una vez el juego está hosteado afuera (Netlify, etc.), cada celular tiene su propio
 *  localStorage y nunca se ven entre sí (el mismo motivo por el que el sistema de amigos usa
 *  PubNub). Por eso los cambios del Modo Constructor se comparten por el mismo canal de PubNub,
 *  igual que las torres y las bases: SÍ viaja de verdad entre dispositivos reales.
 */
const PN_MAP_EDITS_CHANNEL = "ronda-gps-rpg-mapedits-v1";
/** Respaldo LOCAL de mapEdits (localStorage, este navegador solamente) — depender solo de
 *  fetchMessages({count:1}) de PubNub para "la última versión guardada" es fragilísimo: si el
 *  keyset no tiene Message Persistence habilitado, si el mensaje llega tarde, o si hay cualquier
 *  hipo de red justo al cambiar de personaje, loadMapEdits() no encuentra nada y una zona
 *  peligrosa trazada a mano (o cualquier otro cambio de Modo Constructor) "desaparece" — pasó
 *  justo eso: se creó con un personaje, no estaba al entrar con otro, y tampoco volvió a aparecer
 *  con el personaje original. Esta caché es la red de seguridad para ESE caso concreto (mismo
 *  navegador, mismo dispositivo): se escribe en cada saveMapEdits() y en cada mensaje real que
 *  llega por PubNub, y loadMapEdits() la usa como punto de partida ANTES de intentar la consulta
 *  de red — así nunca se pierde lo que este mismo navegador ya guardó, incluso si PubNub no
 *  devuelve nada. No reemplaza la sincronización entre dispositivos (eso sigue siendo PubNub),
 *  solo la hace resistente a que falle. */
const MAP_EDITS_LOCAL_CACHE_KEY = "ronda-gps-rpg-mapedits-cache-v1";
function cacheMapEditsLocally(edits){
  try{ localStorage.setItem(MAP_EDITS_LOCAL_CACHE_KEY, JSON.stringify(edits)); }
  catch(e){ /* localStorage lleno o inaccesible (modo privado, etc.) — no es crítico, se sigue sin caché */ }
}
function readMapEditsLocalCache(){
  try{
    const raw = localStorage.getItem(MAP_EDITS_LOCAL_CACHE_KEY);
    if(!raw) return null;
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === "object") ? parsed : null;
  }catch(e){ return null; }
}
/** `mapEdits` arranca como el objeto vacío de la línea de arriba (moved:{}, deleted:[], added:[],
 *  dangerZones:{}) hasta que loadMapEdits() (async — tarda un poco en conectar y consultar
 *  PubNub) termina de traer el estado real. Como saveMapEdits() publica el objeto COMPLETO cada
 *  vez (no un diff), guardar ANTES de que termine esa carga publicaría ese vacío inicial por
 *  encima de todo lo que ya existía — borrando en la práctica cualquier torre/fogata/zona
 *  peligrosa que otro dispositivo hubiera guardado antes. mapEditsLoaded es el candado que evita
 *  exactamente eso: ningún guardado se publica hasta que se confirme que ya se cargó lo real. */
let mapEditsLoaded = false;
/** Se incrementa cada vez que ESTE cliente (solo puede ser Hacker994, el único que guarda) publica
 *  un cambio. PubNub le hace "eco" de vuelta a su propio publisher porque también está suscrito a
 *  ese mismo canal (para ver los cambios de otros dispositivos) — si haces dos ediciones seguidas
 *  (por ejemplo: trazás una zona peligrosa y enseguida movés un punto de mejora), el eco del PRIMER
 *  guardado puede llegar DESPUÉS de que ya se hizo el segundo cambio en este cliente, y sin este
 *  candado `mapEdits = msg.mapEdits` lo pisaría con una foto vieja — perdiendo el segundo cambio.
 *  Los demás jugadores nunca guardan, así que para ellos esto nunca bloquea nada (ver más abajo). */
let mapEditsLocalRev = 0;
async function loadMapEdits(){
  // Punto de partida: la caché local de este navegador (si hay), ANTES de intentar la red — así,
  // si PubNub tarda, falla, o no tiene Message Persistence habilitado, este mismo dispositivo
  // sigue viendo lo último que él mismo guardó en vez de arrancar de cero (ver el comentario de
  // MAP_EDITS_LOCAL_CACHE_KEY más arriba).
  const cached = readMapEditsLocalCache();
  if(cached) mapEdits = cached;
  if(pubnub){
    try{
      const res = await pubnub.fetchMessages({channels:[PN_MAP_EDITS_CHANNEL], count:1});
      const items = (res.channels && res.channels[PN_MAP_EDITS_CHANNEL]) || [];
      if(items.length){
        const last = items[items.length-1].message;
        if(last && last.mapEdits) mapEdits = last.mapEdits;
      }
    }catch(e){ console.warn("[MAPEDITS] no se pudo consultar los cambios del Modo Constructor:", e); }
  }
  if(!mapEdits.dangerZones) mapEdits.dangerZones = {}; // por si el edit guardado es de antes de esta función
  cacheMapEditsLocally(mapEdits); // refresca la caché con lo que haya quedado vigente (local o de red)
  mapEditsLoaded = true;
}
function saveMapEdits(){
  if(!isBuilderUser()) return; // solo Hacker994 puede GUARDAR cambios (todos los demás solo los ven)
  if(!mapEditsLoaded){
    // ver el comentario de mapEditsLoaded arriba — publicar ahora borraría todo lo guardado antes.
    toast("⏳ Todavía se están cargando los cambios guardados — esperá un momento antes de editar.", 4000);
    return;
  }
  // Se cachea localmente SIEMPRE, incluso si PubNub no está disponible o falla la publicación — es
  // lo que hace que este mismo navegador nunca pierda un cambio propio (ver el comentario de
  // MAP_EDITS_LOCAL_CACHE_KEY), independiente de si la sincronización con otros dispositivos funciona.
  cacheMapEditsLocally(mapEdits);
  if(!pubnub) return;
  mapEditsLocalRev++;
  pubnub.publish({channel: PN_MAP_EDITS_CHANNEL, storeInHistory:true, message:{mapEdits, rev: mapEditsLocalRev}})
    .catch(e=> console.warn("[MAPEDITS] no se pudo compartir el cambio con otros jugadores:", e));
}
/** Aplica tus ediciones guardadas (movidos/borrados/agregados) sobre una lista de puntos de esta
 *  ciudad — se usa igual para torres, fogatas y puntos de mejora. */
function applyMapEdits(list, kind, cityKey){
  let out = list.filter(x=> !mapEdits.deleted.includes(x.id));
  out = out.map(x=> mapEdits.moved[x.id] ? {...x, ...mapEdits.moved[x.id]} : x);
  mapEdits.added.filter(a=> a.kind===kind && a.cityKey===cityKey).forEach(a=> out.push({...a}));
  return out;
}

/** Agrega (o quita) el botón del Modo Constructor dentro del menú ☰ — solo existe en el DOM para
 *  la cuenta Hacker994; para cualquier otra cuenta ni siquiera se crea, así que el resto de la
 *  rueda circular del menú no se ve afectado en absoluto. Se llama cada vez que se crea o continúa
 *  un personaje, así que evita duplicar el botón si ya estaba agregado. */
function setupBuilderModeUI(){
  const existing = $("btnBuilderToggle");
  if(!isBuilderUser()){
    if(existing) existing.remove();
    return;
  }
  if(existing) return; // ya está agregado, no lo dupliques
  const row = document.querySelector(".wheel-secondary-row");
  if(!row) return;
  const btn = document.createElement("button");
  btn.className = "wheel-secondary-btn";
  btn.id = "btnBuilderToggle";
  btn.title = "Modo Constructor";
  btn.innerHTML = '🔧 <span>Modo Constructor</span>';
  btn.onclick = ()=>{
    closeFabMenu();
    if(dangerZoneDraw) cancelDangerZoneDraw(); // no dejes un trazo a medias colgado al salir del modo
    builderModeOn = !builderModeOn;
    btn.classList.toggle("active", builderModeOn);
    $("builderToolbar").classList.toggle("hidden", !builderModeOn);
    toggleMarkerBuilderBehavior(towerMarkers, TOWERS, "tower");
    toggleMarkerBuilderBehavior(campfireMarkers, CAMPFIRES, "campfire");
    toggleMarkerBuilderBehavior(upgradeMarkers, UPGRADE_STATIONS, "upgrade");
    toggleMarkerBuilderBehavior(shrineMarkers, SHRINES, "shrine");
    drawDangerBlocks(); // vuelve a dibujar las insignias de zonas peligrosas para que se puedan (o no) tocar según el modo
    toast(builderModeOn ? "🔧 Modo Constructor activado — arrastra o toca para borrar." : "Modo Constructor desactivado.");
  };
  row.appendChild(btn);
}

let builderModeOn = false;
let builderAddKind = null; // si no es null, el proximo toque en el mapa coloca un elemento de este tipo

function toggleMarkerBuilderBehavior(markerDict, dataList, kind){
  dataList.forEach(item=> applyBuilderModeToMarker(markerDict, item, kind));
}

/** Aplica (o quita) el comportamiento de edición del Modo Constructor a UN solo marcador. Lo usan
 *  tanto toggleMarkerBuilderBehavior (recorre TODOS los marcadores ya dibujados al prender/apagar
 *  el modo) como updateMediumVisibility (dibuja marcadores nuevos sobre la marcha por cercanía —
 *  si el Modo Constructor ya estaba prendido cuando uno de esos aparece y no se llama esto, queda
 *  sin poder arrastrarse ni borrarse hasta apagar y prender el modo de nuevo). */
function applyBuilderModeToMarker(markerDict, item, kind){
  const marker = markerDict[item.id];
  if(!marker) return;
  marker.setDraggable(builderModeOn);
  // Tu propio marcador se dibuja con zIndexOffset:1000, por encima de torres/fogatas/santuarios —
  // como el flujo normal para editar algo es caminar hasta pararte justo encima, tu marcador tapa
  // el del objeto y se come los clics/arrastres. Mientras el Modo Constructor esté prendido, subimos
  // el marcador del objeto por encima del jugador para poder tocarlo igual; al apagar el modo, vuelve
  // a su altura original.
  if(marker.setZIndexOffset){
    const originalOffset = (marker._opts && marker._opts.zIndexOffset) || 0;
    marker.setZIndexOffset(builderModeOn ? 1200 : originalOffset);
  }
  if(builderModeOn){
    marker.onDragEnd((latlng)=>{
      mapEdits.moved[item.id] = {lat:latlng.lat, lng:latlng.lng};
      item.lat = latlng.lat; item.lng = latlng.lng;
      saveMapEdits();
      toast(`📍 Moviste "${item.name}".`);
    });
    marker.setClickHandler(()=>{
      showConfirm(`¿Borrar "${item.name}" del mapa?`, ()=>{
        mapEdits.deleted.push(item.id);
        saveMapEdits();
        marker.remove();
        delete markerDict[item.id];
        toast(`🗑️ Borraste "${item.name}".`);
      }, {icon:"🗑️", confirmLabel:"Borrar"});
    });
  } else {
    // se restaura el comportamiento normal de cada tipo (abre su modal de siempre)
    if(kind==="tower") marker.setClickHandler(()=> openTowerModal(item));
    else if(kind==="campfire") marker.setClickHandler(()=>{}); // las fogatas no tienen modal propio
    else if(kind==="upgrade") marker.setClickHandler(()=> openUpgradeStationModal(item));
    else if(kind==="shrine") marker.setClickHandler(()=> tryActivateShrine(item));
  }
  // si un marcador nuevo aparece por cercanía MIENTRAS ya se está trazando una zona peligrosa a
  // mano, tampoco debe interceptar los toques (ver setBuilderMarkersInteractive más arriba)
  if(dangerZoneDraw){
    const el = marker.getElement && marker.getElement();
    if(el) el.style.pointerEvents = "none";
  }
}

/** Coloca un elemento nuevo (torre/fogata/mejora) donde tocaste el mapa, con contenido por
 *  defecto razonable — solo se llama estando en Modo Constructor con un tipo armado. */
function placeNewBuilderElement(lat, lng){
  const kind = builderAddKind;
  builderAddKind = null;
  if(kind==="tree"){
    // Los árboles del Modo Constructor no viajan por PubNub como torres/fogatas — son solo una
    // forma rápida de generar, justo donde tocaste, un árbol talable con el mismo comportamiento
    // (aparece, se puede talar para madera, luego desaparece) que los que salen solos.
    const type = RESOURCE_NODE_TYPES.find(t=>t.key==="tree_medium");
    const node = {id:"res_"+Math.random().toString(36).slice(2,9), typeKey:type.key, lat, lng,
      spawnedAt:Date.now(), lifespanMs:type.lifespanMs};
    resourceNodes.push(node);
    drawResourceNodeMarker(node);
    toast(`✅ Agregaste un ${type.label.toLowerCase()}.`);
    return;
  }
  const id = kind+"_custom_"+Date.now();
  let item;
  if(kind==="tower") item = {id, name:"Torre nueva", lat, lng, goldPerHour:50};
  else if(kind==="campfire") item = {id, name:"Fogata nueva", lat, lng, healRadius:35, healPerTick:0.02};
  else if(kind==="shrine") item = {id, typeKey:"guerrero", name:"Santuario del Guerrero", lat, lng, activateRadius:40};
  else item = {id, name:"Punto de mejora nuevo", lat, lng, kind:"camino"};
  mapEdits.added.push({...item, kind, cityKey: currentCityKey});
  saveMapEdits();
  if(kind==="tower"){ TOWERS.push(item); drawSingleTowerMarker(item); }
  else if(kind==="campfire"){ CAMPFIRES.push(item); drawSingleCampfireMarker(item); }
  else if(kind==="shrine"){ SHRINES.push(item); drawSingleShrineMarker(item); }
  else { UPGRADE_STATIONS.push(item); drawSingleUpgradeMarker(item); }
  toast(`✅ Agregaste "${item.name}".`);
}

/* ------------------------------------------------------------
   MODO CONSTRUCTOR — trazar una zona peligrosa a mano. Cada toque en el mapa agrega un vértice;
   tocar cerca del primer vértice (y con al menos 3 ya puestos) cierra la forma y la guarda como
   la zona TERMINADA de la región más cercana al trazo — reemplaza tanto al rectángulo de respaldo
   como a cualquier resultado de Overpass para esa zona (ver rollTodaysDangerZones), y nunca se
   vuelve a sortear sola.
   ------------------------------------------------------------ */
/** Distancia (metros) al primer vértice por debajo de la cual un toque se interpreta como "cerrar
 *  la forma" en vez de "agregar otro vértice". */
const DANGER_ZONE_DRAW_CLOSE_TOLERANCE_M = 18;
/** `null` mientras no se está trazando, o `{points:[{lat,lng}], polyline, vertexMarkers:[]}`
 *  mientras sí — un solo trazo activo a la vez (mismo criterio que basePlacementArmed/
 *  builderAddKind: son modos exclusivos entre sí, uno cancela al otro si hiciera falta). */
let dangerZoneDraw = null;

function dangerZoneDrawVertexIcon(){
  return L.divIcon({className:'', html:`<div class="zone-draw-vertex"></div>`, iconSize:[14,14], iconAnchor:[7,7]});
}
/** Vuelve a dibujar la polilínea + los puntos del trazo en curso — se llama después de cada toque. */
function redrawDangerZoneDrawLayers(){
  if(!dangerZoneDraw) return;
  if(dangerZoneDraw.polyline) map.removeLayer(dangerZoneDraw.polyline);
  dangerZoneDraw.vertexMarkers.forEach(m=> map.removeLayer(m));
  const pts = dangerZoneDraw.points;
  if(pts.length >= 2){
    dangerZoneDraw.polyline = L.polyline(pts.map(p=>[p.lat,p.lng]), {
      color:"#ff3b3b", weight:3, opacity:0.9, dashArray:"6,5", interactive:false,
    }).addTo(map);
  } else {
    dangerZoneDraw.polyline = null;
  }
  dangerZoneDraw.vertexMarkers = pts.map(p=> L.marker([p.lat,p.lng], {icon: dangerZoneDrawVertexIcon(), interactive:false}).addTo(map));
}
/** Mientras se traza una zona peligrosa a mano, los marcadores editables del Modo Constructor
 *  (torres/fogatas/santuarios/puntos de mejora, Y el botoncito 🗑️ de cada zona peligrosa ya
 *  dibujada) NO deben interceptar los toques del mapa — las zonas normalmente se trazan justo
 *  alrededor de cuadras que ya tienen esos objetos (o de una zona que ya existía y se está
 *  re-trazando), así que sin esto, tocar cerca de uno de ellos (incluido el toque que debería
 *  CERRAR el trazo, justo sobre el centro de la zona vieja donde vive su 🗑️) le abre su
 *  confirmación de borrado en vez de agregar o cerrar un vértice — el trazo nuevo se pierde sin
 *  guardarse y encima borra la zona existente. Se desactiva al empezar a trazar y se restaura al
 *  cancelar o terminar. */
function setBuilderMarkersInteractive(interactive){
  [towerMarkers, campfireMarkers, shrineMarkers, upgradeMarkers].forEach(dict=>{
    Object.values(dict).forEach(m=>{
      const el = m.getElement && m.getElement();
      if(el) el.style.pointerEvents = interactive ? "" : "none";
    });
  });
  Object.values(dangerBlockLayers).forEach(entry=>{
    const el = entry.marker && entry.marker.getElement && entry.marker.getElement();
    if(el) el.style.pointerEvents = interactive ? "" : "none";
  });
}
/** Empieza (o, si ya había un trazo en curso, lo cancela) el trazado de una zona peligrosa a mano —
 *  se llama desde el botón del toolbar de Modo Constructor. */
function toggleDangerZoneDraw(){
  if(dangerZoneDraw){ cancelDangerZoneDraw(); return; }
  builderAddKind = null; // el trazo es exclusivo con "agregar torre/fogata/etc" — solo un modo de toque a la vez
  dangerZoneDraw = {points:[], polyline:null, vertexMarkers:[]};
  setBuilderMarkersInteractive(false);
  $("btnBuilderDrawZone")?.classList.add("active");
  toast("☠️ Trazando zona peligrosa — toca el mapa para agregar puntos, y tocá cerca del primero para cerrarla.", 5000);
}
function cancelDangerZoneDraw(){
  if(!dangerZoneDraw) return;
  if(dangerZoneDraw.polyline) map.removeLayer(dangerZoneDraw.polyline);
  dangerZoneDraw.vertexMarkers.forEach(m=> map.removeLayer(m));
  dangerZoneDraw = null;
  setBuilderMarkersInteractive(true);
  $("btnBuilderDrawZone")?.classList.remove("active");
  toast("Trazo cancelado.");
}
/** La zona de NEIVA_ZONES (ciudad actual) cuyo centro está más cerca del punto medio del trazo —
 *  a ESA se le asigna la forma trazada, sin necesidad de elegirla aparte de una lista. */
function nearestZoneToDrawing(points){
  if(!NEIVA_ZONES || !NEIVA_ZONES.length) return null;
  const avgLat = points.reduce((s,p)=> s+p.lat, 0) / points.length;
  const avgLng = points.reduce((s,p)=> s+p.lng, 0) / points.length;
  const mid = {lat:avgLat, lng:avgLng};
  let best = null, bestDist = Infinity;
  NEIVA_ZONES.forEach(z=>{
    const d = distMeters(mid, z.center);
    if(d < bestDist){ bestDist = d; best = z; }
  });
  return best;
}
/** Se llama en cada toque del mapa MIENTRAS dangerZoneDraw está activo (ver el handler de
 *  map.on('click') en initMap). Agrega un vértice, o si el toque cae cerca del primero (con al
 *  menos 3 puestos), cierra y guarda la forma. */
function handleDangerZoneDrawTap(latlng){
  const pts = dangerZoneDraw.points;
  if(pts.length >= 3 && distMeters(latlng, pts[0]) <= DANGER_ZONE_DRAW_CLOSE_TOLERANCE_M){
    finishDangerZoneDraw();
    return;
  }
  pts.push({lat:latlng.lat, lng:latlng.lng});
  redrawDangerZoneDrawLayers();
}
function finishDangerZoneDraw(){
  const points = dangerZoneDraw.points;
  const zone = nearestZoneToDrawing(points);
  if(dangerZoneDraw.polyline) map.removeLayer(dangerZoneDraw.polyline);
  dangerZoneDraw.vertexMarkers.forEach(m=> map.removeLayer(m));
  dangerZoneDraw = null;
  setBuilderMarkersInteractive(true);
  $("btnBuilderDrawZone")?.classList.remove("active");
  if(!zone){ toast("⚠️ No hay ninguna zona en esta ciudad a la que asignar el trazo."); return; }
  mapEdits.dangerZones[dangerZoneManualKey(currentCityKey, zone.key)] = {points};
  saveMapEdits();
  const live = dangerBlocksToday.find(b=> b.key === zone.key);
  if(live){
    const rebuilt = buildManualDangerBlock(zone, points);
    Object.assign(live, rebuilt);
    updateSingleDangerBlockLayer(live);
  }
  toast(`✅ Zona peligrosa de "${zone.name}" guardada — ya no se sortea sola.`, 4000);
}
/** Quita el trazo a mano de `zoneKey` (vuelve a sortear/generar automático para esa zona) — se
 *  llama al tocar la insignia de una zona en modo "manual" estando en Modo Constructor. */
/** Quita la zona peligrosa de `zoneKey` — sea que estuviera trazada a mano o generada automático
 *  (manzana real u OSM/rectángulo de respaldo): queda SIN zona peligrosa en esa región hasta que
 *  alguien trace una nueva a mano con el botón "☠️ Zona". Mismo criterio de guardado/sincronizado
 *  que el resto de mapEdits — viaja a todos los jugadores. */
function disableDangerZoneOverride(zoneKey, zoneName){
  showConfirm(`¿Quitar la zona peligrosa de "${zoneName}"? Podés trazar una nueva después con "☠️ Zona".`, ()=>{
    mapEdits.dangerZones[dangerZoneManualKey(currentCityKey, zoneKey)] = {disabled:true};
    saveMapEdits();
    toast(`🗑️ Zona peligrosa de "${zoneName}" quitada.`);
    rollTodaysDangerZones();
    drawDangerBlocks();
  }, {icon:"🗑️", confirmLabel:"Quitar"});
}

function detectCityAndLoadWorldData(lat, lng){
  let match = null;
  if(lat != null && lng != null){
    match = CITY_REGISTRY.find(c => distMeters({lat,lng}, c.center) <= c.radius) || null;
  }
  const city = match || CITY_REGISTRY.find(c=>c.key===DEFAULT_CITY_KEY) || CITY_REGISTRY[0];
  currentCityKey = city.key;
  currentCityName = city.name;
  NEIVA_ZONES = city.zones;
  rollTodaysDangerZones(); // debe ir DESPUÉS de fijar NEIVA_ZONES — sortea sobre las de esta ciudad
  lastDangerZoneKeySeen = null; // fuerza a que checkDangerZoneEntry() vuelva a evaluar con la ciudad nueva
  NEIVA_PARKS = city.parks;
  NEIVA_MALLS = city.malls;
  CAMPFIRES = applyMapEdits(city.campfires || [], "campfire", city.key);
  SHRINES = applyMapEdits(city.shrines || [], "shrine", city.key);
  TOWERS = applyMapEdits(city.towers || [], "tower", city.key);
  COLISEO = city.coliseo || null;
  // Catálogo genérico de Puntos de Interés de esta ciudad (Mapa Vivo, Capa 1) — no reemplaza los
  // arrays de arriba (que siguen alimentando el dibujo/interacción de siempre), es solo el mismo
  // contenido con una forma unificada para que las próximas capas del Mapa Vivo lo consulten.
  WORLD_POIS = getCityPOIs(city);
  // Clasificación de bioma por zona/parque de esta ciudad (Mapa Vivo, Capa 4: Ecosystem Engine) —
  // se calcula y se guarda para que las capas futuras lo consulten antes de generar contenido;
  // hoy NINGÚN spawn real (monstruos, recursos, NPCs, eventos) filtra todavía por esto.
  CURRENT_CITY_BIOMES = {
    zones: (city.zones||[]).map(z=> ({ zoneKey:z.key, biomeKey: classifyBiomeForZone(z) })),
    parks: (city.parks||[]).map(p=> ({ parkId:p.id, biomeKey: classifyBiomeForPark(p) })),
  };
  DUNGEON_PORTALS = buildDungeonPortalsForCity(city);
  drawDungeonPortals(); // limpia cualquier marcador de portal que hubiera quedado de la ciudad anterior
  // Regiones de esta ciudad (Mapa Vivo, Capa 5) — construidas sobre las mismas zonas/parques de
  // siempre, con nombre de fantasía estable y su bioma ya clasificado; no dibuja nada nuevo ni
  // cambia el mapa real, solo le da identidad de RPG a lo que ya existía.
  CURRENT_CITY_REGIONS = buildRegionsForCity(city);
  // Máximo ~10 puntos de mejora en total, bien repartidos — nada de cuadrícula densa. En Bogotá
  // se concentran en la zona Centro (donde hemos estado probando), ya que es una ciudad enorme y
  // esparcirlos por toda ella los dejaría demasiado lejos unos de otros para ser útiles.
  let baseUpgrades;
  if(city.key === "bogota"){
    const centro = city.zones.find(z=>z.key==="centro") || city.zones[0];
    baseUpgrades = spreadUpgradeStations([centro], 10);
  } else {
    baseUpgrades = spreadUpgradeStations(city.zones, 10);
  }
  UPGRADE_STATIONS = applyMapEdits(baseUpgrades, "upgrade", city.key);
  return city;
}

/** Punto de entrada listo para usar del Ecosystem Engine (Mapa Vivo, Capa 4): dado un lugar,
 *  devuelve qué bioma es y qué enemigos/recursos/NPC/eventos son apropiados ahí, usando las
 *  zonas/parques y la distancia REALES de este juego (distMeters). `context` acepta
 *  {hour, playerLevel, weather, season} pensado para el futuro — hoy no cambia el resultado.
 *  Ninguna función de spawn actual llama esto todavía; es la base que usarán las próximas capas. */
function queryWorldEcosystem(pos, context){
  return queryEcosystem(pos, {zones: NEIVA_ZONES, parks: NEIVA_PARKS, distFn: distMeters}, context);
}

/** Mapa Vivo, Capa 6 (Integración con OpenStreetMap): mantiene `osmWorldStore` al día alrededor
 *  del jugador. "Fire and forget" a propósito — nunca se espera (`await`) desde quien la llama, así
 *  que jamás bloquea el movimiento ni ninguna otra acción; y nunca lanza, así que si Overpass no
 *  responde el juego sigue exactamente igual que antes de esta capa. En la práctica, la mayoría de
 *  las llamadas son un no-op (el cache decide internamente si hace falta consultar de verdad — ver
 *  osmMapCache.js): solo se consulta cuando el jugador se alejó lo suficiente del último punto
 *  consultado, nunca en cada paso ni la ciudad/país completos. */
function refreshWorldGeoDataAroundPlayer(){
  if(!playerLatLng) return;
  refreshWorldGeoData(playerLatLng, osmWorldStore, OSM_QUERY_CONFIG, {fetchImpl: fetch}, distMeters).catch(()=>{});
}

/** API interna lista para usar de la Capa 6 (ver docs/OSM_INTEGRATION.md) — ninguna capa de
 *  gameplay la consume todavía (a propósito: el pedido es solo dejar la infraestructura lista),
 *  pero ya responde con datos reales de OpenStreetMap una vez que `osmWorldStore` tiene algo
 *  cacheado para la zona actual. Ejemplo de uso futuro: `hasNearbyRealWorldFeature(playerLatLng,
 *  GAME_FEATURE_KEYS.SANCTUARY_LOCATION)` para saber si hay una iglesia real cerca. */
function queryRealWorldZoneType(pos){
  return getZoneType(pos, osmWorldStore, OSM_QUERY_CONFIG.queryRadiusM, distMeters);
}
function queryRealWorldNearbyFeatures(pos){
  return getNearbyFeatures(pos, osmWorldStore, OSM_QUERY_CONFIG.queryRadiusM, distMeters);
}
function hasNearbyRealWorldFeature(pos, gameFeatureKey){
  return hasNearbyFeature(pos, osmWorldStore, gameFeatureKey, OSM_QUERY_CONFIG.queryRadiusM, distMeters);
}
function queryRealWorldBiomeHint(pos){
  return getBiomeHint(pos, osmWorldStore, OSM_QUERY_CONFIG.queryRadiusM, distMeters);
}

/* ---------- Capa 7: Combat Power & Difficulty Director ---------- */
// Config central reutilizada por los puntos de integración (eventos, Coliseo, Guardián de
// Parque, Zonas Peligrosas) — un solo lugar para ajustar pesos/rangos sin tocar cada punto de
// uso por separado. Esta capa NO decide los demás spawns ambientales normales del mapa (jefe de
// zona, emboscadas de recolección, monstruos de misión) — esos siguen ligados al nivel del
// jugador exactamente igual que antes. Ver docs/COMBAT_POWER.md.
const COMBAT_POWER_DIRECTOR_CONFIG = {
  statWeights: COMBAT_POWER_STAT_WEIGHTS,
  rarityByKey: RARITY_BY_KEY,
  equipmentConfig: EQUIPMENT_QUALITY_CONFIG,
  petConfig: PET_POWER_CONFIG,
  passiveWeights: PASSIVE_BONUS_WEIGHTS,
  difficultyTiers: DIFFICULTY_TIERS,
  levelBounds: {min:1, max:300},
};
/** Punto de entrada único para los lugares que usan Combat Power (eventos dinámicos, Coliseo,
 *  Guardián de Parque) — les da un nivel de enemigo listo para pasarle a makeMonster() tal cual,
 *  más la variante sorteada (normal/strong/elite/legendary) por si quieren reflejarla en un
 *  mensaje o una insignia visual. */
function rollCombatPowerChallenge(tpl){
  return generateEnemyChallenge(player, tpl, COMBAT_POWER_DIRECTOR_CONFIG);
}
/** Igual que rollCombatPowerChallenge(), pero con las variantes de DANGER_ZONE_DIFFICULTY_TIERS
 *  (nunca "normal" — el punto de una Zona Peligrosa es que sea un reto real, ver spawnMonsters/
 *  spawnPack). Misma config de CP, solo cambia el mazo de dificultad. */
function rollDangerZoneChallenge(tpl){
  return generateEnemyChallenge(player, tpl, {...COMBAT_POWER_DIRECTOR_CONFIG, difficultyTiers: DANGER_ZONE_DIFFICULTY_TIERS});
}
/** El CP real del jugador ahora mismo — solo para uso interno de esta capa (nunca se muestra). */
function currentPlayerCombatPower(){
  return computeCombatPower(player, COMBAT_POWER_DIRECTOR_CONFIG);
}

/** Detecta en qué región está el jugador ahora mismo — si cambió de verdad respecto a la última
 *  (nunca solo por moverse unos metros dentro de la misma), muestra una pequeña presentación no
 *  bloqueante con el nombre y el nivel recomendado. Se muestra SIEMPRE que se entra a una región
 *  (aunque ya se haya visitado antes) — a propósito, para que sea un recordatorio útil de en qué
 *  zona estás cada vez que cruzás el límite, no solo un descubrimiento único. */
function updateCurrentRegion(){
  if(!playerLatLng || !CURRENT_CITY_REGIONS.length) return;
  const region = detectRegionAt(playerLatLng, CURRENT_CITY_REGIONS, distMeters);
  if(!region || region.id === currentRegionId) return;
  currentRegionId = region.id;
  showRegionBanner(region);
}
/** La presentación al entrar a una región: reemplaza temporalmente TODA la tarjeta del HUD del
 *  jugador (desde el ícono de perfil hasta la campana de notificaciones y el botón de GPS) por el
 *  ícono, nombre y nivel recomendado de la región — ocupa todo su ancho y alto ya que es solo por
 *  unos segundos — y después vuelve a mostrar el contenido normal. Nunca bloquea el movimiento ni
 *  pide ninguna acción. */
function showRegionBanner(region){
  const normal = $("hudCardNormal");
  const reveal = $("hudRegionReveal");
  if(!normal || !reveal) return;
  $("hudRegionRevealIcon").textContent = region.icon;
  $("hudRegionRevealName").textContent = region.name;
  $("hudRegionRevealLevel").textContent = `Nivel recomendado ${region.recommendedLevel.min}-${region.recommendedLevel.max}`;
  reveal.style.setProperty("--region-color", region.color);
  normal.classList.add("hidden");
  reveal.classList.remove("hidden");
  clearTimeout(reveal._hideTimer);
  reveal._hideTimer = setTimeout(()=>{
    reveal.classList.add("hidden");
    normal.classList.remove("hidden");
  }, 3200);
}

/** Reparte hasta `maxTotal` puntos de mejora entre las zonas dadas (2 por zona como mínimo,
 *  el resto repartido proporcional al tamaño de cada una), cada uno a una distancia y ángulo
 *  distintos dentro del radio de su zona — bien separados entre sí, sin amontonarse. */
function spreadUpgradeStations(zones, maxTotal){
  const perZone = Math.max(1, Math.floor(maxTotal / zones.length));
  const stations = [];
  zones.forEach(z=>{
    for(let i=0; i<perZone && stations.length<maxTotal; i++){
      const angle = (i / perZone) * Math.PI*2 + (Math.random()*0.4-0.2);
      const distM = z.radius * (0.35 + 0.4*Math.random()); // entre el 35% y 75% del radio de la zona
      const dLat = (distM*Math.cos(angle))/111320;
      const dLng = (distM*Math.sin(angle))/(111320*Math.cos(z.center.lat*Math.PI/180));
      stations.push({
        id:`upg_${z.key}_${i}`, name:`Punto de mejora — ${z.name}`,
        lat:+(z.center.lat+dLat).toFixed(6), lng:+(z.center.lng+dLng).toFixed(6), kind:"camino",
      });
    }
  });
  return stations;
}


/** Genera el arma única del guardián de un parque, escalada al nivel del jugador (siempre relevante). */
function generateParkWeaponItem(parkId, classKey){
  const park = NEIVA_PARKS.find(p=>p.id===parkId);
  if(!park) return null;
  const mult = 1 + player.level*0.9;
  const bonuses = scaleBonuses({atk:1.4}, mult);
  const id = "parkweapon_" + Math.random().toString(36).slice(2,10);
  const item = {
    id, name: park.weaponNames[classKey] || `Arma de ${park.name}`, emoji:"⚔️", type:"equip", slot:"weapon", classKey,
    requiredClass: CLASS_ID_MAP[classKey]||null,
    isBossLoot: true, bossName: park.guardianName, auraColor: park.auraColor,
    bonuses, value: Math.round(80 * mult),
    reqLevel: Math.max(1, player.level-2),
    proc: park.proc || null,
    desc: bonusDesc(bonuses) + ` · arma exclusiva de ${park.name}` + (park.proc ? ` · ${PROC_LABELS[park.proc.type]} (${Math.round(park.proc.chance*100)}%)` : "")
  };
  bossLootRegistry[id] = item;
  return item;
}

/* ---------- Monstruos ---------- */
if(false){
const MONSTER_TEMPLATES = [
  {name:"Slime Salvaje", emoji:"🟢", tier:1, hpM:1.0, atkM:0.8, defM:0.8},
  {name:"Rata Mutante", emoji:"🐀", tier:1, hpM:0.85, atkM:0.95, defM:0.7},
  {name:"Cuervo Corrupto", emoji:"🐦‍⬛", tier:1, hpM:0.8, atkM:1.0, defM:0.7},
  {name:"Espectro", emoji:"👻", tier:2, hpM:1.05, atkM:1.1, defM:0.9, debuffOnHit:{stat:"atk", amount:0.15, chance:0.3}},
  {name:"Trasgo", emoji:"👺", tier:2, hpM:1.15, atkM:1.0, defM:1.0},
  {name:"Golem de Roca", emoji:"🗿", tier:3, hpM:1.5, atkM:0.9, defM:1.6, debuffOnHit:{stat:"def", amount:0.15, chance:0.3}},
  {name:"Lobo Umbrío", emoji:"🐺", tier:2, hpM:1.0, atkM:1.2, defM:0.85, aggressive:true},
  {name:"Araña Gigante", emoji:"🕷️", tier:2, hpM:0.95, atkM:1.15, defM:0.85, aggressive:true, debuffOnHit:{stat:"def", amount:0.2, chance:0.35}},
  {name:"Dragón Menor", emoji:"🐉", tier:4, hpM:1.8, atkM:1.5, defM:1.2},
  {name:"Demonio Menor", emoji:"👹", tier:3, hpM:1.3, atkM:1.3, defM:1.0, aggressive:true, debuffOnHit:{stat:"atk", amount:0.2, chance:0.3}},
];
}

// NPC especial: no aparece en el pool normal, se genera con su propio temporizador
/** Reto especial de mapa (no un jefe): esquiva bastante (evasionChance, ver triggerThiefDodgePose),
 *  suelta diálogos con personalidad propia (showThiefDialogue), a veces amenaza "¿A que no puedes
 *  darme?" y hace fallar seguro tu siguiente golpe (battleState.thiefTauntActive), a veces lanza su
 *  Shuriken Venenoso — golpe chico con aviso dramático que además envenena (tickStatusEffect
 *  generalizado para poder aplicarse sobre el jugador, no solo sobre un enemigo) — y a veces usa su
 *  Técnica de Clones (triggerThiefCloneChallenge). hpM/defM subidos (pedido explícito) respecto al
 *  resto de tier 3: con tantos gestos distintos por turno, tiene que aguantar más para que se
 *  alcancen a ver. Ver enemyTurn(). */
const THIEF_TEMPLATE = {name:"Ladrón Errante", emoji:"🥷", tier:3, hpM:1.55, atkM:1.25, defM:1.3, aggressive:true,
  evasionChance:0.3};

const MERCHANT_TEMPLATE = {name:"Comerciante Errante", emoji:"🧙‍♂️", tier:1, hpM:1, atkM:1, defM:1};

/** Jefes de zona: mucho más resistentes y fuertes que un monstruo normal, con mejor recompensa. */
if(false){
const BOSS_TEMPLATES = [
  {name:"Behemot de Piedra", emoji:"🗿", hpM:5.5, atkM:2.0, defM:2.2},
  {name:"Dragón Ancestral", emoji:"🐉", hpM:5.0, atkM:2.3, defM:1.8},
  {name:"Señor Demonio", emoji:"👹", hpM:5.2, atkM:2.1, defM:2.0},
  {name:"Rey Trasgo", emoji:"👺", hpM:4.8, atkM:2.0, defM:1.9},
];

const PROC_LABELS = {burn:"🔥 Quema", poison:"☠️ Envenena", haste:"💨 Acelera"};

/** Botín temático: cada jefe puede dejar (con cierta probabilidad) un objeto único relacionado a su tipo,
 *  con estadísticas que escalan según el nivel del jefe derrotado, su propio color de aura, y a veces
 *  una propiedad especial (quemar / envenenar / acelerar) al golpear. */
const BOSS_LOOT_THEMES = {
  "Behemot de Piedra": {
    slot:"armor", name:"Armadura de Behemot", emoji:"🗿", auraColor:"#aab2c5",
    baseBonuses:{def:2, maxHp:3}, proc:null
  },
  "Dragón Ancestral": {
    slot:"weapon", auraColor:"#c98bf0", emoji:"🐉",
    weaponNames:{ guerrero:"Espada de Hoja de Dragón", mago:"Cetro de Escamas de Dragón",
      arquero:"Arco de Colmillo de Dragón", berserker:"Hacha de Garra de Dragón" },
    baseBonuses:{atk:1.4}, proc:{type:"burn", chance:0.25, mult:0.5}
  },
  "Señor Demonio": {
    slot:"weapon", auraColor:"#ef5d6f", emoji:"👹",
    weaponNames:{ guerrero:"Espada Demoníaca", mago:"Cetro Demoníaco",
      arquero:"Arco Demoníaco", berserker:"Hacha Demoníaca" },
    baseBonuses:{atk:1, matk:1}, proc:{type:"poison", chance:0.25, mult:0.5}
  },
  "Rey Trasgo": {
    slot:"accessory", name:"Anillo del Rey Trasgo", emoji:"💍", auraColor:"#4fd67a",
    baseBonuses:{spd:1, atk:1}, proc:{type:"haste", chance:0.25}
  }
};
}

/** Registro de objetos generados en tiempo real (botín de jefe) para que se puedan encontrar de nuevo
 *  por id (equipar, guardar/cargar partida), ya que no forman parte de las tablas fijas del juego. */
let bossLootRegistry = {};
function generateBossLootItem(bossTplName, bossLevel, classKeyForWeapon){
  const theme = BOSS_LOOT_THEMES[bossTplName];
  if(!theme) return null;
  const mult = 1 + bossLevel*0.9; // escala con el nivel del jefe derrotado
  const bonuses = scaleBonuses(theme.baseBonuses, mult);
  let name = theme.name;
  let classKey = null;
  if(theme.slot === "weapon"){
    classKey = classKeyForWeapon;
    name = (theme.weaponNames||{})[classKey] || `Arma de ${bossTplName}`;
  }
  const id = "bossloot_" + Math.random().toString(36).slice(2,10);
  const item = {
    id, name, emoji: theme.emoji, type:"equip", slot: theme.slot, classKey,
    requiredClass: CLASS_ID_MAP[classKey]||null,
    isBossLoot: true, bossName: bossTplName, auraColor: theme.auraColor,
    bonuses, value: Math.round(60 * mult),
    reqLevel: Math.max(1, bossLevel-3),
    proc: theme.proc || null,
    lunarWeapon: bossTplName === "Lobo Nocturno",
    desc: bonusDesc(bonuses) + ` · botín de ${bossTplName}` + (theme.proc ? ` · ${PROC_LABELS[theme.proc.type]} (${Math.round(theme.proc.chance*100)}%)` : "")
      + (bossTplName === "Lobo Nocturno" ? " · 🌙 +30% daño de noche" : "")
  };
  bossLootRegistry[id] = item;
  return item;
}

if(false){
const ITEM_TABLE = [
  {id:"potion_s", name:"Poción pequeña", emoji:"🧪", type:"heal", amount:0.3, weight:34, value:20, desc:"Restaura 30% de tu HP."},
  {id:"potion_m", name:"Poción de maná", emoji:"🔵", type:"mana", amount:0.4, weight:22, value:18, desc:"Restaura 40% de tu MP."},
  {id:"elixir", name:"Elixir mayor", emoji:"⚗️", type:"heal", amount:0.6, weight:10, value:45, desc:"Restaura 60% de tu HP."},
  {id:"gem_atk", name:"Gema de Fuerza", emoji:"🔺", type:"stat", stat:"atk", amount:1, weight:12, value:35, desc:"+1 ATQ permanente."},
  {id:"gem_def", name:"Gema de Defensa", emoji:"🔷", type:"stat", stat:"def", amount:1, weight:12, value:35, desc:"+1 DEF permanente."},
  {id:"gem_spd", name:"Gema de Viento", emoji:"🟡", type:"stat", stat:"spd", amount:1, weight:8, value:30, desc:"+1 VEL permanente."},
  {id:"gem_hp", name:"Núcleo Vital", emoji:"❤️", type:"stat", stat:"maxHp", amount:4, weight:8, value:30, desc:"+4 HP máx. permanente."},
];

/** Ítems para mascotas — solo aparecen en la tienda si ya tienes al menos una capturada. */
const PET_ITEM_TABLE = [
  {id:"pet_treat", name:"Golosina de Entrenamiento", emoji:"🦴", type:"pet_item", petLevelUp:1, value:60, desc:"Sube el nivel de una mascota +1."},
  {id:"pet_collar", name:"Collar de Vínculo", emoji:"🎗️", type:"pet_item", petLevelUp:2, value:120, desc:"Sube el nivel de una mascota +2."},
];

/** SOLO PARA PRUEBAS: deja comprar la Carta de Captura con oro en la tienda, para probar el sistema
 *  de captura sin tener que derrotar antes a los 5 guardianes de región. Quitar cuando se termine de probar. */
const TEST_SHOP_ITEMS = [
  {id:"capture_card_test", name:"Carta de Captura", emoji:"🎴", type:"capture_card", tradeable:false, value:150,
    desc:"[PRUEBA] Úsala en combate cuando el enemigo tenga poca vida para capturarlo como mascota."},
];
}

/* ============================================================
   EQUIPO — 5 slots (arma/armadura/casco/botas/accesorio) x 5 rarezas
   classKey en un arma: null = cualquier clase puede equiparla; si tiene
   valor, solo esa clase (arma temática por clase). Armadura/casco/botas/
   accesorio son universales para cualquier clase.
   ============================================================ */
if(false){
const RARITY_TIERS = [
  {key:"common",    label:"Común",          color:"#aab2c5", mult:1.0, priceMult:1,  weight:30},
  {key:"uncommon",  label:"Poco Común",     color:"#4fd67a", mult:1.7, priceMult:2.4, weight:18},
  {key:"rare",      label:"Raro",           color:"#4aa3e0", mult:2.6, priceMult:5,  weight:10},
  {key:"epic",      label:"✨ Épico",        color:"#c98bf0", mult:6.5, priceMult:22, weight:4},
  {key:"legendary", label:"👑 Legendario",   color:"#e8c468", mult:11,  priceMult:55, weight:1},
];
const RARITY_BY_KEY = Object.fromEntries(RARITY_TIERS.map(t=>[t.key,t]));
const STAT_LABEL = {atk:"ATQ", matk:"AT.MÁG", def:"DEF", spd:"VEL", maxHp:"HP máx.", maxMp:"MP máx."};

/* ---------- Tramos de nivel: la tienda se renueva con equipo más fuerte y caro cada 15 niveles ---------- */
const LEVEL_TIERS = [
  {reqBase:1,  mult:1.0, priceMult:1.0, suffix:""},
  {reqBase:30, mult:1.9, priceMult:2.6, suffix:" Real"},
  {reqBase:45, mult:3.0, priceMult:4.8, suffix:" Ancestral"},
  {reqBase:60, mult:4.6, priceMult:8,   suffix:" Celestial"},
  {reqBase:75, mult:6.8, priceMult:13,  suffix:" Divina"},
  {reqBase:90, mult:9.5, priceMult:20,  suffix:" Primordial"},
];






const WEAPON_BASE = {
  guerrero:  {name:"Espada",  emoji:"⚔️", bonuses:{atk:3}},
  mago:      {name:"Cetro",   emoji:"🔮", bonuses:{atk:1, matk:4, maxMp:4}},
  arquero:   {name:"Arco",    emoji:"🏹", bonuses:{atk:3, spd:1}},
  berserker: {name:"Hacha",   emoji:"🪓", bonuses:{atk:4}},
};
const ARMOR_BASE   = {name:"Armadura", emoji:"🛡️", bonuses:{def:3, maxHp:5}};
const HELMET_BASE  = {name:"Casco",    emoji:"⛑️", bonuses:{def:2, maxHp:3, maxMp:2}};
const BOOTS_BASE   = {name:"Botas",    emoji:"👢", bonuses:{spd:2, def:1}};
const ACCESSORY_BASES = [
  {name:"Anillo",    emoji:"💍", bonuses:{atk:2, matk:1}},
  {name:"Collar",    emoji:"📿", bonuses:{maxHp:4, maxMp:2}},
  {name:"Talismán",  emoji:"🧿", bonuses:{spd:1, matk:2}},
];

const EQUIP_TABLE = [];

/** La rareza es la que más pesa en el requisito de nivel (lo épico/legendario es lo más caro y lo que más sube
 *  características, así que debe pedir bastante más nivel que un común/poco común/raro del mismo tramo). */
const RARITY_REQ_OFFSET = {common:0, uncommon:0, rare:0, epic:30, legendary:45};
/** Genera un objeto por cada combinación de tramo de nivel × rareza.
 *  El tramo base (reqBase:1) mantiene los mismos ids/stats de siempre para no romper partidas guardadas;
 *  los tramos de nivel 30+ se agregan después, con más fuerza, más precio y su propio requisito de nivel. */







const EQUIP_SLOTS = [
  {key:"weapon",    label:"Arma",      emoji:"🗡️"},
  {key:"armor",     label:"Armadura",  emoji:"🛡️"},
  {key:"helmet",    label:"Casco",     emoji:"⛑️"},
  {key:"boots",     label:"Botas",     emoji:"👢"},
  {key:"accessory", label:"Accesorio", emoji:"💍"},
];


/* ---------- Objetos EXCLUSIVOS (solo los vende el NPC Comerciante, nunca la tienda estática) ---------- */
const EXCLUSIVE_TABLE = [
  {id:"ex_cape", name:"Capa del Cazador de Sombras", emoji:"🧣", type:"equip", slot:"accessory", classKey:null, rarity:"legendary",
    bonuses:{spd:4, atk:3, matk:3}, value:420, desc:"+4 VEL, +3 ATQ, +3 AT.MÁG · exclusivo del comerciante"},
  {id:"ex_crown", name:"Corona del Vacío", emoji:"👑", type:"equip", slot:"helmet", classKey:null, rarity:"legendary",
    bonuses:{maxHp:20, maxMp:20, def:4}, value:430, desc:"+20 HP, +20 MP, +4 DEF · exclusivo del comerciante"},
  {id:"ex_elixir", name:"Elixir Prohibido", emoji:"🧪", type:"heal", amount:1.0, value:120, desc:"Restaura 100% de tu HP · exclusivo del comerciante"},
  {id:"ex_boots", name:"Botas del Viento Fantasma", emoji:"👢", type:"equip", slot:"boots", classKey:null, rarity:"epic",
    bonuses:{spd:6, def:2}, value:260, desc:"+6 VEL, +2 DEF · exclusivo del comerciante"},
  {id:"ex_orb", name:"Orbe del Archimago Perdido", emoji:"🔮", type:"equip", slot:"weapon", classKey:"mago", rarity:"legendary",
    bonuses:{atk:2, matk:18, maxMp:16}, value:440, desc:"+2 ATQ, +18 AT.MÁG, +16 MP máx. · exclusivo del comerciante"},
];
}

/* ============================================================
   DURABILIDAD DEL EQUIPO — arma/escudo/armadura/casco/botas se desgastan
   SOLO al ganar un combate (nunca al caminar ni estar inactivo), y se
   reparan en la Forja con oro + el material correspondiente. El objeto
   nunca desaparece ni se rompe permanentemente: por debajo del 10% de
   durabilidad solo entra en estado "Dañado" (-10% a sus bonificaciones)
   hasta que se repare.

   Pensado para ser fácil de extender: agregar un material nuevo es una
   línea en DURABILITY_MATERIALS; agregar un tipo de enemigo con su
   propio desgaste es una línea en DURABILITY_WEAR_BY_ENEMY_TIER; el
   resto de la lógica (desgaste, penalización, reparación) no cambia.
   ============================================================ */

// Cuánta durabilidad máxima tiene un objeto según su rareza — apunta a los ~100-500 combates
// de balance pedidos (común: 100-150, poco común: entre medio, raro: 180-250, épico: 250-350,
// legendario: 350-500), asumiendo un desgaste típico de ~1 punto por combate normal.
const DURABILITY_BY_RARITY = {
  common: 120, uncommon: 150, rare: 200, epic: 300, legendary: 420,
};

// Cada material define cuánto cuesta reparar UN punto de durabilidad (oro + un recurso propio)
// y qué tan rápido se desgasta en combate (multiplicador sobre el desgaste base del enemigo).
// Agregar un material nuevo (por ejemplo un evento especial) es solo agregar una fila aquí.
const DURABILITY_MATERIALS = {
  WOOD:      {label:"Madera",    goldPerPoint:2.0, resource:"wood",     resourcePerPoint:0.08, wearMult:1.15},
  IRON:      {label:"Hierro",    goldPerPoint:2.5, resource:"iron",     resourcePerPoint:0.09, wearMult:1.0},
  STEEL:     {label:"Acero",     goldPerPoint:3.0, resource:"iron",     resourcePerPoint:0.11, wearMult:0.9},
  OBSIDIAN:  {label:"Obsidiana", goldPerPoint:3.6, resource:"stone",    resourcePerPoint:0.13, wearMult:0.82},
  CRYSTAL:   {label:"Cristal",   goldPerPoint:4.2, resource:"crystals", resourcePerPoint:0.02, wearMult:0.75},
  MOONSTONE: {label:"Lunar",     goldPerPoint:4.8, resource:"crystals", resourcePerPoint:0.024, wearMult:0.7},
  DRAGON:    {label:"Dragón",    goldPerPoint:5.6, resource:"crystals", resourcePerPoint:0.03, wearMult:0.6},
};
const RESOURCE_DISPLAY = {wood:"🪵 Madera", stone:"🪨 Piedra", iron:"🔩 Hierro", crystals:"💎 Cristales", gold:"🪙 Oro"};

// Qué material le toca a cada objeto por defecto (según su rareza) — el botín único de jefe
// siempre usa el material más noble disponible. Se guarda en el objeto la primera vez
// (initItemDurability), así que cambiar este mapeo no afecta objetos que ya existan.
const RARITY_TO_MATERIAL = {common:"WOOD", uncommon:"IRON", rare:"STEEL", epic:"OBSIDIAN", legendary:"CRYSTAL"};
function materialForItem(item){
  if(item.isBossLoot) return "DRAGON";
  return RARITY_TO_MATERIAL[item.rarity] || "IRON";
}

// Cuánta durabilidad quita CADA enemigo derrotado (una vez por combate ganado, no por golpe).
// Agregar un tipo de enemigo con su propio desgaste es solo una línea más aquí.
const DURABILITY_WEAR_BY_ENEMY_TIER = {normal:1, golem:2, boss:4, dragon:5};

// Los tipos de equipo que participan del sistema — los slots que existen hoy (arma, offhand,
// armadura, casco, botas). Los accesorios quedan afuera del sistema de durabilidad.
const DURABILITY_SLOTS = ["weapon","offhand","armor","helmet","boots"];
const DAMAGED_THRESHOLD_PCT = 0.10; // por debajo de esto, el objeto entra en estado "Dañado"
const DAMAGED_PENALTY_MULT = 0.9;   // -10% a sus bonificaciones mientras esté dañado
const LOW_DURABILITY_NOTIFY_PCT = 0.20; // aviso único de "necesita reparación" al cruzar este umbral

/** Le da a un objeto de equipo su durabilidad inicial (llena) la primera vez que entra al
 *  inventario — se llama una sola vez, desde pushItemSafe. No hace nada con accesorios ni con
 *  objetos que ya traigan durabilidad (por ejemplo, al reconstruirse desde el guardado). */
function initItemDurability(item){
  if(!item || item.type !== "equip" || !DURABILITY_SLOTS.includes(item.slot)) return;
  if(item.durability != null) return;
  item.material = item.material || materialForItem(item);
  item.maxDurability = DURABILITY_BY_RARITY[item.rarity] || 150;
  item.durability = item.maxDurability;
}
function durabilityPct(item){ return item.maxDurability ? item.durability/item.maxDurability : 1; }
/** Para el guardado: como los objetos se reconstruyen desde las tablas fijas por id, la
 *  durabilidad/material (estado propio de CADA instancia) se guarda aparte, igual que ya se
 *  hace con equipmentUpgrades. */
function durabilitySaveData(item){
  if(!item || item.durability == null) return null;
  return {durability: item.durability, maxDurability: item.maxDurability, material: item.material};
}
function isItemDamaged(item){ return item.durability != null && durabilityPct(item) < DAMAGED_THRESHOLD_PCT; }
/** verde/amarillo/naranja/rojo según el % de durabilidad que le queda (no según su material). */
function durabilityState(item){
  const pct = durabilityPct(item);
  if(pct >= 0.7) return "green";
  if(pct >= 0.4) return "yellow";
  if(pct >= DAMAGED_THRESHOLD_PCT) return "orange";
  return "red";
}

/** El equipo NUNCA deja de aplicar su bonificación por completo — mientras esté por encima del
 *  10% rinde al 100%. Como las bonificaciones ya se suman de una vez a las estadísticas del
 *  jugador al equipar (ver applyBonuses/unapplyBonuses), la penalización de "Dañado" se aplica
 *  como un ajuste puntual (delta) exactamente al cruzar el umbral, y se revierte al repararlo —
 *  así nunca hace falta recalcular todas las estadísticas desde cero. */
/** Cuánto de la bonificación de un objeto está REALMENTE sumado a las estadísticas ahora mismo:
 *  el 100% normalmente, o el 90% si está en estado "Dañado" — se usa al desequipar, para revertir
 *  exactamente lo que se había aplicado (nunca de más ni de menos). */
function effectiveBonuses(item){
  if(!item || !item.bonuses) return item ? item.bonuses : null;
  if(!item._damagedPenaltyApplied) return item.bonuses;
  const out = {};
  Object.entries(item.bonuses).forEach(([k,v])=> out[k] = Math.round(v*DAMAGED_PENALTY_MULT));
  return out;
}
function syncDamagedPenalty(item){
  if(!item || !item.bonuses || !DURABILITY_SLOTS.includes(item.slot)) return;
  if(!isItemCurrentlyEquipped(item)) return; // solo afecta stats si está puesto ahora mismo
  const damaged = isItemDamaged(item);
  if(damaged && !item._damagedPenaltyApplied){
    const delta = {};
    Object.entries(item.bonuses).forEach(([k,v])=> delta[k] = -(v - Math.round(v*DAMAGED_PENALTY_MULT)));
    applyBonuses(delta);
    item._damagedPenaltyApplied = true;
    refreshHud();
  } else if(!damaged && item._damagedPenaltyApplied){
    const delta = {};
    Object.entries(item.bonuses).forEach(([k,v])=> delta[k] = (v - Math.round(v*DAMAGED_PENALTY_MULT)));
    applyBonuses(delta);
    item._damagedPenaltyApplied = false;
    refreshHud();
  }
}
/** Avisa UNA sola vez (no repite el mensaje) cuando una pieza cruza el 20% de durabilidad. */
function maybeNotifyLowDurability(item){
  if(item.durability == null) return;
  if(durabilityPct(item) <= LOW_DURABILITY_NOTIFY_PCT){
    if(!item._lowDurabilityNotified){
      item._lowDurabilityNotified = true;
      toast(`⚠️ ${item.name} necesita reparación.`, 4200);
    }
  } else {
    item._lowDurabilityNotified = false;
  }
}
/** Se llama una vez por combate PvE ganado — reparte el desgaste correspondiente entre todo el
 *  equipo puesto ahora mismo (nunca al inventario sin equipar, ni al caminar/estar inactivo). */
function applyCombatWearToEquipment(mon){
  if(!mon) return;
  let tier = "normal";
  if(mon.isBoss) tier = /Dragón/i.test((mon.tpl&&mon.tpl.name)||"") ? "dragon" : "boss";
  else if(mon.tpl && mon.tpl.name === "Golem de Roca") tier = "golem";
  else if(mon.tpl && (mon.tpl.name === "Lobo Sombrío" || mon.tpl.name === "Lobo Nocturno")) tier = "boss";
  const baseWear = DURABILITY_WEAR_BY_ENEMY_TIER[tier] || 1;
  DURABILITY_SLOTS.forEach(slot=>{
    const item = player.equipment[slot];
    if(!item || item.durability == null) return;
    const material = DURABILITY_MATERIALS[item.material] || DURABILITY_MATERIALS.IRON;
    const wear = Math.max(1, Math.round(baseWear * material.wearMult));
    item.durability = Math.max(0, item.durability - wear);
    syncDamagedPenalty(item);
    maybeNotifyLowDurability(item);
  });
}
/** Cuánto cuesta reparar un objeto por completo (oro + su recurso propio), redondeado hacia
 *  arriba para que reparar siempre cueste al menos 1 de cada cosa si falta algo de durabilidad. */
function repairCostFor(item){
  const missing = (item.maxDurability||0) - (item.durability||0);
  if(missing <= 0) return {gold:0, resource:null, resourceAmt:0};
  const material = DURABILITY_MATERIALS[item.material] || DURABILITY_MATERIALS.IRON;
  return {gold: Math.ceil(missing*material.goldPerPoint), resource: material.resource, resourceAmt: Math.ceil(missing*material.resourcePerPoint)};
}
function canAffordRepair(cost){
  if((player.gold||0) < cost.gold) return false;
  if(cost.resource && (player[cost.resource]||0) < cost.resourceAmt) return false;
  return true;
}
/** Repara un objeto por completo — cobra oro + el recurso de su material, y si estaba dañado,
 *  revierte esa penalización. Nunca falla "a medias": o se puede pagar todo, o no se repara. */
function repairItem(item){
  const cost = repairCostFor(item);
  if(cost.gold<=0 && cost.resourceAmt<=0){ toast(`${item.name} ya está al 100%.`); return false; }
  if(!canAffordRepair(cost)){
    const faltaRes = cost.resource ? ` y ${cost.resourceAmt} ${RESOURCE_DISPLAY[cost.resource]||cost.resource}` : "";
    toast(`Te falta oro/material para reparar ${item.name} (necesitas 🪙${cost.gold}${faltaRes}).`, 4200);
    return false;
  }
  player.gold -= cost.gold;
  if(cost.resource) player[cost.resource] = (player[cost.resource]||0) - cost.resourceAmt;
  item.durability = item.maxDurability;
  syncDamagedPenalty(item);
  maybeNotifyLowDurability(item);
  refreshHud();
  saveGame();
  gameEventBus.emit({ type: "EQUIPMENT_UPGRADED", payload: { amount: 1 } });
  toast(`🔨 ¡Reparaste ${item.name}!`, 3000);
  return true;
}
/** Junta todo el equipo con durabilidad (puesto + en el inventario) en una sola lista, para la
 *  Forja y para calcular el costo total de "Reparar Todo". */
function allDurabilityItems(){
  const out = [];
  DURABILITY_SLOTS.forEach(slot=>{ const it = player.equipment[slot]; if(it && it.durability!=null) out.push(it); });
  player.inventory.forEach(it=>{ if(it.durability!=null) out.push(it); });
  return out;
}
function repairAllItems(){
  const damaged = allDurabilityItems().filter(it=> it.durability < it.maxDurability);
  if(!damaged.length){ toast("Todo tu equipo ya está en perfecto estado."); return; }
  let totalGold = 0;
  const totalByResource = {};
  damaged.forEach(it=>{
    const cost = repairCostFor(it);
    totalGold += cost.gold;
    if(cost.resource) totalByResource[cost.resource] = (totalByResource[cost.resource]||0) + cost.resourceAmt;
  });
  if((player.gold||0) < totalGold || Object.entries(totalByResource).some(([res,amt])=> (player[res]||0) < amt)){
    const partsRes = Object.entries(totalByResource).map(([res,amt])=> `${amt} ${RESOURCE_DISPLAY[res]||res}`).join(" · ");
    toast(`Te falta oro/material para repararlo todo (necesitas 🪙${totalGold}${partsRes?" · "+partsRes:""}).`, 4600);
    return;
  }
  player.gold -= totalGold;
  Object.entries(totalByResource).forEach(([res,amt])=> player[res] = (player[res]||0) - amt);
  damaged.forEach(it=>{ it.durability = it.maxDurability; syncDamagedPenalty(it); maybeNotifyLowDurability(it); });
  refreshHud();
  saveGame();
  gameEventBus.emit({ type: "EQUIPMENT_UPGRADED", payload: { amount: damaged.length } });
  toast(`🔨 ¡Reparaste todo tu equipo! (🪙${totalGold})`, 3400);
  renderForge();
}
/* ============================================================
   HERRERO — fabricar armas exclusivas con materiales (ver BLACKSMITH_RECIPES/CRAFT_MATERIALS en
   game/config/blacksmith.js). Vive dentro de la Forja de siempre (pestaña "Fabricar", ver
   renderForge más abajo) — mismo NPC/pantalla que ya repara equipo, no uno nuevo.
   ============================================================ */
/** Cuánto tiene el jugador de un material de receta — mezcla sin distinción recursos del mundo
 *  (wood/stone/iron/crystals, campos planos de player) y materiales de combate (player.craftMats,
 *  ver CRAFT_MATERIALS): si el key es de un material de combate conocido, lee de ahí; si no, del
 *  campo plano de siempre. */
function resolveMaterialQty(matKey){
  if(CRAFT_MATERIALS.some(m=>m.key===matKey)) return (player.craftMats && player.craftMats[matKey]) || 0;
  return player[matKey] || 0;
}
function spendMaterial(matKey, amount){
  if(CRAFT_MATERIALS.some(m=>m.key===matKey)){
    if(!player.craftMats) player.craftMats = {};
    player.craftMats[matKey] = Math.max(0, (player.craftMats[matKey]||0) - amount);
  } else {
    player[matKey] = Math.max(0, (player[matKey]||0) - amount);
  }
}
function canAffordRecipe(recipe){
  return recipe.materials.every(m=> resolveMaterialQty(m.key) >= m.amount);
}
/** Fabrica una receta del Herrero: cobra los materiales, entrega el arma (exactamente igual que
 *  cualquier otro objeto de equipo — findItemById ya sabe resolver BLACKSMITH_RECIPES por id) y
 *  guarda. No hace nada "a medias": si falta un solo material, o el arma no es de tu clase, o no
 *  hay espacio en el inventario, avisa y no cobra nada. */
function craftWeapon(recipeId){
  const recipe = BLACKSMITH_RECIPES.find(r=>r.id===recipeId);
  if(!recipe) return;
  if(recipe.classKey && recipe.classKey !== player.classKey){
    toast(`${recipe.name} es exclusiva de ${(CLASSES[recipe.classKey]||{}).name || recipe.classKey}.`);
    return;
  }
  if(!canAffordRecipe(recipe)){ toast("🔨 Te faltan materiales para forjar esto.", 3200); return; }
  if(!hasInventorySpace(recipe.id)){ toast("🎒 Tu inventario está lleno — libera espacio antes de forjar.", 3600); return; }
  recipe.materials.forEach(m=> spendMaterial(m.key, m.amount));
  const { materials, ...itemTemplate } = recipe; // `materials` es el costo de la receta, no parte del objeto final
  pushItemSafe({...itemTemplate});
  refreshHud();
  saveGame();
  renderForge();
  toast(`🔨 ¡Forjaste ${recipe.emoji} ${recipe.name}!`, 3800);
}
/** Botín de materiales de fabricación al ganar un combate — aparte del oro/ítems de siempre, si el
 *  monstruo derrotado tiene un material temático asociado (ver CRAFT_MATERIALS), hay chance de que
 *  también lo suelte. Nunca se pierde por falta de espacio (vive en player.craftMats, no en
 *  player.inventory) — se llama desde winBattle/packWinBattle, una vez por monstruo derrotado.
 *  Devuelve los mensajes ("🦷 +2 Colmillo de Lobo") para sumarlos al resto del botín del combate. */
function rollCraftMaterialDrops(monsterName){
  if(!player.craftMats) player.craftMats = {};
  const msgs = [];
  CRAFT_MATERIALS.filter(m=>m.monsterName===monsterName).forEach(m=>{
    if(Math.random() < m.dropChance){
      const amt = m.min + Math.floor(Math.random()*(m.max-m.min+1));
      player.craftMats[m.key] = (player.craftMats[m.key]||0) + amt;
      gameEventBus.emit({ type: "ITEM_OBTAINED", payload: { amount: amt, materialId: m.key } });
      msgs.push(`${m.emoji} +${amt} ${m.label}`);
    }
  });
  return msgs;
}
/** Barra de durabilidad reutilizable — se usa en el detalle del inventario, el panel de equipo
 *  y la Forja, siempre con el mismo lenguaje visual. */
function durabilityBarHtml(item){
  if(item.durability == null) return "";
  const pct = Math.max(0, Math.min(100, Math.round(durabilityPct(item)*100)));
  const state = durabilityState(item);
  const damagedTag = isItemDamaged(item) ? ` <span class="durability-damaged-icon" title="Dañado: -10% a sus bonificaciones">⚠️ Dañado</span>` : "";
  return `<div class="durability-row">
      <div class="durability-bar-wrap"><div class="durability-bar-fill durability-${state}" style="width:${pct}%"></div></div>
      <div class="durability-label">Durabilidad ${item.durability}/${item.maxDurability}${damagedTag}</div>
    </div>`;
}

/* ---------- Equipo disponible para MI clase Y mi nivel (armas propias + slots universales + nivel alcanzado) ---------- */
function equipPoolForMyClass(table){
  return (table||EQUIP_TABLE).filter(it =>
    (!it.classKey || it.classKey === player.classKey) &&
    (!it.reqLevel || it.reqLevel <= player.level)
  );
}

/* ---------- Sprites de personaje (SVG animados por clase) ---------- */
const CLASS_SPRITES = {
  guerrero: `
    <svg viewBox="0 0 100 150" class="char-svg" data-class="guerrero">
      <rect x="40" y="98" width="9" height="32" rx="3" fill="#39435c"/>
      <rect x="53" y="98" width="9" height="32" rx="3" fill="#39435c"/>
      <rect x="34" y="56" width="34" height="44" rx="10" fill="#4a5570" stroke="#5ee1c9" stroke-width="2"/>
      <rect x="34" y="90" width="34" height="6" fill="#e8c468"/>
      <rect x="22" y="60" width="10" height="26" rx="4" fill="#4a5570"/>
      <circle cx="18" cy="72" r="12" fill="#232a3d" stroke="#5ee1c9" stroke-width="2"/>
      <path d="M18 63 L18 81 M9 72 L27 72" stroke="#5ee1c9" stroke-width="2"/>
      <circle cx="51" cy="36" r="16" fill="#e7c9a0"/>
      <path d="M35 32 a16 17 0 0 1 32 0 L66 25 a17 21 0 0 0 -34 0 Z" fill="#7a8296"/>
      <rect x="68" y="60" width="10" height="24" rx="4" fill="#4a5570"/>
      <g class="weapon-sword" style="transform-box:fill-box; transform-origin:50% 100%;">
        <rect x="73" y="22" width="6" height="40" rx="2" fill="#d9dee8"/>
        <rect x="69" y="60" width="14" height="6" rx="1" fill="#e8c468"/>
      </g>
    </svg>`,
  berserker: `
    <svg viewBox="0 0 100 150" class="char-svg" data-class="berserker">
      <rect x="39" y="98" width="10" height="32" rx="3" fill="#3a2430"/>
      <rect x="53" y="98" width="10" height="32" rx="3" fill="#3a2430"/>
      <rect x="30" y="54" width="42" height="46" rx="12" fill="#5c3540" stroke="#ef5d6f" stroke-width="2"/>
      <circle cx="51" cy="34" r="16" fill="#e7c9a0"/>
      <path d="M36 26 q15 -14 30 0" stroke="#2a3348" stroke-width="6" fill="none"/>
      <rect x="19" y="58" width="11" height="28" rx="4" fill="#5c3540"/>
      <rect x="72" y="58" width="11" height="28" rx="4" fill="#5c3540"/>
      <g class="weapon-axe" style="transform-box:fill-box; transform-origin:15% 100%;">
        <rect x="75" y="24" width="7" height="40" rx="2" fill="#c7ccd8"/>
        <path d="M82 24 L97 30 L93 46 L82 40 Z" fill="#ef5d6f"/>
      </g>
    </svg>`,
  mago: `
    <svg viewBox="0 0 100 150" class="char-svg" data-class="mago">
      <path d="M30 130 L38 70 Q51 58 64 70 L72 130 Z" fill="#3a2a52" stroke="#c98bf0" stroke-width="2"/>
      <circle cx="51" cy="34" r="15" fill="#e7c9a0"/>
      <path d="M33 32 Q51 4 69 32 L69 40 Q51 26 33 40 Z" fill="#5b3d82"/>
      <rect x="24" y="62" width="10" height="24" rx="4" fill="#3a2a52"/>
      <rect x="66" y="62" width="10" height="24" rx="4" fill="#3a2a52"/>
      <g class="weapon-staff" style="transform-box:fill-box; transform-origin:50% 100%;">
        <rect x="72" y="26" width="5" height="46" rx="2" fill="#8a6a4a"/>
        <circle class="orb" cx="74.5" cy="22" r="7" fill="#c98bf0" style="transform-box:fill-box; transform-origin:50% 50%;"/>
      </g>
      <circle class="spark s1" cx="80" cy="20" r="2.4" fill="#e7c1fb"/>
      <circle class="spark s2" cx="80" cy="20" r="2" fill="#e7c1fb"/>
      <circle class="spark s3" cx="80" cy="20" r="1.6" fill="#e7c1fb"/>
    </svg>`,
  arquero: `
    <svg viewBox="0 0 100 150" class="char-svg" data-class="arquero">
      <rect x="40" y="98" width="9" height="32" rx="3" fill="#1e3d38"/>
      <rect x="53" y="98" width="9" height="32" rx="3" fill="#1e3d38"/>
      <rect x="34" y="56" width="34" height="44" rx="10" fill="#1f4d45" stroke="#5ee1c9" stroke-width="2"/>
      <circle cx="51" cy="34" r="16" fill="#e7c9a0"/>
      <path d="M35 30 q16 -12 32 0" stroke="#1e3d38" stroke-width="6" fill="none"/>
      <rect x="68" y="58" width="10" height="26" rx="4" fill="#1f4d45"/>
      <g class="weapon-bow" style="transform-box:fill-box; transform-origin:0% 50%;">
        <path d="M20 44 Q34 72 20 100" stroke="#8a6a4a" stroke-width="4" fill="none"/>
        <line class="bowstring" x1="20" y1="44" x2="20" y2="100" stroke="#d9dee8" stroke-width="1.5"/>
        <line class="arrow" x1="20" y1="72" x2="42" y2="72" stroke="#e8c468" stroke-width="3"/>
      </g>
    </svg>`
};

/** Sprites direccionales para el mapa (de momento solo Guerrero masculino; las demás combinaciones
 *  siguen usando su retrato estático de siempre hasta que se agreguen sus propias 4 direcciones). */

function renderPlayerSprite(){
  $("spritePlayer").innerHTML = combatSpriteHtml(player.classKey, player.gender);
  // Pedido explícito, por ahora para Guerrero y Mago (cada uno con su propio set de arte): al
  // iniciar la escena de batalla se ve la pose de "presentación" 3s antes de asentarse en la pose
  // base — renderPlayerSprite() se llama una sola vez por cada inicio de combate (solo/manada/PvP/
  // grupo), así que este es el único lugar que hace falta tocar para que se vea en todos ellos.
  const presentacionSprites = player.classKey === "guerrero" ? GUERRERO_BATTLE_SPRITES
    : player.classKey === "mago" ? MAGO_BATTLE_SPRITES
    : player.classKey === "berserker" ? BERSERKER_BATTLE_SPRITES
    : player.classKey === "arquero" ? ARQUERO_BATTLE_SPRITES : null;
  if(presentacionSprites){
    const img = $("spritePlayer").querySelector("img.battle-sprite-img");
    if(img){
      img.src = presentacionSprites.presentacion;
      clearTimeout(img._presentacionTimer);
      img._presentacionTimer = setTimeout(()=>{ img.src = presentacionSprites.base; }, 3000);
    }
  }
}

/** Devuelve el HTML del sprite de combate en su pose BASE (arma en reposo), según clase y género. */
function combatSpriteHtml(classKey, gender, mirror){
  const g = gender === "f" ? "f" : "m";
  const mirrorStyle = mirror ? ' style="transform:scaleX(-1);"' : '';
  // El Guerrero (cualquier género — todavía solo llegó un set de arte, no dos) usa su propio
  // registro con presentación + secuencia de golpe en vez del par genérico base/attack.
  if(classKey === "guerrero"){
    return `<img src="${GUERRERO_BATTLE_SPRITES.base}" class="battle-sprite-img" data-classkey="${classKey}" data-gender="${g}" data-guerrero-battle="1" data-mirrored="${mirror?1:0}" alt=""${mirrorStyle}>`;
  }
  // Mismo criterio para el Mago: presentación + pose de conjuro + barrera propias en vez del par
  // genérico base/attack.
  if(classKey === "mago"){
    return `<img src="${MAGO_BATTLE_SPRITES.base}" class="battle-sprite-img" data-classkey="${classKey}" data-gender="${g}" data-mago-battle="1" data-mirrored="${mirror?1:0}" alt=""${mirrorStyle}>`;
  }
  // Mismo criterio para el Berserker: presentación + secuencia de slash propias en vez del par
  // genérico base/attack.
  if(classKey === "berserker"){
    return `<img src="${BERSERKER_BATTLE_SPRITES.base}" class="battle-sprite-img" data-classkey="${classKey}" data-gender="${g}" data-berserker-battle="1" data-mirrored="${mirror?1:0}" alt=""${mirrorStyle}>`;
  }
  // Mismo criterio para el Arquero: presentación + secuencia de tiro con arco (varias poses, ver
  // playArqueroAttackSequence) propias en vez del par genérico base/attack.
  if(classKey === "arquero"){
    return `<img src="${ARQUERO_BATTLE_SPRITES.base}" class="battle-sprite-img" data-classkey="${classKey}" data-gender="${g}" data-arquero-battle="1" data-mirrored="${mirror?1:0}" alt=""${mirrorStyle}>`;
  }
  const spr = (CLASS_BATTLE_SPRITES[classKey]||{})[g];
  if(spr) return `<img src="${spr.base}" class="battle-sprite-img" data-classkey="${classKey}" data-gender="${g}" data-mirrored="${mirror?1:0}" alt=""${mirrorStyle}>`;
  return CLASS_SPRITES[classKey] || "🧑";
}

/** Presupuesto de tiempo de la secuencia de golpe del Guerrero — ida (salta hasta el enemigo) +
 *  pausa mostrando el impacto (chispas) + vuelta. Un solo lugar para los tres números, para que
 *  playGuerreroAttackSequence() y postPlayerActionDelay() (cuánto se espera antes de que conteste
 *  el enemigo) nunca queden desincronizados entre sí. Pedido explícito: la pausa del impacto es
 *  de UN segundo completo. */
const GUERRERO_ATTACK_TRAVEL_MS = 380; // ida hasta llegar junto al enemigo (y lo mismo de vuelta)
const GUERRERO_ATTACK_HOLD_MS = 1000;  // se queda ahí sosteniendo el golpe con chispas
const GUERRERO_ATTACK_TOTAL_MS = GUERRERO_ATTACK_TRAVEL_MS*2 + GUERRERO_ATTACK_HOLD_MS;

/** Secuencia de golpe especial del Guerrero: el personaje SALTA de su lugar hasta cerca del
 *  enemigo (cambiando de ataque1 a ataque2 en el trayecto), justo AL LLEGAR se ve ataque-fin (la
 *  espada golpeando con chispas), se queda ahí sosteniendo esa pose un segundo entero, y RECIÉN
 *  ENTONCES empieza a saltar de vuelta — mostrando ataque1 mientras viaja de regreso — hasta que
 *  llega a su posición normal, donde ahí sí se asienta en la pose base. La distancia del salto se
 *  mide en pantalla con getBoundingClientRect() (no un porcentaje fijo del propio sprite) para que
 *  llegue de verdad hasta donde está el enemigo, sea cual sea el tamaño de pantalla.
 *
 *  IMPORTANTE sobre el easing: antes había un solo "easing" para TODA la animación — eso deforma
 *  la relación entre tiempo real y el avance de la animación, así que el salto llegaba/se iba
 *  antes o después de lo que decían los timers de las imágenes (se veían las chispas ya de
 *  regreso). Ahora cada tramo tiene su PROPIO easing (puesto en el keyframe de arranque de ESE
 *  tramo) — así cada offset sigue cayendo exactamente en su tiempo real, sin importar qué tan
 *  "acelerado" se vea cada tramo por separado. */
function playGuerreroAttackSequence(img){
  clearTimeout(img._resetTimer);
  clearTimeout(img._seqTimer1);
  clearTimeout(img._seqTimer2);
  clearTimeout(img._seqTimer3);
  // Si todavía estaba corriendo el timer de "presentación → base" (3s desde que arrancó la
  // batalla, ver renderPlayerSprite), hay que cancelarlo acá — si no, puede disparar A MITAD de
  // esta secuencia (por ejemplo justo durante la pausa del golpe) y pisar la pose con "base" sin
  // que tenga nada que ver con el ataque.
  clearTimeout(img._presentacionTimer);
  img.classList.add("attacking");
  img.src = GUERRERO_BATTLE_SPRITES.attack1;
  img._seqTimer1 = setTimeout(()=>{ img.src = GUERRERO_BATTLE_SPRITES.attack2; }, GUERRERO_ATTACK_TRAVEL_MS*0.5);
  // Pedido explícito: dos variantes del golpe final que se intercalan en CADA ataque (no una al
  // azar que podría repetirse dos veces seguidas) — se guarda el turno en el propio <img> para que
  // se acuerde de un golpe al siguiente durante todo el combate.
  img._attackFinToggle = !img._attackFinToggle;
  const finPose = img._attackFinToggle ? GUERRERO_BATTLE_SPRITES.attackFin2 : GUERRERO_BATTLE_SPRITES.attackFin;
  img._seqTimer2 = setTimeout(()=>{ img.src = finPose; }, GUERRERO_ATTACK_TRAVEL_MS); // llega y golpea acá
  img._seqTimer3 = setTimeout(()=>{ img.src = GUERRERO_BATTLE_SPRITES.attack1; }, GUERRERO_ATTACK_TRAVEL_MS + GUERRERO_ATTACK_HOLD_MS); // arranca la vuelta
  img._resetTimer = setTimeout(()=>{
    img.src = GUERRERO_BATTLE_SPRITES.base; // recién ACÁ, al llegar de verdad a su lugar
    img.classList.remove("attacking");
  }, GUERRERO_ATTACK_TOTAL_MS);

  const container = img.parentElement;
  // #spritePlayer y #spriteEnemy tienen el mismo z-index fijo (.stage .sprite{z-index:1}) — sin
  // desempate, gana el que está más abajo en el DOM (el enemigo, ver index.html), así que apenas
  // el salto lo lleva a superponerse con el rival, el guerrero quedaba TAPADO por él justo en el
  // golpe — pedido explícito: debe quedar por ENCIMA, porque lo está golpeando de frente. Se
  // levanta el z-index del contenedor mientras dura el salto (clase guerrero-attack-lift, ver
  // main.css) y se retira junto con el resto de la secuencia, al volver a la pose base.
  if(container) container.classList.add("guerrero-attack-lift");
  clearTimeout(container && container._liftTimer);
  if(container) container._liftTimer = setTimeout(()=> container.classList.remove("guerrero-attack-lift"), GUERRERO_ATTACK_TOTAL_MS);
  // En manada, el rival no es #spriteEnemy (queda oculto — se ve la fila packStageRow en su
  // lugar) sino el que esté seleccionado como objetivo ahora mismo — mismo criterio que ya usa
  // playCaptureAnimation() para lo mismo (ver targetElId en attemptCapture).
  const targetElId = battleState && battleState.isPack ? "packStageMon"+battleState.selectedTarget : "spriteEnemy";
  const enemyEl = document.getElementById(targetElId);
  if(container && enemyEl && container.animate && !enemyEl.classList.contains("hidden")){
    container.getAnimations().forEach(a=> a.cancel()); // corta un salto anterior si llegara a medio camino
    const from = container.getBoundingClientRect();
    const to = enemyEl.getBoundingClientRect();
    // Llega cerca del enemigo, no encima — 72% del trayecto total, para que se sienta como un
    // salto de ataque y no como si el guerrero se "teletransportara" a pisar al rival.
    const dx = ((to.left+to.width/2) - (from.left+from.width/2)) * 0.72;
    const dy = ((to.top+to.height/2) - (from.top+from.height/2)) * 0.72;
    const arriveOffset = GUERRERO_ATTACK_TRAVEL_MS / GUERRERO_ATTACK_TOTAL_MS;
    const leaveOffset = (GUERRERO_ATTACK_TRAVEL_MS + GUERRERO_ATTACK_HOLD_MS) / GUERRERO_ATTACK_TOTAL_MS;
    const easeOut = "cubic-bezier(.28,.65,.35,1)", easeIn = "cubic-bezier(.4,0,.35,1)";
    container.animate([
      { transform:"translate(0px,0px)", offset:0, easing:easeOut }, // sube hacia el arco de subida
      { transform:`translate(${dx*0.65}px, ${dy*0.65 - 24}px)`, offset:arriveOffset*0.55, easing:easeOut }, // baja hacia el enemigo
      { transform:`translate(${dx}px, ${dy}px)`, offset:arriveOffset, easing:"linear" },  // llega junto al enemigo — golpe con chispas (se queda quieto, el easing acá no importa)
      { transform:`translate(${dx}px, ${dy}px)`, offset:leaveOffset, easing:easeIn },     // arranca el salto de vuelta
      { transform:"translate(0px,0px)", offset:1 },                                        // llega de nuevo a su lugar
    ], { duration:GUERRERO_ATTACK_TOTAL_MS });
  }
}

// Movimiento definitivo del Guerrero (pedido explícito): sube hasta el punto más alto del salto,
// se queda "clavado" en el aire 4 segundos entero resplandeciendo en dorado, y RECIÉN ahí cae en
// cámara lenta hasta golpear al enemigo, antes de volver a su posición base.
const GUERRERO_ULTIMATE_ASCENT_MS = 500;   // sube hasta el punto más alto
const GUERRERO_ULTIMATE_FREEZE_MS = 4000;  // se queda quieto en el aire, resplandor dorado
const GUERRERO_ULTIMATE_FALL_MS = 900;     // cae en cámara lenta hasta el enemigo
const GUERRERO_ULTIMATE_LANDING_MS = GUERRERO_ULTIMATE_ASCENT_MS + GUERRERO_ULTIMATE_FREEZE_MS + GUERRERO_ULTIMATE_FALL_MS; // instante exacto del golpe — usado también para diferir el daño (ver executePlayerAction)
const GUERRERO_ULTIMATE_LANDING_HOLD_MS = 700; // se queda un momento sobre el enemigo (golpe con chispas)
const GUERRERO_ULTIMATE_RETURN_MS = 500;   // vuelve a su lugar
const GUERRERO_ULTIMATE_TOTAL_MS = GUERRERO_ULTIMATE_LANDING_MS + GUERRERO_ULTIMATE_LANDING_HOLD_MS + GUERRERO_ULTIMATE_RETURN_MS; // ~6600ms

function playGuerreroUltimateSequence(img){
  clearTimeout(img._resetTimer);
  clearTimeout(img._seqTimer1);
  clearTimeout(img._seqTimer2);
  clearTimeout(img._seqTimer3);
  clearTimeout(img._presentacionTimer);
  clearTimeout(img._ultGlowOffTimer);
  const container = img.parentElement;
  if(container && container.getAnimations) container.getAnimations().forEach(a=> a.cancel());
  img.classList.add("attacking");
  img.classList.remove("guerrero-ultimate-glow");
  img.src = GUERRERO_BATTLE_SPRITES.attack1;

  img._seqTimer1 = setTimeout(()=>{
    img.src = GUERRERO_BATTLE_SPRITES.attack2; // pose del punto más alto del salto
    img.classList.add("guerrero-ultimate-glow");
  }, GUERRERO_ULTIMATE_ASCENT_MS);
  img._seqTimer2 = setTimeout(()=>{
    img.classList.remove("guerrero-ultimate-glow"); // termina el resplandor, arranca la caída en cámara lenta
  }, GUERRERO_ULTIMATE_ASCENT_MS + GUERRERO_ULTIMATE_FREEZE_MS);
  img._attackFinToggle = !img._attackFinToggle; // mismas dos variantes del golpe final, intercaladas
  const finPose = img._attackFinToggle ? GUERRERO_BATTLE_SPRITES.attackFin2 : GUERRERO_BATTLE_SPRITES.attackFin;
  img._seqTimer3 = setTimeout(()=>{ img.src = finPose; }, GUERRERO_ULTIMATE_LANDING_MS); // llega y golpea acá
  img._resetTimer = setTimeout(()=>{
    img.src = GUERRERO_BATTLE_SPRITES.base;
    img.classList.remove("attacking");
  }, GUERRERO_ULTIMATE_TOTAL_MS);

  if(container) container.classList.add("guerrero-attack-lift"); // mismo motivo que en el salto normal: que no quede tapado por el enemigo al golpear
  clearTimeout(container && container._liftTimer);
  if(container) container._liftTimer = setTimeout(()=> container.classList.remove("guerrero-attack-lift"), GUERRERO_ULTIMATE_TOTAL_MS);

  const targetElId = battleState && battleState.isPack ? "packStageMon"+battleState.selectedTarget : "spriteEnemy";
  const enemyEl = document.getElementById(targetElId);
  if(container && enemyEl && container.animate && !enemyEl.classList.contains("hidden")){
    const from = container.getBoundingClientRect();
    const to = enemyEl.getBoundingClientRect();
    const dx = ((to.left+to.width/2) - (from.left+from.width/2)) * 0.72;
    const dy = ((to.top+to.height/2) - (from.top+from.height/2)) * 0.72;
    // Punto más alto del salto: pedido explícito — el salto exagerado (más alto que uno normal)
    // sacaba al personaje de la pantalla, dejando solo los pies a la vista. Se usa el MISMO arco
    // que un ataque normal (playGuerreroAttackSequence) — la importancia del golpe la transmite
    // el resplandor dorado sostenido 4s, no la altura del salto.
    const peakX = dx*0.65;
    const peakY = dy*0.65 - 24;
    const ascentOffset = GUERRERO_ULTIMATE_ASCENT_MS / GUERRERO_ULTIMATE_TOTAL_MS;
    const freezeOffset = (GUERRERO_ULTIMATE_ASCENT_MS + GUERRERO_ULTIMATE_FREEZE_MS) / GUERRERO_ULTIMATE_TOTAL_MS;
    const landOffset = GUERRERO_ULTIMATE_LANDING_MS / GUERRERO_ULTIMATE_TOTAL_MS;
    const leaveOffset = (GUERRERO_ULTIMATE_LANDING_MS + GUERRERO_ULTIMATE_LANDING_HOLD_MS) / GUERRERO_ULTIMATE_TOTAL_MS;
    const easeOut = "cubic-bezier(.28,.65,.35,1)", easeIn = "cubic-bezier(.4,0,.35,1)";
    const slowFall = "cubic-bezier(.7,0,.84,0)"; // arranca lento — la sensación de cámara lenta — y acelera como si cayera de verdad
    container.animate([
      { transform:"translate(0px,0px)", offset:0, easing:easeOut },                          // sube hacia el punto más alto
      { transform:`translate(${peakX}px, ${peakY}px)`, offset:ascentOffset, easing:"linear" }, // llega arriba y se queda quieto (el tramo siguiente no mueve nada, el easing no importa)
      { transform:`translate(${peakX}px, ${peakY}px)`, offset:freezeOffset, easing:slowFall },  // los 4s de congelado terminan acá — arranca la caída lenta
      { transform:`translate(${dx}px, ${dy}px)`, offset:landOffset, easing:"linear" },          // golpea al enemigo
      { transform:`translate(${dx}px, ${dy}px)`, offset:leaveOffset, easing:easeIn },           // se queda un momento, después arranca la vuelta
      { transform:"translate(0px,0px)", offset:1 },                                             // de nuevo en su lugar
    ], { duration:GUERRERO_ULTIMATE_TOTAL_MS });
  }
}

/** ¿Este movimiento del Guerrero NO es un golpe cuerpo a cuerpo? Pedido explícito: curar (Grito
 *  Heroico), potenciar/debilitar con un grito (Grito de Guerra, Muro de Acero, Grito Intimidante)
 *  y el temblor de área (Terremoto) no pelean ni golpean al rival directamente — para esos usa la
 *  pose de "grito" en vez de saltar hasta el enemigo. Los golpes normales (Golpe Fuerte, Golpe
 *  Sísmico, Ejecución, etc.) siguen usando el salto de siempre. */
function isGuerreroCastMove(mv){
  return !!mv && (mv.type==="heal" || mv.type==="buff" || mv.type==="debuff" || mv.aoe===true);
}

/** Presupuesto de tiempo de la pose de "grito" del Guerrero — se sostiene y vuelve a la base. Para
 *  Terremoto es más largo: pedido explícito, el enemigo se sacude ~2 segundos ENTERO antes de que
 *  se calcule/revele el daño (ver triggerGuerreroEarthquakeShake y "deferHit" en
 *  executePlayerAction) — el Guerrero se queda sosteniendo el grito mientras tanto. */
const GUERRERO_CAST_HOLD_MS = 550;
const GUERRERO_CAST_RETURN_MS = 250;
const GUERRERO_CAST_TOTAL_MS = GUERRERO_CAST_HOLD_MS + GUERRERO_CAST_RETURN_MS;

const GUERRERO_AOE_SHAKE_MS = 2000; // pedido explícito: ~2 segundos de sacudida antes del daño
const GUERRERO_AOE_RETURN_MS = 300;
const GUERRERO_AOE_TOTAL_MS = GUERRERO_AOE_SHAKE_MS + GUERRERO_AOE_RETURN_MS;

// Grito de Guerra / Muro de Acero (potenciarse a sí mismo): pedido explícito — sostener la pose
// de grito ~2s con un aura de color sobre el propio personaje (ver playGuerreroBuffSequence).
const GUERRERO_BUFF_HOLD_MS = 1700;
const GUERRERO_BUFF_RETURN_MS = 300;
const GUERRERO_BUFF_TOTAL_MS = GUERRERO_BUFF_HOLD_MS + GUERRERO_BUFF_RETURN_MS; // ~2000ms

/** Pose de "grito": el personaje levanta la espada SIN desplazarse hacia el rival — para curar,
 *  potenciar/debilitar con un grito, o el temblor de Terremoto (ver isGuerreroCastMove). Sostiene
 *  la pose más tiempo cuando es de área (isAoe), para acompañar los ~2s de sacudida del enemigo. */
function playGuerreroCastSequence(img, isAoe){
  clearTimeout(img._resetTimer);
  clearTimeout(img._seqTimer1);
  clearTimeout(img._seqTimer2);
  clearTimeout(img._seqTimer3);
  clearTimeout(img._presentacionTimer); // mismo motivo que en playGuerreroAttackSequence
  const container = img.parentElement;
  if(container && container.getAnimations) container.getAnimations().forEach(a=> a.cancel()); // corta un salto de golpe anterior si quedó a medio camino
  img.classList.add("attacking");
  img.src = GUERRERO_BATTLE_SPRITES.shout;
  img._resetTimer = setTimeout(()=>{
    img.src = GUERRERO_BATTLE_SPRITES.base;
    img.classList.remove("attacking");
  }, isAoe ? GUERRERO_AOE_TOTAL_MS : GUERRERO_CAST_TOTAL_MS);
}

/** Grito de Guerra (potencia ATQ) / Muro de Acero (potencia DEF) / Grito Heroico (cura): misma
 *  pose de grito que playGuerreroCastSequence, pero sostenida ~2s (pedido explícito) y con un
 *  aura de color + ícono flotando sobre el propio personaje — roja con espada para ATQ, azul con
 *  escudo para DEF, verde con "+" para la curación (ver .guerrero-aura-atk/-def/-heal en
 *  main.css). `kind` es mv.buff ("atk"/"def") para los movimientos de potenciar, o "heal" para
 *  Grito Heroico. */
function playGuerreroBuffSequence(img, kind){
  clearTimeout(img._resetTimer);
  clearTimeout(img._seqTimer1);
  clearTimeout(img._seqTimer2);
  clearTimeout(img._seqTimer3);
  clearTimeout(img._presentacionTimer);
  const container = img.parentElement;
  if(container && container.getAnimations) container.getAnimations().forEach(a=> a.cancel());
  img.classList.add("attacking");
  img.src = GUERRERO_BATTLE_SPRITES.shout;
  img._resetTimer = setTimeout(()=>{
    img.src = GUERRERO_BATTLE_SPRITES.base;
    img.classList.remove("attacking");
  }, GUERRERO_BUFF_TOTAL_MS);
  if(container){
    const auraCls = kind === "def" ? "guerrero-aura-def" : kind === "heal" ? "guerrero-aura-heal" : "guerrero-aura-atk";
    container.classList.remove("guerrero-aura-atk","guerrero-aura-def","guerrero-aura-heal");
    void container.offsetWidth; // fuerza reflow para poder re-disparar la animación en usos seguidos
    container.classList.add(auraCls);
    clearTimeout(container._auraTimer);
    container._auraTimer = setTimeout(()=> container.classList.remove(auraCls), GUERRERO_BUFF_TOTAL_MS);
  }
}

// Cuánto se sostiene la pose de escudo cuando el Guerrero bloquea un golpe fuerte con el gesto de
// defensa (ver playGuerreroDefendPose, resolveEnemyDirectAttack y la barra de defensa en enemyTurn).
// Pedido explícito: que alcance a verse bien — antes se sostenía muy poco y parecía un parpadeo.
const GUERRERO_DEFEND_HOLD_MS = 1000;
// Cuánto se espera DESPUÉS de que el enemigo arranca su animación de golpe (.sprite.attacke,
// lungeL de .5s) antes de que el jugador levante su gesto de defensa (escudo del Guerrero, barrera
// del Mago) — pedido explícito: que primero se note que el enemigo ataca, y recién cuando "llega"
// el golpe (más o menos a mitad de su animación) reaccione el jugador, en vez de las dos cosas a
// la vez. Compartido entre las clases con pose de defensa (ver classHasDefendPose).
const BLOCK_REACT_MS = 280;
// Tamaño de la barra de defensa al arrancar CADA combate: un % de la vida máxima actual del
// jugador (ver startBattle). Pedido explícito: nunca se recarga ni se cura durante el combate —
// solo se vuelve a llenar al empezar uno nuevo. Compartido entre las clases con pose de defensa.
const DEFENSE_BAR_PCT = 0.6;

/** Pose de escudo en alto — se dispara cuando el Guerrero bloquea con éxito un golpe fuerte usando
 *  el gesto de defensa (ver enemyTurn/resolveEnemyDirectAttack). No salta ni se desplaza, solo
 *  sostiene la pose un momento y vuelve a la base — mismo patrón que playGuerreroCastSequence. */
function playGuerreroDefendPose(){
  const container = $("spritePlayer");
  const img = container && container.querySelector("img.battle-sprite-img");
  if(!img) return;
  clearTimeout(img._resetTimer);
  clearTimeout(img._seqTimer1);
  clearTimeout(img._seqTimer2);
  clearTimeout(img._seqTimer3);
  clearTimeout(img._presentacionTimer);
  if(container.getAnimations) container.getAnimations().forEach(a=> a.cancel());
  img.classList.add("attacking");
  img.src = GUERRERO_BATTLE_SPRITES.defend;
  img._resetTimer = setTimeout(()=>{
    img.src = GUERRERO_BATTLE_SPRITES.base;
    img.classList.remove("attacking");
  }, GUERRERO_DEFEND_HOLD_MS);
}

/** Presupuesto de tiempo de la pose de conjuro del Mago — se sostiene el bastón en alto con el
 *  estallido morado y vuelve a la base. El Mago es un lanzador de hechizos: NO salta hasta el
 *  enemigo como el Guerrero, así que una sola pose (sin secuencia de viaje) sirve para TODOS sus
 *  movimientos ofensivos/de apoyo (ataque, potenciar, curar, debilitar) — ver playMagoCastSequence. */
const MAGO_CAST_HOLD_MS = 480;
const MAGO_CAST_RETURN_MS = 260;
const MAGO_CAST_TOTAL_MS = MAGO_CAST_HOLD_MS + MAGO_CAST_RETURN_MS;

/** Pose de conjuro del Mago: levanta el bastón con el estallido morado, la sostiene un momento y
 *  vuelve a la base — mismo patrón que playGuerreroCastSequence, pero sin distinguir entre golpe/
 *  grito/área porque solo hay una pose de acción disponible. */
function playMagoCastSequence(img){
  clearTimeout(img._resetTimer);
  clearTimeout(img._seqTimer1);
  clearTimeout(img._seqTimer2);
  clearTimeout(img._seqTimer3);
  clearTimeout(img._presentacionTimer);
  const container = img.parentElement;
  if(container && container.getAnimations) container.getAnimations().forEach(a=> a.cancel());
  img.classList.add("attacking");
  img.src = MAGO_BATTLE_SPRITES.attack;
  img._resetTimer = setTimeout(()=>{
    img.src = MAGO_BATTLE_SPRITES.base;
    img.classList.remove("attacking");
  }, MAGO_CAST_TOTAL_MS);
}

// Cuánto se sostiene la pose de barrera cuando el Mago bloquea un golpe fuerte con el gesto de
// defensa — mismo criterio que GUERRERO_DEFEND_HOLD_MS.
const MAGO_DEFEND_HOLD_MS = 1000;

/** Pose de barrera mágica en alto — se dispara cuando el Mago bloquea con éxito un golpe fuerte
 *  usando el gesto de defensa (ver enemyTurn/resolveEnemyDirectAttack). Mismo patrón que
 *  playGuerreroDefendPose. */
function playMagoDefendPose(){
  const container = $("spritePlayer");
  const img = container && container.querySelector("img.battle-sprite-img");
  if(!img) return;
  clearTimeout(img._resetTimer);
  clearTimeout(img._seqTimer1);
  clearTimeout(img._seqTimer2);
  clearTimeout(img._seqTimer3);
  clearTimeout(img._presentacionTimer);
  if(container.getAnimations) container.getAnimations().forEach(a=> a.cancel());
  img.classList.add("attacking");
  img.src = MAGO_BATTLE_SPRITES.defend;
  img._resetTimer = setTimeout(()=>{
    img.src = MAGO_BATTLE_SPRITES.base;
    img.classList.remove("attacking");
  }, MAGO_DEFEND_HOLD_MS);
}

/** Presupuesto de tiempo del slash del Berserker — pedido explícito: NO es un salto con arco como
 *  el Guerrero, es un deslizamiento/slash directo por el piso (solo desplazamiento horizontal, sin
 *  altura). Ida (desliza hasta el enemigo) + pausa mostrando el golpe (sangre/polvo) + vuelta. */
const BERSERKER_ATTACK_TRAVEL_MS = 260; // ida deslizándose hasta llegar junto al enemigo (y lo mismo de vuelta)
const BERSERKER_ATTACK_HOLD_MS = 850;   // se queda ahí sosteniendo el golpe
const BERSERKER_ATTACK_TOTAL_MS = BERSERKER_ATTACK_TRAVEL_MS*2 + BERSERKER_ATTACK_HOLD_MS;

/** Secuencia de golpe del Berserker: se DESLIZA por el piso (translateX puro, sin arco vertical)
 *  desde su lugar hasta cerca del enemigo mostrando ataque1 (espada más abajo, recién arrancando el
 *  slash), justo AL LLEGAR alterna entre las dos variantes del golpe de llegada (ataque-fin/
 *  ataque-fin2 — misma sangre/polvo barridos, mismo patrón de alternancia que el Guerrero), sostiene
 *  el golpe, y recién ahí desliza de vuelta hasta su lugar, donde se asienta en la pose base. */
function playBerserkerAttackSequence(img){
  clearTimeout(img._resetTimer);
  clearTimeout(img._seqTimer1);
  clearTimeout(img._seqTimer2);
  clearTimeout(img._seqTimer3);
  clearTimeout(img._presentacionTimer);
  img.classList.add("attacking");
  img.src = BERSERKER_BATTLE_SPRITES.attack1;
  img._attackFinToggle = !img._attackFinToggle; // mismas dos variantes intercaladas que el Guerrero
  const finPose = img._attackFinToggle ? BERSERKER_BATTLE_SPRITES.attackFin2 : BERSERKER_BATTLE_SPRITES.attackFin;
  img._seqTimer1 = setTimeout(()=>{ img.src = finPose; }, BERSERKER_ATTACK_TRAVEL_MS); // llega y golpea acá
  img._seqTimer2 = setTimeout(()=>{ img.src = BERSERKER_BATTLE_SPRITES.attack1; }, BERSERKER_ATTACK_TRAVEL_MS + BERSERKER_ATTACK_HOLD_MS); // arranca la vuelta
  img._resetTimer = setTimeout(()=>{
    img.src = BERSERKER_BATTLE_SPRITES.base; // recién ACÁ, al llegar de verdad a su lugar
    img.classList.remove("attacking");
  }, BERSERKER_ATTACK_TOTAL_MS);

  const container = img.parentElement;
  // Mismo motivo que guerrero-attack-lift: sin esto, el deslizamiento lo deja TAPADO por el enemigo
  // justo en el golpe (los dos comparten el mismo z-index fijo, y gana el que está después en el DOM).
  if(container) container.classList.add("berserker-attack-lift");
  clearTimeout(container && container._liftTimer);
  if(container) container._liftTimer = setTimeout(()=> container.classList.remove("berserker-attack-lift"), BERSERKER_ATTACK_TOTAL_MS);
  const targetElId = battleState && battleState.isPack ? "packStageMon"+battleState.selectedTarget : "spriteEnemy";
  const enemyEl = document.getElementById(targetElId);
  if(container && enemyEl && container.animate && !enemyEl.classList.contains("hidden")){
    container.getAnimations().forEach(a=> a.cancel()); // corta un slash anterior si llegara a medio camino
    const from = container.getBoundingClientRect();
    const to = enemyEl.getBoundingClientRect();
    // Llega cerca del enemigo, no encima — 72% del trayecto, mismo criterio que el salto del
    // Guerrero — pero SOLO en X: sin dy, el Berserker se desliza pegado al piso, nunca "salta".
    const dx = ((to.left+to.width/2) - (from.left+from.width/2)) * 0.72;
    const arriveOffset = BERSERKER_ATTACK_TRAVEL_MS / BERSERKER_ATTACK_TOTAL_MS;
    const leaveOffset = (BERSERKER_ATTACK_TRAVEL_MS + BERSERKER_ATTACK_HOLD_MS) / BERSERKER_ATTACK_TOTAL_MS;
    const easeOut = "cubic-bezier(.28,.65,.35,1)", easeIn = "cubic-bezier(.4,0,.35,1)";
    container.animate([
      { transform:"translateX(0px)", offset:0, easing:easeOut },       // arranca el deslizamiento
      { transform:`translateX(${dx}px)`, offset:arriveOffset, easing:"linear" }, // llega junto al enemigo — golpe (se queda quieto)
      { transform:`translateX(${dx}px)`, offset:leaveOffset, easing:easeIn },    // arranca el regreso
      { transform:"translateX(0px)", offset:1 },                                 // llega de nuevo a su lugar
    ], { duration:BERSERKER_ATTACK_TOTAL_MS });
  }
}

// Mismo criterio que GUERRERO_DEFEND_HOLD_MS/MAGO_DEFEND_HOLD_MS.
const BERSERKER_DEFEND_HOLD_MS = 1000;

/** Pose de guardia del Berserker — se dispara cuando bloquea con éxito un golpe fuerte usando el
 *  gesto de defensa. No se desliza, solo sostiene la pose un momento y vuelve a la base — mismo
 *  patrón que playGuerreroDefendPose/playMagoDefendPose. */
function playBerserkerDefendPose(){
  const container = $("spritePlayer");
  const img = container && container.querySelector("img.battle-sprite-img");
  if(!img) return;
  clearTimeout(img._resetTimer);
  clearTimeout(img._seqTimer1);
  clearTimeout(img._seqTimer2);
  clearTimeout(img._seqTimer3);
  clearTimeout(img._presentacionTimer);
  if(container.getAnimations) container.getAnimations().forEach(a=> a.cancel());
  img.classList.add("attacking");
  img.src = BERSERKER_BATTLE_SPRITES.defend;
  img._resetTimer = setTimeout(()=>{
    img.src = BERSERKER_BATTLE_SPRITES.base;
    img.classList.remove("attacking");
  }, BERSERKER_DEFEND_HOLD_MS);
}

// Tiempos de la secuencia de tiro del Arquero — a diferencia de Guerrero/Berserker (saltan/
// deslizan hasta el enemigo), el Arquero se queda EN SU LUGAR pasando por las poses en el orden
// exacto pedido: nocking (attack1) → apuntando (attackAim) → soltando (attackRelease, la flecha
// vuela real durante este tramo, ver fireArqueroArrowProjectile) → vuelve a la base.
const ARQUERO_ATTACK_NOCK_MS = 220;         // saca la flecha del carcaj
const ARQUERO_ATTACK_AIM_MS = 260;          // arco tensado, apuntando
const ARQUERO_ATTACK_RELEASE_HOLD_MS = 480; // cuerda ya soltada — la flecha viaja en este tramo
const ARQUERO_ATTACK_RETURN_MS = 240;       // vuelve a la base
const ARQUERO_ATTACK_TOTAL_MS = ARQUERO_ATTACK_NOCK_MS + ARQUERO_ATTACK_AIM_MS + ARQUERO_ATTACK_RELEASE_HOLD_MS + ARQUERO_ATTACK_RETURN_MS;
const ARQUERO_ARROW_FLIGHT_MS = 340; // un poco menos que RELEASE_HOLD para que se vea llegar antes del reset
// Instante exacto en que la flecha REALMENTE conecta con el enemigo — soltar (NOCK+AIM) más lo
// que tarda en volar. Pedido explícito: el daño se calcula/revela recién acá, no apenas se elige
// el movimiento — si no, la vida del enemigo bajaba ANTES de que se viera pegar la flecha. Mismo
// criterio que ya usa el Guerrero (ver "deferHit" en executePlayerAction).
const ARQUERO_ARROW_IMPACT_MS = ARQUERO_ATTACK_NOCK_MS + ARQUERO_ATTACK_AIM_MS + ARQUERO_ARROW_FLIGHT_MS;

/** Ángulo (grados) al que apunta flecha.png DENTRO de la propia imagen (de la cola hacia la
 *  punta), medido a mano sobre el arte — se resta del ángulo real de vuelo (calculado con
 *  getBoundingClientRect entre jugador y enemigo) para que la punta quede alineada con el rival
 *  sea cual sea su posición en pantalla, no solo en el caso "típico" de la maqueta. */
const ARQUERO_ARROW_BAKED_ANGLE_DEG = -30.2;

/** Lanza el sprite de flecha (#arqueroArrowFx, ver index.html/main.css) desde la posición real del
 *  Arquero hasta la del enemigo actual (o el objetivo seleccionado en manada, mismo criterio que
 *  playGuerreroAttackSequence). `charged` agrega un aura dorada extra en la punta — pedido
 *  explícito para ataques especiales/cargados (movimiento definitivo). */
function fireArqueroArrowProjectile(charged){
  const fx = $("arqueroArrowFx");
  const playerEl = $("spritePlayer");
  if(!fx || !playerEl) return;
  const targetElId = battleState && battleState.isPack ? "packStageMon"+battleState.selectedTarget : "spriteEnemy";
  const enemyEl = document.getElementById(targetElId);
  const stage = fx.parentElement;
  if(!enemyEl || !stage || enemyEl.classList.contains("hidden")) return;
  const stageBox = stage.getBoundingClientRect();
  const from = playerEl.getBoundingClientRect();
  const to = enemyEl.getBoundingClientRect();
  const startX = (from.left + from.width*0.6) - stageBox.left;
  const startY = (from.top + from.height*0.3) - stageBox.top;
  const endX = (to.left + to.width*0.5) - stageBox.left;
  const endY = (to.top + to.height*0.5) - stageBox.top;
  const dx = endX - startX, dy = endY - startY;
  const rotateDeg = (Math.atan2(dy, dx) * 180/Math.PI) - ARQUERO_ARROW_BAKED_ANGLE_DEG;

  fx.src = ARQUERO_BATTLE_SPRITES.arrow;
  fx.classList.toggle("arquero-arrow-charged", !!charged);
  fx.classList.remove("hidden");
  if(fx.getAnimations) fx.getAnimations().forEach(a=> a.cancel());
  const startTf = `translate(${startX}px, ${startY}px) translate(-50%,-50%) rotate(${rotateDeg}deg)`;
  const endTf = `translate(${startX+dx}px, ${startY+dy}px) translate(-50%,-50%) rotate(${rotateDeg}deg)`;
  fx.style.transform = startTf;
  if(fx.animate){
    fx.animate([
      { transform:startTf, offset:0 },
      { transform:endTf, offset:1 },
    ], { duration:ARQUERO_ARROW_FLIGHT_MS, easing:"cubic-bezier(.3,0,.7,1)", fill:"forwards" });
  }
  clearTimeout(fx._hideTimer);
  fx._hideTimer = setTimeout(()=> fx.classList.add("hidden"), ARQUERO_ARROW_FLIGHT_MS);
}

/** Secuencia de tiro del Arquero: se queda en su lugar pasando por las 3 poses en el orden exacto
 *  pedido (sacar flecha → apuntar → soltar), y justo cuando suelta se dispara el proyectil real
 *  (fireArqueroArrowProjectile) hacia el enemigo. `charged` (movimiento definitivo) agrega un aura
 *  dorada sobre el propio personaje además de en la punta de la flecha. */
function playArqueroAttackSequence(img, charged){
  clearTimeout(img._resetTimer);
  clearTimeout(img._seqTimer1);
  clearTimeout(img._seqTimer2);
  clearTimeout(img._seqTimer3);
  clearTimeout(img._presentacionTimer);
  const container = img.parentElement;
  if(container && container.getAnimations) container.getAnimations().forEach(a=> a.cancel());
  img.classList.add("attacking");
  img.classList.toggle("arquero-charged-glow", !!charged);
  img.src = ARQUERO_BATTLE_SPRITES.attack1;
  img._seqTimer1 = setTimeout(()=>{ img.src = ARQUERO_BATTLE_SPRITES.attackAim; }, ARQUERO_ATTACK_NOCK_MS);
  img._seqTimer2 = setTimeout(()=>{
    img.src = ARQUERO_BATTLE_SPRITES.attackRelease;
    fireArqueroArrowProjectile(charged);
  }, ARQUERO_ATTACK_NOCK_MS + ARQUERO_ATTACK_AIM_MS);
  img._resetTimer = setTimeout(()=>{
    img.src = ARQUERO_BATTLE_SPRITES.base;
    img.classList.remove("attacking");
    img.classList.remove("arquero-charged-glow");
  }, ARQUERO_ATTACK_TOTAL_MS);
}

// Mismo criterio que GUERRERO_DEFEND_HOLD_MS/MAGO_DEFEND_HOLD_MS/BERSERKER_DEFEND_HOLD_MS.
const ARQUERO_DEFEND_HOLD_MS = 1000;

/** Pose de defensa del Arquero — desvía la flecha entrante con el propio arco (destello dorado en
 *  el punto de impacto). No se desplaza, solo sostiene la pose un momento y vuelve a la base —
 *  mismo patrón que las otras tres clases. */
function playArqueroDefendPose(){
  const container = $("spritePlayer");
  const img = container && container.querySelector("img.battle-sprite-img");
  if(!img) return;
  clearTimeout(img._resetTimer);
  clearTimeout(img._seqTimer1);
  clearTimeout(img._seqTimer2);
  clearTimeout(img._seqTimer3);
  clearTimeout(img._presentacionTimer);
  if(container.getAnimations) container.getAnimations().forEach(a=> a.cancel());
  img.classList.add("attacking");
  img.src = ARQUERO_BATTLE_SPRITES.defend;
  img._resetTimer = setTimeout(()=>{
    img.src = ARQUERO_BATTLE_SPRITES.base;
    img.classList.remove("attacking");
  }, ARQUERO_DEFEND_HOLD_MS);
}

/** Dispara la pose de defensa correspondiente a la clase del jugador (Guerrero: escudo, Mago:
 *  barrera mágica, Berserker: guardia con la espada, Arquero: desvía con el arco) — usado desde
 *  resolveEnemyDirectAttack al bloquear un golpe fuerte. */
function playPlayerDefendPose(){
  if(player.classKey === "mago") playMagoDefendPose();
  else if(player.classKey === "berserker") playBerserkerDefendPose();
  else if(player.classKey === "arquero") playArqueroDefendPose();
  else playGuerreroDefendPose();
}

/** ¿Esta clase tiene su propia pose de defensa (y por lo tanto puede bloquear golpes fuertes con
 *  una barra de defensa propia en vez de esquivarlos del todo)? Ver enemyTurn/startBattle. */
function classHasDefendPose(classKey){
  return classKey === "guerrero" || classKey === "mago" || classKey === "berserker" || classKey === "arquero";
}

/** Sacude al enemigo (o a los enemigos, en manada) con una animación larga (~2s, ver
 *  earthquake-shake en main.css) — se dispara apenas se ejecuta Terremoto, en paralelo con el
 *  grito del Guerrero, y recién cuando termina se revela el daño. Por ahora solo combate solo
 *  (#spriteEnemy) — en manada, Terremoto sigue con su feedback inmediato de siempre. */
function triggerGuerreroEarthquakeShake(){
  const el = $("spriteEnemy");
  if(!el) return;
  // La entrada deslizante (playCharacterSlideInFx) deja una animación WAAPI con fill:"both" en
  // este mismo elemento — las animaciones vía element.animate() tienen MÁS prioridad que las
  // animaciones CSS por clase, así que sin cancelarla primero, esa transform residual tapaba por
  // completo la sacudida (la clase se agregaba, pero visualmente no se movía nada).
  if(el.getAnimations) el.getAnimations().forEach(a=> a.cancel());
  el.classList.remove("earthquake-shake");
  void el.offsetWidth;
  el.classList.add("earthquake-shake");
}

/** Cuánto esperar después de que el jugador actúa, antes de que conteste el enemigo. El Guerrero
 *  tiene sus propias secuencias (salto de golpe o grito), bastante más lentas que el resto de las
 *  clases — sin esto, el turno del rival arrancaría a mitad de la animación. Terremoto necesita
 *  más tiempo todavía: los ~2s de sacudida completos antes de que se vea el daño. */
function postPlayerActionDelay(mv){
  if(player.classKey === "guerrero" && mv.isUltimate) return GUERRERO_ULTIMATE_TOTAL_MS + 100;
  if(mv.isUltimate) return 1500;
  if(player.classKey === "guerrero"){
    if(mv.type === "buff" || mv.type === "heal") return GUERRERO_BUFF_TOTAL_MS + 100;
    if(!isGuerreroCastMove(mv)) return GUERRERO_ATTACK_TOTAL_MS + 100;
    return mv.aoe ? (GUERRERO_AOE_SHAKE_MS + 700) : (GUERRERO_CAST_TOTAL_MS + 100);
  }
  if(player.classKey === "mago") return MAGO_CAST_TOTAL_MS + 100;
  if(player.classKey === "berserker") return BERSERKER_ATTACK_TOTAL_MS + 100;
  if(player.classKey === "arquero") return ARQUERO_ATTACK_TOTAL_MS + 100;
  return 700;
}

/** Cambia momentáneamente el sprite a su pose de ATAQUE, y lo regresa a la pose base. */
function triggerWeaponAnim(elId, mv){
  const container = $(elId);
  if(!container) return;
  const img = container.querySelector("img.battle-sprite-img");
  if(img){
    if(img.dataset.guerreroBattle === "1"){
      if(mv.isUltimate) playGuerreroUltimateSequence(img);
      else if(mv.type === "buff") playGuerreroBuffSequence(img, mv.buff);
      else if(mv.type === "heal") playGuerreroBuffSequence(img, "heal");
      else if(isGuerreroCastMove(mv)) playGuerreroCastSequence(img, mv.aoe===true);
      else playGuerreroAttackSequence(img);
      return;
    }
    if(img.dataset.magoBattle === "1"){
      playMagoCastSequence(img);
      return;
    }
    if(img.dataset.berserkerBattle === "1"){
      playBerserkerAttackSequence(img);
      return;
    }
    if(img.dataset.arqueroBattle === "1"){
      playArqueroAttackSequence(img, !!mv.isUltimate);
      return;
    }
    const classKey = img.dataset.classkey;
    const g = img.dataset.gender || "m";
    const spr = ((CLASS_BATTLE_SPRITES[classKey]||{})[g]);
    if(spr && spr.attack){
      img.src = spr.attack;
      img.classList.add("attacking");
      clearTimeout(img._resetTimer);
      img._resetTimer = setTimeout(()=>{
        img.src = spr.base;
        img.classList.remove("attacking");
      }, 700);
    }
    return;
  }
  const el = container.querySelector("svg");
  if(!el) return;
  el.classList.remove("attacking");
  void el.offsetWidth;
  el.classList.add("attacking");
}
function triggerClassAttackAnim(mv){ triggerWeaponAnim("spritePlayer", mv); }

/** Cambia momentáneamente el sprite del Ladrón/Ninja a su pose de ataque sombrío, y vuelve a la base. */
function triggerThiefAttackPose(){
  const img = document.querySelector('#spriteEnemy img[data-thief="1"]');
  if(!img) return;
  img.src = THIEF_SPRITES.attack;
  img.classList.add("attacking");
  clearTimeout(img._resetTimer);
  img._resetTimer = setTimeout(()=>{
    img.src = THIEF_SPRITES.base;
    img.classList.remove("attacking");
  }, 700);
}

/** Sin una pose de esquiva dedicada (solo hay base/ataque), la esquiva del Ladrón/Ninja se resuelve
 *  con un gesto puramente CSS: un paso al costado con motion blur (.thief-dodge, ver main.css) sobre
 *  la misma imagen — se usa tanto cuando esquiva un golpe (evasionChance) como cuando se burla antes
 *  de la promesa de "¿A que no puedes darme?". */
function triggerThiefDodgePose(){
  const img = document.querySelector('#spriteEnemy img[data-thief="1"]');
  if(!img) return;
  img.classList.remove("thief-dodge");
  void img.offsetWidth;
  img.classList.add("thief-dodge");
}
/** Frases cortas que suelta al esquivar un golpe — una al azar cada vez, para que no se sienta
 *  repetitivo (el aviso de "¡Esquivado!" y el log de siempre se mantienen igual, esto es aparte). */
const THIEF_DODGE_LINES = ["¡Muy lento!", "¿Eso es todo?", "Vas a tener que esforzarte más.", "Casi... ¡pero no!"];
function pickThiefDodgeLine(){ return THIEF_DODGE_LINES[Math.floor(Math.random()*THIEF_DODGE_LINES.length)]; }
/** Línea con la que se presenta al arrancar el combate — una al azar, mismo criterio que las de esquiva. */
const THIEF_INTRO_LINES = ["Nadie se acerca tanto sin pagar por ello...", "No deberías haber venido solo.", "Vine por tu oro. Y por diversión."];
function pickThiefIntroLine(){ return THIEF_INTRO_LINES[Math.floor(Math.random()*THIEF_INTRO_LINES.length)]; }

/** Cambia momentáneamente el sprite del Lobo Sombrío a la pose indicada (ataque/esquiva/carga/
 *  especial) y vuelve solo a su pose base — mismo patrón que ya se usa para el Ladrón/Ninja. */
function triggerShadowWolfPose(poseKey, holdMs){
  const img = document.querySelector('#spriteEnemy img[data-shadowwolf="1"]');
  if(!img) return;
  img.src = LOBO_SOMBRIO_SPRITES[poseKey] || LOBO_SOMBRIO_SPRITES.base;
  img.classList.add("attacking");
  clearTimeout(img._resetTimer);
  img._resetTimer = setTimeout(()=>{
    img.src = LOBO_SOMBRIO_SPRITES.base;
    img.classList.remove("attacking");
  }, holdMs || 900);
}
/** El Lobo Umbrío como ENEMIGO cambia momentáneamente a su pose de ataque dedicada (enemy_ataque)
 *  y vuelve solo a su ilustración base — mismo patrón que triggerShadowWolfPose/triggerSlimeSalvajePose. */
function triggerLoboAttackPose(){
  const img = document.querySelector('#spriteEnemy img[data-lobo="1"]');
  if(!img) return;
  const baseSrc = img.dataset.loboBase || img.src;
  img.dataset.loboBase = baseSrc;
  img.src = LOBO_UMBRIO_SPRITES.enemyAttack;
  img.classList.add("attacking");
  clearTimeout(img._resetTimer);
  img._resetTimer = setTimeout(()=>{
    img.src = baseSrc;
    img.classList.remove("attacking");
  }, 700);
}
/** Igual, pero para el Cuervo Corrupto como enemigo. */
function triggerCuervoAttackPose(){
  const img = document.querySelector('#spriteEnemy img[data-cuervo="1"]');
  if(!img) return;
  const baseSrc = img.dataset.cuervoBase || img.src;
  img.dataset.cuervoBase = baseSrc;
  img.src = CUERVO_CORRUPTO_SPRITES.enemyAttack;
  img.classList.add("attacking");
  clearTimeout(img._resetTimer);
  img._resetTimer = setTimeout(()=>{
    img.src = baseSrc;
    img.classList.remove("attacking");
  }, 700);
}
/** Igual, pero para cuando el JUGADOR le pega al Cuervo Corrupto (no cuando él ataca). */
function triggerCuervoHurtPose(){
  const img = document.querySelector('#spriteEnemy img[data-cuervo="1"]');
  if(!img) return;
  const baseSrc = img.dataset.cuervoBase || img.src;
  img.dataset.cuervoBase = baseSrc;
  img.src = CUERVO_CORRUPTO_SPRITES.hurt;
  img.classList.add("attacking");
  clearTimeout(img._resetTimer);
  img._resetTimer = setTimeout(()=>{
    img.src = baseSrc;
    img.classList.remove("attacking");
  }, 600);
}
/** Igual, pero para el Demonio Menor como enemigo — cambia a su pose de ataque dedicada
 *  (enemy_ataque) y vuelve sola a la base, mismo patrón que triggerLoboAttackPose. */
function triggerDemonioAttackPose(){
  const img = document.querySelector('#spriteEnemy img[data-demonio="1"]');
  if(!img) return;
  const baseSrc = img.dataset.demonioBase || img.src;
  img.dataset.demonioBase = baseSrc;
  img.src = DEMONIO_MENOR_SPRITES.enemyAttack;
  img.classList.add("attacking");
  clearTimeout(img._resetTimer);
  img._resetTimer = setTimeout(()=>{
    img.src = baseSrc;
    img.classList.remove("attacking");
  }, 700);
}
/** Igual, pero para el Golem de Roca como enemigo. */
function triggerGolemAttackPose(){
  const img = document.querySelector('#spriteEnemy img[data-golem="1"]');
  if(!img) return;
  img.classList.add("attacking");
  clearTimeout(img._resetTimer);
  img._resetTimer = setTimeout(()=> img.classList.remove("attacking"), 700);
}
/** Igual, pero para el Dragón Menor como enemigo. */
function triggerDragonAttackPose(){
  const img = document.querySelector('#spriteEnemy img[data-dragon="1"]');
  if(!img) return;
  img.classList.add("attacking");
  clearTimeout(img._resetTimer);
  img._resetTimer = setTimeout(()=> img.classList.remove("attacking"), 700);
}
/** Igual, pero para el Dragón Ancestral (jefe de región) como enemigo. */
function triggerDragonAncestralAttackPose(){
  const img = document.querySelector('#spriteEnemy img[data-dragon-ancestral="1"]');
  if(!img) return;
  img.classList.add("attacking");
  clearTimeout(img._resetTimer);
  img._resetTimer = setTimeout(()=> img.classList.remove("attacking"), 700);
}
/** Igual, pero para el Lobo Nocturno como enemigo. */
function triggerLoboNocturnoAttackPose(){
  const img = document.querySelector('#spriteEnemy img[data-lobo-nocturno="1"]');
  if(!img) return;
  img.classList.add("attacking");
  clearTimeout(img._resetTimer);
  img._resetTimer = setTimeout(()=> img.classList.remove("attacking"), 700);
}
/** Cambia momentáneamente el sprite del Slime Salvaje a la pose indicada (ataque/dañado) y vuelve
 *  solo a su pose base — mismo patrón que ya se usa para el Ladrón/Ninja y el Lobo Sombrío. */
function triggerSlimeSalvajePose(poseKey, holdMs){
  const img = document.querySelector('#spriteEnemy img[data-slime="1"]');
  if(!img) return;
  img.src = SLIME_SALVAJE_SPRITES[poseKey] || SLIME_SALVAJE_SPRITES.base;
  img.classList.add("attacking");
  clearTimeout(img._resetTimer);
  img._resetTimer = setTimeout(()=>{
    img.src = SLIME_SALVAJE_SPRITES.base;
    img.classList.remove("attacking");
  }, holdMs || 700);
}
/** Igual, pero para la Rata Mutante. */
function triggerRataMutantePose(poseKey, holdMs){
  const img = document.querySelector('#spriteEnemy img[data-rata="1"]');
  if(!img) return;
  img.src = RATA_MUTANTE_SPRITES[poseKey] || RATA_MUTANTE_SPRITES.base;
  img.classList.add("attacking");
  clearTimeout(img._resetTimer);
  img._resetTimer = setTimeout(()=>{
    img.src = RATA_MUTANTE_SPRITES.base;
    img.classList.remove("attacking");
  }, holdMs || 700);
}
/** Igual, pero para el Espectro. */
function triggerEspectroPose(poseKey, holdMs){
  const img = document.querySelector('#spriteEnemy img[data-espectro="1"]');
  if(!img) return;
  img.src = ESPECTRO_SPRITES[poseKey] || ESPECTRO_SPRITES.base;
  img.classList.add("attacking");
  clearTimeout(img._resetTimer);
  img._resetTimer = setTimeout(()=>{
    img.src = ESPECTRO_SPRITES.base;
    img.classList.remove("attacking");
  }, holdMs || 700);
}
/** Igual, pero para el Señor Oscuro — a diferencia de los demás (una sola pose de ataque fija),
 *  tiene 3 poses de ataque distintas y elige una al azar cada vez para que la pelea del jefe se
 *  sienta menos repetitiva golpe a golpe. */
function triggerSenorOscuroAttackPose(holdMs){
  const img = document.querySelector('#spriteEnemy img[data-senor-oscuro="1"]');
  if(!img) return;
  const attacks = SENOR_OSCURO_SPRITES.attacks;
  img.src = attacks[Math.floor(Math.random()*attacks.length)];
  img.classList.add("attacking");
  clearTimeout(img._resetTimer);
  img._resetTimer = setTimeout(()=>{
    img.src = SENOR_OSCURO_SPRITES.base;
    img.classList.remove("attacking");
  }, holdMs || 700);
}
/** Igual, pero para los esbirros de la niebla de un portal (una sola pose de ataque, no 3 como
 *  el jefe) — genérica por `dataAttr`/`spriteSet` porque ya hay más de uno (Demonio Oscuro,
 *  Sabueso Oscuro) con exactamente el mismo comportamiento, solo cambia qué imágenes usan. */
function triggerAuraEnemyPose(dataAttr, spriteSet, holdMs){
  const img = document.querySelector(`#spriteEnemy img[data-${dataAttr}="1"]`);
  if(!img) return;
  img.src = spriteSet.attack;
  img.classList.add("attacking");
  clearTimeout(img._resetTimer);
  img._resetTimer = setTimeout(()=>{
    img.src = spriteSet.base;
    img.classList.remove("attacking");
  }, holdMs || 700);
}
/** Igual, pero para cuando el Lobo Umbrío es tu MASCOTA (en el pequeño sprite junto a tu personaje). */
/** Cambia un instante a la pose de ataque de la mascota (si tiene arte propio) y regresa sola a la base. */
function triggerPetArtAttackPose(petName){
  const spriteSet = PET_SPRITE_SETS[petName];
  const img = document.querySelector('#petStageSlot img[data-pet-art="1"]');
  if(!img || !spriteSet) return;
  img.src = spriteSet.petAttack;
  clearTimeout(img._resetTimer);
  img._resetTimer = setTimeout(()=>{ img.src = spriteSet.petBase; }, 700);
}

/**
 * PRNG determinista sembrado a partir de un string. Dos clientes que llamen a
 * seededRandom() con el MISMO string obtienen exactamente la misma secuencia
 * de números — esto es lo que permite que dos celulares distintos calculen,
 * cada uno por su cuenta, un resultado de combate PvP idéntico sin necesidad
 * de transmitir el resultado, solo los movimientos elegidos.
 */
function seededRandom(seedStr){
  let h = 1779033703 ^ seedStr.length;
  for(let i=0;i<seedStr.length;i++){
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function(){
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/* ---------- Estado del juego (solo en memoria) ---------- */
let player = null; // se crea al elegir clase
let selectedClass = null;
let selectedGender = "m"; // 'm' | 'f' — solo cambia la apariencia, nunca las estadísticas
/** Caché en memoria de qué tiene puesto CADA héroe YA CREADO — ids + nivel de mejora + durabilidad,
 *  no objetos completos (mismo patrón que ya usaba equipmentIds). Solo el héroe activo
 *  (player.classKey) se recalcula desde player.equipment en cada saveGame(); los demás se
 *  preservan tal cual se cargaron. Ver saveGame/rebuildPlayer/resolveEquipmentForHero. */
let equippedByHeroCache = {};
/** Pedido explícito: los 4 héroes NO se crean todos de una — la cuenta se crea con UNO (el elegido
 *  en la grilla) y los demás se crean cuando el jugador lo pide, uno a la vez, desde "Crear
 *  personaje" en la pantalla de selección (como ya funcionaba antes del rediseño). Esta variable lleva
 *  registro de cuáles YA existen (tienen un documento 'player_'+classKey guardado) — se recalcula
 *  en cada initContinueScreen(), mismo mecanismo que el `takenClasses` original. */
let takenClasses = new Set();
let playerLatLng = null; // {lat,lng}
let map, meMarker, meRing, meMagicCircle;
let monsters = []; // {id, marker, lat, lng, level, tpl, hp, maxHp, atk, def, spd, moves}
let activeQuest = null; // {template, zone, itemObtained, targetSpawned, targetMonId, npcMarker, routeLine, destMarker}
let gpsMode = false; // arranca en modo simulación; el GPS solo se activa con un toque explícito del usuario
let watchId = null;
let battleState = null; // active battle object
let pendingLevelUps = []; // queue of {level, moveToLearn}

/* ---------- Multijugador por proximidad (beta, vía almacenamiento compartido) ---------- */
let myPlayerId = null;
let nearbyPlayerMarkers = {}; // id -> {marker, data}
let friends = []; // {id, name, classKey, level}
let seenChallengeIds = new Set();
let selectedNearbyPlayer = null;
let tradeTargetPlayer = null;

/* ---------- Combate PvP por turnos (sincronizado vía PubNub) ---------- */
if(false){
const PN_BATTLE_PREFIX = "ronda-gps-rpg-battle-";
const PN_PARTY_PREFIX = "ronda-gps-rpg-party-";
const PN_LOOKUP_CHANNEL = "ronda-gps-rpg-lookup-v1";
const PN_ANNOUNCE_CHANNEL = "ronda-gps-rpg-announce-v1"; // anuncios globales + bloqueo/fila de jefes de región
            // batalla PvP activa, o null
 // {battleId, toId, toName, timeoutId} mientras espero respuesta
 // reto entrante mostrado, mientras el usuario decide

/* ---------- Grupo (hasta 5 amigos) para enfrentar enemigos reforzados juntos ---------- */
const PARTY_MAX = 5;
}
let party = null;              // {id, channel, leaderId, members:[{id,name,classKey,level,gender}]}
let outgoingPartyInvite = null;
let incomingPartyInvite = null;
let groupBattle = null;        // batalla de grupo activa (ver sección dedicada)

const $ = (id)=>document.getElementById(id);

/** Ahorro de recursos: mientras hay una batalla en pantalla (#battleWrap sin la clase "hidden" —
 *  el mismo overlay que usan TODOS los tipos de combate: solo, manada, PvP, grupal, torre, guardián
 *  de parque), el mapa de fondo queda tapado pero sus timers periódicos (spawns, recolección de
 *  oro, timers de jefe, etc.) seguían corriendo igual sin que nadie los viera. `runIfNotInBattle`
 *  envuelve esos callbacks en initMap() para que se salteen mientras dure el combate, y retomen
 *  solo cuando vuelve a estar visible el mapa. Mismo patrón que ya usaba regenPlayerHp/
 *  maybeSpawnShadowWolf/maybeScheduleRandomEvent por su cuenta (battleState||pvp||groupBattle), más
 *  el fallback de #battleWrap ya probado en senorOscuroMapCurseInterval — cubre PvP/grupal aunque
 *  battleState quede en null. El autoguardado (saveGame) queda afuera a propósito: no se pausa,
 *  por seguridad de datos. */
function isBattleUiVisible(){
  return !!(battleState || pvp || groupBattle || ($("battleWrap") && !$("battleWrap").classList.contains("hidden")));
}
function runIfNotInBattle(fn){
  if(isBattleUiVisible()) return;
  fn();
}

/** Botón/gesto atrás de Android (solo dentro del APK — en la web el navegador ya maneja esto solo)
 *  — "inteligente": si hay una pantalla abierta, atrás la cierra (clickeando su botón real de
 *  cerrar/cancelar, NUNCA reimplementando el cierre a mano — varios tienen limpieza extra además
 *  del classList.add("hidden"), ej. btnCloseForge/btnCloseInv); si no hay nada abierto y no hay
 *  combate, recién ahí pregunta si querés salir del juego de verdad.
 *
 *  Tabla construida y verificada línea por línea contra index.html (60 elementos class="overlay"),
 *  no adivinada por convención de nombre — varias pantallas NO tienen un botón de cierre seguro
 *  para clickear a ciegas (`null` = bloquear, no hacer nada):
 *   - travelerAttackedOverlay: su único botón real es "Ayudar", que INICIA un combate.
 *   - wagerOverlay: apuesta PvP a mitad de negociar, no tiene botón de cancelar en el HTML.
 *   - coliseoBuffOverlay/dungeonBlessingOverlay: elección forzada de buff, sin cancelar.
 *   - dungeonStairsOverlay: escena de transición animada, se cierra sola.
 *   - resultOverlay/levelupOverlay/dungeonRoomRewardOverlay/dungeonSummaryOverlay/coliseoSummaryOverlay:
 *     pantallas de recompensa/resumen — su botón AVANZA estado, no es un cierre neutro.
 *   - authOverlay/classOverlay: son la puerta de entrada (login/selección de personaje), no popups.
 *   - cancelQuestOverlay: semántica invertida — el botón "seguro" es btnKeepQuest (mantener la
 *     misión), no un botón de "cerrar" en el sentido usual. */
const BACK_CLOSE_MAP = [
  ["towerOverlay","btnTowerClose"], ["playerActionOverlay","btnClosePlayerAction"],
  ["tradePickOverlay","btnCancelTrade"], ["noticeOverlay","btnCloseNotice"],
  ["partyOverlay","btnCloseParty"], ["friendsOverlay","btnCloseFriends"],
  ["chatOverlay","btnCloseChat"], ["equipOverlay","btnCloseEquip"],
  ["attrsOverlay","btnCloseAttrs"], ["shopOverlay","btnCloseShop"],
  ["merchantOverlay","btnCloseMerchant"], ["bossInfoOverlay","btnBossCancel"],
  ["regionsOverlay","btnCloseRegions"], ["notifPanelOverlay","btnCloseNotifPanel"],
  ["upgradeStationOverlay","btnUpgStationClose"], ["upgradeEquipPickOverlay","btnCloseUpgradeEquipPick"],
  ["petItemPickOverlay","btnClosePetItemPick"], ["equipSlotPickOverlay","btnCloseEquipSlotPick"],
  ["petSummonOverlay","btnClosePetSummon"], ["healPetPickOverlay","btnCloseHealPetPick"],
  ["petDetailOverlay","btnClosePetDetail"], ["releasePetOverlay","btnCancelReleasePet"],
  ["petsOverlay","btnClosePets"], ["monsterCodexOverlay","btnCloseMonsterCodex"],
  ["coliseoOverlay","btnColiseoExit"], ["coliseoBuffOverlay",null],
  ["coliseoSummaryOverlay",null], ["dungeonBlessingOverlay",null],
  ["dungeonRoomRewardOverlay",null], ["dungeonStairsOverlay",null],
  ["dungeonSummaryOverlay",null], ["dungeonCodexOverlay","btnCloseDungeonCodex"],
  ["questNpcOverlay","btnQuestDecline"], ["travelerAttackedOverlay",null],
  ["cancelQuestOverlay","btnKeepQuest"], ["vagabundoOverlay","btnVagabundoNo"],
  ["recallPickOverlay","btnCloseRecallPick"], ["recallReplaceOverlay","btnCloseRecallReplace"],
  ["parkOverlay","btnParkCancel"], ["medalOverlay","btnCloseMedal"],
  ["charSheetOverlay","btnCloseCharSheet"], ["settingsOverlay","btnCloseSettings"],
  ["wagerOverlay",null], ["authOverlay",null], ["classOverlay",null],
  ["deleteCharOverlay","btnCancelDeleteChar"], ["returnMenuOverlay","btnCancelReturnMenu"],
  ["levelupOverlay",null], ["learnOverlay","btnSkipLearn"],
  ["invOverlay","btnCloseInv"], ["invDetailOverlay","btnCloseInvDetail"],
  ["baseRoomOverlay","btnCloseBaseRoom"], ["baseCategoryOverlay","btnCloseBaseCategory"],
  ["baseStorageOverlay","btnCloseBaseStorage"], ["basesMenuOverlay","btnCloseBasesMenu"],
  ["forgeOverlay","btnCloseForge"], ["resultOverlay",null],
];
function handleHardwareBack(){
  if(!$("confirmModalOverlay").classList.contains("hidden")){ $("confirmModalCancel").click(); return; }
  if(!$("buyQtyModalOverlay").classList.contains("hidden")){ $("buyQtyCancel").click(); return; }
  if(isBattleUiVisible()) return; // el combate se sale por su propio botón de huir, no por atrás
  for(const [id, closeBtn] of BACK_CLOSE_MAP){
    const el = $(id);
    if(el && !el.classList.contains("hidden")){
      if(closeBtn) $(closeBtn).click();
      return; // bloqueado (closeBtn null) o ya cerrado — en ambos casos no se sigue evaluando
    }
  }
  // nada abierto, sin combate: estamos en el mapa base
  showConfirm("¿Salir del juego?", ()=> App.exitApp(), {icon:"🚪", title:"Salir", confirmLabel:"Salir", cancelLabel:"Cancelar"});
}
if(Capacitor.isNativePlatform()){
  App.addListener('backButton', handleHardwareBack);
}

/* ============================================================
   CAPA DE ALMACENAMIENTO — funciona dentro y fuera de Claude
   ------------------------------------------------------------
   Dentro de Claude: usa el puente real AppStorage (persiste
   y se comparte de verdad entre dispositivos vía shared=true).
   Fuera de Claude (ej. hosteado en Netlify/GitHub Pages): NO existe
   AppStorage, así que se usa localStorage como reemplazo para
   el guardado PERSONAL de partida. OJO: localStorage es solo local
   a este navegador/dispositivo, por lo que el modo "shared" (usado
   para el multijugador por proximidad) NO sincroniza entre celulares
   distintos fuera de Claude — ver HAS_REAL_SHARED_STORAGE más abajo.
   ============================================================ */
const HAS_REAL_SHARED_STORAGE = !!window.storage;

/** Red de seguridad general: si algún envío al multijugador falla y por algún motivo no quedó
 *  con su propio .catch(), esto evita que aparezca como un error "no capturado" en la consola —
 *  se registra en silencio, ya que el multijugador es un extra y no debe romper nada más del juego. */
window.addEventListener("unhandledrejection", (event)=>{
  const msg = event.reason && event.reason.message || String(event.reason);
  if(/pubnub|publish|json|forcepoint/i.test(msg) || (event.reason && event.reason.name==="PubNubError")){
    console.warn("[MULTIJUGADOR] solicitud de red no se pudo completar (posible bloqueo de la red local):", event.reason);
    event.preventDefault();
  }
});

const LocalAppStorage = window.storage || {
  async get(key, shared){
    const v = localStorage.getItem((shared?"shared:":"priv:")+key);
    if(v===null) throw new Error("key not found");
    return {key, value:v, shared:!!shared};
  },
  async set(key, value, shared){
    localStorage.setItem((shared?"shared:":"priv:")+key, value);
    return {key, value, shared:!!shared};
  },
  async delete(key, shared){
    localStorage.removeItem((shared?"shared:":"priv:")+key);
    return {key, deleted:true, shared:!!shared};
  },
  async list(prefix, shared){
    const pre = (shared?"shared:":"priv:")+(prefix||"");
    const keys = [];
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if(k.startsWith(pre)) keys.push(k.slice((shared?"shared:":"priv:").length));
    }
    return {keys, prefix, shared:!!shared};
  }
};

/* ============================================================
   CUENTAS + GUARDADO EN LA NUBE (Cloudflare D1, ver worker/index.js)
   ------------------------------------------------------------
   authToken vive en localStorage (solo para no re-loguear en cada visita —
   el guardado en sí vive en D1, no acá). Con sesión activa, AppStorage
   redirige las claves player_<classKey> a la API; TODO lo demás (myId,
   friends, la clave vieja "player", o sin sesión) sigue exactamente igual
   que siempre por LocalAppStorage — ningún otro call site de
   AppStorage.get/set/delete cambia una sola línea.
   ============================================================ */
let authToken = localStorage.getItem("authToken") || null;
let authUsername = localStorage.getItem("authUsername") || null;
const PLAYER_SAVE_KEY_RE = /^player_([a-z]+)$/;
/** En la web, "/api/..." resuelve solo contra el dominio de la página (mismo origen que sirve el
 *  worker) — nunca hizo falta nada más. Dentro del APK empaquetado (Capacitor) el WebView sirve el
 *  juego desde SU PROPIO origen local, sin servidor detrás, así que una ruta relativa nunca llega a
 *  ningún lado: hay que apuntar explícitamente al dominio real del Worker. Vacío en web a propósito
 *  — cero cambio de comportamiento ahí, todo el fix queda contenido a la app nativa. */
const API_BASE_URL = Capacitor.isNativePlatform() ? "https://dark-recipe-a184.fabiansiza994.workers.dev" : "";

function setAuthSession(token, username){
  authToken = token; authUsername = username;
  localStorage.setItem("authToken", token);
  localStorage.setItem("authUsername", username);
}
function clearAuthSession(){
  authToken = null; authUsername = null;
  localStorage.removeItem("authToken");
  localStorage.removeItem("authUsername");
}

/** Pide /api/register o /api/login. Devuelve {token,username} o lanza con el mensaje del
 *  servidor (usuario inválido, contraseña incorrecta, sin red, etc.) — el llamador lo muestra
 *  directo en la UI, no hace falta traducir nada acá. */
async function authApiCall(path, username, password){
  let res;
  try{
    res = await fetch(API_BASE_URL + path, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({username, password}) });
  }catch(e){
    throw new Error("Sin conexión con el servidor — probá de nuevo o jugá sin cuenta.");
  }
  const body = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(body.error || "Algo salió mal.");
  return body;
}

/** Wrapper de fetch para /api/saves/* con el token de sesión ya puesto. Distingue el 401 (sesión
 *  vencida — hay que cerrar sesión de verdad, no solo mostrar "no tenés partida guardada") del
 *  404 (esta clase todavía no tiene nada guardado — comportamiento normal). */
async function remoteSavesFetch(path, options){
  const res = await fetch(API_BASE_URL + path, {
    ...options,
    headers: { ...(options && options.headers), "Authorization": `Bearer ${authToken}` },
  });
  if(res.status === 401){
    clearAuthSession();
    const err = new Error("Tu sesión venció — volvé a iniciar sesión.");
    err.sessionExpired = true;
    throw err;
  }
  if(res.status === 404){
    const err = new Error("key not found");
    err.notFound = true;
    throw err;
  }
  if(!res.ok){
    const body = await res.json().catch(()=>({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res;
}

const AppStorage = {
  async get(key, shared){
    const m = !shared && authToken && key.match(PLAYER_SAVE_KEY_RE);
    if(m){
      const res = await remoteSavesFetch(`/api/saves/${m[1]}`, { method:"GET" });
      const value = await res.text();
      return {key, value, shared:false};
    }
    return LocalAppStorage.get(key, shared);
  },
  async set(key, value, shared){
    const m = !shared && authToken && key.match(PLAYER_SAVE_KEY_RE);
    if(m){
      await remoteSavesFetch(`/api/saves/${m[1]}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:value });
      return {key, value, shared:false};
    }
    return LocalAppStorage.set(key, value, shared);
  },
  async delete(key, shared){
    const m = !shared && authToken && key.match(PLAYER_SAVE_KEY_RE);
    if(m){
      await remoteSavesFetch(`/api/saves/${m[1]}`, { method:"DELETE" });
      return {key, deleted:true, shared:false};
    }
    return LocalAppStorage.delete(key, shared);
  },
  list: (prefix, shared)=> LocalAppStorage.list(prefix, shared), // solo lo usa el multijugador (shared:true) — nunca las claves player_*
};

/* ============================================================
   MISIONES DIARIAS — instancia única del servicio (ver
   src/game/systems/dailyMissions/). Vive en su propia clave de storage
   (rpgGo.dailyMissions.v1, nunca player_account/player_<clase>), así que
   nada de esto puede dañar el guardado real de la partida. `getPlayerLevel`
   se resuelve en el momento (no al crear el servicio) porque `player` recién
   existe después de elegir/crear un héroe. */
const dailyMissionsService = createDailyMissionsService({
  storage: AppStorage,
  getPlayerLevel: ()=> (player ? player.level : 1),
  onDailyReset: ()=>{
    toast("🗓️ Hay nuevas misiones diarias disponibles.", 4200);
    updateDailyMissionsButton();
    const overlay = $("dailyMissionsOverlay");
    if(overlay && !overlay.classList.contains("hidden")) renderDailyMissionsPanel();
  },
  onMissionsCompleted: (missions)=>{
    if(missions.length === 1) toast(`✅ Misión completada: ${missions[0].title}`, 3200);
    else if(missions.length > 1) toast(`✅ ¡${missions.length} misiones completadas de un golpe!`, 3600);
  },
});
dailyMissionsService.subscribe(()=>{
  updateDailyMissionsButton();
  const overlay = $("dailyMissionsOverlay");
  if(overlay && !overlay.classList.contains("hidden")) renderDailyMissionsPanel();
});
// Único punto que conecta Misiones Diarias al bus general de eventos — main.js emite
// una sola vez por acción (gameEventBus.emit) y cada sistema suscrito decide qué le importa.
gameEventBus.subscribe((event)=> dailyMissionsService.reportEvent(event));

/* ============================================================
   CONTRATO DEL AVENTURERO — instancia única del servicio (ver
   src/game/systems/adventurerContracts/). Clave propia (rpgGo.adventurerContracts.v1),
   nunca player_account/player_<clase>. Comparte el mismo gameEventBus que
   Misiones Diarias — main.js emite una sola vez por acción, cada sistema
   decide qué le importa. */
const adventurerContractsService = createAdventurerContractsService({
  storage: AppStorage,
  getPlayerLevel: ()=> (player ? player.level : 1),
  getFeaturesAvailable: ()=> ({ towers: true, dungeons: true, blacksmith: true }),
  onNewContractAvailable: ()=>{
    toast("📜 Nuevo contrato disponible en el Tablón del Aventurero.", 4200);
  },
  onObjectivesCompleted: (objectives)=>{
    if(objectives.length === 1) toast(`✅ Objetivo completado: ${objectives[0].title}`, 3200);
    else if(objectives.length > 1) toast(`✅ ¡${objectives.length} objetivos completados!`, 3400);
  },
  onSpawnRequests: (requests)=>{
    requests.forEach(r=> spawnContractTargetMonster(r.spawnKey, r.targetTag));
  },
  onTurnInRequired: (contract)=>{
    toast(`📜 Contrato listo para entregar — regresa con ${contract.turnInLabel||contract.clientName}.`, 4400);
  },
  onContractReadyToClaim: ()=>{
    toast("📜 ¡Contrato completado! Ya puedes reclamar tu recompensa.", 4200);
  },
  onContractExpired: ()=>{
    toast("⌛ El contrato ha vencido.", 3800);
  },
});
gameEventBus.subscribe((event)=> adventurerContractsService.reportEvent(event));
adventurerContractsService.subscribe(()=>{
  updateContractButton();
  syncContractTurnInMarker();
  const overlay = $("adventurerContractOverlay");
  if(overlay && !overlay.classList.contains("hidden")) renderContractBoard();
});

/* ============================================================
   MISIONES DIARIAS — UI (botón flotante + panel). Todo lo que sigue solo
   LEE el estado vía dailyMissionsService.getState()/claimMission()/
   claimFinalReward() — nunca escribe directo a localStorage ni duplica la
   lógica de progreso/reclamo, que vive enteramente en
   src/game/systems/dailyMissions/.
   ============================================================ */
function formatDailyMissionReward(reward){
  const parts = [];
  if(reward.gold) parts.push(`💰 ${reward.gold} oro`);
  if(reward.experience) parts.push(`✨ ${reward.experience} XP`);
  if(reward.diamonds) parts.push(`💎 ${reward.diamonds} diamante${reward.diamonds>1?"s":""}`);
  (reward.materials||[]).forEach(m=>{
    parts.push(`${RESOURCE_ICON[m.materialId]||"📦"} ${m.quantity} ${RESOURCE_LABEL[m.materialId]||m.materialId}`);
  });
  return parts.join(" · ");
}

function formatDailyMissionsCountdown(ms){
  const total = Math.max(0, Math.floor(ms/1000));
  const h = Math.floor(total/3600), m = Math.floor((total%3600)/60), s = total%60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

let dailyMissionsCountdownTimer = null;
function startDailyMissionsCountdown(){
  stopDailyMissionsCountdown();
  const tick = ()=>{
    const el = $("dailyMissionsCountdown");
    if(el) el.textContent = formatDailyMissionsCountdown(dailyMissionsService.getMillisecondsUntilReset());
  };
  tick();
  dailyMissionsCountdownTimer = setInterval(tick, 1000);
}
function stopDailyMissionsCountdown(){
  if(dailyMissionsCountdownTimer){ clearInterval(dailyMissionsCountdownTimer); dailyMissionsCountdownTimer = null; }
}

/** Estados del botón flotante (ver index.html/main.css): icono normal, "X/10",
 *  brillo dorado + punto rojo si hay algo pendiente de reclamar, y check al
 *  reclamar el cofre final (deja de pulsar). */
function updateDailyMissionsButton(){
  const btn = $("btnDailyMissions");
  if(!btn) return;
  const state = dailyMissionsService.getState();
  const badge = $("dailyMissionsBadge");
  const dot = $("dailyMissionsNotifDot");
  if(!state){
    if(badge) badge.textContent = "";
    if(dot) dot.classList.remove("show");
    btn.classList.remove("daily-missions-btn-glow", "daily-missions-btn-done");
    btn.title = "Misiones diarias"; btn.setAttribute("aria-label", "Misiones diarias");
    return;
  }
  const total = state.missions.length;
  const completedOrClaimed = state.missions.filter(m=> m.status==="COMPLETED" || m.status==="CLAIMED").length;
  const hasPendingClaim = state.missions.some(m=> m.status==="COMPLETED");
  const allClaimed = state.missions.every(m=> m.status==="CLAIMED");
  const finalAvailable = state.finalRewardStatus === "AVAILABLE";
  const finalClaimed = state.finalRewardStatus === "CLAIMED";

  if(badge) badge.textContent = `${completedOrClaimed}/${total}`;
  if(dot) dot.classList.toggle("show", (hasPendingClaim || finalAvailable) && !finalClaimed);
  btn.classList.toggle("daily-missions-btn-glow", allClaimed && !finalClaimed);
  btn.classList.toggle("daily-missions-btn-done", finalClaimed);

  const label = `Misiones diarias: ${completedOrClaimed} de ${total} completadas`
    + (finalClaimed ? " · recompensa final reclamada" : finalAvailable ? " · ¡cofre diario disponible!" : "");
  btn.title = label;
  btn.setAttribute("aria-label", label);
}

function renderDailyMissionCard(m){
  const displayProgress = Math.min(m.progress, m.target);
  const pct = m.target>0 ? Math.round((displayProgress/m.target)*100) : 100;
  const claimed = m.status === "CLAIMED";
  const completed = m.status === "COMPLETED";
  const stateClass = claimed ? "claimed" : completed ? "completed" : "in-progress";
  const actionHtml = claimed
    ? `<button class="daily-mission-claim-btn" disabled>✅ Reclamada</button>`
    : completed
      ? `<button class="daily-mission-claim-btn daily-mission-claim-btn--active" data-claim-mission="${m.id}">Reclamar</button>`
      : `<button class="daily-mission-claim-btn" disabled>En progreso</button>`;
  return `
    <div class="daily-mission-card daily-mission-card--${stateClass}">
      <div class="daily-mission-card-icon" aria-hidden="true">${m.icon}</div>
      <div class="daily-mission-card-body">
        <div class="daily-mission-card-title">${escapeHtml(m.title)}</div>
        <div class="daily-mission-card-desc">${escapeHtml(m.description)}</div>
        <div class="daily-mission-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="${m.target}" aria-valuenow="${displayProgress}" aria-label="${escapeHtml(m.title)}: ${displayProgress} de ${m.target}">
          <div class="daily-mission-progress-fill" style="width:${pct}%;"></div>
        </div>
        <div class="daily-mission-progress-label">${displayProgress} / ${m.target}</div>
        <div class="daily-mission-reward-line">${formatDailyMissionReward(m.reward)}</div>
      </div>
      <div class="daily-mission-card-action">${actionHtml}</div>
    </div>`;
}

function renderDailyMissionsFinalCard(state){
  const status = state.finalRewardStatus;
  const chestEmoji = status==="CLAIMED" ? "📭" : status==="AVAILABLE" ? "🎁" : "🔒";
  const actionHtml = status==="CLAIMED"
    ? `<button class="daily-mission-claim-btn" disabled>Reclamado</button>`
    : status==="AVAILABLE"
      ? `<button class="daily-mission-claim-btn daily-mission-claim-btn--active" id="btnClaimDailyFinalReward">Reclamar cofre diario</button>`
      : `<button class="daily-mission-claim-btn" disabled>Completa las 10 misiones</button>`;
  return `
    <div class="daily-mission-final-card daily-mission-final-card--${status.toLowerCase()}">
      <div class="daily-mission-final-chest" aria-hidden="true">${chestEmoji}</div>
      <div class="daily-mission-final-body">
        <div class="daily-mission-card-title">Recompensa por completar el día</div>
        <div class="daily-mission-card-desc">Completa y reclama las 10 misiones para abrir el cofre diario.</div>
        <div class="daily-mission-reward-line">${formatDailyMissionReward(state.finalReward)}</div>
      </div>
      <div class="daily-mission-card-action">${actionHtml}</div>
    </div>`;
}

function renderDailyMissionsPanel(){
  const state = dailyMissionsService.getState();
  const list = $("dailyMissionsList");
  if(!state || !list) return;
  const total = state.missions.length;
  const completedOrClaimed = state.missions.filter(m=> m.status==="COMPLETED" || m.status==="CLAIMED").length;
  const progressLabel = $("dailyMissionsProgressLabel");
  if(progressLabel) progressLabel.textContent = `${completedOrClaimed} / ${total} completadas`;
  const progressFill = $("dailyMissionsProgressFill");
  if(progressFill) progressFill.style.width = (total>0 ? Math.round((completedOrClaimed/total)*100) : 0)+"%";

  list.innerHTML = state.missions.map(renderDailyMissionCard).join("");
  const finalWrap = $("dailyMissionsFinalWrap");
  if(finalWrap) finalWrap.innerHTML = renderDailyMissionsFinalCard(state);

  list.querySelectorAll("[data-claim-mission]").forEach(btn=>{
    btn.onclick = ()=> handleClaimDailyMission(btn.dataset.claimMission);
  });
  const finalBtn = $("btnClaimDailyFinalReward");
  if(finalBtn) finalBtn.onclick = handleClaimDailyFinalReward;

  const rewardHeroLabel = $("dailyMissionsRewardHero");
  if(rewardHeroLabel){
    rewardHeroLabel.textContent = player ? `La experiencia será entregada a: ${player.className||player.classKey} Nv.${player.level}` : "";
  }
}

/** Aplica una recompensa ya reclamada al `player` real (oro/xp/diamantes/materiales
 *  compartidos por cuenta) — el propio dailyMissionsService ya persistió la
 *  reclamación ANTES de devolver el reward acá, así que esto nunca puede
 *  duplicarse aunque saveGame() fallara justo después. */
function applyDailyMissionReward(reward){
  if(reward.gold) player.gold = (player.gold||0) + reward.gold;
  if(reward.experience) player.xp = (player.xp||0) + reward.experience;
  if(reward.diamonds) player.crystals = (player.crystals||0) + reward.diamonds;
  (reward.materials||[]).forEach(m=>{ player[m.materialId] = (player[m.materialId]||0) + m.quantity; });
}

const dailyMissionsClaimInFlight = new Set();
let dailyMissionsFinalClaimInFlight = false;

async function handleClaimDailyMission(missionId){
  if(!player || dailyMissionsClaimInFlight.has(missionId)) return;
  dailyMissionsClaimInFlight.add(missionId);
  try{
    const res = await dailyMissionsService.claimMission(missionId, player.classKey);
    if(res.ok){
      applyDailyMissionReward(res.reward);
      checkLevelUps();
      refreshHud();
      saveGame();
      toast(`🎉 ¡Misión reclamada! ${formatDailyMissionReward(res.reward)}`, 3400);
    }
  } finally {
    dailyMissionsClaimInFlight.delete(missionId);
    renderDailyMissionsPanel();
  }
}

async function handleClaimDailyFinalReward(){
  if(!player || dailyMissionsFinalClaimInFlight) return;
  dailyMissionsFinalClaimInFlight = true;
  try{
    const res = await dailyMissionsService.claimFinalReward();
    if(res.ok){
      applyDailyMissionReward(res.reward);
      checkLevelUps();
      refreshHud();
      saveGame();
      showAlert(
        `¡Completaste todas las misiones diarias! Recibiste:
         <div style="display:flex; gap:14px; justify-content:center; flex-wrap:wrap; margin:12px 0 2px; font-size:16px; font-weight:800; color:var(--text);">
           ${formatDailyMissionReward(res.reward).split(" · ").map(s=>`<span>${s}</span>`).join("")}
         </div>`,
        { icon:"🎁", title:"¡Cofre diario abierto!", confirmLabel:"¡Genial!" }
      );
    }
  } finally {
    dailyMissionsFinalClaimInFlight = false;
    renderDailyMissionsPanel();
  }
}

$("btnDailyMissions").onclick = ()=>{
  $("dailyMissionsOverlay").classList.remove("hidden");
  renderDailyMissionsPanel();
  startDailyMissionsCountdown();
};
$("btnCloseDailyMissions").onclick = ()=>{
  $("dailyMissionsOverlay").classList.add("hidden");
  stopDailyMissionsCountdown();
};

/* ============================================================
   CONTRATO DEL AVENTURERO — UI (botón flotante + Tablón). Igual que la UI de
   Misiones Diarias: todo lo que sigue solo LEE el estado vía
   adventurerContractsService.getState()/acceptContract()/turnInContract()/
   claimReward()/abandonContract() — nunca escribe directo a localStorage ni
   duplica reglas de progreso/reclamo (esas viven enteramente en
   src/game/systems/adventurerContracts/).
   ============================================================ */
const CONTRACT_RARITY_LABEL = { COMMON:"Común", UNCOMMON:"Poco común", RARE:"Raro", EPIC:"Épico", LEGENDARY:"Legendario" };
const CONTRACT_DIFFICULTY_LABEL = { EASY:"Fácil", NORMAL:"Normal", HARD:"Difícil", ELITE:"Élite" };
const WORLD_RESOURCE_KEYS = ["wood", "stone", "iron"];

/** Enemigos "marcados" que el contrato genera cerca del jugador cuando un objetivo
 *  SEQUENTIAL tipo DEFEAT_SPECIFIC_ENEMY se activa (ver spawnOnActivate en las
 *  plantillas) — reusa plantillas de enemigo YA existentes (MONSTER_TEMPLATES),
 *  solo bufadas y renombradas, en vez de inventar enemigos nuevos. */
const CONTRACT_TARGET_SPAWN_PRESETS = {
  cuervo_alfa: { baseName:"Cuervo Corrupto", displayName:"Cuervo Alfa", emoji:"🐦‍⬛", levelBonus:4, hpMult:1.8, atkMult:1.4 },
  demonio_marcado: { baseName:"Demonio Menor", displayName:"Demonio Marcado", emoji:"👹", levelBonus:5, hpMult:2.0, atkMult:1.5 },
  depredador_ancestral: { baseName:"Golem de Roca", displayName:"Depredador Ancestral", emoji:"🐉", levelBonus:10, hpMult:3.0, atkMult:1.8 },
};
function spawnContractTargetMonster(spawnKey, targetTag){
  const preset = CONTRACT_TARGET_SPAWN_PRESETS[spawnKey];
  if(!preset || !playerLatLng) return;
  const baseTpl = MONSTER_TEMPLATES.find(t=> t.name === preset.baseName);
  if(!baseTpl) return;
  const tpl = { ...baseTpl, name: preset.displayName, emoji: preset.emoji, hpM: baseTpl.hpM*preset.hpMult, atkM: baseTpl.atkM*preset.atkMult };
  const level = Math.max(1, (player ? player.level : 1) + preset.levelBonus);
  const pos = randOffset(30 + Math.random()*40);
  const mon = makeMonster(tpl, level, pos, { special: true });
  mon.contractTargetTag = targetTag;
  monsters.push(mon);
  toast(`⚠️ ¡${preset.displayName} apareció cerca!`, 4200);
}

/** Marcador de entrega — se ubica en el centro de la ciudad/zona actual
 *  ("centro" ya existe en NEIVA_ZONES, ver world.js) porque el juego no tiene
 *  todavía un edificio de gremio propio en el mapa. Aparece SOLO mientras el
 *  contrato está en TURN_IN_REQUIRED y desaparece solo (reclamado, vencido o
 *  abandonado). */
let contractTurnInMarker = null;
function removeContractTurnInMarker(){
  if(contractTurnInMarker){ contractTurnInMarker.remove(); contractTurnInMarker = null; }
}
function showContractTurnInMarker(contract){
  removeContractTurnInMarker();
  if(!map || !NEIVA_ZONES || !NEIVA_ZONES.length) return;
  const zone = NEIVA_ZONES.find(z=> z.key === "centro") || NEIVA_ZONES[0];
  const icon = L.divIcon({ className:'', html:`<div class="contract-turnin-marker">🎗️</div>`, iconSize:[42,46], iconAnchor:[21,42] });
  contractTurnInMarker = L.marker([zone.center.lat, zone.center.lng], { icon, zIndexOffset:250 }).addTo(map);
  contractTurnInMarker.bindTooltip(`Entrega disponible — ${contract.turnInLabel||contract.clientName}`, { direction:"top", offset:[0,-40] });
  contractTurnInMarker.on('click', ()=>{
    $("adventurerContractOverlay").classList.remove("hidden");
    renderContractBoard();
  });
}
/** Único punto que decide si el marcador de entrega debe estar puesto — se llama
 *  desde adventurerContractsService.subscribe(), así cubre TODOS los casos
 *  (aceptar, progresar, entregar, vencer, abandonar, reabrir la app) sin
 *  repetir esta decisión en cada callback. */
function syncContractTurnInMarker(){
  const state = adventurerContractsService.getState();
  const c = state && state.currentContract;
  if(c && c.status === "TURN_IN_REQUIRED") showContractTurnInMarker(c);
  else removeContractTurnInMarker();
}

function materialDisplayName(materialId){
  return RESOURCE_LABEL[materialId] || (CRAFT_MATERIALS.find(m=> m.key===materialId)||{}).label || materialId;
}
function materialEmoji(materialId){
  return RESOURCE_ICON[materialId] || (CRAFT_MATERIALS.find(m=> m.key===materialId)||{}).emoji || "📦";
}
function formatContractReward(reward){
  const parts = [];
  if(reward.gold) parts.push(`💰 ${reward.gold} oro`);
  if(reward.experience) parts.push(`✨ ${reward.experience} XP`);
  if(reward.diamonds) parts.push(`💎 ${reward.diamonds} diamante${reward.diamonds>1?"s":""}`);
  if(reward.reputation) parts.push(`🏅 ${reward.reputation} reputación`);
  (reward.materials||[]).forEach(m=> parts.push(`${materialEmoji(m.materialId)} ${m.quantity} ${materialDisplayName(m.materialId)}`));
  if(reward.freeRepairCount) parts.push(`🔨 Reparación gratuita`);
  if(reward.chestId) parts.push(`🎁 Objeto especial`);
  return parts.join(" · ");
}
function formatContractTimeLeft(ms){
  const totalMin = Math.max(0, Math.floor(ms/60000));
  const h = Math.floor(totalMin/60), m = totalMin%60;
  return `${h} h ${m} min`;
}
function computeReputationProgress(reputation){
  let idx = 0;
  for(let i=0;i<REPUTATION_RANKS.length;i++){ if(reputation >= REPUTATION_RANKS[i].min) idx = i; }
  const current = REPUTATION_RANKS[idx];
  const next = REPUTATION_RANKS[idx+1];
  if(!next) return { pct:100, label:`${current.name} · Reputación: ${reputation} (rango máximo)` };
  const pct = Math.max(0, Math.min(100, Math.round(((reputation-current.min)/(next.min-current.min))*100)));
  return { pct, label:`${current.name} · Reputación: ${reputation} / ${next.min}` };
}

/** Aplica al `player` real una recompensa YA reclamada (el servicio ya la
 *  persistió como CLAIMED antes de devolverla acá) — mismo criterio que
 *  applyDailyMissionReward. Devuelve las líneas para el resumen visual. */
function grantMaterial(materialId, quantity){
  if(WORLD_RESOURCE_KEYS.includes(materialId)) player[materialId] = (player[materialId]||0) + quantity;
  else { if(!player.craftMats) player.craftMats = {}; player.craftMats[materialId] = (player.craftMats[materialId]||0) + quantity; }
}
function grantFreeRepair(){
  allDurabilityItems().filter(it=> it.durability < it.maxDurability).forEach(it=>{
    it.durability = it.maxDurability; syncDamagedPenalty(it);
  });
}
function grantContractChestItem(){
  const item = rollLoot();
  return pushItemSafe({...item}) ? item : null;
}
function applyContractReward(reward){
  const lines = [];
  if(reward.gold){ player.gold += reward.gold; lines.push(`💰 +${reward.gold} oro`); }
  if(reward.experience){ player.xp += reward.experience; lines.push(`✨ +${reward.experience} XP`); }
  if(reward.diamonds){ player.crystals = (player.crystals||0) + reward.diamonds; lines.push(`💎 +${reward.diamonds} diamante${reward.diamonds>1?"s":""}`); }
  if(reward.reputation) lines.push(`🏅 +${reward.reputation} reputación`);
  (reward.materials||[]).forEach(m=>{ grantMaterial(m.materialId, m.quantity); lines.push(`${materialEmoji(m.materialId)} +${m.quantity} ${materialDisplayName(m.materialId)}`); });
  if(reward.freeRepairCount){ grantFreeRepair(); lines.push("🔨 Reparación gratuita aplicada"); }
  if(reward.chestId){ const item = grantContractChestItem(); if(item) lines.push(`${item.emoji} ${item.name}`); }
  return lines;
}

function updateContractButton(){
  const btn = $("btnAdventurerContract");
  if(!btn) return;
  const state = adventurerContractsService.getState();
  const dot = $("contractNotifDot");
  const badge = $("contractBadge");
  const c = state && state.currentContract;
  btn.classList.remove("contract-btn-glow");
  if(!c){
    if(badge) badge.textContent = "";
    if(dot) dot.classList.remove("show");
    btn.title = "Contrato del Aventurero"; btn.setAttribute("aria-label", "Contrato del Aventurero");
    return;
  }
  const gameplayObjectives = c.objectives.filter(o=> o.type !== "RETURN_TO_NPC");
  const completedCount = gameplayObjectives.filter(o=> o.status === "COMPLETED").length;
  const total = gameplayObjectives.length;
  let badgeText = "", label = "";
  if(c.status === "AVAILABLE"){
    badgeText = "Nuevo";
    label = `Contrato del Aventurero: nuevo contrato disponible — ${c.title}`;
    if(dot) dot.classList.add("show");
  } else if(c.status === "ACTIVE"){
    badgeText = `${completedCount}/${total}`;
    label = `Contrato del Aventurero: ${completedCount} de ${total} objetivos completados`;
    if(dot) dot.classList.remove("show");
  } else {
    badgeText = "Entregar";
    label = "Contrato del Aventurero: listo para entregar";
    btn.classList.add("contract-btn-glow");
    if(dot) dot.classList.add("show");
  }
  if(badge) badge.textContent = badgeText;
  btn.title = label; btn.setAttribute("aria-label", label);
}

function renderContractObjectiveLine(o){
  const locked = o.status === "LOCKED";
  const completed = o.status === "COMPLETED";
  const icon = completed ? "✅" : locked ? "🔒" : "▫️";
  let text;
  if(locked) text = "Completa el objetivo anterior";
  else if(completed || o.type === "RETURN_TO_NPC") text = o.description;
  else text = `${o.description} (${Math.min(o.progress,o.target)}/${o.target})`;
  return `<div class="contract-objective-line${locked?" is-locked":""}${completed?" is-completed":""}">
    <span class="contract-objective-icon" aria-hidden="true">${icon}</span>
    <span class="contract-objective-text">${escapeHtml(text)}</span>
  </div>`;
}

function renderContractCard(state){
  const c = state.currentContract;
  if(!c){
    return `<div class="contract-empty-state">
      <div class="contract-empty-icon" aria-hidden="true">📭</div>
      <div>No hay ningún contrato disponible ahora mismo. Vuelve más tarde.</div>
    </div>`;
  }
  const rarityClass = `contract-rarity-${c.rarity.toLowerCase()}`;
  const showTimer = c.status === "ACTIVE" || c.status === "TURN_IN_REQUIRED";
  const msLeft = showTimer ? adventurerContractsService.getMillisecondsUntilExpiration() : null;
  const timeHtml = msLeft!=null ? `<div class="contract-time-left${msLeft < 3*3600000 ? " contract-time-low":""}">Tiempo restante: ${formatContractTimeLeft(msLeft)}</div>` : "";
  const objectivesHtml = c.objectives.map(renderContractObjectiveLine).join("");
  let actionHtml = "";
  if(c.status === "AVAILABLE"){
    actionHtml = `<button class="contract-action-btn contract-action-btn--active" id="btnAcceptContract">Aceptar contrato</button>`;
  } else if(c.status === "ACTIVE"){
    actionHtml = `<button class="contract-action-btn contract-action-btn--danger" id="btnAbandonContract">Abandonar contrato</button>`;
  } else if(c.status === "TURN_IN_REQUIRED"){
    actionHtml = `<div class="contract-turnin-hint">📍 Regresa con ${escapeHtml(c.turnInLabel||c.clientName)} (marcado en el mapa) para entregar.</div>
      <button class="contract-action-btn contract-action-btn--active" id="btnTurnInContract">Entregar contrato</button>`;
  } else if(c.status === "COMPLETED"){
    actionHtml = `<button class="contract-action-btn contract-action-btn--active" id="btnClaimContract">Reclamar recompensa</button>`;
  }
  const heroLine = (c.status==="COMPLETED" && player) ? `<div class="contract-reward-hero">La experiencia será entregada a: ${escapeHtml(player.className||player.classKey)} Nv.${player.level}</div>` : "";
  return `
    <div class="contract-parchment ${rarityClass}">
      <div class="contract-seal" aria-hidden="true">🔥</div>
      <div class="contract-client-row">
        <span class="contract-client-portrait" aria-hidden="true">${c.clientPortrait||"🛡️"}</span>
        <span class="contract-client-name">${escapeHtml(c.clientName)}</span>
        <span class="contract-rarity-badge">${CONTRACT_RARITY_LABEL[c.rarity]||c.rarity}</span>
      </div>
      <div class="contract-title">${escapeHtml(c.title)}</div>
      <div class="contract-description">${escapeHtml(c.description)}</div>
      ${timeHtml}
      <div class="contract-objectives-list">${objectivesHtml}</div>
      <div class="contract-reward-line">${formatContractReward(c.reward)}</div>
      ${heroLine}
      <div class="contract-action-row">${actionHtml}</div>
    </div>`;
}

function renderContractBoard(){
  const state = adventurerContractsService.getState();
  if(!state) return;
  const progress = computeReputationProgress(state.reputation);
  const repLabel = $("contractReputationLabel");
  if(repLabel) repLabel.textContent = progress.label;
  const repFill = $("contractReputationFill");
  if(repFill) repFill.style.width = progress.pct + "%";
  const wrap = $("contractCardWrap");
  if(wrap) wrap.innerHTML = renderContractCard(state);

  const acceptBtn = $("btnAcceptContract");
  if(acceptBtn) acceptBtn.onclick = handleAcceptContractClick;
  const abandonBtn = $("btnAbandonContract");
  if(abandonBtn) abandonBtn.onclick = handleAbandonContractClick;
  const turnInBtn = $("btnTurnInContract");
  if(turnInBtn) turnInBtn.onclick = handleTurnInContractClick;
  const claimBtn = $("btnClaimContract");
  if(claimBtn) claimBtn.onclick = handleClaimContractClick;
}

function handleAcceptContractClick(){
  const c = adventurerContractsService.getState().currentContract;
  if(!c) return;
  const hours = Math.round((CONTRACT_DURATION_MS_BY_DIFFICULTY[c.difficulty]||0)/3600000);
  showConfirm(
    `<div style="text-align:left; font-size:13px; line-height:1.6;">
       <div style="font-size:15px; font-weight:800; margin-bottom:4px;">${escapeHtml(c.title)}</div>
       <div style="color:var(--dim); margin-bottom:8px;">${escapeHtml(c.description)}</div>
       <div>🏅 Rareza: ${CONTRACT_RARITY_LABEL[c.rarity]}</div>
       <div>⚔️ Dificultad: ${CONTRACT_DIFFICULTY_LABEL[c.difficulty]}</div>
       <div>⏳ Tiempo límite: ${hours} horas</div>
       <div style="margin-top:8px; font-weight:700;">Recompensa: ${formatContractReward(c.reward)}</div>
     </div>
     <div style="margin-top:12px; font-weight:700;">¿Deseas aceptar este contrato?</div>`,
    async ()=>{
      const res = await adventurerContractsService.acceptContract();
      if(res.ok) toast(`📜 Contrato aceptado: ${c.title}`, 4000);
      renderContractBoard();
    },
    { icon:"📜", title:"Nuevo contrato", confirmLabel:"Aceptar contrato", cancelLabel:"Cancelar" }
  );
}
function handleAbandonContractClick(){
  showConfirm(
    "Perderás todo el progreso de este contrato. ¿Abandonar de todas formas?",
    async ()=>{
      const res = await adventurerContractsService.abandonContract();
      if(res.ok){ toast("Contrato abandonado.", 3000); removeContractTurnInMarker(); }
      renderContractBoard();
    },
    { icon:"⚠️", title:"Abandonar contrato", confirmLabel:"Abandonar", cancelLabel:"Cancelar" }
  );
}
async function handleTurnInContractClick(){
  const res = await adventurerContractsService.turnInContract();
  if(res.ok) removeContractTurnInMarker();
  renderContractBoard();
}
let contractClaimInFlight = false;
async function handleClaimContractClick(){
  if(!player || contractClaimInFlight) return;
  contractClaimInFlight = true;
  try{
    const res = await adventurerContractsService.claimReward(player.classKey);
    if(res.ok){
      const lines = applyContractReward(res.reward);
      checkLevelUps();
      refreshHud(); saveGame();
      showAlert(
        `¡Contrato completado! Recibiste:
         <div style="display:flex; gap:14px; justify-content:center; flex-wrap:wrap; margin:12px 0 2px; font-size:16px; font-weight:800; color:var(--text);">
           ${lines.map(l=>`<span>${l}</span>`).join("")}
         </div>`,
        { icon:"📜", title:"¡Contrato reclamado!", confirmLabel:"¡Genial!" }
      );
    }
  } finally {
    contractClaimInFlight = false;
    renderContractBoard();
  }
}

$("btnAdventurerContract").onclick = ()=>{
  $("adventurerContractOverlay").classList.remove("hidden");
  renderContractBoard();
};
$("btnCloseAdventurerContract").onclick = ()=>{
  $("adventurerContractOverlay").classList.add("hidden");
};

/** Al loguearse/registrarse por primera vez en ESTE navegador, si ya había partidas guardadas
 *  localmente (jugó de invitado antes) y el servidor todavía no tiene nada para esa clase, las
 *  sube una sola vez — así no pierde lo que ya tenía acá. Nunca pisa un save que ya exista en el
 *  servidor (evita que un login viejo en otro dispositivo borre progreso más nuevo). */
async function migrateLocalSavesToRemote(){
  const local = await LocalAppStorage.list("player_", false);
  for(const key of local.keys){
    const m = key.match(PLAYER_SAVE_KEY_RE);
    if(!m) continue;
    try{
      await remoteSavesFetch(`/api/saves/${m[1]}`, { method:"GET" });
      // ya existe en el servidor — no se toca
    }catch(e){
      if(!e.notFound) continue; // error de red/sesión: no migra este, pero no corta el resto
      try{
        const localVal = await LocalAppStorage.get(key, false);
        await remoteSavesFetch(`/api/saves/${m[1]}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:localVal.value });
      }catch(e2){ /* si falla la subida, el save local sigue intacto — se puede reintentar después */ }
    }
  }
}

const SAVE_TRANSFER_FORMAT_VERSION = 1;

/** Junta player_account + cada player_<classKey> que exista (nube o local — AppStorage.get ya
 *  enruta solo según haya sesión activa, igual que en cualquier otro lugar del juego) en un único
 *  archivo descargable/compartible. Pensado para el caso "jugué de invitado en el navegador y
 *  ahora quiero esa partida dentro de la app" — ver importSave más abajo. */
async function exportSave(){
  if(!AppStorage) return;
  try{
    const keys = {};
    try{
      const res = await AppStorage.get('player_account', false);
      if(res && res.value) keys.player_account = res.value;
    }catch(e){ /* sin cuenta guardada todavía */ }
    for(const classKey of Object.keys(CLASSES)){
      try{
        const res = await AppStorage.get('player_'+classKey, false);
        if(res && res.value) keys['player_'+classKey] = res.value;
      }catch(e){ /* este héroe nunca se jugó */ }
    }
    if(Object.keys(keys).length === 0){ toast("No hay ninguna partida guardada todavía para exportar."); return; }
    const payload = {app:"RPG GO", formatVersion: SAVE_TRANSFER_FORMAT_VERSION, exportedAt: new Date().toISOString(), keys};
    const filename = `rpggo-save-${new Date().toISOString().slice(0,10)}.json`;
    await writeAndShareTextFile(filename, JSON.stringify(payload, null, 2));
    toast("Partida exportada.");
  }catch(e){
    console.error("[exportSave]", e);
    toast("No se pudo exportar la partida.");
  }
}

/** Lee un archivo generado por exportSave() y sobreescribe las claves correspondientes vía
 *  AppStorage (respeta la sesión activa igual que el resto del juego: si hay cuenta logueada,
 *  importa a la nube; si no, queda local). Pide confirmación antes de tocar nada, porque pisa
 *  cualquier progreso que ya hubiera para esas mismas claves. Recarga la página al terminar para
 *  que todo el estado en memoria se reconstruya limpio desde lo recién importado, en vez de arriesgar
 *  variables globales desincronizadas a mitad de una partida ya en curso. */
async function importSave(){
  if(!AppStorage) return;
  const text = await pickAndReadTextFile();
  if(!text) return; // el usuario canceló el selector
  let payload;
  try{ payload = JSON.parse(text); }catch(e){ toast("Ese archivo no es un guardado válido de RPG GO."); return; }
  if(!payload || payload.formatVersion !== SAVE_TRANSFER_FORMAT_VERSION || !payload.keys || typeof payload.keys !== "object"){
    toast("Ese archivo no es un guardado válido de RPG GO.");
    return;
  }
  const entries = Object.entries(payload.keys).filter(([k])=> k==="player_account" || PLAYER_SAVE_KEY_RE.test(k));
  if(entries.length === 0){ toast("El archivo no tiene ninguna partida adentro."); return; }
  showConfirm(
    `Vas a importar ${entries.length} guardado(s). Esto va a <b>sobrescribir</b> tu progreso actual para esos mismos personajes. ¿Importar igual?`,
    async ()=>{
      try{
        for(const [key, value] of entries) await AppStorage.set(key, value, false);
        toast("Partida importada — reiniciando...", 2500);
        setTimeout(()=> location.reload(), 1200);
      }catch(e){
        console.error("[importSave]", e);
        toast("No se pudo importar la partida.");
      }
    },
    {icon:"⚠️", title:"Importar partida", confirmLabel:"Importar", cancelLabel:"Cancelar"}
  );
}

/* ---------- Toast ---------- */
let toastTimer=null;
function toast(msg, ms=2200){
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove("show"), ms);
}

let healFeedbackTimer = null;
/** Popup flotante y temporal que muestra cuánta vida o maná se acaba de recuperar (barra animada
 *  de antes → después + números exactos) — pensado para usarse desde el inventario, donde no hay
 *  ninguna barra de HP/MP visible en pantalla (a diferencia de una batalla, que ya muestra las
 *  suyas). `kind` es "hp" o "mp". Se cierra solo; no bloquea nada. */
function showHealFeedback(kind, before, after, max){
  const el = $("healFeedbackPopup");
  if(!el) return;
  const isHp = kind === "hp";
  el.classList.toggle("hfp-mp", !isHp);
  $("healFeedbackIcon").textContent = isHp ? "❤️" : "💧";
  $("healFeedbackLabel").textContent = isHp ? "Vida" : "Maná";
  $("healFeedbackBefore").textContent = Math.round(before);
  $("healFeedbackAfter").textContent = Math.round(after);
  $("healFeedbackGain").textContent = `+${Math.round(after-before)}`;
  const fill = $("healFeedbackBarFill");
  fill.style.transition = "none";
  fill.style.width = pct(before, max) + "%";
  el.classList.remove("show");
  void el.offsetWidth; // fuerza el reflow para que la animación de abajo arranque de verdad desde "before"
  el.classList.add("show");
  void fill.offsetWidth;
  fill.style.transition = "width .6s ease";
  fill.style.width = pct(after, max) + "%";
  clearTimeout(healFeedbackTimer);
  healFeedbackTimer = setTimeout(()=> el.classList.remove("show"), 1900);
}

let shadowWolfDialogueTimer = null;
/** Muestra una frase o aviso del Lobo Sombrío en un popup grande y llamativo (encima de todo, con
 *  brillo propio) — antes tanto sus diálogos como el aviso de que está cargando su ataque especial
 *  solo aparecían mezclados en la narración normal de la batalla (logBattle), donde podían pasar
 *  desapercibidos. Este popup es ADEMÁS del registro en el log de batalla (que se mantiene para el
 *  historial), nunca lo reemplaza. `opts.variant` = "speech" (diálogo hablado, morado, ícono 🐺 —
 *  por defecto) o "charge" (aviso del Súper ataque cargado, ámbar/eléctrico con pulso urgente,
 *  ícono ⚡, y se queda más tiempo en pantalla porque el jugador todavía tiene que decidir su
 *  turno). */
function showShadowWolfDialogue(text, opts){
  opts = opts || {};
  const el = $("shadowWolfDialoguePopup");
  if(!el) return;
  const isCharge = opts.variant === "charge";
  el.classList.toggle("charge-warning", isCharge);
  $("shadowWolfDialogueIcon").textContent = opts.icon || (isCharge ? "⚡" : "🐺");
  $("shadowWolfDialogueText").textContent = text;
  el.classList.remove("show");
  void el.offsetWidth; // fuerza el reflow para que la animación reinicie si ya estaba mostrándose
  el.classList.add("show");
  clearTimeout(shadowWolfDialogueTimer);
  shadowWolfDialogueTimer = setTimeout(()=> el.classList.remove("show"), isCharge ? 3200 : 3800);
}
/** Mismo popup grande y llamativo que showShadowWolfDialogue, pero con el ícono del Ladrón/Ninja
 *  errante en vez del lobo — reutiliza el mismo componente (ver el comentario de arriba) para sus
 *  propios diálogos ("¿A que no puedes darme?") y el aviso dramático del Shuriken Venenoso. */
function showThiefDialogue(text, opts){
  showShadowWolfDialogue(text, Object.assign({icon:"🥷"}, opts));
}

/** Modal de confirmación con el diseño del juego — reemplaza a confirm()/alert() del navegador,
 *  que se ven feos y rompen la ambientación. Como el modal no puede "bloquear" la ejecución como
 *  hace confirm(), todo lo que dependía de esa respuesta se mueve a los callbacks onConfirm/onCancel. */
function showConfirm(message, onConfirm, opts){
  opts = opts || {};
  $("confirmModalIcon").textContent = opts.icon || "❓";
  $("confirmModalTitle").textContent = opts.title || "¿Estás seguro?";
  $("confirmModalMsg").innerHTML = message;
  const okBtn = $("confirmModalOk"), cancelBtn = $("confirmModalCancel");
  okBtn.textContent = opts.confirmLabel || "Confirmar";
  cancelBtn.textContent = opts.cancelLabel || "Cancelar";
  cancelBtn.classList.toggle("hidden", !!opts.hideCancel);
  $("confirmModalOverlay").classList.remove("hidden");
  okBtn.onclick = ()=>{ $("confirmModalOverlay").classList.add("hidden"); if(onConfirm) onConfirm(); };
  cancelBtn.onclick = ()=>{ $("confirmModalOverlay").classList.add("hidden"); if(opts.onCancel) opts.onCancel(); };
}
/** Como showConfirm, pero de un solo botón — para los avisos que antes usaban alert(). */
function showAlert(message, opts){
  opts = opts || {};
  showConfirm(message, opts.onClose, {...opts, hideCancel:true, confirmLabel: opts.confirmLabel || "OK", icon: opts.icon || "ℹ️"});
}

/** Modal de compra con selector de cantidad (imagen del objeto + stepper −/+), usado por buildShopCard
 *  en vez de un showConfirm de una sola unidad. `unitMatCost` es opcional ({wood,stone,iron}, armas
 *  élite) — el tope del stepper nunca deja elegir más de lo que el oro (y esos materiales, si aplica)
 *  alcanzan a pagar, así nunca hace falta validar valores negativos ni de más al confirmar. */
function openBuyQuantityModal(item, unitGoldCost, unitMatCost, onConfirm){
  const maxByMatEntry = (have, cost)=> cost>0 ? Math.floor(have/cost) : Infinity;
  const maxByGold = unitGoldCost>0 ? Math.floor((player.gold||0)/unitGoldCost) : Infinity;
  const maxByMat = unitMatCost ? Math.min(
    maxByMatEntry(player.wood||0, unitMatCost.wood||0),
    maxByMatEntry(player.stone||0, unitMatCost.stone||0),
    maxByMatEntry(player.iron||0, unitMatCost.iron||0)
  ) : Infinity;
  const maxQty = Math.max(1, Math.min(maxByGold, maxByMat));
  let qty = 1;

  $("buyQtyModalImgWrap").innerHTML = iconFor(item);
  $("buyQtyModalName").textContent = item.name;
  $("buyQtyModalDesc").textContent = item.desc || "";

  const valEl = $("buyQtyValue"), minusBtn = $("buyQtyMinus"), plusBtn = $("buyQtyPlus"), totalEl = $("buyQtyModalTotal");
  function render(){
    valEl.textContent = qty;
    let totalTxt = `Total: 💰${unitGoldCost*qty}`;
    if(unitMatCost) totalTxt += ` · 🪵${unitMatCost.wood*qty} 🪨${unitMatCost.stone*qty} 🔩${unitMatCost.iron*qty}`;
    totalEl.textContent = totalTxt;
    minusBtn.disabled = qty<=1;
    plusBtn.disabled = qty>=maxQty;
  }
  minusBtn.onclick = ()=>{ if(qty>1){ qty--; render(); } };
  plusBtn.onclick = ()=>{ if(qty<maxQty){ qty++; render(); } };
  render();

  const overlay = $("buyQtyModalOverlay");
  overlay.classList.remove("hidden");
  $("buyQtyCancel").onclick = ()=> overlay.classList.add("hidden");
  $("buyQtyConfirm").onclick = ()=>{
    overlay.classList.add("hidden");
    onConfirm(qty);
  };
}


/* ============================================================
   1. PANTALLA DE SELECCIÓN DE CLASE
   ============================================================ */
/** Pedido explícito: volver a crear los héroes de a uno — esta grilla marca como "tomada" (gris,
 *  no seleccionable) cualquier clase que ya tenga un héroe creado en la cuenta (takenClasses, ver
 *  initContinueScreen), igual que antes del rediseño de perfil compartido. */
function buildClassGrid(){
  const grid = $("classGrid");
  grid.innerHTML = "";
  Object.entries(CLASSES).forEach(([key, c])=>{
    const taken = takenClasses.has(key);
    const el = document.createElement("div");
    el.className = "class-card" + (taken ? " taken" : "");
    el.dataset.key = key;
    const portrait = (CLASS_PORTRAITS[key]||{})[selectedGender==="f"?"f":"m"];
    const thumb = portrait ? `<img src="${portrait.map}" class="class-portrait-thumb" data-classkey="${key}" alt="">` : `<div class="class-emoji">${c.emoji}</div>`;
    el.innerHTML = `
      ${thumb}
      <div class="class-name">${c.name}</div>
      <div class="class-desc">${c.desc}</div>
      <div class="class-stats">
        <span class="stat-chip">HP ${c.base.hp}</span>
        <span class="stat-chip">MP ${c.base.mp}</span>
        <span class="stat-chip">ATK ${c.base.atk}</span>
        <span class="stat-chip">DEF ${c.base.def}</span>
        <span class="stat-chip">VEL ${c.base.spd}</span>
      </div>
      ${taken ? `<div class="class-taken-badge">✔ Ya tienes uno</div>` : ""}`;
    if(!taken){
      el.onclick = ()=>{
        document.querySelectorAll(".class-card").forEach(e=>e.classList.remove("sel"));
        el.classList.add("sel");
        selectedClass = key;
        updateStartBtn();
      };
    }
    grid.appendChild(el);
  });
}
/** Actualiza las miniaturas de las tarjetas de clase cuando cambia el género elegido. */
function refreshClassPortraits(){
  document.querySelectorAll(".class-portrait-thumb").forEach(img=>{
    const key = img.dataset.classkey;
    const portrait = (CLASS_PORTRAITS[key]||{})[selectedGender==="f"?"f":"m"];
    if(portrait) img.src = portrait.map;
  });
}
function updateStartBtn(){
  $("btnStart").disabled = !(selectedClass && $("nameInput").value.trim().length>0);
}
document.querySelectorAll("#genderToggle .gender-btn").forEach(btn=>{
  btn.onclick = ()=>{
    selectedGender = btn.dataset.gender;
    document.querySelectorAll("#genderToggle .gender-btn").forEach(b=> b.classList.toggle("active", b===btn));
    refreshClassPortraits();
  };
});
$("nameInput").addEventListener("input", updateStartBtn);

/** Primera línea de defensa (no la única — ver escapeHtml() en cada sitio donde se MUESTRA un
 *  nombre ajeno) contra nombres tipo `<img onerror=...>`: se guardan sin `<`/`>`, los únicos
 *  caracteres que hacen falta para inyectar una etiqueta HTML. El escapeHtml() en cada
 *  innerHTML que muestra nombres de OTROS jugadores (torres, bases, amigos, grupo, notificaciones,
 *  ranking del Coliseo, etc.) sigue siendo necesario: un cliente modificado podría publicar un
 *  nombre malicioso directamente por PubNub sin pasar nunca por este input. */
function sanitizePlayerName(raw){
  return (raw||"").replace(/[<>]/g,"").trim();
}
/** Crea UN héroe nuevo de la clase elegida en la grilla — pedido explícito: los héroes se crean de
 *  a uno, no los 4 de golpe. Dos casos:
 *  - Primera vez que se juega en este dispositivo (todavía no hay cuenta guardada): se crea la
 *    cuenta compartida desde cero (oro/materiales/inventario en 0) junto con este primer héroe.
 *  - Ya hay cuenta (el jugador tocó "Crear personaje" desde la pantalla de selección para agregar
 *    otra clase): la cuenta existente NO se toca — oro, materiales, inventario, mascotas, etc.
 *    siguen igual, solo se agrega el héroe nuevo. */
$("btnStart").onclick = async ()=>{
  showMapLoadingScreen();
  const chosenName = sanitizePlayerName($("nameInput").value) || "Aventurero";
  let accountData = await loadAccount();
  if(!accountData){
    accountData = freshAccountData(chosenName);
    equippedByHeroCache = {};
    bossLootRegistry = {};
  } else {
    equippedByHeroCache = accountData.equippedByHero || {};
    bossLootRegistry = accountData.bossLootRegistry || {};
  }
  activeQuest = null;
  const heroData = freshHeroData(selectedClass);
  heroData.gender = selectedGender || "m";
  if(AppStorage) await AppStorage.set('player_'+selectedClass, JSON.stringify(heroData), false);
  rebuildPlayer(accountData, heroData);
  $("classOverlay").classList.add("hidden");
  $("hudIconEmoji").textContent = player.emoji;
  updateNotifBell();
  refreshHud();
  teardownMapIfExists();
  setupBuilderModeUI();
  setupDungeonCodexUI();
  const _mapLoadGen = mapLoadingGen;
  initMap();
  armMapLoadingHide(_mapLoadGen);
  // el marcador del jugador (meMarker) recién existe DESPUÉS de initMap() — refreshHud() de arriba
  // corrió antes, así que cualquier cosa que dependa de él (como el aura del Legado en el mapa)
  // se queda sin aplicar hasta el siguiente refreshHud(). Se repite acá para que quede sincronizado
  // desde el primer momento, no solo tras la próxima mutación de stats.
  refreshHud();
  saveGame();
  checkDailyBonus();
  await dailyMissionsService.init();
  gameEventBus.emit({ type: "CHARACTER_SELECTED", payload: { amount: 1 }, dedupeKey: selectedClass });
  updateDailyMissionsButton();
  await adventurerContractsService.init();
  updateContractButton();
  syncContractTurnInMarker();
};

/** Recompensa por jugar cada día: +50 de oro gratis la primera vez que abres el juego en el día. */
function todayStr(){ const d=new Date(); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
function checkDailyBonus(){
  const today = todayStr();
  if(player.lastDailyBonus === today) return;
  player.lastDailyBonus = today;
  const goldReward = 50, crystalReward = 1;
  player.gold += goldReward;
  player.crystals = (player.crystals||0) + crystalReward;
  refreshHud();
  saveGame();
  // Pedido explícito: mostrar en un modal QUÉ se dio exactamente, en vez de un toast que se
  // desvanece solo — reusa showAlert (icono+título+mensaje+un botón), mismo mecanismo que ya usa
  // el resto del juego para avisos de un solo paso.
  showAlert(
    `Por entrar a jugar hoy, recibiste:
     <div style="display:flex; gap:18px; justify-content:center; margin:12px 0 2px; font-size:16px; font-weight:800; color:var(--text);">
       <span>💰 +${goldReward} oro</span>
       <span>💎 +${crystalReward} diamante</span>
     </div>`,
    {icon:"🎁", title:"¡Bono diario!", confirmLabel:"¡Genial!"}
  );
}

/* ============================================================
   1b. PERSISTENCIA (AppStorage) — guarda/recupera tu partida
   ============================================================ */
let storageAvailable = true;
/** ============================================================
 *  PERFIL ÚNICO + 4 HÉROES — modelo de guardado
 *  ------------------------------------------------------------
 *  Antes cada clase era un save 100% independiente (oro, inventario, misiones, TODO por separado),
 *  guardado en la clave 'player_'+classKey — esa clave es justo la que AppStorage.get/set/delete
 *  redirige a la nube cuando hay sesión iniciada (ver PLAYER_SAVE_KEY_RE, más arriba: cualquier
 *  clave con forma 'player_<letras>' se manda a /api/saves/<letras> en vez de a localStorage).
 *  Para no tener que tocar ese backend (vive en otro repo, worker/index.js, no está acá), el nuevo
 *  esquema REUSA esa misma forma de clave en vez de inventar una nueva:
 *  - 'player_account': UNA cuenta compartida (oro, materiales, inventario, mascotas, logros, mapa,
 *    misiones de mundo, torres, portales, equipo puesto de cada héroe...).
 *  - 'player_'+classKey (LA MISMA clave que antes, ahora con menos campos): documento de héroe —
 *    nivel, xp, stats, habilidades, apariencia, misión activa. Se crean DE A UNO (no los 4 de
 *    golpe) — ver btnStart/takenClasses/initContinueScreen: la pantalla de selección solo muestra
 *    los héroes que el jugador ya creó, más una tarjeta para crear otro (hasta 4).
 *  El objeto `player` en memoria NO cambia de forma (sigue siendo el mismo objeto plano de siempre,
 *  mismos campos que ya lee/escribe todo el motor de combate/misiones/tienda) — lo único que
 *  cambia es de dónde se arma (rebuildPlayer junta account+hero) y a dónde se guarda (saveGame
 *  reparte los campos entre los dos documentos). El equipo puesto de cada héroe vive en
 *  account.equippedByHero[classKey] (ids + mejora + durabilidad, no objetos completos — mismo
 *  patrón que ya usaba equipmentIds), cacheado en `equippedByHeroCache` durante la sesión.
 *  Sin migración: los saves viejos (guardados como un solo personaje por clave, con TODO adentro)
 *  se sobrescriben con el nuevo formato la primera vez que se guarda — decisión ya tomada con el
 *  usuario (empezar de cero, sin fusionar progreso viejo).
 *  ============================================================ */
async function saveGame(){
  if(!player || !AppStorage || !storageAvailable) return;
  try{
    const accountData = {
      name: player.name,
      friendCode: player.friendCode,
      activeHero: player.classKey,
      gold: player.gold, crystals: player.crystals||0, darkEssence: player.darkEssence||0,
      lastBossCrystalDay: player.lastBossCrystalDay || null,
      inventoryCapacityTier: player.inventoryCapacityTier||0,
      base: player.base || null, baseStorage: player.baseStorage || [], baseExtraSlots: player.baseExtraSlots||0, hasBase: player.hasBase||false, baseEverPlaced: player.baseEverPlaced||false,
      isBuilding: player.isBuilding||false, buildingLastCollectAt: player.buildingLastCollectAt||null,
      buildingUpgradeEndsAt: player.buildingUpgradeEndsAt||null,
      shadowWolfNightKey: player.shadowWolfNightKey||null, shadowWolfEscapes: player.shadowWolfEscapes||0,
      dynamicEntities: player.dynamicEntities||[],
      worldEvents: player.worldEvents||[], lastEventResolvedAt: player.lastEventResolvedAt||null,
      lastRegionId: player.lastRegionId||null,
      lastDailyBonus: player.lastDailyBonus || null,
      totalDistanceM: player.totalDistanceM || 0,
      medals: player.medals || [],
      zoneDistanceM: player.zoneDistanceM || {},
      parkWeaponsObtained: player.parkWeaponsObtained || [],
      parkGuardianState: player.parkGuardianState || {},
      visitedZones: player.visitedZones || [],
      pets: player.pets || [],
      everGotCaptureCard: player.everGotCaptureCard || false,
      redeemedCodes: player.redeemedCodes || [],
      coliseumStats: player.coliseumStats || null,
      ownedTowers: player.ownedTowers || null,
      dungeonProgress: player.dungeonProgress || {},
      activeDungeonRun: player.activeDungeonRun || null,
      dungeonPortalCooldowns: player.dungeonPortalCooldowns || {},
      wood: player.wood||0, stone: player.stone||0, iron: player.iron||0,
      craftMats: player.craftMats || {},
      pickaxe: player.pickaxe || null,
      seenBattleTutorial: player.seenBattleTutorial || false,
      inventoryIds: player.inventory.map(it=>it.id),
      inventoryDurability: player.inventory.map(it=> durabilitySaveData(it)),
      bossLootRegistry: bossLootRegistry, // objetos únicos de jefe generados en tiempo real (no viven en las tablas fijas)
      equippedByHero: buildEquippedByHeroForSave(),
      lastPos: playerLatLng || null,
      savedAt: Date.now()
    };
    const heroData = {
      classKey: player.classKey,
      gender: player.gender,
      level: player.level, xp: player.xp, xpNext: player.xpNext,
      attributePoints: player.attributePoints||0,
      attrSpent: player.attrSpent || {maxHp:0,maxMp:0,atk:0,matk:0,def:0,spd:0},
      eliteWeaponsBought: player.eliteWeaponsBought||0,
      activeTitle: player.activeTitle || null,
      activeFrameClass: player.activeFrameClass || null,
      maxHp: player.maxHp, hp: player.hp, maxMp: player.maxMp, mp: player.mp,
      atk: player.atk, matk: player.matk, def: player.def, spd: player.spd,
      moveIds: player.moves.map(m=>m.id),
      ultimateMove: player.ultimateMove || null,
      ultimateBaseId: player.ultimateBaseId || null,
      learnedIds: Array.from(player.learnedIds),
      everLearnedIds: Array.from(player.everLearnedIds||player.learnedIds),
      declinedMoveIds: Array.from(player.declinedMoveIds||[]),
      activeQuest: activeQuest ? {template:activeQuest.template, destName:activeQuest.destName, destLat:activeQuest.destLat, destLng:activeQuest.destLng,
        killGoal:activeQuest.killGoal, killProgress:activeQuest.killProgress, itemObtained:activeQuest.itemObtained, targetSpawned:activeQuest.targetSpawned} : null,
      savedAt: Date.now()
    };
    await AppStorage.set('player_account', JSON.stringify(accountData), false);
    await AppStorage.set('player_'+player.classKey, JSON.stringify(heroData), false);
  }catch(e){
    storageAvailable = false; // evita reintentos ruidosos; el juego sigue funcionando sin guardado
  }
}

/** Guarda una instancia de equipo (id + mejora + durabilidad, no el objeto completo) para
 *  account.equippedByHero — null si ese hueco está vacío. */
function equipInstanceSaveData(item){
  if(!item) return null;
  return { id: item.id, upgradeLevel: item.upgradeLevel||0, durability: durabilitySaveData(item) };
}
/** Arma el mapa completo {classKey: equipo} para guardar — recalcula SOLO el héroe activo desde
 *  player.equipment (lo único que vive en memoria ahora mismo); los otros 3 héroes se preservan
 *  tal cual se cargaron en equippedByHeroCache, porque su equipo no está en memoria. */
function buildEquippedByHeroForSave(){
  equippedByHeroCache[player.classKey] = {
    weapon: equipInstanceSaveData(player.equipment.weapon),
    offhand: equipInstanceSaveData(player.equipment.offhand),
    armor: equipInstanceSaveData(player.equipment.armor),
    helmet: equipInstanceSaveData(player.equipment.helmet),
    boots: equipInstanceSaveData(player.equipment.boots),
    accessory: (player.equipment.accessory||[]).map(equipInstanceSaveData),
  };
  return equippedByHeroCache;
}

function findItemById(id){
  return ITEM_TABLE.find(it=>it.id===id) || EQUIP_TABLE.find(it=>it.id===id) || EXCLUSIVE_TABLE.find(it=>it.id===id)
    || BOOK_TABLE.find(it=>it.id===id) || BOSS_BOOK_TABLE.find(it=>it.id===id) || BLACKSMITH_RECIPES.find(it=>it.id===id)
    || bossLootRegistry[id];
}

/** Reconstruye el set de equipo COMPLETO (objetos, no ids) de un héroe a partir de
 *  equippedByHeroCache[classKey] — mismo mecanismo que antes (freshCopy + reaplicar mejora/
 *  durabilidad), solo que ahora lee de la caché de cuenta en vez del propio save del héroe. */
function resolveEquipmentForHero(classKey, level){
  const eq = equippedByHeroCache[classKey] || {};
  function freshCopy(id){ const it = findItemById(id); return it ? {...it} : null; }
  function build(slotData){
    if(!slotData || !slotData.id) return null;
    const it = freshCopy(slotData.id);
    if(!it) return null;
    if(slotData.upgradeLevel) applyUpgradeToItem(it, slotData.upgradeLevel);
    const dur = slotData.durability;
    if(dur){ it.durability = dur.durability; it.maxDurability = dur.maxDurability; it.material = dur.material; }
    return it;
  }
  let accessoryArr = Array.isArray(eq.accessory) ? eq.accessory.map(build) : [];
  const slots = maxAccessorySlots(level, classKey);
  while(accessoryArr.length < slots) accessoryArr.push(null);
  return {
    weapon: build(eq.weapon), offhand: build(eq.offhand), armor: build(eq.armor),
    helmet: build(eq.helmet), boots: build(eq.boots), accessory: accessoryArr,
  };
}

async function loadAccount(){
  if(!AppStorage) return null;
  try{
    const res = await AppStorage.get('player_account', false);
    if(res && res.value) return JSON.parse(res.value);
  }catch(e){ /* sin cuenta guardada todavía */ }
  return null;
}
async function loadHero(classKey){
  if(!AppStorage) return null;
  try{
    const res = await AppStorage.get('player_'+classKey, false);
    if(res && res.value) return JSON.parse(res.value);
  }catch(e){ /* este héroe todavía no se jugó */ }
  return null;
}
/** Cuenta recién creada — recursos y colecciones en cero, sin equipo puesto en ningún héroe. */
function freshAccountData(name){
  return {
    name, friendCode: genFriendCode(name), activeHero: null,
    gold: 20, crystals: 0, darkEssence: 0, lastBossCrystalDay: null, inventoryCapacityTier: 0,
    base: null, baseStorage: [], baseExtraSlots: 0, hasBase: false, baseEverPlaced: false,
    isBuilding: false, buildingLastCollectAt: null, buildingUpgradeEndsAt: null,
    shadowWolfNightKey: null, shadowWolfEscapes: 0,
    dynamicEntities: [], worldEvents: [], lastEventResolvedAt: null, lastRegionId: null,
    lastDailyBonus: null, totalDistanceM: 0, medals: [], zoneDistanceM: {},
    parkWeaponsObtained: [], parkGuardianState: {}, visitedZones: [], pets: [],
    everGotCaptureCard: false, redeemedCodes: [], coliseumStats: null, ownedTowers: null,
    dungeonProgress: {}, activeDungeonRun: null, dungeonPortalCooldowns: {},
    wood: 0, stone: 0, iron: 0, craftMats: {}, pickaxe: null,
    inventoryIds: [], inventoryDurability: [], bossLootRegistry: {}, equippedByHero: {},
    seenBattleTutorial: false,
    lastPos: null, savedAt: Date.now(),
  };
}
/** Héroe recién creado (nivel 1, stats base de su clase) — se genera para los 4 a la vez al crear
 *  la cuenta, así los 4 "existen" desde el primer momento aunque solo se juegue con uno. */
function freshHeroData(classKey){
  const c = CLASSES[classKey];
  const starterMoveIds = c.movePool.filter(m=>m.lvl===1).slice(0,3).map(m=>m.id);
  return {
    classKey, gender: "m", level: 1, xp: 0, xpNext: 100,
    attributePoints: 0, attrSpent: {maxHp:0,maxMp:0,atk:0,matk:0,def:0,spd:0},
    eliteWeaponsBought: 0, activeTitle: null, activeFrameClass: null,
    maxHp: c.base.hp, hp: c.base.hp, maxMp: c.base.mp, mp: c.base.mp,
    atk: c.base.atk, matk: c.base.matk, def: c.base.def, spd: c.base.spd,
    moveIds: starterMoveIds,
    ultimateMove: null, ultimateBaseId: null,
    learnedIds: starterMoveIds, everLearnedIds: starterMoveIds, declinedMoveIds: [],
    activeQuest: null, savedAt: Date.now(),
  };
}

/** Arma el `player` plano de siempre juntando el documento de cuenta + el de un héroe — mismo
 *  objeto/campos que usa todo el motor de combate/misiones/tienda, sin cambios ahí. */
function rebuildPlayer(accountData, heroData){
  const c = CLASSES[heroData.classKey];
  function freshCopy(id){ const it = findItemById(id); return it ? {...it} : null; }
  function applyDurability(item, durData){
    if(item && durData){ item.durability = durData.durability; item.maxDurability = durData.maxDurability; item.material = durData.material; }
  }
  const invDur = accountData.inventoryDurability || [];
  const inventoryItems = (accountData.inventoryIds||[]).map((id,i)=>{
    const it = freshCopy(id);
    applyDurability(it, invDur[i]);
    return it;
  }).filter(Boolean);

  const equipment = resolveEquipmentForHero(heroData.classKey, heroData.level);

  player = {
    classKey: heroData.classKey,
    className: c.name,
    emoji: c.emoji,
    gender: heroData.gender || "m",
    name: accountData.name,
    friendCode: accountData.friendCode || genFriendCode(accountData.name),
    level: heroData.level, xp: heroData.xp, xpNext: heroData.xpNext,
    gold: accountData.gold, crystals: accountData.crystals||0, darkEssence: accountData.darkEssence||0,
    lastBossCrystalDay: accountData.lastBossCrystalDay || null,
    inventoryCapacityTier: accountData.inventoryCapacityTier||0,
    base: accountData.base || null, baseStorage: accountData.baseStorage || [], baseExtraSlots: accountData.baseExtraSlots||0, hasBase: accountData.hasBase||false, baseEverPlaced: accountData.baseEverPlaced||false,
    isBuilding: accountData.isBuilding||false, buildingLastCollectAt: accountData.buildingLastCollectAt||null,
    buildingUpgradeEndsAt: accountData.buildingUpgradeEndsAt||null,
    shadowWolfNightKey: accountData.shadowWolfNightKey||null, shadowWolfEscapes: accountData.shadowWolfEscapes||0,
    eliteWeaponsBought: heroData.eliteWeaponsBought||0,
    dynamicEntities: accountData.dynamicEntities||[],
    worldEvents: accountData.worldEvents||[], lastEventResolvedAt: accountData.lastEventResolvedAt||null,
    lastRegionId: accountData.lastRegionId||null,
    attributePoints: heroData.attributePoints||0,
    attrSpent: heroData.attrSpent || {maxHp:0,maxMp:0,atk:0,matk:0,def:0,spd:0},
    lastDailyBonus: accountData.lastDailyBonus || null,
    totalDistanceM: accountData.totalDistanceM || 0,
    medals: accountData.medals || [],
    zoneDistanceM: accountData.zoneDistanceM || {},
    parkWeaponsObtained: accountData.parkWeaponsObtained || [],
    parkGuardianState: accountData.parkGuardianState || {},
    visitedZones: accountData.visitedZones || [],
    pets: accountData.pets || [],
    everGotCaptureCard: accountData.everGotCaptureCard || false,
    redeemedCodes: accountData.redeemedCodes || [],
    coliseumStats: accountData.coliseumStats || null,
    ownedTowers: accountData.ownedTowers || null,
    dungeonProgress: accountData.dungeonProgress || {},
    activeDungeonRun: accountData.activeDungeonRun || null,
    dungeonPortalCooldowns: accountData.dungeonPortalCooldowns || {},
    activeTitle: heroData.activeTitle || null,
    activeFrameClass: heroData.activeFrameClass || null,
    wood: accountData.wood||0, stone: accountData.stone||0, iron: accountData.iron||0,
    craftMats: accountData.craftMats || {},
    pickaxe: accountData.pickaxe || null,
    seenBattleTutorial: accountData.seenBattleTutorial || false,
    maxHp: heroData.maxHp, hp: heroData.hp, maxMp: heroData.maxMp, mp: heroData.mp,
    atk: heroData.atk, matk: heroData.matk||0, def: heroData.def, spd: heroData.spd,
    growth: c.growth,
    movePool: c.movePool,
    moves: heroData.moveIds.map(id=> c.movePool.find(m=>m.id===id)).filter(Boolean),
    ultimateMove: heroData.ultimateMove || null,
    ultimateBaseId: heroData.ultimateBaseId || null,
    learnedIds: new Set(heroData.learnedIds),
    everLearnedIds: new Set(heroData.everLearnedIds || heroData.learnedIds),
    declinedMoveIds: new Set(heroData.declinedMoveIds || []),
    inventory: inventoryItems,
    equipment,
  };
  // sincroniza el flag de "ya se le aplicó la penalización de Dañado" con la realidad — las
  // estadísticas guardadas (atk/def/etc) ya reflejan esa penalización si corresponde, así que
  // acá solo se ajusta el flag, sin volver a llamar a applyBonuses.
  DURABILITY_SLOTS.forEach(slot=>{
    const it = player.equipment[slot];
    if(it && it.durability != null) it._damagedPenaltyApplied = isItemDamaged(it);
  });
}

/** Poder total (misma fórmula que ya usa la ficha de personaje, renderCharSheet) — reutilizado acá
 *  para las tarjetas de héroe de la pantalla de selección. */
function heroPowerScore(h){
  return Math.round((h.atk||0)*3 + (h.matk||0)*3 + (h.def||0)*3 + (h.spd||0)*2 + (h.maxHp||0)*0.5 + (h.maxMp||0)*0.5);
}
async function initContinueScreen(){
  const accountData = await loadAccount();
  $("btnBackToCharList").classList.add("hidden");
  if(!accountData){
    // Cuenta nueva — todavía no hay ni cuenta ni héroes: se pide nombre/género/clase inicial
    // (ver btnStart, que crea la cuenta con ESE primer héroe únicamente).
    takenClasses = new Set();
    $("continueArea").innerHTML = "";
    $("classTitle").textContent = "Elige tu clase";
    $("classTitle").classList.remove("hidden");
    $("classGrid").classList.remove("hidden");
    return;
  }
  equippedByHeroCache = accountData.equippedByHero || {};
  // Pedido explícito: solo se muestran los héroes que el jugador YA creó — no los 4 de una.
  const heroSlots = {};
  for(const key of Object.keys(CLASSES)){
    const h = await loadHero(key);
    if(h) heroSlots[key] = h;
  }
  takenClasses = new Set(Object.keys(heroSlots));
  const existingCount = takenClasses.size;
  const area = $("continueArea");

  // El banner ya trae "Bienvenido de nuevo" + subtítulo dibujados — el h1 de siempre se oculta.
  let html = `<img class="welcome-banner-img" src="${CHAR_SELECT_ART.welcomeBanner}" alt="Bienvenido de nuevo">`;
  html += `<div class="char-select-list">`;
  Object.entries(heroSlots).forEach(([key, data])=>{
    const c = CLASSES[key];
    const power = heroPowerScore(data);
    html += `
      <div class="continue-card big-continue-card cc-art-card cc-theme-${key}">
        <img class="cc-art-img" src="${CHAR_SELECT_ART.cards[key]}" alt="${c.name}">
        <div class="cc-art-name"><span>${accountData.name}</span></div>
        <div class="cc-art-meta">
          <span class="cc-art-class">${c.name}</span><span class="cc-art-dot">·</span><span class="cc-art-level">Nv. ${data.level}</span>
        </div>
        <div class="cc-art-hero-stats">
          <span class="stat-chip">⚔️ Poder ${power}</span>
          <span class="stat-chip">❤️ ${Math.round(data.maxHp)}</span>
          <span class="stat-chip">💥 ${Math.round(data.atk)}</span>
          <span class="stat-chip">🛡️ ${Math.round(data.def)}</span>
        </div>
        <button class="cc-art-btn btn-continue-char" data-classkey="${key}">Seleccionar</button>
        <button class="cc-art-trash btn-delete-char" data-classkey="${key}" title="Eliminar personaje" aria-label="Eliminar personaje"></button>
      </div>`;
  });
  html += `</div>`;
  if(existingCount < 4){
    html += `
      <button class="new-character-card-art" id="btnNewCharacter">
        <img class="ncc-art-img" src="${CHAR_SELECT_ART.newCharacterBanner}" alt="Crear un nuevo personaje">
      </button>`;
  }
  area.innerHTML = html;
  $("classTitle").textContent = "Bienvenido de nuevo";
  $("classTitle").classList.add("hidden");
  $("classGrid").classList.add("hidden");
  $("classSubText").classList.add("hidden");
  $("genderSection").classList.add("hidden");
  $("nameInput").classList.add("hidden");
  $("btnStart").classList.add("hidden");

  area.querySelectorAll(".btn-continue-char").forEach(btn=>{
    btn.onclick = async ()=>{
      showMapLoadingScreen();
      const key = btn.dataset.classkey;
      const heroData = heroSlots[key];
      bossLootRegistry = accountData.bossLootRegistry || {};
      activeQuest = heroData.activeQuest || null;
      rebuildPlayer(accountData, heroData);
      $("classOverlay").classList.add("hidden");
      $("hudIconEmoji").textContent = player.emoji;
      updateNotifBell();
      refreshHud();
      teardownMapIfExists();
      setupBuilderModeUI();
      setupDungeonCodexUI();
      const _mapLoadGen = mapLoadingGen;
      initMap(accountData.lastPos);
      armMapLoadingHide(_mapLoadGen);
      // el marcador del jugador (meMarker) recién existe DESPUÉS de initMap() — refreshHud() de
      // arriba corrió antes, así que el aura del Legado (y cualquier otra cosa que dependa del
      // marcador) se quedaba sin aplicar al continuar una partida existente hasta la siguiente
      // mutación de stats. Se repite acá para que un jugador que YA tiene el set completo vea su
      // aura desde el primer momento al continuar, no recién cuando algo más dispare refreshHud().
      refreshHud();
      if(activeQuest && !activeQuest.itemObtained) drawQuestRoute();
      renderQuestTracker();
      checkDailyBonus();
      await dailyMissionsService.init();
      gameEventBus.emit({ type: "CHARACTER_SELECTED", payload: { amount: 1 }, dedupeKey: key });
      updateDailyMissionsButton();
      await adventurerContractsService.init();
      updateContractButton();
      syncContractTurnInMarker();
      // si cerraste la app a mitad de una corrida de mazmorra, al volver retoma el MISMO piso
      // (la secuencia de eventos ya sorteada vive en player.activeDungeonRun) en vez de perderla.
      if(player.activeDungeonRun){
        const dungeon = getDungeonDef(player.activeDungeonRun.dungeonId);
        if(dungeon){ toast(`${dungeon.portalEmoji} Retomas tu incursión en ${dungeon.name}…`, 3400); startDungeonFloor(); }
        else player.activeDungeonRun = null;
      }
    };
  });
  area.querySelectorAll(".btn-delete-char").forEach(btn=>{
    btn.onclick = (e)=>{
      e.stopPropagation();
      const key = btn.dataset.classkey;
      confirmDeleteCharacter(key, CLASSES[key].name);
    };
  });
  if(existingCount < 4){
    $("btnNewCharacter").onclick = ()=>{
      $("classTitle").textContent = "Elige tu clase";
      $("classTitle").classList.remove("hidden");
      area.innerHTML = "";
      $("classGrid").classList.remove("hidden");
      $("classSubText").classList.remove("hidden");
      $("genderSection").classList.remove("hidden");
      $("nameInput").classList.remove("hidden");
      $("btnStart").classList.remove("hidden");
      $("btnBackToCharList").classList.remove("hidden");
      buildClassGrid();
      // El nombre es de la CUENTA, no de cada héroe — si ya hay cuenta creada, se reutiliza y no
      // se puede cambiar al agregar otro héroe.
      $("nameInput").value = accountData.name;
      $("nameInput").readOnly = true;
      $("nameInput").title = "Tu nombre de jugador ya está definido.";
      updateStartBtn();
    };
  }
}
$("btnBackToCharList").onclick = ()=> initContinueScreen();

/** Borra por completo el héroe de esa clase (pide confirmación antes) — vuelve a estar disponible
 *  para crear de nuevo desde cero. El resto de la cuenta (oro, materiales, inventario, mascotas,
 *  progreso del mapa) NO se toca, es compartido con los demás héroes. El equipo que tenía puesto
 *  vuelve al inventario compartido antes de borrarlo, para no perderlo (mismo criterio que
 *  equipItem() ya usa al reemplazar un objeto puesto por otro). */
async function deleteCharacterSlot(classKey){
  if(!AppStorage) return;
  try{
    const accountData = await loadAccount();
    if(accountData){
      const eq = (accountData.equippedByHero||{})[classKey] || {};
      accountData.inventoryIds = accountData.inventoryIds || [];
      accountData.inventoryDurability = accountData.inventoryDurability || [];
      const returnToInventory = (inst)=>{
        if(!inst || !inst.id) return;
        accountData.inventoryIds.push(inst.id);
        accountData.inventoryDurability.push(inst.durability || null);
      };
      ["weapon","offhand","armor","helmet","boots"].forEach(slot=> returnToInventory(eq[slot]));
      (eq.accessory||[]).forEach(returnToInventory);
      delete accountData.equippedByHero[classKey];
      equippedByHeroCache = accountData.equippedByHero;
      await AppStorage.set('player_account', JSON.stringify(accountData), false);
    }
    await AppStorage.delete('player_'+classKey, false);
  }catch(e){ /* ya no existía */ }
}
function confirmDeleteCharacter(classKey, charName){
  $("deleteCharSub").textContent = `Vas a eliminar a tu ${CLASSES[classKey].name} para siempre — pierde su nivel, habilidades y misión activa. El equipo que tenía puesto vuelve a tu inventario compartido. Tu oro, materiales, inventario y mascotas (compartidos entre tus héroes) NO se pierden. Esta acción no se puede deshacer.`;
  $("deleteCharOverlay").classList.remove("hidden");
  $("btnConfirmDeleteChar").onclick = async ()=>{
    await deleteCharacterSlot(classKey);
    $("deleteCharOverlay").classList.add("hidden");
    toast(`🗑️ Tu ${CLASSES[classKey].name} fue eliminado.`);
    initContinueScreen();
  };
  $("btnCancelDeleteChar").onclick = ()=> $("deleteCharOverlay").classList.add("hidden");
}

/* ============================================================
   2. MAPA Y GEOLOCALIZACIÓN
   ============================================================ */
/** Pinta las 5 zonas de Neiva como círculos de color translúcido con su nombre. */
function drawNeivaZones(){
  NEIVA_ZONES.forEach(z=>{
    L.circle([z.center.lat, z.center.lng], {
      radius: z.radius, color: z.color, weight: 2.5, fillColor: z.color, fillOpacity: 0.07, opacity: 0.5,
      dashArray: "1,7", interactive: false
    }).addTo(map);
    L.marker([z.center.lat, z.center.lng], {
      icon: L.divIcon({className:'', html:`<div class="zone-label-wrap">
          <div class="zone-label" style="color:${z.color}; border-color:${z.color};">${z.name}</div>
          <div class="zone-label-arrow" style="border-top-color:${z.color};"></div>
          <div class="zone-label-stem"></div>
        </div>`,
        iconSize:[10,74], iconAnchor:[5,74]}), // ancla al final del "tallo" invisible, bien lejos del punto real
      interactive:false
    }).addTo(map);
  });
  drawDangerBlocks();
}

/** Dibuja la zona peligrosa de hoy de cada región — el polígono de su manzana real si ya llegó, o
 *  su rectángulo de respaldo mientras tanto, con su propia insignia pulsante. Para el rectángulo de
 *  respaldo específicamente, le pregunta al mapa si hay una calle cargada cerca del centro
 *  (roadBearingSegmentNear, Capa MapLibre) y, si la encuentra, lo rota para alinearse con ella — un
 *  refuerzo aparte de la consulta real a OpenStreetMap, útil mientras esa consulta todavía no
 *  termina o si falla del todo. Un dict por clave de zona (no un array plano) para poder actualizar
 *  UNA sola zona en el lugar cuando su manzana real llega, sin tener que rehacer todo el mapa. */
let dangerBlockLayers = {}; // key -> {poly, marker, debugLayers:[...]}
function clearDangerBlockLayer(key){
  const existing = dangerBlockLayers[key];
  if(!existing) return;
  if(existing.poly) map.removeLayer(existing.poly);
  if(existing.marker) map.removeLayer(existing.marker);
  (existing.debugLayers||[]).forEach(l=> map.removeLayer(l));
  delete dangerBlockLayers[key];
}
/** Dibuja (o vuelve a dibujar) UNA sola zona — llamada tanto por drawDangerBlocks() al inicio como
 *  por regenerateDangerZoneBlock() cuando la manzana real reemplaza al rectángulo de respaldo. */
function updateSingleDangerBlockLayer(b){
  clearDangerBlockLayer(b.key);
  let polygonFeature = b.polygon;
  if(b.generationMode === DANGER_ZONE_GENERATION_MODE.ROAD_ALIGNED_FALLBACK){
    const seg = map.roadBearingSegmentNear ? map.roadBearingSegmentNear(b.center, 45) : null;
    if(seg){
      b.bearing = bearingBetween(seg.a, seg.b) % 180; // el rectángulo es simétrico a 180°, ese rango alcanza
      const corners = rotatedRectCorners(b.center, DANGER_BLOCK_HALF_WIDTH_M, DANGER_BLOCK_HALF_HEIGHT_M, b.bearing);
      polygonFeature = pointsToPolygonFeature(corners);
      b.polygon = polygonFeature; // el chequeo de "¿está adentro?" usa este mismo polígono ya rotado
    }
  }
  const poly = L.geoJSON(polygonFeature, {
    color:"#ff3b3b", weight:3, fillColor:"#ff3b3b", fillOpacity:0.18, opacity:0.85,
    dashArray:"6,5", interactive:false
  }).addTo(map);
  // Para el jugador normal: SOLO el área roja, sin ninguna insignia/texto encima (pedido
  // explícito). En Modo Constructor, además se pone un botoncito chico de basurero — tocarlo
  // quita esta zona (sea manual o auto-generada) hasta que se trace una nueva a mano.
  let marker = null;
  if(builderModeOn){
    marker = L.marker([b.center.lat, b.center.lng], {
      icon: L.divIcon({className:'', html:`<div class="danger-zone-remove-btn">🗑️</div>`, iconSize:[26,26], iconAnchor:[13,13]}),
      interactive:true
    }).addTo(map);
    marker.setClickHandler(()=> disableDangerZoneOverride(b.key, b.name));
    // si el marcador se (re)crea en medio de un trazo en curso (p.ej. llega la manzana real de
    // OSM y regenerateDangerZoneBlock redibuja esta zona), respeta el mismo "modo no interactivo"
    // que ya le puso setBuilderMarkersInteractive(false) a los demás — si no, este marcador nuevo
    // nace clickeable y reintroduce el mismo bug para el resto del trazo.
    if(dangerZoneDraw){
      const el = marker.getElement && marker.getElement();
      if(el) el.style.pointerEvents = "none";
    }
  }
  const debugLayers = dangerZoneDebugEnabled() ? drawDangerZoneDebugLayers(b) : [];
  dangerBlockLayers[b.key] = { poly, marker, debugLayers };
}
/** Capas de depuración visual (window.DANGER_ZONE_DEBUG = true): calles usadas por el
 *  normalizador (azul), polígonos candidatos ANTES del filtrado (gris punteado), y las manzanas
 *  seleccionadas para armar la zona (verde) — además del polígono final, que ya se pinta rojo por
 *  updateSingleDangerBlockLayer(). Pedido explícito del punto 20. */
function drawDangerZoneDebugLayers(b){
  const layers = b.debugData;
  if(!layers) return [];
  const out = [];
  (layers.lines||[]).forEach(line=>{
    out.push(L.geoJSON(line, {color:"#4aa3e0", weight:2, opacity:0.7}).addTo(map));
  });
  (layers.candidates||[]).forEach(poly=>{
    out.push(L.geoJSON(poly, {color:"#999", weight:1, fillOpacity:0.03, opacity:0.5, dashArray:"2,4"}).addTo(map));
  });
  (layers.selected||[]).forEach(poly=>{
    out.push(L.geoJSON(poly, {color:"#4ecb71", weight:2, fillOpacity:0, opacity:0.9}).addTo(map));
  });
  return out;
}
function drawDangerBlocks(){
  Object.keys(dangerBlockLayers).forEach(clearDangerBlockLayer);
  dangerBlocksToday.forEach(updateSingleDangerBlockLayer);
}

/** Coloca los marcadores fijos de los parques (guardianes únicos + arma exclusiva). */
let parkMarkers = {};   // parkId -> marcador de Leaflet
let parkRevealed = {};  // parkId -> si ya se reveló el guardián (por cercanía)

function buildParkIcon(p, revealed){
  if(revealed){
    return L.divIcon({className:'', html:`<div class="park-marker revealed" style="border-color:${p.auraColor}; box-shadow:0 0 16px ${p.auraColor}aa, 0 0 4px ${p.auraColor};">${p.guardianEmoji}<span class="park-badge">🌳</span></div>`,
      iconSize:[44,44], iconAnchor:[22,22]});
  }
  return L.divIcon({className:'', html:`<div class="park-marker">🌳<span class="park-badge">${p.guardianEmoji}</span></div>`,
    iconSize:[36,36], iconAnchor:[18,18]});
}

function drawNeivaParks(){
  NEIVA_PARKS.forEach(p=>{
    const marker = L.marker([p.lat, p.lng], {icon: buildParkIcon(p, false)}).addTo(map);
    marker.on('click', ()=> openParkModal(p));
    parkMarkers[p.id] = marker;
    parkRevealed[p.id] = false;
  });
}

/** Fogatas de curación repartidas por el mapa: se ven con un anillo pulsante mostrando su alcance,
 *  y si te quedas dentro un momento, te van curando poco a poco. */
let campfireMarkers = {};
let campfireHealTimer = null;
function drawCampfires(){
  campfireMarkers = {};
  CAMPFIRES.forEach(f=> drawSingleCampfireMarker(f));
}
function drawSingleCampfireMarker(f){
  const icon = L.divIcon({className:'', html:`<div class="campfire-marker">
      <div class="ring-tilt-wrap-center"><div class="campfire-range-ring" style="width:${f.healRadius*2}px; height:${f.healRadius*2}px; margin-left:-${f.healRadius}px; margin-top:-${f.healRadius}px;"></div></div>
      <div class="campfire-flame">🔥</div>
    </div>`, iconSize:[f.healRadius*2, f.healRadius*2], iconAnchor:[f.healRadius, f.healRadius]});
  const marker = L.marker([f.lat, f.lng], {icon, zIndexOffset:-100}).addTo(map);
  campfireMarkers[f.id] = marker;
}
/** Revisa si el jugador está cerca de alguna fogata, y si es así, lo cura un poquito cada pocos
 *  segundos mientras se quede ahí (no cura de golpe, para que sea un lugar donde conviene quedarse
 *  un momento, no solo pasar de largo). */
function updateCampfireProximity(){
  if(!playerLatLng || !player) return;
  const nearFire = CAMPFIRES.find(f=> distMeters(playerLatLng, f) <= f.healRadius);
  const el = $("campfireHealBadge");
  if(nearFire && player.hp < player.maxHp){
    if(el){ el.classList.remove("hidden"); el.textContent = "🔥 Curándote junto a la fogata..."; }
    if(!campfireHealTimer){
      gameEventBus.emit({ type: "CAMPFIRE_USED", payload: { amount: 1 } });
      campfireHealTimer = setInterval(()=>{
        if(!playerLatLng) return;
        const stillNear = CAMPFIRES.some(f=> distMeters(playerLatLng, f) <= f.healRadius);
        if(!stillNear || !player || player.hp >= player.maxHp){
          clearInterval(campfireHealTimer); campfireHealTimer = null;
          if(el) el.classList.add("hidden");
          return;
        }
        player.hp = Math.min(player.maxHp, Math.round(player.hp + player.maxHp*0.02));
        refreshHud();
      }, 3000);
    }
  } else if(el){
    el.classList.add("hidden");
  }
}

/* ============================================================
   TORRES DE CONTROL — puntos fijos del mapa que cualquier jugador puede capturar
   venciendo a quien las tenga ahora (o a su guardián, si están libres). Mientras
   sea tuya, genera oro cada hora. El estado de quién es dueño se comparte entre
   todos los jugadores vía PubNub, igual que el ranking del Coliseo.
   ============================================================ */
const PN_TOWERS_CHANNEL = "ronda-gps-rpg-towers-v1";
let towerMarkers = {};
let towerOwnership = {}; // towerId -> {ownerId, ownerName, ownerStats, capturedAt} (cache local, se llena al consultar)
let currentTowerModal = null;

function drawTowers(){
  towerMarkers = {};
  TOWERS.filter(t=> t.landmark).forEach(t=> drawSingleTowerMarker(t)); // las "landmark" se ven siempre, de inmediato
  restoreOwnTowerOwnership();
  fetchTowerOwnership();
  setTimeout(refreshAllTowerVisuals, 50); // deja que restoreOwnTowerOwnership ya haya llenado towerOwnership
  setTimeout(refreshAllTowerVisuals, 1800); // y de nuevo un poco despues, cuando fetchTowerOwnership (red) ya respondio
}
function drawSingleTowerMarker(t){
  const icon = L.divIcon({className:'', html:`<div class="tower-marker" id="towerMarkerInner-${t.id}"><div class="tower-owned-light"></div>🗼</div>`, iconSize:[50,54], iconAnchor:[25,50]});
  const marker = L.marker([t.lat, t.lng], {icon, zIndexOffset:-50}).addTo(map);
  marker.on('click', ()=> openTowerModal(t));
  towerMarkers[t.id] = marker;
}

/** Actualiza el ícono de CADA torre para que se vea distinta si ya tiene dueño (una lucecita
 *  arriba) — se llama después de consultar quién las tiene, y también justo al capturar una. */
function refreshAllTowerVisuals(){
  TOWERS.forEach(t=> updateTowerMarkerVisual(t.id));
}
function updateTowerMarkerVisual(towerId){
  const el = document.getElementById("towerMarkerInner-"+towerId);
  if(!el) return;
  el.classList.toggle("tower-owned", !!towerOwnership[towerId]);
}

/** Antes de consultar por la red, restaura de tu propio guardado las torres que YA sabes que
 *  capturaste — así, aunque la conexión con otros jugadores falle, tú siempre ves bien las tuyas. */
function restoreOwnTowerOwnership(){
  if(!player.ownedTowers) return;
  Object.keys(player.ownedTowers).forEach(towerId=>{
    const saved = player.ownedTowers[towerId];
    if(saved && saved.record) towerOwnership[towerId] = saved.record;
  });
}

/** Trae quién es el dueño actual de cada torre (la marca más reciente de cada una en el historial
 *  compartido). Si no hay conexión, las torres simplemente se muestran como "libres" por ahora. */
function fetchTowerOwnership(){
  if(!pubnub) return;
  pubnub.fetchMessages({channels:[PN_TOWERS_CHANNEL], count:100}).then(res=>{
    const items = (res.channels && res.channels[PN_TOWERS_CHANNEL]) || [];
    items.forEach(item=>{
      const m = item.message;
      if(!m || m.type!=="tower_capture") return;
      const prev = towerOwnership[m.towerId];
      if(!prev || m.capturedAt > prev.capturedAt) towerOwnership[m.towerId] = m;
    });
    Object.values(towerMarkers).forEach(mk=>{});
  }).catch(e=> console.warn("[TORRES] no se pudo consultar quién las tiene:", e));
}

function openTowerModal(tower){
  currentTowerModal = tower;
  const owner = towerOwnership[tower.id];
  $("towerName").textContent = tower.name;
  if(!owner){
    $("towerOwnerLine").innerHTML = `🛡️ Sin dueño — la protege un guardián.`;
  } else if(owner.ownerId === myPlayerId){
    $("towerOwnerLine").innerHTML = `👑 Es tuya desde hace un tiempo. ¡Sigue generando oro!`;
  } else {
    $("towerOwnerLine").innerHTML = `⚔️ Pertenece a <b>${escapeHtml(owner.ownerName)}</b> (Nv.${owner.ownerStats?.level||"?"}).`;
  }
  $("btnTowerChallenge").textContent = (owner && owner.ownerId===myPlayerId) ? "Ya es tuya" : "⚔️ Retar por la torre";
  $("btnTowerChallenge").disabled = !!(owner && owner.ownerId===myPlayerId);
  $("towerOverlay").classList.remove("hidden");
}
$("btnTowerClose").onclick = ()=> $("towerOverlay").classList.add("hidden");

$("btnTowerChallenge").onclick = ()=>{
  if(!currentTowerModal) return;
  if(isBusyWithBattle()){ toast("Termina lo que estás haciendo antes de retar una torre."); return; }
  $("towerOverlay").classList.add("hidden");
  startTowerChallenge(currentTowerModal);
};

/** Arma al rival de la torre: si está libre, un guardián (un jefe cualquiera a buen nivel); si
 *  tiene dueño, una "copia" armada con las estadísticas que tenía ese jugador al capturarla —
 *  no es la persona real jugando en vivo, es más como enfrentar su huella dejada en la torre. */
function startTowerChallenge(tower){
  const owner = towerOwnership[tower.id];
  const pos = playerLatLng || {lat:0,lng:0};
  let mon;
  if(!owner){
    const tpl = BOSS_TEMPLATES[Math.floor(Math.random()*BOSS_TEMPLATES.length)];
    const level = Math.max(5, player.level + 3);
    mon = makeMonster(tpl, level, pos, {boss:true, special:true});
  } else {
    const s = owner.ownerStats || {};
    mon = {
      id:"tower_rival_"+tower.id, tpl:{name:escapeHtml(owner.ownerName)+" (torre)", emoji:"🗼", aggressive:true}, level: s.level||player.level,
      hp: s.maxHp||200, maxHp: s.maxHp||200, atk: s.atk||20, def: s.def||15, spd: s.spd||10,
      marker:null, packBonus:1, isBoss:true, isTowerRival:true,
    };
  }
  if(mon.marker){ map.removeLayer(mon.marker); mon.marker = null; }
  startBattle(mon, {isTowerChallenge:tower.id});
  logBattle(owner ? `⚔️ ¡Te enfrentas a la marca que ${owner.ownerName} dejó en la torre!` : "🛡️ ¡El guardián de la torre te enfrenta!", true);
}

/** Al ganar el reto, la torre pasa a ser tuya: se publica tu marca (con tus estadísticas actuales)
 *  al historial compartido, y se guarda localmente para poder cobrar el oro cada hora. */
function captureTower(towerId){
  const tower = TOWERS.find(t=>t.id===towerId);
  if(!tower) return;
  const record = {
    type:"tower_capture", towerId, ownerId: myPlayerId, ownerName: player.name,
    ownerStats: {level:player.level, atk:player.atk, matk:player.matk||0, def:player.def, spd:player.spd, maxHp:player.maxHp, classKey:player.classKey},
    capturedAt: Date.now(),
  };
  towerOwnership[towerId] = record;
  updateTowerMarkerVisual(towerId);
  if(pubnub){
    pubnub.publish({channel: PN_TOWERS_CHANNEL, storeInHistory:true, message: record})
      .catch(e=> console.warn("[TORRES] no se pudo publicar la captura:", e));
  }
  if(!player.ownedTowers) player.ownedTowers = {};
  // se guarda la marca COMPLETA (no solo el oro) — así, aunque la conexión con otros jugadores
  // falle, TÚ siempre vas a ver bien que la torre es tuya la próxima vez que entres.
  player.ownedTowers[towerId] = {goldPerHour: tower.goldPerHour, lastCollectAt: Date.now(), record};
  gameEventBus.emit({ type: "TOWER_COMPLETED", payload: { amount: 1 }, dedupeKey: towerId });
  toast(`🗼 ¡La ${tower.name} ahora es tuya! Generará 💰${tower.goldPerHour} oro cada hora.`, 4500);
  saveGame();
}

/** Revisa tus torres cada vez que se llama (al iniciar sesión, o cada cierto tiempo) y te da el oro
 *  acumulado desde la última vez que lo cobraste — no hace falta estar ahí en persona esperando. */
function collectTowerGold(){
  if(!player || !player.ownedTowers) return;
  let totalGold = 0;
  Object.keys(player.ownedTowers).forEach(towerId=>{
    const rec = player.ownedTowers[towerId];
    const hoursPassed = (Date.now() - rec.lastCollectAt) / 3600000;
    if(hoursPassed >= 1){
      const gold = Math.floor(hoursPassed) * (rec.goldPerHour||50);
      totalGold += gold;
      rec.lastCollectAt += Math.floor(hoursPassed) * 3600000;
    }
  });
  if(totalGold > 0){
    player.gold += totalGold;
    gameEventBus.emit({ type: "GOLD_EARNED", payload: { amount: totalGold } });
    toast(`🗼 Tus torres generaron 💰${totalGold} oro mientras no jugabas.`, 4500);
    refreshHud(); saveGame();
  }
}

/** Puntos de mejora de equipo (⚒️), en parques y centros comerciales — reemplazan la mejora del menú
 *  de Equipo. Pedido explícito: ya no se dibujan todos de una — solo aparecen por cercanía (ver
 *  updateMediumVisibility), igual que un santuario o una fogata. */
let upgradeMarkers = {};
function drawSingleUpgradeMarker(u){
  const marker = L.marker([u.lat, u.lng], {icon: L.divIcon({className:'', html:`<div class="upgrade-station-marker">⚒️</div>`, iconSize:[34,34], iconAnchor:[17,17]})}).addTo(map);
  marker.on('click', ()=> openUpgradeStationModal(u));
  upgradeMarkers[u.id] = marker;
}

/** Cuando te acercas a un parque, su marcador se agranda y muestra el aura del guardián. */
function updateParkProximity(){
  if(!playerLatLng) return;
  NEIVA_PARKS.forEach(p=>{
    const d = distMeters(playerLatLng, p);
    const shouldReveal = d <= 200;
    if(shouldReveal !== parkRevealed[p.id]){
      parkRevealed[p.id] = shouldReveal;
      const marker = parkMarkers[p.id];
      if(marker) marker.setIcon(buildParkIcon(p, shouldReveal));
      if(shouldReveal) toast(`${p.guardianEmoji} ¡Sientes cerca la presencia de ${p.guardianName}!`, 3200);
    }
  });
}

// Se incrementa cada vez que se muestra la pantalla de carga — permite que hideMapLoadingScreen()
// (llamada desde un callback async de whenTilesLoaded, o desde el timer de seguridad) ignore un
// llamado "viejo" si mientras tanto se arrancó OTRO initMap() (por ejemplo, el jugador vuelve al
// menú y elige otro personaje antes de que el primer mapa terminara de cargar).
let mapLoadingGen = 0;
let mapLoadingStepTimer = null;

/** Los "pasos" que se muestran en el checklist de la pantalla de carga — no son un progreso medido
 *  de verdad paso a paso (initMap() no expone ganchos tan finos como para saber exactamente cuándo
 *  terminó cada cosa), sino una secuencia con temporizador que acompaña visualmente lo que de
 *  verdad está pasando por debajo, en el mismo orden en que initMap() realmente lo hace: se detecta
 *  la ciudad, se dibujan zonas/parques/torres, se pueblan monstruos, el personaje queda listo, se
 *  generan cofres, y por último el mapa termina de asentarse. */
const MAP_LOADING_STEPS = [
  {icon:"📍", text:"Descubriendo tu ubicación...", color:"#7be08a"},
  {icon:"🏯", text:"Cargando aldeas...", color:"#6db4f2"},
  {icon:"💀", text:"Despertando criaturas...", color:"#c98bf0"},
  {icon:"⚔️", text:"Preparando héroes...", color:"#ef7d5d"},
  {icon:"🧰", text:"Escondiendo tesoros...", color:"#e8c468"},
  {icon:"✨", text:"Casi listo...", color:"#e8c468"},
];
const MAP_LOADING_STEP_MS = 550; // cuánto se muestra cada paso activo antes de pasar al siguiente

function renderMapLoadingSteps(){
  const el = $("mapLoadingSteps");
  if(!el) return;
  el.innerHTML = MAP_LOADING_STEPS.map((s,i)=>
    `<div class="map-loading-step" data-step="${i}" style="color:${s.color}"><span class="mls-icon">${s.icon}</span><span>${s.text}</span></div>`
  ).join("");
}

function setActiveMapLoadingStep(idx){
  const el = $("mapLoadingSteps");
  if(!el) return;
  el.querySelectorAll(".map-loading-step").forEach(row=>{
    const i = +row.dataset.step;
    row.classList.toggle("done", i < idx);
    row.classList.toggle("active", i === idx);
  });
}

/** Avanza el checklist un paso por vez cada MAP_LOADING_STEP_MS — se detiene sola en el último paso
 *  ("Casi listo...") si el mapa de verdad tarda más que la secuencia entera; hideMapLoadingScreen()
 *  corta el temporizador apenas el mapa está listo, así que no sigue corriendo de fondo sin sentido. */
function startMapLoadingSteps(){
  clearInterval(mapLoadingStepTimer);
  let idx = 0;
  setActiveMapLoadingStep(0);
  mapLoadingStepTimer = setInterval(()=>{
    idx++;
    if(idx >= MAP_LOADING_STEPS.length){ clearInterval(mapLoadingStepTimer); return; }
    setActiveMapLoadingStep(idx);
  }, MAP_LOADING_STEP_MS);
}

/** Muestra la pantalla de carga a pantalla completa — se llama ANTES de ocultar classOverlay, en
 *  cada lugar que arranca o continúa una partida, para que nunca se vea el mapa vacío/a medio
 *  dibujar debajo mientras carga su estilo real, sus mosaicos y todo lo que dibuja initMap()
 *  (zonas, parques, torres, monstruos...). Ver hideMapLoadingScreen. */
function showMapLoadingScreen(){
  mapLoadingGen++;
  const el = $("mapLoadingOverlay");
  if(!el) return;
  el.classList.remove("hidden", "fading-out");
  renderMapLoadingSteps();
  startMapLoadingSteps();
}

/** Oculta la pantalla de carga con un fundido corto — se llama desde map.whenTilesLoaded() en
 *  cuanto el mapa terminó de cargar de verdad, y también desde un timer de seguridad (ver
 *  MAP_LOADING_SAFETY_MS) por si algo tarda más de lo esperado (red lenta, falla al cargar el
 *  estilo) — nunca debe dejar al jugador atascado mirando la pantalla de carga para siempre. */
function hideMapLoadingScreen(gen){
  if(gen !== mapLoadingGen) return; // un initMap() más nuevo ya tomó el control, este callback quedó viejo
  const el = $("mapLoadingOverlay");
  if(!el || el.classList.contains("hidden")) return;
  el.classList.add("fading-out");
  clearInterval(mapLoadingStepTimer);
  setTimeout(()=>{
    if(gen !== mapLoadingGen) return;
    el.classList.add("hidden");
  }, 350);
}

const MAP_LOADING_SAFETY_MS = 9000;

/** Engancha el ocultado de la pantalla de carga al mapa recién creado — se llama justo después de
 *  cada initMap(). `gen` es el número de generación tomado ANTES de llamar a initMap(), para que el
 *  timer de seguridad y el callback de whenTilesLoaded se refieran los dos al mismo mapa. */
function armMapLoadingHide(gen){
  if(map && map.whenTilesLoaded) map.whenTilesLoaded(()=> hideMapLoadingScreen(gen));
  setTimeout(()=> hideMapLoadingScreen(gen), MAP_LOADING_SAFETY_MS);
}

/** Destruye el mapa de Leaflet si ya existe uno activo — hace falta antes de llamar a initMap() de nuevo
 *  (por ejemplo, al volver al menú y luego continuar/crear otro personaje), si no, Leaflet tira un error
 *  porque el div #map "ya está inicializado". */
function teardownMapIfExists(){
  if(typeof map !== "undefined" && map && map.remove){
    try{ map.remove(); }catch(e){ /* ya estaba destruido */ }
  }
  map = null;
  meMarker = null;
  meRing = null;
  meMagicCircle = null;
  // El remove() de arriba ya destruyó el canvas/WebGL/DOM del mapa viejo entero — cualquier
  // marcador o capa que este juego seguía referenciando por su cuenta (torres, fogatas, zonas
  // peligrosas, monstruos activos, etc.) ahora apunta a algo que ya no existe. Antes esto nunca
  // pasaba porque map.remove() era un no-op silencioso (MapShim no tenía ese método) y el mapa
  // viejo se quedaba vivo y huérfano en el DOM — que era justo el bug de "el personaje anterior
  // se queda pegado en el mapa" al cambiar de personaje. Ahora que el teardown SÍ destruye el mapa
  // de verdad, hace falta vaciar estas listas también — si no, el próximo initMap() (con la ciudad
  // recién vuelta a cargar) intenta "quitar" marcadores de un mapa ya destruido y explota (ver
  // clearDangerBlockLayer/drawDangerBlocks llamado desde refreshMapEditableLayers).
  dangerBlockLayers = {};
  parkMarkers = {};
  campfireMarkers = {};
  towerMarkers = {};
  upgradeMarkers = {};
  chestMarkers = {};
  resourceNodeMarkers = {};
  shrineMarkers = {};
  coliseoMarker = null;
  baseMarkers = {};
  previewBaseMarker = null;
  dynamicEntityMarkers = {};
  worldEventMarkers = {};
  dungeonPortalMarkers = {};
  nearbyPlayerMarkers = {};
  monsters = []; // sus .marker también vivían en el mapa viejo — se vuelven a poblar solos al jugar
  // Leaflet a veces deja marcado el contenedor como "ya inicializado" aunque se haya llamado a remove():
  // hay que limpiar esa marca a mano para poder crear un mapa nuevo sobre el mismo div sin que truene.
  const container = document.getElementById("map");
  if(container && container._leaflet_id) delete container._leaflet_id;
}
/** El zoom "normal"/por defecto del juego. Se usa al iniciar el mapa, al tocar el botón de
 *  centrar, y para decidir a qué distancia los enemigos empiezan a achicarse. */
const DEFAULT_ZOOM = 18.50;
/** Qué tan cerca hay que estar de algo para poder interactuar (pelear, hablar, etc.) — el aro
 *  alrededor del jugador se dibuja exactamente a este radio real, para que sea consistente con
 *  lo que en verdad se puede alcanzar (antes el aro era solo decorativo y no coincidía). */
const ENGAGE_RANGE_M = 100;
/** Recolectar madera/piedra/hierro usa un radio más chico que ENGAGE_RANGE_M: debe coincidir con
 *  el círculo mágico dibujado bajo el jugador (updateMagicCircleScale, ENGAGE_RANGE_M *
 *  ENGAGE_RING_VISUAL_SCALE ≈ 60m de radio), que es el único indicador visual de "proximidad" que
 *  el jugador ve en pantalla. Si se usara ENGAGE_RANGE_M acá, se podrían talar árboles/rocas que
 *  se ven claramente fuera de ese círculo. Valor fijo (no referencia ENGAGE_RING_VISUAL_SCALE,
 *  definida más abajo en el archivo) para evitar problemas de orden de inicialización. */
const RESOURCE_GATHER_RANGE_M = 60;
/** El GPS real hace jitter (saltos momentáneos de precisión, típicos en celular) y `playerLatLng`
 *  se aplica siempre crudo, sin suavizar (ver onGpsSuccess/movePlayerTo) — por eso la recolección
 *  activa NUNCA debe cancelarse por una sola lectura fuera de rango: necesita un margen extra sobre
 *  RESOURCE_GATHER_RANGE_M (para absorber el error típico de precisión) Y confirmarlo en varias
 *  lecturas de posición reales seguidas (no relecturas del mismo dato viejo) antes de cancelar.
 *  Mismo criterio que el colchón de histéresis ya usado en visibility.js (Mapa Vivo, Capa 5) para
 *  no "parpadear" justo en el borde. Ver checkActiveGatherProximity(), llamado desde movePlayerTo. */
const GATHER_CANCEL_RANGE_M = RESOURCE_GATHER_RANGE_M + 25;
const GATHER_CANCEL_STRIKES = 3;
// Pedido explícito: ya no se recuerda el zoom entre sesiones — cada vez que se entra al juego (personaje
// nuevo, continuar, o cambiar de personaje) arranca con una vista más alejada y se anima con un
// zoom-in hasta DEFAULT_ZOOM en cuanto el mapa terminó de cargar, en vez de saltar directo ahí.
const MAP_ENTRY_ZOOM = DEFAULT_ZOOM - 4;
const MAP_ENTRY_ZOOM_ANIM_MS = 1600;

/** Tamaño NOMINAL (de anclaje) del marcador del círculo mágico — no es su tamaño visual real (ese
 *  lo controla --magic-circle-px vía updateMagicCircleScale, más abajo, y puede ser mucho más
 *  grande). Solo hace falta un valor fijo acá para que MapLibre calcule el punto de anclaje del
 *  marcador (su centro); .magic-circle-wrap se centra sobre ESE punto sin importar cuánto crezca
 *  (ver position:absolute + translate(-50%,-50%) en main.css), así que este número es irrelevante
 *  para qué tan grande o centrado se ve el círculo en pantalla. */
const MAGIC_CIRCLE_ANCHOR_PX = 48;
/** Crea el círculo mágico rúnico del jugador como su PROPIO marcador (independiente de meMarker),
 *  anclado exactamente a la misma coordenada real que el personaje. Va como marcador aparte (no
 *  como un div más dentro de meIcon) porque necesita pitchAlignment/rotationAlignment:'map' —
 *  eso es lo que hace que MapLibre lo incline/rote de verdad con la cámara (como una calcomanía
 *  apoyada en el suelo) en vez de quedar siempre de frente a la pantalla como cualquier otro
 *  marcador HTML del juego (retrato del jugador incluido). zIndexOffset negativo para que el
 *  personaje (zIndexOffset:1000 en meMarker) siempre quede dibujado por encima. Pedido explícito:
 *  representa el rango real de alcance del jugador (ENGAGE_RANGE_M) — su tamaño en pantalla lo
 *  calcula updateMagicCircleScale, no este tamaño nominal. */
function createMeMagicCircle(latlng){
  const circleSrc = CLASS_MAGIC_CIRCLE_SPRITES[player.classKey];
  if(!circleSrc) return null; // clase sin círculo dedicado todavía — sin marcador, nada que romper
  const icon = L.divIcon({
    className: '',
    html: `<div class="magic-circle-wrap" data-class="${player.classKey}">
      <img class="magic-circle-outer" src="${circleSrc}" alt="">
    </div>`,
    iconSize: [MAGIC_CIRCLE_ANCHOR_PX, MAGIC_CIRCLE_ANCHOR_PX],
    iconAnchor: [MAGIC_CIRCLE_ANCHOR_PX/2, MAGIC_CIRCLE_ANCHOR_PX/2],
  });
  return L.marker([latlng.lat, latlng.lng], {
    icon, interactive:false, zIndexOffset:-500,
    pitchAlignment:'map', rotationAlignment:'map',
  }).addTo(map);
}

function initMap(savedPos){
  const start = savedPos || playerLatLng || {lat:4.710989, lng:-74.072090}; // fallback: Bogotá
  const detectedCity = detectCityAndLoadWorldData(start.lat, start.lng);
  map = L.map('map', {zoomControl:false, attributionControl:false, tap:true, tapTolerance:28}).setView([start.lat,start.lng], MAP_ENTRY_ZOOM);
  map.setPitch(65); // vista TOTALMENTE inclinada por defecto (el maximo que permite el mapa)
  if(map.whenTilesLoaded){
    map.whenTilesLoaded(()=>{
      map.flyTo([start.lat, start.lng], {zoom: DEFAULT_ZOOM, pitch: 65, duration: MAP_ENTRY_ZOOM_ANIM_MS});
      // El elemento .map-tiles-bright recién existe ACÁ (addRasterTileLayer lo agrega de forma
      // diferida, cuando el estilo real ya cargó — ver el shim) — llamar a esto antes (como se hacía
      // antes, más abajo en initMap) no encontraba el elemento todavía y no hacía nada, dejando el
      // tinte por defecto puesto hasta el primer chequeo periódico (60s) recién ahí con la transición
      // de 3s bien visible. Acá el elemento YA existe, así que el tinte correcto queda listo desde
      // el primer frame que se ve (justo cuando también se oculta la pantalla de carga).
      updateMapTimeOfDay(true);
    });
  }
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19, className:'map-tiles-bright'}).addTo(map);

  // Leaflet a veces calcula el tamaño de su contenedor ANTES de que termine de acomodarse el layout
  // (muy común en celulares), y se queda con esa medida vieja para todos los clics — aunque se VEA bien,
  // la mitad derecha (o la que sea) deja de responder al toque. Forzamos que se recalcule.
  setTimeout(()=> map.invalidateSize(), 200);
  setTimeout(()=> map.invalidateSize(), 800);
  window.addEventListener('resize', ()=> map.invalidateSize());
  window.addEventListener('orientationchange', ()=> setTimeout(()=> map.invalidateSize(), 300));
  document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) map.invalidateSize(); });

  // El marcador del jugador se crea PRIMERO, antes de cualquier otro elemento del mapa (zonas,
  // parques, torres, eventos, bases...) — así, aunque alguno de esos elementos fallara al
  // dibujarse, el personaje SIEMPRE aparece y el mapa SIEMPRE se puede centrar en él. Antes se
  // creaba al final: un error en cualquier paso previo dejaba al jugador invisible sin ningún
  // aviso, un punto único de fallo innecesario.
  const mePortrait = (CLASS_PORTRAITS[player.classKey]||{})[player.gender === "f" ? "f" : "m"];
  const walkSet = (CLASS_WALK_SPRITES[player.classKey]||{})[player.gender === "f" ? "f" : "m"];
  const initialSrc = (walkSet && walkSet.down) || (mePortrait && mePortrait.map);
  const meInner = initialSrc
    ? `<img src="${initialSrc}" class="me-portrait" alt="">`
    : `<div class="me-marker">${player.emoji}</div>`;
  const lampClass = isNightTime() ? "street-lamp lit" : "street-lamp";
  // Pedido explícito: ya no se dibuja el aro celeste de alcance (pulse-ring) alrededor del propio
  // jugador — el círculo mágico rúnico (createMeMagicCircle) es ahora el único elemento debajo del
  // personaje. El aro seguía existiendo con la misma inclinación falsa (rotateX vía CSS) que se
  // reemplazó por el círculo con pitchAlignment/rotationAlignment reales; dejarlos juntos se veía
  // redundante y "de más". El resto de los usos de ring-tilt-wrap (fogatas, santuarios, monstruos)
  // no se tocan, son anillos de alcance distintos y siguen igual.
  const meIcon = L.divIcon({className:'', html:`<div class="me-marker-wrap" style="position:relative; display:flex; align-items:center; justify-content:center; width:110px; height:60px;">
      <div class="me-marker-dark-flame"></div>
      <div class="${lampClass}" style="position:absolute; left:2px; top:8px;">🏮</div>
      <div class="${lampClass}" style="position:absolute; right:2px; top:8px;">🏮</div>
      ${meInner}</div>`, iconSize:[120,70], iconAnchor:[60,52]});
  meMarker = L.marker([start.lat,start.lng], {icon:meIcon, zIndexOffset:1000}).addTo(map);
  meMagicCircle = createMeMagicCircle(start);
  playerLatLng = start;

  // Pausa la animación infinita del círculo mágico (magicCircleSpin/magicCircleGlowOuter, ver
  // main.css) mientras hay una batalla en pantalla — el mapa queda tapado por #battleWrap pero
  // el navegador no frena solo por eso una animación CSS infinita. Un único MutationObserver sobre
  // #battleWrap (el mismo overlay que usan TODOS los tipos de combate: solo, manada, PvP, grupal,
  // torre, guardián de parque — ver isBattleUiVisible más abajo) cubre automáticamente cualquier
  // combate presente o futuro, sin tener que enganchar cada uno de los ~16 sitios donde termina
  // una batalla (dispersos, sin una función de cleanup compartida).
  const battleWrapElForCircle = $("battleWrap");
  if(battleWrapElForCircle){
    new MutationObserver(()=>{
      const inBattle = !battleWrapElForCircle.classList.contains("hidden");
      const circleEl = meMagicCircle && meMagicCircle.getElement && meMagicCircle.getElement()
        && meMagicCircle.getElement().querySelector(".magic-circle-outer");
      if(circleEl) circleEl.classList.toggle("mc-paused", inBattle);
    }).observe(battleWrapElForCircle, {attributes:true, attributeFilter:["class"]});
  }

  // Cada elemento decorativo del mapa se dibuja en su propio try/catch — un error en cualquiera de
  // ellos queda aislado (se avisa en la consola para poder diagnosticarlo) y nunca puede volver a
  // dejar al personaje sin aparecer ni cortar el resto de la inicialización del mapa.
  function safeDrawStep(label, fn){
    try{ fn(); }catch(e){ console.error(`[initMap] Falló al dibujar ${label} — el resto del mapa sigue igual:`, e); lastDrawStepErrors[label] = e.message; }
  }
  safeDrawStep("las zonas de la ciudad", drawNeivaZones);
  safeDrawStep("los parques", drawNeivaParks);
  safeDrawStep("las torres", drawTowers);
  safeDrawStep("la limpieza de entidades dinámicas expiradas", pruneExpiredDynamicEntities);
  safeDrawStep("la visibilidad media (fogatas/santuarios/torres/estaciones de mejora/Coliseo cercanos)", updateMediumVisibility);
  safeDrawStep("la limpieza de eventos del mundo expirados", pruneExpiredWorldEvents);
  safeDrawStep("los eventos del mundo", drawAllWorldEvents);
  safeDrawStep("las bases", drawAllBases);
  showBaseDebugPanelIfRequested();

  checkZoneDiscovery();
  checkDangerZoneEntry();
  updateParkProximity();
  updateCampfireProximity();
  updateCurrentRegion();
  toast(`📍 Estás en ${detectedCity.name}`, 3500);
  fetchWeatherForLocation(start.lat, start.lng);
  setInterval(()=> runIfNotInBattle(()=> fetchWeatherForLocation(playerLatLng.lat, playerLatLng.lng)), 20*60000);
  refreshWorldGeoDataAroundPlayer(); // Mapa Vivo, Capa 6 — primera consulta real a OpenStreetMap alrededor del punto de partida

  // Modo simulación: tocar el mapa mueve al jugador (útil sin GPS / en interiores)
  map.on('click', (e)=>{
    if(dangerZoneDraw){ handleDangerZoneDrawTap(e.latlng); return; }
    if(basePlacementArmed){ updateBasePreview(e.latlng.lat, e.latlng.lng); return; }
    if(builderAddKind){ placeNewBuilderElement(e.latlng.lat, e.latlng.lng); return; }
    if(!gpsMode){
      movePlayerTo(e.latlng.lat, e.latlng.lng);
    }
  });
  map.on('rotate', updateCameraOrientedEffects);
  map.on('pitch', updateCameraOrientedEffects);
  map.on('move', updateCameraOrientedEffects);
  updateCameraOrientedEffects();

  spawnMonsters(isNightTime() ? 5 : 3);
  setInterval(()=> runIfNotInBattle(maybeAutoSpawn), 14000); // pedido explícito: bajar un poco la tasa de aparición — antes 8000 (que a su vez venía de un valor TEMP de testing, 25000 originalmente)
  setInterval(()=> regenPlayerHp(), 8000); // regenPlayerHp ya chequea battleState/pvp/groupBattle por su cuenta
  updateDayNightBadge();
  // El tinte "de verdad" (sin transición, para que ya esté listo desde el primer frame) se aplica
  // en el callback de whenTilesLoaded más arriba — acá el elemento .map-tiles-bright todavía no
  // existe (se agrega de forma diferida, ver el shim), así que esta llamada no tiene efecto sobre
  // el mapa recién creado; se deja solo por si el mapa ya viene con el estilo listo (no debería
  // pasar en la práctica, pero no cuesta nada tenerlo).
  updateMapTimeOfDay();
  updateAmbientEffects();
  updateDungeonAuraAmbience();
  setInterval(()=> runIfNotInBattle(()=>{ updateDayNightBadge(); updateMapTimeOfDay(); updateAmbientEffects(); updateDungeonAuraAmbience(); }), 60000);
  collectTowerGold();
  collectBuildingGold();
  setInterval(()=> runIfNotInBattle(collectTowerGold), 5*60000); // revisa el oro acumulado de tus torres cada 5 minutos
  setInterval(()=> runIfNotInBattle(collectBuildingGold), 5*60000); // igual para el oro del Edificio
  checkConstructionTimers();
  setInterval(()=> runIfNotInBattle(checkConstructionTimers), 30000); // revisa cada 30s si tu base/Edificio ya terminaron de construirse
  setInterval(()=> saveGame(), 15000); // autoguardado periódico — a propósito NO se pausa en combate, por seguridad de datos
  setInterval(()=> runIfNotInBattle(maybeSpawnThief), 90000);
  setInterval(()=> runIfNotInBattle(maybeSpawnChest), 45000);
  setInterval(()=> runIfNotInBattle(updateContextBar), 8000);
  updateContextBar();
  setInterval(()=> runIfNotInBattle(updateChestLifespans), 20000);
  maybeSpawnChest(); // uno de una vez al empezar, para no tener que esperar el primer intervalo
  setInterval(()=> runIfNotInBattle(maybeSpawnResourceNode), 35000);
  setInterval(()=> runIfNotInBattle(updateResourceNodeLifespans), 20000);
  maybeSpawnResourceNode(); maybeSpawnResourceNode(); // un par de una vez al empezar
  setInterval(()=> runIfNotInBattle(maybeSpawnLoboNocturno), 60000);
  setInterval(()=> runIfNotInBattle(maybeSpawnDungeonAuraEnemy), 30000);
  setInterval(()=> maybeSpawnShadowWolf(), 45000); // maybeSpawnShadowWolf ya chequea battleState/pvp/groupBattle por su cuenta
  setInterval(()=> runIfNotInBattle(maybeScheduleWanderingMerchant), 120000);
  setInterval(()=> runIfNotInBattle(pruneExpiredDynamicEntities), 30000);
  setInterval(()=> maybeScheduleRandomEvent(), 50000); // maybeScheduleRandomEvent ya chequea battleState/pvp/groupBattle por su cuenta
  setInterval(()=> runIfNotInBattle(pruneExpiredWorldEvents), 30000);
  setInterval(()=> runIfNotInBattle(maybeSpawnVagabundo), 300000);
  setInterval(()=> runIfNotInBattle(maybeSpawnQuestNpc), 240000);
  setInterval(()=> runIfNotInBattle(maybeSpawnTutorialQuestNpc), 90000);
  setInterval(()=> runIfNotInBattle(maybeSpawnBoss), 240000);
  setTimeout(()=> maybeSpawnBoss(), 60000);
  setInterval(()=> runIfNotInBattle(updateBossTimers), 1000);
  setTimeout(()=> maybeSpawnThief(), 45000);
  initMultiplayer();

  // Modo simulación por defecto: el GPS NUNCA se solicita automáticamente.
  // Solo se pide cuando el usuario toca "Activar" o el botón 📍/🗺️ del HUD.
  enableSimulationFallback();
  setGpsStatus("off", "Modo simulación (toca el mapa o activa el GPS)");

  toast("¡Bienvenido, "+player.name+"! Toca 👾 para buscar monstruos, o 📍 para activar el GPS real.", 3600);
}

/* ============================================================
   2b. GEOLOCALIZACIÓN — módulo robusto con diagnóstico
   ------------------------------------------------------------
   Reglas de diseño:
   - El GPS NUNCA se solicita automáticamente. Solo se dispara
     como resultado directo de un toque del usuario (btnActivateGps
     o btnGps), para maximizar compatibilidad en Android/iOS.
   - Antes de pedir la ubicación se valida el entorno (HTTPS/localhost
     y soporte de la API) y se corre un diagnóstico completo.
   - Cualquier fallo cae SIEMPRE en modo simulación: el juego nunca
     queda bloqueado esperando al GPS.
   - Todos los pasos quedan registrados en consola con el prefijo
     [GPS] / [GPS ERROR] / [GPS DIAGNÓSTICO] para depurar en campo.
   ============================================================ */

// --- Modo desarrollo: revela el botón de diagnóstico GPS ---
// Se activa con ?debug=1 en la URL, o tocando 5 veces el texto de estado GPS.
let DEV_MODE = new URLSearchParams(location.search).has('debug');
let devTapCount = 0, devTapTimer = null;
applyDevModeUI(); // revela el botón de diagnóstico ya mismo si vino ?debug=1 en la URL (función hoisted, definida más abajo)

function maybeEnableDevMode(){
  devTapCount++;
  clearTimeout(devTapTimer);
  devTapTimer = setTimeout(()=>{ devTapCount = 0; }, 2500);
  if(devTapCount >= 5 && !DEV_MODE){
    DEV_MODE = true;
    applyDevModeUI();
    toast("🛠️ Modo desarrollo activado: botón de diagnóstico GPS visible.");
  }
}
function applyDevModeUI(){
  const btn = $("btnGpsDiagnose");
  if(btn) btn.classList.toggle("hidden", !DEV_MODE);
}

function gpsLog(...args){ console.log("[GPS]", ...args); }
function gpsErrorLog(code, message){ console.error("[GPS ERROR]\nCode:", code, "\nMessage:", message); }

/**
 * diagnoseGPS()
 * Reúne toda la información relevante del entorno del dispositivo/navegador
 * y la imprime en consola. Se ejecuta siempre ANTES de solicitar el GPS,
 * y también puede llamarse manualmente desde el botón de diagnóstico.
 * @returns {Promise<object>} información recolectada
 */
async function diagnoseGPS(){
  const info = {
    timestamp: new Date().toISOString(),
    isSecureContext: window.isSecureContext,
    protocol: location.protocol,
    hostname: location.hostname || "(vacío, posible file:// )",
    userAgent: navigator.userAgent,
    platform: navigator.platform || "(no disponible)",
    onLine: navigator.onLine,
    geolocationSupported: !!navigator.geolocation,
    permissionState: "no disponible en este navegador"
  };

  if(navigator.permissions && navigator.permissions.query){
    try{
      const status = await navigator.permissions.query({name:"geolocation"});
      info.permissionState = status.state; // 'granted' | 'denied' | 'prompt'
    }catch(e){
      info.permissionState = "no se pudo consultar (" + e.message + ")";
    }
  }

  console.log("%c[GPS DIAGNÓSTICO]", "color:#5ee1c9; font-weight:bold;");
  console.log("  Hora:", info.timestamp);
  console.log("  window.isSecureContext:", info.isSecureContext);
  console.log("  Protocolo / host:", info.protocol, info.hostname);
  console.log("  navigator.onLine:", info.onLine);
  console.log("  navigator.geolocation disponible:", info.geolocationSupported);
  console.log("  Estado de permiso (Permissions API):", info.permissionState);
  console.log("  navigator.userAgent:", info.userAgent);
  console.log("  navigator.platform:", info.platform);

  return info;
}

/** Muestra el diagnóstico en una alerta legible (para depurar sin abrir devtools en el celular). */
async function showGpsDiagnosis(){
  const info = await diagnoseGPS();
  const lines = [
    `Contexto seguro: ${info.isSecureContext ? "Sí ✅" : "No ❌"} (${info.protocol})`,
    `Geolocation disponible: ${info.geolocationSupported ? "Sí ✅" : "No ❌"}`,
    `Permiso: ${info.permissionState}`,
    `Conectado a internet: ${info.onLine ? "Sí" : "No"}`,
    `Plataforma: ${info.platform}`
  ];
  showAlert(lines.join("<br>") + "<br><br><small style=\"color:var(--dim);\">Detalle completo en la consola del navegador</small>", {title:"Diagnóstico GPS", icon:"📡"});
}

/**
 * Valida que el entorno permita usar geolocalización antes de solicitarla.
 * @returns {{ok:boolean, reason?:string}}
 */
function validateGpsEnvironment(){
  if(!window.isSecureContext) return {ok:false, reason:"insecure_context"};
  if(!isGpsSupported()) return {ok:false, reason:"unsupported"};
  return {ok:true};
}

// Evita condiciones de carrera si el usuario toca "Activar" varias veces seguidas.
let gpsRequestInFlight = false;

/**
 * Pide la ubicación real del dispositivo.
 * SOLO se debe invocar como respuesta directa a un toque del usuario.
 * @param {boolean} silent - si es true, evita el toast de error (uso interno).
 */
async function requestRealGps(silent){
  if(gpsRequestInFlight){
    gpsLog("Ya hay una solicitud de GPS en curso; se ignora este toque adicional.");
    return;
  }
  gpsRequestInFlight = true;

  const info = await diagnoseGPS();
  gpsLog("Secure Context:", info.isSecureContext);
  gpsLog("Geolocation disponible:", info.geolocationSupported);

  const env = validateGpsEnvironment();
  if(!env.ok){
    gpsRequestInFlight = false;

    if(env.reason === "insecure_context"){
      setGpsStatus("off", "Entorno no seguro (no HTTPS)");
      $("gpsBannerText").innerHTML = "⚠️ Estás ejecutando el juego en un entorno <b>no seguro</b>. El GPS solo funciona mediante <b>HTTPS</b> o <b>localhost</b>.";
      if(!silent) toast("El GPS requiere HTTPS o localhost. Este entorno no es seguro, así que se mantiene el modo simulación.", 5500);
    } else {
      setGpsStatus("off", "GPS no disponible en este navegador");
      $("gpsBannerText").innerHTML = "📍 Este navegador no soporta geolocalización. El GPS requiere HTTPS/localhost y permisos de ubicación.";
      if(!silent) toast("Este navegador no soporta geolocalización. Se mantiene el modo simulación: toca el mapa para moverte.", 5000);
    }
    $("gpsBanner").classList.remove("hidden");
    enableSimulationFallback();
    return;
  }

  setGpsStatus("searching", "Buscando señal GPS…");
  $("gpsBanner").classList.remove("hidden");
  $("gpsBannerText").innerHTML = "📍 El GPS requiere HTTPS y permisos de ubicación. Buscando señal…";

  const options = {enableHighAccuracy:true, maximumAge:0, timeout:20000};
  gpsLog("Solicitando ubicación...");
  gpsLog("Hora del intento:", new Date().toISOString());
  gpsLog("Opciones utilizadas:", options);

  gpsGetCurrentPosition(options,
    (pos)=>{
      gpsRequestInFlight = false;
      gpsLog("Posición obtenida");
      gpsLog("Lat:", pos.coords.latitude);
      gpsLog("Lng:", pos.coords.longitude);
      gpsLog("Accuracy:", pos.coords.accuracy, "m");
      onGpsSuccess(pos);
      beginWatch();
    },
    (err)=>{
      gpsRequestInFlight = false;
      gpsErrorLog(err.code, err.message);
      onGpsError(err, silent);
    }
  );
}

/** Seguimiento continuo de posición, una vez que el primer fix fue exitoso. */
function beginWatch(){
  if(watchId){ gpsClearWatch(watchId); watchId = null; }
  const options = {enableHighAccuracy:true, maximumAge:0, timeout:20000};
  gpsLog("Iniciando seguimiento continuo (watchPosition) con opciones:", options);
  watchId = gpsWatchPosition(options,
    (pos)=>{
      gpsLog("Actualización de posición · Accuracy:", pos.coords.accuracy, "m");
      onGpsSuccess(pos);
    },
    (err)=>{
      gpsErrorLog(err.code, err.message);
      onGpsError(err, false);
    }
  );
}

function onGpsSuccess(pos){
  const wasActive = gpsMode;
  gpsMode = true;
  $("btnGps").classList.add("active");
  $("btnGps").textContent = "📍";
  $("gpsBanner").classList.add("hidden");
  setGpsStatus("on", "GPS activo · precisión ±"+Math.round(pos.coords.accuracy)+" m");
  movePlayerTo(pos.coords.latitude, pos.coords.longitude, true);
  if(!wasActive && map.enableGpsGestureMode) map.enableGpsGestureMode(()=>playerLatLng, DEFAULT_ZOOM-1.5);
}

/**
 * Maneja cualquier error de geolocalización con un mensaje específico
 * por código (PERMISSION_DENIED / POSITION_UNAVAILABLE / TIMEOUT / desconocido).
 * SIEMPRE recae en modo simulación: el juego nunca queda bloqueado.
 */
function onGpsError(err, silent){
  let msg, status;
  const iframeBlocked = err.code === 1 && /permissions policy/i.test(err.message || "");

  switch(err.code){
    case 1: // PERMISSION_DENIED
      if(iframeBlocked){
        // No es un rechazo del usuario: el contenedor (iframe) que muestra esta página
        // nunca delegó el permiso "geolocation", así que el navegador ni siquiera preguntó.
        msg = "El GPS está bloqueado por la política de permisos del visor donde se muestra este juego (un iframe embebido, típico de la vista previa de Claude). Esto no lo puedes resolver desde aquí: abre el archivo directamente en una pestaña normal de Chrome/Safari, fuera de cualquier vista previa integrada.";
        status = "Bloqueado por iframe (Permissions-Policy) — modo simulación";
        gpsErrorLog(err.code, "PERMISSIONS_POLICY_BLOCKED — el iframe contenedor no delegó 'geolocation'. Esto se soluciona abriendo la página como documento de nivel superior, no embebida.");
      } else {
        msg = "Permiso de ubicación denegado. Debes permitirlo desde los ajustes del navegador (icono 🔒 junto a la URL) o desde Ajustes del sistema > Apps > Permisos > Ubicación, y luego tocar 'Activar' de nuevo.";
        status = "Permiso denegado — modo simulación";
      }
      break;
    case 2: // POSITION_UNAVAILABLE
      msg = "El dispositivo no pudo obtener coordenadas (sin señal de GPS ni de red). Prueba en espacio abierto y vuelve a tocar 'Activar'.";
      status = "Sin señal — modo simulación";
      break;
    case 3: // TIMEOUT
      msg = "El GPS tardó demasiado en responder (más de 20 s). Toca 'Activar' para reintentar.";
      status = "Tiempo agotado — modo simulación";
      break;
    default: // UNKNOWN_ERROR
      msg = "Ocurrió un error desconocido al intentar obtener tu ubicación. Se mantiene el modo simulación.";
      status = "Error desconocido — modo simulación";
  }

  if(iframeBlocked){
    $("gpsBannerText").innerHTML = "🚫 Este visor <b>no permite GPS</b> (política de permisos del iframe). Abre el juego en una pestaña normal del navegador para usar tu ubicación real.";
  }

  setGpsStatus("off", status);
  enableSimulationFallback();
  if(!silent) toast(msg, 6500);
}

/** Garantiza que el juego siga siendo jugable aunque el GPS falle o no se active nunca. */
function enableSimulationFallback(){
  gpsMode = false;
  if(watchId){ gpsClearWatch(watchId); watchId = null; }
  if(map && map.disableGpsGestureMode) map.disableGpsGestureMode();
  $("btnGps").classList.remove("active");
  $("btnGps").textContent = "🗺️";
  $("gpsBanner").classList.remove("hidden");
}

function setGpsStatus(state, text){
  const dot = $("gpsDot");
  dot.classList.remove("on","searching");
  if(state==="on") dot.classList.add("on");
  if(state==="searching") dot.classList.add("searching");
  $("gpsStatusText").textContent = text;
}
$("gpsStatusText").onclick = maybeEnableDevMode; // 5 toques activan el modo desarrollo

$("btnActivateGps").onclick = ()=> requestRealGps(false);
$("btnGpsDiagnose").onclick = showGpsDiagnosis;

/** Puedes deslizar el aviso de GPS hacia cualquier lado para quitarlo de encima, sin tener que
 *  usar ningún botón — como cualquier notificación que se descarta con un swipe. */
(function setupGpsBannerSwipe(){
  const banner = $("gpsBanner");
  if(!banner) return;
  let startX = 0, dragging = false;
  function onStart(x){ dragging = true; startX = x; banner.style.transition = "none"; }
  function onMove(x){
    if(!dragging) return;
    const dx = x - startX;
    banner.style.transform = `translateX(${dx}px)`;
    banner.style.opacity = Math.max(0.15, 1 - Math.abs(dx)/160);
  }
  function onEnd(x){
    if(!dragging) return;
    dragging = false;
    banner.style.transition = "transform .25s ease, opacity .25s ease";
    const dx = x - startX;
    if(Math.abs(dx) > 90){
      banner.style.transform = `translateX(${dx>0?520:-520}px)`;
      banner.style.opacity = "0";
      setTimeout(()=> banner.classList.add("hidden"), 260);
    } else {
      banner.style.transform = "translateX(0)";
      banner.style.opacity = "1";
    }
  }
  banner.addEventListener("touchstart", e=> onStart(e.touches[0].clientX), {passive:true});
  banner.addEventListener("touchmove", e=> onMove(e.touches[0].clientX), {passive:true});
  banner.addEventListener("touchend", e=> onEnd(e.changedTouches[0].clientX));
  banner.addEventListener("mousedown", e=> onStart(e.clientX));
  window.addEventListener("mousemove", e=> onMove(e.clientX));
  window.addEventListener("mouseup", e=> onEnd(e.clientX));
})();

$("btnGps").onclick = ()=>{
  if(gpsMode){
    enableSimulationFallback();
    setGpsStatus("off", "Modo simulación (toca el mapa)");
    toast("Modo simulación: toca el mapa para mover a tu personaje.");
  } else {
    requestRealGps(false);
  }
};

let playerFacingDir = "down";
let lastMovementWorldBearing = 180; // el rumbo real de tu último movimiento (0=norte, 90=este...), para poder
                                     // recalcular la dirección en pantalla cada vez que gires el mapa
/** Si el personaje se movió lo suficiente, calcula su rumbo REAL (norte/sur/este/oeste) y
 *  de ahí decide qué sprite mostrar EN PANTALLA — no es lo mismo, porque si el mapa está
 *  rotado, "moverse hacia el norte" puede verse como moverse hacia la izquierda o abajo. */
function updatePlayerFacing(prev, cur){
  if(!prev) return;
  const dLat = cur.lat - prev.lat;
  const dLng = cur.lng - prev.lng;
  const absLat = Math.abs(dLat), absLng = Math.abs(dLng);
  if(absLat < 0.0000015 && absLng < 0.0000015) return; // movimiento insignificante (ruido de GPS), no cambia la dirección
  lastMovementWorldBearing = (Math.atan2(dLng, dLat) * 180/Math.PI + 360) % 360;
  recomputeScreenFacing();
}
/** Convierte el último rumbo real de movimiento en la dirección que corresponde EN PANTALLA
 *  ahora mismo (según hacia dónde esté girado el mapa), y cambia el sprite si hace falta. Se
 *  llama tanto al moverte como al rotar el mapa — así, aunque te quedes quieto, si giras la
 *  cámara el personaje sigue mostrando la cara que le toca ver desde ese ángulo. */
function recomputeScreenFacing(){
  const mapBearing = (map && map.getBearing) ? map.getBearing() : 0;
  const screenAngle = (lastMovementWorldBearing - mapBearing + 360) % 360;
  let dir;
  if(screenAngle >= 315 || screenAngle < 45) dir = "up";
  else if(screenAngle < 135) dir = "right";
  else if(screenAngle < 225) dir = "down";
  else dir = "left";
  if(dir !== playerFacingDir){
    playerFacingDir = dir;
    updateMeMarkerFacing();
  }
}
/** Cambia el sprite del marcador propio a la pose de la dirección actual (si esa clase/género ya tiene set direccional). */
function updateMeMarkerFacing(){
  const walkSet = (CLASS_WALK_SPRITES[player.classKey]||{})[player.gender==="f"?"f":"m"];
  if(!walkSet || !walkSet[playerFacingDir] || !meMarker) return; // sin sprites direccionales todavía para esta clase/género
  const el = meMarker.getElement();
  if(!el) return;
  const img = el.querySelector(".me-portrait");
  if(img) img.src = walkSet[playerFacingDir];
}

function movePlayerTo(lat,lng, follow=false){
  const prev = playerLatLng;
  updatePlayerFacing(prev, {lat,lng});
  playerLatLng = {lat,lng};
  meMarker.setLatLng([lat,lng]);
  if(meMagicCircle) meMagicCircle.setLatLng([lat,lng]);
  if(follow) map.panTo([lat,lng], {animate:true});
  if(prev && gpsMode){
    const segment = distMeters(prev, playerLatLng);
    if(segment > 0 && segment < 300) addWalkedDistance(segment); // ignora saltos raros de GPS (mala señal, teletransportes)
  }
  checkZoneDiscovery();
  checkDangerZoneEntry();
  updateParkProximity();
  updateCampfireProximity();
  updateDungeonAuraAmbience();
  checkProximity();
  updateContextBar();
  checkQuestProximity();
  updateWorldEventDiscovery();
  updateMediumVisibility();
  updateCurrentRegion();
  checkActiveGatherProximity();
  refreshWorldGeoDataAroundPlayer(); // Mapa Vivo, Capa 6 — no-op casi siempre; el cache decide si hace falta consultar de nuevo
  if(activeQuest && activeQuest.routeLine) drawQuestRoute(); // la línea de ruta sigue tu posición actual
  publishPresence(); // anuncia mi nueva posición de inmediato (si el multijugador está conectado)
}

$("btnRecenter").onclick = ()=>{
  if(!playerLatLng) return;
  // Animado (no de golpe): acerca el zoom e inclina el mapa a la vez, con una transición suave,
  // para que ubicar al personaje se sienta cinemático en vez de un salto brusco.
  map.flyTo([playerLatLng.lat, playerLatLng.lng], {zoom: DEFAULT_ZOOM, pitch: 65, duration: 1400});
};
$("btnResetCompass").onclick = ()=> map.resetNorthPitch();
document.querySelectorAll("#builderToolbar [data-add-kind]").forEach(btn=>{
  btn.onclick = ()=>{
    if(dangerZoneDraw) cancelDangerZoneDraw(); // modos de toque exclusivos entre sí
    builderAddKind = btn.dataset.addKind;
    toast("👉 Toca el mapa donde quieras colocarlo.");
  };
});
$("btnBuilderDrawZone").onclick = ()=> toggleDangerZoneDraw();
/* ---------- Medallas por distancia recorrida (incentivo para moverte de verdad) ---------- */
if(false){
const DISTANCE_MEDALS = [
  {km:1,   name:"Primeros Pasos",     emoji:"🥉", gold:30},
  {km:5,   name:"Caminante",          emoji:"🥈", gold:75},
  {km:10,  name:"Explorador",         emoji:"🥇", gold:150},
  {km:25,  name:"Explorador Experto", emoji:"🏅", gold:300},
  {km:50,  name:"Trotamundos",        emoji:"🏆", gold:600},
  {km:100, name:"Viajero Legendario", emoji:"👑", gold:1200},
];
const ZONE_EXPLORE_TARGET_M = 3000; // caminar 3 km dentro de una zona cuenta como "100% explorada"
}
function addWalkedDistance(meters){
  if(!player) return;
  player.totalDistanceM = (player.totalDistanceM||0) + meters;
  const zone = getCurrentZone();
  if(zone){
    if(!player.zoneDistanceM) player.zoneDistanceM = {};
    player.zoneDistanceM[zone.key] = (player.zoneDistanceM[zone.key]||0) + meters;
  }
  gameEventBus.emit({ type: "DISTANCE_WALKED", payload: { amount: meters } });
  checkDistanceMedals();
}
function checkDistanceMedals(){
  if(!player.medals) player.medals = [];
  const totalKm = (player.totalDistanceM||0)/1000;
  const claimedKms = new Set(player.medals.map(m=>m.km));
  let newMedal = null;
  for(const med of DISTANCE_MEDALS){
    if(totalKm >= med.km && !claimedKms.has(med.km)){ newMedal = med; break; }
  }
  if(!newMedal && totalKm >= 100){
    const extraTier = Math.floor((totalKm-100)/50) + 1;
    const extraKm = 100 + extraTier*50;
    if(totalKm >= extraKm && !claimedKms.has(extraKm)){
      newMedal = {km:extraKm, name:`Leyenda Andante ${extraTier}`, emoji:"🌟", gold: 1200 + extraTier*300};
    }
  }
  if(newMedal){
    player.medals.push({km:newMedal.km, name:newMedal.name, emoji:newMedal.emoji});
    player.gold += newMedal.gold;
    refreshHud();
    saveGame();
    showMedalModal(newMedal);
  }
}
function showMedalModal(medal){
  $("medalEmoji").textContent = medal.emoji;
  $("medalName").textContent = medal.name;
  $("medalKm").textContent = `¡Recorriste ${medal.km} km reales!`;
  $("medalGold").textContent = `+${medal.gold} 💰`;
  $("medalOverlay").classList.remove("hidden");
}
$("btnCloseMedal").onclick = ()=> $("medalOverlay").classList.add("hidden");

/* ---------- Spawns de monstruos ---------- */
/** Punto al azar a como mucho `meters` de distancia de `center` — mismo cálculo que randOffset,
 *  pero centrado en cualquier punto (no solo el jugador), para poder ubicar spawns alrededor de
 *  un punto fijo del mapa como el portal de una mazmorra. */
function randOffsetFrom(center, meters){
  // ~1 grado lat = 111,111 m
  const dLat = (Math.random()*2-1) * (meters/111111);
  const dLng = (Math.random()*2-1) * (meters/(111111*Math.cos(center.lat*Math.PI/180)));
  return {lat: center.lat+dLat, lng: center.lng+dLng};
}
function randOffset(meters){ return randOffsetFrom(playerLatLng, meters); }
/** Rumbo (0°=norte, 90°=este...) desde `a` hacia `b` — mismo cálculo que ya usa
 *  updatePlayerFacing() para saber hacia dónde mira el personaje al caminar. */
function bearingBetween(a, b){
  return (Math.atan2(b.lng-a.lng, b.lat-a.lat) * 180/Math.PI + 360) % 360;
}
/** Punto a `meters` de distancia de `origin`, en la dirección `bearingDeg` — el inverso de
 *  bearingBetween(), para poder ubicar algo "adelante" de alguien en vez de en cualquier lado. */
function pointAtBearing(origin, meters, bearingDeg){
  const rad = bearingDeg * Math.PI/180;
  const dLat = (meters*Math.cos(rad)) / 111111;
  const dLng = (meters*Math.sin(rad)) / (111111*Math.cos(origin.lat*Math.PI/180));
  return {lat: origin.lat+dLat, lng: origin.lng+dLng};
}

/* ---------- Ciclo día/noche (según la hora real del dispositivo) ---------- */
function isNightTime(){
  const h = new Date().getHours();
  return (h >= 19 || h < 6); // de 7pm a 6am se considera "de noche"
}
/** Fase del día para el tinte del mapa: día normal, atardecer (más cálido/oscuro), o noche (oscuro y frío). */
function timeOfDayPhase(){
  const h = new Date().getHours();
  if(h >= 19 || h < 6) return "night";
  if(h >= 17) return "dusk"; // 5pm a 7pm
  if(h < 9) return "morning"; // 6am a 9am
  return "day";
}
/** Aplica el tinte correspondiente a la fase del día sobre los mosaicos del mapa. El filtro tiene
 *  una transición suave de 3s (ver .map-tiles-bright en main.css) pensada para cuando la hora del
 *  día cambia DE VERDAD mientras estás jugando (llamada periódica, ver el setInterval de initMap).
 *  Pero esa misma transición se disparaba también la primerísima vez que se pinta el mapa — el
 *  jugador veía el mapa aparecer con el filtro por defecto (de día) y recién 3s después se veía el
 *  tinte real (de noche, atardecer, etc.), como si "cargara" después. `skipTransition` (usado solo
 *  desde initMap, la primerísima llamada) apaga la transición un instante para que el tinte
 *  correcto ya esté puesto desde el primer frame que se ve. */
function updateMapTimeOfDay(skipTransition){
  const tiles = document.querySelector(".map-tiles-bright");
  const phase = timeOfDayPhase();
  if(tiles){
    if(skipTransition) tiles.style.transition = "none";
    tiles.classList.toggle("time-dusk", phase==="dusk");
    tiles.classList.toggle("time-night", phase==="night");
    tiles.classList.toggle("time-morning", phase==="morning");
    if(skipTransition){
      void tiles.offsetWidth; // fuerza a aplicar el filtro YA, antes de devolverle la transición normal
      tiles.style.transition = "";
    }
  }
  const lit = isNightTime();
  document.querySelectorAll(".street-lamp").forEach(el=> el.classList.toggle("lit", lit));
  const beam = $("mapLightBeam");
  if(beam){
    beam.classList.remove("beam-moon","beam-sun");
    if(phase==="night") beam.classList.add("beam-moon");
    else if(phase==="morning" || phase==="day") beam.classList.add("beam-sun");
  }
  updateCameraOrientedEffects();
}
/** Se llama cada vez que el mapa gira o se inclina. El punto de luz de luna/sol se hace más
 *  grande y notorio al inclinar la cámara (dando profundidad) pero se queda FIJO en su lugar —
 *  no se mueve al rotar; lo único que se mueve ahí es la sombra de las nubes, por su cuenta y
 *  sin relación con hacia dónde gires el mapa. Y el personaje no rota visualmente (su sprite
 *  se ve igual que siempre): lo que cambia es CUÁL sprite de dirección (arriba/abajo/izq/der)
 *  le toca mostrar, según hacia dónde quedó su último rumbo real relativo al giro del mapa. */
/** Punto real del mapa donde "cae" la luz de luna/sol — se elige una sola vez, cerca de donde
 *  empezaste a jugar, y desde ahí se comporta como cualquier otro objeto del mapa (una torre,
 *  una fogata): si te alejas panorámicamente, el brillo se queda atrás en su sitio; si rotas o
 *  inclinas la cámara, su posición en pantalla se recalcula según dónde le toque proyectarse
 *  ahora — no es un adorno pegado a la pantalla, es parte del mundo. */
let beamWorldSpot = null;
let __cloudPositionSet = false;
/** Fija la posición de la nube en píxeles UNA sola vez (no en porcentaje) — así nunca se
 *  recalcula cuando la barra de direcciones del navegador se oculta o aparece al deslizar en
 *  el celular, que es lo que hacía que pareciera "moverse" al mover el mapa hacia arriba/abajo
 *  aunque no tuviera ninguna relación real con la cámara. */
function ensureCloudFixedPosition(){
  if(__cloudPositionSet) return;
  const cloud = document.querySelector(".beam-cloud");
  if(!cloud) return;
  cloud.style.left = Math.round(window.innerWidth*0.30)+"px";
  cloud.style.top = Math.round(window.innerHeight*0.35)+"px";
  __cloudPositionSet = true;
}
function ensureBeamWorldSpot(){
  if(beamWorldSpot || !playerLatLng) return;
  // Anclado al Coliseo de la ciudad (siempre un punto real, central y memorable) — así el rayo
  // de luz siempre "apunta" al mismo sitio icónico en vez de a un punto aleatorio cercano a
  // donde arrancaste a jugar.
  if(COLISEO){
    beamWorldSpot = {lat: COLISEO.lat, lng: COLISEO.lng};
    return;
  }
  // Respaldo por si alguna ciudad no tuviera Coliseo configurado: mismo comportamiento de antes.
  const angle = Math.random() * Math.PI * 2;
  const distM = 60 + Math.random()*40; // a 60-100m de donde arrancaste, un punto cercano y creíble
  const dLat = (distM * Math.cos(angle)) / 111320;
  const dLng = (distM * Math.sin(angle)) / (111320 * Math.cos(playerLatLng.lat*Math.PI/180));
  beamWorldSpot = {lat: playerLatLng.lat + dLat, lng: playerLatLng.lng + dLng};
}
/** Se llama cada vez que el mapa se mueve, gira o se inclina — recalcula en qué píxel de la
 *  pantalla cae AHORA el punto real donde está anclada la luz (como si fuera un marcador más). */
/** Se llama cada vez que el mapa se mueve, gira o se inclina — recalcula en qué píxel de la
 *  pantalla cae AHORA el punto real donde está anclada la LUZ (como si fuera un marcador más).
 *  La NUBE, en cambio, es totalmente independiente de la cámara — no se reproyecta con nada,
 *  solo tiene su propia animación de deriva corriendo libre (ver @keyframes cloudDrift). */
function updateBeamWorldPosition(){
  const beam = $("mapLightBeam");
  if(!beam || !map || !map.project) return;
  ensureCloudFixedPosition();
  ensureBeamWorldSpot();
  if(!beamWorldSpot) return;
  const px = map.project(beamWorldSpot);
  const spot = beam.querySelector(".beam-spot");
  if(spot){ spot.style.left = px.x+"px"; spot.style.top = px.y+"px"; }
  // Los rayos "caen" hacia el mismo punto anclado que el resplandor — mismo left/top, la forma
  // en sí ya está pensada para subir desde ahí hasta arriba de la pantalla.
  const rays = beam.querySelector(".beam-rays");
  if(rays){ rays.style.left = px.x+"px"; rays.style.top = px.y+"px"; }
}
/** El zoom "normal" del juego es 18.50 — a ese nivel (o más cerca) los enemigos se ven a su
 *  tamaño de siempre. Si te alejas más que eso, se van encogiendo poco a poco hasta
 *  desaparecer del todo (para no saturar la pantalla de lejos); solo quedan visibles las
 *  torres, fogatas, nombres de zona, puntos de mejora y los jefes (estos NUNCA se achican). */
const ENEMY_HIDE_ZOOM = 15.50; // 3 niveles por debajo del nuevo zoom normal (18.50), ahí ya desaparecen del todo
function updateEnemyZoomScale(){
  if(!map || !map.getZoom) return;
  const zoom = map.getZoom();
  const scale = Math.max(0, Math.min(1, (zoom - ENEMY_HIDE_ZOOM) / (DEFAULT_ZOOM - ENEMY_HIDE_ZOOM)));
  document.documentElement.style.setProperty("--enemy-zoom-scale", scale.toFixed(3));
}
/** Calcula cuántos píxeles de pantalla representan los ENGAGE_RANGE_M metros de alcance, a la
 *  latitud y zoom actuales (la escala de un mapa cambia con ambas cosas) — así el aro alrededor
 *  del jugador siempre se ve del tamaño real que puedes alcanzar, ni más ni menos. */
// Puramente visual: el aro se veía enorme (a menudo más ancho que la pantalla) porque su radio
// real (ENGAGE_RANGE_M=100m) convertido a píxeles de mapa es grande de por sí. Este factor SOLO
// achica el dibujo del aro — la distancia real que hace falta para interactuar con algo (todos los
// chequeos usan ENGAGE_RANGE_M directamente) no cambia en nada.
const ENGAGE_RING_VISUAL_SCALE = 0.6;
function updateEngageRingRadius(){
  if(!map || !map.getZoom || !playerLatLng) return;
  const zoom = map.getZoom();
  const metersPerPixel = 156543.03392 * Math.cos(playerLatLng.lat*Math.PI/180) / Math.pow(2, zoom);
  const radiusPx = (ENGAGE_RANGE_M / metersPerPixel) * ENGAGE_RING_VISUAL_SCALE;
  document.documentElement.style.setProperty("--engage-range-px", Math.round(radiusPx)+"px");
}
/** El círculo mágico (createMeMagicCircle) es un marcador HTML normal, que por su cuenta NUNCA
 *  cambia de tamaño en pantalla al hacer zoom (a diferencia de las capas reales del mapa, que sí
 *  se ven más grandes/chicas). Pedido explícito: representa el rango real de alcance del jugador
 *  (ENGAGE_RANGE_M=100m, el mismo que antes dibujaba el aro celeste ya quitado) — mismo cálculo
 *  que updateEngageRingRadius de arriba (metros → píxeles según zoom/latitud, con el mismo factor
 *  ENGAGE_RING_VISUAL_SCALE ya afinado para que no tape media pantalla), así que crece/encoge con
 *  el zoom exactamente como el terreno real de abajo, y su diámetro SIGNIFICA algo (hasta dónde
 *  llega el jugador), no un tamaño arbitrario. */
function updateMagicCircleScale(){
  if(!map || !map.getZoom || !playerLatLng) return;
  const zoom = map.getZoom();
  const metersPerPixel = 156543.03392 * Math.cos(playerLatLng.lat*Math.PI/180) / Math.pow(2, zoom);
  const diameterPx = (ENGAGE_RANGE_M / metersPerPixel) * ENGAGE_RING_VISUAL_SCALE * 2;
  const px = Math.max(40, Math.min(420, diameterPx));
  document.documentElement.style.setProperty("--magic-circle-px", px.toFixed(1)+"px");
}
function updateCameraOrientedEffects(){
  const beam = $("mapLightBeam");
  const pitch = map && map.getPitch ? map.getPitch() : 0;
  if(beam){
    beam.classList.toggle("pitched", pitch > 15);
  }
  // Las auras/anillos de personajes y enemigos se inclinan igual que la cámara, para que se
  // vean apoyadas en el suelo en vez de flotando planas sin importar el ángulo de vista.
  document.documentElement.style.setProperty("--ring-tilt-deg", pitch+"deg");
  updateBeamWorldPosition();
  recomputeScreenFacing();
  updateEnemyZoomScale();
  updateEngageRingRadius();
  updateMagicCircleScale();
}
function updateDayNightBadge(){
  const badge = $("dayNightBadge");
  if(!badge) return;
  const night = isNightTime();
  badge.textContent = night ? "🌙 Noche" : "☀️ Día";
  badge.style.color = night ? "#c9b8ff" : "var(--dim)";
  badge.title = night ? "De noche aparecen más enemigos, en más grupos, y más agresivos." : "";
}
/** Prende/apaga las luciérnagas ambientales según la misma hora real que ya usa el resto del
 *  ciclo día/noche del juego — de día quedan invisibles (opacity:0 por CSS). */
function updateAmbientEffects(){
  const el = $("ambientEffects");
  if(!el) return;
  el.classList.toggle("ambient-night", isNightTime());
}
/** Mientras el jugador está dentro del radio de niebla oscura de un portal de mazmorra (mismo
 *  auraRadiusM que ya usa maybeSpawnDungeonAuraEnemy para decidir dónde rondan sus esbirros), las
 *  hojas ambientales del mapa se tiñen de oscuro — así la ambientación visual coincide con la zona
 *  real de peligro en vez de ser un adorno desconectado del resto del sistema de mazmorras. También
 *  prende/apaga acá la maldición que drena HP mientras estés parado ahí adentro (ver
 *  startSenorOscuroMapCurse) — pedido explícito: "similar al ataque de llama infernal del Señor
 *  Oscuro", así que reusa el mismo % por segundo que ya usa esa maldición dentro de su combate. */
function updateDungeonAuraAmbience(){
  const el = $("ambientEffects");
  if(!el || !playerLatLng) return;
  const inDarkAura = isPlayerInDarkAura();
  el.classList.toggle("ambient-dungeon-corrupt", inDarkAura);
  if(inDarkAura) startSenorOscuroMapCurse(); else clearSenorOscuroMapCurse();
}

/** Clasifica un código WMO (los que usa Open-Meteo) en una categoría visual simple. */
function classifyWeatherCode(code){
  if(code === 0 || code === 1) return "clear";
  if([2,3,45,48].includes(code)) return "cloudy";
  if([71,73,75,77,85,86].includes(code)) return "snow";
  if([51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(code)) return "rain";
  return "cloudy";
}
const WEATHER_LABELS = {
  clear:  {emoji:"☀️", label:"Despejado"},
  cloudy: {emoji:"☁️", label:"Nublado"},
  rain:   {emoji:"🌧️", label:"Lluvia"},
  snow:   {emoji:"❄️", label:"Nieve"},
};
/** Genera las gotas de lluvia (una sola vez por sesión de lluvia activa) con posiciones/tiempos al
 *  azar — reusada tanto para la lluvia del mapa (#weatherRain) como para la de la escena de
 *  batalla (#weatherRainBattle, ver updateBattleRainFx), mismo efecto visual en los dos lugares. */
function spawnRaindrops(containerId, count){
  const container = $(containerId || "weatherRain");
  if(!container || container.childElementCount > 0) return;
  for(let i=0;i<(count||45);i++){
    const drop = document.createElement("div");
    drop.className = "raindrop";
    drop.style.left = (Math.random()*100) + "%";
    drop.style.animationDuration = (0.7 + Math.random()*0.6) + "s";
    drop.style.animationDelay = (Math.random()*2) + "s";
    container.appendChild(drop);
  }
}
/** Igual que spawnRaindrops, pero para copos de nieve: más lentos y con una deriva lateral. */
function spawnSnowflakes(){
  const container = $("weatherSnow");
  if(!container || container.childElementCount > 0) return;
  const count = 35;
  for(let i=0;i<count;i++){
    const flake = document.createElement("div");
    flake.className = "snowflake";
    const size = 2 + Math.random()*3;
    flake.style.left = (Math.random()*100) + "%";
    flake.style.width = size+"px";
    flake.style.height = size+"px";
    flake.style.animationDuration = (4 + Math.random()*3) + "s";
    flake.style.animationDelay = (Math.random()*4) + "s";
    container.appendChild(flake);
  }
}
// Última categoría de clima real detectada (ver fetchWeatherForLocation) — se guarda acá para que
// la escena de batalla pueda consultarla al arrancar un combate (ver updateBattleRainFx), sin
// tener que repetir la consulta a Open-Meteo.
let currentWeatherCategory = "clear";
/** Aplica el efecto visual (sol/nubes/lluvia) y actualiza el textito de clima en el HUD. */
function applyWeatherEffect(category, tempC){
  const el = $("weatherEffects");
  if(!el) return;
  currentWeatherCategory = category;
  el.classList.remove("hidden","weather-clear","weather-cloudy","weather-rain","weather-snow");
  el.classList.add("weather-"+category);
  if(category === "rain") spawnRaindrops();
  if(category === "snow") spawnSnowflakes();
  const info = WEATHER_LABELS[category] || WEATHER_LABELS.cloudy;
  const badge = $("weatherBadge");
  if(badge){
    badge.textContent = `${info.emoji} ${Math.round(tempC)}°C`;
    badge.title = info.label;
    lastWeatherBadgeHTML = badge.textContent; // se cachea para reusar en la barra contextual sin repetir efectos (como la lluvia)
  }
}
/** Pedido explícito: si está lloviendo en el mapa, que también llueva en la escena de batalla —
 *  mismo efecto visual (gotas, ver spawnRaindrops) sobre el escenario de combate. Se decide al
 *  arrancar CUALQUIER tipo de combate (solo, manada, PvP, grupo — el clima es ambiental, no
 *  depende de battleState), y no cambia a mitad de un combate en curso aunque el clima real
 *  cambie mientras tanto (igual que el resto de los efectos de batalla). */
function updateBattleRainFx(){
  const container = $("weatherRainBattle");
  if(!container) return;
  const raining = currentWeatherCategory === "rain";
  container.classList.toggle("hidden", !raining);
  if(raining) spawnRaindrops("weatherRainBattle", 40);
}

/** Consulta el clima real (Open-Meteo, gratis y sin necesidad de clave) para la posición dada,
 *  y aplica el efecto visual correspondiente. Se llama al entrar al mapa y luego cada 20 minutos. */
async function fetchWeatherForLocation(lat, lng){
  try{
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`;
    const res = await fetch(url);
    if(!res.ok) return;
    const data = await res.json();
    const cw = data.current_weather;
    if(!cw) return;
    const category = classifyWeatherCode(cw.weathercode);
    applyWeatherEffect(category, cw.temperature);
  }catch(e){
    // sin internet o el servicio de clima no respondió — no es crítico, el juego sigue normal sin el efecto
  }
}

/** Cada cierto tiempo revisa si se subió una versión nueva del juego (comparando un archivito de
 *  versión contra la que ya tienes cargada) y, si cambió, muestra un aviso para recargar. No interrumpe
 *  nada mientras tanto — el jugador decide cuándo actualizar. */
function checkForNewVersion(){
  fetch("/version.json?ts=" + Date.now(), {cache:"no-store"})
    .then(res=> res.ok ? res.json() : null)
    .then(data=>{
      if(data && data.buildId && data.buildId !== __BUILD_ID__){
        $("updateBanner").classList.remove("hidden");
      }
    })
    .catch(()=>{ /* si falla la revisión no pasa nada, se reintenta en el siguiente ciclo */ });
}
$("btnReloadUpdate").onclick = ()=> location.reload();
setTimeout(checkForNewVersion, 15000); // primera revisión a los 15s de abrir, para no competir con la carga inicial
setInterval(checkForNewVersion, 5*60000); // luego cada 5 minutos
document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) checkForNewVersion(); });

/** Elige una plantilla de monstruo; de noche favorece a los agresivos (emboscan solos). */
function pickMonsterTemplate(){
  const zone = getCurrentZone();
  const pool = zone ? MONSTER_TEMPLATES.filter(t=>zone.monsterNames.includes(t.name)) : MONSTER_TEMPLATES;
  const usePool = pool.length ? pool : MONSTER_TEMPLATES;
  if(isNightTime() && Math.random() < 0.65){
    const aggros = usePool.filter(t=>t.aggressive);
    if(aggros.length) return aggros[Math.floor(Math.random()*aggros.length)];
  }
  return usePool[Math.floor(Math.random()*usePool.length)];
}

/** Reintenta una posición candidata (generada por `pickFn`) hasta que quede a `minSpacingM` de
 *  cualquier monstruo YA activo en el mapa, o se agoten los intentos — pedido explícito: que los
 *  enemigos no aparezcan amontonados/superpuestos entre sí. Antes cada función de spawn solo
 *  evitaba pisarse con los OTROS monstruos de su propio lote (p.ej. zigzagSpawnPositions contra sí
 *  misma), pero no contra los que ya estaban puestos de una tanda anterior — por eso se seguían
 *  viendo amontonados: un monstruo nuevo podía caer justo encima de uno que ya llevaba un rato ahí.
 *  `extraTaken` (opcional) son posiciones adicionales a evitar además de `monsters` — lo usa
 *  zigzagSpawnPositions para tampoco pisar a otros del MISMO lote que se está armando ahora mismo
 *  (esos todavía no están en `monsters`, recién se agregan al final de spawnMonsters). */
function pickPositionAwayFromMonsters(pickFn, minSpacingM, maxAttempts, extraTaken){
  let pos;
  for(let attempts=0; attempts<(maxAttempts||6); attempts++){
    pos = pickFn();
    const tooClose = monsters.some(m=> distMeters(m,pos) < minSpacingM)
      || (extraTaken && extraTaken.some(p=> distMeters(p,pos) < minSpacingM));
    if(!tooClose) return pos;
  }
  return pos; // se agotaron los intentos — mejor quedarse con el último que loopear para siempre
}
/** Reparte posiciones en zigzag a los lados de por dónde sueles caminar (se usa tu último rumbo
 *  real como una aproximación de "por dónde va la calle", ya que no tenemos la geometría exacta
 *  de las vías) — así los enemigos no aparecen amontonados en cualquier lado, sino como si
 *  estuvieran repartidos a lado y lado de un camino, con una separación mínima entre ellos (y de
 *  cualquier otro monstruo que ya esté puesto en el mapa, ver pickPositionAwayFromMonsters). */
function zigzagSpawnPositions(count, baseDistM){
  const roadRad = (lastMovementWorldBearing||0) * Math.PI/180;
  const perpRad = roadRad + Math.PI/2;
  const positions = [];
  const MIN_SPACING_M = 30;
  for(let i=0;i<count;i++){
    const pos = pickPositionAwayFromMonsters(()=>{
      const along = baseDistM + i*40 + Math.random()*15; // cada vez un poco más lejos por el "camino"
      const side = (i%2===0) ? 1 : -1; // zigzag: alterna izquierda/derecha
      const perpDist = (16 + Math.random()*14) * side;
      const dLatAlong = (along*Math.cos(roadRad))/111320, dLngAlong = (along*Math.sin(roadRad))/(111320*Math.cos(playerLatLng.lat*Math.PI/180));
      const dLatPerp = (perpDist*Math.cos(perpRad))/111320, dLngPerp = (perpDist*Math.sin(perpRad))/(111320*Math.cos(playerLatLng.lat*Math.PI/180));
      return {lat: playerLatLng.lat+dLatAlong+dLatPerp, lng: playerLatLng.lng+dLngAlong+dLngPerp};
    }, MIN_SPACING_M, 6, positions);
    positions.push(pos);
  }
  return positions;
}
function spawnMonsters(n){
  const positions = zigzagSpawnPositions(n, 25 + Math.random()*40);
  const dangerZone = currentDangerZone();
  for(let i=0;i<n;i++){
    const tpl = pickMonsterTemplate();
    // dentro de una Zona Peligrosa el nivel se sortea por Combat Power real (siempre a la altura
    // del jugador o por encima), no por el nivel plano de siempre — ver rollDangerZoneChallenge.
    const level = dangerZone ? rollDangerZoneChallenge(tpl).level : Math.max(1, player.level + Math.floor(Math.random()*3) - 1);
    const m = makeMonster(tpl, level, positions[i], {dangerZone: !!dangerZone, envSpawn:true});
    monsters.push(m);
  }
  // Pedido explícito: el nombre/distancia del enemigo va al toast inferior (antes vivía en el
  // panel de anuncios lateral, #slideNoticeWrap, ya retirado).
  const nearestD = playerLatLng ? Math.round(Math.min(...positions.map(p=> distMeters(playerLatLng, p)))) : null;
  const distTxt = nearestD!=null ? ` a ${nearestD} m` : " cerca";
  toast(`${dangerZone ? "☠️" : isNightTime()?"🌙":"👾"} ${n} monstruo(s) detectado(s)${distTxt}.`, 3200);
}

/** Manada de 2-3 (o 3-4 de noche) monstruos del mismo tipo, agrupados, con más recompensa (oro/XP). */
function spawnPack(){
  if(player.level < 7) return; // las manadas son muy duras antes del nivel 7
  const night = isNightTime();
  const dangerZone = currentDangerZone();
  // La manada entera se agrupa cerca de este centro (±~20m, ver el forEach de abajo), así que el
  // centro necesita más margen que un monstruo suelto (45m, no 30m) para no terminar superpuesta
  // con otro monstruo/manada ya puesta en el mapa.
  const center = pickPositionAwayFromMonsters(()=> randOffset(35 + Math.random()*110), 45, 8);
  const size = night ? (3 + Math.floor(Math.random()*2)) : (2 + Math.floor(Math.random()*2)); // 3-4 de noche, 2-3 de día
  const tpl = pickMonsterTemplate();
  const level = dangerZone ? rollDangerZoneChallenge(tpl).level : Math.max(1, player.level + Math.floor(Math.random()*3) - 1);
  const packId = "pk"+Math.random().toString(36).slice(2,9);
  for(let i=0;i<size;i++){
    const pos = {lat: center.lat + (Math.random()*2-1)*0.00018, lng: center.lng + (Math.random()*2-1)*0.00018};
    monsters.push(makeMonster(tpl, level, pos, {pack:true, packId, dangerZone: !!dangerZone, envSpawn:true}));
  }
  // Pedido explícito: nombre/distancia del enemigo al toast inferior, no al panel de anuncios.
  const d = playerLatLng ? Math.round(distMeters(playerLatLng, center)) : null;
  const distTxt = d!=null ? ` a ${d} m` : " cerca";
  toast(`${dangerZone ? "☠️" : night?"🌙⚠️":"⚠️"} ¡Manada de ${size} ${tpl.name}(s)${distTxt}! Tócalos para enfrentarlos juntos.`, 3400);
}

/** Regeneración lenta de HP mientras no estás en combate (de ningún tipo). */
function regenPlayerHp(){
  if(!player || battleState || pvp || groupBattle) return;
  if(player.hp >= player.maxHp) return;
  const heal = Math.max(1, Math.round(player.maxHp*0.02)); // ~2% de tu HP máx. cada 8s
  player.hp = Math.min(player.maxHp, player.hp + heal);
  refreshHud();
  saveGame();
}

function maybeAutoSpawn(){
  const now = Date.now();
  const night = isNightTime();
  let expiredCount = 0;
  monsters = monsters.filter(m=>{
    const d = distMeters(playerLatLng, m);
    const expired = m.spawnedAt && (now - m.spawnedAt) > m.lifespanMs;
    if(d > 500 || expired){
      map.removeLayer(m.marker);
      if(expired) expiredCount++;
      return false;
    }
    return true;
  });
  if(expiredCount > 0){
    toast(`${expiredCount>1?"Varios enemigos se fueron":"Un enemigo se fue"} de la zona… aparecerán otros nuevos.`, 2800);
  }
  const maxMonsters = night ? 11 : 7;      // pedido explícito: bajar un poco la tasa de aparición — antes 14/10
  const spawnChance = night ? 0.8 : 0.7;  // pedido explícito: bajar un poco la tasa de aparición — antes 1/0.95
  const packChance = (player.level >= 7) ? (night ? 0.55 : 0.35) : 0; // las manadas son muy duras para un personaje recién empezado
  if(monsters.length < maxMonsters && Math.random() < spawnChance){
    if(packChance > 0 && Math.random() < packChance) spawnPack();
    else spawnMonsters(night ? (2 + Math.floor(Math.random()*2)) : (1 + Math.floor(Math.random()*2)));
  }
}

/** Ladrón/Ninja errante: NPC especial de dificultad y botín superiores; te reta solo si te acercas. */
/** ¿Es justo la hora de la medianoche? Solo entre las 00:00 y las 00:59. */
function isMidnightHour(){ return new Date().getHours() === 0; }

/** Lobo Nocturno: encuentro rarísimo, solo a medianoche. Nivel fijo 50, no se puede atrapar
 *  (el jugador no lo sabe — el intento de captura simplemente fallará siempre). */
function maybeSpawnLoboNocturno(){
  if(!isMidnightHour()) return;
  if(monsters.some(m=>m.tpl.name==="Lobo Nocturno")) return; // ya hay uno activo
  if(Math.random() > 0.04) return; // muy rara vez, incluso a esa hora
  const pos = pickPositionAwayFromMonsters(()=> randOffset(60 + Math.random()*160), 30, 6);
  const m = makeMonster(LOBO_NOCTURNO_TEMPLATE, 50, pos, {special:true});
  monsters.push(m);
  toast("🌙 Algo aúlla en la oscuridad... un Lobo Nocturno ronda cerca.", 4500);
}

/* ============================================================
   NIEBLA OSCURA — el radio alrededor de un portal de mazmorra donde ronda su enemigo temático
   (ver DUNGEON_AURA_ENEMY_TEMPLATES en dungeons.js). Reusa TODO el motor de monstruos normal
   (mismo arreglo `monsters`, mismo checkAmbush() por ser aggressive:true, mismo startBattle) —
   lo único nuevo acá es DÓNDE aparece (alrededor de un punto fijo, no del jugador) y que escala
   de fuerza de noche (nightMult), algo que ningún otro monstruo del juego hace hoy.
   ============================================================ */
const DUNGEON_AURA_MAX_ENEMIES_PER_PORTAL = 7;
/** Sprites de mapa por `spriteKey` — separado de DUNGEON_AURA_ENEMY_TEMPLATES para que ese config
 *  se quede como datos puros (nombre/stats), sin importar nada de spriteRegistry.js. */
const DUNGEON_AURA_ENEMY_MAP_SPRITES = {
  demonio_oscuro: DEMONIO_OSCURO_SPRITES.map,
  sabueso_oscuro: SABUESO_OSCURO_SPRITES.map,
};
/** Ajusta la resistencia/amenaza de un esbirro de niebla según qué tan fuerte esté REALMENTE el
 *  jugador que lo va a enfrentar (equipo incluido, no solo su nivel) — comparado contra la MISMA
 *  fórmula neutral que usa makeMonster() para un monstruo genérico de ese nivel (multiplicador 1).
 *  Un jugador muy por encima de esa referencia (buen equipo para su nivel) encuentra esbirros más
 *  resistentes; uno por debajo los encuentra más cerca de su fuerza base — así el reto se siente
 *  parejo sin importar qué tan avanzado esté el equipo, en vez de solo escalar con el nivel. */
function dungeonAuraEnemyPowerScale(level){
  const expAtk = 1.5 + level*2.8, expDef = 3 + level*1.9, expHp = 18 + level*12;
  const clamp01 = (x, lo, hi)=> Math.max(lo, Math.min(hi, x));
  const ratio = (
    clamp01(player.atk / expAtk, 0.5, 2.5) +
    clamp01(player.def / expDef, 0.5, 2.5) +
    clamp01(player.maxHp / expHp, 0.5, 2.5)
  ) / 3;
  return {
    // hp/def: el jugador bien equipado necesita que aguanten más golpes, no solo pegar más fuerte
    hpDefMult: clamp01(1 + (ratio-1)*0.55, 0.9, 1.75),
    // atk: sube más despacio para no volverse injusto contra un jugador con poca vida/defensa
    atkMult: clamp01(1 + (ratio-1)*0.25, 0.95, 1.3),
  };
}
function maybeSpawnDungeonAuraEnemy(){
  if(!playerLatLng) return;
  (DUNGEON_PORTALS||[]).forEach(portal=>{
    const dungeon = getDungeonDef(portal.dungeonId);
    const pool = dungeon && DUNGEON_AURA_ENEMY_TEMPLATES[dungeon.auraEnemyKey];
    if(!dungeon || !pool || !pool.length) return;
    const auraRadius = dungeon.auraRadiusM || dungeon.revealRadiusM;
    const distToPortal = distMeters(playerLatLng, portal);
    if(distToPortal > auraRadius + 250) return; // ni vale la pena calcular más lejos
    const activeCount = monsters.filter(m=> m.auraPortalId === portal.id).length;
    if(activeCount >= DUNGEON_AURA_MAX_ENEMIES_PER_PORTAL) return;
    // entre más te acercas al portal, más probable que aparezca uno nuevo — de 35% en el borde de
    // la niebla hasta 85% pegado al portal, así se siente que te vas metiendo en zona cada vez más
    // peligrosa en vez de una probabilidad plana en todo el radio.
    const closeness = Math.max(0, Math.min(1, 1 - distToPortal/auraRadius));
    const spawnChance = 0.35 + closeness*0.5;
    if(Math.random() > spawnChance) return;
    // aparece EN EL CAMINO del jugador (adelante, hacia el portal), no en cualquier punto al azar
    // del radio — un abanico de 110° centrado en esa dirección para que no sea una línea recta
    // predecible, con un pequeño resguardo por si el abanico apuntara fuera del radio de niebla.
    const bearingToPortal = bearingBetween(playerLatLng, portal);
    const pos = pickPositionAwayFromMonsters(()=>{
      const bearing = bearingToPortal + (Math.random()*2-1)*55;
      const spawnDist = 35 + Math.random()*70;
      let p = pointAtBearing(playerLatLng, spawnDist, bearing);
      if(distMeters(p, portal) > auraRadius) p = randOffsetFrom(portal, Math.random()*auraRadius);
      return p;
    }, 30, 6);
    const level = Math.max(1, player.level + Math.floor(Math.random()*3) - 1);
    const baseTpl = pool[Math.floor(Math.random()*pool.length)];
    const tpl = {...baseTpl, mapSprite: DUNGEON_AURA_ENEMY_MAP_SPRITES[baseTpl.spriteKey]};
    const mon = makeMonster(tpl, level, pos, {special:true});
    const power = dungeonAuraEnemyPowerScale(level);
    mon.maxHp = Math.round(mon.maxHp * power.hpDefMult); mon.hp = mon.maxHp;
    mon.atk = +(mon.atk * power.atkMult).toFixed(1);
    mon.def = +(mon.def * power.hpDefMult).toFixed(1);
    if(tpl.nightMult && isNightTime()){
      mon.maxHp = Math.round(mon.maxHp * tpl.nightMult); mon.hp = mon.maxHp;
      mon.atk = +(mon.atk * tpl.nightMult).toFixed(1);
      mon.def = +(mon.def * tpl.nightMult).toFixed(1);
    }
    mon.auraPortalId = portal.id;
    monsters.push(mon);
  });
}

/* ============================================================
   LOBO SOMBRÍO — reto especial nocturno para Nv.50+. Sin aviso, sin marcador en el mapa: el
   parpadeo de pantalla avisa que salió y el combate arranca de una vez, justo donde estás parado.
   Solo puede aparecer una vez por noche (7pm-6am cuenta como una sola "noche", aunque cruce la
   medianoche). Sus estadísticas se calibran según las del propio jugador, no según su nivel solo,
   para que el reto se sienta justo sea cual sea tu build.
   ============================================================ */
/** Clave estable para "esta noche" — de 7pm a 6am comparten la misma clave aunque crucen la
 *  medianoche, así "una vez por noche" funciona bien sin importar a qué hora exacta aparece. */
function currentNightKey(){
  const d = new Date();
  if(d.getHours() < 6) d.setDate(d.getDate()-1);
  return d.toISOString().slice(0,10);
}
/** Nivel del Lobo Sombrío: se queda cerca de tu propio nivel (nunca menos de 50 ni más de 95) —
 *  cada vez que escapa con poca vida, sube +2 la próxima vez (tope en 95). */
function shadowWolfLevel(){
  const base = Math.max(50, Math.min(95, player.level));
  const bonus = Math.min(20, (player.shadowWolfEscapes||0)*2);
  return Math.min(95, base + bonus);
}
/** Arma al Lobo Sombrío con estadísticas calibradas según las TUYAS (no una fórmula genérica por
 *  nivel) — así aguanta pelea de verdad (apunta a ~6 turnos) sea cual sea tu build de equipo. */
function makeShadowWolfMonster(pos){
  const level = shadowWolfLevel();
  const hp = Math.round(player.atk*6.5 + player.maxHp*0.5 + level*8);
  const atk = Math.round(player.def*0.6 + level*1.4);
  const def = Math.round(player.atk*0.5 + level*1.1);
  const spd = 6 + Math.floor(level*0.5);
  return {id:"shadowwolf_"+Date.now(), tpl:LOBO_SOMBRIO_TEMPLATE, level, hp, maxHp:hp, atk, def, spd,
    lat:pos.lat, lng:pos.lng, marker:null, packBonus:1, packId:null, ambushed:false, isBoss:false,
    spawnedAt:Date.now(), lifespanMs:0};
}
/** El parpadeo de pantalla (como un encuentro salvaje de Pokémon GO) antes de que arranque el combate. */
function triggerWildEncounterFlash(onDone){
  const el = $("wildEncounterFlash");
  if(!el){ onDone(); return; }
  el.classList.remove("hidden");
  el.classList.add("flashing");
  setTimeout(()=>{
    el.classList.remove("flashing");
    el.classList.add("hidden");
    onDone();
  }, 900);
}
/** Revisa (cada tanto, de noche) si debe salir el Lobo Sombrío — sin marcador, sin aviso previo:
 *  parpadeo de pantalla y directo a combate. */
function maybeSpawnShadowWolf(){
  if(!isNightTime()) return;
  if(!player || player.level < 50) return;
  if(battleState || groupBattle || pvp) return; // no interrumpe un combate que ya esté en curso
  if(!playerLatLng) return;
  const nightKey = currentNightKey();
  if(player.shadowWolfNightKey === nightKey) return; // ya salió (o se intentó) esta noche
  if(Math.random() > 0.05) return; // no siempre que se cumplen las condiciones — solo a veces
  player.shadowWolfNightKey = nightKey; // se marca YA: solo se intenta una vez por noche, pase lo que pase
  saveGame();
  triggerWildEncounterFlash(()=>{
    const mon = makeShadowWolfMonster(playerLatLng);
    startBattle(mon);
  });
}

/** El inventario tiene un límite de espacios que sube por NIVELES fijos — pedido explícito:
 *  40→60→80→100→120→200 (ver INVENTORY_CAPACITY_TIERS, src/game/config/inventoryCapacity.js), no
 *  de a un espacio suelto como antes. player.inventoryCapacityTier es el índice dentro de esa tabla. */
function inventoryMaxSlots(){
  const tier = Math.min(player.inventoryCapacityTier||0, INVENTORY_CAPACITY_TIERS.length-1);
  return INVENTORY_CAPACITY_TIERS[tier];
}
/** El límite es por TIPO ÚNICO de objeto (igual que se muestra en pantalla, "X/34"), no por copia
 *  apilada — si ya tienes ese mismo objeto (mismo id), siempre se puede apilar una copia más sin
 *  importar cuántas tengas ya. Pasa el id del objeto que quieres agregar para chequear esto bien;
 *  sin id, se comporta como un chequeo genérico de "¿hay al menos un tipo libre?". */
function hasInventorySpace(newItemId){
  if(newItemId != null && player.inventory.some(it=>it.id===newItemId)) return true;
  const uniqueCount = new Set(player.inventory.map(it=>it.id)).size;
  return uniqueCount < inventoryMaxSlots();
}
/** Agrega un objeto al inventario SOLO si hay espacio — si no lo hay, avisa con un mensaje y
 *  sigue de largo sin bloquear nada (el resto de la recompensa del combate/cofre/misión se
 *  entrega igual, solo se pierde ese objeto puntual). Devuelve true si sí se agregó. */
function pushItemSafe(item, silent){
  if(!hasInventorySpace(item.id)){
    if(!silent) toast("🎒 Tu inventario está lleno — ese objeto no se pudo agregar. ¡Consigue más espacio!", 3600);
    return false;
  }
  initItemDurability(item);
  player.inventory.push(item);
  const dot = $("invNotifDot");
  if(dot) dot.classList.add("show");
  return true;
}
/** ¿Cuánto cuesta y en qué moneda subir al SIGUIENTE nivel de capacidad? null si ya está al
 *  máximo (INVENTORY_CAPACITY_TIERS.length-1). Sube bastante entre niveles (y de moneda,
 *  oro→cristales en los últimos) para que cada ampliación se sienta una decisión real. */
function nextSlotPurchaseInfo(){
  const tier = player.inventoryCapacityTier||0;
  if(tier >= INVENTORY_TIER_COST.length-1) return null;
  return INVENTORY_TIER_COST[tier+1];
}
function buyNextInventorySlot(){
  const info = nextSlotPurchaseInfo();
  if(!info){ toast("🎒 Ya tienes la capacidad máxima de inventario."); return; }
  if(info.currency==="gold"){
    if((player.gold||0) < info.cost){ toast(`🪙 Te faltan oro (necesitas ${info.cost}).`); return; }
    player.gold -= info.cost;
  } else {
    if((player.crystals||0) < info.cost){ toast(`💎 Te faltan cristales (necesitas ${info.cost}).`); return; }
    player.crystals -= info.cost;
  }
  player.inventoryCapacityTier = (player.inventoryCapacityTier||0) + 1;
  refreshHud();
  saveGame();
  toast(`🎒 Inventario ampliado a ${inventoryMaxSlots()} espacios.`);
}
/** Cuando una recompensa de combate no cupo en el inventario, en vez de perderla directo se le
 *  ofrece al jugador subir de nivel de capacidad para conservarla — si dice que no (o no le
 *  alcanza, o ya está al máximo), se pierde como siempre. Devuelve true si se conservaron todos. */
function offerToBuySpaceForOverflow(overflowItems, onResolved){
  if(!overflowItems.length){ if(onResolved) onResolved(); return; }
  const itemNames = overflowItems.map(it=>`${it.emoji} ${it.name}`).join(", ");
  const info = nextSlotPurchaseInfo();
  if(!info){
    toast(`🎒 Ya tienes la capacidad máxima de inventario — perdiste: ${itemNames}`, 4200);
    if(onResolved) onResolved();
    return;
  }
  const costTxt = info.currency==="gold" ? `🪙${info.cost}` : `💎${info.cost}`;
  const nextTierSize = INVENTORY_CAPACITY_TIERS[Math.min((player.inventoryCapacityTier||0)+1, INVENTORY_CAPACITY_TIERS.length-1)];
  showConfirm(
    `Tu inventario está lleno — no hay espacio para: ${itemNames}.<br><br>¿Ampliar tu inventario a ${nextTierSize} espacios por ${costTxt} para conservarlos?`,
    ()=>{
      const canAfford = info.currency==="gold" ? (player.gold||0)>=info.cost : (player.crystals||0)>=info.cost;
      if(!canAfford){
        toast(`No te alcanza para ampliar el inventario — perdiste: ${itemNames}`, 4200);
        if(onResolved) onResolved();
        return;
      }
      if(info.currency==="gold") player.gold -= info.cost; else player.crystals -= info.cost;
      player.inventoryCapacityTier = (player.inventoryCapacityTier||0) + 1;
      overflowItems.forEach(it=> pushItemSafe(it)); // un nivel de capacidad salta bastante — ahora sí caben todos
      refreshHud();
      toast(`🎒 Inventario ampliado a ${inventoryMaxSlots()} espacios — ¡conservaste: ${itemNames}!`, 4400);
      if(onResolved) onResolved();
    },
    {icon:"🎒", title:"Inventario lleno", confirmLabel:"Ampliar inventario",
      onCancel: ()=>{ toast(`🎒 Inventario lleno — perdiste: ${itemNames}`, 4200); if(onResolved) onResolved(); }}
  );
}
/** Intenta guardar una recompensa de combate sin avisar de inmediato si no cupo — en cambio, la
 *  junta en overflowArr para que winBattle() la ofrezca comprar espacio al final, una sola vez
 *  por todo lo que no haya cabido (en vez de un aviso de "se perdió" por cada objeto suelto). */
function pushRewardItem(item, overflowArr){
  if(!pushItemSafe(item, true)) overflowArr.push(item);
}

/* ============================================================
   COFRES DEL TESORO — aparecen cerca tuyo de vez en cuando, con 4 rarezas.
   No son permanentes: cada uno tiene un tiempo de vida, y si nadie lo abre
   a tiempo, desaparece solo (y puede volver a aparecer más adelante).
   ============================================================ */
const CHEST_RARITIES = [
  {key:"comun",      label:"Común",      emoji:"🟫", glow:"rgba(180,140,90,.6)",  weight:58, goldMin:20,  goldMax:60,   xpMin:10,  xpMax:30,  itemChance:0.30, lifespanMs:6*60000},
  {key:"raro",       label:"Raro",       emoji:"🟦", glow:"rgba(74,163,224,.7)",  weight:27, goldMin:60,  goldMax:150,  xpMin:30,  xpMax:70,  itemChance:0.55, lifespanMs:5*60000},
  {key:"epico",      label:"Épico",      emoji:"🟪", glow:"rgba(157,107,255,.75)",weight:12, goldMin:150, goldMax:350,  xpMin:70,  xpMax:150, itemChance:0.80, lifespanMs:4*60000},
  {key:"legendario", label:"Legendario", emoji:"🟨", glow:"rgba(232,196,104,.85)",weight:3,  goldMin:350, goldMax:800,  xpMin:150, xpMax:350, itemChance:1.00, lifespanMs:3*60000},
];
let chests = [];
let chestMarkers = {};

/** Cada tanto, hay chance de que aparezca un cofre cerca — la rareza sale al azar (ponderada,
 *  los comunes son mucho más frecuentes que los legendarios), y no aparece uno nuevo si ya hay
 *  demasiados activos cerca, para no saturar el mapa. */
function maybeSpawnChest(){
  if(chests.length >= 3) return; // como mucho 3 cofres activos a la vez
  if(Math.random() > 0.35) return;
  if(!playerLatLng) return;
  const rarity = rollFromTable(CHEST_RARITIES);
  const pos = randOffset(40 + Math.random()*130);
  const chest = {
    id:"chest_"+Math.random().toString(36).slice(2,9),
    rarityKey: rarity.key, lat:pos.lat, lng:pos.lng, spawnedAt:Date.now(), lifespanMs:rarity.lifespanMs,
  };
  chests.push(chest);
  drawChestMarker(chest);
  toast(`${rarity.emoji} ¡Apareció un cofre ${rarity.label.toLowerCase()} cerca!`, 3800);
}

function drawChestMarker(chest){
  const rarity = CHEST_RARITIES.find(r=>r.key===chest.rarityKey);
  const icon = L.divIcon({className:'', html:`<div class="chest-marker chest-${rarity.key}" style="--chest-glow:${rarity.glow};">🗝️</div>`,
    iconSize:[38,42], iconAnchor:[19,38]});
  const marker = L.marker([chest.lat, chest.lng], {icon, zIndexOffset:200}).addTo(map);
  marker.on('click', ()=> tryOpenChest(chest));
  chestMarkers[chest.id] = marker;
}

function removeChestMarker(chestId){
  const marker = chestMarkers[chestId];
  if(marker) marker.remove();
  delete chestMarkers[chestId];
  chests = chests.filter(c=>c.id!==chestId);
}

/** Revisa que estés lo bastante cerca del cofre antes de dejarte abrirlo (el mismo alcance que
 *  cualquier otra cosa interactiva del mapa), y si sí, reparte oro, experiencia y a veces un
 *  objeto — mejor entre más rara sea la caja. */
function tryOpenChest(chest){
  if(!playerLatLng) return;
  const d = distMeters(playerLatLng, chest);
  if(d > ENGAGE_RANGE_M){ toast(`El cofre está a ${Math.round(d)} m — acércate (≤${ENGAGE_RANGE_M} m).`); return; }
  const rarity = CHEST_RARITIES.find(r=>r.key===chest.rarityKey);
  const gold = Math.round(rarity.goldMin + Math.random()*(rarity.goldMax-rarity.goldMin));
  const xp = Math.round(rarity.xpMin + Math.random()*(rarity.xpMax-rarity.xpMin));
  player.gold += gold;
  player.xp += xp;
  gameEventBus.emit({ type: "GOLD_EARNED", payload: { amount: gold } });
  gameEventBus.emit({ type: "CHEST_OPENED", payload: { amount: 1 } });
  checkLevelUps();
  let itemWon = null;
  if(Math.random() < rarity.itemChance){
    const candidate = rollLoot();
    if(pushItemSafe({...candidate})) itemWon = candidate;
  }
  let crystalsWon = 0;
  if(rarity.key === "legendario"){
    crystalsWon = 1 + Math.floor(Math.random()*3); // 1 a 3 cristales, la unica fuente de cofre que da
    player.crystals = (player.crystals||0) + crystalsWon;
  }
  removeChestMarker(chest.id);
  refreshHud();
  saveGame();
  const itemLine = itemWon ? `<br>Y encontraste: <b>${itemWon.emoji} ${itemWon.name}</b>` : "";
  const crystalLine = crystalsWon ? `<br>💎 +${crystalsWon} cristales` : "";
  $("resultEmoji").textContent = rarity.emoji;
  $("resultTitle").textContent = `¡Cofre ${rarity.label.toLowerCase()} abierto!`;
  $("resultSub").innerHTML = `💰 +${gold} oro · ✨ +${xp} experiencia${itemLine}${crystalLine}`;
  $("btnBoostResultXp").classList.add("hidden");
  updateResultProgressVisibility(false);
  $("resultOverlay").classList.remove("hidden");
}

/** Los cofres que llevan mucho tiempo sin que nadie los abra, desaparecen solos — así el mapa no
 *  se llena de cofres viejos, y queda espacio para que aparezcan otros en otro lugar. */
function updateChestLifespans(){
  const now = Date.now();
  chests.filter(c=> now - c.spawnedAt > c.lifespanMs).forEach(c=> removeChestMarker(c.id));
}

/* ============================================================
   RECURSOS RECOLECTABLES — árboles (madera), rocas (piedra) y vetas de
   hierro. Aparecen cerca del jugador y solo son visibles por cercanía,
   igual que los cofres: si nadie los recolecta a tiempo, desaparecen
   solos y pueden volver a salir en otro lugar más adelante. Al tocar
   uno sale una pequeña barra de progreso; si te alejas antes de que
   termine, la recolección se cancela.
   ============================================================ */
const RESOURCE_NODE_TYPES = [
  {key:"tree_small",  kind:"wood",  emoji:"🌳", label:"Árbol pequeño",  weight:44, amountMin:3,  amountMax:5,  gatherMs:2200, lifespanMs:5*60000},
  {key:"tree_medium", kind:"wood",  emoji:"🌲", label:"Árbol mediano",  weight:28, amountMin:6,  amountMax:9,  gatherMs:3400, lifespanMs:5*60000},
  {key:"tree_large",  kind:"wood",  emoji:"🌴", label:"Árbol grande",   weight:12, amountMin:10, amountMax:15, gatherMs:5000, lifespanMs:5*60000},
  {key:"stone_node",  kind:"stone", emoji:"🪨", label:"Roca",           weight:32, amountMin:2,  amountMax:4,  gatherMs:2600, lifespanMs:5*60000},
  {key:"iron_node",   kind:"iron",  emoji:"⛏️", label:"Vena de hierro", weight:14, amountMin:1,  amountMax:3,  gatherMs:3800, lifespanMs:5*60000},
];
const RESOURCE_VERB  = {wood:"Talando",       stone:"Picando piedra", iron:"Extrayendo hierro"};
const RESOURCE_ICON  = {wood:"🪵",            stone:"🪨",             iron:"🔩"};
const RESOURCE_LABEL = {wood:"madera",        stone:"piedra",         iron:"hierro"};

/** El pico de recolección: se compra en la tienda pero NO se equipa — actúa de forma pasiva,
 *  y sin él no se puede talar/picar/extraer nada. Se va gastando un uso por cada recolección
 *  completada; al llegar a 0 usos se rompe y hay que comprar uno nuevo. Los 3 tipos solo
 *  cambian costo, cuánto dura y qué tan rápido recolecta (mientras más caro, más rápido y
 *  más usos aguanta) — nunca se equipa como arma ni ocupa espacio de inventario. */
const PICKAXE_TIERS = [
  {key:"madera", label:"Madera", cost:80,  durability:15, speedMult:1.15},
  {key:"hierro", label:"Hierro", cost:220, durability:30, speedMult:0.85},
  {key:"acero",  label:"Acero",  cost:450, durability:50, speedMult:0.65},
];
/** Verde/naranja/rojo según cuánta durabilidad le queda al pico actual (no según su tier). */
function pickaxeDurabilityLevel(pickaxe){
  const tier = PICKAXE_TIERS.find(t=>t.key===pickaxe.tier);
  const pct = pickaxe.uses / tier.durability;
  if(pct > 0.6) return "green";
  if(pct > 0.25) return "orange";
  return "red";
}
function buyPickaxe(tierKey){
  const tier = PICKAXE_TIERS.find(t=>t.key===tierKey);
  if(!tier) return;
  if((player.gold||0) < tier.cost){ toast(`🪙 Te faltan oro (necesitas ${tier.cost}).`); return; }
  const doPurchase = ()=>{
    player.gold -= tier.cost;
    player.pickaxe = {tier: tier.key, uses: tier.durability};
    refreshHud();
    saveGame();
    renderPickaxeShopStatus();
    toast(`⛏️ ¡Compraste un pico de ${tier.label.toLowerCase()}!`, 3200);
  };
  if(player.pickaxe){
    const current = PICKAXE_TIERS.find(t=>t.key===player.pickaxe.tier);
    showConfirm(`Ya tienes un pico de ${current.label.toLowerCase()} con ${player.pickaxe.uses} usos — comprar uno nuevo lo reemplaza. ¿Continuar?`,
      doPurchase, {icon:"⛏️", confirmLabel:"Reemplazar"});
  } else {
    showConfirm(`¿Comprar el pico de ${tier.label.toLowerCase()} por 💰${tier.cost}?`, doPurchase,
      {icon:"⛏️", title:"Confirmar compra", confirmLabel:"Comprar"});
  }
}
/** Actualiza la fila de la tienda con el estado del pico actual (o "ninguno") y marca qué
 *  tier tienes activo ahora mismo. */
function renderPickaxeShopStatus(){
  const statusEl = $("pickaxeShopStatus");
  if(!statusEl) return;
  if(!player.pickaxe){
    statusEl.innerHTML = `<span style="color:var(--dim);">Sin pico — no puedes recolectar todavía.</span>`;
  } else {
    const tier = PICKAXE_TIERS.find(t=>t.key===player.pickaxe.tier);
    const level = pickaxeDurabilityLevel(player.pickaxe);
    statusEl.innerHTML = `<span class="pickaxe-durability-chip pickaxe-durability-${level}"><span class="pickaxe-durability-dot"></span>⛏️ ${tier.label} · ${player.pickaxe.uses}/${tier.durability} usos</span>`;
  }
  document.querySelectorAll("#pickaxeTierRow .pickaxe-tier-btn").forEach(btn=>{
    const isOwned = player.pickaxe && player.pickaxe.tier === btn.dataset.tier;
    btn.classList.toggle("owned", !!isOwned);
  });
}
document.querySelectorAll("#pickaxeTierRow .pickaxe-tier-btn").forEach(btn=>{
  btn.onclick = ()=> buyPickaxe(btn.dataset.tier);
});

let resourceNodes = [];
let resourceNodeMarkers = {};
let activeGather = null; // {nodeId, overRangeStrikes, finishTimer} mientras se está recolectando algo

/** Cada tanto, hay chance de que aparezca un recurso cerca — no aparece uno nuevo si ya hay
 *  demasiados activos cerca, para no saturar el mapa. */
function maybeSpawnResourceNode(){
  if(resourceNodes.length >= 6) return; // como mucho 6 nodos activos a la vez
  if(Math.random() > 0.45) return;
  if(!playerLatLng) return;
  const type = rollFromTable(RESOURCE_NODE_TYPES);
  const pos = randOffset(35 + Math.random()*150);
  const node = {id:"res_"+Math.random().toString(36).slice(2,9), typeKey:type.key, lat:pos.lat, lng:pos.lng,
    spawnedAt:Date.now(), lifespanMs:type.lifespanMs};
  resourceNodes.push(node);
  drawResourceNodeMarker(node);
}

function drawResourceNodeMarker(node){
  const type = RESOURCE_NODE_TYPES.find(t=>t.key===node.typeKey);
  const icon = L.divIcon({className:'', html:`<div class="resource-node-marker resource-${type.kind}">${type.emoji}</div>`,
    iconSize:[58,62], iconAnchor:[29,56]});
  const marker = L.marker([node.lat, node.lng], {icon, zIndexOffset:170}).addTo(map);
  marker.on('click', ()=> tryGatherResource(node.id));
  resourceNodeMarkers[node.id] = marker;
}

function removeResourceNodeMarker(nodeId){
  const marker = resourceNodeMarkers[nodeId];
  if(marker) marker.remove();
  delete resourceNodeMarkers[nodeId];
  resourceNodes = resourceNodes.filter(n=>n.id!==nodeId);
  if(activeGather && activeGather.nodeId===nodeId) cancelGather();
}

/** Los recursos que llevan mucho tiempo sin que nadie los recolecte desaparecen solos, igual
 *  que los cofres — así siempre queda espacio para que salgan otros en otro lugar. */
function updateResourceNodeLifespans(){
  const now = Date.now();
  resourceNodes.filter(n=> now - n.spawnedAt > n.lifespanMs).forEach(n=> removeResourceNodeMarker(n.id));
}

function tryGatherResource(nodeId){
  if(activeGather){ toast("Ya estás recolectando algo."); return; }
  if(!player.pickaxe || player.pickaxe.uses <= 0){ toast("⛏️ Necesitas un pico para recolectar — cómpralo en la 🏪 Tienda.", 3800); return; }
  const node = resourceNodes.find(n=>n.id===nodeId);
  if(!node || !playerLatLng) return;
  const d = distMeters(playerLatLng, node);
  if(d > RESOURCE_GATHER_RANGE_M){ toast(`Está a ${Math.round(d)} m — acércate (≤${RESOURCE_GATHER_RANGE_M} m).`); return; }
  const type = RESOURCE_NODE_TYPES.find(t=>t.key===node.typeKey);
  if(maybeGatherAmbush(type)) return; // te distrajiste peleando — la recolección no arranca esta vez
  startGatherProgress(node, type);
}
/** A veces, al ponerte a recolectar, sale un animal salvaje al ataque en vez de dejarte trabajar
 *  tranquilo — un pájaro si es un árbol, un lobo o un slime si es piedra/hierro. A más nivel, más
 *  chance de que salga una manada entera en vez de uno solo. Devuelve true si hubo emboscada. */
function maybeGatherAmbush(type){
  if(battleState || pvp || groupBattle) return false;
  if(Math.random() > 0.15) return false; // ~15% de las veces
  const tplName = type.kind==="wood" ? "Cuervo Corrupto" : (Math.random()<0.5 ? "Lobo Umbrío" : "Slime Salvaje");
  const tpl = MONSTER_TEMPLATES.find(t=>t.name===tplName);
  if(!tpl || !playerLatLng) return false;
  const animalWord = type.kind==="wood" ? "pájaro" : (tpl.name==="Lobo Umbrío" ? "lobo" : "slime");
  const level = Math.max(1, player.level + Math.floor(Math.random()*3) - 1);
  const packChance = Math.min(0.5, player.level*0.02); // sube con el nivel
  if(Math.random() < packChance){
    const size = 2 + Math.floor(Math.random()*2); // manada de 2-3
    const packId = "pk"+Math.random().toString(36).slice(2,9);
    const packMons = [];
    for(let i=0;i<size;i++){
      const pos = randOffset(15 + Math.random()*20);
      const m = makeMonster(tpl, level, pos, {pack:true, packId});
      monsters.push(m);
      packMons.push(m);
    }
    toast(`⚠️ ¡Una manada de ${animalWord}s salió al ataque!`, 3400);
    startPackBattle(packMons);
  } else {
    const pos = randOffset(15 + Math.random()*20);
    const m = makeMonster(tpl, level, pos);
    monsters.push(m);
    toast(`⚠️ ¡Un ${animalWord} salió al ataque!`, 3200);
    startBattle(m);
  }
  return true;
}

/** Arranca la barra de progreso (anima de 0% a 100% con CSS a lo largo de la duración ya
 *  ajustada por la velocidad del pico) y revisa cada tanto que el jugador siga cerca — si se
 *  aleja antes de terminar, se cancela solo. */
function startGatherProgress(node, type){
  const pickTier = PICKAXE_TIERS.find(t=>t.key===player.pickaxe.tier);
  const gatherMs = Math.round(type.gatherMs * pickTier.speedMult);
  $("gatherProgressLabel").textContent = `${type.emoji} ${RESOURCE_VERB[type.kind]}...`;
  const fill = $("gatherProgressFill");
  fill.style.transition = "none";
  fill.style.width = "0%";
  $("gatherProgressWrap").classList.remove("hidden");
  void fill.offsetWidth; // fuerza el reflow para que la transición de abajo sí anime desde 0%
  fill.style.transition = `width ${gatherMs}ms linear`;
  fill.style.width = "100%";
  activeGather = {nodeId: node.id, overRangeStrikes: 0};
  activeGather.finishTimer = setTimeout(()=> finishGather(node, type), gatherMs);
}

/** Revisa la recolección activa (si hay alguna) cada vez que el jugador tiene una posición NUEVA
 *  de verdad (llamado desde movePlayerTo — GPS real o simulación, da igual). A propósito NO es un
 *  polling por tiempo fijo: si el GPS no trajo una lectura nueva, no hay ninguna evidencia nueva de
 *  que el jugador se alejó, así que no tiene sentido re-evaluar la misma posición vieja. Requiere
 *  `GATHER_CANCEL_STRIKES` lecturas reales seguidas fuera de `GATHER_CANCEL_RANGE_M` (que ya incluye
 *  margen de tolerancia) antes de cancelar — así un salto puntual de precisión del GPS nunca cancela
 *  por sí solo, pero alejarse de verdad sigue cancelando en un par de lecturas (imperceptible). */
function checkActiveGatherProximity(){
  if(!activeGather || !playerLatLng) return;
  const node = resourceNodes.find(n=>n.id===activeGather.nodeId);
  if(!node){ cancelGather(); return; } // el nodo ya no existe (expiró mientras recolectabas)
  if(distMeters(playerLatLng, node) <= GATHER_CANCEL_RANGE_M){
    activeGather.overRangeStrikes = 0;
    return;
  }
  activeGather.overRangeStrikes = (activeGather.overRangeStrikes||0) + 1;
  if(activeGather.overRangeStrikes >= GATHER_CANCEL_STRIKES) cancelGather("Te alejaste — recolección cancelada.");
}

function cancelGather(msg){
  if(!activeGather) return;
  clearTimeout(activeGather.finishTimer);
  activeGather = null;
  $("gatherProgressWrap").classList.add("hidden");
  if(msg) toast(msg);
}

function finishGather(node, type){
  activeGather = null;
  const wrap = $("gatherProgressWrap");
  const anchorRect = wrap.getBoundingClientRect(); // hay que leerlo ANTES de ocultar (display:none => rect vacío)
  wrap.classList.add("hidden");
  const amount = Math.round(type.amountMin + Math.random()*(type.amountMax-type.amountMin));
  const beforeQty = player[type.kind]||0;
  player[type.kind] = beforeQty + amount;
  gameEventBus.emit({ type: "RESOURCE_COLLECTED", payload: { amount, resourceKind: type.kind } });
  removeResourceNodeMarker(node.id);
  // el pico se gasta un uso por cada recolección — al llegar a 0 se rompe y hay que comprar otro
  let pickaxeMsg = "";
  if(player.pickaxe){
    player.pickaxe.uses -= 1;
    if(player.pickaxe.uses <= 0){
      pickaxeMsg = "⛏️ ¡tu pico se rompió!";
      player.pickaxe = null;
    }
  }
  refreshHud(); // ya llama a renderMapMaterialsBar() — el chip de este material se auto-protege (dataset.animating) mientras vuelan las partículas
  saveGame();
  renderPickaxeShopStatus();
  spawnResourceGatherFloat(type, amount, beforeQty, anchorRect);
  if(pickaxeMsg) toast(pickaxeMsg, 2800);
}

/** Barra fija de materiales recolectados (madera/piedra/hierro) — pedido explícito: va debajo de
 *  la barra contextual del HUD (#hudContextBar), sin caja/fondo propio (ver public/new_elements/
 *  battle.png). Se llama desde refreshHud() para quedar siempre al día; un chip en pleno vuelo de
 *  partículas (dataset.animating, ver spawnResourceGatherFloat) se salta acá para no pisar la
 *  cuenta en vivo. */
function renderMapMaterialsBar(){
  const wrap = $("hudMaterialsBar");
  if(!wrap || !player) return;
  ["wood","stone","iron"].forEach(kind=>{
    let chip = wrap.querySelector(`.map-mat-chip[data-kind="${kind}"]`);
    if(!chip){
      chip = document.createElement("div");
      chip.className = "map-mat-chip";
      chip.dataset.kind = kind;
      chip.innerHTML = `<span class="mmc-icon">${RESOURCE_ICON[kind]}</span><span class="mmc-qty">${player[kind]||0}</span>`;
      wrap.appendChild(chip);
      return;
    }
    if(chip.dataset.animating === "1") return;
    chip.querySelector(".mmc-qty").textContent = player[kind]||0;
  });
}

/** Pedido explícito: en vez de un solo toast "+14 madera", que salgan los 14 emojis flotando uno
 *  por uno desde el HUD de recolección hasta el chip de ESE material en la barra fija de arriba,
 *  sumando el total ahí en vivo (arranca en `beforeQty` y termina exacto en `beforeQty+amount`,
 *  el mismo total real que ya quedó guardado en player[type.kind]) — mismo lenguaje visual que
 *  spawnFloatingNumber() en batalla (main.js), pero con un destino fijo real (el chip) en vez de
 *  solo subir en línea recta. */
function spawnResourceGatherFloat(type, amount, beforeQty, anchorRect){
  const kind = type.kind;
  const icon = RESOURCE_ICON[kind];
  renderMapMaterialsBar(); // por si es la primera vez que se recolecta este material, crea su chip
  const chip = document.querySelector(`.map-mat-chip[data-kind="${kind}"]`);
  const qtyEl = chip && chip.querySelector(".mmc-qty");
  if(!anchorRect || !anchorRect.width || !chip || !qtyEl){ toast(`${icon} +${amount} ${RESOURCE_LABEL[kind]}`, 2800); return; }
  chip.dataset.animating = "1";
  const originX = anchorRect.left + anchorRect.width/2;
  const originY = anchorRect.top;
  const particleWrap = document.createElement("div");
  particleWrap.className = "resource-float-wrap";
  document.body.appendChild(particleWrap);
  const particleCount = Math.max(1, Math.min(amount, 20)); // tope defensivo, hoy amountMax nunca pasa de 15
  let landed = 0;
  for(let i=0;i<particleCount;i++){
    setTimeout(()=>{
      const destRect = qtyEl.getBoundingClientRect();
      const startX = originX + (Math.random()*56-28);
      const startY = originY;
      const destX = destRect.left + destRect.width/2;
      const destY = destRect.top + destRect.height/2;
      const p = document.createElement("div");
      p.className = "resource-float-particle";
      p.textContent = icon;
      p.style.left = startX + "px";
      p.style.top = startY + "px";
      p.style.setProperty("--rfp-dx", (destX-startX).toFixed(1)+"px");
      p.style.setProperty("--rfp-dy", (destY-startY).toFixed(1)+"px");
      particleWrap.appendChild(p);
      const settle = ()=>{
        if(!p.parentNode) return;
        p.remove();
        landed++;
        const done = landed >= particleCount;
        qtyEl.textContent = done ? (beforeQty+amount) : (beforeQty + Math.round(amount*landed/particleCount));
        chip.classList.remove("bump"); void chip.offsetWidth; chip.classList.add("bump");
        if(done){
          delete chip.dataset.animating;
          particleWrap.remove();
        }
      };
      p.addEventListener("animationend", settle);
      setTimeout(settle, 1000); // red de seguridad si animationend no dispara
    }, i*65 + Math.random()*35);
  }
}

/** Santuarios: al quedarte parado un momento cerca, te dan un beneficio temporal de combate
 *  (más ataque, más daño mágico, o más velocidad) que dura 20 minutos — se puede volver a activar
 *  cuando se acabe, o cambiar por otro tipo de santuario distinto (el más nuevo reemplaza al viejo). */
let shrineMarkers = {};
let coliseoMarker = null;
/** El Coliseo, como localización permanente del mundo (Mapa Vivo, Capa 1) — su nombre queda
 *  siempre visible, como una ciudad o castillo en un RPG clásico, no como un simple ícono. Al
 *  tocarlo abre exactamente la misma pantalla de Coliseo de siempre (no se tocó su lógica). */
/** Prioridad 2 (visibilidad media): Coliseo, Santuarios, Fogatas, Mercader Ambulante y NPCs
 *  dinámicos — antes se dibujaban todos de la ciudad de una sola vez, sin importar la distancia;
 *  ahora solo aparecen cuando el jugador está relativamente cerca (con un colchón para no
 *  parpadear justo en el borde). Se llama cada vez que el jugador se mueve, y una vez al entrar
 *  al mapa. Reutiliza tal cual las funciones que ya dibujan UN solo elemento — nada de lógica de
 *  fogatas/santuarios/Coliseo duplicada acá, solo CUÁNDO se llaman.
 *
 *  Torres (Prioridad 1) no se tocan: ya están acotadas al área cargada (la ciudad actual), así
 *  que se siguen dibujando todas de una — ese es justo el comportamiento "siempre visible dentro
 *  de lo cargado" que se pidió, sin necesitar ningún filtro extra. Jefes de región tampoco se
 *  tocan: ya nacen cerca del jugador y nunca se ocultan por distancia (no se les aplica ningún
 *  filtro de visibilidad nuevo). */
function updateMediumVisibility(){
  if(!playerLatLng) return;

  const campfireEntries = (CAMPFIRES||[]).map(c=> ({id:c.id, distanceM: distMeters(playerLatLng, c), data:c}));
  const campfireDiff = diffVisibility("campfire", campfireEntries, new Set(Object.keys(campfireMarkers)));
  campfireDiff.toShow.forEach(e=>{ drawSingleCampfireMarker(e.data); if(builderModeOn) applyBuilderModeToMarker(campfireMarkers, e.data, "campfire"); });
  campfireDiff.toHide.forEach(id=>{ if(campfireMarkers[id]){ campfireMarkers[id].remove(); delete campfireMarkers[id]; } });

  const shrineEntries = (SHRINES||[]).map(s=> ({id:s.id, distanceM: distMeters(playerLatLng, s), data:s}));
  const shrineDiff = diffVisibility("shrine", shrineEntries, new Set(Object.keys(shrineMarkers)));
  shrineDiff.toShow.forEach(e=>{ drawSingleShrineMarker(e.data); if(builderModeOn) applyBuilderModeToMarker(shrineMarkers, e.data, "shrine"); });
  shrineDiff.toHide.forEach(id=>{ if(shrineMarkers[id]){ shrineMarkers[id].remove(); delete shrineMarkers[id]; } });

  const portalEntries = (DUNGEON_PORTALS||[]).map(p=> ({id:p.id, distanceM: distMeters(playerLatLng, p), data:p}));
  const portalDiff = diffVisibility("dungeon_portal", portalEntries, new Set(Object.keys(dungeonPortalMarkers)));
  portalDiff.toShow.forEach(e=>{ drawSingleDungeonPortalMarker(e.data); toast(`${getDungeonDef(e.data.dungeonId)?.portalEmoji||"🌀"} ¡Sientes una presencia cerca — encontraste un portal!`, 3400); });
  portalDiff.toHide.forEach(id=>{ if(dungeonPortalMarkers[id]){ dungeonPortalMarkers[id].remove(); delete dungeonPortalMarkers[id]; } });

  // Torres "no landmark" (la segunda de cada zona): solo se ven por proximidad, para no saturar el
  // mapa — comparten el mismo `towerMarkers` que las landmark (que ya están siempre dibujadas),
  // por eso `renderedIds` se limita acá a los ids de ESTAS torres específicamente.
  const towerProximityTowers = (TOWERS||[]).filter(t=> !t.landmark);
  const towerProximityIds = new Set(towerProximityTowers.map(t=> t.id));
  const towerProximityEntries = towerProximityTowers.map(t=> ({id:t.id, distanceM: distMeters(playerLatLng, t), data:t}));
  const towerRenderedIds = new Set(Object.keys(towerMarkers).filter(id=> towerProximityIds.has(id)));
  const towerProximityDiff = diffVisibility("tower_proximity", towerProximityEntries, towerRenderedIds);
  towerProximityDiff.toShow.forEach(e=>{ drawSingleTowerMarker(e.data); updateTowerMarkerVisual(e.data.id); if(builderModeOn) applyBuilderModeToMarker(towerMarkers, e.data, "tower"); });
  towerProximityDiff.toHide.forEach(id=>{ if(towerMarkers[id]){ towerMarkers[id].remove(); delete towerMarkers[id]; } });

  if(COLISEO){
    const d = distMeters(playerLatLng, COLISEO);
    const visible = isEntityVisible("coliseo", d, {isCurrentlyRendered: !!coliseoMarker});
    if(visible && !coliseoMarker) drawColiseoMarker();
    else if(!visible && coliseoMarker){ coliseoMarker.remove(); coliseoMarker = null; }
  }

  const dynEntries = (player.dynamicEntities||[]).filter(e=> entityStateNow(e)!=="expired")
    .map(e=> ({id:e.id, distanceM: distMeters(playerLatLng, e), state: entityStateNow(e), data:e}));
  const dynDiff = diffVisibility("dynamic_npc", dynEntries, new Set(Object.keys(dynamicEntityMarkers)));
  dynDiff.toShow.forEach(e=> drawDynamicEntityMarker(e.data));
  dynDiff.toHide.forEach(id=> removeDynamicEntityMarker(id));

  // Pedido explícito: las estaciones de mejora (antes TODAS siempre visibles, una por cada parque/
  // centro comercial de TODAS las ciudades) ahora solo aparecen por cercanía, igual que un santuario.
  const upgradeEntries = (UPGRADE_STATIONS||[]).map(u=> ({id:u.id, distanceM: distMeters(playerLatLng, u), data:u}));
  const upgradeDiff = diffVisibility("upgrade_station", upgradeEntries, new Set(Object.keys(upgradeMarkers)));
  upgradeDiff.toShow.forEach(e=>{ drawSingleUpgradeMarker(e.data); if(builderModeOn) applyBuilderModeToMarker(upgradeMarkers, e.data, "upgrade"); });
  upgradeDiff.toHide.forEach(id=>{ if(upgradeMarkers[id]){ upgradeMarkers[id].remove(); delete upgradeMarkers[id]; } });
}
function drawColiseoMarker(){
  if(!COLISEO) return;
  const icon = L.divIcon({className:'', html:`<div class="poi-location-wrap">
      <div class="poi-location-label">${POI_TYPES.coliseo.icon} ${COLISEO.name}</div>
      <div class="coliseo-marker">${POI_TYPES.coliseo.icon}</div>
    </div>`, iconSize:[190,72], iconAnchor:[95,60]});
  const marker = L.marker([COLISEO.lat, COLISEO.lng], {icon, zIndexOffset:110}).addTo(map);
  marker.on('click', ()=> openColiseoScreen());
  coliseoMarker = marker;
}
function drawShrines(){
  shrineMarkers = {};
  SHRINES.forEach(s=> drawSingleShrineMarker(s));
}
function drawSingleShrineMarker(s){
  const type = SHRINE_TYPES.find(t=>t.key===s.typeKey);
  const icon = L.divIcon({className:'', html:`<div class="shrine-marker">
      <div class="ring-tilt-wrap-center"><div class="shrine-range-ring" style="width:${s.activateRadius*2}px; height:${s.activateRadius*2}px; margin-left:-${s.activateRadius}px; margin-top:-${s.activateRadius}px;"></div></div>
      <div class="shrine-icon">⛲<span class="shrine-type-emoji">${type.emoji}</span></div>
    </div>`, iconSize:[44,48], iconAnchor:[22,44]});
  const marker = L.marker([s.lat, s.lng], {icon, zIndexOffset:-90}).addTo(map);
  marker.on('click', ()=> tryActivateShrine(s));
  shrineMarkers[s.id] = marker;
}
function tryActivateShrine(shrine){
  if(!playerLatLng) return;
  const d = distMeters(playerLatLng, shrine);
  if(d > shrine.activateRadius){ toast(`Este santuario está a ${Math.round(d)} m — acércate (≤${shrine.activateRadius} m).`); return; }
  const type = SHRINE_TYPES.find(t=>t.key===shrine.typeKey);
  player.activeShrineBuff = {stat: type.buffStat, amount: type.buffAmount, expiresAt: Date.now()+type.durationMs, sourceName: type.name};
  gameEventBus.emit({ type: "SANCTUARY_USED", payload: { amount: 1 } });
  const statLabel = type.buffStat==="atk" ? "ataque" : type.buffStat==="matk" ? "daño mágico" : "velocidad";
  toast(`${type.emoji} ¡${type.name} activado! +${Math.round(type.buffAmount*100)}% de ${statLabel} durante 20 minutos.`, 4500);
  refreshHud();
  saveGame();
}
/** Si tienes un beneficio de santuario activo (y todavía no venció), da el multiplicador extra
 *  para esa estadística puntual — se usa igual en PvE, PvP y duelos de grupo. */
function shrineBuffMultiplier(stat){
  if(!player.activeShrineBuff) return 1;
  if(player.activeShrineBuff.expiresAt < Date.now()){ player.activeShrineBuff = null; return 1; }
  if(player.activeShrineBuff.stat !== stat) return 1;
  return 1 + player.activeShrineBuff.amount;
}

/* ============================================================
   BASES PERSONALES — un cofre propio en el mapa, comprado en la tienda.
   Solo el dueño puede entrar; los demás jugadores la ven (vía PubNub,
   igual que las torres) pero no pueden entrar. Reutiliza el mismo patrón
   de sincronización que ya usan las torres.
   ============================================================ */
const PN_BASES_CHANNEL = "ronda-gps-rpg-bases-v1";
const BASE_PURCHASE_COST_GOLD = 500;
const BASE_PURCHASE_COST_WOOD = 300;
const BASE_PURCHASE_COST_STONE = 120;
const BASE_PURCHASE_COST_IRON = 40;
const BASE_PICKUP_COST_GOLD = 200;
const BASE_REDEPLOY_COST_GOLD = 150;
const BASE_STORAGE_SLOTS = 20;
// Mejora de la base a Edificio: ya no es solo un cofre — una vez construido, genera oro solo con
// el paso del tiempo (igual que una torre), sin que tengas que estar ahí en persona esperando.
const BUILDING_UPGRADE_COST = {wood:600, stone:240, iron:80};
const BUILDING_GOLD_PER_HOUR = 50;
// Ambas construcciones toman tiempo real (no son instantáneas) — se pueden acelerar pagando.
const BASE_CONSTRUCTION_MS = 30*60000;       // 30 minutos para construir la base
const BASE_RUSH_COST_GOLD = 500;             // acelerar la base a que esté lista ya mismo
const BUILDING_UPGRADE_MS = 60*60000;        // 1 hora para construir el Edificio
const BUILDING_RUSH_COST_GOLD = 200;         // acelerar el Edificio a que esté listo ya mismo
const BUILDING_RUSH_COST_CRYSTAL = 1;
let playerBases = {}; // ownerId -> {ownerId, ownerName, lat, lng, placedAt}
let baseMarkers = {}; // ownerId -> marker
let basePlacementArmed = false;
// true mientras estás dentro de una sub-pantalla (cofre/forja/regiones/mesas) abierta DESDE el
// cuarto de la base — así su botón "Cerrar" sabe que debe volver al cuarto en vez de solo
// esconderse. Esas mismas pantallas también se abren desde fuera de la base (FAB, botón 🗺️),
// donde esta bandera se queda en false y "Cerrar" se comporta como siempre.
let baseRoomReturnPending = false;
// Errores capturados por safeDrawStep durante initMap, guardados por etiqueta — solo para el
// panel de diagnóstico ?debug=1 (ver showBaseDebugPanelIfRequested).
let lastDrawStepErrors = {};

/** ¿Tu base todavía se está construyendo (los 30 minutos no han pasado)? */
function isBaseUnderConstruction(){
  return !!(player.base && player.base.constructionEndsAt && Date.now() < player.base.constructionEndsAt);
}
/** ¿Tu Edificio todavía se está construyendo (la 1 hora no ha pasado)? */
function isBuildingUpgrading(){
  return !!(player.buildingUpgradeEndsAt && Date.now() < player.buildingUpgradeEndsAt);
}
/** Cuánto falta, en un texto cortito tipo "23m" o "1h 4m" — se usa en el menú de Bases. */
function formatTimeLeft(ms){
  const totalMin = Math.max(0, Math.ceil(ms/60000));
  const h = Math.floor(totalMin/60), m = totalMin%60;
  return h>0 ? `${h}h ${m}m` : `${m}m`;
}
/** Paga oro para que tu base termine de construirse ya mismo. */
function rushBaseConstruction(){
  if(!isBaseUnderConstruction()) return;
  if((player.gold||0) < BASE_RUSH_COST_GOLD){ toast(`🪙 Te faltan oro (necesitas ${BASE_RUSH_COST_GOLD}).`); return; }
  player.gold -= BASE_RUSH_COST_GOLD;
  player.base.constructionEndsAt = Date.now();
  checkConstructionTimers();
  refreshHud();
  saveGame();
  renderBasesMenuList();
}
/** Paga oro + un diamante para que tu Edificio termine de construirse ya mismo. */
function rushBuildingUpgrade(){
  if(!isBuildingUpgrading()) return;
  if((player.gold||0) < BUILDING_RUSH_COST_GOLD || (player.crystals||0) < BUILDING_RUSH_COST_CRYSTAL){
    toast(`Te falta: 🪙${BUILDING_RUSH_COST_GOLD} · 💎${BUILDING_RUSH_COST_CRYSTAL}`, 3800);
    return;
  }
  player.gold -= BUILDING_RUSH_COST_GOLD;
  player.crystals -= BUILDING_RUSH_COST_CRYSTAL;
  player.buildingUpgradeEndsAt = Date.now();
  checkConstructionTimers();
  refreshHud();
  saveGame();
  renderBasesMenuList();
}
/** Revisa (cada 30s, y al iniciar sesión) si tu base o tu Edificio ya terminaron de construirse —
 *  si es así, los "activa" y avisa. Nunca hace falta que estés mirando el menú de Bases para que
 *  esto pase: apenas se cumple el tiempo, quedan listos solos. */
function checkConstructionTimers(){
  if(!player) return;
  if(player.base && player.base.constructionEndsAt && Date.now() >= player.base.constructionEndsAt){
    player.base.constructionEndsAt = null;
    drawAllBases();
    toast("🏠 ¡Tu base terminó de construirse! Ya puedes entrar.", 4200);
    saveGame();
  }
  if(player.buildingUpgradeEndsAt && Date.now() >= player.buildingUpgradeEndsAt){
    player.buildingUpgradeEndsAt = null;
    player.isBuilding = true;
    player.buildingLastCollectAt = Date.now();
    drawAllBases();
    toast(`🏢 ¡Tu Edificio está listo! Generará 💰${BUILDING_GOLD_PER_HOUR} oro cada hora.`, 4800);
    saveGame();
  }
}

/** ¿Falta algo para poder construir el Edificio? Devuelve un array vacío si ya alcanza. */
function missingForBuildingUpgrade(){
  const falta = [];
  if((player.wood||0) < BUILDING_UPGRADE_COST.wood) falta.push(`🪵${BUILDING_UPGRADE_COST.wood}`);
  if((player.stone||0) < BUILDING_UPGRADE_COST.stone) falta.push(`🪨${BUILDING_UPGRADE_COST.stone}`);
  if((player.iron||0) < BUILDING_UPGRADE_COST.iron) falta.push(`🔩${BUILDING_UPGRADE_COST.iron}`);
  return falta;
}
/** Arranca la construcción del Edificio — cuesta materiales (nada de oro), y tarda 1 hora en
 *  quedar listo (o se puede acelerar pagando). */
function upgradeBaseToBuilding(){
  if(!player.base){ toast("🏠 Primero despliega tu base en el mapa."); return; }
  if(isBaseUnderConstruction()){ toast("🏗️ Tu base todavía se está construyendo."); return; }
  if(player.isBuilding){ toast("🏢 Tu base ya es un Edificio."); return; }
  if(isBuildingUpgrading()){ toast("🏗️ Ya estás construyendo tu Edificio."); return; }
  const falta = missingForBuildingUpgrade();
  if(falta.length){ toast(`Te falta: ${falta.join(" · ")}`, 4200); return; }
  player.wood -= BUILDING_UPGRADE_COST.wood;
  player.stone -= BUILDING_UPGRADE_COST.stone;
  player.iron -= BUILDING_UPGRADE_COST.iron;
  player.buildingUpgradeEndsAt = Date.now() + BUILDING_UPGRADE_MS;
  refreshHud();
  saveGame();
  renderBasesMenuList();
  toast(`🏗️ ¡Empezaste a construir tu Edificio! Estará listo en ${formatTimeLeft(BUILDING_UPGRADE_MS)} (o acelera pagando).`, 4800);
}
/** Revisa tu Edificio cada vez que se llama (al iniciar sesión, o cada cierto tiempo) y te da el
 *  oro acumulado desde la última vez — el mismo mecanismo que ya usan las torres. */
function collectBuildingGold(){
  if(!player || !player.isBuilding || !player.buildingLastCollectAt) return;
  const hoursPassed = (Date.now() - player.buildingLastCollectAt) / 3600000;
  if(hoursPassed >= 1){
    const gold = Math.floor(hoursPassed) * BUILDING_GOLD_PER_HOUR;
    player.gold += gold;
    player.buildingLastCollectAt += Math.floor(hoursPassed) * 3600000;
    toast(`🏢 Tu Edificio generó 💰${gold} oro mientras no jugabas.`, 4500);
    refreshHud(); saveGame();
  }
}

function nextBaseStoragePurchaseInfo(){
  const bought = player.baseExtraSlots||0;
  return {currency:"crystal", cost: 5 + bought*3}; // 5, 8, 11, 14... sube con cada compra
}

/** Al comprar una base en la tienda, se arma el modo "toca el mapa para colocarla" — igual que
 *  el Modo Constructor, pero para cualquier jugador y solo con su propia base. Además del oro,
 *  la base ahora requiere materiales recolectados en el mundo (madera, piedra y hierro). */
$("btnBuyBase").onclick = ()=>{
  if(player.hasBase){ toast("🏠 Ya tienes una base — solo puedes tener una."); return; }
  const falta = [];
  if((player.gold||0) < BASE_PURCHASE_COST_GOLD) falta.push(`🪙${BASE_PURCHASE_COST_GOLD}`);
  if((player.wood||0) < BASE_PURCHASE_COST_WOOD) falta.push(`🪵${BASE_PURCHASE_COST_WOOD}`);
  if((player.stone||0) < BASE_PURCHASE_COST_STONE) falta.push(`🪨${BASE_PURCHASE_COST_STONE}`);
  if((player.iron||0) < BASE_PURCHASE_COST_IRON) falta.push(`🔩${BASE_PURCHASE_COST_IRON}`);
  if(falta.length){ toast(`Te falta: ${falta.join(" · ")}`, 3800); return; }
  showConfirm(`¿Comprar tu base personal por 🪵${BASE_PURCHASE_COST_WOOD} · 🪨${BASE_PURCHASE_COST_STONE} · 🔩${BASE_PURCHASE_COST_IRON} · 🪙${BASE_PURCHASE_COST_GOLD}?`, ()=>{
    player.gold -= BASE_PURCHASE_COST_GOLD;
    player.wood -= BASE_PURCHASE_COST_WOOD;
    player.stone -= BASE_PURCHASE_COST_STONE;
    player.iron -= BASE_PURCHASE_COST_IRON;
    player.hasBase = true; // la tienes, pero todavia no la has desplegado en el mapa
    refreshHud();
    saveGame();
    $("shopOverlay").classList.add("hidden");
    toast("🏠 ¡Compraste tu base! Ve al menú 🏠 Bases para desplegarla cuando quieras.", 4500);
  }, {icon:"🏠", title:"Confirmar compra", confirmLabel:"Construir"});
};

/** Recoge tu base del mapa (con costo de oro) — se queda "guardada" de nuevo, lista para
 *  volver a desplegarla cuando quieras (esa segunda vez sí cuesta oro también). */
function pickUpBase(){
  if((player.gold||0) < BASE_PICKUP_COST_GOLD){ toast(`🪙 Te faltan oro para recogerla (necesitas ${BASE_PICKUP_COST_GOLD}).`); return; }
  showConfirm(`¿Recoger tu base por ${BASE_PICKUP_COST_GOLD} de oro? Podrás volver a colocarla luego.`, ()=>{
    player.gold -= BASE_PICKUP_COST_GOLD;
    player.base = null;
    player.baseEverPlaced = true; // ya se coloco una vez, la proxima vez que se despliegue costará oro
    if(baseMarkers[myPlayerId]){ baseMarkers[myPlayerId].remove(); delete baseMarkers[myPlayerId]; }
    delete playerBases[myPlayerId];
    if(pubnub){
      pubnub.publish({channel: PN_BASES_CHANNEL, storeInHistory:true, message:{type:"base_removed", ownerId:myPlayerId, placedAt:Date.now()}})
        .catch(e=> console.warn("[BASES] no se pudo avisar que recogiste tu base:", e));
    }
    refreshHud();
    saveGame();
    renderBasesMenuList();
    toast("🏠 Recogiste tu base — ya la puedes volver a desplegar cuando quieras.");
  }, {icon:"🏠", confirmLabel:"Recoger"});
}

let previewBaseMarker = null;
/** Arranca el modo de colocación: aparecen los botones flotantes ✕/✔, y cada toque en el mapa
 *  mueve una vista previa (no se confirma hasta tocar el visto bueno). */
function armBasePlacementMode(){
  basePlacementArmed = true;
  $("basesMenuOverlay").classList.add("hidden");
  $("basePlacementControls").classList.remove("hidden");
  toast("👉 Toca el mapa para elegir dónde va tu base, y confirma con ✔.", 4000);
}
function updateBasePreview(lat, lng){
  // Defensa por si el mapa alguna vez entrega una coordenada no numérica (el bug real de
  // getLatLng() devolviendo el array crudo ya se corrigió en maplibre-leaflet-shim.js) —
  // nunca guardar/mostrar una vista previa con NaN.
  if(!Number.isFinite(lat) || !Number.isFinite(lng)){
    toast("📍 Ese punto no es válido — intenta tocar otro lugar del mapa.", 4200);
    return;
  }
  if(previewBaseMarker) previewBaseMarker.setLatLng([lat, lng]);
  else{
    const icon = L.divIcon({className:'', html:`<div class="base-marker-simple base-preview"><div class="bms-label">Aquí</div><div class="bms-emoji">🏠</div></div>`, iconSize:[54,58], iconAnchor:[27,95]});
    previewBaseMarker = L.marker([lat, lng], {icon, zIndexOffset:1100, interactive:false}).addTo(map);
  }
}
$("btnBasePlaceCancel").onclick = ()=>{
  basePlacementArmed = false;
  $("basePlacementControls").classList.add("hidden");
  if(previewBaseMarker){ previewBaseMarker.remove(); previewBaseMarker = null; }
  toast("Colocación cancelada.");
};
$("btnBasePlaceConfirm").onclick = ()=>{
  if(!previewBaseMarker){ toast("Primero toca el mapa para elegir un lugar."); return; }
  const ll = previewBaseMarker.getLatLng();
  // Misma protección que updateBasePreview — por si acaso, nunca cobrar ni guardar una base con
  // coordenadas inválidas.
  if(!Number.isFinite(ll.lat) || !Number.isFinite(ll.lng)){
    toast("📍 Ese punto no es válido — toca otro lugar del mapa y confirma de nuevo.", 4200);
    return;
  }
  if(player.baseEverPlaced){
    if((player.gold||0) < BASE_REDEPLOY_COST_GOLD){ toast(`🪙 Te faltan oro para volver a colocarla (necesitas ${BASE_REDEPLOY_COST_GOLD}).`); return; }
    player.gold -= BASE_REDEPLOY_COST_GOLD;
    refreshHud();
  }
  basePlacementArmed = false;
  previewBaseMarker.remove(); previewBaseMarker = null;
  $("basePlacementControls").classList.add("hidden");
  placeOwnBase(ll.lat, ll.lng);
};

/** Coloca la base del jugador donde tocó el mapa — se llama desde el mismo clic del mapa que
 *  mueve al personaje, interceptándolo primero si el modo de colocación está armado. */
function placeOwnBase(lat, lng){
  // si nunca había puesto una base, la cuña "Bases" del menú radial estaba oculta — que aparezca
  // con énfasis la próxima vez que abra el menú (ver updateWheelMenuLockedSlices).
  if(!player.baseEverPlaced) player._justUnlockedBaseSlice = true;
  player.base = {lat, lng, constructionEndsAt: Date.now() + BASE_CONSTRUCTION_MS};
  player.baseStorage = player.baseStorage || [];
  player.baseExtraSlots = player.baseExtraSlots || 0;
  player.baseEverPlaced = true;
  saveGame();
  const record = {ownerId: myPlayerId, ownerName: player.name, lat, lng, placedAt: Date.now()};
  playerBases[myPlayerId] = record;
  drawSingleBaseMarker(record);
  if(pubnub){
    pubnub.publish({channel: PN_BASES_CHANNEL, storeInHistory:true, message:{type:"base_placed", ...record}})
      .catch(e=> console.warn("[BASES] no se pudo avisar a otros jugadores:", e));
  }
  toast(`🏗️ ¡Empezaste a construir tu base! Estará lista en ${formatTimeLeft(BASE_CONSTRUCTION_MS)} (o acelera pagando).`, 4800);
}

function drawAllBases(){
  // Quita del mapa los marcadores YA dibujados antes de reemplazarlos — drawAllBases se vuelve a
  // llamar cuando tu base termina de construirse (normal o acelerada), y sin esto el marcador
  // viejo (🚧) se quedaba huérfano en el mapa, tapado por el nuevo (🏠) encima del mismo punto.
  Object.values(baseMarkers).forEach(m=> m && m.remove && m.remove());
  baseMarkers = {};
  if(player.base){
    playerBases[myPlayerId] = {ownerId: myPlayerId, ownerName: player.name, lat: player.base.lat, lng: player.base.lng, placedAt:0};
    drawSingleBaseMarker(playerBases[myPlayerId]);
  }
  fetchOtherBases();
}
function drawSingleBaseMarker(base){
  // Defensa ante datos guardados corruptos (una base sin lat/lng válidos, de algún save viejo):
  // sin esto, L.marker tira "Invalid LngLat object" y silenciosamente nunca se dibuja NINGÚN
  // marcador de base — quien la sufra queda sin poder ver la suya en el mapa sin ningún aviso.
  if(!Number.isFinite(base.lat) || !Number.isFinite(base.lng)){
    console.warn(`[drawSingleBaseMarker] Base de "${base.ownerName}" con coordenadas inválidas — no se dibuja.`, base);
    return;
  }
  const isMine = base.ownerId === myPlayerId;
  const underConstruction = isMine && isBaseUnderConstruction();
  const emoji = underConstruction ? "🚧" : (isMine && player.isBuilding) ? "🏢" : "🏠";
  const icon = L.divIcon({className:'', html:`<div class="base-marker-simple">
      <div class="bms-label">${escapeHtml(base.ownerName)}</div>
      <div class="bms-emoji">${emoji}</div>
    </div>`, iconSize:[54,58], iconAnchor:[27,95]});
  // zIndexOffset por encima del marcador del jugador (1000): si estás parado sobre tu propia
  // base, antes tu personaje la tapaba por completo (mismo punto en pantalla) — ahora el ícono
  // "flota" más arriba (ver iconAnchor) y además queda dibujado por delante.
  const marker = L.marker([base.lat, base.lng], {icon, zIndexOffset:1100}).addTo(map);
  marker.on('click', ()=> tryEnterBase(base));
  baseMarkers[base.ownerId] = marker;
}

/** Panel de diagnóstico temporal, solo visible con ?debug=1 en la URL — muestra en pantalla (sin
 *  consola ni bookmarklets) el estado real de player.base y del marcador, para poder investigar
 *  por qué el 🏠 no aparece en algunos dispositivos. No afecta a nadie que no agregue ese parámetro. */
function showBaseDebugPanelIfRequested(){
  if(!new URLSearchParams(location.search).has('debug')) return;
  const old = document.getElementById('__baseDebugPanel');
  if(old) old.remove();
  const box = document.createElement('div');
  box.id = '__baseDebugPanel';
  box.style.cssText = 'position:fixed; left:6px; right:6px; bottom:6px; z-index:99999; background:rgba(0,0,0,.92); color:#7fffb0; font:11px/1.5 monospace; padding:10px; border-radius:10px; max-height:60vh; overflow:auto; white-space:pre-wrap; border:1px solid #3a3;';
  const distToBase = (player.base && playerLatLng) ? Math.round(distMeters(playerLatLng, player.base)) : null;
  const info = {
    hasBase: player.hasBase, baseEverPlaced: player.baseEverPlaced,
    base: player.base, playerLatLng, distToBaseMeters: distToBase,
    baseMarkersInDOM: document.querySelectorAll('.base-marker-simple').length,
    baseMarkersKeys: Object.keys(baseMarkers), myPlayerId,
    mapZoom: map ? map.getZoom() : null,
    drawStepErrors: lastDrawStepErrors,
  };
  box.textContent = JSON.stringify(info, null, 2);
  document.body.appendChild(box);
}
/* ============================================================
   MAZMORRAS LEGENDARIAS — portal en el mapa, descubrible por proximidad (Mapa Vivo, capa
   nueva sobre lo ya existente). La configuración vive en game/config/dungeons.js; acá solo
   el motor: dónde poner el portal, cuándo revelarlo, y qué pasa al confirmarlo.
   ============================================================ */

/** Hash chiquito y determinístico (mismo mulberry32 que ya usa regionManager.js para nombres
 *  de región estables) — la MISMA ciudad+mazmorra siempre cae en el mismo punto de respaldo. */
function seededOffsetForKey(seedStr){
  let h = 1779033703 ^ seedStr.length;
  for(let i=0;i<seedStr.length;i++){
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return Math.abs(h);
}

/** Un portal por mazmorra registrada: preferentemente en una zona/parque ya clasificado con
 *  el bioma de la mazmorra (ej. RUINS) — pero como casi ninguna ciudad de hoy tiene zonas
 *  clasificadas así (el nombre tiene que sugerirlo, ver ecosystemEngine.js), con respaldo a
 *  un punto fijo y determinístico cerca del centro de la ciudad, para que la mazmorra SIEMPRE
 *  sea alcanzable sin importar qué tan rica sea la data de biomas de esa ciudad todavía. */
function buildDungeonPortalsForCity(city){
  return DUNGEON_REGISTRY.map(dungeon=>{
    const ruinsPark = (city.parks||[]).find(p=> classifyBiomeForPark(p) === dungeon.biome);
    const ruinsZone = !ruinsPark && (city.zones||[]).find(z=> classifyBiomeForZone(z) === dungeon.biome);
    let lat, lng;
    if(ruinsPark){ lat = ruinsPark.lat; lng = ruinsPark.lng; }
    else if(ruinsZone){ lat = ruinsZone.center.lat; lng = ruinsZone.center.lng; }
    else {
      const seed = seededOffsetForKey(city.key+"_"+dungeon.id);
      const angle = (seed % 360) * Math.PI/180;
      const distM = 300 + (seed % 400);
      lat = city.center.lat + (distM*Math.cos(angle))/111320;
      lng = city.center.lng + (distM*Math.sin(angle))/(111320*Math.cos(city.center.lat*Math.PI/180));
    }
    return { id:`dportal_${city.key}_${dungeon.id}`, dungeonId: dungeon.id, lat, lng, name: dungeon.name };
  });
}

function drawDungeonPortals(){
  // Mismo criterio que drawAllBases: limpia lo ya dibujado antes de redibujar, para no dejar
  // marcadores huérfanos si esto se vuelve a llamar (cambio de ciudad, etc.).
  Object.values(dungeonPortalMarkers).forEach(m=> m && m.remove && m.remove());
  dungeonPortalMarkers = {};
  Object.values(dungeonAuraCircles).forEach(c=> c && map.removeLayer && map.removeLayer(c));
  dungeonAuraCircles = {};
}
function drawSingleDungeonPortalMarker(portal){
  const dungeon = getDungeonDef(portal.dungeonId);
  if(!dungeon) return;
  // iconAnchor con Y grande + zIndexOffset por encima del jugador (1000): mismo fix que ya
  // aplicamos al marcador de la base — si el jugador termina parado justo sobre el punto del
  // portal, el ícono "flota" arriba de su cabeza en vez de quedar tapado por su propio sprite.
  const sprite = DUNGEON_PORTAL_SPRITES[dungeon.id];
  const visual = sprite
    ? `<img src="${sprite}" alt="" draggable="false">`
    : `<span>${dungeon.portalEmoji}</span>`;
  const icon = L.divIcon({className:'', html:`<div class="dungeon-portal-marker">
      <div class="dungeon-portal-label">${dungeon.name}</div>
      ${visual}
    </div>`, iconSize:[74,110], iconAnchor:[37,108]});
  const marker = L.marker([portal.lat, portal.lng], {icon, zIndexOffset:1100}).addTo(map);
  marker.on('click', ()=> tryEnterDungeonPortal(portal));
  dungeonPortalMarkers[portal.id] = marker;

  // niebla oscura: un círculo real anclado a coordenadas (igual que las fronteras de zona, ver
  // drawNeivaZones) — no un ícono CSS de tamaño fijo en píxeles como el anillo de las fogatas,
  // así se ve del tamaño correcto en metros sea cual sea el zoom del mapa.
  if(dungeon.auraRadiusM){
    const circle = L.circle([portal.lat, portal.lng], {
      radius: dungeon.auraRadiusM, color: dungeon.themeColor||"#9d3fff", weight: 1.5,
      fillColor: dungeon.themeColor||"#9d3fff", fillOpacity: 0.09, opacity: 0.4,
      dashArray: "1,10", interactive: false,
    }).addTo(map);
    dungeonAuraCircles[portal.id] = circle;
  }
}

/** ¿Todavía en cooldown este portal (lo completaste o caíste hace poco)? Mismo criterio que
 *  PARK_GUARDIAN_COOLDOWN_MS (1h), pero por portal — guardado en player.dungeonPortalCooldowns. */
function isDungeonPortalOnCooldown(portalId){
  const until = (player.dungeonPortalCooldowns||{})[portalId];
  return !!(until && Date.now() < until);
}
function tryEnterDungeonPortal(portal){
  const dungeon = getDungeonDef(portal.dungeonId);
  if(!dungeon) return;
  if(player.activeDungeonRun){
    toast(`${dungeon.portalEmoji} Ya tienes una corrida en curso — termínala o vuelve a este portal para continuar.`, 4200);
    if(player.activeDungeonRun.dungeonId === portal.dungeonId) startDungeonFloor();
    return;
  }
  if(isDungeonPortalOnCooldown(portal.id)){
    const left = formatTimeLeft((player.dungeonPortalCooldowns[portal.id]) - Date.now());
    toast(`${dungeon.portalEmoji} Este portal necesita descansar — falta ${left}.`, 4200);
    return;
  }
  showConfirm(`<b>${dungeon.name}</b><br><br>${dungeon.loreShort}`, ()=> startDungeonRun(portal),
    {icon: dungeon.portalEmoji, title:"¿Entrar a la mazmorra?", confirmLabel:"Entrar"});
}

/** Trae las bases de OTROS jugadores desde el historial compartido — si no hay conexión, solo
 *  ves la tuya (si ya la colocaste), sin que nada se rompa. */
function fetchOtherBases(){
  if(!pubnub) return;
  pubnub.fetchMessages({channels:[PN_BASES_CHANNEL], count:100}).then(res=>{
    const items = (res.channels && res.channels[PN_BASES_CHANNEL]) || [];
    items.forEach(item=>{
      const m = item.message;
      if(!m || m.ownerId===myPlayerId) return;
      const prev = playerBases[m.ownerId];
      if(m.type==="base_removed"){
        if(prev && m.placedAt > prev.placedAt){
          delete playerBases[m.ownerId];
          if(baseMarkers[m.ownerId]){ baseMarkers[m.ownerId].remove(); delete baseMarkers[m.ownerId]; }
        }
        return;
      }
      if(m.type!=="base_placed") return;
      if(!prev || m.placedAt > prev.placedAt){
        playerBases[m.ownerId] = m;
        if(baseMarkers[m.ownerId]) baseMarkers[m.ownerId].remove();
        drawSingleBaseMarker(m);
      }
    });
  }).catch(e=> console.warn("[BASES] no se pudo consultar bases de otros jugadores:", e));
}

/** Si es tu base, pregunta si quieres entrar. Si es de otro jugador, solo avisa de quién es. */
function tryEnterBase(base){
  if(base.ownerId === myPlayerId){
    if(isBaseUnderConstruction()){
      toast(`🏗️ Tu base se sigue construyendo — falta ${formatTimeLeft(player.base.constructionEndsAt - Date.now())}. Acelera desde el menú 🏠 Bases.`, 4200);
      return;
    }
    showConfirm("Esta es tu base. ¿Quieres entrar?", openBaseRoom, {icon:"🏠", confirmLabel:"Entrar"});
  } else {
    toast(`🏠 Esta es la base de ${base.ownerName} — no puedes entrar.`);
  }
}

/** Pantalla del cuarto de tu base: pinta tu personaje de pie y muestra los "muebles" tocables
 *  (cofre, mesas y forja) — el punto de entrada único al abrir tu base. */
function openBaseRoom(){
  const mePortrait = (CLASS_PORTRAITS[player.classKey]||{})[player.gender === "f" ? "f" : "m"];
  const walkSet = (CLASS_WALK_SPRITES[player.classKey]||{})[player.gender === "f" ? "f" : "m"];
  const src = (walkSet && walkSet.down) || (mePortrait && mePortrait.map);
  const img = $("baseRoomCharacterImg");
  if(src){ img.src = src; img.classList.remove("hidden"); }
  else { img.classList.add("hidden"); }
  const legacyBanner = $("baseRoomLegacyBanner");
  const claimedDungeon = DUNGEON_REGISTRY.find(d=> getDungeonProgress(d.id).legacyClaimed);
  legacyBanner.className = claimedDungeon
    ? `base-room-legacy-banner ${claimedDungeon.legacy.baseDecorationClass}`
    : "base-room-legacy-banner hidden";
  baseRoomReturnPending = false;
  $("baseRoomOverlay").classList.remove("hidden");
}
$("btnCloseBaseRoom").onclick = ()=> $("baseRoomOverlay").classList.add("hidden");

/** Abre una de las sub-pantallas de la base (cofre/forja/mapa/mesas) desde un hotspot del
 *  cuarto: esconde el cuarto y deja marcado que hay que volver a él al cerrarla. */
function goToSubScreenFromRoom(openFn){
  $("baseRoomOverlay").classList.add("hidden");
  baseRoomReturnPending = true;
  openFn();
}
/** Si la sub-pantalla se abrió desde el cuarto de la base, vuelve a mostrarlo; si no (se abrió
 *  desde fuera, ej. el FAB o el botón 🗺️), simplemente no hace nada extra. */
function returnToBaseRoomIfPending(){
  if(!baseRoomReturnPending) return;
  baseRoomReturnPending = false;
  $("baseRoomOverlay").classList.remove("hidden");
}
$("baseRoomHotspotChest").onclick = ()=> goToSubScreenFromRoom(openBaseStorage);
$("baseRoomHotspotWeapons").onclick = ()=> goToSubScreenFromRoom(()=> openBaseCategory("weapon"));
$("baseRoomHotspotConsumables").onclick = ()=> goToSubScreenFromRoom(()=> openBaseCategory("consumable"));
$("baseRoomHotspotMap").onclick = ()=> goToSubScreenFromRoom(()=>{ renderRegionsOverlay(); $("regionsOverlay").classList.remove("hidden"); });
$("baseRoomHotspotForge").onclick = ()=> goToSubScreenFromRoom(()=>{ renderForge(); $("forgeOverlay").classList.remove("hidden"); });

function openBaseStorage(){
  renderBaseStorageList();
  $("baseStorageOverlay").classList.remove("hidden");
}
$("btnCloseBaseStorage").onclick = ()=>{
  $("baseStorageOverlay").classList.add("hidden");
  returnToBaseRoomIfPending();
};

function baseStorageMaxSlots(){ return BASE_STORAGE_SLOTS + (player.baseExtraSlots||0); }
/** Arma la tarjeta de "pasar" un objeto entre tu inventario y el cofre de la base — se reusa en
 *  la vista del cofre (ambas direcciones) y en las mesas filtradas de solo-armas / solo-consumibles
 *  (siempre cofre → inventario). `onMoved` es el re-render que le toca a cada pantalla. */
function buildBaseTransferCard(it, direction, onMoved){
  const meta = equipItemMeta(it);
  const card = document.createElement("div");
  card.className = "inv-card-v2 " + meta.rc;
  // Un objeto puesto sigue viviendo en player.inventory (equipItem no lo saca de ahí, solo lo
  // referencia también desde player.equipment) — sin este chequeo se podía mandar al cofre algo
  // que seguís teniendo puesto, dejando player.equipment apuntando a un objeto que ya no está en
  // el inventario. Mostrarlo pero sin botón dice claramente por qué no se puede guardar todavía.
  const equippedNow = direction === "toChest" && it.type === "equip" && isItemCurrentlyEquipped(it);
  const label = direction === "toChest" ? "Pasar ⬇️" : "Pasar ⬆️";
  const durability = it.durability != null ? durabilityBarHtml(it) : "";
  const actionHtml = equippedNow
    ? `<div style="font-size:10.5px; font-weight:700; color:var(--dim); text-align:center; padding:6px 4px;">Equipado — desequípalo para guardarlo</div>`
    : `<button class="ghostbtn base-transfer-btn">${label}</button>`;
  card.innerHTML = `${equippedNow ? `<div class="icv-equipped-ribbon">EQUIPADO</div>` : ""}
    <div class="icv-icon">${iconFor(it)}</div><div class="icv-name">${it.name}</div>${durability}
    ${actionHtml}`;
  if(!equippedNow){
    card.querySelector(".base-transfer-btn").onclick = (e)=>{
      e.stopPropagation();
      if(direction === "toChest"){
        if((player.baseStorage||[]).length >= baseStorageMaxSlots()){ toast("🏠 Tu base está llena — consigue más espacio."); return; }
        const idx = player.inventory.indexOf(it);
        if(idx<0) return;
        const [moved] = player.inventory.splice(idx,1);
        player.baseStorage.push(moved);
      } else {
        if(!hasInventorySpace(it.id)){ toast("🎒 Tu inventario está lleno — no se pudo sacar."); return; }
        const idx = player.baseStorage.indexOf(it);
        if(idx<0) return;
        const [moved] = player.baseStorage.splice(idx,1);
        pushItemSafe(moved);
      }
      refreshHud();
      onMoved();
      saveGame();
    };
  }
  return card;
}

function renderBaseStorageList(){
  const storage = player.baseStorage || [];
  $("baseChestCount").textContent = `${storage.length}/${baseStorageMaxSlots()}`;

  // ---- arriba: tu inventario normal, con boton "Pasar ⬇️" para mandarlo a la base ----
  const invGrid = $("baseInventorySideList");
  invGrid.innerHTML = "";
  const uniqueInv = [];
  const seen = new Set();
  player.inventory.forEach(it=>{ if(!seen.has(it.id)){ seen.add(it.id); uniqueInv.push(it); } });
  $("baseInvCount").textContent = `(${uniqueInv.length})`;
  if(uniqueInv.length===0){
    invGrid.innerHTML = `<div class="empty-note" style="grid-column:1/-1;">Tu inventario está vacío.</div>`;
  } else {
    uniqueInv.forEach(it=> invGrid.appendChild(buildBaseTransferCard(it, "toChest", renderBaseStorageList)));
  }

  // ---- abajo: el cofre de la base, con boton "Pasar ⬆️" para devolverlo al inventario ----
  const chestGrid = $("baseChestSideList");
  chestGrid.innerHTML = "";
  if(storage.length===0){
    chestGrid.innerHTML = `<div class="empty-note" style="grid-column:1/-1;">Aún no has guardado nada aquí.</div>`;
  } else {
    storage.forEach(it=> chestGrid.appendChild(buildBaseTransferCard(it, "toInventory", renderBaseStorageList)));
  }
  // tarjeta "+" para ampliar el espacio de la base, con cristales — siempre al final del cofre
  const buyCard = document.createElement("div");
  const info = nextBaseStoragePurchaseInfo();
  buyCard.className = "inv-card-v2 inv-buy-slot-card";
  buyCard.innerHTML = `<div class="icv-icon">➕</div><div class="icv-name">Espacio de base</div><div class="icv-stat">💎 ${info.cost}</div>`;
  buyCard.onclick = ()=>{
    if((player.crystals||0) < info.cost){ toast(`💎 Te faltan cristales (necesitas ${info.cost}).`); return; }
    player.crystals -= info.cost;
    player.baseExtraSlots = (player.baseExtraSlots||0)+1;
    refreshHud();
    renderBaseStorageList();
    saveGame();
    toast(`🏠 +1 espacio en tu base (ahora ${baseStorageMaxSlots()}).`);
  };
  chestGrid.appendChild(buyCard);
}

const BASE_CATEGORY_DEFS = {
  weapon: {
    title: "🗡️ Mesa de armas",
    emptyNote: "Todavía no has guardado ninguna arma en el cofre de tu base.",
    filter: it=> it.slot==="weapon",
  },
  consumable: {
    title: "🧪 Mesa de consumibles",
    emptyNote: "Todavía no has guardado ningún consumible en el cofre de tu base.",
    filter: it=> it.type==="heal" || it.type==="mana" || it.type==="stat",
  },
};
/** Mesas de la base: listan SOLO lo que ya está guardado en el cofre (player.baseStorage) que
 *  cumpla el filtro de la categoría — armas o consumibles — con el mismo botón "Pasar ⬆️" que
 *  usa el cofre completo para devolverlo al inventario. */
function renderBaseCategoryList(kind){
  const def = BASE_CATEGORY_DEFS[kind];
  $("baseCategoryTitle").textContent = def.title;
  const grid = $("baseCategoryList");
  grid.innerHTML = "";
  const items = (player.baseStorage||[]).filter(def.filter);
  if(items.length===0){
    grid.innerHTML = `<div class="empty-note" style="grid-column:1/-1;">${def.emptyNote}</div>`;
  } else {
    items.forEach(it=> grid.appendChild(buildBaseTransferCard(it, "toInventory", ()=> renderBaseCategoryList(kind))));
  }
}
function openBaseCategory(kind){
  renderBaseCategoryList(kind);
  $("baseCategoryOverlay").classList.remove("hidden");
}
$("btnCloseBaseCategory").onclick = ()=>{
  $("baseCategoryOverlay").classList.add("hidden");
  returnToBaseRoomIfPending();
};

/** Pantalla del menú "🏠 Bases": muestra si ya tienes una, si está guardada (sin desplegar
 *  todavía) o ya puesta en el mapa, con el botón que corresponda en cada caso. */
function renderBasesMenuList(){
  const list = $("basesMenuList");
  if(!player.hasBase){
    list.innerHTML = `<div class="empty-note">Aún no tienes ninguna base. Cómprala en la 🏪 Tienda.</div>`;
    return;
  }
  const row = document.createElement("div");
  row.className = "inv-item";
  if(player.base && isBaseUnderConstruction()){
    const timeLeft = formatTimeLeft(player.base.constructionEndsAt - Date.now());
    row.innerHTML = `<div class="ie">🚧</div><div class="it">Construyendo tu base<small style="color:var(--dim);">Lista en ${timeLeft}</small></div>
      <button data-act="rush">⚡ 🪙${BASE_RUSH_COST_GOLD}</button>`;
    row.querySelector('[data-act="rush"]').onclick = rushBaseConstruction;
  } else if(player.base){
    const homeEmoji = player.isBuilding ? "🏢" : "🏠";
    const homeLabel = player.isBuilding ? "Tu edificio" : "Tu base";
    row.innerHTML = `<div class="ie">${homeEmoji}</div><div class="it">${homeLabel}<small style="color:#4fd67a;">Desplegada en el mapa</small></div>
      <button data-act="enter" style="margin-right:4px;">🚪 Entrar</button>
      <button data-act="pickup" style="background:var(--danger);">🪙${BASE_PICKUP_COST_GOLD} Recoger</button>`;
    row.querySelector('[data-act="enter"]').onclick = ()=>{
      $("basesMenuOverlay").classList.add("hidden");
      openBaseRoom();
    };
    row.querySelector('[data-act="pickup"]').onclick = pickUpBase;
  } else {
    const costLabel = player.baseEverPlaced ? ` (🪙${BASE_REDEPLOY_COST_GOLD})` : " (gratis la primera vez)";
    row.innerHTML = `<div class="ie">🏠</div><div class="it">Tu base<small style="color:var(--dim);">Guardada — aún no la has desplegado</small></div>
      <button data-act="deploy">Desplegar${costLabel}</button>`;
    row.querySelector('[data-act="deploy"]').onclick = armBasePlacementMode;
  }
  list.innerHTML = "";
  list.appendChild(row);

  // Fila de la mejora a Edificio — solo tiene sentido si la base ya está desplegada (y lista).
  if(player.base && !isBaseUnderConstruction()){
    const buildRow = document.createElement("div");
    buildRow.className = "inv-item";
    if(player.isBuilding){
      buildRow.innerHTML = `<div class="ie">🏢</div><div class="it">Edificio<small style="color:var(--gold,#e8c468);">Genera 💰${BUILDING_GOLD_PER_HOUR} oro cada hora, aunque no estés jugando</small></div>`;
    } else if(isBuildingUpgrading()){
      const timeLeft = formatTimeLeft(player.buildingUpgradeEndsAt - Date.now());
      buildRow.innerHTML = `<div class="ie">🏗️</div><div class="it">Construyendo el Edificio<small style="color:var(--dim);">Listo en ${timeLeft}</small></div>
        <button data-act="rush-building">⚡ 🪙${BUILDING_RUSH_COST_GOLD}+💎${BUILDING_RUSH_COST_CRYSTAL}</button>`;
      buildRow.querySelector('[data-act="rush-building"]').onclick = rushBuildingUpgrade;
    } else {
      const falta = missingForBuildingUpgrade();
      const costParts = [
        `<span style="${(player.wood||0)<BUILDING_UPGRADE_COST.wood?'color:var(--danger);':''}">🪵${BUILDING_UPGRADE_COST.wood}</span>`,
        `<span style="${(player.stone||0)<BUILDING_UPGRADE_COST.stone?'color:var(--danger);':''}">🪨${BUILDING_UPGRADE_COST.stone}</span>`,
        `<span style="${(player.iron||0)<BUILDING_UPGRADE_COST.iron?'color:var(--danger);':''}">🔩${BUILDING_UPGRADE_COST.iron}</span>`,
      ].join(" · ");
      buildRow.innerHTML = `<div class="ie">🏗️</div><div class="it">Convertir en Edificio<small>${costParts}</small><small style="color:var(--dim);">Tarda ${formatTimeLeft(BUILDING_UPGRADE_MS)} en construirse — genera 💰${BUILDING_GOLD_PER_HOUR} oro cada hora</small></div>
        <button data-act="upgrade" ${falta.length?"disabled":""}>Construir</button>`;
      buildRow.querySelector('[data-act="upgrade"]').onclick = upgradeBaseToBuilding;
    }
    list.appendChild(buildRow);
  }
}
$("btnBases").onclick = ()=>{
  closeFabMenu();
  renderBasesMenuList();
  $("basesMenuOverlay").classList.remove("hidden");
};
$("btnCloseBasesMenu").onclick = ()=> $("basesMenuOverlay").classList.add("hidden");

/** Arma la lista de la Forja: una fila por cada pieza de equipo con durabilidad (puesta o en el
 *  inventario), con su barra de estado y un botón de reparar individual — más el total abajo. */
/** Pedido explícito: el Herrero (fabricar armas con materiales) vive DENTRO de la Forja de
 *  siempre, como una segunda pestaña — ya es el NPC/pantalla temáticamente correcto (repara con
 *  oro+material) y ya es accesible desde el mapa (menú ☰ → 🔨), así que no hace falta un botón
 *  nuevo ni una pantalla separada. */
let forgeActiveTab = "repair";
function renderForge(){
  gameEventBus.emit({ type: "BLACKSMITH_VISITED", payload: { amount: 1 } });
  $("btnForgeTabRepair").classList.toggle("active", forgeActiveTab==="repair");
  $("btnForgeTabCraft").classList.toggle("active", forgeActiveTab==="craft");
  $("btnRepairAll").classList.toggle("hidden", forgeActiveTab!=="repair");
  $("forgeSubText").textContent = forgeActiveTab==="repair"
    ? "Repara tu equipo gastado con oro y materiales. Nunca se rompe del todo — solo rinde menos por debajo del 10% de durabilidad."
    : "Fabrica armas exclusivas con materiales que sueltan ciertos monstruos al derrotarlos.";
  if(forgeActiveTab==="craft"){
    $("forgeTotalRow").classList.add("hidden");
    renderForgeCraftTab();
    return;
  }
  renderForgeRepairTab();
}
$("btnForgeTabRepair").onclick = ()=>{ forgeActiveTab = "repair"; renderForge(); };
$("btnForgeTabCraft").onclick = ()=>{ forgeActiveTab = "craft"; renderForge(); };

/** Nombre+ícono cortos de un material de receta, sea del mundo (wood/stone/iron/crystals, ver
 *  INV_MATERIALS) o de combate (ver CRAFT_MATERIALS) — para las etiquetas de la pestaña Fabricar. */
function materialLabelFor(key){
  const craftMat = CRAFT_MATERIALS.find(m=>m.key===key);
  if(craftMat) return {emoji:craftMat.emoji, label:craftMat.label};
  const worldMat = INV_MATERIALS.find(m=>m.key===key);
  if(worldMat) return {emoji:worldMat.emoji, label:worldMat.label};
  return {emoji:"❔", label:key};
}
/** Pestaña "Fabricar" — una fila por receta (ver BLACKSMITH_RECIPES), con cada material mostrado
 *  como "tengo/necesito" y en rojo el que falta. El botón "Forjar" se deshabilita si falta algún
 *  material o si el arma no es de tu clase — craftWeapon() vuelve a chequear todo igual (nunca
 *  confía solo en el estado del botón). */
function renderForgeCraftTab(){
  const list = $("forgeList");
  list.innerHTML = "";
  BLACKSMITH_RECIPES.forEach(recipe=>{
    const afford = canAffordRecipe(recipe);
    const wrongClass = recipe.classKey && recipe.classKey !== player.classKey;
    const matsHtml = recipe.materials.map(m=>{
      const have = resolveMaterialQty(m.key);
      const short = have < m.amount;
      const label = materialLabelFor(m.key);
      return `<span class="forge-mat-chip${short?" short":""}">${label.emoji} ${have}/${m.amount} ${label.label}</span>`;
    }).join("");
    const row = document.createElement("div");
    row.className = "inv-item";
    row.style.flexDirection = "column";
    row.style.alignItems = "stretch";
    row.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; width:100%;">
        <div class="ie">${recipe.emoji}</div>
        <div class="it" style="flex:1;">
          ${recipe.name}${wrongClass?` <small style="color:var(--danger);">(Solo ${(CLASSES[recipe.classKey]||{}).name||recipe.classKey})</small>`:""}
          <div style="font-size:10.5px; color:var(--dim); margin-top:2px;">${recipe.desc}</div>
        </div>
        <button data-act="craft" ${(!afford||wrongClass)?"disabled":""} style="width:auto; padding:6px 12px;">Forjar</button>
      </div>
      <div class="forge-mats-row">${matsHtml}</div>`;
    row.querySelector('[data-act="craft"]').onclick = ()=> craftWeapon(recipe.id);
    list.appendChild(row);
  });
}

function renderForgeRepairTab(){
  const list = $("forgeList");
  const items = allDurabilityItems();
  if(!items.length){
    list.innerHTML = `<div class="empty-note">Todavía no tienes equipo con durabilidad — consíguelo peleando o en la tienda.</div>`;
    $("forgeTotalRow").classList.add("hidden");
    return;
  }
  list.innerHTML = "";
  let totalGold = 0;
  items.forEach(item=>{
    const equipped = isItemCurrentlyEquipped(item);
    const cost = repairCostFor(item);
    const full = cost.gold<=0 && cost.resourceAmt<=0;
    if(!full) totalGold += cost.gold;
    const row = document.createElement("div");
    row.className = "inv-item";
    row.style.flexDirection = "column";
    row.style.alignItems = "stretch";
    const costLabel = full ? `<span style="color:#4fd67a;">Al 100%</span>`
      : `🪙${cost.gold}${cost.resource?` · ${cost.resourceAmt} ${RESOURCE_DISPLAY[cost.resource]||cost.resource}`:""}`;
    row.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; width:100%;">
        <div class="ie">${item.emoji}</div>
        <div class="it" style="flex:1;">${item.name}${equipped?' <small style="color:var(--accent);">(puesto)</small>':''}</div>
        <button data-act="repair" ${full?"disabled":""} style="width:auto; padding:6px 12px;">${full?"✔️":costLabel}</button>
      </div>
      ${durabilityBarHtml(item)}`;
    row.querySelector('[data-act="repair"]').onclick = ()=>{ if(repairItem(item)) renderForge(); };
    list.appendChild(row);
  });
  const totalRow = $("forgeTotalRow");
  if(totalGold>0){
    totalRow.classList.remove("hidden");
    totalRow.innerHTML = `<div class="ids-row">🧾 <div>Costo total de reparar todo: <b style="color:var(--gold);">🪙${totalGold}</b> + materiales</div></div>`;
  } else {
    totalRow.classList.add("hidden");
  }
}
$("btnForge").onclick = ()=>{
  closeFabMenu();
  renderForge();
  $("forgeOverlay").classList.remove("hidden");
};
$("btnCloseForge").onclick = ()=>{
  $("forgeOverlay").classList.add("hidden");
  returnToBaseRoomIfPending();
};
$("btnRepairAll").onclick = ()=>{ repairAllItems(); renderForge(); };

function maybeSpawnThief(){
  if(monsters.some(m=>m.isThief)) return; // ya hay uno activo
  if(Math.random() > 0.3) return;
  const pos = randOffset(55 + Math.random()*150);
  const level = player.level + 2 + Math.floor(Math.random()*3);
  const m = makeMonster(THIEF_TEMPLATE, level, pos, {special:true});
  m.isThief = true;
  monsters.push(m);
  toast("🥷 ¡Un ninja errante apareció cerca! Cuidado, te retará si te acercas demasiado.", 4200);
}

/* ============================================================
   MUNDO DINÁMICO — Mapa Vivo, Capa 2 (renderizado/interacción/persistencia; la definición de
   entidades y la planificación en sí viven en ./game/systems/dynamicWorld.js).

   Guarda su estado en player.dynamicEntities (persistido con el resto de la partida) — así el
   Mercader conserva ubicación, inventario, existencias, compras del jugador y fecha de expiración
   aunque se recargue la página, en vez de depender de un timer que se reinicie solo.
   ============================================================ */
let dynamicEntityMarkers = {}; // id -> marker (solo en memoria; se reconstruyen desde player.dynamicEntities)

/** Puntos que una entidad dinámica nueva debe evitar: POIs permanentes de esta ciudad + cualquier
 *  otra entidad dinámica ya activa — para no aparecer pegada a una fogata, torre, santuario, etc. */
function occupiedPointsForDynamicSpawn(){
  const points = [];
  (TOWERS||[]).forEach(t=> points.push({lat:t.lat, lng:t.lng}));
  (CAMPFIRES||[]).forEach(c=> points.push({lat:c.lat, lng:c.lng}));
  (SHRINES||[]).forEach(s=> points.push({lat:s.lat, lng:s.lng}));
  if(COLISEO) points.push({lat:COLISEO.lat, lng:COLISEO.lng});
  (player.dynamicEntities||[]).forEach(e=>{ if(entityStateNow(e)!=="expired") points.push({lat:e.lat, lng:e.lng}); });
  return points;
}

/** Arma el inventario rotativo del Mercader — reutiliza objetos que YA existen (exclusivos del
 *  catálogo del comerciante + un par de armas rotativas), nunca crea ítems nuevos. Con existencias
 *  limitadas y, a veces, un descuento — eso es lo que lo distingue de la tienda del menú. */
function buildWanderingMerchantInventory(){
  const forClass = ROTATING_WEAPON_POOL.filter(t=> t.classKey === player.classKey);
  const rotPick = seededPick(Math.floor(Math.random()*1e6), 2, forClass).map(t=> rotatingItemToEquip(t, "wm"+Date.now()));
  const exclusivePick = equipPoolForMyClass(EXCLUSIVE_TABLE).slice(0, 1);
  const picked = [...exclusivePick, ...rotPick];
  const entries = picked.map((item, i)=> ({
    item, stock: 1 + (i===0?1:0), perPlayerLimit: 1,
    discountPct: Math.random() < 0.4 ? 0.15 : 0, // ~40% de las veces trae un objeto con 15% de descuento
  }));
  return buildTradeInventory(entries);
}

/** El planificador: cada tanto revisa si hace falta (y conviene) que aparezca un Mercader nuevo —
 *  elige una ubicación candidata válida (lejos de POIs y de otras entidades dinámicas) y lo deja
 *  guardado en player.dynamicEntities, listo para dibujarse. */
function maybeScheduleWanderingMerchant(){
  if(!playerLatLng) return;
  const alreadyActive = (player.dynamicEntities||[]).some(e=> e.type==="wandering_merchant" && entityStateNow(e)!=="expired");
  if(alreadyActive) return;
  if(Math.random() > 0.3) return; // no siempre que se cumplen las condiciones
  const city = CITY_REGISTRY.find(c=>c.key===currentCityKey) || CITY_REGISTRY[0];
  const candidates = buildCandidateLocations(city.center.lat, city.center.lng);
  const loc = pickValidCandidateLocation(candidates, "wandering_merchant", occupiedPointsForDynamicSpawn(), distMeters);
  if(!loc) return; // por ahora todo lo cercano está ocupado — se vuelve a intentar más tarde
  const entity = createDynamicEntity("wandering_merchant", loc, {
    metadata: { inventory: buildWanderingMerchantInventory() }
  });
  if(!player.dynamicEntities) player.dynamicEntities = [];
  player.dynamicEntities.push(entity);
  saveGame();
  drawDynamicEntityMarker(entity);
  toast(`${entity.sprite} ¡Un ${entity.name} llegó cerca! Tiene objetos que no verás en la tienda del menú.`, 4400);
}

/** Revisa (cada 30s) qué entidades dinámicas ya expiraron — las quita del mapa y libera su lugar
 *  para una futura rotación. Se calcula con fechas reales, así que funciona igual recién cargada
 *  la página que llevando horas jugando. */
function pruneExpiredDynamicEntities(){
  if(!player || !player.dynamicEntities || !player.dynamicEntities.length) return;
  const before = player.dynamicEntities.length;
  const stillGoing = [];
  player.dynamicEntities.forEach(e=>{
    if(entityStateNow(e) === "expired") removeDynamicEntityMarker(e.id);
    else stillGoing.push(e);
  });
  if(stillGoing.length !== before){
    player.dynamicEntities = stillGoing;
    saveGame();
  }
}

/** Dibuja (o vuelve a dibujar) todas las entidades dinámicas activas guardadas — se llama al
 *  entrar al mapa y al cambiar de ciudad, para que el Mercader siga ahí tras recargar la página. */
function drawAllDynamicEntities(){
  Object.values(dynamicEntityMarkers).forEach(m=> m.remove());
  dynamicEntityMarkers = {};
  (player.dynamicEntities||[]).forEach(e=>{ if(entityStateNow(e)!=="expired") drawDynamicEntityMarker(e); });
}
/** Desde lejos, la entidad dinámica es solo su ícono (sin etiqueta grande) — el nombre y el tiempo
 *  restante aparecen recién cuando el jugador se acerca (vía la barra de contexto, igual que el
 *  resto de objetos del mundo). El Mercader Ambulante usa su propia ilustración (pedido explícito,
 *  reemplaza el emoji 🧙‍♂️) — mismo patrón "standee" que ya usa el Vagabundo en su marcador. */
function drawDynamicEntityMarker(entity){
  const body = entity.type === "wandering_merchant"
    ? `<div class="npc-map-standee"><img src="${WANDERING_MERCHANT_SPRITES.map}" class="mon-real-sprite npc-standee-sprite" alt=""></div>`
    : `<div class="dynamic-entity-marker">${entity.sprite}</div>`;
  const icon = L.divIcon({className:'', html:body, iconSize:[42,46], iconAnchor:[21,42]});
  const marker = L.marker([entity.lat, entity.lng], {icon, zIndexOffset:130}).addTo(map);
  marker.on('click', ()=> tryInteractDynamicEntity(entity));
  dynamicEntityMarkers[entity.id] = marker;
}
function removeDynamicEntityMarker(id){
  const m = dynamicEntityMarkers[id];
  if(m) m.remove();
  delete dynamicEntityMarkers[id];
}
/** Fuera del radio de interacción, no deja comerciar y solo avisa la distancia (mismo patrón que
 *  ya usan los santuarios) — dentro del radio, abre la vista correspondiente según su tipo. */
function tryInteractDynamicEntity(entity){
  if(!playerLatLng) return;
  if(entityStateNow(entity) === "expired"){ removeDynamicEntityMarker(entity.id); return; }
  const d = distMeters(playerLatLng, entity);
  if(d > entity.interactionRadius){ toast(`${entity.name} está a ${Math.round(d)} m — acércate (≤${entity.interactionRadius} m).`); return; }
  if(entity.interactionType === "trade") openWanderingMerchantTrade(entity);
}
/** La vista de comercio del Mercader — reutiliza el mismo overlay/estructura del comerciante de
 *  siempre, pero con inventario propio (existencias y límite por jugador) y su cuenta regresiva. */
let currentDynamicMerchant = null;
function openWanderingMerchantTrade(entity){
  currentDynamicMerchant = entity;
  $("merchantOverlay").querySelector(".title").textContent = `${entity.sprite} ${entity.name}`;
  $("merchantTimeLeft").textContent = `⏳ Disponible por ${formatEntityTimeLeft(entity)} más`;
  const buyList = $("merchantBuyList");
  buyList.innerHTML = "";
  $("merchantGoldDisplay").textContent = player.gold;
  const inventory = entity.metadata.inventory || [];
  const available = inventory.filter(entry => entry.stock > entry.purchasedByPlayer);
  if(available.length === 0){
    buyList.innerHTML = `<div class="empty-note">Ya no le queda nada — vuelve cuando aparezca otro.</div>`;
  }
  available.forEach(entry=>{
    const item = entry.item;
    const meta = equipItemMeta(item);
    const row = document.createElement("div");
    applyItemRowStyling(row, meta);
    const currency = entry.currency==="crystal" ? "💎" : "🪙";
    const playerCurrency = entry.currency==="crystal" ? (player.crystals||0) : (player.gold||0);
    const canAfford = playerCurrency >= entry.price;
    const preview = item.bonuses ? statPreviewLine(item.bonuses) : "";
    const cmpLine = comparisonLine(item);
    const stockLeft = entry.stock - entry.purchasedByPlayer;
    const discountTag = entry.discountPct>0 ? ` <b style="color:#4fd67a;">-${Math.round(entry.discountPct*100)}%</b>` : "";
    row.innerHTML = `${meta.sparkles}<div class="ie">${iconFor(item)}</div>
      <div class="it">${item.name}${meta.tag}${discountTag}<small>${item.desc}</small>${preview}${cmpLine}
        <small style="color:var(--dim);">Existencias: ${stockLeft}</small></div>
      <button ${canAfford?"":"disabled"}>${currency}${entry.price}</button>`;
    row.querySelector("button").onclick = ()=>{
      if(entityStateNow(entity)==="expired"){ toast("Ya se fue — llegó tarde."); openWanderingMerchantTrade(entity); return; }
      if(playerCurrency < entry.price) return;
      if(entry.currency==="crystal") player.crystals -= entry.price; else player.gold -= entry.price;
      entry.purchasedByPlayer += 1;
      pushItemSafe({...item});
      refreshHud(); saveGame();
      toast(`Compraste ${item.emoji} ${item.name}.`);
      openWanderingMerchantTrade(entity); // refresca existencias y estado de "puedo pagar"
    };
    buyList.appendChild(row);
  });
  $("merchantOverlay").classList.remove("hidden");
}
// (El manejador de "Cerrar" para este overlay vive más abajo, fusionado con el del NPC Comerciante —
// ambos sistemas comparten el mismo botón/overlay, ver la nota junto a openMerchantNpc.)

/* ============================================================
   EVENTOS ALEATORIOS — Mapa Vivo, Capa 3 (renderizado/interacción/combate/recompensas; los tipos,
   límites y ciclo de vida en sí viven en ./game/systems/randomEvents.js, igual que dynamicWorld.js
   para el Mundo Dinámico).

   Guarda su estado en player.worldEvents (persistido con el resto de la partida) — cada evento
   conserva ubicación, enemigos asignados, recompensa YA calculada, progreso y si la recompensa
   fue reclamada, aunque se recargue la página mientras siga activo.
   ============================================================ */
let worldEventMarkers = {}; // id -> marker (solo en memoria; se reconstruyen desde player.worldEvents)
let worldEventDiscovered = {}; // id -> true si ya se reveló (para no re-tostar el mismo aviso)
let worldEventEnemyCache = {}; // eventId -> [monstruo,...] — SOLO en memoria; nunca se persiste
                                // (guardar monstruos en vivo dentro del evento podría intentar
                                // serializar sus marcadores del mapa y romper el guardado entero)

/** Puntos que un evento nuevo debe evitar: POIs permanentes + NPCs dinámicos activos + otros
 *  eventos ya activos — para no aparecer pegado a una fogata, torre, el Mercader, etc. */
function occupiedPointsForEventSpawn(){
  const points = [];
  (TOWERS||[]).forEach(t=> points.push({lat:t.lat, lng:t.lng}));
  (CAMPFIRES||[]).forEach(c=> points.push({lat:c.lat, lng:c.lng}));
  (SHRINES||[]).forEach(s=> points.push({lat:s.lat, lng:s.lng}));
  if(COLISEO) points.push({lat:COLISEO.lat, lng:COLISEO.lng});
  (player.dynamicEntities||[]).forEach(e=>{ if(entityStateNow(e)!=="expired") points.push({lat:e.lat, lng:e.lng}); });
  (player.worldEvents||[]).forEach(e=>{ if(eventStateNow(e)==="active"||eventStateNow(e)==="engaged") points.push({lat:e.lat, lng:e.lng}); });
  return points;
}
/** Busca una posición válida para un evento nuevo: entre la distancia mínima y máxima del
 *  jugador, y lejos de todo lo que ya está ocupado. Varios intentos al azar antes de rendirse. */
function pickEventLocationNearPlayer(){
  if(!playerLatLng) return null;
  for(let i=0;i<12;i++){
    const dist = EVENT_LIMITS.minDistanceFromPlayerM + Math.random()*(EVENT_LIMITS.maxDistanceFromPlayerM-EVENT_LIMITS.minDistanceFromPlayerM);
    const pos = randOffset(dist);
    if(isEventLocationValid(pos, occupiedPointsForEventSpawn(), distMeters)) return pos;
  }
  return null;
}
/** Arma los enemigos de un evento reutilizando las plantillas de monstruo que YA existen (nunca
 *  crea enemigos nuevos) — su nivel se calibra alrededor del nivel del jugador. */
function buildEventEnemies(type, pos){
  const def = EVENT_TYPES[type];
  const pool = MONSTER_TEMPLATES;
  const mons = [];
  for(let i=0;i<def.enemyCount;i++){
    const tpl = pool[Math.floor(Math.random()*pool.length)];
    // Capa 7 (Combat Power & Difficulty Director): los eventos dinámicos sí usan el poder real
    // del jugador (equipo/mascotas/pasivas incluidos), no solo su nivel — ver docs/COMBAT_POWER.md.
    const { level } = rollCombatPowerChallenge(tpl);
    const jitterM = 8 + Math.random()*10;
    const dLat = (Math.random()*2-1) * (jitterM/111111);
    const dLng = (Math.random()*2-1) * (jitterM/(111111*Math.cos(pos.lat*Math.PI/180)));
    const m = makeMonster(tpl, level, {lat: pos.lat+dLat, lng: pos.lng+dLng});
    // los enemigos del evento no deben verse como monstruos sueltos en el mapa hasta enfrentarlo —
    // solo el ícono del propio evento (misterioso hasta descubrirlo) debe ser visible.
    if(m.marker){ m.marker.remove(); m.marker = null; }
    mons.push(m);
  }
  return mons;
}
/** El planificador: cada tanto revisa si conviene que aparezca un evento nuevo — respeta los
 *  límites centralizados (máximo activos cerca, máximo del mismo tipo, cooldown tras resolver). */
function maybeScheduleRandomEvent(){
  if(!playerLatLng || battleState || groupBattle || pvp) return;
  const active = (player.worldEvents||[]).filter(e=> eventStateNow(e)==="active" || eventStateNow(e)==="engaged");
  if(active.length >= EVENT_LIMITS.maxActiveNearPlayer) return;
  if(player.lastEventResolvedAt && Date.now()-player.lastEventResolvedAt < EVENT_LIMITS.cooldownAfterResolveMs) return;
  if(Math.random() > EVENT_LIMITS.spawnCheckChance) return;
  const types = Object.keys(EVENT_TYPES);
  const type = types[Math.floor(Math.random()*types.length)];
  const sameTypeNearby = active.filter(e=> e.type===type).length;
  if(sameTypeNearby >= EVENT_LIMITS.maxSameTypeNearby) return;
  const pos = pickEventLocationNearPlayer();
  if(!pos) return;
  const reward = rollEventReward(type);
  const ev = createWorldEvent(type, pos, {reward});
  const mons = buildEventEnemies(type, pos);
  ev.enemyIds = mons.map(m=>m.id);
  worldEventEnemyCache[ev.id] = mons; // solo en memoria — se recrean al motor de combate al enfrentarlos
  if(type === "traveler_attacked"){
    // se elige UNA vez acá (no en cada apertura del modal) para que quede fijo en player.worldEvents
    // y sobreviva a una recarga de página — los emoji son los de los enemigos reales de este evento.
    ev.metadata.travelerSprite = TRAVELER_ATTACKED_SPRITES[Math.floor(Math.random()*TRAVELER_ATTACKED_SPRITES.length)];
    ev.metadata.enemyEmojis = mons.map(m=> m.tpl.emoji);
  }
  if(!player.worldEvents) player.worldEvents = [];
  player.worldEvents.push(ev);
  saveGame();
  drawWorldEventMarker(ev);
}
/** Revisa (cada tanto) qué eventos ya expiraron — los quita del mapa y liberan su ubicación. */
function pruneExpiredWorldEvents(){
  if(!player || !player.worldEvents || !player.worldEvents.length) return;
  let changed = false;
  player.worldEvents.forEach(e=>{
    if(eventStateNow(e)==="expired" && e.state!=="expired"){
      e.state = "expired";
      removeWorldEventMarker(e.id);
      changed = true;
    }
  });
  if(changed) saveGame();
}
/** Dibuja (o vuelve a dibujar) todos los eventos activos/enganchados guardados — se llama al
 *  entrar al mapa, para que un evento en curso siga ahí tras recargar la página. */
/** Prioridad 3 (descubrimiento): el marcador de un evento ahora solo existe dentro del rango de
 *  renderizado configurado — antes se dibujaba siempre (desde que se creaba el evento), solo
 *  cambiaba de ícono según la distancia. Se llama al entrar al mapa y cada vez que el jugador
 *  se mueve. */
function drawAllWorldEvents(){
  Object.values(worldEventMarkers).forEach(m=> m.remove());
  worldEventMarkers = {};
  updateWorldEventDiscovery();
}
/** Desde lejos, un evento es solo un símbolo genérico de "algo desconocido" (❔) — recién al
 *  entrar en su radio de descubrimiento se revela su ícono y nombre reales. Nunca una etiqueta
 *  grande y permanente. */
function drawWorldEventMarker(ev){
  const def = EVENT_TYPES[ev.type];
  const discovered = !!worldEventDiscovered[ev.id];
  const icon = L.divIcon({className:'', html:`<div class="world-event-marker">${discovered?def.icon:def.unknownIcon}</div>`,
    iconSize:[40,44], iconAnchor:[20,40]});
  const marker = L.marker([ev.lat, ev.lng], {icon, zIndexOffset:125}).addTo(map);
  marker.on('click', ()=> tryInteractWorldEvent(ev));
  worldEventMarkers[ev.id] = marker;
}
function removeWorldEventMarker(id){
  const m = worldEventMarkers[id];
  if(m) m.remove();
  delete worldEventMarkers[id];
}
/** Se llama al moverse — decide (según el sistema de visibilidad) qué marcadores de evento deben
 *  existir ahora mismo, y revela el ícono real de los que ya están dentro de SU PROPIO radio de
 *  descubrimiento (más chico que el rango de renderizado del marcador en sí), avisando una sola
 *  vez con un toast. */
function updateWorldEventDiscovery(){
  if(!playerLatLng) return;
  const entries = (player.worldEvents||[]).map(ev=> ({id:ev.id, distanceM: distMeters(playerLatLng, ev), state: eventStateNow(ev), data:ev}));
  const diff = diffVisibility("world_event", entries, new Set(Object.keys(worldEventMarkers)));
  diff.toHide.forEach(id=> removeWorldEventMarker(id));
  diff.toShow.forEach(e=> drawWorldEventMarker(e.data));
  (player.worldEvents||[]).forEach(ev=>{
    if(!worldEventMarkers[ev.id] || worldEventDiscovered[ev.id]) return;
    if(distMeters(playerLatLng, ev) <= ev.discoveryRadius){
      worldEventDiscovered[ev.id] = true;
      removeWorldEventMarker(ev.id);
      drawWorldEventMarker(ev);
      const def = EVENT_TYPES[ev.type];
      toast(`${def.icon} ¡${def.label} descubierto cerca!`, 3600);
    }
  });
}
/** Al tocar un evento: fuera del radio de interacción solo avisa la distancia — dentro, muestra
 *  la acción correspondiente (con el modal del juego, nunca un confirm() nativo). */
function tryInteractWorldEvent(ev){
  if(!playerLatLng) return;
  const st = eventStateNow(ev);
  if(st==="expired"){ removeWorldEventMarker(ev.id); return; }
  if(st==="completed" || st==="failed") return;
  const def = EVENT_TYPES[ev.type];
  const d = distMeters(playerLatLng, ev);
  if(d > ev.interactionRadius){
    toast(worldEventDiscovered[ev.id] ? `${def.label} está a ${Math.round(d)} m — acércate (≤${ev.interactionRadius} m).` : `Hay algo raro cerca — acércate para descubrir qué es.`);
    return;
  }
  if(ev.type==="guarded_chest" && ev.objectives.guardiansDefeated){
    openGuardedChestReward(ev);
    return;
  }
  if(ev.type==="traveler_attacked"){
    openTravelerAttackedModal(ev);
    return;
  }
  if(def.declineLabel){
    showConfirm(`${def.description}<br><br>¿${def.actionLabel} o ${def.declineLabel.toLowerCase()}?`, ()=> engageWorldEvent(ev),
      {icon:def.icon, title:def.label, confirmLabel:def.actionLabel, cancelLabel:def.declineLabel});
  } else {
    showConfirm(def.description, ()=> engageWorldEvent(ev), {icon:def.icon, title:def.label, confirmLabel:def.actionLabel});
  }
}
/** Modal dedicado del evento "Viajero Atacado" — a diferencia del showConfirm() genérico (usado
 *  por Cofre Custodiado/Emboscada), muestra la ilustración real del viajero en apuros rodeada de
 *  los emojis de los enemigos que realmente lo acorralan (fijados una sola vez al crear el evento,
 *  ver metadata.travelerSprite/enemyEmojis en maybeScheduleRandomEvent). */
function openTravelerAttackedModal(ev){
  const def = EVENT_TYPES[ev.type];
  $("taTravelerImg").src = ev.metadata.travelerSprite || TRAVELER_ATTACKED_SPRITES[0];
  $("taDesc").textContent = def.description;
  const enemiesEl = $("taEnemies");
  enemiesEl.innerHTML = (ev.metadata.enemyEmojis||[]).map(emoji=> `<div class="ta-enemy-badge">${emoji}</div>`).join("");
  $("travelerAttackedOverlay").classList.remove("hidden");
  $("btnTaHelp").onclick = ()=>{
    $("travelerAttackedOverlay").classList.add("hidden");
    engageWorldEvent(ev);
  };
}
/** Arranca el combate del evento — reutiliza startBattle/startPackBattle tal cual, solo
 *  etiquetando la pelea con el id del evento para que winBattle/loseBattle sepan resolverlo. */
function engageWorldEvent(ev){
  ev.state = "engaged";
  saveGame();
  const mons = (worldEventEnemyCache[ev.id] && worldEventEnemyCache[ev.id].length ? worldEventEnemyCache[ev.id] : buildEventEnemies(ev.type, ev)).filter(m=>m);
  mons.forEach(m=> monsters.push(m));
  if(mons.length > 1) startPackBattle(mons, {eventId: ev.id});
  else startBattle(mons[0], {eventId: ev.id});
}
/** Al ganar el combate de un evento: el Cofre Custodiado solo desbloquea el cofre (hay que
 *  tocarlo aparte para abrirlo); Viajero Atacado y Emboscada se resuelven de una vez. */
function resolveWorldEventVictory(eventId){
  const ev = (player.worldEvents||[]).find(e=>e.id===eventId);
  if(!ev) return;
  monsters = monsters.filter(m=> !(ev.enemyIds||[]).includes(m.id));
  delete worldEventEnemyCache[ev.id];
  if(ev.type==="guarded_chest" && !ev.objectives.guardiansDefeated){
    ev.objectives.guardiansDefeated = true;
    ev.state = "active";
    saveGame();
    const marker = worldEventMarkers[ev.id];
    if(marker) marker.remove();
    drawWorldEventMarker(ev);
    toast("🔓 ¡Despejaste a los guardianes! Ahora puedes abrir el cofre.", 3800);
    return;
  }
  completeWorldEvent(ev);
}
/** Al perder (o no poder seguir) el combate de un evento: queda "failed" — no bloquea el resto
 *  del juego, simplemente ese evento en particular no se pudo resolver. */
function resolveWorldEventLoss(eventId){
  const ev = (player.worldEvents||[]).find(e=>e.id===eventId);
  if(!ev || ev.state==="completed") return;
  monsters = monsters.filter(m=> !(ev.enemyIds||[]).includes(m.id));
  delete worldEventEnemyCache[ev.id];
  ev.state = "failed";
  player.lastEventResolvedAt = Date.now();
  removeWorldEventMarker(ev.id);
  saveGame();
}
/** Entrega la recompensa YA calculada (desde que se creó el evento) — nunca se vuelve a
 *  calcular, así que recargar la página no puede darte algo distinto ni entregarla dos veces. */
function grantEventReward(ev){
  if(ev.rewardClaimed) return;
  ev.rewardClaimed = true;
  const r = ev.rewards||{};
  const parts = [];
  if(r.gold){ player.gold += r.gold; parts.push(`🪙${r.gold}`); }
  if(r.xp){ player.xp += r.xp; parts.push(`✨${r.xp} XP`); }
  if(r.wood){ player.wood = (player.wood||0)+r.wood; parts.push(`🪵${r.wood}`); }
  if(r.stone){ player.stone = (player.stone||0)+r.stone; parts.push(`🪨${r.stone}`); }
  if(r.iron){ player.iron = (player.iron||0)+r.iron; parts.push(`🔩${r.iron}`); }
  if(r.item){
    const item = rollLoot();
    pushItemSafe({...item});
    parts.push(`${item.emoji} ${item.name}`);
  }
  checkLevelUps();
  refreshHud();
  saveGame();
  toast(parts.length ? `🎁 Recompensa: ${parts.join(" · ")}` : "🎁 Evento resuelto.", 4200);
}
function completeWorldEvent(ev){
  if(ev.state==="completed") return;
  ev.state = "completed";
  player.lastEventResolvedAt = Date.now();
  removeWorldEventMarker(ev.id);
  grantEventReward(ev);
}
/** El cofre en sí, una vez despejados los guardianes — se abre aparte (como cualquier cofre del
 *  mundo), entrega su recompensa y ahí sí queda completado. */
function openGuardedChestReward(ev){
  completeWorldEvent(ev);
}

if(false){
const VAGABUNDO_TEMPLATE = {name:"Vagabundo", emoji:"🧔", tier:1, hpM:1, atkM:1, defM:1,
  mapSprite: VAGABUNDO_SPRITES.map, mapSpriteStandee: true};
const VAGABUNDO_COST = 40; // oro que pide a cambio de ayudarte a recordar un movimiento
}

/* ---------- Sistema de misiones: NPCs que piden traer un ítem de un monstruo específico ---------- */
if(false){
const QUEST_TEMPLATES = [
  {id:"q_spider_eye", npcName:"Alquimista Ambulante", npcEmoji:"🧪", monsterName:"Araña Gigante", itemName:"Ojo de Araña", itemEmoji:"👁️", rewardGold:80, rewardXp:70, flavor:"Necesito un ojo de araña fresco para mis pociones."},
  {id:"q_wolf_fang", npcName:"Cazador Solitario", npcEmoji:"🏹", monsterName:"Lobo Umbrío", itemName:"Colmillo de Lobo Umbrío", itemEmoji:"🦷", rewardGold:70, rewardXp:60, flavor:"Ese lobo me ha estado robando el ganado. Tráeme prueba de que lo enfrentaste."},
  {id:"q_golem_core", npcName:"Erudito Errante", npcEmoji:"📜", monsterName:"Golem de Roca", itemName:"Núcleo de Golem", itemEmoji:"🪨", rewardGold:100, rewardXp:90, flavor:"Estudio la magia que anima a los golems. Su núcleo es justo lo que necesito."},
  {id:"q_demon_horn", npcName:"Exorcista Viajero", npcEmoji:"⛪", monsterName:"Demonio Menor", itemName:"Cuerno de Demonio", itemEmoji:"👹", rewardGold:90, rewardXp:80, flavor:"Ese demonio ha estado asustando a los vecinos. Tráeme su cuerno como prueba."},
  {id:"q_ghost_essence", npcName:"Médium Errante", npcEmoji:"🔮", monsterName:"Espectro", itemName:"Esencia Espectral", itemEmoji:"✨", rewardGold:75, rewardXp:65, flavor:"Un espíritu inquieto ronda por aquí. Ayúdame a liberarlo de su esencia."},
];
}
/** Busca en qué zona de Neiva vive el monstruo que pide esta misión (ahí es donde hay que ir). */
function findZoneForMonster(monsterName){
  return NEIVA_ZONES.find(z=> z.monsterNames.includes(monsterName));
}

function maybeSpawnQuestNpc(){
  if(player.level <= 10) return; // en niveles bajos solo se ofrecen las misiones tutorial (cerca, de matar monstruos)
  if(activeQuest) return; // ya tiene una misión activa, no le ofrecen otra hasta que la resuelva
  if(monsters.some(m=>m.isQuestNpc)) return;
  if(Math.random() > 0.18) return;
  const template = QUEST_TEMPLATES[Math.floor(Math.random()*QUEST_TEMPLATES.length)];
  const zone = findZoneForMonster(template.monsterName);
  if(!zone) return; // por seguridad, si algún monstruo no está asignado a ninguna zona
  const pos = randOffset(45 + Math.random()*140);
  const tpl = {name:template.npcName, emoji:template.npcEmoji, tier:1, hpM:1, atkM:1, defM:1};
  // Pedido explícito: ilustración real en vez del emoji 🏹 para el Cazador Solitario, mismo
  // criterio "standee" que el Veterano — el resto de los NPC de misión siguen con su emoji, no
  // hay arte propia todavía para ellos.
  if(template.id === "q_wolf_fang"){
    tpl.mapSprite = CAZADOR_SPRITES.map;
    tpl.mapSpriteStandee = true;
  }
  const m = makeMonster(tpl, player.level, pos, {special:true});
  m.isQuestNpc = true;
  m.questTemplate = template;
  monsters.push(m);
  toast(`${template.npcEmoji} ${template.npcName} apareció cerca... parece tener una misión para ti.`, 4200);
}

/** Misión tutorial para niveles bajos (Nv.1-10): un veterano te pide derrotar unos pocos enemigos
 *  (cualquiera, o de un tipo específico), sin tener que viajar a ningún lado — solo para que
 *  conozcas el sistema de misiones. */
if(false){
const TUTORIAL_QUEST_TEMPLATES = [
  { id:"q_tutorial_any3", npcName:"Veterano de Neiva", npcEmoji:"🧓", type:"kill_count", killGoal:3, monsterName:null,
    flavor:"Todo aventurero de Neiva empieza igual: demuestra que puedes cuidarte solo por ahí afuera.",
    rewardGold:50, rewardXp:40 },
  { id:"q_tutorial_ghost5", npcName:"Veterano de Neiva", npcEmoji:"🧓", type:"kill_count", killGoal:5, monsterName:"Espectro",
    flavor:"Hay demasiados fantasmas rondando el centro. Derrota a 5 Espectros y la gente podrá dormir tranquila.",
    rewardGold:65, rewardXp:55 },
  { id:"q_tutorial_rat4", npcName:"Veterano de Neiva", npcEmoji:"🧓", type:"kill_count", killGoal:4, monsterName:"Rata Mutante",
    flavor:"Hay una plaga de ratas mutantes cerca. Derrota a 4 y de paso practicas.",
    rewardGold:55, rewardXp:45 },
];
}
function maybeSpawnTutorialQuestNpc(){
  if(player.level > 10 || player.hasDoneTutorialQuest) return; // solo para empezar, y solo una vez
  if(activeQuest) return;
  if(monsters.some(m=>m.isQuestNpc)) return;
  if(Math.random() > 0.35) return; // más frecuente que las misiones normales, para que lo encuentre pronto
  const zone = getCurrentZone();
  // solo se ofrece una misión de un monstruo ESPECÍFICO ("mata 4 Ratas") si ese monstruo de
  // verdad puede aparecer en la zona donde estás parado ahora — antes se sorteaba entre las 3
  // plantillas sin mirar la zona, y podías terminar con una misión de un monstruo que no tiene
  // ninguna chance de aparecer cerca (ver monsterNames por zona en world.js).
  const eligible = TUTORIAL_QUEST_TEMPLATES.filter(t=> !t.monsterName || !zone || zone.monsterNames.includes(t.monsterName));
  const pool = eligible.length ? eligible : TUTORIAL_QUEST_TEMPLATES;
  const template = pool[Math.floor(Math.random()*pool.length)];
  const pos = randOffset(35 + Math.random()*80); // más cerca, para que sea fácil de encontrar
  // Pedido explícito: ilustración real en vez del emoji 🧓, mismo criterio "standee" que el Vagabundo.
  const tpl = {name:template.npcName, emoji:template.npcEmoji, tier:1, hpM:1, atkM:1, defM:1,
    mapSprite: VETERANO_SPRITES.map, mapSpriteStandee: true};
  const m = makeMonster(tpl, player.level, pos, {special:true});
  m.isQuestNpc = true;
  m.isTutorialQuestNpc = true; // distingue al Veterano del resto de los NPC de misión (mismo isQuestNpc)
  m.questTemplate = template;
  monsters.push(m);
  toast(`${template.npcEmoji} ${template.npcName} apareció cerca... parece tener un consejo para ti.`, 4200);
}

/** Cuenta una derrota hacia una misión tutorial "kill_count" activa (si aplica). Se llama desde
 *  winBattle/packWinBattle cada vez que un monstruo cae. */
function registerQuestKill(monsterTplName){
  if(!activeQuest || activeQuest.template.type !== "kill_count") return;
  if(activeQuest.template.monsterName && activeQuest.template.monsterName !== monsterTplName) return;
  activeQuest.killProgress = Math.min(activeQuest.killGoal, (activeQuest.killProgress||0) + 1);
  renderQuestTracker();
  if(activeQuest.killProgress >= activeQuest.killGoal){
    toast(`📜 ¡Ya derrotaste a los enemigos que te pidieron! Entrega la misión cuando quieras.`, 3500);
    refreshQuestTargetHighlights(); // meta cumplida: se apaga el anillo dorado de los que quedan en el mapa
  }
}

/** ¿`tplName` es el monstruo objetivo de una misión "derrota N X" activa y todavía sin completar?
 *  Usado tanto al crear un marcador nuevo (makeMonster) como para resaltar retroactivamente los
 *  que ya estaban puestos en el mapa (refreshQuestTargetHighlights). */
function isQuestTargetTpl(tplName){
  if(!activeQuest || !activeQuest.template || activeQuest.template.type !== "kill_count") return false;
  const t = activeQuest.template;
  if(!t.monsterName || t.monsterName !== tplName) return false;
  return (activeQuest.killProgress||0) < activeQuest.killGoal;
}

/** Agrega/quita el anillo dorado de "objetivo de misión" en los monstruos YA puestos en el mapa —
 *  para que no haga falta esperar un respawn nuevo cuando aceptas, completas o cancelas una
 *  misión de matar cierto tipo de enemigo. */
function refreshQuestTargetHighlights(){
  monsters.forEach(m=>{
    const el = m.marker && m.marker.getElement && m.marker.getElement();
    const ringWrap = el && el.querySelector(".ring-tilt-wrap");
    if(!ringWrap) return;
    const existing = ringWrap.querySelector(".quest-target-ring");
    const should = !m.isBoss && isQuestTargetTpl(m.tpl.name);
    if(should && !existing){
      const div = document.createElement("div");
      div.className = "quest-target-ring";
      ringWrap.appendChild(div);
    } else if(!should && existing){
      existing.remove();
    }
  });
}

/** Abre el modal del NPC de misión (con la distancia mínima de siempre). */
/** Encuentra el parque más cercano a tu posición actual — las misiones ahora te llevan
 *  como mucho a un parque cercano, nunca al otro lado de la ciudad. */
function findNearestPark(){
  if(!playerLatLng) return NEIVA_PARKS[0];
  let best = NEIVA_PARKS[0], bestD = distMeters(playerLatLng, NEIVA_PARKS[0]);
  NEIVA_PARKS.forEach(p=>{
    const d = distMeters(playerLatLng, p);
    if(d < bestD){ best = p; bestD = d; }
  });
  return best;
}

function openQuestNpcModal(mon){
  const d = distMeters(playerLatLng, mon);
  if(d > ENGAGE_RANGE_M){ toast(`${mon.tpl.name} está a ${Math.round(d)} m — acércate (≤100 m).`); return; }
  const t = mon.questTemplate;
  $("questNpcEmoji").textContent = t.npcEmoji;
  $("questNpcName").textContent = t.npcName;
  $("questNpcFlavor").textContent = t.flavor;
  if(t.type === "kill_count"){
    $("questNpcDetail").textContent = t.monsterName
      ? `Derrota a ${t.killGoal} ${t.monsterName}(s) y vuelve a avisarme.`
      : `Derrota a ${t.killGoal} enemigos cualquiera (en cualquier lugar) y vuelve a avisarme.`;
    $("questNpcOverlay").classList.remove("hidden");
    $("btnQuestAccept").onclick = ()=>{
      $("questNpcOverlay").classList.add("hidden");
      acceptTutorialQuest(mon, t);
    };
    $("btnQuestDecline").onclick = ()=> $("questNpcOverlay").classList.add("hidden");
    return;
  }
  const park = findNearestPark();
  $("questNpcDetail").textContent = `Ve a ${park.name} y tráeme: ${t.itemEmoji} ${t.itemName} (de un ${t.monsterName})`;
  $("questNpcOverlay").classList.remove("hidden");
  $("btnQuestAccept").onclick = ()=>{
    $("questNpcOverlay").classList.add("hidden");
    acceptQuest(mon, t, park);
  };
  $("btnQuestDecline").onclick = ()=> $("questNpcOverlay").classList.add("hidden");
}

/** Acepta la misión tutorial (sin ruta ni viaje — solo cuenta derrotas mientras esté activa). */
function acceptTutorialQuest(npcMon, template){
  activeQuest = { template, killGoal: template.killGoal, killProgress: 0 };
  map.removeLayer(npcMon.marker);
  monsters = monsters.filter(m=>m.id!==npcMon.id);
  renderQuestTracker();
  refreshQuestTargetHighlights();
  const targetLabel = template.monsterName ? `${template.killGoal} ${template.monsterName}(s)` : `${template.killGoal} enemigos cualquiera`;
  toast(`📜 Misión aceptada: derrota a ${targetLabel}.`, 4200);
  saveGame();
}

/** Acepta la misión: marca el destino (un parque cercano) en el mapa con una ruta, y quita al NPC. */
function acceptQuest(npcMon, template, park){
  activeQuest = { template, destName: park.name, destLat: park.lat, destLng: park.lng, itemObtained:false, targetSpawned:false, targetMonId:null };
  map.removeLayer(npcMon.marker);
  monsters = monsters.filter(m=>m.id!==npcMon.id);
  drawQuestRoute();
  renderQuestTracker();
  gameEventBus.emit({ type: "NPC_INTERACTED", payload: { amount: 1 }, dedupeKey: npcMon.id });
  toast(`📜 Misión aceptada: consigue ${template.itemEmoji} ${template.itemName} en ${park.name}.`, 4500);
  saveGame();
  // si estás en grupo, invita a tus compañeros a la misma misión (cada quien consigue su propio ítem)
  if(party && pubnub){
    pubnub.publish({channel: partyChannel(party.id), storeInHistory:false,
      message:{type:'quest_share', fromId:myPlayerId, fromName:player.name, templateId:template.id,
        destName:park.name, destLat:park.lat, destLng:park.lng}});
  }
}

/** Un compañero de grupo aceptó una misión y te invita a hacerla también (cada quien consigue su propio ítem). */
function handleQuestShare(msg){
  if(msg.fromId === myPlayerId || activeQuest) return; // ya tienes una misión activa, o es tu propio aviso
  const template = QUEST_TEMPLATES.find(t=>t.id===msg.templateId);
  if(!template) return;
  const notifId = addPendingNotification({
    emoji: template.npcEmoji, title: "Misión de grupo",
    sub: `${msg.fromName} está haciendo: ve a ${msg.destName} y trae ${template.itemEmoji} ${template.itemName}. ¿Te unes?`,
    onAccept: ()=>{
      activeQuest = { template, destName: msg.destName, destLat: msg.destLat, destLng: msg.destLng, itemObtained:false, targetSpawned:false, targetMonId:null };
      drawQuestRoute();
      renderQuestTracker();
      toast(`📜 Te unes a la misión: consigue ${template.itemEmoji} ${template.itemName} en ${msg.destName}.`, 4500);
      saveGame();
    }
  });
  $("noticeEmoji").textContent = template.npcEmoji;
  $("noticeTitle").textContent = "¡Misión de grupo!";
  $("noticeSub").textContent = `${msg.fromName} está haciendo: ve a ${msg.destName} y trae ${template.itemEmoji} ${template.itemName}. ¿Te unes?`;
  $("noticeActions").innerHTML = `<button class="primarybtn" id="btnAcceptQuestShare" style="margin-bottom:8px;">📜 Unirme</button>
    <button class="ghostbtn" id="btnDeclineQuestShare" style="margin-bottom:8px;">No, gracias</button>`;
  $("noticeOverlay").classList.remove("hidden");
  $("btnAcceptQuestShare").onclick = ()=>{
    $("noticeOverlay").classList.add("hidden");
    const notif = pendingNotifications.find(n=>n.id===notifId);
    removePendingNotification(notifId);
    if(notif) notif.onAccept();
  };
  $("btnDeclineQuestShare").onclick = ()=>{
    $("noticeOverlay").classList.add("hidden");
    removePendingNotification(notifId);
  };
}

let _questRouteFetchedAt = 0;
let _questRouteFetching = false;
/** Dibuja/actualiza la línea de ruta desde tu posición hasta el destino de la misión.
 *  Intenta trazar la ruta REAL siguiendo calles (vía un servicio público de rutas a pie);
 *  si no hay internet o el servicio falla, usa una línea recta como respaldo para que nunca se rompa. */
function drawQuestRoute(){
  if(!activeQuest) return;
  if(activeQuest.destMarker) map.removeLayer(activeQuest.destMarker);
  activeQuest.destMarker = L.marker([activeQuest.destLat, activeQuest.destLng],
    {icon: L.divIcon({className:'', html:`<div class="quest-dest-marker">📍</div>`, iconSize:[36,36], iconAnchor:[18,32]})}).addTo(map);
  if(!playerLatLng) return;

  const removeRouteLayers = ()=>{
    if(activeQuest.routeCasing) map.removeLayer(activeQuest.routeCasing);
    if(activeQuest.routeLine) map.removeLayer(activeQuest.routeLine);
  };
  /** Dibuja la ruta como una línea DOBLE (un forro oscuro grueso por debajo + una línea de color vivo encima),
   *  igual que en apps de navegación reales — así resalta mucho más sobre el mapa. */
  const drawRoute = (coords)=>{
    removeRouteLayers();
    activeQuest.routeCasing = L.polyline(coords, {color:"#0a0e16", weight:9, opacity:.55, lineCap:"round", lineJoin:"round"}).addTo(map);
    activeQuest.routeLine = L.polyline(coords, {color:"#ff5a36", weight:5, opacity:1, lineCap:"round", lineJoin:"round"}).addTo(map);
  };
  const drawStraightFallback = ()=>{
    removeRouteLayers();
    const coords = [[playerLatLng.lat,playerLatLng.lng],[activeQuest.destLat,activeQuest.destLng]];
    activeQuest.routeCasing = L.polyline(coords, {color:"#0a0e16", weight:9, opacity:.55, lineCap:"round", lineJoin:"round"}).addTo(map);
    activeQuest.routeLine = L.polyline(coords, {color:"#ff5a36", weight:5, opacity:1, dashArray:"10,10", lineCap:"round", lineJoin:"round"}).addTo(map);
  };

  // no golpea el servicio de rutas en cada micro-movimiento — solo cada ~15s o si no hay ruta trazada aún
  const now = Date.now();
  if(_questRouteFetching || (activeQuest.routeLine && now - _questRouteFetchedAt < 15000)) return;
  _questRouteFetching = true;
  const url = `https://router.project-osrm.org/route/v1/foot/${playerLatLng.lng},${playerLatLng.lat};${activeQuest.destLng},${activeQuest.destLat}?overview=full&geometries=geojson`;
  fetch(url).then(r=>r.json()).then(data=>{
    _questRouteFetching = false;
    _questRouteFetchedAt = Date.now();
    if(!activeQuest) return; // se pudo haber cancelado/entregado mientras esperábamos la respuesta
    if(data && data.routes && data.routes[0]){
      const coords = data.routes[0].geometry.coordinates.map(c=>[c[1],c[0]]);
      drawRoute(coords);
    } else {
      drawStraightFallback();
    }
  }).catch(()=>{
    _questRouteFetching = false;
    if(activeQuest && !activeQuest.routeLine) drawStraightFallback(); // sin internet/servicio caído: mejor una línea recta que nada
  });
}

/** Actualiza (o crea) el panel flotante que muestra el progreso de la misión activa. */
function renderQuestTracker(){
  const el = $("questTracker");
  if(!activeQuest){ el.classList.add("hidden"); return; }
  el.classList.remove("hidden");
  const t = activeQuest.template;
  $("qtEmoji").textContent = t.npcEmoji;
  $("qtTitle").textContent = t.npcName;
  if(t.type === "kill_count"){
    const ready = activeQuest.killProgress >= activeQuest.killGoal;
    $("qtSub").textContent = ready
      ? `✅ ¡Derrotaste ${activeQuest.killGoal} enemigos! Entrégalo.`
      : `Derrota enemigos: ${activeQuest.killProgress}/${activeQuest.killGoal}`;
    $("btnQuestTurnIn").classList.toggle("hidden", !ready);
    return;
  }
  $("qtSub").textContent = activeQuest.itemObtained
    ? `✅ Tienes ${t.itemEmoji} ${t.itemName} — ¡entrégalo!`
    : `Ve a ${activeQuest.destName} y consigue ${t.itemEmoji} ${t.itemName}`;
  $("btnQuestTurnIn").classList.toggle("hidden", !activeQuest.itemObtained);
}
$("btnQuestTurnIn").onclick = ()=> completeQuest();

/** Pide confirmar antes de cancelar (avisa si vas a perder el ítem ya conseguido). */
function promptCancelQuest(){
  if(!activeQuest) return;
  const t = activeQuest.template;
  $("cancelQuestEmoji").textContent = t.npcEmoji;
  $("cancelQuestSub").textContent = activeQuest.itemObtained
    ? `Vas a perder ${t.itemEmoji} ${t.itemName}, que ya habías conseguido. Puedes retomar una misión parecida más adelante.`
    : `No perderás nada — puedes retomar una misión parecida más adelante.`;
  $("cancelQuestOverlay").classList.remove("hidden");
  $("btnConfirmCancelQuest").onclick = ()=>{
    $("cancelQuestOverlay").classList.add("hidden");
    cancelQuest();
  };
  $("btnKeepQuest").onclick = ()=> $("cancelQuestOverlay").classList.add("hidden");
}
$("btnQuestCancel").onclick = promptCancelQuest;

/** Cancela la misión activa: si ya tenías el ítem, desaparece; el NPC "entiende" y podrás intentarlo luego. */
function cancelQuest(){
  if(!activeQuest) return;
  const t = activeQuest.template;
  if(activeQuest.itemObtained){
    const idx = player.inventory.findIndex(it=>it.questId===t.id);
    if(idx>=0) player.inventory.splice(idx,1);
  }
  if(activeQuest.routeCasing) map.removeLayer(activeQuest.routeCasing);
  if(activeQuest.routeLine) map.removeLayer(activeQuest.routeLine);
  if(activeQuest.destMarker) map.removeLayer(activeQuest.destMarker);
  activeQuest = null;
  renderQuestTracker();
  refreshQuestTargetHighlights();
  refreshHud();
  saveGame();
  toast(`${t.npcEmoji} ${t.npcName}: "Vale, no pasa nada. Lo haré cuando pueda."`, 4500);
}

/** Cuando te acercas al destino de la misión, aparece (garantizado) el monstruo objetivo, si aún no lo has enfrentado. */
function checkQuestProximity(){
  if(!activeQuest || activeQuest.itemObtained || activeQuest.targetSpawned || !playerLatLng || activeQuest.destLat==null) return;
  const d = distMeters(playerLatLng, {lat:activeQuest.destLat, lng:activeQuest.destLng});
  if(d > 220) return; // todavía no llega
  const tpl = MONSTER_TEMPLATES.find(t=>t.name===activeQuest.template.monsterName);
  if(!tpl) return;
  const level = player.level + 1;
  const pos = randOffset(60 + Math.random()*80);
  const mon = makeMonster(tpl, level, pos, {special:true});
  mon.isQuestTarget = true;
  monsters.push(mon);
  activeQuest.targetSpawned = true;
  activeQuest.targetMonId = mon.id;
  toast(`⚠️ ¡Sientes la presencia de un ${tpl.name} cerca! Es lo que buscabas.`, 4000);
}

/** Entrega la misión: quita el ítem del inventario, da la recompensa, limpia el estado. */
function completeQuest(){
  if(!activeQuest) return;
  const t = activeQuest.template;
  const ready = t.type==="kill_count" ? activeQuest.killProgress >= activeQuest.killGoal : activeQuest.itemObtained;
  if(!ready) return;
  if(t.type !== "kill_count"){
    const idx = player.inventory.findIndex(it=>it.questId===t.id);
    if(idx>=0) player.inventory.splice(idx,1);
  }
  if(t.type === "kill_count") player.hasDoneTutorialQuest = true;
  player.gold += t.rewardGold;
  player.xp += t.rewardXp;
  if(activeQuest.routeCasing) map.removeLayer(activeQuest.routeCasing);
  if(activeQuest.routeLine) map.removeLayer(activeQuest.routeLine);
  if(activeQuest.destMarker) map.removeLayer(activeQuest.destMarker);
  activeQuest = null;
  renderQuestTracker();
  refreshQuestTargetHighlights();
  refreshHud();
  checkLevelUps();
  toast(`🎉 Misión completada: +${t.rewardGold} 💰 · +${t.rewardXp} XP`, 4000);
  saveGame();
}


function maybeSpawnVagabundo(){
  if(monsters.some(m=>m.isVagabundo)) return; // ya hay uno activo
  if(Math.random() > 0.12) return; // más raro que el comerciante
  const pos = randOffset(45 + Math.random()*140);
  // Ilustración real en vez del emoji 🧔 en el marcador del mapa — mismo criterio "standee" que el
  // Veterano/Cazador (ver VAGABUNDO_SPRITES en spriteRegistry.js, ya se usaba para el retrato del
  // modal pero no para el marcador). Copia superficial en vez de mutar VAGABUNDO_TEMPLATE directo,
  // que es el import compartido — no hace falta tocarlo para el resto de usos.
  const tpl = {...VAGABUNDO_TEMPLATE, mapSprite: VAGABUNDO_SPRITES.map, mapSpriteStandee: true};
  const m = makeMonster(tpl, player.level, pos, {special:true});
  m.isVagabundo = true;
  monsters.push(m);
  toast("🧔 Un vagabundo apareció cerca... parece necesitar unas monedas.", 4200);
}

if(false){
const BOSS_LIFESPAN_MS = 5 * 60000; // el jefe solo dura 5 minutos en el mapa
}

/** Jefe de zona: aparece cada cierto tiempo, mucho más fuerte, dura solo 5 minutos. */
function maybeSpawnBoss(){
  if(monsters.some(m=>m.isBoss)) return; // ya hay uno activo
  if(Math.random() > 0.5) return;
  const tpl = BOSS_TEMPLATES[Math.floor(Math.random()*BOSS_TEMPLATES.length)];
  const levelOffset = Math.floor(Math.random()*9) - 2; // de -2 a +6 respecto a tu nivel
  const level = Math.max(1, player.level + levelOffset);
  const pos = randOffset(60 + Math.random()*160);
  const mon = makeMonster(tpl, level, pos, {boss:true, lifespanMsOverride: BOSS_LIFESPAN_MS});
  monsters.push(mon);
  const tier = bossDifficultyTier(level);
  const tierEmoji = tier==="red" ? "🔴" : tier==="orange" ? "🟠" : "🟢";
  toast(`${tierEmoji} ¡${tpl.name} (Nv.${level}) apareció cerca! Disponible por 5 minutos.`, 5000);
}

/** Actualiza la cuenta regresiva sobre cada jefe activo en el mapa; lo retira si ya expiró. */
function updateBossTimers(){
  const now = Date.now();
  monsters.filter(m=>m.isBoss).forEach(m=>{
    const remaining = Math.max(0, m.spawnedAt + m.lifespanMs - now);
    const el = document.getElementById("bossTimer-"+m.id);
    if(el){
      const mins = Math.floor(remaining/60000);
      const secs = Math.floor((remaining%60000)/1000);
      el.textContent = `${mins}:${secs<10?"0":""}${secs}`;
    }
  });
  renderNearbyBossPanel();
}

/** Lista flotante (lado derecho) de los jefes con tiempo límite que tienes cerca, con cuánto
 *  les queda y a qué distancia están — tócalos para que la cámara se centre justo ahí. */
const NEARBY_BOSS_RADIUS_M = 600;
function renderNearbyBossPanel(){
  const panel = $("nearbyBossPanel");
  if(!panel || !playerLatLng) return;
  const now = Date.now();
  const nearby = monsters.filter(m=> m.isBoss && m.lifespanMs)
    .map(m=>({m, dist: distMeters(playerLatLng, m), remaining: Math.max(0, m.spawnedAt+m.lifespanMs-now)}))
    .filter(x=> x.dist <= NEARBY_BOSS_RADIUS_M && x.remaining > 0)
    .sort((a,b)=> a.dist-b.dist)
    .slice(0, 5);
  panel.innerHTML = nearby.map(({m,dist,remaining})=>{
    const mins = Math.floor(remaining/60000), secs = Math.floor((remaining%60000)/1000);
    return `<div class="nearby-boss-chip" data-mon-id="${m.id}">
      <div class="nbc-name">👑 ${m.tpl.name}</div>
      <div class="nbc-meta"><span>${dist.toFixed(0)}m</span><span>⏱️${mins}:${secs<10?"0":""}${secs}</span></div>
    </div>`;
  }).join("");
  panel.querySelectorAll(".nearby-boss-chip").forEach(chip=>{
    chip.onclick = ()=>{
      const mon = monsters.find(m=>m.id===chip.dataset.monId);
      if(mon) map.setView([mon.lat, mon.lng], Math.max(map.getZoom(), DEFAULT_ZOOM));
    };
  });
}

function distMeters(a,b){
  const R=6371000;
  const dLat=(b.lat-a.lat)*Math.PI/180, dLng=(b.lng-a.lng)*Math.PI/180;
  const s = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(s));
}

function makeMonster(tpl, level, pos, opts){
  opts = opts || {};
  const hp = Math.round((18 + level*12) * tpl.hpM);
  const atk = +((1.5 + level*2.8) * tpl.atkM).toFixed(1);
  const def = +((3 + level*1.9) * tpl.defM).toFixed(1);
  const spd = 4 + Math.floor(level*0.6);
  const id = "m"+Math.random().toString(36).slice(2,9);
  const lvlClass = (opts.boss ? "special" : opts.special ? "special" : (opts.pack ? "pack" : "")) + (opts.dangerZone ? " danger" : "");
  const isThiefTpl = tpl === THIEF_TEMPLATE;
  let ring = tpl.aggressive ? `<div class="magic-circle"></div><div class="aggro-ring"></div>` : (opts.special ? `<div class="special-npc-glow"></div>` : "");
  // Zona Peligrosa: anillo rojo pulsante adicional, para que se note de lejos que ESTE enemigo
  // viene escalado por Combat Power (rollDangerZoneChallenge), no por el nivel plano de siempre.
  if(opts.dangerZone && !opts.boss) ring += `<div class="danger-zone-ring"></div>`;
  // Objetivo de misión activa ("derrota N Ratas"): anillo dorado adicional para que resalte entre
  // el resto de monstruos de la zona — pedido explícito, ver también refreshQuestTargetHighlights().
  if(!opts.boss && isQuestTargetTpl(tpl.name)) ring += `<div class="quest-target-ring"></div>`;
  let timerHtml = "";
  if(opts.boss){
    const tier = bossDifficultyTier(level);
    ring = `<div class="boss-ground-glow boss-ground-glow-${tier}"></div><div class="boss-aura boss-aura-${tier}"></div>`;
    timerHtml = `<div class="boss-timer" id="bossTimer-${id}">5:00</div>`;
  }
  // el arte real del marcador (en vez del emoji genérico) usa mapSprite si la plantilla lo trae —
  // mismo mecanismo que ya existía SOLO para el Ladrón (isThiefTpl), generalizado acá para que
  // cualquier plantilla nueva (como el Demonio Oscuro) pueda traer su propia ilustración sin
  // tener que agregar otro caso especial hardcodeado por identidad.
  const bodyHtml = isThiefTpl
    ? `<div class="thief-map-wrap"><img src="${THIEF_SPRITES.map}" class="mon-real-sprite thief-map-sprite" alt=""></div>`
    : (tpl.mapSprite && tpl.mapSpriteStandee)
    ? `<div class="npc-map-standee"><img src="${tpl.mapSprite}" class="mon-real-sprite npc-standee-sprite" alt=""></div>`
    : tpl.mapSprite
    ? `<img src="${tpl.mapSprite}" class="mon-real-sprite" alt="">`
    : `<div class="mon-emoji" style="${opts.boss?'font-size:34px;':''}">${tpl.emoji}</div>`;
  const icon = L.divIcon({className:'', html:`<div class="mon-marker ${opts.boss?'mon-marker-fixed':''}" style="position:relative;">${timerHtml}<div class="ring-tilt-wrap">${ring}</div>${bodyHtml}<div class="mon-lvl ${lvlClass}">Nv.${level}</div></div>`,
    iconSize:[58,62], iconAnchor:[29,42]});
  const marker = L.marker([pos.lat,pos.lng], {icon, zIndexOffset: opts.boss ? 900 : 500}).addTo(map);
  const lifespanMs = opts.lifespanMsOverride || ((5 + Math.random()*2) * 60000); // 5-7 min normal, o el valor fijo del jefe
  const mon = {id, tpl, level, hp, maxHp:hp, atk, def, spd, lat:pos.lat, lng:pos.lng, marker,
    packBonus: opts.pack ? 1.5 : 1, packId: opts.packId || null, ambushed:false, isBoss: !!opts.boss,
    envSpawn: !!opts.envSpawn, spawnedAt: Date.now(), lifespanMs};
  marker.on('click', (e)=>{
    L.DomEvent.stopPropagation(e); // por si acaso, que nunca se cuele como un toque para mover al jugador
    if(mon.isMerchant) openMerchantNpc(mon);
    else if(mon.isVagabundo) openVagabundoNpc(mon);
    else if(mon.isQuestNpc) openQuestNpcModal(mon);
    else if(mon.isBoss) openBossInfoModal(mon);
    else tryEngage(mon);
  });
  return mon;
}

/** Verde = igual o más débil que tú, naranja = moderadamente más fuerte, rojo = mucho más fuerte. */
function bossDifficultyTier(bossLevel){
  const diff = bossLevel - (player ? player.level : 1);
  if(diff <= 0) return "green";
  if(diff <= 4) return "orange";
  return "red";
}

function tryEngage(mon){
  if(pvp || groupBattle){ toast("Estás en un duelo — termínalo antes de pelear contra monstruos."); return; }
  const d = distMeters(playerLatLng, mon);
  if(d > ENGAGE_RANGE_M){
    toast(`Está a ${Math.round(d)} m — acércate para combatir (≤100 m).`);
    return;
  }
  if(party && party.members.length > 1){
    if(party.leaderId !== myPlayerId){
      toast("Solo el líder del grupo puede iniciar un combate conjunto.", 3500);
      return;
    }
    startGroupEncounter(mon);
    return;
  }
  if(mon.packId){
    const packMons = monsters.filter(m=>m.packId===mon.packId);
    startPackBattle(packMons);
    return;
  }
  startBattle(mon);
}

/** Ventana entre que aparece el "!" arriba de un enemigo agresivo y que la emboscada se resuelve
 *  de verdad — le da al jugador un instante para verlo venir (y, si se aleja a tiempo, escapar)
 *  en vez de que el combate arranque de golpe sin aviso. */
const AMBUSH_TELEGRAPH_MS = 650;
/** Mismo lenguaje visual que showPackAttackTelegraph() (pantalla de batalla en manada), pero
 *  colgado del marcador del monstruo EN EL MAPA — así se ve claramente cuál enemigo está a punto
 *  de saltarte antes de que la emboscada por proximidad (checkAmbush) se resuelva. */
function showMapAttackTelegraph(mon){
  const el = mon.marker && mon.marker.getElement && mon.marker.getElement();
  const wrap = el && el.querySelector(".mon-marker");
  if(!wrap || wrap.querySelector(".map-attack-telegraph")) return;
  const badge = document.createElement("div");
  badge.className = "map-attack-telegraph";
  badge.textContent = "!";
  wrap.appendChild(badge);
}
function hideMapAttackTelegraph(mon){
  const el = mon.marker && mon.marker.getElement && mon.marker.getElement();
  const badge = el && el.querySelector(".map-attack-telegraph");
  if(badge) badge.remove();
}
/** La emboscada que está ahora mismo en la ventana del "!" (si hay una) — solo puede haber una a
 *  la vez (mismo criterio de "solo un combate a la vez" que ya tenía checkAmbush). */
let pendingAmbush = null; // {packMons, timeoutId}
function cancelPendingAmbush(){
  if(!pendingAmbush) return;
  clearTimeout(pendingAmbush.timeoutId);
  pendingAmbush.packMons.forEach(mm=>{ mm.telegraphing = false; hideMapAttackTelegraph(mm); });
  pendingAmbush = null;
}
/** Cualquier monstruo real de mapa (no un NPC especial ni un jefe) ataca por cercanía — antes solo
 *  lo hacían los marcados como `aggressive` en su plantilla, ahora todos. Los jefes quedan afuera a
 *  propósito (son un reto que el jugador elige buscar, con su propio cronómetro — no algo que deba
 *  caerte encima sin querer al pasar cerca), igual que el vagabundo/NPCs de misión/mercader, que no
 *  son combate en absoluto. */
function isAmbushEligible(m){
  return !m.ambushed && !m.isBoss && !m.isQuestNpc && !m.isVagabundo && !m.isMerchant && !m.isThief;
}
/** Enemigos por cercanía: si te acercas demasiado sin tocarlos, primero avisan con un "!" arriba
 *  (AMBUSH_TELEGRAPH_MS) y recién después te emboscan de verdad — solos o en manada. Si te alejás
 *  antes de que se cumpla esa ventana, la emboscada se cancela sola. Con más de uno cerca a la vez,
 *  emboscada el MÁS CERCANO primero (no el primero que aparezca en la lista). */
function checkAmbush(){
  if(battleState || pvp || groupBattle || !playerLatLng){ cancelPendingAmbush(); return; }
  if(pendingAmbush){
    const stillClose = pendingAmbush.packMons.some(mm=> monsters.includes(mm) && distMeters(playerLatLng, mm) <= 25);
    if(!stillClose) cancelPendingAmbush();
    return; // ya hay una emboscada telegrafiada en curso (o se acaba de cancelar) — no evaluar otra a la vez
  }
  let nearest = null, nearestDist = Infinity;
  for(const m of monsters){
    if(!isAmbushEligible(m)) continue;
    const d = distMeters(playerLatLng, m);
    if(d <= 25 && d < nearestDist){ nearest = m; nearestDist = d; }
  }
  const m = nearest;
  if(!m) return;
  const packMons = m.packId ? monsters.filter(mm=>mm.packId===m.packId) : [m];
  packMons.forEach(mm=>{ mm.telegraphing = true; showMapAttackTelegraph(mm); });
  const timeoutId = setTimeout(()=>{
    pendingAmbush = null;
    packMons.forEach(mm=>{ mm.telegraphing = false; hideMapAttackTelegraph(mm); });
    if(battleState || pvp || groupBattle) return; // ya se metió en otro combate mientras tanto
    const alive = packMons.filter(mm=> monsters.includes(mm));
    if(!alive.length) return; // desaparecieron (expiraron, los mataron por otro lado, etc.)
    if(!alive.some(mm=> distMeters(playerLatLng, mm) <= 25)) return; // se alejó a tiempo
    alive.forEach(mm=> mm.ambushed = true);
    if(m.packId){
      toast(`⚠️ ¡Una manada de ${m.tpl.name} te emboscó!`, 3000);
      startPackBattle(alive);
    } else {
      toast(`⚠️ ¡${m.tpl.name} te emboscó!`, 3000);
      startBattle(alive[0]);
    }
  }, AMBUSH_TELEGRAPH_MS);
  pendingAmbush = {packMons, timeoutId};
}

/** Aviso de dos etapas SOLO para el Ladrón/Ninja errante (excluido del checkAmbush genérico de
 *  arriba vía isAmbushEligible) — a diferencia de un enemigo cualquiera, este avisa desde más
 *  lejos: un "!" amarillo cuando estás cerca (THIEF_ALERT_RANGE_M) que se pone rojo si seguís
 *  acercándote (THIEF_DANGER_RANGE_M), y recién ahí — tras un instante para poder retroceder —
 *  te emboscada de verdad. */
const THIEF_ALERT_RANGE_M = 70;
const THIEF_DANGER_RANGE_M = 25;
const THIEF_AMBUSH_TELEGRAPH_MS = 750;
/** Frase que suelta al entrar a cada rango — una sola vez por transición (ver _thiefProxLevel en
 *  updateThiefProximity), no en cada tick mientras seguís ahí parado. */
const THIEF_ALERT_LINE = "No deberías andar solo por acá…";
const THIEF_DANGER_LINE = "¡Te lo advertí!";
function setThiefAlertBadge(mon, level){ // level: "yellow" | "red" | null
  const el = mon.marker && mon.marker.getElement && mon.marker.getElement();
  const wrap = el && el.querySelector(".mon-marker");
  if(!wrap) return;
  let badge = wrap.querySelector(".thief-alert-badge");
  if(!level){ if(badge) badge.remove(); return; }
  if(!badge){
    badge = document.createElement("div");
    badge.className = "thief-alert-badge";
    badge.textContent = "!";
    wrap.appendChild(badge);
  }
  badge.classList.toggle("thief-alert-red", level === "red");
}
/** Globo de diálogo arriba del marcador — mismo contenedor que el badge, pero se dispara una sola
 *  vez por transición de nivel (yellow/red) en vez de quedar pegado mientras dure el rango. */
let thiefBubbleHideTimer = null;
function showThiefBubble(mon, text, level){
  const el = mon.marker && mon.marker.getElement && mon.marker.getElement();
  const wrap = el && el.querySelector(".mon-marker");
  if(!wrap) return;
  clearTimeout(thiefBubbleHideTimer);
  let bubble = wrap.querySelector(".thief-map-bubble");
  if(!bubble){
    bubble = document.createElement("div");
    bubble.className = "thief-map-bubble";
    wrap.appendChild(bubble);
  }
  bubble.textContent = text;
  bubble.classList.toggle("thief-bubble-red", level === "red");
  bubble.classList.remove("show");
  void bubble.offsetWidth;
  bubble.classList.add("show");
  if(level !== "red"){
    thiefBubbleHideTimer = setTimeout(()=> bubble.classList.remove("show"), 2600);
  }
}
function hideThiefBubble(mon){
  const el = mon.marker && mon.marker.getElement && mon.marker.getElement();
  const bubble = el && el.querySelector(".thief-map-bubble");
  if(bubble) bubble.remove();
  const wrap = el && el.querySelector(".thief-map-wrap");
  if(wrap) wrap.classList.remove("thief-pounce");
  clearTimeout(thiefBubbleHideTimer);
}
let pendingThiefAmbush = null; // {mon, timeoutId}
function cancelPendingThiefAmbush(){
  if(!pendingThiefAmbush) return;
  clearTimeout(pendingThiefAmbush.timeoutId);
  pendingThiefAmbush = null;
}
function updateThiefProximity(){
  const thief = monsters.find(m=> m.isThief && !m.ambushed);
  if(battleState || pvp || groupBattle || !playerLatLng || !thief){
    if(thief){ setThiefAlertBadge(thief, null); hideThiefBubble(thief); thief._thiefProxLevel = null; }
    cancelPendingThiefAmbush();
    return;
  }
  const d = distMeters(playerLatLng, thief);
  if(d > THIEF_ALERT_RANGE_M){
    setThiefAlertBadge(thief, null);
    if(thief._thiefProxLevel){ hideThiefBubble(thief); thief._thiefProxLevel = null; }
    cancelPendingThiefAmbush();
    return;
  }
  if(d > THIEF_DANGER_RANGE_M){
    setThiefAlertBadge(thief, "yellow");
    if(thief._thiefProxLevel !== "yellow"){
      const wasRed = thief._thiefProxLevel === "red";
      thief._thiefProxLevel = "yellow";
      showThiefBubble(thief, THIEF_ALERT_LINE, "yellow");
      if(wasRed){
        const wrap = thief.marker && thief.marker.getElement && thief.marker.getElement() && thief.marker.getElement().querySelector(".thief-map-wrap");
        if(wrap) wrap.classList.remove("thief-pounce");
      }
    }
    cancelPendingThiefAmbush();
    return;
  }
  setThiefAlertBadge(thief, "red");
  if(thief._thiefProxLevel !== "red"){
    thief._thiefProxLevel = "red";
    showThiefBubble(thief, THIEF_DANGER_LINE, "red");
    const wrap = thief.marker && thief.marker.getElement && thief.marker.getElement() && thief.marker.getElement().querySelector(".thief-map-wrap");
    if(wrap) wrap.classList.add("thief-pounce");
  }
  if(pendingThiefAmbush) return; // ya viene en camino, no reprogramar
  const timeoutId = setTimeout(()=>{
    pendingThiefAmbush = null;
    if(battleState || pvp || groupBattle) return;
    if(!monsters.includes(thief)) return; // expiró o lo mataron mientras tanto
    if(distMeters(playerLatLng, thief) > THIEF_DANGER_RANGE_M) return; // se alejó a tiempo
    thief.ambushed = true;
    setThiefAlertBadge(thief, null);
    hideThiefBubble(thief);
    thief._thiefProxLevel = null;
    toast(`🥷 ¡El Ladrón Errante te emboscó!`, 3000);
    startBattle(thief);
  }, THIEF_AMBUSH_TELEGRAPH_MS);
  pendingThiefAmbush = {mon: thief, timeoutId};
}

/** Aviso de proximidad amistoso — pedido explícito: un globo de diálogo corto que aparece una sola
 *  vez al entrar en rango (Mercader Ambulante, Veterano de Neiva), nunca en cada tick mientras
 *  seguís cerca. A diferencia del aviso del Ladrón (updateThiefProximity), es puramente informativo
 *  — no desencadena combate ni nada por sí solo. El Veterano además lleva un "!" fijo sobre su
 *  marcador mientras esté en el mapa (sin importar la distancia): pedido explícito, la señal de
 *  "acá hay una misión" tiene que verse de lejos, no solo al acercarse. */
const NPC_GREETING_RANGE_M = 90;
const NPC_GREETING_HOLD_MS = 2600;
const MERCHANT_GREETING_LINES = [
  "¡Te tengo cosas muy interesantes!",
  "Acércate, viajero — no te vas a arrepentir.",
  "Mercancía fresca, ¡solo por un rato más!",
  "¿Buscas algo especial? Yo lo tengo.",
];
const VETERANO_GREETING_LINES = [
  "¡Eh, tú! Ven un momento.",
  "¡Justo a quien necesitaba!",
  "Espera, aventurero... tengo algo que pedirte.",
  "¿Tienes un momento? Necesito tu ayuda.",
];
const CAZADOR_GREETING_LINES = [
  "¡Tú! Necesito tu ayuda con algo.",
  "Ese lobo no se va a cazar solo... ¡ven aquí!",
  "¡Por fin alguien capaz! Acércate.",
  "No tengo tiempo que perder — escúchame.",
];
/** Encuentra el contenedor real del marcador donde colgar el globo/badge — los NPC armados con
 *  makeMonster() (el Veterano) siempre traen un ".mon-marker" (ver bodyHtml en makeMonster);
 *  las entidades dinámicas (el Mercader) no, así que se cuelga directo del elemento del marcador. */
function npcMarkerBodyEl(marker){
  const el = marker && marker.getElement && marker.getElement();
  if(!el) return null;
  return el.querySelector(".mon-marker") || el;
}
function showNpcGreetingBubble(marker, text){
  const wrap = npcMarkerBodyEl(marker);
  if(!wrap) return;
  let bubble = wrap.querySelector(".npc-greeting-bubble");
  if(!bubble){
    bubble = document.createElement("div");
    bubble.className = "npc-greeting-bubble";
    wrap.appendChild(bubble);
  }
  bubble.textContent = text;
  bubble.classList.remove("show");
  void bubble.offsetWidth;
  bubble.classList.add("show");
  clearTimeout(bubble._hideTimer);
  bubble._hideTimer = setTimeout(()=> bubble.classList.remove("show"), NPC_GREETING_HOLD_MS);
}
function setNpcExclaimBadge(marker, show){
  const wrap = npcMarkerBodyEl(marker);
  if(!wrap) return;
  let badge = wrap.querySelector(".npc-exclaim-badge");
  if(show && !badge){
    badge = document.createElement("div");
    badge.className = "npc-exclaim-badge";
    badge.textContent = "!";
    wrap.appendChild(badge);
  } else if(!show && badge){
    badge.remove();
  }
}
let npcGreetingNearIds = new Set(); // ids "cerca" ahora mismo — evita repetir el globo en cada tick de movimiento
function updateNpcGreetingProximity(){
  if(!playerLatLng) return;
  const nowNearIds = new Set();

  const merchant = (player.dynamicEntities||[]).find(e=> e.type==="wandering_merchant" && entityStateNow(e)!=="expired");
  if(merchant){
    const d = distMeters(playerLatLng, merchant);
    if(d <= NPC_GREETING_RANGE_M){
      nowNearIds.add(merchant.id);
      if(!npcGreetingNearIds.has(merchant.id)){
        const marker = dynamicEntityMarkers[merchant.id];
        if(marker) showNpcGreetingBubble(marker, MERCHANT_GREETING_LINES[Math.floor(Math.random()*MERCHANT_GREETING_LINES.length)]);
      }
    }
  }

  const veterano = monsters.find(m=> m.isTutorialQuestNpc);
  if(veterano){
    setNpcExclaimBadge(veterano.marker, true);
    const d = distMeters(playerLatLng, veterano);
    if(d <= NPC_GREETING_RANGE_M){
      nowNearIds.add(veterano.id);
      if(!npcGreetingNearIds.has(veterano.id)){
        showNpcGreetingBubble(veterano.marker, VETERANO_GREETING_LINES[Math.floor(Math.random()*VETERANO_GREETING_LINES.length)]);
      }
    }
  }

  // Cazador Solitario: mismo criterio que el Veterano (siempre lleva el "!" fijo mientras esté en
  // el mapa, porque en teoría si salió es porque tiene una misión para ofrecer).
  const cazador = monsters.find(m=> m.isQuestNpc && m.questTemplate && m.questTemplate.id === "q_wolf_fang");
  if(cazador){
    setNpcExclaimBadge(cazador.marker, true);
    const d = distMeters(playerLatLng, cazador);
    if(d <= NPC_GREETING_RANGE_M){
      nowNearIds.add(cazador.id);
      if(!npcGreetingNearIds.has(cazador.id)){
        showNpcGreetingBubble(cazador.marker, CAZADOR_GREETING_LINES[Math.floor(Math.random()*CAZADOR_GREETING_LINES.length)]);
      }
    }
  }

  npcGreetingNearIds = nowNearIds;
}

/* ============================================================
   3. HUD
   ============================================================ */
function refreshHud(){
  $("hudName").textContent = `${player.name}`;
  $("hudLvl").textContent = `Nv. ${player.level}`;
  $("hpFill").style.width = pct(player.hp, player.maxHp)+"%";
  $("mpFill").style.width = pct(player.mp, player.maxMp)+"%";
  $("hpBarText").textContent = `${Math.round(player.hp)}/${Math.round(player.maxHp)}`;
  $("mpBarText").textContent = `${Math.round(player.mp)}/${Math.round(player.maxMp)}`;
  $("hpBarWrap").classList.toggle("low-hp", player.hp/player.maxHp <= 0.25);
  $("xpFill").style.width = pct(player.xp, player.xpNext)+"%";
  $("statAtk").textContent = round1(player.atk);
  $("statMatk").textContent = round1(player.matk||0);
  $("statDef").textContent = round1(player.def);
  $("statSpd").textContent = round1(player.spd);
  $("statGold").textContent = formatGold(player.gold);
  $("statGold").title = (player.gold||0).toLocaleString("es");
  $("statCrystals").textContent = player.crystals||0;
  const darkEssence = player.darkEssence||0;
  $("statDarkEssence").textContent = darkEssence;
  $("darkEssencePill").classList.toggle("hidden", darkEssence<=0);
  const pts = player.attributePoints||0;
  $("pointsBadge").classList.toggle("hidden", pts<=0);
  $("pointsCount").textContent = pts;
  const titleEl = $("hudTitle");
  titleEl.textContent = player.activeTitle || "";
  titleEl.classList.toggle("hidden", !player.activeTitle);
  const auraClass = activeDungeonAuraClass();
  $("hudIcon").className = "p-icon" + (player.activeFrameClass ? " "+player.activeFrameClass : "") + (auraClass ? " "+auraClass : "");
  $("hudIconEmoji").textContent = player.emoji;
  updateMeMarkerAura();
  renderMapMaterialsBar();
}
function pct(v,max){ return Math.max(0, Math.min(100, (v/max)*100)); }
function round1(v){ return Math.round(v*10)/10; }
/** Acorta números grandes de oro con "K" (a partir de 5 cifras, 10.000+) para que no desborden
 *  el HUD ni las tarjetas del inventario — ej. 1.626.345 se muestra como "1626K". */
function formatGold(n){
  n = Math.floor(n||0);
  if(n < 10000) return String(n);
  return Math.floor(n/1000) + "K";
}

let lastWeatherBadgeHTML = "";
/** Barra contextual bajo el HUD principal — solo LEE datos que ya existen (monstruos, torres,
 *  fogatas, centros comerciales) para mostrar qué es relevante ahora mismo; no cambia ninguna
 *  lógica del juego, ni agrega nuevas reglas de proximidad. Cuando no hay nada cerca, muestra el
 *  clima/hora/GPS de siempre. */
const CONTEXT_BAR_RADIUS_M = 180;
function updateContextBar(){
  const bar = $("hudContextBar");
  if(!bar || !playerLatLng) return;

  const nearBoss = monsters.find(m=> m.isBoss && distMeters(playerLatLng, m) <= CONTEXT_BAR_RADIUS_M);
  if(nearBoss){
    bar.innerHTML = `<span>${nearBoss.tpl.emoji} ${nearBoss.tpl.name}</span><span>Nv. ${nearBoss.level}</span><span>${Math.round(distMeters(playerLatLng, nearBoss))} m</span>`;
    return;
  }
  const nearMon = monsters.find(m=> !m.isBoss && distMeters(playerLatLng, m) <= CONTEXT_BAR_RADIUS_M);
  if(nearMon){
    bar.innerHTML = `<span>${nearMon.tpl.emoji} ${nearMon.tpl.name}</span><span>Nv. ${nearMon.level}</span><span>${Math.round(distMeters(playerLatLng, nearMon))} m</span>`;
    return;
  }
  const nearMerchant = (player.dynamicEntities||[]).find(e=> entityStateNow(e)==="active" && distMeters(playerLatLng, e) <= CONTEXT_BAR_RADIUS_M);
  if(nearMerchant){
    bar.innerHTML = `<span>${nearMerchant.sprite} ${nearMerchant.name}</span><span>⏳ ${formatEntityTimeLeft(nearMerchant)}</span><span>Toca para comerciar</span>`;
    return;
  }
  const nearEvent = (player.worldEvents||[]).find(e=>{
    const st = eventStateNow(e);
    return (st==="active"||st==="engaged") && worldEventDiscovered[e.id] && distMeters(playerLatLng, e) <= CONTEXT_BAR_RADIUS_M;
  });
  if(nearEvent){
    const def = EVENT_TYPES[nearEvent.type];
    bar.innerHTML = `<span>${def.icon} ${def.label}</span><span>⏳ ${formatEventTimeLeft(nearEvent)}</span><span>Toca para interactuar</span>`;
    return;
  }
  const nearTower = (TOWERS||[]).find(t=> distMeters(playerLatLng, t) <= CONTEXT_BAR_RADIUS_M);
  if(nearTower){
    bar.innerHTML = `<span>🏰 ${nearTower.name}</span><span>${towerOwnership[nearTower.id] ? "Ocupada" : "Disponible"}</span>`;
    return;
  }
  const nearFire = (CAMPFIRES||[]).find(f=> distMeters(playerLatLng, f) <= f.healRadius + 40);
  if(nearFire){
    bar.innerHTML = `<span>🔥 Fogata</span><span>Recuperar vida</span>`;
    return;
  }
  const nearMall = (NEIVA_MALLS||[]).find(m=> distMeters(playerLatLng, m) <= CONTEXT_BAR_RADIUS_M);
  if(nearMall){
    bar.innerHTML = `<span>🏪 ${nearMall.name}</span><span>Comprar objetos</span>`;
    return;
  }
  const nearNode = resourceNodes.find(n=> distMeters(playerLatLng, n) <= CONTEXT_BAR_RADIUS_M);
  if(nearNode){
    const type = RESOURCE_NODE_TYPES.find(t=>t.key===nearNode.typeKey);
    bar.innerHTML = `<span>${type.emoji} ${type.label}</span><span>Toca para recolectar</span>`;
    return;
  }
  // nada relevante cerca: se muestra lo de siempre (dia/noche, clima) — se insertan los
  // elementos primero y se vuelven a poblar con sus propias funciones para que el dato sea
  // fresco (no uno viejo capturado de antes de que la barra mostrara otra cosa).
  bar.innerHTML = `<span id="dayNightBadge">☀️ Día</span><span id="weatherBadge">${lastWeatherBadgeHTML}</span>`;
  updateDayNightBadge();
}

function genFriendCode(name){
  const slug = (name||"Jugador").replace(/[^a-zA-Z0-9]/g,"").slice(0,12) || "Jugador";
  return slug + "-" + (1000 + Math.floor(Math.random()*9000));
}
/** Cuántos accesorios se pueden equipar a la vez: 1 base, +1 cada 10 niveles. */
function maxAccessorySlots(level, classKey){ return Math.min(classKey==="mago"?6:3, 1 + Math.floor((level||1)/10)); }

/* ============================================================
   4. INVENTARIO Y EQUIPO
   ============================================================ */
$("btnInv").onclick = ()=>{ closeFabMenu(); renderInventoryTabs(); renderInventoryClassTabs(); renderInventory(); $("invOverlay").classList.remove("hidden"); $("invNotifDot").classList.remove("show"); };
$("btnCloseInv").onclick = ()=> $("invOverlay").classList.add("hidden");

/* ---------- Ficha de personaje (tocando tu ícono en el HUD) ---------- */
$("hudIcon").onclick = ()=>{ renderCharSheet(); $("charSheetOverlay").classList.remove("hidden"); };
$("btnCloseCharSheet").onclick = ()=> $("charSheetOverlay").classList.add("hidden");

/** Calcula, para cada estadística, qué tan "maxeada" está respecto al tope teórico
 *  si TODOS los puntos de atributo ganados hasta ahora se hubieran puesto ahí solo. */
function computeRadarAxes(){
  const c = CLASSES[player.classKey];
  const totalPoints = Math.max(0, (player.level-1)*5);
  return ATTR_DEFS.map(def=>{
    const base = (c.base[def.key] || 0);
    const growth = (c.growth[def.key]||0) * (player.level-1);
    const refMax = Math.max(1, base + growth + totalPoints*def.per);
    const current = def.key==="maxHp" ? player.maxHp : def.key==="maxMp" ? player.maxMp : (player[def.key]||0);
    return { key: def.key, label: def.label, ratio: Math.max(0, Math.min(1, current/refMax)) };
  });
}

/** Dibuja un gráfico de radar hexagonal en SVG puro (sin librerías) según los ejes dados. */
function buildRadarSVG(axes){
  const cx=75, cy=75, R=56;
  const N = axes.length;
  const shortLabel = {maxHp:"HP", maxMp:"MP", atk:"ATK", matk:"AT.MÁG", def:"DEF", spd:"VEL"};
  const angleFor = i => (Math.PI*2*i/N) - Math.PI/2;
  const pt = (i,r) => { const a=angleFor(i); return [cx+r*Math.cos(a), cy+r*Math.sin(a)]; };

  let grid = "";
  [0.25,0.5,0.75,1].forEach(frac=>{
    const pts = axes.map((_,i)=> pt(i, R*frac).join(",")).join(" ");
    grid += `<polygon points="${pts}" fill="none" stroke="#2a3348" stroke-width="1"/>`;
  });
  const axisLines = axes.map((_,i)=>{
    const [x,y] = pt(i,R);
    return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#2a3348" stroke-width="1"/>`;
  }).join("");
  const dataPts = axes.map((ax,i)=> pt(i, R*ax.ratio).join(",")).join(" ");
  const labels = axes.map((ax,i)=>{
    const [x,y] = pt(i, R+13);
    return `<text x="${x}" y="${y}" fill="#8b93a7" font-size="8" font-weight="700" text-anchor="middle" dominant-baseline="middle">${shortLabel[ax.key]||ax.label}</text>`;
  }).join("");

  return `<svg viewBox="0 0 150 150" width="100%" height="150">
    ${grid}${axisLines}
    <polygon points="${dataPts}" fill="rgba(94,225,201,.35)" stroke="#5ee1c9" stroke-width="2"/>
    ${labels}
  </svg>`;
}

/** Se abre al tocar un hueco VACÍO en el Perfil — lista lo que tengas en tu inventario que sirva
 *  para ese hueco, y al elegir uno usa la MISMA función de equipar de siempre (equipItem). */
function openEquipPickerForSlot(slotKey, accessoryIdx){
  const slotDef = EQUIP_SLOTS.find(s=>s.key===slotKey);
  $("equipSlotPickTitle").textContent = `¿Qué equipar en ${slotDef?slotDef.label:slotKey}?`;
  const list = $("equipSlotPickList");
  list.innerHTML = "";
  const seen = new Set();
  const candidates = player.inventory.filter(it=>{
    if(it.type!=="equip" || it.slot!==slotKey) return false;
    if(seen.has(it.id)) return false;
    seen.add(it.id);
    return true;
  });
  if(candidates.length===0){
    list.innerHTML = `<div class="empty-note">No tienes ningún objeto para este hueco todavía.</div>`;
  } else {
    candidates.forEach(it=>{
      const meta = equipItemMeta(it);
      const row = document.createElement("div");
      applyItemRowStyling(row, meta);
      row.innerHTML = `${meta.sparkles}<div class="ie">${iconFor(it)}</div>
        <div class="it">${it.name}${meta.tag}<small>${it.desc||""}</small></div>
        <button>Equipar</button>`;
      row.querySelector("button").onclick = ()=>{
        const idx = player.inventory.findIndex(x=>x.id===it.id);
        if(idx>=0) equipItem(idx, accessoryIdx);
        $("equipSlotPickOverlay").classList.add("hidden");
        renderCharSheet();
        refreshHud();
        saveGame();
      };
      list.appendChild(row);
    });
  }
  $("equipSlotPickOverlay").classList.remove("hidden");
}
$("btnCloseEquipSlotPick").onclick = ()=> $("equipSlotPickOverlay").classList.add("hidden");
function renderCharSheet(){
  const csPortrait = (CLASS_PORTRAITS[player.classKey]||{})[player.gender==="f"?"f":"m"];
  $("csPortraitWrap").innerHTML = csPortrait
    ? `<img src="${csPortrait.combat}" alt="" style="width:120px; height:auto; border-radius:14px; display:block; box-shadow:0 8px 18px rgba(0,0,0,.5); border:1px solid rgba(255,255,255,.08);">`
    : `<span style="font-size:40px;">${player.emoji}</span>`;
  $("csName").textContent = player.name;
  $("csMeta").textContent = `${player.className} · Nv. ${player.level}`;
  $("csFriendCode").textContent = `🔑 Código de amigo: ${player.friendCode}`;
  $("csFriendCode").onclick = ()=>{
    if(navigator.clipboard) navigator.clipboard.writeText(player.friendCode).catch(()=>{});
    toast("Código copiado: " + player.friendCode);
  };
  const kmWalked = ((player.totalDistanceM||0)/1000).toFixed(2);
  $("csDistance").textContent = `📍 Distancia recorrida: ${kmWalked} km`;
  const medalsWrap = $("csMedals");
  medalsWrap.innerHTML = "";
  (player.medals||[]).forEach(m=>{
    const chip = document.createElement("span");
    chip.style.cssText = "font-size:20px; cursor:default;";
    chip.textContent = m.emoji;
    chip.title = `${m.name} · ${m.km} km`;
    medalsWrap.appendChild(chip);
  });
  $("csRadarWrap").innerHTML = buildRadarSVG(computeRadarAxes());

  // Poder total: una cifra compuesta que resume qué tan fuerte estás en general.
  const power = Math.round(player.atk*3 + (player.matk||0)*3 + player.def*3 + player.spd*2 + player.maxHp*0.5 + player.maxMp*0.5);
  $("csPowerTotal").innerHTML = `⚔️ Poder total: <b style="color:var(--gold);">${power.toLocaleString("es-CO")}</b>`;

  // Barras de estadísticas junto al radar (mismo dato, presentado como barra en vez de solo número).
  const statDefs = [
    {label:"HP", value:player.maxHp, max:Math.max(player.maxHp, 200), color:"#e0596b", emoji:"❤️"},
    {label:"ATQ", value:player.atk, max:Math.max(player.atk, 60), color:"#e8983a", emoji:"⚔️"},
    {label:"DEF", value:player.def, max:Math.max(player.def, 60), color:"#4aa3e0", emoji:"🛡️"},
    {label:"AT.MÁG", value:player.matk||0, max:Math.max(player.matk||1, 40), color:"#c98bf0", emoji:"✨"},
    {label:"VEL", value:player.spd, max:Math.max(player.spd, 30), color:"#4fd67a", emoji:"🍃"},
    {label:"MP", value:player.maxMp, max:Math.max(player.maxMp, 60), color:"#4aa3e0", emoji:"💧"},
  ];
  $("csStatBars").innerHTML = statDefs.map(s=>`
    <div class="cs-stat-bar">
      <div class="csb-label">${s.emoji} ${s.label}</div>
      <div class="csb-track"><div class="csb-fill" style="width:${Math.min(100, s.value/s.max*100)}%; background:${s.color};"></div></div>
      <div class="csb-value">${round1(s.value)}</div>
    </div>`).join("");

  // Iconos de equipo a los lados del personaje (arma/mano secundaria/casco a la izquierda,
  // armadura/botas/TODOS tus accesorios a la derecha — antes solo se mostraba el primero).
  // Un hueco VACÍO abre el selector de qué equipar ahí; uno OCUPADO muestra su detalle completo
  // en un tooltip (mismo dato que antes se repetía más abajo en "Equipo puesto" — ya no hace
  // falta esa lista aparte).
  function flankItemHtml(slotDef, item, idx){
    const idxAttr = idx!=null ? ` data-idx="${idx}"` : "";
    if(!item) return `<div class="cs-flank-item empty" data-slot="${slotDef.key}"${idxAttr}><div class="cfi-icon">${slotDef.emoji}</div></div>`;
    const meta = equipItemMeta(item);
    const bonusEntries = Object.entries(item.bonuses||{});
    const bonusLabel = bonusEntries.length ? `+${bonusEntries[0][1]}` : "";
    // los íconos del perfil son chicos (58px) y van pegados casi al borde de la pantalla — el
    // brillo normal de botín de jefe (14px) es más ancho de lo que ese espacio puede contener sin
    // recortarse, así que acá se usa una versión más chica del mismo color en vez del styleAttr
    // genérico (el de rareza normal, sin inline style, ya se achica por CSS más abajo).
    const styleAttr = item.isBossLoot
      ? `border-color:${item.auraColor||'#fff'} !important; box-shadow:0 0 8px ${item.auraColor||'#fff'}99;`
      : meta.styleAttr;
    return `<div class="cs-flank-item ${meta.rc}" style="${styleAttr}" data-equipped="1" data-slot="${slotDef.key}"${idxAttr}>
      <div class="cfi-icon">${iconFor(item)}</div>
      <div class="cfi-bonus">${bonusLabel}</div>
    </div>`;
  }
  // Reparte los huecos en partes iguales entre las dos columnas (en vez de una izquierda fija de
  // 3 y todo lo demás a la derecha) — con 8 huecos, por ejemplo, quedan 4 y 4.
  const allSlots = ["weapon","offhand","armor","helmet","boots"]
    .map(k=> ({slotDef: EQUIP_SLOTS.find(s=>s.key===k), item: player.equipment[k], idx:null}));
  const accessorySlotDef = EQUIP_SLOTS.find(s=>s.key==="accessory");
  (player.equipment.accessory||[]).forEach((item,i)=> allSlots.push({slotDef: accessorySlotDef, item, idx:i}));
  const splitAt = Math.ceil(allSlots.length/2);
  $("csFlankLeft").innerHTML = allSlots.slice(0, splitAt).map(s=> flankItemHtml(s.slotDef, s.item, s.idx)).join("");
  $("csFlankRight").innerHTML = allSlots.slice(splitAt).map(s=> flankItemHtml(s.slotDef, s.item, s.idx)).join("");

  document.querySelectorAll("#csFlankLeft .cs-flank-item, #csFlankRight .cs-flank-item").forEach(el=>{
    el.onclick = (e)=>{
      e.stopPropagation();
      const idx = el.dataset.idx!=null ? +el.dataset.idx : null;
      if(el.classList.contains("empty")){ openEquipPickerForSlot(el.dataset.slot, idx); return; }
      const item = el.dataset.slot==="accessory" ? player.equipment.accessory[idx] : player.equipment[el.dataset.slot];
      if(item) showEquipTooltip(el, item, EQUIP_SLOTS.find(s=>s.key===el.dataset.slot));
    };
  });

  const mvList = $("csMoveList");
  mvList.innerHTML = "";
  getAllUsableMoves().forEach(mv=>{
    const row = document.createElement("div");
    row.className = "inv-item";
    row.style.cursor = "pointer";
    const icon = mv.type==="buff" ? "🛡️" : mv.type==="heal" ? "💚" : "⚔️";
    row.innerHTML = `<div class="ie">${icon}</div><div class="it">${mv.name}<small>${moveInfoLine(mv)} · MP ${mv.cost||0}</small></div>`;
    // toca CUALQUIER parte de la fila para ver la descripción completa del ataque (mismo
    // tooltip que ya se usa en combate al tocar el ojo 👁️ de cada movimiento).
    row.onclick = (e)=>{ e.stopPropagation(); showMoveTooltip(row, mv); };
    mvList.appendChild(row);
  });
}

let inBattleItemMode = false; // true cuando el inventario se abrió desde dentro de un combate

/** Devuelve clase CSS de rareza, etiqueta coloreada y partículas decorativas para un objeto de equipo. */
/** Ícono a mostrar para un ítem: si es una armadura, usa la ilustración real; si no, su emoji de siempre. */
function iconFor(item){
  if(item && item.img) return `<img src="${item.img}" alt="" style="height:34px; width:auto; display:block; margin:auto;">`;
  if(item && item.slot === "armor") return `<img src="${ARMOR_ICON_PATH}" alt="" style="height:34px; width:auto; display:block; margin:auto;">`;
  if(item && item.name === "Espada Lunar") return `<img src="${ESPADA_LUNAR_ICON_PATH}" alt="" style="height:34px; width:auto; display:block; margin:auto;">`;
  return item ? item.emoji : "";
}
/** Igual, pero para una ranura de equipo VACÍA (usa la imagen si la ranura es de armadura). */
function slotIconFor(slotDef){
  if(slotDef.key === "armor") return `<img src="${ARMOR_ICON_PATH}" alt="" style="height:34px; width:auto; display:block; margin:auto; opacity:.55;">`;
  return slotDef.emoji;
}
function equipItemMeta(item){
  if(item.isBossLoot){
    const color = item.auraColor || "#ffffff";
    const procTag = item.proc ? ` · ${PROC_LABELS[item.proc.type]||""} (${Math.round(item.proc.chance*100)}%)` : "";
    const tag = `<span class="rtag" style="color:${color}">👑 Botín de Jefe</span>`;
    const sparkles = `<span class="sparkle p1">✦</span><span class="sparkle p2">✧</span><span class="sparkle p3">✦</span>`;
    return {rc:"", tag, sparkles, styleAttr:`border-color:${color} !important; box-shadow:0 0 14px ${color}99;`, procTag};
  }
  if(!item.rarity) return {rc:"", tag:"", sparkles:"", styleAttr:"", procTag:""};
  const rc = rarityClass(item.rarity);
  const color = (RARITY_BY_KEY[item.rarity]||{}).color || "var(--dim)";
  const tag = `<span class="rtag" style="color:${color}">${rarityLabel(item.rarity)}</span>`;
  const sparkles = (item.rarity==="epic"||item.rarity==="legendary")
    ? `<span class="sparkle p1">✦</span><span class="sparkle p2">✧</span><span class="sparkle p3">✦</span>` : "";
  return {rc, tag, sparkles, styleAttr:"", procTag:""};
}
/** Aplica la clase de rareza normal, o el aura personalizada de un jefe si corresponde. */
function applyItemRowStyling(row, meta){
  row.className = "inv-item " + meta.rc;
  if(meta.styleAttr) row.style.cssText += meta.styleAttr;
}

/** Puntaje simple de poder de un objeto (suma de sus bonificaciones), para comparar equipo. */
function itemPowerScore(item){
  if(!item || !item.bonuses) return 0;
  return Object.values(item.bonuses).reduce((s,v)=>s+v, 0);
}
/** Si ya tienes algo equipado en ese slot, compara y devuelve {equipped, diff}; si no, devuelve null
 *  (no tiene sentido "recomendar cambiar" si no hay nada puesto todavía en ese hueco). */
function getEquippedComparison(item){
  if(item.type !== "equip") return null;
  if(item.slot === "accessory"){
    const equipped = (player.equipment.accessory||[]).filter(Boolean);
    if(equipped.length===0) return null;
    const weakest = equipped.reduce((w,e)=> itemPowerScore(e)<itemPowerScore(w) ? e : w, equipped[0]);
    return {equipped: weakest, diff: itemPowerScore(item)-itemPowerScore(weakest)};
  }
  const equipped = player.equipment[item.slot];
  if(!equipped) return null;
  return {equipped, diff: itemPowerScore(item)-itemPowerScore(equipped)};
}
/** Línea de recomendación para mostrar en el inventario/tienda: mejor, peor o similar a lo puesto. */
function comparisonLine(item){
  const cmp = getEquippedComparison(item);
  if(!cmp) return "";
  if(cmp.diff > 0) return `<div class="stat-preview" style="color:var(--accent);">🔺 Mejor que tu ${cmp.equipped.name} equipado — te recomendamos cambiarlo</div>`;
  if(cmp.diff < 0) return `<div class="stat-preview" style="color:var(--dim);">🔻 Peor que tu ${cmp.equipped.name} equipado</div>`;
  return `<div class="stat-preview" style="color:var(--dim);">≈ Similar a tu ${cmp.equipped.name} equipado</div>`;
}

/** Pedido explícito: Equipo / Consumibles / Materiales / Especiales (antes: Todos/Mejoras/
 *  Consumibles/Equipamiento/Otros). "Materiales" es especial — wood/stone/iron/crystals no son
 *  objetos de player.inventory (son campos numéricos del jugador), así que su `test` no filtra
 *  nada de verdad; renderInventory() la maneja aparte, ver renderMaterialsTab más abajo. */
const INV_CATEGORIES = [
  {key:"equip",      label:"Equipo",       test:it=> it.type==="equip"},
  {key:"consumable", label:"Consumibles",  test:it=> it.type==="heal"||it.type==="mana"||it.type==="pet_item"||it.type==="stat"},
  {key:"material",   label:"Materiales",   test:()=>false},
  {key:"special",    label:"Especiales",   test:it=> !["equip","heal","mana","pet_item","stat"].includes(it.type)},
];
let invActiveCategory = "equip";

function renderInventoryTabs(){
  const wrap = $("invTabs");
  wrap.innerHTML = "";
  INV_CATEGORIES.forEach(cat=>{
    const btn = document.createElement("button");
    btn.className = "inv-cat-tab" + (cat.key===invActiveCategory ? " active" : "");
    btn.textContent = cat.label;
    btn.onclick = ()=>{ invActiveCategory = cat.key; renderInventoryTabs(); renderInventoryClassTabs(); renderInventory(); };
    wrap.appendChild(btn);
  });
  // Pedido explícito: el filtro de clase (Todos/Guerrero/Arquero/Mago/Berserk) solo tiene sentido
  // en la pestaña Equipo — en el resto de pestañas los objetos son universales, así que ahora
  // queda oculto ahí en vez de siempre visible.
  $("invClassTabs").classList.toggle("hidden", invActiveCategory !== "equip");
}

/** Filtro rápido por clase — pedido explícito. Solo los objetos de equipo tienen `classKey`; en
 *  cualquier otra pestaña (consumibles/especiales) este filtro no oculta nada (esos objetos son
 *  universales), así que es seguro dejarlo siempre visible sin casos especiales por pestaña. */
const INV_CLASS_FILTERS = [
  {key:"all", label:"Todos"},
  {key:"guerrero", label:"Guerrero"},
  {key:"arquero", label:"Arquero"},
  {key:"mago", label:"Mago"},
  {key:"berserker", label:"Berserk"},
];
let invActiveClassFilter = "all";
function renderInventoryClassTabs(){
  const wrap = $("invClassTabs");
  if(!wrap) return;
  wrap.innerHTML = "";
  INV_CLASS_FILTERS.forEach(cf=>{
    const btn = document.createElement("button");
    btn.className = "inv-cat-tab" + (cf.key===invActiveClassFilter ? " active" : "");
    btn.textContent = cf.label;
    btn.onclick = ()=>{ invActiveClassFilter = cf.key; renderInventoryClassTabs(); renderInventory(); };
    wrap.appendChild(btn);
  });
}
/** Pedido explícito: en vez de la pastilla de color (🟥🟩🟦🟪), un emoji que se entienda de un
 *  vistazo para quién es el objeto — escudo (Guerrero), arco (Arquero), bola de cristal (Mago),
 *  hacha (Berserker). Vacío para objetos universales (sin classKey). */
const INV_CLASS_ICON = { guerrero:"🛡️", arquero:"🏹", mago:"🔮", berserker:"🪓" };
function classBadgeHtml(item){
  if(!item.classKey) return "";
  const icon = INV_CLASS_ICON[item.classKey];
  if(!icon) return "";
  const className = (CLASSES[item.classKey]||{}).name || item.classKey;
  return `<div class="icv-class-badge" title="${className}">${icon}</div>`;
}
/** "Solo Arquero/Mago/Berserk" — pedido explícito, se muestra en objetos de OTRA clase distinta a
 *  la del héroe activo (nunca en los tuyos ni en los universales). */
function otherClassTagHtml(item){
  if(!item.classKey || item.classKey===player.classKey) return "";
  const className = (CLASSES[item.classKey]||{}).name || item.classKey;
  return `<div class="icv-other-class">Solo ${className}</div>`;
}
/** Los 3 materiales de construcción/fabricación que existen hoy (wood/stone/iron — campos
 *  numéricos de player, no objetos de inventario). El pedido original mencionaba Cuero/Gemas como
 *  ejemplo, pero ningún sistema del juego los produce o consume todavía — no se inventan acá,
 *  solo se muestran los que sí tienen una fuente real (recolección/tienda). Los cristales NO van
 *  acá a propósito: son en realidad diamantes, la moneda premium del juego (revivir, ampliar la
 *  base, tienda — ver player.crystals), no un material de fabricación, así que se muestran solo
 *  junto al oro (statCrystals) y nunca en esta pestaña. */
const INV_MATERIALS = [
  {key:"wood", label:"Madera", emoji:"🪵"},
  {key:"stone", label:"Piedra", emoji:"🪨"},
  {key:"iron", label:"Hierro", emoji:"🔩"},
];
/** Pestaña "Materiales" — tarjetas SINTÉTICAS leídas directo de player.wood/stone/iron/crystals y
 *  player.craftMats (botín de combate para el Herrero, ver CRAFT_MATERIALS en
 *  game/config/blacksmith.js), no de player.inventory (esos campos siguen siendo la fuente de
 *  verdad para recolección/construcción/tienda/fabricación — no se tocan). Apiladas por
 *  naturaleza, no ocupan espacio del inventario y nunca lo llenan. */
function renderMaterialsTab(grid){
  INV_MATERIALS.forEach(m=>{
    const qty = player[m.key]||0;
    const card = document.createElement("div");
    card.className = "inv-card-v2";
    card.innerHTML = `<div class="icv-icon">${m.emoji}</div>
      <div class="icv-name">${m.label}</div>
      <div class="icv-qty">x${qty}</div>`;
    grid.appendChild(card);
  });
  CRAFT_MATERIALS.forEach(m=>{
    const qty = (player.craftMats && player.craftMats[m.key]) || 0;
    if(qty <= 0) return; // solo se muestran una vez conseguidos, para no listar 10 materiales en 0
    const card = document.createElement("div");
    card.className = "inv-card-v2";
    card.innerHTML = `<div class="icv-icon">${m.emoji}</div>
      <div class="icv-name">${m.label}</div>
      <div class="icv-qty">x${qty}</div>`;
    grid.appendChild(card);
  });
}

/** Sesión únicamente — favoritos y bloqueo son solo un marcador visual mientras el juego está
 *  abierto (no se guardan ni forman parte de los datos reales del objeto), para no tocar el
 *  modelo de datos existente. */
let invFavorites = new Set();
let invLocked = new Set();
let invSearchQuery = "";
let invSortMode = "default";
let invOnlyEquipped = false;
let invSelectMode = false;
let invSelectedIds = new Set();
/** Pedido explícito: se acabó el botón "Seleccionar" — mantener el dedo/click sobre un objeto
 *  este tiempo entra en modo selección directo con ESE objeto ya marcado (ver enterInvSelectMode,
 *  cableado por pointerdown/pointerup en cada tarjeta dentro de renderInventory). */
const INV_LONG_PRESS_MS = 2000;

/** Estadística principal a mostrar en la tarjeta chica (la bonificación más alta del objeto). */
function primaryStatLine(item){
  if(!item.bonuses) return "";
  const [key, val] = Object.entries(item.bonuses).sort((a,b)=>b[1]-a[1])[0] || [];
  if(!key) return "";
  return `${STAT_LABEL[key]||key} +${val}`;
}
function rarityRank(item){
  if(item.isBossLoot) return 5;
  return RARITY_TIERS.findIndex(t=>t.key===item.rarity);
}

/** Botón "+ Expandir" junto al contador (ver .inv-count-block en index.html) — reemplaza la
 *  tarjeta "Ampliar inventario" que antes vivía DENTRO de la grilla y ocupaba un espacio visual;
 *  pedido explícito: que no ocupe un hueco del inventario. Se oculta sola al llegar al tope de
 *  capacidad (nextSlotPurchaseInfo devuelve null ahí). */
function renderInvExpandButton(){
  const btn = $("btnInvExpand");
  if(!btn) return;
  const info = nextSlotPurchaseInfo();
  btn.classList.toggle("hidden", !info);
  if(info) btn.textContent = `+ Expandir (${info.currency==="gold"?"🪙":"💎"} ${info.cost})`;
}
$("btnInvExpand").onclick = ()=>{ buyNextInventorySlot(); renderInventory(); };

function renderInventory(){
  const grid = $("invList");
  grid.innerHTML = "";
  const seen = new Set();
  const uniqueItems = [];
  player.inventory.forEach(it=>{
    if(seen.has(it.id)) return;
    seen.add(it.id);
    uniqueItems.push(it);
  });
  const maxSlots = inventoryMaxSlots();
  $("invCount").textContent = `${uniqueItems.length}/${maxSlots}`;
  // Pedido explícito: en vez de solo el número, una barrita que se va llenando — se pone dorada
  // cerca del tope para avisar que conviene ampliar pronto.
  const fillPct = Math.min(100, Math.round((uniqueItems.length/maxSlots)*100));
  const fillEl = $("invCountBarFill");
  if(fillEl){
    fillEl.style.width = fillPct+"%";
    fillEl.classList.toggle("almost-full", fillPct>=90);
  }
  renderInvExpandButton();

  // Materiales es una pestaña sintética (no filtra player.inventory) — se resuelve aparte y
  // corta acá; no aplica capacidad/búsqueda/orden.
  if(invActiveCategory === "material"){
    renderMaterialsTab(grid);
    return;
  }

  const cat = INV_CATEGORIES.find(c=>c.key===invActiveCategory) || INV_CATEGORIES[0];
  let filtered = uniqueItems.filter(cat.test);
  if(invActiveClassFilter !== "all"){
    filtered = filtered.filter(it=> !it.classKey || it.classKey===invActiveClassFilter);
  }
  if(invOnlyEquipped){
    filtered = filtered.filter(it=> isItemCurrentlyEquipped(it));
  }
  if(invSearchQuery.trim()){
    const q = invSearchQuery.trim().toLowerCase();
    filtered = filtered.filter(it=> it.name.toLowerCase().includes(q));
  }
  const countOf = it=> player.inventory.filter(x=>x.id===it.id).length;
  if(invSortMode==="level") filtered = filtered.slice().sort((a,b)=> (b.reqLevel||0)-(a.reqLevel||0));
  else if(invSortMode==="name") filtered = filtered.slice().sort((a,b)=> a.name.localeCompare(b.name,"es"));
  else filtered = filtered.slice().sort((a,b)=> rarityRank(b)-rarityRank(a));

  // Equipamiento inteligente — pedido explícito: en la pestaña Equipo con el filtro de clase en
  // "Todos", tus propias armas (+ universales) van primero; el resto queda agrupado debajo de un
  // separador "Otras clases" (con su indicador "Solo X" en cada tarjeta, ver otherClassTagHtml) —
  // así el inventario compartido entre los 4 héroes no se siente desordenado. Si ya hay un filtro
  // de clase explícito, no hace falta reagrupar (el jugador ya pidió ver solo esa clase).
  let myClassItems = filtered, otherClassItems = [];
  if(invActiveCategory==="equip" && invActiveClassFilter==="all"){
    myClassItems = filtered.filter(it=> !it.classKey || it.classKey===player.classKey);
    otherClassItems = filtered.filter(it=> it.classKey && it.classKey!==player.classKey);
  }

  $("invMassActions").classList.toggle("hidden", !invSelectMode);

  if(filtered.length===0){
    grid.innerHTML = `<div class="empty-note" style="grid-column:1/-1;">${uniqueItems.length===0 ? "Aún no tienes objetos. ¡Gana combates para conseguir botín!" : "No se encontró nada con esos filtros."}</div>`;
  } else {
    const buildCard = (it)=>{
      const count = countOf(it);
      const meta = equipItemMeta(it);
      const card = document.createElement("div");
      card.className = "inv-card-v2 " + meta.rc + (invSelectMode ? " selectable" : "") + (invSelectedIds.has(it.id) ? " selected" : "");
      if(meta.styleAttr) card.style.cssText += meta.styleAttr;
      const isEquippedSomewhere = it.type==="equip" && isItemCurrentlyEquipped(it);
      const statLine = primaryStatLine(it);
      card.innerHTML = `${meta.sparkles}
        ${classBadgeHtml(it)}
        ${isEquippedSomewhere ? `<div class="icv-equipped-ribbon">EQUIPADO</div>` : ""}
        ${invFavorites.has(it.id) ? `<div class="icv-fav">★</div>` : ""}
        ${invLocked.has(it.id) ? `<div class="icv-lock">🔒</div>` : ""}
        <div class="icv-icon">${iconFor(it)}</div>
        <div class="icv-name">${it.name}</div>
        ${statLine ? `<div class="icv-stat">${statLine}</div>` : ""}
        ${otherClassTagHtml(it)}
        ${it.reqLevel ? `<div class="icv-lvl">Nv. requerido ${it.reqLevel}</div>` : ""}
        ${count>1 ? `<div class="icv-qty">x${count}</div>` : ""}`;
      // Pedido explícito: sin botón "Seleccionar" — mantener presionado un objeto
      // INV_LONG_PRESS_MS entra en modo selección con ESE objeto ya marcado (ver
      // enterInvSelectMode). Un pointerup/cancel antes de tiempo es un tap normal de siempre.
      let pressTimer = null, longPressFired = false;
      const clearPressTimer = ()=> clearTimeout(pressTimer);
      card.addEventListener("pointerdown", ()=>{
        longPressFired = false;
        clearPressTimer();
        pressTimer = setTimeout(()=>{ longPressFired = true; enterInvSelectMode(it, card); }, INV_LONG_PRESS_MS);
      });
      card.addEventListener("pointerup", clearPressTimer);
      card.addEventListener("pointercancel", clearPressTimer);
      card.addEventListener("pointerleave", clearPressTimer);
      card.onclick = ()=>{
        if(longPressFired){ longPressFired = false; return; } // ya se resolvió como mantener presionado
        if(invSelectMode){
          if(invSelectedIds.has(it.id)) invSelectedIds.delete(it.id); else invSelectedIds.add(it.id);
          renderInventory();
          return;
        }
        openInventoryDetail(it, count);
      };
      return card;
    };
    myClassItems.forEach(it=> grid.appendChild(buildCard(it)));
    if(otherClassItems.length){
      const sep = document.createElement("div");
      sep.className = "inv-section-sep";
      sep.textContent = "Otras clases";
      grid.appendChild(sep);
      otherClassItems.forEach(it=> grid.appendChild(buildCard(it)));
    }
  }
}
/** Entra en modo selección SIN reconstruir la grilla (ver el pointerdown de arriba en
 *  renderInventory) — un renderInventory() a mitad de un mantener-presionado reemplazaría la
 *  tarjeta bajo el dedo/mouse y el click que sigue al soltar caería sobre una tarjeta nueva,
 *  deseleccionando lo que se acababa de marcar. Solo marca ESTA tarjeta + muestra la barra de
 *  acciones; el resto de tarjetas ya existentes reacciona sola porque su propio onclick lee
 *  `invSelectMode` en vivo (variable del módulo, no una copia congelada al crearlas). */
function enterInvSelectMode(it, card){
  if(invSelectMode) return;
  invSelectMode = true;
  invSelectedIds.add(it.id);
  card.classList.add("selected");
  $("invList").querySelectorAll(".inv-card-v2").forEach(c=> c.classList.add("selectable"));
  $("invMassActions").classList.remove("hidden");
}
/** ¿Este objeto (o uno igual a él) ya está puesto en algún hueco de equipo ahora mismo? */
function isItemCurrentlyEquipped(item){
  if(item.slot === "accessory") return (player.equipment.accessory||[]).some(e=> e && e.id===item.id);
  const eq = player.equipment[item.slot];
  return !!(eq && eq.id === item.id);
}

// Pedido explícito: buscador/orden/"solo equipados" escondidos detrás de un botón "Filtros" (en
// vez de siempre visibles) — con 40 espacios nadie escribe para buscar, así que no vale la pena
// que ocupen su propia fila permanente.
$("btnInvFilters").onclick = ()=> $("invFiltersPanel").classList.toggle("hidden");
$("invSearchInput").addEventListener("input", (e)=>{ invSearchQuery = e.target.value; renderInventory(); });
$("invSortChipRow").querySelectorAll(".inv-sort-chip").forEach(chip=>{
  chip.onclick = ()=>{
    invSortMode = chip.dataset.sort;
    $("invSortChipRow").querySelectorAll(".inv-sort-chip").forEach(c=> c.classList.toggle("active", c===chip));
    renderInventory();
  };
});
$("invOnlyEquippedToggle").addEventListener("change", (e)=>{ invOnlyEquipped = e.target.checked; renderInventory(); });
$("btnInvCancelSelect").onclick = ()=>{
  invSelectMode = false;
  invSelectedIds.clear();
  renderInventory();
};
$("btnInvSellSelected").onclick = ()=>{
  if(invSelectedIds.size===0){ toast("Selecciona al menos un objeto para vender."); return; }
  let totalGold = 0;
  invSelectedIds.forEach(id=>{
    if(invLocked.has(id)) return; // los bloqueados no se venden por accidente
    const idxs = [];
    player.inventory.forEach((it,i)=>{ if(it.id===id) idxs.push(i); });
    idxs.forEach(i=> totalGold += Math.round((player.inventory[i].value||10)*0.5));
    for(let i=idxs.length-1;i>=0;i--) player.inventory.splice(idxs[i],1);
  });
  player.gold += totalGold;
  invSelectedIds.clear();
  invSelectMode = false;
  refreshHud();
  renderInventory();
  saveGame();
  toast(`💰 Vendiste objetos por ${totalGold} de oro.`);
};

/** Abre la hoja de detalle de un objeto — hace las veces del panel lateral fijo del diseño de
 *  referencia, adaptado a pantalla angosta (se abre encima en vez de vivir siempre al lado). */
function openInventoryDetail(it, count){
  const meta = equipItemMeta(it);
  const isEquipableNow = it.type==="equip";
  const usable = it.type==="heal" || it.type==="mana" || it.type==="capture_card" || it.type==="pet_item";
  const rarityColor = it.isBossLoot ? (it.auraColor||"#fff") : (RARITY_BY_KEY[it.rarity]||{}).color || "var(--dim)";

  $("invDetailIconWrap").innerHTML = iconFor(it);
  $("invDetailIconWrap").style.filter = `drop-shadow(0 0 18px ${rarityColor}66)`;
  $("invDetailRarity").textContent = it.isBossLoot ? "👑 Botín de Jefe" : (it.rarity ? rarityLabel(it.rarity) : "");
  $("invDetailRarity").style.color = rarityColor;
  $("invDetailName").textContent = it.name + (count>1 ? ` ×${count}` : "");
  $("invDetailTag").textContent = it.desc || "";

  const favBtn = $("btnInvDetailFav");
  favBtn.textContent = invFavorites.has(it.id) ? "★" : "☆";
  favBtn.classList.toggle("active", invFavorites.has(it.id));
  favBtn.onclick = ()=>{
    if(invFavorites.has(it.id)) invFavorites.delete(it.id); else invFavorites.add(it.id);
    favBtn.textContent = invFavorites.has(it.id) ? "★" : "☆";
    favBtn.classList.toggle("active", invFavorites.has(it.id));
  };

  let statsHtml = "";
  if(it.bonuses){
    statsHtml += `<div class="ids-row">⚔️ <div>${bonusDesc(it.bonuses)}</div></div>`;
  }
  if(it.proc){
    statsHtml += `<div class="ids-row">${PROC_LABELS[it.proc.type]||"✨"} <div>Probabilidad de efecto extra: ${Math.round(it.proc.chance*100)}%</div></div>`;
  }
  if(isEquipableNow && isItemCurrentlyEquipped(it)){
    statsHtml += `<div class="ids-row">✔️ <div style="color:#4fd67a;">Ya lo tienes equipado</div></div>`;
  }
  if(it.durability != null) statsHtml += durabilityBarHtml(it);
  $("invDetailStats").innerHTML = statsHtml || `<div class="ids-row">${it.desc||""}</div>`;

  $("invDetailCmp").innerHTML = isEquipableNow ? comparisonRowsColored(it) : "";

  const actionBtn = $("btnInvDetailAction");
  if(usable){
    actionBtn.classList.remove("hidden");
    actionBtn.textContent = "Usar";
    actionBtn.onclick = ()=>{
      if(inBattleItemMode && it.type==="pet_item"){ toast("🦴 Los ítems de mascota solo se pueden usar fuera de combate."); return; }
      inBattleItemMode ? useItemInBattleByGroupId(it.id) : useItemByGroupId(it.id);
      $("invDetailOverlay").classList.add("hidden");
      renderInventory();
    };
  } else if(isEquipableNow){
    actionBtn.classList.remove("hidden");
    actionBtn.textContent = isItemCurrentlyEquipped(it) ? "Ya equipado" : "Equipar";
    actionBtn.disabled = isItemCurrentlyEquipped(it);
    actionBtn.onclick = ()=>{
      equipItemByGroupId(it.id);
      $("invDetailOverlay").classList.add("hidden");
      renderInventory();
    };
  } else {
    actionBtn.classList.add("hidden");
  }
  $("invDetailOverlay").classList.remove("hidden");
}
/** Igual que comparisonLine, pero como filas separadas con color (verde/rojo) por estadística,
 *  para verlo de un vistazo — usa exactamente los mismos datos y cálculo de siempre. Si no
 *  tienes nada puesto en ese hueco todavía, lo avisa en vez de no mostrar nada. */
function comparisonRowsColored(item){
  const cmp = getEquippedComparison(item);
  if(!cmp){
    return `<div class="inv-detail-stats" style="margin-top:0;"><div class="ids-row" style="color:var(--dim);">🆚 No tienes nada equipado en ese hueco todavía — este objeto sería una mejora directa.</div></div>`;
  }
  if(!item.bonuses) return "";
  const otherBonuses = cmp.equipped.bonuses || {};
  const keys = new Set([...Object.keys(item.bonuses), ...Object.keys(otherBonuses)]);
  let rows = `<div class="ids-row" style="color:var(--dim); margin-bottom:2px;">🆚 Comparado con tu ${cmp.equipped.name} equipado:</div>`;
  keys.forEach(k=>{
    const diff = (item.bonuses[k]||0) - (otherBonuses[k]||0);
    if(diff===0) return;
    const cls = diff>0 ? "inv-cmp-up" : "inv-cmp-down";
    rows += `<div class="inv-cmp-row"><span>${STAT_LABEL[k]||k}</span><span class="${cls}">${diff>0?"+":""}${diff}</span></div>`;
  });
  return `<div class="inv-detail-stats" style="margin-top:0;">${rows}</div>`;
}
$("btnCloseInvDetail").onclick = ()=> $("invDetailOverlay").classList.add("hidden");


/** Estos "por id" resuelven al primer objeto de ese tipo en el inventario y reusan la lógica existente sin duplicarla. */
function useItemByGroupId(id){
  const idx = player.inventory.findIndex(it=>it.id===id);
  if(idx>=0) useItem(idx);
}
function useItemInBattleByGroupId(id){
  const idx = player.inventory.findIndex(it=>it.id===id);
  if(idx>=0) useItemInBattle(idx);
}
/** Qué libro único entrega cada guardián de parque la primera vez que lo derrotas (temática por guardián). */
const PARK_BOOK_MAP = {
  "parque_santander": "book_boss_lobo",     // Guardián de la Plaza
  "parque_corales":   "book_boss_demonio",  // Centinela de Las Granjas
  "parque_oasis":     "book_boss_golem",    // Behemot del Río del Oro
  "parque_gruta":     "book_boss_dragon",   // Espíritu de la Cordillera
};

function equipItemByGroupId(id){
  const idx = player.inventory.findIndex(it=>it.id===id);
  if(idx>=0) equipItem(idx);
}

function useItem(idx){
  const it = player.inventory[idx];
  if(!it) return;
  if(it.type==="capture_card"){ toast("🎴 Solo puedes usar la Carta de Captura durante un combate."); return; }
  if(it.type==="pet_item"){ openPetItemPicker(idx); return; }
  if(it.type==="heal"){
    if(player.hp >= player.maxHp){ toast(`${it.emoji} Ya tienes la vida al máximo.`); return; }
    const before = player.hp;
    player.hp = Math.min(player.maxHp, Math.round(player.hp + player.maxHp*it.amount));
    showHealFeedback("hp", before, player.hp, player.maxHp);
  }
  if(it.type==="mana"){
    if(player.mp >= player.maxMp){ toast(`${it.emoji} Ya tienes el maná al máximo.`); return; }
    const before = player.mp;
    player.mp = Math.min(player.maxMp, Math.round(player.mp + player.maxMp*it.amount));
    showHealFeedback("mp", before, player.mp, player.maxMp);
  }
  if(it.type==="heal" || it.type==="mana"){
    gameEventBus.emit({ type: "CONSUMABLE_USED", payload: { amount: 1 } });
  }
  player.inventory.splice(idx,1);
  refreshHud(); renderInventory();
  saveGame();
}

/** Elige a cuál mascota aplicar un ítem de entrenamiento (le sube el nivel, y con eso su bono de daño). */
function openPetItemPicker(idx){
  const it = player.inventory[idx];
  if(!it || !(player.pets||[]).length){ toast("No tienes ninguna mascota todavía."); return; }
  const list = $("petItemPickList");
  list.innerHTML = "";
  player.pets.forEach(pet=>{
    const row = document.createElement("div");
    row.className = "cm-item";
    row.innerHTML = `<div style="flex:1;"><span>${pet.emoji} ${petDisplayName(pet)}</span>
      <small style="display:block; color:var(--dim); font-size:10.5px;">Nv.${pet.level}</small></div>
      <button>Usar en esta</button>`;
    row.querySelector("button").onclick = ()=>{
      pet.level += it.petLevelUp;
      player.inventory.splice(idx,1);
      $("petItemPickOverlay").classList.add("hidden");
      toast(`${it.emoji} ${pet.name} ahora es Nv.${pet.level}!`);
      refreshHud(); renderInventory(); saveGame();
    };
    list.appendChild(row);
  });
  $("petItemPickOverlay").classList.remove("hidden");
}
$("btnClosePetItemPick").onclick = ()=> $("petItemPickOverlay").classList.add("hidden");

/** Abre el inventario DESDE dentro de un combate (PvE o PvP): usar una poción ahí gasta el turno. */
function openBattleInventory(){
  inBattleItemMode = true;
  renderInventoryTabs();
  renderInventoryClassTabs();
  renderInventory();
  $("invOverlay").classList.remove("hidden");
}
$("btnCloseInv").addEventListener("click", ()=>{ inBattleItemMode = false; });

/** Enruta el uso de un objeto en combate al sistema correspondiente (PvE o PvP). */
function useItemInBattle(idx){
  if(pvp){ pvpUseItem(idx); return; }
  if(battleState){ pveUseItemTurn(idx); return; }
  useItem(idx); // por si acaso no hay combate activo, comportamiento normal
}

/** PvE: usar un objeto cura/restaura maná pero consume el turno; el monstruo ataca después. */
function pveUseItemTurn(idx){
  const it = player.inventory[idx];
  if(!it) return;
  $("invOverlay").classList.add("hidden");
  if(it.type === "capture_card"){
    attemptCapture(idx);
    return;
  }
  clearTurnTimer();
  disableMoves(true);
  if(it.type==="heal"){
    const heal = Math.round(player.maxHp*it.amount);
    player.hp = Math.min(player.maxHp, player.hp+heal);
    logBattle(`Usas ${it.emoji} ${it.name} y recuperas ${heal} HP. Pierdes tu turno de ataque.`);
    flashSprite("spritePlayer","green");
  } else if(it.type==="mana"){
    const restore = Math.round(player.maxMp*it.amount);
    player.mp = Math.min(player.maxMp, player.mp+restore);
    logBattle(`Usas ${it.emoji} ${it.name} y recuperas ${restore} MP. Pierdes tu turno de ataque.`);
    flashSprite("spritePlayer","green");
  }
  player.inventory.splice(idx,1);
  updateBattleBars();
  refreshHud(); saveGame();
  setTimeout(()=> maybeDoPetTurn(()=> battleState.isPack ? packEnemyTurn() : enemyTurn()), 500);
}

/** Intenta capturar al enemigo actual (el único en combate solo, o el objetivo elegido en manada).
 *  Solo funciona si le queda ≤20% de su vida máxima. La carta se gasta siempre, tenga éxito o no. */
function attemptCapture(idx){
  clearTurnTimer();
  disableMoves(true);
  const target = battleState.isPack ? currentPackTarget() : battleState.mon;
  if(!target) return;
  const hpPct = target.curHp / target.maxHp;
  const success = hpPct <= 0.2 && !target.tpl.uncapturable;
  const targetElId = battleState.isPack ? "packStageMon"+battleState.selectedTarget : "spriteEnemy";
  player.inventory.splice(idx,1); // la carta se consume siempre, tenga éxito o no
  logBattle(success ? `🎴 ¡Lanzas la Carta de Captura!` : `🎴 Lanzas la Carta de Captura...`);
  refreshHud();

  playCaptureAnimation(success, targetElId, ()=>{
    if(!success){
      const msg = target.tpl.name === "Lobo Sombrío"
        ? `${target.tpl.name}: "¡No me subestimes!" La carta se rompe.`
        : target.tpl.uncapturable
        ? `¡${target.tpl.name} se resiste con fuerza! La carta se rompe.`
        : `¡${target.tpl.name} todavía tiene demasiada vida! La carta se pierde.`;
      logBattle(msg);
      saveGame();
      setTimeout(()=> battleState.isPack ? packEnemyTurn() : enemyTurn(), 500);
      return;
    }
    if(!player.pets) player.pets = [];
    // si todavía no tenía ninguna mascota, la cuña "Mascotas" del menú radial estaba oculta — que
    // aparezca con énfasis la próxima vez que abra el menú (ver updateWheelMenuLockedSlices).
    if(player.pets.length === 0) player._justUnlockedPetSlice = true;
    // Bestiario: registro PERSISTENTE por especie (independiente de player.pets — si sueltas o
    // pierde la mascota, la página capturada sigue llena) — ver renderMonsterCodex/btnOpenMonsterCodex.
    if(!player.monsterRegistry) player.monsterRegistry = {};
    const regEntry = player.monsterRegistry[target.tpl.name];
    if(regEntry) regEntry.count++;
    else player.monsterRegistry[target.tpl.name] = {firstCapturedAt: Date.now(), count: 1};
    // la mascota conserva una parte de las estadísticas del monstruo capturado, ajustada según su especie
    // (tanques como el golem aguantan más pero pegan menos; ágiles como el lobo pegan más pero aguantan menos)
    const petProfile = getPetProfile(target.tpl.name);
    const petMaxHp = Math.round(target.maxHp*0.75*petProfile.hpMult);
    const pet = { id:"pet_"+Math.random().toString(36).slice(2,9), name:target.tpl.name, emoji:target.tpl.emoji,
      level: target.level, capturedAt: Date.now(), speciesBalanced: true,
      isBoss: !!target.isBoss, isParkGuardian: !!target.isParkGuardian, aggressive: !!target.tpl.aggressive,
      maxHp: petMaxHp, hp: petMaxHp,
      atk: +(target.atk*petProfile.atkMult).toFixed(1),
      def: +(target.def*0.9*petProfile.defMult).toFixed(1),
      spd: target.spd,
      xp: 0, xpNext: Math.round(40 + target.level*12), dodgeChance: 0.15,
      moves: unlockedPetMoves(target.tpl.name, target.level) };
    player.pets.push(pet);
    logBattle(`🎴 ¡Capturaste a ${target.tpl.name}! Ahora es tu mascota.`);
    if(target.isBoss && !target.isParkGuardian) releaseBossLock(target);

    if(battleState.isPack){
      target.curHp = 0;
      renderPackEnemyPanels(); renderPackStage();
      const anyAlive = battleState.mons.some(m=>m.curHp>0);
      refreshHud(); saveGame();
      setTimeout(()=>{ if(!anyAlive) packWinBattle(); else packEnemyTurn(); }, 500);
    } else {
      if(battleState.mon.marker){ map.removeLayer(battleState.mon.marker); monsters = monsters.filter(m=>m.id!==battleState.mon.id); }
      setTimeout(()=>{
        $("battleWrap").classList.add("hidden");
        $("resultEmoji").textContent = "🎴";
        $("resultTitle").textContent = "¡Captura exitosa!";
        $("resultSub").innerHTML = `${pet.emoji} ${pet.name} ahora es tu mascota.`;
        $("resultOverlay").classList.remove("hidden");
        updateResultProgressVisibility(false);
        battleState = null;
        saveGame();
      }, 400);
    }
  });
}

/** Secuencia especial de captura: la carta gira y se encoge hacia el enemigo; si funciona, se ve
 *  al monstruo encogerse y desvanecerse "absorbido" hacia la carta antes de que se cierre. */
function playCaptureAnimation(success, targetElId, callback){
  const overlay = $("captureFxOverlay");
  const burst = $("captureBurstFx");
  const resultText = $("captureResultText");
  const targetOuterEl = targetElId ? document.getElementById(targetElId) : null;
  const targetEl = (targetOuterEl && targetElId.startsWith("packStageMon"))
    ? targetOuterEl.querySelector(".psm-emoji") || targetOuterEl
    : targetOuterEl;
  resultText.textContent = success ? "✨ ¡Capturado! ✨" : "💨 ¡Se escapó!";
  resultText.style.color = success ? "#c98bf0" : "var(--danger)";
  burst.textContent = success ? "✨" : "💢";
  overlay.classList.remove("show"); void overlay.offsetWidth;
  overlay.classList.add("show");
  burst.classList.remove("show"); void burst.offsetWidth;
  burst.classList.add("show");
  resultText.classList.remove("show"); void resultText.offsetWidth;
  resultText.classList.add("show");
  if(targetEl){
    targetEl.classList.remove("capture-suck-in", "capture-escape");
    void targetEl.offsetWidth;
    targetEl.classList.add(success ? "capture-suck-in" : "capture-escape");
  }
  clearTimeout(overlay._captureTimer);
  overlay._captureTimer = setTimeout(()=>{
    overlay.classList.remove("show");
    burst.classList.remove("show");
    resultText.classList.remove("show");
    if(targetEl) targetEl.classList.remove("capture-suck-in", "capture-escape");
    callback();
  }, 2600);
}

/** Lista tus mascotas disponibles (que no estén ya invocadas en este combate) para elegir cuál invocar. */
function openPetSummonPicker(){
  const list = $("petSummonList");
  list.innerHTML = "";
  const summoned = battleState.summonedPets || [];
  const available = (player.pets||[]).filter(p=> !summoned.some(sp=>sp.id===p.id));
  if(available.length===0){
    list.innerHTML = `<div class="empty-note">No tienes más mascotas disponibles para invocar.</div>`;
  }
  available.forEach(pet=>{
    // Solo las especies con diseño de batalla terminado se pueden invocar por ahora (ver
    // SUMMONABLE_PET_SPECIES en game/config/pets.js) — el resto se ve en la lista igual (así no
    // parece que "desaparecieron"), pero con el botón deshabilitado y el motivo aclarado.
    const summonable = SUMMONABLE_PET_SPECIES.includes(pet.name);
    const row = document.createElement("div");
    row.className = "cm-item";
    const btnLabel = pet.hp<=0 ? "Debilitada" : !summonable ? "Solo colección" : "Invocar";
    row.innerHTML = `<div style="flex:1;"><span>${pet.emoji} ${petDisplayName(pet)}</span>
      <small style="display:block; color:var(--dim); font-size:10.5px;">Nv.${pet.level} · HP ${pet.hp}/${pet.maxHp}${!summonable?" · aún sin diseño de batalla":""}</small></div>
      <button ${(pet.hp<=0||!summonable)?"disabled":""}>${btnLabel}</button>`;
    if(summonable){
      row.querySelector("button").onclick = ()=>{ $("petSummonOverlay").classList.add("hidden"); summonPet(pet); };
    }
    list.appendChild(row);
  });
  $("petSummonOverlay").classList.remove("hidden");
}
$("btnClosePetSummon").onclick = ()=> $("petSummonOverlay").classList.add("hidden");

/** Invoca una mascota: gasta tu turno de ataque, y mientras esté activa te da un pequeño bono de daño en tus golpes. */
function summonPet(pet){
  clearTurnTimer();
  disableMoves(true);
  ensurePetStats(pet);
  if(pet.hp <= 0){
    toast(`🐾 ${petDisplayName(pet)} está debilitada (0 HP). Cúrala desde Mascotas para invocarla.`);
    disableMoves(false);
    renderMoveGrid();
    return;
  }
  if(!battleState.summonedPets) battleState.summonedPets = [];
  const current = battleState.summonedPets[0];
  const isSwap = current && current.id !== pet.id;
  if(isSwap){
    logBattle(`🐾 Retiras a ${petDisplayName(current)}...`);
    battleState.summonedPets = [];
  }
  logBattle(`🎴 ¡Lanzas la carta de ${petDisplayName(pet)}!`);
  playSummonAnimation(()=>{
    battleState.summonedPets.push(pet);
    logBattle(`🐾 ¡Invocas a ${pet.emoji} ${petDisplayName(pet)}!`);
    animateSprite("spritePlayer","attackp");
    flashSprite("spritePlayer","green");
    renderPetStageSlot();
    refreshHud(); saveGame();
    setTimeout(()=> battleState.isPack ? packEnemyTurn() : enemyTurn(), 700);
  });
}
/** Anima la carta de invocación: aparece, brilla, y se abre para soltar a la mascota. */
function playSummonAnimation(callback){
  const overlay = $("summonFxOverlay");
  const burst = $("summonBurstFx");
  overlay.classList.remove("show"); void overlay.offsetWidth;
  overlay.classList.add("show");
  burst.classList.remove("show"); void burst.offsetWidth;
  burst.classList.add("show");
  clearTimeout(overlay._summonTimer);
  overlay._summonTimer = setTimeout(()=>{
    overlay.classList.remove("show");
    burst.classList.remove("show");
    callback();
  }, 1400);
}
/** Nombre a mostrar de una mascota: el que le puso el jugador, o si no, el de su especie. */
function petDisplayName(pet){ return pet.customName || pet.name; }

/** Le da experiencia a la mascota que tengas invocada (si tienes alguna) al ganar un combate. */
function grantPetXpIfSummoned(amount){
  const pet = battleState && battleState.summonedPets && battleState.summonedPets[0];
  if(!pet || amount<=0) return null;
  const summary = grantPetXp(pet, amount);
  if(summary.gainedLevels>0) logBattle(`🐾 ¡${petDisplayName(pet)} subió a Nv.${pet.level}!`);
  if(summary.newMoves && summary.newMoves.length){
    summary.newMoves.forEach(m=> logBattle(`📖 ¡${petDisplayName(pet)} aprendió ${m.name}!`));
  }
  return summary;
}
/** Aplica experiencia a una mascota y la sube de nivel las veces que haga falta (mejora sus estadísticas y se cura al subir). */
/** Perfil de combate según el tipo de mascota: los tanques aguantan más pero pegan menos, los ágiles al revés. */
if(false){
const PET_SPECIES_PROFILES = {
  "Golem de Roca": {hpMult:1.45, atkMult:0.8,  defMult:1.55, hpGrowth:11, atkGrowth:1.0, defGrowth:1.7},
  "Lobo Umbrío":   {hpMult:0.7,  atkMult:1.55, defMult:0.7,  hpGrowth:4,  atkGrowth:2.3, defGrowth:0.5},
  "Dragón Menor":  {hpMult:1.0,  atkMult:1.15, defMult:1.0,  hpGrowth:7,  atkGrowth:1.6, defGrowth:1.0},
  "Demonio Menor": {hpMult:0.85, atkMult:1.3,  defMult:0.85, hpGrowth:5,  atkGrowth:1.9, defGrowth:0.7},
};
const DEFAULT_PET_PROFILE = {hpMult:1, atkMult:1.15, defMult:1, hpGrowth:6, atkGrowth:1.5, defGrowth:0.9};
}
/** Busca el perfil de una especie (tanque/ágil/equilibrado); si no está en la tabla, usa uno neutral de respaldo. */
function getPetProfile(name){ return PET_SPECIES_PROFILES[name] || DEFAULT_PET_PROFILE; }
/** Tabla de movimientos propia de esa especie (o la genérica de respaldo si no tiene una). */
function getPetMovesetTable(name){ return PET_MOVESETS[name] || DEFAULT_PET_MOVESET; }
/** Todos los movimientos que ya debería conocer una mascota de esa especie, según su nivel actual. */
function unlockedPetMoves(name, level){
  return getPetMovesetTable(name)
    .filter(m=> m.atLevel <= level)
    .map(m=> ({id:m.id, name:m.name, power:m.power, type:m.moveType||"phys"}));
}

function grantPetXp(pet, amount){
  ensurePetStats(pet);
  const profile = getPetProfile(pet.name);
  const beforeLevel = pet.level;
  const beforeXp = pet.xp;
  const beforeXpNext = pet.xpNext;
  const movesBefore = new Set(pet.moves.map(m=>m.id));
  pet.xp += amount;
  let gainedLevels = 0;
  while(pet.xp >= pet.xpNext){
    pet.xp -= pet.xpNext;
    pet.level++;
    pet.maxHp += Math.round(profile.hpGrowth);
    pet.hp = pet.maxHp; // se cura completo al subir de nivel
    pet.atk = +(pet.atk + profile.atkGrowth).toFixed(1);
    pet.def = +(pet.def + profile.defGrowth).toFixed(1);
    pet.xpNext = Math.round(40 + pet.level*12);
    gainedLevels++;
  }
  // si el nuevo nivel desbloqueó movimientos nuevos de su especie, los aprende automáticamente
  let newMoves = [];
  if(gainedLevels > 0){
    pet.moves = unlockedPetMoves(pet.name, pet.level);
    newMoves = pet.moves.filter(m=> !movesBefore.has(m.id));
  }
  return {
    id: pet.id,
    emoji: pet.emoji,
    name: petDisplayName(pet),
    beforeLevel,
    beforeXp,
    beforeXpNext,
    afterLevel: pet.level,
    afterXp: pet.xp,
    afterXpNext: pet.xpNext,
    gainedLevels,
    gainedXp: amount,
    newMoves,
  };
}

/** Si una mascota fue capturada ANTES de este sistema (o antes del rebalanceo), le da estadísticas según su especie. */
function ensurePetStats(pet){
  const profile = getPetProfile(pet.name);
  if(!pet.maxHp || !pet.speciesBalanced){
    const lvl = pet.level || 5;
    pet.maxHp = Math.round((18+lvl*10)*0.85*profile.hpMult);
    pet.atk = +((3+lvl*2)*profile.atkMult).toFixed(1);
    pet.def = +((3+lvl*1.5)*0.9*profile.defMult).toFixed(1);
    pet.spd = 5+Math.floor(lvl*0.5);
    pet.speciesBalanced = true; // ya se reajustó a su especie una vez — de aquí en más solo crece con grantPetXp
  }
  if(!pet.moves || !pet.moves.length){
    pet.moves = unlockedPetMoves(pet.name, pet.level||5);
  }
  if(pet.hp == null) pet.hp = pet.maxHp;
  if(pet.hp > pet.maxHp) pet.hp = pet.maxHp;
  if(pet.xp == null) pet.xp = 0;
  if(pet.xpNext == null) pet.xpNext = Math.round(40 + pet.level*12);
  if(pet.dodgeChance == null) pet.dodgeChance = 0.15;
  return pet;
}

/** Tabla de mascotas con arte propio (base + ataque) — agregar aquí cuando lleguen más ilustraciones. */
const PET_SPRITE_SETS = {
  "Lobo Umbrío": LOBO_UMBRIO_SPRITES,
  "Demonio Menor": DEMONIO_MENOR_SPRITES,
  "Golem de Roca": GOLEM_ROCA_SPRITES,
  "Dragón Menor": DRAGON_MENOR_SPRITES,
  "Dragón Ancestral": DRAGON_ANCESTRAL_SPRITES,
};

function renderPetStageSlot(){
  const el = $("petStageSlot");
  const pets = (battleState && battleState.summonedPets) || [];
  if(pets.length === 0){ el.classList.add("hidden"); el.innerHTML = ""; return; }
  const pet = ensurePetStats(pets[0]); // por ahora solo se puede invocar 1 a la vez
  const spriteSet = PET_SPRITE_SETS[pet.name];
  const isBossPet = !!getPetProfile(pet.name).isBossPet;
  const sizeStyle = isBossPet ? "height:140px; max-width:130px;" : "height:78px; max-width:80px;";
  const petVisual = spriteSet
    ? `<img src="${spriteSet.petBase}" data-pet-art="1" alt="" style="${sizeStyle} width:auto; display:block;">`
    : `<span style="font-size:${isBossPet?"84px":"68px"};">${pet.emoji}</span>`;
  el.classList.toggle("pet-boss", isBossPet);
  el.innerHTML = `<div class="pet-emoji">${petVisual}</div>
    <div class="pet-hpbar"><div class="pet-hpfill" style="width:${pct(pet.hp,pet.maxHp)}%"></div></div>
    <div class="pet-label">${petDisplayName(pet)}</div>`;
  el.classList.remove("hidden");
}

/** Tras tu propio turno, si tienes una mascota viva invocada, te deja elegir qué ataque usa antes de que responda el enemigo. */
function maybeDoPetTurn(afterCallback){
  const pet = battleState && battleState.summonedPets && battleState.summonedPets[0];
  if(!pet || pet.hp<=0){ afterCallback(); return; }
  const grid = $("movegrid");
  grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#4fd67a; font-weight:800; font-size:12.5px; padding:6px;">🐾 ¿Qué hace ${pet.emoji} ${petDisplayName(pet)}?</div>`;
  pet.moves.forEach(mv=>{
    const btn = document.createElement("button");
    btn.className = "move-btn";
    btn.style.borderColor = "#4fd67a";
    btn.innerHTML = `<div class="mname" style="color:#4fd67a;">${mv.name}</div><div class="mmeta">Poder ${mv.power}</div>`;
    btn.onclick = ()=> resolvePetMove(pet, mv, afterCallback);
    grid.appendChild(btn);
  });
}
function resolvePetMove(pet, mv, afterCallback){
  const mon = battleState.isPack ? currentPackTarget() : battleState.mon;
  const petEmojiEl = document.querySelector("#petStageSlot .pet-emoji");
  if(petEmojiEl){ petEmojiEl.classList.remove("attackp"); void petEmojiEl.offsetWidth; petEmojiEl.classList.add("attackp"); }
  if(PET_SPRITE_SETS[pet.name]) triggerPetArtAttackPose(pet.name);
  if(mon){
    const dmg = calcDamage(pet.atk, mon.def, mv.power, 0.05);
    mon.curHp = Math.max(0, mon.curHp - dmg);
    logBattle(`🐾 ${petDisplayName(pet)} usa ${mv.name}: ${dmg} de daño.`);
    if(battleState.isPack){ renderPackEnemyPanels(); renderPackStage(); }
    animateSprite("spriteEnemy","hitshake");
    flashSprite("spriteEnemy","red");
    updateBattleBars();
  }
  refreshHud(); saveGame();
  setTimeout(()=>{
    if(battleState.isPack){
      const anyAlive = battleState.mons.some(m=>m.curHp>0);
      if(!anyAlive) return packWinBattle();
    } else if(mon && mon.curHp<=0){
      return winBattle();
    }
    afterCallback();
  }, 700);
}
/** Bono de daño plano que aportan las mascotas activas (simple por ahora — no tienen su propio moveset todavía). */
function petDamageBonus(){
  const pets = (battleState && battleState.summonedPets) || [];
  return pets.reduce((s,p)=> s + 4 + p.level*1.5, 0);
}



/* ---------- Equipo (armas, armaduras, collares, anillos) ---------- */
function applyBonuses(b){
  if(!b) return;
  if(b.atk) player.atk += b.atk;
  if(b.matk) player.matk += b.matk;
  if(b.def) player.def += b.def;
  if(b.spd) player.spd += b.spd;
  if(b.maxHp){ player.maxHp += b.maxHp; player.hp += b.maxHp; }
  if(b.maxMp){ player.maxMp += b.maxMp; player.mp += b.maxMp; }
  if(b.critBonus) player.critBonus = (player.critBonus||0) + b.critBonus;
  if(b.lowHpShield) player.lowHpShield = (player.lowHpShield||0) + b.lowHpShield;
}
function unapplyBonuses(b){
  if(!b) return;
  if(b.atk) player.atk -= b.atk;
  if(b.matk) player.matk -= b.matk;
  if(b.def) player.def -= b.def;
  if(b.spd) player.spd -= b.spd;
  if(b.maxHp){ player.maxHp -= b.maxHp; player.hp = Math.min(player.hp, player.maxHp); }
  if(b.maxMp){ player.maxMp -= b.maxMp; player.mp = Math.min(player.mp, player.maxMp); }
  if(b.critBonus) player.critBonus = Math.max(0, (player.critBonus||0) - b.critBonus);
  if(b.lowHpShield) player.lowHpShield = Math.max(0, (player.lowHpShield||0) - b.lowHpShield);
}

/** Equipa un objeto del inventario (por índice). El objeto previo en ese slot vuelve al inventario. */
if(false){
const EQUIP_UPGRADE_MAX = 5;
}
/** Costo en oro para subir el objeto equipado UN nivel de mejora más. */
/** Precio real de venta en tienda: más caro que el valor base del objeto (que sigue usándose tal cual
 *  para mejoras y otros cálculos) — así conseguir oro fácil ya no alcanza para comprar todo de una. */
const SHOP_PRICE_MULTIPLIER = 2.3;
function shopPrice(item){ return Math.round((item.value||30) * SHOP_PRICE_MULTIPLIER); }

function upgradeCost(item){
  const lvl = item.upgradeLevel||0;
  return Math.round((item.value||30) * 0.45 * (lvl+1));
}
/** Aplica un nivel de mejora al objeto (recalcula sus bonificaciones desde las ORIGINALES, para que no se
 *  vayan acumulando de forma descontrolada si se mejora varias veces). */
function applyUpgradeToItem(item, level){
  if(!item.baseBonuses){
    item.baseBonuses = {...item.bonuses}; // guarda el original la primera vez que se mejora
    // guarda también la parte del texto que NO son las estadísticas (ej. "· requiere Nv.30 · exclusivo...")
    const oldDesc = bonusDesc(item.baseBonuses);
    item.descSuffix = item.desc.startsWith(oldDesc) ? item.desc.slice(oldDesc.length) : " " + item.desc;
  }
  item.upgradeLevel = level;
  const mult = 1 + level*0.12; // +12% por nivel de mejora
  const scaled = {};
  Object.keys(item.baseBonuses).forEach(k=> scaled[k] = Math.max(1, Math.round(item.baseBonuses[k]*mult)));
  item.bonuses = scaled;
  item.desc = bonusDesc(scaled) + item.descSuffix;
}
function upgradeEquippedItem(slot, accIdx){
  const item = slot==="accessory" ? player.equipment.accessory[accIdx] : player.equipment[slot];
  if(!item) return;
  const level = item.upgradeLevel||0;
  if(level >= EQUIP_UPGRADE_MAX){ toast("Este objeto ya está al máximo de mejora (+5)."); return; }
  const cost = upgradeCost(item);
  if(player.gold < cost){ toast(`Necesitas 💰${cost} para mejorarlo.`, 3200); return; }
  player.gold -= cost;
  unapplyBonuses(item.bonuses);
  applyUpgradeToItem(item, level+1);
  applyBonuses(item.bonuses);
  refreshHud(); renderEquipPanel(); saveGame();
  toast(`🔧 ¡${item.name} mejorado a +${level+1}!`);
}

function equipItem(idx, accessorySlotIdx){
  const item = player.inventory[idx];
  if(!item || (item.type!=="equip" && item.type!=="book")) return;
  if(item.classKey && item.classKey!==player.classKey){
    toast(`Solo un(a) ${(CLASSES[item.classKey]||{}).name||item.classKey} puede equipar esto.`, 3500);
    return;
  }
  if(item.reqLevel && player.level < item.reqLevel){
    toast(`Necesitas ser Nv.${item.reqLevel} para equipar ${item.name}.`, 3500);
    return;
  }
  const slot = item.slot;
  if(slot === "accessory"){
    const arr = player.equipment.accessory;
    let targetIdx = accessorySlotIdx;
    if(targetIdx == null){
      targetIdx = arr.findIndex(a=>!a); // primer espacio vacío
      if(targetIdx === -1) targetIdx = 0; // si están todos llenos, reemplaza el primero
    }
    const current = arr[targetIdx];
    if(current){
      if(current.type==="book") forgetBookMove(current); else unapplyBonuses(current.bonuses);
      player.inventory.push({...current});
    }
    if(item.type==="book") learnBookMove(item); else applyBonuses(item.bonuses);
    arr[targetIdx] = item;
  } else {
    const current = player.equipment[slot];
    if(current){ unapplyBonuses(effectiveBonuses(current)); current._damagedPenaltyApplied = false; player.inventory.push({...current}); }
    applyBonuses(item.bonuses);
    player.equipment[slot] = item;
    item._damagedPenaltyApplied = false;
    syncDamagedPenalty(item);
  }
  syncDungeonSetBonuses();
  player.inventory.splice(idx,1);
  gameEventBus.emit({ type: "ITEM_EQUIPPED", payload: { amount: 1 }, dedupeKey: item.id });
  refreshHud(); renderInventory();
  toast(`${item.emoji} Equipaste ${item.name}.`);
  saveGame();
}

/** Al equipar un libro, aprendes su movimiento — si no tienes espacio, reemplaza temporalmente el último
 *  movimiento aprendido (se guarda para devolverlo cuando te quites el libro). */
function learnBookMove(item){
  const mv = item.teachMove;
  if(player.moves.length < 4){
    player.moves.push(mv);
    item._displacedMove = null;
    toast(`📖 Aprendes ${mv.name} mientras lleves puesto ${item.name}.`, 4000);
  } else {
    const displaced = player.moves[player.moves.length-1];
    item._displacedMove = displaced;
    player.moves[player.moves.length-1] = mv;
    toast(`📖 Aprendes ${mv.name} — reemplaza temporalmente a ${displaced.name} mientras lleves el libro puesto.`, 4500);
  }
}
/** Al quitarte el libro, olvidas su movimiento y recuperas el que tenías antes (si se reemplazó alguno). */
function forgetBookMove(item){
  const mv = item.teachMove;
  const idx = player.moves.findIndex(m=>m.id===mv.id);
  if(idx===-1) return;
  if(item._displacedMove){
    player.moves[idx] = item._displacedMove;
    toast(`📖 Ya no tienes ${item.name} puesto — recuperas ${item._displacedMove.name}.`, 4000);
  } else {
    player.moves.splice(idx,1);
    toast(`📖 Ya no tienes ${item.name} puesto — olvidas ${mv.name}.`, 4000);
  }
  item._displacedMove = null;
}

/** Quita lo que hay en un slot y lo regresa al inventario. slotOrIdx: nombre de slot, o índice si es accesorio. */
function unequipSlot(slot, accessorySlotIdx){
  if(slot === "accessory"){
    const arr = player.equipment.accessory;
    const current = arr[accessorySlotIdx];
    if(!current) return;
    if(current.type==="book") forgetBookMove(current); else unapplyBonuses(current.bonuses);
    arr[accessorySlotIdx] = null;
    player.inventory.push({...current});
    syncDungeonSetBonuses();
    refreshHud(); renderEquipPanel();
    toast(`Guardaste ${current.name} en tu inventario.`);
    saveGame();
    return;
  }
  const current = player.equipment[slot];
  if(!current) return;
  unapplyBonuses(effectiveBonuses(current));
  current._damagedPenaltyApplied = false;
  player.equipment[slot] = null;
  player.inventory.push({...current});
  syncDungeonSetBonuses();
  refreshHud(); renderEquipPanel();
  toast(`Guardaste ${current.name} en tu inventario.`);
  saveGame();
}

$("btnEquip").onclick = ()=>{ closeFabMenu(); renderEquipPanel(); $("equipOverlay").classList.remove("hidden"); };
$("btnCloseEquip").onclick = ()=> $("equipOverlay").classList.add("hidden");

/* ---------- Puntos de atributo (se ganan al subir de nivel) ---------- */
if(false){
const ATTR_DEFS = [
  {key:"maxHp", label:"Vida", emoji:"❤️", per:4},
  {key:"maxMp", label:"Maná", emoji:"🔵", per:2},
  {key:"atk",   label:"Ataque físico", emoji:"⚔️", per:1},
  {key:"matk",  label:"Ataque mágico", emoji:"🔮", per:1},
  {key:"def",   label:"Defensa", emoji:"🛡️", per:1},
  {key:"spd",   label:"Velocidad", emoji:"💨", per:0.6},
];
}

function openAttrsScreen(){
  closeFabMenu();
  renderAttrsScreen();
  $("attrsOverlay").classList.remove("hidden");
}
$("btnAttrs").onclick = openAttrsScreen;
$("pointsBadge").onclick = openAttrsScreen;

/** Botón ⚙️ flotante (fuera del anillo, arriba a la derecha — ver .fab-corner-settings en main.css,
 *  visible solo con el menú ☰ abierto) — cuenta (login/logout) + exportar/importar partida, movidos
 *  acá desde la ficha de personaje (pedido explícito: un botón de ajustes dedicado en vez de tener
 *  que entrar a Atributos para encontrarlos). #csAccountRow/#csSaveTransferRow no cambiaron de id,
 *  así que wireAccountRow()/wireSaveTransferRow() siguen funcionando igual, solo que ahora ese HTML
 *  vive en #settingsOverlay en vez de #charSheetOverlay. */
function openSettingsScreen(){
  closeFabMenu();
  $("settingsOverlay").classList.remove("hidden");
}
$("btnSettingsCorner").onclick = openSettingsScreen;
$("btnCloseSettings").onclick = ()=> $("settingsOverlay").classList.add("hidden");
$("btnCloseAttrs").onclick = ()=> $("attrsOverlay").classList.add("hidden");

function renderAttrsScreen(){
  const pts = player.attributePoints||0;
  $("attrsPointsLeft").textContent = pts;
  const list = $("attrsList");
  list.innerHTML = "";
  if(!player.attrSpent) player.attrSpent = {maxHp:0,maxMp:0,atk:0,matk:0,def:0,spd:0};
  ATTR_DEFS.forEach(def=>{
    const current = def.key==="maxHp" ? `${player.hp}/${player.maxHp}` :
                     def.key==="maxMp" ? `${player.mp}/${player.maxMp}` :
                     round1(player[def.key]||0);
    const spentPts = Math.round((player.attrSpent[def.key]||0) / def.per);
    const row = document.createElement("div");
    row.className = "inv-item";
    row.innerHTML = `<div class="ie">${def.emoji}</div>
      <div class="it">${def.label}<small>Actual: ${current} · +${def.per} por punto</small></div>
      <div class="attr-stepper">
        <button class="attr-step-btn" data-act="minus" ${spentPts<=0?"disabled":""}>−</button>
        <span class="attr-step-val">${spentPts}</span>
        <button class="attr-step-btn" data-act="plus" ${pts<=0?"disabled":""}>+</button>
      </div>`;
    row.querySelector('[data-act="plus"]').onclick = ()=> spendAttributePoint(def.key, def.per);
    row.querySelector('[data-act="minus"]').onclick = ()=> refundOneAttributePoint(def.key, def.per);
    list.appendChild(row);
  });
}

function spendAttributePoint(statKey, per){
  if((player.attributePoints||0) <= 0) return;
  player.attributePoints--;
  if(!player.attrSpent) player.attrSpent = {maxHp:0,maxMp:0,atk:0,matk:0,def:0,spd:0};
  player.attrSpent[statKey] = +((player.attrSpent[statKey]||0) + per).toFixed(2);
  if(statKey==="maxHp"){ player.maxHp = Math.round(player.maxHp+per); player.hp = Math.round(player.hp+per); }
  else if(statKey==="maxMp"){ player.maxMp = Math.round(player.maxMp+per); player.mp = Math.round(player.mp+per); }
  else { player[statKey] = +((player[statKey]||0)+per).toFixed(1); }
  refreshHud();
  renderAttrsScreen();
  saveGame();
}

/** Quita UN solo punto ya puesto en esta estadística específica y lo devuelve a los disponibles
 *  (a diferencia de "reiniciar todo", esto ajusta de a uno sin perder lo repartido en las demás). */
function refundOneAttributePoint(statKey, per){
  if(!player.attrSpent) return;
  const spentPts = Math.round((player.attrSpent[statKey]||0) / per);
  if(spentPts <= 0) return;
  player.attrSpent[statKey] = +((player.attrSpent[statKey]||0) - per).toFixed(2);
  if(statKey==="maxHp"){ player.maxHp = Math.max(1, Math.round(player.maxHp-per)); player.hp = Math.min(player.hp, player.maxHp); }
  else if(statKey==="maxMp"){ player.maxMp = Math.max(0, Math.round(player.maxMp-per)); player.mp = Math.min(player.mp, player.maxMp); }
  else { player[statKey] = +((player[statKey]||0)-per).toFixed(1); }
  player.attributePoints = (player.attributePoints||0) + 1;
  refreshHud();
  renderAttrsScreen();
  saveGame();
}

/** Revierte TODOS los puntos ya distribuidos (no afecta el crecimiento por nivel ni el equipo) y los devuelve para repartir de nuevo. */
function resetAttributePoints(){
  const spent = player.attrSpent || {maxHp:0,maxMp:0,atk:0,matk:0,def:0,spd:0};
  let totalPoints = 0;
  Object.keys(spent).forEach(k=>{
    const amt = spent[k];
    if(!amt) return;
    if(k==="maxHp"){ player.maxHp = Math.round(player.maxHp-amt); player.hp = Math.min(player.hp, player.maxHp); }
    else if(k==="maxMp"){ player.maxMp = Math.round(player.maxMp-amt); player.mp = Math.min(player.mp, player.maxMp); }
    else { player[k] = +((player[k]||0)-amt).toFixed(1); }
    const per = (ATTR_DEFS.find(d=>d.key===k)||{}).per || 1;
    totalPoints += Math.round(amt/per);
    spent[k] = 0;
  });
  player.attributePoints = (player.attributePoints||0) + totalPoints;
  player.attrSpent = spent;
  refreshHud();
  renderAttrsScreen();
  saveGame();
  toast(`↺ Recuperaste ${totalPoints} puntos para repartir de nuevo.`, 3200);
}
$("btnResetAttrs").onclick = ()=>{
  showConfirm("¿Reiniciar todos los puntos de atributo distribuidos? Podrás repartirlos de nuevo.", resetAttributePoints, {icon:"↺", confirmLabel:"Reiniciar"});
};

function renderEquipPanel(){
  const list = $("equipList");
  list.innerHTML = "";
  EQUIP_SLOTS.forEach(slotDef=>{
    if(slotDef.classOnly && !slotDef.classOnly.includes(player.classKey)) return; // esta clase no usa este slot
    if(slotDef.key === "accessory"){
      player.equipment.accessory.forEach((item, i)=>{
        const row = document.createElement("div");
        if(item){
          const meta = equipItemMeta(item);
          applyItemRowStyling(row, meta);
          const lvl = item.upgradeLevel||0;
          const lvlTag = lvl>0 ? ` <b style="color:var(--gold);">+${lvl}</b>` : "";
          row.innerHTML = `${meta.sparkles}<div class="ie">${iconFor(item)}</div>
            <div class="it">Accesorio ${i+1}: ${item.name}${lvlTag}${meta.tag}<small>${item.desc}</small></div>
            <button data-act="remove">Quitar</button>`;
          row.querySelector('[data-act="remove"]').onclick = ()=> unequipSlot("accessory", i);
        } else {
          row.className = "inv-item";
          row.innerHTML = `<div class="ie">${slotIconFor(slotDef)}</div>
            <div class="it">Accesorio ${i+1}<small style="color:var(--dim)">Vacío — equipa uno desde tu inventario</small></div>`;
        }
        list.appendChild(row);
      });
      return;
    }
    const item = player.equipment[slotDef.key];
    const row = document.createElement("div");
    if(item){
      const meta = equipItemMeta(item);
      applyItemRowStyling(row, meta);
      const lvl = item.upgradeLevel||0;
      const lvlTag = lvl>0 ? ` <b style="color:var(--gold);">+${lvl}</b>` : "";
      row.style.flexDirection = "column";
      row.style.alignItems = "stretch";
      row.innerHTML = `<div style="display:flex; align-items:center; gap:10px;">${meta.sparkles}<div class="ie">${iconFor(item)}</div>
        <div class="it" style="flex:1;">${slotDef.label}: ${item.name}${lvlTag}${meta.tag}<small>${item.desc}</small></div>
        <button data-act="remove">Quitar</button></div>
        ${durabilityBarHtml(item)}`;
      row.querySelector('[data-act="remove"]').onclick = ()=> unequipSlot(slotDef.key);
    } else {
      row.className = "inv-item";
      row.innerHTML = `<div class="ie">${slotIconFor(slotDef)}</div>
        <div class="it">${slotDef.label}<small style="color:var(--dim)">Vacío — equipa uno desde tu inventario</small></div>`;
    }
    list.appendChild(row);
  });
}

/* ============================================================
   5. SISTEMA DE COMBATE
   ============================================================ */
/** Arte de batalla real (no el emoji genérico) por nombre de plantilla — un solo lugar para esta
 *  lista, reusada tanto por el combate normal (spriteEnemy) como por la escena de manada
 *  (renderPackStage), que antes solo mostraba emoji incluso para enemigos con arte propio. */
function enemySpriteSrc(tpl, idx){
  if(tpl === THIEF_TEMPLATE) return {src:THIEF_SPRITES.base, dataAttr:"thief"};
  // En manada, los miembros en posición impar (el/los "compañero/s") usan la variante enemy_var
  // en vez de la ilustración de siempre, para que no todos los Lobo Umbrío se vean idénticos.
  // Fuera de manada (idx===undefined) siempre es la de siempre.
  if(tpl.name === "Lobo Umbrío") return {src:(idx%2===1) ? LOBO_UMBRIO_SPRITES.enemyVar : LOBO_UMBRIO_SPRITES.enemy, dataAttr:"lobo"};
  // Mismo criterio que el Lobo Umbrío: en manada, los miembros en posición impar usan la variante.
  if(tpl.name === "Cuervo Corrupto") return {src:(idx%2===1) ? CUERVO_CORRUPTO_SPRITES.enemyVar : CUERVO_CORRUPTO_SPRITES.enemy, dataAttr:"cuervo"};
  if(tpl.name === "Demonio Menor") return {src:DEMONIO_MENOR_SPRITES.enemy, dataAttr:"demonio"};
  if(tpl.name === "Golem de Roca") return {src:GOLEM_ROCA_SPRITES.enemy, dataAttr:"golem"};
  if(tpl.name === "Dragón Menor") return {src:DRAGON_MENOR_SPRITES.enemy, dataAttr:"dragon"};
  if(tpl.name === "Dragón Ancestral") return {src:DRAGON_ANCESTRAL_SPRITES.enemy, dataAttr:"dragon-ancestral"};
  if(tpl.name === "Lobo Nocturno") return {src:LOBO_NOCTURNO_SPRITES.enemy, dataAttr:"lobo-nocturno"};
  if(tpl.name === "Lobo Sombrío") return {src:LOBO_SOMBRIO_SPRITES.base, dataAttr:"shadowwolf"};
  if(tpl.name === "Slime Salvaje") return {src:SLIME_SALVAJE_SPRITES.base, dataAttr:"slime"};
  if(tpl.name === "Rata Mutante") return {src:RATA_MUTANTE_SPRITES.base, dataAttr:"rata"};
  if(tpl.name === "Espectro") return {src:ESPECTRO_SPRITES.base, dataAttr:"espectro"};
  if(tpl.name === "Señor Oscuro") return {src:SENOR_OSCURO_SPRITES.base, dataAttr:"senor-oscuro"};
  if(tpl.name === "Demonio Oscuro") return {src:DEMONIO_OSCURO_SPRITES.base, dataAttr:"demonio-oscuro"};
  if(tpl.name === "Sabueso Oscuro") return {src:SABUESO_OSCURO_SPRITES.base, dataAttr:"sabueso-oscuro"};
  return null;
}
/** `opts.extraClass`/`opts.style` dejan que cada vista (combate solo vs. escenario de manada,
 *  mucho más chico) pida su propio tamaño sin duplicar la tabla de arriba. */
function enemySpriteHtml(tpl, opts, idx){
  const s = enemySpriteSrc(tpl, idx);
  if(!s) return null;
  opts = opts || {};
  const cls = "battle-sprite-img" + (opts.extraClass ? " "+opts.extraClass : "");
  const style = opts.style ? ` style="${opts.style}"` : "";
  return `<img src="${s.src}" class="${cls}" data-${s.dataAttr}="1" alt=""${style}>`;
}
/** Transición de entrada a combate, al estilo Pokémon: la escena de batalla ya quedó armada y
 *  visible justo antes de llamar a esto — un overlay negro la cubre un instante (con un flash
 *  blanco breve) y se abre en círculo desde el centro, revelándola. Se llama al FINAL de cada
 *  función que arranca un combate (startBattle, startPackBattle, PvP, grupo), después de quitar
 *  "hidden" de #battleWrap, nunca antes — si no, se abriría sobre la pantalla del mapa vacía. */
function playBattleEntranceFx(){
  const el = $("battleTransitionOverlay");
  if(!el) return;
  el.classList.remove("hidden", "playing");
  void el.offsetWidth; // reinicia la animación si un combate empieza justo cuando otra estaba terminando
  el.classList.add("playing");
  clearTimeout(el._fxTimer);
  el._fxTimer = setTimeout(()=>{
    el.classList.remove("playing");
    el.classList.add("hidden");
  }, 650);
}
/** El jugador entra deslizándose de derecha a izquierda y el enemigo de izquierda a derecha, hasta
 *  su posición de siempre — pedido explícito, por ahora para las clases con su propio set de arte
 *  dedicado (Guerrero, Mago). Se llama junto con playBattleEntranceFx() en cada función que arranca
 *  un combate, después de que tanto #spritePlayer como #spriteEnemy ya tengan su contenido puesto.
 *
 *  Usa la Web Animations API (mismo criterio que el salto de ataque, ver playGuerreroAttackSequence)
 *  en vez de agregar/quitar una clase CSS — el truco de "sacar la clase, forzar reflow, volver a
 *  ponerla" para reiniciar una animación depende de que el navegador reconozca ESE cambio de clase
 *  como algo nuevo, y en combates repetidos (sobre todo si #battleWrap nunca vuelve a quedar
 *  realmente oculto entre uno y el siguiente) dejó de disparar la animación después del primer
 *  combate. Con .animate() cada llamada crea una animación nueva sin ambigüedad — no importa qué
 *  clase tenía puesta antes ni si el contenedor estuvo o no oculto mientras tanto. */
function playCharacterSlideInFx(){
  if(player.classKey !== "guerrero" && player.classKey !== "mago" && player.classKey !== "berserker" && player.classKey !== "arquero") return;
  const DURATION_MS = 1200, DELAY_MS = 900, EASING = "cubic-bezier(.2,.85,.35,1)";
  const playerEl = $("spritePlayer");
  if(playerEl && playerEl.animate){
    playerEl.getAnimations().forEach(a=> a.cancel());
    playerEl.animate([
      { transform:"translateX(140%)", opacity:0, offset:0 },
      { opacity:1, offset:0.55 },
      { transform:"translateX(0)", opacity:1, offset:1 },
    ], { duration:DURATION_MS, delay:DELAY_MS, easing:EASING, fill:"both" });
  }
  // #spriteEnemy ya tiene scaleX(-1) fijo por CSS (mira hacia el jugador) — se repite en cada
  // paso del keyframe para no perder el espejado mientras se desliza ni al terminar.
  const enemyEl = $("spriteEnemy");
  if(enemyEl && enemyEl.animate){
    enemyEl.getAnimations().forEach(a=> a.cancel());
    enemyEl.animate([
      { transform:"scaleX(-1) translateX(140%)", opacity:0, offset:0 },
      { opacity:1, offset:0.55 },
      { transform:"scaleX(-1) translateX(0)", opacity:1, offset:1 },
    ], { duration:DURATION_MS, delay:DELAY_MS, easing:EASING, fill:"both" });
  }
  // Pedido explícito: que las barras de vida/maná no se vean ya llenas desde el primer frame,
  // detrás del deslizamiento — que aparezcan y se llenen recién cuando personaje y enemigo terminan
  // de llegar a su lugar, como parte de la misma secuencia de entrada.
  const barsRevealMs = DELAY_MS + DURATION_MS;
  playBattleBarsIntroFx(barsRevealMs);
  // Pedido explícito: los botones de ataque no deben poder tocarse hasta que TODA la presentación
  // termine — deslizamiento + el relleno de las barras (que a su vez usa la transición normal de
  // .bar-fill, .9s, ver main.css) — para que no se pueda golpear a mitad de la animación.
  const grid = $("movegrid");
  if(grid){
    grid.classList.add("intro-locked");
    clearTimeout(grid._introLockTimer);
    grid._introLockTimer = setTimeout(()=> grid.classList.remove("intro-locked"), barsRevealMs + 900);
  }
}
/** Las barras (vida del jugador, maná, vida del enemigo, y defensa si está activa este combate) ya
 *  quedaron puestas en su ancho real por updateBattleBars() antes de que #battleWrap se revele —
 *  acá se ponen en 0% sin transición (mismo truco de forzar reflow que ya usa startGatherProgress
 *  más abajo) y recién se restauran a su ancho real, CON la transición normal de .bar-fill (.9s,
 *  ver main.css), cuando pasó `revealDelayMs` — pensado para que coincida con el instante en que
 *  playCharacterSlideInFx() termina de traer a los sprites a su posición, así las barras se sienten
 *  parte de la misma entrada en vez de aparecer de golpe, separadas del resto. Si no hay barras que
 *  animar (p.ej. algo todavía no está en el DOM) no hace nada. */
function playBattleBarsIntroFx(revealDelayMs){
  const candidates = [$("bPHp"), $("bPMp"), $("bEHp")];
  const defWrap = $("bPDefWrap");
  if(defWrap && !defWrap.classList.contains("hidden")) candidates.push($("bPDef"));
  const targets = candidates.filter(Boolean).map(el=>({el, width: el.style.width || "0%"}));
  if(!targets.length) return;
  targets.forEach(({el})=>{ el.style.transition = "none"; el.style.width = "0%"; });
  targets.forEach(({el})=> void el.offsetWidth);
  targets.forEach(({el})=>{ el.style.transition = ""; });
  clearTimeout(playBattleBarsIntroFx._revealTimer);
  playBattleBarsIntroFx._revealTimer = setTimeout(()=>{
    targets.forEach(({el, width})=> el.style.width = width);
  }, revealDelayMs);
}

/** ¿El jugador está ahora mismo dentro del radio de niebla oscura de algún portal de mazmorra?
 *  Mismo criterio que ya usa updateDungeonAuraAmbience() para las hojas oscuras del mapa — se
 *  reusa acá para decidir el fondo de la escena de combate (ver updateBattleSceneBackground):
 *  pedido explícito, CUALQUIER enemigo que te encuentre ahí adentro debe verse con ese fondo, no
 *  solo sus esbirros exclusivos. */
function isPlayerInDarkAura(){
  if(!playerLatLng) return false;
  return (DUNGEON_PORTALS||[]).some(portal=>{
    const dungeon = getDungeonDef(portal.dungeonId);
    if(!dungeon) return false;
    const radius = dungeon.auraRadiusM || dungeon.revealRadiusM;
    return distMeters(playerLatLng, portal) <= radius;
  });
}
/** Fondo especial de la escena de batalla (castillo + luna roja) — pedido explícito, para tres
 *  casos: un piso de la mazmorra del Señor Oscuro, cualquier combate contra los esbirros que
 *  rondan su niebla oscura (Demonio Oscuro/Sabueso Oscuro, marcados con dropsDarkEssence — el
 *  mismo criterio que ya usa isDarkAuraEnemy en enemyTurn), o cualquier OTRO enemigo con el que te
 *  cruces mientras estás físicamente parado dentro de ese radio (isPlayerInDarkAura). Se decide
 *  una sola vez al arrancar el combate (startBattle/startPackBattle), no cambia a mitad de un
 *  combate en curso. */
function updateBattleSceneBackground(){
  const wrap = $("battleWrap");
  if(!wrap || !battleState) return;
  const isSenorOscuroDungeon = battleState.isDungeon && player.activeDungeonRun && player.activeDungeonRun.dungeonId === "senor_oscuro";
  const hasDarkAuraEnemy = battleState.isPack
    ? (battleState.mons||[]).some(m=> m.tpl && m.tpl.dropsDarkEssence)
    : !!(battleState.mon && battleState.mon.tpl && battleState.mon.tpl.dropsDarkEssence);
  const isDark = !!(isSenorOscuroDungeon || hasDarkAuraEnemy || isPlayerInDarkAura());
  wrap.classList.toggle("senor-oscuro-bg", isDark);
  activeBattleScene = getBattleSceneConfig(isDark ? "senor_oscuro" : DEFAULT_BATTLE_SCENE_ID);
}

/* ============================================================
   SISTEMA DE PERSPECTIVA DE BATALLA (ver game/systems/battlePerspective.js) — reemplaza el
   posicionamiento "a ojo" por flexbox (jugador siempre abajo-izquierda, enemigo siempre
   arriba-derecha) por anclajes reales del escenario activo, para que nadie quede flotando ni
   parado sobre un edificio. Solo cambia POSICIÓN/ESCALA/SOMBRA — nunca toca battleState, daño ni
   turnos. No aplica en group-mode (batalla de grupo multijugador con varios aliados en pantalla),
   que sigue con el flujo flex de siempre — ver el `if(!active)` más abajo. */
let activeBattleScene = getBattleSceneConfig(DEFAULT_BATTLE_SCENE_ID);
let playerStageShadowEl = null;
let enemyStageShadowEl = null;
const packStageShadowEls = {};
let lastPerspectiveMode = "solo";
let lastPerspectiveFlying = false;

/** Punto de entrada del sistema: reposiciona jugador (siempre) y enemigo solo/manada (según
 *  `mode`) sobre sus anclas del escenario activo. Seguro de llamar en cualquier momento — se usa
 *  al iniciar cada tipo de combate y de nuevo en cada resize/cambio de orientación. */
function refreshBattleStagePerspective(mode, flying){
  lastPerspectiveMode = mode;
  lastPerspectiveFlying = !!flying;
  const wrap = $("battleWrap");
  const stageEl = document.querySelector(".stage");
  const backgroundEl = $("battleScenePanel");
  if(!wrap || !stageEl) return;

  // Varios puntos de entrada (startBattle, startPackBattle, renderPvpBattleUI, renderGroupBattleUI)
  // arman toda la escena ANTES de sacarle la clase "hidden" a #battleWrap — en ese instante .stage
  // todavía mide 0×0 (un ancestro con display:none colapsa todo adentro), así que
  // getBoundingClientRect no sirve de nada todavía. Sin este reintento, positionEntityOnStage aborta
  // en silencio pero la clase "perspective-mode" ya quedó puesta → el ancla pasa a position:absolute
  // SIN left/top, y cae a su posición estática de flujo (arriba a la derecha para el enemigo, por
  // align-self:flex-start en .enemy-side) — exactamente el bug de "el enemigo aparece en el cielo".
  // Aplica IGUAL en modo grupo (rama `!active` de abajo): floatSoloEnemyPanel() ahí también necesita
  // que el stage ya mida algo de verdad, si no mide todo en base a un elemento colapsado a 0×0.
  // Doble rAF (mismo patrón que ya usa renderPackStage más abajo) porque para cuando este callback
  // corre, el resto de startBattle/etc. ya terminó de ejecutarse sincrónicamente y sacó el "hidden".
  const stageRectCheck = stageEl.getBoundingClientRect();
  if(!stageRectCheck.width || !stageRectCheck.height){
    requestAnimationFrame(()=> requestAnimationFrame(()=> refreshBattleStagePerspective(mode, flying)));
    return;
  }

  const active = !wrap.classList.contains("group-mode");
  stageEl.classList.toggle("perspective-mode", active);
  if(!active){
    // grupo multijugador: la POSICIÓN del sprite nunca la toca este sistema (sigue con el flujo
    // flex de siempre) — se asegura de dejar todo como estaba por si venía de un combate anterior
    // que sí usó perspectiva. Pero la tarjeta de vida SÍ puede flotar igual sobre la cabeza del
    // monstruo: floatSoloEnemyPanel no necesita el modo perspectiva, solo lee la posición real en
    // pantalla del ancla (con flexbox o sin él), así que se llama igual una vez que el reset de
    // arriba ya dejó al sprite en su lugar de flujo normal.
    resetEntityPosition($("spritePlayerAnchor"));
    resetEntityPosition($("spriteEnemyAnchor"));
    if(playerStageShadowEl) playerStageShadowEl.style.display = "none";
    if(enemyStageShadowEl) enemyStageShadowEl.style.display = "none";
    const enemyAnchorElStatic = $("spriteEnemyAnchor");
    if(enemyAnchorElStatic) floatSoloEnemyPanel(enemyAnchorElStatic, backgroundEl);
    else unfloatSoloEnemyPanel();
    return;
  }

  const scene = activeBattleScene;
  if(!playerStageShadowEl){ playerStageShadowEl = createPerspectiveShadow(); stageEl.appendChild(playerStageShadowEl); }
  const playerAnchorEl = $("spritePlayerAnchor");
  if(playerAnchorEl){
    const p = scene.playerAnchor;
    positionEntityOnStage(playerAnchorEl, playerStageShadowEl, {fx:p.x, fy:p.y, sceneConfig:scene, stageEl, backgroundEl});
  }

  if(mode === "pack"){
    // los miembros de la manada tienen su propia sombra por índice — la del "enemigo solo" no
    // aplica acá, se oculta para no dejar una sombra huérfana sin sprite encima.
    if(enemyStageShadowEl) enemyStageShadowEl.style.display = "none";
    unfloatSoloEnemyPanel(); // cada miembro de la manada ya muestra su propia vida en packEnemyPanels
    repositionPackStageMembers();
    return;
  }

  const enemyAnchorEl = $("spriteEnemyAnchor");
  if(!enemyAnchorEl) return;
  if(!enemyStageShadowEl){ enemyStageShadowEl = createPerspectiveShadow(); stageEl.appendChild(enemyStageShadowEl); }
  // Un enemigo SOLO (el caso más común: un monstruo normal en el mapa) usa el punto por defecto
  // del escenario — un poco por encima del jugador y un poco más chico, para dar sensación de
  // profundidad sin mandarlo al anchor más lejano (ese queda reservado para cuando de verdad hay
  // varios enemigos repartidos por la calle, ver pickGroundAnchor/enemyAnchors).
  const groundPoint = scene.soloEnemyAnchor || pickGroundAnchor(scene, 0);
  const anchor = flying ? pickFlyingAnchor(groundPoint) : groundPoint;
  const shadow = flying ? {x:anchor.shadowX, y:anchor.shadowY} : anchor;
  positionEntityOnStage(enemyAnchorEl, enemyStageShadowEl, {
    fx:anchor.x, fy:anchor.y, sceneConfig:scene, stageEl, backgroundEl, flying:!!flying,
    shadowFx: shadow.x, shadowFy: shadow.y,
  });
  floatSoloEnemyPanel(enemyAnchorEl, backgroundEl);
}

/** Saca al panel de vida/nombre del enemigo solo del modo "flotante" (vuelve a su lugar fijo de
 *  siempre en .battle-top, vía CSS normal) — se usa en manada/grupo, donde este panel no aplica. */
function unfloatSoloEnemyPanel(){
  const panel = $("soloEnemyPanel");
  if(panel) panel.classList.remove("floating-hp");
}

/** Reubica la tarjeta de nombre/vida del enemigo solo justo encima de su cabeza, siguiendo al
 *  sprite en su anchor de perspectiva (que cambia de escenario a escenario, y de enemigo volador a
 *  terrestre) en vez de quedar fija arriba a la derecha sin relación visual con dónde está parado
 *  el enemigo. Se llama de nuevo cada vez que se reposiciona el ancla (inicio de combate, resize),
 *  así que la tarjeta jamás queda desincronizada del sprite.
 *
 *  El "tamaño del enemigo" para saber cuánto subir la tarjeta NO se hardcodea por especie: se lee
 *  directo del propio anchorEl.getBoundingClientRect() (que ya incluye la escala de profundidad),
 *  así que un emoji de 64px y un arte propio de hasta 160px (Lobo Umbrío, Dragón Ancestral, Golem
 *  de Roca, etc. — ver enemySpriteSrc) quedan cubiertos por la MISMA cuenta. El único caso especial
 *  es que esos sprites grandes son <img>: si la imagen todavía no terminó de cargar en el instante
 *  en que se llama esta función (recién se acaba de insertar el <img> en el DOM), su alto real
 *  (hasta 160px) todavía no se conoce y el navegador la mide como ~0px — la tarjeta quedaba
 *  calibrada para ESE tamaño chico, y al terminar de cargar el sprite (mucho más alto) la tapaba
 *  por delante. Por eso, si hay un <img> sin terminar de cargar, se vuelve a posicionar apenas
 *  dispara su "load" — sin esa segunda pasada, todos los enemigos con arte propio quedan mal. */
function floatSoloEnemyPanel(anchorEl, backgroundEl){
  const panel = $("soloEnemyPanel");
  if(!panel || !anchorEl || !backgroundEl) return;
  const place = ()=>{
    const anchorRect = anchorEl.getBoundingClientRect();
    const bgRect = backgroundEl.getBoundingClientRect();
    if(!anchorRect.width || !bgRect.width || !bgRect.height) return;
    panel.classList.add("floating-hp");
    // 10px se quedaba corto para enemigos chicos/lejanos (voladores en escala reducida, p.ej. el
    // Cuervo Corrupto a 0.5x): el hueco absoluto era el mismo que para un enemigo grande, pero al
    // lado de un sprite chico se veía tapando la cabeza en vez de flotando arriba — sobre todo con
    // el difuminado del drop-shadow del sprite, que come parte de ese margen. 18px deja aire de
    // sobra incluso para los sprites más chicos sin alejar demasiado la tarjeta en los grandes.
    const MARGIN_PX = 18; // separación entre el borde superior del sprite y el borde inferior de la tarjeta
    let leftPct = ((anchorRect.left + anchorRect.width/2 - bgRect.left) / bgRect.width) * 100;
    let topPct = ((anchorRect.top - MARGIN_PX - bgRect.top) / bgRect.height) * 100;
    // el panel mide ~170px de ancho y su propio alto — recortado para que nunca quede a medio salir
    // del escenario aunque el anchor esté muy pegado a un borde (enemigos lejanos/cercanos extremos).
    leftPct = Math.max(16, Math.min(84, leftPct));
    topPct = Math.max(9, Math.min(94, topPct));
    panel.style.left = leftPct + "%";
    panel.style.top = topPct + "%";
  };
  place();
  const img = anchorEl.querySelector("img.battle-sprite-img");
  if(img && !img.complete) img.addEventListener("load", place, {once:true});
}

/** Reposiciona (sin reconstruir) los `.pack-stage-mon` que ya están en el DOM — lo llama
 *  renderPackStage() después de armar la fila, y el listener de resize para no perder el estado
 *  de animaciones en curso al rotar el teléfono. */
function repositionPackStageMembers(){
  const stageEl = document.querySelector(".stage");
  const backgroundEl = $("battleScenePanel");
  const wrap = $("packStageRow");
  if(!stageEl || !wrap || !battleState || !battleState.mons) return;
  const scene = activeBattleScene;
  // Todos los miembros de la manada se agrupan a partir del MISMO punto base (el que usaría un
  // enemigo solo ahí) en vez de repartirse por los enemyAnchors del escenario (pensados para un
  // enemigo a la vez y muy separados entre sí — bug reportado: "una manada de dos cuervos salió
  // muy separada"). pickPackClusterAnchor los agrupa bien juntos, en zigzag, cada uno un poco más
  // atrás que el anterior — ver esa función en battlePerspective.js.
  const packBaseAnchor = scene.soloEnemyAnchor || pickGroundAnchor(scene, 0);
  // Pedido explícito: cuando la manada se descompleta (uno cae en combate), los sobrevivientes se
  // ven un poco más juntos entre sí — en vez de dejar el hueco vacío del que cayó. El índice que
  // abre el abanico (pickPackClusterAnchor) pasa a ser el RANGO entre los vivos (0,1,2...) en vez
  // de la posición original en el arreglo; el cuerpo caído se queda clavado en SU posición
  // original (no se re-rankea) para que no "salte" de lugar al morir, solo se desvanece ahí mismo.
  let aliveRank = 0;
  Array.from(wrap.children).forEach((el, idx)=>{
    const m = battleState.mons[idx];
    if(!m) return;
    if(!packStageShadowEls[idx]){ packStageShadowEls[idx] = createPerspectiveShadow(); stageEl.appendChild(packStageShadowEls[idx]); }
    const flying = !!(m.tpl && m.tpl.flying);
    const clusterIdx = m.curHp>0 ? aliveRank : idx;
    if(m.curHp>0) aliveRank++;
    const groundPoint = pickPackClusterAnchor(packBaseAnchor, clusterIdx, scene);
    const anchor = flying ? pickFlyingAnchor(groundPoint) : groundPoint;
    const shadow = flying ? {x:anchor.shadowX, y:anchor.shadowY} : anchor;
    positionEntityOnStage(el, packStageShadowEls[idx], {
      fx:anchor.x, fy:anchor.y, sceneConfig:scene, stageEl, backgroundEl, flying,
      shadowFx: shadow.x, shadowFy: shadow.y,
    });
    // Refuerza el orden "el primero tapa al resto" con un z-index explícito, dedicado a la manada
    // (13-18, por encima del rango de profundidad normal 1-12 pero bien por debajo de mascotas=20
    // y popups=30+) — el z-index de profundidad que ya puso positionEntityOnStage arriba alcanza
    // casi siempre, pero si dos miembros caen tan cerca en Y que empatan de "bucket" (computeDepthZIndex
    // redondea a enteros), el orden real pasaría a depender del orden del DOM y podría invertirse.
    el.style.zIndex = String(Math.max(1, 18 - idx));
    packStageShadowEls[idx].style.opacity = (m.curHp<=0) ? "0.15" : "";
  });
  // si la manada anterior tenía más miembros que la actual, borra las sombras que sobran.
  Object.keys(packStageShadowEls).forEach(k=>{
    if(Number(k) >= wrap.children.length){ packStageShadowEls[k].remove(); delete packStageShadowEls[k]; }
  });
}

let battleStageResizeTimer = null;
window.addEventListener("resize", ()=>{
  clearTimeout(battleStageResizeTimer);
  battleStageResizeTimer = setTimeout(()=>{
    const wrap = $("battleWrap");
    if(!wrap || wrap.classList.contains("hidden")) return;
    refreshBattleStagePerspective(lastPerspectiveMode, lastPerspectiveFlying);
  }, 150);
});
function startBattle(mon, opts){
  opts = opts || {};
  // resguardo: cualquier batalla que arranca por esta vía (encuentro normal en el mapa) nunca debe
  // arrastrar restos de una sesión de Coliseo anterior — si algo quedó mal cerrado, se limpia aquí.
  if(!opts.isColiseo && (coliseoRun || pendingColiseoContinuation)){
    coliseoRun = null;
    pendingColiseoContinuation = null;
    const hud = $("coliseoBattleHud");
    if(hud) hud.classList.add("hidden");
  }
  battleState = {
    mon,
    isColiseo: !!opts.isColiseo,
    isDungeon: !!opts.isDungeon,
    isTowerChallenge: opts.isTowerChallenge || null,
    eventId: opts.eventId || null,
    turn: "choice",
    playerBuffs:{atk:1, def:1, spd:1, turnsAtk:0, turnsDef:0},
    playerExtraTurnActive: false,
    log:[]
  };
  // Un estado (p.ej. el veneno del Shuriken del Ladrón Errante) es cosa de ESTE combate — nunca debe
  // arrastrarse a un combate nuevo si de alguna forma quedó sin limpiar del anterior.
  player.status = null;
  // Barra de defensa del jugador (Guerrero: escudo, Mago: barrera mágica — pedido explícito): al
  // bloquear un golpe fuerte con el gesto de defensa, el daño que le haría a la vida se descuenta
  // de acá en vez de HP — se llena fresca en cada combate nuevo, pero jamás se recarga ni se cura
  // mientras dura ESTE combate (ver DEFENSE_BAR_PCT, resolveEnemyDirectAttack y enemyTurn).
  if(classHasDefendPose(player.classKey)){
    battleState.defenseBarMax = Math.max(1, Math.round(player.maxHp * DEFENSE_BAR_PCT));
    battleState.defenseBar = battleState.defenseBarMax;
  }
  updateBattleSceneBackground();
  updateBattleRainFx();
  mon.curHp = mon.hp; // vida de combate (independiente de la del mapa, siempre empieza llena)
  $("battleWrap").classList.remove("group-mode");
  $("soloEnemyPanel").classList.remove("hidden");
  $("packEnemyPanels").classList.add("hidden");
  $("spriteEnemy").classList.remove("hidden");
  $("packStageRow").classList.add("hidden");
  $("groupAllyStageRow").classList.add("hidden");
  $("partyStatusRow").classList.add("hidden");
  $("petStageSlot").classList.add("hidden");
  $("bPName").textContent = player.name;
  $("bPLvl").textContent = "Nv."+player.level;
  $("bEName").textContent = mon.tpl.name;
  $("bELvl").textContent = "Nv."+mon.level;
  renderPlayerSprite();
  const spriteHtml = enemySpriteHtml(mon.tpl);
  if(spriteHtml){
    $("spriteEnemy").innerHTML = spriteHtml;
  } else {
    $("spriteEnemy").innerHTML = "";
    $("spriteEnemy").textContent = mon.tpl.emoji;
  }
  updateBattleBars();
  if(mon.tpl.name === "Lobo Sombrío"){
    const line = `¡Voy a poner a prueba tu habilidad!`;
    logBattle(`🐺 ${mon.tpl.name} (Nv.${mon.level}): "${line}"`, true);
    showShadowWolfDialogue(`"${line}"`);
  } else if(mon.tpl.name === "Ladrón Errante"){
    const line = pickThiefIntroLine();
    logBattle(`🥷 ${mon.tpl.name} (Nv.${mon.level}): "${line}"`, true);
    showThiefDialogue(`"${line}"`);
  } else {
    logBattle(`Un ${mon.tpl.name} salvaje aparece (Nv.${mon.level}).`, true);
  }
  renderMoveGrid();
  $("battleWrap").classList.remove("hidden");
  // recién ACÁ, con #battleWrap ya visible, tiene sentido medir .stage (antes mide 0×0 y el
  // sistema de perspectiva no tendría dónde posicionar nada — ver refreshBattleStagePerspective).
  refreshBattleStagePerspective("solo", !!(mon.tpl && mon.tpl.flying));
  playBattleEntranceFx();
  playCharacterSlideInFx(); // el retraso hasta que se revele la escena vive en el CSS (animation-delay), no acá
  maybeShowBattleTutorial();
}

function updateBattleBars(){
  $("bPHp").style.width = pct(player.hp, player.maxHp)+"%";
  $("bPMp").style.width = pct(player.mp, player.maxMp)+"%";
  const pStatusEl = $("bPStatus");
  if(pStatusEl) pStatusEl.innerHTML = statusBadgeHtml(player);
  // Barra de defensa del jugador: solo existe (battleState.defenseBar definido) en combate solo —
  // battleState se resetea entero en cada startBattle(), así que en cualquier otra pantalla (PvP,
  // manada, grupo) el wrap se queda oculto sin más.
  const defWrap = $("bPDefWrap");
  if(defWrap){
    const hasDefBar = battleState && typeof battleState.defenseBar === "number";
    defWrap.classList.toggle("hidden", !hasDefBar);
    if(hasDefBar) $("bPDef").style.width = pct(battleState.defenseBar, battleState.defenseBarMax)+"%";
  }
  // en manada normal usa battleState.mon; si es un jefe que ya invocó y ahora se muestra "solo"
  // otra vez (ver syncPackDisplayMode) usa su propia entrada dentro de battleState.mons.
  const soloMon = !battleState.isPack ? battleState.mon
    : (battleState._displayingSolo ? battleState.mons.find(m=>m.isBoss) : null);
  if(soloMon){
    $("bEHp").style.width = pct(soloMon.curHp, soloMon.maxHp)+"%";
    const statusEl = $("bEStatus");
    if(statusEl){
      // Mientras el Lobo Sombrío está cargando su Súper ataque (todo tu turno de por medio), se
      // ve una insignia fija junto a su barra de vida — recordatorio constante, no solo el aviso
      // puntual del momento en que empezó a cargar.
      const chargingBadge = battleState.monCharging ? ` <span class="shadow-wolf-charging-badge" title="Está cargando un Súper ataque">⚡ cargando…</span>` : "";
      statusEl.innerHTML = statusBadgeHtml(soloMon) + chargingBadge;
    }
  }
}
/** Si un jefe invocó refuerzos y ya se derrotó a TODOS (el jefe sigue vivo), vuelve a mostrar la
 *  vista de un solo enemigo (su propio arte a tamaño completo) en vez de dejar la escena de manada
 *  con paneles vacíos — se siente raro seguir viendo "manada" cuando ya solo queda el jefe. */
function syncPackDisplayMode(){
  if(!battleState || !battleState.isPack || !battleState.bossSummoned) return;
  const bossEntry = battleState.mons.find(m=>m.isBoss);
  if(!bossEntry || bossEntry.curHp<=0) return; // si el jefe también cayó, packWinBattle ya se encarga
  const aliveMinions = battleState.mons.some(m=>!m.isBoss && m.curHp>0);
  if(aliveMinions || battleState._displayingSolo) return;
  battleState._displayingSolo = true;
  $("packEnemyPanels").classList.add("hidden");
  $("packStageRow").classList.add("hidden");
  $("soloEnemyPanel").classList.remove("hidden");
  $("spriteEnemy").classList.remove("hidden");
  $("bEName").textContent = bossEntry.tpl.name;
  $("bELvl").textContent = "Nv."+bossEntry.level;
  const spriteHtml = enemySpriteHtml(bossEntry.tpl);
  if(spriteHtml){ $("spriteEnemy").innerHTML = spriteHtml; }
  else { $("spriteEnemy").innerHTML = ""; $("spriteEnemy").textContent = bossEntry.tpl.emoji; }
  logBattle(`¡Los refuerzos de ${bossEntry.tpl.name} han caído — vuelves a enfrentarlo solo!`);
  updateBattleBars();
}

function logBattle(msg, reset=false){
  const el = $("battlelog");
  if(reset) el.innerHTML = "";
  const line = document.createElement("div");
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

/** Describe el efecto aproximado de un movimiento (daño, curación o buff) usando el ATK/HP actuales. */
/* ---------- Tooltip de movimiento (ícono de ojo — mantener presionado no es confiable en el navegador) ---------- */
let moveTooltipEl = null;
let moveTooltipForMv = null;
function showMoveTooltip(anchor, mv){
  hideMoveTooltip();
  const tip = document.createElement("div");
  tip.className = "move-tooltip";
  const targetLine = mv.aoe ? "💥 <b>Ataque de ÁREA</b> — golpea a todos los enemigos del grupo"
    : mv.allyHeal ? "💚 Cura al aliado con menos vida (solo tiene efecto en combate de grupo)"
    : mv.allyBuff ? "🛡️ Mejora a TODO tu grupo (solo tiene efecto en combate de grupo)"
    : "🎯 Un solo objetivo";
  tip.innerHTML = `<b>${mv.name}${moveTargetIcon(mv)}</b><br>${mv.desc||""}<br>${moveInfoLine(mv)} · MP ${mv.cost||0}<br>${targetLine}`;
  document.body.appendChild(tip);
  const rect = anchor.getBoundingClientRect();
  const w = 220;
  tip.style.width = w+"px";
  let left = rect.left - w + rect.width; // alineado al borde derecho del ícono de ojo
  if(left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
  if(left < 8) left = 8;
  tip.style.left = left+"px";
  const tipHeight = tip.offsetHeight || 90;
  let top = rect.top - tipHeight - 8;
  if(top < 8) top = rect.bottom + 8; // si no cabe arriba, la muestra abajo del ícono
  tip.style.top = top+"px";
  moveTooltipEl = tip;
  moveTooltipForMv = mv;
  // cierra el tooltip si se toca cualquier otro lado de la pantalla
  setTimeout(()=>{
    document.addEventListener("click", hideMoveTooltipOnce, {once:true});
    document.addEventListener("touchstart", hideMoveTooltipOnce, {once:true, passive:true});
  }, 0);
}
function hideMoveTooltipOnce(){ hideMoveTooltip(); }
function hideMoveTooltip(){
  if(moveTooltipEl){ moveTooltipEl.remove(); moveTooltipEl = null; moveTooltipForMv = null; }
}

/** Tooltip de detalle para un ítem equipado — se abre al tocar su ícono en el perfil (arma/
 *  armadura/casco/botas/accesorios que flanquean al personaje). Mismo patrón que showMoveTooltip:
 *  se posiciona junto al ícono tocado y se cierra solo con el siguiente toque en cualquier lado. */
let equipTooltipEl = null;
function showEquipTooltip(anchor, item, slotDef){
  hideEquipTooltip();
  const meta = equipItemMeta(item);
  const tip = document.createElement("div");
  tip.className = "move-tooltip";
  const label = slotDef.key==="accessory" ? "Accesorio" : slotDef.label;
  tip.innerHTML = `<div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
      <div style="font-size:22px; line-height:1; flex-shrink:0;">${iconFor(item)}</div>
      <div><b>${item.name}</b> ${meta.tag}</div>
    </div>
    <div style="font-size:11px; color:var(--dim); margin-bottom:2px;">${label}</div>
    ${item.desc||""}`;
  document.body.appendChild(tip);
  const rect = anchor.getBoundingClientRect();
  const w = 220;
  tip.style.width = w+"px";
  let left = rect.left + rect.width/2 - w/2;
  if(left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
  if(left < 8) left = 8;
  tip.style.left = left+"px";
  const tipHeight = tip.offsetHeight || 90;
  let top = rect.top - tipHeight - 8;
  if(top < 8) top = rect.bottom + 8; // si no cabe arriba, la muestra abajo del ícono
  tip.style.top = top+"px";
  equipTooltipEl = tip;
  setTimeout(()=>{
    document.addEventListener("click", hideEquipTooltipOnce, {once:true});
    document.addEventListener("touchstart", hideEquipTooltipOnce, {once:true, passive:true});
  }, 0);
}
function hideEquipTooltipOnce(){ hideEquipTooltip(); }
function hideEquipTooltip(){
  if(equipTooltipEl){ equipTooltipEl.remove(); equipTooltipEl = null; }
}
/** Agrega un ícono de ojo 👁️ al botón de movimiento; al tocarlo muestra su descripción completa. */
function attachMoveTooltip(btn, mv){
  const eye = document.createElement("span");
  eye.className = "move-info-eye";
  eye.textContent = "👁️";
  eye.onclick = (e)=>{
    e.stopPropagation();
    if(moveTooltipForMv === mv){ hideMoveTooltip(); return; }
    showMoveTooltip(eye, mv);
  };
  btn.appendChild(eye);
}

function moveInfoLine(mv, atk){
  atk = atk!=null ? atk : (player.atk + (mv.type==="magic" ? (player.matk||0) : 0));
  if(mv.type === "heal"){
    const heal = Math.round(player.maxHp*mv.amount);
    return mv.allyHeal ? `Cura ~${heal} HP al aliado más débil` : `Cura ~${heal} HP`;
  }
  if(mv.type === "buff"){
    const parts = [];
    if(mv.buff==="atk") parts.push(`+${Math.round(mv.amount*100)}% ATQ`);
    if(mv.buff==="def") parts.push(`+${Math.round(mv.amount*100)}% DEF`);
    if(mv.selfDef) parts.push(`${mv.selfDef>0?"+":"-"}${Math.round(Math.abs(mv.selfDef)*100)}% DEF`);
    if(mv.selfBuffSpd) parts.push(`+${Math.round(mv.selfBuffSpd*100)}% VEL`);
    if(mv.dur) parts.push(`${mv.dur} turnos`);
    if(mv.allyBuff) parts.push("a todo el grupo");
    return parts.join(" · ") || "Apoyo";
  }
  if(mv.type === "debuff"){
    const label = mv.stat==="def" ? "DEF" : "ATQ";
    return `-${Math.round(mv.amount*100)}% ${label} rival · resto del combate`;
  }
  const hits = mv.hits||1;
  const perHit = atk*mv.power;
  const lo = Math.round(perHit*0.85*hits);
  const hi = Math.round(perHit*1.15*hits);
  let line = `~${lo}-${hi} daño`;
  if(hits>1) line += ` (${hits} golpes)`;
  if(mv.crit) line += ` · crít. ${Math.round(mv.crit*100)}%`;
  if(mv.priority) line += ` · ⚡ prioridad`;
  if(mv.hpCost) line += ` · 💔 ${Math.round(mv.hpCost*100)}% HP máx.`;
  return line;
}

/* ---------- Barra de tiempo límite para elegir ataque ---------- */
let turnTimerHandle = null;
function startTurnTimer(seconds, onExpire){
  clearTurnTimer();
  const bar = $("turnTimerFill");
  if(!bar) return;
  bar.style.transition = "none";
  bar.style.width = "100%";
  void bar.offsetWidth; // fuerza reflow
  requestAnimationFrame(()=>{
    bar.style.transition = `width ${seconds}s linear`;
    bar.style.width = "0%";
  });
  turnTimerHandle = setTimeout(()=>{ turnTimerHandle=null; onExpire(); }, seconds*1000);
}
function clearTurnTimer(){
  if(turnTimerHandle){ clearTimeout(turnTimerHandle); turnTimerHandle=null; }
  const bar = $("turnTimerFill");
  if(bar){ bar.style.transition = "none"; bar.style.width = "100%"; }
}

function renderMoveGrid(){
  const grid = $("movegrid");
  grid.innerHTML = "";
  const allMoves = getAllUsableMoves();
  const anyAffordable = allMoves.some(mv=> canAffordMove(mv, player.mp, player.hp, player.maxHp));

  if(!anyAffordable){
    // Sin maná para nada: se oculta todo lo demás y solo se ofrece el golpe básico, sin costo,
    // hasta que recuperes maná para volver a ver tus movimientos normales.
    const basicBtn = document.createElement("button");
    basicBtn.className = "move-btn";
    basicBtn.innerHTML = `<div class="mname">👊 Golpe Básico</div><div class="mmeta">Poder 0.85 · MP 0 · no tienes maná para tus otros movimientos</div>`;
    basicBtn.onclick = ()=> battleState.isPack ? packPlayerAction(BASIC_ATTACK_MOVE) : playerAction(BASIC_ATTACK_MOVE);
    grid.appendChild(basicBtn);
  } else {
    allMoves.forEach((mv)=>{
      const btn = document.createElement("button");
      btn.className = "move-btn" + (mv.type==="buff"?" buff":"") + (mv.isUltimate?" ultimate-move":"");
      const canAfford = canAffordMove(mv, player.mp, player.hp, player.maxHp);
      btn.disabled = !canAfford;
      const costLabel = mv.costsAllMp ? `<span class="move-mp-cost">TODO tu maná</span>` : `<span class="move-mp-cost">MP ${mv.cost||0}</span>`;
      btn.innerHTML = `<div class="mname">${mv.name}${moveTargetIcon(mv)}</div><div class="mmeta">${moveInfoLine(mv)} · ${costLabel}</div>`;
      btn.onclick = ()=> battleState.isPack ? packPlayerAction(mv) : playerAction(mv);
      attachMoveTooltip(btn, mv);
      grid.appendChild(btn);
    });
  }

  const itemBtn = document.createElement("button");
  itemBtn.id = "btnBattleUseItem"; // ancla del tutorial de batalla (ver maybeShowBattleTutorial) — este botón se recrea en cada render, así que el id se re-agrega acá cada vez.
  itemBtn.className = "flee-btn";
  itemBtn.style.borderColor = "var(--accent)";
  itemBtn.style.color = "var(--accent)";
  itemBtn.textContent = "🎒 Usar objeto (gasta el turno)";
  itemBtn.onclick = openBattleInventory;
  grid.appendChild(itemBtn);

  // Carta de captura: aparece directo en la pantalla de combate si la tienes, y "brilla" cuando el objetivo ya se puede capturar
  const captureIdx = player.inventory.findIndex(it=>it.type==="capture_card");
  if(captureIdx >= 0){
    const target = battleState.isPack ? currentPackTarget() : battleState.mon;
    const capturable = target && (target.curHp/target.maxHp) <= 0.2;
    const captureBtn = document.createElement("button");
    captureBtn.className = "flee-btn capture-btn" + (capturable ? " capture-ready" : "");
    captureBtn.style.borderColor = "#c98bf0";
    captureBtn.style.color = "#c98bf0";
    captureBtn.textContent = capturable ? "🎴 ¡Capturar! (el enemigo está débil)" : "🎴 Usar Carta de Captura";
    captureBtn.onclick = ()=> attemptCapture(captureIdx);
    grid.appendChild(captureBtn);
  }

  // Invocar o cambiar de mascota: se puede hacer en cualquier momento (como cambiar de Pokémon),
  // gasta el turno de ataque igual que antes.
  const pets = player.pets || [];
  if(!battleState.summonedPets) battleState.summonedPets = [];
  const currentPet = battleState.summonedPets[0];
  const availablePets = pets.filter(p=> !currentPet || p.id !== currentPet.id);
  if(availablePets.length > 0){
    const summonBtn = document.createElement("button");
    summonBtn.className = "flee-btn";
    summonBtn.style.borderColor = "#4fd67a";
    summonBtn.style.color = "#4fd67a";
    summonBtn.textContent = currentPet ? "🐾 Cambiar de mascota (gasta el turno)" : "🐾 Invocar mascota (gasta el turno)";
    summonBtn.onclick = openPetSummonPicker;
    grid.appendChild(summonBtn);
  }

  startTurnTimer(20, ()=>{
    const affordable = getAllUsableMoves().filter(mv=> canAffordMove(mv, player.mp, player.hp, player.maxHp));
    if(affordable.length){
      logBattle("⏱️ Se acabó el tiempo — elige más rápido la próxima vez.");
      const mv = affordable[Math.floor(Math.random()*affordable.length)];
      battleState.isPack ? packPlayerAction(mv) : playerAction(mv);
    }
  });
}

/** ============================================================
 *  TUTORIAL DE BATALLA — pedido explícito: aparece solo la primera vez, señalando los botones
 *  REALES del combate (no una maqueta aparte) uno por uno, con una tarjeta explicando cada uno.
 *  El flag "ya lo vi" (player.seenBattleTutorial) es de CUENTA, no de héroe — una vez visto, no
 *  vuelve a salir con ningún otro héroe (ver freshAccountData/saveGame/rebuildPlayer).
 *  ============================================================ */
const BATTLE_TUTORIAL_STEPS = [
  { selector:".combatant.player", title:"Tu vida y maná",
    text:"Esta es tu barra de ❤️ Vida y 🔵 Maná. Si tu vida llega a 0, pierdes el combate — vigílala de cerca." },
  { selector:"#movegrid .move-btn", title:"Elige un movimiento",
    text:"Toca un movimiento para atacar o usar una habilidad. Cada uno gasta una cantidad distinta de maná." },
  { selector:"#btnBattleUseItem", title:"Usar un objeto",
    text:"Acá puedes usar una poción u otro objeto — ojo: hacerlo gasta tu turno, así que úsalo con cuidado." },
  { selector:"#btnFleeCorner", title:"Huir del combate",
    text:"Si el combate se pone muy difícil, puedes huir desde este botón." },
];
let battleTutorialStepIdx = 0;
/** Se llama al final de startBattle()/startPackBattle() — no hace nada si ya se vio antes. El
 *  setTimeout deja que la animación de entrada del combate (playBattleEntranceFx/
 *  playCharacterSlideInFx) termine de acomodar todo antes de medir posiciones reales. */
function maybeShowBattleTutorial(){
  if(!player || player.seenBattleTutorial) return;
  setTimeout(()=>{
    if(!player || player.seenBattleTutorial) return; // pudo cerrarse el combate mientras esperaba
    battleTutorialStepIdx = 0;
    $("battleTutorialOverlay").classList.remove("hidden");
    showBattleTutorialStep();
  }, 550);
}
function showBattleTutorialStep(){
  const step = BATTLE_TUTORIAL_STEPS[battleTutorialStepIdx];
  const spotlight = $("battleTutorialSpotlight");
  const card = $("battleTutorialCard");
  if(!step){ closeBattleTutorial(); return; }
  const target = document.querySelector(step.selector);
  if(target){
    const r = target.getBoundingClientRect();
    const pad = 8;
    spotlight.style.left = (r.left-pad)+"px";
    spotlight.style.top = (r.top-pad)+"px";
    spotlight.style.width = (r.width+pad*2)+"px";
    spotlight.style.height = (r.height+pad*2)+"px";
    spotlight.classList.remove("hidden");
    // La tarjeta va arriba o abajo del elemento resaltado, lo que tenga más espacio libre en pantalla.
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    card.style.left = Math.max(10, Math.min(window.innerWidth-10-card.offsetWidth, r.left)) + "px";
    if(spaceBelow >= spaceAbove){
      card.style.top = (r.bottom + pad + 12) + "px";
      card.style.bottom = "auto";
    } else {
      card.style.bottom = (window.innerHeight - r.top + pad + 12) + "px";
      card.style.top = "auto";
    }
  } else {
    // Si el botón todavía no existe en el DOM en este paso, se deja un "agujero" de tamaño 0 en el
    // centro (el box-shadow del spotlight igual oscurece toda la pantalla parejo) y la tarjeta
    // centrada, en vez de romper el tutorial por no encontrar dónde apuntar.
    spotlight.style.left = "50%"; spotlight.style.top = "50%";
    spotlight.style.width = "0px"; spotlight.style.height = "0px";
    spotlight.classList.remove("hidden");
    card.style.left = "50%"; card.style.top = "50%"; card.style.bottom = "auto";
    card.style.transform = "translate(-50%,-50%)";
  }
  if(target) card.style.transform = "none";
  $("battleTutorialTitle").textContent = step.title;
  $("battleTutorialText").textContent = step.text;
  $("battleTutorialProgress").textContent = `${battleTutorialStepIdx+1}/${BATTLE_TUTORIAL_STEPS.length}`;
  $("btnBattleTutorialNext").textContent = (battleTutorialStepIdx === BATTLE_TUTORIAL_STEPS.length-1) ? "¡Entendido!" : "Siguiente";
}
function closeBattleTutorial(){
  $("battleTutorialOverlay").classList.add("hidden");
  if(player && !player.seenBattleTutorial){
    player.seenBattleTutorial = true;
    saveGame();
  }
}
$("btnBattleTutorialNext").onclick = ()=>{
  battleTutorialStepIdx++;
  showBattleTutorialStep();
};
$("btnBattleTutorialSkip").onclick = closeBattleTutorial;
window.addEventListener("resize", ()=>{
  if(!$("battleTutorialOverlay").classList.contains("hidden")) showBattleTutorialStep();
});

function fleeBattle(){
  clearTurnTimer();
  if(battleState && battleState.mon && battleState.mon.isBoss && !battleState.mon.isParkGuardian){
    releaseBossLock(battleState.mon);
  } else if(battleState && battleState.isPack && battleState.mons){
    const bossEntry = battleState.mons.find(m=>m.isBoss);
    if(bossEntry && bossEntry.ref && bossEntry.ref.isBoss && !bossEntry.ref.isParkGuardian) releaseBossLock(bossEntry.ref);
  }
  $("battleWrap").classList.add("hidden");
  $("packEnemyPanels").classList.add("hidden");
  $("soloEnemyPanel").classList.remove("hidden");
  $("packStageRow").classList.add("hidden");
  $("spriteEnemy").classList.remove("hidden");
  toast("Huiste del combate.");
  battleState = null;
}

function disableMoves(disabled){
  document.querySelectorAll("#movegrid .move-btn").forEach(b=>b.disabled = disabled || (b.disabled));
  document.querySelectorAll("#movegrid button").forEach(b=> b.style.pointerEvents = disabled?"none":"auto");
}

/** Antes de ejecutar el golpe definitivo, se juega una mini-mecánica de habilidad que decide qué
 *  tan fuerte sale: para las clases físicas, tocar rápido para llenar una barra de poder; para el
 *  mago, seguir un patrón de deslizamientos en orden. onResolve recibe el multiplicador de poder final. */
function triggerUltimateMinigame(mv, onResolve){
  if(player.classKey === "mago") triggerSpellPatternMinigame(onResolve);
  else triggerChargeTapMinigame(onResolve);
}

function triggerChargeTapMinigame(onResolve){
  const overlay = $("chargeTapOverlay");
  const bar = $("chargeTapBarFill");
  const count = $("chargeTapCount");
  const btn = $("chargeTapButton");
  const timeBar = $("chargeTapTimeBarFill");
  overlay.classList.remove("hidden");
  bar.style.width = "0%";
  count.textContent = "0%";
  if(timeBar) timeBar.style.width = "100%";

  const WINDOW_MS = 2200;
  let fillPct = 0;
  let resolved = false;

  function onTap(){
    if(resolved) return;
    fillPct = Math.min(150, fillPct + 8 + Math.random()*5);
    bar.style.width = Math.min(100, fillPct)+"%";
    count.textContent = Math.round(fillPct)+"%";
    btn.style.transform = "scale(.9)";
    setTimeout(()=>{ if(btn) btn.style.transform = ""; }, 80);
  }
  btn.addEventListener("touchstart", (e)=>{ e.preventDefault(); onTap(); }, {passive:false});
  btn.addEventListener("mousedown", onTap);

  const startTime = Date.now();
  const timeTick = setInterval(()=>{
    const pct = Math.max(0, 100 - (Date.now()-startTime)/WINDOW_MS*100);
    if(timeBar) timeBar.style.width = pct+"%";
  }, 40);

  setTimeout(()=>{
    if(resolved) return;
    resolved = true;
    clearInterval(timeTick);
    overlay.classList.add("hidden");
    const multiplier = +(0.6 + Math.min(100, fillPct)/100 * 0.9).toFixed(2);
    onResolve(multiplier);
  }, WINDOW_MS);
}

function triggerSpellPatternMinigame(onResolve){
  const overlay = $("spellPatternOverlay");
  const seqWrap = $("spellPatternSequence");
  const DIRS = ["⬆️","⬇️","⬅️","➡️"];
  const pattern = [0,1,2].map(()=> DIRS[Math.floor(Math.random()*DIRS.length)]);
  let step = 0;
  let resolved = false;
  let startX=null, startY=null;

  seqWrap.innerHTML = pattern.map((d,i)=> `<span class="${i===0?"current":""}">${d}</span>`).join("");
  overlay.classList.remove("hidden");

  function finish(multiplier){
    if(resolved) return;
    resolved = true;
    cleanup();
    overlay.classList.add("hidden");
    onResolve(multiplier);
  }
  function classifyDirection(dx,dy){
    if(Math.hypot(dx,dy) < 25) return null; // gesto muy corto, no cuenta
    return Math.abs(dx) > Math.abs(dy) ? (dx>0?"➡️":"⬅️") : (dy>0?"⬇️":"⬆️");
  }
  function handleSwipe(dx,dy){
    const dir = classifyDirection(dx,dy);
    if(!dir) return;
    if(dir === pattern[step]){
      seqWrap.children[step].classList.remove("current");
      seqWrap.children[step].classList.add("done");
      step++;
      if(step >= pattern.length){ finish(1.6); return; }
      seqWrap.children[step].classList.add("current");
    } else {
      finish(0.7); // se equivocó de dirección
    }
  }
  function onTouchStart(e){ const t=e.touches[0]; startX=t.clientX; startY=t.clientY; }
  function onTouchEnd(e){ const t=e.changedTouches[0]; handleSwipe(t.clientX-startX, t.clientY-startY); }
  function onMouseDown(e){ startX=e.clientX; startY=e.clientY; }
  function onMouseUp(e){ handleSwipe(e.clientX-startX, e.clientY-startY); }
  function cleanup(){
    overlay.removeEventListener("touchstart", onTouchStart);
    overlay.removeEventListener("touchend", onTouchEnd);
    overlay.removeEventListener("mousedown", onMouseDown);
    overlay.removeEventListener("mouseup", onMouseUp);
    clearTimeout(timeout);
  }
  overlay.addEventListener("touchstart", onTouchStart, {passive:true});
  overlay.addEventListener("touchend", onTouchEnd);
  overlay.addEventListener("mousedown", onMouseDown);
  overlay.addEventListener("mouseup", onMouseUp);

  const timeout = setTimeout(()=> finish(0.7), 4500); // se acabó el tiempo sin terminar el patrón
}

/** Versión rápida del reto de tocar, para movimientos normales (no el definitivo): ventana corta,
 *  resultado binario — o sale a daño completo, o sale más flojo si no tocaste lo suficiente a tiempo. */
function triggerQuickTapChallenge(onResolve, customMs){
  const overlay = $("chargeTapOverlay");
  const bar = $("chargeTapBarFill");
  const count = $("chargeTapCount");
  const title = $("chargeTapTitle");
  const btn = $("chargeTapButton");
  const timeBar = $("chargeTapTimeBarFill");
  title.textContent = "👆 ¡Toca rápido!";
  overlay.classList.remove("hidden");
  bar.style.width = "0%";
  count.textContent = "0%";
  if(timeBar) timeBar.style.width = "100%";

  const WINDOW_MS = customMs || 1100;
  const SUCCESS_THRESHOLD = 55;
  let fillPct = 0;
  let resolved = false;

  function onTap(){
    if(resolved) return;
    fillPct = Math.min(100, fillPct + 14 + Math.random()*8);
    bar.style.width = fillPct+"%";
    count.textContent = Math.round(fillPct)+"%";
  }
  function onTouch(e){ e.preventDefault(); onTap(); }
  btn.addEventListener("touchstart", onTouch, {passive:false});
  btn.addEventListener("mousedown", onTap);

  const startTime = Date.now();
  const timeTick = setInterval(()=>{
    const pct = Math.max(0, 100 - (Date.now()-startTime)/WINDOW_MS*100);
    if(timeBar) timeBar.style.width = pct+"%";
  }, 40);

  setTimeout(()=>{
    if(resolved) return;
    resolved = true;
    clearInterval(timeTick);
    overlay.classList.add("hidden");
    btn.removeEventListener("touchstart", onTouch);
    btn.removeEventListener("mousedown", onTap);
    onResolve(fillPct >= SUCCESS_THRESHOLD);
  }, WINDOW_MS);
}

/** Versión rápida del patrón del mago para movimientos normales: una sola dirección a deslizar,
 *  ventana corta, resultado binario. */
function triggerQuickSwipeChallenge(onResolve, customMs){
  const overlay = $("spellPatternOverlay");
  const seqWrap = $("spellPatternSequence");
  const title = $("spellPatternTitle");
  const DIRS = ["⬆️","⬇️","⬅️","➡️"];
  const target = DIRS[Math.floor(Math.random()*DIRS.length)];
  title.textContent = "🌀 ¡Sigue el patrón!";
  seqWrap.innerHTML = `<span class="current">${target}</span>`;
  overlay.classList.remove("hidden");

  let resolved = false;
  let startX=null, startY=null;

  function classifyDirection(dx,dy){
    if(Math.hypot(dx,dy) < 25) return null;
    return Math.abs(dx) > Math.abs(dy) ? (dx>0?"➡️":"⬅️") : (dy>0?"⬇️":"⬆️");
  }
  function finish(success){
    if(resolved) return;
    resolved = true;
    cleanup();
    overlay.classList.add("hidden");
    onResolve(success);
  }
  function handleSwipe(dx,dy){
    const dir = classifyDirection(dx,dy);
    if(!dir) return;
    finish(dir === target);
  }
  function onTouchStart(e){ const t=e.touches[0]; startX=t.clientX; startY=t.clientY; }
  function onTouchEnd(e){ const t=e.changedTouches[0]; handleSwipe(t.clientX-startX, t.clientY-startY); }
  function onMouseDown(e){ startX=e.clientX; startY=e.clientY; }
  function onMouseUp(e){ handleSwipe(e.clientX-startX, e.clientY-startY); }
  function cleanup(){
    overlay.removeEventListener("touchstart", onTouchStart);
    overlay.removeEventListener("touchend", onTouchEnd);
    overlay.removeEventListener("mousedown", onMouseDown);
    overlay.removeEventListener("mouseup", onMouseUp);
    clearTimeout(timeout);
  }
  overlay.addEventListener("touchstart", onTouchStart, {passive:true});
  overlay.addEventListener("touchend", onTouchEnd);
  overlay.addEventListener("mousedown", onMouseDown);
  overlay.addEventListener("mouseup", onMouseUp);

  const timeout = setTimeout(()=> finish(false), customMs || 1400);
}

/** Reto de "barrido" para los movimientos que golpean a TODOS los enemigos: hay que deslizar bien
 *  amplio (en cualquier dirección) para representar el golpe abarcando a todo el grupo rival. */
function triggerQuickSweepChallenge(onResolve, customMs){
  const overlay = $("spellPatternOverlay");
  const seqWrap = $("spellPatternSequence");
  const title = $("spellPatternTitle");
  const hint = $("spellPatternHint");
  const barWrap = $("sweepBarWrap");
  const bar = $("sweepBarFill");
  title.textContent = "↔️ ¡Desliza bien amplio!";
  seqWrap.innerHTML = `<span class="current">↔️</span>`;
  hint.textContent = "Cubre toda la pantalla de un solo deslizón";
  barWrap.classList.remove("hidden");
  bar.style.width = "0%";
  overlay.classList.remove("hidden");

  const MIN_DIST = 220; // tiene que cruzar buena parte del ancho de la pantalla
  let resolved = false;
  let dragging = false;
  let startX=null, startY=null;

  function finish(success){
    if(resolved) return;
    resolved = true;
    cleanup();
    overlay.classList.add("hidden");
    barWrap.classList.add("hidden");
    hint.textContent = "Desliza en cada dirección, en orden"; // se restaura el texto normal del patrón
    onResolve(success);
  }
  function updateProgress(dx,dy){
    const pct = Math.min(100, Math.hypot(dx,dy)/MIN_DIST*100);
    bar.style.width = pct+"%";
  }
  function handleSwipe(dx,dy){
    finish(Math.hypot(dx,dy) >= MIN_DIST);
  }
  function onTouchStart(e){ const t=e.touches[0]; startX=t.clientX; startY=t.clientY; dragging=true; }
  function onTouchMove(e){ if(!dragging) return; const t=e.touches[0]; updateProgress(t.clientX-startX, t.clientY-startY); }
  function onTouchEnd(e){ dragging=false; const t=e.changedTouches[0]; handleSwipe(t.clientX-startX, t.clientY-startY); }
  function onMouseDown(e){ startX=e.clientX; startY=e.clientY; dragging=true; }
  function onMouseMove(e){ if(!dragging) return; updateProgress(e.clientX-startX, e.clientY-startY); }
  function onMouseUp(e){ dragging=false; handleSwipe(e.clientX-startX, e.clientY-startY); }
  function cleanup(){
    overlay.removeEventListener("touchstart", onTouchStart);
    overlay.removeEventListener("touchmove", onTouchMove);
    overlay.removeEventListener("touchend", onTouchEnd);
    overlay.removeEventListener("mousedown", onMouseDown);
    overlay.removeEventListener("mousemove", onMouseMove);
    overlay.removeEventListener("mouseup", onMouseUp);
    clearTimeout(timeout);
  }
  overlay.addEventListener("touchstart", onTouchStart, {passive:true});
  overlay.addEventListener("touchmove", onTouchMove, {passive:true});
  overlay.addEventListener("touchend", onTouchEnd);
  overlay.addEventListener("mousedown", onMouseDown);
  overlay.addEventListener("mousemove", onMouseMove);
  overlay.addEventListener("mouseup", onMouseUp);

  const timeout = setTimeout(()=> finish(false), customMs || 1600);
}

/** Zonas de potencia de "Disparo Certero" (ver classes.js, mv.interactive==="precision") — de
 *  izquierda a derecha, más angosta y más arriba de recompensa: 0-50% verde (80% daño), 50-75%
 *  amarillo (100%), 75-90% naranja (125% + 5% crít.), 90-100% rojo "disparo perfecto" (150% +
 *  20% crít.). Coincide con los porcentajes de flex-grow de .ps-zone-* en main.css. */
function precisionShotZoneAt(pct){
  if(pct >= 90) return {mult:1.5, critBonus:0.20, label:"¡DISPARO PERFECTO!"};
  if(pct >= 75) return {mult:1.25, critBonus:0.05, label:"¡Excelente disparo!"};
  if(pct >= 50) return {mult:1.0, critBonus:0, label:"Buen disparo"};
  return {mult:0.8, critBonus:0, label:"Disparo flojo"};
}

/** Barra de potencia de "Disparo Certero": un marcador recorre la barra de punta a punta y VUELVE
 *  sin parar solo (pedido explícito: "si te pasas la barra no se detiene, va y vuelve") — hay que
 *  tocar la pantalla en el momento justo para soltar la flecha en la zona que se quiera. `onResolve`
 *  recibe la zona alcanzada ({mult, critBonus, label}), que quien llama aplica a mv.power/mv.crit
 *  antes de resolver el golpe (igual que ya hace triggerUltimateMinigame con su multiplicador). */
function triggerPrecisionShotMinigame(onResolve){
  const overlay = $("precisionShotOverlay");
  const marker = $("precisionShotMarker");
  const SWEEP_MS = 850; // tiempo de un extremo al otro — un poco más rápido que el resto de los QTE, es una barra de reflejos
  let resolved = false;
  let rafId = null;
  const startTime = performance.now();

  function pctAt(now){
    const elapsed = (now - startTime) % (SWEEP_MS*2);
    // rampa 0→100 en la primera mitad del ciclo, 100→0 en la segunda — vaivén continuo
    return elapsed < SWEEP_MS ? (elapsed/SWEEP_MS*100) : (100 - (elapsed-SWEEP_MS)/SWEEP_MS*100);
  }
  function tick(now){
    if(resolved) return;
    marker.style.left = pctAt(now)+"%";
    rafId = requestAnimationFrame(tick);
  }

  function finish(){
    if(resolved) return;
    resolved = true;
    if(rafId) cancelAnimationFrame(rafId);
    cleanup();
    overlay.classList.add("hidden");
    onResolve(precisionShotZoneAt(pctAt(performance.now())));
  }
  function onRelease(e){ e.preventDefault(); finish(); }
  function cleanup(){
    overlay.removeEventListener("touchstart", onRelease);
    overlay.removeEventListener("mousedown", onRelease);
    clearTimeout(safetyTimeout);
  }
  overlay.addEventListener("touchstart", onRelease, {passive:false});
  overlay.addEventListener("mousedown", onRelease);

  overlay.classList.remove("hidden");
  marker.style.left = "0%";
  rafId = requestAnimationFrame(tick);
  // red de seguridad: si por lo que sea nunca llega un tap/click, no se queda trabado para siempre.
  const safetyTimeout = setTimeout(()=> finish(), 8000);
}

function playerAction(mv){
  if(!canAffordMove(mv, player.mp, player.hp, player.maxHp)) return;
  clearTurnTimer();
  disableMoves(true);
  if(mv.isUltimate){
    playUltimateChargeUp("spritePlayer");
    logBattle(`✨ Te concentras... ¡vas a usar ${mv.name}!`);
    triggerUltimateMinigame(mv, (multiplier)=>{
      const basePower = mv.power;
      setTimeout(()=>{
        mv.power = +(basePower * multiplier).toFixed(2);
        if(multiplier >= 1.3) logBattle(`💥 ¡Golpe cargado al máximo! (x${multiplier})`);
        else if(multiplier <= 0.75) logBattle(`😬 El golpe no salió tan cargado como esperabas (x${multiplier})`);
        executePlayerAction(mv);
        mv.power = basePower; // se restaura para la proxima vez, no debe quedar modificado permanente
      }, ULTIMATE_CHARGE_MS);
    });
  } else if(mv.interactive === "precision"){
    triggerPrecisionShotMinigame((zone)=>{
      const basePower = mv.power, baseCrit = mv.crit||0;
      mv.power = +(basePower*zone.mult).toFixed(2);
      mv.crit = +(baseCrit + zone.critBonus).toFixed(2);
      logBattle(`${zone.label} (x${zone.mult} daño${zone.critBonus>0?`, +${Math.round(zone.critBonus*100)}% crít.`:""})`);
      executePlayerAction(mv);
      mv.power = basePower; mv.crit = baseCrit;
    });
  } else if(mv.interactive === "tap" || mv.interactive === "swipe" || mv.interactive === "sweep"){
    const challenge = mv.interactive === "tap" ? triggerQuickTapChallenge
      : mv.interactive === "sweep" ? triggerQuickSweepChallenge
      : triggerQuickSwipeChallenge;
    challenge((success)=>{
      const basePower = mv.power;
      if(!success){ mv.power = +(basePower*0.65).toFixed(2); logBattle(`😬 No lo hiciste a tiempo — ${mv.name} sale más flojo.`); }
      executePlayerAction(mv);
      mv.power = basePower;
    });
  } else {
    executePlayerAction(mv);
  }
}

function executePlayerAction(mv){
  player.mp -= getMoveCost(mv, player.mp);
  if(mv.hpCost){ const hpc = getMoveHpCost(mv, player.maxHp); player.hp = Math.max(1, player.hp - hpc); logBattle(`El esfuerzo te cuesta ${hpc} HP.`); }
  const mon = battleState.mon;
  // Pasiva Desangrar del Berserker (Nv.45+): un golpe de verdad (phys/magic) mantiene o refresca el
  // sangrado; cualquier otra cosa (grito, potenciarse, curarse) lo corta — ver refreshBerserkerBleed/
  // breakBerserkerBleed. No hace nada si la clase/nivel no tienen la pasiva.
  if(mv.type === "phys" || mv.type === "magic") refreshBerserkerBleed(mon);
  else breakBerserkerBleed(mon);
  triggerClassAttackAnim(mv);

  // Guerrero: el daño no se revela apenas se pulsa el movimiento, sino cuando la animación
  // realmente "conecta" — para Terremoto (área) eso es tras la sacudida completa (~2s, ver
  // triggerGuerreroEarthquakeShake); para un golpe normal es cuando el salto llega al enemigo
  // y aparece la imagen de impacto con chispas (GUERRERO_ATTACK_TRAVEL_MS); para la definitiva es
  // recién cuando termina de caer en cámara lenta y golpea, tras los 4s congelado en el aire
  // (GUERRERO_ULTIMATE_LANDING_MS, ver playGuerreroUltimateSequence). El resto de los golpes (de
  // cualquier otra clase) se siguen viendo al toque.
  const isGuerreroAoeHit = player.classKey === "guerrero" && mv.aoe===true && !mv.isUltimate;
  const isGuerreroUltimateHit = player.classKey === "guerrero" && mv.isUltimate === true;
  const isGuerreroMeleeHit = player.classKey === "guerrero" && mv.aoe!==true && !mv.isUltimate;
  // Arquero: mismo criterio — el daño no se revela apenas se elige el movimiento, sino cuando la
  // flecha REALMENTE conecta con el enemigo (ver ARQUERO_ARROW_IMPACT_MS/fireArqueroArrowProjectile).
  // Incluye "debuff" (Flecha Cegadora): el flash blanco tiene que verse recién cuando la flecha
  // pega, no apenas se aprieta el botón — si no, el aviso queda antes de que la flecha ni siquiera
  // haya salido disparada.
  const isArqueroHit = player.classKey === "arquero" && (mv.type === "phys" || mv.type === "magic" || mv.type === "debuff");
  const deferHit = isGuerreroAoeHit || isGuerreroMeleeHit || isGuerreroUltimateHit || isArqueroHit;
  const hitDelayMs = isGuerreroAoeHit ? GUERRERO_AOE_SHAKE_MS : isGuerreroUltimateHit ? GUERRERO_ULTIMATE_LANDING_MS
    : isArqueroHit ? ARQUERO_ARROW_IMPACT_MS : GUERRERO_ATTACK_TRAVEL_MS;
  if(isGuerreroAoeHit) triggerGuerreroEarthquakeShake();

  if(mv.type==="buff"){
    if(mv.buff==="atk"){ battleState.playerBuffs.atk = 1+mv.amount; battleState.playerBuffs.turnsAtk = mv.dur; }
    if(mv.buff==="def"){ battleState.playerBuffs.def = 1+mv.amount; battleState.playerBuffs.turnsDef = mv.dur; }
    if(mv.selfDef){ battleState.playerBuffs.def = Math.max(0.3, 1+mv.selfDef); battleState.playerBuffs.turnsDef = mv.dur; }
    logBattle(`Usas ${mv.name}. ¡Te sientes con más poder!`);
    animateSprite("spritePlayer","attackp");
  } else if(mv.type==="heal"){
    const heal = Math.round(player.maxHp*mv.amount);
    player.hp = Math.min(player.maxHp, player.hp+heal);
    logBattle(`Usas ${mv.name} y recuperas ${heal} HP.`);
    animateSprite("spritePlayer","attackp");
    flashSprite("spritePlayer","green");
    spawnFloatingNumber("spritePlayer", "+"+heal, "heal");
  } else if(mv.type==="debuff"){
    if(mv.stat==="def") mon.def = +(mon.def*(1-mv.amount)).toFixed(1);
    if(mv.stat==="atk") mon.atk = +(mon.atk*(1-mv.amount)).toFixed(1);
    // "accuracy" no toca ninguna stat de daño — le da al enemigo una chance fija de fallar su
    // propio golpe por el resto del combate (ver el chequeo de mon.missChance al principio de
    // enemyTurn/resolveEnemyDirectAttack). Guarda el mayor valor en vez de sumar: usar Flecha
    // Cegadora dos veces no debería volver al enemigo incapaz de acertar nunca.
    if(mv.stat==="accuracy") mon.missChance = Math.max(mon.missChance||0, mv.amount);
    animateSprite("spritePlayer","attackp");
    const revealDebuff = ()=>{
      logBattle(mv.stat==="accuracy"
        ? `Usas ${mv.name}. ¡${mon.tpl.name} queda encandilado!`
        : `Usas ${mv.name}. ¡${mon.tpl.name} se ve más débil!`);
      flashSprite("spriteEnemy", mv.stat==="accuracy" ? "white" : "red");
    };
    if(deferHit) setTimeout(revealDebuff, hitDelayMs); else revealDebuff();
  } else if(battleState.thiefTauntActive){
    // Se cobra la promesa de "¿A que no puedes darme?" del turno pasado (ver enemyTurn) — el golpe
    // falla seguro, una sola vez, sin importar evasionChance ni nada más.
    battleState.thiefTauntActive = false;
    triggerThiefDodgePose();
    showBattlePopup("¡Falla!", "miss");
    spawnFloatingNumber("spriteEnemy", "MISS", "miss");
    logBattle(`😏 ¡${mon.tpl.name} esquiva tu ataque justo como prometió!`);
    animateSprite("spritePlayer","attackp");
  } else if(mon.tpl.evasionChance && Math.random() < mon.tpl.evasionChance){
    if(mon.tpl === THIEF_TEMPLATE){
      triggerThiefDodgePose();
      const line = pickThiefDodgeLine();
      logBattle(`🥷 ${mon.tpl.name}: "${line}"`);
      showThiefDialogue(`"${line}"`);
    } else {
      triggerShadowWolfPose("dodge", 800);
    }
    showBattlePopup("¡Esquivado!", "miss");
    spawnFloatingNumber("spriteEnemy", "MISS", "miss");
    logBattle(`💨 ¡${mon.tpl.name} esquiva tu ataque de un salto!`);
    animateSprite("spritePlayer","attackp");
  } else {
    const hits = mv.hits||1;
    let totalDmg = 0;
    for(let h=0; h<hits; h++){
      let dmg = calcDamage(effectiveAtk(mv), mon.def, mv.power, (mv.crit||0.06) + (player.critBonus||0));
      if(mv.execute && mon.curHp < mon.maxHp*0.3) dmg = Math.round(dmg*1.6);
      if(mv.pierce) dmg = calcDamage(effectiveAtk(mv), mon.def*(1-mv.pierce), mv.power, mv.crit);
      mon.curHp = Math.max(0, mon.curHp - dmg);
      totalDmg += dmg;
    }
    const petBonus = Math.round(petDamageBonus());
    if(petBonus > 0){
      mon.curHp = Math.max(0, mon.curHp - petBonus);
      totalDmg += petBonus;
      logBattle(`🐾 Tus mascotas ayudan con ${petBonus} de daño extra.`);
    }
    const revealHit = ()=>{
      if(mv.isUltimate){
        animateSprite("spriteEnemy","ultimate-hit");
        animateSprite("spritePlayer","ultimate-strike");
        flashSprite("spriteEnemy","ultimate");
      } else {
        animateSprite("spriteEnemy","hitshake");
        animateSprite("spritePlayer","attackp");
        flashSprite("spriteEnemy","red");
      }
      if(mon.tpl.name === "Slime Salvaje") triggerSlimeSalvajePose("hurt", 600);
      if(mon.tpl.name === "Rata Mutante") triggerRataMutantePose("hurt", 600);
      if(mon.tpl.name === "Cuervo Corrupto") triggerCuervoHurtPose();
      if(mon.tpl.name === "Espectro") triggerEspectroPose("hurt", 600);
      maybeShowCrit(totalDmg, mon.maxHp);
      spawnFloatingNumber("spriteEnemy", "-"+totalDmg, (totalDmg >= mon.maxHp*0.5) ? "crit" : "damage");
      logBattle(`Usas ${mv.name}: ${totalDmg} de daño${hits>1?` (${hits} golpes)`:""}.`);
    };
    if(deferHit) setTimeout(revealHit, hitDelayMs); else revealHit();
    const proc = rollWeaponProc(totalDmg);
    if(proc){
      if(proc.type==="haste"){ battleState.playerBuffs.spd = Math.max(battleState.playerBuffs.spd, 1.4); logBattle(`💨 ¡Tu arma te acelera!`); }
      else { applyStatusEffect(mon, proc.type); logBattle(`${PROC_LABELS[proc.type]} ¡${mon.tpl.name} queda ${STATUS_EFFECTS[proc.type].label.toLowerCase()}!`); }
    }
    if(mv.drain){ const heal = Math.round(totalDmg*mv.drain); player.hp = Math.min(player.maxHp, player.hp+heal); logBattle(`Absorbes ${heal} HP.`); }
    if(mv.slow){ battleState.monSlow = mv.slow; logBattle(`¡${mon.tpl.name} se vuelve más lento!`); }
    if(mv.stun && Math.random()<mv.stun){ battleState.monStunned = true; logBattle(`¡${mon.tpl.name} queda aturdido!`); }
    if(mv.selfDmg){ const sd=Math.round(player.maxHp*mv.selfDmg); player.hp=Math.max(1, player.hp-sd); logBattle(`El esfuerzo te cuesta ${sd} HP.`); }
    if(mv.selfBuffSpd){ battleState.playerBuffs.spd = 1+mv.selfBuffSpd; logBattle(`Tu velocidad aumenta.`); }
  }

  if(mv.isUltimate) slowDrainMp("bPMp");
  if(deferHit){
    // se actualizan la barra de vida y el HUD recién cuando el golpe realmente conecta
    // (sacudida completa en Terremoto, o el salto llegando al enemigo en un golpe normal) —
    // si no, se vería la vida del enemigo bajar ANTES de que se vea el impacto.
    setTimeout(()=>{ updateBattleBars(); refreshHud(); }, hitDelayMs);
  } else {
    updateBattleBars();
    refreshHud();
  }

  setTimeout(()=>{
    if(mon.curHp<=0){ return winBattle(); }
    if(mon.tpl.fleeBelow && !battleState.monFled && (mon.curHp/mon.maxHp) <= mon.tpl.fleeBelow){
      battleState.monFled = true;
      return shadowWolfFlee(mon);
    }
    // Misma chance por ventaja de VEL que el enemigo (ver rollExtraTurnChance/maybeExtraEnemyTurn) —
    // `playerExtraTurnActive` evita que este segundo turno sortee un tercero.
    if(!battleState.playerExtraTurnActive && rollExtraTurnChance(effectivePlayerSpd(), effectiveMonSpd(mon))){
      battleState.playerExtraTurnActive = true;
      logBattle(`💨 ¡Eres tan veloz que puedes actuar de nuevo!`);
      disableMoves(false);
      renderMoveGrid();
      return;
    }
    battleState.playerExtraTurnActive = false;
    maybeDoPetTurn(enemyTurn);
  }, postPlayerActionDelay(mv));
}

/** Si el arma equipada tiene una propiedad especial (quemar/envenenar/acelerar), la sortea tras un golpe.
 *  Nota: solo aplica a TUS propios golpes en PvE (solo, manada, grupo) — en duelos PvP se omite, porque
 *  el rival solo conoce tus estadísticas base, no los detalles de tu arma, y el combate ahí es determinista. */
function rollWeaponProc(totalDmg){
  const w = player.equipment.weapon;
  if(!w || !w.proc) return null;
  if(Math.random() >= w.proc.chance) return null;
  if(w.proc.type === "haste") return {type:"haste"};
  const bonus = Math.max(1, Math.round(totalDmg * (w.proc.mult||0.5)));
  return {type:w.proc.type, bonus};
}

function effectiveAtk(mv){
  const base = player.atk + ((mv && mv.type==="magic") ? (player.matk||0) : 0);
  const nightBonus = (isEspadaLunarEquipped() && isNightTime()) ? 1.3 : 1;
  const shrineBonus = shrineBuffMultiplier((mv && mv.type==="magic") ? "matk" : "atk");
  return base * (battleState.playerBuffs.atk||1) * nightBonus * shrineBonus * weaponNightDmgMult();
}
/** Bono de daño nocturno de un arma FABRICADA (ver nightDmgBonus en BLACKSMITH_RECIPES, ej. el
 *  Arco Demoníaco) — mismo mecanismo que ya usaba en solitario la Espada Lunar
 *  (isEspadaLunarEquipped, arriba), generalizado a cualquier arma para no tener que agregar un
 *  caso especial por cada una nueva. */
function weaponNightDmgMult(){
  const w = player.equipment && player.equipment.weapon;
  return (w && w.nightDmgBonus && isNightTime()) ? 1+w.nightDmgBonus : 1;
}
/** ¿Tiene equipada el arma legendaria del Lobo Nocturno (cualquiera de sus versiones por clase)? */
function isEspadaLunarEquipped(){
  const w = player.equipment && player.equipment.weapon;
  return !!(w && w.lunarWeapon);
}
function effectiveDef(){ return player.def * (battleState.playerBuffs.def||1); }
function effectivePlayerSpd(){ return player.spd * (battleState.playerBuffs.spd||1); }
/** El "Rayo Helado" del Mago (mv.slow) reduce la VEL real del enemigo, no solo la fuerza de su
 *  golpe — ver spdMod en enemyTurn/resolveEnemyDirectAttack, mismo battleState.monSlow. */
function effectiveMonSpd(mon){ return mon.spd * (battleState.monSlow ? (1-battleState.monSlow) : 1); }
/** Pedido explícito: quien tiene más de 70% de VEL de ventaja sobre su rival tiene una CHANCE
 *  (no garantía) de actuar una segunda vez seguida en el mismo turno — nunca una tercera. La
 *  chance arranca en 15% justo al cruzar el umbral y crece con la ventaja, con tope en 45% para que
 *  ni el build más veloz vuelva el turno extra un hecho garantizado. */
const EXTRA_TURN_SPD_RATIO = 1.7;
const EXTRA_TURN_BASE_CHANCE = 0.15;
const EXTRA_TURN_MAX_CHANCE = 0.45;
function rollExtraTurnChance(actorSpd, opponentSpd){
  if(!actorSpd || !opponentSpd) return false;
  const ratio = actorSpd / opponentSpd;
  if(ratio < EXTRA_TURN_SPD_RATIO) return false;
  const chance = Math.min(EXTRA_TURN_MAX_CHANCE, EXTRA_TURN_BASE_CHANCE + (ratio-EXTRA_TURN_SPD_RATIO)*0.25);
  return Math.random() < chance;
}
/** Cierra el turno del enemigo — salvo que acabe de conectar un golpe real (no aplica tras fallar,
 *  curarse, etc.) y la ventaja de VEL le dé el turno extra (ver rollExtraTurnChance). `isExtraAttack`
 *  evita que ese segundo golpe intente sortear un tercero. */
function maybeExtraEnemyTurn(mon, isExtraAttack){
  if(!isExtraAttack && player.hp>0 && mon.curHp>0 && rollExtraTurnChance(effectiveMonSpd(mon), effectivePlayerSpd())){
    logBattle(`💨 ¡${mon.tpl.name} es tan veloz que ataca de nuevo!`);
    setTimeout(()=> enemyTurn(true), 500);
  } else {
    finishEnemyTurn();
  }
}

/** Mitigación por ratio (retornos decrecientes), no resta plana: con la resta plana de antes
 *  (atk*power - def*0.4), un jugador bien equipado veía a los enemigos de SU MISMO nivel quedar
 *  en el piso de 1 de daño en cuanto su DEF pasaba ~2.5x el ATK del enemigo — el combate dejaba
 *  de sentirse como un intercambio de golpes. Con `def/(def+K)` cada punto de DEF pesa cada vez
 *  menos y nunca anula el ataque salvo una diferencia enorme; K=15 es el punto donde la DEF
 *  mitiga el 50% (ajustado para que Nv.igual vs Nv.igual vuelva a doler, sin desbalancear las
 *  peleas contra enemigos varios niveles arriba que ya se sentían bien). */
const DAMAGE_MITIGATION_K = 15;
function calcDamage(atk, def, power, critChance){
  const rawAtk = atk*power;
  const mitigation = def / (def + DAMAGE_MITIGATION_K);
  let base = rawAtk * (1 - mitigation);
  base = Math.max(1, base);
  const variance = 0.85 + Math.random()*0.3;
  let dmg = base*variance;
  let isCrit = Math.random() < (critChance||0.06);
  if(isCrit) dmg *= 1.8;
  return Math.max(1, Math.round(dmg*1.18));
}

function xpCurveForLevel(level){
  // se diseña en base a "cuantos combates hacen falta para subir de nivel", y ese numero
  // de combates crece con el nivel (18 aprox al inicio, ~45 cerca del nivel 70) — no solo
  // el total de XP requerida, para que a niveles altos de verdad se sienta mas lento.
  const killsNeeded = 18 + level*0.35;
  const avgKillXp = level*17 + 5; // debe coincidir con el promedio de lo que da un monstruo de ese nivel
  return Math.round(killsNeeded * avgKillXp);
}

function simulateXpProgress(level, xp, xpNext, gain){
  let curLevel = level;
  let curXp = xp + gain;
  let curNext = xpNext;
  let gainedLevels = 0;
  while(curXp >= curNext){
    curXp -= curNext;
    curLevel++;
    curNext = xpCurveForLevel(curLevel);
    gainedLevels++;
  }
  return {level:curLevel, xp:curXp, xpNext:curNext, gainedLevels};
}

function updateResultProgressVisibility(visible){
  const box = $("resultProgress");
  if(box) box.classList.toggle("hidden", !visible);
}

function animateResultProgress(summary){
  const box = $("resultProgress");
  if(!box || !summary){ updateResultProgressVisibility(false); return; }
  updateResultProgressVisibility(true);

  const ch = summary.char;
  const charFill = $("resultCharXpFill");
  const charText = $("resultCharXpText");
  const charLvl = $("resultCharLevel");
  const bonusFill = $("resultCharXpBonusFill");
  if(bonusFill){ bonusFill.style.transition = "none"; bonusFill.style.left = "0%"; bonusFill.style.width = "0%"; }
  if(charFill && charText && charLvl){
    // Un solo requestAnimationFrame no alcanza acá: #resultProgress recién se hizo visible en este
    // mismo tick (updateResultProgressVisibility de arriba), y el navegador a veces colapsa el
    // ancho "antes" y el "después" en un solo frame cuando el elemento no tenía todavía un layout
    // pintado — la barra saltaba directo al final sin animarse (bug real reportado). Mismo truco de
    // "sin transición, forzar reflow, restaurar transición" que ya usa startGatherProgress/
    // playBattleBarsIntroFx más arriba en este archivo, para garantizar que el "antes" se pinte de
    // verdad antes de disparar la transición hacia el "después".
    charFill.style.transition = "none";
    charFill.style.width = pct(ch.beforeXp, ch.beforeXpNext)+"%";
    void charFill.offsetWidth;
    charFill.style.transition = "";
    charFill.style.width = pct(ch.afterXp, ch.afterXpNext)+"%";
    charText.textContent = `${ch.beforeXp} / ${ch.beforeXpNext} → ${ch.afterXp} / ${ch.afterXpNext}`;
    charLvl.textContent = `Nv.${ch.beforeLevel} → Nv.${ch.afterLevel}`;
  }

  const petRow = $("resultPetRow");
  const pet = summary.pet;
  if(pet && petRow){
    petRow.classList.remove("hidden");
    $("resultPetName").textContent = `${pet.emoji} ${pet.name}`;
    const petFill = $("resultPetXpFill");
    const petText = $("resultPetXpText");
    const petLvl = $("resultPetLevel");
    petFill.style.transition = "none";
    petFill.style.width = pct(pet.beforeXp, pet.beforeXpNext)+"%";
    void petFill.offsetWidth;
    petFill.style.transition = "";
    petFill.style.width = pct(pet.afterXp, pet.afterXpNext)+"%";
    petText.textContent = `${pet.beforeXp} / ${pet.beforeXpNext} → ${pet.afterXp} / ${pet.afterXpNext}`;
    petLvl.textContent = `Nv.${pet.beforeLevel} → Nv.${pet.afterLevel}`;
  } else if(petRow){
    petRow.classList.add("hidden");
  }

  const achievements = [];
  if(ch.gainedLevels>0) achievements.push(`🏅 Logro: ${player.name} subió a Nv.${ch.afterLevel}`);
  if(pet && pet.gainedLevels>0) achievements.push(`🐾 Logro: ${pet.name} subió a Nv.${pet.afterLevel}`);
  const ach = $("resultAchievements");
  if(ach){
    if(achievements.length){
      ach.classList.remove("hidden");
      ach.innerHTML = achievements.join("<br>");
    } else {
      ach.classList.add("hidden");
      ach.innerHTML = "";
    }
  }
}

/** Si el jefe está débil (menos del 40% HP) y aún no ha invocado, convierte el combate en uno de manada con 1-2 esbirros. */
function maybeBossSummon(){
  const mon = battleState.mon;
  if(battleState.bossSummoned || mon.curHp > mon.maxHp*0.4) return false;
  battleState.bossSummoned = true;

  // un jefe de mazmorra invoca a SUS PROPIOS esbirros temáticos (la niebla oscura del portal), no
  // monstruos genéricos del mapa — mismo pool que usa maybeSpawnDungeonAuraEnemy() en el mundo.
  const dungeonId = battleState.isDungeon && player.activeDungeonRun && player.activeDungeonRun.dungeonId;
  const dungeon = dungeonId ? getDungeonDef(dungeonId) : null;
  const auraPool = dungeon && DUNGEON_AURA_ENEMY_TEMPLATES[dungeon.auraEnemyKey];

  const minionCount = mon.level >= player.level+4 ? 2 : 1;
  const minions = [];
  for(let i=0;i<minionCount;i++){
    const mtpl = (auraPool && auraPool.length)
      ? auraPool[Math.floor(Math.random()*auraPool.length)]
      : MONSTER_TEMPLATES[Math.floor(Math.random()*MONSTER_TEMPLATES.length)];
    const lvl = Math.max(1, mon.level-2);
    const mhp = Math.round((22+lvl*13)*mtpl.hpM*0.7);
    const matk = +((6+lvl*2.8)*mtpl.atkM*0.8).toFixed(1);
    const mdef = +((4+lvl*2.1)*mtpl.defM*0.8).toFixed(1);
    const mspd = 4+Math.floor(lvl*0.6);
    minions.push({ref:null, tpl:mtpl, level:lvl, curHp:mhp, maxHp:mhp, atk:matk, def:mdef, spd:mspd, packBonus:1, slow:0, stunned:false});
  }
  const bossEntry = {ref:mon, tpl:mon.tpl, level:mon.level, curHp:mon.curHp, maxHp:mon.maxHp, atk:mon.atk, def:mon.def, spd:mon.spd,
    packBonus:3, slow: battleState.monSlow||0, stunned:false, isBoss:true};

  // preserva TODAS las banderas de contexto del battleState original (isDungeon/isColiseo/
  // dungeonFloor/eventId/isTowerChallenge) — si no, packWinBattle() nunca sabe que este combate
  // era de mazmorra y no llama a dungeonWinFloor(), dejando la corrida sin avanzar ni entrar en
  // cooldown: al volver a entrar al portal, te vuelve a tocar el mismo jefe en bucle.
  battleState = {
    isPack: true,
    isDungeon: battleState.isDungeon,
    isColiseo: battleState.isColiseo,
    isTowerChallenge: battleState.isTowerChallenge,
    eventId: battleState.eventId,
    dungeonFloor: battleState.dungeonFloor,
    mons: [bossEntry, ...minions],
    selectedTarget: 0,
    playerBuffs: battleState.playerBuffs,
    bossSummoned: true,
    log: []
  };
  $("soloEnemyPanel").classList.add("hidden");
  $("packEnemyPanels").classList.remove("hidden");
  $("spriteEnemy").classList.add("hidden");
  $("packStageRow").classList.remove("hidden");
  logBattle(`¡${mon.tpl.name} invoca ${minionCount>1?"refuerzos":"un refuerzo"}!`);
  renderPackEnemyPanels();
  renderPackStage();
  updateBattleBars();
  return true;
}

/** Antes de un golpe fuerte del enemigo, da al jugador una ventana breve para deslizar el dedo y
 *  esquivarlo por completo. Si no desliza a tiempo (o el gesto es muy corto), recibe el golpe entero. */
const SHADOW_WOLF_DOT_COUNT = 6;
/** El QTE del Zarpazo Umbrío (ataque cargado de 2 turnos del Lobo Sombrío): aparecen 6 puntos
 *  redondos, uno por vez, en posiciones al azar de la pantalla — hay que tocar cada uno antes de
 *  que desaparezca solo. Al final, `onResolve(hits)` recibe cuántos de los 6 se acertaron:
 *  6/6 = esquiva total, 5/6 = golpe reducido, 4 o menos = golpe completo (ver enemyTurn()). */
function triggerShadowWolfDotQTE(mon, onResolve){
  const overlay = $("dotQteOverlay");
  if(!overlay){ onResolve(0); return; } // resguardo defensivo si el overlay no existiera en el HTML
  $("dotQteText").textContent = `¡${mon.tpl.name} lanza su Zarpazo Umbrío! Toca los puntos.`;
  const progressEl = $("dotQteProgress");
  overlay.querySelectorAll(".shadow-wolf-dot").forEach(d=>d.remove()); // resguardo por si quedó algo de una vez anterior
  overlay.classList.remove("hidden");

  const TELEGRAPH_MS = 450;   // un instante antes de que empiece a salir el primer punto
  const DOT_LIFETIME_MS = 700; // cuánto dura cada punto en pantalla antes de desaparecer solo
  const DOT_GAP_MS = 150;      // pausa breve entre un punto y el siguiente
  const DOT_SIZE = 62;
  const MARGIN_X = 30, MARGIN_TOP = 130, MARGIN_BOTTOM = 90;
  let hits = 0, shown = 0;

  function updateProgress(){ if(progressEl) progressEl.textContent = `${hits}/${SHADOW_WOLF_DOT_COUNT}`; }
  updateProgress();

  function spawnDot(){
    shown++;
    const dot = document.createElement("div");
    dot.className = "shadow-wolf-dot";
    dot.textContent = "🐾";
    const rect = overlay.getBoundingClientRect();
    const maxX = Math.max(MARGIN_X, rect.width - DOT_SIZE - MARGIN_X);
    const maxY = Math.max(MARGIN_TOP, rect.height - DOT_SIZE - MARGIN_BOTTOM);
    dot.style.left = (MARGIN_X + Math.random()*(maxX-MARGIN_X)) + "px";
    dot.style.top = (MARGIN_TOP + Math.random()*(maxY-MARGIN_TOP)) + "px";
    let resolved = false, timer = null;
    function resolveDot(hit){
      if(resolved) return;
      resolved = true;
      clearTimeout(timer);
      if(hit) hits++;
      updateProgress();
      dot.classList.add("dot-leaving");
      setTimeout(()=> dot.remove(), 160);
      if(shown >= SHADOW_WOLF_DOT_COUNT){
        setTimeout(()=>{ overlay.classList.add("hidden"); onResolve(hits); }, 220);
      } else {
        setTimeout(spawnDot, DOT_GAP_MS);
      }
    }
    dot.addEventListener("touchstart", (e)=>{ e.preventDefault(); resolveDot(true); }, {passive:false});
    dot.addEventListener("mousedown", ()=> resolveDot(true));
    overlay.appendChild(dot);
    timer = setTimeout(()=> resolveDot(false), DOT_LIFETIME_MS);
  }

  setTimeout(spawnDot, TELEGRAPH_MS);
}
function triggerDodgeQTE(mon, onResolve, isBlockMode){
  const overlay = $("dodgeQteOverlay");
  const barFill = $("dodgeQteBarFill");
  const hint = $("dodgeQteHint");
  $("dodgeQteText").textContent = isBlockMode
    ? `¡${mon.tpl.name} prepara un golpe fuerte! Desliza para cubrirte con ${player.classKey === "mago" ? "la barrera mágica" : player.classKey === "berserker" ? "el filo de la espada" : player.classKey === "arquero" ? "el arco" : "el escudo"}.`
    : `¡${mon.tpl.name} prepara un golpe fuerte!`;
  hint.textContent = "👀 ¡Prepárate...!";
  if(barFill) barFill.style.width = "100%";
  overlay.classList.remove("hidden");
  overlay.style.pointerEvents = "none"; // durante el aviso inicial todavia no cuenta el deslizamiento

  const TELEGRAPH_MS = 500; // un momento para darte cuenta de que viene el golpe, antes de que empiece a correr el tiempo
  const WINDOW_MS = 1700;   // tiempo real para deslizar, una vez que ya empezó la cuenta
  const SWIPE_MIN_DIST = 30;
  let resolved = false;
  let startX = null, startY = null;
  let tick = null;

  function cleanup(){
    overlay.removeEventListener("touchstart", onTouchStart);
    overlay.removeEventListener("touchend", onTouchEnd);
    overlay.removeEventListener("mousedown", onMouseDown);
    overlay.removeEventListener("mouseup", onMouseUp);
    if(tick) clearInterval(tick);
  }
  function finish(dodged){
    if(resolved) return;
    resolved = true;
    cleanup();
    overlay.classList.add("hidden");
    overlay.style.pointerEvents = "none";
    hint.textContent = dodged ? (isBlockMode ? "🛡️ ¡Bloqueaste!" : "💨 ¡Esquivaste!") : "💥 ¡Te golpeó!";
    onResolve(dodged);
  }
  function checkSwipe(x1,y1,x2,y2){
    if(x1==null) return;
    const dist = Math.hypot(x2-x1, y2-y1);
    if(dist > SWIPE_MIN_DIST) finish(true);
  }
  function onTouchStart(e){ const t=e.touches[0]; startX=t.clientX; startY=t.clientY; }
  function onTouchEnd(e){ const t=e.changedTouches[0]; checkSwipe(startX,startY,t.clientX,t.clientY); }
  function onMouseDown(e){ startX=e.clientX; startY=e.clientY; }
  function onMouseUp(e){ checkSwipe(startX,startY,e.clientX,e.clientY); }

  setTimeout(()=>{
    if(resolved) return;
    // arranca la ventana real: ahora si cuenta el deslizamiento y empieza a bajar la barra
    overlay.style.pointerEvents = "auto";
    hint.textContent = "👉 ¡DESLIZA AHORA para esquivar!";
    overlay.addEventListener("touchstart", onTouchStart, {passive:true});
    overlay.addEventListener("touchend", onTouchEnd);
    overlay.addEventListener("mousedown", onMouseDown);
    overlay.addEventListener("mouseup", onMouseUp);

    const startTime = Date.now();
    tick = setInterval(()=>{
      const elapsed = Date.now() - startTime;
      const pct = Math.max(0, 100 - (elapsed/WINDOW_MS*100));
      if(barFill) barFill.style.width = pct+"%";
      if(elapsed >= WINDOW_MS) finish(false);
    }, 40);
  }, TELEGRAPH_MS);
}

/** El Lobo Sombrío huye al bajar del 20% de vida — no deja recompensa, pero vuelve más fuerte
 *  la próxima vez que aparezca (ver shadowWolfLevel). */
function shadowWolfFlee(mon){
  triggerShadowWolfPose("dodge", 1200);
  logBattle(`🐺 ${mon.tpl.name}: "Muy bien... nos veremos a la próxima."`);
  showShadowWolfDialogue(`"Muy bien... nos veremos a la próxima."`);
  player.shadowWolfEscapes = Math.min(20, (player.shadowWolfEscapes||0)+1);
  saveGame();
  setTimeout(()=>{
    $("battleWrap").classList.add("hidden");
    toast(`🐺 ${mon.tpl.name} escapó — la próxima vez será más fuerte.`, 4200);
    battleState = null;
  }, 1200);
}

/** Técnica de Clones del Ladrón/Ninja errante: 3 copias idénticas reemplazan por un momento al
 *  único sprite del enemigo (#spriteEnemy) — una es la real (battleState.thiefClones.realIndex),
 *  las otras dos son señuelos. Reemplaza por completo la interacción normal del jugador (no hay
 *  grilla de movimientos disponible mientras dura, mismo criterio que las QTE de esquiva/Zarpazo
 *  Umbrío del Lobo Sombrío) — tocar una es la única acción posible, y sea cual sea el resultado,
 *  los clones duran exactamente ese intercambio: se resuelve y se vuelve al enemigo de siempre. */
function triggerThiefCloneChallenge(mon){
  const container = $("spriteEnemy");
  if(!container) return;
  disableMoves(true);
  const realIndex = Math.floor(Math.random()*3);
  battleState.thiefClones = {realIndex, resolved:false};
  container.innerHTML = `<div class="thief-clone-row">${[0,1,2].map(i=>
    `<div class="thief-clone-slot" data-idx="${i}"><img src="${THIEF_SPRITES.base}" class="thief-clone-img" alt=""></div>`
  ).join("")}</div>`;
  container.querySelectorAll(".thief-clone-slot").forEach(slot=>{
    slot.addEventListener("click", ()=> resolveThiefCloneTap(mon, +slot.dataset.idx));
  });
  logBattle(`🥷 ¡${mon.tpl.name} se divide en 3! Solo uno es real — toca el que creas que es.`);
}
/** Restaura #spriteEnemy a su único sprite normal — se llama apenas se resuelve la Técnica de
 *  Clones, se haya acertado o no, para que el resto del combate siga viéndose como siempre. */
function restoreThiefSprite(mon){
  const container = $("spriteEnemy");
  if(!container) return;
  container.innerHTML = enemySpriteHtml(mon.tpl) || "";
}
function resolveThiefCloneTap(mon, idx){
  if(!battleState.thiefClones || battleState.thiefClones.resolved) return;
  battleState.thiefClones.resolved = true;
  const isReal = idx === battleState.thiefClones.realIndex;
  const realIdx = battleState.thiefClones.realIndex;
  battleState.thiefClones = null;
  document.querySelectorAll("#spriteEnemy .thief-clone-slot").forEach((slot,i)=>{
    slot.classList.toggle("thief-clone-picked", i===idx);
    slot.classList.toggle("thief-clone-fake", i!==realIdx);
  });
  setTimeout(()=>{
    restoreThiefSprite(mon);
    if(!isReal){
      showBattlePopup("¡Clon!", "miss");
      logBattle(`💨 ¡Era un clon! Pierdes el turno.`);
      setTimeout(()=> enemyTurn(), 700);
      return;
    }
    const dmg = calcDamage(effectiveAtk({type:"phys"}), mon.def, 1, 0.06+(player.critBonus||0));
    mon.curHp = Math.max(0, mon.curHp - dmg);
    animateSprite("spriteEnemy","hitshake");
    animateSprite("spritePlayer","attackp");
    flashSprite("spriteEnemy","red");
    maybeShowCrit(dmg, mon.maxHp);
    logBattle(`🎯 ¡Era el real! "Tuviste suerte..." — ${dmg} de daño.`);
    showThiefDialogue(`"Tuviste suerte..."`);
    updateBattleBars(); refreshHud();
    setTimeout(()=>{
      if(mon.curHp<=0){ return winBattle(); }
      maybeDoPetTurn(enemyTurn);
    }, 700);
  }, 550);
}

function enemyTurn(isExtraAttack){
  const mon = battleState.mon;
  // El DOT del monstruo (p.ej. veneno que le aplicó el jugador) ya se descontó en el primer golpe
  // de este turno — no se vuelve a tickear en el segundo golpe del mismo turno extra (ver
  // rollExtraTurnChance/maybeExtraEnemyTurn), o el veneno haría el doble de daño en rondas rápidas.
  if(!isExtraAttack && tickStatusEffect(mon, "spriteEnemy")){
    updateBattleBars(); refreshHud();
    disableMoves(false);
    setTimeout(()=> winBattle(), 500);
    return;
  }
  updateBattleBars();
  if(mon.isBoss && maybeBossSummon()){
    disableMoves(false);
    renderMoveGrid();
    return;
  }
  if(battleState.monStunned){
    logBattle(`${mon.tpl.name} está aturdido y no puede actuar.`);
    battleState.monStunned = false;
    disableMoves(false); renderMoveGrid();
    return;
  }
  // Lobo Sombrío: se cura al 100% UNA sola vez por combate, justo al cruzar el 30% de vida.
  if(mon.tpl.fullHealOnceBelow && !battleState.monFullHealUsed && (mon.curHp/mon.maxHp) <= mon.tpl.fullHealOnceBelow){
    battleState.monFullHealUsed = true;
    mon.curHp = mon.maxHp;
    cureBerserkerBleedOnEnemyRecovery(mon);
    triggerShadowWolfPose("special", 1200);
    logBattle(`🌑 ¡${mon.tpl.name} aúlla bajo la luna y se recupera por completo!`);
    flashSprite("spriteEnemy","green");
    updateBattleBars();
    disableMoves(false); renderMoveGrid();
    return;
  }
  // Lobo Sombrío: ataque cargado de 2 turnos — el primero solo carga, el segundo golpea fuerte y
  // hay que esquivarlo con un patrón de gestos distinto cada vez.
  if(mon.tpl.isShadowWolf){
    if(battleState.monCharging === 1){
      battleState.monCharging = 2;
      triggerShadowWolfPose("special", 1800);
      logBattle(`⚡ ¡${mon.tpl.name} desata su Zarpazo Umbrío!`);
      triggerShadowWolfDotQTE(mon, (hits)=>{
        battleState.monCharging = 0;
        if(hits >= SHADOW_WOLF_DOT_COUNT){
          logBattle(`💨 ¡Esquivaste el Zarpazo Umbrío por completo! (${hits}/${SHADOW_WOLF_DOT_COUNT})`);
        } else if(hits === SHADOW_WOLF_DOT_COUNT-1){
          const dmg = Math.max(1, Math.round((mon.atk*1.9 - player.def*0.3) * 0.5));
          player.hp = Math.max(0, player.hp - dmg);
          flashSprite("spritePlayer","red");
          logBattle(`💨 ¡Casi lo esquivas! (${hits}/${SHADOW_WOLF_DOT_COUNT}) — el Zarpazo Umbrío te roza: -${dmg} HP.`);
        } else {
          const dmg = Math.max(1, Math.round(mon.atk*1.9 - player.def*0.3));
          player.hp = Math.max(0, player.hp - dmg);
          flashSprite("spritePlayer","red");
          logBattle(`💥 ¡El Zarpazo Umbrío te golpea de lleno! (${hits}/${SHADOW_WOLF_DOT_COUNT}) -${dmg} HP.`);
        }
        updateBattleBars(); refreshHud(); saveGame();
        if(player.hp<=0){ offerRevive(loseBattle); return; }
        disableMoves(false); renderMoveGrid();
      });
      return;
    }
    if(!battleState.monCharging && Math.random() < 0.3){
      battleState.monCharging = 1;
      triggerShadowWolfPose("charge", 1800);
      logBattle(`🌀 ¡${mon.tpl.name} prepara un Súper ataque cargado (1/2)!`);
      showShadowWolfDialogue(`⚠️ ¡Prepara un Súper ataque cargado! Ten cuidado en el próximo turno.`, {variant:"charge"});
      updateBattleBars();
      disableMoves(false); renderMoveGrid();
      return;
    }
  }
  // Ladrón/Ninja errante: tres gestos propios además de esquivar (evasionChance, ver más abajo en
  // executePlayerAction) — la burla "¿A que no puedes darme?" (el siguiente golpe del jugador falla
  // seguro, se consume en executePlayerAction), el Shuriken Venenoso (golpe + veneno que sigue
  // quitando vida turno a turno vía tickStatusEffect, ver finishEnemyTurn), y la Técnica de Clones
  // (ver triggerThiefCloneChallenge más abajo). Nunca dos en el mismo turno — se prueban en orden y
  // cada uno corta con `return` si sale.
  if(mon.tpl === THIEF_TEMPLATE){
    if(!battleState.thiefClones && Math.random() < 0.22){
      const line = "¡Ahora me ves, ahora no!";
      logBattle(`🥷 ${mon.tpl.name}: "${line}"`);
      showThiefDialogue(`"${line}"`, {variant:"charge"});
      setTimeout(()=> triggerThiefCloneChallenge(mon), 900);
      return;
    }
    if(!battleState.thiefTauntActive && Math.random() < 0.2){
      battleState.thiefTauntActive = true;
      const line = "¡A que no puedes darme!";
      logBattle(`🥷 ${mon.tpl.name}: "${line}"`);
      showThiefDialogue(`"${line}"`);
      triggerThiefDodgePose();
      updateBattleBars();
      disableMoves(false); renderMoveGrid();
      return;
    }
    if(!player.status && Math.random() < 0.28){
      const line = "¡Prueba mi Shuriken Venenoso!";
      logBattle(`🥷 ¡${mon.tpl.name} prepara su Shuriken Venenoso!`);
      showThiefDialogue(`"${line}"`, {variant:"charge"});
      triggerThiefAttackPose();
      const thiefSpdMod = battleState.monSlow ? (1-battleState.monSlow) : 1;
      setTimeout(()=>{
        const dmg = calcDamage(mon.atk*thiefSpdMod, effectiveDef(), 0.6, 0.08);
        player.hp = Math.max(0, player.hp - dmg);
        flashSprite("spritePlayer","purple");
        applyStatusEffect(player, "poison");
        logBattle(`☠️ ¡El shuriken te envenena! -${dmg} HP, y el veneno seguirá quitándote vida.`);
        maybeExtraEnemyTurn(mon, isExtraAttack);
      }, 700);
      return;
    }
  }
  // El Lobo Nocturno a veces se cura aullando a la luna en vez de atacar — más probable mientras menos vida le queda.
  if(mon.tpl.canSelfHeal && mon.curHp < mon.maxHp){
    const missingPct = 1 - (mon.curHp/mon.maxHp);
    if(Math.random() < 0.15 + missingPct*0.35){
      const healAmount = Math.round(mon.maxHp * (0.16 + Math.random()*0.12));
      mon.curHp = Math.min(mon.maxHp, mon.curHp + healAmount);
      cureBerserkerBleedOnEnemyRecovery(mon);
      logBattle(`🌙 ¡${mon.tpl.name} aúlla a la luna (Aullido Lunar) y recupera ${healAmount} HP!`);
      animateSprite("spriteEnemy","attacke");
      flashSprite("spriteEnemy","green");
      updateBattleBars();
      disableMoves(false); renderMoveGrid();
      return;
    }
  }
  const spdMod = battleState.monSlow ? (1-battleState.monSlow) : 1;
  let power = 0.9 + Math.random()*0.5;
  // Con poca vida, se enfurece y golpea mucho más fuerte.
  if(mon.tpl.enrageBelow && (mon.curHp/mon.maxHp) <= mon.tpl.enrageBelow){
    power *= (mon.tpl.enrageMult || 1.5);
  }
  const pet = battleState.summonedPets && battleState.summonedPets[0];
  const attacksPet = pet && pet.hp > 0 && Math.random() < 0.3; // 30% de que el enemigo se distraiga con tu mascota

  // Flecha Cegadora (Arquero, ver classes.js): el enemigo encandilado tiene una chance fija de
  // fallar CUALQUIER golpe que intente (jugador o mascota) — chequeo aparte del esquive por QTE de
  // más abajo (isStrongAttack), que depende de la destreza del jugador, no de este debuff.
  if(mon.missChance && Math.random() < mon.missChance){
    animateSprite("spriteEnemy","attacke");
    showBattlePopup("¡Falla!", "miss");
    logBattle(`✨ ¡${mon.tpl.name} sigue encandilado y falla su golpe!`);
    finishEnemyTurn();
    return;
  }

  if(attacksPet){
    animateSprite("spriteEnemy","attacke");
    if(Math.random() < (pet.dodgeChance||0.15)){
      logBattle(`${mon.tpl.name} ataca a tu mascota ${petDisplayName(pet)}... ¡pero la esquiva!`);
    } else {
      let dmg = calcDamage(mon.atk*spdMod, pet.def, power, 0.08);
      pet.hp = Math.max(0, pet.hp - dmg);
      const petEmojiEl = document.querySelector("#petStageSlot .pet-emoji");
      if(petEmojiEl){ petEmojiEl.classList.remove("hitshake"); void petEmojiEl.offsetWidth; petEmojiEl.classList.add("hitshake"); }
      logBattle(`${mon.tpl.name} ataca a tu mascota ${petDisplayName(pet)}: ${dmg} de daño.`);
      if(pet.hp <= 0){
        logBattle(`¡${petDisplayName(pet)} queda fuera de combate por este encuentro!`);
        battleState.summonedPets = battleState.summonedPets.filter(p=>p.id!==pet.id);
      }
    }
    renderPetStageSlot();
    maybeExtraEnemyTurn(mon, isExtraAttack);
  } else {
    // Golpes fuertes (power alto o enfurecido) dan chance de esquivarlos deslizando el dedo a tiempo.
    const isStrongAttack = power >= 1.25;
    // ...salvo los esbirros oscuros de la niebla del portal (Demonio/Sabueso Oscuro) de NOCHE: su
    // golpe fuerte llega sin aviso y no se puede esquivar, a menos que ya tengas el set completo
    // del Señor Oscuro puesto (mismo criterio de inmunidad que ya usa su maldición de jefe).
    const isDarkAuraEnemy = !!mon.tpl.dropsDarkEssence;
    const hasFullSenorOscuroSet = countEquippedSetPieces("senor_oscuro") >= (getDungeonDef("senor_oscuro")?.setPieces.length || 6);
    const undodgeableAtNight = isDarkAuraEnemy && isNightTime() && !hasFullSenorOscuroSet;
    // Pedido explícito: el Guerrero (y, con su propia barrera, el Mago) no esquiva del todo un
    // golpe fuerte con el gesto — lo BLOQUEA, y el daño que le habría hecho a la vida se descuenta
    // de su barra de defensa en vez de HP (ver resolveEnemyDirectAttack). Esa barra nunca se
    // recarga ni se cura durante el combate — una vez en 0, el gesto ya no sirve de nada y el golpe
    // fuerte vuelve a pegarle de lleno.
    const isBlockDefender = classHasDefendPose(player.classKey);
    const canBlock = !isBlockDefender || battleState.defenseBar > 0;
    if(isStrongAttack && !undodgeableAtNight && canBlock){
      triggerDodgeQTE(mon, (dodged)=>{
        const outcome = dodged ? (isBlockDefender ? "blocked" : "dodged") : "hit";
        resolveEnemyDirectAttack(mon, power, spdMod, outcome);
        maybeExtraEnemyTurn(mon, isExtraAttack);
      }, isBlockDefender);
    } else {
      if(isStrongAttack && undodgeableAtNight){
        logBattle(`🌙 ¡La oscuridad envuelve el golpe de ${mon.tpl.name} — no hay forma de esquivarlo esta noche!`);
      } else if(isStrongAttack && isBlockDefender && !canBlock){
        logBattle(`🛡️ Tu barra de defensa está agotada — ya no puedes bloquear golpes fuertes en este combate.`);
      }
      resolveEnemyDirectAttack(mon, power, spdMod, "hit");
      maybeExtraEnemyTurn(mon, isExtraAttack);
    }
  }
}

/** Aplica el golpe directo del enemigo contra el jugador — toda la lógica de daño/animaciones/
 *  mensajes que antes vivía directamente dentro de enemyTurn(). `outcome` es "dodged" (esquivado
 *  por completo, sin daño — cualquier clase sin pose de defensa propia), "blocked" (el jugador lo
 *  cubrió con su gesto de defensa: el daño se descuenta de su barra de defensa en vez de la vida) o
 *  "hit" (golpe normal, daño de siempre a la vida). */
function resolveEnemyDirectAttack(mon, power, spdMod, outcome){
  if(outcome === "dodged"){
    animateSprite("spriteEnemy","attacke");
    showBattlePopup("¡Esquivado!", "miss");
    logBattle(`💨 ¡Esquivaste el golpe de ${mon.tpl.name} deslizando a tiempo!`);
    return;
  }
  let dmg = calcDamage(mon.atk*spdMod, effectiveDef(), power, 0.08);
  if(outcome === "blocked"){
    // El daño que le habría hecho a la vida se descuenta de la barra de defensa en su lugar —
    // nunca se recarga ni se cura durante el combate (ver DEFENSE_BAR_PCT/startBattle). Pedido
    // explícito: bloquear "quedaba muy fuerte" (la barra aguantaba demasiado) — el golpe le hace
    // un 15% MÁS de daño a esta barra que el que le habría hecho a la vida, para que no dure tanto.
    const barDmg = Math.round(dmg * 1.15);
    battleState.defenseBar = Math.max(0, battleState.defenseBar - barDmg);
    const blockGesture = player.classKey === "mago" ? "la barrera mágica"
      : player.classKey === "berserker" ? "el filo de la espada"
      : player.classKey === "arquero" ? "el arco" : "el escudo";
    // Pedido explícito: que se note que el enemigo ataca de verdad y que el jugador lo bloquea —
    // primero el enemigo completa su lanzada normal, y recién cuando "llega" el golpe el jugador
    // levanta su gesto de defensa con un parpadeo morado (y el letrero "¡Bloqueado!"), sosteniendo
    // la pose bastante más tiempo (ver GUERRERO_DEFEND_HOLD_MS/MAGO_DEFEND_HOLD_MS/
    // BERSERKER_DEFEND_HOLD_MS/BLOCK_REACT_MS) — antes las dos cosas pasaban juntas y de golpe, y
    // se sentía como un parpadeo en vez de un bloqueo real.
    animateSprite("spriteEnemy","attacke");
    setTimeout(()=>{
      playPlayerDefendPose();
      flashSprite("spritePlayer","purple");
      showBattlePopup("¡Bloqueado!", "blocked");
    }, BLOCK_REACT_MS);
    logBattle(`🛡️ ¡Bloqueaste el golpe de ${mon.tpl.name} con ${blockGesture}! -${barDmg} en tu barra de defensa.`);
    if(battleState.defenseBar <= 0){
      logBattle(`⚠️ Tu barra de defensa se agotó — ya no podrás bloquear golpes fuertes en este combate.`);
    }
    return;
  }
  if(player.lowHpShield && !battleState.lowHpShieldUsed && (player.hp/player.maxHp) <= 0.3){
    const reduced = Math.round(dmg * (1-player.lowHpShield));
    logBattle(`🧣 ¡Tu capa te protege! Absorbe ${dmg-reduced} de daño.`);
    dmg = reduced;
    battleState.lowHpShieldUsed = true;
  }
  player.hp = Math.max(0, player.hp - dmg);
  animateSprite("spritePlayer","hitshake");
  animateSprite("spriteEnemy","attacke");
  flashSprite("spritePlayer","red");
  maybeShowCrit(dmg, player.maxHp);
  spawnFloatingNumber("spritePlayer", "-"+dmg, (dmg >= player.maxHp*0.5) ? "crit" : "damage");
  if(mon.tpl === THIEF_TEMPLATE) triggerThiefAttackPose();
  if(mon.tpl.name === "Lobo Umbrío") triggerLoboAttackPose();
  if(mon.tpl.name === "Cuervo Corrupto") triggerCuervoAttackPose();
  if(mon.tpl.name === "Demonio Menor") triggerDemonioAttackPose();
  if(mon.tpl.name === "Golem de Roca") triggerGolemAttackPose();
  if(mon.tpl.name === "Dragón Menor") triggerDragonAttackPose();
  if(mon.tpl.name === "Dragón Ancestral") triggerDragonAncestralAttackPose();
  if(mon.tpl.name === "Lobo Nocturno") triggerLoboNocturnoAttackPose();
  if(mon.tpl.name === "Slime Salvaje") triggerSlimeSalvajePose("attack", 700);
  if(mon.tpl.name === "Rata Mutante") triggerRataMutantePose("attack", 700);
  if(mon.tpl.name === "Espectro") triggerEspectroPose("attack", 700);
  if(mon.tpl.name === "Señor Oscuro") triggerSenorOscuroAttackPose(700);
  if(mon.tpl.name === "Demonio Oscuro") triggerAuraEnemyPose("demonio-oscuro", DEMONIO_OSCURO_SPRITES, 700);
  if(mon.tpl.name === "Sabueso Oscuro") triggerAuraEnemyPose("sabueso-oscuro", SABUESO_OSCURO_SPRITES, 700);
  logBattle(`${mon.tpl.name} ataca: ${dmg} de daño.`);
  if(mon.tpl.debuffOnHit && Math.random() < mon.tpl.debuffOnHit.chance){
    const d = mon.tpl.debuffOnHit;
    battleState.playerBuffs[d.stat] = Math.max(0.25, battleState.playerBuffs[d.stat]*(1-d.amount));
    const label = d.stat==="def"?"DEF":d.stat==="atk"?"ATQ":"VEL";
    logBattle(`¡${mon.tpl.name} debilita tu ${label}!`);
  }
}

/** Cierra el turno del enemigo: refresca barras, deja decaer buffs temporales, y (tras una pausa
 *  breve) revisa si perdiste o te vuelve a tocar elegir movimiento. */
function finishEnemyTurn(){
  // Shuriken Venenoso (Ladrón Errante): si el jugador quedó envenenado, se descuenta acá — una vez
  // por turno del enemigo, mismo criterio de cadencia que ya usa tickStatusEffect() para el estado
  // que el jugador le aplica A un enemigo con un proc de arma (ver rollWeaponProc/enemyTurn).
  tickStatusEffect(player, "spritePlayer");
  updateBattleBars(); refreshHud();
  if(battleState.playerBuffs.turnsAtk>0){ battleState.playerBuffs.turnsAtk--; if(battleState.playerBuffs.turnsAtk===0) battleState.playerBuffs.atk=1; }
  if(battleState.playerBuffs.turnsDef>0){ battleState.playerBuffs.turnsDef--; if(battleState.playerBuffs.turnsDef===0) battleState.playerBuffs.def=1; }
  setTimeout(()=>{
    if(player.hp<=0){ offerRevive(loseBattle); return; }
    disableMoves(false);
    renderMoveGrid();
  }, 650);
}

if(false){
const ULTIMATE_CHARGE_MS = 1300; // cuánto dura la "carga" dorada antes de que impacte el golpe definitivo
}

/** Aura dorada pulsante en quien va a lanzar su movimiento definitivo, antes de que golpee (se siente más pesado). */
function playUltimateChargeUp(elId){
  const el = document.getElementById(elId);
  if(!el) return;
  el.classList.add("ultimate-charging");
  clearTimeout(el._ultimateChargeTimer);
  el._ultimateChargeTimer = setTimeout(()=> el.classList.remove("ultimate-charging"), ULTIMATE_CHARGE_MS);
}
/** Igual, pero para el mini-sprite de un compañero en batalla de grupo. */
function playUltimateChargeUpAlly(memberId){
  const el = document.getElementById("allySprite-"+memberId);
  if(!el) return;
  const inner = el.querySelector(".am-sprite");
  if(!inner) return;
  inner.classList.add("ultimate-charging");
  clearTimeout(inner._ultimateChargeTimer);
  inner._ultimateChargeTimer = setTimeout(()=> inner.classList.remove("ultimate-charging"), ULTIMATE_CHARGE_MS);
}
/** Hace que la barra de maná se vea drenar más despacio, para acompañar el golpe definitivo. */
function slowDrainMp(barId){
  const bar = document.getElementById(barId);
  if(!bar) return;
  bar.classList.add("slow-drain");
  clearTimeout(bar._slowDrainTimer);
  bar._slowDrainTimer = setTimeout(()=> bar.classList.remove("slow-drain"), 2400);
}

function animateSprite(id, cls){
  const el = $(id);
  el.classList.remove("hitshake","attackp","attacke","ultimate-strike","ultimate-hit");
  void el.offsetWidth;
  el.classList.add(cls);
}

/** Número flotante ("-128", "+64"...) que sube y se desvanece sobre un sprite de combate — solo
 *  cableado por ahora en el combate 1v1 normal (jugador vs enemigo solo, ver resolveEnemyDirectAttack
 *  y el "revealHit" de la resolución de movimientos del jugador); no toca manada/PvP/grupo todavía.
 *  Se ancla al elemento SPRITE real (no al wrapper .perspective-anchor) y lo agrega como hijo de
 *  `.stage`, así funciona igual con o sin el sistema de perspectiva activo. */
function spawnFloatingNumber(spriteElId, text, kind){
  const spriteEl = document.getElementById(spriteElId);
  const stageEl = document.querySelector(".stage");
  if(!spriteEl || !stageEl) return;
  const spriteRect = spriteEl.getBoundingClientRect();
  const stageRect = stageEl.getBoundingClientRect();
  if(!spriteRect.width || !stageRect.width) return;
  const el = document.createElement("div");
  el.className = "floating-dmg-number floating-dmg-" + kind;
  el.textContent = text;
  const leftPct = ((spriteRect.left + spriteRect.width/2 - stageRect.left) / stageRect.width) * 100;
  const topPct = ((spriteRect.top - stageRect.top) / stageRect.height) * 100;
  el.style.left = leftPct + "%";
  el.style.top = topPct + "%";
  // desvío horizontal al azar para que golpes seguidos (multi-hit) no se apilen exactos uno sobre otro
  el.style.setProperty("--fdn-drift", (Math.random()*36-18).toFixed(1)+"px");
  stageEl.appendChild(el);
  el.addEventListener("animationend", ()=> el.remove());
  setTimeout(()=>{ if(el.parentNode) el.remove(); }, 1500); // red de seguridad si animationend no dispara
}

/** Parpadeo rojo (daño), verde (curación) o dorado-intenso (impacto del movimiento definitivo). */
function flashSprite(id, color){
  const el = $(id);
  if(!el) return;
  el.classList.remove("flash-red","flash-green","flash-ultimate","flash-orange","flash-purple","flash-white");
  void el.offsetWidth;
  const cls = color==="green" ? "flash-green" : color==="ultimate" ? "flash-ultimate"
    : color==="orange" ? "flash-orange" : color==="purple" ? "flash-purple" : color==="white" ? "flash-white" : "flash-red";
  el.classList.add(cls);
  clearTimeout(el._flashTimer);
  el._flashTimer = setTimeout(()=> el.classList.remove(cls), color==="ultimate" ? 950 : 600);
}
/** Igual, pero para un miembro específico de una manada en el escenario. */
function flashPackMon(idx, color){
  const el = document.getElementById("packStageMon"+idx);
  if(!el) return;
  el.classList.remove("flash-red","flash-green","flash-ultimate");
  void el.offsetWidth;
  const cls = color==="green" ? "flash-green" : color==="ultimate" ? "flash-ultimate" : "flash-red";
  el.classList.add(cls);
  clearTimeout(el._flashTimer);
  el._flashTimer = setTimeout(()=> el.classList.remove(cls), color==="ultimate" ? 950 : 600);
}
/** Si el golpe supera la mitad de la vida máxima del objetivo, muestra el aviso de golpe crítico. */
function maybeShowCrit(dmg, targetMaxHp){
  if(!targetMaxHp || dmg < targetMaxHp*0.5) return;
  const el = $("critPopup");
  if(!el) return;
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
}
/** Letrero dramático genérico — pedido explícito: "¡BLOQUEADO!" cuando el Guerrero cubre un golpe
 *  fuerte con el escudo, "¡ESQUIVADO!" cuando un ataque falla (en cualquier dirección: el jugador
 *  esquiva un golpe enemigo, o el enemigo esquiva el del jugador). `variant` es "blocked" o "miss"
 *  (ver .popup-blocked/.popup-miss en main.css). */
function showBattlePopup(text, variant){
  const el = $("battlePopup");
  if(!el) return;
  el.classList.remove("show","popup-blocked","popup-miss");
  el.textContent = text;
  void el.offsetWidth;
  el.classList.add("popup-"+variant, "show");
}

/* ---------- Resultado del combate ---------- */
/** Ganaste el reto por una torre: la capturas y te muestra un resultado simple, sin pasar por todo
 *  el sistema normal de botín (el rival de la torre es una construcción especial, no un monstruo real). */
function towerChallengeWon(towerId){
  clearTurnTimer();
  logBattle("¡Ganaste el control de la torre!");
  setTimeout(()=>{
    $("battleWrap").classList.add("hidden");
    $("resultEmoji").textContent = "🗼";
    $("resultTitle").textContent = "¡Torre conquistada!";
    $("resultSub").innerHTML = "La torre ahora es tuya.";
    $("resultOverlay").classList.remove("hidden");
    updateResultProgressVisibility(false);
    battleState = null;
    captureTower(towerId);
  }, 700);
}

/** Muestra (o esconde) el botón de duplicar la XP del combate recién ganado, gastando ORO (el
 *  costo es 1.5x el oro que ganaste en ese mismo combate) — se usa desde la pantalla de
 *  resultado de cualquier victoria normal. */
function setupXpBoostButton(xpGain, goldGain){
  const btn = $("btnBoostResultXp");
  if(!btn) return;
  const cost = Math.max(10, Math.round((goldGain||0)*1.5));
  if((player.gold||0) >= cost && xpGain > 0){
    btn.classList.remove("hidden");
    btn.textContent = `🪙${cost}: Duplicar la XP de este combate (+${xpGain})`;
    btn.onclick = ()=>{
      const beforeXp = player.xp, beforeXpNext = player.xpNext, beforeLevel = player.level;
      player.gold -= cost;
      player.xp += xpGain;
      checkLevelUps();
      refreshHud();
      saveGame();
      btn.classList.add("hidden");
      // La barra normal (azul/turquesa) se queda como estaba — el tramo extra pagado se anima
      // aparte, en dorado, creciendo desde donde se quedó la barra normal — así se ve claramente
      // cuánto de ese progreso vino de pagar y no del combate en sí.
      const bonusFill = $("resultCharXpBonusFill");
      if(bonusFill){
        const beforePct = pct(beforeXp, beforeXpNext);
        const afterPct = player.level > beforeLevel ? 100 : pct(player.xp, player.xpNext);
        bonusFill.style.transition = "none";
        bonusFill.style.left = beforePct+"%";
        bonusFill.style.width = "0%";
        void bonusFill.offsetWidth; // fuerza el reflow para que la transición de abajo sí anime desde 0
        bonusFill.style.transition = "width 1.1s cubic-bezier(.25,.9,.4,1), left 1.1s cubic-bezier(.25,.9,.4,1)";
        bonusFill.style.width = Math.max(0, afterPct-beforePct)+"%";
      }
      // el extra de XP queda visible en el propio resultado, resaltado en otro color — no solo
      // como un aviso que desaparece — para que se note claramente cuánto ganaste de más.
      const sub = $("resultSub");
      sub.innerHTML += ` <span style="color:var(--gold,#e8c468); font-weight:900;">+${xpGain} XP extra ✨</span>`;
      toast(`✨ +${xpGain} XP extra por ${cost} de oro.`);
    };
  } else {
    btn.classList.add("hidden");
  }
}
function winBattle(){
  if(battleState.isDungeon) return dungeonWinFloor();
  if(battleState.isColiseo) return coliseoWinRound();
  if(battleState.isTowerChallenge) return towerChallengeWon(battleState.isTowerChallenge);
  if(battleState.eventId) resolveWorldEventVictory(battleState.eventId);
  clearTurnTimer();
  const mon = battleState.mon;
  const overflowItems = []; // recompensas que no cupieron — se ofrece comprar espacio por todas al final
  logBattle(`¡Derrotaste a ${mon.tpl.name}!`);
  applyCombatWearToEquipment(mon);
  if(mon.marker){ map.removeLayer(mon.marker); monsters = monsters.filter(m=>m.id!==mon.id); }
  registerQuestKill(mon.tpl.name);
  gameEventBus.emit({ type: "ENEMY_DEFEATED", payload: { amount: 1, enemyName: mon.tpl.name, isThief: !!mon.isThief, isBoss: !!mon.isBoss, contractTargetTag: mon.contractTargetTag || undefined }, eventId: "win_enemy_"+mon.id });
  gameEventBus.emit({ type: "BATTLE_WON", payload: { amount: 1 }, eventId: "win_battle_"+mon.id });
  let crystalsFromFirstBoss = 0;
  if(mon.isBoss && !mon.isParkGuardian){
    const today = new Date().toISOString().slice(0,10); // "2026-07-11", solo la fecha
    if(player.lastBossCrystalDay !== today){
      crystalsFromFirstBoss = 5;
      player.crystals = (player.crystals||0) + crystalsFromFirstBoss;
      player.lastBossCrystalDay = today;
    }
  }

  const charBefore = {level:player.level, xp:player.xp, xpNext:player.xpNext};
  const rewardMult = mon.isBoss ? 4 : mon.isThief ? 2.5 : (mon.packBonus||1);
  const xpGain = Math.round((mon.level*17 + Math.random()*9) * rewardMult);
  const goldGain = Math.round((mon.level*5 + Math.random()*8) * rewardMult);
  player.xp += xpGain;
  player.gold += goldGain;
  gameEventBus.emit({ type: "GOLD_EARNED", payload: { amount: goldGain }, eventId: "win_gold_"+mon.id });
  // el Demonio Oscuro (ronda la niebla de un portal de mazmorra) suelta Esencia Oscura en vez de
  // — o además de — el oro normal: una moneda que NUNCA se gasta, solo se acumula, y entre más
  // tengas mejor tu suerte de rareza en el botín de la mazmorra (ver pickDungeonRarity).
  const darkEssenceGain = mon.tpl.dropsDarkEssence ? Math.round(3 + mon.level*0.5 + Math.random()*3) : 0;
  if(darkEssenceGain){ player.darkEssence = (player.darkEssence||0) + darkEssenceGain; }
  const petXpSummary = grantPetXpIfSummoned(Math.round(xpGain*0.4));
  const charAfter = simulateXpProgress(charBefore.level, charBefore.xp, charBefore.xpNext, xpGain);

  const lootMessages = [];
  const dropChance = (mon.isThief || mon.isBoss) ? 1 : 0.55;
  const dropCount = mon.isBoss ? 3 : mon.isThief ? 2 : 1;
  for(let i=0;i<dropCount;i++){
    if(Math.random() < dropChance){
      const item = rollLoot();
      if(item.type==="stat"){
        if(item.stat==="maxHp"){ player.maxHp += item.amount; player.hp += item.amount; }
        else player[item.stat] += item.amount;
        pushRewardItem({...item}, overflowItems);
        lootMessages.push(`${item.emoji} ${item.name} (${item.desc})`);
      } else {
        pushRewardItem({...item}, overflowItems);
        lootMessages.push(`${item.emoji} ${item.name}${item.type==='equip' ? ' (equipable)' : ''}`);
      }
    }
  }
  rollCraftMaterialDrops(mon.tpl.name).forEach(msg=> lootMessages.push(msg));
  const lootMsg = lootMessages.length ? "¡Obtienes: " + lootMessages.join(", ") + "!" : "";

  let bossItemMsg = "";
  let defeatedBossDropItem = null;
  let pendingParkWeapon = null, pendingCaptureCard = false;
  if(mon.isParkGuardian){
    if(!player.parkGuardianState) player.parkGuardianState = {};
    if(!player.parkGuardianState[mon.parkId]) player.parkGuardianState[mon.parkId] = { level: mon.level, defeatedAt: null };
    player.parkGuardianState[mon.parkId].defeatedAt = Date.now();
    player.parkGuardianState[mon.parkId].everDefeated = true;
    const already = (player.parkWeaponsObtained||[]).includes(mon.parkId);
    if(!already){
      const pItem = generateParkWeaponItem(mon.parkId, player.classKey);
      if(pItem){
        pushRewardItem(pItem, overflowItems);
        pendingParkWeapon = pItem; // solo se marca "obtenida" más abajo si de verdad quedó guardada
        bossItemMsg = `<br>🌳 ¡Arma exclusiva del parque! ${pItem.emoji} ${pItem.name} (${pItem.desc})`;
      }
      // los magos, además, se ganan un libro único con el hechizo temático de este guardián
      if(player.classKey === "mago"){
        const bookId = PARK_BOOK_MAP[mon.parkId];
        const book = bookId && BOSS_BOOK_TABLE.find(b=>b.id===bookId);
        if(book && !player.inventory.some(it=>it.id===book.id) && !(player.equipment.accessory||[]).some(it=>it&&it.id===book.id)){
          pushRewardItem({...book}, overflowItems);
          bossItemMsg += `<br>📓 ¡Libro único! ${book.emoji} ${book.name} — te enseña ${book.teachMove.name} mientras lo lleves puesto.`;
        }
      }
    }
    // ¿ya derrotaste a los guardianes de las 5 regiones? entonces te ganaste la Carta de Captura
    const allDefeated = NEIVA_PARKS.every(p=> player.parkGuardianState[p.id] && player.parkGuardianState[p.id].everDefeated);
    const alreadyHasCard = player.inventory.some(it=>it.id==="capture_card");
    if(allDefeated && !alreadyHasCard && !player.everGotCaptureCard){
      const cardItem = {id:"capture_card", name:"Carta de Captura", emoji:"🎴", type:"capture_card",
        desc:"Úsala en combate cuando el enemigo tenga poca vida para capturarlo como mascota.", tradeable:false};
      pushRewardItem(cardItem, overflowItems);
      pendingCaptureCard = cardItem;
      bossItemMsg += `<br>🎴 ¡Derrotaste a los guardianes de las 5 regiones! Obtienes la <b>Carta de Captura</b>.`;
    }
  } else if(mon.tpl.name === "Lobo Nocturno"){
    // encuentro rarísimo — el botín es garantizado, no al 35% como un jefe de región cualquiera
    const bItem = generateBossLootItem(mon.tpl.name, mon.level, player.classKey);
    if(bItem){
      pushRewardItem(bItem, overflowItems);
      bossItemMsg = `<br>🌙 ¡Has derrotado al Lobo Nocturno! Obtienes ${bItem.emoji} ${bItem.name} (${bItem.desc})`;
      defeatedBossDropItem = bItem;
    }
  } else if(mon.tpl.name === "Lobo Sombrío"){
    // recompensa fija por derrotarlo — un arma de plata legendaria según la clase, o el libro
    // de invocación del Lobo Umbrío para el mago, más un diamante.
    const rewardByClass = {
      guerrero: {id:"sw_reward_guerrero", name:"Colmillo de Lobo Plateado", emoji:"🗡️", type:"equip", slot:"weapon",
        classKey:"guerrero", rarity:"legendary", isBossLoot:true, bonuses:{atk: Math.round(10+mon.level*0.9), spd: 3}, value:900,
        desc:"Espada forjada con un colmillo del Lobo Sombrío — legendaria, exclusiva de guerreros."},
      arquero: {id:"sw_reward_arquero", name:"Arco Plateado del Cazador Sombrío", emoji:"🏹", type:"equip", slot:"weapon",
        classKey:"arquero", rarity:"legendary", isBossLoot:true, bonuses:{atk: Math.round(9+mon.level*0.85), spd: 4}, value:900,
        desc:"Arco tallado con plata lunar — legendario, exclusivo de arqueros."},
      berserker: {id:"sw_reward_berserker", name:"Hacha Plateada del Lobo", emoji:"🪓", type:"equip", slot:"weapon",
        classKey:"berserker", rarity:"legendary", isBossLoot:true, bonuses:{atk: Math.round(12+mon.level*1.0)}, value:900,
        desc:"Hacha pesada bañada en plata — legendaria, exclusiva de berserkers."},
    };
    let rewardItem;
    if(player.classKey === "mago"){
      rewardItem = {...BOSS_BOOK_TABLE.find(b=>b.id==="book_boss_lobo")};
    } else {
      rewardItem = rewardByClass[player.classKey] || rewardByClass.guerrero;
    }
    pushRewardItem(rewardItem, overflowItems);
    player.crystals = (player.crystals||0) + 1;
    bossItemMsg = `<br>🐺 ¡Derrotaste al Lobo Sombrío! Obtienes ${rewardItem.emoji} ${rewardItem.name} y 💎+1 diamante.`;
    defeatedBossDropItem = rewardItem;
  } else if(mon.isBoss && Math.random() < 0.35){
    const bItem = generateBossLootItem(mon.tpl.name, mon.level, player.classKey);
    if(bItem){
      pushRewardItem(bItem, overflowItems);
      bossItemMsg = `<br>👑 ¡Botín especial! ${bItem.emoji} ${bItem.name} (${bItem.desc})`;
      defeatedBossDropItem = bItem;
    }
  }
  if(mon.isBoss && !mon.isParkGuardian){
    releaseBossLock(mon);
    if(pubnub){
      pubnub.publish({channel: PN_ANNOUNCE_CHANNEL, storeInHistory:false, message:{
        type:'boss_defeated', playerName: player.name, bossName: mon.tpl.name,
        itemName: defeatedBossDropItem ? defeatedBossDropItem.name : null,
        itemEmoji: defeatedBossDropItem ? defeatedBossDropItem.emoji : ""
      }});
    }
  }
  let questItemMsg = "";
  let pendingQuestItem = null;
  if(mon.isQuestTarget && activeQuest && activeQuest.template.monsterName===mon.tpl.name && !activeQuest.itemObtained){
    const t = activeQuest.template;
    const qItem = {id:"quest_"+t.id+"_"+Date.now(), questId:t.id, name:t.itemName, emoji:t.itemEmoji, type:"quest",
      desc:`Ítem de misión para ${t.npcName} — no se puede vender ni intercambiar.`, tradeable:false};
    pushRewardItem(qItem, overflowItems);
    pendingQuestItem = qItem; // el progreso de la misión solo se confirma más abajo si de verdad quedó guardado
    questItemMsg = `<br>📜 ¡Conseguiste ${t.itemEmoji} ${t.itemName}! Entrégalo con el panel de misión.`;
  }
  // Si algo no cupo, se ofrece comprar el espacio que falta antes de darlo por perdido — recién
  // quedan sabiendo con certeza qué se guardó de verdad una vez se resuelve el modal.
  offerToBuySpaceForOverflow(overflowItems, ()=>{
    if(pendingParkWeapon && player.inventory.includes(pendingParkWeapon)){
      if(!player.parkWeaponsObtained) player.parkWeaponsObtained = [];
      player.parkWeaponsObtained.push(mon.parkId);
    }
    if(pendingCaptureCard && player.inventory.includes(pendingCaptureCard)) player.everGotCaptureCard = true;
    if(pendingQuestItem && player.inventory.includes(pendingQuestItem)){
      activeQuest.itemObtained = true;
      if(activeQuest.destMarker){ map.removeLayer(activeQuest.destMarker); activeQuest.destMarker=null; }
      if(activeQuest.routeCasing){ map.removeLayer(activeQuest.routeCasing); activeQuest.routeCasing=null; }
      if(activeQuest.routeLine){ map.removeLayer(activeQuest.routeLine); activeQuest.routeLine=null; }
      renderQuestTracker();
    } else if(pendingQuestItem){
      questItemMsg = `<br>📜 ¡Conseguiste ${pendingQuestItem.name}, pero no cupo y se perdió! Vuelve a intentarlo con el mismo enemigo.`;
    }
    const bonusTag = mon.isParkGuardian ? " 🌳 ¡guardián del parque derrotado!" : mon.isBoss ? " 👑 ¡jefe de zona derrotado!" : mon.isThief ? " 🥷 ¡botín de ladrón!" : (mon.packBonus>1 ? " 👥 ¡bono de manada!" : "");

    setTimeout(()=>{
      $("battleWrap").classList.add("hidden");
      $("resultEmoji").textContent = "🏆";
      $("resultTitle").textContent = "¡Victoria!" + bonusTag;
      $("resultSub").innerHTML = `+${xpGain} XP · +${goldGain} 💰${crystalsFromFirstBoss?` · 💎+${crystalsFromFirstBoss} (primer jefe del día)`:""}${darkEssenceGain?` · 🖤+${darkEssenceGain} Esencia Oscura`:""}${lootMsg? "<br>"+lootMsg : ""}${bossItemMsg}${questItemMsg}`;
      setupXpBoostButton(xpGain, goldGain);
      $("resultOverlay").classList.remove("hidden");
      animateResultProgress({
        char: {
          beforeLevel: charBefore.level, beforeXp: charBefore.xp, beforeXpNext: charBefore.xpNext,
          afterLevel: charAfter.level, afterXp: charAfter.xp, afterXpNext: charAfter.xpNext, gainedLevels: charAfter.gainedLevels
        },
        pet: petXpSummary
      });
      refreshHud();
      checkLevelUps();
      battleState = null;
      saveGame();
    }, 700);
  });
}

/** Cuesta cristales revivir en plena pelea (en vez de perder) — vuelves con toda tu vida y
 *  sigues combatiendo. Solo se puede usar UNA vez por combate, para que no se vuelva infinito. */
/* ============================================================
   ESTADOS PERSISTENTES (quemado / envenenado) — antes, el proc de un arma con "quema"/"envenena"
   solo sumaba un poco de daño extra al mismo golpe. Ahora deja al enemigo con el estado de verdad:
   pierde HP al empezar cada uno de sus turnos (con su propio destello de color), durante varios
   turnos, igual que en Pokémon — hasta que se le acaba o gana/pierde el combate.
   ============================================================ */
const STATUS_EFFECTS = {
  burn:   {label:"Quemado",     icon:"🔥", tickPct:0.07, turns:3, flashColor:"orange"},
  poison: {label:"Envenenado",  icon:"☠️", tickPct:0.05, turns:4, flashColor:"purple"},
  bleed:  {label:"Desangrado",  icon:"🩸", tickPct:0.06, turns:3, flashColor:"red"},
};
/** Aplica (o refresca la duración de) un estado sobre un enemigo — un enemigo solo puede tener
 *  un estado a la vez; el más reciente reemplaza al anterior. */
function applyStatusEffect(target, type){
  const eff = STATUS_EFFECTS[type];
  if(!eff || !target) return;
  target.status = {type, turnsLeft: eff.turns};
}
/** Descuenta el HP de este turno si el objetivo está quemado/envenenado, con su destello — y avisa
 *  si el estado se le acaba. Devuelve true si el objetivo murió por el estado (para no seguir con
 *  su turno de ataque normal). Sirve tanto para un enemigo (`mon`, HP en `curHp`) como para el
 *  jugador (HP en `hp` directamente) — ver el Shuriken Venenoso del Ladrón Errante, que envenena
 *  al JUGADOR en vez de al revés. */
function tickStatusEffect(target, spriteElId){
  if(!target || !target.status) return false;
  const eff = STATUS_EFFECTS[target.status.type];
  if(!eff) { target.status = null; return false; }
  const isPlayer = target === player;
  const curHp = isPlayer ? target.hp : target.curHp;
  const dmg = Math.max(1, Math.round(target.maxHp * eff.tickPct));
  const newHp = Math.max(0, curHp - dmg);
  if(isPlayer) target.hp = newHp; else target.curHp = newHp;
  flashSprite(spriteElId, eff.flashColor);
  if(isPlayer){
    logBattle(`${eff.icon} ¡Estás ${eff.label.toLowerCase()} y pierdes ${dmg} HP!`);
  } else {
    logBattle(`${eff.icon} ¡${target.tpl.name} está ${eff.label.toLowerCase()} y pierde ${dmg} HP!`);
  }
  target.status.turnsLeft--;
  if(target.status.turnsLeft <= 0){
    logBattle(isPlayer ? `Ya no estás ${eff.label.toLowerCase()}.` : `${target.tpl.name} ya no está ${eff.label.toLowerCase()}.`);
    target.status = null;
  }
  return newHp <= 0;
}
/** Texto cortito para mostrar junto al nombre del enemigo mientras esté quemado/envenenado. */
function statusBadgeHtml(target){
  if(!target || !target.status) return "";
  const eff = STATUS_EFFECTS[target.status.type];
  return eff ? ` <span title="${eff.label}">${eff.icon}</span>` : "";
}

/* ============================================================
   PASIVA DEL BERSERKER — "Desangrar" (pedido explícito, se desbloquea al Nv.45): mientras el
   Berserker siga atacando turno tras turno, el rival queda Desangrado (mismo estado persistente de
   arriba, mismo tick automático vía tickStatusEffect) — pero a diferencia de quemado/envenenado,
   que se apagan solos con el tiempo, el sangrado se REFRESCA a full duración en cada ataque, así que
   en la práctica nunca se acaba mientras el jugador siga atacando. Se corta en dos casos:
   1) el propio jugador deja de atacar (usa un grito/potenciarse/curarse en su lugar — ver
      executePlayerAction), 2) el rival se cura o se fortalece a sí mismo (ver enemyTurn).
   ============================================================ */
const BERSERKER_BLEED_UNLOCK_LEVEL = 45;

/** ¿El jugador tiene desbloqueada la pasiva Desangrar ahora mismo? */
function hasBerserkerBleedPassive(){
  return player.classKey === "berserker" && player.level >= BERSERKER_BLEED_UNLOCK_LEVEL;
}

/** Aplica o refresca el sangrado del enemigo — se llama cada vez que el Berserker (con la pasiva ya
 *  desbloqueada) usa un movimiento de ATAQUE de verdad, acierte o no (lo que mantiene el sangrado es
 *  seguir atacando, no necesariamente conectar el golpe). */
function refreshBerserkerBleed(mon){
  if(!hasBerserkerBleedPassive() || !mon || mon.curHp<=0) return;
  const alreadyBleeding = mon.status && mon.status.type === "bleed";
  applyStatusEffect(mon, "bleed");
  if(!alreadyBleeding) logBattle(`🩸 ¡Tu furia hace sangrar a ${mon.tpl.name}!`);
}

/** Corta el sangrado si el Berserker rompe la cadena de ataques (grito, potenciarse, curarse) —
 *  pedido explícito: "el sangrado solo seguirá si solo ataca constantemente". */
function breakBerserkerBleed(mon){
  if(!hasBerserkerBleedPassive() || !mon || !mon.status || mon.status.type !== "bleed") return;
  mon.status = null;
  logBattle(`🩸 Al dejar de atacar sin parar, ${mon.tpl.name} deja de sangrar.`);
}

/** Cura el sangrado si el enemigo se cura o se fortalece a sí mismo — pedido explícito. Ver
 *  enemyTurn (Aullido Lunar del Lobo Nocturno, aullido de luna llena del Lobo Sombrío). */
function cureBerserkerBleedOnEnemyRecovery(mon){
  if(!mon || !mon.status || mon.status.type !== "bleed") return;
  mon.status = null;
  logBattle(`🩸 ¡${mon.tpl.name} cierra la herida!`);
}

const REVIVE_CRYSTAL_COST = 5;
function offerRevive(onNotRevived){
  if(battleState && battleState.revivedOnce){ if(onNotRevived) onNotRevived(); return; }
  if((player.crystals||0) < REVIVE_CRYSTAL_COST){ if(onNotRevived) onNotRevived(); return; }
  showConfirm(`Te quedaste sin vida. ¿Usar ${REVIVE_CRYSTAL_COST} cristales para revivir con toda tu HP y seguir la pelea?`, ()=>{
    player.crystals -= REVIVE_CRYSTAL_COST;
    player.hp = player.maxHp;
    if(battleState) battleState.revivedOnce = true;
    refreshHud();
    saveGame();
    toast("💎 ¡Revivido! Sigue la pelea.");
  }, {icon:"💎", confirmLabel:"Revivir", onCancel: onNotRevived});
}
function loseBattle(){
  if(battleState.isDungeon) return dungeonLoseFloor();
  if(battleState.isColiseo) return coliseoLoseRun();
  if(battleState.eventId) resolveWorldEventLoss(battleState.eventId);
  clearTurnTimer();
  const mon = battleState.mon;
  const isShadowWolf = mon && mon.tpl && mon.tpl.name === "Lobo Sombrío";
  if(isShadowWolf){
    logBattle(`🐺 ${mon.tpl.name}: "Parece que aún no estás preparado."`);
    showShadowWolfDialogue(`"Parece que aún no estás preparado."`);
  } else {
    logBattle(`¡Has caído en combate!`);
  }
  player.hp = Math.round(player.maxHp*0.3);
  if(mon && mon.isBoss && !mon.isParkGuardian) releaseBossLock(mon);
  setTimeout(()=>{
    $("battleWrap").classList.add("hidden");
    $("resultEmoji").textContent = isShadowWolf ? "🐺" : "💀";
    $("resultTitle").textContent = isShadowWolf ? "Se aleja entre las sombras..." : "Derrota";
    $("resultSub").textContent = isShadowWolf
      ? `"Parece que aún no estás preparado." El Lobo Sombrío te deja con vida y se escabulle — despiertas debilitado, con 30% de tu HP.`
      : "Despiertas debilitado, con 30% de tu HP. ¡Recupera fuerzas y vuelve a intentarlo!";
    $("btnBoostResultXp").classList.add("hidden");
    $("resultOverlay").classList.remove("hidden");
    updateResultProgressVisibility(false);
    refreshHud();
    battleState = null;
    saveGame();
  }, isShadowWolf ? 1400 : 700);
}

let pendingColiseoContinuation = null; // {round} si el resultado que se está mostrando es de una ronda de Coliseo

$("btnResultClose").onclick = ()=> {
  $("resultOverlay").classList.add("hidden");
  updateResultProgressVisibility(false);
  if(pendingColiseoContinuation){
    const round = pendingColiseoContinuation.round;
    pendingColiseoContinuation = null;
    if(round % 10 === 0) openColiseoBuffPicker(()=> startColiseoRound());
    else startColiseoRound();
  }
};

/* ============================================================
   5a2. COLISEO — modo torre infinita sin GPS, ronda por ronda con dificultad
   creciente. Reutiliza el sistema de combate normal (startBattle/renderMoveGrid/
   enemyTurn/calcDamage) para no duplicar nada; solo cambia cómo se elige el
   enemigo, cómo se calculan sus stats, y qué pasa al ganar/perder cada ronda.
   ============================================================ */
const PN_COLISEO_CHANNEL = "ronda-gps-rpg-coliseo-lb-v1";
let coliseoRun = null; // {round, buffLog:[{stat,amount}], healPending} — null cuando no hay run activa

/** Devuelve (creando si hace falta) las estadísticas persistentes del Coliseo para este jugador. */
function getColiseoStats(){
  if(!player.coliseumStats){
    player.coliseumStats = {bestRound:0, lastRound:0, totalRuns:0, totalWins:0, totalLosses:0, updatedAt:null, everPublished:false};
  }
  return player.coliseumStats;
}

/** Función centralizada de escalado de dificultad del Coliseo: todo lo que dependa de
 *  "qué tan difícil es la ronda N" pasa por aquí, para que sea fácil de ajustar después. */
function coliseoDifficultyMultiplier(round, isBoss){
  const base = 1 + round*0.08;
  return isBoss ? base*1.5 : base;
}

function openColiseoScreen(){
  closeFabMenu();
  const stats = getColiseoStats();
  $("coliseoBestRound").textContent = stats.bestRound;
  $("coliseoLastRound").textContent = stats.lastRound;
  $("coliseoTotalRuns").textContent = stats.totalRuns;
  // Si ya jugaste antes pero tu marca nunca se subió al ranking compartido (por ejemplo, ninguna
  // run posterior volvió a superar tu mejor marca), la publica ahora — así cualquiera que haya
  // participado aparece en el ranking, sin tener que jugar una run nueva solo para que cuente.
  if(stats.totalRuns > 0 && !stats.everPublished){
    publishColiseoScore(stats.bestRound);
    stats.everPublished = true;
    saveGame();
  }
  $("coliseoOverlay").classList.remove("hidden");
  renderColiseoLeaderboard();
}

/** Publica tu mejor marca al ranking global compartido (si PubNub no responde, no pasa nada grave —
 *  tu progreso personal se guarda igual localmente). */
function publishColiseoScore(bestRound){
  if(!pubnub || !myPlayerId) return;
  pubnub.publish({
    channel: PN_COLISEO_CHANNEL,
    storeInHistory: true,
    message: {
      type:"coliseo_score", playerId: myPlayerId, playerName: player.name,
      playerLevel: player.level, bestRound, updatedAt: new Date().toISOString()
    }
  }).catch(e=> console.warn("[COLISEO] No se pudo publicar la marca al ranking global:", e));
}

/** Trae el ranking global (historial del canal compartido), se queda con la MEJOR marca de cada
 *  jugador, y muestra el top 10. Si no hay conexión, muestra un aviso sin romper la pantalla. */
function renderColiseoLeaderboard(){
  const box = $("coliseoLeaderboard");
  if(!pubnub){
    box.innerHTML = `<div class="empty-note">Conéctate al multijugador para ver el ranking global.</div>`;
    return;
  }
  box.innerHTML = `<div class="empty-note">Cargando ranking…</div>`;
  pubnub.fetchMessages({channels:[PN_COLISEO_CHANNEL], count:100}).then(res=>{
    const items = (res.channels && res.channels[PN_COLISEO_CHANNEL]) || [];
    const bestByPlayer = {};
    items.forEach(item=>{
      const m = item.message;
      if(!m || m.type!=="coliseo_score") return;
      const prev = bestByPlayer[m.playerId];
      if(!prev || m.bestRound > prev.bestRound) bestByPlayer[m.playerId] = m;
    });
    const ranked = Object.values(bestByPlayer).sort((a,b)=> b.bestRound - a.bestRound).slice(0,10);
    if(ranked.length===0){
      box.innerHTML = `<div class="empty-note">Nadie ha registrado marca todavía — ¡sé el primero!</div>`;
      return;
    }
    box.innerHTML = "";
    ranked.forEach((r, i)=>{
      const row = document.createElement("div");
      row.className = "coliseo-lb-row" + (r.playerId===myPlayerId ? " me" : "");
      row.innerHTML = `<div class="lb-pos">${i+1}</div>
        <div class="lb-name">${escapeHtml(r.playerName)} <span style="color:var(--dim); font-size:11px;">Nv.${r.playerLevel}</span></div>
        <div class="lb-round">Ronda ${r.bestRound}</div>`;
      box.appendChild(row);
    });
  }).catch(e=>{
    console.warn("[COLISEO] No se pudo recuperar el ranking global:", e);
    box.innerHTML = `<div class="empty-note">No se pudo cargar el ranking global en este momento. Si esto sigue pasando, puede que tu cuenta de PubNub necesite el complemento "Message Persistence" activado.</div>`;
  });
}

function startColiseoRun(){
  if(isBusyWithBattle()){ toast("Termina lo que estás haciendo antes de entrar al Coliseo."); return; }
  coliseoRun = {round:1, buffLog:[]};
  $("coliseoOverlay").classList.add("hidden");
  startColiseoRound();
}

/** Arma el enemigo de la ronda actual (nivel y stats según la fórmula del Coliseo) y arranca el
 *  combate reutilizando startBattle — el mismo sistema de combate de siempre. */
/** Arma la ronda actual del Coliseo:
 *  - Rondas 1 a 4: calentamiento, un solo enemigo POR DEBAJO de tu nivel (para entrar suave).
 *  - Ronda 5 en adelante: un enemigo a tu nivel, luego ANTES de subir de nivel aparece una
 *    manada de 2 enemigos a ese mismo nivel, y recién después de superarla sube el nivel 1 punto.
 *  - Cada 5 subidas de nivel aparece un jefe (en la ronda individual, no en la de manada). */
function startColiseoRound(){
  const round = coliseoRun.round;
  let level, isPackRound = false, isBoss = false;

  if(round <= 4){
    const belowBy = [4,3,2,1][round-1];
    level = Math.max(1, player.level - belowBy);
  } else {
    const tier = Math.floor((round-5)/2);
    isPackRound = (round-5) % 2 === 1;
    level = Math.max(1, player.level + tier);
    isBoss = !isPackRound && tier>0 && tier%5===0;
  }
  const pos = playerLatLng || {lat:0,lng:0};

  if(isPackRound){
    const packMons = [0,1].map(()=>{
      const tpl = MONSTER_TEMPLATES[Math.floor(Math.random()*MONSTER_TEMPLATES.length)];
      const mon = makeMonster(tpl, level, pos, {pack:true, special:true});
      if(mon.marker){ map.removeLayer(mon.marker); mon.marker = null; }
      return mon;
    });
    startPackBattle(packMons, {isColiseo:true});
    battleState.coliseoRound = round;
    battleState.coliseoIsBoss = false;
  } else {
    const pool = isBoss ? BOSS_TEMPLATES : MONSTER_TEMPLATES;
    const tpl = pool[Math.floor(Math.random()*pool.length)];
    // Capa 7 (Combat Power & Difficulty Director): en las rondas normales (no jefe fijo, no
    // manada) se sortea además una variante — élite/legendaria puede subir un poco el nivel ya
    // calculado arriba, como un "extra" sobre la curva de dificultad por ronda de siempre (que no
    // se toca). Nunca convierte al enemigo en una copia del jugador — ver docs/COMBAT_POWER.md.
    let difficultyTier = null;
    if(!isBoss){
      const { tier } = rollCombatPowerChallenge(tpl);
      if(tier.key === "elite" || tier.key === "legendary"){
        level += (tier.key === "elite" ? 2 : 5);
        difficultyTier = tier.key;
      }
    }
    const mon = makeMonster(tpl, level, pos, {boss:isBoss, special:true});
    if(mon.marker){ map.removeLayer(mon.marker); mon.marker = null; }
    mon.isColiseoBoss = isBoss;
    if(difficultyTier){
      mon.difficultyTier = difficultyTier;
      logBattle(`${difficultyTier === "legendary" ? "👑✨" : "⭐"} ¡Esta ronda trae una variante ${difficultyTier === "legendary" ? "legendaria" : "élite"}!`, true);
    }
    startBattle(mon, {isColiseo:true});
    battleState.coliseoRound = round;
    battleState.coliseoIsBoss = isBoss;
  }

  $("coliseoBattleHud").classList.remove("hidden");
  const label = isPackRound ? "🏟️👥 Ronda " : (isBoss ? "🏟️👑 Ronda " : "🏟️ Ronda ");
  $("coliseoBattleHud").textContent = `${label}${round} (Nv.${level})`;
  if(isBoss) logBattle("👑 ¡Un jefe del Coliseo aparece!", true);
  if(isPackRound) logBattle("👥 ¡Una manada de 2 enemigos te espera antes de subir de nivel!", true);
}

/** Aplica de forma temporal (solo dentro de esta run) el cambio de stat elegido, y lo anota
 *  para poder revertirlo exactamente al terminar la run. */
function coliseoApplyStatBuff(stat, amount){
  coliseoRun.buffLog.push({stat, amount});
  player[stat] = +((player[stat]||0) + amount).toFixed(2);
}
function coliseoRevertBuffs(){
  if(!coliseoRun) return;
  coliseoRun.buffLog.forEach(({stat, amount})=>{ player[stat] = +((player[stat]||0) - amount).toFixed(2); });
  coliseoRun.buffLog = [];
}

const COLISEO_BUFF_POOL = [
  {key:"atk",  label:"+15% Ataque",       desc:"Tu ataque físico sube un 15% por el resto de la run.",
    apply:()=> coliseoApplyStatBuff("atk", +(player.atk*0.15).toFixed(2))},
  {key:"def",  label:"+15% Defensa",      desc:"Tu defensa sube un 15% por el resto de la run.",
    apply:()=> coliseoApplyStatBuff("def", +(player.def*0.15).toFixed(2))},
  {key:"hp",   label:"+20% Vida máxima",  desc:"Tu HP máximo (y actual) sube un 20% por el resto de la run.",
    apply:()=>{ const amt = Math.round(player.maxHp*0.2); coliseoApplyStatBuff("maxHp", amt); player.hp += amt; }},
  {key:"spd",  label:"+10% Velocidad",    desc:"Tu velocidad sube un 10% por el resto de la run.",
    apply:()=> coliseoApplyStatBuff("spd", +(player.spd*0.10).toFixed(2))},
  {key:"crit", label:"+10% Crítico",      desc:"Tu probabilidad de golpe crítico sube 10 puntos por el resto de la run.",
    apply:()=> coliseoApplyStatBuff("critBonus", 0.10)},
  {key:"matk", label:"+10% Daño mágico",  desc:"Tu ataque mágico sube un 10% por el resto de la run.",
    apply:()=> coliseoApplyStatBuff("matk", +(player.matk*0.10).toFixed(2))},
  {key:"heal", label:"Recuperar 30% HP",  desc:"Recuperas de inmediato el 30% de tu HP máximo (no permanente).",
    apply:()=>{ player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp*0.3)); }},
];

function openColiseoBuffPicker(onDone){
  const choices = [...COLISEO_BUFF_POOL].sort(()=>Math.random()-0.5).slice(0,3);
  const box = $("coliseoBuffChoices");
  box.innerHTML = "";
  choices.forEach(buff=>{
    const card = document.createElement("button");
    card.className = "coliseo-buff-card";
    card.innerHTML = `<b>${buff.label}</b>${buff.desc}`;
    card.onclick = ()=>{
      buff.apply();
      $("coliseoBuffOverlay").classList.add("hidden");
      refreshHud();
      onDone();
    };
    box.appendChild(card);
  });
  $("coliseoBuffOverlay").classList.remove("hidden");
}

/** Se llama cuando ganas una ronda del Coliseo (en vez de la ganancia normal de combate). */
function coliseoWinRound(){
  clearTurnTimer();
  const round = battleState.coliseoRound;
  const isBoss = !!battleState.coliseoIsBoss;
  logBattle(`¡Superaste la ronda ${round} del Coliseo!`);

  let gold = Math.round(50 + round*15);
  let exp = Math.round(20 + round*10);
  let dropChance = 0.12;
  if(isBoss){ gold *= 2; exp *= 2; dropChance += 0.10; }
  player.gold += gold;
  player.xp += exp;
  checkLevelUps();

  let lootMsg = "";
  if(Math.random() < dropChance){
    const item = rollLoot();
    if(item.type==="stat"){
      if(item.stat==="maxHp"){ player.maxHp += item.amount; player.hp += item.amount; }
      else player[item.stat] += item.amount;
    }
    pushItemSafe({...item});
    lootMsg = `<br>¡Obtienes ${item.emoji} ${item.name}!`;
  }

  const stats = getColiseoStats();
  stats.lastRound = round;
  if(round > stats.bestRound) stats.bestRound = round;
  stats.updatedAt = new Date().toISOString();

  refreshHud(); saveGame();

  setTimeout(()=>{
    $("battleWrap").classList.add("hidden");
    $("resultEmoji").textContent = isBoss ? "👑" : "🏟️";
    $("resultTitle").textContent = `Ronda ${round} superada`;
    $("resultSub").innerHTML = `+${exp} XP · +${gold} 💰${lootMsg}`;
    $("resultOverlay").classList.remove("hidden");
    updateResultProgressVisibility(false);
    battleState = null;
    coliseoRun.round++;
    pendingColiseoContinuation = {round};
  }, 700);
}

/** Cierra la run actual (por derrota o por rendirse) y guarda todo lo que corresponda. */
function coliseoEndRun(byDefeat){
  const round = battleState ? battleState.coliseoRound : coliseoRun.round;
  coliseoRevertBuffs();
  const stats = getColiseoStats();
  stats.totalRuns++;
  if(byDefeat) stats.totalLosses++; else stats.totalWins++;
  stats.lastRound = Math.max(0, round-1);
  const isNewRecord = stats.lastRound > stats.bestRound;
  if(isNewRecord) stats.bestRound = stats.lastRound;
  // Se publica en cada marca nueva, y también la primera vez que terminas una run (sin importar
  // el puntaje) si todavía no habías aparecido nunca en el ranking compartido — así cualquiera
  // que participe queda registrado, no solo quien mejora su propia marca. Fuera de esos dos
  // casos no se publica en cada run para no inundar el canal compartido (el ranking solo consulta
  // los últimos 100 mensajes, y publicar de más empujaría marcas viejas fuera de esa ventana).
  if(isNewRecord || !stats.everPublished){
    publishColiseoScore(stats.bestRound);
    stats.everPublished = true;
  }
  stats.updatedAt = new Date().toISOString();
  coliseoRun = null;
  $("coliseoBattleHud").classList.add("hidden");
  refreshHud(); saveGame();

  $("battleWrap").classList.add("hidden");
  $("coliseoSummaryEmoji").textContent = byDefeat ? "💀" : "🏳️";
  $("coliseoSummaryTitle").textContent = byDefeat ? "¡Has caído en el Coliseo!" : "Te retiraste del Coliseo";
  $("coliseoSummarySub").textContent = `Llegaste a la ronda ${stats.lastRound}.` + (isNewRecord ? " ¡Nueva marca personal! 🎉" : ` (tu mejor marca sigue siendo la ronda ${stats.bestRound})`);
  $("coliseoSummaryOverlay").classList.remove("hidden");
}
function coliseoLoseRun(){
  clearTurnTimer();
  player.hp = Math.round(player.maxHp*0.3);
  coliseoEndRun(true);
}
function coliseoSurrender(){
  clearTurnTimer();
  coliseoEndRun(false);
}

/* ============================================================
   MAZMORRAS LEGENDARIAS — ciclo de la corrida (portal → pisos → jefe → set). Reusa el sistema
   de combate de siempre (startBattle/startPackBattle) tal cual hace el Coliseo, solo cambia
   cómo se arma cada piso y qué pasa al ganar/perder — ver los 4 puntos de rama en
   winBattle/loseBattle/packWinBattle/packLoseBattle. Los datos (mazo de eventos, piezas del
   set, bonos, Legado) viven en game/config/dungeons.js; acá solo el motor genérico, reusable
   para cualquier mazmorra futura sin tocar nada de esto.
   ============================================================ */

/** Progreso persistente del jugador en una mazmorra (piezas del set que ya tiene, con la
 *  MEJOR rareza obtenida de cada una; tier de bono de set alcanzado; si ya reclamó el Legado).
 *  Mismo patrón que getColiseoStats/parkGuardianState: crea si hace falta, nunca duplica. */
function getDungeonProgress(dungeonId){
  if(!player.dungeonProgress) player.dungeonProgress = {};
  if(!player.dungeonProgress[dungeonId]){
    player.dungeonProgress[dungeonId] = {piecesOwned:{}, setBonusTierReached:0, legacyClaimed:false, everDiscovered:false};
  }
  return player.dungeonProgress[dungeonId];
}

/** Arma la secuencia de habitaciones de TODA la corrida, piso por piso — cada piso de exploración
 *  repite el MISMO patrón fijo (dungeon.pisoRoomPattern, normalmente combate+élite+bonus), así
 *  cada piso garantiza al menos 2 combates reales antes de poder subir; solo la habitación "bonus"
 *  se sortea al azar (cofre o bendición, según los pesos de dungeon.floorDeck). El piso del jefe
 *  SIEMPRE va aparte, al final, nunca sale de acá. Se sortea una sola vez al empezar la corrida y
 *  se guarda ya elegida (player.activeDungeonRun.eventSequence): cerrar la app a mitad de camino
 *  no cambia qué te toca en cada habitación al volver. */
function rollDungeonFloorSequence(dungeon){
  const pattern = dungeon.pisoRoomPattern || ["combat"];
  const bonusPool = dungeon.floorDeck || [];
  const bonusWeight = bonusPool.reduce((s,e)=> s+e.weight, 0);
  const seq = [];
  while(seq.length < dungeon.floorCount){
    for(const type of pattern){
      if(seq.length >= dungeon.floorCount) break;
      if(type === "bonus" && bonusPool.length){
        let r = Math.random()*bonusWeight;
        const entry = bonusPool.find(e=>{ r -= e.weight; return r <= 0; }) || bonusPool[0];
        seq.push(entry.type);
      } else {
        seq.push(type);
      }
    }
  }
  return seq;
}

function startDungeonRun(portal){
  if(isBusyWithBattle()){ toast("Termina lo que estás haciendo antes de entrar a la mazmorra."); return; }
  const dungeon = getDungeonDef(portal.dungeonId);
  if(!dungeon) return;
  getDungeonProgress(dungeon.id).everDiscovered = true;
  player.activeDungeonRun = {
    dungeonId: dungeon.id, portalId: portal.id, floorIndex: 1,
    eventSequence: rollDungeonFloorSequence(dungeon), startedAt: Date.now(), buffLog: [],
  };
  saveGame();
  toast(`${dungeon.portalEmoji} Entras a ${dungeon.name}…`, 3200);
  startDungeonFloor();
}

/** Nivel del enemigo según el PISO (no la habitación individual) — cada piso da un salto claro de
 *  dificultad frente al anterior, en vez de una rampa suave habitación a habitación, para que
 *  subir de piso realmente se sienta más peligroso. El piso del jefe siempre es el pico, un
 *  escalón por encima de lo que dejó el último piso de exploración. */
function dungeonFloorMonsterLevel(dungeon, floorIndex){
  const loc = dungeonRoomLocation(dungeon, floorIndex);
  if(loc.isBossFloor) return Math.max(1, player.level + 2 + loc.totalPisos*2);
  return Math.max(1, player.level - 3 + loc.pisoNumber*2);
}

/** Traduce el contador plano de habitaciones (floorIndex, 1..floorCount + el piso del jefe) a la
 *  ubicación que se le muestra al jugador: cada `roomsPerFloor` habitaciones forman UN piso, y el
 *  jefe siempre vive solo en su propio piso final — así subir de piso se siente menos apresurado
 *  sin cambiar el total de encuentros de la corrida (mismo floorIndex de siempre por debajo). */
function dungeonRoomLocation(dungeon, floorIndex){
  const perFloor = dungeon.roomsPerFloor || 1;
  const totalPisos = Math.ceil(dungeon.floorCount / perFloor) + 1; // +1 = piso del jefe
  if(floorIndex > dungeon.floorCount){
    return {pisoNumber: totalPisos, totalPisos, roomInPiso: 1, roomsInThisPiso: 1, isBossFloor: true, isLastRoomOfPiso: true};
  }
  const pisoNumber = Math.ceil(floorIndex / perFloor);
  const roomInPiso = ((floorIndex-1) % perFloor) + 1;
  const roomsInThisPiso = Math.min(perFloor, dungeon.floorCount - (pisoNumber-1)*perFloor);
  return {pisoNumber, totalPisos, roomInPiso, roomsInThisPiso, isBossFloor: false, isLastRoomOfPiso: roomInPiso===roomsInThisPiso};
}

/** La maldición del Señor Oscuro: mientras dure su combate, drena un poco de HP cada segundo —
 *  real tiempo de reloj, no por turno, para que la pelea se sienta urgente incluso mientras
 *  piensas tu próximo movimiento. Llevar puesto su set completo (6/6) te protege: la maldición
 *  reconoce su propia regalia y no te hace daño. Se limpia en CUALQUIER salida del combate
 *  (victoria, derrota o huida) — ver dungeonWinFloor/dungeonLoseFloor/dungeonSurrender. */
let senorOscuroCurseInterval = null;
const SENOR_OSCURO_CURSE_PCT_PER_SEC = 0.012; // ~1.2% del HP máx. por segundo
function startSenorOscuroCurse(){
  clearSenorOscuroCurse();
  const dungeon = getDungeonDef("senor_oscuro");
  const immune = countEquippedSetPieces(dungeon.id) >= dungeon.setPieces.length;
  playSenorOscuroCurseFx(immune); // el Señor Oscuro "abre" la pelea con este ataque — se ve una vez, no como insignia fija
  logBattle(immune
    ? "🖤 Sientes la maldición del Señor Oscuro, pero su propio set te protege de ella."
    : "🖤 La sala se impregna de una maldición que drena tu HP mientras dure este combate.");
  senorOscuroCurseInterval = setInterval(()=>{
    if(!battleState || !battleState.isDungeon || !battleState.mon || battleState.mon.tpl.name !== "Señor Oscuro"){
      clearSenorOscuroCurse();
      return;
    }
    if(countEquippedSetPieces(dungeon.id) >= dungeon.setPieces.length) return; // protegido — puede haberse equipado a mitad de la pelea
    const dmg = Math.max(1, Math.round(player.maxHp * SENOR_OSCURO_CURSE_PCT_PER_SEC));
    player.hp = Math.max(1, player.hp - dmg); // nunca te derrota por sí sola — el golpe final siempre es del jefe
    updateBattleBars(); refreshHud();
    flashSprite("spritePlayer", "purple");
  }, 1000);
}
function clearSenorOscuroCurse(){
  if(senorOscuroCurseInterval){ clearInterval(senorOscuroCurseInterval); senorOscuroCurseInterval = null; }
}

/** Versión de la misma maldición, pero para cuando estás caminando por el MAPA dentro del radio de
 *  niebla oscura del portal (no en combate) — pedido explícito: "similar al ataque de llama
 *  infernal del Señor Oscuro", así que reusa el mismo % por segundo (SENOR_OSCURO_CURSE_PCT_PER_SEC).
 *  Se prende/apaga desde updateDungeonAuraAmbience() según entres o salgas del radio. Se pausa
 *  (sin apagarse del todo) mientras estés en CUALQUIER combate — ya sea el del propio Señor Oscuro
 *  (que tiene su propia maldición independiente, startSenorOscuroCurse) u otro cualquiera — para no
 *  drenarte HP por dos lados a la vez. Mismo criterio de inmunidad con el set completo, y el mismo
 *  piso de 1 HP: nunca te derrota por sí sola. */
let senorOscuroMapCurseInterval = null;
function startSenorOscuroMapCurse(){
  if(senorOscuroMapCurseInterval) return; // ya estaba corriendo
  const dungeon = getDungeonDef("senor_oscuro");
  if(!dungeon) return;
  if(countEquippedSetPieces(dungeon.id) < dungeon.setPieces.length){
    toast("🖤 Sientes la maldición del Señor Oscuro drenándote la vida mientras sigas cerca de su niebla...", 3600);
  }
  senorOscuroMapCurseInterval = setInterval(()=>{
    if(!isPlayerInDarkAura()){ clearSenorOscuroMapCurse(); return; }
    const inBattle = battleState || !$("battleWrap").classList.contains("hidden");
    if(inBattle) return; // pausada, no apagada — retoma sola apenas termine el combate, si seguís ahí adentro
    if(countEquippedSetPieces(dungeon.id) >= dungeon.setPieces.length) return; // protegido — puede haberse equipado recién
    if(player.hp <= 1) return; // ya está en el piso mínimo, no hace falta seguir tirando del HUD
    const dmg = Math.max(1, Math.round(player.maxHp * SENOR_OSCURO_CURSE_PCT_PER_SEC));
    player.hp = Math.max(1, player.hp - dmg); // nunca te derrota por sí sola, igual que en el combate del jefe
    refreshHud();
    flashHudHpDrain();
  }, 1000);
}
function clearSenorOscuroMapCurse(){
  if(senorOscuroMapCurseInterval){ clearInterval(senorOscuroMapCurseInterval); senorOscuroMapCurseInterval = null; }
}
/** Pulso rojo breve en la barra de vida del HUD del mapa, para que cada golpe de la maldición se
 *  sienta (no solo un número que baja calladito). */
function flashHudHpDrain(){
  const fill = $("hpFill");
  const wrap = fill && fill.parentElement;
  if(!wrap) return;
  wrap.classList.remove("hud-hp-drain-flash");
  void wrap.offsetWidth;
  wrap.classList.add("hud-hp-drain-flash");
}

/** Llamarada infernal que abre la pelea contra el Señor Oscuro — un efecto dramático de un solo
 *  golpe (no una insignia que quede pegada toda la pelea) que avisa que la maldición ya está
 *  activa y va a durar todo el enfrentamiento. Si el set completo te protege, se ve contenida por
 *  un resplandor verde en vez de rojo infernal. */
function playSenorOscuroCurseFx(immune){
  const el = $("senorOscuroCurseFx");
  if(!el) return;
  el.classList.remove("show", "curse-fx-immune");
  void el.offsetWidth;
  $("curseFxText").textContent = immune ? "🖤 ¡Maldición Infernal! — tu set te protege" : "🖤 ¡Maldición Infernal!";
  if(immune) el.classList.add("curse-fx-immune");
  el.classList.add("show");
}

function startDungeonFloor(){
  const run = player.activeDungeonRun;
  if(!run) return;
  const dungeon = getDungeonDef(run.dungeonId);
  if(!dungeon) return;
  const floorIndex = run.floorIndex;
  const isBossFloor = floorIndex > dungeon.floorCount;
  const pos = playerLatLng || {lat:0,lng:0};
  const loc = dungeonRoomLocation(dungeon, floorIndex);

  const hud = $("dungeonBattleHud");
  hud.classList.remove("hidden");
  hud.textContent = isBossFloor
    ? `${dungeon.portalEmoji} Piso ${loc.pisoNumber}/${loc.totalPisos} · 👑 Jefe final`
    : `${dungeon.portalEmoji} Piso ${loc.pisoNumber}/${loc.totalPisos} · Habitación ${loc.roomInPiso}/${loc.roomsInThisPiso}`;

  if(isBossFloor){
    const level = dungeonFloorMonsterLevel(dungeon, floorIndex);
    const bossTpl = DUNGEON_BOSS_TEMPLATES[dungeon.bossKey];
    const mon = makeMonster(bossTpl, level, pos, {boss:true, special:true});
    if(mon.marker){ map.removeLayer(mon.marker); mon.marker = null; }
    mon.isDungeonBoss = true;
    startBattle(mon, {isDungeon:true});
    battleState.dungeonFloor = floorIndex;
    logBattle(`👑 ¡${dungeon.name} — ${bossTpl.name} aparece!`, true);
    if(bossTpl.name === "Señor Oscuro") startSenorOscuroCurse();
    return;
  }

  const eventType = run.eventSequence[floorIndex-1];
  const level = dungeonFloorMonsterLevel(dungeon, floorIndex);
  if(eventType === "elite"){
    const packMons = [0,1].map(()=>{
      const tpl = MONSTER_TEMPLATES[Math.floor(Math.random()*MONSTER_TEMPLATES.length)];
      const mon = makeMonster(tpl, level, pos, {pack:true, special:true});
      if(mon.marker){ map.removeLayer(mon.marker); mon.marker = null; }
      return mon;
    });
    startPackBattle(packMons, {isDungeon:true});
    battleState.dungeonFloor = floorIndex;
    logBattle(`👥 ¡Una emboscada te espera en esta habitación!`, true);
  } else if(eventType === "combat"){
    const tpl = MONSTER_TEMPLATES[Math.floor(Math.random()*MONSTER_TEMPLATES.length)];
    const mon = makeMonster(tpl, level, pos, {special:true});
    if(mon.marker){ map.removeLayer(mon.marker); mon.marker = null; }
    startBattle(mon, {isDungeon:true});
    battleState.dungeonFloor = floorIndex;
  } else if(eventType === "chest"){
    dungeonResolveChestFloor();
  } else if(eventType === "blessing"){
    dungeonOpenBlessingPicker();
  }
}

/** Avanza el contador de habitación DE INMEDIATO al resolver una habitación (combate, cofre o
 *  bendición) — ANTES de mostrar cualquier pantalla de recompensa, no después de que el jugador
 *  toque "Continuar". Si no fuera así, cerrar la app justo al ganar (con el modal de recompensa
 *  todavía en pantalla) dejaría guardado el floorIndex de la habitación que YA ganaste — al
 *  volver, la repetirías de nuevo en vez de seguir a la siguiente (con el jefe esto se sentía
 *  como un bug grave: derrotarlo una y otra vez sin que la corrida terminara nunca). */
function dungeonAdvanceFloorIndex(justFinishedFloorIndex){
  const run = player.activeDungeonRun;
  if(!run) return;
  run.floorIndex = justFinishedFloorIndex + 1;
  saveGame();
}
/** Se llama después de tocar "Continuar" en la recompensa de una habitación (combate, cofre o
 *  bendición) — decide si la siguiente habitación sigue en el mismo piso (transición directa) o
 *  si hay que subir de piso primero (animación de escaleras). El floorIndex YA fue avanzado por
 *  dungeonAdvanceFloorIndex antes de este punto — acá solo se decide la transición visual. El
 *  jefe nunca llega acá: su victoria va directo a dungeonShowCompletionSummary. */
function dungeonProceedAfterRoom(justFinishedFloorIndex){
  const run = player.activeDungeonRun;
  if(!run) return;
  const dungeon = getDungeonDef(run.dungeonId);
  const loc = dungeonRoomLocation(dungeon, justFinishedFloorIndex);
  if(loc.isLastRoomOfPiso){
    const nextLoc = dungeonRoomLocation(dungeon, run.floorIndex);
    dungeonPlayStairsTransition(nextLoc.pisoNumber, nextLoc.totalPisos, ()=> startDungeonFloor());
  } else {
    startDungeonFloor();
  }
}

function dungeonResolveChestFloor(){
  const run = player.activeDungeonRun;
  const dungeon = getDungeonDef(run.dungeonId);
  const floorIndex = run.floorIndex;
  const gold = Math.round(40 + player.level*4);
  player.gold += gold;
  const items = [];
  const item = rollLoot();
  if(pushItemSafe({...item})) items.push(item);
  let wonPiece = null;
  if(Math.random() < DUNGEON_SET_PIECE_ROOM_CHANCE) wonPiece = rollDungeonSetPiece(dungeon);
  refreshHud();
  dungeonAdvanceFloorIndex(floorIndex);
  dungeonShowRoomReward({gold, exp:0, items, setPiece:wonPiece, title:"📦 ¡Encontraste un cofre!"},
    ()=> dungeonProceedAfterRoom(floorIndex));
}

/** Bendiciones de mazmorra: mismo patrón que COLISEO_BUFF_POOL/openColiseoBuffPicker (3
 *  opciones, efecto temporal solo por el resto de la corrida), con su propia lista chica —
 *  no hace falta compartir el pool con el Coliseo, son contextos distintos. */
const DUNGEON_BLESSING_POOL = [
  {key:"atk",  label:"+15% Ataque",        desc:"Tu ataque físico sube un 15% por el resto de la corrida.",
    apply:()=> dungeonApplyStatBuff("atk", +(player.atk*0.15).toFixed(2))},
  {key:"def",  label:"+15% Defensa",       desc:"Tu defensa sube un 15% por el resto de la corrida.",
    apply:()=> dungeonApplyStatBuff("def", +(player.def*0.15).toFixed(2))},
  {key:"matk", label:"+15% Daño mágico",   desc:"Tu ataque mágico sube un 15% por el resto de la corrida.",
    apply:()=> dungeonApplyStatBuff("matk", +(player.matk*0.15).toFixed(2))},
  {key:"heal", label:"Recuperar 40% HP",   desc:"Recuperas de inmediato el 40% de tu HP máximo.",
    apply:()=>{ player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp*0.4)); }},
];
function dungeonApplyStatBuff(stat, amount){
  const run = player.activeDungeonRun;
  run.buffLog = run.buffLog || [];
  run.buffLog.push({stat, amount});
  player[stat] = +((player[stat]||0) + amount).toFixed(2);
}
function dungeonRevertBuffs(run){
  (run.buffLog||[]).forEach(({stat, amount})=>{ player[stat] = +((player[stat]||0) - amount).toFixed(2); });
}
function dungeonOpenBlessingPicker(){
  const floorIndex = player.activeDungeonRun.floorIndex;
  const choices = [...DUNGEON_BLESSING_POOL].sort(()=>Math.random()-0.5).slice(0,3);
  const box = $("dungeonBlessingChoices");
  box.innerHTML = "";
  choices.forEach(b=>{
    const card = document.createElement("button");
    card.className = "coliseo-buff-card";
    card.innerHTML = `<b>${b.label}</b>${b.desc}`;
    card.onclick = ()=>{
      b.apply();
      $("dungeonBlessingOverlay").classList.add("hidden");
      refreshHud();
      dungeonAdvanceFloorIndex(floorIndex);
      dungeonProceedAfterRoom(floorIndex);
    };
    box.appendChild(card);
  });
  $("dungeonBlessingOverlay").classList.remove("hidden");
}

/** Rareza de una pieza de set recién ganada — pool propio (DUNGEON_LOOT_RARITY_WEIGHTS), no el
 *  de la tienda/cofres normales (inclinado hacia "común"): una mazmorra siempre da algo bueno. */
/** Cuánto empuja la Esencia Oscura ACUMULADA (nunca se gasta) la suerte de rareza del botín de
 *  la mazmorra — raíz cuadrada para que tenga rendimientos decrecientes (las primeras piezas de
 *  esencia se notan más que las últimas) y un tope (40 puntos de peso) para que nunca se acerque
 *  a garantizar legendario. Alcance intencional: SOLO la rareza de las piezas de set de mazmorra
 *  (ver rollDungeonSetPiece) — el resto del botín del juego (combate normal, cofres del mundo)
 *  no se ve afectado por esta moneda.
 */
function dungeonLuckBoostFromDarkEssence(){
  const essence = player.darkEssence || 0;
  return Math.min(40, Math.sqrt(essence) * 1.5);
}
function pickDungeonRarity(){
  const luckBoost = dungeonLuckBoostFromDarkEssence();
  const weights = {
    rare: Math.max(5, DUNGEON_LOOT_RARITY_WEIGHTS.rare - luckBoost),
    epic: DUNGEON_LOOT_RARITY_WEIGHTS.epic + luckBoost*0.6,
    legendary: DUNGEON_LOOT_RARITY_WEIGHTS.legendary + luckBoost*0.4,
  };
  const total = Object.values(weights).reduce((s,w)=>s+w, 0);
  let r = Math.random()*total;
  for(const [key,weight] of Object.entries(weights)){
    r -= weight;
    if(r<=0) return key;
  }
  return "rare";
}
/** Probabilidad de pieza de set por cada habitación de combate/élite/cofre "rolleable" (bendición
 *  nunca rueda). Con 9 pisos × 2 combates garantizados + ~5 cofres esperados, da un promedio de
 *  ~2-3 piezas por corrida completa (contando la garantizada del jefe) — más que la mazmorra corta
 *  original (4 habitaciones), acorde a lo mucho más larga que es ahora, pero sin regalar el set
 *  completo (6 piezas) en una sola corrida. */
const DUNGEON_SET_PIECE_ROOM_CHANCE = 0.06;
/** Elige una pieza del set — ponderada para favorecer las que el jugador NO tiene todavía (así
 *  casi nunca repite mientras le falten otras). Escala sus bonuses por rareza (mismo
 *  multiplicador que RARITY_TIERS, reusado tal cual) y por nivel del jugador, EN EL MOMENTO DEL
 *  DROP — nunca se pre-generan las combinaciones como pushEquip() sí hace para el equipo
 *  normal, eso explotaría rápido con varias mazmorras. Guarda la MEJOR rareza obtenida de cada
 *  pieza en el progreso, y entrega el objeto al inventario. */
function rollDungeonSetPiece(dungeon){
  const progress = getDungeonProgress(dungeon.id);
  const missing = dungeon.setPieces.filter(p=> !progress.piecesOwned[p.id]);
  const pool = missing.length ? missing : dungeon.setPieces;
  const base = pool[Math.floor(Math.random()*pool.length)];
  const rarityKey = pickDungeonRarity();
  const rarity = RARITY_BY_KEY[rarityKey];
  const levelMult = 1 + (player.level||1)*0.12;
  const bonuses = scaleBonuses(base.bonuses, rarity.mult*levelMult);
  const item = {
    id: base.id+"_"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),
    baseId: base.id, setId: dungeon.id, name: base.name, emoji: base.emoji,
    type:"equip", slot: base.slot, classKey:null, rarity: rarityKey,
    bonuses, value: Math.round(60*rarity.priceMult),
    desc: bonusDesc(bonuses) + ` · Set: ${dungeon.name}`,
  };
  const prevRarity = progress.piecesOwned[base.id];
  const prevMult = prevRarity ? (RARITY_BY_KEY[prevRarity]||{}).mult||0 : 0;
  if(rarity.mult > prevMult) progress.piecesOwned[base.id] = rarityKey;
  // no vive en ninguna tabla fija (se genera al vuelo, distinto en cada drop) — se registra acá
  // igual que las armas únicas de jefe (bossLootRegistry), así findItemById() lo puede resolver
  // por id después de guardar/cargar la partida (equipmentIds/inventoryIds solo guardan el id).
  bossLootRegistry[item.id] = item;
  pushItemSafe(item);
  return item;
}

/** Cuenta ascendente animada (no un salto instantáneo) para que el oro ganado se "sienta" —
 *  mismo criterio visual que cualquier revelado de recompensa en un juego con más producción. */
function animateGoldNumber(el, target){
  const startTime = performance.now();
  const duration = 650;
  function tick(now){
    const p = Math.min(1, (now-startTime)/duration);
    el.textContent = Math.round(target*p);
    if(p<1) requestAnimationFrame(tick);
  }
  if(target<=0){ el.textContent = "0"; return; }
  requestAnimationFrame(tick);
}

/** Modal único de recompensa de habitación — cofre + oro (cuenta animada) + objetos normales +
 *  (si salió) la pieza de set, todo junto en un solo momento claro de "esto ganaste acá",
 *  reemplaza el texto genérico que antes mostraba el resultOverlay compartido con el combate
 *  normal y el revelado de pieza que antes era una pantalla aparte. */
function dungeonShowRoomReward({gold, exp, items, setPiece, title}, onContinue){
  $("dungeonRewardTitle").textContent = title;
  $("dungeonRewardXp").textContent = exp ? `+${exp} XP` : "";
  const chest = $("dungeonRewardChestIcon");
  chest.classList.remove("dungeon-chest-pop");
  void chest.offsetWidth; // reinicia la animación aunque se muestre dos veces seguidas
  chest.classList.add("dungeon-chest-pop");
  animateGoldNumber($("dungeonRewardGoldCount"), gold||0);

  const box = $("dungeonRewardItems");
  box.innerHTML = "";
  let delayMs = 100;
  (items||[]).forEach(it=>{
    const card = document.createElement("div");
    card.className = "reward-item-card";
    card.style.animationDelay = `${delayMs}ms`;
    card.innerHTML = `<div class="ric-icon">${it.emoji}</div><div class="ric-name">${it.name}</div>`;
    box.appendChild(card);
    delayMs += 130;
  });
  if(setPiece){
    const dungeon = getDungeonDef(setPiece.setId);
    const progress = getDungeonProgress(setPiece.setId);
    const ownedCount = Object.keys(progress.piecesOwned).length;
    const color = (RARITY_BY_KEY[setPiece.rarity]||{}).color || "#9d3fff";
    const card = document.createElement("div");
    card.className = "reward-item-card reward-item-set-piece";
    card.style.animationDelay = `${delayMs}ms`;
    card.style.borderColor = color;
    card.innerHTML = `<div class="ric-icon">${setPiece.emoji}</div><div class="ric-name">${setPiece.name}</div>
      <div class="ric-rarity" style="color:${color}">${rarityLabel(setPiece.rarity)}</div>
      <div class="ric-set-progress">Set ${ownedCount}/${dungeon.setPieces.length}</div>`;
    box.appendChild(card);
  }
  $("dungeonRoomRewardOverlay").classList.remove("hidden");
  $("btnDungeonRewardContinue").onclick = ()=>{
    $("dungeonRoomRewardOverlay").classList.add("hidden");
    if(onContinue) onContinue();
  };
}

/** Transición corta entre pisos: el personaje sube corriendo unas escaleras antes de que
 *  aparezca la siguiente habitación — SOLO se dispara al terminar la última habitación de un
 *  piso (ver dungeonProceedAfterRoom), nunca entre habitaciones del mismo piso, para que sea un
 *  momento que marque "subiste de nivel en la mazmorra" y no una pausa repetitiva. */
function dungeonPlayStairsTransition(nextPisoNumber, totalPisos, onDone){
  const img = $("dungeonStairsCharacterImg");
  const walkSet = (CLASS_WALK_SPRITES[player.classKey]||{})[player.gender === "f" ? "f" : "m"];
  const src = walkSet && walkSet.up;
  if(src){ img.src = src; img.classList.remove("hidden"); } else img.classList.add("hidden");
  $("dungeonStairsLabel").textContent = `⬆️ Subiendo al piso ${nextPisoNumber}/${totalPisos}…`;
  $("dungeonStairsOverlay").classList.remove("hidden");
  setTimeout(()=>{
    $("dungeonStairsOverlay").classList.add("hidden");
    if(onDone) onDone();
  }, 1800);
}

/** Se llama cuando ganas una habitación de combate (normal, élite o el jefe) — en vez de la
 *  ganancia normal de combate, mismo patrón que coliseoWinRound. */
function dungeonWinFloor(){
  clearTurnTimer();
  clearSenorOscuroCurse();
  const run = player.activeDungeonRun;
  const dungeon = getDungeonDef(run.dungeonId);
  const floorIndex = battleState.dungeonFloor;
  const isBossFloor = floorIndex > dungeon.floorCount;
  logBattle(isBossFloor ? `¡Derrotaste a ${dungeon.name}!` : `¡Superaste esta habitación!`);
  gameEventBus.emit({ type: "DUNGEON_BATTLE_WON", payload: { amount: 1, isBossFloor }, eventId: "dungeon_floor_"+run.dungeonId+"_"+floorIndex+"_"+Date.now() });
  if(isBossFloor) gameEventBus.emit({ type: "DUNGEON_COMPLETED", payload: { amount: 1 }, eventId: "dungeon_completed_"+run.dungeonId+"_"+Date.now() });

  const gold = Math.round(40 + floorIndex*20);
  const exp = Math.round(25 + floorIndex*15);
  player.gold += gold;
  player.xp += exp;
  checkLevelUps();

  // mismo criterio de probabilidad de botín que el combate normal (dropChance ~55%, jefe garantizado
  // y con más de un objeto) — antes una habitación de combate en la mazmorra NUNCA soltaba objetos
  // normales, solo oro/xp/pieza de set, lo cual se sentía vacío comparado con pelear afuera.
  const items = [];
  const dropCount = isBossFloor ? 3 : 1;
  for(let i=0;i<dropCount;i++){
    if(isBossFloor || Math.random() < 0.55){
      const it = rollLoot();
      if(pushItemSafe({...it})) items.push(it);
    }
  }

  // el piso del jefe garantiza una pieza; las demás habitaciones de combate, DUNGEON_SET_PIECE_ROOM_CHANCE.
  let wonPiece = null;
  if(isBossFloor) wonPiece = rollDungeonSetPiece(dungeon);
  else if(Math.random() < DUNGEON_SET_PIECE_ROOM_CHANCE) wonPiece = rollDungeonSetPiece(dungeon);

  // el estado de la corrida se cierra/avanza YA, antes de mostrar la recompensa — no cuando el
  // jugador toque "Continuar". Si al jefe lo dejáramos "vivo" en el guardado hasta ese clic,
  // cerrar la app justo después de ganarle (con el modal todavía en pantalla) te hacía volver a
  // pelearlo desde cero al reabrir, una y otra vez, sin que la corrida terminara nunca.
  if(isBossFloor){
    player.dungeonPortalCooldowns = player.dungeonPortalCooldowns || {};
    player.dungeonPortalCooldowns[run.portalId] = Date.now() + dungeon.cooldownMs;
    dungeonClearRunState(run);
  } else {
    dungeonAdvanceFloorIndex(floorIndex);
  }
  refreshHud(); saveGame();

  setTimeout(()=>{
    $("battleWrap").classList.add("hidden");
    battleState = null;
    dungeonShowRoomReward({
      gold, exp, items, setPiece: wonPiece,
      title: isBossFloor ? `${dungeon.portalEmoji} ¡Derrotaste a ${dungeon.name}!` : "⚔️ ¡Habitación superada!",
    }, ()=>{
      if(isBossFloor) dungeonShowCompletionSummary(dungeon);
      else dungeonProceedAfterRoom(floorIndex);
    });
  }, 700);
}

/** Limpia el estado de la corrida (reversa buffs temporales, borra activeDungeonRun, esconde el
 *  HUD) — se llama SIEMPRE al salir del combate del jefe o de la corrida, ganes o pierdas. El
 *  cooldown del portal es aparte (ver dungeonWinFloor, rama del jefe): solo se aplica si de
 *  verdad venciste la mazmorra — no tiene sentido castigar con una hora de espera a quien recién
 *  la está aprendiendo y cayó en la habitación 2. */
function dungeonClearRunState(run){
  dungeonRevertBuffs(run);
  player.activeDungeonRun = null;
  $("dungeonBattleHud").classList.add("hidden");
}
function dungeonEndRun(byDefeat){
  const run = player.activeDungeonRun;
  if(!run) return;
  const dungeon = getDungeonDef(run.dungeonId);
  const floor = battleState ? battleState.dungeonFloor : run.floorIndex;
  const loc = dungeonRoomLocation(dungeon, floor);
  dungeonClearRunState(run);
  battleState = null; // si no, isBusyWithBattle() sigue viendo un combate "en curso" y bloquea reintentar
  refreshHud(); saveGame();

  $("battleWrap").classList.add("hidden");
  $("dungeonSummaryEmoji").textContent = byDefeat ? "💀" : "🏳️";
  $("dungeonSummaryTitle").textContent = byDefeat ? "¡Has caído en la mazmorra!" : "Te retiraste de la mazmorra";
  $("dungeonSummarySub").textContent = (loc.isBossFloor
    ? `Llegaste hasta el jefe final (piso ${loc.pisoNumber}/${loc.totalPisos}).`
    : `Llegaste al piso ${loc.pisoNumber}/${loc.totalPisos} (habitación ${loc.roomInPiso}/${loc.roomsInThisPiso}).`)
    + " El portal no entra en espera — puedes volver a intentarlo cuando quieras.";
  $("dungeonSummaryOverlay").classList.remove("hidden");
}
function dungeonLoseFloor(){
  clearTurnTimer();
  clearSenorOscuroCurse();
  player.hp = Math.round(player.maxHp*0.3);
  dungeonEndRun(true);
}
function dungeonSurrender(){
  clearTurnTimer();
  clearSenorOscuroCurse();
  dungeonEndRun(false);
}
/** Venciste al jefe final — solo la pantalla de resumen; el cooldown y el cierre del estado de
 *  la corrida ya pasaron antes, en dungeonWinFloor (ver comentario ahí), no acá. */
function dungeonShowCompletionSummary(dungeon){
  $("dungeonSummaryEmoji").textContent = "🏆";
  $("dungeonSummaryTitle").textContent = `¡${dungeon.name} completada!`;
  $("dungeonSummarySub").textContent = `Superaste todos los pisos y al jefe final.`;
  $("dungeonSummaryOverlay").classList.remove("hidden");
}
$("btnDungeonSummaryClose").onclick = ()=> $("dungeonSummaryOverlay").classList.add("hidden");

/* ============================================================
   MAZMORRAS LEGENDARIAS — bonos de set, Legado y Codex de Colecciones.
   ============================================================ */

/** Cuántas piezas de un set (dungeon.id) el jugador tiene EQUIPADAS ahora mismo — el bono de
 *  set y el Legado dependen de lo puesto, no de lo que tengas guardado en el inventario. */
function countEquippedSetPieces(dungeonId){
  const slots = ["weapon","offhand","armor","helmet","boots"];
  let count = 0;
  slots.forEach(s=>{ const it = player.equipment[s]; if(it && it.setId===dungeonId) count++; });
  (player.equipment.accessory||[]).forEach(it=>{ if(it && it.setId===dungeonId) count++; });
  return count;
}

/** Si el jugador lleva puesto el set completo de alguna mazmorra ahora mismo, el nombre de la
 *  clase de aura a mostrar en el HUD (efecto cosmético en vivo — a diferencia del marco del
 *  Legado, desaparece si te quitas alguna pieza). */
function activeDungeonAuraClass(){
  for(const dungeon of DUNGEON_REGISTRY){
    if(countEquippedSetPieces(dungeon.id) >= dungeon.setPieces.length){
      const tier = dungeon.setBonusTiers.find(t=> t.auraClass);
      if(tier) return tier.auraClass;
    }
  }
  return null;
}
/** Igual que activeDungeonAuraClass(), pero para la versión de esta aura que se ve en el propio
 *  marcador del mapa (llama oscura alrededor del personaje) — clase separada porque el look que
 *  funciona sobre un ícono chico del HUD (un anillo pulsante) no es el mismo que se ve bien sobre
 *  el sprite grande del personaje en el mapa. */
function activeDungeonMapAuraClass(){
  for(const dungeon of DUNGEON_REGISTRY){
    if(countEquippedSetPieces(dungeon.id) >= dungeon.setPieces.length){
      const tier = dungeon.setBonusTiers.find(t=> t.mapAuraClass);
      if(tier) return tier.mapAuraClass;
    }
  }
  return null;
}
/** Refleja la clase de aura oscura (si corresponde) en el marcador del jugador en el mapa — se
 *  llama junto con refreshHud() para que quede sincronizada apenas se equipa/desequipa la última
 *  pieza del set, sin esperar a que se vuelva a dibujar el marcador desde cero. */
function updateMeMarkerAura(){
  if(!meMarker) return;
  const el = meMarker.getElement();
  if(!el) return;
  const wrap = el.querySelector(".me-marker-wrap");
  if(!wrap) return;
  const auraClass = activeDungeonMapAuraClass();
  wrap.classList.forEach(c=>{ if(c.startsWith("me-marker-aura-")) wrap.classList.remove(c); });
  if(auraClass) wrap.classList.add(auraClass);
}

/** Aplica/quita por delta los bonos de umbral (2/4 piezas) de TODOS los sets de mazmorra —
 *  mismo patrón que syncDamagedPenalty (nunca recalcula todo desde cero, solo la diferencia
 *  contra lo que ya estaba aplicado). Se llama al final de equipItem/unequipSlot para
 *  cualquier pieza, así detecta tanto ganar un tier como perderlo al desequipar. Al llegar al
 *  tier del set completo por primera vez, reclama el Legado automáticamente. */
function syncDungeonSetBonuses(){
  DUNGEON_REGISTRY.forEach(dungeon=>{
    const progress = getDungeonProgress(dungeon.id);
    const equippedCount = countEquippedSetPieces(dungeon.id);
    const prevApplied = progress.appliedTierCounts || [];
    const statTiers = dungeon.setBonusTiers.filter(t=> t.bonuses);
    const target = statTiers.filter(t=> equippedCount >= t.count).map(t=> t.count);
    prevApplied.filter(c=> !target.includes(c)).forEach(c=>{
      const tier = statTiers.find(t=> t.count===c);
      if(tier) unapplyBonuses(tier.bonuses);
    });
    target.filter(c=> !prevApplied.includes(c)).forEach(c=>{
      const tier = statTiers.find(t=> t.count===c);
      if(tier) applyBonuses(tier.bonuses);
    });
    progress.appliedTierCounts = target;

    const fullTier = dungeon.setBonusTiers.find(t=> t.count === dungeon.setPieces.length);
    if(fullTier && equippedCount >= fullTier.count && !progress.legacyClaimed) claimDungeonLegacy(dungeon.id);
  });
}

/** Se llama UNA sola vez, la primera vez que completas el set (6/6 equipadas): auto-equipa el
 *  título y el marco de perfil del Legado (no hay pantalla de "elegir cuál llevar puesto" —
 *  con una sola mazmorra piloto no aporta, ver decisiones de alcance) y queda reclamado para
 *  siempre, incluso si luego te quitas el set (a diferencia del aura, que sí depende de
 *  llevarlo puesto — ver activeDungeonAuraClass). */
function claimDungeonLegacy(dungeonId){
  const dungeon = getDungeonDef(dungeonId);
  const progress = getDungeonProgress(dungeonId);
  if(!dungeon || progress.legacyClaimed) return;
  progress.legacyClaimed = true;
  player.activeTitle = dungeon.legacy.title;
  player.activeFrameClass = dungeon.legacy.frameClass;
  refreshHud();
  toast(`🏆 ¡Legado desbloqueado: ${dungeon.legacy.title}!`, 5200);
}

/** Botón de acceso al Codex — a diferencia del de Modo Constructor, visible para TODOS los
 *  jugadores; se agrega una sola vez a la misma fila de botones secundarios de la rueda. */
function setupDungeonCodexUI(){
  if($("btnDungeonCodex")) return;
  const row = document.querySelector(".wheel-secondary-row");
  if(!row) return;
  const btn = document.createElement("button");
  btn.className = "wheel-secondary-btn";
  btn.id = "btnDungeonCodex";
  btn.title = "Codex de Colecciones";
  btn.innerHTML = '📖 <span>Codex</span>';
  btn.onclick = openDungeonCodex;
  row.appendChild(btn);
}

function openDungeonCodex(){
  closeFabMenu();
  renderDungeonCodexList();
  $("dungeonCodexDetailView").classList.add("hidden");
  $("dungeonCodexListView").classList.remove("hidden");
  $("dungeonCodexOverlay").classList.remove("hidden");
}
$("btnCloseDungeonCodex").onclick = ()=> $("dungeonCodexOverlay").classList.add("hidden");
$("btnDungeonCodexBackToList").onclick = ()=>{
  $("dungeonCodexDetailView").classList.add("hidden");
  $("dungeonCodexListView").classList.remove("hidden");
};

function renderDungeonCodexList(){
  const list = $("dungeonCodexList");
  list.innerHTML = "";
  DUNGEON_REGISTRY.forEach(dungeon=>{
    const progress = getDungeonProgress(dungeon.id);
    const ownedCount = Object.keys(progress.piecesOwned).length;
    const total = dungeon.setPieces.length;
    const discovered = progress.everDiscovered;
    const card = document.createElement("div");
    card.className = "inv-card-v2 codex-legend-card" + (discovered ? "" : " locked") + (ownedCount>=total ? " complete" : "");
    card.innerHTML = `<div class="icv-icon">${discovered ? dungeon.themeIcon : "❔"}</div>
      <div class="icv-name">${discovered ? dungeon.name : "???"}</div>
      <div class="clc-progress">${discovered ? `${ownedCount}/${total} piezas` : "Aún no descubierta"}</div>`;
    if(discovered) card.onclick = ()=>{
      renderDungeonCodexDetail(dungeon.id);
      $("dungeonCodexListView").classList.add("hidden");
      $("dungeonCodexDetailView").classList.remove("hidden");
    };
    list.appendChild(card);
  });
}

function renderDungeonCodexDetail(dungeonId){
  const dungeon = getDungeonDef(dungeonId);
  const progress = getDungeonProgress(dungeonId);
  $("dungeonCodexDetailName").textContent = `${dungeon.themeIcon} ${dungeon.name}`;
  $("dungeonCodexDetailLore").textContent = dungeon.loreLong || dungeon.loreShort;
  const ownedCount = Object.keys(progress.piecesOwned).length;
  $("dungeonCodexDetailCount").textContent = `${ownedCount}/${dungeon.setPieces.length}`;

  const piecesBox = $("dungeonCodexDetailPieces");
  piecesBox.innerHTML = "";
  dungeon.setPieces.forEach(p=>{
    const ownedRarity = progress.piecesOwned[p.id];
    const card = document.createElement("div");
    card.className = "inv-card-v2 codex-piece-slot" + (ownedRarity ? "" : " missing");
    card.innerHTML = `<div class="icv-icon">${p.emoji}</div><div class="icv-name">${p.name}</div>
      <div class="clc-progress">${ownedRarity ? rarityLabel(ownedRarity) : "No obtenida"}</div>`;
    piecesBox.appendChild(card);
  });

  const bonusesBox = $("dungeonCodexDetailBonuses");
  bonusesBox.innerHTML = "";
  dungeon.setBonusTiers.forEach(t=>{
    const unlocked = ownedCount >= t.count;
    const row = document.createElement("div");
    row.className = "codex-bonus-row" + (unlocked ? " unlocked" : "");
    row.innerHTML = `<span class="cbr-check">${unlocked ? "✅" : "🔒"}</span><span>${t.count} piezas — ${t.desc}</span>`;
    bonusesBox.appendChild(row);
  });

  const legacyBox = $("dungeonCodexDetailLegacy");
  legacyBox.classList.toggle("hidden", !progress.legacyClaimed);
  if(progress.legacyClaimed){
    legacyBox.className = "codex-legacy-box";
    legacyBox.innerHTML = `🏆 <b>${dungeon.legacy.title}</b><br>${dungeon.legacy.achievementDesc}`;
  }
}

// El Coliseo ahora se abre solo desde su ubicación permanente en el mapa (ver drawColiseoMarker) — el
// botón flotante que lo abría antes se quitó, como pide el Mapa Vivo (Capa 1: Infraestructura del Mundo).
$("btnColiseoExit").onclick = ()=> $("coliseoOverlay").classList.add("hidden");
$("btnColiseoStart").onclick = startColiseoRun;
$("btnColiseoRetry").onclick = ()=>{ $("coliseoSummaryOverlay").classList.add("hidden"); startColiseoRun(); };
$("btnColiseoBackToMenu").onclick = ()=>{ $("coliseoSummaryOverlay").classList.add("hidden"); openColiseoScreen(); };

/* ============================================================
   5b. COMBATE DE MANADA (varios enemigos, cada uno con su propia vida,
   su propio ataque, y el jugador elige a cuál atacar)
   ============================================================ */
function startPackBattle(packMons, opts){
  opts = opts || {};
  if(!opts.isColiseo && (coliseoRun || pendingColiseoContinuation)){
    coliseoRun = null;
    pendingColiseoContinuation = null;
    const hud = $("coliseoBattleHud");
    if(hud) hud.classList.add("hidden");
  }
  battleState = {
    isPack: true,
    isColiseo: !!opts.isColiseo,
    isDungeon: !!opts.isDungeon,
    eventId: opts.eventId || null,
    mons: packMons.map(m=>({ ref:m, tpl:m.tpl, level:m.level, curHp:m.hp, maxHp:m.hp, atk:m.atk, def:m.def, spd:m.spd, packBonus:m.packBonus||1.5, slow:0, stunned:false })),
    selectedTarget: 0,
    playerBuffs:{atk:1, def:1, spd:1, turnsAtk:0, turnsDef:0},
    packBuffUsed: false, // ver triggerPackBuffAbility/packEnemyTurn — como mucho UNA vez por combate
    log:[]
  };
  updateBattleSceneBackground();
  updateBattleRainFx();
  $("battleWrap").classList.remove("group-mode");
  $("soloEnemyPanel").classList.add("hidden");
  $("packEnemyPanels").classList.remove("hidden");
  $("spriteEnemy").classList.add("hidden");
  $("packStageRow").classList.remove("hidden");
  $("groupAllyStageRow").classList.add("hidden");
  $("partyStatusRow").classList.add("hidden");
  $("petStageSlot").classList.add("hidden");
  $("bPName").textContent = player.name;
  $("bPLvl").textContent = "Nv."+player.level;
  renderPlayerSprite();
  renderPackEnemyPanels();
  renderPackStage();
  updateBattleBars();
  logBattle(`¡Una manada de ${packMons.length} ${packMons[0].tpl.name}(s) te rodea!`, true);
  renderMoveGrid();
  $("battleWrap").classList.remove("hidden");
  // renderPackStage() (arriba) ya intentó posicionar todo, pero corrió con #battleWrap todavía
  // oculto (.stage medía 0×0) — recién ACÁ tiene sentido medir, así que se repite ya con la escena
  // visible (el reintento automático en refreshBattleStagePerspective lo cubriría solo, pero así
  // no depende de esperar el próximo frame para verse bien).
  refreshBattleStagePerspective("pack");
  playBattleEntranceFx();
  playCharacterSlideInFx(); // el retraso hasta que se revele la escena vive en el CSS (animation-delay), no acá
  maybeShowBattleTutorial();
}

function currentPackTarget(){ return battleState.mons[battleState.selectedTarget]; }

function selectPackTarget(idx){
  battleState.selectedTarget = idx;
  renderPackEnemyPanels();
  renderPackStage();
}

/** Fila de sprites en el escenario "VS": uno por cada miembro de la manada, con su barra de vida encima. */
function renderPackStage(){
  const wrap = $("packStageRow");
  wrap.innerHTML = "";
  const count = battleState.mons.length;
  // entre más enemigos, más chico el arte de cada uno (para que quepan bien repartidos por sus
  // anchors) — la posición/superposición real ahora la decide el sistema de perspectiva
  // (refreshBattleStagePerspective → repositionPackStageMembers), no un margen a mano. Ahora que
  // pickPackClusterAnchor los abre en abanico usando la calle libre (en vez de amontonarlos en un
  // cuadradito chico), ya no hace falta achicarlos tanto para que "entren" — pedido explícito:
  // "si son solo dos o tres no los hagas pequeños" (y con 4-5 tampoco hace falta exagerar).
  // Pedido explícito adicional: si la manada se va achicando (uno cae en combate), los que quedan
  // se ven un poco más grandes — el tamaño se calcula sobre cuántos siguen VIVOS, no sobre el total
  // original de la manada (que nunca baja: los caídos se quedan en el arreglo, solo marcados
  // .dead). "||count" es un resguardo para el instante en que ya no queda ninguno vivo (la
  // batalla ya está terminando ahí, no importa mucho el tamaño).
  const aliveCount = battleState.mons.filter(m=>m.curHp>0).length || count;
  const size = aliveCount<=2 ? 72 : aliveCount===3 ? 62 : aliveCount===4 ? 52 : 42;
  battleState.mons.forEach((m, idx)=>{
    const dead = m.curHp <= 0;
    const justDied = dead && !m._deadRendered;
    const el = document.createElement("div");
    el.className = "pack-stage-mon" + (idx===battleState.selectedTarget ? " selected" : "") + (dead && !justDied ? " dead" : "");
    el.id = "packStageMon"+idx;
    // enemigos con arte de batalla propio (jefes, esbirros oscuros, lobos, etc.) muestran esa
    // imagen a escala reducida acá, en vez de caer siempre al emoji genérico como antes.
    const spriteHtml = enemySpriteHtml(m.tpl, {extraClass:"pack-sprite-img", style:`max-height:${size+18}px;max-width:${size+18}px;`}, idx);
    const bodyHtml = spriteHtml ? spriteHtml : m.tpl.emoji;
    // Nombre chico flotando arriba de la barra (sin caja/fondo azul detrás, para no gastar espacio
    // en manada) — reemplaza a los cartelitos separados de #packEnemyPanels (ahora ocultos, ver
    // main.css), que quedaban sueltos arriba de la pantalla sin relación visual con cada sprite.
    el.innerHTML = `<div class="psm-name">${m.tpl.name} <span class="psm-lvl">Nv.${m.level}</span></div>
      <div class="psm-bar" style="width:${Math.round(size*0.85)}px;"><div class="psm-fill" style="width:${pct(m.curHp,m.maxHp)}%"></div></div>
      <div class="psm-emoji"${spriteHtml ? "" : ` style="font-size:${size}px;"`}>${bodyHtml}</div>`;
    if(!dead) el.onclick = ()=> selectPackTarget(idx);
    wrap.appendChild(el);
    if(justDied){
      // doble rAF: deja que el navegador pinte el estado "vivo" primero, y recién luego
      // aplica "dead" para que la transición de opacidad se note (si no, se ve un salto instantáneo).
      requestAnimationFrame(()=> requestAnimationFrame(()=>{ el.classList.add("dead"); m._deadRendered = true; }));
    }
  });
  syncPackDisplayMode();
  refreshBattleStagePerspective("pack");
}
/** Anima un miembro específico de la manada (por índice) en el escenario. */
function animatePackMon(idx, cls){
  const el = document.getElementById("packStageMon"+idx);
  if(!el) return;
  const emoji = el.querySelector(".psm-emoji");
  if(!emoji) return;
  emoji.classList.remove("hitshake","attackp","attacke","ultimate-strike","ultimate-hit");
  void emoji.offsetWidth;
  emoji.classList.add(cls);
}
/** Igual que triggerLoboAttackPose, pero para un Lobo Umbrío específico dentro de una manada — al
 *  terminar el golpe vuelve a SU variante (enemy/enemy_var, la que le tocó según su índice en
 *  enemySpriteSrc), no siempre a la ilustración por defecto. */
function triggerPackLoboAttackPose(idx){
  const img = document.querySelector(`#packStageMon${idx} img[data-lobo="1"]`);
  if(!img) return;
  const baseSrc = img.dataset.loboBase || img.src;
  img.dataset.loboBase = baseSrc;
  img.src = LOBO_UMBRIO_SPRITES.enemyAttack;
  clearTimeout(img._resetTimer);
  img._resetTimer = setTimeout(()=>{ img.src = baseSrc; }, 700);
}
/** Igual, pero para un Demonio Menor específico dentro de una manada. */
function triggerPackDemonioAttackPose(idx){
  const img = document.querySelector(`#packStageMon${idx} img[data-demonio="1"]`);
  if(!img) return;
  const baseSrc = img.dataset.demonioBase || img.src;
  img.dataset.demonioBase = baseSrc;
  img.src = DEMONIO_MENOR_SPRITES.enemyAttack;
  clearTimeout(img._resetTimer);
  img._resetTimer = setTimeout(()=>{ img.src = baseSrc; }, 700);
}
/** Igual, pero para un Cuervo Corrupto específico dentro de una manada. */
function triggerPackCuervoAttackPose(idx){
  const img = document.querySelector(`#packStageMon${idx} img[data-cuervo="1"]`);
  if(!img) return;
  const baseSrc = img.dataset.cuervoBase || img.src;
  img.dataset.cuervoBase = baseSrc;
  img.src = CUERVO_CORRUPTO_SPRITES.enemyAttack;
  clearTimeout(img._resetTimer);
  img._resetTimer = setTimeout(()=>{ img.src = baseSrc; }, 700);
}
/** Igual, pero para cuando el JUGADOR le pega a un Cuervo Corrupto específico de la manada. */
function triggerPackCuervoHurtPose(idx){
  const img = document.querySelector(`#packStageMon${idx} img[data-cuervo="1"]`);
  if(!img) return;
  const baseSrc = img.dataset.cuervoBase || img.src;
  img.dataset.cuervoBase = baseSrc;
  img.src = CUERVO_CORRUPTO_SPRITES.hurt;
  clearTimeout(img._resetTimer);
  img._resetTimer = setTimeout(()=>{ img.src = baseSrc; }, 600);
}
/** Igual que triggerRataMutantePose, pero para una Rata Mutante específica dentro de una manada —
 *  sirve tanto para su pose de ataque (cuando le pega al jugador, ver packEnemyTurn) como para su
 *  pose de golpe recibido (cuando el jugador le pega a ELLA, ver executePackPlayerAction). Debe
 *  llamarse DESPUÉS de que renderPackStage() ya haya reconstruido el HTML de ese turno — si no, el
 *  <img> que se busca acá todavía no existe (o es el viejo, a punto de ser reemplazado). */
function triggerPackRataMutantePose(idx, poseKey, holdMs){
  const img = document.querySelector(`#packStageMon${idx} img[data-rata="1"]`);
  if(!img) return;
  img.src = RATA_MUTANTE_SPRITES[poseKey] || RATA_MUTANTE_SPRITES.base;
  clearTimeout(img._resetTimer);
  img._resetTimer = setTimeout(()=>{ img.src = RATA_MUTANTE_SPRITES.base; }, holdMs || 700);
}
/** Aviso de "va a atacar": un "!" aparece arriba de un miembro específico de la manada — se llama
 *  un instante antes de resolver su golpe (ver packEnemyTurn) para que quede claro cuál enemigo
 *  está actuando en ese momento, sin tener que adivinarlo por el mensaje del log. */
function showPackAttackTelegraph(idx){
  const el = document.getElementById("packStageMon"+idx);
  if(!el) return;
  let badge = el.querySelector(".psm-attack-telegraph");
  if(!badge){
    badge = document.createElement("div");
    badge.className = "psm-attack-telegraph";
    badge.textContent = "!";
    el.appendChild(badge);
  }
  badge.classList.remove("hide");
}
function hidePackAttackTelegraph(idx){
  const el = document.getElementById("packStageMon"+idx);
  const badge = el && el.querySelector(".psm-attack-telegraph");
  if(badge) badge.classList.add("hide");
}

function renderPackEnemyPanels(){
  const wrap = $("packEnemyPanels");
  wrap.innerHTML = "";
  battleState.mons.forEach((m, idx)=>{
    const dead = m.curHp <= 0;
    const justDied = dead && !m._deadRendered;
    const panel = document.createElement("div");
    panel.className = "pack-panel" + (idx===battleState.selectedTarget ? " selected" : "") + (dead && !justDied ? " dead" : "");
    panel.innerHTML = `<div class="pp-name"><span>${m.tpl.emoji} ${m.tpl.name}</span><span>Nv.${m.level}</span></div>
      <div class="pp-bar"><div class="pp-fill" style="width:${pct(m.curHp,m.maxHp)}%"></div></div>`;
    if(!dead) panel.onclick = ()=> selectPackTarget(idx);
    wrap.appendChild(panel);
    if(justDied){
      requestAnimationFrame(()=> requestAnimationFrame(()=> panel.classList.add("dead")));
    }
  });
}

function packPlayerAction(mv){
  if(!canAffordMove(mv, player.mp, player.hp, player.maxHp)) return;
  clearTurnTimer();
  disableMoves(true);
  if(mv.isUltimate){
    playUltimateChargeUp("spritePlayer");
    logBattle(`✨ Te concentras... ¡vas a usar ${mv.name}!`);
    triggerUltimateMinigame(mv, (multiplier)=>{
      const basePower = mv.power;
      setTimeout(()=>{
        mv.power = +(basePower * multiplier).toFixed(2);
        if(multiplier >= 1.3) logBattle(`💥 ¡Golpe cargado al máximo! (x${multiplier})`);
        else if(multiplier <= 0.75) logBattle(`😬 El golpe no salió tan cargado como esperabas (x${multiplier})`);
        executePackPlayerAction(mv);
        mv.power = basePower;
      }, ULTIMATE_CHARGE_MS);
    });
  } else if(mv.interactive === "precision"){
    triggerPrecisionShotMinigame((zone)=>{
      const basePower = mv.power, baseCrit = mv.crit||0;
      mv.power = +(basePower*zone.mult).toFixed(2);
      mv.crit = +(baseCrit + zone.critBonus).toFixed(2);
      logBattle(`${zone.label} (x${zone.mult} daño${zone.critBonus>0?`, +${Math.round(zone.critBonus*100)}% crít.`:""})`);
      executePackPlayerAction(mv);
      mv.power = basePower; mv.crit = baseCrit;
    });
  } else if(mv.interactive === "tap" || mv.interactive === "swipe" || mv.interactive === "sweep"){
    const challenge = mv.interactive === "tap" ? triggerQuickTapChallenge
      : mv.interactive === "sweep" ? triggerQuickSweepChallenge
      : triggerQuickSwipeChallenge;
    challenge((success)=>{
      const basePower = mv.power;
      if(!success){ mv.power = +(basePower*0.65).toFixed(2); logBattle(`😬 No lo hiciste a tiempo — ${mv.name} sale más flojo.`); }
      executePackPlayerAction(mv);
      mv.power = basePower;
    });
  } else {
    executePackPlayerAction(mv);
  }
}

function executePackPlayerAction(mv){
  player.mp -= getMoveCost(mv, player.mp);
  if(mv.hpCost){ const hpc = getMoveHpCost(mv, player.maxHp); player.hp = Math.max(1, player.hp - hpc); logBattle(`El esfuerzo te cuesta ${hpc} HP.`); }
  const targetIdx = battleState.selectedTarget;
  const target = currentPackTarget();
  triggerClassAttackAnim(mv);
  // hoisteados fuera del if/else de abajo: hacen falta más tarde, después de renderPackStage(), para
  // mostrar el número flotante de daño sobre packStageMon{idx} (ver flashPackMon más abajo) — ese
  // elemento recién existe fresco en el DOM después del render, así que el número se dispara ahí.
  let totalDmg = 0;
  const aoeDmgByIdx = {};

  if(mv.type==="buff"){
    if(mv.buff==="atk"){ battleState.playerBuffs.atk = 1+mv.amount; battleState.playerBuffs.turnsAtk = mv.dur; }
    if(mv.buff==="def"){ battleState.playerBuffs.def = 1+mv.amount; battleState.playerBuffs.turnsDef = mv.dur; }
    if(mv.selfDef){ battleState.playerBuffs.def = Math.max(0.3, 1+mv.selfDef); battleState.playerBuffs.turnsDef = mv.dur; }
    logBattle(`Usas ${mv.name}. ¡Te sientes con más poder!`);
    animateSprite("spritePlayer","attackp");
  } else if(mv.type==="heal"){
    const heal = Math.round(player.maxHp*mv.amount);
    player.hp = Math.min(player.maxHp, player.hp+heal);
    logBattle(`Usas ${mv.name} y recuperas ${heal} HP.`);
    animateSprite("spritePlayer","attackp");
    flashSprite("spritePlayer","green");
    spawnFloatingNumber("spritePlayer", "+"+heal, "heal");
  } else if(mv.type==="debuff"){
    if(mv.stat==="def") target.def = +(target.def*(1-mv.amount)).toFixed(1);
    if(mv.stat==="atk") target.atk = +(target.atk*(1-mv.amount)).toFixed(1);
    logBattle(`Usas ${mv.name} contra ${target.tpl.name}. ¡Se ve más débil!`);
    animateSprite("spritePlayer","attackp");
  } else if(mv.aoe){
    // ataque de ÁREA: golpea a TODOS los enemigos vivos de la manada
    animateSprite("spritePlayer","attackp");
    let totalAll = 0;
    battleState.mons.forEach((m, idx)=>{
      if(m.curHp <= 0) return;
      const hits = mv.hits||1;
      let dmg = 0;
      for(let h=0; h<hits; h++){
        let def = m.def;
        if(mv.pierce) def = def*(1-mv.pierce);
        let d = calcDamage(effectiveAtk(mv), def, mv.power, (mv.crit||0.06) + (player.critBonus||0));
        if(mv.execute && m.curHp < m.maxHp*0.3) d = Math.round(d*1.6);
        m.curHp = Math.max(0, m.curHp - d);
        dmg += d;
        if(m.curHp<=0) break;
      }
      totalAll += dmg;
      aoeDmgByIdx[idx] = dmg;
      logBattle(`${mv.name} golpea a ${m.tpl.name}: ${dmg} de daño.${m.curHp<=0?` ¡Cae derrotado!`:""}`);
    });
    maybeShowCrit(totalAll, battleState.mons.reduce((s,m)=>s+m.maxHp,0));
    if(mv.selfDmg){ const sd=Math.round(player.maxHp*mv.selfDmg); player.hp=Math.max(1, player.hp-sd); logBattle(`El esfuerzo te cuesta ${sd} HP.`); }
  } else {
    const hits = mv.hits||1;
    for(let h=0; h<hits; h++){
      let def = target.def;
      if(mv.pierce) def = def*(1-mv.pierce);
      let dmg = calcDamage(effectiveAtk(mv), def, mv.power, (mv.crit||0.06) + (player.critBonus||0));
      if(mv.execute && target.curHp < target.maxHp*0.3) dmg = Math.round(dmg*1.6);
      target.curHp = Math.max(0, target.curHp - dmg);
      totalDmg += dmg;
      if(target.curHp<=0) break;
    }
    const petBonus = Math.round(petDamageBonus());
    if(petBonus > 0 && target.curHp > 0){
      target.curHp = Math.max(0, target.curHp - petBonus);
      totalDmg += petBonus;
      logBattle(`🐾 Tus mascotas ayudan con ${petBonus} de daño extra.`);
    }
    animateSprite("spritePlayer","attackp");
    maybeShowCrit(totalDmg, target.maxHp);
    logBattle(`Usas ${mv.name} contra ${target.tpl.name}: ${totalDmg} de daño${hits>1?` (${hits} golpes)`:""}.`);
    if(target.curHp<=0) logBattle(`¡${target.tpl.name} cae derrotado!`);
    const proc = rollWeaponProc(totalDmg);
    if(proc && target.curHp>0){
      if(proc.type==="haste"){ battleState.playerBuffs.spd = Math.max(battleState.playerBuffs.spd, 1.4); logBattle(`💨 ¡Tu arma te acelera!`); }
      else {
        applyStatusEffect(target, proc.type);
        logBattle(`${PROC_LABELS[proc.type]} ¡${target.tpl.name} queda ${STATUS_EFFECTS[proc.type].label.toLowerCase()}!`);
      }
    }
    if(mv.drain){ const heal = Math.round(totalDmg*mv.drain); player.hp = Math.min(player.maxHp, player.hp+heal); logBattle(`Absorbes ${heal} HP.`); }
    if(mv.slow){ target.slow = mv.slow; logBattle(`¡${target.tpl.name} se vuelve más lento!`); }
    if(mv.stun && Math.random()<mv.stun){ target.stunned = true; logBattle(`¡${target.tpl.name} queda aturdido!`); }
    if(mv.selfDmg){ const sd=Math.round(player.maxHp*mv.selfDmg); player.hp=Math.max(1, player.hp-sd); logBattle(`El esfuerzo te cuesta ${sd} HP.`); }
    if(mv.selfBuffSpd){ battleState.playerBuffs.spd = 1+mv.selfBuffSpd; logBattle(`Tu velocidad aumenta.`); }
  }

  // si el objetivo cayó, selecciona automáticamente al siguiente enemigo vivo
  if(target.curHp<=0){
    const nextAlive = battleState.mons.findIndex(m=>m.curHp>0);
    if(nextAlive>=0) battleState.selectedTarget = nextAlive;
  }
  renderPackEnemyPanels();
  renderPackStage();
  updateBattleBars();
  refreshHud();

  // el parpadeo y la sacudida se disparan DESPUÉS de reconstruir el HTML de la manada,
  // porque renderPackStage() reemplaza los elementos y borraría la animación si se
  // aplicara antes (ese era el bug: nunca se alcanzaba a ver el parpadeo rojo).
  if(mv.type!=="buff" && mv.type!=="heal"){
    if(mv.aoe){
      battleState.mons.forEach((m, idx)=>{
        animatePackMon(idx, mv.isUltimate ? "ultimate-hit" : "hitshake");
        flashPackMon(idx, mv.isUltimate ? "ultimate" : "red");
        if(aoeDmgByIdx[idx] != null){
          spawnFloatingNumber("packStageMon"+idx, "-"+aoeDmgByIdx[idx], (aoeDmgByIdx[idx] >= m.maxHp*0.5) ? "crit" : "damage");
          if(m.tpl.name === "Rata Mutante") triggerPackRataMutantePose(idx, "hurt", 600);
          if(m.tpl.name === "Cuervo Corrupto") triggerPackCuervoHurtPose(idx);
        }
      });
    } else {
      animatePackMon(targetIdx, mv.isUltimate ? "ultimate-hit" : "hitshake");
      flashPackMon(targetIdx, mv.isUltimate ? "ultimate" : "red");
      if(totalDmg > 0){
        spawnFloatingNumber("packStageMon"+targetIdx, "-"+totalDmg, (totalDmg >= target.maxHp*0.5) ? "crit" : "damage");
        if(target.tpl.name === "Rata Mutante") triggerPackRataMutantePose(targetIdx, "hurt", 600);
        if(target.tpl.name === "Cuervo Corrupto") triggerPackCuervoHurtPose(targetIdx);
      }
    }
    if(mv.isUltimate) animateSprite("spritePlayer","ultimate-strike");
  }
  if(mv.isUltimate) slowDrainMp("bPMp");

  setTimeout(()=>{
    const anyAlive = battleState.mons.some(m=>m.curHp>0);
    if(!anyAlive) return packWinBattle();
    maybeDoPetTurn(packEnemyTurn);
  }, postPlayerActionDelay(mv));
}

/** Habilidad de manada (ver PACK_BUFF_ABILITIES en enemies.js): en vez de atacar, este miembro
 *  potencia el ATQ o la DEF de TODA la manada viva — permanente por el resto de este combate,
 *  mismo criterio sin temporizador que ya usan los debuffs que los monstruos le aplican al jugador
 *  (mv.stat==="def" en executePackPlayerAction). Muestra el aro de color + ícono (ver
 *  .enemy-buff-aura-atk/-def/-spd en main.css) sobre CADA miembro vivo, para que se note que la
 *  manada entera quedó más fuerte — no solo el que la usó. */
function triggerPackBuffAbility(caster, casterIdx, ability, aliveMembers, next){
  battleState.packBuffUsed = true;
  aliveMembers.forEach(mm=>{ mm[ability.mechStat] = +(mm[ability.mechStat] * (1+ability.amount)).toFixed(1); });
  showPackAttackTelegraph(casterIdx);
  setTimeout(()=>{
    hidePackAttackTelegraph(casterIdx);
    logBattle(`✨ ¡${caster.tpl.name} ${ability.verb}! ${ability.name} sube el ${ability.mechStat==="def"?"DEF":"ATQ"} de toda la manada.`);
    aliveMembers.forEach(mm=>{
      const el = document.getElementById("packStageMon"+battleState.mons.indexOf(mm));
      if(!el) return;
      const cls = "enemy-buff-aura-"+ability.visualKind;
      el.classList.remove("enemy-buff-aura-atk","enemy-buff-aura-def","enemy-buff-aura-spd");
      void el.offsetWidth;
      el.classList.add(cls);
      clearTimeout(el._packAuraTimer);
      el._packAuraTimer = setTimeout(()=> el.classList.remove(cls), 2000);
    });
    updateBattleBars(); refreshHud();
    setTimeout(next, 700);
  }, 480);
}

/** Cada miembro vivo de la manada ataca UNO A LA VEZ (con su propia animación), para que se note quién y cuándo. */
function packEnemyTurn(){
  const alive = battleState.mons.filter(m=>m.curHp>0);
  const order = alive.slice(); // podría ordenarse por velocidad si se quisiera
  let i = 0;

  function attackNext(){
    if(i >= order.length){
      updateBattleBars(); refreshHud();
      if(battleState.playerBuffs.turnsAtk>0){ battleState.playerBuffs.turnsAtk--; if(battleState.playerBuffs.turnsAtk===0) battleState.playerBuffs.atk=1; }
      if(battleState.playerBuffs.turnsDef>0){ battleState.playerBuffs.turnsDef--; if(battleState.playerBuffs.turnsDef===0) battleState.playerBuffs.def=1; }
      setTimeout(()=>{
        if(player.hp<=0){ offerRevive(packLoseBattle); return; }
        disableMoves(false);
        renderMoveGrid();
      }, 450);
      return;
    }
    const m = order[i]; i++;
    const idx = battleState.mons.indexOf(m);

    if(tickStatusEffect(m, "packStageMon"+idx)){
      syncPackDisplayMode();
      updateBattleBars(); refreshHud();
      logBattle(`¡${m.tpl.name} cae derrotado!`);
      setTimeout(attackNext, 450);
      return;
    }
    if(m.stunned){
      logBattle(`${m.tpl.name} está aturdido y no puede actuar.`);
      m.stunned = false;
      setTimeout(attackNext, 450);
      return;
    }
    // Habilidad de manada (Aullido, etc. — ver PACK_BUFF_ABILITIES en enemies.js): con la manada
    // completa (2+ vivos) y todavía sin usarla este combate, este miembro puede potenciar a toda
    // la manada EN VEZ de atacar — pedido explícito, para que las peleas de manada no sean solo
    // golpes repetidos. Como mucho una vez por combate (packBuffUsed), para no volverse la nueva
    // mecánica "demasiado fuerte".
    const packAbility = PACK_BUFF_ABILITIES[m.tpl.name];
    if(packAbility && !battleState.packBuffUsed && alive.length >= 2 && Math.random() < 0.3){
      triggerPackBuffAbility(m, idx, packAbility, alive, attackNext);
      return;
    }
    // aviso de "va a atacar": un "!" arriba de ESTE miembro de la manada un instante antes de que
    // se resuelva el golpe — en una manada de varios enemigos no siempre es obvio cuál está
    // actuando en ese momento, esto lo deja claro antes de que aparezca el daño.
    showPackAttackTelegraph(idx);
    setTimeout(()=>{
      hidePackAttackTelegraph(idx);
      const spdMod = m.slow ? (1-m.slow) : 1;
      const power = 0.9 + Math.random()*0.5;
      let dmg = calcDamage(m.atk*spdMod, effectiveDef(), power, 0.08);
      if(player.lowHpShield && !battleState.lowHpShieldUsed && (player.hp/player.maxHp) <= 0.3){
        const reduced = Math.round(dmg * (1-player.lowHpShield));
        logBattle(`🧣 ¡Tu capa te protege! Absorbe ${dmg-reduced} de daño.`);
        dmg = reduced;
        battleState.lowHpShieldUsed = true;
      }
      player.hp = Math.max(0, player.hp - dmg);
      logBattle(`${m.tpl.name} ataca: ${dmg} de daño.`);
      if(m.tpl.debuffOnHit && Math.random() < m.tpl.debuffOnHit.chance){
        const d = m.tpl.debuffOnHit;
        battleState.playerBuffs[d.stat] = Math.max(0.25, battleState.playerBuffs[d.stat]*(1-d.amount));
        const label = d.stat==="def"?"DEF":d.stat==="atk"?"ATQ":"VEL";
        logBattle(`¡${m.tpl.name} debilita tu ${label}!`);
      }
      animatePackMon(idx, "attacke");
      if(m.tpl.name === "Lobo Umbrío") triggerPackLoboAttackPose(idx);
      if(m.tpl.name === "Demonio Menor") triggerPackDemonioAttackPose(idx);
      if(m.tpl.name === "Cuervo Corrupto") triggerPackCuervoAttackPose(idx);
      if(m.tpl.name === "Rata Mutante") triggerPackRataMutantePose(idx, "attack", 700);
      animateSprite("spritePlayer","hitshake");
      flashSprite("spritePlayer","red");
      maybeShowCrit(dmg, player.maxHp);
      spawnFloatingNumber("spritePlayer", "-"+dmg, (dmg >= player.maxHp*0.5) ? "crit" : "damage");
      updateBattleBars(); refreshHud();
      setTimeout(attackNext, 500); // pausa tras el golpe antes de pasar al siguiente atacante
    }, 480); // ventana en la que se ve el "!" antes de que el golpe se resuelva
  }
  attackNext();
}

function packWinBattle(){
  if(battleState.isDungeon) return dungeonWinFloor();
  if(battleState.isColiseo) return coliseoWinRound();
  if(battleState.eventId) resolveWorldEventVictory(battleState.eventId);
  clearTurnTimer();
  const bossEntry = battleState.mons.find(m=>m.isBoss);
  logBattle(bossEntry ? `¡Derrotaste a ${bossEntry.tpl.name} y sus refuerzos!` : `¡Derrotaste a toda la manada!`);
  if(bossEntry && bossEntry.ref && bossEntry.ref.isBoss && !bossEntry.ref.isParkGuardian){
    releaseBossLock(bossEntry.ref);
    if(pubnub){
      pubnub.publish({channel: PN_ANNOUNCE_CHANNEL, storeInHistory:false, message:{
        type:'boss_defeated', playerName: player.name, bossName: bossEntry.tpl.name, itemName:null, itemEmoji:"👑"
      }});
    }
  }
  battleState.mons.forEach(m=>{
    registerQuestKill(m.tpl.name);
    if(!m.ref || !m.ref.marker) return; // esbirro invocado por un jefe (o guardián de parque, que no tiene marcador propio): nunca estuvo en el mapa
    map.removeLayer(m.ref.marker);
    monsters = monsters.filter(mm=>mm.id!==m.ref.id);
  });

  let xpGain = 0, goldGain = 0;
  const charBefore = {level:player.level, xp:player.xp, xpNext:player.xpNext};
  const lootMessages = [];
  battleState.mons.forEach(m=>{
    xpGain += Math.round((m.level*17 + Math.random()*9) * (m.packBonus||1.5));
    goldGain += Math.round((m.level*5 + Math.random()*8) * (m.packBonus||1.5));
    const dropChance = m.isBoss ? 1 : 0.55;
    const dropCount = m.isBoss ? 3 : 1;
    for(let i=0;i<dropCount;i++){
      if(Math.random() < dropChance){
        const item = rollLoot();
        if(item.type==="stat"){
          if(item.stat==="maxHp"){ player.maxHp += item.amount; player.hp += item.amount; }
          else player[item.stat] += item.amount;
          pushItemSafe({...item});
          lootMessages.push(`${item.emoji} ${item.name}`);
        } else {
          pushItemSafe({...item});
          lootMessages.push(`${item.emoji} ${item.name}`);
        }
      }
    }
    rollCraftMaterialDrops(m.tpl.name).forEach(msg=> lootMessages.push(msg));
  });
  player.xp += xpGain; player.gold += goldGain;
  const petXpSummary = grantPetXpIfSummoned(Math.round(xpGain*0.4));
  const charAfter = simulateXpProgress(charBefore.level, charBefore.xp, charBefore.xpNext, xpGain);
  const lootMsg = lootMessages.length ? "¡Obtienes: " + lootMessages.join(", ") + "!" : "";

  let bossItemMsg = "";
  if(bossEntry && Math.random() < 0.35){
    const bItem = generateBossLootItem(bossEntry.tpl.name, bossEntry.level, player.classKey);
    if(bItem){
      pushItemSafe(bItem);
      bossItemMsg = `<br>👑 ¡Botín especial! ${bItem.emoji} ${bItem.name} (${bItem.desc})`;
    }
  }

  setTimeout(()=>{
    $("battleWrap").classList.add("hidden");
    $("packEnemyPanels").classList.add("hidden");
    $("soloEnemyPanel").classList.remove("hidden");
    $("packStageRow").classList.add("hidden");
    $("spriteEnemy").classList.remove("hidden");
    $("resultEmoji").textContent = bossEntry ? "👑" : "🏆";
    $("resultTitle").textContent = bossEntry ? `¡Jefe derrotado! ${bossEntry.tpl.name}` : "¡Victoria! 👥 ¡manada derrotada!";
    $("resultSub").innerHTML = `+${xpGain} XP · +${goldGain} 💰${lootMsg? "<br>"+lootMsg : ""}${bossItemMsg}`;
    $("resultOverlay").classList.remove("hidden");
    animateResultProgress({
      char: {
        beforeLevel: charBefore.level, beforeXp: charBefore.xp, beforeXpNext: charBefore.xpNext,
        afterLevel: charAfter.level, afterXp: charAfter.xp, afterXpNext: charAfter.xpNext, gainedLevels: charAfter.gainedLevels
      },
      pet: petXpSummary
    });
    refreshHud();
    checkLevelUps();
    battleState = null;
    saveGame();
  }, 700);
}

function packLoseBattle(){
  if(battleState.isDungeon) return dungeonLoseFloor();
  if(battleState.isColiseo) return coliseoLoseRun();
  if(battleState.eventId) resolveWorldEventLoss(battleState.eventId);
  clearTurnTimer();
  logBattle(`¡Has caído ante la manada!`);
  const bossEntry = battleState.mons.find(m=>m.isBoss);
  if(bossEntry && bossEntry.ref && bossEntry.ref.isBoss && !bossEntry.ref.isParkGuardian) releaseBossLock(bossEntry.ref);
  player.hp = Math.round(player.maxHp*0.3);
  setTimeout(()=>{
    $("battleWrap").classList.add("hidden");
    $("packEnemyPanels").classList.add("hidden");
    $("soloEnemyPanel").classList.remove("hidden");
    $("packStageRow").classList.add("hidden");
    $("spriteEnemy").classList.remove("hidden");
    $("resultEmoji").textContent = "💀";
    $("resultTitle").textContent = "Derrota";
    $("resultSub").textContent = "La manada te venció. Despiertas debilitado, con 30% de tu HP.";
    $("resultOverlay").classList.remove("hidden");
    updateResultProgressVisibility(false);
    refreshHud();
    battleState = null;
    saveGame();
  }, 700);
}

function rollFromTable(table){
  const total = table.reduce((s,i)=>s+i.weight,0);
  let r = Math.random()*total;
  for(const it of table){ r -= it.weight; if(r<=0) return it; }
  return table[0];
}
function rollLoot(){
  // ~40% de probabilidad de que el botín sea una pieza de equipo en vez de un consumible/gema
  // (filtrado a lo que tu clase puede usar y a tu nivel actual, para no llenarte de cosas que aún no puedes equipar)
  return Math.random() < 0.4 ? rollFromTable(equipPoolForMyClass(EQUIP_TABLE)) : rollFromTable(ITEM_TABLE);
}

function checkProximity(){ checkAmbush(); updateThiefProximity(); updateNpcGreetingProximity(); }

/* ============================================================
   6. NIVELES Y APRENDIZAJE DE MOVIMIENTOS
   ============================================================ */
function checkLevelUps(){
  const levelBefore = player.level;
  while(player.xp >= player.xpNext){
    player.xp -= player.xpNext;
    player.level++;
    player.xpNext = xpCurveForLevel(player.level);
    applyGrowth();
  }
  refreshHud();
  processLevelUpQueue();
  if(player.level !== levelBefore) broadcastPartyMemberUpdate();
}

/** Actualiza mi propia entrada en el grupo (nivel/estadísticas) y avisa a los demás miembros —
 *  si no, el panel del grupo se queda mostrando el nivel viejo con el que te uniste. */
function broadcastPartyMemberUpdate(){
  if(!party || !pubnub) return;
  const snap = myMemberSnapshot();
  const idx = party.members.findIndex(m=>m.id===myPlayerId);
  if(idx>=0) party.members[idx] = snap; else party.members.push(snap);
  renderMapPartyPanel();
  pubnub.publish({channel: partyChannel(party.id), storeInHistory:false,
    message:{type:'party_member_update', member: snap}});
}

function applyGrowth(){
  const g = player.growth;
  const before = {maxHp:player.maxHp, maxMp:player.maxMp, atk:player.atk, matk:player.matk, def:player.def, spd:player.spd};
  player.maxHp = Math.round(player.maxHp + g.hp);
  player.maxMp = Math.round(player.maxMp + g.mp);
  player.atk = +(player.atk + g.atk).toFixed(1);
  player.matk = +(player.matk + (g.matk||0)).toFixed(1);
  player.def = +(player.def + g.def).toFixed(1);
  player.spd = +(player.spd + g.spd).toFixed(1);
  player.hp = player.maxHp; player.mp = player.maxMp;
  player.attributePoints = (player.attributePoints||0) + 5;

  const wantedSlots = maxAccessorySlots(player.level, player.classKey);
  const gainedAccessorySlot = player.equipment.accessory.length < wantedSlots;
  while(player.equipment.accessory.length < wantedSlots){
    player.equipment.accessory.push(null);
  }

  const newMoves = player.movePool.filter(m=> m.lvl===player.level && !player.learnedIds.has(m.id));
  const afterStats = {maxHp:player.maxHp,maxMp:player.maxMp,atk:player.atk,matk:player.matk,def:player.def,spd:player.spd};
  const ultimateEvent = maybeHandleUltimateProgression();
  const passiveEvent = maybeHandleBerserkerBleedUnlock();
  if(newMoves.length===0 && !ultimateEvent && !passiveEvent){
    pendingLevelUps.push({level:player.level, before, after:afterStats, newMove:null, gainedAccessorySlot});
  } else {
    // si suben varios movimientos nuevos al mismo nivel, se muestran uno por uno (no se pierden los demás)
    newMoves.forEach((nm, idx)=>{
      pendingLevelUps.push({level:player.level, before, after:afterStats, newMove:nm, gainedAccessorySlot: idx===0 ? gainedAccessorySlot : false});
    });
    if(ultimateEvent){
      pendingLevelUps.push({level:player.level, before, after:afterStats, newMove:null, ultimateEvent, gainedAccessorySlot: newMoves.length===0 ? gainedAccessorySlot : false});
    }
    if(passiveEvent){
      pendingLevelUps.push({level:player.level, before, after:afterStats, newMove:null, passiveEvent, gainedAccessorySlot: (newMoves.length===0 && !ultimateEvent) ? gainedAccessorySlot : false});
    }
  }
}

function processLevelUpQueue(){
  if(pendingLevelUps.length===0) return;
  const item = pendingLevelUps.shift();
  showLevelUpModal(item);
}

function showLevelUpModal(item){
  $("lvBadge").textContent = "Nv. "+item.level;
  const list = $("statDiffList");
  const rows = [
    ["HP máx.", item.before.maxHp, item.after.maxHp],
    ["MP máx.", item.before.maxMp, item.after.maxMp],
    ["ATQ", item.before.atk, item.after.atk],
    ["AT.MÁG", item.before.matk, item.after.matk],
    ["DEF", item.before.def, item.after.def],
    ["VEL", item.before.spd, item.after.spd],
  ];
  list.innerHTML = rows.map(r=>`<div class="stat-diff"><span>${r[0]}</span><span>${r[1]} → <b>${r[2]}</b></span></div>`).join("")
    + `<div class="stat-diff" style="color:var(--gold); font-weight:800;"><span>🧬 Puntos de atributo</span><span>+5 (usa "Atributos" en el menú)</span></div>`
    + (item.gainedAccessorySlot ? `<div class="stat-diff" style="color:var(--accent2); font-weight:800;"><span>💍 ¡Nuevo espacio de accesorio!</span><span>Equipo</span></div>` : "");

  const moveArea = $("newMoveArea");
  moveArea.innerHTML = "";
  if(item.newMove){
    if(player.moves.length < 4){
      player.moves.push(item.newMove);
      player.learnedIds.add(item.newMove.id);
      if(!player.everLearnedIds) player.everLearnedIds = new Set();
      player.everLearnedIds.add(item.newMove.id);
      moveArea.innerHTML = `<div class="newmove-card"><b>¡Nuevo movimiento aprendido!</b><br>${item.newMove.name}${moveTargetIcon(item.newMove)} — ${item.newMove.desc}</div>`;
    } else {
      moveArea.innerHTML = `<div class="newmove-card">Tienes un nuevo movimiento disponible: <b>${item.newMove.name}${moveTargetIcon(item.newMove)}</b>. Decide qué hacer al continuar.</div>`;
    }
  } else if(item.ultimateEvent){
    const mv = item.ultimateEvent.move;
    const label = item.ultimateEvent.type==='ultimate_unlocked' ? "¡Desbloqueaste tu movimiento definitivo!" : "¡Tu movimiento definitivo evolucionó!";
    moveArea.innerHTML = `<div class="newmove-card" style="border-color:var(--gold); box-shadow:0 0 14px rgba(232,196,104,.35);">
      🌟 <b>${label}</b><br>${mv.name}${moveTargetIcon(mv)} — ${mv.desc}</div>`;
  } else if(item.passiveEvent && item.passiveEvent.type === "desangrar_unlocked"){
    moveArea.innerHTML = `<div class="newmove-card" style="border-color:#c0392b; box-shadow:0 0 14px rgba(192,57,43,.4);">
      🩸 <b>¡Nueva pasiva desbloqueada: Desangrar!</b><br>Mientras ataques sin parar, el rival queda Desangrado y pierde vida cada turno. Si dejas de atacar (usas un grito, te potencias o te curas), el sangrado se corta — y si el rival se cura o se fortalece a sí mismo, también.</div>`;
  }

  $("levelupOverlay").classList.remove("hidden");
  $("btnLevelupClose").onclick = ()=>{
    $("levelupOverlay").classList.add("hidden");
    if(item.newMove && player.moves.length>=4 && !player.learnedIds.has(item.newMove.id)){
      showLearnMoveChoice(item.newMove);
    } else {
      processLevelUpQueue();
    }
    saveGame();
  };
}

/** Estima qué tan útil es un movimiento ahora mismo, para poder recomendar cuál reemplazar. */
function moveUtilityScore(mv){
  if(mv.type === "heal") return 55 + mv.amount*40;
  if(mv.type === "buff") return 50;
  if(mv.type === "debuff") return 45 + mv.amount*40;
  const atk = player.atk + (mv.type==="magic" ? (player.matk||0) : 0);
  const hits = mv.hits||1;
  const avgDmg = atk*mv.power*hits;
  return avgDmg - (mv.cost||0)*3;
}

/** Ícono para distinguir de un vistazo qué movimientos afectan a varios objetivos. */
function moveTargetIcon(mv){
  let icon = "";
  if(mv.aoe) icon += ` <span title="Ataque de área">🌊</span>`;
  if(mv.allyBuff || mv.allyHeal) icon += ` <span title="Afecta a todo el grupo">👥</span>`;
  if(mv.interactive==="tap") icon += ` <span title="Toca rápido al usarlo para que salga a daño completo">👆</span>`;
  if(mv.interactive==="swipe") icon += ` <span title="Sigue el patrón al usarlo para que salga a daño completo">🌀</span>`;
  if(mv.interactive==="sweep") icon += ` <span title="Desliza bien amplio al usarlo para que salga a daño completo">↔️</span>`;
  if(mv.interactive==="precision") icon += ` <span title="Toca en el momento justo de la barra de potencia">🎯</span>`;
  return icon;
}

function showLearnMoveChoice(newMove){
  $("learnNewCard").innerHTML = `<b>${newMove.name}${moveTargetIcon(newMove)}</b><br><span style="font-size:12px;color:var(--dim)">${moveInfoLine(newMove)} · MP ${newMove.cost||0}</span><br><span style="font-size:11.5px;color:var(--text);">${newMove.desc||""}</span>`;
  const list = $("learnCurrentList");
  list.innerHTML = "";

  // recomendación: el movimiento actual con menor utilidad estimada
  let recommendIdx = -1, lowestScore = Infinity;
  player.moves.forEach((mv, idx)=>{
    const score = moveUtilityScore(mv);
    if(score < lowestScore){ lowestScore = score; recommendIdx = idx; }
  });

  player.moves.forEach((mv, idx)=>{
    const row = document.createElement("div");
    row.className = "cm-item";
    const isRecommended = idx === recommendIdx;
    if(isRecommended) row.style.borderColor = "var(--gold)";
    row.innerHTML = `<div style="flex:1;">
        <span>${mv.name}${moveTargetIcon(mv)}${isRecommended ? ' <b style="color:var(--gold);">⭐ Recomendado</b>' : ""}</span>
        <small style="display:block; color:var(--dim); font-size:10.5px;">${moveInfoLine(mv)} · MP ${mv.cost||0}</small>
        <small style="display:block; color:var(--text); font-size:10.5px; margin-top:2px;">${mv.desc||""}</small>
      </div>
      <button>Reemplazar</button>`;
    row.querySelector("button").onclick = ()=>{
      player.learnedIds.delete(mv.id);
      player.moves.splice(idx,1,newMove);
      player.learnedIds.add(newMove.id);
      if(!player.everLearnedIds) player.everLearnedIds = new Set();
      player.everLearnedIds.add(newMove.id);
      $("learnOverlay").classList.add("hidden");
      toast(`Olvidaste ${mv.name} y aprendiste ${newMove.name}.`);
      processLevelUpQueue();
      saveGame();
    };
    list.appendChild(row);
  });
  $("btnSkipLearn").onclick = ()=>{
    $("learnOverlay").classList.add("hidden");
    if(!player.declinedMoveIds) player.declinedMoveIds = new Set();
    player.declinedMoveIds.add(newMove.id);
    toast(`Decidiste no aprender ${newMove.name} por ahora.`);
    processLevelUpQueue();
    saveGame();
  };
  $("learnOverlay").classList.remove("hidden");
}

/* ============================================================
   7. MULTIJUGADOR POR PROXIMIDAD — tiempo real vía PubNub
   ------------------------------------------------------------
   Por qué el cambio: AppStorage (window.storage) solo existe DENTRO
   de Claude; fuera de ahí (ej. hosteado en Netlify) cada celular
   tiene su propio localStorage y nunca se ven entre sí. PubNub
   ofrece claves de demostración públicas ("demo"/"demo"), sin
   registro, documentadas oficialmente para pruebas: cualquiera que
   se suscriba al mismo canal recibe los mensajes de los demás en
   tiempo real. Esto SÍ viaja por internet entre dispositivos reales.

   - Canal de presencia (broadcast): todos publican y escuchan su
     posición/clase/nivel ahí.
   - Canal personal por jugador (chal-<miId>): retos, duelos e
     intercambios se entregan solo al destinatario.
   ============================================================ */
if(false){
const PN_PRESENCE_CHANNEL = "ronda-gps-rpg-presence-v1";
const PN_STALE_MS = 90000; // se considera "desconectado" tras 90s sin publicar
}
let pubnub = null;
let livePresence = {}; // id -> {id,name,classKey,level,atk,def,spd,lat,lng,ts} (caché local, actualizado en vivo)
const processedMsgIds = new Set();

async function ensurePlayerId(){
  try{
    const res = await AppStorage.get('myId', false);
    if(res && res.value) return res.value;
  }catch(e){ /* aún no existe */ }
  const id = (crypto.randomUUID ? crypto.randomUUID() : 'p'+Math.random().toString(36).slice(2)+Date.now());
  try{ await AppStorage.set('myId', id, false); }catch(e){}
  return id;
}

async function loadFriends(){
  try{
    const res = await AppStorage.get('friends', false);
    if(!res || !res.value) return [];
    return JSON.parse(res.value);
  }catch(e){ return []; }
}
async function saveFriends(){
  try{ await AppStorage.set('friends', JSON.stringify(friends), false); }catch(e){}
}

function calcPower(p){
  return (p.atk||5)*1.1 + (p.def||5)*0.9 + (p.spd||5)*0.7 + (p.level||1)*2.2;
}

function myChallengeChannel(){ return "ronda-gps-rpg-chal-" + myPlayerId; }

/** Inicializa la conexión PubNub y se suscribe al canal de presencia y al propio buzón de retos. */
function initPubNubConnection(){
  if(typeof PubNub === "undefined"){
    console.warn("[MULTIJUGADOR] El SDK de PubNub no cargó (¿bloqueado por red/CSP?). El modo multijugador queda desactivado; el resto del juego sigue funcionando normal.");
    return false;
  }
  try{
    pubnub = new PubNub({ publishKey: "pub-c-b727f3d7-9ef0-42e0-bdcb-627ff468ac93", subscribeKey: "sub-c-79ec0287-ca78-4122-8276-4b4621dc5379", userId: myPlayerId });
    pubnub.addListener({
      status:(s)=>{ /* opcional: console.log('[PubNub status]', s.category); */ },
      message:(evt)=>{
        const msg = evt.message;
        if(!msg) return;
        if(evt.channel === PN_PRESENCE_CHANNEL){
          handlePresenceMessage(msg);
        } else if(evt.channel === myChallengeChannel()){
          handleChallengeMessage(msg);
        } else if(evt.channel.indexOf(PN_BATTLE_PREFIX) === 0){
          handleBattleChannelMessage(evt.channel, msg);
        } else if(evt.channel.indexOf(PN_PARTY_PREFIX) === 0){
          handlePartyChannelMessage(evt.channel, msg);
        } else if(evt.channel === PN_LOOKUP_CHANNEL){
          handleLookupMessage(msg);
        } else if(evt.channel === PN_ANNOUNCE_CHANNEL){
          handleAnnounceMessage(msg);
        } else if(evt.channel === PN_MAP_EDITS_CHANNEL){
          handleMapEditsMessage(msg);
        }
      }
    });
    pubnub.subscribe({channels:[PN_PRESENCE_CHANNEL, myChallengeChannel(), PN_LOOKUP_CHANNEL, PN_ANNOUNCE_CHANNEL, PN_MAP_EDITS_CHANNEL]});
    return true;
  }catch(e){
    console.warn("[MULTIJUGADOR] No se pudo iniciar PubNub:", e);
    return false;
  }
}

function handlePresenceMessage(msg){
  if(!msg.id || msg.id === myPlayerId) return;
  livePresence[msg.id] = msg;
  renderNearbyPlayersFromCache();
}

/** Publica mi posición/estadísticas actuales en el canal de presencia compartido. */
function publishPresence(){
  if(!pubnub || !playerLatLng || !player || !myPlayerId) return;
  pubnub.publish({
    channel: PN_PRESENCE_CHANNEL,
    storeInHistory:false,
    message:{
      id: myPlayerId, name: player.name, classKey: player.classKey, level: player.level, gender: player.gender,
      atk: player.atk, matk: player.matk, def: player.def, spd: player.spd, dir: playerFacingDir || "down",
      lat: playerLatLng.lat, lng: playerLatLng.lng, ts: Date.now(),
      mapAuraClass: activeDungeonMapAuraClass(), // set completo de mazmorra puesto -> otros jugadores cercanos ven la misma aura
    }
  }).catch(e=>{
    // puede fallar de forma pasajera (red, firewall/filtro que bloquea el dominio de PubNub, etc.) —
    // solo lo avisamos una vez por sesión para no llenar la consola ni mandar el mismo aviso repetido.
    if(!window._multiplayerIssueWarned){
      window._multiplayerIssueWarned = true;
      toast("⚠️ El multijugador no responde en este momento. El resto del juego sigue funcionando normal.", 5000);
    }
  });
}

/** Recalcula y dibuja en el mapa los jugadores cercanos usando la caché local en vivo. */
function renderNearbyPlayersFromCache(){
  if(!playerLatLng) return;
  const now = Date.now();
  Object.keys(livePresence).forEach(id=>{ if(now - (livePresence[id].ts||0) > PN_STALE_MS) delete livePresence[id]; });

  const seen = new Set();
  Object.values(livePresence).forEach(p=>{
    const d = distMeters(playerLatLng, p);
    if(d > 400) return; // fuera de rango de proximidad
    seen.add(p.id);
    const otherPortrait = (CLASS_PORTRAITS[p.classKey]||{})[p.gender === "f" ? "f" : "m"];
    const otherWalkSet = (CLASS_WALK_SPRITES[p.classKey]||{})[p.gender === "f" ? "f" : "m"];
    const otherDirImg = otherWalkSet && otherWalkSet[p.dir||"down"];
    const emoji = (CLASSES[p.classKey]||{}).emoji || "🧑";
    const fallbackSrc = otherPortrait ? otherPortrait.map : "";
    const opInner = otherDirImg
      ? `<img src="${otherDirImg}" class="mini-portrait" alt="" onerror="${fallbackSrc?`if(this.src!=='${fallbackSrc}'){this.src='${fallbackSrc}';}else{this.replaceWith(Object.assign(document.createElement('div'),{className:'op-emoji',textContent:'${emoji}'}));}`:`this.replaceWith(Object.assign(document.createElement('div'),{className:'op-emoji',textContent:'${emoji}'}));`}">`
      : otherPortrait ? `<img src="${otherPortrait.map}" class="mini-portrait" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'op-emoji',textContent:'${emoji}'}));">`
      : `<div class="op-emoji">${emoji}</div>`;
    if(nearbyPlayerMarkers[p.id]){
      nearbyPlayerMarkers[p.id].data = p;
      nearbyPlayerMarkers[p.id].marker.setLatLng([p.lat, p.lng]);
      const el = nearbyPlayerMarkers[p.id].marker.getElement();
      const img = el && el.querySelector(".mini-portrait");
      if(img && otherDirImg) img.src = otherDirImg;
      const wrap = el && el.querySelector(".op-marker");
      if(wrap){
        wrap.classList.forEach(c=>{ if(c.startsWith("me-marker-aura-")) wrap.classList.remove(c); });
        if(p.mapAuraClass) wrap.classList.add(p.mapAuraClass);
      }
    } else {
      const icon = L.divIcon({className:'', html:`<div class="op-marker${p.mapAuraClass ? " "+p.mapAuraClass : ""}" style="position:relative;">
          <div class="me-marker-dark-flame"></div>
          <div class="op-ring"></div>${opInner}
          <div class="op-tag">${p.name} · Nv.${p.level}</div></div>`, iconSize:[46,50], iconAnchor:[23,30]});
      const marker = L.marker([p.lat,p.lng], {icon, zIndexOffset:900}).addTo(map);
      marker.on('click', ()=> openPlayerAction(nearbyPlayerMarkers[p.id].data));
      nearbyPlayerMarkers[p.id] = {marker, data:p};
    }
  });
  Object.keys(nearbyPlayerMarkers).forEach(id=>{
    if(!seen.has(id)){ map.removeLayer(nearbyPlayerMarkers[id].marker); delete nearbyPlayerMarkers[id]; }
  });
  return seen.size;
}

/** Botón "Buscar personas": publica mi posición ya mismo y refresca la búsqueda, sin esperar al ciclo automático. */
function manualScanForPlayers(){
  if(!pubnub){
    toast("El multijugador no está disponible en este momento (no se pudo conectar).", 4000);
    return;
  }
  if(!playerLatLng){
    toast("Primero muévete en el mapa (GPS o toque) para tener una posición.", 3500);
    return;
  }
  toast("🔎 Buscando personas cerca…", 1800);
  publishPresence();
  setTimeout(()=>{
    const count = renderNearbyPlayersFromCache();
    if(count > 0) toast(`✅ ${count} jugador(es) detectado(s) cerca de ti.`, 3500);
    else toast("No se detectó a nadie más a menos de 400 m ahora mismo. Pídele a la otra persona que también toque 'Buscar personas'.", 5000);
  }, 1600); // pequeño margen para que lleguen las respuestas de otros clientes
}

function openPlayerAction(p){
  selectedNearbyPlayer = p;
  $("paEmoji").textContent = (CLASSES[p.classKey]||{}).emoji || "🧑";
  $("paName").textContent = p.name;
  $("paMeta").textContent = `${(CLASSES[p.classKey]||{}).name || "Aventurero"} · Nv. ${p.level}`;
  $("playerActionOverlay").classList.remove("hidden");
}
$("btnClosePlayerAction").onclick = ()=> $("playerActionOverlay").classList.add("hidden");

$("btnChallenge").onclick = ()=>{
  const target = selectedNearbyPlayer;
  $("playerActionOverlay").classList.add("hidden");
  sendBattleInvite(target);
};

$("btnAddFriend").onclick = ()=>{
  const target = selectedNearbyPlayer;
  $("playerActionOverlay").classList.add("hidden");
  if(friends.some(f=>f.id===target.id)){
    toast(`${target.name} ya está en tu lista de amigos.`);
    return;
  }
  sendFriendRequest(target.id, target.name);
};

/* ---------- Solicitudes de amistad (con aceptación real de la otra persona) ---------- */
function sendFriendRequest(targetId, targetName){
  writeChallenge(targetId, 'friend_request', {
    fromName: player.name, fromClass: player.classKey, fromLevel: player.level, fromGender: player.gender
  });
  toast(`👥 Solicitud de amistad enviada a ${targetName}.`, 3500);
}

/* ---------- Notificaciones persistentes (solicitudes de amistad / grupo) ----------
   No dependen solo del aviso emergente: si lo cierras sin querer, siguen esperando en la campanita. */
let pendingNotifications = [];
function addPendingNotification(notif){
  notif.id = notif.id || ('n'+Math.random().toString(36).slice(2,9));
  pendingNotifications.push(notif);
  updateNotifBell();
  return notif.id;
}
function removePendingNotification(id){
  pendingNotifications = pendingNotifications.filter(n=>n.id!==id);
  updateNotifBell();
}
function updateNotifBell(){
  const badge = $("notifBellBadge");
  if(!badge) return;
  badge.classList.remove("hidden"); // la campana siempre se ve — es el lugar donde estarán, haya o no
  const countEl = $("notifBellCount");
  if(pendingNotifications.length===0){
    countEl.classList.add("hidden");
  } else {
    countEl.classList.remove("hidden");
    countEl.textContent = pendingNotifications.length;
  }
}
function renderNotifPanel(){
  const list = $("notifPanelList");
  list.innerHTML = "";
  if(pendingNotifications.length===0){
    list.innerHTML = `<div class="empty-note">No tienes notificaciones pendientes.</div>`;
    return;
  }
  pendingNotifications.forEach(n=>{
    const row = document.createElement("div");
    row.className = "inv-item";
    row.innerHTML = `<div class="ie">${n.emoji}</div>
      <div class="it">${escapeHtml(n.title)}<small>${escapeHtml(n.sub)}</small></div>
      <button data-act="accept" style="margin-right:4px;">✔</button>
      <button data-act="decline" style="background:var(--danger);">✕</button>`;
    row.querySelector('[data-act="accept"]').onclick = ()=>{
      removePendingNotification(n.id);
      $("notifPanelOverlay").classList.add("hidden");
      n.onAccept();
    };
    row.querySelector('[data-act="decline"]').onclick = ()=>{
      removePendingNotification(n.id);
      if(n.onDecline) n.onDecline();
      renderNotifPanel();
    };
    list.appendChild(row);
  });
}
$("notifBellBadge").onclick = (e)=>{
  e.stopPropagation();
  renderNotifPanel();
  $("notifPanelOverlay").classList.remove("hidden");
};
$("btnCloseNotifPanel").onclick = ()=> $("notifPanelOverlay").classList.add("hidden");

function handleFriendRequest(c){
  if(friends.some(f=>f.id===c.fromId)){
    // ya son amigos: confirma automáticamente sin volver a preguntar
    writeChallenge(c.fromId, 'friend_accept', {fromName:player.name, fromClass:player.classKey, fromLevel:player.level, fromGender:player.gender});
    return;
  }
  const emoji = (CLASSES[c.fromClass]||{}).emoji || "👥";
  const subText = `${c.fromName} (Nv. ${c.fromLevel}) quiere agregarte como amigo.`;
  const doAccept = async ()=>{
    friends.push({id:c.fromId, name:c.fromName, classKey:c.fromClass, level:c.fromLevel, gender:c.fromGender});
    await saveFriends();
    writeChallenge(c.fromId, 'friend_accept', {fromName:player.name, fromClass:player.classKey, fromLevel:player.level, fromGender:player.gender});
    toast(`👥 Ahora ${c.fromName} es tu amigo.`);
  };
  const notifId = addPendingNotification({emoji, title:"Solicitud de amistad", sub:subText, onAccept:doAccept});
  $("noticeEmoji").textContent = emoji;
  $("noticeTitle").textContent = "¡Solicitud de amistad!";
  $("noticeSub").textContent = subText;
  $("noticeActions").innerHTML = `<button class="primarybtn" id="btnAcceptFriend" style="margin-bottom:8px;">👥 Aceptar</button>
    <button class="ghostbtn" id="btnDeclineFriend" style="margin-bottom:8px;">Declinar</button>`;
  $("noticeOverlay").classList.remove("hidden");
  $("btnAcceptFriend").onclick = ()=>{
    $("noticeOverlay").classList.add("hidden");
    removePendingNotification(notifId);
    doAccept();
  };
  $("btnDeclineFriend").onclick = ()=>{
    $("noticeOverlay").classList.add("hidden");
    removePendingNotification(notifId);
  };
}

async function handleFriendAccept(c){
  if(friends.some(f=>f.id===c.fromId)) return;
  friends.push({id:c.fromId, name:c.fromName, classKey:c.fromClass, level:c.fromLevel, gender:c.fromGender});
  await saveFriends();
  toast(`👥 ${c.fromName} aceptó tu solicitud de amistad.`);
}

/* ---------- Agregar amigos por código ---------- */
function handleLookupMessage(msg){
  if(!msg || msg.type !== 'code_lookup' || !player) return;
  if(msg.fromId === myPlayerId) return;
  if((msg.code||"").trim().toLowerCase() === (player.friendCode||"").trim().toLowerCase()){
    const emoji = "👥";
    const fromName = msg.fromName || "un jugador";
    const subText = `${fromName} te encontró por tu código de amigo y quiere agregarte.`;
    const doAccept = ()=> sendFriendRequest(msg.fromId, fromName);
    const notifId = addPendingNotification({emoji, title:"¡Alguien quiere agregarte!", sub:subText, onAccept:doAccept});
    $("noticeEmoji").textContent = emoji;
    $("noticeTitle").textContent = "¡Alguien quiere agregarte!";
    $("noticeSub").textContent = subText;
    $("noticeActions").innerHTML = `<button class="primarybtn" id="btnAcceptLookup" style="margin-bottom:8px;">👥 Aceptar</button>
      <button class="ghostbtn" id="btnDeclineLookup" style="margin-bottom:8px;">Declinar</button>`;
    $("noticeOverlay").classList.remove("hidden");
    $("btnAcceptLookup").onclick = ()=>{
      $("noticeOverlay").classList.add("hidden");
      removePendingNotification(notifId);
      doAccept();
    };
    $("btnDeclineLookup").onclick = ()=>{
      $("noticeOverlay").classList.add("hidden");
      removePendingNotification(notifId);
    };
  }
}
$("btnAddByCode").onclick = ()=>{
  const code = $("friendCodeInput").value.trim();
  if(!code) return;
  if(code.toLowerCase() === (player.friendCode||"").toLowerCase()){ toast("Ese es tu propio código 🙂"); return; }
  if(!pubnub){ toast("El multijugador no está conectado ahora mismo.", 3500); return; }
  pubnub.publish({channel: PN_LOOKUP_CHANNEL, storeInHistory:false, message:{type:'code_lookup', code, fromId:myPlayerId, fromName:player.name}})
    .catch(e=>{
      console.warn("[MULTIJUGADOR] no se pudo enviar la búsqueda:", e);
      toast("⚠️ No se pudo conectar con el multijugador. Si esto sigue pasando, prueba con datos móviles en vez de wifi.", 4500);
    });
  toast(`Buscando a "${code}"… si está en línea, le llegará tu solicitud de amistad.`, 4200);
  $("friendCodeInput").value = "";
};

$("btnTrade").onclick = ()=>{
  tradeTargetPlayer = selectedNearbyPlayer;
  $("playerActionOverlay").classList.add("hidden");
  renderTradePicker();
  $("tradePickOverlay").classList.remove("hidden");
};
$("btnCancelTrade").onclick = ()=> $("tradePickOverlay").classList.add("hidden");

function renderTradePicker(){
  const list = $("tradeItemList");
  list.innerHTML = "";
  if(player.inventory.length===0){
    list.innerHTML = `<div class="empty-note">No tienes objetos para enviar todavía.</div>`;
    return;
  }
  player.inventory.forEach((it, idx)=>{
    const row = document.createElement("div");
    row.className = "inv-item";
    row.innerHTML = `<div class="ie">${iconFor(it)}</div><div class="it">${it.name}<small>${it.desc}</small></div><button>Enviar</button>`;
    row.querySelector("button").onclick = ()=>{
      $("tradePickOverlay").classList.add("hidden");
      writeChallenge(tradeTargetPlayer.id, 'intercambio', {
        fromName: player.name, fromClass: player.classKey, item: it
      });
      player.inventory.splice(idx,1);
      refreshHud(); saveGame();
      toast(`🎁 Le enviaste ${it.name} a ${tradeTargetPlayer.name}.`);
    };
    list.appendChild(row);
  });
}

/** Envía un reto/regalo directo al canal personal del destinatario (entrega casi instantánea). */
function writeChallenge(toId, type, payload, opts){
  if(!pubnub) { toast("No se pudo enviar: el multijugador no está conectado.", 3500); return; }
  const cid = 'c'+Math.random().toString(36).slice(2,10);
  pubnub.publish({
    channel: "ronda-gps-rpg-chal-" + toId,
    storeInHistory: !!(opts && opts.storeInHistory),
    message: {id:cid, type, ...payload, fromId: myPlayerId, createdAt: Date.now()}
  }).catch(e=> console.warn("[MULTIJUGADOR] Error enviando reto/intercambio:", e));
}

/* ============================================================
   7b. COMBATE PvP POR TURNOS (sincronizado, "lockstep" vía PubNub)
   ------------------------------------------------------------
   Diseño: en vez de que un cliente arbitre el resultado y se lo
   comunique al otro (frágil si se pierde un mensaje), AMBOS clientes
   calculan el mismo resultado de forma independiente. Cada celular
   solo transmite qué movimiento eligió; el daño, los críticos, el
   orden de turno, etc. se calculan localmente con un generador de
   números aleatorios sembrado (seededRandom) con battleId+turno, así
   que ambos obtienen exactamente los mismos números.

   Roles: 'A' = quien envía el reto (challenger), 'B' = quien acepta.
   Esto es fijo durante toda la batalla y ambos clientes lo conocen.
   ============================================================ */
function pvpChannel(battleId){ return PN_BATTLE_PREFIX + battleId; }

function isBusyWithBattle(){ return !!(battleState || pvp || outgoingInvite || groupBattle); }

/** Paso 1: A envía la invitación al canal personal de B. */
function sendBattleInvite(target){
  if(!pubnub){ toast("El multijugador no está conectado ahora mismo.", 3500); return; }
  if(isBusyWithBattle()){ toast("Termina tu combate/invitación actual antes de retar a alguien más.", 3500); return; }
  const battleId = 'b'+Math.random().toString(36).slice(2,10);
  pubnub.subscribe({channels:[pvpChannel(battleId)]}); // me suscribo antes de invitar, para no perderme la respuesta
  outgoingInvite = {battleId, toId:target.id, toName:target.name, timeoutId:null};
  writeChallenge(target.id, 'battle_invite', {
    battleId, fromName:player.name, fromClass:player.classKey, fromGender:player.gender, fromLevel:player.level,
    maxHp:player.maxHp, maxMp:player.maxMp, atk:player.atk, matk:player.matk, def:player.def, spd:player.spd
  });
  toast(`⚔️ Invitación de duelo enviada a ${target.name}. Esperando respuesta…`, 4000);
  outgoingInvite.timeoutId = setTimeout(()=>{
    if(outgoingInvite && outgoingInvite.battleId === battleId){
      toast(`${target.name} no respondió al duelo.`, 4000);
      if(pubnub) pubnub.unsubscribe({channels:[pvpChannel(battleId)]});
      outgoingInvite = null;
    }
  }, 20000);
}

/** Paso 2 (lado de B): llega la invitación; se muestra accept/decline. */
function handleBattleInvite(c){
  if(isBusyWithBattle() || incomingInvite){
    writeChallenge(c.fromId, 'battle_decline', {battleId:c.battleId}); // ocupado: declino automáticamente
    return;
  }
  incomingInvite = c;
  $("noticeEmoji").textContent = (CLASSES[c.fromClass]||{}).emoji || "⚔️";
  $("noticeTitle").textContent = "¡Te retaron a un duelo!";
  $("noticeSub").textContent = `${c.fromName} (Nv. ${c.fromLevel}) quiere luchar contigo por turnos.`;
  $("noticeActions").innerHTML = `<button class="primarybtn" id="btnAcceptBattle" style="margin-bottom:8px;">⚔️ Aceptar duelo</button>
    <button class="ghostbtn" id="btnDeclineBattle" style="margin-bottom:8px;">Declinar</button>`;
  $("noticeOverlay").classList.remove("hidden");
  $("btnAcceptBattle").onclick = ()=>{ $("noticeOverlay").classList.add("hidden"); acceptBattleInvite(c); };
  $("btnDeclineBattle").onclick = ()=>{
    $("noticeOverlay").classList.add("hidden");
    writeChallenge(c.fromId, 'battle_decline', {battleId:c.battleId});
    incomingInvite = null;
  };
}

/** Paso 3 (lado de B): acepta, se suscribe al canal de batalla y arranca localmente. */
function acceptBattleInvite(c){
  incomingInvite = null;
  pubnub.subscribe({channels:[pvpChannel(c.battleId)]});
  writeChallenge(c.fromId, 'battle_accept', {
    battleId:c.battleId, fromName:player.name, fromClass:player.classKey, fromGender:player.gender, fromLevel:player.level,
    maxHp:player.maxHp, maxMp:player.maxMp, atk:player.atk, matk:player.matk, def:player.def, spd:player.spd
  });
  startPvpBattle({
    battleId: c.battleId, role: 'B',
    opponent: {id:c.fromId, name:c.fromName, classKey:c.fromClass, gender:c.fromGender||'m', level:c.fromLevel,
      maxHp:c.maxHp, maxMp:c.maxMp, atk:c.atk, matk:c.matk||0, def:c.def, spd:c.spd}
  });
}

/** Paso 4 (lado de A): llega la aceptación; arranca localmente con los datos reales de B. */
function handleBattleAccept(c){
  if(!outgoingInvite || outgoingInvite.battleId !== c.battleId) return; // ya no relevante (expiró, etc.)
  clearTimeout(outgoingInvite.timeoutId);
  const opponent = {id:c.fromId, name:c.fromName, classKey:c.fromClass, gender:c.fromGender||'m', level:c.fromLevel,
    maxHp:c.maxHp, maxMp:c.maxMp, atk:c.atk, matk:c.matk||0, def:c.def, spd:c.spd};
  outgoingInvite = null;
  startPvpBattle({battleId:c.battleId, role:'A', opponent});
}

function handleBattleDecline(c){
  if(!outgoingInvite || outgoingInvite.battleId !== c.battleId) return;
  clearTimeout(outgoingInvite.timeoutId);
  if(pubnub) pubnub.unsubscribe({channels:[pvpChannel(c.battleId)]});
  toast(`${outgoingInvite ? outgoingInvite.toName : "El jugador"} declinó tu invitación de duelo.`, 4000);
  outgoingInvite = null;
}

/** Mensajes dentro del canal privado de la batalla en curso (movimientos, rendiciones). */
function handleBattleChannelMessage(channel, msg){
  if(!pvp || channel !== pvp.channel || msg.battleId !== pvp.battleId) return;
  if(msg.type === 'move' && msg.turn === pvp.turn){
    pvp.pendingMoves[msg.role] = msg.moveId;
    if(msg.petInfo) pvp.pendingPetInfo[msg.role] = msg.petInfo;
    if(msg.gestures) pvp.pendingGestures[msg.role] = msg.gestures;
    maybeResolvePvpTurn();
  } else if(msg.type === 'wager'){
    pvp.pendingWagers = pvp.pendingWagers || {};
    pvp.pendingWagers[msg.role] = {gold: msg.gold||0, itemIds: msg.itemIds||[]};
    maybeStartAfterWagers();
  } else if(msg.type === 'concede'){
    if(msg.role === pvp.role) return; // eco de mi propia rendición, ya la manejé localmente
    const oppRole = pvp.role==='A' ? 'B':'A';
    pvp.hp[oppRole] = 0; // quien envió esto se rindió
    finishPvpBattle();
  }
}

/* ---------- Helpers de rol ---------- */
function oppRoleOf(role){ return role==='A' ? 'B' : 'A'; }
function classKeyFor(side){ return side===pvp.role ? player.classKey : pvp.opponent.classKey; }
function nameFor(side){ return side===pvp.role ? player.name : pvp.opponent.name; }
function maxHpFor(side){ return side===pvp.role ? player.maxHp : pvp.opponent.maxHp; }
function baseAtkFor(side){
  if(side !== pvp.role) return pvp.opponent.atk;
  const nightBonus = (isEspadaLunarEquipped() && isNightTime()) ? 1.3 : 1;
  return player.atk * nightBonus;
}
function baseMatkFor(side){ return side===pvp.role ? (player.matk||0) : (pvp.opponent.matk||0); }
function baseDefFor(side){ return side===pvp.role ? player.def : pvp.opponent.def; }
function baseSpdFor(side){ return side===pvp.role ? player.spd : pvp.opponent.spd; }
function findMoveById(side, id){
  const ck = classKeyFor(side);
  const pool = (CLASSES[ck]||{}).movePool || [];
  return pool.find(m=>m.id===id);
}
function elFor(side){ return side===pvp.role ? "spritePlayer" : "spriteEnemy"; }

function startPvpBattle({battleId, role, opponent}){
  if(battleState){ toast("Termina tu combate actual antes de iniciar un duelo."); return; }
  const oppRole = oppRoleOf(role);
  pvp = {
    battleId, role, channel: pvpChannel(battleId), opponent,
    turn: 1,
    hp: { [role]: player.maxHp, [oppRole]: opponent.maxHp },
    mp: { [role]: player.maxMp, [oppRole]: opponent.maxMp },
    buffs: { A:{atk:1,def:1,spd:1,turnsAtk:0,turnsDef:0}, B:{atk:1,def:1,spd:1,turnsAtk:0,turnsDef:0} },
    pendingMoves: {},
    pendingPetInfo: {},
    pendingGestures: {},
    pets: { A:null, B:null }, // info visual/estadística de la mascota que cada lado haya invocado (si alguna)
    pendingWagers: {},
    wager: null,
    started: false,
    selectedWagerItems: [],
    turnTimeout: null,
    wagerTimeout: null
  };
  renderWagerPicker();
  $("wagerOverlay").classList.remove("hidden");
}

/* ---------- Apuesta previa al duelo (oro y/o ítems) ---------- */
function renderWagerPicker(){
  $("wagerMaxGold").textContent = player.gold;
  const input = $("wagerGoldInput");
  input.max = player.gold; input.value = 0;
  pvp.selectedWagerItems = [];
  const list = $("wagerItemList");
  list.innerHTML = "";
  if(player.inventory.length===0){
    list.innerHTML = `<div class="empty-note">No tienes ítems para apostar (puedes apostar solo oro, o nada).</div>`;
  } else {
    player.inventory.forEach((it, idx)=>{
      const row = document.createElement("div");
      row.className = "inv-item";
      row.style.cursor = "pointer";
      row.innerHTML = `<div class="ie">${iconFor(it)}</div><div class="it">${it.name}<small>${it.desc}</small></div><span id="wsel-${idx}" style="font-size:18px;">⬜</span>`;
      row.onclick = ()=>{
        const i = pvp.selectedWagerItems.indexOf(idx);
        if(i>=0){ pvp.selectedWagerItems.splice(i,1); $("wsel-"+idx).textContent = "⬜"; }
        else { pvp.selectedWagerItems.push(idx); $("wsel-"+idx).textContent = "✅"; }
      };
      list.appendChild(row);
    });
  }
  $("wagerWaitingNote").classList.add("hidden");
  $("btnConfirmWager").disabled = false;
  $("btnConfirmWager").textContent = "Confirmar apuesta";
}

$("btnConfirmWager").onclick = ()=>{
  if(!pvp || pvp.started) return;
  let gold = parseInt($("wagerGoldInput").value, 10);
  if(isNaN(gold) || gold<0) gold = 0;
  if(gold > player.gold) gold = player.gold; // nunca más de lo que se tiene
  const itemIds = (pvp.selectedWagerItems||[]).map(idx=> player.inventory[idx] && player.inventory[idx].id).filter(Boolean);

  pvp.pendingWagers = pvp.pendingWagers || {};
  pvp.pendingWagers[pvp.role] = {gold, itemIds};
  $("btnConfirmWager").disabled = true;
  $("btnConfirmWager").textContent = "Esperando…";
  $("wagerWaitingNote").classList.remove("hidden");

  pubnub.publish({
    channel: pvp.channel, storeInHistory:false,
    message: {type:'wager', battleId:pvp.battleId, role:pvp.role, gold, itemIds}
  }).catch(e=> console.warn("[PVP] Error enviando apuesta:", e));

  clearTimeout(pvp.wagerTimeout);
  pvp.wagerTimeout = setTimeout(()=>{
    if(pvp && !pvp.started){
      toast("El rival no confirmó su apuesta a tiempo. Duelo cancelado.", 4500);
      $("wagerOverlay").classList.add("hidden");
      if(pubnub) pubnub.unsubscribe({channels:[pvp.channel]});
      pvp = null;
    }
  }, 25000);

  maybeStartAfterWagers();
};

/** Cuando ambas apuestas llegaron, se descuentan localmente y arranca el combate real. */
function maybeStartAfterWagers(){
  if(!pvp || pvp.started) return;
  const w = pvp.pendingWagers || {};
  if(!w.A || !w.B) return;
  clearTimeout(pvp.wagerTimeout);
  pvp.wager = w;
  pvp.started = true;

  const mine = w[pvp.role];
  player.gold -= mine.gold;
  mine.itemIds.forEach(id=>{
    const idx = player.inventory.findIndex(it=>it.id===id);
    if(idx>=0) player.inventory.splice(idx,1);
  });
  refreshHud(); saveGame();

  $("wagerOverlay").classList.add("hidden");
  const goldTxt = (w.A.gold||0)+(w.B.gold||0) > 0 ? ` En juego: 💰${(w.A.gold||0)+(w.B.gold||0)}.` : "";
  toast(`⚔️ ¡Apuestas confirmadas! Comienza el duelo.${goldTxt}`, 3500);
  renderPvpBattleUI();
}

function renderPvpBattleUI(){
  $("bPName").textContent = player.name;
  $("bPLvl").textContent = "Nv."+player.level;
  $("bEName").textContent = pvp.opponent.name;
  $("bELvl").textContent = "Nv."+pvp.opponent.level;
  renderPlayerSprite();
  $("spriteEnemy").innerHTML = combatSpriteHtml(pvp.opponent.classKey, pvp.opponent.gender, true);
  updatePvpBars();
  // Mismo motivo que el comentario de abajo sobre el fondo: PvP no pasa por
  // updateBattleSceneBackground(), así que el escenario activo se fija acá directo (siempre el
  // medieval por defecto — un duelo nunca usa el fondo especial del Señor Oscuro).
  activeBattleScene = getBattleSceneConfig(DEFAULT_BATTLE_SCENE_ID);
  logBattle(`¡Comienza el duelo contra ${pvp.opponent.name}! (Turno 1)`, true);
  renderPvpMoveGrid();
  // PvP no usa battleState (usa su propio objeto `pvp`) — el fondo especial de la mazmorra/niebla
  // oscura solo aplica a combates PvE, así que acá siempre se limpia directo en vez de llamar a
  // updateBattleSceneBackground() (que leería el battleState de un combate PvE anterior). La
  // lluvia sí es pareja para cualquier tipo de combate (es del clima real, no de battleState).
  $("battleWrap").classList.remove("senor-oscuro-bg");
  updateBattleRainFx();
  $("battleWrap").classList.remove("hidden");
  // recién ACÁ, con #battleWrap ya visible, tiene sentido medir .stage (antes mide 0×0).
  refreshBattleStagePerspective("solo", false);
  playBattleEntranceFx();
  playCharacterSlideInFx(); // el retraso hasta que se revele la escena vive en el CSS (animation-delay), no acá
}

function updatePvpBars(){
  const oppRole = oppRoleOf(pvp.role);
  $("bPHp").style.width = pct(pvp.hp[pvp.role], player.maxHp)+"%";
  $("bPMp").style.width = pct(pvp.mp[pvp.role], player.maxMp)+"%";
  $("bEHp").style.width = pct(pvp.hp[oppRole], pvp.opponent.maxHp)+"%";
}

function renderPvpMoveGrid(){
  const grid = $("movegrid");
  grid.innerHTML = "";
  getAllUsableMoves().forEach((mv)=>{
    const btn = document.createElement("button");
    btn.className = "move-btn" + (mv.type==="buff"?" buff":"") + (mv.isUltimate?" ultimate-move":"");
    const canAfford = canAffordMove(mv, pvp.mp[pvp.role], pvp.hp[pvp.role], maxHpFor(pvp.role));
    btn.disabled = !canAfford;
    const costLabel = mv.costsAllMp ? `<span class="move-mp-cost">TODO tu maná</span>` : `<span class="move-mp-cost">MP ${mv.cost||0}</span>`;
    btn.innerHTML = `<div class="mname">${mv.name}${moveTargetIcon(mv)}</div><div class="mmeta">${moveInfoLine(mv)} · ${costLabel}</div>`;
    btn.onclick = ()=> pvpPlayerAction(mv);
    attachMoveTooltip(btn, mv);
    grid.appendChild(btn);
  });
  const itemBtn = document.createElement("button");
  itemBtn.className = "flee-btn";
  itemBtn.style.borderColor = "var(--accent)";
  itemBtn.style.color = "var(--accent)";
  itemBtn.textContent = "🎒 Usar objeto (gasta el turno)";
  itemBtn.onclick = openBattleInventory;
  grid.appendChild(itemBtn);

  const availablePets = (player.pets||[]).filter(p=> ensurePetStats(p).hp > 0);
  if(!pvp.pets[pvp.role] && availablePets.length){
    const petBtn = document.createElement("button");
    petBtn.className = "flee-btn";
    petBtn.style.borderColor = "#4fd67a";
    petBtn.style.color = "#4fd67a";
    petBtn.textContent = "🐾 Invocar mascota (gasta el turno)";
    petBtn.onclick = openPvpPetSummonPicker;
    grid.appendChild(petBtn);
  }

  const flee = document.createElement("button");
  flee.className = "flee-btn";
  flee.textContent = "🏳️ Rendirse";
  flee.onclick = pvpConcede;
  grid.appendChild(flee);

  startTurnTimer(20, ()=>{
    if(!pvp || pvp.pendingMoves[pvp.role] != null) return;
    const affordable = getAllUsableMoves().filter(mv=> canAffordMove(mv, pvp.mp[pvp.role], pvp.hp[pvp.role], maxHpFor(pvp.role)));
    if(affordable.length){
      logBattle("⏱️ Se acabó tu tiempo — se eligió un movimiento al azar.");
      pvpPlayerAction(affordable[Math.floor(Math.random()*affordable.length)]);
    }
  });
}
function disablePvpMoves(disabled){
  document.querySelectorAll("#movegrid button").forEach(b=> b.disabled = disabled);
}

/** Cuánto tiempo (en ms) te da el juego para tus gestos de ataque/defensa en PvP — mientras más
 *  VEL tengas, más tiempo, tal como pediste: el más ágil reacciona con más margen. */
function pvpGestureTimeMs(spd){
  return Math.round(Math.max(700, Math.min(2400, 900 + spd*14)));
}

/** Reto de defensa en PvP: toca rápido para "prepararte" — si llenas bien la barra, el golpe que
 *  te lleguen este turno (si te llega) pega menos fuerte. Se hace SIEMPRE al elegir tu movimiento,
 *  sin importar si ese turno te van a atacar a ti o no (así no hace falta esperar a ver qué hace el rival). */
function triggerPvpDefenseGesture(onResolve, timeMs){
  const overlay = $("chargeTapOverlay");
  const bar = $("chargeTapBarFill");
  const count = $("chargeTapCount");
  const title = $("chargeTapTitle");
  const btn = $("chargeTapButton");
  const timeBar = $("chargeTapTimeBarFill");
  title.textContent = "🛡️ ¡Toca rápido para defenderte!";
  overlay.classList.remove("hidden");
  bar.style.width = "0%"; count.textContent = "0%";
  if(timeBar) timeBar.style.width = "100%";

  const WINDOW_MS = timeMs || 1200;
  let fillPct = 0, resolved = false;
  function onTap(){
    if(resolved) return;
    fillPct = Math.min(100, fillPct + 14 + Math.random()*8);
    bar.style.width = fillPct+"%"; count.textContent = Math.round(fillPct)+"%";
  }
  function onTouch(e){ e.preventDefault(); onTap(); }
  btn.addEventListener("touchstart", onTouch, {passive:false});
  btn.addEventListener("mousedown", onTap);

  const startTime = Date.now();
  const timeTick = setInterval(()=>{
    const pct = Math.max(0, 100 - (Date.now()-startTime)/WINDOW_MS*100);
    if(timeBar) timeBar.style.width = pct+"%";
  }, 40);

  setTimeout(()=>{
    if(resolved) return;
    resolved = true;
    clearInterval(timeTick);
    overlay.classList.add("hidden");
    btn.removeEventListener("touchstart", onTouch);
    btn.removeEventListener("mousedown", onTap);
    // 0% de toques -> te llevas el golpe completo (1.0); barra llena -> reduces el daño hasta un 30%.
    const defMult = +(1 - Math.min(100,fillPct)/100 * 0.3).toFixed(2);
    onResolve(defMult);
  }, WINDOW_MS);
}

function pvpPlayerAction(mv){
  if(!pvp || pvp.pendingMoves[pvp.role] != null) return; // ya elegí este turno
  if(!canAffordMove(mv, pvp.mp[pvp.role], pvp.hp[pvp.role], maxHpFor(pvp.role))) return;
  clearTurnTimer();
  disablePvpMoves(true);
  const myTimeMs = pvpGestureTimeMs(baseSpdFor(pvp.role));

  const afterGestures = (atkMult, defMult)=>{
    pvp.pendingMoves[pvp.role] = mv.id;
    logBattle(`Elegiste ${mv.name}. Esperando al rival…`);
    pubnub.publish({
      channel: pvp.channel, storeInHistory:false,
      message:{type:'move', battleId:pvp.battleId, turn:pvp.turn, role:pvp.role, moveId:mv.id, gestures:{atkMult, defMult}}
    }).catch(e=> console.warn("[PVP] Error enviando movimiento:", e));
    clearTimeout(pvp.turnTimeout);
    pvp.turnTimeout = setTimeout(handleOpponentTimeout, 30000);
    maybeResolvePvpTurn();
  };

  // Golpes fuertes: primero el gesto de ataque (tocar/deslizar/patrón, según la clase y el movimiento),
  // y luego, siempre, el gesto de defensa — el tiempo de ambos depende de tu VEL. La barra de
  // precisión de Disparo Certero (interactive:"precision") todavía no está cableada acá — el PvP
  // sincroniza el resultado por red con un simple atkMult 0.65/1, y esta barra da 4 resultados
  // distintos + bono de crítico, así que por ahora cae al mismo camino que un movimiento normal
  // (sin minijuego de ataque) en vez de caer por error en el desafío de deslizar.
  if(mv.isUltimate || (mv.interactive && mv.interactive !== "precision")){
    const attackChallenge = mv.isUltimate
      ? (cb)=> triggerUltimateMinigame(mv, cb)
      : mv.interactive==="tap" ? (cb)=> triggerQuickTapChallenge(cb, myTimeMs)
      : mv.interactive==="sweep" ? (cb)=> triggerQuickSweepChallenge(cb, myTimeMs)
      : (cb)=> triggerQuickSwipeChallenge(cb, myTimeMs);
    attackChallenge((atkResult)=>{
      const atkMult = mv.isUltimate ? atkResult : (atkResult ? 1 : 0.65);
      triggerPvpDefenseGesture((defMult)=> afterGestures(atkMult, defMult), myTimeMs);
    });
  } else {
    triggerPvpDefenseGesture((defMult)=> afterGestures(1, defMult), myTimeMs);
  }
}

/** Lista tus mascotas disponibles para invocar en pleno duelo PvP (gasta el turno, igual que un objeto). */
function openPvpPetSummonPicker(){
  const list = $("petSummonList");
  list.innerHTML = "";
  const available = (player.pets||[]).filter(p=> ensurePetStats(p).hp > 0);
  if(available.length===0){
    list.innerHTML = `<div class="empty-note">No tienes mascotas disponibles para invocar.</div>`;
  }
  available.forEach(pet=>{
    // Mismo criterio que openPetSummonPicker: solo las especies con diseño de batalla terminado
    // se pueden invocar por ahora (ver SUMMONABLE_PET_SPECIES en game/config/pets.js).
    const summonable = SUMMONABLE_PET_SPECIES.includes(pet.name);
    const row = document.createElement("div");
    row.className = "cm-item";
    row.innerHTML = `<div style="flex:1;"><span>${pet.emoji} ${petDisplayName(pet)}</span>
      <small style="display:block; color:var(--dim); font-size:10.5px;">Nv.${pet.level} · ${pet.hp}/${pet.maxHp} HP${!summonable?" · aún sin diseño de batalla":""}</small></div>
      <button ${summonable?"":"disabled"}>${summonable?"Invocar":"Solo colección"}</button>`;
    if(summonable){
      row.querySelector("button").onclick = ()=>{ $("petSummonOverlay").classList.add("hidden"); pvpSummonPetChoice(pet); };
    }
    list.appendChild(row);
  });
  $("petSummonOverlay").classList.remove("hidden");
}
/** Envía la invocación de mascota como si fuera un movimiento más — gasta el turno, no ataca. */
function pvpSummonPetChoice(pet){
  if(!pvp || pvp.pendingMoves[pvp.role] != null) return;
  clearTurnTimer();
  const petInfo = {id:pet.id, name:pet.name, emoji:pet.emoji, level:pet.level};
  const moveId = "__pet__:" + pet.id;
  pvp.pendingMoves[pvp.role] = moveId;
  pvp.pets[pvp.role] = petInfo; // se ve de inmediato en mi propio lado, sin esperar el turno
  disablePvpMoves(true);
  logBattle(`🐾 ¡Invocas a ${pet.emoji} ${petDisplayName(pet)}!`);
  renderPvpPetSlot(pvp.role);
  pubnub.publish({
    channel: pvp.channel, storeInHistory:false,
    message:{type:'move', battleId:pvp.battleId, turn:pvp.turn, role:pvp.role, moveId, petInfo}
  }).catch(e=> console.warn("[PVP] Error enviando invocación de mascota:", e));
  clearTimeout(pvp.turnTimeout);
  pvp.turnTimeout = setTimeout(handleOpponentTimeout, 30000);
  maybeResolvePvpTurn();
}
/** Se resuelve cuando a ese lado le tocó invocar mascota este turno: la deja visible y activa su bono de ataque. */
function applyPvpPetSummon(side){
  if(!pvp.pets[side] && pvp.pendingPetInfo[side]) pvp.pets[side] = pvp.pendingPetInfo[side];
  const petInfo = pvp.pets[side];
  if(!petInfo) return;
  const isMe = side === pvp.role;
  logBattle(`🐾 ${isMe ? "Tu" : nameFor(side)+"'s"} mascota ${petInfo.emoji} ${petInfo.name} entra al combate.`);
  renderPvpPetSlot(side);
}
/** Bono de ataque pasivo que aporta tener una mascota invocada en PvP (según su nivel y si es de tipo jefe). */
function petPvpAtkBonus(petInfo){
  const profile = getPetProfile(petInfo.name);
  const base = 4 + (petInfo.level||1) * 1.6;
  return Math.round(profile.isBossPet ? base * 1.8 : base);
}


function renderPvpPetSlot(side){
  const petInfo = pvp.pets[side];
  const isMe = side === pvp.role;
  const elId = isMe ? "petStageSlot" : "oppPetStageSlot";
  const el = $(elId);
  if(!el) return;
  if(!petInfo){ el.classList.add("hidden"); el.innerHTML = ""; return; }
  const spriteSet = PET_SPRITE_SETS[petInfo.name];
  const isBossPet = !!getPetProfile(petInfo.name).isBossPet;
  const sizeStyle = isBossPet ? "height:140px; max-width:130px;" : "height:78px; max-width:80px;";
  let petVisual;
  if(spriteSet && !isMe && spriteSet.petBaseOpponent){
    // ya existe una ilustración propia mirando hacia el otro lado (no hace falta espejarla con CSS)
    petVisual = `<img src="${spriteSet.petBaseOpponent}" data-pet-art="1" data-pet-opponent="1" alt="" style="${sizeStyle} width:auto; display:block;">`;
  } else if(spriteSet){
    const mirror = isMe ? "" : "transform:scaleX(-1);";
    petVisual = `<img src="${spriteSet.petBase}" data-pet-art="1" alt="" style="${sizeStyle} width:auto; display:block; ${mirror}">`;
  } else {
    petVisual = `<span style="font-size:${isBossPet?"84px":"68px"};">${petInfo.emoji}</span>`;
  }
  el.classList.toggle("pet-boss", isBossPet);
  el.innerHTML = `<div class="pet-emoji">${petVisual}</div>
    <div class="pet-hpbar"><div class="pet-hpfill" style="width:100%"></div></div>
    <div class="pet-label">${petInfo.name}${!isMe?" (rival)":""}</div>`;
  el.classList.remove("hidden");
}

/** Usar una poción en pleno duelo PvP: cura/restaura maná pero gasta el turno (no atacas). */
function pvpUseItem(idx){
  if(!pvp || pvp.pendingMoves[pvp.role] != null) return;
  const item = player.inventory[idx];
  if(!item || (item.type!=="heal" && item.type!=="mana")) return;
  $("invOverlay").classList.add("hidden");
  clearTurnTimer();
  player.inventory.splice(idx,1);
  const moveId = "__item__:" + item.id;
  pvp.pendingMoves[pvp.role] = moveId;
  disablePvpMoves(true);
  logBattle(`Usas ${item.emoji} ${item.name} y pasas tu turno de ataque.`);
  refreshHud(); saveGame();
  pubnub.publish({
    channel: pvp.channel, storeInHistory:false,
    message:{type:'move', battleId:pvp.battleId, turn:pvp.turn, role:pvp.role, moveId}
  }).catch(e=> console.warn("[PVP] Error enviando uso de objeto:", e));
  clearTimeout(pvp.turnTimeout);
  pvp.turnTimeout = setTimeout(handleOpponentTimeout, 30000);
  maybeResolvePvpTurn();
}

function maybeResolvePvpTurn(){
  if(!pvp) return;
  if(pvp.pendingMoves.A == null || pvp.pendingMoves.B == null) return; // aún falta alguno
  clearTimeout(pvp.turnTimeout);
  resolvePvpTurn(pvp.pendingMoves.A, pvp.pendingMoves.B);
}

function handleOpponentTimeout(){
  if(!pvp) return;
  const oppRole = oppRoleOf(pvp.role);
  if(pvp.pendingMoves[oppRole] != null) return; // ya llegó, no hacía falta
  logBattle(`${pvp.opponent.name} no respondió a tiempo y se retira del duelo.`);
  pvp.hp[oppRole] = 0;
  finishPvpBattle();
}

/** Aplica el uso de un objeto (cura/maná) de un lado, sin interactuar con el rival. Ambos clientes lo calculan igual. */
function applyPvpItem(side, itemId){
  const tpl = findItemById(itemId);
  if(!tpl) return;
  if(tpl.type==="heal"){
    const maxH = maxHpFor(side);
    const heal = Math.round(maxH*tpl.amount);
    pvp.hp[side] = Math.min(maxH, pvp.hp[side]+heal);
    logBattle(`${nameFor(side)} usa ${tpl.emoji} ${tpl.name} y recupera ${heal} HP.`);
    flashSprite(elFor(side), "green");
  } else if(tpl.type==="mana"){
    const maxM = side===pvp.role ? player.maxMp : pvp.opponent.maxMp;
    const restore = Math.round(maxM*tpl.amount);
    pvp.mp[side] = Math.min(maxM, pvp.mp[side]+restore);
    logBattle(`${nameFor(side)} usa ${tpl.emoji} ${tpl.name} y recupera ${restore} MP.`);
    flashSprite(elFor(side), "green");
  }
}

/** Núcleo determinista: ambos clientes ejecutan EXACTAMENTE este código con los mismos datos de entrada. */
function resolvePvpTurn(moveIdA, moveIdB){
  clearTurnTimer();
  const rng = seededRandom(pvp.battleId + ":" + pvp.turn);
  const isItemA = typeof moveIdA === "string" && moveIdA.indexOf("__item__:")===0;
  const isItemB = typeof moveIdB === "string" && moveIdB.indexOf("__item__:")===0;
  const isPetA = typeof moveIdA === "string" && moveIdA.indexOf("__pet__:")===0;
  const isPetB = typeof moveIdB === "string" && moveIdB.indexOf("__pet__:")===0;
  const moveA = (isItemA || isPetA) ? null : findMoveById('A', moveIdA);
  const moveB = (isItemB || isPetB) ? null : findMoveById('B', moveIdB);
  const moves = {A:moveA, B:moveB};

  if(moveA) pvp.mp.A = Math.max(0, pvp.mp.A - getMoveCost(moveA, pvp.mp.A));
  if(moveB) pvp.mp.B = Math.max(0, pvp.mp.B - getMoveCost(moveB, pvp.mp.B));
  if(moveA && moveA.hpCost) pvp.hp.A = Math.max(1, pvp.hp.A - getMoveHpCost(moveA, maxHpFor('A')));
  if(moveB && moveB.hpCost) pvp.hp.B = Math.max(1, pvp.hp.B - getMoveHpCost(moveB, maxHpFor('B')));

  // Los turnos de objeto se resuelven aparte: curan/restauran a su propio lado y NUNCA atacan.
  if(isItemA) applyPvpItem('A', moveIdA.split(":")[1]);
  if(isItemB) applyPvpItem('B', moveIdB.split(":")[1]);
  // Invocar mascota tampoco ataca este turno — solo la deja visible y da un pequeño bono de ataque de aquí en más.
  if(isPetA) applyPvpPetSummon('A');
  if(isPetB) applyPvpPetSummon('B');

  // El orden lo decide primero un movimiento con ⚡ prioridad (si solo uno de los dos la tiene);
  // si no hay prioridad en juego, decide la VELOCIDAD (con empate resuelto por la semilla compartida).
  const prioA = !!(moveA && moveA.priority), prioB = !!(moveB && moveB.priority);
  let order;
  if(prioA !== prioB){
    order = prioA ? ['A','B'] : ['B','A'];
  } else {
    const spdA = baseSpdFor('A') * pvp.buffs.A.spd;
    const spdB = baseSpdFor('B') * pvp.buffs.B.spd;
    if(spdA === spdB) order = rng() < 0.5 ? ['A','B'] : ['B','A'];
    else order = spdA > spdB ? ['A','B'] : ['B','A'];
  }

  for(const side of order){
    const other = oppRoleOf(side);
    if(pvp.hp[side] <= 0) continue; // este actor ya fue derrotado en este mismo turno
    const mv = moves[side];
    if(!mv) continue; // sin movimiento de ataque este turno (usó un objeto)
    applyPvpMove(side, other, mv, rng);
    if(pvp.hp[other] <= 0) break; // el combate termina apenas alguien cae
  }

  pvp.pendingMoves = {};
  pvp.pendingPetInfo = {};
  pvp.pendingGestures = {};
  pvp.turn++;
  updatePvpBars();

  const oppRole = oppRoleOf(pvp.role);
  if(pvp.hp.A <= 0 || pvp.hp.B <= 0){
    finishPvpBattle();
  } else {
    logBattle(`— Turno ${pvp.turn} —`);
    renderPvpMoveGrid();
  }
}

function applyPvpMove(side, other, mv, rng){
  const actorName = nameFor(side);
  const petBonus = pvp.pets[side] ? petPvpAtkBonus(pvp.pets[side]) : 0;
  const gestureAtk = pvp.pendingGestures[side] ? pvp.pendingGestures[side].atkMult : 1;
  const gestureDef = pvp.pendingGestures[other] ? pvp.pendingGestures[other].defMult : 1;
  const rawAtk = (baseAtkFor(side) + (mv.type==="magic" ? baseMatkFor(side) : 0) + petBonus) * gestureAtk;
  const actorAtk = rawAtk * pvp.buffs[side].atk;

  if(mv.isUltimate){
    playUltimateChargeUp(elFor(side));
    logBattle(`✨ ${actorName} se concentra... ¡usará ${mv.name}!`);
  }
  animateSprite(elFor(side), mv.isUltimate ? "ultimate-strike" : "attackp");
  triggerWeaponAnim(elFor(side));

  if(mv.type === "buff"){
    if(mv.buff==="atk"){ pvp.buffs[side].atk = 1+mv.amount; pvp.buffs[side].turnsAtk = mv.dur; }
    if(mv.buff==="def"){ pvp.buffs[side].def = 1+mv.amount; pvp.buffs[side].turnsDef = mv.dur; }
    if(mv.selfDef){ pvp.buffs[side].def = Math.max(0.3, 1+mv.selfDef); pvp.buffs[side].turnsDef = mv.dur; }
    logBattle(`${actorName} usa ${mv.name}.`);
  } else if(mv.type === "heal"){
    const heal = Math.round(maxHpFor(side)*mv.amount);
    pvp.hp[side] = Math.min(maxHpFor(side), pvp.hp[side]+heal);
    logBattle(`${actorName} usa ${mv.name} y recupera ${heal} HP.`);
    flashSprite(elFor(side), "green");
    spawnFloatingNumber(elFor(side), "+"+heal, "heal");
  } else if(mv.type === "debuff"){
    if(mv.stat==="def") pvp.buffs[other].def = Math.max(0.25, pvp.buffs[other].def*(1-mv.amount));
    if(mv.stat==="atk") pvp.buffs[other].atk = Math.max(0.25, pvp.buffs[other].atk*(1-mv.amount));
    logBattle(`${actorName} usa ${mv.name}. ¡${nameFor(other)} se ve más débil!`);
    animateSprite(elFor(other), "hitshake");
    flashSprite(elFor(other), "red");
  } else {
    const hits = mv.hits||1;
    let total = 0;
    for(let h=0; h<hits; h++){
      let def = baseDefFor(other) * pvp.buffs[other].def;
      if(mv.pierce) def = def*(1-mv.pierce);
      let base = Math.max(1, actorAtk*mv.power - def*0.42);
      const variance = 0.85 + rng()*0.3;
      let dmg = base*variance;
      if(rng() < (mv.crit||0.06)) dmg *= 1.8;
      if(mv.execute && pvp.hp[other] < maxHpFor(other)*0.3) dmg *= 1.4;
      dmg = Math.max(1, Math.round(dmg*1.15*gestureDef));
      pvp.hp[other] = Math.max(0, pvp.hp[other]-dmg);
      total += dmg;
      if(pvp.hp[other] <= 0) break;
    }
    animateSprite(elFor(other), mv.isUltimate ? "ultimate-hit" : "hitshake");
    flashSprite(elFor(other), mv.isUltimate ? "ultimate" : "red");
    maybeShowCrit(total, maxHpFor(other));
    spawnFloatingNumber(elFor(other), "-"+total, (total >= maxHpFor(other)*0.5) ? "crit" : "damage");
    logBattle(`${actorName} usa ${mv.name}: ${total} de daño${hits>1?` (${hits} golpes)`:""}.`);
    if(mv.drain){ const h=Math.round(total*mv.drain); pvp.hp[side]=Math.min(maxHpFor(side), pvp.hp[side]+h); logBattle(`${actorName} absorbe ${h} HP.`); }
    if(mv.stun && rng() < mv.stun){ logBattle(`¡${nameFor(other)} queda aturdido!`); }
    if(mv.slow){ pvp.buffs[other].spd = Math.max(0.3, pvp.buffs[other].spd*(1-mv.slow)); logBattle(`${nameFor(other)} se vuelve más lento.`); }
    if(mv.selfDmg){ const sd=Math.round(maxHpFor(side)*mv.selfDmg); pvp.hp[side]=Math.max(0,pvp.hp[side]-sd); logBattle(`${actorName} se daña ${sd} HP por el esfuerzo.`); }
    if(mv.selfBuffSpd){ pvp.buffs[side].spd = 1+mv.selfBuffSpd; logBattle(`${actorName} aumenta su velocidad.`); }
  }

  // decae la duración de los buffs propios del actor
  if(pvp.buffs[side].turnsAtk>0){ pvp.buffs[side].turnsAtk--; if(pvp.buffs[side].turnsAtk===0) pvp.buffs[side].atk=1; }
  if(pvp.buffs[side].turnsDef>0){ pvp.buffs[side].turnsDef--; if(pvp.buffs[side].turnsDef===0) pvp.buffs[side].def=1; }
}

function pvpConcede(){
  if(!pvp) return;
  clearTurnTimer();
  pubnub.publish({channel:pvp.channel, storeInHistory:false, message:{type:'concede', battleId:pvp.battleId, role:pvp.role}})
    .catch(e=> console.warn("[PVP] Error al enviar rendición:", e));
  pvp.hp[pvp.role] = 0;
  finishPvpBattle();
}

function finishPvpBattle(){
  clearTurnTimer();
  const oppRole = oppRoleOf(pvp.role);
  const iWon = pvp.hp[oppRole] <= 0 && pvp.hp[pvp.role] > 0;
  const charBefore = {level:player.level, xp:player.xp, xpNext:player.xpNext};
  const rewardXp = iWon ? (16 + pvp.opponent.level*4) : 0;
  const rewardGold = iWon ? (8 + pvp.opponent.level*2) : 0;
  if(iWon){ player.xp += rewardXp; player.gold += rewardGold; refreshHud(); }
  const charAfter = simulateXpProgress(charBefore.level, charBefore.xp, charBefore.xpNext, rewardXp);
  logBattle(iWon ? `¡Ganaste el duelo contra ${pvp.opponent.name}!` : `${pvp.opponent.name} ganó el duelo.`);

  // ---- Pago de la apuesta (si se acordó una) ----
  let wagerMsg = "";
  if(pvp.wager && pvp.wager.A && pvp.wager.B){
    const mine = pvp.wager[pvp.role], theirs = pvp.wager[oppRole];
    if(iWon){
      const goldWon = (mine.gold||0) + (theirs.gold||0);
      const wonItemNames = [];
      mine.itemIds.forEach(id=>{ const tpl=findItemById(id); if(tpl) pushItemSafe({...tpl}); }); // recupero lo mío
      theirs.itemIds.forEach(id=>{ const tpl=findItemById(id); if(tpl){ pushItemSafe({...tpl}); wonItemNames.push(tpl.name); } }); // gano lo suyo
      player.gold += goldWon;
      if(goldWon>0 || wonItemNames.length){
        wagerMsg = `<br>💰 Ganaste la apuesta: +${goldWon} oro${wonItemNames.length? " y "+wonItemNames.join(", ") : ""}.`;
      }
    } else if(mine && (mine.gold>0 || mine.itemIds.length>0)){
      wagerMsg = `<br>💸 Perdiste tu apuesta (${mine.gold} oro${mine.itemIds.length? " + objetos":""}).`;
    }
    refreshHud();
  }

  const channel = pvp.channel, opponentName = pvp.opponent.name;
  setTimeout(()=>{
    $("battleWrap").classList.add("hidden");
    $("resultEmoji").textContent = iWon ? "🏆" : "💀";
    $("resultTitle").textContent = iWon ? "¡Duelo ganado!" : "Duelo perdido";
    $("resultSub").innerHTML = (iWon
      ? `Venciste a ${opponentName}. +${rewardXp} XP · +${rewardGold} 💰`
      : `${opponentName} te venció esta vez.`) + wagerMsg;
    $("resultOverlay").classList.remove("hidden");
    if(iWon){
      animateResultProgress({
        char: {
          beforeLevel: charBefore.level, beforeXp: charBefore.xp, beforeXpNext: charBefore.xpNext,
          afterLevel: charAfter.level, afterXp: charAfter.xp, afterXpNext: charAfter.xpNext, gainedLevels: charAfter.gainedLevels
        },
        pet: null
      });
    } else updateResultProgressVisibility(false);
    if(iWon) checkLevelUps();
    saveGame();
    if(pubnub) pubnub.unsubscribe({channels:[channel]});
    pvp = null;
  }, 700);
}

function handleChallengeMessage(c){
  if(!c || !c.id || processedMsgIds.has(c.id)) return;
  processedMsgIds.add(c.id);
  if(c.type === 'battle_invite') return handleBattleInvite(c);
  if(c.type === 'battle_accept') return handleBattleAccept(c);
  if(c.type === 'battle_decline') return handleBattleDecline(c);
  if(c.type === 'party_invite') return handlePartyInvite(c);
  if(c.type === 'friend_request') return handleFriendRequest(c);
  if(c.type === 'friend_accept') return handleFriendAccept(c);
  if(c.type === 'chat_msg') return handleChatMessage(c);
  showNotice(c); // intercambio (regalo) u otros avisos simples
}

function showNotice(c){
  if(c.type === 'duelo'){
    $("noticeEmoji").textContent = c.iWinForTarget ? "🏆" : "💀";
    $("noticeTitle").textContent = c.iWinForTarget ? "¡Ganaste un duelo!" : "Perdiste un duelo";
    $("noticeSub").textContent = `${c.fromName} te retó cerca de ti. ` +
      (c.iWinForTarget ? `Ganaste +${c.rewardXp} XP y +${c.rewardGold} 💰.` : `Esta vez ${c.fromName} se llevó la victoria.`);
    $("noticeActions").innerHTML = "";
    if(c.iWinForTarget){
      player.xp += c.rewardXp; player.gold += c.rewardGold;
      refreshHud(); checkLevelUps(); saveGame();
    }
    $("noticeOverlay").classList.remove("hidden");
  } else if(c.type === 'intercambio'){
    const giftItem = c.item || (c.itemId ? ITEM_TABLE.find(it=>it.id===c.itemId) : null);
    $("noticeEmoji").textContent = (giftItem && giftItem.emoji) || c.itemEmoji || "🎁";
    $("noticeTitle").textContent = "¡Te enviaron un regalo!";
    $("noticeSub").textContent = `${c.fromName} te dio ${(giftItem && giftItem.name) || c.itemName || "un objeto"}.`;
    $("noticeActions").innerHTML = `<button class="primarybtn" id="btnAcceptGift" style="margin-bottom:8px;">Aceptar regalo</button>`;
    $("noticeOverlay").classList.remove("hidden");
    $("btnAcceptGift").onclick = ()=>{
      if(giftItem){
        pushItemSafe({...giftItem});
        toast(`Agregaste ${giftItem.name} a tu inventario.`);
      } else {
        // esto ya no debería pasar con el formato nuevo, pero si llega un mensaje viejo
        // (de antes de este arreglo) sin el objeto completo, avisamos en vez de fingir que se agregó.
        toast(`⚠️ No se pudo recibir el objeto — pídele a ${c.fromName} que te lo reenvíe.`, 4500);
      }
      $("noticeOverlay").classList.add("hidden");
      saveGame();
    };
  }
}
$("btnCloseNotice").onclick = ()=> $("noticeOverlay").classList.add("hidden");

/** ¿Este amigo publicó su posición hace poco (por el multijugador)? Reutiliza la misma caché
 *  de presencia en vivo que ya usa el mapa para mostrar jugadores cercanos — no es un sistema
 *  nuevo, solo se consulta si ese id está ahí y no está vencido. */
function isFriendOnline(friendId){
  const p = livePresence[friendId];
  return !!(p && (Date.now() - (p.ts||0)) <= PN_STALE_MS);
}
function renderFriendsList(){
  const list = $("friendsList");
  list.innerHTML = "";
  if(friends.length===0){
    list.innerHTML = `<div class="empty-note">Aún no tienes amigos agregados. Acércate a otro jugador y toca 👥, o agrégalo por código.</div>`;
    return;
  }
  friends.forEach((f, idx)=>{
    const row = document.createElement("div");
    row.className = "inv-item";
    const online = isFriendOnline(f.id);
    row.innerHTML = `<div class="ie" style="position:relative;">${(CLASSES[f.classKey]||{}).emoji||"🧑"}
        <span class="friend-status-dot ${online?"online":"offline"}" title="${online?"En línea":"Desconectado"}"></span></div>
      <div class="it">${escapeHtml(f.name)}<small>${(CLASSES[f.classKey]||{}).name||""} · Nv. ${f.level}</small></div>
      <button data-act="party" style="margin-right:4px; background:var(--gold); color:#2a1d00;">🛡️</button>
      <button data-act="chat" style="margin-right:4px;">💬</button>
      <button data-act="remove" style="background:var(--danger);">Quitar</button>`;
    row.querySelector('[data-act="party"]').onclick = ()=> sendPartyInvite(f);
    row.querySelector('[data-act="chat"]').onclick = ()=> openChat(f);
    row.querySelector('[data-act="remove"]').onclick = ()=>{
      showConfirm(`¿Quitar a ${escapeHtml(f.name)} de tu lista de amigos?`, async ()=>{
        friends.splice(idx,1);
        await saveFriends();
        renderFriendsList();
        toast(`Quitaste a ${f.name} de tus amigos.`);
      }, {icon:"👥", confirmLabel:"Quitar"});
    };
    list.appendChild(row);
  });
}
$("btnFriends").onclick = ()=>{
  closeFabMenu();
  renderFriendsList();
  $("friendsOverlay").classList.remove("hidden");
};
setInterval(()=>{
  if(!$("friendsOverlay").classList.contains("hidden")) renderFriendsList();
}, 10000); // refresca los puntos de en linea/desconectado cada 10s mientras el panel este abierto
$("btnCloseFriends").onclick = ()=> $("friendsOverlay").classList.add("hidden");

/* ---------- Chat 1:1 con amigos ---------- */
let chatLog = {};       // friendId -> [{from:'me'|'them', text, name, ts}]
let currentChatFriend = null;

function openChat(friend){
  currentChatFriend = friend;
  $("chatWithName").textContent = "💬 " + friend.name;
  renderChatMessages();
  $("chatOverlay").classList.remove("hidden");
}
function renderChatMessages(){
  const wrap = $("chatMessages");
  wrap.innerHTML = "";
  const log = chatLog[currentChatFriend.id] || [];
  if(log.length===0){
    wrap.innerHTML = `<div class="empty-note">Aún no hay mensajes. ¡Salúdalo!</div>`;
    return;
  }
  log.forEach(m=>{
    const b = document.createElement("div");
    b.className = "chat-bubble " + (m.from==="me" ? "me" : "them");
    const time = new Date(m.ts).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
    b.innerHTML = `${escapeHtml(m.text)}<span class="ct">${time}</span>`;
    wrap.appendChild(b);
  });
  wrap.scrollTop = wrap.scrollHeight;
}
function escapeHtml(s){ return String(s??"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }

function sendChatMessage(){
  const input = $("chatInput");
  const text = input.value.trim();
  if(!text || !currentChatFriend) return;
  if(!pubnub){ toast("El multijugador no está conectado ahora mismo.", 3000); return; }
  if(!chatLog[currentChatFriend.id]) chatLog[currentChatFriend.id] = [];
  chatLog[currentChatFriend.id].push({from:"me", text, ts:Date.now()});
  renderChatMessages();
  input.value = "";
  writeChallenge(currentChatFriend.id, 'chat_msg', {text, fromName: player.name});
}
$("btnSendChat").onclick = sendChatMessage;
$("chatInput").addEventListener("keydown", (e)=>{ if(e.key==="Enter") sendChatMessage(); });
$("btnCloseChat").onclick = ()=>{ $("chatOverlay").classList.add("hidden"); currentChatFriend = null; };

function handleChatMessage(c){
  if(!chatLog[c.fromId]) chatLog[c.fromId] = [];
  chatLog[c.fromId].push({from:"them", text:c.text, name:c.fromName, ts:Date.now()});
  if(currentChatFriend && currentChatFriend.id === c.fromId && !$("chatOverlay").classList.contains("hidden")){
    renderChatMessages();
  } else {
    toast(`💬 ${c.fromName}: ${c.text}`, 4000);
  }
}

/* ---------- Menú de opciones (rueda circular) ---------- */
/** btn_menu1 (☰) cerrado / btn_menu2 (✕) abierto — mismo botón, se cambia el src en vez del emoji. */
function setFabToggleIcon(open){
  $("btnFabToggleImg").src = open ? "/new_elements/btn_menu2.png" : "/new_elements/btn_menu1.png";
}
function closeFabMenu(){
  $("fabMenu").classList.remove("open");
  setFabToggleIcon(false);
  $("fabMenuBackdrop").classList.remove("show");
}
$("btnFleeCorner").onclick = ()=>{
  if(battleState && battleState.isDungeon) return dungeonSurrender();
  if(battleState && battleState.isColiseo) return coliseoSurrender();
  if(pvp) return pvpConcede();
  // Bug: acá decía `battleState.isPack` para decidir si mandar a proposeGroupFlee() — pero esa
  // función es para la batalla de GRUPO multijugador, que vive en `groupBattle` (variable aparte,
  // battleState queda en null durante todo un combate de grupo). En manada (battleState.isPack)
  // esto llamaba a proposeGroupFlee() con groupBattle=null, que no hace nada (return inmediato) —
  // por eso el botón no servía en manada. Y en grupo de verdad, `battleState.isPack` explotaba
  // (battleState es null ahí), tirando abajo todo el handler en silencio.
  if(groupBattle) return proposeGroupFlee();
  if(battleState) return fleeBattle();
};

/** Orden fijo de las 8 cuñas del menú radial (mismo orden horario de siempre, arrancando arriba).
 *  `content` es el sufijo de su .wheel-slice-content-N. Mascotas/Bases son "condicionales": solo
 *  entran en el reparto si el jugador ya las desbloqueó — ver layoutWheelMenu(). Ajustes (⚙️) NO
 *  es una cuña — pedido explícito: vive como botón flotante aparte, fuera del anillo (ver
 *  #btnSettingsCorner en index.html/main.css y openSettingsScreen() más abajo). */
const WHEEL_SLOT_ORDER = [
  {btn:"btnFriends", content:0},
  {btn:"btnParty", content:1},
  {btn:"btnAttrs", content:2},
  {btn:"btnBases", content:3, requires:"base"},
  {btn:"btnForge", content:4},
  {btn:"btnEquip", content:5},
  {btn:"btnPets", content:6, requires:"pets"},
  {btn:"btnReturnToMenu", content:7},
];
/** Punto en el círculo del menú (fracción de 0-100, mismo sistema que ya usaba el CSS estático)
 *  a un radio dado y un ángulo en grados, 0°=arriba, sentido horario. */
function wheelPolarPct(radius, deg){
  const rad = deg * Math.PI/180;
  return { x: 50 + radius*Math.sin(rad), y: 50 - radius*Math.cos(rad) };
}
/** Reacomoda el menú radial en tiempo real para que NUNCA quede un sector vacío cuando Mascotas
 *  y/o Bases están ocultas (pedido explícito: "elimina completamente el espacio, que no quede
 *  nada vacío") — las posiciones fijas por CSS (.wheel-slice-N / .wheel-slice-content-N /
 *  .wheel-gem-N / el patrón de líneas divisorias) solo cubrían el caso de las 8 cuñas completas;
 *  acá se recalculan a mano vía trigonometría para cualquier cantidad de cuñas visibles (6, 7 u 8),
 *  repartiéndolas parejo alrededor del círculo completo mientras se mantiene su orden relativo
 *  (ver WHEEL_SLOT_ORDER). Se llama cada vez que se abre el menú (nunca cambia con el menú ya
 *  abierto en pantalla), y de paso hace la revelación con énfasis de una cuña recién desbloqueada
 *  (ver player._justUnlockedPetSlice/_justUnlockedBaseSlice, seteadas en attemptCapture/placeOwnBase). */
function layoutWheelMenu(){
  const hasPets = !!(player.pets && player.pets.length > 0);
  const hasBase = !!player.baseEverPlaced;
  const unlocked = {pets:hasPets, base:hasBase};
  const visible = WHEEL_SLOT_ORDER.filter(slot=> !slot.requires || unlocked[slot.requires]);
  const N = visible.length;
  const step = 360/N;
  const LINE_WIDTH_DEG = 1.2;

  WHEEL_SLOT_ORDER.forEach(slot=>{
    const btn = $(slot.btn);
    const content = document.querySelector(".wheel-slice-content-"+slot.content);
    const show = visible.includes(slot);
    if(btn) btn.style.display = show ? "" : "none";
    if(content) content.style.display = show ? "" : "none";
  });

  visible.forEach((slot, i)=>{
    const centerDeg = i*step;
    const halfStep = step/2;
    const btn = $(slot.btn);
    const content = document.querySelector(".wheel-slice-content-"+slot.content);
    if(btn){
      // subdivide el arco en tramos de ~22.5° (igual que el diseño original de 8 cuñas) para que
      // el borde se vea curvo incluso en arcos más anchos (60° con 6 cuñas, etc.) — mínimo 2 tramos.
      const segments = Math.max(2, Math.round(step/22.5));
      const pts = [];
      for(let s=0; s<=segments; s++){
        const deg = centerDeg - halfStep + (step*s/segments);
        const p = wheelPolarPct(50, deg);
        pts.push(`${p.x.toFixed(2)}% ${p.y.toFixed(2)}%`);
      }
      btn.style.clipPath = `polygon(50% 50%, ${pts.join(", ")})`;
    }
    if(content){
      const p = wheelPolarPct(35, centerDeg); // mismo radio que ya usaban los .wheel-slice-content-N fijos
      content.style.left = p.x.toFixed(2)+"%";
      content.style.top = p.y.toFixed(2)+"%";
    }
  });

  // Gemas divisorias: una por cada borde entre cuñas (N en total) — reusa los 8 elementos
  // .wheel-gem-N que ya existen en el HTML, reposicionando los primeros N y ocultando el resto.
  for(let i=0;i<8;i++){
    const gem = document.querySelector(".wheel-gem-"+i);
    if(!gem) continue;
    if(i < N){
      const p = wheelPolarPct(50, i*step - step/2);
      gem.style.left = p.x.toFixed(2)+"%";
      gem.style.top = p.y.toFixed(2)+"%";
      gem.style.display = "";
    } else {
      gem.style.display = "none";
    }
  }

  // Líneas doradas divisorias del anillo — recalculadas para N cuñas (ver #wheelDividers en
  // main.css, antes un ::before fijo a 8).
  const dividers = $("wheelDividers");
  if(dividers){
    dividers.style.background = `repeating-conic-gradient(from ${(-step/2).toFixed(3)}deg, `
      + `rgba(232,196,104,.55) 0deg ${LINE_WIDTH_DEG}deg, transparent ${LINE_WIDTH_DEG}deg ${step.toFixed(3)}deg)`;
  }

  // Revelación con énfasis de una cuña recién desbloqueada (pop + brillo dorado, una sola vez).
  const petContent = document.querySelector(".wheel-slice-content-6");
  const baseContent = document.querySelector(".wheel-slice-content-3");
  if(hasPets && player._justUnlockedPetSlice && petContent){
    petContent.classList.remove("slice-emphasis"); void petContent.offsetWidth;
    petContent.classList.add("slice-emphasis");
    player._justUnlockedPetSlice = false;
  }
  if(hasBase && player._justUnlockedBaseSlice && baseContent){
    baseContent.classList.remove("slice-emphasis"); void baseContent.offsetWidth;
    baseContent.classList.add("slice-emphasis");
    player._justUnlockedBaseSlice = false;
  }
}
$("btnFabToggle").onclick = ()=>{
  const open = $("fabMenu").classList.toggle("open");
  setFabToggleIcon(open);
  $("fabMenuBackdrop").classList.toggle("show", open);
  if(open) layoutWheelMenu();
};
$("fabMenuBackdrop").onclick = ()=>{
  $("fabMenu").classList.remove("open");
  setFabToggleIcon(false);
  $("fabMenuBackdrop").classList.remove("show");
};

/* ============================================================
   TIENDA ESTÁTICA (permanente, vía menú) — por categorías
   ============================================================ */
if(false){
const SHOP_CATEGORIES = [
  {key:"weapon",    label:"Armas",           test:it=> it.slot==="weapon"},
  {key:"armor",     label:"Armaduras",       test:it=> it.slot==="armor"},
  {key:"helmet",    label:"Cascos",          test:it=> it.slot==="helmet"},
  {key:"boots",     label:"Botas",           test:it=> it.slot==="boots"},
  {key:"accessory", label:"Accesorios",      test:it=> it.slot==="accessory"},
  {key:"potion",    label:"Pociones",        test:it=> it.type==="heal"||it.type==="mana"},
  {key:"special",   label:"Objetos especiales", test:it=> it.type==="stat"||it.type==="capture_card"},
  {key:"pets",      label:"🐾 Mascotas",     test:it=> it.type==="pet_item", requiresPet:true},
  {key:"test",      label:"🧪 Pruebas",      test:it=> it.type==="capture_card"},
];


const SHOP_PREVIEW_LEVEL_CAP = 50;
}
/** Catálogo "vitrina": muestra equipo hasta Nv.50 aunque el jugador aún no lo alcance, para que vea qué
 *  puede llegar a conseguir y eso lo motive a subir de nivel y juntar oro. Lo que SÍ puede comprar/equipar
 *  ahora mismo sigue filtrado por equipPoolForMyClass (nivel real) en el propio botón de compra. */
/** Número de semana del año (ISO-ish, alcanza para que la rotación cambie una vez por semana). */
function getWeekNumber(d){
  d = d || new Date();
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = (d - start) / 86400000;
  return Math.floor(diff / 7);
}
/** Generador con semilla simple, para que la Oferta Semanal salga IGUAL para todos los jugadores esa semana. */
function seededPick(seed, count, pool){
  const arr = [...pool];
  let s = seed;
  const rand = ()=>{ s = (s*9301+49297)%233280; return s/233280; };
  for(let i=arr.length-1;i>0;i--){ const j = Math.floor(rand()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
  return arr.slice(0, count);
}
/** Convierte una plantilla del catálogo rotativo en un objeto de equipo comprable, con precio según rareza. */
function rotatingItemToEquip(tpl, tagPrefix, isWeeklyOffer){
  const rarityValue = {common:70, uncommon:140, rare:260, epic:420, legendary:650}[tpl.rarity] || 200;
  const item = {
    id: tagPrefix+"_"+tpl.id, name: tpl.name, emoji: tpl.emoji, type:"equip", slot:"weapon",
    classKey: tpl.classKey, requiredClass: CLASS_ID_MAP[tpl.classKey]||null,
    rarity: tpl.rarity, bonuses: tpl.bonuses, proc: tpl.proc||null,
    value: rarityValue, reqLevel: 1, isWeeklyOffer: !!isWeeklyOffer,
    desc: tpl.desc + (tpl.proc ? ` · ${PROC_LABELS[tpl.proc.type]} (${Math.round(tpl.proc.chance*100)}%)` : "") + " · rotativo"
  };
  // BUG arreglado: igual que el botín de jefe (generateBossLootItem/generateParkWeaponItem), este
  // objeto no vive en ninguna tabla fija — saveGame() solo guarda su `id` (inventoryIds/
  // equipmentIds), así que sin registrarlo acá, findItemById() no lo encontraba al recargar la
  // partida (rebuildPlayerFromSave → freshCopy → findItemById) y el arma comprada/equipada de la
  // Oferta Semanal (o del mercader ambulante) desaparecía como si nunca se hubiera comprado.
  bossLootRegistry[item.id] = item;
  return item;
}
/** La Oferta Semanal: 4 armas de la clase del jugador, iguales para todos esta semana, distintas la que viene. */
function getWeeklyShopOffers(){
  const forClass = ROTATING_WEAPON_POOL.filter(t=> t.classKey === player.classKey);
  const picks = seededPick(getWeekNumber() + 1, 4, forClass);
  return picks.map(t=> rotatingItemToEquip(t, "weekly", true));
}

/* ============================================================
   ARMA SUPERIOR — siempre hay una disponible en la tienda, bastante más fuerte que la que ya
   tienes puesta, para que siempre haya una meta a la que apuntar. Escala con tu nivel y con
   cuántas ya has comprado (cada compra sube el "tier" y la siguiente sale más fuerte y más cara).
   El costo no es solo oro: también pide un % de tus materiales (madera/piedra/hierro),
   proporcional al costo en oro — así también le da uso constante a lo que recolectas.
   ============================================================ */
const ELITE_WEAPON_MAT_PCT = {wood:0.55, stone:0.25, iron:0.12}; // % del costo en oro, convertido a cantidad de material
/** El ATQ del arma que ya tienes puesta ahora mismo (0 si no tienes ninguna). */
function currentWeaponAtk(){
  const w = player.equipment.weapon;
  return (w && w.bonuses && w.bonuses.atk) || 0;
}
/** Arma un objeto de "Arma Superior" a la medida del jugador — siempre mejor que la que ya tiene
 *  puesta, y además escalada por nivel y por cuántas ya compró antes. */
function getEliteWeaponOffer(){
  const base = WEAPON_BASE[player.classKey];
  if(!base) return null;
  const tier = player.eliteWeaponsBought||0;
  const targetAtk = Math.max(
    Math.round((currentWeaponAtk()||6) * 1.6),         // siempre bastante mejor que la que ya tienes
    Math.round(10 + player.level*2.4 + tier*7)          // y además escala con tu nivel y tus compras previas
  );
  const goldCost = Math.round((450 + player.level*40) * Math.pow(1.5, tier));
  const item = {
    id: "elite_weapon_"+player.classKey+"_"+tier,
    name: `${base.name} Superior${tier>0?" +"+tier:""}`,
    emoji: base.emoji, type:"equip", slot:"weapon", classKey: player.classKey,
    requiredClass: CLASS_ID_MAP[player.classKey]||null, rarity:"legendary",
    isEliteWeapon:true, eliteTier: tier,
    bonuses: {atk: targetAtk, spd: Math.floor(tier/2)},
    value: goldCost,
    desc: `Encargo especial del herrero — siempre más fuerte que tu arma actual. Sube de precio y de poder cada vez que compras una.`
  };
  // Mismo arreglo que rotatingItemToEquip — tampoco vive en una tabla fija, hace falta registrarlo
  // para que findItemById() la encuentre al recargar la partida (si no, comprarla/equiparla se
  // sentía como si no hubiera pasado nada apenas se reabría el juego).
  bossLootRegistry[item.id] = item;
  return item;
}
/** Cuánto material (madera/piedra/hierro) hace falta además del oro, para un objeto con costo `goldCost`. */
function eliteWeaponMatCost(goldCost){
  return {
    wood: Math.round(goldCost*ELITE_WEAPON_MAT_PCT.wood),
    stone: Math.round(goldCost*ELITE_WEAPON_MAT_PCT.stone),
    iron: Math.round(goldCost*ELITE_WEAPON_MAT_PCT.iron),
  };
}

function shopPreviewPool(){
  return EQUIP_TABLE.filter(it => (!it.classKey || it.classKey===player.classKey) && (!it.reqLevel || it.reqLevel <= SHOP_PREVIEW_LEVEL_CAP));
}
function shopFullCatalog(){
  const petItems = (player.pets && player.pets.length>0) ? PET_ITEM_TABLE : [];
  const eliteOffer = getEliteWeaponOffer();
  return [...getWeeklyShopOffers(), ...(eliteOffer?[eliteOffer]:[]), ...shopPreviewPool(), ...ITEM_TABLE, ...petItems, ...TEST_SHOP_ITEMS, ...BOOK_TABLE];
}

function statPreviewLine(bonuses){
  if(!bonuses) return "";
  const parts = Object.entries(bonuses).map(([k,v])=>{
    const cur = k==="maxHp" ? player.maxHp : k==="maxMp" ? player.maxMp : (player[k]||0);
    return `${STAT_LABEL[k]||k} ${Math.round(cur)} → <b>${Math.round(cur+v)}</b>`;
  });
  return `<div class="stat-preview">${parts.join(" · ")}</div>`;
}

let shopMode = 'buy';
/** Canjea un código de regalo (una sola vez por personaje). Por ahora: oro extra, o un arma muy fuerte sin restricción de nivel. */
function redeemGiftCode(){
  const raw = $("giftCodeInput").value.trim().toUpperCase();
  if(!raw) return;
  if(!player.redeemedCodes) player.redeemedCodes = [];
  const code = GIFT_CODES[raw];
  if(!code){
    toast("❌ Ese código no existe.", 3000);
    return;
  }
  if(!code.reusable && player.redeemedCodes.includes(raw)){
    toast("⚠️ Ya usaste este código con este personaje.", 3500);
    return;
  }
  if(!code.reusable) player.redeemedCodes.push(raw);
  if(code.type === "gold"){
    player.gold += code.amount;
    toast(`🎁 ¡Código canjeado! +${code.amount} 💰`, 4000);
  } else if(code.type === "weapon"){
    const base = WEAPON_BASE[player.classKey];
    const item = {
      id: "gift_weapon_"+player.classKey+"_"+Date.now(),
      name: `${base.name} del Poder`, emoji: base.emoji, type:"equip", slot:"weapon",
      classKey: player.classKey, rarity:"legendary",
      bonuses: scaleBonuses(base.bonuses, 12),
      value: 0, reqLevel: 0,
      desc: "Arma de regalo — no tiene restricción de nivel."
    };
    pushItemSafe(item);
    toast(`🎁 ¡Código canjeado! Recibiste ${item.emoji} ${item.name} en tu inventario.`, 4500);
  } else if(code.type === "capture_card"){
    pushItemSafe({id:"capture_card", name:"Carta de Captura", emoji:"🎴", type:"capture_card",
      tradeable:false, value:150, desc:"Úsala en combate para intentar atrapar al enemigo (necesita poca vida)."});
    toast(`🎁 ¡Código canjeado! Recibiste 🎴 una Carta de Captura.`, 4000);
  }
  $("giftCodeInput").value = "";
  refreshHud(); renderShopBuyList();
  saveGame();
}
$("btnRedeemGiftCode").onclick = redeemGiftCode;

function openShop(){
  closeFabMenu();
  shopMode = 'buy';
  shopPage = 0;
  renderShopTabs();
  renderShopBuyList();
  renderPickaxeShopStatus();
  renderShopSellList();
  $("shopTabs").classList.remove("hidden");
  $("shopBuyList").classList.remove("hidden");
  $("shopSellList").classList.add("hidden");
  $("btnShopModeBuy").classList.add("active");
  $("btnShopModeSell").classList.remove("active");
  if(player.hasBase){
    $("btnBuyBase").textContent = "Ya tienes una";
    $("btnBuyBase").disabled = true;
    $("baseShopDesc").textContent = "Ve al menú 🏠 Bases para desplegarla o entrar.";
    $("baseShopCosts").innerHTML = "";
  } else {
    $("btnBuyBase").textContent = "Construir";
    $("btnBuyBase").disabled = false;
    $("baseShopDesc").textContent = "Un cofre propio en el mapa, solo tuyo. Otros jugadores lo verán, pero solo tú puedes entrar.";
    const costChip = (have, need, icon)=>{
      const short = have < need;
      return `<span style="${short?'color:var(--danger);':''}">${icon}${need}</span>`;
    };
    $("baseShopCosts").innerHTML = [
      costChip(player.wood||0, BASE_PURCHASE_COST_WOOD, "🪵"),
      costChip(player.stone||0, BASE_PURCHASE_COST_STONE, "🪨"),
      costChip(player.iron||0, BASE_PURCHASE_COST_IRON, "🔩"),
      costChip(player.gold||0, BASE_PURCHASE_COST_GOLD, "🪙"),
    ].join(" · ");
  }
  $("shopOverlay").classList.remove("hidden");
}
$("btnShop").onclick = openShop;
$("btnShopModeBuy").onclick = ()=>{
  shopMode = 'buy';
  $("btnShopModeBuy").classList.add("active");
  $("btnShopModeSell").classList.remove("active");
  $("shopTabs").classList.remove("hidden");
  $("shopBuyList").classList.remove("hidden");
  $("shopSellList").classList.add("hidden");
  updateBaseAndPickaxeCardsVisibility();
};
$("btnShopModeSell").onclick = ()=>{
  shopMode = 'sell';
  $("btnShopModeSell").classList.add("active");
  $("btnShopModeBuy").classList.remove("active");
  $("shopTabs").classList.add("hidden");
  $("shopBuyList").classList.add("hidden");
  $("shopSellList").classList.remove("hidden");
  updateBaseAndPickaxeCardsVisibility();
};

/** Base Personal y los Picos son tarjetas fijas propias (no ítems de ITEM_TABLE), pero viven
 *  dentro de la categoría "🎴 Objetos especiales" — se muestran solo ahí (y solo en modo Comprar),
 *  se ocultan en cualquier otra pestaña o en modo Vender. Se llama junto con renderShopTabs()
 *  (cubre apertura de tienda + cambio de pestaña) y en cada cambio de shopMode. */
function updateBaseAndPickaxeCardsVisibility(){
  const show = shopMode === "buy" && shopActiveCategory === "special";
  $("baseShopCard").classList.toggle("hidden", !show);
  $("pickaxeShopCard").classList.toggle("hidden", !show);
  $("pickaxeTierRow").classList.toggle("hidden", !show);
}
function renderShopTabs(){
  const wrap = $("shopTabs");
  wrap.innerHTML = "";
  const hasPets = player.pets && player.pets.length>0;
  if(shopActiveCategory==="pets" && !hasPets) shopActiveCategory = "weapon";
  const classBlocked = (cat)=> cat.classOnly && !cat.classOnly.includes(player.classKey);
  const activeCat = SHOP_CATEGORIES.find(c=>c.key===shopActiveCategory);
  if(classBlocked(activeCat) || (activeCat && activeCat.hidden)) shopActiveCategory = "weapon";
  SHOP_CATEGORIES.forEach(cat=>{
    if(cat.hidden) return; // oculta por ahora (sin borrar su funcionalidad)
    if(cat.requiresPet && !hasPets) return; // solo se ve si ya tienes al menos una mascota
    if(classBlocked(cat)) return; // solo se ve para las clases que pueden usarlo
    const btn = document.createElement("button");
    btn.className = "shop-tab" + (cat.key===shopActiveCategory ? " active" : "");
    btn.textContent = cat.label;
    btn.onclick = ()=>{ shopActiveCategory = cat.key; shopPage = 0; renderShopTabs(); renderShopBuyList(); };
    wrap.appendChild(btn);
  });
  updateBaseAndPickaxeCardsVisibility();
}

/** Tarjeta compacta de tienda (2 por fila); los épicos/legendarios/botín de jefe se muestran anchos, como antes. */
function buildShopCard(item, isBuy){
  const meta = equipItemMeta(item);
  const isBig = item.rarity==="epic" || item.rarity==="legendary" || item.isBossLoot;
  const card = document.createElement("div");

  if(isBig){
    // los épicos/legendarios/botín de jefe se muestran anchos, con el estilo de fila de siempre (no la tarjeta compacta)
    applyItemRowStyling(card, meta);
    card.style.gridColumn = "1 / -1";
    if(meta.styleAttr) card.style.cssText += meta.styleAttr;
    if(isBuy){
      const locked = item.reqLevel && player.level < item.reqLevel;
      const goldCost = shopPrice(item);
      const matCost = item.isEliteWeapon ? eliteWeaponMatCost(goldCost) : null;
      const canAffordGold = player.gold >= goldCost;
      const canAffordMat = !matCost || (["wood","stone","iron"].every(k=> (player[k]||0) >= matCost[k]));
      const canAfford = canAffordGold && canAffordMat;
      const preview = item.bonuses ? statPreviewLine(item.bonuses) : "";
      const cmpLine = comparisonLine(item);
      const matLine = matCost ? `<div class="result-prog-meta" style="margin-top:3px;">
          <span style="${(player.wood||0)<matCost.wood?'color:var(--danger);':''}">🪵${matCost.wood}</span> ·
          <span style="${(player.stone||0)<matCost.stone?'color:var(--danger);':''}">🪨${matCost.stone}</span> ·
          <span style="${(player.iron||0)<matCost.iron?'color:var(--danger);':''}">🔩${matCost.iron}</span>
        </div>` : "";
      const actionHtml = locked
        ? `<button disabled style="opacity:.55;">🔒 Nv.${item.reqLevel}<br><small style="font-weight:600;">💰${goldCost}</small></button>`
        : `<button ${canAfford?"":"disabled"}>💰${goldCost}</button>`;
      card.innerHTML = `${meta.sparkles}<div class="ie">${iconFor(item)}</div>
        <div class="it">${item.name}${meta.tag}<small>${item.desc}</small>${preview}${cmpLine}${matLine}</div>
        ${actionHtml}`;
      if(!locked){
        card.querySelector("button").onclick = ()=>{
          if(!canAfford) return;
          openBuyQuantityModal(item, goldCost, matCost, (qty)=>{
            let bought = 0;
            for(let i=0;i<qty;i++){ if(!pushItemSafe({...item})) break; bought++; }
            if(bought<=0) return;
            player.gold -= goldCost*bought;
            if(matCost){
              player.wood -= matCost.wood*bought; player.stone -= matCost.stone*bought; player.iron -= matCost.iron*bought;
              player.eliteWeaponsBought = (player.eliteWeaponsBought||0) + bought;
            }
            refreshHud(); saveGame();
            toast(`Compraste ${bought>1?`${bought}x `:""}${item.emoji} ${item.name}.`);
            renderShopBuyList(); renderShopSellList();
          });
        };
      }
    } else {
      const count = player.inventory.filter(x=>x.id===item.id).length;
      const qtyTag = count>1 ? ` <b style="color:var(--accent);">x${count}</b>` : "";
      const sellPrice = Math.round((item.value||10)*0.4);
      card.innerHTML = `${meta.sparkles}<div class="ie">${iconFor(item)}</div>
        <div class="it">${item.name}${qtyTag}${meta.tag}<small>${item.desc}</small></div>
        <button>+💰${sellPrice}</button>`;
      card.querySelector("button").onclick = ()=>{
        showConfirm(`¿Vender <b>${item.name}</b> por 💰${sellPrice}?`, ()=>{
          const idx = player.inventory.findIndex(x=>x.id===item.id);
          if(idx<0) return;
          player.gold += sellPrice;
          player.inventory.splice(idx,1);
          refreshHud(); saveGame();
          toast(`Vendiste ${item.emoji} ${item.name} por 💰${sellPrice}.`);
          renderShopBuyList(); renderShopSellList();
        }, {icon:"💸", title:"Confirmar venta", confirmLabel:"Vender"});
      };
    }
    return card;
  }

  card.className = "shop-card " + meta.rc;
  if(meta.styleAttr) card.style.cssText += meta.styleAttr;

  if(isBuy){
    const locked = item.reqLevel && player.level < item.reqLevel;
    const canAfford = player.gold >= shopPrice(item);
    const preview = item.bonuses ? statPreviewLine(item.bonuses) : "";
    const cmpLine = comparisonLine(item);
    const actionHtml = locked
      ? `<button disabled style="opacity:.55;">🔒 Nv.${item.reqLevel}<br><small style="font-weight:600;">💰${shopPrice(item)}</small></button>`
      : `<button ${canAfford?"":"disabled"}>💰${shopPrice(item)}</button>`;
    card.innerHTML = `${meta.sparkles}<div class="sc-emoji">${iconFor(item)}</div>
       <div class="sc-name">${item.name}${meta.tag}</div>
       <div class="sc-desc">${item.desc}${preview}${cmpLine}</div>
       ${actionHtml}`;
    if(!locked){
      card.querySelector("button").onclick = ()=>{
        if(player.gold < shopPrice(item)) return;
        openBuyQuantityModal(item, shopPrice(item), null, (qty)=>{
          let bought = 0;
          for(let i=0;i<qty;i++){ if(!pushItemSafe({...item})) break; bought++; }
          if(bought<=0) return;
          player.gold -= shopPrice(item)*bought;
          refreshHud(); saveGame();
          toast(`Compraste ${bought>1?`${bought}x `:""}${item.emoji} ${item.name}.`);
          renderShopBuyList(); renderShopSellList();
        });
      };
    }
  } else {
    const count = player.inventory.filter(x=>x.id===item.id).length;
    const qtyTag = count>1 ? ` <b style="color:var(--accent);">x${count}</b>` : "";
    const sellPrice = Math.round((item.value||10)*0.4);
    card.innerHTML = `${meta.sparkles}<div class="sc-emoji">${iconFor(item)}</div>
       <div class="sc-name">${item.name}${qtyTag}${meta.tag}</div>
       <div class="sc-desc">${item.desc}</div>
       <button>+💰${sellPrice}</button>`;
    card.querySelector("button").onclick = ()=>{
      showConfirm(`¿Vender <b>${item.name}</b> por 💰${sellPrice}?`, ()=>{
        const idx = player.inventory.findIndex(x=>x.id===item.id);
        if(idx<0) return;
        player.gold += sellPrice;
        player.inventory.splice(idx,1);
        refreshHud(); saveGame();
        toast(`Vendiste ${item.emoji} ${item.name} por 💰${sellPrice}.`);
        renderShopBuyList(); renderShopSellList();
      }, {icon:"💸", title:"Confirmar venta", confirmLabel:"Vender"});
    };
  }
  return card;
}

function renderShopBuyList(){
  const list = $("shopBuyList");
  list.innerHTML = "";
  $("shopGoldDisplay").textContent = player.gold;
  const cat = SHOP_CATEGORIES.find(c=>c.key===shopActiveCategory);
  const items = shopFullCatalog().filter(cat.test);
  const pager = $("shopPager");
  if(items.length===0){
    const note = document.createElement("div");
    note.className = "empty-note";
    note.style.gridColumn = "1 / -1";
    note.textContent = "No hay objetos en esta categoría.";
    list.appendChild(note);
    pager.classList.add("hidden");
    return;
  }
  const totalPages = Math.max(1, Math.ceil(items.length / SHOP_PAGE_SIZE));
  shopPage = Math.min(shopPage, totalPages-1);
  const start = shopPage * SHOP_PAGE_SIZE;
  const pageItems = items.slice(start, start + SHOP_PAGE_SIZE);
  pageItems.forEach(item=> list.appendChild(buildShopCard(item, true)));

  if(totalPages > 1){
    pager.classList.remove("hidden");
    $("shopPageLabel").textContent = `Página ${shopPage+1}/${totalPages}`;
    $("btnShopPrevPage").disabled = shopPage === 0;
    $("btnShopNextPage").disabled = shopPage === totalPages-1;
  } else {
    pager.classList.add("hidden");
  }
}
$("btnShopPrevPage").onclick = ()=>{ if(shopPage>0){ shopPage--; renderShopBuyList(); } };
$("btnShopNextPage").onclick = ()=>{ shopPage++; renderShopBuyList(); };

/** Tarjeta para vender un material de combate (Colmillo de Lobo, Telaraña de Araña, etc. — ver
 *  CRAFT_MATERIALS en game/config/blacksmith.js). A diferencia del equipo, estos no son objetos de
 *  player.inventory sino contadores en player.craftMats, así que no pasan por buildShopCard —
 *  vender descuenta 1 unidad del contador y paga mat.sellValue en oro. */
function buildMaterialSellCard(mat){
  const qty = (player.craftMats && player.craftMats[mat.key]) || 0;
  const card = document.createElement("div");
  card.className = "shop-card";
  card.innerHTML = `<div class="sc-emoji">${mat.emoji}</div>
     <div class="sc-name">${mat.label} <b style="color:var(--accent);">x${qty}</b></div>
     <div class="sc-desc">Material de combate para la Forja.</div>
     <button>+💰${mat.sellValue}</button>`;
  card.querySelector("button").onclick = ()=>{
    showConfirm(`¿Vender 1x <b>${mat.label}</b> por 💰${mat.sellValue}?`, ()=>{
      if(((player.craftMats && player.craftMats[mat.key]) || 0) <= 0) return;
      player.craftMats[mat.key] -= 1;
      player.gold += mat.sellValue;
      refreshHud(); saveGame();
      toast(`Vendiste ${mat.emoji} ${mat.label} por 💰${mat.sellValue}.`);
      renderShopSellList();
    }, {icon:"💸", title:"Confirmar venta", confirmLabel:"Vender"});
  };
  return card;
}

function renderShopSellList(){
  const sellList = $("shopSellList");
  sellList.innerHTML = "";
  const sellable = player.inventory.filter(it=> it.tradeable!==false);
  const sellableMats = CRAFT_MATERIALS.filter(m=> ((player.craftMats && player.craftMats[m.key]) || 0) > 0);
  if(sellable.length===0 && sellableMats.length===0){
    sellList.innerHTML = `<div class="empty-note" style="grid-column:1 / -1;">No tienes objetos para vender.</div>`;
    return;
  }
  const seen = new Set();
  sellable.forEach((it)=>{
    if(seen.has(it.id)) return;
    seen.add(it.id);
    sellList.appendChild(buildShopCard(it, false));
  });
  sellableMats.forEach(mat=> sellList.appendChild(buildMaterialSellCard(mat)));
}

$("btnCloseShop").onclick = ()=> $("shopOverlay").classList.add("hidden");

/* ============================================================
   NPC COMERCIANTE — objetos EXCLUSIVOS (nunca los de la tienda)
   ============================================================ */
let currentMerchant = null;

/** Modal informativo del jefe: nivel, dificultad, y recomendación de ir en grupo si es más fuerte que tú. */
/** Modal del parque: muestra al guardián único y su arma exclusiva, y permite retarlo. */
if(false){
const PARK_GUARDIAN_COOLDOWN_MS = 60 * 60000; // 1 hora de descanso tras ser derrotado
}

/** El guardián de un parque tiene un nivel FIJO (no sube solo porque tú subiste de nivel).
 *  Cuando lo derrotas, entra en cooldown de 1 hora; al volver, se genera un nivel nuevo — desde la
 *  Capa 7 (Combat Power & Difficulty Director), ese nivel nuevo sale de tu Combat Power real
 *  (equipo/mascotas/pasivas incluidos) en vez de solo tu nivel, así que sigue representando un
 *  desafío real aunque tu nivel ya no sea el principal indicador de tu fuerza. Es justo el "jefe
 *  opcional" que el pedido señala como el lugar correcto para usar Combat Power — ver
 *  docs/COMBAT_POWER.md. */
function getOrCreateParkGuardianState(park){
  if(!player.parkGuardianState) player.parkGuardianState = {};
  let st = player.parkGuardianState[park.id];
  const tpl = {name: park.guardianName, hpM:5.2, atkM:2.0, defM:1.9};
  if(!st){
    st = { level: rollCombatPowerChallenge(tpl).level, defeatedAt: null };
    player.parkGuardianState[park.id] = st;
  } else if(st.defeatedAt && (Date.now() - st.defeatedAt) >= PARK_GUARDIAN_COOLDOWN_MS){
    st.level = rollCombatPowerChallenge(tpl).level;
    st.defeatedAt = null;
  }
  return st;
}
function parkGuardianCooldownMsLeft(park){
  const st = player.parkGuardianState && player.parkGuardianState[park.id];
  if(!st || !st.defeatedAt) return 0;
  return Math.max(0, PARK_GUARDIAN_COOLDOWN_MS - (Date.now() - st.defeatedAt));
}

function openParkModal(park){
  const d = distMeters(playerLatLng, park);
  $("parkEmoji").textContent = "🌳";
  $("parkName").textContent = park.name;
  const st = getOrCreateParkGuardianState(park);
  const cooldownLeft = parkGuardianCooldownMsLeft(park);
  const already = (player.parkWeaponsObtained||[]).includes(park.id);
  $("parkGuardianLine").textContent = `${park.guardianEmoji} Guardián: ${park.guardianName} · Nv.${st.level}`;
  if(cooldownLeft > 0){
    const mins = Math.ceil(cooldownLeft/60000);
    $("parkWeaponLine").textContent = `😴 El guardián se está recuperando — vuelve en ${mins} min.`;
    $("btnParkEngage").disabled = true;
    $("btnParkEngage").style.opacity = ".5";
  } else {
    $("parkWeaponLine").textContent = already
      ? "✅ Ya obtuviste el arma exclusiva de este parque (puedes volver a retarlo por XP y oro)."
      : `🎁 Primera victoria: ${park.weaponNames[player.classKey]||"arma única"} garantizada.`;
    $("btnParkEngage").disabled = false;
    $("btnParkEngage").style.opacity = "1";
  }
  $("btnParkEngage").onclick = ()=>{
    if(parkGuardianCooldownMsLeft(park) > 0) return;
    if(d > ENGAGE_RANGE_M){ toast(`Este parque está a ${Math.round(d)} m — acércate para retar al guardián (≤100 m).`); return; }
    $("parkOverlay").classList.add("hidden");
    startParkGuardianBattle(park);
  };
  $("btnParkCancel").onclick = ()=> $("parkOverlay").classList.add("hidden");
  $("parkOverlay").classList.remove("hidden");
}

/** Inicia un combate solo contra el guardián del parque, usando su nivel FIJO (no el nivel actual del jugador). */
function startParkGuardianBattle(park){
  if(isBusyWithBattle()){ toast("Termina lo que estás haciendo antes de retar al guardián."); return; }
  const st = getOrCreateParkGuardianState(park);
  const level = st.level;
  const tpl = {name: park.guardianName, emoji: park.guardianEmoji, hpM:5.2, atkM:2.0, defM:1.9};
  const hp = Math.round((18 + level*12) * tpl.hpM);
  const atk = +((3 + level*2.6) * tpl.atkM).toFixed(1);
  const def = +((3 + level*1.9) * tpl.defM).toFixed(1);
  const spd = 4 + Math.floor(level*0.6);
  const mon = {
    id: "park_"+park.id, tpl, level, hp, maxHp:hp, atk, def, spd,
    marker:null, packBonus:1, isBoss:true, isParkGuardian:true, parkId:park.id
  };
  startBattle(mon);
}

/* ---------- Jefes de región: ocupado/en fila + anuncio global al derrotarlo ---------- */
let bossLocks = {}; // bossId -> {fighterId, fighterName, queue:[{id,name}]}
let myQueuedBossId = null;

function handleAnnounceMessage(msg){
  if(msg.type === 'boss_defeated'){
    toast(`👑 ${msg.playerName} derrotó a ${msg.bossName}${msg.itemName ? ` y obtuvo ${msg.itemEmoji||""} ${msg.itemName}` : ""}!`, 4500);
  } else if(msg.type === 'boss_lock'){
    if(!bossLocks[msg.bossId]) bossLocks[msg.bossId] = {queue:[]};
    bossLocks[msg.bossId].fighterId = msg.fighterId;
    bossLocks[msg.bossId].fighterName = msg.fighterName;
  } else if(msg.type === 'boss_unlock'){
    const lock = bossLocks[msg.bossId];
    if(lock){ lock.fighterId = null; lock.fighterName = null; }
  } else if(msg.type === 'boss_queue_join'){
    if(!bossLocks[msg.bossId]) bossLocks[msg.bossId] = {queue:[]};
    const q = bossLocks[msg.bossId].queue;
    if(!q.some(p=>p.id===msg.playerId)) q.push({id:msg.playerId, name:msg.playerName});
  } else if(msg.type === 'boss_your_turn'){
    if(msg.playerId === myPlayerId){
      toast(`🔔 ¡Es tu turno de enfrentar a ${msg.bossName}! Acércate y tócalo de nuevo.`, 5000);
      myQueuedBossId = null;
    }
  }
}
function isBossLocked(mon){
  const lock = bossLocks[mon.id];
  return !!(lock && lock.fighterId && lock.fighterId !== myPlayerId);
}
function joinBossQueue(mon){
  myQueuedBossId = mon.id;
  pubnub.publish({channel: PN_ANNOUNCE_CHANNEL, storeInHistory:false,
    message:{type:'boss_queue_join', bossId:mon.id, playerId:myPlayerId, playerName:player.name}});
  toast(`🕒 Te anotaste en la fila para ${mon.tpl.name}. Te avisaremos cuando sea tu turno.`, 4000);
}
/** Al terminar un combate contra un jefe de región, lo libera y avisa al siguiente en la fila (si hay alguno). */
function releaseBossLock(mon){
  if(!pubnub || !mon.isBoss || mon.isParkGuardian) return;
  pubnub.publish({channel: PN_ANNOUNCE_CHANNEL, storeInHistory:false, message:{type:'boss_unlock', bossId:mon.id}});
  const lock = bossLocks[mon.id];
  if(lock && lock.queue && lock.queue.length){
    const next = lock.queue.shift();
    pubnub.publish({channel: PN_ANNOUNCE_CHANNEL, storeInHistory:false,
      message:{type:'boss_your_turn', bossId:mon.id, playerId:next.id, bossName:mon.tpl.name}});
  }
}

function openBossInfoModal(mon){
  const d = distMeters(playerLatLng, mon);
  if(d > ENGAGE_RANGE_M){ toast(`El jefe está a ${Math.round(d)} m — acércate para verlo de cerca (≤100 m).`); return; }

  const tier = bossDifficultyTier(mon.level);
  const tierInfo = {
    green:  {label:"🟢 Nivel manejable",   bg:"rgba(79,214,122,.18)",  color:"#4fd67a"},
    orange: {label:"🟠 Desafiante",         bg:"rgba(232,152,58,.18)",  color:"#e8983a"},
    red:    {label:"🔴 Muy peligroso",      bg:"rgba(239,93,111,.18)",  color:"var(--danger)"}
  }[tier];

  $("bossEmoji").textContent = mon.tpl.emoji;
  $("bossName").textContent = mon.tpl.name;
  $("bossLevelLine").textContent = `Nv. ${mon.level} · Tú: Nv. ${player.level}`;
  $("bossDifficultyBadge").textContent = tierInfo.label;
  $("bossDifficultyBadge").style.background = tierInfo.bg;
  $("bossDifficultyBadge").style.color = tierInfo.color;

  const stronger = mon.level - player.level >= 3;
  const inGroup = party && party.members.length > 1;
  if(stronger && !inGroup){
    $("bossRecommendation").innerHTML = `⚠️ Este jefe es más fuerte que tú — <b>se recomienda enfrentarlo en grupo</b>. Invita amigos desde el menú antes de atacar.`;
  } else if(stronger && inGroup){
    $("bossRecommendation").innerHTML = `⚠️ Es fuerte, pero tu grupo (${party.members.length}) puede con él.`;
  } else {
    $("bossRecommendation").textContent = "Pareces estar a la altura de este jefe.";
  }
  const remaining = Math.max(0, mon.spawnedAt + mon.lifespanMs - Date.now());
  const mins = Math.floor(remaining/60000), secs = Math.floor((remaining%60000)/1000);
  $("bossTimeLeft").textContent = `Se irá en ${mins}:${secs<10?"0":""}${secs}`;

  if(isBossLocked(mon)){
    const lock = bossLocks[mon.id];
    const inQueue = myQueuedBossId === mon.id;
    $("bossRecommendation").innerHTML = `🔒 <b>Ocupado</b> — ${escapeHtml(lock.fighterName)} lo está enfrentando ahora mismo. Nadie más puede retarlo hasta que termine.`;
    $("btnBossEngage").textContent = inQueue ? "🕒 Ya estás en la fila" : "🕒 Esperar en la fila";
    $("btnBossEngage").disabled = inQueue;
    $("btnBossEngage").onclick = ()=>{
      if(myQueuedBossId === mon.id) return;
      joinBossQueue(mon);
      $("bossInfoOverlay").classList.add("hidden");
    };
    $("bossInfoOverlay").classList.remove("hidden");
    return;
  }
  $("btnBossEngage").textContent = "⚔️ Enfrentar";
  $("btnBossEngage").disabled = false;
  $("btnBossEngage").onclick = ()=>{
    $("bossInfoOverlay").classList.add("hidden");
    if(pubnub){
      pubnub.publish({channel: PN_ANNOUNCE_CHANNEL, storeInHistory:false,
        message:{type:'boss_lock', bossId:mon.id, fighterId:myPlayerId, fighterName:player.name}});
    }
    tryEngage(mon);
  };
  $("btnBossCancel").onclick = ()=> $("bossInfoOverlay").classList.add("hidden");
  $("bossInfoOverlay").classList.remove("hidden");
}

/** El vagabundo pide oro; si se lo das, te deja recordar un movimiento que ya no tienes. */
/** Punto de mejora fijo (parque o centro comercial): mejorar equipo o recordar un movimiento olvidado. */
function openUpgradeStationModal(station){
  const d = distMeters(playerLatLng, station);
  if(d > ENGAGE_RANGE_M){ toast(`${station.name} está a ${Math.round(d)} m — acércate (≤100 m).`); return; }
  $("upgStationName").textContent = station.name;
  $("upgStationRecallCost").textContent = VAGABUNDO_COST;
  $("upgradeStationOverlay").classList.remove("hidden");
  $("btnUpgStationEquip").onclick = ()=>{
    $("upgradeStationOverlay").classList.add("hidden");
    openUpgradeEquipPicker();
  };
  $("btnUpgStationRecall").onclick = ()=>{
    if(player.gold < VAGABUNDO_COST){ toast(`No te alcanza — necesitas 💰${VAGABUNDO_COST}.`, 3200); return; }
    player.gold -= VAGABUNDO_COST;
    refreshHud(); saveGame();
    $("upgradeStationOverlay").classList.add("hidden");
    openRecallMovePicker();
  };
  $("btnUpgStationClose").onclick = ()=> $("upgradeStationOverlay").classList.add("hidden");
}

/** Lista cada pieza equipada con su nivel de mejora actual y su costo para subir uno más. */
function openUpgradeEquipPicker(){
  const list = $("upgradeEquipPickList");
  list.innerHTML = "";
  $("upgradeEquipPickOverlay").classList.remove("hidden");
  const slots = [];
  EQUIP_SLOTS.forEach(slotDef=>{
    if(slotDef.key === "accessory"){
      player.equipment.accessory.forEach((item,i)=>{ if(item) slots.push({item, label:`Accesorio ${i+1}`, slotKey:"accessory", accIdx:i}); });
    } else if(player.equipment[slotDef.key]){
      slots.push({item:player.equipment[slotDef.key], label:slotDef.label, slotKey:slotDef.key, accIdx:null});
    }
  });
  if(slots.length===0){
    list.innerHTML = `<div class="empty-note">No tienes nada equipado todavía — equipa algo primero desde tu inventario.</div>`;
    return;
  }
  slots.forEach(s=>{
    const lvl = s.item.upgradeLevel||0;
    const maxed = lvl >= EQUIP_UPGRADE_MAX;
    const row = document.createElement("div");
    row.className = "cm-item";
    row.innerHTML = `<div style="flex:1;">
        <span>${s.item.emoji} ${s.label}: ${s.item.name}${lvl>0?` <b style="color:var(--gold);">+${lvl}</b>`:""}</span>
        <small style="display:block; color:var(--dim); font-size:10.5px;">${s.item.desc}</small>
      </div>
      <button ${maxed?"disabled":""}>${maxed?"MÁX":"🔧 💰"+upgradeCost(s.item)}</button>`;
    if(!maxed){
      row.querySelector("button").onclick = ()=>{
        upgradeEquippedItem(s.slotKey, s.accIdx);
        openUpgradeEquipPicker(); // refresca la lista con el nuevo nivel/costo
      };
    }
    list.appendChild(row);
  });
}
$("btnCloseUpgradeEquipPick").onclick = ()=> $("upgradeEquipPickOverlay").classList.add("hidden");

function openVagabundoNpc(mon){
  const d = distMeters(playerLatLng, mon);
  if(d > ENGAGE_RANGE_M){ toast(`El vagabundo está a ${Math.round(d)} m — acércate (≤100 m).`); return; }
  $("vagabundoPortrait").src = VAGABUNDO_SPRITES.portrait;
  $("vagabundoCostLabel").textContent = VAGABUNDO_COST;
  $("vagabundoOverlay").classList.remove("hidden");
  gameEventBus.emit({ type: "NPC_INTERACTED", payload: { amount: 1 }, dedupeKey: mon.id });
  $("btnVagabundoGive").onclick = ()=>{
    if(player.gold < VAGABUNDO_COST){ toast(`No te alcanza — necesitas 💰${VAGABUNDO_COST}.`, 3200); return; }
    player.gold -= VAGABUNDO_COST;
    refreshHud(); saveGame();
    $("vagabundoOverlay").classList.add("hidden");
    map.removeLayer(mon.marker);
    monsters = monsters.filter(m=>m.id!==mon.id);
    openRecallMovePicker();
  };
  $("btnVagabundoNo").onclick = ()=> $("vagabundoOverlay").classList.add("hidden");
}

/** Lista los movimientos que alguna vez aprendiste (y ya no tienes) O que en su momento decidiste
 *  no aprender al subir de nivel (ver declinedMoveIds en showLearnMoveChoice) — el vagabundo
 *  también te deja volver por esos. */
function openRecallMovePicker(){
  const forgotten = player.movePool.filter(m=>
    ((player.everLearnedIds||player.learnedIds).has(m.id) || (player.declinedMoveIds||new Set()).has(m.id))
    && !player.moves.some(pm=>pm.id===m.id));
  if(forgotten.length===0){
    player.gold += VAGABUNDO_COST; // no había nada que recordar — se le devuelve el oro
    refreshHud(); saveGame();
    toast("No tienes ningún movimiento olvidado todavía — te devuelve el oro.", 4000);
    return;
  }
  const list = $("recallPickList");
  list.innerHTML = "";
  forgotten.forEach(mv=>{
    const wasLearned = (player.everLearnedIds||player.learnedIds).has(mv.id);
    const tag = wasLearned ? "Olvidado" : "Nunca aprendido";
    const row = document.createElement("div");
    row.className = "cm-item";
    row.innerHTML = `<div style="flex:1;">
        <span>${mv.name}${moveTargetIcon(mv)} <small style="color:var(--dim); font-weight:600;">· ${tag}</small></span>
        <small style="display:block; color:var(--dim); font-size:10.5px;">${moveInfoLine(mv)} · MP ${mv.cost||0}</small>
      </div>
      <button>Elegir</button>`;
    row.querySelector("button").onclick = ()=>{
      $("recallPickOverlay").classList.add("hidden");
      openRecallReplacePicker(mv);
    };
    list.appendChild(row);
  });
  $("recallPickOverlay").classList.remove("hidden");
}
$("btnCloseRecallPick").onclick = ()=> $("recallPickOverlay").classList.add("hidden");

/** Elige cuál de tus 5 movimientos actuales se reemplaza por el que quieres recordar. */
function openRecallReplacePicker(newMove){
  $("recallReplaceSub").textContent = `Vas a recordar: ${newMove.name}. ¿Cuál de tus movimientos actuales reemplaza?`;
  const list = $("recallReplaceList");
  list.innerHTML = "";
  player.moves.forEach((mv, idx)=>{
    const row = document.createElement("div");
    row.className = "cm-item";
    row.innerHTML = `<div style="flex:1;">
        <span>${mv.name}${moveTargetIcon(mv)}</span>
        <small style="display:block; color:var(--dim); font-size:10.5px;">${moveInfoLine(mv)} · MP ${mv.cost||0}</small>
      </div>
      <button>Reemplazar</button>`;
    row.querySelector("button").onclick = ()=>{
      player.learnedIds.delete(mv.id);
      player.moves.splice(idx,1,newMove);
      player.learnedIds.add(newMove.id);
      player.everLearnedIds.add(newMove.id);
      if(player.declinedMoveIds) player.declinedMoveIds.delete(newMove.id);
      $("recallReplaceOverlay").classList.add("hidden");
      toast(`Olvidaste ${mv.name} y recordaste ${newMove.name}.`);
      saveGame();
    };
    list.appendChild(row);
  });
  $("recallReplaceOverlay").classList.remove("hidden");
}
$("btnCloseRecallReplace").onclick = ()=> $("recallReplaceOverlay").classList.add("hidden");

function openMerchantNpc(mon){
  currentMerchant = mon;
  gameEventBus.emit({ type: "NPC_INTERACTED", payload: { amount: 1 }, dedupeKey: mon.id });
  $("merchantOverlay").querySelector(".title").textContent = "🥷🛍️ Comerciante Errante";
  $("merchantTimeLeft").textContent = "";
  const buyList = $("merchantBuyList");
  buyList.innerHTML = "";
  $("merchantGoldDisplay").textContent = player.gold;
  if(!mon._rotatingOffers){
    // se decide una sola vez por aparición del comerciante (no cambia cada vez que le abres el diálogo,
    // pero sí será distinto la próxima vez que aparezca otro comerciante en el mapa)
    const forClass = ROTATING_WEAPON_POOL.filter(t=> t.classKey === player.classKey);
    const randomSeed = Math.floor(Math.random()*1e6);
    mon._rotatingOffers = seededPick(randomSeed, 2, forClass).map(t=> rotatingItemToEquip(t, "merch"+mon.id));
  }
  const offers = [...equipPoolForMyClass(EXCLUSIVE_TABLE), ...mon._rotatingOffers];
  if(offers.length===0){
    buyList.innerHTML = `<div class="empty-note">Por ahora no tiene nada para tu clase. Vuelve a intentarlo más tarde.</div>`;
  }
  offers.forEach(item=>{
    const meta = equipItemMeta(item);
    const row = document.createElement("div");
    applyItemRowStyling(row, meta);
    const canAfford = player.gold >= shopPrice(item);
    const preview = item.bonuses ? statPreviewLine(item.bonuses) : "";
    const cmpLine = comparisonLine(item);
    row.innerHTML = `${meta.sparkles}<div class="ie">${iconFor(item)}</div>
      <div class="it">${item.name}${meta.tag}<small>${item.desc}</small>${preview}${cmpLine}</div>
      <button ${canAfford?"":"disabled"}>💰${shopPrice(item)}</button>`;
    row.querySelector("button").onclick = ()=>{
      if(player.gold < shopPrice(item)) return;
      player.gold -= shopPrice(item);
      pushItemSafe({...item});
      refreshHud(); saveGame();
      toast(`Compraste el objeto exclusivo ${item.emoji} ${item.name}.`);
      openMerchantNpc(mon); // refresca estado de "puedo pagar"
    };
    buyList.appendChild(row);
  });
  $("merchantOverlay").classList.remove("hidden");
}

// Único manejador de "Cerrar" para el overlay de comercio, que comparten dos sistemas distintos:
// el NPC Comerciante (encuentro especial, EXCLUSIVE_TABLE) y el Mercader Ambulante (Mapa Vivo,
// Capa 2, dynamicWorld.js) — antes cada uno asignaba su propio onclick al mismo botón y el que se
// definiera más abajo en el archivo pisaba al otro en silencio. Ahora es uno solo que revisa cuál
// de los dos está activo.
$("btnCloseMerchant").onclick = ()=>{
  if(currentDynamicMerchant){
    currentDynamicMerchant = null;
    $("merchantOverlay").classList.add("hidden");
    return;
  }
  if(currentMerchant){
    showConfirm("El comerciante se irá y no podrás volver a comprarle hasta que aparezca de nuevo. ¿Salir de todos modos?", ()=>{
      map.removeLayer(currentMerchant.marker);
      monsters = monsters.filter(m=>m.id!==currentMerchant.id);
      currentMerchant = null;
      $("merchantOverlay").classList.add("hidden");
    }, {icon:"🧳", confirmLabel:"Salir"});
    return;
  }
  $("merchantOverlay").classList.add("hidden");
};

/* ============================================================
   GRUPO (hasta 5 amigos) — enfrentar enemigos reforzados juntos
   ------------------------------------------------------------
   Simplificaciones honestas para mantener esto robusto:
   - El enemigo del grupo es UNA sola entidad con stats escalados
     según el tamaño del grupo (no N monstruos con vida separada);
     su "count" es solo para el sabor narrativo y la recompensa.
   - El LÍDER es quien inicia el combate conjunto; si el líder se
     va, el grupo se disuelve (evita que un combate quede colgado).
   - Cada turno, todos los miembros vivos eligen su movimiento;
     una vez que llegan todos (o se agota el tiempo), el resultado
     se calcula igual en todos los celulares con una semilla
     compartida (igual que el PvP 1v1 ya existente).
   ============================================================ */
function partyChannel(id){ return PN_PARTY_PREFIX + id; }

function sendPartyInvite(target){
  if(!pubnub){ toast("El multijugador no está conectado ahora mismo.", 3500); return; }
  if(party && party.members.length >= PARTY_MAX){ toast(`Tu grupo ya tiene el máximo de ${PARTY_MAX} jugadores.`, 3500); return; }
  if(party && party.leaderId !== myPlayerId){ toast("Solo el líder del grupo puede invitar."); return; }
  if(!party){
    party = { id: 'p'+Math.random().toString(36).slice(2,9), leaderId: myPlayerId, members: [myMemberSnapshot()] };
    pubnub.subscribe({channels:[partyChannel(party.id)]});
    renderMapPartyPanel();
  }
  writeChallenge(target.id, 'party_invite', {
    partyId: party.id, fromName: player.name, memberCount: party.members.length
  });
  toast(`🛡️ Invitación de grupo enviada a ${target.name}.`, 3500);
}

function myMemberSnapshot(){
  return {
    id: myPlayerId, name: player.name, classKey: player.classKey, gender: player.gender, level: player.level,
    atk: player.atk, matk: player.matk||0, def: player.def, spd: player.spd,
    maxHp: player.maxHp, maxMp: player.maxMp,
    ultimateMove: player.ultimateMove || null
  };
}

function handlePartyInvite(c){
  if(party || incomingPartyInvite || isBusyWithBattle()){
    // ocupado: no respondemos (el que invita simplemente no verá que nos unimos)
    return;
  }
  incomingPartyInvite = c;
  const subText = `${c.fromName} te invita a un grupo (${c.memberCount}/${PARTY_MAX}) para enfrentar enemigos reforzados juntos.`;
  const doAccept = ()=> acceptPartyInvite(c);
  const doDecline = ()=>{ incomingPartyInvite = null; };
  const notifId = addPendingNotification({emoji:"🛡️", title:"Invitación de grupo", sub:subText, onAccept:doAccept, onDecline:doDecline});
  $("noticeEmoji").textContent = "🛡️";
  $("noticeTitle").textContent = "¡Invitación de grupo!";
  $("noticeSub").textContent = subText;
  $("noticeActions").innerHTML = `<button class="primarybtn" id="btnAcceptParty" style="margin-bottom:8px;">🛡️ Unirme al grupo</button>
    <button class="ghostbtn" id="btnDeclineParty" style="margin-bottom:8px;">Declinar</button>`;
  $("noticeOverlay").classList.remove("hidden");
  $("btnAcceptParty").onclick = ()=>{
    $("noticeOverlay").classList.add("hidden");
    removePendingNotification(notifId);
    doAccept();
  };
  $("btnDeclineParty").onclick = ()=>{
    $("noticeOverlay").classList.add("hidden");
    removePendingNotification(notifId);
    doDecline();
  };
}

function acceptPartyInvite(c){
  incomingPartyInvite = null;
  party = { id: c.partyId, leaderId: c.fromId, members: [] }; // se completa al recibir el roster
  pubnub.subscribe({channels:[partyChannel(c.partyId)]});
  setTimeout(()=>{
    pubnub.publish({channel: partyChannel(c.partyId), storeInHistory:false,
      message:{type:'party_join', member: myMemberSnapshot()}});
  }, 400); // pequeño margen para que la suscripción quede activa antes de publicar
  toast("Te uniste al grupo. Esperando confirmación…", 3000);
  renderMapPartyPanel();
}

function handlePartyChannelMessage(channel, msg){
  if(!party || channel !== partyChannel(party.id)) return;
  if(msg.type === 'party_join'){
    if(!party.members.some(m=>m.id===msg.member.id)){
      if(party.members.length >= PARTY_MAX){
        if(party.leaderId === myPlayerId) toast(`${msg.member.name} intentó unirse pero el grupo ya está lleno.`);
        return;
      }
      party.members.push(msg.member);
      toast(`👥 ${msg.member.name} se unió al grupo (${party.members.length}/${PARTY_MAX}).`);
    }
    if(party.leaderId === myPlayerId){
      pubnub.publish({channel: partyChannel(party.id), storeInHistory:false,
        message:{type:'party_roster', members: party.members, leaderId: party.leaderId}});
    }
    renderMapPartyPanel();
  } else if(msg.type === 'party_roster'){
    party.members = msg.members;
    party.leaderId = msg.leaderId;
    renderMapPartyPanel();
  } else if(msg.type === 'party_member_update'){
    const idx = party.members.findIndex(m=>m.id===msg.member.id);
    if(idx>=0) party.members[idx] = msg.member;
    renderMapPartyPanel();
  } else if(msg.type === 'party_leave'){
    party.members = party.members.filter(m=>m.id !== msg.id);
    if(msg.id === party.leaderId){
      toast("El líder salió del grupo — el grupo se disolvió.", 4000);
      if(pubnub) pubnub.unsubscribe({channels:[partyChannel(party.id)]});
      party = null;
      renderMapPartyPanel();
      return;
    }
    toast(`Un jugador salió del grupo (${party.members.length}/${PARTY_MAX}).`);
    renderMapPartyPanel();
  } else if(msg.type === 'party_battle_start'){
    startGroupBattleFromPayload(msg);
  } else if(msg.type === 'group_move'){
    if(!groupBattle || msg.battleId !== groupBattle.battleId || msg.turn !== groupBattle.turn) return;
    groupBattle.pendingMoves[msg.from] = msg.moveId;
    maybeResolveGroupTurn();
  } else if(msg.type === 'group_concede'){
    if(!groupBattle || msg.battleId !== groupBattle.battleId) return;
    const m = groupBattle.members[msg.from];
    if(m) m.hp = 0;
    maybeResolveGroupTurn();
    checkGroupBattleEnd();
  } else if(msg.type === 'group_flee_propose'){
    if(!groupBattle || msg.battleId !== groupBattle.battleId) return;
    if(msg.from === myPlayerId) return; // ya lo manejé localmente al proponerlo
    groupBattle.fleeVote = { voteId: msg.voteId, votes: {[msg.from]: true} };
    $("noticeEmoji").textContent = "🏳️";
    $("noticeTitle").textContent = "¿Huir del combate?";
    $("noticeSub").textContent = `${msg.fromName} propone que todo el grupo huya de este combate. Se necesita que todos estén de acuerdo.`;
    $("noticeActions").innerHTML = `<button class="primarybtn" id="btnFleeYes" style="margin-bottom:8px;">🏃 Sí, huyamos</button>
      <button class="ghostbtn" id="btnFleeNo" style="margin-bottom:8px;">Seguir peleando</button>`;
    $("noticeOverlay").classList.remove("hidden");
    $("btnFleeYes").onclick = ()=>{
      $("noticeOverlay").classList.add("hidden");
      pubnub.publish({channel: partyChannel(party.id), storeInHistory:false,
        message:{type:'group_flee_vote', battleId:groupBattle.battleId, voteId:msg.voteId, from:myPlayerId, agree:true}});
    };
    $("btnFleeNo").onclick = ()=>{
      $("noticeOverlay").classList.add("hidden");
      pubnub.publish({channel: partyChannel(party.id), storeInHistory:false,
        message:{type:'group_flee_vote', battleId:groupBattle.battleId, voteId:msg.voteId, from:myPlayerId, agree:false}});
    };
  } else if(msg.type === 'group_flee_vote'){
    if(!groupBattle || msg.battleId !== groupBattle.battleId || !groupBattle.fleeVote || groupBattle.fleeVote.voteId !== msg.voteId) return;
    groupBattle.fleeVote.votes[msg.from] = msg.agree;
    if(!msg.agree){
      toast(`${memberNameById(msg.from)} prefirió seguir peleando. El combate continúa.`, 3500);
      groupBattle.fleeVote = null;
      renderGroupMoveGrid();
      return;
    }
    const aliveIds = Object.keys(groupBattle.members).filter(id=> groupBattle.members[id].hp > 0);
    const allAgreed = aliveIds.every(id=> groupBattle.fleeVote.votes[id] === true);
    if(allAgreed) fleeGroupTogether();
  } else if(msg.type === 'group_battle_end'){
    forceCloseGroupBattleFromPeer(msg);
  } else if(msg.type === 'quest_share'){
    handleQuestShare(msg);
  }
}

function leaveParty(){
  if(!party) return;
  if(pubnub) pubnub.publish({channel: partyChannel(party.id), storeInHistory:false, message:{type:'party_leave', id: myPlayerId}});
  if(pubnub) pubnub.unsubscribe({channels:[partyChannel(party.id)]});
  party = null;
  toast("Saliste del grupo.");
  renderMapPartyPanel();
}

/** Panel fijo en el mapa (lado izquierdo, vertical) mostrando a cada miembro del grupo y su nivel. */
function renderMapPartyPanel(){
  const panel = $("mapPartyPanel");
  if(!party || party.members.length <= 1){
    panel.classList.add("hidden");
    panel.innerHTML = "";
    return;
  }
  panel.classList.remove("hidden");
  panel.innerHTML = party.members.map(m=>{
    const isLeader = m.id === party.leaderId;
    const isMe = m.id === myPlayerId;
    return `<div class="mp-member${isLeader?" leader":""}">
      <span class="mp-emoji">${(CLASSES[m.classKey]||{}).emoji||"🧑"}</span>
      <span class="mp-info">${escapeHtml(m.name)}${isMe?" (tú)":""}${isLeader?" 👑":""}<br>Nv. <b>${m.level}</b></span>
    </div>`;
  }).join("");
}

function renderPartyOverlay(){
  const list = $("partyList");
  list.innerHTML = "";
  if(!party){
    list.innerHTML = `<div class="empty-note">No estás en ningún grupo todavía. Créalo y luego invita a jugadores cercanos desde su menú.</div>`;
    $("btnLeaveParty").classList.add("hidden");
    $("btnCreateParty").classList.remove("hidden");
    return;
  }
  $("btnCreateParty").classList.add("hidden");
  $("btnLeaveParty").classList.remove("hidden");
  party.members.forEach(m=>{
    const row = document.createElement("div");
    row.className = "inv-item";
    const isLeader = m.id === party.leaderId;
    const isMe = m.id === myPlayerId;
    row.innerHTML = `<div class="ie">${(CLASSES[m.classKey]||{}).emoji||"🧑"}</div>
      <div class="it">${escapeHtml(m.name)}${isMe?" (tú)":""}<small>${(CLASSES[m.classKey]||{}).name||""} · Nv. ${m.level}${isLeader?" · 👑 Líder":""}</small></div>`;
    list.appendChild(row);
  });
}
$("btnParty").onclick = ()=>{ closeFabMenu(); renderPartyOverlay(); $("partyOverlay").classList.remove("hidden"); };
$("btnRegions").onclick = ()=>{ closeFabMenu(); renderRegionsOverlay(); $("regionsOverlay").classList.remove("hidden"); };
$("btnPets").onclick = ()=>{ closeFabMenu(); renderPetsOverlay(); $("petsOverlay").classList.remove("hidden"); };
$("btnReturnToMenu").onclick = ()=>{
  closeFabMenu();
  if(isBusyWithBattle()){ toast("No puedes salir en medio de un combate."); return; }
  $("returnMenuOverlay").classList.remove("hidden");
};
$("btnCancelReturnMenu").onclick = ()=> $("returnMenuOverlay").classList.add("hidden");
$("btnConfirmReturnMenu").onclick = async ()=>{
  $("returnMenuOverlay").classList.add("hidden");
  await saveGame();
  teardownMapIfExists();
  $("classOverlay").classList.remove("hidden");
  await initContinueScreen();
};
$("btnClosePets").onclick = ()=> $("petsOverlay").classList.add("hidden");
$("btnOpenMonsterCodex").onclick = ()=>{ renderMonsterCodex(); $("monsterCodexOverlay").classList.remove("hidden"); };
$("btnCloseMonsterCodex").onclick = ()=> $("monsterCodexOverlay").classList.add("hidden");
/** Todas las especies "coleccionables" del Bestiario — monstruos normales del mapa + jefes de
 *  región. NO incluye enemigos especiales no capturables (Lobo Nocturno, Lobo Sombrío, uncapturable:true
 *  en sus templates) ni NPCs especiales (Ladrón Errante, Comerciante, Vagabundo) — esos son
 *  encuentros puntuales, no parte de la colección "de bestiario" pensada acá. */
function monsterCodexSpecies(){
  return [...MONSTER_TEMPLATES, ...BOSS_TEMPLATES];
}
/** Página del Bestiario por especie: la registrada en player.monsterRegistry (ver attemptCapture)
 *  se revela con su emoji/nombre real; la que nunca capturaste queda en silueta "???" — la idea es
 *  ir llenando el libro de a poco, como pedido explícito ("un libro con tarjetas de monstruos"). */
function renderMonsterCodex(){
  const list = $("monsterCodexList");
  if(!list) return;
  list.innerHTML = "";
  const registry = player.monsterRegistry || {};
  const species = monsterCodexSpecies();
  let capturedCount = 0;
  species.forEach(tpl=>{
    const entry = registry[tpl.name];
    if(entry) capturedCount++;
    const isBossSpecies = BOSS_TEMPLATES.some(t=>t.name===tpl.name);
    const card = document.createElement("div");
    card.className = "inv-card-v2 codex-piece-slot" + (entry ? "" : " missing");
    card.innerHTML = entry
      ? `<div class="icv-icon">${tpl.emoji}</div><div class="icv-name">${tpl.name}</div>
         <div class="icv-lvl">Capturado${entry.count>1?` x${entry.count}`:""}${isBossSpecies?" · 👑 Jefe":""}</div>`
      : `<div class="icv-icon">❓</div><div class="icv-name">???</div>
         <div class="icv-lvl">No capturado</div>`;
    list.appendChild(card);
  });
  const progressEl = $("monsterCodexProgress");
  if(progressEl) progressEl.textContent = `${capturedCount}/${species.length} páginas completas`;
}
/** Determina la rareza "de carta coleccionable" de una mascota — para mascotas capturadas antes de
 *  este sistema (sin las banderas nuevas) se hace una estimación por el nombre de la especie. */
function petRarityInfo(pet){
  const isBossSpecies = BOSS_TEMPLATES.some(t=>t.name===pet.name);
  if(pet.isBoss || isBossSpecies){
    return {tier:"legendary", stars:10, label:"Legendaria", color:"var(--rarity-legendary, #e8c468)",
      habitat:"Tierras Ancestrales", flavor:"Se dice que su poder es tan antiguo como el mundo mismo."};
  }
  if(pet.isParkGuardian){
    return {tier:"epic", stars:7, label:"Épica", color:"var(--rarity-epic, #c98bf0)",
      habitat:"Guarida del Guardián", flavor:"Vigila su territorio con una fiereza inquebrantable."};
  }
  if(pet.aggressive){
    return {tier:"rare", stars:5, label:"Rara", color:"#4aa3e0",
      habitat:"Territorios Salvajes", flavor:"Ataca sin dudarlo a quien invada su espacio."};
  }
  return {tier:"common", stars:3, label:"Común", color:"#8b93a5",
    habitat:"Zonas Habitadas", flavor:"Una criatura común de la región, pero no por eso menos peligrosa."};
}

function renderPetsOverlay(){
  const list = $("petsList");
  list.innerHTML = "";
  const pets = player.pets || [];
  if(pets.length===0){
    list.innerHTML = `<div class="empty-note" style="grid-column:1/-1;">Aún no tienes mascotas. Derrota a los guardianes de las 5 regiones para conseguir la 🎴 Carta de Captura, y úsala en combate cuando el enemigo tenga poca vida.</div>`;
    return;
  }
  pets.forEach(pet=>{
    ensurePetStats(pet);
    const info = petRarityInfo(pet);
    const card = document.createElement("div");
    card.className = "pet-mini-card";
    card.style.borderColor = info.color;
    card.style.boxShadow = `0 0 10px ${info.color}55`;
    card.innerHTML = `<div class="pmc-lvl">Nv.${pet.level}</div>
      <div class="pmc-portrait">${pet.emoji}</div>
      <div class="pmc-name">${pet.customName || pet.name}</div>
      <div class="pmc-stars" style="color:${info.color};">${"★".repeat(Math.min(5,Math.round(info.stars/2)))}</div>`;
    card.onclick = ()=> openPetDetail(pet);
    list.appendChild(card);
  });
}

/** Muestra el detalle completo de una mascota como una carta coleccionable, con sus movimientos,
 *  nivel, accesorios, y te deja ponerle un nombre propio. */
function openPetDetail(pet){
  ensurePetStats(pet);
  const flipInner = $("petCardFlipInner");
  if(flipInner) flipInner.classList.remove("flipped");
  const info = petRarityInfo(pet);
  $("petDetailEmoji").textContent = pet.emoji;
  $("petDetailTitle").textContent = pet.customName || pet.name;
  $("petDetailTypeLabel").textContent = pet.name;
  $("petDetailLevelBadge").textContent = `Nv.${pet.level}`;
  $("petDetailStars").innerHTML = "⭐".repeat(info.stars);
  $("petDetailStars").style.color = info.color;
  $("petDetailStatsRow").innerHTML = `
    <div class="pcs-item">⚔️<b>${pet.atk}</b><small>ATQ</small></div>
    <div class="pcs-item">🛡️<b>${pet.def}</b><small>DEF</small></div>
    <div class="pcs-item">🍃<b>${pet.spd}</b><small>VEL</small></div>
    <div class="pcs-item">❤️<b>${pet.maxHp}</b><small>VIDA</small></div>`;
  $("petDetailMoves").innerHTML = pet.moves.map(mv=>
    `<div class="pcm-row"><div><b>${mv.name}</b><small>${mv.desc||"Ataque de la mascota"}</small></div><div class="pcm-power">${mv.power}</div></div>`
  ).join("");
  $("petDetailFooter").innerHTML = `
    <div class="pcf-item"><small>RAREZA</small><b style="color:${info.color};">${info.label}</b></div>
    <div class="pcf-item"><small>HÁBITAT</small><b>${info.habitat}</b></div>`;
  $("petDetailFlavor").textContent = info.flavor;
  $("petDetailNameInput").value = pet.customName || pet.name;
  $("petDetailHpFill").style.width = pct(pet.hp, pet.maxHp)+"%";
  $("petDetailHpLabel").textContent = `${pet.hp} / ${pet.maxHp} HP`;
  $("petDetailXpFill").style.width = pct(pet.xp, pet.xpNext)+"%";
  $("petDetailXpLabel").textContent = `${pet.xp} / ${pet.xpNext} XP`;
  $("petDetailAccessory").textContent = pet.accessory
    ? `${pet.accessory.emoji} ${pet.accessory.name}`
    : "Sin accesorios equipados (próximamente).";
  $("petDetailOverlay").classList.remove("hidden");
  $("btnSavePetName").onclick = ()=>{
    const newName = $("petDetailNameInput").value.trim();
    if(newName) pet.customName = newName;
    $("petDetailOverlay").classList.add("hidden");
    renderPetsOverlay();
    saveGame();
    toast(`🐾 ¡Ahora se llama ${pet.customName}!`);
  };
  $("btnClosePetDetail").onclick = ()=> $("petDetailOverlay").classList.add("hidden");
  $("btnReleasePet").onclick = ()=>{
    $("petDetailOverlay").classList.add("hidden");
    promptReleasePet(pet);
  };
  $("btnHealPet").onclick = ()=>{
    $("petDetailOverlay").classList.add("hidden");
    openHealPetPicker(pet);
  };
}

/** Voltea la carta de mascota al arrastrar el dedo — sigue el dedo mientras arrastras, y al soltar
 *  se acomoda del lado que quedó más cerca (si arrastraste suficiente, termina de voltear). Se
 *  conecta UNA sola vez (los elementos de la carta son fijos en el HTML, no se recrean). */
(function setupPetCardFlip(){
  const wrap = $("petCardFlipWrap");
  const inner = $("petCardFlipInner");
  if(!wrap || !inner) return;
  let startX = 0, dragging = false, startedFlipped = false;

  function isFlipped(){ return inner.classList.contains("flipped"); }
  function pointerDown(x){
    dragging = true; startX = x; startedFlipped = isFlipped();
    inner.classList.add("dragging");
  }
  function pointerMove(x){
    if(!dragging) return;
    const deltaDeg = (x - startX) * 0.5; // arrastrar ~180px hace una vuelta completa
    const base = startedFlipped ? 180 : 0;
    inner.style.transform = `rotateY(${base + deltaDeg}deg)`;
  }
  function pointerUp(x){
    if(!dragging) return;
    dragging = false;
    inner.classList.remove("dragging");
    inner.style.transform = "";
    const delta = x - startX;
    const finalFlipped = Math.abs(delta) > 40 ? !startedFlipped : startedFlipped;
    inner.classList.toggle("flipped", finalFlipped);
  }

  wrap.addEventListener("touchstart", e=> pointerDown(e.touches[0].clientX), {passive:true});
  wrap.addEventListener("touchmove", e=> pointerMove(e.touches[0].clientX), {passive:true});
  wrap.addEventListener("touchend", e=> pointerUp(e.changedTouches[0].clientX));
  wrap.addEventListener("mousedown", e=> pointerDown(e.clientX));
  window.addEventListener("mousemove", e=> pointerMove(e.clientX));
  window.addEventListener("mouseup", e=> pointerUp(e.clientX));
})();

/** Lista las pociones curativas del inventario para aplicárselas a esta mascota. */
function openHealPetPicker(pet){
  ensurePetStats(pet);
  const list = $("healPetPickList");
  list.innerHTML = "";
  const potions = player.inventory.filter(it=>it.type==="heal");
  if(pet.hp >= pet.maxHp){
    list.innerHTML = `<div class="empty-note">${petDisplayName(pet)} ya tiene la vida al máximo.</div>`;
  } else if(potions.length===0){
    list.innerHTML = `<div class="empty-note">No tienes pociones curativas. Cómpralas en la tienda.</div>`;
  } else {
    const seen = new Set();
    potions.forEach(it=>{
      if(seen.has(it.id)) return;
      seen.add(it.id);
      const count = potions.filter(p=>p.id===it.id).length;
      const healAmount = Math.round(pet.maxHp*it.amount);
      const row = document.createElement("div");
      row.className = "cm-item";
      row.innerHTML = `<div style="flex:1;"><span>${it.emoji} ${it.name}${count>1?" x"+count:""}</span>
        <small style="display:block; color:var(--dim); font-size:10.5px;">Cura ~${healAmount} HP</small></div>
        <button>Usar</button>`;
      row.querySelector("button").onclick = ()=>{
        const idx = player.inventory.findIndex(p=>p.id===it.id);
        if(idx<0) return;
        pet.hp = Math.min(pet.maxHp, pet.hp + healAmount);
        player.inventory.splice(idx,1);
        $("healPetPickOverlay").classList.add("hidden");
        toast(`🧪 ${petDisplayName(pet)} recupera ${healAmount} HP.`);
        refreshHud(); saveGame();
        openPetDetail(pet); // refresca la barra de vida ya actualizada
      };
      list.appendChild(row);
    });
  }
  $("healPetPickOverlay").classList.remove("hidden");
}
$("btnCloseHealPetPick").onclick = ()=> $("healPetPickOverlay").classList.add("hidden");

/** Pide confirmar antes de liberar una mascota — no se puede deshacer. */
function promptReleasePet(pet){
  $("releasePetEmoji").textContent = pet.emoji;
  $("releasePetSub").textContent = `Vas a liberar a ${petDisplayName(pet)} (${pet.name}, Nv.${pet.level}). No podrás recuperarla — tendrías que volver a capturar otra igual.`;
  $("releasePetOverlay").classList.remove("hidden");
  $("btnConfirmReleasePet").onclick = ()=>{
    player.pets = (player.pets||[]).filter(p=>p.id!==pet.id);
    $("releasePetOverlay").classList.add("hidden");
    renderPetsOverlay();
    saveGame();
    toast(`🕊️ Liberaste a ${petDisplayName(pet)}. Vuela libre.`);
  };
  $("btnCancelReleasePet").onclick = ()=> $("releasePetOverlay").classList.add("hidden");
}
$("btnCloseRegions").onclick = ()=>{
  $("regionsOverlay").classList.add("hidden");
  returnToBaseRoomIfPending();
};
$("btnCloseParty").onclick = ()=> $("partyOverlay").classList.add("hidden");
$("btnLeaveParty").onclick = ()=>{
  showConfirm("¿Salir del grupo?", ()=>{
    leaveParty(); $("partyOverlay").classList.add("hidden");
  }, {icon:"🛡️", confirmLabel:"Salir"});
};
$("btnCreateParty").onclick = ()=>{
  if(!pubnub){ toast("El multijugador no está conectado ahora mismo.", 3500); return; }
  party = { id: 'p'+Math.random().toString(36).slice(2,9), leaderId: myPlayerId, members: [myMemberSnapshot()] };
  pubnub.subscribe({channels:[partyChannel(party.id)]});
  renderMapPartyPanel();
  renderPartyOverlay();
  toast("🛡️ Grupo creado. Invita a jugadores cercanos desde su menú de acción.", 4000);
};

$("btnInviteParty").onclick = ()=>{
  const target = selectedNearbyPlayer;
  $("playerActionOverlay").classList.add("hidden");
  sendPartyInvite(target);
};

/* ---------- Iniciar el combate de grupo (solo el líder) ---------- */
function startGroupEncounter(mon){
  const n = party.members.length;
  const hpMult = 1 + 0.5*(n-1);
  const atkMult = 1 + 0.3*(n-1);
  const defMult = 1 + 0.15*(n-1);
  // antes de nivel 7 siempre es 1 solo enemigo (aunque el grupo sea grande) — recién a partir
  // de ahí "a veces numeroso" empieza a sumar más bulto de HP/recompensa, no más barras.
  const count = player.level < 7 ? 1 : (n>=4 ? 3 : (n>=2 ? 2 : 1));
  const scaledMaxHp = Math.round(mon.maxHp * hpMult * (1 + (count-1)*0.4));
  const scaledAtk = +(mon.atk * atkMult).toFixed(1);
  const scaledDef = +(mon.def * defMult).toFixed(1);

  const battleId = 'g'+Math.random().toString(36).slice(2,9);
  const payload = {
    type:'party_battle_start', battleId,
    monster: {
      name: mon.tpl.name, emoji: mon.tpl.emoji, level: mon.level, count,
      maxHp: scaledMaxHp, atk: scaledAtk, def: scaledDef, spd: mon.spd, isBoss: !!mon.isBoss
    },
    members: party.members
  };
  // el líder también "consume" el monstruo de su propio mapa
  map.removeLayer(mon.marker);
  monsters = monsters.filter(m=>m.id!==mon.id);

  pubnub.publish({channel: partyChannel(party.id), storeInHistory:false, message: payload});
  toast(`⚔️ ¡Iniciando combate de grupo contra ${count>1?count+"x ":""}${mon.tpl.name}!`, 3500);
}

function startGroupBattleFromPayload(payload){
  if(battleState || pvp){ return; } // ya ocupado en otra cosa, no se puede unir a tiempo
  const members = {};
  payload.members.forEach(m=>{
    members[m.id] = {
      name:m.name, classKey:m.classKey, gender:m.gender, level:m.level,
      atk:m.atk, matk:m.matk||0, def:m.def, spd:m.spd,
      maxHp:m.maxHp, maxMp:m.maxMp, hp:m.maxHp, mp:m.maxMp,
      ultimateMove: m.ultimateMove || null,
      buffs:{atk:1,def:1,spd:1,turnsAtk:0,turnsDef:0}
    };
  });
  groupBattle = {
    battleId: payload.battleId,
    monster: {...payload.monster, hp: payload.monster.maxHp},
    members,
    turn: 1,
    pendingMoves: {},
    turnTimeout: null
  };
  renderGroupBattleUI();
}

function renderGroupBattleUI(){
  const me = groupBattle.members[myPlayerId];
  // Grupo tampoco usa battleState (usa groupBattle) — mismo motivo que en renderPvpBattleUI.
  $("battleWrap").classList.remove("senor-oscuro-bg");
  updateBattleRainFx();
  $("battleWrap").classList.add("group-mode");
  // el sistema de perspectiva no cubre el modo grupo (varios aliados en pantalla, ver arriba) —
  // esto solo se asegura de dejar jugador/enemigo en su flujo flex normal por si un combate
  // anterior sí lo usó.
  refreshBattleStagePerspective("group", false);
  $("soloEnemyPanel").classList.remove("hidden");
  $("packEnemyPanels").classList.add("hidden");
  $("spriteEnemy").classList.remove("hidden");
  $("packStageRow").classList.add("hidden");
  $("bPName").textContent = player.name;
  $("bPLvl").textContent = "Nv."+player.level;
  const mon = groupBattle.monster;
  $("bEName").textContent = mon.name + (mon.count>1 ? ` x${mon.count}` : "");
  $("bELvl").textContent = "Nv."+mon.level;
  renderPlayerSprite();
  if(mon.count > 1){
    $("spriteEnemy").innerHTML = `<div style="display:flex; gap:0px;">${Array(mon.count).fill(`<span style="font-size:44px;">${mon.emoji}</span>`).join("")}</div>`;
  } else {
    $("spriteEnemy").innerHTML = "";
    $("spriteEnemy").textContent = mon.emoji;
  }
  updateGroupBattleBars();
  renderPartyStatusRow();
  logBattle(`¡Tu grupo se enfrenta a ${mon.count>1?mon.count+"x ":""}${mon.name}!`, true);
  renderGroupMoveGrid();
  $("battleWrap").classList.remove("hidden");
  playBattleEntranceFx();
  playCharacterSlideInFx(); // el retraso hasta que se revele la escena vive en el CSS (animation-delay), no acá
}

function updateGroupBattleBars(){
  const me = groupBattle.members[myPlayerId];
  $("bPHp").style.width = pct(me.hp, me.maxHp)+"%";
  $("bPMp").style.width = pct(me.mp, me.maxMp)+"%";
  $("bEHp").style.width = pct(groupBattle.monster.hp, groupBattle.monster.maxHp)+"%";
}

function renderPartyStatusRow(){
  const row = $("partyStatusRow");
  row.classList.remove("hidden");
  row.innerHTML = "";
  const allyWrap = $("groupAllyStageRow");
  allyWrap.innerHTML = "";
  let anyOther = false;
  Object.entries(groupBattle.members).forEach(([id, m])=>{
    if(id === myPlayerId) return;
    anyOther = true;
    const dead = m.hp <= 0;
    const chip = document.createElement("div");
    chip.className = "combatant player ally-combatant" + (dead ? " dead" : "");
    chip.innerHTML = `<div class="name"><span>${m.name}</span><span class="lvl">Nv.${m.level||1}</span></div>
      <div class="bar-wrap"><div class="bar-fill bar-hp" style="width:${pct(m.hp,m.maxHp)}%"></div></div>
      <div class="bar-wrap"><div class="bar-fill bar-mp" style="width:${pct(m.mp,m.maxMp)}%"></div></div>`;
    row.appendChild(chip);

    const mini = document.createElement("div");
    mini.className = "ally-mini" + (dead ? " dead" : "");
    mini.id = "allySprite-"+id;
    mini.innerHTML = `<div class="am-bar"><div class="am-fill" style="width:${pct(m.hp,m.maxHp)}%"></div></div>
      <div class="am-sprite">${combatSpriteHtml(m.classKey, m.gender)}</div>`;
    allyWrap.appendChild(mini);
  });
  allyWrap.classList.toggle("hidden", !anyOther);
}

function renderGroupMoveGrid(){
  const grid = $("movegrid");
  grid.innerHTML = "";
  const me = groupBattle.members[myPlayerId];
  if(me.hp <= 0){
    grid.innerHTML = `<div class="empty-note" style="grid-column:1/-1;">Has caído en combate. Esperando al resto de tu grupo…</div>`;
    return;
  }
  getAllUsableMoves().forEach((mv)=>{
    const btn = document.createElement("button");
    btn.className = "move-btn" + (mv.type==="buff"?" buff":"") + (mv.isUltimate?" ultimate-move":"");
    const canAfford = canAffordMove(mv, me.mp, me.hp, me.maxHp);
    btn.disabled = !canAfford;
    const costLabel = mv.costsAllMp ? `<span class="move-mp-cost">TODO tu maná</span>` : `<span class="move-mp-cost">MP ${mv.cost||0}</span>`;
    btn.innerHTML = `<div class="mname">${mv.name}${moveTargetIcon(mv)}</div><div class="mmeta">${moveInfoLine(mv)} · ${costLabel}</div>`;
    btn.onclick = ()=> groupPlayerAction(mv);
    attachMoveTooltip(btn, mv);
    grid.appendChild(btn);
  });
  const flee = document.createElement("button");
  flee.className = "flee-btn";
  flee.textContent = "🏳️ Proponer huir del combate";
  flee.onclick = proposeGroupFlee;
  grid.appendChild(flee);

  startTurnTimer(20, ()=>{
    if(!groupBattle || groupBattle.pendingMoves[myPlayerId] != null) return;
    const affordable = getAllUsableMoves().filter(mv=> canAffordMove(mv, me.mp, me.hp, me.maxHp));
    if(affordable.length){
      logBattle("⏱️ Se acabó tu tiempo — se eligió un movimiento al azar.");
      groupPlayerAction(affordable[Math.floor(Math.random()*affordable.length)]);
    }
  });
}

function groupPlayerAction(mv){
  if(!groupBattle || groupBattle.pendingMoves[myPlayerId] != null) return;
  const me = groupBattle.members[myPlayerId];
  if(!canAffordMove(mv, me.mp, me.hp, me.maxHp)) return;
  clearTurnTimer();
  groupBattle.pendingMoves[myPlayerId] = mv.id;
  disableMoves(true);
  logBattle(`Elegiste ${mv.name}. Esperando al resto del grupo…`);
  const movePayload = {type:'group_move', battleId:groupBattle.battleId, turn:groupBattle.turn, from:myPlayerId, moveId:mv.id};
  pubnub.publish({channel: partyChannel(party.id), storeInHistory:false, message: movePayload});
  // reenvía el mismo movimiento una vez más a los pocos segundos, por si el primer mensaje
  // se perdió en el camino (evita que alguien se quede esperando para siempre).
  const resendTimer = setTimeout(()=>{
    if(groupBattle && groupBattle.battleId===movePayload.battleId && groupBattle.turn===movePayload.turn){
      pubnub.publish({channel: partyChannel(party.id), storeInHistory:false, message: movePayload});
    }
  }, 6000);
  clearTimeout(groupBattle.turnTimeout);
  groupBattle.turnTimeout = setTimeout(()=>{ clearTimeout(resendTimer); maybeResolveGroupTurn(true); }, 25000);
  maybeResolveGroupTurn();
}

function groupConcede(){
  if(!groupBattle) return;
  clearTurnTimer();
  const me = groupBattle.members[myPlayerId];
  me.hp = 0;
  pubnub.publish({channel: partyChannel(party.id), storeInHistory:false,
    message:{type:'group_concede', battleId:groupBattle.battleId, from:myPlayerId}});
  logBattle("Abandonas el combate de grupo.");
  checkGroupBattleEnd();
}

/** Propone huir del combate a todo el grupo; si TODOS los vivos están de acuerdo, se huye juntos. */
function proposeGroupFlee(){
  if(!groupBattle) return;
  const voteId = 'v'+Math.random().toString(36).slice(2,8);
  groupBattle.fleeVote = { voteId, votes: {[myPlayerId]: true} };
  pubnub.publish({channel: partyChannel(party.id), storeInHistory:false,
    message:{type:'group_flee_propose', battleId:groupBattle.battleId, voteId, from:myPlayerId, fromName:player.name}});
  toast("🏳️ Propusiste huir del combate. Esperando que el resto del grupo esté de acuerdo…", 4000);
  const aliveIds = Object.keys(groupBattle.members).filter(id=> groupBattle.members[id].hp > 0);
  if(aliveIds.length <= 1) fleeGroupTogether(); // estás solo con vida: huyes de inmediato
}

/** Todos aceptaron: el grupo entero escapa del combate sin recompensa (igual que huir en solitario). */
function fleeGroupTogether(){
  if(!groupBattle) return;
  clearTurnTimer();
  logBattle("¡Tu grupo huyó del combate!");
  setTimeout(()=>{
    $("battleWrap").classList.add("hidden");
    $("partyStatusRow").classList.add("hidden");
    $("groupAllyStageRow").classList.add("hidden");
    toast("Tu grupo escapó del combate.");
    groupBattle = null;
  }, 400);
}

function maybeResolveGroupTurn(forceTimeout){
  if(!groupBattle || groupBattle.resolving) return; // ya se está resolviendo este turno, no lo dispares dos veces
  const aliveIds = Object.keys(groupBattle.members).filter(id=> groupBattle.members[id].hp > 0);
  const allIn = aliveIds.every(id=> groupBattle.pendingMoves[id] != null);
  if(!allIn && !forceTimeout) return;
  clearTimeout(groupBattle.turnTimeout);
  groupBattle.resolving = true;
  resolveGroupTurn(aliveIds);
}

/** Núcleo determinista del turno de grupo: idéntico en todos los celulares con la misma semilla. */
/** Anima o resalta el mini-sprite de UN compañero específico del grupo (por id de jugador). */
function animateAllyMini(memberId, cls){
  const el = document.getElementById("allySprite-"+memberId);
  if(!el) return;
  const inner = el.querySelector(".am-sprite");
  if(!inner) return;
  inner.classList.remove("hitshake","attackp","attacke","ultimate-strike","ultimate-hit");
  void inner.offsetWidth;
  inner.classList.add(cls);
}
function flashAllyMini(memberId, color){
  const el = document.getElementById("allySprite-"+memberId);
  if(!el) return;
  el.classList.remove("flash-red","flash-green","flash-ultimate");
  void el.offsetWidth;
  const cls = color==="green" ? "flash-green" : color==="ultimate" ? "flash-ultimate" : "flash-red";
  el.classList.add(cls);
  clearTimeout(el._flashTimer);
  el._flashTimer = setTimeout(()=> el.classList.remove(cls), color==="ultimate" ? 950 : 600);
}

function resolveGroupTurn(aliveIds){
  const rng = seededRandom(groupBattle.battleId + ":" + groupBattle.turn);
  const mon = groupBattle.monster;
  const actions = [];
  aliveIds.forEach(id=>{
    const moveId = groupBattle.pendingMoves[id];
    if(moveId == null) return; // no llegó a tiempo, pierde el turno
    const m0 = groupBattle.members[id];
    const mv = (CLASSES[m0.classKey]||{}).movePool.find(m=>m.id===moveId) || (m0.ultimateMove && m0.ultimateMove.id===moveId ? m0.ultimateMove : null);
    if(!mv) return;
    const m = groupBattle.members[id];
    actions.push({id, mv, spd: m.spd * m.buffs.spd});
  });
  actions.push({id:"__monster__", spd: mon.spd});
  actions.sort((a,b)=> b.spd - a.spd || (rng()<0.5?-1:1));

  let i = 0;
  function processNext(){
    if(i >= actions.length){ finishGroupTurn(); return; }
    const act = actions[i]; i++;

    if(act.id === "__monster__"){
      if(mon.hp <= 0){ processNext(); return; }
      const targets = Object.keys(groupBattle.members).filter(id=> groupBattle.members[id].hp > 0);
      if(targets.length===0){ processNext(); return; }
      const targetId = targets[Math.floor(rng()*targets.length)];
      const t = groupBattle.members[targetId];
      const targetLabel = targetId===myPlayerId ? "ti" : memberNameById(targetId);

      // paso 1: anuncia a quién eligió atacar, ANTES de golpear (para que se note la selección)
      logBattle(`${mon.name} apunta a ${targetLabel}…`);

      setTimeout(()=>{
        const power = 0.9 + rng()*0.5;
        const defEff = t.def * t.buffs.def;
        let base = Math.max(1, mon.atk*power - defEff*0.5);
        let dmg = Math.round(base * (0.85 + rng()*0.3));
        t.hp = Math.max(0, t.hp - dmg);
        logBattle(`${mon.name} ataca a ${targetLabel}: ${dmg} de daño.`);
        updateGroupBattleBars();
        renderPartyStatusRow();
        // animar DESPUÉS de renderizar, para no perder la animación en el refresco del HTML
        animateSprite("spriteEnemy","attacke");
        if(targetId === myPlayerId){
          animateSprite("spritePlayer","hitshake");
          flashSprite("spritePlayer","red");
          spawnFloatingNumber("spritePlayer", "-"+dmg, (dmg >= t.maxHp*0.5) ? "crit" : "damage");
        } else {
          animateAllyMini(targetId, "hitshake");
          flashAllyMini(targetId, "red");
          spawnFloatingNumber("allySprite-"+targetId, "-"+dmg, (dmg >= t.maxHp*0.5) ? "crit" : "damage");
        }
        maybeShowCrit(dmg, t.maxHp);
        setTimeout(processNext, 1100);
      }, 700);
    } else {
      const m = groupBattle.members[act.id];
      if(!m || m.hp<=0){ processNext(); return; }
      const isMe = act.id === myPlayerId;

      // paso 1: anuncia quién va a actuar y con qué movimiento, ANTES de resolverlo
      logBattle(`${isMe?"Te preparas":m.name+" se prepara"} para usar ${act.mv.name}…`);
      if(act.mv.isUltimate){
        logBattle(`✨ ¡${isMe?"vas a desatar":m.name+" va a desatar"} su movimiento definitivo!`);
        if(isMe) playUltimateChargeUp("spritePlayer"); else playUltimateChargeUpAlly(act.id);
      } else if(isMe) animateSprite("spritePlayer","attackp"); else animateAllyMini(act.id, "attackp");

      setTimeout(()=>{
        const monHpBefore = mon.hp;
        const result = applyGroupMemberMove(act.id, act.mv, rng);
        updateGroupBattleBars();
        renderPartyStatusRow();
        if(act.mv.type === "heal"){
          const recId = (result && result.healRecipientId) || act.id;
          const healAmount = result && result.healAmount;
          if(recId === myPlayerId){
            flashSprite("spritePlayer","green");
            if(healAmount) spawnFloatingNumber("spritePlayer", "+"+healAmount, "heal");
          } else {
            flashAllyMini(recId, "green");
            if(healAmount) spawnFloatingNumber("allySprite-"+recId, "+"+healAmount, "heal");
          }
        } else if(act.mv.type !== "buff"){
          const monDmg = monHpBefore - mon.hp;
          if(act.mv.isUltimate){
            if(isMe) animateSprite("spritePlayer","ultimate-strike"); else animateAllyMini(act.id, "ultimate-strike");
            animateSprite("spriteEnemy","ultimate-hit");
            flashSprite("spriteEnemy","ultimate");
          } else {
            animateSprite("spriteEnemy","hitshake");
            flashSprite("spriteEnemy","red");
          }
          if(monDmg > 0) spawnFloatingNumber("spriteEnemy", "-"+monDmg, (monDmg >= mon.maxHp*0.5) ? "crit" : "damage");
          maybeShowCrit(monDmg, mon.maxHp);
        }
        if(act.mv.isUltimate && isMe) slowDrainMp("bPMp");
        if(mon.hp <= 0){ setTimeout(finishGroupTurn, 500); return; }
        setTimeout(processNext, act.mv.isUltimate ? 1700 : 1100);
      }, act.mv.isUltimate ? ULTIMATE_CHARGE_MS : 700);
    }
  }
  processNext();
}
function memberNameById(id){ const m=groupBattle.members[id]; return m?m.name:"alguien"; }

function finishGroupTurn(){
  groupBattle.pendingMoves = {};
  groupBattle.turn++;
  groupBattle.resolving = false;
  updateGroupBattleBars();
  renderPartyStatusRow();
  if(!checkGroupBattleEnd()){
    logBattle(`— Turno ${groupBattle.turn} —`);
    renderGroupMoveGrid();
  }
}

function applyGroupMemberMove(id, mv, rng){
  const m = groupBattle.members[id];
  const mon = groupBattle.monster;
  const isMe = id === myPlayerId;
  m.mp = Math.max(0, m.mp - getMoveCost(mv, m.mp));
  if(mv.hpCost){ const hpc = getMoveHpCost(mv, m.maxHp); m.hp = Math.max(1, m.hp - hpc); logBattle(`${isMe?"El esfuerzo te cuesta":m.name+" paga"} ${hpc} HP.`); }
  if(isMe) triggerWeaponAnim("spritePlayer");

  if(mv.type === "buff"){
    const applyBuffTo = (member)=>{
      if(mv.buff==="atk"){ member.buffs.atk = 1+mv.amount; member.buffs.turnsAtk = mv.dur; }
      if(mv.buff==="def"){ member.buffs.def = 1+mv.amount; member.buffs.turnsDef = mv.dur; }
      if(mv.selfDef){ member.buffs.def = Math.max(0.3, 1+mv.selfDef); member.buffs.turnsDef = mv.dur; }
    };
    if(mv.allyBuff){
      Object.values(groupBattle.members).filter(mm=>mm.hp>0).forEach(applyBuffTo);
      logBattle(`${isMe?"Usas":m.name+" usa"} ${mv.name}. ¡Todo el grupo se siente más fuerte!`);
    } else {
      applyBuffTo(m);
      logBattle(`${isMe?"Usas":m.name+" usa"} ${mv.name}.`);
    }
  } else if(mv.type === "heal"){
    let recipientId = id, recipient = m;
    if(mv.allyHeal){
      const alive = Object.entries(groupBattle.members).filter(([mid,mm])=>mm.hp>0);
      const worst = alive.reduce((w, cur)=> (cur[1].hp/cur[1].maxHp) < (w[1].hp/w[1].maxHp) ? cur : w, alive[0]);
      recipientId = worst[0]; recipient = worst[1];
    }
    const heal = Math.round(recipient.maxHp*mv.amount);
    recipient.hp = Math.min(recipient.maxHp, recipient.hp+heal);
    const recName = recipientId===myPlayerId ? "ti" : recipient.name;
    logBattle(mv.allyHeal
      ? `${isMe?"Usas":m.name+" usa"} ${mv.name} sobre ${recipientId===id?"sí mismo":recName}: +${heal} HP.`
      : `${isMe?"Usas":m.name+" usa"} ${mv.name} y recupera ${heal} HP.`);
    return {healRecipientId: recipientId, healAmount: heal};
  } else if(mv.type === "debuff"){
    if(mv.stat==="def") mon.def = +(mon.def*(1-mv.amount)).toFixed(1);
    if(mv.stat==="atk") mon.atk = +(mon.atk*(1-mv.amount)).toFixed(1);
    logBattle(`${isMe?"Usas":m.name+" usa"} ${mv.name}. ¡${mon.name} se ve más débil!`);
  } else {
    const rawAtk = m.atk + (mv.type==="magic" ? m.matk : 0);
    const atkEff = rawAtk * m.buffs.atk;
    const hits = mv.hits||1;
    let total = 0;
    for(let h=0; h<hits; h++){
      let def = mon.def;
      if(mv.pierce) def = def*(1-mv.pierce);
      let base = Math.max(1, atkEff*mv.power - def*0.4);
      let dmg = base*(0.85+rng()*0.3);
      if(rng() < (mv.crit||0.06)) dmg *= 1.8;
      if(mv.execute && mon.hp < mon.maxHp*0.3) dmg *= 1.4;
      dmg = Math.max(1, Math.round(dmg*1.18));
      mon.hp = Math.max(0, mon.hp-dmg);
      total += dmg;
      if(mon.hp<=0) break;
    }
    logBattle(`${isMe?"Usas":m.name+" usa"} ${mv.name}: ${total} de daño${hits>1?` (${hits} golpes)`:""}.`);
    if(mv.drain){ const h=Math.round(total*mv.drain); m.hp=Math.min(m.maxHp, m.hp+h); }
    if(mv.selfDmg){ const sd=Math.round(m.maxHp*mv.selfDmg); m.hp=Math.max(0,m.hp-sd); }
    if(mv.selfBuffSpd){ m.buffs.spd = 1+mv.selfBuffSpd; }
  }
  if(m.buffs.turnsAtk>0){ m.buffs.turnsAtk--; if(m.buffs.turnsAtk===0) m.buffs.atk=1; }
  if(m.buffs.turnsDef>0){ m.buffs.turnsDef--; if(m.buffs.turnsDef===0) m.buffs.def=1; }
}

function checkGroupBattleEnd(){
  if(!groupBattle) return true;
  const mon = groupBattle.monster;
  const anyAlive = Object.values(groupBattle.members).some(m=>m.hp>0);
  if(mon.hp <= 0){ finishGroupBattle(true); return true; }
  if(!anyAlive){ finishGroupBattle(false); return true; }
  return false;
}

function finishGroupBattle(won){
  clearTurnTimer();
  const mon = groupBattle.monster;
  const charBefore = {level:player.level, xp:player.xp, xpNext:player.xpNext};
  const bossMult = mon.isBoss ? 2 : 1;
  const rewardXp = won ? Math.round((mon.level*22 + 10) * (1 + (mon.count-1)*0.3) * bossMult) : 0;
  const rewardGold = won ? Math.round((mon.level*6 + 5) * (1 + (mon.count-1)*0.3) * bossMult) : 0;
  if(won){ player.xp += rewardXp; player.gold += rewardGold; refreshHud(); }
  const charAfter = simulateXpProgress(charBefore.level, charBefore.xp, charBefore.xpNext, rewardXp);
  logBattle(won ? `¡Tu grupo derrotó a ${mon.name}!` : `Tu grupo fue derrotado por ${mon.name}.`);
  let bossItemMsg = "";
  if(won && mon.isBoss && Math.random() < 0.35){
    const bItem = generateBossLootItem(mon.name, mon.level, player.classKey);
    if(bItem){
      pushItemSafe(bItem);
      bossItemMsg = `<br>👑 ¡Botín especial! ${bItem.emoji} ${bItem.name} (${bItem.desc})`;
    }
  }
  // avisa al resto del grupo de que el combate ya terminó — así, si a alguien se le perdió
  // un mensaje y se quedó esperando, no se queda atascado para siempre.
  if(pubnub && party){
    pubnub.publish({channel: partyChannel(party.id), storeInHistory:false,
      message:{type:'group_battle_end', battleId:groupBattle.battleId, won, rewardXp, rewardGold, monName:mon.name, isBoss:mon.isBoss}});
  }
  setTimeout(()=>{
    $("battleWrap").classList.add("hidden");
    $("partyStatusRow").classList.add("hidden");
    $("groupAllyStageRow").classList.add("hidden");
    $("resultEmoji").textContent = won ? (mon.isBoss ? "👑" : "🏆") : "💀";
    $("resultTitle").textContent = won ? (mon.isBoss ? `¡Jefe derrotado en grupo! ${mon.name}` : "¡Victoria de grupo!") : "Derrota de grupo";
    $("resultSub").innerHTML = won ? `+${rewardXp} XP · +${rewardGold} 💰${bossItemMsg}` : "Tu grupo cayó ante el enemigo reforzado.";
    $("resultOverlay").classList.remove("hidden");
    if(won){
      animateResultProgress({
        char: {
          beforeLevel: charBefore.level, beforeXp: charBefore.xp, beforeXpNext: charBefore.xpNext,
          afterLevel: charAfter.level, afterXp: charAfter.xp, afterXpNext: charAfter.xpNext, gainedLevels: charAfter.gainedLevels
        },
        pet: null
      });
    } else updateResultProgressVisibility(false);
    if(won) checkLevelUps();
    saveGame();
    groupBattle = null;
  }, 700);
}

/** Respaldo de sincronía: si otro miembro ya terminó el combate y a mí se me quedó pegado
 *  (por ejemplo, se me perdió un mensaje de red), cierro el combate igual con su resultado. */
function forceCloseGroupBattleFromPeer(msg){
  if(!groupBattle || groupBattle.battleId !== msg.battleId) return;
  clearTurnTimer();
  const won = msg.won;
  if(won){ player.xp += msg.rewardXp||0; player.gold += msg.rewardGold||0; refreshHud(); checkLevelUps(); }
  logBattle(won ? `¡Tu grupo derrotó a ${msg.monName}!` : `Tu grupo fue derrotado por ${msg.monName}.`);
  toast("Tu grupo terminó el combate — te estabas quedando atrás por una desconexión momentánea.", 4000);
  setTimeout(()=>{
    $("battleWrap").classList.add("hidden");
    $("partyStatusRow").classList.add("hidden");
    $("groupAllyStageRow").classList.add("hidden");
    $("resultEmoji").textContent = won ? (msg.isBoss ? "👑" : "🏆") : "💀";
    $("resultTitle").textContent = won ? (msg.isBoss ? `¡Jefe derrotado en grupo! ${msg.monName}` : "¡Victoria de grupo!") : "Derrota de grupo";
    $("resultSub").innerHTML = won ? `+${msg.rewardXp||0} XP · +${msg.rewardGold||0} 💰` : "Tu grupo cayó ante el enemigo reforzado.";
    $("resultOverlay").classList.remove("hidden");
    updateResultProgressVisibility(false);
    saveGame();
    groupBattle = null;
  }, 300);
}


async function initMultiplayer(){
  myPlayerId = await ensurePlayerId();
  friends = await loadFriends();

  const connected = initPubNubConnection();
  if(connected){
    publishPresence();
    setInterval(publishPresence, 15000); // reanuncia mi posición periódicamente
    setInterval(renderNearbyPlayersFromCache, 10000); // limpia jugadores inactivos aunque no lleguen mensajes nuevos
  } else {
    setTimeout(()=> toast("ℹ️ Multijugador no disponible en este navegador (no se pudo cargar la conexión). El resto del juego funciona normal.", 5500), 4000);
  }
  // Los cambios del Modo Constructor (torres/fogatas/zonas peligrosas trazadas a mano) SIEMPRE se
  // cargan, haya o no PubNub — loadMapEdits() ya sabe usar la caché local de este navegador cuando
  // no hay red (ver MAP_EDITS_LOCAL_CACHE_KEY). Antes esto vivía DENTRO del "if(connected)" de
  // arriba: si PubNub no cargaba, mapEditsLoaded se quedaba en false para siempre y saveMapEdits()
  // jamás guardaba ni siquiera localmente — el mismo "modo sin red" que debería ser la red de
  // seguridad terminaba bloqueado por depender de la red que justo faltaba.
  await loadMapEdits();
  refreshMapEditableLayers();
}
/** Vuelve a dibujar torres/fogatas/santuarios/puntos de mejora aplicando los cambios del Modo
 *  Constructor que se acaban de recibir — quita los marcadores viejos primero para no duplicar. */
function refreshMapEditableLayers(){
  if(!playerLatLng || !map) return;
  detectCityAndLoadWorldData(playerLatLng.lat, playerLatLng.lng);
  Object.values(towerMarkers).forEach(m=> m.remove());
  Object.values(campfireMarkers).forEach(m=> m.remove());
  Object.values(shrineMarkers).forEach(m=> m.remove());
  Object.values(upgradeMarkers).forEach(m=> m.remove());
  if(coliseoMarker){ coliseoMarker.remove(); coliseoMarker = null; }
  drawTowers();
  updateMediumVisibility();
  // detectCityAndLoadWorldData() de arriba ya volvió a sortear dangerBlocksToday (incluyendo
  // cualquier trazo a mano nuevo/quitado que haya llegado en este mismo cambio) — hace falta
  // volver a pintarlas explícitamente, si no el mapa se queda con las capas viejas aunque los
  // datos en memoria ya cambiaron.
  drawDangerBlocks();
  // Si Hacker994 tenía el Modo Constructor activo (por ejemplo, se ve a sí mismo el eco de su
  // propio cambio), hay que reactivar arrastrar/borrar sobre los marcadores recién redibujados;
  // si no, quedarían con el comportamiento normal (abrir modal) hasta apagar y prender el modo de nuevo.
  if(builderModeOn){
    toggleMarkerBuilderBehavior(towerMarkers, TOWERS, "tower");
    toggleMarkerBuilderBehavior(campfireMarkers, CAMPFIRES, "campfire");
    toggleMarkerBuilderBehavior(upgradeMarkers, UPGRADE_STATIONS, "upgrade");
    toggleMarkerBuilderBehavior(shrineMarkers, SHRINES, "shrine");
  }
}
/** Se llama en vivo cada vez que llega un mensaje nuevo por PN_MAP_EDITS_CHANNEL — antes el juego
 *  solo consultaba este canal una vez al cargar (fetchMessages count:1 en loadMapEdits()), así que
 *  un jugador que ya tenía la app abierta cuando Hacker994 guardaba un cambio nunca se enteraba
 *  hasta recargar la app. Ahora, al estar suscritos al canal, el cambio llega al instante y se
 *  redibuja el mapa sin necesidad de recargar nada. */
function handleMapEditsMessage(msg){
  if(!msg || !msg.mapEdits) return;
  // Descarta el eco de un guardado PROPIO más viejo que el último cambio que ya hicimos en este
  // mismo cliente (ver el comentario de mapEditsLocalRev) — si no, dos ediciones seguidas del Modo
  // Constructor se "comen" entre sí. A los demás jugadores (que nunca guardan, mapEditsLocalRev
  // se queda en 0) esto nunca los bloquea: cualquier mensaje real siempre trae rev >= 1.
  if(isBuilderUser() && typeof msg.rev === "number" && msg.rev < mapEditsLocalRev) return;
  mapEdits = msg.mapEdits;
  if(!mapEdits.dangerZones) mapEdits.dangerZones = {}; // por si el edit recibido es de antes de esta función
  cacheMapEditsLocally(mapEdits); // un cambio real (propio o de otro dispositivo) también refresca la caché local
  refreshMapEditableLayers();
}

/* ---------- Login / cuenta (UI) ---------- */
// Pedido explícito: todavía no se usa la pantalla de login — el backend (D1/worker) queda listo
// pero DESCONECTADO de la UI hasta que se decida activarlo. Con esto en false, initAuthGate()
// entra derecho al flujo de siempre (como si esta pasada nunca hubiera tocado nada) y la fila de
// cuenta de la ficha de personaje queda oculta. Para reactivar: volver esto a true.
const AUTH_FEATURE_ENABLED = false;
let authGateResume = null; // qué hacer cuando #authOverlay se resuelve (login/registro/invitado)

/** Punto de entrada real del juego — con sesión ya guardada de una visita anterior (authToken en
 *  localStorage) entra derecho como siempre; sin sesión, muestra #authOverlay primero con la
 *  opción de loguearse, registrarse, o "Jugar sin cuenta" (guardado 100% local a este navegador,
 *  igual que siempre). */
function initAuthGate(){
  // Exportar/Importar partida NO depende de AUTH_FEATURE_ENABLED (las cuentas en la nube están
  // apagadas hoy) — sirve igual para pasar un guardado 100% local entre el navegador y la app
  // instalada, así que se cablea siempre, antes de la rama que corta temprano de abajo.
  wireSaveTransferRow();
  if(!AUTH_FEATURE_ENABLED){
    $("csAccountRow").classList.add("hidden");
    enterGameFlow();
    return;
  }
  wireAuthOverlay();
  wireAccountRow();
  if(authToken) enterGameFlow();
  else openAuthOverlay(enterGameFlow, {allowGuest:true});
}
function enterGameFlow(){
  $("authOverlay").classList.add("hidden");
  $("classOverlay").classList.remove("hidden");
  buildClassGrid();
  initContinueScreen();
}
/** Abre #authOverlay para cualquiera de los dos casos: puerta inicial (allowGuest:true, ver
 *  initAuthGate) o vincular cuenta a mitad de partida desde la ficha de personaje
 *  (allowGuest:false — ya está jugando, "jugar sin cuenta" no tiene sentido ahí). `onResolved` es
 *  responsable de ocultar el overlay — btnPlayGuest y el submit exitoso solo lo llaman. */
function openAuthOverlay(onResolved, opts){
  authGateResume = onResolved;
  $("authUsernameInput").value = "";
  $("authPasswordInput").value = "";
  $("authError").classList.add("hidden");
  $("btnPlayGuest").classList.toggle("hidden", !(opts && opts.allowGuest));
  $("authOverlay").classList.remove("hidden");
}
function wireAuthOverlay(){
  let authMode = "login";
  $("authTabs").querySelectorAll(".auth-tab").forEach(btn=>{
    btn.onclick = ()=>{
      authMode = btn.dataset.mode;
      $("authTabs").querySelectorAll(".auth-tab").forEach(b=> b.classList.toggle("active", b===btn));
      $("btnAuthSubmit").textContent = authMode === "register" ? "Crear cuenta" : "Iniciar sesión";
      $("authError").classList.add("hidden");
    };
  });
  $("btnAuthSubmit").onclick = async ()=>{
    const username = $("authUsernameInput").value.trim();
    const password = $("authPasswordInput").value;
    $("authError").classList.add("hidden");
    if(!username || !password){
      $("authError").textContent = "Completá usuario y contraseña.";
      $("authError").classList.remove("hidden");
      return;
    }
    $("btnAuthSubmit").disabled = true;
    try{
      const path = authMode === "register" ? "/api/register" : "/api/login";
      const result = await authApiCall(path, username, password);
      setAuthSession(result.token, result.username);
      await migrateLocalSavesToRemote();
      if(player) await saveGame(); // si ya estaba jugando (vinculó cuenta a mitad de partida), sube el guardado actual también
      refreshAccountRow();
      if(authGateResume) authGateResume();
    }catch(e){
      $("authError").textContent = e.message;
      $("authError").classList.remove("hidden");
    }finally{
      $("btnAuthSubmit").disabled = false;
    }
  };
  $("btnPlayGuest").onclick = ()=>{ if(authGateResume) authGateResume(); };
}
function refreshAccountRow(){
  if(authToken && authUsername){
    $("csAccountText").textContent = `👤 ${authUsername}`;
    $("btnAccountAction").textContent = "Cerrar sesión";
  } else {
    $("csAccountText").textContent = "Jugando sin cuenta";
    $("btnAccountAction").textContent = "Iniciar sesión";
  }
}
function wireSaveTransferRow(){
  $("btnExportSave").onclick = exportSave;
  $("btnImportSave").onclick = importSave;
}
function wireAccountRow(){
  refreshAccountRow();
  $("btnAccountAction").onclick = ()=>{
    if(authToken){
      clearAuthSession();
      toast("Sesión cerrada — desde acá tu progreso se guarda solo en este navegador.", 3400);
      refreshAccountRow();
    } else {
      openAuthOverlay(()=>{
        $("authOverlay").classList.add("hidden");
        toast("✅ Cuenta vinculada — tu progreso ya se guarda en la nube.", 3400);
      }, {allowGuest:false});
    }
  };
}

/* ---------- Init ---------- */
initAuthGate();





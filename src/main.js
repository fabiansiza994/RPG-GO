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
} from "./game/config/classes.js";
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
import { DIFFICULTY_TIERS, REWARD_MULTIPLIER_BY_TIER, REGION_RECOMMENDED_CP } from "./game/config/difficultyProfiles.js";
import { computeCombatPower } from "./game/systems/combatPowerCalculator.js";
import { generateEnemyChallenge } from "./game/systems/enemyPowerGenerator.js";
import { getRewardMultiplier } from "./game/systems/rewardDifficulty.js";
import {
  MONSTER_TEMPLATES,
  BOSS_TEMPLATES,
  PROC_LABELS,
  BOSS_LOOT_THEMES,
  VAGABUNDO_TEMPLATE,
  VAGABUNDO_COST,
  LOBO_NOCTURNO_TEMPLATE,
  LOBO_SOMBRIO_TEMPLATE,
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
import { PET_SPECIES_PROFILES, DEFAULT_PET_PROFILE, PET_MOVESETS, DEFAULT_PET_MOVESET } from "./game/config/pets.js";
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
  LOBO_SOMBRIO_SPRITES,
  LOBO_UMBRIO_SPRITES,
  DEMONIO_MENOR_SPRITES,
  GOLEM_ROCA_SPRITES,
  DRAGON_MENOR_SPRITES,
  DRAGON_ANCESTRAL_SPRITES,
  LOBO_NOCTURNO_SPRITES,
  SLIME_SALVAJE_SPRITES,
  ESPECTRO_SPRITES,
  CLASS_PORTRAITS,
  CLASS_WALK_SPRITES,
  CLASS_BATTLE_SPRITES,
  ARMOR_ICON_PATH,
  ESPADA_LUNAR_ICON_PATH,
} from "./game/assets/spriteRegistry.js";

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
function checkZoneDiscovery(){
  const zone = getCurrentZone();
  if(!zone || !player) return;
  if(!player.visitedZones) player.visitedZones = [];
  if(!player.visitedZones.includes(zone.key)){
    player.visitedZones.push(zone.key);
    toast(`🗺️ ¡Nueva región descubierta: ${zone.name}!`, 4000);
    saveGame();
  }
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
        name, emoji, type:"equip", slot, classKey: classKey||null, rarity:t.key, weight: t.weight,
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
function isBuilderUser(){ return !!(player && player.name === BUILDER_MODE_USER); }
let mapEdits = {moved:{}, deleted:[], added:[]};

/** IMPORTANTE: no se puede usar AppStorage/window.storage aquí — eso solo existe DENTRO de
 *  Claude; una vez el juego está hosteado afuera (Netlify, etc.), cada celular tiene su propio
 *  localStorage y nunca se ven entre sí (el mismo motivo por el que el sistema de amigos usa
 *  PubNub). Por eso los cambios del Modo Constructor se comparten por el mismo canal de PubNub,
 *  igual que las torres y las bases: SÍ viaja de verdad entre dispositivos reales.
 */
const PN_MAP_EDITS_CHANNEL = "ronda-gps-rpg-mapedits-v1";
async function loadMapEdits(){
  if(!pubnub) return;
  try{
    const res = await pubnub.fetchMessages({channels:[PN_MAP_EDITS_CHANNEL], count:1});
    const items = (res.channels && res.channels[PN_MAP_EDITS_CHANNEL]) || [];
    if(items.length){
      const last = items[items.length-1].message;
      if(last && last.mapEdits) mapEdits = last.mapEdits;
    }
  }catch(e){ console.warn("[MAPEDITS] no se pudo consultar los cambios del Modo Constructor:", e); }
}
function saveMapEdits(){
  if(!isBuilderUser() || !pubnub) return; // solo Hacker994 puede GUARDAR cambios (todos los demás solo los ven)
  pubnub.publish({channel: PN_MAP_EDITS_CHANNEL, storeInHistory:true, message:{mapEdits}})
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
    builderModeOn = !builderModeOn;
    btn.classList.toggle("active", builderModeOn);
    $("builderToolbar").classList.toggle("hidden", !builderModeOn);
    toggleMarkerBuilderBehavior(towerMarkers, TOWERS, "tower");
    toggleMarkerBuilderBehavior(campfireMarkers, CAMPFIRES, "campfire");
    toggleMarkerBuilderBehavior(upgradeMarkers, UPGRADE_STATIONS, "upgrade");
    toggleMarkerBuilderBehavior(shrineMarkers, SHRINES, "shrine");
    toast(builderModeOn ? "🔧 Modo Constructor activado — arrastra o toca para borrar." : "Modo Constructor desactivado.");
  };
  row.appendChild(btn);
}

let builderModeOn = false;
let builderAddKind = null; // si no es null, el proximo toque en el mapa coloca un elemento de este tipo

function toggleMarkerBuilderBehavior(markerDict, dataList, kind){
  dataList.forEach(item=>{
    const marker = markerDict[item.id];
    if(!marker) return;
    marker.setDraggable(builderModeOn);
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
  });
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

function detectCityAndLoadWorldData(lat, lng){
  let match = null;
  if(lat != null && lng != null){
    match = CITY_REGISTRY.find(c => distMeters({lat,lng}, c.center) <= c.radius) || null;
  }
  const city = match || CITY_REGISTRY.find(c=>c.key===DEFAULT_CITY_KEY) || CITY_REGISTRY[0];
  currentCityKey = city.key;
  currentCityName = city.name;
  NEIVA_ZONES = city.zones;
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
// Config central reutilizada por los tres puntos de integración (eventos, Coliseo, Guardián de
// Parque) — un solo lugar para ajustar pesos/rangos sin tocar cada punto de uso por separado.
// A propósito, esta capa NO decide los enemigos ambientales normales del mapa (spawnMonsters,
// jefe de zona, emboscadas de recolección, monstruos de misión) — esos siguen ligados al nivel
// del jugador exactamente igual que antes. Ver docs/COMBAT_POWER.md.
const COMBAT_POWER_DIRECTOR_CONFIG = {
  statWeights: COMBAT_POWER_STAT_WEIGHTS,
  rarityByKey: RARITY_BY_KEY,
  equipmentConfig: EQUIPMENT_QUALITY_CONFIG,
  petConfig: PET_POWER_CONFIG,
  passiveWeights: PASSIVE_BONUS_WEIGHTS,
  difficultyTiers: DIFFICULTY_TIERS,
  levelBounds: {min:1, max:300},
};
/** Punto de entrada único para los tres lugares que sí usan Combat Power (eventos dinámicos,
 *  Coliseo, Guardián de Parque) — les da un nivel de enemigo listo para pasarle a makeMonster()
 *  tal cual, más la variante sorteada (normal/strong/elite/legendary) por si quieren reflejarla
 *  en un mensaje o una insignia visual. */
function rollCombatPowerChallenge(tpl){
  return generateEnemyChallenge(player, tpl, COMBAT_POWER_DIRECTOR_CONFIG);
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
const THIEF_TEMPLATE = {name:"Ladrón Errante", emoji:"🥷", tier:3, hpM:1.15, atkM:1.25, defM:0.95, aggressive:true};

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
  toast(`🔨 ¡Reparaste todo tu equipo! (🪙${totalGold})`, 3400);
  renderForge();
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
}

/** Devuelve el HTML del sprite de combate en su pose BASE (arma en reposo), según clase y género. */
function combatSpriteHtml(classKey, gender, mirror){
  const g = gender === "f" ? "f" : "m";
  const spr = (CLASS_BATTLE_SPRITES[classKey]||{})[g];
  const mirrorStyle = mirror ? ' style="transform:scaleX(-1);"' : '';
  if(spr) return `<img src="${spr.base}" class="battle-sprite-img" data-classkey="${classKey}" data-gender="${g}" data-mirrored="${mirror?1:0}" alt=""${mirrorStyle}>`;
  return CLASS_SPRITES[classKey] || "🧑";
}

/** Cambia momentáneamente el sprite a su pose de ATAQUE, y lo regresa a la pose base. */
function triggerWeaponAnim(elId){
  const container = $(elId);
  if(!container) return;
  const img = container.querySelector("img.battle-sprite-img");
  if(img){
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
function triggerClassAttackAnim(){ triggerWeaponAnim("spritePlayer"); }

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
/** El Lobo Umbrío como ENEMIGO usa una sola ilustración fija — al atacar solo se resalta un poco (sin cambiar de imagen). */
function triggerLoboAttackPose(){
  const img = document.querySelector('#spriteEnemy img[data-lobo="1"]');
  if(!img) return;
  img.classList.add("attacking");
  clearTimeout(img._resetTimer);
  img._resetTimer = setTimeout(()=> img.classList.remove("attacking"), 700);
}
/** Igual, pero para el Demonio Menor como enemigo. */
function triggerDemonioAttackPose(){
  const img = document.querySelector('#spriteEnemy img[data-demonio="1"]');
  if(!img) return;
  img.classList.add("attacking");
  clearTimeout(img._resetTimer);
  img._resetTimer = setTimeout(()=> img.classList.remove("attacking"), 700);
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
let takenClasses = new Set(); // clases que ya tienen personaje creado (uno de cada tipo permitido)
let playerLatLng = null; // {lat,lng}
let savedMapZoom = null; // recuerda el nivel de zoom preferido entre sesiones
let map, meMarker, meRing;
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

const AppStorage = window.storage || {
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
  $("shadowWolfDialogueIcon").textContent = isCharge ? "⚡" : "🐺";
  $("shadowWolfDialogueText").textContent = text;
  el.classList.remove("show");
  void el.offsetWidth; // fuerza el reflow para que la animación reinicie si ya estaba mostrándose
  el.classList.add("show");
  clearTimeout(shadowWolfDialogueTimer);
  shadowWolfDialogueTimer = setTimeout(()=> el.classList.remove("show"), isCharge ? 3200 : 3800);
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

/** Aviso tipo "anuncio": entra deslizándose desde la izquierda y sale por la derecha (para alertas de enemigos). */
function slideNotice(msg, ms=3600){
  const wrap = $("slideNoticeWrap");
  const card = document.createElement("div");
  card.className = "snc";
  card.textContent = msg;
  wrap.appendChild(card);
  requestAnimationFrame(()=> card.classList.add("show"));
  setTimeout(()=> card.remove(), ms);
}

/* ============================================================
   1. PANTALLA DE SELECCIÓN DE CLASE
   ============================================================ */
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

$("btnStart").onclick = async ()=>{
  const c = CLASSES[selectedClass];
  player = {
    classKey: selectedClass,
    className: c.name,
    emoji: c.emoji,
    gender: selectedGender || "m",
    name: $("nameInput").value.trim() || "Aventurero",
    friendCode: genFriendCode($("nameInput").value.trim() || "Aventurero"),
    level: 1,
    xp: 0,
    xpNext: 100,
    gold: 20,
    crystals: 0,
    attributePoints: 0,
    attrSpent: {maxHp:0, maxMp:0, atk:0, matk:0, def:0, spd:0},
    lastDailyBonus: null,
    totalDistanceM: 0,
    medals: [],
    zoneDistanceM: {},
    parkWeaponsObtained: [],
    parkGuardianState: {},
    visitedZones: [],
    pets: [],
    everGotCaptureCard: false,
    redeemedCodes: [],
    coliseumStats: null,
    wood: 0, stone: 0, iron: 0,
    isBuilding: false, buildingLastCollectAt: null, buildingUpgradeEndsAt: null,
    dynamicEntities: [],
    worldEvents: [], lastEventResolvedAt: null,
    lastRegionId: null,
    pickaxe: null,
    maxHp: c.base.hp, hp: c.base.hp,
    maxMp: c.base.mp, mp: c.base.mp,
    atk: c.base.atk, matk: c.base.matk, def: c.base.def, spd: c.base.spd,
    growth: c.growth,
    movePool: c.movePool,
    moves: c.movePool.filter(m=>m.lvl===1).slice(0,3), // movimientos iniciales
    learnedIds: new Set(c.movePool.filter(m=>m.lvl===1).map(m=>m.id)),
    everLearnedIds: new Set(c.movePool.filter(m=>m.lvl===1).map(m=>m.id)), // historial completo (nunca se borra, para poder "recordar" luego)
    ultimateMove: null, ultimateBaseId: null,
    inventory: [],
    equipment: {weapon:null, offhand:null, armor:null, helmet:null, boots:null, accessory:[null]}
  };
  $("classOverlay").classList.add("hidden");
  $("hudIconEmoji").textContent = player.emoji;
  updateNotifBell();
  refreshHud();
  teardownMapIfExists();
  setupBuilderModeUI();
  initMap();
  saveGame();
  checkDailyBonus();
};

/** Recompensa por jugar cada día: +50 de oro gratis la primera vez que abres el juego en el día. */
function todayStr(){ const d=new Date(); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
function checkDailyBonus(){
  const today = todayStr();
  if(player.lastDailyBonus === today) return;
  player.lastDailyBonus = today;
  player.gold += 50;
  player.crystals = (player.crystals||0) + 1;
  refreshHud();
  saveGame();
  toast("🎁 ¡Bono diario! +50 💰 de oro y +1 💎 diamante solo por entrar a jugar hoy.", 4500);
}

/* ============================================================
   1b. PERSISTENCIA (AppStorage) — guarda/recupera tu partida
   ============================================================ */
let storageAvailable = true;
async function saveGame(){
  if(!player || !AppStorage || !storageAvailable) return;
  try{
    const data = {
      classKey: player.classKey,
      name: player.name,
      gender: player.gender,
      friendCode: player.friendCode,
      level: player.level, xp: player.xp, xpNext: player.xpNext, gold: player.gold, crystals: player.crystals||0,
      lastBossCrystalDay: player.lastBossCrystalDay || null,
      extraInventorySlots: player.extraInventorySlots||0,
      base: player.base || null, baseStorage: player.baseStorage || [], baseExtraSlots: player.baseExtraSlots||0, hasBase: player.hasBase||false, baseEverPlaced: player.baseEverPlaced||false,
      isBuilding: player.isBuilding||false, buildingLastCollectAt: player.buildingLastCollectAt||null,
      buildingUpgradeEndsAt: player.buildingUpgradeEndsAt||null,
      shadowWolfNightKey: player.shadowWolfNightKey||null, shadowWolfEscapes: player.shadowWolfEscapes||0,
      eliteWeaponsBought: player.eliteWeaponsBought||0,
      dynamicEntities: player.dynamicEntities||[],
      worldEvents: player.worldEvents||[], lastEventResolvedAt: player.lastEventResolvedAt||null,
      lastRegionId: player.lastRegionId||null,
      attributePoints: player.attributePoints||0,
      attrSpent: player.attrSpent || {maxHp:0,maxMp:0,atk:0,matk:0,def:0,spd:0},
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
      maxHp: player.maxHp, hp: player.hp, maxMp: player.maxMp, mp: player.mp,
      atk: player.atk, matk: player.matk, def: player.def, spd: player.spd,
      moveIds: player.moves.map(m=>m.id),
      ultimateMove: player.ultimateMove || null,
      ultimateBaseId: player.ultimateBaseId || null,
      learnedIds: Array.from(player.learnedIds),
      everLearnedIds: Array.from(player.everLearnedIds||player.learnedIds),
      inventoryIds: player.inventory.map(it=>it.id),
      equipmentIds: {
        weapon: player.equipment.weapon ? player.equipment.weapon.id : null,
        offhand: player.equipment.offhand ? player.equipment.offhand.id : null,
        armor: player.equipment.armor ? player.equipment.armor.id : null,
        helmet: player.equipment.helmet ? player.equipment.helmet.id : null,
        boots: player.equipment.boots ? player.equipment.boots.id : null,
        accessory: (player.equipment.accessory||[]).map(it=> it ? it.id : null)
      },
      equipmentUpgrades: {
        weapon: (player.equipment.weapon && player.equipment.weapon.upgradeLevel) || 0,
        offhand: (player.equipment.offhand && player.equipment.offhand.upgradeLevel) || 0,
        armor: (player.equipment.armor && player.equipment.armor.upgradeLevel) || 0,
        helmet: (player.equipment.helmet && player.equipment.helmet.upgradeLevel) || 0,
        boots: (player.equipment.boots && player.equipment.boots.upgradeLevel) || 0,
        accessory: (player.equipment.accessory||[]).map(it=> (it && it.upgradeLevel) || 0)
      },
      equipmentDurability: {
        weapon: durabilitySaveData(player.equipment.weapon),
        offhand: durabilitySaveData(player.equipment.offhand),
        armor: durabilitySaveData(player.equipment.armor),
        helmet: durabilitySaveData(player.equipment.helmet),
        boots: durabilitySaveData(player.equipment.boots),
      },
      inventoryDurability: player.inventory.map(it=> durabilitySaveData(it)),
      bossLootRegistry: bossLootRegistry, // objetos únicos de jefe generados en tiempo real (no viven en las tablas fijas)
      wood: player.wood||0, stone: player.stone||0, iron: player.iron||0,
      pickaxe: player.pickaxe || null,
      activeQuest: activeQuest ? {template:activeQuest.template, destName:activeQuest.destName, destLat:activeQuest.destLat, destLng:activeQuest.destLng,
        killGoal:activeQuest.killGoal, killProgress:activeQuest.killProgress, itemObtained:activeQuest.itemObtained, targetSpawned:activeQuest.targetSpawned} : null,
      lastPos: playerLatLng || null,
      mapZoom: savedMapZoom || null,
      savedAt: Date.now()
    };
    // cada clase tiene su propia partida guardada (uno de cada tipo bajo el mismo dispositivo/usuario)
    await AppStorage.set('player_'+player.classKey, JSON.stringify(data), false);
  }catch(e){
    storageAvailable = false; // evita reintentos ruidosos; el juego sigue funcionando sin guardado
  }
}

async function loadCharacterSlot(classKey){
  if(!AppStorage) return null;
  try{
    const res = await AppStorage.get('player_'+classKey, false);
    if(res && res.value) return JSON.parse(res.value);
  }catch(e){ /* no hay partida guardada para esta clase */ }
  return null;
}

/** Carga los 4 posibles personajes (uno por clase). Si es una partida vieja de un solo personaje
 *  (antes de este sistema), la migra automáticamente al nuevo esquema por clase. */
async function loadAllCharacters(){
  const slots = {};
  for(const key of Object.keys(CLASSES)){
    slots[key] = await loadCharacterSlot(key);
  }
  const anyNew = Object.values(slots).some(Boolean);
  if(!anyNew && AppStorage){
    try{
      const old = await AppStorage.get('player', false);
      if(old && old.value){
        const data = JSON.parse(old.value);
        if(data && data.classKey && CLASSES[data.classKey]){
          slots[data.classKey] = data;
          await AppStorage.set('player_'+data.classKey, old.value, false);
          await AppStorage.delete('player', false); // ya se migró — se borra para que no pueda "revivir" nada más adelante
        }
      }
    }catch(e){ /* tampoco había partida vieja */ }
  }
  return slots;
}

function findItemById(id){
  return ITEM_TABLE.find(it=>it.id===id) || EQUIP_TABLE.find(it=>it.id===id) || EXCLUSIVE_TABLE.find(it=>it.id===id)
    || BOOK_TABLE.find(it=>it.id===id) || BOSS_BOOK_TABLE.find(it=>it.id===id) || bossLootRegistry[id];
}

function rebuildPlayerFromSave(data){
  const c = CLASSES[data.classKey];
  const eq = data.equipmentIds || {};
  const eqUp = data.equipmentUpgrades || {};
  /** Copia independiente de un objeto por id (evita que dos slots con el mismo objeto base
   *  compartan referencia — si no, mejorar uno afectaría al otro sin querer). */
  function freshCopy(id){ const it = findItemById(id); return it ? {...it} : null; }
  let accessoryArr = Array.isArray(eq.accessory) ? eq.accessory.map(id=> id?freshCopy(id):null)
    : (eq.accessory ? [freshCopy(eq.accessory)] : [null]); // migración de guardados viejos (1 solo slot)
  const slots = maxAccessorySlots(data.level, data.classKey);
  while(accessoryArr.length < slots) accessoryArr.push(null);
  const accUpLevels = Array.isArray(eqUp.accessory) ? eqUp.accessory : [];
  accessoryArr.forEach((it,i)=>{ if(it && accUpLevels[i]) applyUpgradeToItem(it, accUpLevels[i]); });

  const weaponItem = eq.weapon ? freshCopy(eq.weapon) : null;
  const offhandItem = eq.offhand ? freshCopy(eq.offhand) : null;
  const armorItem = eq.armor ? freshCopy(eq.armor) : null;
  const helmetItem = eq.helmet ? freshCopy(eq.helmet) : null;
  const bootsItem = eq.boots ? freshCopy(eq.boots) : null;
  if(weaponItem && eqUp.weapon) applyUpgradeToItem(weaponItem, eqUp.weapon);
  if(offhandItem && eqUp.offhand) applyUpgradeToItem(offhandItem, eqUp.offhand);
  if(armorItem && eqUp.armor) applyUpgradeToItem(armorItem, eqUp.armor);
  if(helmetItem && eqUp.helmet) applyUpgradeToItem(helmetItem, eqUp.helmet);
  if(bootsItem && eqUp.boots) applyUpgradeToItem(bootsItem, eqUp.boots);
  // la durabilidad/material es estado propio de cada instancia — freshCopy() no la trae (viene
  // de la tabla fija), así que se restaura aparte, igual que ya se hace con equipmentUpgrades.
  const eqDur = data.equipmentDurability || {};
  function applyDurability(item, durData){
    if(item && durData){ item.durability = durData.durability; item.maxDurability = durData.maxDurability; item.material = durData.material; }
  }
  applyDurability(weaponItem, eqDur.weapon);
  applyDurability(offhandItem, eqDur.offhand);
  applyDurability(armorItem, eqDur.armor);
  applyDurability(helmetItem, eqDur.helmet);
  applyDurability(bootsItem, eqDur.boots);
  const invDur = data.inventoryDurability || [];
  const inventoryItems = data.inventoryIds.map((id,i)=>{
    const it = freshCopy(id);
    applyDurability(it, invDur[i]);
    return it;
  }).filter(Boolean);

  player = {
    classKey: data.classKey,
    className: c.name,
    emoji: c.emoji,
    gender: data.gender || "m",
    name: data.name,
    friendCode: data.friendCode || genFriendCode(data.name),
    level: data.level, xp: data.xp, xpNext: data.xpNext, gold: data.gold, crystals: data.crystals||0,
    lastBossCrystalDay: data.lastBossCrystalDay || null,
    extraInventorySlots: data.extraInventorySlots||0,
    base: data.base || null, baseStorage: data.baseStorage || [], baseExtraSlots: data.baseExtraSlots||0, hasBase: data.hasBase||false, baseEverPlaced: data.baseEverPlaced||false,
    isBuilding: data.isBuilding||false, buildingLastCollectAt: data.buildingLastCollectAt||null,
    buildingUpgradeEndsAt: data.buildingUpgradeEndsAt||null,
    shadowWolfNightKey: data.shadowWolfNightKey||null, shadowWolfEscapes: data.shadowWolfEscapes||0,
    eliteWeaponsBought: data.eliteWeaponsBought||0,
    dynamicEntities: data.dynamicEntities||[],
    worldEvents: data.worldEvents||[], lastEventResolvedAt: data.lastEventResolvedAt||null,
    lastRegionId: data.lastRegionId||null,
    attributePoints: data.attributePoints||0,
    attrSpent: data.attrSpent || {maxHp:0,maxMp:0,atk:0,matk:0,def:0,spd:0},
    lastDailyBonus: data.lastDailyBonus || null,
    totalDistanceM: data.totalDistanceM || 0,
    medals: data.medals || [],
    zoneDistanceM: data.zoneDistanceM || {},
    parkWeaponsObtained: data.parkWeaponsObtained || [],
    parkGuardianState: data.parkGuardianState || {},
    visitedZones: data.visitedZones || [],
    pets: data.pets || [],
    everGotCaptureCard: data.everGotCaptureCard || false,
    redeemedCodes: data.redeemedCodes || [],
    coliseumStats: data.coliseumStats || null,
    ownedTowers: data.ownedTowers || null,
    wood: data.wood||0, stone: data.stone||0, iron: data.iron||0,
    pickaxe: data.pickaxe || null,
    maxHp: data.maxHp, hp: data.hp, maxMp: data.maxMp, mp: data.mp,
    atk: data.atk, matk: data.matk||0, def: data.def, spd: data.spd,
    growth: c.growth,
    movePool: c.movePool,
    moves: data.moveIds.map(id=> c.movePool.find(m=>m.id===id)).filter(Boolean),
    ultimateMove: data.ultimateMove || null,
    ultimateBaseId: data.ultimateBaseId || null,
    learnedIds: new Set(data.learnedIds),
    everLearnedIds: new Set(data.everLearnedIds || data.learnedIds), // compatibilidad con partidas viejas sin este campo
    inventory: inventoryItems,
    equipment: {
      weapon: weaponItem,
      offhand: offhandItem,
      armor: armorItem,
      helmet: helmetItem,
      boots: bootsItem,
      accessory: accessoryArr
    }
  };
  // sincroniza el flag de "ya se le aplicó la penalización de Dañado" con la realidad — las
  // estadísticas guardadas (atk/def/etc) ya reflejan esa penalización si corresponde, así que
  // acá solo se ajusta el flag, sin volver a llamar a applyBonuses.
  DURABILITY_SLOTS.forEach(slot=>{
    const it = player.equipment[slot];
    if(it && it.durability != null) it._damagedPenaltyApplied = isItemDamaged(it);
  });
}

async function initContinueScreen(){
  const slots = await loadAllCharacters();
  takenClasses = new Set(Object.keys(slots).filter(k=>slots[k]));
  const area = $("continueArea");
  const existingCount = takenClasses.size;

  $("btnBackToCharList").classList.add("hidden");
  if(existingCount === 0){
    area.innerHTML = "";
    $("classTitle").textContent = "Elige tu clase";
    $("classGrid").classList.remove("hidden");
    return;
  }

  let html = `<div class="char-select-list">`;
  Object.entries(slots).forEach(([key, data])=>{
    if(!data) return;
    const c = CLASSES[key];
    html += `
      <div class="continue-card big-continue-card">
        <div class="cc-row">
          <div class="cc-emoji">${c.emoji}</div>
          <div class="cc-info">
            <div class="cc-name">${data.name}</div>
            <div class="cc-meta">${c.name} · Nv. ${data.level} · 💰 ${data.gold}</div>
          </div>
          <button class="btn-delete-char" data-classkey="${key}" title="Eliminar personaje">🗑️</button>
        </div>
        <button class="btn-continue-char" data-classkey="${key}">Continuar aventura</button>
      </div>`;
  });
  html += `</div>`;
  if(existingCount < 4){
    html += `<button class="ghostbtn" id="btnNewCharacter" style="margin-top:14px;">➕ Crear un nuevo personaje</button>`;
  }
  area.innerHTML = html;
  $("classTitle").textContent = "Bienvenido de nuevo";
  // se ocultan hasta que el usuario pida explícitamente crear un personaje nuevo
  $("classGrid").classList.add("hidden");
  $("classSubText").classList.add("hidden");
  $("genderSection").classList.add("hidden");
  $("nameInput").classList.add("hidden");
  $("btnStart").classList.add("hidden");

  area.querySelectorAll(".btn-continue-char").forEach(btn=>{
    btn.onclick = async ()=>{
      const key = btn.dataset.classkey;
      const data = slots[key];
      bossLootRegistry = data.bossLootRegistry || {};
      activeQuest = data.activeQuest || null;
      savedMapZoom = data.mapZoom || null;
      rebuildPlayerFromSave(data);
      $("classOverlay").classList.add("hidden");
      $("hudIconEmoji").textContent = player.emoji;
  updateNotifBell();
      refreshHud();
      teardownMapIfExists();
      setupBuilderModeUI();
      initMap(data.lastPos);
      if(activeQuest && !activeQuest.itemObtained) drawQuestRoute();
      renderQuestTracker();
      checkDailyBonus();
    };
  });
  area.querySelectorAll(".btn-delete-char").forEach(btn=>{
    btn.onclick = (e)=>{
      e.stopPropagation();
      const key = btn.dataset.classkey;
      confirmDeleteCharacter(key, slots[key].name);
    };
  });
  if(existingCount < 4){
    $("btnNewCharacter").onclick = ()=>{
      $("classTitle").textContent = "Elige tu clase";
      area.innerHTML = "";
      $("classGrid").classList.remove("hidden");
      $("classSubText").classList.remove("hidden");
      $("genderSection").classList.remove("hidden");
      $("nameInput").classList.remove("hidden");
      $("btnStart").classList.remove("hidden");
      $("btnBackToCharList").classList.remove("hidden");
      buildClassGrid();
      // El nombre es tuyo como jugador, no de cada personaje — si ya tienes otro personaje,
      // se reutiliza el mismo nombre y no se puede cambiar al crear uno nuevo.
      const existingNames = Object.values(slots).filter(Boolean).map(s=>s.name).filter(Boolean);
      if(existingNames.length > 0){
        $("nameInput").value = existingNames[0];
        $("nameInput").readOnly = true;
        $("nameInput").title = "Tu nombre de jugador ya está definido por tu primer personaje.";
      } else {
        $("nameInput").value = "";
        $("nameInput").readOnly = false;
        $("nameInput").title = "";
      }
      updateStartBtn();
    };
  }
}
$("btnBackToCharList").onclick = ()=> initContinueScreen();

/** Borra por completo el personaje guardado de esa clase (pide confirmación antes). */
async function deleteCharacterSlot(classKey){
  if(!AppStorage) return;
  try{ await AppStorage.delete('player_'+classKey, false); }catch(e){ /* ya no existía */ }
  // limpia también la clave vieja de "un solo personaje" (de antes de este sistema) — si no,
  // la próxima vez que se cargue con todos los slots vacíos, la migración automática lo revive.
  try{ await AppStorage.delete('player', false); }catch(e){ /* tampoco existía */ }
}
function confirmDeleteCharacter(classKey, charName){
  $("deleteCharSub").textContent = `Vas a eliminar a ${charName} (${CLASSES[classKey].name}) para siempre — perderás todo su progreso, equipo y oro. Esta acción no se puede deshacer.`;
  $("deleteCharOverlay").classList.remove("hidden");
  $("btnConfirmDeleteChar").onclick = async ()=>{
    await deleteCharacterSlot(classKey);
    $("deleteCharOverlay").classList.add("hidden");
    toast(`🗑️ ${charName} fue eliminado.`);
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
    $("towerOwnerLine").innerHTML = `⚔️ Pertenece a <b>${owner.ownerName}</b> (Nv.${owner.ownerStats?.level||"?"}).`;
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
      id:"tower_rival_"+tower.id, tpl:{name:owner.ownerName+" (torre)", emoji:"🗼", aggressive:true}, level: s.level||player.level,
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
    toast(`🗼 Tus torres generaron 💰${totalGold} oro mientras no jugabas.`, 4500);
    refreshHud(); saveGame();
  }
}

/** Puntos de mejora de equipo (⚒️), en parques y centros comerciales — reemplazan la mejora del menú de Equipo. */
let upgradeMarkers = {};
function drawUpgradeStations(){
  upgradeMarkers = {};
  UPGRADE_STATIONS.forEach(u=> drawSingleUpgradeMarker(u));
}
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

/** Destruye el mapa de Leaflet si ya existe uno activo — hace falta antes de llamar a initMap() de nuevo
 *  (por ejemplo, al volver al menú y luego continuar/crear otro personaje), si no, Leaflet tira un error
 *  porque el div #map "ya está inicializado". */
function teardownMapIfExists(){
  if(typeof map !== "undefined" && map && map.remove){
    try{ map.remove(); }catch(e){ /* ya estaba destruido */ }
  }
  map = null;
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
/** El GPS real hace jitter (saltos momentáneos de precisión, típicos en celular) y `playerLatLng`
 *  se aplica siempre crudo, sin suavizar (ver onGpsSuccess/movePlayerTo) — por eso la recolección
 *  activa NUNCA debe cancelarse por una sola lectura fuera de rango: necesita un margen extra sobre
 *  ENGAGE_RANGE_M (para absorber el error típico de precisión) Y confirmarlo en varias lecturas de
 *  posición reales seguidas (no relecturas del mismo dato viejo) antes de cancelar. Mismo criterio
 *  que el colchón de histéresis ya usado en visibility.js (Mapa Vivo, Capa 5) para no "parpadear"
 *  justo en el borde. Ver checkActiveGatherProximity(), llamado desde movePlayerTo. */
const GATHER_CANCEL_RANGE_M = ENGAGE_RANGE_M + 25;
const GATHER_CANCEL_STRIKES = 3;
function initMap(savedPos){
  const start = savedPos || playerLatLng || {lat:4.710989, lng:-74.072090}; // fallback: Bogotá
  const detectedCity = detectCityAndLoadWorldData(start.lat, start.lng);
  map = L.map('map', {zoomControl:false, attributionControl:false, tap:true, tapTolerance:28}).setView([start.lat,start.lng], savedMapZoom||DEFAULT_ZOOM);
  map.setPitch(65); // vista TOTALMENTE inclinada por defecto (el maximo que permite el mapa)
  map.on('zoomend', ()=>{ savedMapZoom = map.getZoom(); saveGame(); });
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
  const meIcon = L.divIcon({className:'', html:`<div style="position:relative; display:flex; align-items:center; justify-content:center; width:110px; height:60px;">
      <div class="${lampClass}" style="position:absolute; left:2px; top:8px;">🏮</div>
      <div class="${lampClass}" style="position:absolute; right:2px; top:8px;">🏮</div>
      <div class="ring-tilt-wrap"><div class="pulse-ring"></div></div>${meInner}</div>`, iconSize:[120,70], iconAnchor:[60,52]});
  meMarker = L.marker([start.lat,start.lng], {icon:meIcon, zIndexOffset:1000}).addTo(map);
  playerLatLng = start;

  // Cada elemento decorativo del mapa se dibuja en su propio try/catch — un error en cualquiera de
  // ellos queda aislado (se avisa en la consola para poder diagnosticarlo) y nunca puede volver a
  // dejar al personaje sin aparecer ni cortar el resto de la inicialización del mapa.
  function safeDrawStep(label, fn){
    try{ fn(); }catch(e){ console.error(`[initMap] Falló al dibujar ${label} — el resto del mapa sigue igual:`, e); }
  }
  safeDrawStep("las zonas de la ciudad", drawNeivaZones);
  safeDrawStep("los parques", drawNeivaParks);
  safeDrawStep("las torres", drawTowers);
  safeDrawStep("la limpieza de entidades dinámicas expiradas", pruneExpiredDynamicEntities);
  safeDrawStep("la visibilidad media (fogatas/santuarios/torres/Coliseo cercanos)", updateMediumVisibility);
  safeDrawStep("la limpieza de eventos del mundo expirados", pruneExpiredWorldEvents);
  safeDrawStep("los eventos del mundo", drawAllWorldEvents);
  safeDrawStep("las bases", drawAllBases);
  safeDrawStep("las estaciones de mejora", drawUpgradeStations);

  checkZoneDiscovery();
  updateParkProximity();
  updateCampfireProximity();
  updateCurrentRegion();
  toast(`📍 Estás en ${detectedCity.name}`, 3500);
  fetchWeatherForLocation(start.lat, start.lng);
  setInterval(()=> fetchWeatherForLocation(playerLatLng.lat, playerLatLng.lng), 20*60000);
  refreshWorldGeoDataAroundPlayer(); // Mapa Vivo, Capa 6 — primera consulta real a OpenStreetMap alrededor del punto de partida

  // Modo simulación: tocar el mapa mueve al jugador (útil sin GPS / en interiores)
  map.on('click', (e)=>{
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
  setInterval(()=> maybeAutoSpawn(), 25000);
  setInterval(()=> regenPlayerHp(), 8000);
  updateDayNightBadge();
  updateMapTimeOfDay();
  updateAmbientEffects();
  setInterval(()=>{ updateDayNightBadge(); updateMapTimeOfDay(); updateAmbientEffects(); }, 60000);
  collectTowerGold();
  collectBuildingGold();
  setInterval(collectTowerGold, 5*60000); // revisa el oro acumulado de tus torres cada 5 minutos
  setInterval(collectBuildingGold, 5*60000); // igual para el oro del Edificio
  checkConstructionTimers();
  setInterval(checkConstructionTimers, 30000); // revisa cada 30s si tu base/Edificio ya terminaron de construirse
  setInterval(()=> saveGame(), 15000); // autoguardado periódico
  setInterval(()=> maybeSpawnThief(), 90000);
  setInterval(()=> maybeSpawnChest(), 45000);
  setInterval(()=> updateContextBar(), 8000);
  updateContextBar();
  setInterval(()=> updateChestLifespans(), 20000);
  maybeSpawnChest(); // uno de una vez al empezar, para no tener que esperar el primer intervalo
  setInterval(()=> maybeSpawnResourceNode(), 35000);
  setInterval(()=> updateResourceNodeLifespans(), 20000);
  maybeSpawnResourceNode(); maybeSpawnResourceNode(); // un par de una vez al empezar
  setInterval(()=> maybeSpawnLoboNocturno(), 60000);
  setInterval(()=> maybeSpawnShadowWolf(), 45000);
  setInterval(()=> maybeScheduleWanderingMerchant(), 120000);
  setInterval(()=> pruneExpiredDynamicEntities(), 30000);
  setInterval(()=> maybeScheduleRandomEvent(), 50000);
  setInterval(()=> pruneExpiredWorldEvents(), 30000);
  setInterval(()=> maybeSpawnVagabundo(), 300000);
  setInterval(()=> maybeSpawnQuestNpc(), 240000);
  setInterval(()=> maybeSpawnTutorialQuestNpc(), 90000);
  setInterval(()=> maybeSpawnBoss(), 240000);
  setTimeout(()=> maybeSpawnBoss(), 60000);
  setInterval(()=> updateBossTimers(), 1000);
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
  if(!navigator.geolocation) return {ok:false, reason:"unsupported"};
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

  navigator.geolocation.getCurrentPosition(
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
    },
    options
  );
}

/** Seguimiento continuo de posición, una vez que el primer fix fue exitoso. */
function beginWatch(){
  if(watchId){ navigator.geolocation.clearWatch(watchId); watchId = null; }
  const options = {enableHighAccuracy:true, maximumAge:0, timeout:20000};
  gpsLog("Iniciando seguimiento continuo (watchPosition) con opciones:", options);
  watchId = navigator.geolocation.watchPosition(
    (pos)=>{
      gpsLog("Actualización de posición · Accuracy:", pos.coords.accuracy, "m");
      onGpsSuccess(pos);
    },
    (err)=>{
      gpsErrorLog(err.code, err.message);
      onGpsError(err, false);
    },
    options
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
  if(watchId){ navigator.geolocation.clearWatch(watchId); watchId = null; }
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
  if(follow) map.panTo([lat,lng], {animate:true});
  if(prev && gpsMode){
    const segment = distMeters(prev, playerLatLng);
    if(segment > 0 && segment < 300) addWalkedDistance(segment); // ignora saltos raros de GPS (mala señal, teletransportes)
  }
  checkZoneDiscovery();
  updateParkProximity();
  updateCampfireProximity();
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
    builderAddKind = btn.dataset.addKind;
    toast("👉 Toca el mapa donde quieras colocarlo.");
  };
});
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
function randOffset(meters){
  // ~1 grado lat = 111,111 m
  const dLat = (Math.random()*2-1) * (meters/111111);
  const dLng = (Math.random()*2-1) * (meters/(111111*Math.cos(playerLatLng.lat*Math.PI/180)));
  return {lat: playerLatLng.lat+dLat, lng: playerLatLng.lng+dLng};
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
/** Aplica el tinte correspondiente a la fase del día sobre los mosaicos del mapa. */
function updateMapTimeOfDay(){
  const tiles = document.querySelector(".map-tiles-bright");
  const phase = timeOfDayPhase();
  if(tiles){
    tiles.classList.toggle("time-dusk", phase==="dusk");
    tiles.classList.toggle("time-night", phase==="night");
    tiles.classList.toggle("time-morning", phase==="morning");
  }
  const lit = isNightTime();
  document.querySelectorAll(".street-lamp").forEach(el=> el.classList.toggle("lit", lit));
  const beam = $("mapLightBeam");
  if(beam){
    beam.classList.remove("beam-moon","beam-sun");
    if(phase==="night") beam.classList.add("beam-moon");
    else if(phase==="morning") beam.classList.add("beam-sun");
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
function updateEngageRingRadius(){
  if(!map || !map.getZoom || !playerLatLng) return;
  const zoom = map.getZoom();
  const metersPerPixel = 156543.03392 * Math.cos(playerLatLng.lat*Math.PI/180) / Math.pow(2, zoom);
  const radiusPx = ENGAGE_RANGE_M / metersPerPixel;
  document.documentElement.style.setProperty("--engage-range-px", Math.round(radiusPx)+"px");
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
/** Genera las gotas de lluvia (una sola vez por sesión de lluvia activa) con posiciones/tiempos al azar. */
function spawnRaindrops(){
  const container = $("weatherRain");
  if(!container || container.childElementCount > 0) return;
  const count = 45;
  for(let i=0;i<count;i++){
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
/** Aplica el efecto visual (sol/nubes/lluvia) y actualiza el textito de clima en el HUD. */
function applyWeatherEffect(category, tempC){
  const el = $("weatherEffects");
  if(!el) return;
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

/** Reparte posiciones en zigzag a los lados de por dónde sueles caminar (se usa tu último rumbo
 *  real como una aproximación de "por dónde va la calle", ya que no tenemos la geometría exacta
 *  de las vías) — así los enemigos no aparecen amontonados en cualquier lado, sino como si
 *  estuvieran repartidos a lado y lado de un camino, con una separación mínima entre ellos. */
function zigzagSpawnPositions(count, baseDistM){
  const roadRad = (lastMovementWorldBearing||0) * Math.PI/180;
  const perpRad = roadRad + Math.PI/2;
  const positions = [];
  const MIN_SPACING_M = 30;
  for(let i=0;i<count;i++){
    let pos, attempts = 0;
    do {
      const along = baseDistM + i*40 + Math.random()*15; // cada vez un poco más lejos por el "camino"
      const side = (i%2===0) ? 1 : -1; // zigzag: alterna izquierda/derecha
      const perpDist = (16 + Math.random()*14) * side;
      const dLatAlong = (along*Math.cos(roadRad))/111320, dLngAlong = (along*Math.sin(roadRad))/(111320*Math.cos(playerLatLng.lat*Math.PI/180));
      const dLatPerp = (perpDist*Math.cos(perpRad))/111320, dLngPerp = (perpDist*Math.sin(perpRad))/(111320*Math.cos(playerLatLng.lat*Math.PI/180));
      pos = {lat: playerLatLng.lat+dLatAlong+dLatPerp, lng: playerLatLng.lng+dLngAlong+dLngPerp};
      attempts++;
    } while(positions.some(p=> distMeters(p,pos) < MIN_SPACING_M) && attempts < 6);
    positions.push(pos);
  }
  return positions;
}
function spawnMonsters(n){
  const positions = zigzagSpawnPositions(n, 25 + Math.random()*40);
  for(let i=0;i<n;i++){
    const tpl = pickMonsterTemplate();
    const level = Math.max(1, player.level + Math.floor(Math.random()*3) - 1);
    const m = makeMonster(tpl, level, positions[i]);
    monsters.push(m);
  }
  slideNotice(`${isNightTime()?"🌙":"👾"} ${n} monstruo(s) detectado(s) cerca.`);
}

/** Manada de 2-3 (o 3-4 de noche) monstruos del mismo tipo, agrupados, con más recompensa (oro/XP). */
function spawnPack(){
  if(player.level < 7) return; // las manadas son muy duras antes del nivel 7
  const night = isNightTime();
  const center = randOffset(35 + Math.random()*110);
  const size = night ? (3 + Math.floor(Math.random()*2)) : (2 + Math.floor(Math.random()*2)); // 3-4 de noche, 2-3 de día
  const tpl = pickMonsterTemplate();
  const level = Math.max(1, player.level + Math.floor(Math.random()*3) - 1);
  const packId = "pk"+Math.random().toString(36).slice(2,9);
  for(let i=0;i<size;i++){
    const pos = {lat: center.lat + (Math.random()*2-1)*0.00018, lng: center.lng + (Math.random()*2-1)*0.00018};
    monsters.push(makeMonster(tpl, level, pos, {pack:true, packId}));
  }
  slideNotice(`${night?"🌙⚠️":"⚠️"} ¡Manada de ${size} ${tpl.name}(s) cerca! Tócalos para enfrentarlos juntos.`);
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
  const maxMonsters = night ? 9 : 5;      // de noche se permiten más enemigos activos a la vez
  const spawnChance = night ? 0.95 : 0.8;  // de noche casi siempre aparece algo nuevo
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
  const pos = randOffset(60 + Math.random()*160);
  const m = makeMonster(LOBO_NOCTURNO_TEMPLATE, 50, pos, {special:true});
  monsters.push(m);
  toast("🌙 Algo aúlla en la oscuridad... un Lobo Nocturno ronda cerca.", 4500);
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

/** El inventario tiene un límite de espacios — se puede ampliar de a UNO. Los primeros 4 espacios
 *  extra se compran con oro (cada vez un poco más caro); de ahí en adelante, con cristales. */
const BASE_INVENTORY_SLOTS = 30;
function inventoryMaxSlots(){ return BASE_INVENTORY_SLOTS + (player.extraInventorySlots||0); }
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
/** ¿Cuánto cuesta el PRÓXIMO espacio que compres, y en qué moneda? Sube bastante cada vez que
 *  compras uno, para que se sienta una decisión real y no algo casi gratis. */
function nextSlotPurchaseInfo(){
  const bought = player.extraInventorySlots||0;
  if(bought < 4) return {currency:"gold", cost: Math.round(150 * Math.pow(1.8, bought))}; // 150, 270, 486, 875
  return {currency:"crystal", cost:5};
}
function buyNextInventorySlot(){
  const info = nextSlotPurchaseInfo();
  if(info.currency==="gold"){
    if((player.gold||0) < info.cost){ toast(`🪙 Te faltan oro (necesitas ${info.cost}).`); return; }
    player.gold -= info.cost;
  } else {
    if((player.crystals||0) < info.cost){ toast(`💎 Te faltan cristales (necesitas ${info.cost}).`); return; }
    player.crystals -= info.cost;
  }
  player.extraInventorySlots = (player.extraInventorySlots||0) + 1;
  refreshHud();
  saveGame();
  toast(`🎒 +1 espacio de inventario (ahora ${inventoryMaxSlots()} en total).`);
}
/** Cuánto costaría comprar N espacios de golpe (simula la misma escalada de precio que
 *  nextSlotPurchaseInfo, uno por uno) — se usa cuando varias recompensas de golpe no caben. */
function inventorySlotsPurchaseCostForN(n){
  let bought = player.extraInventorySlots||0;
  let gold = 0, crystals = 0;
  for(let i=0;i<n;i++){
    if(bought < 4) gold += Math.round(150 * Math.pow(1.8, bought));
    else crystals += 5;
    bought++;
  }
  return {gold, crystals};
}
/** Cuando una recompensa de combate no cupo en el inventario, en vez de perderla directo se le
 *  ofrece al jugador comprar los espacios que faltan para conservarla — si dice que no (o no le
 *  alcanza), se pierde como siempre. Devuelve true si se conservaron todos. */
function offerToBuySpaceForOverflow(overflowItems, onResolved){
  if(!overflowItems.length){ if(onResolved) onResolved(); return; }
  const need = overflowItems.length;
  const cost = inventorySlotsPurchaseCostForN(need);
  const parts = [];
  if(cost.gold) parts.push(`🪙${cost.gold}`);
  if(cost.crystals) parts.push(`💎${cost.crystals}`);
  const itemNames = overflowItems.map(it=>`${it.emoji} ${it.name}`).join(", ");
  showConfirm(
    `Tu inventario está lleno — no hay espacio para: ${itemNames}.<br><br>¿Comprar ${need} espacio${need>1?"s":""} por ${parts.join(" + ")} para conservarlos?`,
    ()=>{
      if((player.gold||0) < cost.gold || (player.crystals||0) < cost.crystals){
        toast(`No te alcanza para comprar ese espacio — perdiste: ${itemNames}`, 4200);
        if(onResolved) onResolved();
        return;
      }
      player.gold -= cost.gold;
      player.crystals = (player.crystals||0) - cost.crystals;
      player.extraInventorySlots = (player.extraInventorySlots||0) + need;
      overflowItems.forEach(it=> pushItemSafe(it)); // ahora sí caben todos
      refreshHud();
      toast(`🎒 +${need} espacio${need>1?"s":""} — ¡conservaste: ${itemNames}!`, 4400);
      if(onResolved) onResolved();
    },
    {icon:"🎒", title:"Inventario lleno", confirmLabel:"Comprar espacio",
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
    doPurchase();
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
  if(d > ENGAGE_RANGE_M){ toast(`Está a ${Math.round(d)} m — acércate (≤${ENGAGE_RANGE_M} m).`); return; }
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
  $("gatherProgressWrap").classList.add("hidden");
  const amount = Math.round(type.amountMin + Math.random()*(type.amountMax-type.amountMin));
  player[type.kind] = (player[type.kind]||0) + amount;
  removeResourceNodeMarker(node.id);
  // el pico se gasta un uso por cada recolección — al llegar a 0 se rompe y hay que comprar otro
  let pickaxeMsg = "";
  if(player.pickaxe){
    player.pickaxe.uses -= 1;
    if(player.pickaxe.uses <= 0){
      pickaxeMsg = " · ⛏️ ¡tu pico se rompió!";
      player.pickaxe = null;
    }
  }
  refreshHud();
  saveGame();
  renderPickaxeShopStatus();
  toast(`${RESOURCE_ICON[type.kind]} +${amount} ${RESOURCE_LABEL[type.kind]}${pickaxeMsg}`, 2800);
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
  campfireDiff.toShow.forEach(e=> drawSingleCampfireMarker(e.data));
  campfireDiff.toHide.forEach(id=>{ if(campfireMarkers[id]){ campfireMarkers[id].remove(); delete campfireMarkers[id]; } });

  const shrineEntries = (SHRINES||[]).map(s=> ({id:s.id, distanceM: distMeters(playerLatLng, s), data:s}));
  const shrineDiff = diffVisibility("shrine", shrineEntries, new Set(Object.keys(shrineMarkers)));
  shrineDiff.toShow.forEach(e=> drawSingleShrineMarker(e.data));
  shrineDiff.toHide.forEach(id=>{ if(shrineMarkers[id]){ shrineMarkers[id].remove(); delete shrineMarkers[id]; } });

  // Torres "no landmark" (la segunda de cada zona): solo se ven por proximidad, para no saturar el
  // mapa — comparten el mismo `towerMarkers` que las landmark (que ya están siempre dibujadas),
  // por eso `renderedIds` se limita acá a los ids de ESTAS torres específicamente.
  const towerProximityTowers = (TOWERS||[]).filter(t=> !t.landmark);
  const towerProximityIds = new Set(towerProximityTowers.map(t=> t.id));
  const towerProximityEntries = towerProximityTowers.map(t=> ({id:t.id, distanceM: distMeters(playerLatLng, t), data:t}));
  const towerRenderedIds = new Set(Object.keys(towerMarkers).filter(id=> towerProximityIds.has(id)));
  const towerProximityDiff = diffVisibility("tower_proximity", towerProximityEntries, towerRenderedIds);
  towerProximityDiff.toShow.forEach(e=>{ drawSingleTowerMarker(e.data); updateTowerMarkerVisual(e.data.id); });
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
  player.gold -= BASE_PURCHASE_COST_GOLD;
  player.wood -= BASE_PURCHASE_COST_WOOD;
  player.stone -= BASE_PURCHASE_COST_STONE;
  player.iron -= BASE_PURCHASE_COST_IRON;
  player.hasBase = true; // la tienes, pero todavia no la has desplegado en el mapa
  refreshHud();
  saveGame();
  $("shopOverlay").classList.add("hidden");
  toast("🏠 ¡Compraste tu base! Ve al menú 🏠 Bases para desplegarla cuando quieras.", 4500);
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
  if(previewBaseMarker) previewBaseMarker.setLatLng([lat, lng]);
  else{
    const icon = L.divIcon({className:'', html:`<div class="base-marker-simple base-preview"><div class="bms-label">Aquí</div><div class="bms-emoji">🏠</div></div>`, iconSize:[54,58], iconAnchor:[27,50]});
    previewBaseMarker = L.marker([lat, lng], {icon, zIndexOffset:300, interactive:false}).addTo(map);
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
  if(player.baseEverPlaced){
    if((player.gold||0) < BASE_REDEPLOY_COST_GOLD){ toast(`🪙 Te faltan oro para volver a colocarla (necesitas ${BASE_REDEPLOY_COST_GOLD}).`); return; }
    player.gold -= BASE_REDEPLOY_COST_GOLD;
    refreshHud();
  }
  const ll = previewBaseMarker.getLatLng();
  basePlacementArmed = false;
  previewBaseMarker.remove(); previewBaseMarker = null;
  $("basePlacementControls").classList.add("hidden");
  placeOwnBase(ll.lat, ll.lng);
};

/** Coloca la base del jugador donde tocó el mapa — se llama desde el mismo clic del mapa que
 *  mueve al personaje, interceptándolo primero si el modo de colocación está armado. */
function placeOwnBase(lat, lng){
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
  baseMarkers = {};
  if(player.base){
    playerBases[myPlayerId] = {ownerId: myPlayerId, ownerName: player.name, lat: player.base.lat, lng: player.base.lng, placedAt:0};
    drawSingleBaseMarker(playerBases[myPlayerId]);
  }
  fetchOtherBases();
}
function drawSingleBaseMarker(base){
  const isMine = base.ownerId === myPlayerId;
  const underConstruction = isMine && isBaseUnderConstruction();
  const emoji = underConstruction ? "🚧" : (isMine && player.isBuilding) ? "🏢" : "🏠";
  const icon = L.divIcon({className:'', html:`<div class="base-marker-simple">
      <div class="bms-label">${base.ownerName}</div>
      <div class="bms-emoji">${emoji}</div>
    </div>`, iconSize:[54,58], iconAnchor:[27,50]});
  const marker = L.marker([base.lat, base.lng], {icon, zIndexOffset:150}).addTo(map);
  marker.on('click', ()=> tryEnterBase(base));
  baseMarkers[base.ownerId] = marker;
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
    showConfirm("Esta es tu base. ¿Quieres entrar?", openBaseStorage, {icon:"🏠", confirmLabel:"Entrar"});
  } else {
    toast(`🏠 Esta es la base de ${base.ownerName} — no puedes entrar.`);
  }
}

function openBaseStorage(){
  renderBaseStorageList();
  $("baseStorageOverlay").classList.remove("hidden");
}
$("btnCloseBaseStorage").onclick = ()=> $("baseStorageOverlay").classList.add("hidden");

function baseStorageMaxSlots(){ return BASE_STORAGE_SLOTS + (player.baseExtraSlots||0); }
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
    uniqueInv.forEach(it=>{
      const meta = equipItemMeta(it);
      const card = document.createElement("div");
      card.className = "inv-card-v2 " + meta.rc;
      card.innerHTML = `<div class="icv-icon">${iconFor(it)}</div><div class="icv-name">${it.name}</div>
        <button class="ghostbtn base-transfer-btn">Pasar ⬇️</button>`;
      card.querySelector(".base-transfer-btn").onclick = (e)=>{
        e.stopPropagation();
        if((player.baseStorage||[]).length >= baseStorageMaxSlots()){ toast("🏠 Tu base está llena — consigue más espacio."); return; }
        const idx = player.inventory.findIndex(x=>x.id===it.id);
        if(idx<0) return;
        const [moved] = player.inventory.splice(idx,1);
        player.baseStorage.push(moved);
        refreshHud();
        renderBaseStorageList();
        saveGame();
      };
      invGrid.appendChild(card);
    });
  }

  // ---- abajo: el cofre de la base, con boton "Pasar ⬆️" para devolverlo al inventario ----
  const chestGrid = $("baseChestSideList");
  chestGrid.innerHTML = "";
  if(storage.length===0){
    chestGrid.innerHTML = `<div class="empty-note" style="grid-column:1/-1;">Aún no has guardado nada aquí.</div>`;
  } else {
    storage.forEach((it, idx)=>{
      const meta = equipItemMeta(it);
      const card = document.createElement("div");
      card.className = "inv-card-v2 " + meta.rc;
      card.innerHTML = `<div class="icv-icon">${iconFor(it)}</div><div class="icv-name">${it.name}</div>
        <button class="ghostbtn base-transfer-btn">Pasar ⬆️</button>`;
      card.querySelector(".base-transfer-btn").onclick = (e)=>{
        e.stopPropagation();
        if(!hasInventorySpace(it.id)){ toast("🎒 Tu inventario está lleno — no se pudo sacar."); return; }
        const [moved] = player.baseStorage.splice(idx,1);
        pushItemSafe(moved);
        refreshHud();
        renderBaseStorageList();
        saveGame();
      };
      chestGrid.appendChild(card);
    });
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
      <button data-act="enter" style="margin-right:4px;">🗝️ Abrir cofre</button>
      <button data-act="pickup" style="background:var(--danger);">🪙${BASE_PICKUP_COST_GOLD} Recoger</button>`;
    row.querySelector('[data-act="enter"]').onclick = ()=>{
      $("basesMenuOverlay").classList.add("hidden");
      openBaseStorage();
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
function renderForge(){
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
$("btnCloseForge").onclick = ()=> $("forgeOverlay").classList.add("hidden");
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
 *  resto de objetos del mundo). */
function drawDynamicEntityMarker(entity){
  const icon = L.divIcon({className:'', html:`<div class="dynamic-entity-marker">${entity.sprite}</div>`,
    iconSize:[42,46], iconAnchor:[21,42]});
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
  if(def.declineLabel){
    showConfirm(`${def.description}<br><br>¿${def.actionLabel} o ${def.declineLabel.toLowerCase()}?`, ()=> engageWorldEvent(ev),
      {icon:def.icon, title:def.label, confirmLabel:def.actionLabel, cancelLabel:def.declineLabel});
  } else {
    showConfirm(def.description, ()=> engageWorldEvent(ev), {icon:def.icon, title:def.label, confirmLabel:def.actionLabel});
  }
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
const VAGABUNDO_TEMPLATE = {name:"Vagabundo", emoji:"🧔", tier:1, hpM:1, atkM:1, defM:1};
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
  const template = TUTORIAL_QUEST_TEMPLATES[Math.floor(Math.random()*TUTORIAL_QUEST_TEMPLATES.length)];
  const pos = randOffset(35 + Math.random()*80); // más cerca, para que sea fácil de encontrar
  const tpl = {name:template.npcName, emoji:template.npcEmoji, tier:1, hpM:1, atkM:1, defM:1};
  const m = makeMonster(tpl, player.level, pos, {special:true});
  m.isQuestNpc = true;
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
  }
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
  refreshHud();
  checkLevelUps();
  toast(`🎉 Misión completada: +${t.rewardGold} 💰 · +${t.rewardXp} XP`, 4000);
  saveGame();
}


function maybeSpawnVagabundo(){
  if(monsters.some(m=>m.isVagabundo)) return; // ya hay uno activo
  if(Math.random() > 0.12) return; // más raro que el comerciante
  const pos = randOffset(45 + Math.random()*140);
  const m = makeMonster(VAGABUNDO_TEMPLATE, player.level, pos, {special:true});
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
  const lvlClass = opts.boss ? "special" : opts.special ? "special" : (opts.pack ? "pack" : "");
  const isThiefTpl = tpl === THIEF_TEMPLATE;
  let ring = tpl.aggressive ? `<div class="magic-circle"></div><div class="aggro-ring"></div>` : (opts.special ? `<div class="special-npc-glow"></div>` : "");
  let timerHtml = "";
  if(opts.boss){
    const tier = bossDifficultyTier(level);
    ring = `<div class="boss-ground-glow boss-ground-glow-${tier}"></div><div class="boss-aura boss-aura-${tier}"></div>`;
    timerHtml = `<div class="boss-timer" id="bossTimer-${id}">5:00</div>`;
  }
  const bodyHtml = isThiefTpl
    ? `<img src="${THIEF_SPRITES.map}" class="mon-real-sprite" alt="">`
    : `<div class="mon-emoji" style="${opts.boss?'font-size:34px;':''}">${tpl.emoji}</div>`;
  const icon = L.divIcon({className:'', html:`<div class="mon-marker ${opts.boss?'mon-marker-fixed':''}" style="position:relative;">${timerHtml}<div class="ring-tilt-wrap">${ring}</div>${bodyHtml}<div class="mon-lvl ${lvlClass}">Nv.${level}</div></div>`,
    iconSize:[58,62], iconAnchor:[29,42]});
  const marker = L.marker([pos.lat,pos.lng], {icon, zIndexOffset: opts.boss ? 900 : 500}).addTo(map);
  const lifespanMs = opts.lifespanMsOverride || ((5 + Math.random()*2) * 60000); // 5-7 min normal, o el valor fijo del jefe
  const mon = {id, tpl, level, hp, maxHp:hp, atk, def, spd, lat:pos.lat, lng:pos.lng, marker,
    packBonus: opts.pack ? 1.5 : 1, packId: opts.packId || null, ambushed:false, isBoss: !!opts.boss,
    spawnedAt: Date.now(), lifespanMs};
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

/** Enemigos agresivos: si te acercas demasiado sin tocarlos, te emboscan solos (o en manada). */
function checkAmbush(){
  if(battleState || pvp || groupBattle || !playerLatLng) return;
  for(const m of monsters){
    if(!m.tpl.aggressive || m.ambushed) continue;
    if(distMeters(playerLatLng, m) <= 25){
      m.ambushed = true;
      if(m.packId){
        const packMons = monsters.filter(mm=>mm.packId===m.packId);
        packMons.forEach(mm=> mm.ambushed = true);
        toast(`⚠️ ¡Una manada de ${m.tpl.name} te emboscó!`, 3000);
        startPackBattle(packMons);
      } else {
        toast(`⚠️ ¡${m.tpl.name} te emboscó!`, 3000);
        startBattle(m);
      }
      break; // solo un combate a la vez
    }
  }
}

/* ============================================================
   3. HUD
   ============================================================ */
function refreshHud(){
  $("hudName").textContent = `${player.name}`;
  $("hudLvl").textContent = `Nv. ${player.level}`;
  $("hpFill").style.width = pct(player.hp, player.maxHp)+"%";
  $("mpFill").style.width = pct(player.mp, player.maxMp)+"%";
  $("xpFill").style.width = pct(player.xp, player.xpNext)+"%";
  $("statAtk").textContent = round1(player.atk);
  $("statMatk").textContent = round1(player.matk||0);
  $("statDef").textContent = round1(player.def);
  $("statSpd").textContent = round1(player.spd);
  $("statGold").textContent = formatGold(player.gold);
  $("statGold").title = (player.gold||0).toLocaleString("es");
  $("statCrystals").textContent = player.crystals||0;
  const pts = player.attributePoints||0;
  $("pointsBadge").classList.toggle("hidden", pts<=0);
  $("pointsCount").textContent = pts;
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
$("btnInv").onclick = ()=>{ closeFabMenu(); renderInventoryTabs(); renderInventory(); $("invOverlay").classList.remove("hidden"); $("invNotifDot").classList.remove("show"); };
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

  // Iconos de equipo a los lados del personaje (arma/escudo/casco a la izquierda, armadura/botas/accesorio a la derecha).
  function flankItem(slotDef){
    const item = player.equipment[slotDef.key];
    if(!item) return `<div class="cs-flank-item empty" data-slot="${slotDef.key}"><div class="cfi-icon">${slotDef.emoji}</div></div>`;
    const meta = equipItemMeta(item);
    const bonusEntries = Object.entries(item.bonuses||{});
    const bonusLabel = bonusEntries.length ? `+${bonusEntries[0][1]}` : "";
    return `<div class="cs-flank-item ${meta.rc}" style="${meta.styleAttr}">
      <div class="cfi-icon">${iconFor(item)}</div>
      <div class="cfi-bonus">${bonusLabel}</div>
    </div>`;
  }
  $("csFlankLeft").innerHTML = ["weapon","offhand","helmet"].map(k=> flankItem(EQUIP_SLOTS.find(s=>s.key===k))).join("");
  $("csFlankRight").innerHTML = ["armor","boots","accessory"].map(k=>{
    if(k==="accessory"){
      const item = (player.equipment.accessory||[])[0];
      if(!item) return `<div class="cs-flank-item empty" data-slot="accessory" data-idx="0"><div class="cfi-icon">💍</div></div>`;
      const meta = equipItemMeta(item);
      const bonusEntries = Object.entries(item.bonuses||{});
      const bonusLabel = bonusEntries.length ? `+${bonusEntries[0][1]}` : "";
      return `<div class="cs-flank-item ${meta.rc}" style="${meta.styleAttr}"><div class="cfi-icon">${iconFor(item)}</div><div class="cfi-bonus">${bonusLabel}</div></div>`;
    }
    return flankItem(EQUIP_SLOTS.find(s=>s.key===k));
  }).join("");
  // Tocar un hueco VACÍO abre un selector de qué equipar ahí, usando tu inventario —
  // los huecos ya ocupados no reaccionan aquí (para eso está la pantalla de Equipo).
  document.querySelectorAll("#csFlankLeft .cs-flank-item.empty, #csFlankRight .cs-flank-item.empty").forEach(el=>{
    el.style.cursor = "pointer";
    el.onclick = ()=> openEquipPickerForSlot(el.dataset.slot, el.dataset.idx!=null ? +el.dataset.idx : null);
  });

  const eqList = $("csEquipList");
  eqList.innerHTML = "";
  EQUIP_SLOTS.forEach(slotDef=>{
    if(slotDef.key === "accessory"){
      player.equipment.accessory.forEach((item, i)=>{
        const row = document.createElement("div");
        if(item){
          const meta = equipItemMeta(item);
          applyItemRowStyling(row, meta);
          row.innerHTML = `${meta.sparkles}<div class="ie">${iconFor(item)}</div><div class="it">Accesorio ${i+1}: ${item.name}${meta.tag}<small>${item.desc}</small></div>`;
        } else {
          row.className = "inv-item";
          row.innerHTML = `<div class="ie">${slotIconFor(slotDef)}</div><div class="it">Accesorio ${i+1}<small style="color:var(--dim)">Vacío</small></div>`;
        }
        eqList.appendChild(row);
      });
      return;
    }
    const item = player.equipment[slotDef.key];
    const row = document.createElement("div");
    if(item){
      const meta = equipItemMeta(item);
      applyItemRowStyling(row, meta);
      row.innerHTML = `${meta.sparkles}<div class="ie">${iconFor(item)}</div><div class="it">${slotDef.label}: ${item.name}${meta.tag}<small>${item.desc}</small></div>`;
    } else {
      row.className = "inv-item";
      row.innerHTML = `<div class="ie">${slotIconFor(slotDef)}</div><div class="it">${slotDef.label}<small style="color:var(--dim)">Vacío</small></div>`;
    }
    eqList.appendChild(row);
  });

  const mvList = $("csMoveList");
  mvList.innerHTML = "";
  getAllUsableMoves().forEach(mv=>{
    const row = document.createElement("div");
    row.className = "inv-item";
    const icon = mv.type==="buff" ? "🛡️" : mv.type==="heal" ? "💚" : "⚔️";
    row.innerHTML = `<div class="ie">${icon}</div><div class="it">${mv.name}<small>${moveInfoLine(mv)} · MP ${mv.cost||0}</small></div>`;
    mvList.appendChild(row);
  });
}

let inBattleItemMode = false; // true cuando el inventario se abrió desde dentro de un combate

/** Devuelve clase CSS de rareza, etiqueta coloreada y partículas decorativas para un objeto de equipo. */
/** Ícono a mostrar para un ítem: si es una armadura, usa la ilustración real; si no, su emoji de siempre. */
function iconFor(item){
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

const INV_CATEGORIES = [
  {key:"all",       label:"Todos",         test:()=>true},
  {key:"upgrade",   label:"Mejoras",       test:it=> it.type==="stat"},
  {key:"consumable",label:"Consumibles",   test:it=> it.type==="heal"||it.type==="mana"||it.type==="pet_item"},
  {key:"equip",     label:"Equipamiento",  test:it=> it.type==="equip"},
  {key:"other",     label:"Otros",         test:it=> !["stat","heal","mana","pet_item","equip"].includes(it.type)},
];
let invActiveCategory = "all";

function renderInventoryTabs(){
  const wrap = $("invTabs");
  wrap.innerHTML = "";
  INV_CATEGORIES.forEach(cat=>{
    const btn = document.createElement("button");
    btn.className = "inv-cat-tab" + (cat.key===invActiveCategory ? " active" : "");
    btn.textContent = cat.label;
    btn.onclick = ()=>{ invActiveCategory = cat.key; renderInventoryTabs(); renderInventory(); };
    wrap.appendChild(btn);
  });
}

/** Sesión únicamente — favoritos y bloqueo son solo un marcador visual mientras el juego está
 *  abierto (no se guardan ni forman parte de los datos reales del objeto), para no tocar el
 *  modelo de datos existente. */
let invFavorites = new Set();
let invLocked = new Set();
let invSearchQuery = "";
let invSortMode = "default";
let invSelectMode = false;
let invSelectedIds = new Set();

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

function renderResourceBar(){
  const bar = $("invResourceBar");
  if(!bar) return;
  bar.innerHTML = `
    <div class="inv-res-chip" title="${(player.gold||0).toLocaleString("es")}">🪙 ${formatGold(player.gold)}</div>
    <div class="inv-res-chip">💎 ${player.crystals||0}</div>
    <div class="inv-res-chip">🪵 ${player.wood||0}</div>
    <div class="inv-res-chip">🪨 ${player.stone||0}</div>
    <div class="inv-res-chip">🔩 ${player.iron||0}</div>`;
}

function renderInventory(){
  renderResourceBar();
  const grid = $("invList");
  grid.innerHTML = "";
  const seen = new Set();
  const uniqueItems = [];
  player.inventory.forEach(it=>{
    if(seen.has(it.id)) return;
    seen.add(it.id);
    uniqueItems.push(it);
  });
  const cat = INV_CATEGORIES.find(c=>c.key===invActiveCategory) || INV_CATEGORIES[0];
  let filtered = uniqueItems.filter(cat.test);
  if(invSearchQuery.trim()){
    const q = invSearchQuery.trim().toLowerCase();
    filtered = filtered.filter(it=> it.name.toLowerCase().includes(q));
  }
  const countOf = it=> player.inventory.filter(x=>x.id===it.id).length;
  if(invSortMode==="level") filtered = filtered.slice().sort((a,b)=> (b.reqLevel||0)-(a.reqLevel||0));
  else if(invSortMode==="power") filtered = filtered.slice().sort((a,b)=> itemPowerScore(b)-itemPowerScore(a));
  else if(invSortMode==="qty") filtered = filtered.slice().sort((a,b)=> countOf(b)-countOf(a));
  else filtered = filtered.slice().sort((a,b)=> rarityRank(b)-rarityRank(a));

  $("invCount").textContent = `${uniqueItems.length}/${inventoryMaxSlots()}`;

  if(filtered.length===0){
    grid.innerHTML = `<div class="empty-note" style="grid-column:1/-1;">${uniqueItems.length===0 ? "Aún no tienes objetos. ¡Gana combates para conseguir botín!" : "No se encontró nada con esos filtros."}</div>`;
  } else {
    filtered.forEach(it=>{
    const count = countOf(it);
    const meta = equipItemMeta(it);
    const card = document.createElement("div");
    card.className = "inv-card-v2 " + meta.rc + (invSelectMode ? " selectable" : "") + (invSelectedIds.has(it.id) ? " selected" : "");
    if(meta.styleAttr) card.style.cssText += meta.styleAttr;
    const isEquippedSomewhere = it.type==="equip" && isItemCurrentlyEquipped(it);
    const statLine = primaryStatLine(it);
    card.innerHTML = `${meta.sparkles}
      ${isEquippedSomewhere ? `<div class="icv-equipped-ribbon">EQUIPADO</div>` : ""}
      ${invFavorites.has(it.id) ? `<div class="icv-fav">★</div>` : ""}
      ${invLocked.has(it.id) ? `<div class="icv-lock">🔒</div>` : ""}
      <div class="icv-icon">${iconFor(it)}</div>
      <div class="icv-name">${it.name}</div>
      ${statLine ? `<div class="icv-stat">${statLine}</div>` : ""}
      ${it.reqLevel ? `<div class="icv-lvl">Nv. requerido ${it.reqLevel}</div>` : ""}
      ${count>1 ? `<div class="icv-qty">x${count}</div>` : ""}`;
    card.onclick = ()=>{
      if(invSelectMode){
        if(invSelectedIds.has(it.id)) invSelectedIds.delete(it.id); else invSelectedIds.add(it.id);
        renderInventory();
        return;
      }
      openInventoryDetail(it, count);
    };
    grid.appendChild(card);
    });
  }

  // Tarjeta "+" para comprar el próximo espacio — siempre al final, en cualquier categoría,
  // incluso si el inventario todavía está vacío.
  if(!invSelectMode){
    const buyCard = document.createElement("div");
    const info = nextSlotPurchaseInfo();
    buyCard.className = "inv-card-v2 inv-buy-slot-card";
    buyCard.innerHTML = `<div class="icv-icon">➕</div><div class="icv-name">Espacio extra</div>
      <div class="icv-stat">${info.currency==="gold"?"🪙":"💎"} ${info.cost}</div>`;
    buyCard.onclick = ()=>{ buyNextInventorySlot(); renderInventory(); };
    grid.appendChild(buyCard);
  }
}
/** ¿Este objeto (o uno igual a él) ya está puesto en algún hueco de equipo ahora mismo? */
function isItemCurrentlyEquipped(item){
  if(item.slot === "accessory") return (player.equipment.accessory||[]).some(e=> e && e.id===item.id);
  const eq = player.equipment[item.slot];
  return !!(eq && eq.id === item.id);
}

$("invSearchInput").addEventListener("input", (e)=>{ invSearchQuery = e.target.value; renderInventory(); });
$("invSortSelect").addEventListener("change", (e)=>{ invSortMode = e.target.value; renderInventory(); });
$("btnInvSelectMode").onclick = ()=>{
  invSelectMode = !invSelectMode;
  invSelectedIds.clear();
  $("btnInvSelectMode").textContent = invSelectMode ? "✖️ Cancelar" : "☑️ Seleccionar";
  $("btnInvSellSelected").classList.toggle("hidden", !invSelectMode);
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
  $("btnInvSelectMode").textContent = "☑️ Seleccionar";
  $("btnInvSellSelected").classList.add("hidden");
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
    const row = document.createElement("div");
    row.className = "cm-item";
    row.innerHTML = `<div style="flex:1;"><span>${pet.emoji} ${petDisplayName(pet)}</span>
      <small style="display:block; color:var(--dim); font-size:10.5px;">Nv.${pet.level} · HP ${pet.hp}/${pet.maxHp}</small></div>
      <button ${pet.hp<=0?"disabled":""}>${pet.hp<=0?"Debilitada":"Invocar"}</button>`;
    row.querySelector("button").onclick = ()=>{ $("petSummonOverlay").classList.add("hidden"); summonPet(pet); };
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
  player.inventory.splice(idx,1);
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
    isTowerChallenge: opts.isTowerChallenge || null,
    eventId: opts.eventId || null,
    turn: "choice",
    playerBuffs:{atk:1, def:1, spd:1, turnsAtk:0, turnsDef:0},
    log:[]
  };
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
  if(mon.tpl === THIEF_TEMPLATE){
    $("spriteEnemy").innerHTML = `<img src="${THIEF_SPRITES.base}" class="battle-sprite-img" data-thief="1" alt="">`;
  } else if(mon.tpl.name === "Lobo Umbrío"){
    $("spriteEnemy").innerHTML = `<img src="${LOBO_UMBRIO_SPRITES.enemy}" class="battle-sprite-img" data-lobo="1" alt="">`;
  } else if(mon.tpl.name === "Demonio Menor"){
    $("spriteEnemy").innerHTML = `<img src="${DEMONIO_MENOR_SPRITES.enemy}" class="battle-sprite-img" data-demonio="1" alt="">`;
  } else if(mon.tpl.name === "Golem de Roca"){
    $("spriteEnemy").innerHTML = `<img src="${GOLEM_ROCA_SPRITES.enemy}" class="battle-sprite-img" data-golem="1" alt="">`;
  } else if(mon.tpl.name === "Dragón Menor"){
    $("spriteEnemy").innerHTML = `<img src="${DRAGON_MENOR_SPRITES.enemy}" class="battle-sprite-img" data-dragon="1" alt="">`;
  } else if(mon.tpl.name === "Dragón Ancestral"){
    $("spriteEnemy").innerHTML = `<img src="${DRAGON_ANCESTRAL_SPRITES.enemy}" class="battle-sprite-img" data-dragon-ancestral="1" alt="">`;
  } else if(mon.tpl.name === "Lobo Nocturno"){
    $("spriteEnemy").innerHTML = `<img src="${LOBO_NOCTURNO_SPRITES.enemy}" class="battle-sprite-img" data-lobo-nocturno="1" alt="">`;
  } else if(mon.tpl.name === "Lobo Sombrío"){
    $("spriteEnemy").innerHTML = `<img src="${LOBO_SOMBRIO_SPRITES.base}" class="battle-sprite-img" data-shadowwolf="1" alt="">`;
  } else if(mon.tpl.name === "Slime Salvaje"){
    $("spriteEnemy").innerHTML = `<img src="${SLIME_SALVAJE_SPRITES.base}" class="battle-sprite-img" data-slime="1" alt="">`;
  } else if(mon.tpl.name === "Espectro"){
    $("spriteEnemy").innerHTML = `<img src="${ESPECTRO_SPRITES.base}" class="battle-sprite-img" data-espectro="1" alt="">`;
  } else {
    $("spriteEnemy").innerHTML = "";
    $("spriteEnemy").textContent = mon.tpl.emoji;
  }
  updateBattleBars();
  if(mon.tpl.name === "Lobo Sombrío"){
    const line = `¡Voy a poner a prueba tu habilidad!`;
    logBattle(`🐺 ${mon.tpl.name} (Nv.${mon.level}): "${line}"`, true);
    showShadowWolfDialogue(`"${line}"`);
  } else {
    logBattle(`Un ${mon.tpl.name} salvaje aparece (Nv.${mon.level}).`, true);
  }
  renderMoveGrid();
  $("battleWrap").classList.remove("hidden");
}

function updateBattleBars(){
  $("bPHp").style.width = pct(player.hp, player.maxHp)+"%";
  $("bPMp").style.width = pct(player.mp, player.maxMp)+"%";
  if(!battleState.isPack){
    $("bEHp").style.width = pct(battleState.mon.curHp, battleState.mon.maxHp)+"%";
    const statusEl = $("bEStatus");
    if(statusEl){
      // Mientras el Lobo Sombrío está cargando su Súper ataque (todo tu turno de por medio), se
      // ve una insignia fija junto a su barra de vida — recordatorio constante, no solo el aviso
      // puntual del momento en que empezó a cargar.
      const chargingBadge = battleState.monCharging ? ` <span class="shadow-wolf-charging-badge" title="Está cargando un Súper ataque">⚡ cargando…</span>` : "";
      statusEl.innerHTML = statusBadgeHtml(battleState.mon) + chargingBadge;
    }
  }
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
      const costLabel = mv.costsAllMp ? "TODO tu maná" : `MP ${mv.cost||0}`;
      btn.innerHTML = `<div class="mname">${mv.name}${moveTargetIcon(mv)}</div><div class="mmeta">${moveInfoLine(mv)} · ${costLabel}</div>`;
      btn.onclick = ()=> battleState.isPack ? packPlayerAction(mv) : playerAction(mv);
      attachMoveTooltip(btn, mv);
      grid.appendChild(btn);
    });
  }

  const itemBtn = document.createElement("button");
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
  triggerClassAttackAnim();

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
  } else if(mv.type==="debuff"){
    if(mv.stat==="def") mon.def = +(mon.def*(1-mv.amount)).toFixed(1);
    if(mv.stat==="atk") mon.atk = +(mon.atk*(1-mv.amount)).toFixed(1);
    logBattle(`Usas ${mv.name}. ¡${mon.tpl.name} se ve más débil!`);
    animateSprite("spritePlayer","attackp");
    flashSprite("spriteEnemy","red");
  } else if(mon.tpl.evasionChance && Math.random() < mon.tpl.evasionChance){
    triggerShadowWolfPose("dodge", 800);
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
    if(mon.tpl.name === "Espectro") triggerEspectroPose("hurt", 600);
    maybeShowCrit(totalDmg, mon.maxHp);
    logBattle(`Usas ${mv.name}: ${totalDmg} de daño${hits>1?` (${hits} golpes)`:""}.`);
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
  updateBattleBars();
  refreshHud();

  setTimeout(()=>{
    if(mon.curHp<=0){ return winBattle(); }
    if(mon.tpl.fleeBelow && !battleState.monFled && (mon.curHp/mon.maxHp) <= mon.tpl.fleeBelow){
      battleState.monFled = true;
      return shadowWolfFlee(mon);
    }
    maybeDoPetTurn(enemyTurn);
  }, mv.isUltimate ? 1500 : 700);
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
  return base * (battleState.playerBuffs.atk||1) * nightBonus * shrineBonus;
}
/** ¿Tiene equipada el arma legendaria del Lobo Nocturno (cualquiera de sus versiones por clase)? */
function isEspadaLunarEquipped(){
  const w = player.equipment && player.equipment.weapon;
  return !!(w && w.lunarWeapon);
}
function effectiveDef(){ return player.def * (battleState.playerBuffs.def||1); }

function calcDamage(atk, def, power, critChance){
  let base = atk*power - def*0.4;
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
    charFill.style.width = pct(ch.beforeXp, ch.beforeXpNext)+"%";
    requestAnimationFrame(()=>{ charFill.style.width = pct(ch.afterXp, ch.afterXpNext)+"%"; });
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
    petFill.style.width = pct(pet.beforeXp, pet.beforeXpNext)+"%";
    requestAnimationFrame(()=>{ petFill.style.width = pct(pet.afterXp, pet.afterXpNext)+"%"; });
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

  const minionCount = mon.level >= player.level+4 ? 2 : 1;
  const minions = [];
  for(let i=0;i<minionCount;i++){
    const mtpl = MONSTER_TEMPLATES[Math.floor(Math.random()*MONSTER_TEMPLATES.length)];
    const lvl = Math.max(1, mon.level-2);
    const mhp = Math.round((22+lvl*13)*mtpl.hpM*0.7);
    const matk = +((6+lvl*2.8)*mtpl.atkM*0.8).toFixed(1);
    const mdef = +((4+lvl*2.1)*mtpl.defM*0.8).toFixed(1);
    const mspd = 4+Math.floor(lvl*0.6);
    minions.push({ref:null, tpl:mtpl, level:lvl, curHp:mhp, maxHp:mhp, atk:matk, def:mdef, spd:mspd, packBonus:1, slow:0, stunned:false});
  }
  const bossEntry = {ref:mon, tpl:mon.tpl, level:mon.level, curHp:mon.curHp, maxHp:mon.maxHp, atk:mon.atk, def:mon.def, spd:mon.spd,
    packBonus:3, slow: battleState.monSlow||0, stunned:false, isBoss:true};

  battleState = {
    isPack: true,
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
function triggerDodgeQTE(mon, onResolve){
  const overlay = $("dodgeQteOverlay");
  const barFill = $("dodgeQteBarFill");
  const hint = $("dodgeQteHint");
  $("dodgeQteText").textContent = `¡${mon.tpl.name} prepara un golpe fuerte!`;
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
    hint.textContent = dodged ? "💨 ¡Esquivaste!" : "💥 ¡Te golpeó!";
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
function enemyTurn(){
  const mon = battleState.mon;
  if(tickStatusEffect(mon, "spriteEnemy")){
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
  // El Lobo Nocturno a veces se cura aullando a la luna en vez de atacar — más probable mientras menos vida le queda.
  if(mon.tpl.canSelfHeal && mon.curHp < mon.maxHp){
    const missingPct = 1 - (mon.curHp/mon.maxHp);
    if(Math.random() < 0.15 + missingPct*0.35){
      const healAmount = Math.round(mon.maxHp * (0.16 + Math.random()*0.12));
      mon.curHp = Math.min(mon.maxHp, mon.curHp + healAmount);
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
    finishEnemyTurn();
  } else {
    // Golpes fuertes (power alto o enfurecido) dan chance de esquivarlos deslizando el dedo a tiempo.
    const isStrongAttack = power >= 1.25;
    if(isStrongAttack){
      triggerDodgeQTE(mon, (dodged)=>{ resolveEnemyDirectAttack(mon, power, spdMod, dodged); finishEnemyTurn(); });
    } else {
      resolveEnemyDirectAttack(mon, power, spdMod, false);
      finishEnemyTurn();
    }
  }
}

/** Aplica (o no, si esquivaste) el golpe directo del enemigo contra el jugador — toda la lógica de
 *  daño/animaciones/mensajes que antes vivía directamente dentro de enemyTurn(). */
function resolveEnemyDirectAttack(mon, power, spdMod, dodged){
  if(dodged){
    animateSprite("spriteEnemy","attacke");
    logBattle(`💨 ¡Esquivaste el golpe de ${mon.tpl.name} deslizando a tiempo!`);
    return;
  }
  let dmg = calcDamage(mon.atk*spdMod, effectiveDef(), power, 0.08);
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
  if(mon.tpl === THIEF_TEMPLATE) triggerThiefAttackPose();
  if(mon.tpl.name === "Lobo Umbrío") triggerLoboAttackPose();
  if(mon.tpl.name === "Demonio Menor") triggerDemonioAttackPose();
  if(mon.tpl.name === "Golem de Roca") triggerGolemAttackPose();
  if(mon.tpl.name === "Dragón Menor") triggerDragonAttackPose();
  if(mon.tpl.name === "Dragón Ancestral") triggerDragonAncestralAttackPose();
  if(mon.tpl.name === "Lobo Nocturno") triggerLoboNocturnoAttackPose();
  if(mon.tpl.name === "Slime Salvaje") triggerSlimeSalvajePose("attack", 700);
  if(mon.tpl.name === "Espectro") triggerEspectroPose("attack", 700);
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

/** Parpadeo rojo (daño), verde (curación) o dorado-intenso (impacto del movimiento definitivo). */
function flashSprite(id, color){
  const el = $(id);
  if(!el) return;
  el.classList.remove("flash-red","flash-green","flash-ultimate","flash-orange","flash-purple");
  void el.offsetWidth;
  const cls = color==="green" ? "flash-green" : color==="ultimate" ? "flash-ultimate"
    : color==="orange" ? "flash-orange" : color==="purple" ? "flash-purple" : "flash-red";
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
      $("resultSub").innerHTML = `+${xpGain} XP · +${goldGain} 💰${crystalsFromFirstBoss?` · 💎+${crystalsFromFirstBoss} (primer jefe del día)`:""}${lootMsg? "<br>"+lootMsg : ""}${bossItemMsg}${questItemMsg}`;
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
 *  su turno de ataque normal). */
function tickStatusEffect(target, spriteElId){
  if(!target || !target.status) return false;
  const eff = STATUS_EFFECTS[target.status.type];
  if(!eff) { target.status = null; return false; }
  const dmg = Math.max(1, Math.round(target.maxHp * eff.tickPct));
  target.curHp = Math.max(0, target.curHp - dmg);
  flashSprite(spriteElId, eff.flashColor);
  logBattle(`${eff.icon} ¡${target.tpl.name} está ${eff.label.toLowerCase()} y pierde ${dmg} HP!`);
  target.status.turnsLeft--;
  if(target.status.turnsLeft <= 0){
    logBattle(`${target.tpl.name} ya no está ${eff.label.toLowerCase()}.`);
    target.status = null;
  }
  return target.curHp <= 0;
}
/** Texto cortito para mostrar junto al nombre del enemigo mientras esté quemado/envenenado. */
function statusBadgeHtml(target){
  if(!target || !target.status) return "";
  const eff = STATUS_EFFECTS[target.status.type];
  return eff ? ` <span title="${eff.label}">${eff.icon}</span>` : "";
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
    player.coliseumStats = {bestRound:0, lastRound:0, totalRuns:0, totalWins:0, totalLosses:0, updatedAt:null};
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
        <div class="lb-name">${r.playerName} <span style="color:var(--dim); font-size:11px;">Nv.${r.playerLevel}</span></div>
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
  if(isNewRecord){ stats.bestRound = stats.lastRound; publishColiseoScore(stats.bestRound); }
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
    eventId: opts.eventId || null,
    mons: packMons.map(m=>({ ref:m, tpl:m.tpl, level:m.level, curHp:m.hp, maxHp:m.hp, atk:m.atk, def:m.def, spd:m.spd, packBonus:m.packBonus||1.5, slow:0, stunned:false })),
    selectedTarget: 0,
    playerBuffs:{atk:1, def:1, spd:1, turnsAtk:0, turnsDef:0},
    log:[]
  };
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
  // entre más enemigos, más chicos y más superpuestos (para que quepan uno "al lado" del otro,
  // como parados en fila, en vez de apilarse hacia abajo).
  const size = count<=2 ? 46 : count===3 ? 38 : count===4 ? 32 : 27;
  const overlap = count<=2 ? 0 : count===3 ? 8 : count===4 ? 16 : 22;
  battleState.mons.forEach((m, idx)=>{
    const dead = m.curHp <= 0;
    const justDied = dead && !m._deadRendered;
    const el = document.createElement("div");
    el.className = "pack-stage-mon" + (idx===battleState.selectedTarget ? " selected" : "") + (dead && !justDied ? " dead" : "");
    el.id = "packStageMon"+idx;
    if(idx>0) el.style.marginLeft = "-"+overlap+"px";
    el.style.zIndex = String(idx+1); // el de más a la derecha queda por encima, se ve mejor al superponerse
    el.innerHTML = `<div class="psm-bar"><div class="psm-fill" style="width:${pct(m.curHp,m.maxHp)}%"></div></div>
      <div class="psm-emoji" style="font-size:${size}px;">${m.tpl.emoji}</div>`;
    if(!dead) el.onclick = ()=> selectPackTarget(idx);
    wrap.appendChild(el);
    if(justDied){
      // doble rAF: deja que el navegador pinte el estado "vivo" primero, y recién luego
      // aplica "dead" para que la transición de opacidad se note (si no, se ve un salto instantáneo).
      requestAnimationFrame(()=> requestAnimationFrame(()=>{ el.classList.add("dead"); m._deadRendered = true; }));
    }
  });
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
  triggerClassAttackAnim();

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
      logBattle(`${mv.name} golpea a ${m.tpl.name}: ${dmg} de daño.${m.curHp<=0?` ¡Cae derrotado!`:""}`);
    });
    maybeShowCrit(totalAll, battleState.mons.reduce((s,m)=>s+m.maxHp,0));
    if(mv.selfDmg){ const sd=Math.round(player.maxHp*mv.selfDmg); player.hp=Math.max(1, player.hp-sd); logBattle(`El esfuerzo te cuesta ${sd} HP.`); }
  } else {
    const hits = mv.hits||1;
    let totalDmg = 0;
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
      });
    } else {
      animatePackMon(targetIdx, mv.isUltimate ? "ultimate-hit" : "hitshake");
      flashPackMon(targetIdx, mv.isUltimate ? "ultimate" : "red");
    }
    if(mv.isUltimate) animateSprite("spritePlayer","ultimate-strike");
  }
  if(mv.isUltimate) slowDrainMp("bPMp");

  setTimeout(()=>{
    const anyAlive = battleState.mons.some(m=>m.curHp>0);
    if(!anyAlive) return packWinBattle();
    maybeDoPetTurn(packEnemyTurn);
  }, mv.isUltimate ? 1500 : 700);
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
    animateSprite("spritePlayer","hitshake");
    flashSprite("spritePlayer","red");
    maybeShowCrit(dmg, player.maxHp);
    updateBattleBars(); refreshHud();
    setTimeout(attackNext, 650); // pausa entre cada atacante para que se note quién ataca
  }
  attackNext();
}

function packWinBattle(){
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

function checkProximity(){ checkAmbush(); }

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
  if(newMoves.length===0 && !ultimateEvent){
    pendingLevelUps.push({level:player.level, before, after:afterStats, newMove:null, gainedAccessorySlot});
  } else {
    // si suben varios movimientos nuevos al mismo nivel, se muestran uno por uno (no se pierden los demás)
    newMoves.forEach((nm, idx)=>{
      pendingLevelUps.push({level:player.level, before, after:afterStats, newMove:nm, gainedAccessorySlot: idx===0 ? gainedAccessorySlot : false});
    });
    if(ultimateEvent){
      pendingLevelUps.push({level:player.level, before, after:afterStats, newMove:null, ultimateEvent, gainedAccessorySlot: newMoves.length===0 ? gainedAccessorySlot : false});
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
      lat: playerLatLng.lat, lng: playerLatLng.lng, ts: Date.now()
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
    } else {
      const icon = L.divIcon({className:'', html:`<div class="op-marker" style="position:relative;">
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
      <div class="it">${n.title}<small>${n.sub}</small></div>
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
  logBattle(`¡Comienza el duelo contra ${pvp.opponent.name}! (Turno 1)`, true);
  renderPvpMoveGrid();
  $("battleWrap").classList.remove("hidden");
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
    const costLabel = mv.costsAllMp ? "TODO tu maná" : `MP ${mv.cost||0}`;
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
  // y luego, siempre, el gesto de defensa — el tiempo de ambos depende de tu VEL.
  if(mv.isUltimate || mv.interactive){
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
    const row = document.createElement("div");
    row.className = "cm-item";
    row.innerHTML = `<div style="flex:1;"><span>${pet.emoji} ${petDisplayName(pet)}</span>
      <small style="display:block; color:var(--dim); font-size:10.5px;">Nv.${pet.level} · ${pet.hp}/${pet.maxHp} HP</small></div>
      <button>Invocar</button>`;
    row.querySelector("button").onclick = ()=>{ $("petSummonOverlay").classList.add("hidden"); pvpSummonPetChoice(pet); };
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
      <div class="it">${f.name}<small>${(CLASSES[f.classKey]||{}).name||""} · Nv. ${f.level}</small></div>
      <button data-act="party" style="margin-right:4px; background:var(--gold); color:#2a1d00;">🛡️</button>
      <button data-act="chat" style="margin-right:4px;">💬</button>
      <button data-act="remove" style="background:var(--danger);">Quitar</button>`;
    row.querySelector('[data-act="party"]').onclick = ()=> sendPartyInvite(f);
    row.querySelector('[data-act="chat"]').onclick = ()=> openChat(f);
    row.querySelector('[data-act="remove"]').onclick = ()=>{
      showConfirm(`¿Quitar a ${f.name} de tu lista de amigos?`, async ()=>{
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
function escapeHtml(s){ return s.replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }

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
function closeFabMenu(){
  $("fabMenu").classList.remove("open");
  $("btnFabToggle").textContent = "☰";
  $("fabMenuBackdrop").classList.remove("show");
}
$("btnFleeCorner").onclick = ()=>{
  if(battleState && battleState.isColiseo) return coliseoSurrender();
  if(pvp) return pvpConcede();
  if(battleState.isPack) return proposeGroupFlee();
  fleeBattle();
};

$("btnFabToggle").onclick = ()=>{
  const open = $("fabMenu").classList.toggle("open");
  $("btnFabToggle").textContent = open ? "✕" : "☰";
  $("fabMenuBackdrop").classList.toggle("show", open);
};
$("fabMenuBackdrop").onclick = ()=>{
  $("fabMenu").classList.remove("open");
  $("btnFabToggle").textContent = "☰";
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
  return {
    id: tagPrefix+"_"+tpl.id, name: tpl.name, emoji: tpl.emoji, type:"equip", slot:"weapon",
    classKey: tpl.classKey, rarity: tpl.rarity, bonuses: tpl.bonuses, proc: tpl.proc||null,
    value: rarityValue, reqLevel: 1, isWeeklyOffer: !!isWeeklyOffer,
    desc: tpl.desc + (tpl.proc ? ` · ${PROC_LABELS[tpl.proc.type]} (${Math.round(tpl.proc.chance*100)}%)` : "") + " · rotativo"
  };
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
  return {
    id: "elite_weapon_"+player.classKey+"_"+tier,
    name: `${base.name} Superior${tier>0?" +"+tier:""}`,
    emoji: base.emoji, type:"equip", slot:"weapon", classKey: player.classKey, rarity:"legendary",
    isEliteWeapon:true, eliteTier: tier,
    bonuses: {atk: targetAtk, spd: Math.floor(tier/2)},
    value: goldCost,
    desc: `Encargo especial del herrero — siempre más fuerte que tu arma actual. Sube de precio y de poder cada vez que compras una.`
  };
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
};
$("btnShopModeSell").onclick = ()=>{
  shopMode = 'sell';
  $("btnShopModeSell").classList.add("active");
  $("btnShopModeBuy").classList.remove("active");
  $("shopTabs").classList.add("hidden");
  $("shopBuyList").classList.add("hidden");
  $("shopSellList").classList.remove("hidden");
};

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
          player.gold -= goldCost;
          if(matCost){
            player.wood -= matCost.wood; player.stone -= matCost.stone; player.iron -= matCost.iron;
            player.eliteWeaponsBought = (player.eliteWeaponsBought||0) + 1;
          }
          pushItemSafe({...item});
          refreshHud(); saveGame();
          toast(`Compraste ${item.emoji} ${item.name}.`);
          renderShopBuyList(); renderShopSellList();
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
        const idx = player.inventory.findIndex(x=>x.id===item.id);
        if(idx<0) return;
        player.gold += sellPrice;
        player.inventory.splice(idx,1);
        refreshHud(); saveGame();
        toast(`Vendiste ${item.emoji} ${item.name} por 💰${sellPrice}.`);
        renderShopBuyList(); renderShopSellList();
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
        player.gold -= shopPrice(item);
        pushItemSafe({...item});
        refreshHud(); saveGame();
        toast(`Compraste ${item.emoji} ${item.name}.`);
        renderShopBuyList(); renderShopSellList();
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
      const idx = player.inventory.findIndex(x=>x.id===item.id);
      if(idx<0) return;
      player.gold += sellPrice;
      player.inventory.splice(idx,1);
      refreshHud(); saveGame();
      toast(`Vendiste ${item.emoji} ${item.name} por 💰${sellPrice}.`);
      renderShopBuyList(); renderShopSellList();
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

function renderShopSellList(){
  const sellList = $("shopSellList");
  sellList.innerHTML = "";
  const sellable = player.inventory.filter(it=> it.tradeable!==false);
  if(sellable.length===0){
    sellList.innerHTML = `<div class="empty-note" style="grid-column:1 / -1;">No tienes objetos para vender.</div>`;
    return;
  }
  const seen = new Set();
  sellable.forEach((it)=>{
    if(seen.has(it.id)) return;
    seen.add(it.id);
    sellList.appendChild(buildShopCard(it, false));
  });
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
    slideNotice(`👑 ${msg.playerName} derrotó a ${msg.bossName}${msg.itemName ? ` y obtuvo ${msg.itemEmoji||""} ${msg.itemName}` : ""}!`, 4500);
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
    $("bossRecommendation").innerHTML = `🔒 <b>Ocupado</b> — ${lock.fighterName} lo está enfrentando ahora mismo. Nadie más puede retarlo hasta que termine.`;
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
  $("vagabundoCostLabel").textContent = VAGABUNDO_COST;
  $("vagabundoOverlay").classList.remove("hidden");
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

/** Lista los movimientos que alguna vez aprendiste y ya no tienes, para elegir cuál recordar. */
function openRecallMovePicker(){
  const forgotten = player.movePool.filter(m=> (player.everLearnedIds||player.learnedIds).has(m.id) && !player.moves.some(pm=>pm.id===m.id));
  if(forgotten.length===0){
    player.gold += VAGABUNDO_COST; // no había nada que recordar — se le devuelve el oro
    refreshHud(); saveGame();
    toast("No tienes ningún movimiento olvidado todavía — te devuelve el oro.", 4000);
    return;
  }
  const list = $("recallPickList");
  list.innerHTML = "";
  forgotten.forEach(mv=>{
    const row = document.createElement("div");
    row.className = "cm-item";
    row.innerHTML = `<div style="flex:1;">
        <span>${mv.name}${moveTargetIcon(mv)}</span>
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
      <span class="mp-info">${m.name}${isMe?" (tú)":""}${isLeader?" 👑":""}<br>Nv. <b>${m.level}</b></span>
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
      <div class="it">${m.name}${isMe?" (tú)":""}<small>${(CLASSES[m.classKey]||{}).name||""} · Nv. ${m.level}${isLeader?" · 👑 Líder":""}</small></div>`;
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
$("btnCloseRegions").onclick = ()=> $("regionsOverlay").classList.add("hidden");
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
  $("battleWrap").classList.add("group-mode");
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
    const costLabel = mv.costsAllMp ? "TODO tu maná" : `MP ${mv.cost||0}`;
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
        } else {
          animateAllyMini(targetId, "hitshake");
          flashAllyMini(targetId, "red");
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
          if(recId === myPlayerId) flashSprite("spritePlayer","green"); else flashAllyMini(recId, "green");
        } else if(act.mv.type !== "buff"){
          if(act.mv.isUltimate){
            if(isMe) animateSprite("spritePlayer","ultimate-strike"); else animateAllyMini(act.id, "ultimate-strike");
            animateSprite("spriteEnemy","ultimate-hit");
            flashSprite("spriteEnemy","ultimate");
          } else {
            animateSprite("spriteEnemy","hitshake");
            flashSprite("spriteEnemy","red");
          }
          maybeShowCrit(monHpBefore - mon.hp, mon.maxHp);
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
    return {healRecipientId: recipientId};
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
  if(!connected){
    setTimeout(()=> toast("ℹ️ Multijugador no disponible en este navegador (no se pudo cargar la conexión). El resto del juego funciona normal.", 5500), 4000);
    return;
  }
  publishPresence();
  setInterval(publishPresence, 15000); // reanuncia mi posición periódicamente
  setInterval(renderNearbyPlayersFromCache, 10000); // limpia jugadores inactivos aunque no lleguen mensajes nuevos
  // los cambios del Modo Constructor viajan por este mismo PubNub — recién ahora que ya está
  // conectado se pueden consultar y aplicar sobre el mapa (por eso no se hace más arriba).
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
  drawUpgradeStations();
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
  mapEdits = msg.mapEdits;
  refreshMapEditableLayers();
}

/* ---------- Init ---------- */
buildClassGrid();
initContinueScreen();

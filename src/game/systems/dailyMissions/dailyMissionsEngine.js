/* ============================================================
   MISIONES DIARIAS — motor de dominio (puro, sin DOM, sin storage)
   ------------------------------------------------------------
   Todo acá recibe datos y devuelve datos. Nada importa `player`, `localStorage`
   ni el DOM — eso vive en dailyMissionsService.js/dailyMissionsRepository.js.
   Esto es lo que se prueba con vitest sin necesitar un navegador.
   ============================================================ */
import {
  DAILY_MISSIONS_SCHEMA_VERSION, DAILY_MISSION_COUNT, DIFFICULTY_COUNTS,
  MAX_SAME_TYPE_PER_DAY, CATEGORY_TARGET_COUNTS, REWARD_RANGES, REWARD_MATERIAL_POOL,
  FINAL_REWARD, HISTORY_MAX_DAYS, MAX_PROCESSED_EVENT_IDS,
} from "../../config/dailyMissions.config.js";
import { templatesForActiveTypes, TYPE_EVENT_MAP } from "./dailyMissionTemplates.js";
import { getCurrentDateKey, getNextResetAt } from "./dailyResetClock.js";

function defaultRng(){ return Math.random(); }

function randInt(min, max, rng = defaultRng){
  return Math.round(min + rng() * (max - min));
}

function pickRandom(arr, rng = defaultRng){
  return arr[Math.floor(rng() * arr.length)];
}

/** Fisher-Yates con rng inyectable — determinista en tests si se pasa un rng fijo. */
function shuffle(arr, rng = defaultRng){
  const out = arr.slice();
  for(let i = out.length - 1; i > 0; i--){
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function interpolate(text, vars){
  return text.replace(/\{(\w+)\}/g, (_, key)=> (vars[key] != null ? vars[key] : `{${key}}`));
}

/** Escala suave por nivel para plantillas marcadas `scalable:true` — nunca reduce
 *  el objetivo por debajo del base, y se satura en +50% para no pedir objetivos
 *  imposibles a un jugador de nivel muy alto. Deliberadamente NO usa poder de
 *  equipo (pedido explícito: eso puede producir objetivos excesivos). */
function scaleTarget(baseTarget, playerLevel, scalable){
  if(!scalable) return baseTarget;
  const level = Math.max(1, playerLevel || 1);
  const factor = 1 + Math.min(0.5, Math.max(0, level - 5) * 0.02);
  return Math.max(baseTarget, Math.round(baseTarget * factor));
}

function computeReward(difficulty, rng = defaultRng){
  const range = REWARD_RANGES[difficulty];
  const reward = {
    gold: randInt(range.goldMin, range.goldMax, rng),
    experience: randInt(range.xpMin, range.xpMax, rng),
  };
  if(range.materialChance && rng() < range.materialChance){
    const pool = REWARD_MATERIAL_POOL[range.materialRarity] || [];
    if(pool.length){
      reward.materials = [{ materialId: pickRandom(pool, rng), quantity: randInt(3, 8, rng) }];
    }
  }
  return reward;
}

function computeFinalReward(rng = defaultRng){
  const pool = REWARD_MATERIAL_POOL[FINAL_REWARD.materialRarity] || [];
  const reward = {
    gold: FINAL_REWARD.gold,
    experience: FINAL_REWARD.experience,
    diamonds: FINAL_REWARD.diamonds,
  };
  if(pool.length) reward.materials = [{ materialId: pickRandom(pool, rng), quantity: randInt(5, 12, rng) }];
  return reward;
}

/** Elige `count` plantillas de `candidates` sin superar MAX_SAME_TYPE_PER_DAY
 *  por missionType, priorizando (de forma suave) las categorías que todavía
 *  no llegaron a su meta diaria. Si de verdad no alcanzan plantillas únicas
 *  (catálogo muy chico), relaja el límite de tipo repetido antes que fallar. */
function pickTemplatesForDifficulty(candidates, count, typeCounts, categoryCounts, rng){
  const pool = shuffle(candidates, rng).sort((a, b)=>{
    const aUnder = (categoryCounts[a.category]||0) < (CATEGORY_TARGET_COUNTS[a.category]||0) ? 0 : 1;
    const bUnder = (categoryCounts[b.category]||0) < (CATEGORY_TARGET_COUNTS[b.category]||0) ? 0 : 1;
    return aUnder - bUnder;
  });
  const picked = [];
  for(const tpl of pool){
    if(picked.length >= count) break;
    const usedOfType = typeCounts[tpl.type] || 0;
    if(usedOfType >= MAX_SAME_TYPE_PER_DAY) continue;
    picked.push(tpl);
    typeCounts[tpl.type] = usedOfType + 1;
    categoryCounts[tpl.category] = (categoryCounts[tpl.category]||0) + 1;
  }
  // Red de seguridad: catálogo insuficiente para respetar el límite de tipo repetido.
  if(picked.length < count){
    for(const tpl of pool){
      if(picked.length >= count) break;
      if(picked.includes(tpl)) continue;
      picked.push(tpl);
      typeCounts[tpl.type] = (typeCounts[tpl.type]||0) + 1;
      categoryCounts[tpl.category] = (categoryCounts[tpl.category]||0) + 1;
    }
  }
  return picked;
}

function instantiateMission(template, dateKey, generatedAtIso, expiresAtIso, playerLevel, rng){
  const target = scaleTarget(template.baseTarget, playerLevel, template.scalable);
  const metadata = {};
  if(template.enemyPool && template.enemyPool.length) metadata.enemyName = pickRandom(template.enemyPool, rng);
  return {
    id: `${dateKey}_${template.id}`,
    templateId: template.id,
    type: template.type,
    difficulty: template.difficulty,
    title: template.title,
    description: interpolate(template.description, { target, enemyName: metadata.enemyName }),
    icon: template.icon,
    target,
    progress: 0,
    status: "IN_PROGRESS", // v1: las 10 están disponibles desde el inicio del día (LOCKED existe para el futuro)
    reward: computeReward(template.difficulty, rng),
    metadata,
    generatedAt: generatedAtIso,
    expiresAt: expiresAtIso,
    completedAt: undefined,
    claimedAt: undefined,
    rewardedCharacterId: undefined,
  };
}

/**
 * Genera el set de 10 misiones del día. `playerContext` es opcional
 * ({level}) — sin él, todo se genera sin escalar (nivel 1).
 */
export function generateDailyMissions(dateKey, playerContext = {}, now = new Date(), rng = defaultRng){
  const active = templatesForActiveTypes();
  const byDifficulty = { EASY: [], NORMAL: [], ADVANCED: [] };
  active.forEach(t => { if(byDifficulty[t.difficulty]) byDifficulty[t.difficulty].push(t); });

  const typeCounts = {};
  const categoryCounts = {};
  const chosen = [];
  for(const difficulty of Object.keys(DIFFICULTY_COUNTS)){
    const need = DIFFICULTY_COUNTS[difficulty];
    const picked = pickTemplatesForDifficulty(byDifficulty[difficulty] || [], need, typeCounts, categoryCounts, rng);
    chosen.push(...picked);
  }

  const generatedAtIso = now.toISOString();
  const expiresAtIso = new Date(getNextResetAt(now)).toISOString();
  const missions = chosen
    .slice(0, DAILY_MISSION_COUNT)
    .map(tpl => instantiateMission(tpl, dateKey, generatedAtIso, expiresAtIso, playerContext.level, rng));

  return {
    dateKey,
    missions,
    finalReward: computeFinalReward(rng),
    finalRewardStatus: "LOCKED",
    finalRewardClaimedAt: undefined,
    generatedAt: generatedAtIso,
    expiresAt: expiresAtIso,
    version: DAILY_MISSIONS_SCHEMA_VERSION,
    processedEventIds: [],
  };
}

function rememberEventId(current, eventId){
  if(!eventId) return true; // sin eventId no se puede deduplicar — se procesa igual (mejor esfuerzo)
  if(current.processedEventIds.includes(eventId)) return false;
  current.processedEventIds.push(eventId);
  if(current.processedEventIds.length > MAX_PROCESSED_EVENT_IDS){
    current.processedEventIds.splice(0, current.processedEventIds.length - MAX_PROCESSED_EVENT_IDS);
  }
  return true;
}

/**
 * Aplica un evento de juego al estado actual (mutado in-place, mismo criterio
 * que el resto del motor del juego que muta `player` directo). `dedupeKey`
 * es opcional: cuando se pasa (ej. id de NPC, classKey de héroe), una misma
 * misión solo cuenta esa clave una vez — para objetivos de "N cosas
 * DIFERENTES" (hablar con 3 NPC distintos, jugar con 2 héroes distintos).
 *
 * @returns {{changed:boolean, completedMissions:object[]}}
 */
export function applyProgress(current, eventType, amount, { meta = {}, eventId, dedupeKey, now = new Date() } = {}){
  const isNew = rememberEventId(current, eventId);
  if(!isNew) return { changed: false, completedMissions: [] };

  let changed = false;
  const completedMissions = [];
  for(const mission of current.missions){
    if(mission.status !== "IN_PROGRESS") continue;
    if(TYPE_EVENT_MAP[mission.type] !== eventType) continue;
    if(mission.type === "DEFEAT_SPECIFIC_ENEMY_TYPE" && meta.enemyName !== mission.metadata.enemyName) continue;

    if(dedupeKey != null){
      if(!mission.metadata._seenKeys) mission.metadata._seenKeys = [];
      if(mission.metadata._seenKeys.includes(dedupeKey)) continue;
      mission.metadata._seenKeys.push(dedupeKey);
    }

    const nextProgress = Math.min(mission.target, mission.progress + amount);
    if(nextProgress === mission.progress) continue;
    mission.progress = nextProgress;
    changed = true;
    if(mission.progress >= mission.target){
      mission.status = "COMPLETED";
      mission.completedAt = now.toISOString();
      completedMissions.push(mission);
    }
  }
  return { changed, completedMissions };
}

export function claimMission(current, missionId, rewardedCharacterId, now = new Date()){
  const mission = current.missions.find(m => m.id === missionId);
  if(!mission) return { ok: false, reason: "not_found" };
  if(mission.status === "CLAIMED") return { ok: false, reason: "already_claimed" };
  if(mission.status !== "COMPLETED") return { ok: false, reason: "not_completed" };
  mission.status = "CLAIMED";
  mission.claimedAt = now.toISOString();
  mission.rewardedCharacterId = rewardedCharacterId;

  const allClaimed = current.missions.every(m => m.status === "CLAIMED");
  if(allClaimed && current.finalRewardStatus === "LOCKED"){
    current.finalRewardStatus = "AVAILABLE";
  }
  return { ok: true, reward: mission.reward, rewardedCharacterId };
}

export function claimFinalReward(current, now = new Date()){
  if(current.finalRewardStatus === "CLAIMED") return { ok: false, reason: "already_claimed" };
  if(current.finalRewardStatus !== "AVAILABLE") return { ok: false, reason: "not_available" };
  current.finalRewardStatus = "CLAIMED";
  current.finalRewardClaimedAt = now.toISOString();
  return { ok: true, reward: current.finalReward };
}

export function countClaimedMissions(current){
  return current.missions.filter(m => m.status === "CLAIMED").length;
}
export function countCompletedOrClaimedMissions(current){
  return current.missions.filter(m => m.status === "COMPLETED" || m.status === "CLAIMED").length;
}

/** Resumen de un día ya cerrado, para el historial de 7 días. */
export function buildHistoryEntry(current){
  return {
    dateKey: current.dateKey,
    completedMissions: countCompletedOrClaimedMissions(current),
    claimedMissions: countClaimedMissions(current),
    finalRewardClaimed: current.finalRewardStatus === "CLAIMED",
  };
}

export function appendHistory(history, entry){
  const next = history.filter(h => h.dateKey !== entry.dateKey);
  next.push(entry);
  next.sort((a, b)=> a.dateKey < b.dateKey ? -1 : a.dateKey > b.dateKey ? 1 : 0);
  return next.slice(-HISTORY_MAX_DAYS);
}

/** Detecta un retroceso sospechoso del reloj del dispositivo (>1 min hacia
 *  atrás respecto al último timestamp legítimo que vimos). No es a prueba de
 *  manipulación — solo evita que retroceder y volver a avanzar la fecha
 *  regenere misiones/recompensas en loop. Ver informe final para el detalle
 *  de esta limitación (solo se resuelve del todo con hora de servidor). */
export function isClockRollbackSuspicious(lastKnownTimestamp, now = new Date()){
  if(!lastKnownTimestamp) return false;
  return now.getTime() < lastKnownTimestamp - 60000;
}

/* ============================================================
   CONTRATO DEL AVENTURERO — motor de dominio (puro, sin DOM, sin storage,
   sin tocar `player`). Mismo criterio que dailyMissionsEngine.js.
   ============================================================ */
import {
  ADVENTURER_CONTRACTS_SCHEMA_VERSION, RARITY_WEIGHTS, RARITY_MIN_LEVEL, RARITY_MIN_REPUTATION,
  CONTRACT_AVAILABLE_MAX_AGE_MS, REPUTATION_RANKS, HISTORY_MAX_ENTRIES, MAX_PROCESSED_EVENT_IDS,
} from "../../config/adventurerContracts.config.js";
import { ADVENTURER_CONTRACT_TEMPLATES, OBJECTIVE_TYPE_EVENT_MAP, AUTO_COMPLETE_ON_ACCEPT_TYPES, TURN_IN_OBJECTIVE_TYPES } from "./adventurerContractTemplates.js";
import { computeExpiresAt, hasExpired } from "./contractClock.js";

function isTurnInType(type){ return TURN_IN_OBJECTIVE_TYPES.includes(type); }

/** Tag determinístico para "objetivos de enemigo marcado" (Cuervo Alfa, Demonio
 *  Marcado, etc.) — el mismo cálculo lo usa el servicio para taggear al monstruo
 *  que spawnea, así el motor puede reconocerlo al derrotarlo sin acoplarse al
 *  mapa/monstruos. */
export function contractTargetTagFor(contract, objective){
  return `${contract.id}::${objective.id}`;
}

function eligibleTemplates(context){
  return ADVENTURER_CONTRACT_TEMPLATES.filter(t=>{
    const minLevel = Math.max(RARITY_MIN_LEVEL[t.rarity]||1, (t.requirements&&t.requirements.minLevel)||1);
    const minRep = Math.max(RARITY_MIN_REPUTATION[t.rarity]||0, (t.requirements&&t.requirements.minReputation)||0);
    if((context.playerLevel||1) < minLevel) return false;
    if((context.reputation||0) < minRep) return false;
    const features = context.featuresAvailable || {};
    if(t.contractType === "TOWER_ASSAULT" && features.towers === false) return false;
    if(t.contractType === "DUNGEON_CLEAR" && features.dungeons === false) return false;
    if((t.contractType === "BLACKSMITH_ORDER") && features.blacksmith === false) return false;
    return true;
  });
}

/** Selección ponderada por rareza entre las plantillas elegibles — evita
 *  repetir una plantilla que ya salió en los últimos `recentTemplateIds` si
 *  hay alguna alternativa (si no hay, prefiere repetir antes que no ofrecer
 *  nada, ver spec: nunca dejar al jugador sin contrato disponible). */
export function pickWeightedTemplate(context, recentTemplateIds = [], rng = Math.random){
  const eligible = eligibleTemplates(context);
  if(!eligible.length) return null;
  const notRecent = eligible.filter(t=> !recentTemplateIds.includes(t.id));
  const candidates = notRecent.length ? notRecent : eligible;
  const weighted = candidates.map(t=> ({ t, w: RARITY_WEIGHTS[t.rarity] || 1 }));
  const total = weighted.reduce((s,x)=> s+x.w, 0);
  if(total <= 0) return candidates[0];
  let roll = rng() * total;
  for(const { t, w } of weighted){
    if(roll < w) return t;
    roll -= w;
  }
  return weighted[weighted.length-1].t;
}

function instantiateContract(template, now){
  const id = `contract_${now.getTime()}_${Math.random().toString(36).slice(2,8)}`;
  const objectives = template.objectives.map(o=> ({
    id: o.id, type: o.type, title: o.title, description: o.description, target: o.target,
    progress: 0, status: "LOCKED", metadata: { ...(o.metadata||{}) }, completedAt: undefined,
  }));
  return {
    id, templateId: template.id, title: template.title, subtitle: template.subtitle,
    description: template.description, contractType: template.contractType,
    rarity: template.rarity, difficulty: template.difficulty,
    clientName: template.clientName, clientPortrait: template.clientPortrait,
    turnInNpcId: template.turnIn ? template.turnIn.turnInNpcId : undefined,
    turnInLabel: template.turnIn ? template.turnIn.turnInLabel : undefined,
    objectiveMode: template.objectiveMode, objectives,
    reward: { ...template.reward },
    requirements: template.requirements ? { ...template.requirements } : undefined,
    status: "AVAILABLE",
    generatedAt: now.toISOString(),
    availableUntil: new Date(now.getTime() + CONTRACT_AVAILABLE_MAX_AGE_MS).toISOString(),
    acceptedAt: undefined, expiresAt: undefined, completedAt: undefined,
    turnedInAt: undefined, claimedAt: undefined, abandonedAt: undefined, expiredAt: undefined,
    rewardedCharacterId: undefined,
    processedEventIds: [],
    version: ADVENTURER_CONTRACTS_SCHEMA_VERSION,
  };
}

export function generateContract(context = {}, recentTemplateIds = [], now = new Date(), rng = Math.random){
  const template = pickWeightedTemplate(context, recentTemplateIds, rng);
  if(!template) return null;
  return instantiateContract(template, now);
}

function completeObjective(o, now){
  o.status = "COMPLETED";
  o.progress = o.target;
  o.completedAt = now.toISOString();
}

function activateObjective(contract, o, spawnRequests){
  o.status = "ACTIVE";
  if(o.type === "DEFEAT_SPECIFIC_ENEMY" && o.metadata && o.metadata.spawnOnActivate){
    spawnRequests.push({
      objectiveId: o.id,
      spawnKey: o.metadata.spawnOnActivate,
      targetTag: contractTargetTagFor(contract, o),
    });
  }
}

/** Avanza el desbloqueo de objetivos SEQUENTIAL (o activa todos si PARALLEL),
 *  resolviendo en cadena los que se auto-completan al aceptar (ej. "habla con
 *  X"), y decide si el contrato ya puede pasar a TURN_IN_REQUIRED/COMPLETED. */
function unlockNextIfNeeded(contract, now, spawnRequests){
  const gameplay = contract.objectives.filter(o=> !isTurnInType(o.type));
  if(contract.objectiveMode === "SEQUENTIAL"){
    for(const o of gameplay){
      if(o.status === "COMPLETED") continue;
      if(o.status === "LOCKED") activateObjective(contract, o, spawnRequests);
      if(o.status === "ACTIVE"){
        if(AUTO_COMPLETE_ON_ACCEPT_TYPES.includes(o.type) && o.progress < o.target){
          completeObjective(o, now);
          continue;
        }
        break;
      }
    }
  } else {
    gameplay.forEach(o=>{
      if(o.status === "LOCKED") activateObjective(contract, o, spawnRequests);
      if(o.status === "ACTIVE" && AUTO_COMPLETE_ON_ACCEPT_TYPES.includes(o.type) && o.progress < o.target){
        completeObjective(o, now);
      }
    });
  }
  maybeAdvanceContractStatus(contract, now);
}

function maybeAdvanceContractStatus(contract, now){
  if(contract.status !== "ACTIVE") return;
  const gameplay = contract.objectives.filter(o=> !isTurnInType(o.type));
  if(!gameplay.length || !gameplay.every(o=> o.status === "COMPLETED")) return;
  const turnInObjective = contract.objectives.find(o=> isTurnInType(o.type));
  if(turnInObjective){
    contract.status = "TURN_IN_REQUIRED";
    turnInObjective.status = "ACTIVE";
  } else {
    contract.status = "COMPLETED";
    contract.completedAt = now.toISOString();
  }
}

/** El contrato no arranca solo — el jugador tiene que tocar "Aceptar
 *  contrato". Nada de progreso anterior a esto cuenta (processedEventIds
 *  arranca vacío, los objetivos recién ahora pasan de LOCKED a ACTIVE). */
export function acceptContract(contract, now = new Date()){
  if(contract.status !== "AVAILABLE") return { ok: false, reason: "not_available" };
  contract.status = "ACTIVE";
  contract.acceptedAt = now.toISOString();
  contract.expiresAt = new Date(computeExpiresAt(now.getTime(), contract.difficulty, now)).toISOString();
  contract.processedEventIds = [];
  contract.objectives.forEach(o=>{ o.status = "LOCKED"; });
  const spawnRequests = [];
  unlockNextIfNeeded(contract, now, spawnRequests);
  return { ok: true, spawnRequests };
}

function rememberEventId(contract, eventId){
  if(!eventId) return true;
  if(contract.processedEventIds.includes(eventId)) return false;
  contract.processedEventIds.push(eventId);
  if(contract.processedEventIds.length > MAX_PROCESSED_EVENT_IDS){
    contract.processedEventIds.splice(0, contract.processedEventIds.length - MAX_PROCESSED_EVENT_IDS);
  }
  return true;
}

function objectiveMatchesEvent(contract, o, eventType, meta){
  if(OBJECTIVE_TYPE_EVENT_MAP[o.type] !== eventType) return false;
  const md = o.metadata || {};
  switch(o.type){
    case "DEFEAT_ENEMY_TYPE":
      if(md.enemyName) return meta.enemyName === md.enemyName;
      if(md.isThief) return !!meta.isThief;
      return true;
    case "DEFEAT_ELITE":
      return !!meta.isBoss;
    case "DEFEAT_SPECIFIC_ENEMY":
      return meta.contractTargetTag === contractTargetTagFor(contract, o);
    case "COLLECT_RESOURCE":
      return meta.resourceKind === md.resourceKind;
    case "COLLECT_SPECIFIC_ITEM":
      return meta.materialId === md.materialId;
    case "COMPLETE_DUNGEON_FLOOR":
      return md.isBossFloor ? !!meta.isBossFloor : !meta.isBossFloor;
    default:
      return true;
  }
}

/**
 * @returns {{changed:boolean, completedObjectives:object[], spawnRequests:object[], expired?:boolean}}
 */
export function applyProgress(contract, eventType, amount, { meta = {}, eventId, now = new Date() } = {}){
  if(!contract || contract.status !== "ACTIVE") return { changed: false, completedObjectives: [], spawnRequests: [] };
  if(hasExpired(new Date(contract.expiresAt).getTime(), now)){
    contract.status = "EXPIRED";
    contract.expiredAt = now.toISOString();
    return { changed: false, completedObjectives: [], spawnRequests: [], expired: true };
  }
  const isNew = rememberEventId(contract, eventId);
  if(!isNew) return { changed: false, completedObjectives: [], spawnRequests: [] };

  let changed = false;
  const completedObjectives = [];
  for(const o of contract.objectives){
    if(o.status !== "ACTIVE" || isTurnInType(o.type)) continue;
    if(!objectiveMatchesEvent(contract, o, eventType, meta)) continue;
    const next = Math.min(o.target, o.progress + amount);
    if(next === o.progress) continue;
    o.progress = next;
    changed = true;
    if(o.progress >= o.target){
      completeObjective(o, now);
      completedObjectives.push(o);
    }
  }
  const spawnRequests = [];
  if(changed) unlockNextIfNeeded(contract, now, spawnRequests);
  return { changed, completedObjectives, spawnRequests };
}

/** Marca el objetivo de entrega como cumplido y deja el contrato listo para
 *  reclamar — NUNCA entrega la recompensa (eso es claimReward, un paso aparte). */
export function turnIn(contract, now = new Date()){
  if(!contract || contract.status !== "TURN_IN_REQUIRED") return { ok: false, reason: "not_ready" };
  if(hasExpired(new Date(contract.expiresAt).getTime(), now)){
    contract.status = "EXPIRED"; contract.expiredAt = now.toISOString();
    return { ok: false, reason: "expired" };
  }
  const turnInObjective = contract.objectives.find(o=> isTurnInType(o.type));
  if(turnInObjective) completeObjective(turnInObjective, now);
  contract.status = "COMPLETED";
  contract.completedAt = contract.completedAt || now.toISOString();
  contract.turnedInAt = now.toISOString();
  return { ok: true };
}

export function claimReward(contract, rewardedCharacterId, now = new Date()){
  if(!contract) return { ok: false, reason: "not_found" };
  if(contract.status === "CLAIMED") return { ok: false, reason: "already_claimed" };
  if(contract.status !== "COMPLETED") return { ok: false, reason: "not_completed" };
  if(hasExpired(new Date(contract.expiresAt).getTime(), now)){
    contract.status = "EXPIRED"; contract.expiredAt = now.toISOString();
    return { ok: false, reason: "expired" };
  }
  contract.status = "CLAIMED";
  contract.claimedAt = now.toISOString();
  contract.rewardedCharacterId = rewardedCharacterId;
  return { ok: true, reward: contract.reward };
}

export function abandonContract(contract, now = new Date()){
  if(!contract || !["ACTIVE", "TURN_IN_REQUIRED"].includes(contract.status)){
    return { ok: false, reason: "not_abandonable" };
  }
  contract.status = "ABANDONED";
  contract.abandonedAt = now.toISOString();
  return { ok: true };
}

/** true si el contrato pasó a EXPIRED en esta llamada (para que el servicio
 *  sepa cuándo limpiar marcadores del mapa y avisar al jugador). */
export function checkExpiration(contract, now = new Date()){
  if(!contract || !["ACTIVE", "TURN_IN_REQUIRED"].includes(contract.status)) return false;
  if(hasExpired(new Date(contract.expiresAt).getTime(), now)){
    contract.status = "EXPIRED";
    contract.expiredAt = now.toISOString();
    return true;
  }
  return false;
}

export function computeRank(reputation){
  let best = REPUTATION_RANKS[0];
  for(const r of REPUTATION_RANKS){ if(reputation >= r.min) best = r; }
  return best;
}

export function addReputation(state, amount){
  state.reputation = Math.max(0, (state.reputation||0) + (amount||0));
  state.currentRank = computeRank(state.reputation).key;
  return state.currentRank;
}

export function buildHistoryEntry(contract){
  return {
    contractId: contract.id, templateId: contract.templateId, title: contract.title,
    rarity: contract.rarity, status: contract.status, generatedAt: contract.generatedAt,
    acceptedAt: contract.acceptedAt, completedAt: contract.completedAt, claimedAt: contract.claimedAt,
    reputationEarned: contract.status === "CLAIMED" ? contract.reward.reputation : undefined,
  };
}

export function appendHistory(history, entry){
  const next = history.filter(h=> h.contractId !== entry.contractId);
  next.push(entry);
  return next.slice(-HISTORY_MAX_ENTRIES);
}

/** Mismo criterio que dailyMissionsEngine.isClockRollbackSuspicious — no se
 *  reimporta desde ahí a propósito, para no acoplar dos sistemas
 *  independientes por una función de 2 líneas. */
export function isClockRollbackSuspicious(lastKnownTimestamp, now = new Date()){
  if(!lastKnownTimestamp) return false;
  return now.getTime() < lastKnownTimestamp - 60000;
}

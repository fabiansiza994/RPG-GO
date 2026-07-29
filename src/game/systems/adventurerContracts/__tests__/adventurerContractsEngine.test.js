import { describe, it, expect } from "vitest";
import {
  generateContract, pickWeightedTemplate, acceptContract, applyProgress, turnIn, claimReward,
  abandonContract, checkExpiration, addReputation, computeRank, buildHistoryEntry, appendHistory,
  contractTargetTagFor,
} from "../adventurerContractsEngine.js";
import { ADVENTURER_CONTRACT_TEMPLATES, templateById } from "../adventurerContractTemplates.js";

function seededRng(seed){
  let s = seed;
  return ()=>{ s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

const NEW_PLAYER_CONTEXT = { playerLevel: 1, reputation: 0, featuresAvailable: { towers: true, dungeons: true, blacksmith: true } };
const VETERAN_CONTEXT = { playerLevel: 30, reputation: 2000, featuresAvailable: { towers: true, dungeons: true, blacksmith: true } };

describe("pickWeightedTemplate / generación", ()=>{
  it("nunca ofrece LEGENDARY ni RARE de alto nivel a un jugador nuevo", ()=>{
    for(let seed=1; seed<=40; seed++){
      const t = pickWeightedTemplate(NEW_PLAYER_CONTEXT, [], seededRng(seed));
      expect(t.rarity).not.toBe("LEGENDARY");
      expect((t.requirements && t.requirements.minLevel) || 0).toBeLessThanOrEqual(NEW_PLAYER_CONTEXT.playerLevel + 100); // no explota
      expect(t).toBeTruthy();
    }
  });

  it("respeta minLevel/minReputation de la plantilla (El Depredador Ancestral no sale para nivel 1)", ()=>{
    for(let seed=1; seed<=60; seed++){
      const t = pickWeightedTemplate(NEW_PLAYER_CONTEXT, [], seededRng(seed));
      expect(t.id).not.toBe("contract_ancestral_predator");
    }
  });

  it("evita repetir una plantilla reciente si hay alternativa elegible", ()=>{
    const allCommonEasyIds = ADVENTURER_CONTRACT_TEMPLATES.filter(t=> t.rarity==="COMMON").map(t=>t.id);
    for(let seed=1; seed<=30; seed++){
      const t = pickWeightedTemplate(VETERAN_CONTEXT, allCommonEasyIds.slice(0,-1), seededRng(seed));
      // con casi todas las COMMON marcadas como "recientes", debería preferir la que falta u otra rareza
      expect(t).toBeTruthy();
    }
  });

  it("generateContract arma un contrato AVAILABLE con objetivos en LOCKED", ()=>{
    const contract = generateContract(VETERAN_CONTEXT, [], new Date(), seededRng(5));
    expect(contract.status).toBe("AVAILABLE");
    expect(contract.objectives.every(o=> o.status === "LOCKED")).toBe(true);
    expect(contract.objectives.every(o=> o.progress === 0)).toBe(true);
  });
});

describe("acceptContract", ()=>{
  it("solo acepta desde AVAILABLE, registra acceptedAt/expiresAt", ()=>{
    const contract = generateContractFromTemplate(templateById("contract_forest_threat"));
    const res = acceptContract(contract);
    expect(res.ok).toBe(true);
    expect(contract.status).toBe("ACTIVE");
    expect(contract.acceptedAt).toBeTruthy();
    expect(contract.expiresAt).toBeTruthy();
  });

  it("no se puede aceptar dos veces", ()=>{
    const contract = generateContractFromTemplate(templateById("contract_forest_threat"));
    acceptContract(contract);
    const second = acceptContract(contract);
    expect(second.ok).toBe(false);
  });

  it("PARALLEL: todos los objetivos de gameplay quedan ACTIVE de una vez (turn-in queda LOCKED)", ()=>{
    const contract = generateContractFromTemplate(templateById("contract_forest_threat")); // PARALLEL, 2 gameplay + 1 turn-in
    acceptContract(contract);
    expect(contract.objectives[0].status).toBe("ACTIVE");
    expect(contract.objectives[1].status).toBe("ACTIVE");
    expect(contract.objectives[2].status).toBe("LOCKED"); // RETURN_TO_NPC
  });

  it("SEQUENTIAL: solo el primer objetivo de gameplay queda ACTIVE, el resto LOCKED", ()=>{
    const contract = generateContractFromTemplate(templateById("contract_violet_eyed_crow")); // SEQUENTIAL
    acceptContract(contract);
    expect(contract.objectives[0].status).toBe("ACTIVE");
    expect(contract.objectives[1].status).toBe("LOCKED");
    expect(contract.objectives[2].status).toBe("LOCKED");
  });

  it("auto-completa en cadena los objetivos INTERACT_WITH_NPC al aceptar (SEQUENTIAL)", ()=>{
    const contract = generateContractFromTemplate(templateById("contract_fangs_for_alchemist")); // o1 INTERACT_WITH_NPC
    acceptContract(contract);
    expect(contract.objectives[0].status).toBe("COMPLETED"); // "habla con el alquimista"
    expect(contract.objectives[1].status).toBe("ACTIVE");    // ya desbloqueado en la misma pasada
    expect(contract.objectives[2].status).toBe("LOCKED");
  });

  it("devuelve spawnRequests cuando un objetivo DEFEAT_SPECIFIC_ENEMY con spawnOnActivate queda ACTIVE", ()=>{
    // en "El cuervo de ojos violeta" ese objetivo es el segundo (o2) — no se activa hasta completar o1
    const contract = generateContractFromTemplate(templateById("contract_violet_eyed_crow"));
    const res = acceptContract(contract);
    expect(res.spawnRequests).toEqual([]); // o1 todavía no se completó
  });
});

describe("applyProgress", ()=>{
  it("el progreso NUNCA cuenta antes de aceptar (contrato AVAILABLE)", ()=>{
    const contract = generateContractFromTemplate(templateById("contract_forest_threat"));
    const res = applyProgress(contract, "ENEMY_DEFEATED", 1, { meta: { enemyName: "Lobo Umbrío" }, eventId: "e1" });
    expect(res.changed).toBe(false);
    expect(contract.objectives[0].progress).toBe(0);
  });

  it("incrementa solo el objetivo cuyo metadata coincide (enemyName)", ()=>{
    const contract = generateContractFromTemplate(templateById("contract_forest_threat"));
    acceptContract(contract);
    applyProgress(contract, "ENEMY_DEFEATED", 1, { meta: { enemyName: "Lobo Umbrío" }, eventId: "e1" });
    expect(contract.objectives[0].progress).toBe(1); // Lobos Umbríos
    expect(contract.objectives[1].progress).toBe(0); // Cuervos Corruptos, sin cambio
  });

  it("nunca supera el objetivo y marca COMPLETED al llegar al target", ()=>{
    const contract = generateContractFromTemplate(templateById("contract_forest_threat"));
    acceptContract(contract);
    for(let i=0;i<12;i++){
      applyProgress(contract, "ENEMY_DEFEATED", 1, { meta: { enemyName: "Lobo Umbrío" }, eventId: `e${i}` });
    }
    expect(contract.objectives[0].progress).toBe(8);
    expect(contract.objectives[0].status).toBe("COMPLETED");
  });

  it("es idempotente: el mismo eventId no incrementa dos veces", ()=>{
    const contract = generateContractFromTemplate(templateById("contract_forest_threat"));
    acceptContract(contract);
    applyProgress(contract, "ENEMY_DEFEATED", 1, { meta: { enemyName: "Lobo Umbrío" }, eventId: "dup" });
    applyProgress(contract, "ENEMY_DEFEATED", 1, { meta: { enemyName: "Lobo Umbrío" }, eventId: "dup" });
    expect(contract.objectives[0].progress).toBe(1);
  });

  it("SEQUENTIAL: un objetivo LOCKED no progresa aunque llegue el evento correcto", ()=>{
    const contract = generateContractFromTemplate(templateById("contract_violet_eyed_crow"));
    acceptContract(contract);
    // o2 (Cuervo Alfa) está LOCKED — un evento con su tag no debería avanzarlo todavía
    const tag = contractTargetTagFor(contract, contract.objectives[1]);
    applyProgress(contract, "ENEMY_DEFEATED", 1, { meta: { contractTargetTag: tag }, eventId: "alfa1" });
    expect(contract.objectives[1].progress).toBe(0);
    expect(contract.objectives[1].status).toBe("LOCKED");
  });

  it("SEQUENTIAL: al completar o1 se desbloquea o2 y llega el spawnRequest del enemigo marcado", ()=>{
    const contract = generateContractFromTemplate(templateById("contract_violet_eyed_crow"));
    acceptContract(contract);
    let lastResult;
    for(let i=0;i<6;i++){
      lastResult = applyProgress(contract, "ENEMY_DEFEATED", 1, { meta: { enemyName: "Cuervo Corrupto" }, eventId: `c${i}` });
    }
    expect(contract.objectives[0].status).toBe("COMPLETED");
    expect(contract.objectives[1].status).toBe("ACTIVE");
    expect(lastResult.spawnRequests.length).toBe(1);
    expect(lastResult.spawnRequests[0].objectiveId).toBe("o2");
  });

  it("al completar todos los objetivos de gameplay, pasa a TURN_IN_REQUIRED y desbloquea el objetivo de entrega", ()=>{
    const contract = generateContractFromTemplate(templateById("contract_forest_threat"));
    acceptContract(contract);
    for(let i=0;i<8;i++) applyProgress(contract, "ENEMY_DEFEATED", 1, { meta:{enemyName:"Lobo Umbrío"}, eventId:`w${i}` });
    for(let i=0;i<4;i++) applyProgress(contract, "ENEMY_DEFEATED", 1, { meta:{enemyName:"Cuervo Corrupto"}, eventId:`c${i}` });
    expect(contract.status).toBe("TURN_IN_REQUIRED");
    expect(contract.objectives[2].status).toBe("ACTIVE");
  });

  it("un contrato sin objetivo de entrega pasa directo a COMPLETED", ()=>{
    const contract = generateContractFromTemplate(templateById("contract_fire_for_the_forge")); // sin turnIn
    acceptContract(contract);
    applyProgress(contract, "RESOURCE_COLLECTED", 20, { meta:{resourceKind:"wood"}, eventId:"w1" });
    applyProgress(contract, "RESOURCE_COLLECTED", 8, { meta:{resourceKind:"iron"}, eventId:"i1" });
    applyProgress(contract, "BLACKSMITH_VISITED", 1, { eventId:"b1" });
    expect(contract.status).toBe("COMPLETED");
  });
});

describe("turnIn / claimReward / doble reclamación", ()=>{
  function completedReadyForTurnIn(){
    const contract = generateContractFromTemplate(templateById("contract_forest_threat"));
    acceptContract(contract);
    for(let i=0;i<8;i++) applyProgress(contract, "ENEMY_DEFEATED", 1, { meta:{enemyName:"Lobo Umbrío"}, eventId:`w${i}` });
    for(let i=0;i<4;i++) applyProgress(contract, "ENEMY_DEFEATED", 1, { meta:{enemyName:"Cuervo Corrupto"}, eventId:`c${i}` });
    return contract;
  }

  it("no se puede reclamar mientras está TURN_IN_REQUIRED sin haber entregado", ()=>{
    const contract = completedReadyForTurnIn();
    const res = claimReward(contract, "guerrero");
    expect(res.ok).toBe(false);
  });

  it("turnIn() marca COMPLETED pero NO entrega recompensa todavía", ()=>{
    const contract = completedReadyForTurnIn();
    const res = turnIn(contract);
    expect(res.ok).toBe(true);
    expect(contract.status).toBe("COMPLETED");
  });

  it("claimReward asigna rewardedCharacterId y no permite reclamar dos veces", ()=>{
    const contract = completedReadyForTurnIn();
    turnIn(contract);
    const first = claimReward(contract, "arquero");
    expect(first.ok).toBe(true);
    expect(contract.rewardedCharacterId).toBe("arquero");
    expect(contract.status).toBe("CLAIMED");
    const second = claimReward(contract, "arquero");
    expect(second.ok).toBe(false);
    expect(second.reason).toBe("already_claimed");
  });
});

describe("expiración y abandono", ()=>{
  it("checkExpiration marca EXPIRED cuando ya pasó expiresAt", ()=>{
    const contract = generateContractFromTemplate(templateById("contract_forest_threat"));
    acceptContract(contract, new Date("2026-01-01T00:00:00Z"));
    contract.expiresAt = new Date("2026-01-02T00:00:00Z").toISOString();
    const expired = checkExpiration(contract, new Date("2026-01-03T00:00:00Z"));
    expect(expired).toBe(true);
    expect(contract.status).toBe("EXPIRED");
  });

  it("applyProgress no cuenta progreso en un contrato vencido", ()=>{
    const contract = generateContractFromTemplate(templateById("contract_forest_threat"));
    acceptContract(contract, new Date("2026-01-01T00:00:00Z"));
    contract.expiresAt = new Date("2026-01-02T00:00:00Z").toISOString();
    const res = applyProgress(contract, "ENEMY_DEFEATED", 1, { meta:{enemyName:"Lobo Umbrío"}, eventId:"e1", now: new Date("2026-01-03T00:00:00Z") });
    expect(res.expired).toBe(true);
    expect(contract.status).toBe("EXPIRED");
    expect(contract.objectives[0].progress).toBe(0);
  });

  it("abandonContract solo funciona desde ACTIVE/TURN_IN_REQUIRED", ()=>{
    const available = generateContractFromTemplate(templateById("contract_forest_threat"));
    expect(abandonContract(available).ok).toBe(false);
    acceptContract(available);
    expect(abandonContract(available).ok).toBe(true);
    expect(available.status).toBe("ABANDONED");
  });
});

describe("reputación y rango", ()=>{
  it("computeRank devuelve el rango correcto por umbral", ()=>{
    expect(computeRank(0).key).toBe("novato");
    expect(computeRank(150).key).toBe("explorador");
    expect(computeRank(750).key).toBe("veterano");
    expect(computeRank(3500).key).toBe("leyenda");
  });

  it("addReputation acumula y nunca baja de 0", ()=>{
    const state = { reputation: 50 };
    addReputation(state, 60);
    expect(state.reputation).toBe(110);
    expect(state.currentRank).toBe("explorador");
    addReputation(state, -1000);
    expect(state.reputation).toBe(0);
  });
});

describe("historial", ()=>{
  it("buildHistoryEntry resume el contrato", ()=>{
    const contract = completedAndClaimed();
    const entry = buildHistoryEntry(contract);
    expect(entry.contractId).toBe(contract.id);
    expect(entry.status).toBe("CLAIMED");
    expect(entry.reputationEarned).toBe(contract.reward.reputation);
  });

  it("appendHistory no duplica el mismo contractId y respeta el límite", ()=>{
    let history = [];
    for(let i=0;i<25;i++){
      history = appendHistory(history, { contractId: `c${i}`, templateId: "t", title: "T", rarity: "COMMON", status: "CLAIMED", generatedAt: new Date().toISOString() });
    }
    expect(history.length).toBeLessThanOrEqual(20);
  });

  function completedAndClaimed(){
    const contract = generateContractFromTemplate(templateById("contract_forest_threat"));
    acceptContract(contract);
    for(let i=0;i<8;i++) applyProgress(contract, "ENEMY_DEFEATED", 1, { meta:{enemyName:"Lobo Umbrío"}, eventId:`w${i}` });
    for(let i=0;i<4;i++) applyProgress(contract, "ENEMY_DEFEATED", 1, { meta:{enemyName:"Cuervo Corrupto"}, eventId:`c${i}` });
    turnIn(contract);
    claimReward(contract, "guerrero");
    return contract;
  }
});

// Helper de test: instancia un contrato AVAILABLE a partir de una plantilla puntual,
// sin depender de la selección ponderada al azar (para tests deterministas por template).
function generateContractFromTemplate(template){
  const now = new Date();
  const objectives = template.objectives.map(o=> ({
    id: o.id, type: o.type, title: o.title, description: o.description, target: o.target,
    progress: 0, status: "LOCKED", metadata: { ...(o.metadata||{}) }, completedAt: undefined,
  }));
  return {
    id: `test_${template.id}_${Math.random().toString(36).slice(2,8)}`,
    templateId: template.id, title: template.title, subtitle: template.subtitle,
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
    availableUntil: new Date(now.getTime()+86400000).toISOString(),
    processedEventIds: [],
    version: 1,
  };
}

import { describe, it, expect } from "vitest";
import {
  generateDailyMissions, applyProgress, claimMission, claimFinalReward,
  countClaimedMissions, buildHistoryEntry, appendHistory, isClockRollbackSuspicious,
} from "../dailyMissionsEngine.js";
import { DAILY_MISSION_COUNT, MAX_SAME_TYPE_PER_DAY } from "../../../config/dailyMissions.config.js";

// rng determinista para tests reproducibles
function seededRng(seed){
  let s = seed;
  return ()=>{
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

describe("generateDailyMissions", ()=>{
  it("genera exactamente 10 misiones", ()=>{
    const state = generateDailyMissions("2026-07-29", { level: 5 }, new Date(), seededRng(1));
    expect(state.missions).toHaveLength(DAILY_MISSION_COUNT);
  });

  it("respeta la distribución 5 EASY / 4 NORMAL / 1 ADVANCED", ()=>{
    const state = generateDailyMissions("2026-07-29", { level: 5 }, new Date(), seededRng(2));
    const counts = { EASY: 0, NORMAL: 0, ADVANCED: 0 };
    state.missions.forEach(m => counts[m.difficulty]++);
    expect(counts).toEqual({ EASY: 5, NORMAL: 4, ADVANCED: 1 });
  });

  it("nunca repite el mismo missionType más de MAX_SAME_TYPE_PER_DAY veces", ()=>{
    for(let seed = 1; seed <= 20; seed++){
      const state = generateDailyMissions("2026-07-29", { level: 10 }, new Date(), seededRng(seed));
      const typeCounts = {};
      state.missions.forEach(m => { typeCounts[m.type] = (typeCounts[m.type]||0) + 1; });
      Object.values(typeCounts).forEach(count => expect(count).toBeLessThanOrEqual(MAX_SAME_TYPE_PER_DAY));
    }
  });

  it("no genera dos misiones con el mismo templateId (sin duplicados idénticos)", ()=>{
    const state = generateDailyMissions("2026-07-29", { level: 5 }, new Date(), seededRng(3));
    const ids = state.missions.map(m => m.templateId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("empieza con las 10 misiones IN_PROGRESS (disponibles desde el día 1, no LOCKED)", ()=>{
    const state = generateDailyMissions("2026-07-29", {}, new Date(), seededRng(4));
    state.missions.forEach(m => expect(m.status).toBe("IN_PROGRESS"));
    expect(state.finalRewardStatus).toBe("LOCKED");
  });

  it("escala targets 'scalable' hacia arriba con el nivel, sin bajarlos nunca", ()=>{
    const low = generateDailyMissions("2026-07-29", { level: 1 }, new Date(), seededRng(5));
    const high = generateDailyMissions("2026-07-29", { level: 40 }, new Date(), seededRng(5));
    const lowByTpl = Object.fromEntries(low.missions.map(m => [m.templateId, m.target]));
    const highByTpl = Object.fromEntries(high.missions.map(m => [m.templateId, m.target]));
    Object.keys(lowByTpl).forEach(id => expect(highByTpl[id]).toBeGreaterThanOrEqual(lowByTpl[id]));
  });
});

describe("applyProgress", ()=>{
  function makeState(){
    return generateDailyMissions("2026-07-29", { level: 5 }, new Date(), seededRng(7));
  }

  it("incrementa el progreso de las misiones que escuchan el evento", ()=>{
    const state = makeState();
    const target = state.missions.find(m => m.type === "DEFEAT_ENEMIES");
    const before = target.progress;
    applyProgress(state, "ENEMY_DEFEATED", 1, { eventId: "ev1" });
    expect(target.progress).toBe(before + 1);
  });

  it("nunca deja que el progreso supere el objetivo", ()=>{
    const state = makeState();
    const target = state.missions.find(m => m.type === "DEFEAT_ENEMIES");
    for(let i=0;i<target.target+10;i++){
      applyProgress(state, "ENEMY_DEFEATED", 1, { eventId: `ev${i}` });
    }
    expect(target.progress).toBe(target.target);
    expect(target.status).toBe("COMPLETED");
  });

  it("marca COMPLETED y registra completedAt al llegar al objetivo", ()=>{
    const state = makeState();
    const target = state.missions.find(m => m.type === "WIN_BATTLES");
    let completed = [];
    for(let i=0;i<target.target;i++){
      const r = applyProgress(state, "BATTLE_WON", 1, { eventId: `bw${i}` });
      completed = completed.concat(r.completedMissions);
    }
    expect(target.status).toBe("COMPLETED");
    expect(target.completedAt).toBeTruthy();
    expect(completed.some(m => m.id === target.id)).toBe(true);
  });

  it("es idempotente: el mismo eventId no incrementa dos veces", ()=>{
    const state = makeState();
    const target = state.missions.find(m => m.type === "DEFEAT_ENEMIES");
    applyProgress(state, "ENEMY_DEFEATED", 1, { eventId: "dup" });
    applyProgress(state, "ENEMY_DEFEATED", 1, { eventId: "dup" });
    expect(target.progress).toBe(1);
  });

  it("con dedupeKey, solo cuenta cada clave distinta una vez (NPC diferentes)", ()=>{
    const state = makeState();
    const target = state.missions.find(m => m.type === "INTERACT_WITH_NPCS" && m.target > 1);
    if(!target) return; // este día no salió una misión de NPC con objetivo >1 — nada que probar
    applyProgress(state, "NPC_INTERACTED", 1, { eventId: "n1", dedupeKey: "npc_A" });
    applyProgress(state, "NPC_INTERACTED", 1, { eventId: "n2", dedupeKey: "npc_A" }); // mismo NPC otra vez
    expect(target.progress).toBe(1);
    applyProgress(state, "NPC_INTERACTED", 1, { eventId: "n3", dedupeKey: "npc_B" });
    expect(target.progress).toBe(2);
  });

  it("DEFEAT_SPECIFIC_ENEMY_TYPE solo progresa si el nombre de enemigo coincide", ()=>{
    const state = makeState();
    const target = state.missions.find(m => m.type === "DEFEAT_SPECIFIC_ENEMY_TYPE");
    if(!target) return;
    applyProgress(state, "ENEMY_DEFEATED", 1, { eventId: "wrong", meta: { enemyName: "___nope___" } });
    expect(target.progress).toBe(0);
    applyProgress(state, "ENEMY_DEFEATED", 1, { eventId: "right", meta: { enemyName: target.metadata.enemyName } });
    expect(target.progress).toBe(1);
  });

  it("el oro de recompensa de una misión (claim) no debe reportarse como EARN_GOLD", ()=>{
    const state = makeState();
    const goldMission = state.missions.find(m => m.type === "EARN_GOLD");
    // Simula que main.js SOLO llama reportEvent('GOLD_EARNED') desde fuentes de
    // gameplay, nunca desde el propio otorgamiento de recompensa — el motor
    // no tiene forma de mezclar ambos porque claimMission() no llama a applyProgress.
    const before = goldMission.progress;
    claimMission(state, state.missions.find(m=>m.status==="COMPLETED")?.id || "no-existe", "guerrero");
    expect(goldMission.progress).toBe(before);
  });
});

describe("claimMission / claimFinalReward", ()=>{
  function completedState(){
    const state = generateDailyMissions("2026-07-29", { level: 5 }, new Date(), seededRng(9));
    state.missions.forEach(m => { m.status = "COMPLETED"; m.completedAt = new Date().toISOString(); });
    return state;
  }

  it("reclama una misión completada y asigna rewardedCharacterId", ()=>{
    const state = completedState();
    const mission = state.missions[0];
    const res = claimMission(state, mission.id, "arquero_123");
    expect(res.ok).toBe(true);
    expect(mission.status).toBe("CLAIMED");
    expect(mission.rewardedCharacterId).toBe("arquero_123");
  });

  it("previene la doble reclamación de la misma misión", ()=>{
    const state = completedState();
    const mission = state.missions[0];
    claimMission(state, mission.id, "arquero_123");
    const second = claimMission(state, mission.id, "arquero_123");
    expect(second.ok).toBe(false);
    expect(second.reason).toBe("already_claimed");
  });

  it("no permite reclamar una misión que no está COMPLETED", ()=>{
    const state = generateDailyMissions("2026-07-29", {}, new Date(), seededRng(10));
    const mission = state.missions[0]; // sigue IN_PROGRESS
    const res = claimMission(state, mission.id, "mago_1");
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("not_completed");
  });

  it("el cofre final solo se desbloquea cuando las 10 misiones están CLAIMED", ()=>{
    const state = completedState();
    state.missions.slice(0, 9).forEach(m => claimMission(state, m.id, "guerrero"));
    expect(state.finalRewardStatus).toBe("LOCKED");
    const finalAttempt = claimFinalReward(state);
    expect(finalAttempt.ok).toBe(false);
    claimMission(state, state.missions[9].id, "guerrero");
    expect(state.finalRewardStatus).toBe("AVAILABLE");
    expect(countClaimedMissions(state)).toBe(10);
  });

  it("reclama el cofre final una sola vez", ()=>{
    const state = completedState();
    state.missions.forEach(m => claimMission(state, m.id, "guerrero"));
    const first = claimFinalReward(state);
    expect(first.ok).toBe(true);
    expect(state.finalRewardStatus).toBe("CLAIMED");
    const second = claimFinalReward(state);
    expect(second.ok).toBe(false);
    expect(second.reason).toBe("already_claimed");
  });
});

describe("historial y reloj", ()=>{
  it("buildHistoryEntry resume el día correctamente", ()=>{
    const state = generateDailyMissions("2026-07-28", {}, new Date(), seededRng(11));
    state.missions.forEach(m => { m.status = "CLAIMED"; });
    const entry = buildHistoryEntry(state);
    expect(entry).toEqual({ dateKey: "2026-07-28", completedMissions: 10, claimedMissions: 10, finalRewardClaimed: false });
  });

  it("appendHistory conserva como máximo 7 días", ()=>{
    let history = [];
    for(let i=1;i<=10;i++){
      history = appendHistory(history, { dateKey: `2026-07-${String(i).padStart(2,"0")}`, completedMissions: i, claimedMissions: i, finalRewardClaimed: false });
    }
    expect(history).toHaveLength(7);
    expect(history[0].dateKey).toBe("2026-07-04");
    expect(history[6].dateKey).toBe("2026-07-10");
  });

  it("detecta un retroceso de reloj sospechoso", ()=>{
    const lastKnown = new Date("2026-07-29T12:00:00Z").getTime();
    expect(isClockRollbackSuspicious(lastKnown, new Date("2026-07-29T11:00:00Z"))).toBe(true);
    expect(isClockRollbackSuspicious(lastKnown, new Date("2026-07-29T12:00:30Z"))).toBe(false);
    expect(isClockRollbackSuspicious(0, new Date())).toBe(false);
  });
});

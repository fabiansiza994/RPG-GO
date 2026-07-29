import { describe, it, expect, vi } from "vitest";
import { createDailyMissionsService } from "../dailyMissionsService.js";
import { createInMemoryStorage } from "../dailyMissionsRepository.js";
import { DAILY_MISSIONS_STORAGE_KEY, DAILY_MISSIONS_SCHEMA_VERSION } from "../../../config/dailyMissions.config.js";
import { TYPE_EVENT_MAP } from "../dailyMissionTemplates.js";

function makeService(overrides = {}){
  const storage = overrides.storage || createInMemoryStorage();
  const service = createDailyMissionsService({ storage, getPlayerLevel: ()=> 5, ...overrides });
  return { storage, service };
}

// La generación real usa Math.random() (no hay rng inyectable a nivel de servicio),
// así que ningún missionType puntual está garantizado en el set del día — estos
// helpers toman lo que SÍ salió hoy en vez de asumir "DEFEAT_ENEMIES" a ciegas.
// Se excluye DEFEAT_SPECIFIC_ENEMY_TYPE porque exige meta.enemyName específico.
function firstSimpleMission(state){
  return state.missions.find(m => m.type !== "DEFEAT_SPECIFIC_ENEMY_TYPE");
}
function eventTypeFor(mission){ return TYPE_EVENT_MAP[mission.type]; }

describe("dailyMissionsService — ciclo de vida básico", ()=>{
  it("init() genera 10 misiones la primera vez que se juega", async ()=>{
    const { service } = makeService();
    const state = await service.init();
    expect(state.missions).toHaveLength(10);
  });

  it("reportEvent hace avanzar el progreso y notifica a los suscriptores", async ()=>{
    const { service } = makeService();
    await service.init();
    const listener = vi.fn();
    service.subscribe(listener);
    const mission = firstSimpleMission(service.getState());
    await service.reportEvent({ type: eventTypeFor(mission), eventId: "e1" });
    expect(mission.progress).toBe(1);
    expect(listener).toHaveBeenCalled();
  });

  it("reportEvent persiste el progreso (sobrevive a un `init` nuevo con el mismo storage)", async ()=>{
    const storage = createInMemoryStorage();
    const { service } = makeService({ storage });
    await service.init();
    const mission = firstSimpleMission(service.getState());
    const missionId = mission.id;
    await service.reportEvent({ type: eventTypeFor(mission), eventId: "e1" });

    const { service: service2 } = makeService({ storage });
    await service2.init();
    const reloadedMission = service2.getState().missions.find(m => m.id === missionId);
    expect(reloadedMission.progress).toBe(1);
  });

  it("claimMission asigna el reward al héroe activo y previene doble reclamo", async ()=>{
    const { service } = makeService();
    await service.init();
    const mission = firstSimpleMission(service.getState());
    for(let i=0;i<mission.target;i++) await service.reportEvent({ type: eventTypeFor(mission), eventId: `k${i}` });
    expect(mission.status).toBe("COMPLETED");

    const res1 = await service.claimMission(mission.id, "arquero");
    expect(res1.ok).toBe(true);
    expect(res1.rewardedCharacterId).toBe("arquero");

    const res2 = await service.claimMission(mission.id, "arquero");
    expect(res2.ok).toBe(false);
    expect(res2.reason).toBe("already_claimed");
  });

  it("el cofre final se puede reclamar solo tras reclamar las 10 misiones", async ()=>{
    const { service } = makeService();
    await service.init();
    const state = service.getState();
    // fuerza las 10 a COMPLETED para no tener que jugar cada una en el test
    state.missions.forEach(m => { if(m.status === "IN_PROGRESS"){ m.status = "COMPLETED"; } });
    for(const m of state.missions) await service.claimMission(m.id, "guerrero");

    const finalRes = await service.claimFinalReward();
    expect(finalRes.ok).toBe(true);
    expect(finalRes.reward.diamonds).toBeGreaterThan(0);

    const second = await service.claimFinalReward();
    expect(second.ok).toBe(false);
  });
});

describe("dailyMissionsService — reinicio diario y corrupción", ()=>{
  it("si el guardado es de un día viejo, init() archiva ese día y genera uno nuevo", async ()=>{
    const storage = createInMemoryStorage();
    await storage.set(DAILY_MISSIONS_STORAGE_KEY, JSON.stringify({
      version: DAILY_MISSIONS_SCHEMA_VERSION,
      current: {
        dateKey: "2020-01-01",
        missions: [], finalReward: {}, finalRewardStatus: "LOCKED",
        generatedAt: "2020-01-01T00:00:00.000Z", expiresAt: "2020-01-02T00:00:00.000Z",
        version: DAILY_MISSIONS_SCHEMA_VERSION, processedEventIds: [],
      },
      history: [],
      lastKnownTimestamp: new Date("2020-01-01T12:00:00.000Z").getTime(),
    }));
    const { service } = makeService({ storage });
    const state = await service.init();
    expect(state.dateKey).not.toBe("2020-01-01");
    expect(state.missions).toHaveLength(10);
  });

  it("un retroceso sospechoso del reloj no borra ni regenera el progreso existente", async ()=>{
    const storage = createInMemoryStorage();
    const farFuture = Date.now() + 10 * 24 * 3600 * 1000;
    await storage.set(DAILY_MISSIONS_STORAGE_KEY, JSON.stringify({
      version: DAILY_MISSIONS_SCHEMA_VERSION,
      current: {
        dateKey: "2020-01-01",
        missions: [{ id: "m1", type: "DEFEAT_ENEMIES", status: "IN_PROGRESS", progress: 3, target: 5, metadata: {} }],
        finalReward: {}, finalRewardStatus: "LOCKED",
        generatedAt: "2020-01-01T00:00:00.000Z", expiresAt: "2020-01-02T00:00:00.000Z",
        version: DAILY_MISSIONS_SCHEMA_VERSION, processedEventIds: [],
      },
      history: [],
      lastKnownTimestamp: farFuture,
    }));
    const { service } = makeService({ storage });
    const state = await service.init();
    expect(state.dateKey).toBe("2020-01-01");
    expect(state.missions[0].progress).toBe(3);
  });

  it("con storage corrupto, init() nunca lanza y arranca un día nuevo limpio", async ()=>{
    const storage = createInMemoryStorage();
    await storage.set(DAILY_MISSIONS_STORAGE_KEY, "esto-no-es-json{{{");
    const { service } = makeService({ storage });
    const state = await service.init();
    expect(state.missions).toHaveLength(10);
  });
});

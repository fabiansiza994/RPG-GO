import { describe, it, expect } from "vitest";
import { createDailyMissionsRepository, createInMemoryStorage } from "../dailyMissionsRepository.js";
import { DAILY_MISSIONS_STORAGE_KEY } from "../../../config/dailyMissions.config.js";

describe("dailyMissionsRepository", ()=>{
  it("devuelve un root vacío la primera vez (sin nada guardado)", async ()=>{
    const repo = createDailyMissionsRepository(createInMemoryStorage());
    const root = await repo.load();
    expect(root.current).toBeNull();
    expect(root.history).toEqual([]);
  });

  it("guarda y vuelve a leer el mismo estado", async ()=>{
    const storage = createInMemoryStorage();
    const repo = createDailyMissionsRepository(storage);
    const root = await repo.load();
    root.current = { missions: [], processedEventIds: [], dateKey: "2026-07-29" };
    root.history = [{ dateKey: "2026-07-28", completedMissions: 3, claimedMissions: 3, finalRewardClaimed: false }];
    await repo.save(root);
    const reloaded = await repo.load();
    expect(reloaded.current.dateKey).toBe("2026-07-29");
    expect(reloaded.history).toHaveLength(1);
  });

  it("se recupera sin romper nada si el JSON guardado está corrupto", async ()=>{
    const storage = createInMemoryStorage();
    await storage.set(DAILY_MISSIONS_STORAGE_KEY, "{ esto no es json válido ]]]");
    const repo = createDailyMissionsRepository(storage);
    const root = await repo.load();
    expect(root.current).toBeNull();
    expect(root.history).toEqual([]);
  });

  it("se recupera si el esquema guardado no tiene la forma esperada (versión vieja/corrupta)", async ()=>{
    const storage = createInMemoryStorage();
    await storage.set(DAILY_MISSIONS_STORAGE_KEY, JSON.stringify({ algoRaro: true }));
    const repo = createDailyMissionsRepository(storage);
    const root = await repo.load();
    expect(root.current).toBeNull();
  });
});

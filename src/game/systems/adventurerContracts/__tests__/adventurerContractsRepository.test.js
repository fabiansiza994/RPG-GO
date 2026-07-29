import { describe, it, expect } from "vitest";
import { createAdventurerContractsRepository, createInMemoryStorage } from "../adventurerContractsRepository.js";
import { ADVENTURER_CONTRACTS_STORAGE_KEY, ADVENTURER_CONTRACTS_SCHEMA_VERSION } from "../../../config/adventurerContracts.config.js";

describe("adventurerContractsRepository", ()=>{
  it("devuelve un root vacío (reputación 0) la primera vez", async ()=>{
    const repo = createAdventurerContractsRepository(createInMemoryStorage());
    const root = await repo.load();
    expect(root.reputation).toBe(0);
    expect(root.currentContract).toBeNull();
  });

  it("guarda y vuelve a leer el mismo estado", async ()=>{
    const storage = createInMemoryStorage();
    const repo = createAdventurerContractsRepository(storage);
    const root = await repo.load();
    root.reputation = 250;
    root.currentContract = { id: "c1", status: "ACTIVE", objectives: [] };
    await repo.save(root);
    const reloaded = await repo.load();
    expect(reloaded.reputation).toBe(250);
    expect(reloaded.currentContract.id).toBe("c1");
  });

  it("si el contrato guardado está corrupto, se invalida SOLO el contrato — la reputación se conserva", async ()=>{
    const storage = createInMemoryStorage();
    await storage.set(ADVENTURER_CONTRACTS_STORAGE_KEY, JSON.stringify({
      version: ADVENTURER_CONTRACTS_SCHEMA_VERSION,
      reputation: 480, currentRank: "cazador", history: [], recentTemplateIds: [],
      currentContract: { estoNoTieneForma: true },
      lastGeneratedAt: 0, lastKnownTimestamp: Date.now(),
    }));
    const repo = createAdventurerContractsRepository(storage);
    const root = await repo.load();
    expect(root.reputation).toBe(480);
    expect(root.currentContract).toBeNull();
  });

  it("con JSON corrupto de raíz, arranca de cero sin lanzar", async ()=>{
    const storage = createInMemoryStorage();
    await storage.set(ADVENTURER_CONTRACTS_STORAGE_KEY, "{{{no-json");
    const repo = createAdventurerContractsRepository(storage);
    const root = await repo.load();
    expect(root.reputation).toBe(0);
  });
});

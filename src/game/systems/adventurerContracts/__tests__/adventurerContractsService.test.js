import { describe, it, expect } from "vitest";
import { createAdventurerContractsService } from "../adventurerContractsService.js";
import { createInMemoryStorage } from "../adventurerContractsRepository.js";
import { ADVENTURER_CONTRACTS_STORAGE_KEY, ADVENTURER_CONTRACTS_SCHEMA_VERSION } from "../../../config/adventurerContracts.config.js";

function makeService(overrides = {}){
  const storage = overrides.storage || createInMemoryStorage();
  const service = createAdventurerContractsService({ storage, getPlayerLevel: ()=> 30, ...overrides });
  return { storage, service };
}

function seedRoot(storage, patch){
  return storage.set(ADVENTURER_CONTRACTS_STORAGE_KEY, JSON.stringify({
    version: ADVENTURER_CONTRACTS_SCHEMA_VERSION,
    reputation: 0, currentRank: "novato", currentContract: null,
    lastGeneratedAt: 0, lastKnownTimestamp: Date.now(), history: [], recentTemplateIds: [],
    ...patch,
  }));
}

describe("adventurerContractsService — ciclo de vida básico", ()=>{
  it("init() genera un contrato AVAILABLE la primera vez que se juega", async ()=>{
    const { service } = makeService();
    const state = await service.init();
    expect(state.currentContract).toBeTruthy();
    expect(state.currentContract.status).toBe("AVAILABLE");
  });

  it("acceptContract lo pasa a ACTIVE y no se puede aceptar de nuevo", async ()=>{
    const { service } = makeService();
    await service.init();
    const res1 = await service.acceptContract();
    expect(res1.ok).toBe(true);
    expect(service.getState().currentContract.status).toBe("ACTIVE");
    const res2 = await service.acceptContract();
    expect(res2.ok).toBe(false);
  });

  it("reportEvent solo progresa objetivos DESPUÉS de aceptar, y persiste", async ()=>{
    const storage = createInMemoryStorage();
    const { ADVENTURER_CONTRACT_TEMPLATES } = await import("../adventurerContractTemplates.js");
    const template = ADVENTURER_CONTRACT_TEMPLATES.find(t=> t.id === "contract_forest_threat");
    const now = new Date();
    const objectives = template.objectives.map(o=> ({ ...o, progress:0, status:"LOCKED", metadata:{...(o.metadata||{})} }));
    await seedRoot(storage, {
      lastGeneratedAt: Date.now(),
      currentContract: {
        id: "seeded_pre_accept", templateId: template.id, title: template.title, description: template.description,
        contractType: template.contractType, rarity: template.rarity, difficulty: template.difficulty,
        clientName: template.clientName, clientPortrait: template.clientPortrait,
        turnInNpcId: template.turnIn.turnInNpcId, turnInLabel: template.turnIn.turnInLabel,
        objectiveMode: template.objectiveMode, objectives, reward: { ...template.reward },
        status: "AVAILABLE", generatedAt: now.toISOString(), availableUntil: new Date(now.getTime()+86400000).toISOString(),
        processedEventIds: [], version: ADVENTURER_CONTRACTS_SCHEMA_VERSION,
      },
    });
    const { service } = makeService({ storage });
    await service.init();

    // antes de aceptar, un evento no debe progresar nada
    await service.reportEvent({ type: "ENEMY_DEFEATED", payload: { enemyName: "Lobo Umbrío" }, eventId: "pre1" });
    expect(service.getState().currentContract.objectives[0].progress).toBe(0);

    await service.acceptContract();
    await service.reportEvent({ type: "ENEMY_DEFEATED", payload: { enemyName: "Lobo Umbrío" }, eventId: "post1" });
    expect(service.getState().currentContract.objectives[0].progress).toBe(1);
  });

  it("abandonContract limpia el slot (currentContract vuelve a null hasta el próximo ciclo)", async ()=>{
    const { service } = makeService();
    await service.init();
    await service.acceptContract();
    const res = await service.abandonContract();
    expect(res.ok).toBe(true);
    expect(service.getState().currentContract).toBeNull();
  });
});

describe("adventurerContractsService — cadencia de generación (24h)", ()=>{
  it("no genera un contrato nuevo si el intervalo de 24h todavía no pasó", async ()=>{
    const storage = createInMemoryStorage();
    await seedRoot(storage, { lastGeneratedAt: Date.now() - 3600000 }); // hace 1h
    const { service } = makeService({ storage });
    const state = await service.init();
    expect(state.currentContract).toBeNull();
  });

  it("genera un contrato nuevo una vez pasadas las 24h", async ()=>{
    const storage = createInMemoryStorage();
    await seedRoot(storage, { lastGeneratedAt: Date.now() - 25*3600000 });
    const { service } = makeService({ storage });
    const state = await service.init();
    expect(state.currentContract).toBeTruthy();
  });
});

describe("adventurerContractsService — expiración, entrega y reputación", ()=>{
  it("un contrato vencido pasa a EXPIRED y libera el slot, notificando", async ()=>{
    const storage = createInMemoryStorage();
    const { service } = makeService({ storage });
    await service.init();
    await service.acceptContract();
    // fuerza el vencimiento manipulando expiresAt directamente en el estado en memoria
    service.getState().currentContract.expiresAt = new Date(Date.now() - 1000).toISOString();
    // dispara la revisión de expiración vía una acción pública cualquiera
    await service.reportEvent({ type: "ENEMY_DEFEATED", payload: {}, eventId: "post-expire" });
    expect(service.getState().currentContract).toBeNull();
  });

  it("turnInContract requiere TURN_IN_REQUIRED y claimReward asigna rewardedCharacterId + reputación", async ()=>{
    const storage = createInMemoryStorage();
    // Sembramos directo un contrato ACTIVE de la plantilla conocida para no depender del azar de generación.
    const { ADVENTURER_CONTRACT_TEMPLATES } = await import("../adventurerContractTemplates.js");
    const template = ADVENTURER_CONTRACT_TEMPLATES.find(t=> t.id === "contract_forest_threat");
    const now = new Date();
    const objectives = template.objectives.map(o=> ({ ...o, progress:0, status:"LOCKED", metadata:{...(o.metadata||{})} }));
    const contract = {
      id: "seeded1", templateId: template.id, title: template.title, description: template.description,
      contractType: template.contractType, rarity: template.rarity, difficulty: template.difficulty,
      clientName: template.clientName, clientPortrait: template.clientPortrait,
      turnInNpcId: template.turnIn.turnInNpcId, turnInLabel: template.turnIn.turnInLabel,
      objectiveMode: template.objectiveMode, objectives, reward: { ...template.reward },
      status: "ACTIVE", generatedAt: now.toISOString(), availableUntil: now.toISOString(),
      acceptedAt: now.toISOString(), expiresAt: new Date(now.getTime()+86400000).toISOString(),
      processedEventIds: [], version: ADVENTURER_CONTRACTS_SCHEMA_VERSION,
    };
    objectives[0].status = "ACTIVE"; objectives[1].status = "ACTIVE"; objectives[2].status = "LOCKED";
    await seedRoot(storage, { currentContract: contract, lastGeneratedAt: Date.now() });

    const { service } = makeService({ storage });
    await service.init();
    for(let i=0;i<8;i++) await service.reportEvent({ type: "ENEMY_DEFEATED", payload: { enemyName: "Lobo Umbrío" }, eventId: `w${i}` });
    for(let i=0;i<4;i++) await service.reportEvent({ type: "ENEMY_DEFEATED", payload: { enemyName: "Cuervo Corrupto" }, eventId: `c${i}` });
    expect(service.getState().currentContract.status).toBe("TURN_IN_REQUIRED");

    const turnInRes = await service.turnInContract();
    expect(turnInRes.ok).toBe(true);
    expect(service.getState().currentContract.status).toBe("COMPLETED");

    const claimRes = await service.claimReward("guerrero_1");
    expect(claimRes.ok).toBe(true);
    expect(claimRes.reward.reputation).toBeGreaterThan(0);
    expect(service.getState().reputation).toBe(claimRes.reward.reputation);
    expect(service.getState().currentContract).toBeNull(); // se archivó tras reclamar
  });
});

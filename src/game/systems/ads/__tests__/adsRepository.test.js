import { describe, it, expect } from "vitest";
import { createAdsRepository, createInMemoryStorage } from "../adsRepository.js";
import { ADS_STORAGE_KEY, ADS_SCHEMA_VERSION } from "../../../config/ads.config.js";

describe("adsRepository", ()=>{
  it("devuelve un root vacío la primera vez", async ()=>{
    const repo = createAdsRepository(createInMemoryStorage());
    const root = await repo.load();
    expect(root.frequency.dailyTotal).toBe(0);
    expect(root.transactions.history).toEqual([]);
  });

  it("guarda y vuelve a leer el mismo estado", async ()=>{
    const storage = createInMemoryStorage();
    const repo = createAdsRepository(storage);
    const root = await repo.load();
    root.frequency.dailyTotal = 3;
    await repo.save(root);
    const reloaded = await repo.load();
    expect(reloaded.frequency.dailyTotal).toBe(3);
  });

  it("se recupera sin romper nada si el JSON guardado está corrupto", async ()=>{
    const storage = createInMemoryStorage();
    await storage.set(ADS_STORAGE_KEY, "{{{no-json");
    const repo = createAdsRepository(storage);
    const root = await repo.load();
    expect(root.frequency.dailyTotal).toBe(0);
  });

  it("se recupera si el esquema guardado no tiene la forma esperada", async ()=>{
    const storage = createInMemoryStorage();
    await storage.set(ADS_STORAGE_KEY, JSON.stringify({ version: ADS_SCHEMA_VERSION, algoRaro: true }));
    const repo = createAdsRepository(storage);
    const root = await repo.load();
    expect(root.transactions.history).toEqual([]);
  });
});

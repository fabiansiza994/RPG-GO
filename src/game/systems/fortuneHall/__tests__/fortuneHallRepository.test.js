import { describe, it, expect } from "vitest";
import { createFortuneHallRepository, createInMemoryStorage } from "../fortuneHallRepository.js";
import { MINIGAME_DEFS } from "../fortuneMinigames.js";
import { FORTUNE_HALL_STORAGE_KEY } from "../../../config/fortuneHall.config.js";

describe("FortuneHallRepository", ()=>{
  it("devuelve un root fresco seedeado desde MINIGAME_DEFS cuando no hay nada guardado", async ()=>{
    const repo = createFortuneHallRepository(createInMemoryStorage());
    const root = await repo.load();
    expect(root.lastResetDateKey).toBeNull();
    MINIGAME_DEFS.forEach(def => {
      expect(root.games[def.id]).toEqual({ freeUsed: false, premiumUsed: false });
    });
  });

  it("guarda y vuelve a cargar el mismo estado (round-trip)", async ()=>{
    const storage = createInMemoryStorage();
    const repo = createFortuneHallRepository(storage);
    const root = await repo.load();
    root.lastResetDateKey = "2026-07-31";
    root.games.chest.freeUsed = true;
    await repo.save(root);

    const repo2 = createFortuneHallRepository(storage);
    const reloaded = await repo2.load();
    expect(reloaded.lastResetDateKey).toBe("2026-07-31");
    expect(reloaded.games.chest.freeUsed).toBe(true);
    expect(reloaded.games.cards.freeUsed).toBe(false);
  });

  it("descarta y regenera si el JSON guardado está corrupto", async ()=>{
    const storage = createInMemoryStorage();
    await storage.set(FORTUNE_HALL_STORAGE_KEY, "{not valid json", false);
    let discardReason = null;
    const repo = createFortuneHallRepository(storage, { onDiscarded: (r)=> discardReason = r });
    const root = await repo.load();
    expect(discardReason).toBe("invalid_json");
    expect(root.games.chest).toEqual({ freeUsed: false, premiumUsed: false });
  });

  it("descarta y regenera si el esquema guardado no coincide con la versión actual", async ()=>{
    const storage = createInMemoryStorage();
    await storage.set(FORTUNE_HALL_STORAGE_KEY, JSON.stringify({ version: 999, games: {} }), false);
    let discardReason = null;
    const repo = createFortuneHallRepository(storage, { onDiscarded: (r)=> discardReason = r });
    const root = await repo.load();
    expect(discardReason).toBe("invalid_schema");
    expect(root.games.cards).toEqual({ freeUsed: false, premiumUsed: false });
  });

  it("completa minijuegos faltantes con estado fresco en vez de descartar todo el progreso", async ()=>{
    const storage = createInMemoryStorage();
    await storage.set(FORTUNE_HALL_STORAGE_KEY, JSON.stringify({
      version: 1, lastResetDateKey: "2026-07-31",
      games: { chest: { freeUsed: true, premiumUsed: false } }, // falta "cards"
    }), false);
    const repo = createFortuneHallRepository(storage);
    const root = await repo.load();
    expect(root.games.chest.freeUsed).toBe(true); // progreso existente preservado
    expect(root.games.cards).toEqual({ freeUsed: false, premiumUsed: false }); // faltante, sembrado
  });
});

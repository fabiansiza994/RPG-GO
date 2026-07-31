import { describe, it, expect } from "vitest";
import { createFortuneHallService } from "../fortuneHallService.js";
import { createInMemoryStorage } from "../fortuneHallRepository.js";

// `unlimitedAttempts:false` fija el comportamiento REAL de límite diario
// para estos tests, sin importar el valor actual de DEV_UNLIMITED_ATTEMPTS
// en fortuneHall.config.js (ese flag es solo para pruebas manuales del
// jugador — ver comentario ahí). Mismo criterio que inyectar `storage`/`rng`.
function makeService(overrides = {}){
  return createFortuneHallService({ storage: createInMemoryStorage(), unlimitedAttempts: false, ...overrides });
}

describe("FortuneHallService", ()=>{
  it("empieza con ambos minijuegos en FREE_AVAILABLE", async ()=>{
    const service = makeService();
    await service.init();
    expect(service.getGameStatus("chest")).toBe("FREE_AVAILABLE");
    expect(service.getGameStatus("cards")).toBe("FREE_AVAILABLE");
  });

  it("free -> second-chance -> locked, y los dos minijuegos son independientes", async ()=>{
    const service = makeService();
    await service.init();

    const freeChest = await service.consumeFreeAttempt("chest");
    expect(freeChest.ok).toBe(true);
    expect(service.getGameStatus("chest")).toBe("SECOND_CHANCE_AVAILABLE");
    expect(service.getGameStatus("cards")).toBe("FREE_AVAILABLE"); // cards intacto

    // no se puede volver a consumir el gratuito
    const freeAgain = await service.consumeFreeAttempt("chest");
    expect(freeAgain.ok).toBe(false);

    // no se puede usar el premium antes del gratuito, en el otro juego
    const premiumTooSoon = await service.consumePremiumAttempt("cards");
    expect(premiumTooSoon.ok).toBe(false);

    const premiumChest = await service.consumePremiumAttempt("chest");
    expect(premiumChest.ok).toBe(true);
    expect(service.getGameStatus("chest")).toBe("LOCKED");

    const premiumAgain = await service.consumePremiumAttempt("chest");
    expect(premiumAgain.ok).toBe(false);

    // cards nunca se tocó
    expect(service.getGameStatus("cards")).toBe("FREE_AVAILABLE");
  });

  it("persiste entre instancias (misma storage)", async ()=>{
    const storage = createInMemoryStorage();
    const service1 = makeService({ storage });
    await service1.init();
    await service1.consumeFreeAttempt("cards");

    const service2 = makeService({ storage });
    await service2.init();
    expect(service2.getGameStatus("cards")).toBe("SECOND_CHANCE_AVAILABLE");
  });

  it("un día nuevo reinicia ambos minijuegos independientemente de su estado previo", async ()=>{
    const storage = createInMemoryStorage();
    const service1 = makeService({ storage });
    await service1.init();
    await service1.consumeFreeAttempt("chest");
    await service1.consumePremiumAttempt("chest");
    await service1.consumeFreeAttempt("cards");
    expect(service1.getGameStatus("chest")).toBe("LOCKED");
    expect(service1.getGameStatus("cards")).toBe("SECOND_CHANCE_AVAILABLE");

    // Simula que guardó ayer: mueve lastResetDateKey hacia atrás directo en storage.
    const raw = await storage.get("rpgGo.fortuneHall.v1", false);
    const root = JSON.parse(raw.value);
    root.lastResetDateKey = "2000-01-01";
    await storage.set("rpgGo.fortuneHall.v1", JSON.stringify(root), false);

    const service2 = makeService({ storage });
    await service2.init();
    expect(service2.getGameStatus("chest")).toBe("FREE_AVAILABLE");
    expect(service2.getGameStatus("cards")).toBe("FREE_AVAILABLE");
  });

  it("notifica a los subscriptores cuando cambia el estado", async ()=>{
    const service = makeService();
    await service.init();
    let notified = 0;
    const unsubscribe = service.subscribe(()=> notified++);
    await service.consumeFreeAttempt("chest");
    expect(notified).toBe(1);
    unsubscribe();
    await service.consumeFreeAttempt("cards");
    expect(notified).toBe(1); // ya no escucha
  });

  it("con DEV_UNLIMITED_ATTEMPTS activo, el ciclo real (gratis -> segunda oportunidad) sigue pasando, pero nunca queda LOCKED al final", async ()=>{
    const storage = createInMemoryStorage();
    const service = createFortuneHallService({ storage, unlimitedAttempts: true });
    await service.init();

    // El intento gratis SÍ se marca de verdad — así el jugador ve la oferta
    // real de "¿otra oportunidad?" (anuncio/diamantes) para poder probarla.
    await service.consumeFreeAttempt("chest");
    expect(service.getGameStatus("chest")).toBe("SECOND_CHANCE_AVAILABLE");

    // Al completar el premium (anuncio/diamantes), en vez de LOCKED vuelve a
    // quedar fresco al toque, para poder repetir el ciclo completo sin
    // esperar al reinicio diario.
    await service.consumePremiumAttempt("chest");
    expect(service.getGameStatus("chest")).toBe("FREE_AVAILABLE");

    const raw = await storage.get("rpgGo.fortuneHall.v1", false);
    const root = JSON.parse(raw.value);
    expect(root.games.chest).toEqual({ freeUsed: false, premiumUsed: false });

    // Y se puede repetir el ciclo entero de nuevo.
    await service.consumeFreeAttempt("chest");
    expect(service.getGameStatus("chest")).toBe("SECOND_CHANCE_AVAILABLE");
  });
});

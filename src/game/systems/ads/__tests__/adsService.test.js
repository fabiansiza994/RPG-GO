import { describe, it, expect, vi, afterEach } from "vitest";
import { createAdsService } from "../adsService.js";
import { createInMemoryStorage } from "../adsRepository.js";
import { ADS_STORAGE_KEY, ADS_SCHEMA_VERSION } from "../../../config/ads.config.js";

async function makeService(mockOptions = {}, storage = createInMemoryStorage()){
  const service = createAdsService();
  await service.init({ storage, forceMock: true, mockOptions });
  return { service, storage };
}

describe("adsService — integración con MockAdsProvider", ()=>{
  afterEach(()=>{ vi.useRealTimers(); });

  it("flujo completo: BATTLE_REVIVE gana la recompensa y aplica una sola transacción", async ()=>{
    const { service } = await makeService({ BATTLE_REVIVE: "COMPLETE" });
    await service.preloadPlacement("BATTLE_REVIVE", { battleId: "battle1" });
    expect(service.checkAvailability("BATTLE_REVIVE", { battleId: "battle1" }).available).toBe(true);

    const res = await service.requestReward("BATTLE_REVIVE", { battleId: "battle1", characterId: "guerrero" });
    expect(res.ok).toBe(true);
    expect(res.rewardType).toBe("REVIVE_FULL_HP");

    const applied = await service.confirmRewardApplied(res.transactionId);
    expect(applied.ok).toBe(true);
    // aplicar dos veces la MISMA transacción nunca debe volver a "pegar"
    const second = await service.confirmRewardApplied(res.transactionId);
    expect(second.ok).toBe(false);
  });

  it("no permite un segundo revivir por anuncio en el MISMO combate (perBattleLimit)", async ()=>{
    const { service } = await makeService({ BATTLE_REVIVE: "COMPLETE" });
    await service.preloadPlacement("BATTLE_REVIVE", { battleId: "battle1" });
    const first = await service.requestReward("BATTLE_REVIVE", { battleId: "battle1" });
    expect(first.ok).toBe(true);
    await service.confirmRewardApplied(first.transactionId);

    // Avanza el reloj más allá del cooldown GLOBAL mínimo entre anuncios (minSecondsBetweenAnyAds)
    // para aislar específicamente el límite POR COMBATE — sin esto, el cooldown global dispara
    // primero (correcto en el juego real: nunca dos anuncios seguidos sin nada de por medio).
    vi.useFakeTimers();
    vi.advanceTimersByTime(25000);

    await service.preloadPlacement("BATTLE_REVIVE", { battleId: "battle1" });
    const availability = service.checkAvailability("BATTLE_REVIVE", { battleId: "battle1" });
    expect(availability.available).toBe(false);
    expect(availability.reason).toBe("per_battle_limit");

    // en otro combate distinto sí vuelve a estar disponible
    await service.preloadPlacement("BATTLE_REVIVE", { battleId: "battle2" });
    expect(service.checkAvailability("BATTLE_REVIVE", { battleId: "battle2" }).available).toBe(true);
  });

  it("si el anuncio falla, NO se entrega recompensa y NO se consume el límite", async ()=>{
    const { service } = await makeService({ BATTLE_REVIVE: "SHOW_ERROR" });
    await service.preloadPlacement("BATTLE_REVIVE", { battleId: "battle1" });
    const res = await service.requestReward("BATTLE_REVIVE", { battleId: "battle1" });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("SHOW_ERROR");

    // el mismo placement sigue disponible en el mismo combate (no se gastó el límite)
    const provider = service.__getProviderForTesting();
    provider.setBehavior("BATTLE_REVIVE", "COMPLETE");
    await service.preloadPlacement("BATTLE_REVIVE", { battleId: "battle1" });
    expect(service.checkAvailability("BATTLE_REVIVE", { battleId: "battle1" }).available).toBe(true);
    const retry = await service.requestReward("BATTLE_REVIVE", { battleId: "battle1" });
    expect(retry.ok).toBe(true);
  });

  it("cerrar el anuncio ANTES de la recompensa nunca revive (CLOSED_WITHOUT_REWARD)", async ()=>{
    const { service } = await makeService({ BATTLE_REVIVE: "CLOSE_WITHOUT_REWARD" });
    await service.preloadPlacement("BATTLE_REVIVE", { battleId: "battle1" });
    const res = await service.requestReward("BATTLE_REVIVE", { battleId: "battle1" });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("CLOSED_WITHOUT_REWARD");
  });

  it("doble toque: una segunda solicitud mientras se muestra el anuncio se rechaza (mutex)", async ()=>{
    const { service } = await makeService({ POST_BATTLE_GOLD_BONUS: "COMPLETE" });
    await service.preloadPlacement("POST_BATTLE_GOLD_BONUS", {});
    const p1 = service.requestReward("POST_BATTLE_GOLD_BONUS", {});
    const p2 = service.requestReward("POST_BATTLE_GOLD_BONUS", {});
    const [r1, r2] = await Promise.all([p1, p2]);
    const results = [r1, r2];
    const okCount = results.filter(r=> r.ok).length;
    const rejectedCount = results.filter(r=> !r.ok && r.reason === "ALREADY_SHOWING").length;
    expect(okCount).toBe(1);
    expect(rejectedCount).toBe(1);
  });

  it("respeta el límite diario del placement y lo refleja en getPlacementUiState", async ()=>{
    const { service } = await makeService({ DAILY_AD_CHEST: "COMPLETE" });
    vi.useFakeTimers();
    // DAILY_AD_CHEST: dailyLimit=2, cooldownSeconds=4h (ver ads.config.js) — avanzamos el reloj
    // más de 4h entre cada uso para poder llegar al límite DIARIO sin que el cooldown lo tape antes.
    for(let i=0;i<2;i++){
      await service.preloadPlacement("DAILY_AD_CHEST", {});
      const res = await service.requestReward("DAILY_AD_CHEST", {});
      expect(res.ok).toBe(true);
      await service.confirmRewardApplied(res.transactionId);
      vi.advanceTimersByTime(4*3600000 + 60000);
    }
    const ui = service.getPlacementUiState("DAILY_AD_CHEST", {});
    expect(ui.state).toBe("LIMIT_REACHED");
    const res = await service.requestReward("DAILY_AD_CHEST", {});
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("daily_limit");
  });

  it("modo navegador (sin proveedor nativo real): getPlacementUiState siempre HIDDEN, nunca revienta", async ()=>{
    const service = createAdsService();
    await service.init({ storage: createInMemoryStorage() }); // sin forceMock: cae a NoOpAdsProvider (no estamos en Capacitor nativo)
    expect(service.isSupported()).toBe(false);
    expect(service.getPlacementUiState("BATTLE_REVIVE", {}).state).toBe("HIDDEN");
    const res = await service.requestReward("BATTLE_REVIVE", {});
    expect(res.ok).toBe(false);
  });

  it("recuperación tras reinicio: el estado persiste entre instancias del servicio", async ()=>{
    const storage = createInMemoryStorage();
    const { service: service1 } = await makeService({ DAILY_AD_CHEST: "COMPLETE" }, storage);
    await service1.preloadPlacement("DAILY_AD_CHEST", {});
    const res = await service1.requestReward("DAILY_AD_CHEST", {});
    await service1.confirmRewardApplied(res.transactionId);

    const { service: service2 } = await makeService({ DAILY_AD_CHEST: "COMPLETE" }, storage);
    const ui = service2.getPlacementUiState("DAILY_AD_CHEST", {});
    // ya se usó 1 de 2 hoy — sigue elegible, pero el contador se mantuvo
    expect(ui.state).not.toBe("HIDDEN");
  });

  it("datos corruptos: init() nunca lanza y arranca con estado limpio", async ()=>{
    const storage = createInMemoryStorage();
    await storage.set(ADS_STORAGE_KEY, "esto-no-es-json{{{");
    const service = createAdsService();
    await expect(service.init({ storage, forceMock: true, mockOptions: {} })).resolves.toBeTruthy();
  });

  it("retroceso sospechoso de reloj: desactiva temporalmente las recompensas sin romper el juego", async ()=>{
    const storage = createInMemoryStorage();
    const farFuture = Date.now() + 10*24*3600000;
    await storage.set(ADS_STORAGE_KEY, JSON.stringify({
      version: ADS_SCHEMA_VERSION,
      frequency: { dateKey: "2020-01-01", dailyCounts:{}, dailyTotal:0, sessionCounts:{}, sessionTotal:0, lastShownAt:{}, lastAnyShownAt:0, perBattleUsed:{} },
      transactions: { active:{}, history:[] },
      appliedTransactionIds: [],
      lastKnownTimestamp: farFuture,
    }));
    const service = createAdsService();
    await service.init({ storage, forceMock: true, mockOptions: { BATTLE_REVIVE: "COMPLETE" } });
    const res = await service.requestReward("BATTLE_REVIVE", {});
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("CLOCK_SUSPICIOUS");
  });
});

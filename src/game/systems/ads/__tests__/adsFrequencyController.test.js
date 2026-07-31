import { describe, it, expect } from "vitest";
import { freshFrequencyState, checkEligibility, recordUsage, forgetBattle } from "../adsFrequencyController.js";

const PLACEMENT_CFG = Object.freeze({
  enabled: true, dailyLimit: 2, sessionLimit: 5, cooldownSeconds: 60, perBattleLimit: 1,
});
const GLOBAL_LIMITS = Object.freeze({ globalDailyLimit: 8, globalSessionLimit: 4, minSecondsBetweenAnyAds: 0 });

describe("adsFrequencyController", ()=>{
  it("un placement deshabilitado nunca es elegible", ()=>{
    const state = freshFrequencyState();
    const res = checkEligibility(state, "X", { ...PLACEMENT_CFG, enabled: false }, GLOBAL_LIMITS);
    expect(res.eligible).toBe(false);
    expect(res.reason).toBe("placement_disabled");
  });

  it("respeta el límite diario por placement", ()=>{
    const state = freshFrequencyState();
    recordUsage(state, "BATTLE_REVIVE");
    recordUsage(state, "BATTLE_REVIVE");
    const res = checkEligibility(state, "BATTLE_REVIVE", PLACEMENT_CFG, GLOBAL_LIMITS);
    expect(res.eligible).toBe(false);
    expect(res.reason).toBe("daily_limit");
  });

  it("respeta el límite global diario aunque el placement individual tenga cupo", ()=>{
    const state = freshFrequencyState();
    const tightGlobal = { ...GLOBAL_LIMITS, globalDailyLimit: 1 };
    recordUsage(state, "OTRO_PLACEMENT");
    const res = checkEligibility(state, "BATTLE_REVIVE", PLACEMENT_CFG, tightGlobal);
    expect(res.eligible).toBe(false);
    expect(res.reason).toBe("global_daily_limit");
  });

  it("respeta el cooldown por placement", ()=>{
    const state = freshFrequencyState();
    recordUsage(state, "DAILY_AD_CHEST");
    const res = checkEligibility(state, "DAILY_AD_CHEST", PLACEMENT_CFG, GLOBAL_LIMITS);
    expect(res.eligible).toBe(false);
    expect(res.reason).toBe("cooldown");
  });

  it("respeta el límite por combate (perBattleLimit)", ()=>{
    const state = freshFrequencyState();
    recordUsage(state, "BATTLE_REVIVE", { battleId: "b1" });
    const sameBattle = checkEligibility(state, "BATTLE_REVIVE", { ...PLACEMENT_CFG, cooldownSeconds: 0 }, GLOBAL_LIMITS, { battleId: "b1" });
    expect(sameBattle.eligible).toBe(false);
    expect(sameBattle.reason).toBe("per_battle_limit");
    const otherBattle = checkEligibility(state, "BATTLE_REVIVE", { ...PLACEMENT_CFG, cooldownSeconds: 0 }, GLOBAL_LIMITS, { battleId: "b2" });
    expect(otherBattle.eligible).toBe(true);
  });

  it("forgetBattle limpia el registro por combate", ()=>{
    const state = freshFrequencyState();
    recordUsage(state, "BATTLE_REVIVE", { battleId: "b1" });
    forgetBattle(state, "b1");
    expect(state.perBattleUsed.b1).toBeUndefined();
  });

  it("nunca dos anuncios seguidos sin cooldown global mínimo entre ellos", ()=>{
    const state = freshFrequencyState();
    recordUsage(state, "DAILY_AD_CHEST");
    const res = checkEligibility(state, "BATTLE_REVIVE", { ...PLACEMENT_CFG, cooldownSeconds: 0 }, { ...GLOBAL_LIMITS, minSecondsBetweenAnyAds: 999 });
    expect(res.eligible).toBe(false);
    expect(res.reason).toBe("global_cooldown");
  });
});

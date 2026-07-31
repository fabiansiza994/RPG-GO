import { describe, it, expect } from "vitest";
import { createTransaction, markAdStarted, markRewardEarned, markApplied, markFailed, canApply } from "../adRewardTransactions.js";

describe("adRewardTransactions", ()=>{
  it("crea una transacción CREATED con id único", ()=>{
    const tx1 = createTransaction({ placement: "BATTLE_REVIVE", sessionId: "s1", rewardType: "REVIVE_FULL_HP", rewardAmount: 1 });
    const tx2 = createTransaction({ placement: "BATTLE_REVIVE", sessionId: "s1", rewardType: "REVIVE_FULL_HP", rewardAmount: 1 });
    expect(tx1.status).toBe("CREATED");
    expect(tx1.id).not.toBe(tx2.id);
  });

  it("sigue el flujo normal CREATED -> AD_STARTED -> REWARD_EARNED -> APPLIED", ()=>{
    const tx = createTransaction({ placement: "BATTLE_REVIVE", sessionId: "s1", rewardType: "REVIVE_FULL_HP", rewardAmount: 1 });
    expect(markAdStarted(tx).ok).toBe(true);
    expect(canApply(tx)).toBe(false);
    expect(markRewardEarned(tx, "resp1").ok).toBe(true);
    expect(canApply(tx)).toBe(true);
    expect(markApplied(tx).ok).toBe(true);
    expect(tx.status).toBe("APPLIED");
  });

  it("nunca aplica la misma transacción dos veces", ()=>{
    const tx = createTransaction({ placement: "BATTLE_REVIVE", sessionId: "s1", rewardType: "REVIVE_FULL_HP", rewardAmount: 1 });
    markAdStarted(tx); markRewardEarned(tx, "resp1");
    expect(markApplied(tx).ok).toBe(true);
    const second = markApplied(tx);
    expect(second.ok).toBe(false);
    expect(second.reason).toBe("already_applied");
  });

  it("no se puede aplicar una transacción que nunca ganó la recompensa", ()=>{
    const tx = createTransaction({ placement: "BATTLE_REVIVE", sessionId: "s1", rewardType: "REVIVE_FULL_HP", rewardAmount: 1 });
    markAdStarted(tx);
    const res = markApplied(tx);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("invalid_state");
  });

  it("markFailed no permite volver a marcar una transacción ya resuelta", ()=>{
    const tx = createTransaction({ placement: "BATTLE_REVIVE", sessionId: "s1", rewardType: "REVIVE_FULL_HP", rewardAmount: 1 });
    markAdStarted(tx);
    markFailed(tx, "SHOW_ERROR");
    expect(tx.status).toBe("FAILED");
    const second = markFailed(tx, "SHOW_ERROR");
    expect(second.ok).toBe(false);
  });

  it("no permite saltar directo de CREATED a REWARD_EARNED (sin AD_STARTED)", ()=>{
    const tx = createTransaction({ placement: "BATTLE_REVIVE", sessionId: "s1", rewardType: "REVIVE_FULL_HP", rewardAmount: 1 });
    const res = markRewardEarned(tx, "resp1");
    expect(res.ok).toBe(false);
  });
});

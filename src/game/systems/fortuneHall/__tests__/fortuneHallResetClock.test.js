import { describe, it, expect } from "vitest";
import { getCurrentDateKey, getNextResetAt, getMillisecondsUntilReset, hasDailyResetOccurred } from "../fortuneHallResetClock.js";

describe("FortuneHallResetClock", ()=>{
  it("getCurrentDateKey devuelve YYYY-M-D consistente para el mismo instante", ()=>{
    const now = new Date(2026, 6, 31, 15, 30, 0); // 31 jul 2026, 15:30 local
    expect(getCurrentDateKey(now)).toBe("2026-07-31");
  });

  it("getNextResetAt cae después de `now` y coincide con la medianoche local siguiente", ()=>{
    const now = new Date(2026, 6, 31, 15, 30, 0);
    const nextReset = new Date(getNextResetAt(now));
    expect(nextReset.getTime()).toBeGreaterThan(now.getTime());
    expect(nextReset.getHours()).toBe(0);
    expect(nextReset.getDate()).toBe(1);
  });

  it("getMillisecondsUntilReset nunca es negativo", ()=>{
    const now = new Date(2026, 6, 31, 23, 59, 59);
    expect(getMillisecondsUntilReset(now)).toBeGreaterThanOrEqual(0);
  });

  it("hasDailyResetOccurred detecta el cambio de dateKey", ()=>{
    expect(hasDailyResetOccurred(null)).toBe(true);
    expect(hasDailyResetOccurred("2026-07-30", new Date(2026,6,31,10,0,0))).toBe(true);
    expect(hasDailyResetOccurred("2026-07-31", new Date(2026,6,31,10,0,0))).toBe(false);
  });
});

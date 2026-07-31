import { describe, it, expect } from "vitest";
import { getDateKey, hasCooldownElapsed, getNextAvailability, detectSuspiciousTimeChange } from "../adsClock.js";

describe("adsClock", ()=>{
  it("getDateKey formatea YYYY-M-D", ()=>{
    expect(getDateKey(new Date(2026, 6, 29))).toBe("2026-07-29");
  });

  it("hasCooldownElapsed sin timestamp previo siempre es true", ()=>{
    expect(hasCooldownElapsed(null, 600)).toBe(true);
  });

  it("hasCooldownElapsed respeta el tiempo exacto", ()=>{
    const last = new Date(2026, 6, 29, 10, 0, 0).getTime();
    expect(hasCooldownElapsed(last, 600, new Date(2026, 6, 29, 10, 9, 0))).toBe(false);
    expect(hasCooldownElapsed(last, 600, new Date(2026, 6, 29, 10, 10, 0))).toBe(true);
  });

  it("getNextAvailability sin uso previo es inmediato (0)", ()=>{
    expect(getNextAvailability(null, 600)).toBe(0);
  });

  it("detecta un retroceso de reloj sospechoso", ()=>{
    const lastKnown = new Date("2026-07-29T12:00:00Z").getTime();
    expect(detectSuspiciousTimeChange(lastKnown, new Date("2026-07-29T11:00:00Z"))).toBe(true);
    expect(detectSuspiciousTimeChange(lastKnown, new Date("2026-07-29T12:00:30Z"))).toBe(false);
    expect(detectSuspiciousTimeChange(0, new Date())).toBe(false);
  });
});

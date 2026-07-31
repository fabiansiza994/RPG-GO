import { describe, it, expect } from "vitest";
import { createCloudShadowPool } from "../cloudShadowPool.js";

describe("cloudShadowPool", ()=>{
  it("acquire devuelve null cuando el pool está lleno (nunca crea objetos nuevos de más)", ()=>{
    const pool = createCloudShadowPool(2);
    expect(pool.acquire({ id: "a" })).not.toBeNull();
    expect(pool.acquire({ id: "b" })).not.toBeNull();
    expect(pool.acquire({ id: "c" })).toBeNull();
  });

  it("release libera el slot para que acquire lo REUTILICE (misma identidad de objeto)", ()=>{
    const pool = createCloudShadowPool(1);
    const slot1 = pool.acquire({ id: "a" });
    expect(slot1).not.toBeNull();
    pool.release(slot1);
    const slot2 = pool.acquire({ id: "b" });
    expect(slot2).toBe(slot1); // mismo objeto reciclado, no uno nuevo
    expect(slot2.id).toBe("b");
    expect(slot2.active).toBe(true);
  });

  it("countActive/getActive reflejan solo los slots activos", ()=>{
    const pool = createCloudShadowPool(3);
    const a = pool.acquire({ id: "a" });
    const b = pool.acquire({ id: "b" });
    expect(pool.countActive()).toBe(2);
    pool.release(a);
    expect(pool.countActive()).toBe(1);
    expect(pool.getActive()).toEqual([b]);
  });

  it("hasFreeSlot detecta correctamente cupo disponible", ()=>{
    const pool = createCloudShadowPool(1);
    expect(pool.hasFreeSlot()).toBe(true);
    pool.acquire({ id: "a" });
    expect(pool.hasFreeSlot()).toBe(false);
  });

  it("setCapacity reduce cuántos slots están disponibles para acquire", ()=>{
    const pool = createCloudShadowPool(4);
    pool.acquire({ id: "a" }); pool.acquire({ id: "b" });
    pool.setCapacity(1);
    expect(pool.acquire({ id: "c" })).toBeNull(); // ya no hay cupo dentro de la nueva capacidad
  });

  it("setCapacity hacia arriba habilita más cupo sin tocar los slots ya activos", ()=>{
    const pool = createCloudShadowPool(1);
    const a = pool.acquire({ id: "a" });
    pool.setCapacity(2);
    const b = pool.acquire({ id: "b" });
    expect(b).not.toBeNull();
    expect(pool.getActive()).toContain(a);
    expect(pool.getActive()).toContain(b);
  });

  it("releaseAll libera todo de una — útil para destruir el sistema limpiamente", ()=>{
    const pool = createCloudShadowPool(3);
    pool.acquire({ id: "a" }); pool.acquire({ id: "b" });
    pool.releaseAll();
    expect(pool.countActive()).toBe(0);
  });
});

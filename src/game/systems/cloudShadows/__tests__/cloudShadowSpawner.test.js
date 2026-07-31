import { describe, it, expect } from "vitest";
import {
  offsetLatLng, distanceMeters, isOutsideRadius, pickSpawnPoint, shouldSpawnNow, shouldDespawnCloud,
  randomInstanceParams, pickRandomSprite,
} from "../cloudShadowSpawner.js";
import { createCloudShadowPool } from "../cloudShadowPool.js";

const CENTER = { lat: 1.0, lng: -75.0 };
const RADIUS_M = 1200;

describe("offsetLatLng", ()=>{
  it("rumbo 90° (Este) aumenta la longitud y prácticamente no cambia la latitud", ()=>{
    const p = offsetLatLng(1, -75, 1000, 90);
    expect(p.lng).toBeGreaterThan(-75);
    expect(Math.abs(p.lat - 1)).toBeLessThan(1e-6);
  });
  it("rumbo 0° (Norte) aumenta la latitud y prácticamente no cambia la longitud", ()=>{
    const p = offsetLatLng(1, -75, 1000, 0);
    expect(p.lat).toBeGreaterThan(1);
    expect(Math.abs(p.lng - (-75))).toBeLessThan(1e-6);
  });
  it("a más distancia, más desplazamiento", ()=>{
    const near = offsetLatLng(1, -75, 100, 90);
    const far = offsetLatLng(1, -75, 5000, 90);
    expect(far.lng - (-75)).toBeGreaterThan(near.lng - (-75));
  });
});

describe("distanceMeters / isOutsideRadius", ()=>{
  it("la distancia de un punto a sí mismo es 0", ()=>{
    expect(distanceMeters(CENTER.lat, CENTER.lng, CENTER.lat, CENTER.lng)).toBeCloseTo(0, 6);
  });
  it("un punto dentro del radio no está afuera", ()=>{
    const p = offsetLatLng(CENTER.lat, CENTER.lng, RADIUS_M * 0.5, 45);
    expect(isOutsideRadius(p.lat, p.lng, CENTER, RADIUS_M)).toBe(false);
  });
  it("un punto lejos del centro está afuera", ()=>{
    const p = offsetLatLng(CENTER.lat, CENTER.lng, RADIUS_M * 5, 45);
    expect(isOutsideRadius(p.lat, p.lng, CENTER, RADIUS_M)).toBe(true);
  });
  it("un punto apenas fuera del radio, con margen generoso, no cuenta como afuera", ()=>{
    const p = offsetLatLng(CENTER.lat, CENTER.lng, RADIUS_M + 10, 45);
    expect(isOutsideRadius(p.lat, p.lng, CENTER, RADIUS_M + 500)).toBe(false);
  });
});

describe("pickSpawnPoint", ()=>{
  it("el punto elegido siempre nace FUERA del radio actual", ()=>{
    for(let seed=1; seed<=15; seed++){
      const rng = mulberry32(seed);
      const point = pickSpawnPoint(CENTER, RADIUS_M, 90, 180, rng);
      expect(isOutsideRadius(point.lat, point.lng, CENTER, RADIUS_M)).toBe(true);
    }
  });
  it("REGRESIÓN: el punto elegido nunca nace ya fuera de despawnRadiusM (spawnMarginM < despawnMarginM) — si no, la nube se recicla en el siguiente tick sin llegar a verse", ()=>{
    const spawnMarginM = 50;
    const despawnMarginM = 110; // mismos valores que POPULATION en cloudShadows.config.js
    const despawnRadiusM = RADIUS_M + despawnMarginM;
    for(let seed=1; seed<=15; seed++){
      const rng = mulberry32(seed);
      const point = pickSpawnPoint(CENTER, RADIUS_M, 90, spawnMarginM, rng);
      expect(distanceMeters(point.lat, point.lng, CENTER.lat, CENTER.lng)).toBeLessThan(despawnRadiusM);
    }
  });
});

describe("shouldSpawnNow / shouldDespawnCloud", ()=>{
  it("no spawnea si no hay cupo en el pool", ()=>{
    const pool = createCloudShadowPool(1);
    pool.acquire({ id: "a" });
    expect(shouldSpawnNow(pool, 0, 1000, 999999)).toBe(false);
  });
  it("no spawnea si todavía no pasó el intervalo", ()=>{
    const pool = createCloudShadowPool(2);
    expect(shouldSpawnNow(pool, 1000, 4000, 2000)).toBe(false);
  });
  it("spawnea cuando hay cupo y ya pasó el intervalo", ()=>{
    const pool = createCloudShadowPool(2);
    expect(shouldSpawnNow(pool, 1000, 4000, 5001)).toBe(true);
  });

  it("despawnea una nube que salió del radio+margen", ()=>{
    const far = offsetLatLng(CENTER.lat, CENTER.lng, RADIUS_M * 5, 45);
    const slot = { active: true, lat: far.lat, lng: far.lng, spawnedAt: 0, lifetimeS: 999999 };
    expect(shouldDespawnCloud(slot, CENTER, RADIUS_M + 100, 1000)).toBe(true);
  });
  it("despawnea una nube que cumplió su tiempo de vida, aunque siga dentro del radio", ()=>{
    const slot = { active: true, lat: CENTER.lat, lng: CENTER.lng, spawnedAt: 0, lifetimeS: 10 };
    expect(shouldDespawnCloud(slot, CENTER, RADIUS_M + 100, 11000)).toBe(true);
  });
  it("no despawnea una nube activa, adentro y con vida restante", ()=>{
    const slot = { active: true, lat: CENTER.lat, lng: CENTER.lng, spawnedAt: 0, lifetimeS: 200 };
    expect(shouldDespawnCloud(slot, CENTER, RADIUS_M + 100, 5000)).toBe(false);
  });
  it("nunca despawnea un slot inactivo (ya reciclado)", ()=>{
    const slot = { active: false, lat: 999, lng: 999, spawnedAt: 0, lifetimeS: 1 };
    expect(shouldDespawnCloud(slot, CENTER, RADIUS_M + 100, 999999)).toBe(false);
  });
});

describe("randomInstanceParams", ()=>{
  const config = {
    scaleSteps: [0.7, 0.9, 1.1, 1.3, 1.5, 1.8],
    rotationSteps: [0, 90, 180, 270],
    rotationVarianceDeg: 18,
    opacityMin: 0.10, opacityMax: 0.22,
    speedMinMs: 0.6, speedMaxMs: 2.2,
    baseBearingDeg: 90, bearingVarianceDeg: 25,
    lifetimeMinS: 90, lifetimeMaxS: 220,
    worldSizeMinM: 160, worldSizeMaxM: 260,
  };
  it("nunca dos instancias son exactamente iguales (con rng real)", ()=>{
    const results = new Set();
    for(let i=0;i<20;i++){
      const p = randomInstanceParams(config, Math.random);
      results.add(JSON.stringify(p));
    }
    expect(results.size).toBeGreaterThan(1);
  });
  it("todos los valores caen dentro de los rangos configurados", ()=>{
    for(let seed=1; seed<=25; seed++){
      const rng = mulberry32(seed);
      const p = randomInstanceParams(config, rng);
      expect(config.scaleSteps).toContain(p.scale);
      expect(p.opacity).toBeGreaterThanOrEqual(config.opacityMin);
      expect(p.opacity).toBeLessThanOrEqual(config.opacityMax);
      expect(p.speedMs).toBeGreaterThanOrEqual(config.speedMinMs);
      expect(p.speedMs).toBeLessThanOrEqual(config.speedMaxMs);
      expect(p.lifetimeS).toBeGreaterThanOrEqual(config.lifetimeMinS);
      expect(p.lifetimeS).toBeLessThanOrEqual(config.lifetimeMaxS);
      expect(p.worldSizeM).toBeGreaterThan(0);
    }
  });
});

describe("pickRandomSprite", ()=>{
  it("devuelve null si no hay sprites disponibles", ()=>{
    expect(pickRandomSprite([], Math.random)).toBeNull();
  });
  it("elige un sprite y una variante de blur de la lista dada", ()=>{
    const sprites = [{ id: "cloud_0", blurVariants: [{blurPx:2},{blurPx:6}] }];
    const pick = pickRandomSprite(sprites, Math.random);
    expect(pick.spriteId).toBe("cloud_0");
    expect([2,6]).toContain(pick.blurPx);
  });
});

function mulberry32(seed){
  let a = seed >>> 0;
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

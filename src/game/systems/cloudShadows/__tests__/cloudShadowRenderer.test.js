import { describe, it, expect } from "vitest";
import { metersPerPixel, computeIconSize, blurImageId, dampedZoomForSize } from "../cloudShadowRenderer.js";
import { SIZE_ZOOM_DAMPING } from "../../../config/cloudShadows.config.js";

// Solo se testean las funciones PURAS del renderer — registerSprites/createCloudShadowLayer/
// updateCloudShadowLayer tocan map._maplibre real y se verifican en el juego, no acá.

describe("metersPerPixel", ()=>{
  it("a más zoom, menos metros por píxel (el mundo se ve más grande)", ()=>{
    const far = metersPerPixel(10, 0);
    const close = metersPerPixel(18, 0);
    expect(close).toBeLessThan(far);
  });
  it("cerca del ecuador da más metros por píxel que cerca de un polo, al mismo zoom", ()=>{
    const equator = metersPerPixel(15, 0);
    const nearPole = metersPerPixel(15, 70);
    expect(nearPole).toBeLessThan(equator);
  });
});

describe("computeIconSize", ()=>{
  it("un sprite sin ancho conocido da tamaño 0 (evita dividir por cero)", ()=>{
    expect(computeIconSize(200, 0, 16, 4)).toBe(0);
  });
  it("a mayor tamaño real (metros), mayor icon-size, a igual zoom/sprite", ()=>{
    const small = computeIconSize(100, 300, 16, 4);
    const big = computeIconSize(400, 300, 16, 4);
    expect(big).toBeGreaterThan(small);
  });
  it("al alejar el zoom, el icon-size baja (el sprite ocupa menos píxeles) para el MISMO tamaño real", ()=>{
    const closeZoom = computeIconSize(200, 300, 18, 4);
    const farZoom = computeIconSize(200, 300, 14, 4);
    expect(farZoom).toBeLessThan(closeZoom);
  });
  it("REGRESIÓN: la amortiguación de zoom (SIZE_ZOOM_DAMPING) hace el cambio de tamaño menos brusco que el 100% coherente con el mundo, entre el zoom mínimo permitido y el por defecto", ()=>{
    const MIN_ZOOM_ALLOWED = 17.29; // mismo valor que en main.js
    const atDefaultZoom = computeIconSize(200, 300, SIZE_ZOOM_DAMPING.referenceZoom, 4);
    const atMinZoom = computeIconSize(200, 300, MIN_ZOOM_ALLOWED, 4);
    const dampedRatio = atMinZoom / atDefaultZoom;
    const undampedRatio = metersPerPixel(SIZE_ZOOM_DAMPING.referenceZoom, 4) / metersPerPixel(MIN_ZOOM_ALLOWED, 4);
    expect(dampedRatio).toBeGreaterThan(undampedRatio); // se achica menos que la fórmula sin amortiguar
  });
});

describe("dampedZoomForSize", ()=>{
  it("en el zoom de referencia, no amortigua nada (devuelve el mismo zoom)", ()=>{
    expect(dampedZoomForSize(SIZE_ZOOM_DAMPING.referenceZoom)).toBeCloseTo(SIZE_ZOOM_DAMPING.referenceZoom, 6);
  });
  it("lejos del zoom de referencia, acerca el resultado (nunca amplifica la diferencia)", ()=>{
    const zoom = SIZE_ZOOM_DAMPING.referenceZoom - 2;
    const damped = dampedZoomForSize(zoom);
    expect(Math.abs(damped - SIZE_ZOOM_DAMPING.referenceZoom)).toBeLessThan(Math.abs(zoom - SIZE_ZOOM_DAMPING.referenceZoom));
  });
});

describe("blurImageId", ()=>{
  it("arma un id determinístico combinando sprite + nivel de blur", ()=>{
    expect(blurImageId("cloud_3", 6)).toBe("cloud_3_blur6");
  });
  it("redondea niveles de blur no enteros (los ids de imagen de MapLibre deben ser estables)", ()=>{
    expect(blurImageId("cloud_1", 4.0)).toBe("cloud_1_blur4");
  });
});

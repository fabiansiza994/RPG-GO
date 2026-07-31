import { describe, it, expect } from "vitest";
import {
  connectedComponents, hasRealAlpha, detectBackgroundColor, synthesizeAlphaChannel, colorDistance,
} from "../cloudShadowSpriteExtractor.js";

// Se testean las partes PURAS del extractor (reciben cualquier objeto {width,height,data}, no
// necesitan DOM/canvas real). El resto (loadSpriteSheetImage/extractSpriteCanvases) es una capa
// fina sobre Image/canvas reales, sin lógica propia más allá de invocar estas — se verifica a
// mano/en el juego, no con vitest (mismo criterio que nativeGeolocation.js).

/** Convierte un dibujo ASCII en un objeto {width,height,data} tipo ImageData.
 *  Por defecto '.'=transparente(0), cualquier otro carácter=opaco(254). */
function gridToImageData(rows, alphaFor = (ch)=> (ch === "." ? 0 : 254)){
  const height = rows.length;
  const width = rows[0].length;
  const data = new Uint8ClampedArray(width * height * 4);
  for(let y=0; y<height; y++){
    for(let x=0; x<width; x++){
      const idx = (y*width + x) * 4;
      data[idx] = 40; data[idx+1] = 40; data[idx+2] = 40;
      data[idx+3] = alphaFor(rows[y][x]);
    }
  }
  return { width, height, data };
}

describe("connectedComponents", ()=>{
  it("detecta dos nubes separadas como dos componentes distintas", ()=>{
    const img = gridToImageData([
      "XX...XX",
      "XX...XX",
      ".......",
    ]);
    const comps = connectedComponents(img, { alphaThreshold: 12, minComponentPixelArea: 1, connectivity: 8 });
    expect(comps.length).toBe(2);
  });

  it("calcula la bounding box correcta de una sola nube", ()=>{
    const img = gridToImageData([
      "....",
      ".XX.",
      ".XX.",
      "....",
    ]);
    const comps = connectedComponents(img, { alphaThreshold: 12, minComponentPixelArea: 1, connectivity: 8 });
    expect(comps).toHaveLength(1);
    expect(comps[0]).toMatchObject({ minX: 1, minY: 1, maxX: 2, maxY: 2, pixelCount: 4 });
  });

  it("conectividad 8 une una diagonal en una sola componente; conectividad 4 la parte en tres", ()=>{
    const img = gridToImageData([
      "X..",
      ".X.",
      "..X",
    ]);
    const comps8 = connectedComponents(img, { alphaThreshold: 12, minComponentPixelArea: 1, connectivity: 8 });
    expect(comps8).toHaveLength(1);
    const comps4 = connectedComponents(img, { alphaThreshold: 12, minComponentPixelArea: 1, connectivity: 4 });
    expect(comps4).toHaveLength(3);
  });

  it("descarta manchas de ruido más chicas que minComponentPixelArea", ()=>{
    const img = gridToImageData([
      "X.......",
      "...XXXXX",
      "...XXXXX",
    ]);
    const comps = connectedComponents(img, { alphaThreshold: 12, minComponentPixelArea: 5, connectivity: 8 });
    expect(comps).toHaveLength(1); // la "X" suelta de 1px queda afuera
    expect(comps[0].pixelCount).toBe(10);
  });

  it("respeta el umbral de alfa: un píxel con alfa por debajo del umbral cuenta como fondo", ()=>{
    // '~' = alfa 8 (por debajo del umbral 12) — debe partir la fila en dos componentes
    const img = gridToImageData(["##~##"], ch => (ch === "#" ? 254 : ch === "~" ? 8 : 0));
    const comps = connectedComponents(img, { alphaThreshold: 12, minComponentPixelArea: 1, connectivity: 8 });
    expect(comps).toHaveLength(2);
  });

  it("un alfa apenas por encima del umbral SÍ cuenta como nube (bordes suaves se conservan)", ()=>{
    const img = gridToImageData(["##+##"], ch => (ch === "#" ? 254 : ch === "+" ? 20 : 0));
    const comps = connectedComponents(img, { alphaThreshold: 12, minComponentPixelArea: 1, connectivity: 8 });
    expect(comps).toHaveLength(1);
    expect(comps[0].pixelCount).toBe(5);
  });

  it("devuelve las componentes en orden de lectura (arriba→abajo, izquierda→derecha)", ()=>{
    const img = gridToImageData([
      "..X",
      "...",
      "X..",
    ]);
    const comps = connectedComponents(img, { alphaThreshold: 12, minComponentPixelArea: 1, connectivity: 8 });
    expect(comps).toHaveLength(2);
    expect(comps[0].minY).toBeLessThanOrEqual(comps[1].minY);
  });

  it("una imagen totalmente transparente no produce ninguna componente", ()=>{
    const img = gridToImageData(["....", "...."]);
    const comps = connectedComponents(img, { alphaThreshold: 12, minComponentPixelArea: 1, connectivity: 8 });
    expect(comps).toHaveLength(0);
  });
});

/** {width,height,data} plano con alfa fijo en TODOS los píxeles (simula una imagen dibujada en
 *  canvas desde un PNG sin canal alfa, donde el navegador siempre reporta alfa=255). */
function solidImageData(width, height, [r,g,b], alpha = 255){
  const data = new Uint8ClampedArray(width*height*4);
  for(let i=0; i<data.length; i+=4){
    data[i]=r; data[i+1]=g; data[i+2]=b; data[i+3]=alpha;
  }
  return { width, height, data };
}

describe("colorDistance", ()=>{
  it("es 0 para el mismo color", ()=>{
    expect(colorDistance(10,20,30, 10,20,30)).toBe(0);
  });
  it("crece con la diferencia de color", ()=>{
    const near = colorDistance(0,0,0, 10,10,10);
    const far = colorDistance(0,0,0, 200,200,200);
    expect(far).toBeGreaterThan(near);
  });
});

describe("hasRealAlpha", ()=>{
  it("false cuando TODOS los píxeles están completamente opacos (imagen sin canal alfa real)", ()=>{
    const img = solidImageData(4, 4, [255,255,255], 255);
    expect(hasRealAlpha(img)).toBe(false);
  });
  it("true en cuanto un solo píxel tiene alfa apreciablemente por debajo de 255", ()=>{
    const img = solidImageData(4, 4, [255,255,255], 255);
    img.data[3] = 0; // un solo píxel transparente alcanza
    expect(hasRealAlpha(img)).toBe(true);
  });
});

describe("detectBackgroundColor", ()=>{
  it("elige el color que se repite en la mayoría de las 8 muestras de borde", ()=>{
    const img = solidImageData(10, 10, [255,255,255]);
    // ensucia una sola esquina con otro color — la moda debe seguir siendo blanco
    img.data[0]=0; img.data[1]=0; img.data[2]=0;
    expect(detectBackgroundColor(img)).toEqual({ r:255, g:255, b:255 });
  });
});

describe("synthesizeAlphaChannel", ()=>{
  const bg = { r:255, g:255, b:255 };
  it("un píxel idéntico al fondo queda con alfa 0", ()=>{
    const img = solidImageData(1, 1, [255,255,255]);
    const out = synthesizeAlphaChannel(img, bg, { tolerance: 40, rampWidth: 30 });
    expect(out.data[3]).toBe(0);
  });
  it("un píxel muy distinto del fondo queda con alfa 255 (parte de la nube)", ()=>{
    const img = solidImageData(1, 1, [10,10,10]);
    const out = synthesizeAlphaChannel(img, bg, { tolerance: 40, rampWidth: 30 });
    expect(out.data[3]).toBe(255);
  });
  it("no muta el imageData original", ()=>{
    const img = solidImageData(1, 1, [10,10,10]);
    synthesizeAlphaChannel(img, bg, { tolerance: 40, rampWidth: 30 });
    expect(img.data[3]).toBe(255); // el original seguía "opaco" antes de sintetizar
  });
});

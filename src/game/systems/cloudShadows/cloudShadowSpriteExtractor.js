/* ============================================================
   CloudShadowSpriteExtractor
   ------------------------------------------------------------
   Detecta automáticamente cada nube dentro del spritesheet (clouds.png, o
   cualquier reemplazo con la misma forma: fondo uniforme + formas
   separadas) y la recorta en su propio sprite — nunca hace falta indicar
   coordenadas a mano. Para agregar/cambiar nubes, ver el comentario al
   final de cloudShadowManager.js.

   La detección se basa en el canal ALFA (transparente = fondo, opaco = nube).
   Si el archivo reemplazado se exportó SIN canal alfa (un PNG "RGB plano",
   fondo sólido de un color en vez de transparencia real — pasa fácil al
   reexportar desde algunos editores), todo el lienzo se leería como opaco y
   se detectaría como una sola nube gigante (el rectángulo completo). Para que
   el sistema siga funcionando SIN tener que tocar código cada vez que se
   reemplaza la imagen, `extractSpriteCanvases` detecta ese caso
   (`hasRealAlpha`) y sintetiza un canal alfa por color de fondo
   (`detectBackgroundColor` + `synthesizeAlphaChannel`) antes de detectar — un
   "chroma key" automático. Si la imagen SÍ trae transparencia real, este
   respaldo ni se activa (comportamiento original, sin cambios).

   Separado en varias partes a propósito:
   - connectedComponents/hasRealAlpha/detectBackgroundColor/
     synthesizeAlphaChannel/colorDistance: PURAS — reciben cualquier objeto
     con forma {width, height, data} (igual que ImageData del DOM, pero
     también un objeto plano armado a mano en un test). Testeables con
     vitest sin navegador.
   - loadSpriteSheetImage/extractSpriteCanvases/extractCloudSprites: tocan
     Image/canvas real (DOM) — capa fina, sin lógica propia más allá de
     rasterizar y recortar.
   ============================================================ */
import { SPRITE_SHEET_URL, SPRITE_DETECTION, BLUR_VARIANTS_PX } from "../../config/cloudShadows.config.js";

const OFFSETS_4 = [[1,0],[-1,0],[0,1],[0,-1]];
const OFFSETS_8 = [...OFFSETS_4, [1,1],[1,-1],[-1,1],[-1,-1]];

/**
 * Componentes conexas por umbral de alfa (flood-fill / BFS iterativo, sin
 * recursión — seguro para imágenes grandes). No muta `imageData`.
 * @param {{width:number, height:number, data:ArrayLike<number>}} imageData
 * @returns {Array<{minX:number,minY:number,maxX:number,maxY:number,pixelCount:number}>}
 *          ordenado en orden de lectura (arriba→abajo, izquierda→derecha) para ids deterministas.
 */
export function connectedComponents(imageData, options = {}){
  const { alphaThreshold = 12, minComponentPixelArea = 100, connectivity = 8 } = options;
  const { width, height, data } = imageData;
  if(!width || !height) return [];
  const offsets = connectivity === 4 ? OFFSETS_4 : OFFSETS_8;
  const visited = new Uint8Array(width * height);
  const isForeground = (x, y)=> data[(y*width + x) * 4 + 3] > alphaThreshold;

  const queueX = new Int32Array(width * height);
  const queueY = new Int32Array(width * height);
  const components = [];

  for(let y=0; y<height; y++){
    for(let x=0; x<width; x++){
      const startIdx = y*width + x;
      if(visited[startIdx]) continue;
      visited[startIdx] = 1;
      if(!isForeground(x, y)) continue;

      let head = 0, tail = 0;
      queueX[tail] = x; queueY[tail] = y; tail++;
      let minX = x, maxX = x, minY = y, maxY = y, count = 0;

      while(head < tail){
        const cx = queueX[head], cy = queueY[head]; head++;
        count++;
        if(cx < minX) minX = cx; if(cx > maxX) maxX = cx;
        if(cy < minY) minY = cy; if(cy > maxY) maxY = cy;
        for(const [dx, dy] of offsets){
          const nx = cx+dx, ny = cy+dy;
          if(nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const nIdx = ny*width + nx;
          if(visited[nIdx]) continue;
          visited[nIdx] = 1;
          if(!isForeground(nx, ny)) continue;
          queueX[tail] = nx; queueY[tail] = ny; tail++;
        }
      }
      if(count >= minComponentPixelArea){
        components.push({ minX, minY, maxX, maxY, pixelCount: count });
      }
    }
  }
  components.sort((a,b)=> (a.minY - b.minY) || (a.minX - b.minX));
  return components;
}

/** Distancia euclídea simple entre dos colores RGB (0-255 cada canal). */
export function colorDistance(r1,g1,b1,r2,g2,b2){
  const dr = r1-r2, dg = g1-g2, db = b1-b2;
  return Math.sqrt(dr*dr + dg*dg + db*db);
}

/** true si la imagen ya trae transparencia real (algún píxel con alfa apreciablemente distinto
 *  de 255) — un muestreo simple de TODO el canal alfa alcanza porque una imagen sin canal alfa
 *  real queda con alfa=255 de punta a punta al dibujarse en un canvas. */
export function hasRealAlpha(imageData){
  const { data } = imageData;
  for(let i=3; i<data.length; i+=4){
    if(data[i] < 250) return true;
  }
  return false;
}

/** Color de fondo estimado por moda entre 8 puntos de muestra (las cuatro esquinas + el punto
 *  medio de cada borde) — de sobra para un spritesheet con fondo sólido de un solo color, que es
 *  el caso típico cuando no hay transparencia real. */
export function detectBackgroundColor(imageData){
  const { width, height, data } = imageData;
  const points = [
    [0,0], [width-1,0], [0,height-1], [width-1,height-1],
    [Math.floor(width/2),0], [Math.floor(width/2),height-1],
    [0,Math.floor(height/2)], [width-1,Math.floor(height/2)],
  ];
  const counts = new Map();
  points.forEach(([x,y])=>{
    const idx = (y*width + x) * 4;
    const key = data[idx]+","+data[idx+1]+","+data[idx+2];
    counts.set(key, (counts.get(key)||0) + 1);
  });
  let bestKey = null, bestCount = -1;
  counts.forEach((count, key)=>{ if(count > bestCount){ bestCount = count; bestKey = key; } });
  const [r,g,b] = bestKey.split(",").map(Number);
  return { r, g, b };
}

/** Devuelve una COPIA de `imageData` con un canal alfa SINTÉTICO ("chroma key"): los píxeles
 *  parecidos a `bgColor` se vuelven transparentes, con un degradado suave de `rampWidth` (en
 *  unidades de distancia de color, no píxeles) para que el borde recortado no quede dentado —
 *  imita el mismo criterio de borde suave que ya usa una imagen con canal alfa real. Nunca muta
 *  `imageData`. */
export function synthesizeAlphaChannel(imageData, bgColor, options = {}){
  const { tolerance = 40, rampWidth = 30 } = options;
  const { width, height, data } = imageData;
  const out = new Uint8ClampedArray(data.length);
  out.set(data);
  const innerT = Math.max(0, tolerance - rampWidth/2);
  const outerT = tolerance + rampWidth/2;
  for(let i=0; i<data.length; i+=4){
    const dist = colorDistance(data[i],data[i+1],data[i+2], bgColor.r,bgColor.g,bgColor.b);
    let alpha;
    if(dist <= innerT) alpha = 0;
    else if(dist >= outerT) alpha = 255;
    else alpha = Math.round(((dist-innerT)/(outerT-innerT)) * 255);
    out[i+3] = alpha;
  }
  return { width, height, data: out };
}

export function loadSpriteSheetImage(url){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = ()=> resolve(img);
    img.onerror = ()=> reject(new Error("No se pudo cargar el spritesheet de sombras de nube: " + url));
    img.src = url;
  });
}

/**
 * Rasteriza `img` a canvas, detecta cada nube y devuelve un sprite recortado
 * por cada una, con variantes de blur pre-horneadas (evita aplicar blur por
 * GPU en cada frame de cada instancia — ver cloudShadowRenderer.js).
 */
export function extractSpriteCanvases(img, detectionOptions = SPRITE_DETECTION, blurVariantsPx = BLUR_VARIANTS_PX){
  const sheetW = img.naturalWidth || img.width;
  const sheetH = img.naturalHeight || img.height;
  const sheetCanvas = document.createElement("canvas");
  sheetCanvas.width = sheetW; sheetCanvas.height = sheetH;
  const sheetCtx = sheetCanvas.getContext("2d", { willReadFrequently: true });
  sheetCtx.drawImage(img, 0, 0);
  let imageData = sheetCtx.getImageData(0, 0, sheetW, sheetH);

  if(!hasRealAlpha(imageData)){
    // Sin transparencia real (ver comentario grande al inicio del archivo) — se sintetiza un
    // canal alfa por color de fondo y se vuelve a pintar sobre sheetCanvas, así los recortes de
    // más abajo (drawImage) ya salen con transparencia real, no solo la detección.
    const bgColor = detectBackgroundColor(imageData);
    imageData = synthesizeAlphaChannel(imageData, bgColor, {
      tolerance: detectionOptions.backgroundColorTolerance,
      rampWidth: detectionOptions.backgroundColorRampPx,
    });
    // synthesizeAlphaChannel() devuelve un {width,height,data} PLANO a propósito (para poder
    // testearla sin DOM) — putImageData() exige una instancia real de ImageData, de ahí el wrap.
    sheetCtx.putImageData(new ImageData(imageData.data, imageData.width, imageData.height), 0, 0);
  }

  const components = connectedComponents(imageData, detectionOptions);
  const padding = detectionOptions.bboxPadding || 0;

  return components.map((comp, index)=>{
    const x0 = Math.max(0, comp.minX - padding);
    const y0 = Math.max(0, comp.minY - padding);
    const x1 = Math.min(sheetW - 1, comp.maxX + padding);
    const y1 = Math.min(sheetH - 1, comp.maxY + padding);
    const w = x1 - x0 + 1, h = y1 - y0 + 1;

    const baseCanvas = document.createElement("canvas");
    baseCanvas.width = w; baseCanvas.height = h;
    baseCanvas.getContext("2d").drawImage(sheetCanvas, x0, y0, w, h, 0, 0, w, h);

    const blurVariants = (blurVariantsPx || []).map(blurPx=>{
      const margin = Math.ceil(blurPx * 2.2); // espacio de sobra para que el blur no se corte en el borde
      const c = document.createElement("canvas");
      c.width = w + margin*2; c.height = h + margin*2;
      const bctx = c.getContext("2d");
      bctx.filter = `blur(${blurPx}px)`;
      bctx.drawImage(sheetCanvas, x0, y0, w, h, margin, margin, w, h);
      return { blurPx, canvas: c, width: c.width, height: c.height };
    });

    return { id: "cloud_" + index, width: w, height: h, canvas: baseCanvas, blurVariants, pixelCount: comp.pixelCount };
  });
}

/** Punto de entrada único: carga clouds.png (o el reemplazo que sea) y devuelve los sprites listos. */
export async function extractCloudSprites(url = SPRITE_SHEET_URL, detectionOptions = SPRITE_DETECTION, blurVariantsPx = BLUR_VARIANTS_PX){
  const img = await loadSpriteSheetImage(url);
  return extractSpriteCanvases(img, detectionOptions, blurVariantsPx);
}

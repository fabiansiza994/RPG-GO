/* ============================================================
   CloudShadowRenderer — la ÚNICA pieza que toca map._maplibre. Registra los
   sprites como imágenes reales de MapLibre (map.addImage), crea la capa
   `symbol` nativa (nunca HTML) y vuelca el estado del pool a su fuente
   GeoJSON con setData — mismo patrón que ya usa el shim para la ruta de
   misión/zonas de peligro (ver public/maplibre-leaflet-shim.js).

   Por qué una capa `symbol` y no un layer WebGL custom: con
   `icon-pitch-alignment:'map'` + `icon-rotation-alignment:'map'` MapLibre
   inclina/rota cada sprite junto con la cámara SOLO — cero JS por frame para
   eso. Y al ser una capa nativa (no maplibregl.Marker/HTML), MapLibre ya la
   dibuja SIEMPRE por debajo de cualquier marcador HTML (jugador, NPCs,
   enemigos, torres...) sin tener que coordinar z-index con nada.
   ============================================================ */
import { LAYER_IDS, SIZE_ZOOM_DAMPING } from "../../config/cloudShadows.config.js";

/** Mismo valor y fórmula que ya usa main.js (updateEngageRingRadius/
 *  updateMagicCircleScale) para convertir metros↔píxeles de pantalla según
 *  zoom/latitud — no se reinventa. */
const METERS_PER_PIXEL_AT_ZOOM0_EQUATOR = 156543.03392;

export function metersPerPixel(zoom, lat){
  return METERS_PER_PIXEL_AT_ZOOM0_EQUATOR * Math.cos(lat * Math.PI/180) / Math.pow(2, zoom);
}

/** Amortigua qué tanto responde el TAMAÑO al zoom (ver comentario de SIZE_ZOOM_DAMPING en
 *  cloudShadows.config.js) — el pitch/rotación siguen 100% reales, solo se atenúa el zoom que
 *  "ve" el cálculo de tamaño, acercándolo al zoom de referencia. */
export function dampedZoomForSize(zoom){
  const { referenceZoom, dampingFactor } = SIZE_ZOOM_DAMPING;
  return referenceZoom + (zoom - referenceZoom) * dampingFactor;
}

/** `icon-size` de MapLibre es un MULTIPLICADOR sobre el tamaño natural del
 *  sprite, no un valor absoluto en px — de ahí la división por
 *  `spriteWidthPx`. Esto es lo que hace que el tamaño en pantalla sea
 *  coherente con el MUNDO (metros reales) y no con la pantalla: al alejar
 *  el zoom, metersPerPixel crece y el multiplicador baja solo (amortiguado
 *  por dampedZoomForSize para que el cambio no sea tan brusco). */
export function computeIconSize(worldSizeM, spriteWidthPx, zoom, lat){
  if(!spriteWidthPx) return 0;
  const pixelDiameter = worldSizeM / metersPerPixel(dampedZoomForSize(zoom), lat);
  return pixelDiameter / spriteWidthPx;
}

export function blurImageId(spriteId, blurPx){
  return `${spriteId}_blur${Math.round(blurPx)}`;
}

/** map.addImage() de MapLibre NO acepta un HTMLCanvasElement directo — solo
 *  HTMLImageElement/ImageData/ImageBitmap/{width,height,data} (confirmado en
 *  el propio mensaje de error del bundle: "Invalid arguments to
 *  map.addImage()..."). Por eso cada canvas se convierte a ImageData real
 *  antes de registrarlo. */
function canvasToImageData(canvas){
  const ctx = canvas.getContext("2d");
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/** Registra cada variante de blur de cada sprite detectado como una imagen
 *  real de MapLibre — idempotente (nunca vuelve a registrar la misma id).
 *  @returns {Map<string, {imageId:string, width:number, height:number}>} keyed by `${spriteId}_blur${blurPx}`
 */
export function registerSprites(maplibreMap, sprites){
  const registry = new Map();
  sprites.forEach(sprite=>{
    (sprite.blurVariants||[]).forEach(variant=>{
      const imageId = blurImageId(sprite.id, variant.blurPx);
      if(!maplibreMap.hasImage(imageId)){
        maplibreMap.addImage(imageId, canvasToImageData(variant.canvas), { pixelRatio: 1 });
      }
      registry.set(imageId, { imageId, width: variant.width, height: variant.height });
    });
  });
  return registry;
}

function emptyCollection(){ return { type: "FeatureCollection", features: [] }; }

/** Crea source+layer si todavía no existen (llamar dentro de map._whenReady). */
export function createCloudShadowLayer(maplibreMap, beforeId){
  if(!maplibreMap.getSource(LAYER_IDS.source)){
    maplibreMap.addSource(LAYER_IDS.source, { type: "geojson", data: emptyCollection() });
  }
  if(!maplibreMap.getLayer(LAYER_IDS.layer)){
    maplibreMap.addLayer({
      id: LAYER_IDS.layer,
      type: "symbol",
      source: LAYER_IDS.source,
      layout: {
        "icon-image": ["get", "imageId"],
        "icon-size": ["get", "iconSize"],
        "icon-rotate": ["get", "rotationDeg"],
        "icon-rotation-alignment": "map",
        "icon-pitch-alignment": "map",
        "icon-anchor": "center",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: {
        "icon-opacity": ["get", "opacity"],
      },
    }, beforeId);
  }
}

/** Vuelca el pool a la fuente GeoJSON. `activeClouds` = slots del pool con
 *  `imageId`/`iconSize` ya calculados por cloudShadowManager (acá no se
 *  calcula nada de mundo, solo se serializa). */
export function updateCloudShadowLayer(maplibreMap, activeClouds){
  const source = maplibreMap.getSource(LAYER_IDS.source);
  if(!source) return;
  const features = activeClouds
    .filter(c=> c.imageId && c.iconSize > 0)
    .map(c=> ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [c.lng, c.lat] },
      properties: {
        imageId: c.imageId,
        iconSize: c.iconSize,
        rotationDeg: c.rotationDeg,
        opacity: c.opacity,
      },
    }));
  source.setData({ type: "FeatureCollection", features });
}

export function removeCloudShadowLayer(maplibreMap){
  if(maplibreMap.getLayer(LAYER_IDS.layer)) maplibreMap.removeLayer(LAYER_IDS.layer);
  if(maplibreMap.getSource(LAYER_IDS.source)) maplibreMap.removeSource(LAYER_IDS.source);
}

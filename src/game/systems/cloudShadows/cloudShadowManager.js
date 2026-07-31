/* ============================================================
   CloudShadowManager — orquesta extractor → registro de sprites → capa →
   pool → spawner, y corre el loop de actualización. Es la única pieza que
   main.js debería importar de este sistema.

   Ciclo de vida: init(mapShim) se llama UNA vez desde initMap() (ver
   main.js) — extrae los sprites de clouds.png, espera a que el estilo del
   mapa esté realmente listo (mapShim._whenReady, mismo criterio que usa el
   propio shim para sus capas), registra las imágenes y crea la capa
   `symbol`. A partir de ahí, un intervalo liviano (NORMAL_UPDATE_INTERVAL_MS,
   ~4-5 veces por segundo — de sobra para una deriva tan lenta) mueve las
   nubes activas, despawnea las que salieron del viewport o cumplieron su
   tiempo de vida, y spawnea una nueva cuando corresponde — nunca se detiene
   el flujo.
   ============================================================ */
import {
  CLOUD_SHADOWS_ENABLED, SPRITE_SHEET_URL, SPRITE_DETECTION, BLUR_VARIANTS_PX,
  POPULATION, VARIATION, LOW_PERFORMANCE_OVERRIDES, NORMAL_UPDATE_INTERVAL_MS,
  WEATHER_PROFILES, DEFAULT_WEATHER_PROFILE,
} from "../../config/cloudShadows.config.js";
import { extractCloudSprites } from "./cloudShadowSpriteExtractor.js";
import { createCloudShadowPool } from "./cloudShadowPool.js";
import {
  shouldSpawnNow, shouldDespawnCloud, pickSpawnPoint, randomInstanceParams,
  pickRandomSprite, offsetLatLng,
} from "./cloudShadowSpawner.js";
import {
  registerSprites, createCloudShadowLayer, updateCloudShadowLayer,
  removeCloudShadowLayer, computeIconSize, blurImageId, metersPerPixel,
} from "./cloudShadowRenderer.js";

/** Heurística simple (no hay ningún sistema de detección de rendimiento en
 *  el proyecto todavía) — se puede forzar manualmente vía
 *  manager.setLowPerformance(true/false) sin esperar a que la heurística
 *  acierte. `navigator.deviceMemory` no existe en todos los navegadores
 *  (Safari/iOS no lo expone) — se ignora si no está disponible en vez de
 *  tratarlo como "poca memoria". */
function detectLowPerformanceDevice(){
  try{
    const cores = navigator.hardwareConcurrency || 4;
    const mem = navigator.deviceMemory;
    if(mem != null && mem <= 2) return true;
    if(cores <= 4) return true;
    return false;
  }catch(e){ return false; }
}

export function createCloudShadowManager(){
  let maplibreMap = null;
  let pool = null;
  let spriteRegistry = null;         // Map imageId -> {width,height} (ver registerSprites)
  let availableSprites = [];         // [{id, blurVariants:[{blurPx}]}] — liviano, para elegir al azar
  let lastSpawnAt = 0;
  let tickTimer = null;
  let currentWeather = DEFAULT_WEATHER_PROFILE;
  let lowPerformance = false;
  let ready = false;

  function effectiveConfig(){
    const profile = WEATHER_PROFILES[currentWeather] || WEATHER_PROFILES[DEFAULT_WEATHER_PROFILE];
    const baseMaxClouds = lowPerformance ? LOW_PERFORMANCE_OVERRIDES.maxClouds : POPULATION.maxClouds;
    const baseSpawnInterval = lowPerformance
      ? POPULATION.spawnIntervalMs * LOW_PERFORMANCE_OVERRIDES.spawnIntervalMultiplier
      : POPULATION.spawnIntervalMs;
    return {
      ...VARIATION,
      maxClouds: Math.max(1, Math.round(baseMaxClouds * profile.maxCloudsMult)),
      spawnIntervalMs: baseSpawnInterval,
      despawnMarginM: POPULATION.despawnMarginM,
      spawnMarginM: POPULATION.spawnMarginM,
      spawnAreaScreenRadiusPx: POPULATION.spawnAreaScreenRadiusPx,
      speedMinMs: VARIATION.speedMinMs * profile.speedMult,
      speedMaxMs: VARIATION.speedMaxMs * profile.speedMult,
      opacityMin: Math.min(0.9, VARIATION.opacityMin * profile.opacityMult),
      opacityMax: Math.min(0.95, VARIATION.opacityMax * profile.opacityMult),
      updateIntervalMs: lowPerformance ? LOW_PERFORMANCE_OVERRIDES.updateIntervalMs : NORMAL_UPDATE_INTERVAL_MS,
    };
  }

  async function init(mapShim, opts = {}){
    if(!CLOUD_SHADOWS_ENABLED || !mapShim || !mapShim._whenReady){
      return { ok: false, reason: "disabled" };
    }
    lowPerformance = opts.forceLowPerformance != null ? !!opts.forceLowPerformance : detectLowPerformanceDevice();
    try{
      const blurSet = lowPerformance
        ? BLUR_VARIANTS_PX.filter(b=> b <= LOW_PERFORMANCE_OVERRIDES.blurMaxPx)
        : BLUR_VARIANTS_PX;
      const sprites = await extractCloudSprites(opts.spriteSheetUrl || SPRITE_SHEET_URL, SPRITE_DETECTION, blurSet.length ? blurSet : BLUR_VARIANTS_PX.slice(0,1));
      if(!sprites.length){
        console.warn("[CloudShadows] no se detectó ninguna forma de nube en el spritesheet — el efecto queda desactivado (el resto del mapa sigue igual).");
        return { ok: false, reason: "no_sprites" };
      }
      availableSprites = sprites.map(s=> ({ id: s.id, blurVariants: s.blurVariants.map(v=> ({ blurPx: v.blurPx })) }));
      pool = createCloudShadowPool(effectiveConfig().maxClouds);

      mapShim._whenReady(()=>{
        try{
          maplibreMap = mapShim._maplibre;
          spriteRegistry = registerSprites(maplibreMap, sprites);
          createCloudShadowLayer(maplibreMap);
          ready = true;
          startLoop();
          console.log(`[CloudShadows] listo — ${sprites.length} formas detectadas, ${spriteRegistry.size} imágenes registradas, capacidad ${effectiveConfig().maxClouds}${lowPerformance ? " (modo bajo rendimiento)" : ""}.`);
        }catch(e){
          console.error("[CloudShadows] no se pudo crear la capa de sombras — el mapa sigue funcionando igual.", e);
        }
      });
      return { ok: true, spriteCount: sprites.length, lowPerformance };
    }catch(e){
      console.error("[CloudShadows] no se pudo inicializar — el mapa sigue funcionando igual, sin sombras de nube.", e);
      return { ok: false, reason: "error", error: e };
    }
  }

  function startLoop(){
    if(tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(tick, effectiveConfig().updateIntervalMs);
  }

  function tick(){
    if(!ready || !maplibreMap || !pool) return;
    const cfg = effectiveConfig();
    pool.setCapacity(cfg.maxClouds);

    const now = Date.now();
    const zoom = maplibreMap.getZoom();
    const centerLL = maplibreMap.getCenter();
    if(!centerLL) return; // mapa todavía sin tamaño real (ej. pestaña oculta) — reintenta en el próximo tick
    const center = { lat: centerLL.lat, lng: centerLL.lng };
    const refLat = center.lat;
    // Radio del área de aparición/desaparición, en metros reales, calculado a partir de un radio
    // de PANTALLA de referencia — así se adapta solo al zoom (mismo criterio que el tamaño de los
    // sprites). Ver comentario en cloudShadows.config.js sobre por qué no se usa map.getBounds().
    const radiusM = metersPerPixel(zoom, refLat) * cfg.spawnAreaScreenRadiusPx;
    const despawnRadiusM = radiusM + cfg.despawnMarginM;

    // 1) mueve las activas y recalcula su tamaño en pantalla para el zoom/latitud actuales
    pool.getActive().forEach(slot=>{
      const elapsedS = Math.max(0, (now - (slot._lastMoveAt || slot.spawnedAt)) / 1000);
      if(elapsedS > 0){
        const next = offsetLatLng(slot.lat, slot.lng, slot.speedMs * elapsedS, slot.bearingDeg);
        slot.lat = next.lat; slot.lng = next.lng;
      }
      slot._lastMoveAt = now;
      const info = spriteRegistry.get(slot.imageId);
      slot.iconSize = info ? computeIconSize(slot.worldSizeM, info.width, zoom, refLat) : 0;
    });

    // 2) despawn (fuera del radio+margen, o cumplió su tiempo de vida) — vuelve al pool, nunca se destruye
    pool.getActive().forEach(slot=>{
      if(shouldDespawnCloud(slot, center, despawnRadiusM, now)) pool.release(slot);
    });

    // 3) spawn — nunca se detiene el flujo mientras haya cupo y pasó el intervalo
    if(shouldSpawnNow(pool, lastSpawnAt, cfg.spawnIntervalMs, now)){
      const params = randomInstanceParams(cfg, Math.random);
      const spritePick = pickRandomSprite(availableSprites, Math.random);
      if(spritePick){
        const point = pickSpawnPoint(center, radiusM, params.bearingDeg, cfg.spawnMarginM, Math.random);
        const imageId = blurImageId(spritePick.spriteId, spritePick.blurPx);
        const info = spriteRegistry.get(imageId);
        const slot = pool.acquire({
          id: `cloud_${now}_${Math.floor(Math.random()*1e6)}`,
          spriteId: spritePick.spriteId, blurPx: spritePick.blurPx, imageId,
          spriteWidth: info ? info.width : 0, spriteHeight: info ? info.height : 0,
          lat: point.lat, lng: point.lng,
          worldSizeM: params.worldSizeM, scale: params.scale, rotationDeg: params.rotationDeg,
          opacity: params.opacity, speedMs: params.speedMs, bearingDeg: params.bearingDeg,
          spawnedAt: now, lifetimeS: params.lifetimeS, _lastMoveAt: now,
          iconSize: info ? computeIconSize(params.worldSizeM, info.width, zoom, refLat) : 0,
        });
        if(slot) lastSpawnAt = now;
      }
    }

    // 4) refleja el pool en la capa real del mapa
    updateCloudShadowLayer(maplibreMap, pool.getActive());
  }

  /** Fase 2 (clima futuro): solo cambia cantidad/velocidad/opacidad vía
   *  WEATHER_PROFILES — nunca hace falta tocar este archivo para eso. */
  function setWeather(profileKey){
    if(WEATHER_PROFILES[profileKey]) currentWeather = profileKey;
  }
  function setLowPerformance(force){
    lowPerformance = !!force;
  }
  function isLowPerformance(){ return lowPerformance; }
  function isReady(){ return ready; }

  function destroy(){
    if(tickTimer) clearInterval(tickTimer);
    tickTimer = null;
    if(maplibreMap) removeCloudShadowLayer(maplibreMap);
    if(pool) pool.releaseAll();
    ready = false;
  }

  return { init, setWeather, setLowPerformance, isLowPerformance, isReady, destroy };
}

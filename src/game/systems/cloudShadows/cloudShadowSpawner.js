/* ============================================================
   CloudShadowSpawner — reglas puras de CUÁNDO y DÓNDE aparece/desaparece
   una sombra (sin tocar el mapa ni el pool directamente — cloudShadowManager
   orquesta el ciclo real, esto solo decide). Mismo criterio de conversión
   metros↔grados que ya usa main.js (111320 m por grado de latitud, longitud
   ajustada por cos(lat)) — no se reinventa la fórmula.

   El área de aparición/desaparición es un CÍRCULO centrado en el jugador
   (no map.getBounds()) — con la cámara muy inclinada (pitch alto) los
   bounds reales del mapa son un trapecio de terreno que se extiende hasta
   el horizonte (a veces de forma directamente degenerada), lo que hacía
   nacer casi todas las nubes lejísimos del jugador. Un círculo de radio en
   METROS REALES, calculado por cloudShadowManager con la misma fórmula
   metros/píxel que ya usa el tamaño de los sprites, evita ese problema por
   completo y además es geométricamente más simple: para un círculo, el
   DIÁMETRO completo siempre alcanza para salir desde cualquier punto
   interior en cualquier dirección — no hace falta la lógica de "peor caso"
   que sí hacía falta para un rectángulo.
   ============================================================ */

const METERS_PER_LAT_DEGREE = 111320;

/** Desplaza [lat,lng] `distanceM` metros en la dirección `bearingDeg`
 *  (rumbo de brújula: 0°=Norte, 90°=Este, 180°=Sur, 270°=Oeste). */
export function offsetLatLng(lat, lng, distanceM, bearingDeg){
  const rad = bearingDeg * Math.PI / 180;
  const dLat = (distanceM * Math.cos(rad)) / METERS_PER_LAT_DEGREE;
  const dLng = (distanceM * Math.sin(rad)) / (METERS_PER_LAT_DEGREE * Math.cos(lat * Math.PI/180));
  return { lat: lat + dLat, lng: lng + dLng };
}

/** Distancia aproximada en metros entre dos puntos (misma aproximación
 *  plana de offsetLatLng — de sobra para radios de cientos de metros). */
export function distanceMeters(lat1, lng1, lat2, lng2){
  const latM = (lat1 - lat2) * METERS_PER_LAT_DEGREE;
  const midLat = (lat1 + lat2) / 2;
  const lngM = (lng1 - lng2) * METERS_PER_LAT_DEGREE * Math.cos(midLat * Math.PI/180);
  return Math.sqrt(latM*latM + lngM*lngM);
}

export function isOutsideRadius(lat, lng, center, radiusM){
  return distanceMeters(lat, lng, center.lat, center.lng) > radiusM;
}

/** Punto de aparición: sobre el BORDE del círculo (a `radiusM + spawnMarginM` del centro —
 *  siempre queda dentro de `despawnRadiusM` porque spawnMarginM < despawnMarginM, así nace ya
 *  "vivo"), del lado de BARLOVENTO (contra el viento: rumbo opuesto a `bearingDeg`), con un
 *  abanico lateral de ±60° para que no todas nazcan en la misma línea recta. Así la nube entra
 *  visiblemente por el borde correcto y su deriva la lleva a cruzar cerca del jugador.
 *  (Ojo: empujar el punto por el DIÁMETRO completo, como se hacía antes, lo mandaba en promedio
 *  bien afuera de despawnRadiusM — nacía ya "muerta" y se reciclaba en el siguiente tick sin
 *  llegar a verse nunca.) */
export function pickSpawnPoint(center, radiusM, bearingDeg, spawnMarginM, rng = Math.random){
  const upwindDeg = (bearingDeg + 180) % 360;
  const lateralSpreadDeg = 60;
  const angleDeg = upwindDeg + (rng()*2 - 1) * lateralSpreadDeg;
  const distanceM = radiusM + spawnMarginM;
  return offsetLatLng(center.lat, center.lng, distanceM, angleDeg);
}

export function shouldSpawnNow(pool, lastSpawnAtMs, spawnIntervalMs, nowMs){
  return pool.hasFreeSlot() && (nowMs - (lastSpawnAtMs||0)) >= spawnIntervalMs;
}

export function shouldDespawnCloud(slot, center, despawnRadiusM, nowMs){
  if(!slot || !slot.active) return false;
  if(isOutsideRadius(slot.lat, slot.lng, center, despawnRadiusM)) return true;
  // OJO: comparar con != null, no con truthy — spawnedAt=0 (ej. epoch en un test) es válido.
  if(slot.spawnedAt != null && slot.lifetimeS && nowMs >= slot.spawnedAt + slot.lifetimeS*1000) return true;
  return false;
}

function pick(arr, rng){ return arr[Math.floor(rng() * arr.length)]; }
function lerp(a,b,t){ return a + (b-a)*t; }

/** Todas las variaciones "no visuales" de una instancia nueva (escala, rotación,
 *  opacidad, velocidad, rumbo, tiempo de vida) — el sprite/blur se elige aparte
 *  con pickRandomSprite() porque depende de qué se detectó en el spritesheet. */
export function randomInstanceParams(config, rng = Math.random){
  const scale = pick(config.scaleSteps, rng);
  const rotationDeg = (pick(config.rotationSteps, rng) + (rng()*2-1) * config.rotationVarianceDeg + 360) % 360;
  const opacity = lerp(config.opacityMin, config.opacityMax, rng());
  const speedMs = lerp(config.speedMinMs, config.speedMaxMs, rng());
  const bearingDeg = (config.baseBearingDeg + (rng()*2-1) * config.bearingVarianceDeg + 360) % 360;
  const lifetimeS = lerp(config.lifetimeMinS, config.lifetimeMaxS, rng());
  const worldSizeM = lerp(config.worldSizeMinM, config.worldSizeMaxM, rng()) * scale;
  return { scale, rotationDeg, opacity, speedMs, bearingDeg, lifetimeS, worldSizeM };
}

/** @param {Array<{id:string, blurVariants:Array<{blurPx:number}>}>} availableSprites */
export function pickRandomSprite(availableSprites, rng = Math.random){
  if(!availableSprites || !availableSprites.length) return null;
  const sprite = pick(availableSprites, rng);
  const variant = sprite.blurVariants && sprite.blurVariants.length ? pick(sprite.blurVariants, rng) : null;
  return { spriteId: sprite.id, blurPx: variant ? variant.blurPx : 0 };
}

/* ============================================================
   SOMBRAS DE NUBE — configuración central
   ------------------------------------------------------------
   Nota de lenguaje: el proyecto es JS puro (Vite + vainilla, sin build de
   TypeScript en ningún lado — ver package.json/vite.config.js), así que este
   archivo es .js con JSDoc en vez de .ts, mismo criterio que
   dailyMissions.config.js/adventurerContracts.config.js/ads.config.js.

   Nada de esto debe vivir disperso en componentes — todo lo que el sistema
   de sombras de nube necesita tunear vive acá.
   ============================================================ */

export const CLOUD_SHADOWS_ENABLED = true;

/* ---------- Detección de sprites en el spritesheet (clouds.png) ---------- */
export const SPRITE_SHEET_URL = "/new_elements/clouds.png";
export const SPRITE_DETECTION = Object.freeze({
  // Un píxel cuenta como "parte de una nube" si su alfa supera esto (0-255).
  // clouds.png tiene fondo transparente real (alfa=0) y bordes suavizados con
  // alfa intermedio — un umbral bajo conserva ese borde suave en el recorte.
  alphaThreshold: 12,
  // Descarta manchas ruido/artefactos demasiado chicas para ser una nube real.
  minComponentPixelArea: 120,
  // Margen de píxeles alrededor de cada bounding box detectado, para no
  // cortar el borde difuminado de la nube por 1-2px.
  bboxPadding: 3,
  // Conectividad para el flood-fill: 8 (incluye diagonales) evita partir en
  // dos una nube cuyo "cuello" sea diagonal de un solo píxel.
  connectivity: 8,
  // Respaldo SOLO si el archivo reemplazado no trae canal alfa real (ver comentario grande al
  // inicio de cloudShadowSpriteExtractor.js) — distancia de color (0-441, escala RGB euclídea)
  // por debajo de la cual un píxel se considera "fondo", con un degradado de rampWidth para que
  // el borde recortado no quede dentado. Si la imagen SÍ tiene transparencia real, no se usan.
  backgroundColorTolerance: 40,
  backgroundColorRampPx: 30,
});

/* ---------- Variantes de blur pre-horneadas por sprite (evita blur por GPU cada frame) ----------
   AJUSTADO tras prueba real: pedido explícito de que se note el diseño original de la imagen en
   vez de una mancha difusa — se bajó el rango a la mitad (antes 2-8px). */
export const BLUR_VARIANTS_PX = Object.freeze([1, 2, 3, 4]);

/* ---------- Población / densidad ---------- */
export const POPULATION = Object.freeze({
  maxClouds: 2,           // bajado de nuevo tras prueba real (antes 4, originalmente 8) — pedido explícito: menos nubes todavía
  spawnIntervalMs: 9000,  // cada cuánto se evalúa si toca spawnear una nueva — subido junto con maxClouds
  // El área de aparición/desaparición es un CÍRCULO centrado en el jugador (map.getCenter()),
  // no map.getBounds() — con la cámara tan inclinada (map.setPitch(65) en initMap) los bounds
  // reales son un trapecio de terreno que se extiende hasta el horizonte (a veces de forma
  // directamente degenerada a pitch alto), lo que hacía nacer casi todas las nubes lejísimos
  // del jugador, donde por perspectiva son invisibles. `spawnAreaScreenRadiusPx` es el radio DE
  // PANTALLA de referencia que se convierte a metros reales según el zoom/latitud actuales (misma
  // fórmula que ya usa el tamaño de los sprites) — así el área cubierta se adapta sola al zoom.
  // AJUSTADO tras prueba real: 900px (con el zoom por defecto 18.50) daba un radio de ~380m —
  // mucho más grande que lo que realmente se ve en pantalla sin alejar el zoom, así que las nubes
  // nacían y se reciclaban fuera de la vista (solo se notaban alejando el zoom, lo que además las
  // hacía verse chiquitas y separadas por la distancia real). 320px (~135m a zoom 18.50) las
  // mantiene dentro del área que realmente se ve por defecto.
  spawnAreaScreenRadiusPx: 320,
  despawnMarginM: 110,    // más allá del radio de aparición + este margen, se recicla la instancia
  spawnMarginM: 50,       // las nuevas aparecen esta distancia por fuera del radio (nunca "pop" a la vista)
});

/* ---------- Variación por instancia ---------- */
export const VARIATION = Object.freeze({
  scaleSteps: [0.8, 1.0, 1.2, 1.4, 1.7, 2.0],
  worldSizeMinM: 220,   // diámetro real aproximado en metros a escala 1.0 — pedido explícito: más grandes
  worldSizeMaxM: 380,
  rotationSteps: [0, 90, 180, 270],
  rotationVarianceDeg: 18, // ángulo aleatorio pequeño sumado al step
  // TEMPORAL para verificación visual — el valor final "realista" es 0.10-0.22 (ver comentario en
  // cloudShadowManager.js/README de esta carpeta). Subido bien alto ahora para confirmar de una
  // sola vez que el resto del pipeline (posición/tamaño/capa) ya funciona, sin dudar si el problema
  // es "no se ve nada" vs "se ve pero muy sutil". Bajar a 0.10-0.22 en cuanto se confirme.
  opacityMin: 0.55,
  opacityMax: 0.75,
  blurMinPx: 0,   // bajado de 2 — pedido explícito: que se note el diseño original de la nube
  blurMaxPx: 1,   // bajado de 8
  speedMinMs: 0.25,  // m/s — pedido explícito: más lentas todavía (antes 0.6-2.2)
  speedMaxMs: 0.9,
  // Subido junto con la velocidad: a esta deriva más lenta, con la vida útil anterior (90-220s)
  // muchas nubes se hubieran reciclado por tiempo de vida antes de llegar a cruzar el área
  // visible, dando un "pop" en vez de salir del cuadro. Con más tiempo de vida alcanza a cruzar.
  lifetimeMinS: 150,
  lifetimeMaxS: 320,
  baseBearingDeg: 90,        // "de oeste a este" (90° = Este en convención de rumbo 0=N)
  bearingVarianceDeg: 25,    // dirección "ligeramente distinta" por nube
});

/* ---------- Modo de bajo rendimiento (ver cloudShadowManager.js: detección heurística) ---------- */
export const LOW_PERFORMANCE_OVERRIDES = Object.freeze({
  maxClouds: 1, // bajado junto con POPULATION.maxClouds — sigue siendo menor que el máximo normal (2)
  spawnIntervalMultiplier: 1.6,
  blurMaxPx: 2, // bajado junto con BLUR_VARIANTS_PX — sigue siendo menor que el máximo normal (4)
  updateIntervalMs: 400, // el modo normal actualiza más seguido (ver cloudShadowManager)
});
export const NORMAL_UPDATE_INTERVAL_MS = 220; // cada cuánto se recalculan posiciones (no cada frame — la deriva es lenta)

/* ---------- Perfiles de clima futuro (Fase 2: solo cantidad/velocidad/opacidad, nunca reescribir el sistema) ---------- */
export const WEATHER_PROFILES = Object.freeze({
  DAY:     { maxCloudsMult: 1,   speedMult: 1,   opacityMult: 1 },
  CLOUDY:  { maxCloudsMult: 1.6, speedMult: 1.1, opacityMult: 1.3 },
  STORM:   { maxCloudsMult: 2.2, speedMult: 1.8, opacityMult: 1.7 },
  FOG:     { maxCloudsMult: 1.3, speedMult: 0.5, opacityMult: 1.1 },
  NIGHT:   { maxCloudsMult: 0.7, speedMult: 0.8, opacityMult: 0.9 },
});
export const DEFAULT_WEATHER_PROFILE = "DAY";

/* ---------- Amortiguación del tamaño frente al zoom ----------
   Pedido explícito: las sombras deben seguir inclinándose con el pitch (por eso la capa usa
   icon-pitch-alignment:'map' — ver cloudShadowRenderer.js), lo que hace INEVITABLE que su tamaño
   en pantalla varíe algo con el zoom (es perspectiva 3D real: la sombra vive "apoyada" en el
   plano del terreno, igual que el terreno mismo se ve más chico al alejar el zoom). Pero el
   cambio con la fórmula 100% coherente con el mundo era demasiado brusco entre el zoom mínimo
   permitido (17.29, ver MIN_ZOOM_ALLOWED en main.js) y el zoom por defecto (18.50) — el tamaño en
   pantalla caía a menos de la mitad. `dampingFactor` amortigua esa respuesta sin eliminarla:
   1 = 100% coherente con el mundo (comportamiento original), 0 = tamaño fijo en pantalla (pero
   entonces ya NO se inclinaría con el pitch — ver cloudShadowRenderer.js). Un valor intermedio
   sigue sintiéndose "parte del mundo" pero sin el salto brusco. */
export const SIZE_ZOOM_DAMPING = Object.freeze({
  referenceZoom: 18.50, // debe coincidir con DEFAULT_ZOOM en main.js
  dampingFactor: 0.35,
});

/* ---------- Capa MapLibre ---------- */
export const LAYER_IDS = Object.freeze({
  source: "cloud-shadows-src",
  layer: "cloud-shadows-layer",
});

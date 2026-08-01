/* ============================================================
   PUBLICIDAD (rewarded ads) — configuración central
   ------------------------------------------------------------
   Ningún Ad Unit ID ni número de límite/recompensa debe vivir disperso en un
   componente — todo lo que un diseñador o el equipo de monetización querría
   tunear sin tocar lógica vive acá. Mismo criterio que dailyMissions.config.js
   y adventurerContracts.config.js.

   Los IDs de PRODUCCIÓN se leen de variables de entorno (VITE_*, ver
   .env.production/.env.qa — nunca hardcodeados ni commiteados). Mientras no
   estemos en modo producción, se usan SIEMPRE los IDs de prueba OFICIALES que
   Google publica en su documentación (no son un secreto — están pensados
   para usarse tal cual durante desarrollo, por eso sí viven como constantes
   acá): https://developers.google.com/admob/android/test-ads
   ============================================================ */

export const ADS_SCHEMA_VERSION = 1;

/** Clave propia — no tiene forma "player_<letras>", así que siempre queda en
 *  localStorage plano (ver PLAYER_SAVE_KEY_RE en main.js), nunca pisa
 *  'player_account'/'player_<clase>'. */
export const ADS_STORAGE_KEY = "rpgGo.ads.v1";

/** Todos los placements previstos por diseño (algunos quedan `enabled:false`
 *  hasta que exista el sistema de juego que los necesita — ver PLACEMENT_CONFIG). */
export const AD_PLACEMENTS = Object.freeze([
  "BATTLE_REVIVE", "POST_BATTLE_GOLD_BONUS", "DAILY_AD_CHEST",
  "DAILY_SECOND_CHANCE", "BLACKSMITH_TIME_REDUCTION", "EXPLORATION_BONUS", "CONTRACT_BONUS",
  "FORTUNE_CHEST_SECOND_TRY", "FORTUNE_CARDS_SECOND_TRY", "FORTUNE_WHEEL_SECOND_TRY",
]);

/** Fase 1 — los que de verdad se ofrecen al jugador en esta entrega. */
export const PHASE_1_PLACEMENTS = Object.freeze(["BATTLE_REVIVE", "POST_BATTLE_GOLD_BONUS", "DAILY_AD_CHEST", "BLACKSMITH_TIME_REDUCTION"]);

// IDs de prueba OFICIALES de Google (públicos, documentados, seguros de commitear) —
// jamás se usan en producción, ver ENVIRONMENT/IS_PRODUCTION más abajo.
export const GOOGLE_TEST_APP_ID_ANDROID = "ca-app-pub-3940256099942544~3347511713";
export const GOOGLE_TEST_REWARDED_AD_UNIT_ANDROID = "ca-app-pub-3940256099942544/5224354917";

/** Lee una variable de entorno Vite (VITE_*) sin reventar si `import.meta.env`
 *  no existe (ej. corriendo bajo Node/vitest sin Vite) — nunca lanza. */
function readEnv(key){
  try{
    return (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key]) || undefined;
  }catch(e){ return undefined; }
}

const ENVIRONMENT = readEnv("VITE_ADS_ENV") || "development"; // "development" | "qa" | "production"
const IS_PRODUCTION = ENVIRONMENT === "production";

/** Interruptor de emergencia — en `false` desactiva TODA la publicidad sin
 *  romper el resto del juego (ver adsService.js: si `!enabled`, siempre se
 *  comporta como si no hubiera anuncios disponibles). */
const ADS_ENABLED = readEnv("VITE_ADS_ENABLED") !== "false";

function resolveAdUnit(envKey){
  return IS_PRODUCTION ? (readEnv(envKey) || null) : GOOGLE_TEST_REWARDED_AD_UNIT_ANDROID;
}

export const ADS_CONFIG = Object.freeze({
  provider: "admob",
  enabled: ADS_ENABLED,
  testMode: !IS_PRODUCTION,
  environment: ENVIRONMENT,
  appId: {
    android: IS_PRODUCTION ? (readEnv("VITE_ADMOB_APP_ID_ANDROID") || null) : GOOGLE_TEST_APP_ID_ANDROID,
  },
  rewardedAdUnits: Object.freeze({
    BATTLE_REVIVE: resolveAdUnit("VITE_ADMOB_UNIT_BATTLE_REVIVE"),
    POST_BATTLE_GOLD_BONUS: resolveAdUnit("VITE_ADMOB_UNIT_POST_BATTLE_GOLD_BONUS"),
    DAILY_AD_CHEST: resolveAdUnit("VITE_ADMOB_UNIT_DAILY_AD_CHEST"),
    DAILY_SECOND_CHANCE: resolveAdUnit("VITE_ADMOB_UNIT_DAILY_SECOND_CHANCE"),
    BLACKSMITH_TIME_REDUCTION: resolveAdUnit("VITE_ADMOB_UNIT_BLACKSMITH_TIME_REDUCTION"),
    EXPLORATION_BONUS: resolveAdUnit("VITE_ADMOB_UNIT_EXPLORATION_BONUS"),
    CONTRACT_BONUS: resolveAdUnit("VITE_ADMOB_UNIT_CONTRACT_BONUS"),
  }),
  // Fase 1: ni intersticiales, ni App Open, ni banners — quedan vacíos a propósito.
  interstitialAdUnits: Object.freeze({}),
  appOpenAdUnits: Object.freeze({}),
});

/** Un placement por fila — nunca reutilizar la misma unidad para dos
 *  placements (ya están separadas arriba); acá viven límites/cooldowns/tipo
 *  de recompensa. Los desactivados (`enabled:false`) son scaffolding para
 *  fases futuras — quedan definidos pero adsService nunca los ofrece. */
export const PLACEMENT_CONFIG = Object.freeze({
  BATTLE_REVIVE: Object.freeze({
    enabled: true, dailyLimit: 5, sessionLimit: 3, perBattleLimit: 1, cooldownSeconds: 0,
    rewardType: "REVIVE_FULL_HP", restoreMana: false, requiresInternet: true,
    preloadStrategy: "ON_DEFEAT", analyticsName: "battle_revive",
  }),
  POST_BATTLE_GOLD_BONUS: Object.freeze({
    enabled: true, dailyLimit: 3, sessionLimit: 2, cooldownSeconds: 600,
    rewardType: "DOUBLE_BASE_GOLD", requiresInternet: true,
    preloadStrategy: "ON_VICTORY", analyticsName: "post_battle_gold_bonus",
  }),
  DAILY_AD_CHEST: Object.freeze({
    enabled: true, dailyLimit: 2, sessionLimit: 2, cooldownSeconds: 4 * 3600,
    rewardType: "SPONSOR_CHEST", requiresInternet: true,
    preloadStrategy: "ON_PANEL_OPEN", analyticsName: "daily_ad_chest",
    rewardTable: Object.freeze({ goldMin: 100, goldMax: 250, materialChance: 0.4, potionChance: 0.15 }),
  }),
  // Se reutiliza para DOS features (fabricar en la Forja Y mejorar equipo) — ambas restan
  // rewardAmount minutos al timer en curso, `context.kind` ("craft"/"upgrade") solo es informativo.
  BLACKSMITH_TIME_REDUCTION: Object.freeze({
    enabled: true, dailyLimit: 3, sessionLimit: 3, cooldownSeconds: 0,
    rewardType: "TIME_REDUCTION_MINUTES", rewardAmount: 15, requiresInternet: true,
    preloadStrategy: "NONE", analyticsName: "blacksmith_time_reduction",
  }),
  // --- Fase 2 (preparados, desactivados) ---
  DAILY_SECOND_CHANCE: Object.freeze({
    enabled: false, dailyLimit: 1, sessionLimit: 1, cooldownSeconds: 0,
    rewardType: "SECOND_ATTEMPT", requiresInternet: true, preloadStrategy: "NONE",
    analyticsName: "daily_second_chance",
  }),
  EXPLORATION_BONUS: Object.freeze({
    enabled: false, dailyLimit: 3, sessionLimit: 3, cooldownSeconds: 1800,
    rewardType: "EXTRA_RESOURCES", requiresInternet: true, preloadStrategy: "NONE",
    analyticsName: "exploration_bonus",
  }),
  CONTRACT_BONUS: Object.freeze({
    enabled: false, dailyLimit: 1, sessionLimit: 1, cooldownSeconds: 0,
    rewardType: "CONTRACT_REWARD_BONUS", requiresInternet: true, preloadStrategy: "NONE",
    analyticsName: "contract_bonus",
  }),
  // --- Salón de la Fortuna — un placement POR minijuego (no se reutiliza
  // DAILY_SECOND_CHANCE de arriba a propósito: cada minijuego debe poder
  // ofrecer su propio segundo intento de forma independiente del otro, y un
  // placement compartido con dailyLimit:1 se lo impediría). */
  FORTUNE_CHEST_SECOND_TRY: Object.freeze({
    enabled: true, dailyLimit: 1, sessionLimit: 1, cooldownSeconds: 0,
    rewardType: "SECOND_ATTEMPT", requiresInternet: true, preloadStrategy: "ON_PANEL_OPEN",
    analyticsName: "fortune_chest_second_try",
  }),
  FORTUNE_CARDS_SECOND_TRY: Object.freeze({
    enabled: true, dailyLimit: 1, sessionLimit: 1, cooldownSeconds: 0,
    rewardType: "SECOND_ATTEMPT", requiresInternet: true, preloadStrategy: "ON_PANEL_OPEN",
    analyticsName: "fortune_cards_second_try",
  }),
  FORTUNE_WHEEL_SECOND_TRY: Object.freeze({
    enabled: true, dailyLimit: 1, sessionLimit: 1, cooldownSeconds: 0,
    rewardType: "SECOND_ATTEMPT", requiresInternet: true, preloadStrategy: "ON_PANEL_OPEN",
    analyticsName: "fortune_wheel_second_try",
  }),
});

export const GLOBAL_LIMITS = Object.freeze({
  globalDailyLimit: 8,
  globalSessionLimit: 4,
  minimumSessionMinutes: 0,
  minSecondsBetweenAnyAds: 20, // nunca dos anuncios seguidos sin gameplay real entre ellos
});

/** Feature flags de formatos que la Fase 1 NO activa — existen para que el
 *  resto del código (y quien lea esto) sepa que la arquitectura ya los prevé,
 *  sin construir nada de su UI todavía. */
export const FEATURE_FLAGS = Object.freeze({
  rewardedAdsEnabled: true,
  interstitialAdsEnabled: false,
  appOpenAdsEnabled: false,
  bannerAdsEnabled: false,
});

export const CONSENT_CONFIG = Object.freeze({
  debugGeography: readEnv("VITE_ADS_UMP_DEBUG_GEOGRAPHY") || null, // "EEA" | "NOT_EEA" | null, solo para pruebas
  testDeviceIds: (readEnv("VITE_ADS_TEST_DEVICE_IDS") || "").split(",").map(s=>s.trim()).filter(Boolean),
});

/** Nunca inferir de comportamiento — debe coincidir con lo declarado en Play
 *  Console. `null` = "no configurado todavía", el proveedor no manda el
 *  parámetro en vez de asumir un valor por defecto potencialmente incorrecto. */
export const CONTENT_SETTINGS = Object.freeze({
  isChildDirected: null,
  isUnderAgeOfConsent: null,
  maxAdContentRating: null,
});

/** La v1 aplica la recompensa por callback de cliente (single-player, storage
 *  local) — ver informe final para la limitación de seguridad que esto implica.
 *  Queda listo para prender cuando exista backend. */
export const SERVER_SIDE_VERIFICATION = Object.freeze({
  enabled: false,
  endpoint: "",
  customDataEnabled: true,
});

export const HISTORY_MAX_ENTRIES = 50;
export const MAX_PROCESSED_TRANSACTION_IDS = 200;

/** ⚠️ SOLO PARA PROBAR EN DESARROLLO — con esto en `true`, adsService usa
 *  SIEMPRE MockAdsProvider (ver mockAdsProvider.js) en vez de resolver
 *  AdMob real / NoOpAdsProvider según la plataforma. Sin esto, "Ver
 *  anuncio" nunca aparece disponible en el navegador (web) porque no hay
 *  Capacitor nativo — con el mock, el anuncio "se completa" al toque, para
 *  poder probar el flujo de segunda oportunidad (Salón de la Fortuna,
 *  Cofre del patrocinador, revivir, etc.) sin un dispositivo Android.
 *  Volver a `false` antes de publicar — en producción esto NUNCA va en `true`. */
export const DEV_FORCE_MOCK_ADS = true;

export const DEBUG = Object.freeze({
  verboseLogging: !IS_PRODUCTION,
});

/* ============================================================
   CONTRATO DEL AVENTURERO — configuración central
   ------------------------------------------------------------
   Mismo criterio que dailyMissions.config.js: todo número que un diseñador
   querría tunear sin tocar lógica vive acá, nunca disperso en componentes.
   ============================================================ */

export const ADVENTURER_CONTRACTS_SCHEMA_VERSION = 1;

/** Clave propia — no tiene forma "player_<letras>" (ver PLAYER_SAVE_KEY_RE en
 *  main.js), así que siempre queda en localStorage plano, nunca se manda al
 *  backend de saves ni pisa 'player_account'/'player_<clase>'. */
export const ADVENTURER_CONTRACTS_STORAGE_KEY = "rpgGo.adventurerContracts.v1";

/** Cada cuánto se genera un contrato nuevo (independiente del reinicio de
 *  medianoche de Misiones Diarias — ver contractClock.js). */
export const CONTRACT_GENERATION_INTERVAL_MS = 24 * 3600000;

/** Tiempo límite (deadline real, no "tiempo de juego estimado") una vez
 *  ACEPTADO el contrato, según su dificultad. "Puede durar entre uno y
 *  varios días" — ver spec. */
export const CONTRACT_DURATION_MS_BY_DIFFICULTY = Object.freeze({
  EASY: 24 * 3600000,
  NORMAL: 36 * 3600000,
  HARD: 60 * 3600000,
  ELITE: 96 * 3600000,
});

/** Un contrato AVAILABLE (todavía no aceptado) no expira solo — pero si el
 *  jugador tarda demasiado en aceptarlo, se reemplaza por uno nuevo en el
 *  siguiente ciclo de generación en vez de quedar ofreciéndose para siempre. */
export const CONTRACT_AVAILABLE_MAX_AGE_MS = CONTRACT_GENERATION_INTERVAL_MS;

export const CONTRACT_RARITIES = Object.freeze(["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"]);
export const CONTRACT_DIFFICULTIES = Object.freeze(["EASY", "NORMAL", "HARD", "ELITE"]);

/** Distribución inicial sugerida (ver spec) — pesos relativos, no tienen que sumar 100. */
export const RARITY_WEIGHTS = Object.freeze({
  COMMON: 45, UNCOMMON: 30, RARE: 17, EPIC: 7, LEGENDARY: 1,
});

/** Nadie ve una rareza para la que no califica — ni por nivel ni por
 *  reputación. "No generar contratos legendarios para jugadores nuevos". */
export const RARITY_MIN_LEVEL = Object.freeze({
  COMMON: 1, UNCOMMON: 3, RARE: 8, EPIC: 15, LEGENDARY: 25,
});
export const RARITY_MIN_REPUTATION = Object.freeze({
  COMMON: 0, UNCOMMON: 0, RARE: 100, EPIC: 300, LEGENDARY: 1500,
});

/** Rangos de reputación del gremio — ver spec. `min` inclusivo. */
export const REPUTATION_RANKS = Object.freeze([
  { key: "novato", name: "Novato", min: 0 },
  { key: "explorador", name: "Explorador", min: 100 },
  { key: "cazador", name: "Cazador", min: 300 },
  { key: "veterano", name: "Veterano", min: 700 },
  { key: "elite", name: "Élite", min: 1500 },
  { key: "leyenda", name: "Leyenda del Gremio", min: 3000 },
]);

/** No repetir la misma plantilla en días consecutivos: cuántas entradas
 *  recientes del historial se revisan para descartar candidatos repetidos. */
export const TEMPLATE_NO_REPEAT_WINDOW = 3;

export const HISTORY_MAX_ENTRIES = 20;
export const MAX_PROCESSED_EVENT_IDS = 300;

export const ANIMATION_MS = Object.freeze({
  sealStamp: 500,
  objectiveCheck: 350,
  contractComplete: 900,
  claimReward: 1100,
});

/** Colores por rareza — reutilizados por el CSS vía clase, no por JS inline. */
export const RARITY_COLOR = Object.freeze({
  COMMON: "#9aa3b5",
  UNCOMMON: "#4fd67a",
  RARE: "#4aa3e0",
  EPIC: "#c98bf0",
  LEGENDARY: "#e8c468",
});

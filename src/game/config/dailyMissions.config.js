/* ============================================================
   MISIONES DIARIAS — configuración central
   ------------------------------------------------------------
   Ningún número de recompensa/objetivo debe vivir disperso en la UI o en el
   motor: todo lo que un diseñador querría tunear sin tocar lógica vive acá.
   ============================================================ */

/** Sube esto si alguna vez cambia la FORMA del objeto guardado (no solo su
 *  contenido) — el repositorio usa esto para decidir si puede leer un save
 *  viejo tal cual o si debe descartarlo y regenerar. */
export const DAILY_MISSIONS_SCHEMA_VERSION = 1;

/** Clave propia (no pisa nada existente). A propósito NO tiene forma
 *  "player_<letras>" — esa forma es la que AppStorage redirige a la nube
 *  (ver PLAYER_SAVE_KEY_RE en main.js); esta clave siempre queda en
 *  localStorage plano, sin depender de sesión ni del backend de saves. */
export const DAILY_MISSIONS_STORAGE_KEY = "rpgGo.dailyMissions.v1";

export const DAILY_MISSION_COUNT = 10;

export const DIFFICULTY_COUNTS = Object.freeze({ EASY: 5, NORMAL: 4, ADVANCED: 1 });

/** Cuántas misiones del mismo missionType pueden coexistir en un mismo día. */
export const MAX_SAME_TYPE_PER_DAY = 2;

/** Distribución recomendada por categoría (combate / exploración / recursos / variadas).
 *  Es una meta, no una regla dura — el generador la respeta "lo mejor posible"
 *  según qué plantillas estén activas ese día. */
export const CATEGORY_TARGET_COUNTS = Object.freeze({
  combat: 4,
  exploration: 2,
  resources: 2,
  varied: 2,
});

/** Rango de oro/experiencia por dificultad, y probabilidad+rareza de material extra.
 *  Pedido explícito: que completar misiones se sienta como la mejor forma de subir de nivel — la
 *  XP de estos rangos (y de FINAL_REWARD más abajo) se multiplicó x4 respecto al diseño original. */
export const REWARD_RANGES = Object.freeze({
  EASY:     { goldMin: 80,  goldMax: 150, xpMin: 120, xpMax: 240,  materialChance: 0,    materialRarity: null },
  NORMAL:   { goldMin: 150, goldMax: 300, xpMin: 240, xpMax: 480, materialChance: 0.35, materialRarity: "common" },
  ADVANCED: { goldMin: 300, goldMax: 600, xpMin: 480, xpMax: 1000, materialChance: 0.55, materialRarity: "uncommon" },
});

/** Materiales que se pueden entregar como "material poco común/común" de recompensa —
 *  reutiliza los recursos de mundo que YA existen (madera/piedra/hierro), para no
 *  inventar un ítem nuevo que el resto del juego no sepa qué hacer con él. */
export const REWARD_MATERIAL_POOL = Object.freeze({
  common: ["wood", "stone"],
  uncommon: ["iron"],
});

/** Recompensa final del cofre diario (por completar y reclamar las 10 misiones). */
export const FINAL_REWARD = Object.freeze({
  gold: 500,
  experience: 800,
  diamonds: 2,
  materialRarity: "uncommon",
});

/** Hora local de reinicio (0 = medianoche). Ver dailyResetClock.js — centralizado
 *  para poder migrar a hora de servidor en el futuro sin tocar el resto del código. */
export const RESET_HOUR_LOCAL = 0;

export const ANIMATION_MS = Object.freeze({
  progressBar: 260,
  missionComplete: 900,
  chestOpen: 1200,
  buttonPulse: 1400,
});

/** Cuántos días de historial resumido se conservan (rachas/logros futuros). */
export const HISTORY_MAX_DAYS = 7;

/** Límite de eventIds procesados que se recuerdan por día, para evitar que la lista
 *  crezca sin límite durante una sesión muy larga. Se limpia por completo en cada
 *  reinicio diario. */
export const MAX_PROCESSED_EVENT_IDS = 500;

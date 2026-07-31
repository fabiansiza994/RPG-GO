/* ============================================================
   AUDIO — configuración central (música + efectos)
   ------------------------------------------------------------
   Archivos reales en public/sounds/ (subidos por el usuario). Nada de esto
   debe vivir disperso en componentes — todo lo que el sistema de audio
   necesita tunear vive acá, mismo criterio que cloudShadows.config.js.

   Cada pista/efecto pertenece a una CATEGORÍA (MAP/BATTLE/SHOP) — pedido
   explícito: la pantalla de Ajustes tiene una barra de volumen POR
   CATEGORÍA (sonido ambiente del mapa / sonido en batalla / sonido en
   tienda), no un único volumen general. hit.mp3 y win_theme.mp3 son
   sonidos de combate → categoría BATTLE; gold.mp3 es de la tienda → SHOP.
   ============================================================ */

export const AUDIO_ENABLED = true;

export const AUDIO_CATEGORIES = Object.freeze(["MAP", "BATTLE", "SHOP"]);

/* ---------- Pistas de música (loop, una sola sonando a la vez) ---------- */
export const MUSIC_TRACKS = Object.freeze({
  MAP: { src: "/sounds/map_theme.mp3", category: "MAP" },
  BATTLE: { src: "/sounds/battle_theme.mp3", category: "BATTLE" },
  BOSS: { src: "/sounds/boss_theme.mp3", category: "BATTLE" },
  SHOP: { src: "/sounds/shop.mp3", category: "SHOP" },
});

/* ---------- Efectos de un solo disparo (pueden solaparse entre sí) ----------
   WIN no hace loop (es un jingle corto de ~4s, no un tema de fondo) — suena una
   sola vez, superpuesto a lo que ya esté sonando, apenas aparece el modal de
   victoria (ver hookWinModalSfx en main.js). */
export const SFX_TRACKS = Object.freeze({
  HIT: { src: "/sounds/hit.mp3", category: "BATTLE" },
  WIN: { src: "/sounds/win_theme.mp3", category: "BATTLE" },
  GOLD: { src: "/sounds/gold.mp3", category: "SHOP" },
});

export const DEFAULT_CATEGORY_VOLUME = 0.5; // 0-1 — valor inicial de las 3 barras de Ajustes
// Cruce suave entre pistas de música (fade-out de la anterior + fade-in de la nueva) en vez de un
// corte seco — ver audioManager.js.
export const MUSIC_FADE_MS = 450;
export const MUSIC_FADE_STEPS = 12;

export const AUDIO_MUTE_STORAGE_KEY = "rpggo_audio_muted";
export const AUDIO_VOLUME_STORAGE_PREFIX = "rpggo_audio_vol_"; // + categoría, ej. "rpggo_audio_vol_BATTLE"

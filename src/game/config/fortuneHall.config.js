/* ============================================================
   SALÓN DE LA FORTUNA — configuración central
   ------------------------------------------------------------
   Ningún número de recompensa/probabilidad ni texto del Oráculo debe vivir
   disperso en la UI o en el motor: todo lo que un diseñador querría tunear
   sin tocar lógica vive acá. Mismo criterio que dailyMissions.config.js y
   ads.config.js.

   Filosofía del sistema (pedido explícito): el objetivo NO es regalar
   grandes premios — es que el jugador entre todos los días, tenga un
   momento breve y satisfactorio, y ocasionalmente consiga algo poco común.
   Las probabilidades de acá NUNCA se muestran al jugador.
   ============================================================ */

/** ⚠️ SOLO PARA PROBAR EN DESARROLLO — con esto en `true` el ciclo real
 *  sigue pasando tal cual lo vería un jugador (gratis -> "¿otra
 *  oportunidad?" -> anuncio o 5 diamantes), para poder probar ESE flujo
 *  completo — la única diferencia es que al terminar el intento premium el
 *  minijuego vuelve a quedar fresco al toque en vez de LOCKED, así se
 *  puede repetir el ciclo entero sin esperar al reinicio diario. Combinar
 *  con DEV_FORCE_MOCK_ADS en ads.config.js para que "Ver anuncio" también
 *  funcione en el navegador. Volver a `false` antes de publicar — el
 *  límite de 1 gratis + 1 con anuncio/diamantes por día es parte del
 *  diseño económico, no algo opcional. */
export const DEV_UNLIMITED_ATTEMPTS = true;

export const FORTUNE_HALL_SCHEMA_VERSION = 1;

/** Clave propia (no pisa nada existente). A propósito NO tiene forma
 *  "player_<letras>" — esa forma es la que AppStorage redirige a la nube
 *  (ver PLAYER_SAVE_KEY_RE en main.js); esta clave siempre queda en
 *  localStorage plano, sin depender de sesión ni del backend de saves. */
export const FORTUNE_HALL_STORAGE_KEY = "rpgGo.fortuneHall.v1";

/** Hora local de reinicio (0 = medianoche) — mismo criterio que
 *  dailyMissions.config.js/RESET_HOUR_LOCAL, ver fortuneHallResetClock.js. */
export const RESET_HOUR_LOCAL = 0;

/** Cuántos cofres/cartas se muestran por minijuego. */
export const CHEST_COUNT = 3;
export const CARD_COUNT = 5;

/** Costo en diamantes del segundo intento (alternativa a ver un anuncio). */
export const SECOND_CHANCE_DIAMOND_COST = 5;

/** Frases del Oráculo — solo ambientación, una se elige al azar cada vez que
 *  se abre el Salón (ver fortuneOracle.js). Nunca se persiste cuál salió. */
export const ORACLE_QUOTES = Object.freeze([
  "La fortuna favorece a los valientes.",
  "Hoy las runas brillan intensamente.",
  "Solo quien se atreve puede obtener grandes tesoros.",
  "El destino cambia con cada amanecer.",
  "Quizás hoy la suerte esté de tu lado.",
  "Los hilos del destino se tejen de nuevo cada día.",
  "Un pequeño gesto de coraje, una gran recompensa.",
  "Las viejas runas nunca mienten... casi nunca.",
]);

/** Distribución por categoría — pedido explícito, NUNCA mostrar al jugador.
 *  Suma 100. Oro domina para mantener la economía sana; Equipamiento es el
 *  más raro de todos. */
export const CATEGORY_WEIGHTS = Object.freeze({
  gold: 55,
  materials: 20,
  consumables: 18,
  diamonds: 5,
  equipment: 2,
});

/** Oro — probabilidad muy alta, premios pequeños. Pesos decrecientes para
 *  que 100/200 sea lo normal y 500 una sorpresa agradable, nunca la norma. */
export const GOLD_REWARD_TABLE = Object.freeze([
  { amount: 100, weight: 40 },
  { amount: 200, weight: 30 },
  { amount: 300, weight: 20 },
  { amount: 500, weight: 10 },
]);

/** Materiales — reutiliza los recursos de mundo ya existentes (wood/iron,
 *  ver WORLD_RESOURCE_KEYS en main.js), nunca un ítem nuevo. */
export const MATERIAL_REWARD_TABLE = Object.freeze([
  { materialId: "wood", quantity: 5,  weight: 35 },
  { materialId: "wood", quantity: 10, weight: 25 },
  { materialId: "iron", quantity: 5,  weight: 25 },
  { materialId: "iron", quantity: 10, weight: 15 },
]);

/** Consumibles — ids reales de ITEM_TABLE (items.js). A propósito NUNCA
 *  incluye elixir_total/mana_total (restauran 100%) — "nunca regalar
 *  consumibles extremadamente poderosos". */
export const CONSUMABLE_REWARD_TABLE = Object.freeze([
  { itemId: "potion_s", weight: 45 }, // Poción pequeña de vida
  { itemId: "potion_m", weight: 30 }, // Poción de maná (pequeña)
  { itemId: "elixir",   weight: 25 }, // Elixir mayor — la más fuerte que se permite acá
]);

/** Diamantes — MUY RAROS dentro de una categoría que ya es solo 5% del
 *  total. El premio de 5 diamantes debe ser "extremadamente raro": peso
 *  mínimo dentro de una categoría ya minoritaria. */
export const DIAMOND_REWARD_TABLE = Object.freeze([
  { amount: 1, weight: 50 },
  { amount: 2, weight: 30 },
  { amount: 3, weight: 15 },
  { amount: 5, weight: 5 },
]);

/** Equipamiento — nunca épico ni legendario (pedido explícito). Dentro del
 *  2% de la categoría, Común domina. */
export const EQUIPMENT_RARITY_WEIGHTS = Object.freeze({
  common: 65,
  uncommon: 25,
  rare: 10,
});

/** Secuencia de revelado — pensada como una línea de tiempo, no como números
 *  sueltos: cada fase le da al jugador el tiempo real que necesita para
 *  percibir esa acción (sacudida -> apertura -> leer el premio -> ver qué
 *  tenían los demás, de a uno -> pausa final antes de seguir). Ajustado
 *  a mano tras feedback de que la revelación de "los otros" pasaba
 *  instantánea y en bloque — ahora cada uno se revela por separado, con
 *  pausa entre cada uno, después de que el jugador ya leyó su propio premio. */
export const ANIMATION_MS = Object.freeze({
  chestVibrate: 550,          // sacudida de suspenso antes de que el cofre elegido se abra
  chestOpen: 550,             // brillo + haz de luz del cofre elegido al abrirse
  cardFlip: 650,              // giro de la carta elegida (debe calzar con la transición CSS de .fortune-card-inner)
  revealPopupDelay: 250,      // pausa entre "se abrió/reveló" y que aparezca el popup grande
  popupReadMs: 1500,          // cuánto queda el popup en pantalla — tiempo real para leerlo
  otherRevealStagger: 380,    // separación entre cada cofre/carta restante al revelarse, uno por uno
  afterAllRevealedPause: 900, // pausa final, ya con todo revelado, antes de ofrecer la segunda oportunidad o volver
});

/* ============================================================
   RULETA DE LA FORTUNA — un minijuego más registrado en fortuneMinigames.js
   (id "wheel"). Reutiliza fortuneHallService (reinicio diario/intentos) y
   applyFortuneHallReward/describeFortuneReward (main.js) tal cual — lo
   único propio de la ruleta es ESTA tabla (una lista plana con peso fijo
   por premio, a diferencia de chest/cards que sortean por categoría) y la
   duración/vueltas de la animación.
   ------------------------------------------------------------
   Cada entrada es UN segmento visual fijo de la rueda, en este mismo orden
   — a diferencia de "equipment" en chest/cards (que resuelve la pieza
   exacta en el momento), acá el objeto de equipo también se resuelve recién
   al girar (ver rollWheelReward en fortuneRewardService.js), pero el
   SEGMENTO siempre muestra la etiqueta genérica ("Equipo poco común"/"Equipo
   raro"), nunca el nombre del objeto puntual — el jugador recién ve cuál le
   tocó en el popup de recompensa.
   La suma de pesos acá da 100, pero rollWeighted (fortuneRewardPool.js)
   funciona igual aunque en el futuro no sume exactamente 100. */
export const FORTUNE_WHEEL_REWARDS = Object.freeze([
  { id: "gold_100",           type: "gold",        label: "100 oro",           amount: 100, weight: 30,  rarity: "common",   icon: "💰" },
  { id: "gold_200",           type: "gold",        label: "200 oro",           amount: 200, weight: 22,  rarity: "common",   icon: "💰" },
  { id: "wood_5",             type: "material",    label: "5 madera",          amount: 5, itemId: "wood",  weight: 15, rarity: "common",   icon: "🪵" },
  { id: "iron_5",             type: "material",    label: "5 hierro",          amount: 5, itemId: "iron",  weight: 12, rarity: "common",   icon: "🔩" },
  { id: "small_health_potion",type: "consumable",  label: "Poción pequeña",    itemId: "potion_s", weight: 10, rarity: "common",   icon: "🧪" },
  { id: "diamond_1",          type: "diamond",     label: "1 diamante",        amount: 1, weight: 6,   rarity: "uncommon", icon: "💎" },
  { id: "diamond_2",          type: "diamond",     label: "2 diamantes",       amount: 2, weight: 3,   rarity: "rare",     icon: "💎" },
  { id: "uncommon_equipment", type: "equipment",   label: "Equipo poco común", weight: 1.5, rarity: "uncommon", icon: "🛡️" },
  { id: "rare_equipment",     type: "equipment",   label: "Equipo raro",       weight: 0.5, rarity: "rare",     icon: "🛡️" },
]);

/** Colores de referencia por rareza para teñir cada segmento — mismos tonos
 *  que RARITY_TIERS en items.js (RARITY_BY_KEY), para que "raro" se vea
 *  igual acá que en cualquier otro lado del juego. */
export const FORTUNE_WHEEL_RARITY_COLORS = Object.freeze({
  common: "#5b6478",
  uncommon: "#2f8f52",
  rare: "#3777a8",
});

/** minRotations/maxRotations: "entre 5 y 8 vueltas" (pedido explícito).
 *  spinDurationMs: "entre 3 y 5 segundos" — 4.2s cae cómodo en el medio. */
export const FORTUNE_WHEEL_CONFIG = Object.freeze({
  minRotations: 5,
  maxRotations: 8,
  spinDurationMs: 4200,
});

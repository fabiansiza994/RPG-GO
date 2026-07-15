/* ============================================================
   EVENTOS ALEATORIOS — Mapa Vivo, Capa 3.

   Responsabilidad de este archivo: SOLO la definición de tipos de evento, los límites de
   aparición (centralizados, nunca hardcodeados en el componente visual), el ciclo de vida
   (calculado con fechas reales, nunca un timer en memoria) y el cálculo de recompensa.

   Lo que este archivo NO hace (a propósito, vive en main.js junto al resto del juego):
   - dibujar nada en el mapa;
   - calcular distancias reales del jugador (recibe una función de distancia desde afuera);
   - tocar combate, `player`, `map`, guardado, etc.

   Mismo patrón de separación que ya usa dynamicWorld.js (Capa 2) — agregar un tipo de evento
   nuevo en el futuro es una fila más en EVENT_TYPES / EVENT_REWARD_TABLES, nunca lógica repetida.
   ============================================================ */

/** Estados posibles del ciclo de vida de un evento. */
export const EVENT_STATE = {
  SCHEDULED: "scheduled", ACTIVE: "active", ENGAGED: "engaged",
  COMPLETED: "completed", FAILED: "failed", EXPIRED: "expired",
};

/** Catálogo de tipos de evento soportados — agregar uno nuevo es una fila más acá, nunca una
 *  rama de código nueva en el resto del sistema. */
export const EVENT_TYPES = {
  traveler_attacked: {
    label: "Viajero Atacado",
    unknownLabel: "Algo está pasando ahí cerca...",
    icon: "❗", unknownIcon: "❔",
    discoveryRadius: 70, interactionRadius: 40, lifespanMs: 30 * 60000,
    description: "Un viajero está rodeado de enemigos y necesita ayuda.",
    actionLabel: "Ayudar", declineLabel: null, autoEngage: false,
    enemyCount: 2,
  },
  guarded_chest: {
    label: "Cofre Custodiado",
    unknownLabel: "Algo brilla, custodiado de cerca...",
    icon: "🔒", unknownIcon: "❔",
    discoveryRadius: 60, interactionRadius: 35, lifespanMs: 40 * 60000,
    description: "Un cofre protegido por guardianes — hay que derrotarlos antes de poder abrirlo.",
    actionLabel: "Enfrentar guardianes", declineLabel: null, autoEngage: false,
    enemyCount: 2,
  },
  ambush: {
    label: "Emboscada",
    unknownLabel: "Silencio sospechoso por aquí...",
    icon: "⚠️", unknownIcon: "❔",
    discoveryRadius: 45, interactionRadius: 35, lifespanMs: 20 * 60000,
    description: "Algo se esconde entre las sombras, listo para atacar.",
    actionLabel: "Enfrentar", declineLabel: "Alejarse", autoEngage: false,
    enemyCount: 1,
  },
};

/** Límites de aparición — centralizados acá, nunca hardcodeados en el componente visual. */
export const EVENT_LIMITS = {
  maxActiveNearPlayer: 2,          // como mucho 2 eventos activos cerca a la vez
  maxSameTypeNearby: 1,            // nunca 2 del mismo tipo demasiado cerca uno del otro
  minDistanceFromPlayerM: 80,      // nunca aparece encima del jugador
  maxDistanceFromPlayerM: 350,     // ni tampoco tan lejos que no tenga sentido
  minDistanceBetweenEventsM: 90,
  minDistanceFromPoiM: 55,         // nunca se superpone con fogatas/torres/santuarios/Coliseo/NPCs
  cooldownAfterResolveMs: 3 * 60000, // pausa breve tras resolver uno, antes de que pueda salir otro
  spawnCheckChance: 0.08,          // probabilidad de que aparezca uno en cada chequeo periódico
};

/** Tabla de recompensa por tipo — cada entrada es independiente (puede salir más de una a la
 *  vez): tipo, cantidad mínima/máxima y probabilidad. Reutiliza monedas/recursos que YA existen
 *  en el juego, nunca crea nada nuevo. El objeto (si aplica) lo resuelve main.js con rollLoot(). */
export const EVENT_REWARD_TABLES = {
  traveler_attacked: [
    { type: "gold", min: 40, max: 120, chance: 1 },
    { type: "xp", min: 30, max: 90, chance: 1 },
    { type: "wood", min: 5, max: 15, chance: 0.4 },
    { type: "stone", min: 3, max: 10, chance: 0.3 },
  ],
  guarded_chest: [
    { type: "gold", min: 80, max: 200, chance: 1 },
    { type: "iron", min: 5, max: 12, chance: 0.5 },
    { type: "item", min: 1, max: 1, chance: 0.6 },
  ],
  ambush: [
    { type: "gold", min: 20, max: 60, chance: 1 },
    { type: "xp", min: 15, max: 40, chance: 1 },
  ],
};

/** Calcula la recompensa concreta UNA sola vez, al crear el evento — así recargar la página
 *  nunca hace que "se vuelvan a tirar los dados" ni entregue algo distinto la segunda vez. */
export function rollEventReward(type) {
  const table = EVENT_REWARD_TABLES[type] || [];
  const reward = {};
  table.forEach(entry => {
    if (Math.random() > entry.chance) return;
    if (entry.type === "item") { reward.item = true; return; }
    reward[entry.type] = entry.min + Math.floor(Math.random() * (entry.max - entry.min + 1));
  });
  return reward;
}

/** ¿Esta posición queda lo bastante lejos de todo lo que ya está ocupado (POIs permanentes,
 *  NPCs dinámicos, otros eventos activos)? Recibe distFn desde afuera, igual que dynamicWorld.js. */
export function isEventLocationValid(pos, occupiedPoints, distFn) {
  return !occupiedPoints.some(p => distFn(pos, p) < EVENT_LIMITS.minDistanceFromPoiM);
}

/** Arma un WorldEvent nuevo. No decide cómo se dibuja, combate, ni cómo se interactúa — eso lo
 *  hace main.js según `type`. */
export function createWorldEvent(type, pos, opts) {
  opts = opts || {};
  const def = EVENT_TYPES[type];
  const now = Date.now();
  return {
    id: opts.id || (type + "_" + now.toString(36) + Math.random().toString(36).slice(2, 7)),
    type,
    title: def.label,
    description: def.description,
    lat: pos.lat, lng: pos.lng,
    discoveryRadius: def.discoveryRadius,
    interactionRadius: def.interactionRadius,
    spawnAt: now,
    expiresAt: now + def.lifespanMs,
    state: EVENT_STATE.ACTIVE,
    objectives: opts.objectives || { guardiansDefeated: false },
    rewards: opts.reward || {},
    rewardClaimed: false,
    enemyIds: opts.enemyIds || [],
    resourceRequirements: null,
    metadata: opts.metadata || {},
  };
}

/** El estado real de un evento AHORA MISMO — se calcula con fechas reales (nunca con un timer
 *  en memoria), así sigue siendo correcto tras recargar la página. Los estados finales
 *  (completed/failed) quedan grabados y nunca "revierten" aunque no haya expirado todavía. */
export function eventStateNow(ev) {
  if (ev.state === EVENT_STATE.COMPLETED || ev.state === EVENT_STATE.FAILED) return ev.state;
  if (Date.now() >= ev.expiresAt) return EVENT_STATE.EXPIRED;
  return ev.state;
}

/** Texto cortito de cuánto le queda ("23m", "1h 4m") — se muestra solo al descubrirlo. */
export function formatEventTimeLeft(ev) {
  const ms = ev.expiresAt - Date.now();
  if (ms <= 0) return "expirado";
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

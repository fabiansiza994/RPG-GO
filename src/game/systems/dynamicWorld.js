/* ============================================================
   MUNDO DINÁMICO — Mapa Vivo, Capa 2.

   Responsabilidad de este archivo: SOLO la definición de entidades dinámicas, su ciclo de vida,
   la selección de ubicaciones candidatas, y el armado del inventario comercial rotativo.

   Lo que este archivo NO hace (a propósito, vive en main.js junto al resto del juego):
   - dibujar nada en el mapa;
   - calcular distancias reales del jugador (recibe una función de distancia desde afuera);
   - tocar `player`, `map`, guardado, etc.

   Esto separa "qué es una entidad dinámica y cuándo debería existir" de "cómo se ve y cómo se
   interactúa con ella" — para que agregar un NPC dinámico nuevo en el futuro (Herrero viajero,
   Alquimista, Domador, Cazador...) sea solo una fila nueva en DYNAMIC_ENTITY_TYPES, nunca lógica
   repetida por cada tipo.
   ============================================================ */

/** Estados posibles del ciclo de vida de una entidad dinámica. */
export const DYNAMIC_ENTITY_STATE = { SCHEDULED: "scheduled", ACTIVE: "active", EXPIRED: "expired" };

/** Catálogo de tipos de entidad dinámica soportados — agregar un tipo nuevo es una fila más acá,
 *  nunca una rama de código nueva en el resto del sistema. */
export const DYNAMIC_ENTITY_TYPES = {
  wandering_merchant: {
    label: "Mercader Ambulante",
    icon: "🧙‍♂️",
    interactionRadius: 40,
    lifespanMs: 45 * 60000, // cuánto dura activo desde que aparece
    interactionType: "trade",
  },
  // futuros (Capa 2+): traveling_blacksmith, itinerant_alchemist, tamer, hunter, rare_merchant...
};

/** Ubicaciones candidatas donde puede aparecer una entidad dinámica. Por ahora son offsets fijos
 *  alrededor del centro de la ciudad actual (pensado para la zona de prueba); más adelante pueden
 *  venir de parques/plazas/puntos públicos reales sin cambiar el resto del sistema — con que cada
 *  ubicación tenga lat/lng/zoneType/allowedEntityTypes/minDistanceFromOthersM alcanza. */
export function buildCandidateLocations(cityCenterLat, cityCenterLng) {
  const OFFSETS_M = [
    { dx: 120, dy: 80 }, { dx: -150, dy: 60 }, { dx: 80, dy: -140 },
    { dx: -100, dy: -110 }, { dx: 200, dy: -40 }, { dx: -200, dy: 120 },
  ];
  const degLatPerM = 1 / 111320;
  const degLngPerM = 1 / (111320 * Math.cos(cityCenterLat * Math.PI / 180));
  return OFFSETS_M.map((o, i) => ({
    id: "cand_" + i,
    lat: cityCenterLat + o.dy * degLatPerM,
    lng: cityCenterLng + o.dx * degLngPerM,
    zoneType: "generic",
    allowedEntityTypes: ["wandering_merchant"],
    minDistanceFromOthersM: 60,
    state: "available", // o "occupied"
  }));
}

/** ¿Esta ubicación candidata queda lo bastante lejos de los puntos ocupados (POIs permanentes,
 *  otras entidades dinámicas activas, etc.)? Recibe distFn desde afuera para no depender de cómo
 *  el juego calcula distancias reales (Haversine, etc.) — solo le importa el resultado en metros. */
export function isLocationFarEnough(loc, occupiedPoints, distFn, minDistM) {
  const min = minDistM || loc.minDistanceFromOthersM || 60;
  return !occupiedPoints.some(p => distFn(loc, p) < min);
}

/** Elige la primera ubicación candidata disponible que no quede pegada a nada — o null si ninguna
 *  sirve ahora mismo (por ejemplo, si todo el mapa cercano ya está ocupado). */
export function pickValidCandidateLocation(candidates, entityType, occupiedPoints, distFn) {
  const eligible = candidates.filter(c => c.state === "available" && (c.allowedEntityTypes||[]).includes(entityType));
  return eligible.find(c => isLocationFarEnough(c, occupiedPoints, distFn)) || null;
}

/** Arma una entidad dinámica nueva. No decide cómo se dibuja ni cómo se interactúa — eso lo hace
 *  main.js según `type` e `interactionType`. */
export function createDynamicEntity(type, location, opts) {
  opts = opts || {};
  const typeDef = DYNAMIC_ENTITY_TYPES[type];
  const now = Date.now();
  return {
    id: opts.id || (type + "_" + now.toString(36) + Math.random().toString(36).slice(2, 7)),
    type,
    name: opts.name || typeDef.label,
    sprite: typeDef.icon,
    lat: location.lat, lng: location.lng,
    locationId: location.id,
    interactionRadius: typeDef.interactionRadius,
    spawnAt: now,
    expiresAt: now + (opts.lifespanMs || typeDef.lifespanMs),
    state: DYNAMIC_ENTITY_STATE.ACTIVE,
    interactionType: opts.interactionType || typeDef.interactionType || "trade",
    metadata: opts.metadata || {},
  };
}

/** El estado real de una entidad AHORA MISMO, calculado a partir de fechas (nunca de un timer en
 *  memoria) — así sigue siendo correcto aunque se haya recargado la página entre medio. */
export function entityStateNow(entity) {
  if (Date.now() >= entity.expiresAt) return DYNAMIC_ENTITY_STATE.EXPIRED;
  if (entity.spawnAt > Date.now()) return DYNAMIC_ENTITY_STATE.SCHEDULED;
  return DYNAMIC_ENTITY_STATE.ACTIVE;
}

/** Texto cortito de cuánto le queda ("23m", "1h 4m") para mostrar solo cuando el jugador se acerca. */
export function formatEntityTimeLeft(entity) {
  const ms = entity.expiresAt - Date.now();
  if (ms <= 0) return "expirado";
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/* ---------------- Inventario comercial rotativo (genérico — no es solo para el Mercader) ---------------- */

/** Arma el inventario de una entidad de tipo comercio a partir de ítems que YA existen en el
 *  juego (nunca crea ítems nuevos) — cada uno con su propio precio, moneda, existencias, límite
 *  por jugador, descuento y rareza. `pickedItems` ya viene filtrado/elegido desde main.js
 *  (reutilizando las tablas de objetos y el generador con semilla que ya existen). */
export function buildTradeInventory(pickedItems, opts) {
  opts = opts || {};
  return pickedItems.map((entry) => {
    const item = entry.item || entry;
    const discountPct = entry.discountPct != null ? entry.discountPct : (opts.discountPct || 0);
    const basePrice = item.value || 30;
    return {
      itemId: item.id,
      item,
      price: Math.max(1, Math.round(basePrice * (1 - discountPct))),
      basePrice,
      currency: entry.currency || opts.currency || "gold",
      stock: entry.stock != null ? entry.stock : (opts.stock != null ? opts.stock : 1),
      perPlayerLimit: entry.perPlayerLimit != null ? entry.perPlayerLimit : (opts.perPlayerLimit != null ? opts.perPlayerLimit : 1),
      discountPct,
      rarity: item.rarity || "common",
      purchasedByPlayer: 0,
    };
  });
}

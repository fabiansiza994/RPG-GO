/** Capacidad del inventario como mecánica de progresión — pedido explícito: 40 espacios base,
 *  ampliable en escalones fijos hasta un máximo de 200 (no de a 1 espacio suelto como antes).
 *  El índice dentro de este arreglo es lo que se guarda como `account.inventoryCapacityTier`. */
export const INVENTORY_CAPACITY_TIERS = [40, 60, 80, 100, 120, 200];

/** Costo de subir AL tier con ese mismo índice (tier 0 no se compra, ya se empieza en él).
 *  Primeras mejoras en oro, las últimas (más caras) piden cristales — mismo criterio de "sube de
 *  moneda" que ya usaba el sistema anterior de compra de a un espacio. */
export const INVENTORY_TIER_COST = [
  null,
  { currency: "gold", cost: 400 },
  { currency: "gold", cost: 1200 },
  { currency: "gold", cost: 3000 },
  { currency: "crystal", cost: 40 },
  { currency: "crystal", cost: 120 },
];

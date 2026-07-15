/* ============================================================
   VISIBILITY ENGINE — servicio reutilizable que decide si una entidad del mundo debería
   renderizarse AHORA MISMO.

   Responsabilidad de este archivo: SOLO la decisión (sí/no se dibuja) — nunca toca el mapa, el
   DOM ni el estado del juego. Recibe todo lo que necesita por parámetro (tipo de entidad,
   distancia ya calculada, estado de la entidad) y devuelve un booleano.

   Mismo patrón de separación que dynamicWorld.js / randomEvents.js / ecosystemEngine.js.
   ============================================================ */

import { VISIBILITY_PRIORITY, VISIBILITY_DISTANCES, ENTITY_VISIBILITY } from "../config/visibility.js";

/** ¿Esta entidad debería estar VISIBLE ahora mismo? Considera como mínimo: tipo de entidad,
 *  distancia al jugador, prioridad de visibilidad y estado de la entidad.
 *
 *  `isCurrentlyRendered` + el colchón de histéresis evitan que algo aparezca y desaparezca
 *  parpadeando justo en el borde de su rango: para OCULTAR algo que ya se estaba mostrando,
 *  hay que alejarse un poco más de lo que hizo falta para que apareciera. */
export function isEntityVisible(entityType, distanceM, opts){
  opts = opts || {};
  if(opts.state === "expired" || opts.state === "completed" || opts.state === "failed") return false;
  const cfg = ENTITY_VISIBILITY[entityType];
  if(!cfg) return true; // tipo sin configurar: no se filtra (se comporta como hasta ahora)
  if(cfg.priority === VISIBILITY_PRIORITY.ALWAYS) return true;
  const range = cfg.priority === VISIBILITY_PRIORITY.MEDIUM
    ? VISIBILITY_DISTANCES.mediumDistanceM
    : VISIBILITY_DISTANCES.discoveryDistanceM;
  const effectiveRange = opts.isCurrentlyRendered ? range + VISIBILITY_DISTANCES.hysteresisM : range;
  return distanceM <= effectiveRange;
}

/** Versión en lote: dada una lista de entidades (cada una con su distancia ya calculada) y cuáles
 *  ya están dibujadas ahora mismo, devuelve cuáles hay que AGREGAR y cuáles hay que QUITAR — para
 *  que quien llama solo tenga que crear/borrar marcadores, nunca decidir el criterio. */
export function diffVisibility(entityType, entries, renderedIds){
  const toShow = [], toHide = [];
  entries.forEach(e=>{
    const isRendered = renderedIds.has(e.id);
    const visible = isEntityVisible(entityType, e.distanceM, { state: e.state, isCurrentlyRendered: isRendered });
    if(visible && !isRendered) toShow.push(e);
    else if(!visible && isRendered) toHide.push(e.id);
  });
  return { toShow, toHide };
}

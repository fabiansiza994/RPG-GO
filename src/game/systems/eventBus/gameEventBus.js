/* ============================================================
   GAME EVENT BUS — pub/sub mínimo y genérico para eventos de juego.
   ------------------------------------------------------------
   Antes de esto, cada sistema (Misiones Diarias) recibía sus eventos por una
   llamada directa `dailyMissionsService.reportEvent(...)` insertada a mano en
   cada punto de main.js. Para que el Contrato del Aventurero pueda escuchar
   EXACTAMENTE los mismos sucesos sin duplicar esos ~15 puntos de enganche,
   main.js ahora emite UNA vez acá (`gameEventBus.emit(...)`), y cada sistema
   (Misiones Diarias, Contrato del Aventurero, lo que venga después) se
   suscribe de forma independiente.

   No sabe nada de `player`, del DOM ni de ningún sistema en particular —
   solo reparte el mismo evento a quien esté escuchando.
   ============================================================ */

let eventCounter = 0;

export function createGameEventBus(){
  const listeners = new Set();

  /**
   * @param {{type:string, payload?:object, eventId?:string, dedupeKey?:string}} event
   */
  function emit(event){
    if(!event || !event.type) return;
    const enriched = {
      payload: {},
      eventId: event.eventId || `auto_${Date.now()}_${++eventCounter}`,
      timestamp: Date.now(),
      ...event,
    };
    listeners.forEach(fn=>{
      try{ fn(enriched); }
      catch(e){ console.error("[gameEventBus] un listener falló procesando", enriched.type, e); }
    });
  }

  /** @param {(event:object)=>void} fn @returns {()=>void} unsubscribe */
  function subscribe(fn){
    listeners.add(fn);
    return ()=> listeners.delete(fn);
  }

  return { emit, subscribe };
}

/** Instancia única para toda la app — mismo criterio que el resto de los
 *  "singletons" del juego (AppStorage, dailyMissionsService, etc.). */
export const gameEventBus = createGameEventBus();

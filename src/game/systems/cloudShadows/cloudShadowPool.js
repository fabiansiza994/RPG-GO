/* ============================================================
   CloudShadowPool — pool de instancias reutilizables (dominio puro, sin
   DOM/mapa). El array de slots se asigna UNA sola vez a un techo físico
   (HARD_MAX); "capacidad" (cuántos de esos slots están habilitados ahora,
   ej. por el modo de bajo rendimiento) es solo un número que sube/baja —
   nunca se crean ni destruyen objetos de nube en tiempo de juego, tal como
   pide el diseño ("evitar crear/destruir objetos continuamente").
   ============================================================ */

const HARD_MAX_SLOTS = 16; // techo físico — nunca se reasigna el array, ni con maxClouds alto en config

function makeEmptySlot(index){
  return {
    index, active: false,
    id: null, spriteId: null, imageId: null, spriteWidth: 0, spriteHeight: 0, blurPx: 0,
    lat: 0, lng: 0, worldSizeM: 0, scale: 1, rotationDeg: 0, opacity: 0,
    speedMs: 0, bearingDeg: 0,
    spawnedAt: 0, lifetimeS: 0,
    iconSize: 0, _lastMoveAt: 0,
  };
}

export function createCloudShadowPool(initialCapacity){
  const slots = Array.from({ length: HARD_MAX_SLOTS }, (_, i)=> makeEmptySlot(i));
  let capacity = Math.max(0, Math.min(initialCapacity ?? HARD_MAX_SLOTS, HARD_MAX_SLOTS));

  function poolable(){ return slots.slice(0, capacity); }

  return {
    getCapacity(){ return capacity; },
    setCapacity(n){
      capacity = Math.max(0, Math.min(n, HARD_MAX_SLOTS));
      // si la capacidad bajó (modo de bajo rendimiento), libera los slots que quedaron fuera de rango
      for(let i=capacity; i<HARD_MAX_SLOTS; i++) slots[i].active = false;
    },
    getActive(){ return poolable().filter(s=> s.active); },
    countActive(){ return poolable().reduce((n,s)=> n + (s.active?1:0), 0); },
    hasFreeSlot(){ return poolable().some(s=> !s.active); },
    /** Reutiliza el primer slot libre — nunca crea un objeto nuevo. Devuelve
     *  `null` si el pool está lleno (el spawner debe esperar al próximo ciclo). */
    acquire(initData){
      const slot = poolable().find(s=> !s.active);
      if(!slot) return null;
      Object.assign(slot, initData, { active: true });
      return slot;
    },
    release(slot){
      if(slot) slot.active = false;
    },
    releaseAll(){
      slots.forEach(s=> s.active = false);
    },
  };
}

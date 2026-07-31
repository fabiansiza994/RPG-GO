/* ============================================================
   MockAdsProvider — doble de prueba. Nunca toca un SDK real; permite a los
   tests (y a QA manual sin anuncios reales) simular cualquier desenlace:
   completado, cerrado sin recompensa, error de carga, error de reproducción,
   timeout, o la app enviada a segundo plano a mitad del anuncio.
   ============================================================ */
import { AD_ERROR_REASONS } from "./adsProvider.js";

/** @typedef {'COMPLETE'|'CLOSE_WITHOUT_REWARD'|'LOAD_ERROR'|'SHOW_ERROR'|'TIMEOUT'|'APP_BACKGROUNDED'} MockAdBehavior */

export function createMockAdsProvider(initialBehaviors = {}){
  const behaviors = { ...initialBehaviors }; // placement -> MockAdBehavior (default 'COMPLETE')
  const readyPlacements = new Set();
  let showing = false;
  let responseCounter = 0;

  function behaviorFor(placement){ return behaviors[placement] || "COMPLETE"; }

  return {
    async initialize(){ return { ok: true }; },
    isSupported(){ return true; },
    isReady(placement){ return readyPlacements.has(placement); },

    async loadRewarded(placement){
      const behavior = behaviorFor(placement);
      if(behavior === "LOAD_ERROR"){ readyPlacements.delete(placement); return { ok: false, reason: AD_ERROR_REASONS.LOAD_ERROR }; }
      readyPlacements.add(placement);
      return { ok: true };
    },

    async preload(placement){ await this.loadRewarded(placement); },

    async showRewarded(placement){
      if(showing) return { ok: false, reason: AD_ERROR_REASONS.ALREADY_SHOWING };
      if(!readyPlacements.has(placement)) return { ok: false, reason: AD_ERROR_REASONS.NOT_INITIALIZED };
      showing = true;
      readyPlacements.delete(placement); // el anuncio se consume al mostrarse, como el SDK real
      const behavior = behaviorFor(placement);
      try{
        if(behavior === "SHOW_ERROR") return { ok: false, reason: AD_ERROR_REASONS.SHOW_ERROR };
        if(behavior === "TIMEOUT") return { ok: false, reason: AD_ERROR_REASONS.TIMEOUT };
        if(behavior === "APP_BACKGROUNDED") return { ok: false, reason: AD_ERROR_REASONS.APP_BACKGROUNDED };
        if(behavior === "CLOSE_WITHOUT_REWARD") return { ok: false, reason: AD_ERROR_REASONS.CLOSED_WITHOUT_REWARD };
        return { ok: true, adResponseId: `mock_${Date.now()}_${++responseCounter}`, rewardType: "REWARD", rewardAmount: 1 };
      } finally {
        showing = false;
      }
    },

    async getConsentStatus(){ return { status: "OBTAINED", canRequestAds: true, isPrivacyOptionsRequired: true }; },
    async requestConsent(){ return { status: "OBTAINED", canRequestAds: true }; },
    async openPrivacyOptions(){ /* no-op */ },
    async destroy(){ readyPlacements.clear(); },

    // --- Solo para tests: nunca se llama desde código de producción ---
    setBehavior(placement, behavior){ behaviors[placement] = behavior; },
  };
}

/* ============================================================
   NoOpAdsProvider — usado en navegador (web/PWA), o cuando ADS_CONFIG.enabled
   es false. Cumple el mismo contrato que AdMobAdsProvider pero nunca hay
   publicidad disponible — sin generar errores ni romper el resto del juego.
   Esto es lo que garantiza "la versión web debe seguir funcionando aunque la
   publicidad solo exista en Android": el resto del código llama a las mismas
   funciones sin ninguna rama especial para "estoy en la web".
   ============================================================ */
import { AD_ERROR_REASONS } from "./adsProvider.js";

export function createNoOpAdsProvider(){
  return {
    async initialize(){ return { ok: true, reason: AD_ERROR_REASONS.NOT_SUPPORTED }; },
    isSupported(){ return false; },
    isReady(){ return false; },
    async loadRewarded(){ return { ok: false, reason: AD_ERROR_REASONS.NOT_SUPPORTED }; },
    async showRewarded(){ return { ok: false, reason: AD_ERROR_REASONS.NOT_SUPPORTED }; },
    async preload(){ /* no-op */ },
    async getConsentStatus(){ return { status: "NOT_REQUIRED", canRequestAds: false, isPrivacyOptionsRequired: false }; },
    async requestConsent(){ return { status: "NOT_REQUIRED", canRequestAds: false }; },
    async openPrivacyOptions(){ /* no-op */ },
    async destroy(){ /* no-op */ },
  };
}

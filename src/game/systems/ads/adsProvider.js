/* ============================================================
   AdsProvider — contrato central. Ningún componente ni caso de uso debe
   depender del SDK de AdMob directo: todos hablan con un objeto que cumple
   esta forma, sin importar si por debajo hay AdMob real, nada (web) o un
   doble de prueba.

   @typedef {Object} AdsProvider
   @property {() => Promise<{ok:boolean, reason?:string}>} initialize
   @property {() => boolean} isSupported
   @property {(placement:string) => boolean} isReady
   @property {(placement:string) => Promise<{ok:boolean, reason?:string}>} loadRewarded
   @property {(placement:string, context:object) => Promise<{ok:boolean, reason?:string, adResponseId?:string, rewardType?:string, rewardAmount?:number}>} showRewarded
   @property {(placement:string) => Promise<void>} preload
   @property {() => Promise<{status:string, canRequestAds:boolean, isPrivacyOptionsRequired:boolean}>} getConsentStatus
   @property {(options?:object) => Promise<{status:string, canRequestAds:boolean}>} requestConsent
   @property {() => Promise<void>} openPrivacyOptions
   @property {() => Promise<void>} destroy
   ------------------------------------------------------------
   Motivo de reusar `Capacitor.isNativePlatform()` acá (en vez de, por
   ejemplo, mirar `ADS_CONFIG.provider`): es EXACTAMENTE el mismo criterio ya
   establecido por src/game/systems/nativeGeolocation.js para decidir
   nativo-vs-web — no inventamos un segundo mecanismo de detección.
   ============================================================ */
import { Capacitor } from "@capacitor/core";
import { ADS_CONFIG } from "../../config/ads.config.js";
import { createNoOpAdsProvider } from "./noOpAdsProvider.js";

/** Motivos de fallo estandarizados — mismo vocabulario en las 3 implementaciones,
 *  así el resto del código nunca tiene que ramificar por proveedor. */
export const AD_ERROR_REASONS = Object.freeze({
  NOT_SUPPORTED: "NOT_SUPPORTED",
  NOT_INITIALIZED: "NOT_INITIALIZED",
  NO_AD_UNIT: "NO_AD_UNIT",
  NO_FILL: "NO_FILL",
  LOAD_ERROR: "LOAD_ERROR",
  SHOW_ERROR: "SHOW_ERROR",
  TIMEOUT: "TIMEOUT",
  CLOSED_WITHOUT_REWARD: "CLOSED_WITHOUT_REWARD",
  NO_CONNECTION: "NO_CONNECTION",
  CONSENT_REQUIRED: "CONSENT_REQUIRED",
  ALREADY_SHOWING: "ALREADY_SHOWING",
  APP_BACKGROUNDED: "APP_BACKGROUNDED",
});

export function isNativeAdsPlatform(){
  return !!(Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
}

/**
 * Elige la implementación correcta. El import de AdMobAdsProvider es
 * DINÁMICO a propósito: en un build/sesión web, ese código (y el SDK nativo
 * que envuelve) ni siquiera se descarga — Vite lo separa en su propio chunk,
 * que solo se pide cuando de verdad estamos dentro del APK. Así "la versión
 * web debe seguir funcionando aunque la publicidad solo exista en Android"
 * no depende de que nadie recuerde no llamar al proveedor: el código nativo
 * nunca llega a cargarse en el navegador.
 */
export async function createAdsProvider({ forceMock = false, mockOptions } = {}){
  if(forceMock){
    const { createMockAdsProvider } = await import("./mockAdsProvider.js");
    return createMockAdsProvider(mockOptions);
  }
  if(!ADS_CONFIG.enabled || !isNativeAdsPlatform()){
    return createNoOpAdsProvider();
  }
  try{
    const { createAdMobAdsProvider } = await import("./admobAdsProvider.js");
    return createAdMobAdsProvider();
  }catch(e){
    console.warn("[ADS] no se pudo cargar el proveedor de AdMob — se usa NoOpAdsProvider.", e);
    return createNoOpAdsProvider();
  }
}

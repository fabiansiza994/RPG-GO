/* ============================================================
   Analítica de publicidad — desacoplada del proveedor. adsService emite
   estos eventos; quien quiera un adaptador real (Firebase, etc.) se
   suscribe acá, sin que el resto del módulo sepa que existe.

   Nunca se registran identificadores publicitarios, ubicación exacta ni
   datos personales — sanitizeProperties() los descarta aunque alguien los
   pase por error.
   ============================================================ */
import { DEBUG } from "../../config/ads.config.js";

export const AD_ANALYTICS_EVENTS = Object.freeze({
  OFFER_SHOWN: "ad_offer_shown",
  OFFER_CLICKED: "ad_offer_clicked",
  LOAD_STARTED: "ad_load_started",
  LOADED: "ad_loaded",
  LOAD_FAILED: "ad_load_failed",
  SHOW_STARTED: "ad_show_started",
  IMPRESSION: "ad_impression",
  REWARD_EARNED: "ad_reward_earned",
  REWARD_APPLIED: "ad_reward_applied",
  CLOSED: "ad_closed",
  SHOW_FAILED: "ad_show_failed",
  OFFER_DECLINED: "ad_offer_declined",
  DAILY_LIMIT_REACHED: "ad_daily_limit_reached",
  SESSION_LIMIT_REACHED: "ad_session_limit_reached",
  CONSENT_UPDATED: "ad_consent_updated",
});

// Nunca deben viajar en las propiedades de un evento — se descartan aunque lleguen por error.
const SENSITIVE_KEYS = ["advertisingId", "gaid", "idfa", "deviceId", "email", "name", "gpsLat", "gpsLng", "lat", "lng"];

function sanitizeProperties(properties){
  if(!properties) return {};
  const safe = {};
  Object.keys(properties).forEach(key=>{
    if(SENSITIVE_KEYS.includes(key)) return;
    safe[key] = properties[key];
  });
  return safe;
}

const listeners = new Set();

export function trackAdEvent(eventName, properties = {}){
  const event = { eventName, properties: sanitizeProperties(properties), timestamp: Date.now() };
  if(DEBUG.verboseLogging) console.log(`[ADS][analytics] ${eventName}`, event.properties);
  listeners.forEach(fn=>{ try{ fn(event); }catch(e){ console.error("[ADS][analytics] listener falló", e); } });
  return event;
}

export function subscribeAdAnalytics(fn){
  listeners.add(fn);
  return ()=> listeners.delete(fn);
}

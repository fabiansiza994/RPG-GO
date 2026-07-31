/* ============================================================
   AdMobAdsProvider — implementación real sobre @capacitor-community/admob
   (Capacitor 8 / Google Mobile Ads SDK). Usado SOLO dentro del APK Android
   (ver adsProvider.js: isNativeAdsPlatform()).

   Nota de diseño importante: el plugin expone un único "slot" de rewarded ad
   (prepareRewardVideoAd/showRewardVideoAd sin id de instancia) — no soporta
   varios anuncios cargados en simultáneo por placement. Por eso acá se
   trackea un solo `readyPlacement` a la vez, no un Set — coincide además con
   el pedido explícito de "nunca permitir dos anuncios simultáneos".

   La recompensa SOLO se confirma con el evento `Rewarded` del SDK (nunca con
   el simple cierre/"Dismissed" del anuncio) — ver showRewarded().
   ============================================================ */
import { AdMob, RewardAdPluginEvents, MaxAdContentRating } from "@capacitor-community/admob";
import { ADS_CONFIG, CONSENT_CONFIG, CONTENT_SETTINGS } from "../../config/ads.config.js";
import { AD_ERROR_REASONS } from "./adsProvider.js";

const MAX_AD_CONTENT_RATING_MAP = {
  G: MaxAdContentRating.General,
  PG: MaxAdContentRating.ParentalGuidance,
  T: MaxAdContentRating.Teen,
  MA: MaxAdContentRating.MatureAudience,
};

export function createAdMobAdsProvider(){
  let initialized = false;
  let readyPlacement = null;
  let showing = false;

  async function initialize(){
    if(initialized) return { ok: true };
    try{
      const options = {
        initializeForTesting: !!ADS_CONFIG.testMode,
        testingDevices: CONSENT_CONFIG.testDeviceIds,
      };
      if(CONTENT_SETTINGS.isChildDirected != null) options.tagForChildDirectedTreatment = !!CONTENT_SETTINGS.isChildDirected;
      if(CONTENT_SETTINGS.isUnderAgeOfConsent != null) options.tagForUnderAgeOfConsent = !!CONTENT_SETTINGS.isUnderAgeOfConsent;
      if(CONTENT_SETTINGS.maxAdContentRating && MAX_AD_CONTENT_RATING_MAP[CONTENT_SETTINGS.maxAdContentRating]){
        options.maxAdContentRating = MAX_AD_CONTENT_RATING_MAP[CONTENT_SETTINGS.maxAdContentRating];
      }
      await AdMob.initialize(options);
      initialized = true;
      return { ok: true };
    }catch(e){
      return { ok: false, reason: AD_ERROR_REASONS.NOT_INITIALIZED, errorMessage: e && e.message };
    }
  }

  function isSupported(){ return true; }
  function isReady(placement){ return readyPlacement === placement; }

  async function loadRewarded(placement){
    if(!initialized) return { ok: false, reason: AD_ERROR_REASONS.NOT_INITIALIZED };
    const adId = ADS_CONFIG.rewardedAdUnits[placement];
    if(!adId) return { ok: false, reason: AD_ERROR_REASONS.NO_AD_UNIT };
    try{
      await AdMob.prepareRewardVideoAd({ adId, isTesting: !!ADS_CONFIG.testMode });
      readyPlacement = placement;
      return { ok: true };
    }catch(e){
      if(readyPlacement === placement) readyPlacement = null;
      return { ok: false, reason: AD_ERROR_REASONS.LOAD_ERROR, errorMessage: e && e.message };
    }
  }

  async function preload(placement){
    if(readyPlacement === placement || showing) return;
    await loadRewarded(placement);
  }

  /** Confirma la recompensa SOLO por el evento Rewarded del SDK — nunca por
   *  el cierre del anuncio ni por la mera resolución de showRewardVideoAd(). */
  async function showRewarded(placement){
    if(showing) return { ok: false, reason: AD_ERROR_REASONS.ALREADY_SHOWING };
    if(readyPlacement !== placement) return { ok: false, reason: AD_ERROR_REASONS.NOT_INITIALIZED };
    showing = true;
    readyPlacement = null; // se consume al mostrarse, igual que el SDK real

    return new Promise((resolve)=>{
      let settled = false;
      const handles = [];
      const cleanup = ()=>{ handles.forEach(h=> h && h.remove && h.remove()); showing = false; };
      const settle = (result)=>{
        if(settled) return;
        settled = true;
        cleanup();
        resolve(result);
      };

      Promise.all([
        AdMob.addListener(RewardAdPluginEvents.Rewarded, (item)=>{
          settle({ ok: true, adResponseId: `${placement}_${Date.now()}`, rewardType: item && item.type, rewardAmount: item && item.amount });
        }),
        AdMob.addListener(RewardAdPluginEvents.FailedToShow, (err)=>{
          settle({ ok: false, reason: AD_ERROR_REASONS.SHOW_ERROR, errorMessage: err && err.message });
        }),
        AdMob.addListener(RewardAdPluginEvents.Dismissed, ()=>{
          // Se cierra sin que haya llegado (todavía) el evento Rewarded: nunca se
          // interpreta como recompensa ganada — ver regla explícita del diseño.
          settle({ ok: false, reason: AD_ERROR_REASONS.CLOSED_WITHOUT_REWARD });
        }),
      ]).then(listenerHandles=>{
        handles.push(...listenerHandles);
      });

      AdMob.showRewardVideoAd().catch(e=>{
        settle({ ok: false, reason: AD_ERROR_REASONS.SHOW_ERROR, errorMessage: e && e.message });
      });
    });
  }

  async function getConsentStatus(){
    try{
      const info = await AdMob.requestConsentInfo({
        debugGeography: CONSENT_CONFIG.debugGeography || undefined,
        testDeviceIdentifiers: CONSENT_CONFIG.testDeviceIds,
      });
      return {
        status: info.status,
        canRequestAds: !!info.canRequestAds,
        isPrivacyOptionsRequired: info.privacyOptionsRequirementStatus === "REQUIRED",
      };
    }catch(e){
      return { status: "UNKNOWN", canRequestAds: false, isPrivacyOptionsRequired: false };
    }
  }

  async function requestConsent(){
    try{
      const info = await AdMob.showConsentForm();
      return { status: info.status, canRequestAds: !!info.canRequestAds };
    }catch(e){
      return { status: "UNKNOWN", canRequestAds: false };
    }
  }

  async function openPrivacyOptions(){
    try{ await AdMob.showPrivacyOptionsForm(); }catch(e){ /* el jugador puede cerrar el juego mientras se muestra — no es un error del juego */ }
  }

  async function destroy(){
    readyPlacement = null;
    showing = false;
  }

  return { initialize, isSupported, isReady, loadRewarded, showRewarded, preload, getConsentStatus, requestConsent, openPrivacyOptions, destroy };
}

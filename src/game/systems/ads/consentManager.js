/* ============================================================
   ConsentManager — orquesta el flujo de consentimiento (Google UMP) sobre un
   AdsProvider ya creado. No habla con el SDK directo: usa
   getConsentStatus()/requestConsent()/openPrivacyOptions() del provider —
   así funciona igual con AdMobAdsProvider, NoOpAdsProvider o MockAdsProvider
   sin ninguna rama especial acá.

   Flujo esperado (ver adsService.init()):
     1. requestConsentInfoUpdate()
     2. si el status es REQUIRED, loadAndShowConsentFormIfRequired()
     3. canRequestAds() decide si el resto del módulo puede pedir anuncios
     4. isPrivacyOptionsRequired() decide si mostrar la entrada de
        "Opciones de privacidad de anuncios" en Configuración > Privacidad
   ============================================================ */

const IDLE_INFO = Object.freeze({ status: "UNKNOWN", canRequestAds: false, isPrivacyOptionsRequired: false });

export function createConsentManager(adsProvider){
  let lastInfo = { ...IDLE_INFO };

  async function requestConsentInfoUpdate(){
    try{
      lastInfo = await adsProvider.getConsentStatus();
    }catch(e){
      lastInfo = { ...IDLE_INFO };
    }
    return lastInfo;
  }

  /** Solo muestra el formulario si el SDK dice que hace falta — nunca un
   *  checkbox propio como sustituto (pedido explícito del diseño). */
  async function loadAndShowConsentFormIfRequired(){
    if(lastInfo.status === "UNKNOWN") await requestConsentInfoUpdate();
    if(lastInfo.status !== "REQUIRED") return lastInfo;
    try{
      const result = await adsProvider.requestConsent();
      lastInfo = { ...lastInfo, status: result.status, canRequestAds: result.canRequestAds };
    }catch(e){
      // si el formulario falla, no bloqueamos el juego — simplemente no se podrán pedir anuncios.
    }
    return lastInfo;
  }

  function canRequestAds(){ return !!lastInfo.canRequestAds; }
  function isPrivacyOptionsRequired(){ return !!lastInfo.isPrivacyOptionsRequired; }
  function getStatus(){ return lastInfo.status; }

  async function showPrivacyOptionsForm(){
    await adsProvider.openPrivacyOptions();
    await requestConsentInfoUpdate(); // el jugador pudo cambiar su elección desde el formulario
  }

  function resetForTesting(){
    lastInfo = { ...IDLE_INFO };
  }

  return {
    requestConsentInfoUpdate, loadAndShowConsentFormIfRequired,
    canRequestAds, isPrivacyOptionsRequired, getStatus,
    showPrivacyOptionsForm, resetForTesting,
  };
}

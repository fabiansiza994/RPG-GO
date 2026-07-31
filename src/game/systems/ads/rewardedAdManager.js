/* ============================================================
   RewardedAdManager — máquina de estados por placement sobre un AdsProvider
   ya creado. Responsabilidades: precargar, no cargar dos veces a la vez,
   expirar anuncios cargados hace demasiado, reintentar con backoff, y no
   bloquear la UI nunca (todo es async, ningún método espera al jugador).

   Estados: IDLE, LOADING, READY, SHOWING, EARNED, CLOSED, FAILED, EXPIRED.
   ============================================================ */

const AD_EXPIRY_MS = 55 * 60000; // los rewarded ads del SDK real dejan de ser válidos ~1h después de cargados
const BACKOFF_BASE_MS = 2000;
const MAX_RETRIES = 3;

function freshState(placement){
  return { placement, status: "IDLE", loadedAt: undefined, expiresAt: undefined, retryCount: 0, lastError: undefined };
}

export function createRewardedAdManager(adsProvider){
  const states = {};
  const loadingPromises = {}; // placement -> Promise en curso, para no disparar dos cargas a la vez

  function getState(placement){
    if(!states[placement]) states[placement] = freshState(placement);
    return states[placement];
  }

  function isReady(placement){
    const s = getState(placement);
    if(s.status !== "READY") return false;
    if(s.expiresAt && Date.now() >= s.expiresAt){
      s.status = "EXPIRED";
      return false;
    }
    return adsProvider.isReady(placement);
  }

  async function load(placement){
    if(isReady(placement)) return { ok: true };
    const s = getState(placement);
    if(s.status === "LOADING") return loadingPromises[placement] || { ok: false, reason: "ALREADY_LOADING" };
    if(s.status === "SHOWING") return { ok: false, reason: "ALREADY_SHOWING" };

    s.status = "LOADING";
    const promise = adsProvider.loadRewarded(placement).then(result=>{
      if(result.ok){
        s.status = "READY";
        s.loadedAt = Date.now();
        s.expiresAt = Date.now() + AD_EXPIRY_MS;
        s.retryCount = 0;
        s.lastError = undefined;
      } else {
        s.status = "FAILED";
        s.lastError = result.reason;
        s.retryCount = (s.retryCount||0) + 1;
      }
      delete loadingPromises[placement];
      return result;
    });
    loadingPromises[placement] = promise;
    return promise;
  }

  /** Igual que load(), pero si falla reintenta solo (backoff exponencial,
   *  tope MAX_RETRIES) sin que quien llamó tenga que esperar el reintento —
   *  se dispara en segundo plano y el próximo isReady()/load() ya lo ve. */
  async function loadWithBackoff(placement){
    const result = await load(placement);
    const s = getState(placement);
    if(!result.ok && s.retryCount <= MAX_RETRIES){
      const delay = BACKOFF_BASE_MS * (2 ** (s.retryCount - 1));
      setTimeout(()=> { load(placement); }, delay);
    }
    return result;
  }

  async function show(placement, context){
    const s = getState(placement);
    if(s.status === "SHOWING") return { ok: false, reason: "ALREADY_SHOWING" };
    if(!isReady(placement)) return { ok: false, reason: "NOT_READY" };
    s.status = "SHOWING";
    const result = await adsProvider.showRewarded(placement, context);
    if(result.ok) s.status = "EARNED";
    else if(result.reason === "CLOSED_WITHOUT_REWARD") s.status = "CLOSED";
    else { s.status = "FAILED"; s.lastError = result.reason; }
    // El anuncio ya se consumió (ganado, cerrado o fallido) — libera el slot
    // para que el próximo preload arranque limpio desde IDLE.
    states[placement] = freshState(placement);
    return result;
  }

  function getStatus(placement){ return { ...getState(placement) }; }

  function release(placement){ states[placement] = freshState(placement); }

  return { load, loadWithBackoff, show, isReady, getStatus, release };
}

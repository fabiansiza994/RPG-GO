/* ============================================================
   AudioManager — música (loop, cruce suave entre pistas) + efectos de un solo
   disparo (hit/gold/win), con volumen INDEPENDIENTE por categoría (MAP/
   BATTLE/SHOP — ver audio.config.js), controlable desde Ajustes. Es la única
   pieza que main.js debería importar de este sistema; toda la config vive en
   game/config/audio.config.js.

   Por qué UN solo <audio> para música (no un pool): solo puede sonar una
   pista de música a la vez (MAP/BATTLE/BOSS/SHOP son mutuamente excluyentes),
   así que no hace falta más que eso + un fade-out/fade-in corto al cambiar.

   Por qué SFX usa `new Audio(url)` en cada disparo (no un elemento
   reutilizado): hit.mp3 puede sonar varias veces seguidas muy rápido (golpe
   tuyo + golpe del enemigo casi al mismo tiempo) — reusar un solo elemento
   cortaría el sonido anterior a la mitad. Son archivos cortos, así que el
   costo de crear una instancia por disparo es insignificante.

   Política de autoplay de los navegadores: `.play()` puede rechazar la
   promesa si todavía no hubo ningún gesto real del usuario en la página. Acá
   se ignora ese rechazo (no es un error real) y se reintenta la música en el
   próximo gesto (click/touch) vía `retryOnNextGesture`.
   ============================================================ */
import {
  AUDIO_ENABLED, MUSIC_TRACKS, SFX_TRACKS, DEFAULT_CATEGORY_VOLUME,
  MUSIC_FADE_MS, MUSIC_FADE_STEPS, AUDIO_MUTE_STORAGE_KEY, AUDIO_VOLUME_STORAGE_PREFIX,
} from "../../config/audio.config.js";

function readStoredMuted(){
  try{ return localStorage.getItem(AUDIO_MUTE_STORAGE_KEY) === "1"; }
  catch(e){ return false; }
}
function writeStoredMuted(muted){
  try{ localStorage.setItem(AUDIO_MUTE_STORAGE_KEY, muted ? "1" : "0"); }
  catch(e){ /* almacenamiento no disponible (modo privado, etc.) — no es crítico */ }
}
function readStoredVolume(category){
  try{
    const raw = localStorage.getItem(AUDIO_VOLUME_STORAGE_PREFIX + category);
    if(raw == null) return DEFAULT_CATEGORY_VOLUME;
    const n = parseFloat(raw);
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : DEFAULT_CATEGORY_VOLUME;
  }catch(e){ return DEFAULT_CATEGORY_VOLUME; }
}
function writeStoredVolume(category, vol){
  try{ localStorage.setItem(AUDIO_VOLUME_STORAGE_PREFIX + category, String(vol)); }
  catch(e){ /* no es crítico */ }
}

export function createAudioManager(){
  let musicEl = null;
  let currentMusicKey = null;
  let muted = readStoredMuted();
  const categoryVolumes = {
    MAP: readStoredVolume("MAP"), BATTLE: readStoredVolume("BATTLE"), SHOP: readStoredVolume("SHOP"),
  };
  let fadeTimer = null;
  let pendingRetry = false;

  function effectiveVolumeFor(category){
    if(muted) return 0;
    const v = categoryVolumes[category];
    return v != null ? v : DEFAULT_CATEGORY_VOLUME;
  }
  /** Volumen "objetivo" de lo que está sonando AHORA (según su categoría) — 0 si no hay nada. */
  function currentTargetVolume(){
    const meta = currentMusicKey && MUSIC_TRACKS[currentMusicKey];
    return meta ? effectiveVolumeFor(meta.category) : 0;
  }

  function init(){
    if(!AUDIO_ENABLED || musicEl) return;
    musicEl = new Audio();
    musicEl.loop = true;
    musicEl.volume = 0;
    // Si el navegador bloqueó el primer intento de reproducir (falta un gesto real del usuario
    // todavía), se reintenta apenas llegue el próximo click/touch en cualquier parte de la página.
    const retry = ()=>{
      if(pendingRetry && musicEl && musicEl.paused && currentMusicKey){
        musicEl.play().catch(()=>{});
      }
    };
    document.addEventListener("click", retry, {passive:true});
    document.addEventListener("touchstart", retry, {passive:true});
  }

  function clearFade(){
    if(fadeTimer){ clearInterval(fadeTimer); fadeTimer = null; }
  }

  /** Baja el volumen actual a 0 en MUSIC_FADE_MS, ejecuta `onDone`, y de ahí en más queda a cargo
   *  de quien llamó (normalmente: cambiar el src y volver a subir el volumen). */
  function fadeOutThen(onDone){
    if(!musicEl){ onDone(); return; }
    clearFade();
    const startVol = musicEl.volume;
    if(startVol <= 0){ onDone(); return; }
    let step = 0;
    fadeTimer = setInterval(()=>{
      step++;
      musicEl.volume = Math.max(0, startVol * (1 - step / MUSIC_FADE_STEPS));
      if(step >= MUSIC_FADE_STEPS){ clearFade(); onDone(); }
    }, MUSIC_FADE_MS / MUSIC_FADE_STEPS);
  }

  function fadeIn(){
    if(!musicEl) return;
    clearFade();
    const target = currentTargetVolume();
    musicEl.volume = 0;
    if(target <= 0) return;
    let step = 0;
    fadeTimer = setInterval(()=>{
      step++;
      musicEl.volume = Math.min(target, target * step / MUSIC_FADE_STEPS);
      if(step >= MUSIC_FADE_STEPS) clearFade();
    }, MUSIC_FADE_MS / MUSIC_FADE_STEPS);
  }

  /** Cambia a la pista `key` (una de MUSIC_TRACKS) con un cruce suave — no hace nada si esa pista
   *  ya es la que está sonando (idempotente, seguro de llamar seguido desde varios lugares). */
  function playMusic(key){
    if(!AUDIO_ENABLED || !musicEl) return;
    const meta = MUSIC_TRACKS[key];
    if(!meta || key === currentMusicKey) return;
    currentMusicKey = key;
    fadeOutThen(()=>{
      musicEl.src = meta.src;
      musicEl.currentTime = 0;
      pendingRetry = false;
      const playPromise = musicEl.play();
      if(playPromise && playPromise.catch){
        playPromise.catch(()=>{ pendingRetry = true; }); // bloqueado por autoplay — se reintenta en el próximo gesto
      }
      fadeIn();
    });
  }

  function stopMusic(){
    currentMusicKey = null;
    if(!musicEl) return;
    fadeOutThen(()=>{ musicEl.pause(); });
  }

  /** Efecto de un solo disparo (HIT/GOLD/WIN) — no interrumpe la música ni a otros efectos en
   *  curso, y respeta el volumen de SU categoría (no el de la música que esté sonando en ese momento). */
  function playSfx(key){
    if(!AUDIO_ENABLED) return;
    const meta = SFX_TRACKS[key];
    if(!meta) return;
    const vol = effectiveVolumeFor(meta.category);
    if(vol <= 0) return;
    try{
      const sfx = new Audio(meta.src);
      sfx.volume = vol;
      sfx.play().catch(()=>{}); // bloqueado por autoplay o interrumpido — no es un error real, se ignora
    }catch(e){ /* nunca debe romper el juego por un efecto de sonido */ }
  }

  function setMuted(next){
    muted = !!next;
    writeStoredMuted(muted);
    if(musicEl){ clearFade(); musicEl.volume = currentTargetVolume(); }
  }
  function isMuted(){ return muted; }
  function toggleMuted(){ setMuted(!muted); return muted; }

  /** Volumen 0-1 de una categoría (MAP/BATTLE/SHOP) — si la música que suena ahora pertenece a esa
   *  categoría, el cambio se aplica de inmediato (mientras arrastrás la barra en Ajustes), sin
   *  esperar a la próxima vez que cambie de pista. */
  function setCategoryVolume(category, vol){
    const clamped = Math.min(1, Math.max(0, vol));
    categoryVolumes[category] = clamped;
    writeStoredVolume(category, clamped);
    const meta = currentMusicKey && MUSIC_TRACKS[currentMusicKey];
    if(meta && meta.category === category && musicEl){
      clearFade();
      musicEl.volume = effectiveVolumeFor(category);
    }
  }
  function getCategoryVolume(category){
    const v = categoryVolumes[category];
    return v != null ? v : DEFAULT_CATEGORY_VOLUME;
  }

  return {
    init, playMusic, stopMusic, playSfx, setMuted, isMuted, toggleMuted,
    setCategoryVolume, getCategoryVolume,
  };
}

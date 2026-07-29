/* ============================================================
   ADAPTADOR DE GEOLOCALIZACIÓN — capa fina sobre navigator.geolocation / @capacitor/geolocation.

   Responsabilidad de este archivo: dar a src/main.js las mismas 3 operaciones que ya usaba de
   navigator.geolocation (getCurrentPosition/watchPosition/clearWatch), pero que por debajo usen el
   plugin nativo de Capacitor cuando el juego corre empaquetado como app (Capacitor.isNativePlatform()
   true) — más preciso y confiable que la geolocalización de un WebView — y sigan cayendo en
   navigator.geolocation tal cual cuando corre en un navegador normal (dev, PWA). onGpsSuccess/
   onGpsError en main.js NO se tocan: reciben exactamente la misma forma de datos que ya esperaban
   (pos.coords.{latitude,longitude,accuracy}, err.code/err.message).
   ============================================================ */
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";

/** El plugin nativo devuelve códigos de error tipo "OS-PLUG-GLOC-0003" (ver README del paquete),
 *  no los códigos numéricos 1/2/3 (PERMISSION_DENIED/POSITION_UNAVAILABLE/TIMEOUT) que ya maneja
 *  onGpsError en main.js — acá se traducen los más relevantes; cualquier otro cae en el caso
 *  "default" que onGpsError ya sabe mostrar de forma genérica. */
const NATIVE_ERROR_CODE_MAP = {
  "OS-PLUG-GLOC-0003": 1, // permiso denegado
  "OS-PLUG-GLOC-0009": 1, // el usuario no aceptó activar la ubicación
  "OS-PLUG-GLOC-0002": 2, // no se pudo obtener la posición
  "OS-PLUG-GLOC-0007": 2, // servicios de ubicación desactivados
  "OS-PLUG-GLOC-0014": 2, // error de Google Play Services (resoluble)
  "OS-PLUG-GLOC-0015": 2, // error de Google Play Services
  "OS-PLUG-GLOC-0016": 2, // error de configuración de ubicación
  "OS-PLUG-GLOC-0017": 2, // red y ubicación apagadas
  "OS-PLUG-GLOC-0010": 3, // tiempo agotado
};

function normalizeNativeError(err){
  const code = (err && NATIVE_ERROR_CODE_MAP[err.code]) || 0;
  const message = (err && (err.message || String(err))) || "Error de geolocalización nativa";
  return {code, message};
}

/** true solo dentro de la app empaquetada (Android/iOS vía Capacitor) — false en cualquier
 *  navegador normal, incluida la PWA instalada, que sigue usando navigator.geolocation. */
export function isNativeGpsAvailable(){
  return !!(Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
}

/** true si HAY alguna forma de pedir ubicación en este entorno — nativa, o navigator.geolocation. */
export function isGpsSupported(){
  return isNativeGpsAvailable() || !!navigator.geolocation;
}

export function gpsGetCurrentPosition(options, onSuccess, onError){
  if(isNativeGpsAvailable()){
    Geolocation.getCurrentPosition(options)
      .then(onSuccess)
      .catch(err=> onError(normalizeNativeError(err)));
    return;
  }
  navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
}

/** Devuelve un "handle" opaco (no un id crudo) — en nativo, watchPosition del plugin es async y
 *  devuelve una Promise<string>; en web sigue siendo el número sincrónico de siempre. main.js solo
 *  necesita guardar lo que devuelve acá y pasárselo tal cual a gpsClearWatch, nunca lo inspecciona. */
export function gpsWatchPosition(options, onSuccess, onError){
  if(isNativeGpsAvailable()){
    const handle = {native:true, idPromise:null};
    handle.idPromise = Geolocation.watchPosition(options, (pos, err)=>{
      if(err){ onError(normalizeNativeError(err)); return; }
      if(pos) onSuccess(pos);
    }).catch(err=>{ onError(normalizeNativeError(err)); return null; });
    return handle;
  }
  const id = navigator.geolocation.watchPosition(onSuccess, onError, options);
  return {native:false, id};
}

export function gpsClearWatch(handle){
  if(!handle) return;
  if(handle.native){
    if(handle.idPromise) handle.idPromise.then(id=>{ if(id) Geolocation.clearWatch({id}); }).catch(()=>{});
    return;
  }
  navigator.geolocation.clearWatch(handle.id);
}

/* ============================================================
   TRANSFERENCIA DE ARCHIVOS — capa fina para exportar/importar texto (el guardado del jugador,
   ver exportSave/importSave en main.js) como un archivo real, cruzando la barrera entre el
   localStorage del navegador y el almacenamiento del WebView de la app empaquetada — que son dos
   cajones completamente separados y nunca se ven entre sí.

   Responsabilidad de este archivo: solo "sacar bytes hacia el usuario" y "traer bytes desde el
   usuario", sin saber nada del juego (mismo criterio de capa fina que nativeGeolocation.js) — arma
   el envoltorio JSON, valida su forma y decide qué hacer con cada clave es responsabilidad de
   main.js.
   ============================================================ */
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

function isNative(){
  return !!(Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
}

/** Nativo: escribe el archivo en la caché de la app y abre el panel de compartir de Android (podés
 *  guardarlo en Archivos, mandarlo por Drive/WhatsApp/email, etc.) — es el patrón que Capacitor
 *  recomienda para "exportar un archivo", mucho más confiable dentro de un WebView empaquetado que
 *  un link de descarga. Web: el truco de siempre, un Blob + <a download> temporal. */
export async function writeAndShareTextFile(filename, contents){
  if(isNative()){
    await Filesystem.writeFile({path: filename, data: contents, directory: Directory.Cache, encoding: Encoding.UTF8});
    const {uri} = await Filesystem.getUri({path: filename, directory: Directory.Cache});
    await Share.share({title: filename, files: [uri], dialogTitle: "Guardar o enviar tu partida"});
    return;
  }
  const blob = new Blob([contents], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(()=> URL.revokeObjectURL(url), 1000);
}

// Subcarpeta (dentro de Directory.Data — almacenamiento interno de la app, no el mismo que
// Directory.Cache que usa writeAndShareTextFile) donde viven los backups automáticos nocturnos.
// Directory.Data sobrevive reinicios/actualizaciones de la app (se borra solo si el usuario borra
// los datos de la app o la desinstala) y NO requiere ningún permiso — pero tampoco es visible para
// el selector de archivos del sistema operativo ni para un explorador de archivos normal, por eso
// hace falta una pantalla propia en el juego para restaurar uno (ver openAutoBackupList en main.js)
// en vez de reusar pickAndReadTextFile().
const AUTO_BACKUP_DIR = "backups";

/** Escribe (o sobreescribe) un archivo de forma SILENCIOSA — a diferencia de writeAndShareTextFile,
 *  nunca abre el panel de compartir ni ningún selector, porque está pensado para el backup
 *  automático diario, no para que el usuario lo vea en el momento. En web (sin Capacitor nativo, ej.
 *  navegador de escritorio) no existe un "almacenamiento del dispositivo" real accesible sin pedirle
 *  permiso al usuario, así que cae a localStorage con un prefijo propio — mismo criterio de fallback
 *  que el resto del juego (ver AppStorage en main.js). */
export async function writeLocalBackupFile(filename, contents){
  if(isNative()){
    await Filesystem.writeFile({
      path: `${AUTO_BACKUP_DIR}/${filename}`,
      data: contents,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    return;
  }
  localStorage.setItem(`rpgGoAutoBackup:${filename}`, contents);
}

/** Lista los nombres de archivo de backups automáticos existentes (sin ordenar — quien llama decide
 *  el orden). Nunca lanza: si la carpeta todavía no existe (nunca corrió un backup), devuelve []. */
export async function listLocalBackupFiles(){
  if(isNative()){
    try{
      const res = await Filesystem.readdir({path: AUTO_BACKUP_DIR, directory: Directory.Data});
      return (res.files||[]).map(f=> typeof f === "string" ? f : f.name).filter(n=> n.endsWith(".json"));
    }catch(e){ return []; }
  }
  const names = [];
  for(let i=0;i<localStorage.length;i++){
    const k = localStorage.key(i);
    if(k && k.startsWith("rpgGoAutoBackup:")) names.push(k.slice("rpgGoAutoBackup:".length));
  }
  return names;
}

/** Lee el contenido de un backup automático por nombre de archivo. Devuelve null si no existe o no
 *  se pudo leer (nunca lanza). */
export async function readLocalBackupFile(filename){
  if(isNative()){
    try{
      const res = await Filesystem.readFile({path: `${AUTO_BACKUP_DIR}/${filename}`, directory: Directory.Data, encoding: Encoding.UTF8});
      return typeof res.data === "string" ? res.data : null;
    }catch(e){ return null; }
  }
  return localStorage.getItem(`rpgGoAutoBackup:${filename}`);
}

/** Borra un backup automático por nombre de archivo — usado para la rotación (mantener como máximo
 *  N, ver maybeRunDailyAutoBackup en main.js). Nunca lanza si el archivo ya no existe. */
export async function deleteLocalBackupFile(filename){
  if(isNative()){
    try{ await Filesystem.deleteFile({path: `${AUTO_BACKUP_DIR}/${filename}`, directory: Directory.Data}); }catch(e){ /* ya no existía */ }
    return;
  }
  localStorage.removeItem(`rpgGoAutoBackup:${filename}`);
}

/** Selector de archivo — un <input type=file> disparado a mano funciona igual en el navegador y
 *  dentro del WebView de Android (el selector nativo de archivos ya lo soporta sin plugins aparte),
 *  así que no hace falta rama nativa/web acá. Devuelve el contenido como texto, o null si el
 *  usuario cancela el selector. */
export function pickAndReadTextFile(){
  return new Promise((resolve)=>{
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.style.display = "none";
    input.addEventListener("change", ()=>{
      const file = input.files && input.files[0];
      document.body.removeChild(input);
      if(!file){ resolve(null); return; }
      const reader = new FileReader();
      reader.onload = ()=> resolve(String(reader.result||""));
      reader.onerror = ()=> resolve(null);
      reader.readAsText(file);
    });
    // si el usuario cierra el selector sin elegir nada, "change" nunca dispara — el input queda
    // huérfano en el DOM; se limpia solo cuando la ventana recupera el foco, sin bloquear nada.
    window.addEventListener("focus", function cleanup(){
      window.removeEventListener("focus", cleanup);
      setTimeout(()=>{ if(input.parentNode) document.body.removeChild(input); }, 300);
    }, {once:true});
    document.body.appendChild(input);
    input.click();
  });
}

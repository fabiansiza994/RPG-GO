/* ============================================================
   CARPETA DE BACKUPS ELEGIDA POR EL USUARIO — capa fina sobre el plugin nativo propio
   BackupFolderPlugin (android/app/src/main/java/com/rpggo/app/BackupFolderPlugin.java).

   Por qué existe aparte de saveTransfer.js: Directory.Data/Cache (que sí usa saveTransfer.js) son
   almacenamiento PRIVADO de la app — Android los borra siempre al desinstalar. La única forma de que
   un backup sobreviva a una desinstalación es que viva en almacenamiento realmente compartido, y la
   única forma moderna de escribir ahí sin permisos amplios (que Play Store rechaza para un juego que
   no los necesita) es que el usuario elija una carpeta una vez vía Storage Access Framework
   (Intent.ACTION_OPEN_DOCUMENT_TREE) — de ahí el plugin nativo propio, @capacitor/filesystem no lo
   cubre. Nunca corre en web: todas las funciones son no-op ahí (isNativePlatform() false).
   ============================================================ */
import { registerPlugin, Capacitor } from "@capacitor/core";

const BackupFolder = registerPlugin("BackupFolder");

export function isBackupFolderSupported(){
  return !!(Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
}

/** Abre el selector nativo de carpetas. Devuelve {uri, name} si el usuario eligió una, o null si
 *  canceló o el plugin no está disponible (web). Nunca lanza. */
export async function pickBackupFolder(){
  if(!isBackupFolderSupported()) return null;
  try{ return await BackupFolder.pickFolder(); }
  catch(e){ return null; } // el usuario canceló el selector, o falló el permiso
}

/** ¿La carpeta guardada sigue siendo válida (el usuario no revocó el permiso, no se movió/borró)? */
export async function isBackupFolderValid(uri){
  if(!isBackupFolderSupported() || !uri) return false;
  try{ const res = await BackupFolder.isFolderValid({uri}); return !!(res && res.valid); }
  catch(e){ return false; }
}

/** Crea (o sobreescribe) un archivo dentro de la carpeta. Devuelve true/false, nunca lanza. */
export async function writeFileToBackupFolder(uri, filename, contents){
  if(!isBackupFolderSupported() || !uri) return false;
  try{ await BackupFolder.writeFile({uri, filename, contents}); return true; }
  catch(e){ return false; }
}

/** Lista los archivos .json dentro de la carpeta: [{name, uri, lastModified}]. [] si falla. */
export async function listBackupFolderFiles(uri){
  if(!isBackupFolderSupported() || !uri) return [];
  try{ const res = await BackupFolder.listFiles({uri}); return (res && res.files) || []; }
  catch(e){ return []; }
}

/** Lee el contenido de un archivo por su propia URI (la que devuelve listBackupFolderFiles/writeFile,
 *  no la de la carpeta). null si falla. */
export async function readBackupFolderFile(fileUri){
  if(!isBackupFolderSupported() || !fileUri) return null;
  try{ const res = await BackupFolder.readFile({fileUri}); return (res && res.contents) || null; }
  catch(e){ return null; }
}

export async function deleteBackupFolderFile(fileUri){
  if(!isBackupFolderSupported() || !fileUri) return;
  try{ await BackupFolder.deleteFile({fileUri}); }catch(e){ /* ya no existía */ }
}

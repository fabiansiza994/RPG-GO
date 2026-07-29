/* ============================================================
   MISIONES DIARIAS — repositorio de persistencia
   ------------------------------------------------------------
   Adaptador fino sobre un storage con forma {get(key,shared), set(key,value,shared)}
   — el mismo shape que ya usa `AppStorage`/`LocalAppStorage` en main.js. Se
   INYECTA desde afuera (dailyMissionsService.js) en vez de importar AppStorage
   acá, para no acoplar este módulo puro a main.js y para poder testearlo con
   un storage en memoria.

   Nunca toca 'player_account' ni 'player_<clase>' — vive en su propia clave
   versionada (DAILY_MISSIONS_STORAGE_KEY), así que un fallo acá jamás puede
   dañar el guardado real de la partida.
   ============================================================ */
import { DAILY_MISSIONS_SCHEMA_VERSION, DAILY_MISSIONS_STORAGE_KEY } from "../../config/dailyMissions.config.js";

/** Storage en memoria — usado en tests y como red de seguridad si no se
 *  inyecta nada (nunca debería pasar en producción: main.js siempre inyecta
 *  el AppStorage real del juego). */
export function createInMemoryStorage(){
  const map = new Map();
  return {
    async get(key){
      if(!map.has(key)) throw new Error("key not found");
      return { key, value: map.get(key) };
    },
    async set(key, value){ map.set(key, value); return { key, value }; },
  };
}

function isValidRoot(parsed){
  return !!parsed
    && parsed.version === DAILY_MISSIONS_SCHEMA_VERSION
    && !!parsed.current
    && Array.isArray(parsed.current.missions)
    && Array.isArray(parsed.history)
    && Array.isArray(parsed.current.processedEventIds);
}

function freshRoot(){
  return { version: DAILY_MISSIONS_SCHEMA_VERSION, current: null, history: [], lastKnownTimestamp: Date.now() };
}

export function createDailyMissionsRepository(storage){
  /** Devuelve el root persistido, o un root vacío nuevo si nunca hubo nada
   *  guardado o si lo guardado está corrupto/con un esquema que no reconocemos.
   *  Nunca lanza — un problema acá jamás debe tumbar el resto del juego. */
  async function load(){
    let raw;
    try{
      const res = await storage.get(DAILY_MISSIONS_STORAGE_KEY, false);
      raw = res && res.value;
    }catch(e){
      return freshRoot(); // primera vez — no hay nada guardado todavía, no es un error
    }
    if(!raw) return freshRoot();
    let parsed;
    try{
      parsed = JSON.parse(raw);
    }catch(e){
      console.warn("[MISIONES DIARIAS] el guardado local no es JSON válido — se descarta y se regenera. El resto del guardado del jugador NO se toca.", e);
      return freshRoot();
    }
    if(!isValidRoot(parsed)){
      console.warn("[MISIONES DIARIAS] el guardado local tiene una forma inesperada (versión distinta o corrupto) — se descarta y se regenera. El resto del guardado del jugador NO se toca.");
      return freshRoot();
    }
    return parsed;
  }

  async function save(root){
    try{
      await storage.set(DAILY_MISSIONS_STORAGE_KEY, JSON.stringify(root), false);
      return true;
    }catch(e){
      console.warn("[MISIONES DIARIAS] no se pudo guardar el progreso de misiones diarias.", e);
      return false;
    }
  }

  return { load, save };
}

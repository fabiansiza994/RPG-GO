/* ============================================================
   SALÓN DE LA FORTUNA — repositorio de persistencia
   ------------------------------------------------------------
   Adaptador fino sobre un storage con forma {get(key,shared), set(key,value,shared)}
   — el mismo shape que ya usa `AppStorage`/`LocalAppStorage` en main.js. Se
   INYECTA desde afuera (fortuneHallService.js) en vez de importar AppStorage
   acá, para no acoplar este módulo puro a main.js y para poder testearlo con
   un storage en memoria. Mismo criterio que dailyMissionsRepository.js.

   Nunca toca 'player_account' ni 'player_<clase>' — vive en su propia clave
   versionada (FORTUNE_HALL_STORAGE_KEY), así que un fallo acá jamás puede
   dañar el guardado real de la partida.
   ============================================================ */
import { FORTUNE_HALL_SCHEMA_VERSION, FORTUNE_HALL_STORAGE_KEY } from "../../config/fortuneHall.config.js";
import { MINIGAME_DEFS } from "./fortuneMinigames.js";

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

function freshGameState(){
  return { freeUsed: false, premiumUsed: false };
}

/** El estado de juegos siempre se siembra desde MINIGAME_DEFS — nunca hay
 *  ids hardcodeados acá, así que un minijuego nuevo agregado al registro
 *  aparece automáticamente la próxima vez que se carga/regenera el root. */
function freshGames(){
  const games = {};
  MINIGAME_DEFS.forEach(def => { games[def.id] = freshGameState(); });
  return games;
}

function freshRoot(){
  return { version: FORTUNE_HALL_SCHEMA_VERSION, lastResetDateKey: null, games: freshGames() };
}

function isValidGameState(g){
  return !!g && typeof g.freeUsed === "boolean" && typeof g.premiumUsed === "boolean";
}

/** A propósito NO exige que todos los MINIGAME_DEFS ya existan en `parsed`
 *  — un minijuego agregado al registro DESPUÉS de que este root se guardó
 *  no debe invalidar el resto del progreso (ver withMissingGamesSeeded, que
 *  completa los que falten). Solo valida que los que SÍ están presentes
 *  tengan una forma reconocible. */
function isValidRoot(parsed){
  if(!parsed || parsed.version !== FORTUNE_HALL_SCHEMA_VERSION) return false;
  if(!parsed.games || typeof parsed.games !== "object") return false;
  return Object.values(parsed.games).every(isValidGameState);
}

/** Si el root es válido pero le falta un minijuego nuevo (agregado al
 *  registro después de que este root se guardó), se completa con estado
 *  fresco en vez de descartar todo el progreso del jugador. */
function withMissingGamesSeeded(root){
  MINIGAME_DEFS.forEach(def => {
    if(!isValidGameState(root.games[def.id])) root.games[def.id] = freshGameState();
  });
  return root;
}

export function createFortuneHallRepository(storage, options = {}){
  const { onDiscarded } = options; // opcional: (reason)=>void

  async function load(){
    let raw;
    try{
      const res = await storage.get(FORTUNE_HALL_STORAGE_KEY, false);
      raw = res && res.value;
    }catch(e){
      return freshRoot(); // primera vez — no hay nada guardado todavía, no es un error
    }
    if(!raw) return freshRoot();
    let parsed;
    try{
      parsed = JSON.parse(raw);
    }catch(e){
      console.warn("[SALÓN DE LA FORTUNA] el guardado local no es JSON válido — se descarta y se regenera. El resto del guardado del jugador NO se toca.", e);
      if(onDiscarded) onDiscarded("invalid_json");
      return freshRoot();
    }
    if(!isValidRoot(parsed)){
      console.warn("[SALÓN DE LA FORTUNA] el guardado local tiene una forma inesperada (versión distinta o corrupto) — se descarta y se regenera. El resto del guardado del jugador NO se toca.");
      if(onDiscarded) onDiscarded("invalid_schema");
      return freshRoot();
    }
    return withMissingGamesSeeded(parsed);
  }

  async function save(root){
    try{
      await storage.set(FORTUNE_HALL_STORAGE_KEY, JSON.stringify(root), false);
      return true;
    }catch(e){
      console.warn("[SALÓN DE LA FORTUNA] no se pudo guardar el progreso del Salón de la Fortuna.", e);
      return false;
    }
  }

  return { load, save };
}

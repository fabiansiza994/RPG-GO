/* ============================================================
   Publicidad — repositorio de persistencia
   ------------------------------------------------------------
   Mismo patrón que dailyMissionsRepository.js/adventurerContractsRepository.js:
   adaptador fino sobre un storage {get(key,shared), set(key,value,shared)} —
   el mismo shape que AppStorage. Clave propia (ADS_STORAGE_KEY), nunca toca
   'player_account' ni 'player_<clase>'.

   Si el guardado está corrupto, se reinicia SOLO este módulo (contadores/
   cooldowns/transacciones en curso) — nunca se toca perfil, inventario,
   oro ni progreso del jugador, y ninguna recompensa "a medio camino" no
   verificable se da por buena (mejor perder una oportunidad de anuncio que
   arriesgar una recompensa duplicada).
   ============================================================ */
import { ADS_SCHEMA_VERSION, ADS_STORAGE_KEY } from "../../config/ads.config.js";
import { freshFrequencyState } from "./adsFrequencyController.js";

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

function freshRoot(){
  return {
    version: ADS_SCHEMA_VERSION,
    frequency: freshFrequencyState(),
    transactions: { active: {}, history: [] },
    appliedTransactionIds: [],
    lastKnownTimestamp: Date.now(),
  };
}

function isValidRoot(parsed){
  return !!parsed
    && parsed.version === ADS_SCHEMA_VERSION
    && !!parsed.frequency
    && !!parsed.transactions
    && Array.isArray(parsed.transactions.history)
    && Array.isArray(parsed.appliedTransactionIds);
}

export function createAdsRepository(storage){
  async function load(){
    let raw;
    try{
      const res = await storage.get(ADS_STORAGE_KEY, false);
      raw = res && res.value;
    }catch(e){
      return freshRoot();
    }
    if(!raw) return freshRoot();
    let parsed;
    try{
      parsed = JSON.parse(raw);
    }catch(e){
      console.warn("[ADS] el guardado local no es JSON válido — se reinicia SOLO el módulo de publicidad. El resto del guardado del jugador NO se toca.", e);
      return freshRoot();
    }
    if(!isValidRoot(parsed)){
      console.warn("[ADS] el guardado local tiene una forma inesperada (versión distinta o corrupto) — se reinicia SOLO el módulo de publicidad.");
      return freshRoot();
    }
    return parsed;
  }

  async function save(root){
    try{
      await storage.set(ADS_STORAGE_KEY, JSON.stringify(root), false);
      return true;
    }catch(e){
      console.warn("[ADS] no se pudo guardar el estado de publicidad.", e);
      return false;
    }
  }

  return { load, save };
}

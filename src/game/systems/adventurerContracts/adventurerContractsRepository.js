/* ============================================================
   CONTRATO DEL AVENTURERO — repositorio de persistencia
   ------------------------------------------------------------
   Mismo patrón que dailyMissionsRepository.js: adaptador fino sobre un
   storage inyectado con forma {get(key,shared), set(key,value,shared)} — el
   mismo shape que AppStorage. Clave propia, nunca toca 'player_account' ni
   'player_<clase>'.

   Diferencia clave con Misiones Diarias: si el CONTRATO guardado está
   corrupto pero el resto (reputación/rango/historial) es válido, se
   invalida SOLO el contrato — nunca se tira la reputación ganada por
   contratos anteriores (pedido explícito del diseño).
   ============================================================ */
import { ADVENTURER_CONTRACTS_SCHEMA_VERSION, ADVENTURER_CONTRACTS_STORAGE_KEY } from "../../config/adventurerContracts.config.js";

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
    version: ADVENTURER_CONTRACTS_SCHEMA_VERSION,
    reputation: 0,
    currentRank: "novato",
    currentContract: null,
    lastGeneratedAt: 0,
    lastKnownTimestamp: Date.now(),
    history: [],
    recentTemplateIds: [],
  };
}

function isValidRoot(parsed){
  return !!parsed
    && parsed.version === ADVENTURER_CONTRACTS_SCHEMA_VERSION
    && typeof parsed.reputation === "number"
    && Array.isArray(parsed.history)
    && Array.isArray(parsed.recentTemplateIds);
}

function isValidContract(c){
  return !!c && typeof c.id === "string" && typeof c.status === "string" && Array.isArray(c.objectives);
}

export function createAdventurerContractsRepository(storage, options = {}){
  const { onDiscarded } = options; // opcional: (reason)=>void — para avisar en pantalla, no solo en consola (ver adventurerContractsService.js)
  async function load(){
    let raw;
    try{
      const res = await storage.get(ADVENTURER_CONTRACTS_STORAGE_KEY, false);
      raw = res && res.value;
    }catch(e){
      return freshRoot();
    }
    if(!raw) return freshRoot();
    let parsed;
    try{
      parsed = JSON.parse(raw);
    }catch(e){
      console.warn("[CONTRATO DEL AVENTURERO] el guardado local no es JSON válido — se descarta y se arranca de cero. El resto del guardado del jugador NO se toca.", e);
      if(onDiscarded) onDiscarded("invalid_json");
      return freshRoot();
    }
    if(!isValidRoot(parsed)){
      console.warn("[CONTRATO DEL AVENTURERO] el guardado local tiene una forma inesperada (versión distinta o corrupto) — se descarta y se arranca de cero.");
      if(onDiscarded) onDiscarded("invalid_schema");
      return freshRoot();
    }
    if(parsed.currentContract && !isValidContract(parsed.currentContract)){
      console.warn("[CONTRATO DEL AVENTURERO] el contrato guardado está corrupto — se invalida SOLO el contrato; reputación e historial se conservan.");
      if(onDiscarded) onDiscarded("invalid_contract_only");
      parsed.currentContract = null;
    }
    return parsed;
  }

  async function save(root){
    try{
      await storage.set(ADVENTURER_CONTRACTS_STORAGE_KEY, JSON.stringify(root), false);
      return true;
    }catch(e){
      console.warn("[CONTRATO DEL AVENTURERO] no se pudo guardar el progreso del contrato.", e);
      return false;
    }
  }

  return { load, save };
}

/* ============================================================
   CONTRATO DEL AVENTURERO — servicio de aplicación
   ------------------------------------------------------------
   Única puerta de entrada que main.js debe usar. Coordina ContractClock +
   motor de dominio + repositorio. Igual que dailyMissionsService, nunca toca
   `player` directo — devuelve QUÉ recompensa corresponde; aplicarla es
   responsabilidad de quien llama (main.js).
   ============================================================ */
import { TEMPLATE_NO_REPEAT_WINDOW } from "../../config/adventurerContracts.config.js";
import { hasGenerationIntervalElapsed, getMillisecondsUntilExpiration as clockMsUntilExpiration } from "./contractClock.js";
import {
  generateContract, acceptContract as engineAccept, applyProgress, turnIn as engineTurnIn,
  claimReward as engineClaimReward, abandonContract as engineAbandon, checkExpiration,
  buildHistoryEntry, appendHistory, addReputation, computeRank,
} from "./adventurerContractsEngine.js";
import { createAdventurerContractsRepository, createInMemoryStorage } from "./adventurerContractsRepository.js";

const TERMINAL_STATUSES = ["CLAIMED", "EXPIRED", "ABANDONED"];

export function createAdventurerContractsService({
  storage,
  getPlayerLevel = ()=> 1,
  getFeaturesAvailable = ()=> ({ towers: true, dungeons: true, blacksmith: true }),
  onNewContractAvailable,
  onObjectivesCompleted,
  onSpawnRequests,
  onTurnInRequired,
  onContractReadyToClaim,
  onContractExpired,
  onCorruptedState, // opcional: (reason)=>void — el guardado local no se pudo leer y se reinició (total o solo el contrato activo)
} = {}){
  const repository = createAdventurerContractsRepository(storage || createInMemoryStorage(), { onDiscarded: onCorruptedState });
  let root = null;
  let initPromise = null;
  let tickTimer = null;
  const listeners = new Set();

  function notify(){
    const snapshot = getState();
    listeners.forEach(fn=>{ try{ fn(snapshot); }catch(e){ console.error("[CONTRATO DEL AVENTURERO] listener falló", e); } });
  }

  async function persist(){ await repository.save(root); }

  function buildContext(){
    return { playerLevel: getPlayerLevel(), reputation: root.reputation, featuresAvailable: getFeaturesAvailable() };
  }

  function archiveCurrentToHistory(){
    if(!root.currentContract) return;
    root.history = appendHistory(root.history, buildHistoryEntry(root.currentContract));
    root.currentContract = null;
  }

  /** Revisa expiración del contrato actual y genera uno nuevo si corresponde
   *  (slot vacío/terminal + ya pasó el intervalo de 24h desde la última
   *  generación). Se llama defensivamente en cada acción pública, además del
   *  timer periódico — así nunca depende de que el timer haya alcanzado a
   *  disparar. */
  async function ensureContractAvailable(now){
    let expiredNow = false;
    if(root.currentContract && ["ACTIVE", "TURN_IN_REQUIRED"].includes(root.currentContract.status)){
      if(checkExpiration(root.currentContract, now)){
        archiveCurrentToHistory();
        await persist();
        expiredNow = true;
      }
    }
    const current = root.currentContract;
    const isTerminalOrEmpty = !current || TERMINAL_STATUSES.includes(current.status);
    const availableTooOld = current && current.status === "AVAILABLE" && now.getTime() >= new Date(current.availableUntil).getTime();
    let generated = false;
    if((isTerminalOrEmpty || availableTooOld) && hasGenerationIntervalElapsed(root.lastGeneratedAt, now)){
      if(current && (isTerminalOrEmpty || availableTooOld)) archiveCurrentToHistory();
      const contract = generateContract(buildContext(), root.recentTemplateIds, now);
      if(contract){
        root.currentContract = contract;
        root.recentTemplateIds = [contract.templateId, ...root.recentTemplateIds].slice(0, TEMPLATE_NO_REPEAT_WINDOW);
        root.lastGeneratedAt = now.getTime();
        await persist();
        generated = true;
      }
    }
    if(expiredNow && onContractExpired) onContractExpired();
    return { generated, expiredNow };
  }

  function scheduleTick(){
    if(tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(async ()=>{
      const now = new Date();
      const { generated, expiredNow } = await ensureContractAvailable(now);
      if(generated || expiredNow){
        notify();
        if(generated && onNewContractAvailable) onNewContractAvailable();
      }
    }, 60000);
  }

  function getState(){
    if(!root) return null;
    return {
      reputation: root.reputation,
      currentRank: root.currentRank,
      currentContract: root.currentContract,
      history: root.history,
    };
  }

  async function init(){
    if(initPromise) return initPromise;
    initPromise = (async ()=>{
      root = await repository.load();
      await ensureContractAvailable(new Date());
      scheduleTick();
      return getState();
    })();
    return initPromise;
  }

  async function acceptContract(){
    if(!root) return { ok: false, reason: "not_initialized" };
    await ensureContractAvailable(new Date());
    if(!root.currentContract || root.currentContract.status !== "AVAILABLE") return { ok: false, reason: "not_available" };
    const result = engineAccept(root.currentContract, new Date());
    if(result.ok){
      await persist();
      notify();
      if(result.spawnRequests && result.spawnRequests.length && onSpawnRequests){
        onSpawnRequests(result.spawnRequests, root.currentContract);
      }
    }
    return result;
  }

  async function reportEvent(event = {}){
    if(!root) return;
    const now = new Date();
    await ensureContractAvailable(now);
    const contract = root.currentContract;
    if(!contract || contract.status !== "ACTIVE") return;
    const statusBefore = contract.status;
    const amount = event.payload && event.payload.amount != null ? event.payload.amount : 1;
    const result = applyProgress(contract, event.type, amount, { meta: event.payload || {}, eventId: event.eventId, now });
    if(result.expired){
      archiveCurrentToHistory();
      await persist(); notify();
      if(onContractExpired) onContractExpired();
      return;
    }
    if(!result.changed) return;
    await persist();
    notify();
    if(result.completedObjectives.length && onObjectivesCompleted) onObjectivesCompleted(result.completedObjectives, contract);
    if(result.spawnRequests.length && onSpawnRequests) onSpawnRequests(result.spawnRequests, contract);
    if(statusBefore !== contract.status){
      if(contract.status === "TURN_IN_REQUIRED" && onTurnInRequired) onTurnInRequired(contract);
      if(contract.status === "COMPLETED" && onContractReadyToClaim) onContractReadyToClaim(contract);
    }
  }

  async function turnInContract(){
    if(!root || !root.currentContract) return { ok: false, reason: "not_found" };
    const now = new Date();
    const result = engineTurnIn(root.currentContract, now);
    if(result.ok){
      await persist(); notify();
    } else if(result.reason === "expired"){
      archiveCurrentToHistory();
      await persist(); notify();
      if(onContractExpired) onContractExpired();
    }
    return result;
  }

  async function claimReward(rewardedCharacterId){
    if(!root || !root.currentContract) return { ok: false, reason: "not_found" };
    const now = new Date();
    const result = engineClaimReward(root.currentContract, rewardedCharacterId, now);
    if(result.ok){
      addReputation(root, result.reward.reputation || 0);
      archiveCurrentToHistory();
      await persist(); notify();
    } else if(result.reason === "expired"){
      archiveCurrentToHistory();
      await persist(); notify();
      if(onContractExpired) onContractExpired();
    }
    return result;
  }

  async function abandonContract(){
    if(!root || !root.currentContract) return { ok: false, reason: "not_found" };
    const now = new Date();
    const result = engineAbandon(root.currentContract, now);
    if(result.ok){
      archiveCurrentToHistory();
      await persist(); notify();
    }
    return result;
  }

  function subscribe(fn){
    listeners.add(fn);
    return ()=> listeners.delete(fn);
  }

  function getMillisecondsUntilExpiration(){
    if(!root || !root.currentContract || !root.currentContract.expiresAt) return null;
    return clockMsUntilExpiration(new Date(root.currentContract.expiresAt).getTime());
  }

  function getRankInfo(){
    if(!root) return null;
    return computeRank(root.reputation);
  }

  return {
    init, getState, acceptContract, reportEvent, turnInContract, claimReward, abandonContract,
    subscribe, getMillisecondsUntilExpiration, getRankInfo,
  };
}

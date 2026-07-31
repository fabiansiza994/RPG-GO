export const DISTANCE_MEDALS = [
  {km:1,   name:"Primeros Pasos",     emoji:"🥉", gold:30},
  {km:5,   name:"Caminante",          emoji:"🥈", gold:75},
  {km:10,  name:"Explorador",         emoji:"🥇", gold:150},
  {km:25,  name:"Explorador Experto", emoji:"🏅", gold:300},
  {km:50,  name:"Trotamundos",        emoji:"🏆", gold:600},
  {km:100, name:"Viajero Legendario", emoji:"👑", gold:1200},
];

export const ZONE_EXPLORE_TARGET_M = 3000;

// Pedido explícito: que completar misiones se sienta como la mejor forma de subir de nivel — la
// recompensa de XP de estas misiones (y de las tutoriales de abajo) se multiplicó x4 respecto al
// diseño original, para que superen claramente lo que darían los mismos combates sin la misión.
export const QUEST_TEMPLATES = [
  {id:"q_spider_eye", npcName:"Alquimista Ambulante", npcEmoji:"🧪", monsterName:"Araña Gigante", itemName:"Ojo de Araña", itemEmoji:"👁️", rewardGold:80, rewardXp:280, flavor:"Necesito un ojo de araña fresco para mis pociones."},
  {id:"q_wolf_fang", npcName:"Cazador Solitario", npcEmoji:"🏹", monsterName:"Lobo Umbrío", itemName:"Colmillo de Lobo Umbrío", itemEmoji:"🦷", rewardGold:70, rewardXp:240, flavor:"Ese lobo me ha estado robando el ganado. Tráeme prueba de que lo enfrentaste."},
  {id:"q_golem_core", npcName:"Erudito Errante", npcEmoji:"📜", monsterName:"Golem de Roca", itemName:"Núcleo de Golem", itemEmoji:"🪨", rewardGold:100, rewardXp:360, flavor:"Estudio la magia que anima a los golems. Su núcleo es justo lo que necesito."},
  {id:"q_demon_horn", npcName:"Exorcista Viajero", npcEmoji:"⛪", monsterName:"Demonio Menor", itemName:"Cuerno de Demonio", itemEmoji:"👹", rewardGold:90, rewardXp:320, flavor:"Ese demonio ha estado asustando a los vecinos. Tráeme su cuerno como prueba."},
  {id:"q_ghost_essence", npcName:"Médium Errante", npcEmoji:"🔮", monsterName:"Espectro", itemName:"Esencia Espectral", itemEmoji:"✨", rewardGold:75, rewardXp:260, flavor:"Un espíritu inquieto ronda por aquí. Ayúdame a liberarlo de su esencia."},
];

export const TUTORIAL_QUEST_TEMPLATES = [
  { id:"q_tutorial_any3", npcName:"Veterano de Neiva", npcEmoji:"🧓", type:"kill_count", killGoal:3, monsterName:null,
    flavor:"Todo aventurero de Neiva empieza igual: demuestra que puedes cuidarte solo por ahí afuera.",
    rewardGold:50, rewardXp:160 },
  { id:"q_tutorial_ghost5", npcName:"Veterano de Neiva", npcEmoji:"🧓", type:"kill_count", killGoal:5, monsterName:"Espectro",
    flavor:"Hay demasiados fantasmas rondando el centro. Derrota a 5 Espectros y la gente podrá dormir tranquila.",
    rewardGold:65, rewardXp:220 },
  { id:"q_tutorial_rat4", npcName:"Veterano de Neiva", npcEmoji:"🧓", type:"kill_count", killGoal:4, monsterName:"Rata Mutante",
    flavor:"Hay una plaga de ratas mutantes cerca. Derrota a 4 y de paso practicas.",
    rewardGold:55, rewardXp:180 },
];

export const BOSS_LIFESPAN_MS = 5 * 60000;
export const ULTIMATE_CHARGE_MS = 1300;
export const PARK_GUARDIAN_COOLDOWN_MS = 60 * 60000;

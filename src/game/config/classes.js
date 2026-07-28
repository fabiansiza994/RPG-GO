export const CLASSES = {
  guerrero: {
    name:"Guerrero", emoji:"🗡️",
    desc:"Alta vida y defensa. Golpes físicos constantes.",
    base:{hp:34,mp:8,atk:9,def:8,spd:6,matk:1},
    growth:{hp:6,mp:1,atk:2,def:2,spd:1,matk:0.3},
    movePool:[
      {lvl:1, id:"golpe_fuerte", name:"Golpe Fuerte", type:"phys", power:1.2, cost:0, desc:"Golpe físico sólido."},
      {lvl:1, id:"grito_intimidante", name:"Grito Intimidante", type:"debuff", stat:"atk", amount:0.2, cost:0, desc:"Reduce el ATQ del rival 20% por el resto del combate."},
      {lvl:3, id:"grito_guerra", name:"Grito de Guerra", type:"buff", buff:"atk", amount:0.25, dur:3, cost:2, desc:"Aumenta tu ATQ 25% por 3 turnos."},
      {lvl:5, id:"golpe_devastador", name:"Golpe Devastador", type:"phys", power:1.6, cost:3, desc:"Golpe pesado de gran daño."},
      {lvl:7, id:"muro_acero", name:"Muro de Acero", type:"buff", buff:"def", amount:0.35, dur:3, cost:3, desc:"Aumenta tu DEF 35% por 3 turnos."},
      {lvl:9, id:"ejecucion", name:"Ejecución", type:"phys", power:1.4, execute:true, cost:4, desc:"Daño extra si el rival tiene poca vida."},
      {lvl:11, id:"grito_heroico", name:"Grito Heroico", type:"heal", amount:0.2, cost:5, desc:"Recupera 20% de tu HP máx."},
      {lvl:13, id:"golpe_sismico", name:"Golpe Sísmico", type:"phys", power:1.8, stun:0.25, cost:5, interactive:"tap", desc:"Gran daño, puede aturdir. Toca rápido al usarlo para el daño completo."},
      {lvl:8, id:"terremoto", name:"Terremoto", type:"phys", power:1.3, aoe:true, cost:6, interactive:"sweep", desc:"Golpea a TODOS los enemigos del grupo. Desliza bien amplio para el daño completo."},
      {lvl:17, id:"golpe_fuerte_ii", name:"Golpe Fuerte II", type:"phys", power:1.7, cost:2, desc:"Versión mejorada de Golpe Fuerte."}
    ]
  },
  mago: {
    name:"Mago", emoji:"🧙",
    desc:"Ataques mágicos poderosos, vida frágil.",
    base:{hp:22,mp:26,atk:10,def:4,spd:7,matk:8},
    growth:{hp:3,mp:5,atk:2.4,def:1,spd:1.4,matk:2.2},
    movePool:[
      {lvl:1, id:"bola_fuego", name:"Bola de Fuego", type:"magic", power:1.25, cost:3, desc:"Proyectil ígneo."},
      {lvl:1, id:"debilitar", name:"Debilitar", type:"debuff", stat:"def", amount:0.25, cost:1, desc:"Reduce la DEF del rival 25% por el resto del combate."},
      {lvl:3, id:"rayo_helado", name:"Rayo Helado", type:"magic", power:1.05, slow:0.2, cost:3, desc:"Daño y reduce VEL enemiga."},
      {lvl:5, id:"escudo_arcano", name:"Escudo Arcano", type:"buff", buff:"def", amount:0.4, dur:3, cost:3, desc:"Barrera mágica: +40% DEF."},
      {lvl:7, id:"meteoro", name:"Meteoro", type:"magic", power:1.75, cost:7, desc:"Devastador, alto costo de maná."},
      {lvl:9, id:"drenar_vida", name:"Drenar Vida", type:"magic", power:1.0, drain:0.5, cost:4, desc:"Daña y te cura la mitad de lo infligido."},
      {lvl:11, id:"tormenta_rayos", name:"Tormenta de Rayos", type:"magic", power:0.85, hits:2, cost:6, desc:"Golpea dos veces."},
      {lvl:13, id:"explosion_arcana", name:"Explosión Arcana", type:"magic", power:2.3, cost:9, interactive:"swipe", desc:"El hechizo más letal. Sigue el patrón al usarlo para el daño completo."},
      {lvl:8, id:"lluvia_meteoros", name:"Lluvia de Meteoros", type:"magic", power:1.4, aoe:true, cost:10, interactive:"sweep", desc:"Golpea a TODOS los enemigos del grupo. Desliza bien amplio para el daño completo."},
      {lvl:8, id:"luz_sanadora", name:"Luz Sanadora", type:"heal", amount:0.35, allyHeal:true, cost:6, desc:"Cura al aliado con menos vida del grupo (o a ti, si estás peor)."},
      {lvl:8, id:"bendicion_grupal", name:"Bendición Grupal", type:"buff", buff:"atk", amount:0.2, dur:3, allyBuff:true, cost:7, desc:"Aumenta el ATQ de TODO el grupo 20% por 3 turnos."},
      {lvl:17, id:"bola_fuego_ii", name:"Bola de Fuego II", type:"magic", power:1.75, cost:4, desc:"Versión mejorada de Bola de Fuego."}
    ]
  },
  berserker: {
    name:"Berserker", emoji:"🪓",
    desc:"Furia descontrolada: mucho daño, poca defensa.",
    base:{hp:40,mp:5,atk:11,def:5,spd:8,matk:0},
    growth:{hp:7,mp:0.6,atk:2.6,def:1,spd:1.6,matk:0.2},
    movePool:[
      {lvl:1, id:"golpe_doble", name:"Golpe Doble", type:"phys", power:0.7, hits:2, cost:0, desc:"Dos golpes rápidos."},
      {lvl:1, id:"grito_feroz", name:"Grito Feroz", type:"debuff", stat:"def", amount:0.2, cost:0, desc:"Reduce la DEF del rival 20% por el resto del combate."},
      {lvl:3, id:"furia", name:"Furia", type:"buff", buff:"atk", amount:0.4, selfDef:-0.15, dur:3, cost:2, desc:"+40% ATQ, -15% DEF por 3 turnos."},
      {lvl:5, id:"sed_sangre", name:"Sed de Sangre", type:"phys", power:1.3, drain:0.4, cost:2, desc:"Daña y te cura parte del daño."},
      {lvl:7, id:"grito_salvaje", name:"Grito Salvaje", type:"phys", power:0.8, stun:0.35, cost:2, desc:"Puede aturdir al rival."},
      {lvl:9, id:"hachazo_brutal", name:"Hachazo Brutal", type:"phys", power:1.9, cost:4, desc:"Hachazo colosal."},
      {lvl:11, id:"sacrificio", name:"Sacrificio", type:"phys", power:2.1, selfDmg:0.1, cost:3, desc:"Daño enorme, te cuesta 10% de tu HP."},
      {lvl:13, id:"ira_descontrolada", name:"Ira Descontrolada", type:"phys", power:2.6, selfDefTurn:-0.2, cost:5, interactive:"tap", desc:"Daño extremo, baja tu DEF este turno. Toca rápido al usarlo para el daño completo."},
      {lvl:8, id:"giro_salvaje", name:"Giro Salvaje", type:"phys", power:1.2, aoe:true, cost:5, interactive:"sweep", desc:"Golpea a TODOS los enemigos del grupo. Desliza bien amplio para el daño completo."},
      {lvl:17, id:"embestida_ii", name:"Embestida II", type:"phys", power:1.5, cost:2, desc:"Versión mejorada de Embestida."}
    ]
  },
  arquero: {
    name:"Arquero", emoji:"🏹",
    desc:"Precisión y velocidad. Golpes críticos frecuentes.",
    base:{hp:26,mp:14,atk:9.5,def:6,spd:10,matk:2},
    growth:{hp:4,mp:2,atk:2.2,def:1.4,spd:2,matk:0.5},
    movePool:[
      {lvl:1, id:"disparo_certero", name:"Disparo Certero", type:"phys", power:1.15, crit:0.25, cost:0, interactive:"precision", desc:"Suelta en el momento justo de la barra: verde 80% daño, amarillo 100%, naranja 125%+5% crít., rojo 150%+20% crít."},
      {lvl:1, id:"flecha_cegadora", name:"Flecha Cegadora", type:"debuff", stat:"accuracy", amount:0.2, cost:0, desc:"Encandila al rival: 20% de que sus golpes fallen por el resto del combate."},
      {lvl:3, id:"lluvia_flechas", name:"Lluvia de Flechas", type:"phys", power:0.6, hits:2, cost:2, desc:"Dos impactos consecutivos."},
      {lvl:5, id:"tiro_piernas", name:"Tiro a las Piernas", type:"phys", power:0.95, slow:0.25, cost:2, desc:"Daña y reduce VEL enemiga."},
      {lvl:7, id:"flecha_perforante", name:"Flecha Perforante", type:"phys", power:1.1, pierce:0.5, cost:3, desc:"Ignora 50% de la DEF rival."},
      {lvl:9, id:"tiro_corazon", name:"Tiro al Corazón", type:"phys", power:1.5, crit:0.45, cost:4, desc:"Muy alta probabilidad de crítico."},
      {lvl:11, id:"viento_cortante", name:"Viento Cortante", type:"phys", power:1.25, selfBuffSpd:0.2, cost:4, desc:"Daña y aumenta tu propia VEL."},
      {lvl:13, id:"flecha_fatal", name:"Flecha Fatal", type:"phys", power:2.2, crit:0.3, cost:6, interactive:"tap", desc:"El disparo definitivo. Toca rápido al usarlo para el daño completo."},
      {lvl:8, id:"diluvio_flechas", name:"Diluvio de Flechas", type:"phys", power:1.1, aoe:true, cost:5, interactive:"sweep", desc:"Golpea a TODOS los enemigos del grupo. Desliza bien amplio para el daño completo."},
      {lvl:17, id:"disparo_certero_ii", name:"Disparo Certero II", type:"phys", power:1.55, crit:0.3, cost:2, interactive:"precision", desc:"Versión mejorada de Disparo Certero — misma barra de potencia."}
    ]
  }
};

export const ULTIMATE_MOVES = {
  guerrero: [
    {id:"ult_g1", baseName:"Golpe del Fin del Mundo", type:"phys", basePower:2.8},
    {id:"ult_g2", baseName:"Furia del Titán", type:"phys", basePower:2.5, hits:2},
    {id:"ult_g3", baseName:"Sentencia del Verdugo", type:"phys", basePower:2.9, execute:true},
    {id:"ult_g4", baseName:"Ruptura Total", type:"phys", basePower:2.3, aoe:true},
    {id:"ult_g5", baseName:"Voluntad Inquebrantable", type:"phys", basePower:2.6, crit:0.4}
  ],
  mago: [
    {id:"ult_m1", baseName:"Cataclismo Arcano", type:"magic", basePower:3.1},
    {id:"ult_m2", baseName:"Juicio Estelar", type:"magic", basePower:2.4, aoe:true},
    {id:"ult_m3", baseName:"Singularidad", type:"magic", basePower:2.8, drain:0.3},
    {id:"ult_m4", baseName:"Tormenta del Vacío", type:"magic", basePower:2.6, hits:2},
    {id:"ult_m5", baseName:"Sello Prohibido", type:"magic", basePower:3.3, execute:true}
  ],
  berserker: [
    {id:"ult_b1", baseName:"Masacre Sin Fin", type:"phys", basePower:3.0},
    {id:"ult_b2", baseName:"Ira Primordial", type:"phys", basePower:2.6, selfDmg:0.15},
    {id:"ult_b3", baseName:"Danza de la Muerte", type:"phys", basePower:2.3, aoe:true},
    {id:"ult_b4", baseName:"Golpe del Titán Ebrio", type:"phys", basePower:3.2, crit:0.35},
    {id:"ult_b5", baseName:"Último Aliento", type:"phys", basePower:3.4, execute:true}
  ],
  arquero: [
    {id:"ult_a1", baseName:"Flecha del Ocaso", type:"phys", basePower:2.9, crit:0.5},
    {id:"ult_a2", baseName:"Lluvia Celestial", type:"phys", basePower:2.2, aoe:true},
    {id:"ult_a3", baseName:"Tiro Perfecto", type:"phys", basePower:3.2, pierce:0.6},
    {id:"ult_a4", baseName:"Ráfaga Mortal", type:"phys", basePower:2.0, hits:3},
    {id:"ult_a5", baseName:"Sentencia del Cazador", type:"phys", basePower:3.0, execute:true}
  ]
};

export const ULTIMATE_TIER_NAMES = ["I", "II", "Maestro"];
export const ULTIMATE_TIER_MULT = [1, 1.35, 1.85];
export const ULTIMATE_TIER_COST = [10, 14, null];
export const ULTIMATE_UNLOCK_LEVEL = 35;
export const ULTIMATE_TIER2_LEVEL = 50;
export const ULTIMATE_TIER3_LEVEL = 65;
export const ULTIMATE_TIER_HP_COST = [0.40, 0.25, 0];

/** Traduce el classKey interno (español, usado en ~70 lugares del motor de combate/UI — no se
 *  toca) al valor en inglés que pide el campo `requiredClass` de los objetos del inventario.
 *  Es un alias de solo lectura para mostrar/filtrar — la verdad interna sigue siendo classKey. */
export const CLASS_ID_MAP = { guerrero:"warrior", arquero:"archer", mago:"mage", berserker:"berserker" };

/** Distintivo visual de clase (pastilla de color + emoji) para las tarjetas de objetos del
 *  inventario — pedido explícito: 🟥 Guerrero, 🟩 Arquero, 🟦 Mago, 🟪 Berserk. */
export const CLASS_BADGE = {
  guerrero:  { color:"#e5484d", dot:"🟥" },
  arquero:   { color:"#3fb950", dot:"🟩" },
  mago:      { color:"#4098e8", dot:"🟦" },
  berserker: { color:"#9d3fff", dot:"🟪" },
};

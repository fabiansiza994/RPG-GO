/** Pedido explícito: los radios de acá abajo se achicaron a propósito (antes 1600-2000, se
 *  superponían mucho entre sí — sobre todo centro/occidente, a solo ~1.3km de distancia real
 *  entre sus centros, con 1600+1800 de radio se pisaban casi por completo) para que cada zona
 *  quede geográficamente separada de sus vecinas: en el mismo lugar ya no se mezclan los
 *  monsterNames de dos zonas distintas. Los huecos que quedan ENTRE zonas (donde ya no entra
 *  ningún radio) no se quedan sin filtro — ahí cae el Ecosistema del Mundo (ver
 *  queryRealWorldBiomeHint/queryWorldEcosystem en pickMonsterTemplate, main.js), así que nunca
 *  vuelve a mezclarse TODO MONSTER_TEMPLATES sin criterio. */
export const NEIVA_ZONES = [
  { key:"centro",     name:"Centro",     color:"#e8c468", center:{lat:2.9263, lng:-75.2891}, radius:550,
    monsterNames:["Espectro","Cuervo Corrupto"] },
  { key:"norte",      name:"Norte",      color:"#4aa3e0", center:{lat:2.9440, lng:-75.2830}, radius:1300,
    monsterNames:["Rata Mutante","Trasgo"] },
  { key:"sur",        name:"Sur",        color:"#4fd67a", center:{lat:2.9080, lng:-75.2850}, radius:1300,
    monsterNames:["Golem de Roca","Demonio Menor"] },
  { key:"oriente",    name:"Oriente",    color:"#c98bf0", center:{lat:2.9280, lng:-75.2650}, radius:1150,
    monsterNames:["Lobo Umbrío","Araña Gigante"] },
  { key:"occidente",  name:"Occidente",  color:"#ef9d5d", center:{lat:2.9270, lng:-75.3010}, radius:550,
    monsterNames:["Slime Salvaje","Dragón Menor"] },
];

export const NEIVA_PARKS = [
  { id:"parque_santander", name:"Parque Santander", zoneKey:"centro", lat:2.92633, lng:-75.28914,
    guardianName:"Guardián de la Plaza", guardianEmoji:"👻", auraColor:"#e8c468",
    weaponNames:{guerrero:"Espada del Fundador", mago:"Cetro del Fundador", arquero:"Arco del Fundador", berserker:"Hacha del Fundador"},
    proc:null },
  { id:"parque_corales", name:"Parque Los Corales (Las Granjas)", zoneKey:"norte", lat:2.9430, lng:-75.2810,
    guardianName:"Centinela de Las Granjas", guardianEmoji:"👺", auraColor:"#4aa3e0",
    weaponNames:{guerrero:"Espada del Viento Norte", mago:"Cetro del Viento Norte", arquero:"Arco del Viento Norte", berserker:"Hacha del Viento Norte"},
    proc:{type:"haste", chance:0.3} },
  { id:"parque_oasis", name:"Parque del Río del Oro (Sur)", zoneKey:"sur", lat:2.9070, lng:-75.2870,
    guardianName:"Behemot del Río del Oro", guardianEmoji:"🗿", auraColor:"#4fd67a",
    weaponNames:{guerrero:"Espada del Río Dorado", mago:"Cetro del Río Dorado", arquero:"Arco del Río Dorado", berserker:"Hacha del Río Dorado"},
    proc:{type:"burn", chance:0.25, mult:0.5} },
  { id:"parque_gruta", name:"Parque de la Gruta (Los Guaduales)", zoneKey:"oriente", lat:2.9290, lng:-75.2630,
    guardianName:"Espíritu de la Cordillera", guardianEmoji:"🐉", auraColor:"#c98bf0",
    weaponNames:{guerrero:"Espada de la Cordillera", mago:"Cetro de la Cordillera", arquero:"Arco de la Cordillera", berserker:"Hacha de la Cordillera"},
    proc:{type:"burn", chance:0.3, mult:0.5} },
  { id:"malecon_magdalena", name:"Malecón del Río Magdalena", zoneKey:"occidente", lat:2.9270, lng:-75.2960,
    guardianName:"El Mohán del Magdalena", guardianEmoji:"🌊", auraColor:"#5ee1c9",
    weaponNames:{guerrero:"Espada del Mohán", mago:"Cetro del Mohán", arquero:"Arco del Mohán", berserker:"Hacha del Mohán"},
    proc:{type:"poison", chance:0.3, mult:0.5} },
];

export const NEIVA_MALLS = [
  { id:"mall_sanpedro", name:"San Pedro Plaza", lat:2.9345, lng:-75.2865 },
  { id:"mall_unicentro", name:"Unicentro Neiva", lat:2.9195, lng:-75.2925 },
];

/** ---------------------- BOGOTÁ, D.C. ---------------------- */
export const BOGOTA_ZONES = [
  { key:"centro",     name:"Centro (La Candelaria)", color:"#e8c468", center:{lat:4.5981, lng:-74.0758}, radius:2600,
    monsterNames:["Espectro","Cuervo Corrupto"] },
  { key:"norte",      name:"Norte (Chapinero / Usaquén)", color:"#4aa3e0", center:{lat:4.6900, lng:-74.0470}, radius:3200,
    monsterNames:["Trasgo","Rata Mutante"] },
  { key:"sur",        name:"Sur (Tunjuelito / Bosa)", color:"#4fd67a", center:{lat:4.5735, lng:-74.1329}, radius:3400,
    monsterNames:["Golem de Roca","Demonio Menor"] },
  { key:"oriente",    name:"Oriente (Cerros Orientales)", color:"#c98bf0", center:{lat:4.6247, lng:-74.0644}, radius:2200,
    monsterNames:["Lobo Umbrío","Araña Gigante"] },
  { key:"occidente",  name:"Occidente (Kennedy / Fontibón)", color:"#ef9d5d", center:{lat:4.6180, lng:-74.1470}, radius:3200,
    monsterNames:["Slime Salvaje","Dragón Menor"] },
];

export const BOGOTA_PARKS = [
  { id:"parque_independencia", name:"Parque de la Independencia", zoneKey:"centro", lat:4.6096, lng:-74.0721,
    guardianName:"Guardián de la Candelaria", guardianEmoji:"👻", auraColor:"#e8c468",
    weaponNames:{guerrero:"Espada de la Candelaria", mago:"Cetro de la Candelaria", arquero:"Arco de la Candelaria", berserker:"Hacha de la Candelaria"},
    proc:null },
  { id:"parque_93", name:"Parque de la 93", zoneKey:"norte", lat:4.6767, lng:-74.0503,
    guardianName:"Centinela de la Zona Rosa", guardianEmoji:"👺", auraColor:"#4aa3e0",
    weaponNames:{guerrero:"Espada de la Zona Rosa", mago:"Cetro de la Zona Rosa", arquero:"Arco de la Zona Rosa", berserker:"Hacha de la Zona Rosa"},
    proc:{type:"haste", chance:0.3} },
  { id:"parque_tunal", name:"Parque El Tunal", zoneKey:"sur", lat:4.5735, lng:-74.1329,
    guardianName:"Behemot del Tunal", guardianEmoji:"🗿", auraColor:"#4fd67a",
    weaponNames:{guerrero:"Espada del Tunal", mago:"Cetro del Tunal", arquero:"Arco del Tunal", berserker:"Hacha del Tunal"},
    proc:{type:"burn", chance:0.25, mult:0.5} },
  { id:"parque_nacional", name:"Parque Nacional", zoneKey:"oriente", lat:4.6247, lng:-74.0644,
    guardianName:"Espíritu de los Cerros", guardianEmoji:"🐉", auraColor:"#c98bf0",
    weaponNames:{guerrero:"Espada de los Cerros", mago:"Cetro de los Cerros", arquero:"Arco de los Cerros", berserker:"Hacha de los Cerros"},
    proc:{type:"burn", chance:0.3, mult:0.5} },
  { id:"parque_simonbolivar", name:"Parque Simón Bolívar", zoneKey:"occidente", lat:4.6584, lng:-74.0925,
    guardianName:"El Custodio del Simón Bolívar", guardianEmoji:"🌊", auraColor:"#5ee1c9",
    weaponNames:{guerrero:"Espada del Libertador", mago:"Cetro del Libertador", arquero:"Arco del Libertador", berserker:"Hacha del Libertador"},
    proc:{type:"poison", chance:0.3, mult:0.5} },
];

export const BOGOTA_MALLS = [
  { id:"mall_andino", name:"Centro Comercial Andino", lat:4.6668, lng:-74.0526 },
  { id:"mall_unicentro_bta", name:"Unicentro Bogotá", lat:4.7009, lng:-74.0433 },
  { id:"mall_santafe", name:"Centro Comercial Santafé", lat:4.7515, lng:-74.0432 },
  { id:"mall_granestacion", name:"Gran Estación", lat:4.6486, lng:-74.1004 },
];

/** ---------------------- ITAGÜÍ, ANTIOQUIA ---------------------- */
export const ITAGUI_ZONES = [
  { key:"centro",     name:"Centro",           color:"#e8c468", center:{lat:6.1719, lng:-75.6017}, radius:900,
    monsterNames:["Espectro","Trasgo"] },
  { key:"santamaria",  name:"Santa María (Vía de la Moda)", color:"#4aa3e0", center:{lat:6.1850, lng:-75.5920}, radius:900,
    monsterNames:["Rata Mutante","Cuervo Corrupto"] },
  { key:"ditaires",    name:"Ditaires",        color:"#4fd67a", center:{lat:6.1680, lng:-75.5890}, radius:900,
    monsterNames:["Golem de Roca","Demonio Menor"] },
  { key:"sur",         name:"Sur (Mayorca)",   color:"#ef9d5d", center:{lat:6.1500, lng:-75.5950}, radius:900,
    monsterNames:["Slime Salvaje","Dragón Menor"] },
];

export const ITAGUI_PARKS = [
  { id:"parque_simonbolivar_itagui", name:"Parque Simón Bolívar (Parque Principal)", zoneKey:"centro", lat:6.1719, lng:-75.6017,
    guardianName:"Guardián del Parque Principal", guardianEmoji:"👻", auraColor:"#e8c468",
    weaponNames:{guerrero:"Espada del Fundador", mago:"Cetro del Fundador", arquero:"Arco del Fundador", berserker:"Hacha del Fundador"},
    proc:null },
  { id:"parque_obrero", name:"Parque Obrero (El Brasil)", zoneKey:"santamaria", lat:6.1755, lng:-75.5985,
    guardianName:"Centinela de la Vía de la Moda", guardianEmoji:"👺", auraColor:"#4aa3e0",
    weaponNames:{guerrero:"Espada del Obrero", mago:"Cetro del Obrero", arquero:"Arco del Obrero", berserker:"Hacha del Obrero"},
    proc:{type:"haste", chance:0.3} },
  { id:"parque_ditaires", name:"Parque Recreativo Ditaires", zoneKey:"ditaires", lat:6.1680, lng:-75.5890,
    guardianName:"Behemot de Ditaires", guardianEmoji:"🗿", auraColor:"#4fd67a",
    weaponNames:{guerrero:"Espada de Ditaires", mago:"Cetro de Ditaires", arquero:"Arco de Ditaires", berserker:"Hacha de Ditaires"},
    proc:{type:"burn", chance:0.25, mult:0.5} },
  { id:"parque_artista", name:"Parque del Artista", zoneKey:"sur", lat:6.1650, lng:-75.6100,
    guardianName:"Espíritu del Manzanillo", guardianEmoji:"🐉", auraColor:"#c98bf0",
    weaponNames:{guerrero:"Espada del Manzanillo", mago:"Cetro del Manzanillo", arquero:"Arco del Manzanillo", berserker:"Hacha del Manzanillo"},
    proc:{type:"burn", chance:0.3, mult:0.5} },
];

export const ITAGUI_MALLS = [
  { id:"mall_mayorca", name:"Centro Comercial Mayorca", lat:6.1500, lng:-75.5950 },
  { id:"mall_viamoda", name:"Vía de la Moda / Centro de la Moda", lat:6.1850, lng:-75.5920 },
];

/** ---------------------- QUITO, ECUADOR ---------------------- */
export const QUITO_ZONES = [
  { key:"centro",  name:"Centro Histórico", color:"#e8c468", center:{lat:-0.2201, lng:-78.5123}, radius:1800,
    monsterNames:["Espectro","Cuervo Corrupto"] },
  { key:"norte",   name:"Norte (La Carolina / La Mariscal)", color:"#4aa3e0", center:{lat:-0.1880, lng:-78.4850}, radius:3000,
    monsterNames:["Trasgo","Rata Mutante"] },
  { key:"sur",     name:"Sur (Quitumbe / Solanda)", color:"#4fd67a", center:{lat:-0.2850, lng:-78.5500}, radius:3500,
    monsterNames:["Golem de Roca","Demonio Menor"] },
  { key:"valle",   name:"Valle de Cumbayá", color:"#c98bf0", center:{lat:-0.2039, lng:-78.4319}, radius:2500,
    monsterNames:["Lobo Umbrío","Araña Gigante"] },
];

export const QUITO_PARKS = [
  { id:"parque_ejido", name:"Parque El Ejido", zoneKey:"centro", lat:-0.2054, lng:-78.4936,
    guardianName:"Guardián de El Ejido", guardianEmoji:"👻", auraColor:"#e8c468",
    weaponNames:{guerrero:"Espada de El Ejido", mago:"Cetro de El Ejido", arquero:"Arco de El Ejido", berserker:"Hacha de El Ejido"},
    proc:null },
  { id:"parque_carolina", name:"Parque La Carolina", zoneKey:"norte", lat:-0.1836, lng:-78.4844,
    guardianName:"Centinela de La Carolina", guardianEmoji:"👺", auraColor:"#4aa3e0",
    weaponNames:{guerrero:"Espada de La Carolina", mago:"Cetro de La Carolina", arquero:"Arco de La Carolina", berserker:"Hacha de La Carolina"},
    proc:{type:"haste", chance:0.3} },
  { id:"parque_solanda", name:"Parque Central de Solanda", zoneKey:"sur", lat:-0.2843, lng:-78.5407,
    guardianName:"Behemot de Solanda", guardianEmoji:"🗿", auraColor:"#4fd67a",
    weaponNames:{guerrero:"Espada de Solanda", mago:"Cetro de Solanda", arquero:"Arco de Solanda", berserker:"Hacha de Solanda"},
    proc:{type:"burn", chance:0.25, mult:0.5} },
  { id:"parque_cumbaya", name:"Parque Central de Cumbayá", zoneKey:"valle", lat:-0.2039, lng:-78.4319,
    guardianName:"Espíritu del Valle", guardianEmoji:"🐉", auraColor:"#c98bf0",
    weaponNames:{guerrero:"Espada del Valle", mago:"Cetro del Valle", arquero:"Arco del Valle", berserker:"Hacha del Valle"},
    proc:{type:"burn", chance:0.3, mult:0.5} },
];

export const QUITO_MALLS = [
  { id:"mall_quicentro", name:"Quicentro Shopping", lat:-0.1935, lng:-78.4835 },
  { id:"mall_cci", name:"CCI (Centro Comercial Iñaquito)", lat:-0.1815, lng:-78.4870 },
  { id:"mall_sanmarino", name:"San Marino Shopping", lat:-0.2280, lng:-78.5210 },
  { id:"mall_scala", name:"Scala Shopping (Cumbayá)", lat:-0.2010, lng:-78.4370 },
];

/** Registro de ciudades disponibles: se usa para detectar automáticamente en cuál está el jugador
 *  según su posición GPS (o la de simulación), comparando contra un centro aproximado + radio de la ciudad. */
/** Fogatas de curación: una cerca de cada parque de la ciudad (con un pequeño desplazamiento para
 *  que no queden exactamente encima), donde el jugador se puede quedar quieto un momento a curarse. */
function campfiresFromParks(parks){
  return parks.map((p,i)=>({
    id:"fire_"+p.id, name:"Fogata de "+p.name.split("(")[0].trim(),
    lat:+(p.lat + 0.0009*(i%2===0?1:-1)).toFixed(6),
    lng:+(p.lng + 0.0009*(i%3===0?1:-1)).toFixed(6),
    healRadius:35, healPerTick:0.02, // 2% del HP máximo cada pocos segundos mientras estés dentro
  }));
}
export const NEIVA_CAMPFIRES = campfiresFromParks(NEIVA_PARKS);
export const BOGOTA_CAMPFIRES = campfiresFromParks(BOGOTA_PARKS);
export const QUITO_CAMPFIRES = campfiresFromParks(QUITO_PARKS);
/** Fogata extra puesta a mano justo en la zona Centro (Santa Fe / La Candelaria / Los Mártires),
 *  para tener algo a mano ahí mismo mientras se prueba. */
BOGOTA_CAMPFIRES.push({id:"fire_centro_test", name:"Fogata del Centro", lat:4.6017, lng:-74.0790, healRadius:35, healPerTick:0.02});

/** Santuarios: uno por cada centro comercial de la ciudad (para no encimarse con las fogatas,
 *  que usan los parques), alternando entre los 3 tipos — cada uno da un beneficio de combate
 *  temporal distinto mientras te quedas parado un momento cerca. */
export const SHRINE_TYPES = [
  {key:"guerrero", name:"Santuario del Guerrero", emoji:"⚔️", buffStat:"atk", buffAmount:0.10, durationMs:20*60000},
  {key:"arcano",   name:"Santuario Arcano",        emoji:"🧙", buffStat:"matk", buffAmount:0.10, durationMs:20*60000},
  {key:"viento",   name:"Santuario del Viento",    emoji:"🏹", buffStat:"spd", buffAmount:0.15, durationMs:20*60000},
];
function shrinesFromMalls(malls){
  return malls.map((m,i)=>{
    const type = SHRINE_TYPES[i % SHRINE_TYPES.length];
    return {
      id:"shrine_"+m.id, name:type.name, typeKey:type.key,
      lat:+(m.lat + 0.0007*(i%2===0?-1:1)).toFixed(6),
      lng:+(m.lng + 0.0007*(i%2===0?1:-1)).toFixed(6),
      activateRadius:30,
    };
  });
}
export const NEIVA_SHRINES = shrinesFromMalls(NEIVA_MALLS);
export const BOGOTA_SHRINES = shrinesFromMalls(BOGOTA_MALLS);
export const ITAGUI_SHRINES = shrinesFromMalls(ITAGUI_MALLS);
export const ITAGUI_CAMPFIRES = campfiresFromParks(ITAGUI_PARKS);
export const QUITO_SHRINES = shrinesFromMalls(QUITO_MALLS);

/** Torres de control: dos por cada región/zona de la ciudad (no por centro comercial), repartidas
 *  dentro del área de esa zona para que cualquier región tenga a dónde ir a pelear por una torre.
 *  Solo la PRIMERA de cada par (`landmark:true`) se ve siempre desde lejos, como referencia para
 *  orientarse — la segunda (`landmark:false`) solo aparece por proximidad (ver
 *  ENTITY_VISIBILITY.tower_proximity en visibility.js), para no saturar el mapa con demasiados
 *  íconos siempre visibles. */
function towersFromZones(zones, cityKey){
  const towers = [];
  zones.forEach(z=>{
    // metros -> grados aproximados (a estas latitudes, suficientemente preciso para este uso)
    const dLat = (z.radius*0.45) / 111320;
    const dLng = (z.radius*0.45) / (111320 * Math.cos(z.center.lat*Math.PI/180));
    const offsets = [[1,0.6],[-1,-0.6]]; // dos puntos en direcciones opuestas dentro de la zona
    offsets.forEach((o,i)=>{
      towers.push({
        id:"tower_"+cityKey+"_"+z.key+"_"+i,
        name:"Torre de "+z.name,
        lat:+(z.center.lat + dLat*o[0]).toFixed(6),
        lng:+(z.center.lng + dLng*o[1]).toFixed(6),
        goldPerHour:50,
        landmark: i===0,
      });
    });
  });
  return towers;
}
export const NEIVA_TOWERS = towersFromZones(NEIVA_ZONES, "neiva");
export const BOGOTA_TOWERS = towersFromZones(BOGOTA_ZONES, "bogota");
/** Dos torres extra puestas a mano justo en la zona Centro, muy cerca una de la otra, para poder
 *  probar el reto de torre sin tener que caminar lejos. */
BOGOTA_TOWERS.push(
  {id:"tower_centro_test1", name:"Torre del Centro (prueba 1)", lat:4.6020, lng:-74.0785, goldPerHour:50, landmark:true},
  {id:"tower_centro_test2", name:"Torre del Centro (prueba 2)", lat:4.6008, lng:-74.0800, goldPerHour:50, landmark:false},
);
export const ITAGUI_TOWERS = towersFromZones(ITAGUI_ZONES, "itagui");
export const QUITO_TOWERS = towersFromZones(QUITO_ZONES, "quito");

export const CARACAS_ZONES = [
  { key:"centro", name:"Centro", color:"#e8c468", center:{lat:10.4806, lng:-66.9036}, radius:6000,
    monsterNames:["Espectro","Lobo Umbrío"] },
];
export const CARACAS_PARKS = [];
export const CARACAS_MALLS = [];
export const CARACAS_CAMPFIRES = [];
export const CARACAS_TOWERS = [];
export const CARACAS_SHRINES = [];

/** ---------------------- PITALITO, HUILA (Valle de Laboyos) ----------------------
 *  Coordenadas reales verificadas: Parque Principal José Hilario López (1.8517565,-76.0468968) y
 *  Coliseo Cubierto de Pitalito (1.84747,-76.05375, dato de OpenStreetMap) — el resto de puntos
 *  (Gran Plaza San Antonio, límites de zona) son aproximaciones razonables sobre esa misma base. */
export const PITALITO_ZONES = [
  { key:"centro",   name:"Centro (Valle de Laboyos)", color:"#c9963c", center:{lat:1.8518, lng:-76.0469}, radius:1000,
    monsterNames:["Espectro","Cuervo Corrupto"] },
  { key:"solarte",  name:"Solarte", color:"#4fd67a", center:{lat:1.8475, lng:-76.0538}, radius:1000,
    monsterNames:["Rata Mutante","Trasgo"] },
];
export const PITALITO_PARKS = [
  { id:"parque_josehilariolopez", name:"Parque Principal José Hilario López", zoneKey:"centro", lat:1.8517565, lng:-76.0468968,
    guardianName:"Guardián del Valle de Laboyos", guardianEmoji:"☕", auraColor:"#c9963c",
    weaponNames:{guerrero:"Espada del Laboyano", mago:"Cetro del Laboyano", arquero:"Arco del Laboyano", berserker:"Hacha del Laboyano"},
    proc:{type:"haste", chance:0.3} },
];
export const PITALITO_MALLS = [
  { id:"mall_granplazasanantonio", name:"Centro Comercial Gran Plaza San Antonio", lat:1.8445, lng:-76.0508 },
];
export const PITALITO_CAMPFIRES = campfiresFromParks(PITALITO_PARKS);
export const PITALITO_SHRINES = shrinesFromMalls(PITALITO_MALLS);
export const PITALITO_TOWERS = towersFromZones(PITALITO_ZONES, "pitalito");

export const CITY_REGISTRY = [
  { key:"neiva",  name:"Neiva, Huila",         center:{lat:2.9273, lng:-75.2819}, radius:9000,
    zones:NEIVA_ZONES,  parks:NEIVA_PARKS,  malls:NEIVA_MALLS,  campfires:NEIVA_CAMPFIRES, towers:NEIVA_TOWERS, shrines:NEIVA_SHRINES,
    coliseo:{id:"coliseo_neiva", name:"Coliseo Guillermo Plazas Alcid", lat:2.9367, lng:-75.2795} },
  { key:"bogota", name:"Bogotá, D.C.",         center:{lat:4.6486, lng:-74.0900}, radius:22000,
    zones:BOGOTA_ZONES, parks:BOGOTA_PARKS, malls:BOGOTA_MALLS, campfires:BOGOTA_CAMPFIRES, towers:BOGOTA_TOWERS, shrines:BOGOTA_SHRINES,
    coliseo:{id:"coliseo_bogota", name:"Coliseo El Salitre", lat:4.66591, lng:-74.09484} },
  { key:"itagui", name:"Itagüí, Antioquia",    center:{lat:6.1719, lng:-75.6017}, radius:5000,
    zones:ITAGUI_ZONES, parks:ITAGUI_PARKS, malls:ITAGUI_MALLS, campfires:ITAGUI_CAMPFIRES, towers:ITAGUI_TOWERS, shrines:ITAGUI_SHRINES,
    coliseo:{id:"coliseo_itagui", name:"Coliseo Cubierto de Ditaires (El Cubo)", lat:6.1669, lng:-75.6269} },
  { key:"quito",  name:"Quito, Ecuador",       center:{lat:-0.2100, lng:-78.4950}, radius:25000,
    zones:QUITO_ZONES, parks:QUITO_PARKS, malls:QUITO_MALLS, campfires:QUITO_CAMPFIRES, towers:QUITO_TOWERS, shrines:QUITO_SHRINES,
    coliseo:{id:"coliseo_quito", name:"Coliseo General Rumiñahui", lat:-0.21268, lng:-78.48554} },
  { key:"caracas", name:"Caracas, Venezuela",  center:{lat:10.4806, lng:-66.9036}, radius:20000,
    zones:CARACAS_ZONES, parks:CARACAS_PARKS, malls:CARACAS_MALLS, campfires:CARACAS_CAMPFIRES, towers:CARACAS_TOWERS, shrines:CARACAS_SHRINES,
    coliseo:{id:"coliseo_caracas", name:"Poliedro de Caracas", lat:10.43375, lng:-66.93851} },
  { key:"pitalito", name:"Pitalito, Huila",    center:{lat:1.8530, lng:-76.0500}, radius:6000,
    zones:PITALITO_ZONES, parks:PITALITO_PARKS, malls:PITALITO_MALLS, campfires:PITALITO_CAMPFIRES, towers:PITALITO_TOWERS, shrines:PITALITO_SHRINES,
    coliseo:{id:"coliseo_pitalito", name:"Coliseo Cubierto de Pitalito", lat:1.84747, lng:-76.05375} },
];
/** Ciudad de respaldo si el jugador no está cerca de ninguna de las registradas (para no romper partidas viejas). */
export const DEFAULT_CITY_KEY = "neiva";

/* ============================================================
   SISTEMA DE PUNTOS DE INTERÉS (POI) — Mapa Vivo, Capa 1: Infraestructura del Mundo.

   Describe de forma genérica cómo se ve y cómo se interactúa con cada TIPO de estructura
   permanente del mundo (fogata, torre, santuario, coliseo) — nunca la lógica particular de cada
   una (esa sigue viviendo donde ya vivía: fogatas/torres/santuarios no se tocaron). Esto es
   solo el catálogo de tipos, para que las capas futuras (2 en adelante) tengan un solo lugar
   donde declarar un tipo de POI nuevo sin tener que tocar el resto del sistema.

   Cada POI concreto (uno de estos tipos, en un lugar concreto) tiene al menos:
   id, type, name, lat/lng, icon, radius (radio de interacción) y action (qué pasa al tocarlo).
   ============================================================ */
export const POI_TYPES = {
  campfire: {label:"Fogata",     icon:"🔥", defaultRadius:35, action:"campfire", permanent:true},
  tower:    {label:"Torre",      icon:"🗼", defaultRadius:40, action:"tower",    permanent:true},
  shrine:   {label:"Santuario",  icon:"⛲", defaultRadius:40, action:"shrine",   permanent:true},
  coliseo:  {label:"Coliseo",    icon:"🏟️", defaultRadius:45, action:"coliseo", permanent:true},
};
/** Arma la lista completa de Puntos de Interés de una ciudad con la forma genérica de arriba —
 *  junta fogatas/torres/santuarios/coliseo (los datos base de cada uno, antes de mapEdits) en un
 *  solo catálogo con la misma forma. Pensado para que las capas futuras del Mapa Vivo consulten
 *  "qué POIs hay en esta ciudad" sin conocer los detalles de cada tipo. No reemplaza los arrays
 *  propios (NEIVA_CAMPFIRES, etc.) que sigue usando el dibujo/interacción actual de cada uno. */
export function getCityPOIs(city){
  const list = [];
  (city.campfires||[]).forEach(c=> list.push({id:c.id, type:"campfire", name:c.name, lat:c.lat, lng:c.lng,
    icon:POI_TYPES.campfire.icon, radius:c.healRadius||POI_TYPES.campfire.defaultRadius, action:"campfire", props:c}));
  (city.towers||[]).forEach(t=> list.push({id:t.id, type:"tower", name:t.name, lat:t.lat, lng:t.lng,
    icon:POI_TYPES.tower.icon, radius:POI_TYPES.tower.defaultRadius, action:"tower", props:t}));
  (city.shrines||[]).forEach(s=> list.push({id:s.id, type:"shrine", name:s.name||"Santuario", lat:s.lat, lng:s.lng,
    icon:POI_TYPES.shrine.icon, radius:s.activateRadius||POI_TYPES.shrine.defaultRadius, action:"shrine", props:s}));
  if(city.coliseo) list.push({id:city.coliseo.id, type:"coliseo", name:city.coliseo.name, lat:city.coliseo.lat, lng:city.coliseo.lng,
    icon:POI_TYPES.coliseo.icon, radius:POI_TYPES.coliseo.defaultRadius, action:"coliseo", props:city.coliseo});
  return list;
}

export const UPGRADE_STATIONS = [
  ...NEIVA_PARKS.map(p=>({id:"upg_"+p.id, name:p.name, lat:p.lat, lng:p.lng, kind:"parque"})),
  ...NEIVA_MALLS.map(m=>({id:"upg_"+m.id, name:m.name, lat:m.lat, lng:m.lng, kind:"centro comercial"})),
  ...BOGOTA_PARKS.map(p=>({id:"upg_"+p.id, name:p.name, lat:p.lat, lng:p.lng, kind:"parque"})),
  ...BOGOTA_MALLS.map(m=>({id:"upg_"+m.id, name:m.name, lat:m.lat, lng:m.lng, kind:"centro comercial"})),
  ...ITAGUI_PARKS.map(p=>({id:"upg_"+p.id, name:p.name, lat:p.lat, lng:p.lng, kind:"parque"})),
  ...ITAGUI_MALLS.map(m=>({id:"upg_"+m.id, name:m.name, lat:m.lat, lng:m.lng, kind:"centro comercial"})),
  ...QUITO_PARKS.map(p=>({id:"upg_"+p.id, name:p.name, lat:p.lat, lng:p.lng, kind:"parque"})),
  ...QUITO_MALLS.map(m=>({id:"upg_"+m.id, name:m.name, lat:m.lat, lng:m.lng, kind:"centro comercial"})),
];

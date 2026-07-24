export const PET_SPECIES_PROFILES = {
  "Golem de Roca": {hpMult:1.45, atkMult:0.8,  defMult:1.55, hpGrowth:11, atkGrowth:1.0, defGrowth:1.7},
  "Lobo Umbrío":   {hpMult:0.7,  atkMult:1.55, defMult:0.7,  hpGrowth:4,  atkGrowth:2.3, defGrowth:0.5},
  "Dragón Menor":  {hpMult:1.0,  atkMult:1.15, defMult:1.0,  hpGrowth:7,  atkGrowth:1.6, defGrowth:1.0},
  "Demonio Menor": {hpMult:0.85, atkMult:1.3,  defMult:0.85, hpGrowth:5,  atkGrowth:1.9, defGrowth:0.7},
  // jefes de región (aparecen con temporizador de 5 min): mucho más fuertes en todo, no solo un perfil (tanque/ágil/equilibrado)
  "Dragón Ancestral": {hpMult:2.6, atkMult:2.2, defMult:2.0, hpGrowth:16, atkGrowth:2.8, defGrowth:2.2, isBossPet:true},
  "Behemot de Piedra": {hpMult:2.9, atkMult:1.9, defMult:2.4, hpGrowth:18, atkGrowth:2.2, defGrowth:2.6, isBossPet:true},
  "Señor Demonio":     {hpMult:2.5, atkMult:2.3, defMult:2.1, hpGrowth:16, atkGrowth:2.9, defGrowth:2.1, isBossPet:true},
  "Rey Trasgo":        {hpMult:2.4, atkMult:2.1, defMult:1.9, hpGrowth:15, atkGrowth:2.6, defGrowth:1.9, isBossPet:true},
};

export const DEFAULT_PET_PROFILE = {hpMult:1, atkMult:1.15, defMult:1, hpGrowth:6, atkGrowth:1.5, defGrowth:0.9};

/** Pedido explícito: por ahora SOLO estas tres especies se pueden invocar en combate — el resto de
 *  las mascotas capturadas quedan "solo para colección" mientras se van terminando los diseños de
 *  cada monstruo (ver openPetSummonPicker en main.js, que deshabilita el botón "Invocar" de
 *  cualquier mascota que no esté en esta lista, con un aviso en vez de ocultarla del todo). */
export const SUMMONABLE_PET_SPECIES = ["Lobo Umbrío", "Dragón Menor", "Dragón Ancestral"];

/** Movimientos propios de cada especie — se van aprendiendo solos al subir de nivel (como el jugador, hasta 4). */
export const PET_MOVESETS = {
  "Golem de Roca": [
    {atLevel:1,  id:"pet_golem_punio",     name:"Puñetazo de Piedra", power:1.3},
    {atLevel:10, id:"pet_golem_terremoto", name:"Terremoto",          power:1.7},
    {atLevel:20, id:"pet_golem_roca",      name:"Lanzamiento de Roca", power:2.0},
    {atLevel:30, id:"pet_golem_avalancha", name:"Avalancha",          power:2.4},
  ],
  "Lobo Umbrío": [
    {atLevel:1,  id:"pet_lobo_mordisco",  name:"Mordisco",           power:1.4},
    {atLevel:10, id:"pet_lobo_zarpazo",   name:"Zarpazo Feroz",      power:1.8},
    {atLevel:20, id:"pet_lobo_aullido",   name:"Aullido Intimidante", power:2.0},
    {atLevel:30, id:"pet_lobo_embestida", name:"Embestida Sombría",  power:2.5},
  ],
  "Dragón Menor": [
    {atLevel:1,  id:"pet_dragonm_aliento", name:"Aliento de Fuego",  power:1.5, moveType:"magic"},
    {atLevel:10, id:"pet_dragonm_cola",    name:"Coletazo",          power:1.8},
    {atLevel:20, id:"pet_dragonm_garras",  name:"Zarpazo Draconico", power:2.1},
    {atLevel:30, id:"pet_dragonm_furia",   name:"Furia del Dragón",  power:2.6, moveType:"magic"},
  ],
  "Demonio Menor": [
    {atLevel:1,  id:"pet_demonio_garra",    name:"Garra Infernal",  power:1.4},
    {atLevel:10, id:"pet_demonio_llamarada",name:"Llamarada",       power:1.8, moveType:"magic"},
    {atLevel:20, id:"pet_demonio_azote",    name:"Azote Demoníaco", power:2.1},
    {atLevel:30, id:"pet_demonio_infierno", name:"Furia Infernal",  power:2.6, moveType:"magic"},
  ],
  // jefes de región (mismos hechizos "grandes", más fuertes que los de su versión menor)
  "Dragón Ancestral": [
    {atLevel:1,  id:"pet_dragona_aliento", name:"Aliento Ancestral",  power:2.0, moveType:"magic"},
    {atLevel:10, id:"pet_dragona_cola",    name:"Coletazo Titánico",  power:2.3},
    {atLevel:20, id:"pet_dragona_garras",  name:"Zarpazo Primordial", power:2.6},
    {atLevel:30, id:"pet_dragona_furia",   name:"Furia Ancestral",    power:3.2, moveType:"magic"},
  ],
  "Behemot de Piedra": [
    {atLevel:1,  id:"pet_behemot_punio",     name:"Puño de Titán",     power:1.9},
    {atLevel:10, id:"pet_behemot_terremoto", name:"Sismo Colosal",     power:2.2},
    {atLevel:20, id:"pet_behemot_roca",      name:"Lluvia de Rocas",   power:2.5},
    {atLevel:30, id:"pet_behemot_avalancha", name:"Avalancha Titánica", power:3.1},
  ],
  "Señor Demonio": [
    {atLevel:1,  id:"pet_senordemonio_garra",     name:"Zarpa del Averno",   power:2.0},
    {atLevel:10, id:"pet_senordemonio_llamarada", name:"Llamarada Infernal", power:2.3, moveType:"magic"},
    {atLevel:20, id:"pet_senordemonio_azote",     name:"Azote del Inframundo", power:2.6},
    {atLevel:30, id:"pet_senordemonio_infierno",  name:"Juicio Demoníaco",   power:3.2, moveType:"magic"},
  ],
  "Rey Trasgo": [
    {atLevel:1,  id:"pet_reytrasgo_golpe",   name:"Golpe de Cetro",     power:1.8},
    {atLevel:10, id:"pet_reytrasgo_orden",   name:"Orden de Ataque",    power:2.1},
    {atLevel:20, id:"pet_reytrasgo_furia",   name:"Furia Real",         power:2.4},
    {atLevel:30, id:"pet_reytrasgo_corona",  name:"Ira de la Corona",   power:3.0},
  ],
};
/** Para cualquier otra criatura capturable que no tenga un set propio todavía (slime, rata, espectro, etc). */
export const DEFAULT_PET_MOVESET = [
  {atLevel:1,  id:"pet_golpe",         name:"Golpe",          power:1.3},
  {atLevel:10, id:"pet_embestida",     name:"Embestida Feroz", power:1.8},
  {atLevel:20, id:"pet_golpe_certero", name:"Golpe Certero",  power:2.1},
  {atLevel:30, id:"pet_furia_salvaje", name:"Furia Salvaje",  power:2.5},
];

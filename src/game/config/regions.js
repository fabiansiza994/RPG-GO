/* ============================================================
   REGIONES — Mapa Vivo, Capa 5: Regiones del Mundo.

   Responsabilidad de este archivo: SOLO la configuración — qué nombre, ícono, color, rango de
   nivel y jefe le corresponde a una región según su BIOMA (Capa 4). Nada de esto decide todavía
   en qué región está el jugador (eso lo hace ./game/systems/regionManager.js) ni cambia el mapa,
   el combate, los recursos ni los NPCs — solo le pone nombre e identidad de RPG a zonas que ya
   existen.

   Las regiones NO reemplazan al Ecosystem Engine: una región simplemente ENVUELVE un bioma con
   presentación (nombre, ícono, color, descripción) — el contenido que puede aparecer ahí lo sigue
   decidiendo el bioma de siempre.
   ============================================================ */

import { BIOME_KEYS } from "./biomes.js";

/** Por cada bioma, un puñado de nombres de fantasía — se elige uno de forma determinística por
 *  zona/parque (misma zona, mismo nombre siempre), nunca al azar puro. Agregar más nombres a la
 *  lista es la única forma de "configurarlo": no hace falta tocar el resto del sistema. */
export const REGION_NAME_POOLS = {
  [BIOME_KEYS.FOREST]: ["Bosque del Lobo Gris", "Bosque Sombrío", "Bosque Encantado", "Espesura Susurrante"],
  [BIOME_KEYS.MOUNTAIN]: ["Montañas del Titán", "Picos del Golem", "Cumbres Ancestrales", "Paso del Guardián"],
  [BIOME_KEYS.CITY]: ["Distrito del Mercader", "Ciudadela Dorada", "Barrio Viejo", "Plaza del Errante"],
  [BIOME_KEYS.INDUSTRIAL]: ["Cantera del Hierro", "Minas Olvidadas", "Forjas Abandonadas"],
  [BIOME_KEYS.RUINS]: ["Ruinas Olvidadas", "Ciudad Antigua", "Ecos del Pasado"],
  [BIOME_KEYS.RIVER]: ["Costa del Dragón", "Puerto del Cuervo", "Ribera Silenciosa"],
  [BIOME_KEYS.PLAINS]: ["Valle Esmeralda", "Llanuras del Viajero", "Praderas Doradas"],
};

/** Ícono e identidad visual por bioma — reutilizado por todas las regiones de ese bioma. */
export const REGION_PRESENTATION = {
  [BIOME_KEYS.FOREST]:     { icon: "🌲", color: "#4fd67a" },
  [BIOME_KEYS.MOUNTAIN]:   { icon: "🏔️", color: "#aab2c5" },
  [BIOME_KEYS.CITY]:       { icon: "🏙️", color: "#e8c468" },
  [BIOME_KEYS.INDUSTRIAL]: { icon: "⛏️", color: "#e8983a" },
  [BIOME_KEYS.RUINS]:      { icon: "🏛️", color: "#9d78ff" },
  [BIOME_KEYS.RIVER]:      { icon: "🌊", color: "#4aa3e0" },
  [BIOME_KEYS.PLAINS]:     { icon: "🌾", color: "#c9a83a" },
};

/** Rango de nivel recomendado por bioma — un valor de referencia simple (no una mecánica nueva),
 *  para mostrarlo en la presentación de la región. */
export const REGION_LEVEL_RANGE = {
  [BIOME_KEYS.FOREST]: [1, 15],
  [BIOME_KEYS.PLAINS]: [1, 15],
  [BIOME_KEYS.CITY]: [1, 20],
  [BIOME_KEYS.RIVER]: [5, 20],
  [BIOME_KEYS.INDUSTRIAL]: [15, 35],
  [BIOME_KEYS.RUINS]: [20, 45],
  [BIOME_KEYS.MOUNTAIN]: [20, 50],
};

/** Jefe regional asociado por bioma — SOLO una etiqueta/asociación de presentación. No crea un
 *  jefe nuevo ni cambia el sistema de jefes actual: es el mismo BOSS_TEMPLATES de siempre, acá
 *  solo se documenta cuál "representa" a cada tipo de región. */
export const REGION_BOSS_BY_BIOME = {
  [BIOME_KEYS.FOREST]: "Lobo Alfa",
  [BIOME_KEYS.MOUNTAIN]: "Golem Ancestral",
  [BIOME_KEYS.RUINS]: "Demonio Mayor",
  [BIOME_KEYS.INDUSTRIAL]: "Golem Ancestral",
  [BIOME_KEYS.CITY]: null,
  [BIOME_KEYS.RIVER]: null,
  [BIOME_KEYS.PLAINS]: "Lobo Alfa",
};

/** Descripción cortita por bioma — para la ficha de la región (Capa 5 solo prepara el modelo,
 *  no es obligatorio mostrar toda esta info todavía). */
export const REGION_DESCRIPTION_BY_BIOME = {
  [BIOME_KEYS.FOREST]: "Un bosque denso donde acechan lobos entre los árboles.",
  [BIOME_KEYS.MOUNTAIN]: "Picos escarpados donde solo los más fuertes se aventuran.",
  [BIOME_KEYS.CITY]: "Calles llenas de comerciantes y vida urbana.",
  [BIOME_KEYS.INDUSTRIAL]: "Canteras y forjas abandonadas, ricas en mineral.",
  [BIOME_KEYS.RUINS]: "Restos de una civilización olvidada por el tiempo.",
  [BIOME_KEYS.RIVER]: "Aguas tranquilas que esconden peligros propios.",
  [BIOME_KEYS.PLAINS]: "Llanuras abiertas, cruce obligado de viajeros.",
};

/* ============================================================
   MINIGAME_DEFS — registro de minijuegos del Salón de la Fortuna.
   ------------------------------------------------------------
   Pedido explícito de escalabilidad: agregar un minijuego nuevo (Ruleta
   Arcana, Runa Sagrada, Dados del Destino, Vasijas del Alquimista...) debe
   ser posible agregando UNA entrada acá, sin tocar los minijuegos
   existentes. fortuneHallRepository.js siembra el estado diario a partir de
   esta lista, y el renderizado de la fila de minijuegos en main.js itera
   sobre ella en vez de tener "chest"/"cards" escritos a mano.

   `adPlacement` debe existir en PLACEMENT_CONFIG (ver ads.config.js) — un
   placement POR minijuego, nunca compartido, para que cada uno pueda
   ofrecer su segundo intento de forma independiente.
   ============================================================ */
import { CHEST_COUNT, CARD_COUNT } from "../../config/fortuneHall.config.js";

export const MINIGAME_DEFS = Object.freeze([
  Object.freeze({
    id: "chest",
    label: "Cofre del Aventurero",
    subtitle: "Elige un cofre — los tres esconden lo mismo.",
    icon: "🪙",
    pickCount: CHEST_COUNT,
    adPlacement: "FORTUNE_CHEST_SECOND_TRY",
  }),
  Object.freeze({
    id: "cards",
    label: "Cartas del Destino",
    subtitle: "Elige una carta y descubre tu suerte.",
    icon: "🃏",
    pickCount: CARD_COUNT,
    adPlacement: "FORTUNE_CARDS_SECOND_TRY",
  }),
  Object.freeze({
    id: "wheel",
    label: "Ruleta de la Fortuna",
    subtitle: "Gira la rueda y deja que el destino decida tu recompensa.",
    icon: "🎡",
    pickCount: 1, // un solo giro entrega un solo resultado — no hay "decoys" como en chest/cards
    adPlacement: "FORTUNE_WHEEL_SECOND_TRY",
  }),
]);

export function getMinigameDef(gameId){
  return MINIGAME_DEFS.find(d => d.id === gameId) || null;
}

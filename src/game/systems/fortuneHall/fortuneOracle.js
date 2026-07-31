/* ============================================================
   FortuneOracle — el Oráculo del Salón de la Fortuna. Solo ambientación:
   una frase al azar cada vez que se abre el Salón, nunca se persiste ni
   afecta las probabilidades reales (ver fortuneRewardPool.js).
   ============================================================ */
import { ORACLE_QUOTES } from "../../config/fortuneHall.config.js";

/** `rng` inyectable para tests deterministas — mismo criterio que el resto
 *  del sistema (fortuneRewardPool.js, fortuneRewardService.js). */
export function pickOracleQuote(rng = Math.random){
  const idx = Math.floor(rng() * ORACLE_QUOTES.length);
  return ORACLE_QUOTES[Math.min(idx, ORACLE_QUOTES.length - 1)];
}

/* ============================================================
   DIFFICULTY DIRECTOR — Capa 7: Combat Power & Difficulty Director.

   Responsabilidad de este archivo: decidir QUÉ VARIANTE de dificultad le toca a un desafío nuevo
   (normal/fuerte/élite/legendario, ver DIFFICULTY_TIERS en config/difficultyProfiles.js) y qué
   rango de Combat Power objetivo le corresponde, relativo al CP real del jugador. Función pura:
   recibe el CP del jugador y la tabla de variantes por parámetro, nunca decide todavía QUÉ
   enemigo concreto generar (eso es EnemyPowerGenerator, que usa este director + PowerScaling).
   ============================================================ */

/** Sortea una variante respetando los pesos relativos de `tiers` (no hace falta que sumen 100).
 *  `rng` es inyectable (función que devuelve [0,1)) para poder probar el sorteo de forma
 *  determinística — por defecto usa Math.random. */
export function rollDifficultyTier(tiers, rng){
  rng = rng || Math.random;
  const totalWeight = tiers.reduce((s,t)=> s + t.weight, 0);
  if(totalWeight <= 0) return tiers[0];
  let roll = rng() * totalWeight;
  for(const tier of tiers){
    roll -= tier.weight;
    if(roll <= 0) return tier;
  }
  return tiers[tiers.length-1];
}

/** Rango de Combat Power objetivo (absoluto, no fracción) para una variante ya sorteada, relativo
 *  al CP real del jugador. `legendary` (o cualquier variante sin `cpMax`) usa `cpMaxFallbackMult`
 *  como techo del sorteo — nunca "sin techo real" para no romper el generador de nivel. */
export function computeTargetCPRange(tier, playerCP){
  const min = Math.max(1, Math.round(playerCP * tier.cpMin));
  const maxMult = tier.cpMax != null ? tier.cpMax : (tier.cpMaxFallbackMult || tier.cpMin + 0.3);
  const max = Math.max(min+1, Math.round(playerCP * maxMult));
  return { min, max };
}

/** Un valor concreto de CP objetivo dentro del rango de la variante — listo para pasarle a
 *  PowerScaling.findLevelForTargetCP(). */
export function pickTargetCP(tier, playerCP, rng){
  rng = rng || Math.random;
  const { min, max } = computeTargetCPRange(tier, playerCP);
  return Math.round(min + rng() * (max - min));
}

/** Conveniencia: sortea la variante Y devuelve de una vez su CP objetivo concreto. Es lo que en la
 *  práctica va a llamar EnemyPowerGenerator. */
export function rollDifficulty(tiers, playerCP, rng){
  const tier = rollDifficultyTier(tiers, rng);
  const targetCP = pickTargetCP(tier, playerCP, rng);
  return { tier, targetCP };
}

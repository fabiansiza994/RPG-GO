// Mismo motivo que GUERRERO_SPRITE_V más abajo: public/ no lleva hash de contenido, así que se
// cachebustea con el BUILD_ID para que un reemplazo de archivo (como el de esta sesión, arte nuevo
// del Ladrón Errante) se descargue de nuevo en vez de servir la versión vieja cacheada.
const THIEF_SPRITE_V = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "";
// Mismo motivo — reemplazo de arte del Espectro (la pose "hurt") en esta sesión.
const ESPECTRO_SPRITE_V = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "";
export const spriteRegistry = {
	THIEF_SPRITES: {
		map: `/assets/sprites/thief/map.png?v=${THIEF_SPRITE_V}`,
		base: `/assets/sprites/thief/base.png?v=${THIEF_SPRITE_V}`,
		attack: `/assets/sprites/thief/attack.png?v=${THIEF_SPRITE_V}`,
	},
	LOBO_SOMBRIO_SPRITES: {
		base: "/assets/sprites/lobo-sombrio/base.png",
		attack: "/assets/sprites/lobo-sombrio/attack.png",
		dodge: "/assets/sprites/lobo-sombrio/dodge.png",
		charge: "/assets/sprites/lobo-sombrio/charge.png",
		special: "/assets/sprites/lobo-sombrio/special.png",
	},
	LOBO_UMBRIO_SPRITES: {
		petBase: "/assets/sprites/lobo-umbrio/pet-base.png",
		petAttack: "/assets/sprites/lobo-umbrio/pet-attack.png",
		petBaseOpponent: "/assets/sprites/lobo-umbrio/pet-base-opponent.png",
		petAttackOpponent: "/assets/sprites/lobo-umbrio/pet-attack-opponent.png",
		enemy: "/assets/sprites/lobo-umbrio/enemy.png",
		// Variante usada para el/los compañero(s) de manada, así no todos los Lobo Umbrío se ven
		// idénticos cuando salen en grupo (ver enemySpriteSrc en main.js, que alterna enemy/enemyVar
		// según el índice del miembro dentro de la manada).
		enemyVar: "/assets/sprites/lobo-umbrio/enemy_var.png",
		// Pose de ataque como enemigo — antes solo se resaltaba la ilustración fija (ver
		// triggerLoboAttackPose en main.js), ahora cambia a esta imagen mientras dura el golpe.
		enemyAttack: "/assets/sprites/lobo-umbrio/enemy_ataque.png",
		// Ilustración del marcador en el mapa (reemplaza el emoji 🐺) — ver asignación a
		// MONSTER_TEMPLATES en main.js, mismo mecanismo que DUNGEON_AURA_ENEMY_MAP_SPRITES.
		map: "/new_elements/lobo_map.png",
	},
	DEMONIO_MENOR_SPRITES: {
		enemy: "/assets/sprites/demonio-menor/enemy.png",
		petBase: "/assets/sprites/demonio-menor/pet-base.png",
		petAttack: "/assets/sprites/demonio-menor/pet-attack.png",
		// Pose de ataque como enemigo — mismo patrón que LOBO_UMBRIO_SPRITES.enemyAttack
		// (ver triggerDemonioAttackPose/triggerPackDemonioAttackPose en main.js).
		enemyAttack: "/assets/sprites/demonio-menor/enemy_ataque.png",
		// Ilustración del marcador en el mapa (reemplaza el emoji 👹) — mismo mecanismo que
		// LOBO_UMBRIO_SPRITES.map, ver asignación a MONSTER_TEMPLATES en main.js.
		map: "/new_elements/demonio_meno_mapa.png",
	},
	CUERVO_CORRUPTO_SPRITES: {
		enemy: "/assets/sprites/cuervo-corrupto/cuervo_corrupto.png",
		// Variante para el/los compañero(s) de manada — mismo mecanismo que LOBO_UMBRIO_SPRITES.enemyVar.
		enemyVar: "/assets/sprites/cuervo-corrupto/cuervo_corrupto_variante.png",
		// Pose de ataque como enemigo — mismo patrón que LOBO_UMBRIO_SPRITES.enemyAttack.
		enemyAttack: "/assets/sprites/cuervo-corrupto/cuervo_corrupto_ataque.png",
		// Ilustración del marcador en el mapa (reemplaza el emoji 🐦‍⬛).
		map: "/assets/sprites/cuervo-corrupto/cuervo_corrupto_map.png",
		// Pose de golpe recibido — cuando el JUGADOR le pega a él (no confundir con enemyAttack,
		// que es cuando ÉL ataca al jugador). Mismo patrón que RATA_MUTANTE_SPRITES.hurt.
		hurt: "/assets/sprites/cuervo-corrupto/hurt.png",
	},
	GOLEM_ROCA_SPRITES: {
		enemy: "/assets/sprites/golem-roca/enemy.png",
		petBase: "/assets/sprites/golem-roca/pet-base.png",
		petAttack: "/assets/sprites/golem-roca/pet-attack.png",
	},
	DRAGON_MENOR_SPRITES: {
		enemy: "/assets/sprites/dragon-menor/enemy.png",
		petBase: "/assets/sprites/dragon-menor/pet-base.png",
		petAttack: "/assets/sprites/dragon-menor/pet-attack.png",
		petBaseOpponent: "/assets/sprites/dragon-menor/pet-base-opponent.png",
		petAttackOpponent: "/assets/sprites/dragon-menor/pet-attack-opponent.png",
	},
	DRAGON_ANCESTRAL_SPRITES: {
		enemy: "/assets/sprites/dragon-ancestral/enemy.png",
		petBase: "/assets/sprites/dragon-ancestral/pet-base.png",
		petAttack: "/assets/sprites/dragon-ancestral/pet-attack.png",
		petBaseOpponent: "/assets/sprites/dragon-ancestral/pet-base-opponent.png",
		petAttackOpponent: "/assets/sprites/dragon-ancestral/pet-attack-opponent.png",
	},
	LOBO_NOCTURNO_SPRITES: {
		enemy: "/assets/sprites/lobo-nocturno/enemy.png",
	},
	RATA_MUTANTE_SPRITES: {
		base: "/assets/sprites/rata-gigante/rata-base.png",
		attack: "/assets/sprites/rata-gigante/rata-ataque.png",
		hurt: "/assets/sprites/rata-gigante/rata-golpe.png",
		// Ilustración del marcador en el mapa (reemplaza el emoji 🐀).
		map: "/assets/sprites/rata-gigante/rata-map.png",
	},
	SLIME_SALVAJE_SPRITES: {
		base: "/assets/sprites/slime-salvaje/base.png",
		attack: "/assets/sprites/slime-salvaje/attack.png",
		hurt: "/assets/sprites/slime-salvaje/hurt.png",
		// Ilustración del marcador en el mapa (reemplaza el emoji 🟢) — mismo mecanismo que
		// LOBO_UMBRIO_SPRITES.map, ver asignación a MONSTER_TEMPLATES en main.js.
		map: "/assets/sprites/slime-salvaje/slime_map.png",
	},
	ESPECTRO_SPRITES: {
		base: "/assets/sprites/espectro/base.png",
		attack: "/assets/sprites/espectro/attack.png",
		hurt: `/assets/sprites/espectro/hurt.png?v=${ESPECTRO_SPRITE_V}`,
	},
	CLASS_PORTRAITS: {
		arquero: {
			m: { map: "/assets/sprites/misc/map.png", combat: "/assets/sprites/misc/map-1.png" },
			f: { map: "/assets/sprites/misc/map-2.png", combat: "/assets/sprites/misc/map-3.png" },
		},
		guerrero: {
			m: { map: "/assets/sprites/misc/map-4.png", combat: "/assets/sprites/misc/map-5.png" },
			f: { map: "/assets/sprites/misc/map-6.png", combat: "/assets/sprites/misc/map-7.png" },
		},
		mago: {
			m: { map: "/assets/sprites/misc/map-8.png", combat: "/assets/sprites/misc/map-9.png" },
			f: { map: "/assets/sprites/misc/map-10.png", combat: "/assets/sprites/misc/map-11.png" },
		},
		berserker: {
			m: { map: "/assets/sprites/misc/map-12.png", combat: "/assets/sprites/misc/map-13.png" },
			f: { map: "/assets/sprites/misc/map-14.png", combat: "/assets/sprites/misc/map-15.png" },
		},
	},
	CLASS_WALK_SPRITES: {
		guerrero: {
			m: {
				down: "/assets/sprites/class-walk/down.png",
				up: "/assets/sprites/class-walk/up.png",
				left: "/assets/sprites/class-walk/left.png",
				right: "/assets/sprites/class-walk/right.png",
			},
			f: {
				down: "/assets/sprites/class-walk-f/down.png",
				up: "/assets/sprites/class-walk-f/up.png",
				left: "/assets/sprites/class-walk-f/left.png",
				right: "/assets/sprites/class-walk-f/right.png",
			},
		},
		berserker: {
			m: {
				down: "/assets/sprites/class-walk-berserker/down.png",
				up: "/assets/sprites/class-walk-berserker/up.png",
				left: "/assets/sprites/class-walk-berserker/left.png",
				right: "/assets/sprites/class-walk-berserker/right.png",
			},
			f: {
				down: "/assets/sprites/class-walk-berserker-f/down.png",
				up: "/assets/sprites/class-walk-berserker-f/up.png",
				left: "/assets/sprites/class-walk-berserker-f/left.png",
				right: "/assets/sprites/class-walk-berserker-f/right.png",
			},
		},
		arquero: {
			m: {
				down: "/assets/sprites/class-walk-arquero/down.png",
				up: "/assets/sprites/class-walk-arquero/up.png",
				left: "/assets/sprites/class-walk-arquero/left.png",
				right: "/assets/sprites/class-walk-arquero/right.png",
			},
			f: {
				down: "/assets/sprites/class-walk-arquero-f/down.png",
				up: "/assets/sprites/class-walk-arquero-f/up.png",
				left: "/assets/sprites/class-walk-arquero-f/left.png",
				right: "/assets/sprites/class-walk-arquero-f/right.png",
			},
		},
		mago: {
			m: {
				down: "/assets/sprites/class-walk-mago/down.png",
				up: "/assets/sprites/class-walk-mago/up.png",
				left: "/assets/sprites/class-walk-mago/left.png",
				right: "/assets/sprites/class-walk-mago/right.png",
			},
			f: {
				down: "/assets/sprites/class-walk-mago-f/down.png",
				up: "/assets/sprites/class-walk-mago-f/up.png",
				left: "/assets/sprites/class-walk-mago-f/left.png",
				right: "/assets/sprites/class-walk-mago-f/right.png",
			},
		},
	},
	CLASS_BATTLE_SPRITES: {
		arquero: {
			m: { base: "/assets/sprites/class-battle/base.png", attack: "/assets/sprites/class-battle/base-1.png" },
			f: { base: "/assets/sprites/class-battle/base-2.png", attack: "/assets/sprites/class-battle/base-3.png" },
		},
		guerrero: {
			m: { base: "/assets/sprites/class-battle/base-4.png", attack: "/assets/sprites/class-battle/base-5.png" },
			f: { base: "/assets/sprites/class-battle/base-6.png", attack: "/assets/sprites/class-battle/base-7.png" },
		},
		mago: {
			m: { base: "/assets/sprites/class-battle/base-8.png", attack: "/assets/sprites/class-battle/base-9.png" },
			f: { base: "/assets/sprites/class-battle/base-10.png", attack: "/assets/sprites/class-battle/base-11.png" },
		},
		berserker: {
			m: { base: "/assets/sprites/class-battle/base-12.png", attack: "/assets/sprites/class-battle/base-13.png" },
			f: { base: "/assets/sprites/class-battle/base-14.png", attack: "/assets/sprites/class-battle/base-15.png" },
		},
	},
};

export const THIEF_SPRITES = spriteRegistry.THIEF_SPRITES;
export const LOBO_SOMBRIO_SPRITES = spriteRegistry.LOBO_SOMBRIO_SPRITES;
export const LOBO_UMBRIO_SPRITES = spriteRegistry.LOBO_UMBRIO_SPRITES;
export const CUERVO_CORRUPTO_SPRITES = spriteRegistry.CUERVO_CORRUPTO_SPRITES;
export const DEMONIO_MENOR_SPRITES = spriteRegistry.DEMONIO_MENOR_SPRITES;
export const GOLEM_ROCA_SPRITES = spriteRegistry.GOLEM_ROCA_SPRITES;
export const DRAGON_MENOR_SPRITES = spriteRegistry.DRAGON_MENOR_SPRITES;
export const DRAGON_ANCESTRAL_SPRITES = spriteRegistry.DRAGON_ANCESTRAL_SPRITES;
export const LOBO_NOCTURNO_SPRITES = spriteRegistry.LOBO_NOCTURNO_SPRITES;
export const RATA_MUTANTE_SPRITES = spriteRegistry.RATA_MUTANTE_SPRITES;
export const SLIME_SALVAJE_SPRITES = spriteRegistry.SLIME_SALVAJE_SPRITES;
export const ESPECTRO_SPRITES = spriteRegistry.ESPECTRO_SPRITES;
export const CLASS_PORTRAITS = spriteRegistry.CLASS_PORTRAITS;
export const CLASS_WALK_SPRITES = spriteRegistry.CLASS_WALK_SPRITES;
export const CLASS_BATTLE_SPRITES = spriteRegistry.CLASS_BATTLE_SPRITES;
/** Arte del NPC Vagabundo — de pie para el marcador del mapa, y un retrato circular para el modal
 *  (reemplaza el emoji 🧔 en ambos lugares). Igual que el Ladrón, cachebusteado con el BUILD_ID
 *  porque public/ no lleva hash de contenido. */
const VAGABUNDO_SPRITE_V = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "";
export const VAGABUNDO_SPRITES = {
  map: `/assets/sprites/vagabundo/map.png?v=${VAGABUNDO_SPRITE_V}`,
  portrait: `/assets/sprites/vagabundo/portrait.png?v=${VAGABUNDO_SPRITE_V}`,
};
/** Arte del Mercader Ambulante (entidad dinámica del Mapa Vivo) — reemplaza el emoji 🧙‍♂️ en su
 *  marcador del mapa. Mismo criterio de cachebusteo que el resto. */
const WANDERING_MERCHANT_SPRITE_V = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "";
export const WANDERING_MERCHANT_SPRITES = {
  map: `/assets/sprites/wandering-merchant/map.png?v=${WANDERING_MERCHANT_SPRITE_V}`,
};
/** Arte del Veterano de Neiva (NPC de la misión tutorial) — reemplaza el emoji 🧓 en su marcador
 *  del mapa. Mismo criterio de cachebusteo que el resto. */
const VETERANO_SPRITE_V = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "";
export const VETERANO_SPRITES = {
  map: `/assets/sprites/veterano/map.png?v=${VETERANO_SPRITE_V}`,
};
/** Retrato de Noe — NPC que da la bienvenida al jugador la primera vez que entra al mundo (ver
 *  maybeShowWorldIntro en main.js, dispara solo una vez por cuenta). Mismo criterio de
 *  cachebusteo que el resto de public/. */
const NOE_SPRITE_V = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "";
export const NOE_PORTRAIT_PATH = `/new_elements/Noe.png?v=${NOE_SPRITE_V}`;
/** Ilustraciones de la cinemática de bienvenida (ver playWorldCinematic en main.js, misma única
 *  vez por cuenta que Noe). Mismo criterio de cachebusteo que el resto de public/. */
const WORLD_CINEMATIC_SPRITE_V = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "";
export const WORLD_CINEMATIC_SCENE_PATHS = {
  scene1: `/new_elements/escena1.png?v=${WORLD_CINEMATIC_SPRITE_V}`,
  scene2: `/new_elements/escena2.png?v=${WORLD_CINEMATIC_SPRITE_V}`,
};
/** Arte del Cazador Solitario (NPC de misión "Colmillo de Lobo Umbrío", ver QUEST_TEMPLATES en
 *  main.js) — reemplaza el emoji 🏹 en su marcador del mapa. Mismo criterio que el Veterano. */
const CAZADOR_SPRITE_V = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "";
export const CAZADOR_SPRITES = {
  map: `/assets/sprites/cazador-solitario/map.png?v=${CAZADOR_SPRITE_V}`,
};
/** Ilustraciones del evento de mundo "Viajero Atacado" — dos viajeros distintos que se eligen al
 *  azar una sola vez por evento (ver metadata.travelerSprite en maybeScheduleRandomEvent, main.js)
 *  para el modal dedicado que reemplaza el showConfirm() genérico en este tipo de evento. */
const TRAVELER_ATTACKED_SPRITE_V = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "";
export const TRAVELER_ATTACKED_SPRITES = [
  `/assets/sprites/traveler-attacked/traveler1.png?v=${TRAVELER_ATTACKED_SPRITE_V}`,
  `/assets/sprites/traveler-attacked/traveler2.png?v=${TRAVELER_ATTACKED_SPRITE_V}`,
];
/** Ilustración real de la armadura, usada en vez del emoji 🛡️ en la tienda y en las pantallas de equipo. */
export const ARMOR_ICON_PATH = "/assets/sprites/equipment/armor.png";
export const ESPADA_LUNAR_ICON_PATH = "/assets/sprites/items/espada-lunar.png";
/** Ilustraciones reales de pociones/elixir, usadas en vez del emoji en la tienda (ver iconFor en main.js). */
export const POTION_SMALL_ICON_PATH = "/new_elements/pocion-pequena.png";
export const POTION_MANA_ICON_PATH = "/new_elements/pocion-mana.png";
export const ELIXIR_MAYOR_ICON_PATH = "/new_elements/elixir-mayor.png";
/** Ilustraciones reales del Cofre del Aventurero (Salón de la Fortuna), cerrado/abierto —
 *  reemplazan el emoji genérico usado antes (ver renderFortuneChestRow/pickFortuneChest en main.js). */
export const COFRE_CLOSED_ICON_PATH = "/new_elements/cofre.png";
export const COFRE_OPEN_ICON_PATH = "/new_elements/cofre_abierto.png";
/** Ilustración del portal de cada mazmorra, usada en vez del emoji genérico en su marcador del mapa —
 *  clave = dungeon.id (game/config/dungeons.js), así una mazmorra nueva solo agrega una fila acá. */
export const DUNGEON_PORTAL_SPRITES = {
  senor_oscuro: "/assets/sprites/dungeon-portal/senor-oscuro.png",
};
/** Arte de combate del jefe de la mazmorra piloto — 1 pose base + 3 poses de ataque distintas
 *  que se intercalan al azar en cada golpe (ver triggerSenorOscuroAttackPose en main.js). */
export const SENOR_OSCURO_SPRITES = {
  base: "/assets/sprites/senor-oscuro/base.png",
  attacks: [
    "/assets/sprites/senor-oscuro/attack-1.png",
    "/assets/sprites/senor-oscuro/attack-2.png",
    "/assets/sprites/senor-oscuro/attack-3.png",
  ],
};
/** Arte del Demonio Oscuro — el enemigo que ronda la niebla alrededor de un portal de mazmorra:
 *  pose base + una de ataque para el combate, y un ícono aparte (con transparencia real, no
 *  necesitó limpieza de fondo) para su marcador en el mapa. */
export const DEMONIO_OSCURO_SPRITES = {
  base: "/assets/sprites/demonio-oscuro/base.png",
  attack: "/assets/sprites/demonio-oscuro/attack.png",
  map: "/assets/sprites/demonio-oscuro/map.png",
};
/** Arte del Sabueso Oscuro — segundo esbirro de la niebla del portal, mismo trío de imágenes
 *  que el Demonio Oscuro (pose base + ataque + ícono de mapa, este último recortado de la pose
 *  base ya que no llegó un ícono de mapa dedicado). */
export const SABUESO_OSCURO_SPRITES = {
  base: "/assets/sprites/sabueso-oscuro/base.png",
  attack: "/assets/sprites/sabueso-oscuro/attack.png",
  map: "/assets/sprites/sabueso-oscuro/map.png",
};
/** Arte del Elemental Aqua — enemigo especial que solo aparece con lluvia/nubado o cerca de agua
 *  real (lago/río/piscina, ver maybeSpawnElementalAqua en main.js). `baseStrong` reemplaza a
 *  `base` en su lugar cuando el clima actual es lluvioso Y nubado (más "cargado" visualmente) —
 *  resuelto en tiempo real por enemySpriteSrc/makeMonster, no un tipo de plantilla aparte. */
const ELEMENTAL_AQUA_SPRITE_V = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "";
export const ELEMENTAL_AQUA_SPRITES = {
  base: `/assets/sprites/elemental_aqua/aqua_base.png?v=${ELEMENTAL_AQUA_SPRITE_V}`,
  baseStrong: `/assets/sprites/elemental_aqua/aqua_base_strong.png?v=${ELEMENTAL_AQUA_SPRITE_V}`,
  attack: `/assets/sprites/elemental_aqua/aqua_ataque.png?v=${ELEMENTAL_AQUA_SPRITE_V}`,
  map: `/assets/sprites/elemental_aqua/aqua_map.png?v=${ELEMENTAL_AQUA_SPRITE_V}`,
  gema: `/assets/sprites/elemental_aqua/gema_aqua.png?v=${ELEMENTAL_AQUA_SPRITE_V}`,
};
/** Arte del Elemental Fauto — enemigo especial que solo aparece cuando la ciudad está a 30°C o
 *  más (ver maybeSpawnElementalFauto en main.js). */
const ELEMENTAL_FAUTO_SPRITE_V = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "";
export const ELEMENTAL_FAUTO_SPRITES = {
  base: `/assets/sprites/elemental_fauto/fauto_base.png?v=${ELEMENTAL_FAUTO_SPRITE_V}`,
  attack: `/assets/sprites/elemental_fauto/fauto_ataque.png?v=${ELEMENTAL_FAUTO_SPRITE_V}`,
  map: `/assets/sprites/elemental_fauto/fauto_map.png?v=${ELEMENTAL_FAUTO_SPRITE_V}`,
  gema: `/assets/sprites/elemental_fauto/gema_fauto.png?v=${ELEMENTAL_FAUTO_SPRITE_V}`,
};
/** Arte de combate especial del Guerrero (por ahora la única clase con este tratamiento) —
 *  reemplaza el par genérico base/attack de CLASS_BATTLE_SPRITES.guerrero: una pose de
 *  presentación que se ve 3s al iniciar la batalla, la pose base de reposo, una secuencia de
 *  3 poses de golpe (ataque1 → ataque2 → ataque-fin, con DOS variantes de ataque-fin que se
 *  intercalan en cada golpe — ver playGuerreroAttackSequence en main.js) en vez de un único swap
 *  base/ataque, y una pose de "grito" (espada en alto, sin saltar hacia el rival) para
 *  movimientos que no son un golpe cuerpo a cuerpo — curar, potenciar/debilitar con un grito, o
 *  el temblor de Terremoto. Ver renderPlayerSprite/triggerWeaponAnim/playGuerreroCastSequence. */
// Estas imágenes viven en public/ y Vite las sirve TAL CUAL (sin el hash de contenido que sí le
// pone automáticamente a los bundles JS/CSS) — cuando se reemplaza el archivo (como pasó varias
// veces esta sesión, quitándole el fondo negro), la URL no cambia, así que el navegador/CDN puede
// seguir sirviendo la versión vieja cacheada indefinidamente aunque el archivo en el repo ya esté
// bien. Se le agrega "?v=<BUILD_ID>" (mismo BUILD_ID que ya usa checkForNewVersion en main.js,
// cambia en cada build) para forzar una descarga nueva cada vez que se publica una versión nueva.
const GUERRERO_SPRITE_V = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "";
export const GUERRERO_BATTLE_SPRITES = {
  m: {
    presentacion: `/assets/sprites/guerrero-battle/presentacion.png?v=${GUERRERO_SPRITE_V}`,
    base: `/assets/sprites/guerrero-battle/base.png?v=${GUERRERO_SPRITE_V}`,
    attack1: `/assets/sprites/guerrero-battle/ataque1.png?v=${GUERRERO_SPRITE_V}`,
    attack2: `/assets/sprites/guerrero-battle/ataque2.png?v=${GUERRERO_SPRITE_V}`,
    attackFin: `/assets/sprites/guerrero-battle/ataque-fin.png?v=${GUERRERO_SPRITE_V}`,
    attackFin2: `/assets/sprites/guerrero-battle/ataque-fin2.png?v=${GUERRERO_SPRITE_V}`,
    shout: `/assets/sprites/guerrero-battle/grito.png?v=${GUERRERO_SPRITE_V}`,
    defend: `/assets/sprites/guerrero-battle/defensa.png?v=${GUERRERO_SPRITE_V}`,
  },
  f: {
    presentacion: `/assets/sprites/guerrero-battle-f/presentacion.png?v=${GUERRERO_SPRITE_V}`,
    base: `/assets/sprites/guerrero-battle-f/base.png?v=${GUERRERO_SPRITE_V}`,
    attack1: `/assets/sprites/guerrero-battle-f/ataque1.png?v=${GUERRERO_SPRITE_V}`,
    attack2: `/assets/sprites/guerrero-battle-f/ataque2.png?v=${GUERRERO_SPRITE_V}`,
    attackFin: `/assets/sprites/guerrero-battle-f/ataque-fin.png?v=${GUERRERO_SPRITE_V}`,
    attackFin2: `/assets/sprites/guerrero-battle-f/ataque-fin2.png?v=${GUERRERO_SPRITE_V}`,
    shout: `/assets/sprites/guerrero-battle-f/grito.png?v=${GUERRERO_SPRITE_V}`,
    defend: `/assets/sprites/guerrero-battle-f/defensa.png?v=${GUERRERO_SPRITE_V}`,
  },
};

/** Mismo criterio que GUERRERO_BATTLE_SPRITES — el Mago solo tiene una pose de acción (el bastón en
 *  alto con el estallido morado, usada tanto para ataques como para potenciar/curar) y una de
 *  defensa (la barrera mágica), sin secuencia de salto — es un lanzador de hechizos, no pelea cuerpo
 *  a cuerpo. Ver combatSpriteHtml/renderPlayerSprite/playMagoCastSequence/playMagoDefendPose.
 *  Tiene set propio por género (m/f), igual que GUERRERO_BATTLE_SPRITES/ARQUERO_BATTLE_SPRITES —
 *  Berserker es por ahora el único que sigue con un único set (masculino) para esta escena. */
const MAGO_SPRITE_V = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "";
export const MAGO_BATTLE_SPRITES = {
  m: {
    presentacion: `/assets/sprites/mago-battle/presentacion.png?v=${MAGO_SPRITE_V}`,
    base: `/assets/sprites/mago-battle/base.png?v=${MAGO_SPRITE_V}`,
    attack: `/assets/sprites/mago-battle/ataque.png?v=${MAGO_SPRITE_V}`,
    defend: `/assets/sprites/mago-battle/defensa.png?v=${MAGO_SPRITE_V}`,
  },
  f: {
    presentacion: `/assets/sprites/mago-battle-f/presentacion.png?v=${MAGO_SPRITE_V}`,
    base: `/assets/sprites/mago-battle-f/base.png?v=${MAGO_SPRITE_V}`,
    attack: `/assets/sprites/mago-battle-f/ataque.png?v=${MAGO_SPRITE_V}`,
    defend: `/assets/sprites/mago-battle-f/defensa.png?v=${MAGO_SPRITE_V}`,
  },
};

/** Mismo criterio que GUERRERO_BATTLE_SPRITES, pero pedido explícito: el golpe del Berserker NO es
 *  un salto con arco (como el Guerrero) — es un deslizamiento/slash horizontal, sin desplazamiento
 *  vertical. ataque1 es la pose de transición (espada más abajo, recién arrancando el slash);
 *  ataque-fin/ataque-fin2 son las DOS variantes del golpe de llegada que se intercalan en cada
 *  ataque (mismo patrón que el Guerrero), ambas con la espada ya barrida y el efecto de sangre/
 *  polvo. Ver playBerserkerAttackSequence/playBerserkerDefendPose en main.js.
 *  Tiene set propio por género (m/f) — pero a diferencia del resto de clases, el flujo de la versión
 *  femenina es distinto (confirmado): NO alterna dos variantes de golpe de llegada, es una secuencia
 *  lineal única ataque1 → ataque2 → ataque-fin (mismo patrón de 3 poses que el Guerrero, sin el
 *  "punto más alto del salto" porque el Berserker no salta). `playBerserkerAttackSequence` en
 *  main.js decide qué flujo correr mirando si `sprites.attack2` existe. */
const BERSERKER_SPRITE_V = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "";
export const BERSERKER_BATTLE_SPRITES = {
  m: {
    presentacion: `/assets/sprites/berserker-battle/presentacion.png?v=${BERSERKER_SPRITE_V}`,
    base: `/assets/sprites/berserker-battle/base.png?v=${BERSERKER_SPRITE_V}`,
    attack1: `/assets/sprites/berserker-battle/ataque1.png?v=${BERSERKER_SPRITE_V}`,
    attackFin: `/assets/sprites/berserker-battle/ataque-fin.png?v=${BERSERKER_SPRITE_V}`,
    attackFin2: `/assets/sprites/berserker-battle/ataque-fin2.png?v=${BERSERKER_SPRITE_V}`,
    defend: `/assets/sprites/berserker-battle/defensa.png?v=${BERSERKER_SPRITE_V}`,
  },
  f: {
    presentacion: `/assets/sprites/berserker-battle-f/presentacion.png?v=${BERSERKER_SPRITE_V}`,
    base: `/assets/sprites/berserker-battle-f/base.png?v=${BERSERKER_SPRITE_V}`,
    attack1: `/assets/sprites/berserker-battle-f/ataque1.png?v=${BERSERKER_SPRITE_V}`,
    attack2: `/assets/sprites/berserker-battle-f/ataque2.png?v=${BERSERKER_SPRITE_V}`,
    attackFin: `/assets/sprites/berserker-battle-f/ataque-fin.png?v=${BERSERKER_SPRITE_V}`,
    defend: `/assets/sprites/berserker-battle-f/defensa.png?v=${BERSERKER_SPRITE_V}`,
  },
};

/** Arte de frente del rival de PvP — Guerrero/Berserker (por ahora, las únicas dos clases con este
 *  set dedicado). GUERRERO_BATTLE_SPRITES/BERSERKER_BATTLE_SPRITES arriba están dibujados de
 *  espalda/costado (es la vista de TU PROPIO personaje) — antes, para mostrar al rival en un duelo
 *  PvP, se usaba esa misma imagen espejada con CSS (scaleX(-1)), un truco que nunca se veía del
 *  todo bien porque espejar una pose de espalda no la convierte en una pose de frente real. Estas
 *  imágenes SÍ están dibujadas de frente a propósito, así que van SIN espejar — ver combatSpriteHtml
 *  en main.js (el mirror=true de esa función identifica exactamente el caso "rival de PvP", los
 *  únicos dos call sites que lo pasan). */
const PVP_GUERRERO_SPRITE_V = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "";
export const PVP_GUERRERO_BATTLE_SPRITES = {
  presentacion: `/assets/sprites/pvp_guerrero/pvp_guerrero_presentacion.png?v=${PVP_GUERRERO_SPRITE_V}`,
  base: `/assets/sprites/pvp_guerrero/pvp_guerrero_guardia_base.png?v=${PVP_GUERRERO_SPRITE_V}`,
  attackWindup: `/assets/sprites/pvp_guerrero/pvp_guerrero_inicio_ataque.png?v=${PVP_GUERRERO_SPRITE_V}`,
  attackSwing: `/assets/sprites/pvp_guerrero/pvp_guerrero_ataque_sin_golpe.png?v=${PVP_GUERRERO_SPRITE_V}`,
  attackFin: `/assets/sprites/pvp_guerrero/pvp_guerrero_fin_ataque.png?v=${PVP_GUERRERO_SPRITE_V}`,
  defend: `/assets/sprites/pvp_guerrero/pvp_guerrero_defensa.png?v=${PVP_GUERRERO_SPRITE_V}`,
};
const PVP_BERSERKER_SPRITE_V = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "";
export const PVP_BERSERKER_BATTLE_SPRITES = {
  presentacion: `/assets/sprites/pvp_berserk/pvp_berserk_presentacion.png?v=${PVP_BERSERKER_SPRITE_V}`,
  base: `/assets/sprites/pvp_berserk/pvp_berserk_guardia_base.png?v=${PVP_BERSERKER_SPRITE_V}`,
  attackWindup: `/assets/sprites/pvp_berserk/pvp_berserk_inicio_ataque.png?v=${PVP_BERSERKER_SPRITE_V}`,
  attackSwing: `/assets/sprites/pvp_berserk/pvp_berserk_ataque_sin_golpe.png?v=${PVP_BERSERKER_SPRITE_V}`,
  attackFin: `/assets/sprites/pvp_berserk/pvp_berserk_ataque_fin.png?v=${PVP_BERSERKER_SPRITE_V}`,
  defend: `/assets/sprites/pvp_berserk/pvp_berserk_defensa.png?v=${PVP_BERSERKER_SPRITE_V}`,
};

/** Arquero: a diferencia de Guerrero/Berserker (que saltan/deslizan hasta el enemigo) y Mago (que
 *  lanza el hechizo desde su lugar con una sola pose), el Arquero también se queda quieto pero pasa
 *  por VARIAS poses en orden — pedido explícito, en este orden exacto: base → attack1 (saca la
 *  flecha del carcaj) → attackAim (arco totalmente tensado, apuntando) → attackRelease (cuerda ya
 *  soltada, flecha en vuelo) → vuelve a base. `arrow` es el proyectil que viaja desde el Arquero
 *  hasta el enemigo (ver fireArqueroArrowProjectile en main.js). `defend` desvía la flecha entrante
 *  con el propio arco (destello dorado en el punto de impacto). */
const ARQUERO_SPRITE_V = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "";
export const ARQUERO_BATTLE_SPRITES = {
  m: {
    presentacion: `/assets/sprites/arquero-battle/presentacion.png?v=${ARQUERO_SPRITE_V}`,
    base: `/assets/sprites/arquero-battle/base.png?v=${ARQUERO_SPRITE_V}`,
    attack1: `/assets/sprites/arquero-battle/ataque1.png?v=${ARQUERO_SPRITE_V}`,
    attackAim: `/assets/sprites/arquero-battle/ataque-fin.png?v=${ARQUERO_SPRITE_V}`,
    attackRelease: `/assets/sprites/arquero-battle/ataque-fin2.png?v=${ARQUERO_SPRITE_V}`,
    defend: `/assets/sprites/arquero-battle/defensa.png?v=${ARQUERO_SPRITE_V}`,
    arrow: `/assets/sprites/arquero-battle/flecha.png?v=${ARQUERO_SPRITE_V}`,
  },
  // Flujo femenino CONFIRMADO más corto a propósito (no le falta arte): solo 2 poses de tiro
  // (attack1 → attackFin), sin la pose intermedia de arco tensado que sí tiene el masculino —
  // ver playArqueroAttackSequence en main.js, que rama según si `sprites.attackAim` existe.
  f: {
    presentacion: `/assets/sprites/arquero-battle-f/presentacion.png?v=${ARQUERO_SPRITE_V}`,
    base: `/assets/sprites/arquero-battle-f/base.png?v=${ARQUERO_SPRITE_V}`,
    attack1: `/assets/sprites/arquero-battle-f/ataque1.png?v=${ARQUERO_SPRITE_V}`,
    attackFin: `/assets/sprites/arquero-battle-f/ataque-fin.png?v=${ARQUERO_SPRITE_V}`,
    defend: `/assets/sprites/arquero-battle-f/defensa.png?v=${ARQUERO_SPRITE_V}`,
    arrow: `/assets/sprites/arquero-battle-f/flecha.png?v=${ARQUERO_SPRITE_V}`,
  },
};

/** Círculo mágico rúnico bajo los pies del jugador en el mapa — uno distinto por clase, elegido
 *  según player.classKey (ver createMeMagicCircle en main.js). Cada PNG es un círculo cuadrado
 *  visto de arriba con fondo transparente; la inclinación/rotación con la cámara la produce
 *  MapLibre (pitchAlignment/rotationAlignment:'map' en el marcador), no el propio recurso. */
export const CLASS_MAGIC_CIRCLE_SPRITES = {
  guerrero: "/new_elements/circle_guerrero.png",
  mago: "/new_elements/circle_mago.png",
  arquero: "/new_elements/circle_arquero.png",
  berserker: "/new_elements/circle_berserk.png",
};
/** Arte encargado a medida para la pantalla "Bienvenido de nuevo" (selección de personaje).
 *  Cada tarjeta de clase es una imagen COMPLETA con el marco ornamentado, ícono de clase, botón
 *  de continuar y cajas vacías ya dibujadas — el HTML solo superpone texto en las coordenadas
 *  exactas de esas cajas (ver variables --nb-, --meta-, --gold-, --btn-, --trash- por tema en
 *  main.css, medidas a mano sobre cada imagen porque cada una tiene proporciones distintas). */
const CHAR_SELECT_SPRITE_V = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "";
export const CHAR_SELECT_ART = {
  welcomeBanner: `/assets/sprites/char-select/welcome-banner.png?v=${CHAR_SELECT_SPRITE_V}`,
  newCharacterBanner: `/assets/sprites/char-select/new-character-banner.jpg?v=${CHAR_SELECT_SPRITE_V}`,
  cards: {
    guerrero: `/assets/sprites/char-select/guerrero-card.jpg?v=${CHAR_SELECT_SPRITE_V}`,
    mago: `/assets/sprites/char-select/mago-card.jpg?v=${CHAR_SELECT_SPRITE_V}`,
    berserker: `/assets/sprites/char-select/berserker-card.jpg?v=${CHAR_SELECT_SPRITE_V}`,
    arquero: `/assets/sprites/char-select/arquero-card.jpg?v=${CHAR_SELECT_SPRITE_V}`,
  },
};

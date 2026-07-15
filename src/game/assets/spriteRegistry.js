export const spriteRegistry = {
	THIEF_SPRITES: {
		map: "/assets/sprites/thief/map.jpg",
		base: "/assets/sprites/thief/base.jpg",
		attack: "/assets/sprites/thief/attack.jpg",
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
	},
	DEMONIO_MENOR_SPRITES: {
		enemy: "/assets/sprites/demonio-menor/enemy.png",
		petBase: "/assets/sprites/demonio-menor/pet-base.png",
		petAttack: "/assets/sprites/demonio-menor/pet-attack.png",
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
	SLIME_SALVAJE_SPRITES: {
		base: "/assets/sprites/slime-salvaje/base.png",
		attack: "/assets/sprites/slime-salvaje/attack.png",
		hurt: "/assets/sprites/slime-salvaje/hurt.png",
	},
	ESPECTRO_SPRITES: {
		base: "/assets/sprites/espectro/base.png",
		attack: "/assets/sprites/espectro/attack.png",
		hurt: "/assets/sprites/espectro/hurt.png",
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
		},
		berserker: {
			m: {
				down: "/assets/sprites/class-walk-berserker/down.png",
				up: "/assets/sprites/class-walk-berserker/up.png",
				left: "/assets/sprites/class-walk-berserker/left.png",
				right: "/assets/sprites/class-walk-berserker/right.png",
			},
		},
		arquero: {
			m: {
				down: "/assets/sprites/class-walk-arquero/down.png",
				up: "/assets/sprites/class-walk-arquero/up.png",
				left: "/assets/sprites/class-walk-arquero/left.png",
				right: "/assets/sprites/class-walk-arquero/right.png",
			},
		},
		mago: {
			m: {
				down: "/assets/sprites/class-walk-mago/down.png",
				up: "/assets/sprites/class-walk-mago/up.png",
				left: "/assets/sprites/class-walk-mago/left.png",
				right: "/assets/sprites/class-walk-mago/right.png",
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
export const DEMONIO_MENOR_SPRITES = spriteRegistry.DEMONIO_MENOR_SPRITES;
export const GOLEM_ROCA_SPRITES = spriteRegistry.GOLEM_ROCA_SPRITES;
export const DRAGON_MENOR_SPRITES = spriteRegistry.DRAGON_MENOR_SPRITES;
export const DRAGON_ANCESTRAL_SPRITES = spriteRegistry.DRAGON_ANCESTRAL_SPRITES;
export const LOBO_NOCTURNO_SPRITES = spriteRegistry.LOBO_NOCTURNO_SPRITES;
export const SLIME_SALVAJE_SPRITES = spriteRegistry.SLIME_SALVAJE_SPRITES;
export const ESPECTRO_SPRITES = spriteRegistry.ESPECTRO_SPRITES;
export const CLASS_PORTRAITS = spriteRegistry.CLASS_PORTRAITS;
export const CLASS_WALK_SPRITES = spriteRegistry.CLASS_WALK_SPRITES;
export const CLASS_BATTLE_SPRITES = spriteRegistry.CLASS_BATTLE_SPRITES;
/** Ilustración real de la armadura, usada en vez del emoji 🛡️ en la tienda y en las pantallas de equipo. */
export const ARMOR_ICON_PATH = "/assets/sprites/equipment/armor.png";
export const ESPADA_LUNAR_ICON_PATH = "/assets/sprites/items/espada-lunar.png";

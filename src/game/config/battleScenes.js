/* ============================================================
   CONFIGURACIÓN DE ESCENARIOS DE BATALLA (perspectiva)
   ============================================================
   Cada escena de fondo (public/assets/backgrounds/*.jpg) tiene acá su propia "BattleSceneConfig":
   línea de horizonte, borde inferior del suelo, polígono transitable y puntos de anclaje
   recomendados para el jugador, los enemigos terrestres y los voladores. Todo se define a mano
   (nunca por detección automática en tiempo real) porque así el resultado es siempre el mismo y
   se puede ajustar la composición visual con precisión — ver game/systems/battlePerspective.js
   para las funciones que consumen esta config.

   Sistema de coordenadas: x/y son FRACCIONES (0-1) sobre la imagen NATIVA del escenario
   (imageWidth × imageHeight), no sobre la pantalla — el mapeo a píxeles reales de cada dispositivo
   (que puede recortar la imagen por el "background-size:cover" del CSS) lo hace
   mapImageFractionToContainer() en tiempo de posicionado, para que los anclajes queden alineados
   sin importar el aspect ratio del teléfono.

   IMPORTANTE — la distancia NUNCA se representa moviendo el sprite solo en Y: cada anchor da la
   posición de los PIES sobre el suelo (x,y), y calculatePerspectiveScale() deriva la escala de esa
   misma Y de forma automática (farScale/midScale/nearScale abajo) — el motor combina ambas cosas
   (posición + escala) más la sombra y el z-index; el escenario nunca calcula nada de eso a mano,
   solo describe DÓNDE está el suelo y CUÁNTO se ve cada nivel de distancia.

   Cómo ajustar un escenario: abrí la imagen de fondo, fijate dónde está el horizonte (dónde el
   piso transitable deja de verse, normalmente la base de un edificio/colina lejana) y el borde
   más cercano a cámara (normalmente el borde inferior de la imagen, o un poco antes si hay cajas/
   barriles en primer plano), y anotá esas fracciones. Los anchors (playerAnchor/enemyAnchors/
   flyingAnchors) son simplemente puntos DENTRO de groundPolygon que "se ven bien" pisando el
   suelo — si alguno queda mal puesto, pickGroundAnchor() lo reubica solo al punto transitable más
   cercano (ver findNearestPointInsidePolygon en battlePerspective.js), así que no hace falta que
   la calibración a mano sea perfecta.
   ============================================================ */

/**
 * @typedef {Object} Point
 * @property {number} x - Fracción horizontal (0-1) sobre la imagen nativa del escenario.
 * @property {number} y - Fracción vertical (0-1) sobre la imagen nativa del escenario — también
 *   funciona como "profundidad": cuanto más grande, más cerca de cámara.
 * @property {number} [shadowX] - Solo para flyingAnchors: dónde cae la sombra en el suelo (si no
 *   se define, se calcula una banda razonable bajo el punto de vuelo — ver projectFlyingShadow).
 * @property {number} [shadowY] - Idem, componente vertical de la sombra proyectada en el suelo.
 */

/**
 * @typedef {Object} BattleSceneConfig
 * @property {string} id - Identificador único (coincide con la key del registro BATTLE_SCENES).
 * @property {string} background - Ruta pública (public/) de la imagen de fondo.
 * @property {number} imageWidth - Ancho nativo en px de la imagen de fondo.
 * @property {number} imageHeight - Alto nativo en px de la imagen de fondo.
 * @property {Point[]} groundPolygon - Polígono transitable (fracciones 0-1), en orden — ver
 *   isPointInsideGroundPolygon(). Un enemigo terrestre solo puede pisar dentro de esta figura.
 * @property {Point} playerAnchor - Punto de apoyo recomendado para el jugador.
 * @property {Point} [soloEnemyAnchor] - Punto de apoyo para el caso más común (un solo enemigo
 *   normal, sin manada): un poco por encima del jugador y algo más chico, para dar sensación de
 *   profundidad sin mandarlo al anchor más lejano. Si no se define, se usa enemyAnchors[0].
 * @property {Point[]} enemyAnchors - Puntos de apoyo para enemigos terrestres, mezclando los tres
 *   niveles de distancia (lejano/medio/cercano) — se recorren en orden para 2..N enemigos (manada).
 * @property {Point[]} flyingAnchors - Puntos para enemigos voladores. Su sombra NO usa esta misma
 *   posición — ver shadowX/shadowY en cada anchor.
 * @property {number} horizonY - Fracción vertical (0-1) de la línea de horizonte: el punto más
 *   lejano del suelo transitable. Las entidades ahí usan farScale (nivel "lejano").
 * @property {number} groundBottomY - Fracción vertical (0-1) del borde inferior del suelo: el
 *   punto más cercano a cámara. Las entidades ahí usan nearScale (nivel "cercano").
 * @property {number} farScale - Escala del nivel LEJANO (justo en horizonY).
 * @property {number} midScale - Escala del nivel MEDIO (punto medio entre horizonY y groundBottomY).
 * @property {number} nearScale - Escala del nivel CERCANO (justo en groundBottomY).
 */

/** @type {Record<string, BattleSceneConfig>} */
export const BATTLE_SCENES = {
  // Calle empedrada medieval con el castillo al fondo — fondo por defecto de (casi) todo combate,
  // ver #battleScenePanel en main.css. Medido a mano sobre
  // public/assets/backgrounds/default-battle-bg.jpg (1086×1448): horizonY=0.47 porque ahí es
  // exactamente donde termina la parte angosta de la calle, delante del castillo y entre las
  // fachadas (el anchor lejano x=0.66,y=0.47 queda EXACTO sobre el empedrado en ese punto, nunca
  // sobre un techo ni en el cielo); groundBottomY=0.97 deja un margen chico antes del borde de la
  // imagen para no pisar cajas/barriles del primer plano.
  medieval: {
    id: "medieval",
    background: "/assets/backgrounds/default-battle-bg.jpg",
    imageWidth: 1086,
    imageHeight: 1448,
    horizonY: 0.47,
    groundBottomY: 0.97,
    // Trapecio angosto arriba (calle lejana, entre fachadas) que se abre hacia abajo hasta casi
    // todo el ancho de la imagen (calle cerca de cámara). El borde superior queda un poco POR
    // ENCIMA de horizonY a propósito, así el anchor lejano (y=horizonY) cae claramente adentro
    // del polígono y no justo sobre el borde.
    groundPolygon: [
      {x:0.32, y:0.44},
      {x:0.72, y:0.44},
      {x:0.90, y:0.60},
      {x:0.94, y:0.97},
      {x:0.06, y:0.97},
      {x:0.10, y:0.60},
    ],
    // x=0.26 dejaba muy poco margen: el sprite del jugador puede llegar a 170px de ancho
    // (img.battle-sprite-img), y translate(-50%) manda la mitad de eso hacia la izquierda del
    // anchor — en pantallas angostas la manga/capa terminaba saliéndose del borde. 0.34 deja
    // margen de sobra sin perder el aire "primer plano izquierdo" estilo Golden Sun.
    playerAnchor: {x:0.34, y:0.88},
    // Un solo enemigo (el caso de 9 de cada 10 combates) va acá, no en enemyAnchors[0] — un poco
    // arriba del jugador y notablemente más chico (profundidad), pero SIN llegar al horizonte, que
    // queda reservado para cuando de verdad hay varios enemigos repartidos por la calle.
    soloEnemyAnchor: {x:0.65, y:0.66},
    enemyAnchors: [
      {x:0.66, y:0.47},  // lejano — punto de referencia: entre fachadas, delante del castillo
      {x:0.36, y:0.50},  // lejano, lado izquierdo
      {x:0.60, y:0.60},  // medio
      {x:0.30, y:0.64},  // medio, lado izquierdo
      {x:0.70, y:0.78},  // cercano
      {x:0.25, y:0.82},  // cercano, lado izquierdo
    ],
    flyingAnchors: [
      {x:0.62, y:0.30, shadowX:0.62, shadowY:0.66},
      {x:0.40, y:0.26, shadowX:0.40, shadowY:0.58},
      {x:0.76, y:0.32, shadowX:0.74, shadowY:0.70},
    ],
    // Lejano / medio / cercano — calculatePerspectiveScale() interpola una curva que pasa EXACTO
    // por estos tres puntos (no una simple recta entre far/near), así el paso de lejano a medio
    // se siente más marcado que el de medio a cercano, como en una perspectiva real.
    farScale: 0.38,
    midScale: 0.60,
    nearScale: 0.90,
  },

  // Portal del Señor Oscuro (castillo en llamas + luna roja) — se activa por
  // updateBattleSceneBackground() en main.js (dungeon del Señor Oscuro / esbirros con
  // dropsDarkEssence / niebla oscura). Misma composición de calle-hacia-el-horizonte que la
  // medieval, así que se reutiliza la misma calibración fraccional (ambos fondos comparten
  // encuadre: calle simétrica angosta al fondo, abriéndose hacia cámara).
  senor_oscuro: {
    id: "senor_oscuro",
    background: "/assets/backgrounds/senor-oscuro-battle-bg.jpg",
    imageWidth: 1055,
    imageHeight: 1491,
    horizonY: 0.47,
    groundBottomY: 0.97,
    groundPolygon: [
      {x:0.32, y:0.44},
      {x:0.72, y:0.44},
      {x:0.90, y:0.60},
      {x:0.94, y:0.97},
      {x:0.06, y:0.97},
      {x:0.10, y:0.60},
    ],
    playerAnchor: {x:0.26, y:0.88},
    soloEnemyAnchor: {x:0.65, y:0.66},
    enemyAnchors: [
      {x:0.66, y:0.47},
      {x:0.36, y:0.50},
      {x:0.60, y:0.60},
      {x:0.30, y:0.64},
      {x:0.70, y:0.78},
      {x:0.25, y:0.82},
    ],
    flyingAnchors: [
      {x:0.62, y:0.30, shadowX:0.62, shadowY:0.66},
      {x:0.40, y:0.26, shadowX:0.40, shadowY:0.58},
      {x:0.76, y:0.32, shadowX:0.74, shadowY:0.70},
    ],
    farScale: 0.38,
    midScale: 0.60,
    nearScale: 0.90,
  },
};

export const DEFAULT_BATTLE_SCENE_ID = "medieval";

/** Devuelve la BattleSceneConfig pedida, o la de por defecto si el id no existe todavía. */
export function getBattleSceneConfig(id){
  return BATTLE_SCENES[id] || BATTLE_SCENES[DEFAULT_BATTLE_SCENE_ID];
}

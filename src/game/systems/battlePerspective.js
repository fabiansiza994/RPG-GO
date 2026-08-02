/* ============================================================
   SISTEMA DE POSICIONAMIENTO CON PERSPECTIVA (escenas de batalla 2D)
   ============================================================
   Ubica al jugador y a los enemigos sobre el suelo de la escena de fondo (en vez de con flexbox
   "a ojo"), usando la BattleSceneConfig del escenario activo (ver game/config/battleScenes.js).
   Cada entidad se ancla por el centro inferior de su sprite (donde pisa) — igual que en cualquier
   juego 2.5D con capas: más cerca del horizonte, más chica y más atrás; más cerca de cámara, más
   grande y más adelante — y una sombra elíptica marca ese punto de apoyo en el suelo.

   No hace NADA de detección automática de piso: los anclajes son siempre los que defina a mano
   cada BattleSceneConfig — ver el comentario al principio de battleScenes.js.

   Estas funciones son puras donde se puede (calculatePerspectiveScale, isPointInsideGroundPolygon,
   mapImageFractionToPagePoint) y el resto son helpers de DOM finitos y sin estado propio — quien
   los llama (main.js) es responsable de guardar las referencias a los elementos ancla/sombra y de
   decidir CUÁNDO reposicionar (inicio de combate, resize, etc.). No tocan daño, turnos ni ningún
   otro dato de battleState — son puramente visuales.
   ============================================================ */

function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

/** Reduce el tamaño de las entidades cercanas al horizonte y lo aumenta cerca de la cámara —
 *  ESTA es la única fuente de "distancia": la profundidad nunca se simula moviendo el sprite
 *  hacia arriba y listo, siempre se traduce a escala (y, junto con positionEntityOnStage, a
 *  posición sobre el suelo + sombra + z-index).
 *
 *  `y` es la fracción vertical (0-1) del anchor sobre la imagen nativa del escenario — mismo
 *  sistema de coordenadas que horizonY/groundBottomY en la BattleSceneConfig.
 *
 *  Interpola una curva cuadrática que pasa EXACTO por los 3 niveles de distancia del escenario:
 *  farScale en horizonY (t=0), midScale en el punto medio (t=0.5) y nearScale en groundBottomY
 *  (t=1). Si el escenario no define midScale, se usa el promedio de far/near — en ese caso la
 *  curva se reduce matemáticamente a una interpolación lineal simple, así que escenarios viejos
 *  que solo definan far/near siguen funcionando igual que antes sin tocar nada. */
export function calculatePerspectiveScale(y, sceneConfig){
  const { horizonY, groundBottomY, farScale, nearScale } = sceneConfig;
  const midScale = sceneConfig.midScale != null ? sceneConfig.midScale : (farScale + nearScale) / 2;
  const span = groundBottomY - horizonY;
  const t = span === 0 ? 1 : clamp((y - horizonY) / span, 0, 1);
  // Resuelve la parábola a*t²+b*t+c que pasa por (0,farScale), (0.5,midScale), (1,nearScale).
  const c = farScale;
  const b = 4*midScale - 3*farScale - nearScale;
  const a = 2*nearScale + 2*farScale - 4*midScale;
  return a*t*t + b*t + c;
}

/** Punto-en-polígono por ray casting — funciona igual en fracciones (0-1) que en píxeles, ya que
 *  solo compara geometría relativa. `polygon` es un array de {x,y}; se asume cerrado implícitamente
 *  (el último punto se une con el primero). Se usa para impedir que un enemyAnchor mal configurado
 *  deje a un enemigo terrestre "flotando" fuera del área transitable (ver pickGroundAnchor). */
export function isPointInsideGroundPolygon(x, y, polygon){
  let inside = false;
  for(let i=0, j=polygon.length-1; i<polygon.length; j=i++){
    const xi=polygon[i].x, yi=polygon[i].y;
    const xj=polygon[j].x, yj=polygon[j].y;
    const intersects = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if(intersects) inside = !inside;
  }
  return inside;
}

/** El punto más cercano a (x,y) sobre el borde de `polygon` — proyecta contra cada segmento y se
 *  queda con el más próximo. Es la base de findNearestPointInsidePolygon(). */
function closestPointOnSegment(px, py, ax, ay, bx, by){
  const abx = bx - ax, aby = by - ay;
  const lenSq = abx*abx + aby*aby;
  let t = lenSq === 0 ? 0 : clamp(((px - ax)*abx + (py - ay)*aby) / lenSq, 0, 1);
  return { x: ax + abx*t, y: ay + aby*t };
}

/** Si (x,y) ya está dentro del polígono, lo devuelve tal cual. Si no, "busca otra posición
 *  automáticamente" (como pide el sistema): la proyecta al punto válido más cercano sobre el
 *  borde del área transitable, para que un enemyAnchor mal calibrado nunca deje a un enemigo
 *  terrestre parado fuera de la calle — se ajusta solo, sin necesidad de retocar la config a mano. */
export function findNearestPointInsidePolygon(x, y, polygon){
  if(!polygon || polygon.length < 3) return {x, y};
  if(isPointInsideGroundPolygon(x, y, polygon)) return {x, y};
  let best = null, bestDistSq = Infinity;
  for(let i=0, j=polygon.length-1; i<polygon.length; j=i++){
    const cand = closestPointOnSegment(x, y, polygon[j].x, polygon[j].y, polygon[i].x, polygon[i].y);
    const dx = cand.x - x, dy = cand.y - y;
    const distSq = dx*dx + dy*dy;
    if(distSq < bestDistSq){ bestDistSq = distSq; best = cand; }
  }
  return best || {x, y};
}

/** z-index derivado del punto de apoyo: más cerca de cámara (mayor Y) → más arriba en la pila,
 *  así un enemigo cercano siempre tapa a uno lejano — `zIndex = floor(feetY)`, escalado (×12) y
 *  recortado a una franja chica a propósito, para no pisar los z-index que ya usa el resto de la
 *  UI de batalla (mascotas=20, popups=30+, FX de captura/invocación=245+); el orden relativo
 *  entre entidades del escenario es exactamente el mismo, solo comprimido a un rango seguro. */
export function computeDepthZIndex(y){
  return Math.max(1, Math.floor(clamp(y, 0, 1) * 12));
}

/** Replica el recorte que hace `background-size:cover` + `background-position:bottom center`
 *  para traducir una fracción (0-1) sobre la imagen NATIVA del escenario a un punto absoluto de
 *  PÁGINA (coordenadas de viewport, como getBoundingClientRect) — así los anclajes definidos sobre
 *  la imagen quedan alineados sin importar el aspect ratio del dispositivo (requisito de
 *  compatibilidad móvil/responsive).
 *
 *  OJO: `backgroundRect` tiene que ser el rect del elemento donde el CSS realmente pinta el fondo
 *  (`#battleScenePanel`), NO el de `.stage` — #battleScenePanel incluye el panel de vida/maná del
 *  enemigo arriba (.battle-top) además de `.stage`, así que son cajas de distinto tamaño/posición.
 *  Confundirlas fue justo el bug que hacía aparecer a los enemigos "flotando" cerca del techo: la
 *  fracción vertical se calculaba contra la caja de `.stage` (más chica, empieza más abajo) en vez
 *  de contra la caja real donde se pinta la imagen, así que todo se corría hacia arriba. Devuelve
 *  también `coverScale` (imagen→pantalla) por si hace falta para depurar. */
export function mapImageFractionToPagePoint(fx, fy, sceneConfig, backgroundRect){
  const iw = sceneConfig.imageWidth, ih = sceneConfig.imageHeight;
  if(!backgroundRect || !backgroundRect.width || !backgroundRect.height || !iw || !ih){
    const w = backgroundRect ? backgroundRect.width : 0, h = backgroundRect ? backgroundRect.height : 0;
    const left = backgroundRect ? backgroundRect.left : 0, top = backgroundRect ? backgroundRect.top : 0;
    return { pageX: left + fx * w, pageY: top + fy * h, coverScale: 1 };
  }
  const coverScale = Math.max(backgroundRect.width / iw, backgroundRect.height / ih);
  const scaledW = iw * coverScale, scaledH = ih * coverScale;
  const offsetX = (backgroundRect.width - scaledW) / 2;   // background-position: center (horizontal)
  const offsetY = backgroundRect.height - scaledH;         // background-position: bottom (vertical)
  const pageX = backgroundRect.left + fx * iw * coverScale + offsetX;
  const pageY = backgroundRect.top + fy * ih * coverScale + offsetY;
  return { pageX, pageY, coverScale };
}

/** Elige un enemyAnchor terrestre por índice (con vuelta de rueda si hay más enemigos que anchors
 *  definidos). Un enemigo terrestre SOLO puede aparecer dentro de groundPolygon — si el punto
 *  configurado cae afuera (mala calibración, o simplemente no existe un anchor a mano para ese
 *  índice), se busca automáticamente el punto válido más cercano dentro del área transitable en
 *  vez de dejarlo ahí (ver findNearestPointInsidePolygon) — nunca aparece fuera de la calle. */
export function pickGroundAnchor(sceneConfig, index){
  const list = sceneConfig.enemyAnchors;
  if(!list || !list.length) return findNearestPointInsidePolygon(0.5, 0.7, sceneConfig.groundPolygon);
  const anchor = list[index % list.length];
  if(isPointInsideGroundPolygon(anchor.x, anchor.y, sceneConfig.groundPolygon)) return anchor;
  const fixed = findNearestPointInsidePolygon(anchor.x, anchor.y, sceneConfig.groundPolygon);
  console.warn(`[battlePerspective] enemyAnchors[${index % list.length}] de "${sceneConfig.id}" caía fuera de groundPolygon — se reubicó automáticamente a (${fixed.x.toFixed(3)}, ${fixed.y.toFixed(3)}).`);
  return fixed;
}

/** Punto de apoyo de un miembro de MANADA — a diferencia de pickGroundAnchor (pensado para un
 *  enemigo a la vez, por eso enemyAnchors reparte lejano/medio/cercano por toda la calle), una
 *  manada tiene que verse agrupada pero SIN aplastarse: el índice 0 (el "líder") va exacto en el
 *  punto base (el mismo que usaría un enemigo solo — normalmente del lado derecho de la calle,
 *  cerca de donde está el jugador parado del otro lado); cada índice siguiente se abre en ABANICO
 *  hacia la IZQUIERDA del líder, aprovechando la calle libre que ese lado casi siempre tiene en
 *  los escenarios actuales (probado con "Una manada de 4 Lobo Umbrío" — con el zigzag angosto
 *  anterior quedaban todos amontonados en un cuadradito chico a la derecha, sin usar nada de ese
 *  espacio, y encima había que achicarlos mucho para que "entraran" ahí). El corrimiento en Y es
 *  chico a propósito: apenas los suficiente para que el orden de profundidad (calculatePerspectiveScale
 *  + computeDepthZIndex) haga que el líder tape un poco al segundo, el segundo al tercero, etc.
 *  ("un paso más adelante"), sin que la escala baje tanto como para verse enanos.
 *  0.14/0.025 por índice (primer intento) eran demasiado — con 4 miembros el último terminaba
 *  pisando el borde del groundPolygon (la calle se angosta hacia el fondo) y quedaba medio afuera
 *  de la carretera aunque técnicamente se reubicara adentro por findNearestPointInsidePolygon.
 *  0.09/0.015 deja bastante margen respecto al borde real incluso con manadas grandes. */
export function pickPackClusterAnchor(baseAnchor, index, sceneConfig){
  if(index === 0) return {x:baseAnchor.x, y:baseAnchor.y};
  const x = clamp(baseAnchor.x - index*0.09, 0.08, 0.94);
  const y = Math.max(0, baseAnchor.y - index*0.015);
  if(!sceneConfig || !sceneConfig.groundPolygon) return {x, y};
  return findNearestPointInsidePolygon(x, y, sceneConfig.groundPolygon);
}

/** Cuánto "flota" un enemigo volador por encima de su propio punto de apoyo en el suelo — fracción
 *  de imagen (mismo sistema que horizonY/groundBottomY). Es la ÚNICA perilla que hay que tocar
 *  para subir o bajar a TODOS los voladores a la vez (Cuervo Corrupto, Dragón Menor, Dragón
 *  Ancestral, cualquier futuro `flying:true`) sin retocar anchors uno por uno — antes cada
 *  escenario traía su propio array `flyingAnchors` calibrado a mano, con puntos que quedaban
 *  "en el cielo" (por encima del castillo) y que había que ajustar de nuevo por cada monstruo/
 *  escenario nuevo aunque compartieran el mismo punto de apoyo. Valor calibrado a ojo: 0.66 (el
 *  soloEnemyAnchor de "medieval") menos 0.04 fue el punto donde el Cuervo Corrupto dejó de verse
 *  "en el aire" y empezó a leerse como que sobrevuela justo ese lugar de la calle.
 */
export const FLYING_HOVER_HEIGHT_FRAC = 0.02;

/** Deriva el anchor de un enemigo volador a partir del punto de apoyo que tendría un enemigo
 *  TERRESTRE en esa misma posición (soloEnemyAnchor o enemyAnchors[idx], vía pickGroundAnchor) —
 *  la sombra queda EXACTO en ese punto de piso, igual que pisa cualquier terrestre (rata mutante,
 *  etc.), y el sprite se dibuja FLYING_HOVER_HEIGHT_FRAC más arriba de ESE mismo punto. Como el
 *  punto de referencia es el mismo que usaría un terrestre ahí, todos los voladores flotan la
 *  misma altura relativa a su propia sombra sin importar tamaño de sprite ni tier — no hace falta
 *  un array de puntos aparte por escenario ni recalibrar por monstruo. */
export function pickFlyingAnchor(groundAnchor){
  return {
    x: groundAnchor.x,
    y: Math.max(0, groundAnchor.y - FLYING_HOVER_HEIGHT_FRAC),
    shadowX: groundAnchor.x,
    shadowY: groundAnchor.y,
  };
}

/** Crea el nodo de sombra elíptica (ver .perspective-shadow en main.css) — un div vacío, sin
 *  contenido ni listeners; quien lo crea es responsable de insertarlo en el DOM (una sola vez, se
 *  reposiciona/reusa en cada render). */
export function createPerspectiveShadow(){
  const el = document.createElement("div");
  el.className = "perspective-shadow";
  return el;
}

const SHADOW_BASE_WIDTH_PX = 84; // ancho de la sombra a depthScale=1 sobre la imagen nativa del escenario

/** Punto de página → porcentaje relativo a `containerRect` (el `.stage`, que es la caja
 *  `position:relative` de la que cuelgan los anclajes con `position:absolute`). */
function pagePointToContainerPct(pageX, pageY, containerRect){
  return {
    leftPct: ((pageX - containerRect.left) / containerRect.width) * 100,
    topPct: ((pageY - containerRect.top) / containerRect.height) * 100,
  };
}

/**
 * Posiciona el ancla de una entidad (y opcionalmente su sombra) sobre `stageEl` (el contenedor de
 * posicionamiento — `.stage` en main.css, `position:relative`), usando `backgroundEl` (normalmente
 * `#battleScenePanel`, el elemento donde el CSS realmente pinta la imagen de fondo con
 * `background-size:cover`) como referencia para saber DÓNDE cae cada fracción de la imagen en
 * pantalla. Son dos cajas distintas a propósito — ver el comentario de mapImageFractionToPagePoint.
 * Si no se pasa `backgroundEl`, se usa `stageEl` para ambas cosas (comportamiento anterior).
 *
 * El ancla se coloca con su CENTRO INFERIOR en el punto (fx,fy): `transform:translate(-50%,-100%)`
 * + `transform-origin:bottom center`, tal como pisa un personaje. La sombra (si se pasa) usa
 * `shadowFx/shadowFy` — normalmente igual a fx/fy, salvo en voladores, donde vive aparte, siempre
 * sobre el suelo (ver pickFlyingAnchor).
 *
 * anchorEl NO es el sprite animado en sí — es un wrapper (.perspective-anchor) que lo envuelve, a
 * propósito: el sprite adentro sigue usando sus propias animaciones de ataque/golpe (que ya
 * manipulan `transform` por su cuenta vía clases CSS), así que el posicionamiento y la animación
 * de combate nunca compiten por la misma propiedad del mismo elemento.
 *
 * `opts.offsetYPx` (opcional): corrimiento vertical fijo en px, solo del sprite, nunca de la
 * sombra — ver el comentario junto a su desestructuración más abajo.
 */
export function positionEntityOnStage(anchorEl, shadowEl, opts){
  const {
    fx, fy, sceneConfig, stageEl, backgroundEl,
    flying = false,
    shadowFx, shadowFy,
    offsetXPx = 0, // corrimiento horizontal fijo en px (pedido explícito: separar jugador/mascota
    // sin pelear con el transform que ya arma esta función más abajo — se suma ACÁ, antes del
    // transform:translate(-50%,-100%) scale(...), así que sigue centrado/escalado normalmente,
    // solo que sobre un punto corrido. Se aplica antes del clamp para que también respete el
    // margen de seguridad de los bordes. 0 por defecto = mismo comportamiento de siempre.
    offsetYPx = 0, // corrimiento vertical fijo en px, SOLO para el sprite — pedido explícito: varias
    // ilustraciones de enemigo traen relleno transparente debajo de los pies (el PNG completo es más
    // alto que el personaje dibujado), así que el punto de apoyo (el borde inferior de la caja) cae
    // sobre ese aire vacío en vez de sobre los pies de verdad, y el enemigo se ve "flotando" encima
    // de su propia sombra. Se aplica DESPUÉS de calcular la posición de la sombra (ver más abajo,
    // shadowPos siempre usa `pos` sin este corrimiento) para que bajar al sprite nunca mueva la
    // sombra con él — si no, el hueco seguiría exactamente igual.
  } = opts;
  if(!anchorEl || !stageEl) return null;
  const bgEl = backgroundEl || stageEl;
  const bgRect = bgEl.getBoundingClientRect();
  const stageRect = stageEl.getBoundingClientRect();
  if(!bgRect.width || !bgRect.height || !stageRect.width || !stageRect.height) return null;

  const point = mapImageFractionToPagePoint(fx, fy, sceneConfig, bgRect);
  const pos = pagePointToContainerPct(point.pageX, point.pageY, stageRect);
  if(offsetXPx) pos.leftPct += (offsetXPx / stageRect.width) * 100;
  // Red de seguridad: en aspect ratios muy angostos el recorte de "cover" puede empujar un anchor
  // cerca del borde de la imagen fuera del contenedor visible — nunca debería dejar a nadie a medio
  // salir de la pantalla, así que se recorta a un margen visible aunque la config quede imperfecta.
  pos.leftPct = clamp(pos.leftPct, 4, 96);
  pos.topPct = clamp(pos.topPct, 4, 96);
  const depthScale = calculatePerspectiveScale(fy, sceneConfig);
  const z = computeDepthZIndex(fy);
  const anchorTopPct = offsetYPx ? pos.topPct + (offsetYPx / stageRect.height) * 100 : pos.topPct;

  anchorEl.style.position = "absolute";
  anchorEl.style.left = pos.leftPct + "%";
  anchorEl.style.top = anchorTopPct + "%";
  anchorEl.style.transform = `translate(-50%, -100%) scale(${depthScale})`;
  anchorEl.style.transformOrigin = "bottom center";
  anchorEl.style.zIndex = String(z);

  if(shadowEl){
    const sx = shadowFx != null ? shadowFx : fx;
    const sy = shadowFy != null ? shadowFy : fy;
    let shadowPos;
    if(sx === fx && sy === fy){
      // caso normal (terrestres): la sombra va exactamente donde el ancla — reusar el mismo punto
      // YA RECORTADO en vez de recalcularlo, para que nunca puedan divergir por el clamp de arriba
      // (si el ancla se corrigió por quedar cerca del borde, la sombra tiene que moverse con ella).
      shadowPos = pos;
    } else {
      const shadowPoint = mapImageFractionToPagePoint(sx, sy, sceneConfig, bgRect);
      shadowPos = pagePointToContainerPct(shadowPoint.pageX, shadowPoint.pageY, stageRect);
      shadowPos.leftPct = clamp(shadowPos.leftPct, 4, 96);
      shadowPos.topPct = clamp(shadowPos.topPct, 4, 96);
    }
    const shadowDepthScale = calculatePerspectiveScale(sy, sceneConfig);
    const w = SHADOW_BASE_WIDTH_PX * shadowDepthScale;
    shadowEl.style.display = "";
    shadowEl.style.position = "absolute";
    shadowEl.style.left = shadowPos.leftPct + "%";
    shadowEl.style.top = shadowPos.topPct + "%";
    shadowEl.style.width = w + "px";
    shadowEl.style.height = (w * 0.34) + "px";
    shadowEl.style.transform = "translate(-50%, -50%)";
    shadowEl.style.zIndex = String(Math.max(0, z - 1));
    // más difusa/tenue para voladores — la sombra queda "despegada" del personaje, así que se
    // nota que no está pisando ahí, solo sobrevolando esa zona.
    shadowEl.classList.toggle("flying-shadow", !!flying);
  }

  return { leftPct: pos.leftPct, topPct: pos.topPct, depthScale, zIndex: z };
}

/** Saca a una entidad del modo perspectiva (limpia todos los estilos inline que le puso
 *  positionEntityOnStage) para que vuelva a comportarse como un ítem flex normal — se usa al
 *  entrar a modos de batalla que este sistema no cubre (grupo multijugador). */
export function resetEntityPosition(anchorEl){
  if(!anchorEl) return;
  anchorEl.style.position = "";
  anchorEl.style.left = "";
  anchorEl.style.top = "";
  anchorEl.style.transform = "";
  anchorEl.style.transformOrigin = "";
  anchorEl.style.zIndex = "";
}

/* ============================================================
   maplibre-leaflet-shim.js
   ------------------------------------------------------------
   Emula la parte de la API de Leaflet que usa Ronda RPG·GO
   (L.map, L.tileLayer, L.marker, L.divIcon, L.circle, L.polyline,
   L.DomEvent), pero corriendo por debajo sobre MapLibre GL JS.

   ¿Por qué? Para ganar zoom + bearing (rotación) + pitch (inclinación)
   nativos de MapLibre SIN tener que reescribir los ~50 lugares del
   juego que ya usan la forma de escribir de Leaflet. El resto del
   código de main.js casi no se toca: sigue escribiendo
   `L.marker([lat,lng],...).addTo(map)` como siempre — nada más que
   ahora "L" y el "map" que reciben son este traductor, no Leaflet real.

   OJO CON EL ORDEN DE COORDENADAS: Leaflet usa [lat, lng] en todos
   lados. MapLibre usa [lng, lat]. Este archivo hace esa conversión
   puertas adentro — el resto del juego sigue escribiendo [lat,lng]
   exactamente igual que antes.
   ============================================================ */
(function(){

  function toLngLat(latlng){
    // acepta [lat,lng] (arreglo, como usa el juego) o {lat,lng} (objeto)
    if(Array.isArray(latlng)) return [latlng[1], latlng[0]];
    return [latlng.lng, latlng.lat];
  }
  function fromLngLat(lngLat){
    return {lat: lngLat.lat, lng: lngLat.lng};
  }

  // ---------------------------------------------------------------------
  // Marcadores (L.marker + L.divIcon): usan maplibregl.Marker con un
  // elemento HTML propio — así el mismo HTML/CSS de los íconos actuales
  // (retrato del jugador, anillos, emojis) se sigue viendo igual.
  // ---------------------------------------------------------------------
  class MarkerShim {
    constructor(latlng, opts){
      opts = opts || {};
      this._opts = opts;
      const el = document.createElement('div');
      el.className = 'shim-marker-wrap';
      if(opts.icon && opts.icon.html !== undefined){
        el.innerHTML = opts.icon.html;
        const [w,h] = opts.icon.iconSize || [0,0];
        const [ax,ay] = opts.icon.iconAnchor || [w/2, h/2];
        if(w || h){ el.style.width = w+'px'; el.style.height = h+'px'; }
        // maplibregl.Marker ya centra el elemento en el punto; para imitar el
        // iconAnchor de Leaflet (que puede no ser el centro) se corrige con un offset.
        this._anchorOffset = [ (w/2 - ax), (h/2 - ay) ];
      } else {
        this._anchorOffset = [0, 0];
      }
      if(opts.interactive === false) el.style.pointerEvents = 'none';
      el.style.cursor = opts.interactive === false ? 'default' : 'pointer';
      // MapLibre YA ordena los marcadores automáticamente según su posición en pantalla (el que
      // está más "adelante"/abajo tapa al que está más atrás/arriba) — eso da la sensación de
      // profundidad correcta al inclinar la cámara. Pero cuando el juego pide explícitamente
      // que algo se quede siempre encima (como el propio jugador, con zIndexOffset alto), se
      // respeta esa prioridad por encima del orden automático.
      if(opts.zIndexOffset){
        el.style.zIndex = String(1000 + opts.zIndexOffset);
      }
      this._el = el;
      this._latlng = latlng;
      // pitchAlignment/rotationAlignment:'map' (opt-in, ej. el círculo mágico bajo el jugador —
      // ver createMeMagicCircle en main.js) hace que MapLibre incline y rote el propio elemento
      // HTML con la cámara, como una calcomanía apoyada en el suelo, en vez de quedar siempre de
      // frente a la pantalla (comportamiento normal de marker, el que sigue usando todo lo demás:
      // retrato del jugador, monstruos, NPCs, etc.).
      const markerOpts = {element: el, anchor:'center', offset:this._anchorOffset, draggable: !!opts.draggable};
      if(opts.pitchAlignment) markerOpts.pitchAlignment = opts.pitchAlignment;
      if(opts.rotationAlignment) markerOpts.rotationAlignment = opts.rotationAlignment;
      this._marker = new maplibregl.Marker(markerOpts)
        .setLngLat(toLngLat(latlng));
      if(opts.draggable){
        this._marker.on('dragend', ()=>{
          const ll = this._marker.getLngLat();
          this._latlng = {lat: ll.lat, lng: ll.lng};
          (this._dragHandlers||[]).forEach(fn=> fn(this._latlng));
        });
      }
    }
    addTo(map){
      this._marker.addTo(map._maplibre);
      map._registerLayerLike(this);
      return this;
    }
    on(evt, fn){
      if(evt === 'click'){
        this.setClickHandler(fn);
      }
      if(evt === 'dragend'){
        (this._dragHandlers = this._dragHandlers||[]).push((latlng)=> fn({latlng}));
      }
      return this;
    }
    setLatLng(latlng){
      this._latlng = latlng;
      this._marker.setLngLat(toLngLat(latlng));
      return this;
    }
    // Siempre normalizado a {lat,lng}: el juego guarda la posición como array [lat,lng] al crear
    // el marcador (ver toLngLat), así que devolver _latlng tal cual dejaba .lat/.lng en undefined
    // para cualquier código que lo leyera así (ej. confirmar dónde colocar la base).
    getLatLng(){
      return Array.isArray(this._latlng) ? {lat:this._latlng[0], lng:this._latlng[1]} : this._latlng;
    }
    getElement(){ return this._marker.getElement(); }
    setDraggable(val){ this._marker.setDraggable(!!val); return this; }
    // Cambia el z-index (apilado visual Y de qué capa "gana" los clics) DESPUÉS de creado el
    // marcador — la fórmula es la misma que usa el constructor (1000 + offset) para que se pueda
    // comparar contra otros marcadores existentes sin recordar la conversión en cada lugar que
    // lo usa.
    setZIndexOffset(offset){ this._el.style.zIndex = String(1000 + offset); return this; }
    setClickHandler(fn){
      if(this._clickHandler) this._el.removeEventListener('click', this._clickHandler);
      this._clickHandler = (domEvt)=>{ domEvt.stopPropagation(); fn({latlng: this._latlng, originalEvent: domEvt}); };
      this._el.addEventListener('click', this._clickHandler);
      return this;
    }
    onDragEnd(fn){
      this._marker.off && this._marker.off('dragend');
      this._marker.on('dragend', ()=>{
        const ll = this._marker.getLngLat();
        this._latlng = {lat: ll.lat, lng: ll.lng};
        fn(this._latlng);
      });
      return this;
    }
    setIcon(icon){
      if(icon && icon.html !== undefined){
        this._el.innerHTML = icon.html;
        const [w,h] = icon.iconSize || [0,0];
        const [ax,ay] = icon.iconAnchor || [w/2, h/2];
        if(w || h){ this._el.style.width = w+'px'; this._el.style.height = h+'px'; }
        this._marker.setOffset([ (w/2 - ax), (h/2 - ay) ]);
      }
      return this;
    }
    remove(){ this._marker.remove(); }
  }

  // ---------------------------------------------------------------------
  // Círculos (L.circle): un área translúcida (zonas de Neiva). Se dibuja
  // como una capa 'fill' de MapLibre sobre un polígono circular generado
  // a mano (MapLibre no tiene un tipo "círculo geográfico" nativo).
  // ---------------------------------------------------------------------
  let __circleAutoId = 0;
  class CircleShim {
    constructor(latlng, opts){
      this._id = 'shim-circle-' + (__circleAutoId++);
      this._latlng = latlng;
      this._opts = opts || {};
    }
    addTo(map){
      const {lat, lng} = Array.isArray(this._latlng) ? {lat:this._latlng[0], lng:this._latlng[1]} : this._latlng;
      const radiusM = this._opts.radius || 100;
      const coords = circlePolygon(lng, lat, radiusM);
      this._map = map;
      map._registerLayerLike(this);
      map._whenReady(()=>{
        map._maplibre.addSource(this._id, {type:'geojson', data:{
          type:'Feature', geometry:{type:'Polygon', coordinates:[coords]}, properties:{}
        }});
        map._maplibre.addLayer({
          id: this._id, type: 'fill', source: this._id,
          paint: {
            'fill-color': this._opts.fillColor || this._opts.color || '#fff',
            'fill-opacity': this._opts.fillOpacity != null ? this._opts.fillOpacity : 0.1,
          }
        });
        const outlinePaint = {
          'line-color': this._opts.color || '#fff',
          'line-width': this._opts.weight || 2,
          'line-opacity': this._opts.opacity != null ? this._opts.opacity : 0.6,
        };
        if(this._opts.dashArray) outlinePaint['line-dasharray'] = this._opts.dashArray.split(',').map(Number);
        map._maplibre.addLayer({
          id: this._id+'-outline', type: 'line', source: this._id,
          layout: {'line-cap': 'round', 'line-join': 'round'},
          paint: outlinePaint,
        });
      });
      return this;
    }
    remove(){
      if(!this._map) return;
      const m = this._map._maplibre;
      if(m.getLayer(this._id)) m.removeLayer(this._id);
      if(m.getLayer(this._id+'-outline')) m.removeLayer(this._id+'-outline');
      if(m.getSource(this._id)) m.removeSource(this._id);
    }
  }
  function circlePolygon(lng, lat, radiusM, steps){
    steps = steps || 48;
    const coords = [];
    const R = 6371000;
    for(let i=0; i<=steps; i++){
      const angle = (i/steps) * 2*Math.PI;
      const dLat = (radiusM * Math.cos(angle)) / R * (180/Math.PI);
      const dLng = (radiusM * Math.sin(angle)) / (R * Math.cos(lat*Math.PI/180)) * (180/Math.PI);
      coords.push([lng+dLng, lat+dLat]);
    }
    return coords;
  }

  // ---------------------------------------------------------------------
  // Rectángulos (L.rectangle): mismo patrón que CircleShim de arriba, pero con las 4 esquinas de
  // un cuadro lat/lng real en vez de un polígono circular — para "cuadras" chicas (zonas
  // peligrosas) donde una forma rectangular se lee mejor que un círculo.
  // ---------------------------------------------------------------------
  let __rectAutoId = 0;
  class RectangleShim {
    /** `bounds` = [[south,west],[north,east]], igual que Leaflet real. */
    constructor(bounds, opts){
      this._id = 'shim-rect-' + (__rectAutoId++);
      this._bounds = bounds;
      this._opts = opts || {};
    }
    addTo(map){
      const [[south, west],[north, east]] = this._bounds;
      const coords = [[west,south],[east,south],[east,north],[west,north],[west,south]];
      this._map = map;
      map._registerLayerLike(this);
      map._whenReady(()=>{
        map._maplibre.addSource(this._id, {type:'geojson', data:{
          type:'Feature', geometry:{type:'Polygon', coordinates:[coords]}, properties:{}
        }});
        map._maplibre.addLayer({
          id: this._id, type: 'fill', source: this._id,
          paint: {
            'fill-color': this._opts.fillColor || this._opts.color || '#fff',
            'fill-opacity': this._opts.fillOpacity != null ? this._opts.fillOpacity : 0.1,
          }
        });
        const outlinePaint = {
          'line-color': this._opts.color || '#fff',
          'line-width': this._opts.weight || 2,
          'line-opacity': this._opts.opacity != null ? this._opts.opacity : 0.6,
        };
        if(this._opts.dashArray) outlinePaint['line-dasharray'] = this._opts.dashArray.split(',').map(Number);
        map._maplibre.addLayer({
          id: this._id+'-outline', type: 'line', source: this._id,
          layout: {'line-cap': 'round', 'line-join': 'round'},
          paint: outlinePaint,
        });
      });
      return this;
    }
    remove(){
      if(!this._map) return;
      const m = this._map._maplibre;
      if(m.getLayer(this._id)) m.removeLayer(this._id);
      if(m.getLayer(this._id+'-outline')) m.removeLayer(this._id+'-outline');
      if(m.getSource(this._id)) m.removeSource(this._id);
    }
  }

  // ---------------------------------------------------------------------
  // Polígonos (L.polygon): mismo patrón que RectangleShim, pero con las esquinas ya calculadas
  // por el juego (ej. un rectángulo ROTADO para alinearse con una calle) en vez de un cuadro
  // lat/lng recto — MapLibre no distingue, ambos son un GeoJSON Polygon cualquiera.
  // ---------------------------------------------------------------------
  let __polygonAutoId = 0;
  class PolygonShim {
    /** `latlngs` = [[lat,lng], ...] en orden (el polígono se cierra solo). */
    constructor(latlngs, opts){
      this._id = 'shim-polygon-' + (__polygonAutoId++);
      this._latlngs = latlngs;
      this._opts = opts || {};
    }
    addTo(map){
      const coords = this._latlngs.map(toLngLat);
      coords.push(coords[0]);
      this._map = map;
      map._registerLayerLike(this);
      map._whenReady(()=>{
        map._maplibre.addSource(this._id, {type:'geojson', data:{
          type:'Feature', geometry:{type:'Polygon', coordinates:[coords]}, properties:{}
        }});
        map._maplibre.addLayer({
          id: this._id, type: 'fill', source: this._id,
          paint: {
            'fill-color': this._opts.fillColor || this._opts.color || '#fff',
            'fill-opacity': this._opts.fillOpacity != null ? this._opts.fillOpacity : 0.1,
          }
        });
        const outlinePaint = {
          'line-color': this._opts.color || '#fff',
          'line-width': this._opts.weight || 2,
          'line-opacity': this._opts.opacity != null ? this._opts.opacity : 0.6,
        };
        if(this._opts.dashArray) outlinePaint['line-dasharray'] = this._opts.dashArray.split(',').map(Number);
        map._maplibre.addLayer({
          id: this._id+'-outline', type: 'line', source: this._id,
          layout: {'line-cap': 'round', 'line-join': 'round'},
          paint: outlinePaint,
        });
      });
      return this;
    }
    remove(){
      if(!this._map) return;
      const m = this._map._maplibre;
      if(m.getLayer(this._id)) m.removeLayer(this._id);
      if(m.getLayer(this._id+'-outline')) m.removeLayer(this._id+'-outline');
      if(m.getSource(this._id)) m.removeSource(this._id);
    }
  }

  // ---------------------------------------------------------------------
  // GeoJSON crudo (L.geoJSON): para las zonas peligrosas por manzana real
  // (dangerZonePolygonizer.js), cuyo resultado ya es un Polygon O MultiPolygon de turf — a
  // diferencia de PolygonShim (que arma un Polygon simple a mano a partir de un array de
  // esquinas), acá no se sabe de antemano cuántos anillos/partes tiene la forma. OJO: a diferencia
  // de TODO el resto de este archivo, que recibe [lat,lng] al estilo Leaflet, este método recibe
  // el GeoJSON tal cual (coordenadas en [lng,lat], como lo devuelve turf) — no hace falta invertir
  // nada, es exactamente lo que ya se tiene después de generar el polígono.
  // ---------------------------------------------------------------------
  let __geojsonAutoId = 0;
  class GeoJSONShim {
    /** `geojson` = Feature<Polygon|MultiPolygon> (coordenadas en [lng,lat], como las da turf). */
    constructor(geojson, opts){
      this._id = 'shim-geojson-' + (__geojsonAutoId++);
      this._geojson = geojson;
      this._opts = opts || {};
    }
    addTo(map){
      this._map = map;
      map._registerLayerLike(this);
      map._whenReady(()=>{
        map._maplibre.addSource(this._id, {type:'geojson', data: this._geojson});
        map._maplibre.addLayer({
          id: this._id, type: 'fill', source: this._id,
          paint: {
            'fill-color': this._opts.fillColor || this._opts.color || '#fff',
            'fill-opacity': this._opts.fillOpacity != null ? this._opts.fillOpacity : 0.1,
          }
        });
        const outlinePaint = {
          'line-color': this._opts.color || '#fff',
          'line-width': this._opts.weight || 2,
          'line-opacity': this._opts.opacity != null ? this._opts.opacity : 0.6,
        };
        if(this._opts.dashArray) outlinePaint['line-dasharray'] = this._opts.dashArray.split(',').map(Number);
        map._maplibre.addLayer({
          id: this._id+'-outline', type: 'line', source: this._id,
          layout: {'line-cap': 'round', 'line-join': 'round'},
          paint: outlinePaint,
        });
      });
      return this;
    }
    /** Reemplaza la geometría sin recrear las capas (para cuando la manzana real llega DESPUÉS del
     *  rectángulo de respaldo — ver drawDangerBlocks en main.js). No-op si todavía no se agregó al
     *  mapa (el próximo addTo ya va a usar this._geojson actualizado). */
    setData(geojson){
      this._geojson = geojson;
      if(this._map){
        const src = this._map._maplibre.getSource(this._id);
        if(src) src.setData(geojson);
      }
      return this;
    }
    remove(){
      if(!this._map) return;
      const m = this._map._maplibre;
      if(m.getLayer(this._id)) m.removeLayer(this._id);
      if(m.getLayer(this._id+'-outline')) m.removeLayer(this._id+'-outline');
      if(m.getSource(this._id)) m.removeSource(this._id);
    }
  }

  // ---------------------------------------------------------------------
  // Líneas (L.polyline): rutas de misión (la línea + su "casing" de sombra).
  // ---------------------------------------------------------------------
  let __lineAutoId = 0;
  class PolylineShim {
    constructor(latlngs, opts){
      this._id = 'shim-line-' + (__lineAutoId++);
      this._latlngs = latlngs;
      this._opts = opts || {};
    }
    addTo(map){
      const coords = this._latlngs.map(toLngLat);
      this._map = map;
      map._registerLayerLike(this);
      map._whenReady(()=>{
        map._maplibre.addSource(this._id, {type:'geojson', data:{
          type:'Feature', geometry:{type:'LineString', coordinates:coords}, properties:{}
        }});
        const paint = {
          'line-color': this._opts.color || '#fff',
          'line-width': this._opts.weight || 3,
          'line-opacity': this._opts.opacity != null ? this._opts.opacity : 1,
        };
        if(this._opts.dashArray) paint['line-dasharray'] = this._opts.dashArray.split(',').map(Number);
        map._maplibre.addLayer({
          id: this._id, type: 'line', source: this._id,
          layout: {'line-cap': this._opts.lineCap || 'butt', 'line-join': this._opts.lineJoin || 'miter'},
          paint,
        });
      });
      return this;
    }
    setLatLngs(latlngs){
      this._latlngs = latlngs;
      if(this._map){
        const src = this._map._maplibre.getSource(this._id);
        if(src) src.setData({type:'Feature', geometry:{type:'LineString', coordinates: latlngs.map(toLngLat)}, properties:{}});
      }
      return this;
    }
    remove(){
      if(!this._map) return;
      const m = this._map._maplibre;
      if(m.getLayer(this._id)) m.removeLayer(this._id);
      if(m.getSource(this._id)) m.removeSource(this._id);
    }
  }

  // ---------------------------------------------------------------------
  // El "mapa": envuelve un maplibregl.Map y traduce los métodos que el
  // juego usa (setView, on('click'), invalidateSize, getZoom, etc.)
  // ---------------------------------------------------------------------
  class MapShim {
    constructor(containerId, opts){
      opts = opts || {};
      this._maplibre = new maplibregl.Map({
        container: containerId,
        style: { version:8, sources:{}, layers:[
          {id:'bg', type:'background', paint:{'background-color':'#dcdcdc'}}
        ]},
        center: [0,0], zoom: 2,
        attributionControl: false,
        dragRotate: true,       // permite rotar (bearing) arrastrando con 2 dedos
        pitchWithRotate: true,  // permite inclinar (pitch) con el mismo gesto
        touchPitch: true,
        maxPitch: 65,
      });
      this._tileLayerId = null;
      this._layers = new Set();
      this._onHandlers = {};
      this._styleReady = false;
      this._readyQueue = [];
      // El estilo base real (mosaicos vectoriales, ya confirmado que funciona con CORS en el
      // dominio del juego) se carga aparte y se aplica en cuanto está listo — así el mapa ya
      // existe de inmediato (el resto del código puede llamar a setView/on/etc sin esperar),
      // y las capas que dependen del estilo (círculos, líneas, mosaico) se encolan hasta entonces.
      // IMPORTANTE: el estilo mínimo pasado arriba (solo 'bg') dispara SU PROPIO 'style.load' casi
      // de inmediato — si _whenReady() se marcara "listo" con ESE evento, cualquier capa encolada
      // se agregaría a ese estilo mínimo, y el setStyle(style) de abajo (que REEMPLAZA el estilo
      // entero) la borraría sin dejar rastro apenas cargara el estilo real. Por eso el flush de
      // _readyQueue ignora ese primer 'style.load' (bandera `realStyleApplied` en falso) y solo
      // actúa desde el que sigue a setStyle(). La bandera se pone en `true` ANTES de llamar a
      // setStyle(), no después: setStyle() puede disparar 'style.load' de forma síncrona (antes de
      // que la propia llamada retorne), así que el listener (registrado antes, y persistente, no
      // .once) ya lo ve en `true` sea cual sea el orden real de ejecución.
      let realStyleApplied = false;
      this._maplibre.on('style.load', ()=>{
        if(!realStyleApplied) return;
        this._styleReady = true;
        this._readyQueue.forEach(fn=>fn());
        this._readyQueue = [];
      });
      fetch('./map-base-style.json').then(r=>r.json()).then(style=>{
        realStyleApplied = true;
        this._maplibre.setStyle(style);
      }).catch(e=> console.warn('[MAPA] no se pudo cargar el estilo del mapa:', e));
      this._maplibre.on('click', (e)=>{
        if(this._onHandlers['click']){
          this._onHandlers['click'].forEach(fn=> fn({latlng: fromLngLat(e.lngLat), originalEvent: e.originalEvent}));
        }
      });
      this._maplibre.on('zoomend', ()=>{
        (this._onHandlers['zoomend']||[]).forEach(fn=>fn());
      });
      this._maplibre.on('rotate', ()=>{
        (this._onHandlers['rotate']||[]).forEach(fn=>fn());
      });
      this._maplibre.on('pitch', ()=>{
        (this._onHandlers['pitch']||[]).forEach(fn=>fn());
      });
      this._maplibre.on('move', ()=>{
        (this._onHandlers['move']||[]).forEach(fn=>fn());
      });
    }
    _registerLayerLike(obj){ this._layers.add(obj); }
    setView(latlng, zoom){
      this._maplibre.jumpTo({center: toLngLat(latlng), zoom});
      return this;
    }
    /** Como setView, pero animado: interpola centro, zoom e inclinación juntos con una transición
     *  suave (easeTo de MapLibre) en vez de saltar de golpe. Se usa para el botón de centrar, para
     *  que ubicar al personaje se sienta cinemático (acercamiento + inclinación) en lugar de brusco. */
    flyTo(latlng, opts){
      opts = opts || {};
      this._maplibre.easeTo({
        center: toLngLat(latlng),
        zoom: opts.zoom != null ? opts.zoom : this._maplibre.getZoom(),
        pitch: opts.pitch != null ? opts.pitch : this._maplibre.getPitch(),
        bearing: opts.bearing != null ? opts.bearing : this._maplibre.getBearing(),
        duration: opts.duration || 1400,
        essential: true
      });
      return this;
    }
    panTo(latlng){ this._maplibre.panTo(toLngLat(latlng)); return this; }
    on(evt, fn){
      (this._onHandlers[evt] = this._onHandlers[evt]||[]).push(fn);
      return this;
    }
    getZoom(){ return this._maplibre.getZoom(); }
    setZoom(z){ this._maplibre.setZoom(z); return this; }
    zoomIn(){ this._maplibre.zoomIn(); return this; }
    zoomOut(){ this._maplibre.zoomOut(); return this; }
    getCenter(){ return fromLngLat(this._maplibre.getCenter()); }
    getBearing(){ return this._maplibre.getBearing(); }
    /** Convierte una coordenada real [lat,lng] a su posición actual en píxeles de pantalla —
     *  así se puede anclar un efecto visual (como el brillo de luna/sol) a un punto real del
     *  mapa, en vez de dejarlo fijo en la pantalla sin importar hacia dónde te muevas. */
    project(latlng){
      const p = this._maplibre.project(toLngLat(latlng));
      return {x: p.x, y: p.y};
    }
    /** Busca el segmento de calle más cercano a `latlng` entre las capas de calles YA
     *  renderizadas cerca de ese punto en pantalla (dentro de `pixelRadius` px) — devuelve sus
     *  dos primeros puntos como {a:{lat,lng}, b:{lat,lng}}, o null si no hay datos de calles
     *  cargados ahí (fuera de la vista actual, zoom insuficiente, etc. — el estilo no tiene un
     *  polígono de "cuadra/manzana" listo, solo líneas de calle, así que esto es lo más cerca
     *  que se puede leer del mapa real sin construir un motor de geometría propio). Se usa para
     *  orientar rectángulos (zonas peligrosas) según la calle real en vez de dejarlos siempre
     *  alineados norte-sur. */
    roadBearingSegmentNear(latlng, pixelRadius){
      if(!this._styleReady) return null;
      let p;
      try{ p = this._maplibre.project(toLngLat(latlng)); }catch(e){ return null; }
      const r = pixelRadius || 45;
      let feats;
      try{
        feats = this._maplibre.queryRenderedFeatures(
          [[p.x-r, p.y-r],[p.x+r, p.y+r]],
          {layers: ['highway_minor','highway_major_casing','highway_major_inner']}
        );
      }catch(e){ return null; }
      for(const f of (feats||[])){
        const geom = f.geometry;
        let coords = null;
        if(geom.type === 'LineString') coords = geom.coordinates;
        else if(geom.type === 'MultiLineString' && geom.coordinates.length) coords = geom.coordinates[0];
        if(!coords || coords.length < 2) continue;
        const a = {lat: coords[0][1], lng: coords[0][0]};
        const b = {lat: coords[1][1], lng: coords[1][0]};
        if(a.lat === b.lat && a.lng === b.lng) continue;
        return {a, b};
      }
      return null;
    }
    setBearing(b){ this._maplibre.setBearing(b); return this; }
    getPitch(){ return this._maplibre.getPitch(); }
    setPitch(p){ this._maplibre.setPitch(p); return this; }
    resetNorthPitch(){ this._maplibre.easeTo({bearing:0, pitch:0, duration:400}); return this; }
    invalidateSize(){ this._maplibre.resize(); return this; }
    /** Mientras el GPS está activo, un dedo NO debe mover la vista a otro lado (perderías el
     *  foco de tu propio personaje) — en cambio, arrastrar con un dedo GIRA la cámara alrededor
     *  tuyo (como mirar a los lados sin caminar), y el acercar/alejar con dos dedos queda
     *  limitado para no alejarte demasiado del zoom normal del juego. */
    enableGpsGestureMode(centerLatLng, minZoomAllowed){
      const m = this._maplibre;
      m.dragPan.disable(); // ya no se puede "correr" la vista arrastrando con un dedo
      m.setMinZoom(minZoomAllowed);
      const canvas = m.getCanvasContainer();
      let dragging = false, startX = 0, startBearing = 0;
      const onDown = (x)=>{ dragging = true; startX = x; startBearing = m.getBearing(); };
      const onMoveFn = (x)=>{
        if(!dragging) return;
        const deltaBearing = (startX - x) * 0.3;
        m.setBearing(startBearing + deltaBearing);
        if(centerLatLng()) m.setCenter(toLngLat(centerLatLng())); // se queda centrado en el jugador SIEMPRE, solo gira
      };
      const onUp = ()=>{ dragging = false; };
      const onTouchStart = (e)=>{ if(e.touches.length===1) onDown(e.touches[0].clientX); };
      const onTouchMove = (e)=>{ if(e.touches.length===1) onMoveFn(e.touches[0].clientX); };
      const onTouchEnd = ()=> onUp();
      canvas.addEventListener('touchstart', onTouchStart, {passive:true});
      canvas.addEventListener('touchmove', onTouchMove, {passive:true});
      canvas.addEventListener('touchend', onTouchEnd);
      this._gpsGestureCleanup = ()=>{
        canvas.removeEventListener('touchstart', onTouchStart);
        canvas.removeEventListener('touchmove', onTouchMove);
        canvas.removeEventListener('touchend', onTouchEnd);
        m.dragPan.enable();
        m.setMinZoom(0);
      };
    }
    disableGpsGestureMode(){
      if(this._gpsGestureCleanup){ this._gpsGestureCleanup(); this._gpsGestureCleanup = null; }
    }
    removeLayer(layerLike){
      if(layerLike && typeof layerLike.remove === 'function') layerLike.remove();
      this._layers.delete(layerLike);
      return this;
    }
    _whenReady(fn){
      if(this._styleReady) fn();
      else this._readyQueue.push(fn);
    }
    /** Se dispara UNA sola vez, la primera vez que el mapa terminó de cargar y renderizar su vista
     *  inicial de verdad — usado para ocultar la pantalla de carga (ver mapLoadingOverlay en
     *  main.js). Hay que esperar a _whenReady() primero: el constructor arranca con un estilo
     *  mínimo transitorio (mientras llega el real por fetch) que dispara su PROPIO 'idle' casi de
     *  inmediato — si se escuchara 'idle' desde ya, la pantalla de carga se cerraría antes de que
     *  siquiera empezara a pedirse el estilo/mosaicos reales. */
    whenTilesLoaded(callback){
      this._whenReady(()=>{ this._maplibre.once('idle', callback); });
    }
    addRasterTileLayer(url, opts){
      // El estilo base (con sus propios mosaicos vectoriales) ya se carga en el constructor;
      // aquí solo se conserva la clase CSS para que el sistema de día/noche/clima le siga
      // pudiendo aplicar su filtro visual — IMPORTANTE: se aplica solo al <canvas> (lo ya
      // dibujado del mapa), NUNCA al contenedor completo, porque ese contenedor también
      // envuelve a los marcadores (jugador, monstruos, NPC) y no deben oscurecerse con el mapa.
      this._whenReady(()=>{
        if(opts && opts.className){
          const canvas = this._maplibre.getCanvas();
          canvas.classList.add(opts.className);
        }
      });
    }
    /** Destruye el mapa por completo — canvas WebGL, marcadores, capas, listeners — para poder
     *  crear uno nuevo desde cero (cambiar de personaje, volver al menú). Esta clase NO tenía este
     *  método antes: teardownMapIfExists() en main.js comprueba `map.remove` antes de llamarlo, así
     *  que sin esto el chequeo fallaba en silencio y el mapa/marcador viejo quedaba huérfano en el
     *  DOM — seguía vivo, todavía visible y respondiendo a sus propios eventos — que era el bug de
     *  "el personaje anterior se queda pegado en el mapa" al cambiar de personaje.
     *  maplibregl.Map.remove() ya limpia sus propios marcadores/popups/capas/fuentes por dentro,
     *  así que alcanza con delegarle todo. */
    remove(){
      if(this._gpsGestureCleanup){ this._gpsGestureCleanup(); this._gpsGestureCleanup = null; }
      this._onHandlers = {};
      this._layers.clear();
      if(this._maplibre) this._maplibre.remove();
    }
  }

  class TileLayerShim {
    constructor(url, opts){ this._url = url; this._opts = opts; }
    addTo(map){ map.addRasterTileLayer(this._url, this._opts); return this; }
  }

  window.L = {
    map(containerId, opts){ return new MapShim(containerId, opts); },
    marker(latlng, opts){ return new MarkerShim(latlng, opts); },
    divIcon(opts){ return opts; },
    tileLayer(url, opts){ return new TileLayerShim(url, opts); },
    circle(latlng, opts){ return new CircleShim(latlng, opts); },
    rectangle(bounds, opts){ return new RectangleShim(bounds, opts); },
    polygon(latlngs, opts){ return new PolygonShim(latlngs, opts); },
    geoJSON(geojson, opts){ return new GeoJSONShim(geojson, opts); },
    polyline(latlngs, opts){ return new PolylineShim(latlngs, opts); },
    DomEvent: {
      stopPropagation(e){
        if(e && e.originalEvent && e.originalEvent.stopPropagation) e.originalEvent.stopPropagation();
        if(e && e.stopPropagation) e.stopPropagation();
      }
    },
  };
})();

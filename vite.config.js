const { defineConfig } = require('vite');
const JavaScriptObfuscator = require('javascript-obfuscator');

const BUILD_ID = String(Date.now());

/* ============================================================
   Ofuscación del bundle de producción — protege contra lectura/parcheo
   directo del JS extraído del APK (Capacitor empaqueta dist/ tal cual).
   ------------------------------------------------------------
   Config deliberadamente conservadora: NADA de controlFlowFlattening,
   deadCodeInjection, debugProtection ni selfDefending — son las opciones
   de javascript-obfuscator más propensas a romper apps reales (cuelgues,
   loops infinitos "anti-devtools", parseo mucho más lento en un bundle de
   ~1MB). `apply: 'build'` asegura que esto NUNCA corre en `vite dev`
   (server), solo en `vite build`. `ignoreImports: true` deja intacta la
   sintaxis import/export que Vite necesita entre chunks.

   El renombrado de identificadores (identifierNamesGenerator) no tiene
   NINGÚN costo en runtime — es solo texto distinto ya generado en build.
   El "string array" (stringArray/stringArrayEncoding/stringArrayIndexShift)
   sí lo tiene: cada string literal pasa a ser una llamada a función que la
   decodifica la primera vez que se usa. En probamos en un celular real:
   incluso en su versión más liviana (sin encoding, sin index shift) seguía
   pesando en los caminos "calientes" del juego (el callback de
   watchPosition de GPS dispara cálculos de zona con turf.js en
   dangerZones.js en cada tick, no solo al arrancar) — se traducía en GPS
   que se perdía cada tanto y caída de FPS. Para un juego de geolocalización
   eso es peor que el riesgo que se busca mitigar, así que stringArray queda
   DESACTIVADO. Solo se mantiene el renombrado de identificadores (gratis) +
   compact/simplify (transformaciones sintácticas sin costo de runtime).
   ============================================================ */
function obfuscateProductionBundle(){
  return {
    name: 'obfuscate-production-bundle',
    apply: 'build',
    renderChunk(code){
      const result = JavaScriptObfuscator.obfuscate(code, {
        compact: true,
        target: 'browser',
        ignoreImports: true,
        renameGlobals: false,
        identifierNamesGenerator: 'hexadecimal',
        controlFlowFlattening: false,
        deadCodeInjection: false,
        debugProtection: false,
        selfDefending: false,
        disableConsoleOutput: false,
        stringArray: false,
        simplify: true,
        splitStrings: false,
        numbersToExpressions: false,
        unicodeEscapeSequence: false
      });
      return { code: result.getObfuscatedCode(), map: null };
    }
  };
}

module.exports = defineConfig({
  server: {
    host: true
  },
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID)
  },
  plugins: [
    obfuscateProductionBundle(),
    {
      name: 'emit-version-json',
      generateBundle(){
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ buildId: BUILD_ID })
        });
      }
    },
    {
      // maplibre-gl.js / maplibre-leaflet-shim.js / maplibre-gl.css viven en public/ y se cargan
      // con <script>/<link> planos (Vite no los toca — no son type="module" ni un import de JS),
      // así que no llevan hash de contenido: un reemplazo de archivo (como el fix del bug de
      // "el personaje anterior queda pegado en el mapa" en maplibre-leaflet-shim.js) se serviría
      // cacheado viejo indefinidamente sin esto. Mismo BUILD_ID que ya usa __BUILD_ID__ arriba.
      name: 'cachebust-maplibre-tags',
      transformIndexHtml(html){
        return html.replace(
          /(src|href)="\.\/(maplibre-gl\.js|maplibre-leaflet-shim\.js|maplibre-gl\.css)"/g,
          (_m, attr, file) => `${attr}="./${file}?v=${BUILD_ID}"`
        );
      }
    }
  ]
});

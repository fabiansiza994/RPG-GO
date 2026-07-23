const { defineConfig } = require('vite');

const BUILD_ID = String(Date.now());

module.exports = defineConfig({
  server: {
    host: true
  },
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID)
  },
  plugins: [
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

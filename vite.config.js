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
    }
  ]
});

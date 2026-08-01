# RPG GO

Proyecto completo del juego RPG GO.

## 📦 Contenido del proyecto

Este paquete incluye todo el proyecto actualizado:

### Código fuente
- `src/`
- `public/`
- `index.html`

### Configuración
- `package.json`
- `vite.config.js`
- Archivos de configuración necesarios para ejecutar el proyecto.

### Documentación

La carpeta `docs/` contiene toda la documentación técnica actualizada del proyecto, incluyendo (entre otros):

- `TODO.md`
- `PROJECT_CONTEXT.md`
- `ARCHITECTURE.md`
- `COMBAT_POWER.md`
- `OSM_INTEGRATION.md`
- y demás documentos generados durante el desarrollo.

> Toda la documentación está sincronizada con el estado actual del código fuente.

---

## ❌ No incluidos

Por tamaño y porque pueden regenerarse automáticamente, este paquete **no incluye**:

- `node_modules/`
- `dist/`

---

# 🚀 Instalación

Instalar las dependencias:

```bash
npm install
```

---

## Ejecutar en modo desarrollo

```bash
npm run dev
```

---

## Generar versión de producción

```bash
npm run build
```

La carpeta `dist/` será creada automáticamente.

---

## Correr las pruebas

```bash
npm test
```

---

## Empaquetado Android (Capacitor)

El juego también se empaqueta como app Android nativa vía Capacitor (`android/`, `capacitor.config.json`):

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleRelease
```

Requiere JDK 21 y el keystore de release (`android/keystore.properties`, gitignored). Antes de publicar un build con publicidad real, revisar `ADS_RELEASE_CHECKLIST.md`.

---

# 📁 Estructura

```
.
├── docs/
├── public/
├── src/
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

---

# 📝 Notas

- El proyecto fue entregado completamente actualizado.
- La documentación refleja la implementación actual del código.
- Si se realizan cambios en el código, se recomienda mantener sincronizados los documentos de la carpeta `docs/`.

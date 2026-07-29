// Service worker mínimo — existe únicamente para que Chrome considere el sitio "instalable" como
// PWA (ver public/manifest.webmanifest). A propósito NO cachea nada: el juego ya tiene su propio
// sistema de detección de versión nueva vía version.json/__BUILD_ID__ (ver checkForNewVersion en
// src/main.js), y cachear acá lo pisaría. skipWaiting/clients.claim solo evitan que quede un SW
// viejo esperando de una instalación anterior.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

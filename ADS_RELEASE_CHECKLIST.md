# Checklist de publicación — Publicidad (AdMob)

Revisar TODO esto antes de subir un build de **producción** a Google Play. Ninguno de estos pasos es automático — son verificaciones manuales.

## Cuenta y consola de AdMob / Play Console

- [ ] Cuenta de AdMob vinculada a la app en Play Console.
- [ ] AdMob App ID real de Android generado en la consola de AdMob.
- [ ] 3 unidades de rewarded ad creadas (una por placement — nunca reutilizar la misma unidad):
  - [ ] `BATTLE_REVIVE`
  - [ ] `POST_BATTLE_GOLD_BONUS`
  - [ ] `DAILY_AD_CHEST`
- [ ] Mensajes de consentimiento (UMP/GDPR) configurados en la consola de AdMob (Privacy & messaging).
- [ ] `app-ads.txt` publicado en el dominio declarado como sitio de la app, si corresponde.

## Configuración de build

- [ ] Variable de entorno `VITE_ADS_ENV=production` seteada SOLO en el pipeline de build de producción.
- [ ] `VITE_ADMOB_APP_ID_ANDROID` y las 3 `VITE_ADMOB_UNIT_*` de Fase 1 completadas con IDs reales (nunca en un `.env` commiteado — ver `.env.example`).
- [ ] Variable de entorno `ADMOB_APP_ID_ANDROID` seteada en el entorno de build de Gradle (CI o máquina de release) con el AdMob App ID real.
- [ ] Confirmar que `ADS_CONFIG.testMode` resulta `false` en ese build (se calcula solo desde `VITE_ADS_ENV`, ver `ads.config.js` — no hay bandera aparte que se pueda olvidar).
- [ ] IDs de prueba de Google (`ca-app-pub-3940256099942544...`) confirmados AUSENTES del build de producción (deberían desaparecer solos al completar el paso anterior — verificar igual).
- [ ] Test devices (`VITE_ADS_TEST_DEVICE_IDS`) vacíos o solo con dispositivos de QA internos, nunca en el build público.
- [ ] SDK de AdMob (`@capacitor-community/admob`) en su versión estable más reciente compatible con Capacitor 8 (`npm outdated @capacitor-community/admob`).

## Consentimiento y privacidad

- [ ] Flujo de consentimiento probado en un dispositivo/emulador configurado como región EEE (`VITE_ADS_UMP_DEBUG_GEOGRAPHY=EEA` en un build de prueba).
- [ ] Entrada "Opciones de privacidad de anuncios" visible en Ajustes cuando el SDK indica que hace falta (`isPrivacyOptionsRequired()`), y funcional.
- [ ] Política de privacidad del juego actualizada mencionando el uso de AdMob/rewarded ads.
- [ ] Sección "Seguridad de los datos" de Play Console revisada y coherente con lo que el SDK realmente recolecta.
- [ ] Audiencia objetivo y clasificación de contenido de Play Console revisadas — `CONTENT_SETTINGS` (`isChildDirected`/`isUnderAgeOfConsent`/`maxAdContentRating`) en `ads.config.js` coincide con lo declarado ahí (no se infiere del comportamiento del jugador).

## Verificación funcional (build de producción, en un dispositivo real)

- [ ] Revivir con anuncio: recompensa se entrega solo tras el evento de recompensa real del SDK, nunca al cerrar el anuncio.
- [ ] Revivir con diamantes sigue funcionando exactamente igual que antes.
- [ ] "Volver al mapa" sin ver ningún anuncio sigue siendo una opción real y sin penalización.
- [ ] Bonus de oro post-combate duplica solo el oro base — nunca XP, diamantes, objetos ni recompensas de misión/contrato.
- [ ] Cofre del patrocinador respeta su límite diario y su cooldown.
- [ ] Botones de anuncio deshabilitados de verdad (no solo visualmente) cuando corresponde, con el texto correcto: "Preparando anuncio…", "Anuncio no disponible", "Disponible mañana".
- [ ] Sin conexión: ningún botón de anuncio se muestra activo; el resto del juego funciona igual.
- [ ] Doble toque rápido en un botón de anuncio no duplica la recompensa ni abre dos anuncios.

## Interruptor de emergencia

- [ ] Probado: con `VITE_ADS_ENABLED=false`, ningún botón de anuncio aparece en ningún lado y el resto del juego funciona idéntico.

## Verificación de que NO hay anuncios en lugares prohibidos

- [ ] Ningún anuncio (ni siquiera un botón opcional) aparece durante: exploración del mapa, combate en curso, inventario, cambio de personaje, interacción con NPC, lectura de misiones, Contrato del Aventurero, inicio de batalla, transiciones entre pantallas normales, uso de GPS/movimiento.
- [ ] `interstitialAdsEnabled`, `appOpenAdsEnabled`, `bannerAdsEnabled` siguen en `false` en `ads.config.js` (Fase 1 — ver `FEATURE_FLAGS`).

## Estabilidad

- [ ] Sin crashes nuevos atribuibles al módulo de ads en los reportes de Play Console / Internal Testing.
- [ ] Sin ANR nuevos atribuibles al módulo de ads.
- [ ] Probado: rotar pantalla / enviar la app a segundo plano mientras se muestra un anuncio no dejó el juego en un estado roto (batalla duplicada, dos modales abiertos, etc.).

## Antes de dar el visto bueno final

- [ ] `npm run build` y `npm run test` corridos sobre el commit exacto que se va a publicar, ambos en verde.
- [ ] Build de Android (`assembleRelease` o `bundleRelease`) generado y probado en Internal Testing antes de promover a producción.

---

**No publicar en Google Play sin autorización explícita del equipo/dueño del proyecto** — este checklist ayuda a verificar que todo esté listo, pero la decisión de publicar es humana, no automática.

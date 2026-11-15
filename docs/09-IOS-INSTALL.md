# 09 · Instalar en iPhone

## Opción recomendada: web app en GitHub Pages (sin App Store, sin cuenta de Apple)
Cada `push` a `main` ejecuta `.github/workflows/pages.yml`: compila la app para web (`EXPO_BASE_URL=/<repo>`), la convierte en PWA (`scripts/pwa-postbuild.mjs`: manifest, icono, etiquetas de iOS y 404.html para enlaces profundos) y la publica en **https://reenillaa.github.io/Cashino/**.

1. Solo la primera vez: en GitHub → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. En el iPhone abre la URL en **Safari** → botón **Compartir** → **Añadir a pantalla de inicio**.
3. Se abre a pantalla completa con su icono, como una app. El progreso se guarda en el navegador del dispositivo.

Limitaciones de la versión web: sin vibración háptica (iOS no la expone a la web) y el desenfoque de cristal depende de Safari. Todo lo demás funciona igual (juegos, Academy, salas, progreso offline).

Para probarla en local con la misma ruta: `npm run export:pages` y sirve `dist/` bajo `/Cashino/`.

---

## Opción nativa (opcional): EAS Build / TestFlight

> Nada de esto requiere un Mac: EAS compila en la nube. Sí requiere cuentas que **tienes que aportar tú**.

## Lo que necesitas
| Recurso | Para qué | Obligatorio |
|---|---|---|
| Cuenta Expo (gratis) | Ejecutar EAS Build | Sí |
| **Apple Developer Program** (99 USD/año) | Firmar builds para un iPhone real y TestFlight | Sí, para instalar en un iPhone físico |
| Proyecto Supabase (gratis para empezar) | Funciones online | No (la app funciona offline sin él) |
| Bundle identifier propio | Sustituir `app.titanium.provisional` | Sí antes de publicar |

## 1. Preparar
```bash
npm install
```
```bash
npx eas-cli@latest login
```
```bash
npx eas-cli@latest init
```
`init` crea el proyecto en Expo y te da el `EAS_PROJECT_ID` (ponlo en `.env` o deja que lo escriba en la config). Cambia `APP_BUNDLE_ID` por uno tuyo (p. ej. `com.tuempresa.titanium`).

## 2. (Opcional) Backend online
```bash
npx supabase login
```
```bash
npx supabase link --project-ref <tu-ref>
```
```bash
npx supabase db push
```
```bash
npm run sync:engine && npx supabase functions deploy game rewards account poker
```
Rellena `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `eas.json` (perfil `base`) o como variables de entorno de EAS. En Supabase → Authentication → URL Configuration añade `titanium://`.

## 3. Build de desarrollo en tu iPhone (instalación directa)
```bash
npx eas-cli@latest device:create
```
Registra el UDID de tu iPhone (abre el enlace en el iPhone). Después:
```bash
npx eas-cli@latest build --profile development --platform ios
```
Instala desde el enlace/QR que da EAS. En iOS 16+ activa **Ajustes → Privacidad y seguridad → Modo desarrollador**. Arranca el servidor con `npx expo start --dev-client`.

## 4. Build de prueba interna (sin servidor de desarrollo)
```bash
npx eas-cli@latest build --profile preview --platform ios
```
Se instala en los dispositivos registrados (distribución *ad hoc*).

## 5. TestFlight
```bash
npx eas-cli@latest build --profile production --platform ios
```
```bash
npx eas-cli@latest submit --platform ios --latest
```
EAS crea la app en App Store Connect si no existe (te pedirá iniciar sesión con tu Apple ID). En App Store Connect → TestFlight añade testers.

## 6. Simulador (si tienes Mac)
```bash
npx eas-cli@latest build --profile development-simulator --platform ios
```

## Notas para la publicación en App Store (paso separado)
- Es una app de **simulación de juegos de azar sin dinero real**: clasificación de edad 17+ y la guía 5.3 de Apple aplica; la moneda no puede comprarse ni canjearse (ya es así).
- Necesitarás política de privacidad pública, capturas, descripción y elegir un nombre definitivo.
- Push remotas (amigos/invitaciones) requieren una clave APNs en EAS (`eas credentials`); hoy la app usa notificaciones locales opcionales e in-app.

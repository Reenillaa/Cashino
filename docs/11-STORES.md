# Publicar Cashino en App Store y Google Play

Todo lo que se puede dejar hecho en el código ya está (configuración de EAS, iconos, identificadores, versión
remota que se incrementa sola). Lo que falta son **cuentas y credenciales que solo puede crear el dueño**; nunca
se guardan en el repositorio.

## Lo que necesitas tú
1. **Cuenta de Expo** (gratis) → crea un *access token* en expo.dev → Settings → Access tokens.
2. **Apple Developer Program** (99 $/año) para iOS. EAS crea los certificados y perfiles solo la primera vez.
3. **Google Play Console** (25 $ una vez) para Android, y una *service account* con permiso de subir versiones
   (JSON de la cuenta de servicio) para `eas submit`.

## Comandos (en tu ordenador, con Bun o npm)
```bash
npx eas-cli@latest login
npx eas-cli@latest init            # enlaza el proyecto con tu cuenta (rellena owner/projectId)
npx eas-cli@latest build --profile production --platform ios
npx eas-cli@latest build --profile production --platform android
npx eas-cli@latest submit --profile production --platform ios       # sube a App Store Connect (TestFlight)
npx eas-cli@latest submit --profile production --platform android   # sube a Play Console (pista interna, borrador)
```
Las versiones de tienda ya apuntan al servidor real (`eas.json` → `build.base.env`, con la URL y la clave
*publicable* de Supabase, que son públicas por diseño).

## Normas de las tiendas para un "casino social" (sin dinero real)
- **Apple** (guía 5.3): permitido si las fichas no se pueden comprar con dinero ni canjear. Clasificación de
  edad **17+** («Simulated Gambling: Frequent/Intense»).
- **Google Play** (política de *social casino*): igual, sin dinero real; cuestionario de contenido marcando juego
  simulado; público **18+** recomendado.
- Cashino ya cumple: las fichas no se compran ni se canjean (avisos en la app), hay límites de juego propios,
  resumen honesto y recordatorios de descanso.
- Para la ficha necesitarás capturas (las de `docs/` sirven de base), una política de privacidad pública y un
  correo de soporte.

## Notificaciones en las apps nativas
La web instalada ya tiene notificaciones push. En las apps nativas, `expo-notifications` necesita además las
claves de APNs (Apple) y FCM (Google), que EAS configura durante el primer `build` / `credentials`.

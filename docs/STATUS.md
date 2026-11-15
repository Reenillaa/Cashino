# Estado del proyecto

Registro honesto frente a los 31 criterios de aceptación. ✅ hecho y verificado · 🟡 implementado, falta verificación en entorno real · ❌ pendiente.

| # | Criterio | Estado | Notas |
|---|---|---|---|
| 1 | App React Native ejecutable | ✅ | Expo SDK 58 / RN 0.88; typecheck y build web OK |
| 2 | Identidad Titanium | ✅ | `docs/02`, tokens, icono provisional “Split” |
| 3 | 5 pestañas funcionales | ✅ | Inicio, Juegos, Ranking, Social, Perfil |
| 4 | 14 juegos implementados | ✅ | Todos jugables (verificado en navegador) |
| 5 | Reglas correctas | ✅ | 98 pruebas de motor |
| 6 | Tutorial propio por juego | ✅ | 14 tutoriales interactivos |
| 7 | Tutoriales recuerdan finalización | ✅ | `<juego>_tutorial_completed`, local + sync |
| 8 | Modo offline | ✅ | Invitado completo, práctica |
| 9 | Multijugador online | 🟡 | Póker online (cash, privadas, Sit & Go) con Realtime y servidor autoritativo; type-checked, **no probado contra un Supabase vivo** |
| 10 | Bots de distintas dificultades | ✅ | 3 dificultades × 4 estilos, etiquetados BOT |
| 11 | Economía virtual | ✅ | Simulada (`docs/06`) |
| 12 | Recompensas gratuitas | ✅ | Diario, recargas, misiones (local y servidor) |
| 13 | Progresión | ✅ | Niveles, XP con topes, logros, misiones, temporadas |
| 14 | Rankings | 🟡 | Vistas SQL y UI; datos reales requieren backend desplegado (vista previa local offline) |
| 15 | Perfiles y amigos | 🟡 | Implementado con RLS probada en Postgres; falta prueba con backend vivo |
| 16 | Salas privadas y torneos | 🟡 | Código de sala, invitaciones, Sit & Go; idem |
| 17 | Academy | ✅ | 42 lecciones, cuestionarios, insignias, niveles |
| 18 | Contenido de los 14 juegos | ✅ | Mínimo 2 lecciones por juego |
| 19 | Simuladores | ✅ | 8 simuladores |
| 20 | Personalización | ✅ | Avatar, nombre, favoritos, privacidad |
| 21 | Oscuro y claro | ✅ | Verificado visualmente |
| 22 | Español e inglés | ✅ | i18next, paridad de claves probada |
| 23 | Ajustes de sonido y animaciones | ✅ | Efectos/música/hápticos/volúmenes, animaciones, reducir movimiento y efectos, calidad |
| 24 | Estadísticas | ✅ | Por juego y generales, historial |
| 25 | Accesibilidad básica | 🟡 | Roles/labels, Dynamic Type con tope, reduce motion, color + texto; falta auditoría con VoiceOver real |
| 26 | Animaciones funcionan | 🟡 | Verificadas en web; falta perfilado en iPhone |
| 27 | Backend y persistencia | 🟡 | Persistencia local ✅; esquema y funciones listos, no desplegados |
| 28 | Operaciones críticas seguras | ✅ | Probado en Postgres (`docs/07`) |
| 29 | Pruebas ejecutadas y documentadas | ✅ | `docs/10` |
| 30 | Repositorio preparado | 🟡 | Git con commits, CI, README; **falta subirlo a GitHub** (necesita tu autorización/repo) |
| 31 | Procedimiento de instalación en iPhone | ✅ | `docs/09` (requiere tu cuenta de Apple Developer) |

## Decisiones técnicas registradas
- Motor puro compartido app ↔ Edge Functions (`npm run sync:engine`).
- Sin Skia en v1 (SVG + Reanimated bastan y funcionan en web/CI).
- Tab bar propia de cristal en lugar de native tabs (identidad igual en iOS 17–26).
- Iconos SVG propios en lugar de SF Symbols (consistencia y verificación en web).
- “Chicken Road” → **Cruce** (marca de terceros; mecánica genérica con arte original).
- Usuarios con cuenta juegan contra bots en práctica local; las monedas en juego online van por mesas del servidor.

## Limitaciones conocidas
- Nombre de la app y de la moneda provisionales (`src/config/brand.ts`, `app.config.ts`).
- Push remotas no configuradas (requiere clave APNs); hay notificaciones locales opcionales e in-app.
- Sign in with Apple no activado (requiere cuenta Apple Developer); email + contraseña y enlace mágico sí.
- En ruleta, la UI permite plenos y apuestas exteriores; caballos/calles/cuadros/seisenas están en el motor y el servidor pero no en el tapete móvil.
- Saldo casual inflacionario (sin sumideros cosméticos aún).
- Las skills REA y Taste no estaban disponibles en el entorno.

## Próximos pasos
1. Crear repo en GitHub y subir (necesito tu OK y el nombre del repo).
2. Crear proyecto Supabase, `db push`, desplegar funciones y probar online con dos dispositivos.
3. Build EAS de desarrollo en tu iPhone; perfilar animaciones y revisar VoiceOver.
4. Elegir nombre definitivo, icono final (propuestas en `brand/`) y bundle id.
5. Tienda cosmética con Ti, apuestas interiores completas en ruleta, Sign in with Apple, push.

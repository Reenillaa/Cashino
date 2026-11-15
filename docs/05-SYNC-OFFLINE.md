# 05 · Modo offline y sincronización

## Modos
| Situación | Saldo usado | Resultado | Rankings |
|---|---|---|---|
| Invitado (sin cuenta) | Cartera local (`useWallet`) | Motor local + RNG verificable local | No |
| Cualquiera en **Práctica** | Fichas de práctica ilimitadas | Local | No |
| Con cuenta y conexión | Cartera del servidor | Edge Function `game` / `poker` | Sí |
| Con cuenta sin conexión | — | Práctica local | No |

El invitado puede jugar los 14 juegos (póker contra bots incluido), usar Academy y simuladores, consultar reglas, tutoriales y estadísticas locales. El registro solo se pide para funciones online.

## Persistencia local
Stores de zustand persistidos en `localStorage` (polyfill SQLite de `expo-sqlite` en iOS/Android): ajustes, cartera, progreso, historial, aprendizaje, semillas y **rondas activas** (una ronda multi-paso a medias se recupera tras cerrar la app con su RNG en el mismo punto).

## Al crear cuenta / iniciar sesión
1. **Aprendizaje** (tutoriales `<juego>_tutorial_completed` y lecciones): unión en ambos sentidos con la RPC `sync_learning`. Lo completado nunca vuelve a incompleto → no hay conflictos. Las lecciones nuevas dan XP/puntos en el servidor (máx. 10 por sincronización, ids validados).
2. **Monedas**: la cartera de invitado se transfiere **una única vez por cuenta** (`migrate_guest`, tabla `guest_migrations` con PK por usuario) y con tope de 50.000. Nunca se vuelve a fusionar, así que cerrar y abrir sesión o cambiar de dispositivo no duplica monedas.
3. **XP, logros, estadísticas competitivas**: el servidor es la fuente de verdad para lo que cuenta en rankings; las estadísticas locales de invitado se quedan en el dispositivo para consulta.
4. **Rondas online interrumpidas**: el estado oculto vive en `game_sessions`; la operación `resume` devuelve la vista para continuar.

## Conflictos
- Peticiones repetidas por cortes de red: `requestId` → `processed_requests` devuelve la respuesta guardada sin repetir la jugada.
- Dos operaciones simultáneas sobre la misma ronda: control de versión (`game_sessions.version`) → `conflict`.
- Mesas de póker: versión optimista en `poker_tables.version`; al reconectar se recarga la fila completa (Realtime + refetch).

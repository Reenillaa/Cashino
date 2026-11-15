# 10 · Pruebas

Última ejecución: 15/11/2026, en el entorno de desarrollo (Linux, Node 22, Postgres 16, Deno 2.9).

| Suite | Comando | Resultado |
|---|---|---|
| TypeScript estricto | `npm run typecheck` | ✅ sin errores |
| Lint (incl. reglas del React Compiler) | `npm run lint` | ✅ 0 errores, 0 avisos |
| Configuración Expo | `npx expo-doctor` | ✅ 20/20 comprobaciones |
| Motor (reglas, probabilidades, EV, estados, protocolo, salas) | `npm run test:engine` | ✅ 100 pruebas |
| App (stores, sesión de juego y salas, i18n, tutorial UI) | `npm run test:app` | ✅ 14 pruebas |
| **Total Jest** | `npm test` | ✅ **114/114** (11 suites) |
| Esquema SQL (RLS, cartera, idempotencia, recompensas, social) | `./supabase/tests/run.sh` | ✅ `ALL SCHEMA TESTS PASSED` |
| Edge Functions | `deno check …` | ✅ type-check sin errores |
| Web export + recorrido en navegador | `npm run export:web` + Playwright | ✅ 14 juegos jugados, 0 errores de consola |

## Qué cubre el motor
- SHA-256/HMAC con vectores oficiales y contraste con Node `crypto`; RNG verificable determinista; χ² de uniformidad.
- Cada juego: reglas, pagos, RTP exacto o simulado, validación de parámetros, transiciones de estado y errores.
- Póker: categorías, desempates, botes secundarios, heads-up, subida mínima, all-in incompleto, ficha impar, conservación de fichas en 150 manos con bots, torneos completos, vista sin cartas ajenas, bots siempre legales en las 3 dificultades.
- Protocolo compartido cliente/servidor: stakes y pagos, parámetros inválidos, información oculta, reloj del servidor en Crash.
- Economía, progresión (niveles, topes diarios, misiones deterministas, temporadas) y rankings (Wilson, Elo, maestría).

## Qué cubre la app
- Cartera local (saldo no negativo, regalo diario, recargas, práctica separada).
- `useGameSession`: ronda con monedas de invitado y prueba verificable, práctica, ronda multi-paso persistida y cobrada.
- Tutorial interactivo: fuerza práctica, avanza solo con eventos reales del juego, cuestionario, guarda `dice_tutorial_completed`, se puede saltar y no reaparece.
- Diccionarios es/en: mismas claves y mismas variables de interpolación.

## Recorrido visual (Playwright, iPhone 390×844)
Se jugó una ronda de cada juego en la build web (oscuro, inglés) y se revisaron Inicio, Juegos, Ranking, Social, Perfil, Ajustes, Academy, lección, simuladores, login, reglas y modo claro en español.

## Pendiente / no ejecutado
- Pruebas en dispositivo iOS real (requiere build EAS con tu cuenta de Apple).
- E2E contra un proyecto Supabase real (registro, amigos, mesa online con 2 dispositivos, Realtime).
- Detox/Maestro E2E nativo y perfilado de FPS/batería en dispositivo.

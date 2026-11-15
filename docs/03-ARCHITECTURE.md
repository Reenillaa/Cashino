# 03 · Arquitectura técnica

## 1. Stack (versiones verificadas el 15/11/2026 con `npm view` y `npx expo install`)

| Capa | Tecnología | Versión |
|---|---|---|
| Runtime | Expo SDK | 58 (`expo ~58.0.25`) |
| UI | React Native / React | 0.88.1 / 19.3 |
| Navegación | Expo Router (tabs JS + stacks + modales) | ~58.0.31 |
| Animación | Reanimated 4 + Worklets / Gesture Handler | 4.7.1 / 0.13 / ~3.3 |
| Gráficos | react-native-svg (+ Reanimated animated props) | 15.16 |
| Materiales | expo-blur, expo-linear-gradient, expo-glass-effect | ~58 |
| Audio / hápticos | expo-audio, expo-haptics | ~58 |
| Estado | zustand 5 (persistencia en `localStorage` vía `expo-sqlite/localStorage`) | 5.1 |
| i18n | i18next + react-i18next + expo-localization | 27 / 18 |
| Backend | Supabase (Auth, Postgres, RLS, Realtime, Edge Functions en Deno) | supabase-js 2.119 |
| Tests | Jest 30 + jest-expo + Testing Library RN | 30.5 |
| Build | EAS Build / Submit | eas-cli ≥ 27 |

**Decisión sobre Skia**: no se usa en v1. Todas las escenas (cohete, Plinko, ruleta, dados) caben en SVG + Reanimated a 60 fps con pocas decenas de nodos, y así el mismo código funciona en web (lo que permite verificar la UI con Playwright en CI). Skia queda reservado para efectos de partículas masivas si el perfilado en dispositivo lo justifica.

**Decisión sobre la tab bar**: barra JS personalizada con material de cristal (en lugar de *native tabs*) para mantener la identidad Titanium idéntica en iOS 17–26 y en web.

## 2. Principio rector: un motor, tres consumidores

```
src/engine/  (TypeScript puro, sin React, sin RN, imports con extensión .ts)
   │
   ├── App (modo invitado/offline y modo práctica)  → RNG local criptográfico
   ├── Tests Jest (reglas, probabilidades, EV, estados)
   └── Supabase Edge Functions (modo online)        → RNG del servidor, resultado autoritativo
```

El motor se copia a `supabase/functions/_shared/engine` con `npm run sync:engine` antes de desplegar. Así **las reglas de la app y del servidor son exactamente el mismo código**.

## 3. Aleatoriedad y verificabilidad

- `src/engine/rng/sha256.ts`: SHA-256 + HMAC-SHA256 en TS puro (síncrono, idéntico en Hermes, web, Node y Deno).
- **Provably fair**: cada ronda deriva sus bytes de `HMAC_SHA256(serverSeed, clientSeed:nonce:cursor)`; 4 bytes → un float en [0,1) con 32 bits. Antes de jugar se muestra `SHA256(serverSeed)`; al rotar la semilla se revela y cualquiera puede recalcular el resultado (pantalla "Verificar" en cada juego).
- Offline: la `serverSeed` local se genera con `crypto.getRandomValues` (expo-crypto). Online: la genera y custodia el servidor (tabla con RLS sin acceso de cliente).
- Enteros sin sesgo: muestreo por rechazo (`randomInt`) y barajado Fisher–Yates.
- **El resultado se calcula antes de animar**: cada juego expone funciones puras `resolve(...)` y la UI recibe un objeto resultado que solo representa.

## 4. Estructura del repositorio

```
src/
  app/                    Rutas Expo Router (solo pantallas)
    (tabs)/               index (Inicio) · games · ranking · social · profile
    game/[id].tsx         Host de juego (carga el módulo del juego)
    academy/              Portada, juego, lección, simulador
    settings/             Ajustes estilo iOS
    auth/                 Inicio de sesión / registro
    online/               Lobby y mesa de póker online
  engine/                 Lógica pura (rng, cards, games/*, poker/*, economy, progression, ranking)
  games/<id>/             UI de cada juego: Screen, componentes, tutorial
  features/               academy · economy · progression · social · ranking · tutorial · sync · auth · online
  design/                 tokens, tema, componentes base (Glass, Button, Text, Sheet, TabBar…)
  i18n/                   es.ts · en.ts (diccionarios tipados) + init
  services/               supabase, audio, haptics, storage, notifications
  state/                  stores zustand persistidos
  config/                 brand.ts (nombre provisional, moneda), economy.ts
supabase/
  migrations/             Esquema, RLS, funciones transaccionales
  functions/              Edge Functions (play, poker, social, sync…)
scripts/                  sync-engine, generate-sounds, generate-icons, economy-sim
docs/                     Documentación numerada
brand/                    Propuestas de icono y fuentes del logotipo
```

## 5. Modelo de modos de juego

| Modo | Quién | Monedas | Resultado | Cuenta en ranking |
|---|---|---|---|---|
| **Práctica** | Todos | Fichas de práctica ilimitadas, sin valor | Local | No |
| **Invitado (offline)** | Sin cuenta | Saldo local del dispositivo | Local (RNG cripto) | No |
| **Cuenta (online)** | Con cuenta y conexión | Saldo del servidor | **Servidor** (Edge Function) | Sí |
| **Cuenta sin conexión** | Con cuenta, sin red | — | Práctica | No |

Esta separación es la que **impide duplicar monedas**: el saldo de la cuenta solo cambia en el servidor mediante funciones transaccionales; el saldo local de invitado se puede migrar **una sola vez** por cuenta y dispositivo, con tope (ver doc 06).

## 6. Backend (Supabase)

- **Auth**: email + contraseña (y *magic link*); Sign in with Apple preparado en configuración (requiere cuenta Apple Developer).
- **Postgres**: perfiles, cartera, libro mayor de movimientos (`coin_ledger`, idempotente por `idempotency_key`), rondas, sesiones de juego multi-paso (estado oculto), mesas de póker, asientos, cartas privadas, amigos, invitaciones, equipos, torneos, reacciones, actividad, logros, misiones, temporadas, puntuaciones.
- **RLS en todas las tablas**. Los clientes solo leen lo suyo o lo público; **ninguna tabla de saldo o estado oculto es escribible por clientes**. Las escrituras críticas pasan por funciones `SECURITY DEFINER` con `search_path` fijado, invocadas solo por el rol `service_role` desde Edge Functions.
- **Edge Functions** (Deno): validan JWT, cargan el motor compartido, resuelven con RNG del servidor y llaman a una única función SQL transaccional que debita, acredita y registra la ronda de forma atómica.
- **Realtime**: `postgres_changes` sobre el estado público de la mesa (versionado) y sobre las cartas privadas filtradas por RLS.

## 7. Seguridad (resumen; detalle en doc 07)

- Nunca se confía en el cliente: importes, turnos, acciones y resultados se validan en el servidor.
- Idempotencia en cada operación de monedas (`idempotency_key` único) → no hay dobles cobros ni dobles recompensas.
- Concurrencia optimista en mesas (`version`), bloqueo de fila (`FOR UPDATE`) en carteras.
- Límite de frecuencia en reacciones y acciones mediante disparadores.
- La clave `service_role` solo existe como secreto de las Edge Functions; la app usa la clave pública (*publishable*).

## 8. Estado en cliente

- `settings` (tema, idioma, sonido, música, hápticos, animaciones, reducir movimiento/efectos, notificaciones).
- `wallet` (saldo invitado, práctica), `progress` (XP, nivel, logros, misiones, racha de recompensa), `stats` (por juego), `history` (últimas rondas por juego), `tutorials` (`<juego>_tutorial_completed`), `academy` (lecciones, quizzes, insignias), `fairness` (semillas locales), `session` (cuenta).
- Persistencia síncrona en `localStorage` (polyfill de expo-sqlite en nativo) → la app arranca ya hidratada.

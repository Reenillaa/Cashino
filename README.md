# Cashino

Plataforma móvil premium de **14 juegos de casino y azar con moneda 100 % virtual** (sin valor monetario, sin compras, sin retiradas), con Academy educativa, multijugador online, rankings y progresión. React Native + Expo, prioridad iPhone.

> La moneda son **fichas** sin valor monetario. Nombre e identidad: `src/config/brand.ts` y `app.config.ts`.

![Recorrido: inicio → juego → sala → partida](docs/cashino-flow.gif)

## Jugar ya
**https://reenillaa.github.io/Cashino/** — en el iPhone ábrelo en Safari → Compartir → *Añadir a pantalla de inicio* y se abre a pantalla completa como una app (se publica sola en cada push a `main`).

## Qué incluye
- **14 juegos jugables**: Póker (Texas Hold'em NL vs bots y online), Blackjack, Cohete (crash), Dados, Minas, Plinko, Cruza la calle (estilo chicken-road), Ruleta europea, Limbo, Cara o cruz, Bacará, Mayor o menor, Keno y Sic Bo.
- Resultados **calculados antes de animar** y **verificables** (HMAC-SHA256, semillas servidor/cliente/nonce).
- **Tutorial interactivo** por juego (se hace en el juego real, en modo práctica) que se recuerda (`<juego>_tutorial_completed`).
- **Academy**: 42 lecciones ES/EN con cuestionarios, 8 simuladores, insignias y nivel de aprendizaje. Sin promesas de ganar.
- **Salas por juego** con carrusel animado: 🏠 Práctica (gratis), ☕️ El Bar 20–100, 🎩 El Club 200–1.000 y 💎 Sala VIP 2.000–10.000 (límites validados también en servidor).
- **Economía virtual** simulada: saldo inicial 1.000, regalo diario sin presión, recargas gratuitas, práctica ilimitada.
- **Progresión**: niveles, XP con topes diarios, logros, misiones diarias/semanales, temporadas de 56 días.
- **Online (Supabase)**: cuentas, amigos, bloqueos, equipos, salas privadas con código, Sit & Go, reacciones (sin chat), rankings que nunca usan el saldo.
- **Diseño estilo Offsuit**: negro puro, sin cajas ni bordes, tarjetas pastel con emoji grande por juego, números grandes en peso ligero, botones en píldora, control de apuesta − / + pensado para cualquiera, animaciones suaves al cambiar de pestaña y al entrar en cada juego, sonidos sintetizados “físicos” (fichas, cartas, marimba, monedas), hápticos y accesibilidad básica.

## Empezar
```bash
npm install
```
```bash
npx expo start
```
Sin variables de entorno la app funciona **entera en modo offline/invitado**. Para lo online, copia `.env.example` a `.env` y sigue `docs/09-IOS-INSTALL.md`.

Para ver la app en un iPhone necesitas un **development build** (usa módulos nativos que Expo Go no trae): ver `docs/09-IOS-INSTALL.md`.

## Scripts
| Script | Qué hace |
|---|---|
| `npm run typecheck` | TypeScript estricto |
| `npm test` | Jest: motor (100) + app (14) |
| `npm run test:engine` / `test:app` | Suites por separado |
| `./supabase/tests/run.sh` | Pruebas del esquema SQL en un Postgres local |
| `npm run sync:engine` | Copia el motor a las Edge Functions (antes de desplegar) |
| `npm run sim:economy` | Simulación de la economía |
| `npm run gen:sounds` / `gen:icons` | Regenera sonidos sintetizados / iconos desde `brand/` |
| `npm run export:web` | Build web (usada para verificación visual) |
| `npm run export:pages` | Build PWA para GitHub Pages bajo `/Cashino` |

## Estructura
```
src/app/          Rutas (Expo Router): pestañas, juego, academy, online, ajustes, auth
src/engine/       Motor puro TS (RNG verificable, 14 juegos, póker, bots, economía, rankings) + tests
src/games/        UI de cada juego + marco común (GameShell, apuesta, historial, reglas)
src/features/     academy, tutorial, play (sesiones), online, social, sync, economy, progression
src/design/       Tokens (colores, arte pastel por juego), tema, componentes
src/i18n/         es.ts / en.ts
src/state/        Stores persistidos (zustand)
src/services/     supabase, audio, hápticos, almacenamiento, aleatoriedad, notificaciones
supabase/         Migraciones (RLS), Edge Functions (game, rewards, account, poker), tests SQL
docs/             Documentación numerada + STATUS.md
brand/            Propuestas de icono y logotipo
```

## Documentación
1. [Investigación](docs/01-RESEARCH.md) · 2. [Dirección artística](docs/02-DESIGN-TITANIUM.md) · 3. [Arquitectura](docs/03-ARCHITECTURE.md) · 4. [Juegos y matemáticas](docs/04-GAMES-AND-MATH.md) · 5. [Offline y sincronización](docs/05-SYNC-OFFLINE.md) · 6. [Economía](docs/06-ECONOMY.md) · 7. [Seguridad](docs/07-SECURITY.md) · 8. [Rankings](docs/08-RANKINGS.md) · 9. [Instalar en iPhone](docs/09-IOS-INSTALL.md) · 10. [Pruebas](docs/10-TESTING.md) · [**Estado**](docs/STATUS.md)

## Aviso
Entretenimiento con moneda virtual. No hay dinero real, compras, retiradas ni premios con valor económico. Juega con moderación.

© Todos los derechos reservados. Software propietario.

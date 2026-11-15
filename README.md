# Titanium (nombre provisional)

Plataforma móvil premium de **14 juegos de casino y azar con moneda 100 % virtual** (sin valor monetario, sin compras, sin retiradas), con Academy educativa, multijugador online, rankings y progresión. React Native + Expo, prioridad iPhone.

> El nombre del producto y de la moneda (“Ti”) son provisionales: se cambian en `src/config/brand.ts` y `app.config.ts`.

## Qué incluye
- **14 juegos jugables**: Poker (Texas Hold'em NL vs bots y online), Blackjack, Crash, Dice, Mines, Plinko, Cruce (estilo chicken-road), Ruleta europea, Limbo, Coinflip, Baccarat, Hi-Lo, Keno y Sic Bo.
- Resultados **calculados antes de animar** y **verificables** (HMAC-SHA256, semillas servidor/cliente/nonce).
- **Tutorial interactivo** por juego (se hace en el juego real, en modo práctica) que se recuerda (`<juego>_tutorial_completed`).
- **Academy**: 42 lecciones ES/EN con cuestionarios, 8 simuladores, insignias y nivel de aprendizaje. Sin promesas de ganar.
- **Economía virtual** simulada: saldo inicial 10.000, regalo diario sin presión, recargas gratuitas, práctica ilimitada.
- **Progresión**: niveles, XP con topes diarios, logros, misiones diarias/semanales, temporadas de 56 días.
- **Online (Supabase)**: cuentas, amigos, bloqueos, equipos, salas privadas con código, Sit & Go, reacciones (sin chat), rankings que nunca usan el saldo.
- **Diseño Titanium**: obsidiana/grafito/plata/marfil, cristal solo en la capa de control, acentos “anodizados” por juego, modo oscuro y claro, sonido sintetizado propio, hápticos, accesibilidad básica.

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
| `npm test` | Jest: motor (98) + app (13) |
| `npm run test:engine` / `test:app` | Suites por separado |
| `./supabase/tests/run.sh` | Pruebas del esquema SQL en un Postgres local |
| `npm run sync:engine` | Copia el motor a las Edge Functions (antes de desplegar) |
| `npm run sim:economy` | Simulación de la economía |
| `npm run gen:sounds` / `gen:icons` | Regenera sonidos sintetizados / iconos desde `brand/` |
| `npm run export:web` | Build web (usada para verificación visual) |

## Estructura
```
src/app/          Rutas (Expo Router): pestañas, juego, academy, online, ajustes, auth
src/engine/       Motor puro TS (RNG verificable, 14 juegos, póker, bots, economía, rankings) + tests
src/games/        UI de cada juego + marco común (GameShell, apuesta, historial, reglas)
src/features/     academy, tutorial, play (sesiones), online, social, sync, economy, progression
src/design/       Tokens Titanium, tema, componentes
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

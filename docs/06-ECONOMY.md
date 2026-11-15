# 06 · Economía virtual

**Moneda**: identificador `coins`, nombre provisional **Ti**. Sin valor monetario: no se compra, vende, transfiere, retira ni canjea. No hay compras integradas ni anuncios.

## Valores (en `src/engine/meta/economy.ts`, replicados en el servidor)
| Parámetro | Valor |
|---|---|
| Saldo inicial | **1.000 Ti** |
| Regalo diario (racha 1→7) | 100 · 120 · 140 · 160 · 180 · 200 · 300 |
| Racha | Saltarte k días resta k días de racha (nunca se reinicia de golpe) — sin presión |
| Recuperación de saldo | Si el saldo < 20 (mínimo de la sala más barata): recarga hasta 300, hasta 3 veces al día |
| Fichas de práctica | 1.000, reiniciables cuando quieras |
| Misiones | 25–40 Ti (diarias), 150–250 Ti (semanales) |
| Bonus de nivel | 25 × nivel (local) |
| Migración de invitado | Una vez, máx. 5.000 |

## Salas (`src/engine/meta/rooms.ts`)
Cada partida se juega en una sala que fija la apuesta mínima y máxima de la ronda (en juegos de mesa, la apuesta total). El protocolo compartido lo valida igual en el móvil y en el servidor (`stake_outside_room`).

| Sala | Apuesta | Fichas de mesa | Póker (ciegas · entrada) | Acceso |
|---|---|---|---|---|
| Práctica | 10–500 (fichas sin valor) | 10 · 25 · 50 · 100 | 5/10 · práctica | Siempre |
| Inicial | **20–100** | 5 · 10 · 20 · 50 | 1/2 · 20–100 | Saldo ≥ 20 |
| Media | **200–1.000** | 50 · 100 · 200 · 500 | 10/20 · 200–1.000 | Saldo ≥ 200 |
| Alta | 2.000–10.000 | 500 · 1.000 · 2.000 · 5.000 | 100/200 · 2.000–10.000 | Saldo ≥ 2.000 |

Sit & Go: la entrada es el mínimo de la sala y cada jugador recibe 1.500 fichas de torneo; premios 65 % / 35 % del bote de entradas.

## Simulación (`node scripts/economy-sim.mjs`)
Mezcla realista de juegos con el motor real (Dice 50 %, Crash 2×, Plinko medio, Ruleta rojo, Mines 3×4, Crash 10×), 30 días, 400 jugadores por perfil, apuestas dentro de las salas:

| Inicio | Jugador | Quiebra día 1 | Quiebra semana 1 | Días con recarga | Mediana día 30 |
|---|---|---|---|---|---|
| 500 | habitual (3 % del saldo) | 7,2 % | 32,8 % | 2,2 % | 2.249 |
| **1.000** | casual (60 rondas × 20) | 0 % | 0 % | 0 % | 8.498 |
| **1.000** | habitual (3 %) | 0,3 % | 14,5 % | 1,0 % | 2.352 |
| **1.000** | alto (10 %) | 30,8 % | 96,8 % | 43,4 % | 358 |
| **1.000** | arriesgado (30 %) | 73,0 % | 99,0 % | 71,3 % | 498 |
| 2.500 | habitual (3 %) | 0 % | 2,8 % | 0,3 % | 2.474 |

**Conclusiones**
- Con **1.000** (decisión del producto) el jugador casual y el habitual tienen margen de sobra en la sala Inicial; los regalos (10–30 % del saldo inicial) se notan.
- Quien apuesta fuerte se queda sin saldo antes, pero nunca bloqueado: recarga gratis 3 veces al día y práctica ilimitada.
- La sala Media (200–1.000) se abre desde el primer día y la Alta (2.000+) es una meta a medio plazo.
- **El saldo nunca puntúa en rankings.**

## Diseño anti-compulsivo
- XP por rondas con tope diario (1.200 XP) y puntos de temporada por rondas con tope (200/día). Lecciones, logros y misiones también dan progreso.
- Sin temporizadores agresivos, sin cofres aleatorios, sin ruletas de premio, sin “ofertas que caducan”. Las monedas no caducan.
- Recordatorio de descanso opcional (ajustes) y mensaje de juego responsable.

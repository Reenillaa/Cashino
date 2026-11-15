# 06 · Economía virtual

**Moneda**: identificador `coins`, nombre provisional **Ti**. Sin valor monetario: no se compra, vende, transfiere, retira ni canjea. No hay compras integradas ni anuncios.

## Valores (en `src/engine/meta/economy.ts`, replicados en el servidor)
| Parámetro | Valor |
|---|---|
| Saldo inicial | **10.000 Ti** |
| Regalo diario (racha 1→7) | 500 · 600 · 700 · 800 · 900 · 1.000 · 1.500 |
| Racha | Saltarte k días resta k días de racha (nunca se reinicia de golpe) — sin presión |
| Recuperación de saldo | Si el saldo < 100: recarga hasta 2.000, hasta 3 veces al día |
| Fichas de práctica | 10.000, reiniciables cuando quieras |
| Bonus de nivel | 250 × nivel (local) |
| Migración de invitado | Una vez, máx. 50.000 |

## Simulación (`node scripts/economy-sim.mjs`)
Mezcla realista de juegos con el motor real (Dice 50 %, Crash 2×, Plinko medio, Ruleta rojo, Mines 3×4, Crash 10×), 30 días, 400 jugadores por perfil:

| Inicio | Jugador | Quiebra día 1 | Quiebra semana 1 | Días con recarga | Mediana día 30 |
|---|---|---|---|---|---|
| 2.000 | casual (60 rondas × 10) | 0 % | 0 % | 0 % | 42.090 |
| 2.000 | arriesgado (20 % del saldo) | 74,5 % | 100 % | 73 % | 388 |
| 5.000 | arriesgado | 62,0 % | 100 % | 73,1 % | 406 |
| **10.000** | casual | 0 % | 0 % | 0 % | 50.100 |
| **10.000** | habitual (1 %) | 0 % | 0 % | 0 % | 31.729 |
| **10.000** | alto (5 %) | 0 % | 0,3 % | 0 % | 2.634 |
| **10.000** | arriesgado (20 %) | 55,0 % | 100 % | 71,9 % | 425 |
| 25.000 | arriesgado | 40,3 % | 100 % | 70,9 % | 310 |

**Conclusiones**
- El saldo inicial apenas cambia el largo plazo; afecta sobre todo al primer día del jugador arriesgado.
- **10.000** da 100+ apuestas medianas sin preocupación y mantiene el regalo diario significativo (5–15 % del inicial). Con 25.000 el regalo pasa a ser irrelevante (2–6 %).
- Nadie queda bloqueado: el jugador que se arruina recupera saldo gratis y siempre tiene la práctica.
- El juego casual acumula saldo (inflación). Como **el saldo nunca puntúa en rankings**, no distorsiona la competición. Pendiente para una versión futura: sumideros cosméticos (tienda de dorsos/mesas con Ti).

## Diseño anti-compulsivo
- XP por rondas con tope diario (1.200 XP) y puntos de temporada por rondas con tope (200/día). Lecciones, logros y misiones también dan progreso.
- Sin temporizadores agresivos, sin cofres aleatorios, sin ruletas de premio, sin “ofertas que caducan”. Las monedas no caducan.
- Recordatorio de descanso opcional (ajustes) y mensaje de juego responsable.

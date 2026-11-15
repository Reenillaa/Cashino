# 04 · Juegos, reglas y matemáticas

Todos los resultados se calculan **antes** de cualquier animación con el motor puro de `src/engine` y una fuente aleatoria verificable (doc 07). Las cifras de esta tabla están verificadas por pruebas automáticas (`src/engine/__tests__`).

| Juego | Formato / reglas clave | Fórmula | RTP | Pruebas |
|---|---|---|---|---|
| **Poker** | Texas Hold'em No-Limit, 2–6 jugadores. Cash y Sit & Go (ciegas cada 6 manos offline / 8 online, niveles en `DEFAULT_SNG_LEVELS`) | Evaluador 5–7 cartas con desempates; side pots; subida mínima = última subida completa; all-in incompleto no reabre; ficha impar a la izquierda del botón | Sin ventaja de la casa (P2P) | Categorías, desempates (incl. trío+trío+pareja), side pots, heads-up, min-raise, conservación de fichas en 150 manos, torneos |
| **Blackjack** | 6 barajas barajadas cada ronda, S17, BJ 3:2, peek, doblar 2 cartas y tras dividir, dividir hasta 4, ases 1 carta, sin seguro ni rendición | Estrategia básica 6D/S17/DAS en `BJ.basicStrategy` | ≈ 99,5 % con estrategia básica | Naturales, peek, S17, dobles, splits, acciones ilegales, RTP simulado 30.000 manos |
| **Crash** | Multiplicador `e^(0,07·t)`; retiro manual o automático | `max(1, ⌊100·0,99/(1−u)⌋/100)`; P(≥x)=0,99/x | 99 % | Distribución 200.000 rondas, curva/inversa, reloj del servidor |
| **Dice** | 0,00–99,99 (10.000 resultados); “menor que T” / “mayor o igual que T”; prob. 1–98 % | mult = ⌊0,99/p⌋₄ | 99 % | RTP exacto para todo objetivo, 100.000 tiradas |
| **Mines** | 5×5, 1–24 minas | mult(k) = 0,99·C(25,k)/C(25−m,k) | 99 % | EV para todo (m,k), uniformidad de minas, auto-cobro |
| **Plinko** | 8–16 filas, riesgo bajo/medio/alto | Binomial C(n,i)/2ⁿ; tablas propias | 98,6–99,0 % | RTP exacto de las 27 tablas, simetría, χ² |
| **Cruce** (estilo “chicken road”) | Carriles con p = 4/10/18/30 % | mult(k) = 0,99/(1−p)^k | 99 % | EV por carril, frecuencia empírica |
| **Ruleta** | Europea, 37 casillas, todas las apuestas (pleno…sencillas) | Pagos estándar | 97,30 % | 36/37 en 14 tipos de apuesta, geometría, uniformidad |
| **Limbo** | Objetivo 1,01×–1.000.000× | P = 0,99/objetivo | 99 % | RTP simulado, validación |
| **Coinflip** | Racha cara/cruz con retiro | mult(k) = 0,99·2^k | 99 % | Máquina de estados, equidad 50 % |
| **Baccarat** | Punto Banco, 8 barajas, tabla de tercera carta estándar | Banca 0,95:1, Empate 8:1, Parejas 11:1 | Banca 98,94 % | Tabla de la Banca, naturales, comisión, frecuencias 45,86/44,62/9,52 % |
| **Hi-Lo** | Baraja infinita, As bajo; “≥/≤”, “>” con As, “<” con K, “=” | mult = 0,99·Π(1/p) | 99 % | EV de un paso para las 13 cartas, saltos |
| **Keno** | 40 números, 10 sorteados, 1–10 elegidos, 3 riesgos | Hipergeométrica | 98,5–99,3 % | RTP exacto de las 30 tablas |
| **Sic Bo** | 3 dados; pequeño/grande/par/impar (pierden con trío), sumas, números, dobles, tríos, combinaciones | Pagos Macao/AC | 97,2 % (Pequeño/Grande) | EV exacto enumerando 216 resultados |

### Notas de diseño
- **Redondeo**: los multiplicadores se truncan hacia abajo (4 decimales en juegos multi-paso, 2 en Crash/Limbo); los pagos en monedas enteras también se truncan. Nunca se infla un pago.
- **Ventaja de la casa aplicada una sola vez** en juegos multi-paso (Mines, Hi-Lo, Coinflip, Cruce): el EV es 0,99 en cualquier punto de retirada.
- **Tablas de Plinko y Keno** diseñadas con `scripts/design-paytables.mjs` (forma geométrica + ajuste numérico) — no copian tablas de terceros.
- **Cruce** reproduce la mecánica genérica de “cruzar carriles”, con nombre, personaje y arte originales: *Chicken Road* es una marca de un tercero y no se usa.
- **Poker**: los bots solo ven sus cartas, el tablero y la acción pública (`botDecide` recibe el estado completo, pero solo lee `me.hole`, `board`, `log`, `bets` — revisado; en el servidor las cartas privadas viven en `poker_private`). Estilos: Roca, Tiburón, Maníaco, Caller; dificultades fácil (heurística + ruido), media (Monte Carlo 180), avanzada (Monte Carlo 420 + rangos ajustados por agresión). Siempre etiquetados como BOT.

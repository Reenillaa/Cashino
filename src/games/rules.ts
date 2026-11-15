import type { GameId } from '@/engine/games/types.ts';

type Bi = { es: string; en: string };
export interface RulesDoc {
  summary: Bi;
  rules: Bi[];
  odds: { label: Bi; value: string }[];
}
const b = (es: string, en: string): Bi => ({ es, en });

/** Rules shown in-game (Reglas). Probabilities match the engine and are verified by tests. */
export const RULES: Record<GameId, RulesDoc> = {
  poker: {
    summary: b('Texas Hold’em sin límite, mesas de 2 a 6 jugadores. Formatos: mesa cash y Sit & Go con ciegas crecientes.', 'No-Limit Texas Hold’em, 2–6 player tables. Formats: cash table and Sit & Go with rising blinds.'),
    rules: [
      b('Cada jugador recibe 2 cartas. Se juegan 4 rondas: preflop, flop (3 cartas), turn (1) y river (1).', 'Each player gets 2 cards. Four rounds: preflop, flop (3 cards), turn (1) and river (1).'),
      b('Ciegas: la pequeña y la grande se sitúan a la izquierda del botón. En heads-up el botón pone la ciega pequeña y habla primero antes del flop.', 'Blinds sit left of the button. Heads-up, the button posts the small blind and acts first preflop.'),
      b('Subida mínima = tamaño de la última subida completa. Un all-in inferior a una subida completa no reabre las apuestas.', 'Min raise = size of the last full raise. An all-in below a full raise does not reopen betting.'),
      b('Botes secundarios con varios all-in. Empates se reparten; la ficha sobrante va al primer ganador a la izquierda del botón.', 'Side pots with multiple all-ins. Ties split; the odd chip goes to the first winner left of the button.'),
      b('Ranking: escalera de color > póker > full > color > escalera > trío > doble pareja > pareja > carta alta.', 'Ranking: straight flush > four of a kind > full house > flush > straight > trips > two pair > pair > high card.'),
      b('Los bots están siempre identificados como BOT y solo ven lo que vería un jugador en su asiento.', 'Bots are always labelled BOT and only see what a player in their seat would see.'),
    ],
    odds: [
      { label: b('Parejas servidas', 'Pocket pair'), value: '5.9 %' },
      { label: b('Color si ligas proyecto en el flop (al river)', 'Flush draw on flop → by river'), value: '35 %' },
      { label: b('AA vs mano aleatoria', 'AA vs random hand'), value: '85 %' },
    ],
  },
  blackjack: {
    summary: b('6 barajas barajadas cada ronda. La banca se planta con 17 blando. Blackjack paga 3:2.', '6 decks shuffled every round. Dealer stands on soft 17. Blackjack pays 3:2.'),
    rules: [
      b('Cartas: 2–10 su valor, figuras 10, As 1 u 11.', 'Cards: 2–10 face value, faces 10, Ace 1 or 11.'),
      b('Doblar con las dos primeras cartas (también tras dividir). Dividir parejas hasta 4 manos. Ases divididos reciben una sola carta.', 'Double on the first two cards (also after splitting). Split pairs up to 4 hands. Split aces get one card each.'),
      b('La banca revisa si tiene blackjack con As o 10 visible: si lo tiene, solo pierdes la apuesta inicial.', 'Dealer peeks with an Ace or 10 up: if it has blackjack you only lose your original bet.'),
      b('Sin seguro ni rendición.', 'No insurance, no surrender.'),
    ],
    odds: [
      { label: b('Ventaja de la casa (estrategia básica)', 'House edge (basic strategy)'), value: '≈0.5 %' },
      { label: b('Blackjack natural', 'Natural blackjack'), value: '4.75 %' },
      { label: b('Banca se pasa', 'Dealer busts'), value: '≈28 %' },
    ],
  },
  crash: {
    summary: b('El multiplicador crece hasta un punto de explosión aleatorio, decidido antes de despegar.', 'The multiplier grows until a random crash point decided before take-off.'),
    rules: [
      b('Retira en cualquier momento para cobrar apuesta × multiplicador. Si explota antes, pierdes.', 'Cash out any time to collect bet × multiplier. If it crashes first, you lose.'),
      b('Retiro automático: fija un objetivo y se cobra solo si se alcanza.', 'Auto cash-out: set a target and it cashes out by itself if reached.'),
      b('Punto de explosión = 0,99 / (1 − u), con u uniforme en [0,1). P(llegar a x) = 0,99 / x.', 'Crash point = 0.99 / (1 − u), u uniform in [0,1). P(reaching x) = 0.99 / x.'),
      b('Online, el reloj del servidor decide si llegaste a tiempo.', 'Online, the server clock decides whether you made it in time.'),
    ],
    odds: [
      { label: b('Llegar a 1,5×', 'Reach 1.5×'), value: '66 %' },
      { label: b('Llegar a 2×', 'Reach 2×'), value: '49.5 %' },
      { label: b('Llegar a 10×', 'Reach 10×'), value: '9.9 %' },
      { label: b('Explotar en 1,00×', 'Crash at 1.00×'), value: '≈2 %' },
    ],
  },
  dice: {
    summary: b('Se genera un número de 0,00 a 99,99. Elige mayor o menor que un objetivo.', 'A number from 0.00 to 99.99 is generated. Choose over or under a target.'),
    rules: [
      b('“Menor que T” gana si el resultado < T. “Mayor que T” gana si el resultado ≥ T.', '“Under T” wins if the result < T. “Over T” wins if the result ≥ T.'),
      b('Multiplicador = 0,99 / probabilidad. Probabilidad entre 1 % y 98 %.', 'Multiplier = 0.99 / chance. Chance between 1 % and 98 %.'),
    ],
    odds: [{ label: b('RTP en cualquier objetivo', 'RTP at any target'), value: '99 %' }],
  },
  mines: {
    summary: b('Tablero 5×5 con 1–24 minas. Destapa gemas para subir el multiplicador.', '5×5 board with 1–24 mines. Reveal gems to raise the multiplier.'),
    rules: [
      b('Multiplicador tras k gemas = 0,99 × C(25,k) / C(25−m,k).', 'Multiplier after k gems = 0.99 × C(25,k) / C(25−m,k).'),
      b('Puedes retirar tras cualquier gema. Si destapas todas las gemas, se cobra automáticamente.', 'Cash out after any gem. Revealing every gem cashes out automatically.'),
      b('Las minas se colocan al empezar la ronda y no se mueven.', 'Mines are placed when the round starts and never move.'),
    ],
    odds: [
      { label: b('3 minas: primera casilla segura', '3 mines: first tile safe'), value: '88 %' },
      { label: b('3 minas: 5 seguidas', '3 mines: 5 in a row'), value: '49.6 %' },
    ],
  },
  plinko: {
    summary: b('La bola cae por 8–16 filas; en cada fila va a izquierda o derecha al 50 %.', 'The ball falls through 8–16 rows, going left or right 50/50 at each row.'),
    rules: [
      b('La casilla final es el número de rebotes a la derecha: distribución binomial.', 'The final bin is the number of right bounces: binomial distribution.'),
      b('El riesgo cambia la tabla de pagos (no las probabilidades).', 'Risk changes the pay table (not the probabilities).'),
    ],
    odds: [
      { label: b('8 filas: casilla central', '8 rows: centre bin'), value: '27.3 %' },
      { label: b('16 filas: un extremo', '16 rows: one edge'), value: '0.0015 %' },
      { label: b('RTP de las tablas', 'Table RTP'), value: '98.6–99.0 %' },
    ],
  },
  crossing: {
    summary: b('Avanza carril a carril. Cada carril tiene una probabilidad fija de accidente.', 'Advance lane by lane. Each lane has a fixed chance of getting hit.'),
    rules: [
      b('Fácil 4 % · Media 10 % · Difícil 18 % · Extrema 30 % por carril.', 'Easy 4 % · Medium 10 % · Hard 18 % · Extreme 30 % per lane.'),
      b('Multiplicador tras k carriles = 0,99 / (1 − p)^k. Retira cuando quieras.', 'Multiplier after k lanes = 0.99 / (1 − p)^k. Cash out whenever you want.'),
    ],
    odds: [{ label: b('Media: cruzar 5 carriles', 'Medium: cross 5 lanes'), value: '59 %' }],
  },
  roulette: {
    summary: b('Ruleta europea de un solo cero (37 casillas).', 'Single-zero European roulette (37 pockets).'),
    rules: [
      b('Pleno 35:1 · Caballo 17:1 · Calle 11:1 · Cuadro 8:1 · Seisena 5:1 · Docena/Columna 2:1 · Sencillas 1:1.', 'Straight 35:1 · Split 17:1 · Street 11:1 · Corner 8:1 · Line 5:1 · Dozen/Column 2:1 · Even-money 1:1.'),
      b('El 0 hace perder todas las apuestas sencillas.', 'Zero loses all even-money bets.'),
    ],
    odds: [
      { label: b('Ventaja en cualquier apuesta', 'Edge on any bet'), value: '2.70 %' },
      { label: b('Rojo', 'Red'), value: '48.6 %' },
    ],
  },
  limbo: {
    summary: b('Elige un multiplicador objetivo. Ganas si el resultado lo alcanza.', 'Pick a target multiplier. You win if the result reaches it.'),
    rules: [b('Probabilidad = 0,99 / objetivo. Objetivo entre 1,01× y 1.000.000×.', 'Chance = 0.99 / target. Target between 1.01× and 1,000,000×.')],
    odds: [
      { label: b('Objetivo 2×', 'Target 2×'), value: '49.5 %' },
      { label: b('Objetivo 100×', 'Target 100×'), value: '0.99 %' },
    ],
  },
  coinflip: {
    summary: b('Cara o cruz. Cada acierto dobla el multiplicador; retira cuando quieras.', 'Heads or tails. Each correct call doubles the multiplier; cash out any time.'),
    rules: [b('Multiplicador tras k aciertos = 0,99 × 2^k.', 'Multiplier after k correct calls = 0.99 × 2^k.')],
    odds: [{ label: b('Acertar 5 seguidas', '5 in a row'), value: '3.1 %' }],
  },
  baccarat: {
    summary: b('Punto Banco con 8 barajas. Las terceras cartas siguen el reglamento estándar.', 'Punto Banco with 8 decks. Third cards follow the standard tableau.'),
    rules: [
      b('Valores: As 1, 2–9 su valor, 10 y figuras 0. Solo cuenta la última cifra.', 'Values: Ace 1, 2–9 face, 10 and faces 0. Only the last digit counts.'),
      b('Jugador 1:1 · Banca 0,95:1 (5 % comisión) · Empate 8:1 · Parejas 11:1. Con empate, Jugador y Banca se devuelven.', 'Player 1:1 · Banker 0.95:1 (5 % commission) · Tie 8:1 · Pairs 11:1. On a tie, Player and Banker push.'),
    ],
    odds: [
      { label: b('Gana Banca', 'Banker wins'), value: '45.9 %' },
      { label: b('Gana Jugador', 'Player wins'), value: '44.6 %' },
      { label: b('Empate', 'Tie'), value: '9.5 %' },
      { label: b('Ventaja Banca / Jugador / Empate', 'Edge Banker / Player / Tie'), value: '1.06 / 1.24 / 14.4 %' },
    ],
  },
  hilo: {
    summary: b('Baraja infinita: cada carta es independiente. As bajo, K alta.', 'Infinite deck: every card is independent. Ace low, King high.'),
    rules: [
      b('Con 2–Q: “más alta o igual” / “más baja o igual”. Con As: “más alta” o “igual”. Con K: “más baja” o “igual”.', 'With 2–Q: “higher or same” / “lower or same”. With Ace: “higher” or “same”. With King: “lower” or “same”.'),
      b('Multiplicador = 0,99 × producto de 1/p de cada acierto. Puedes saltar cartas sin coste.', 'Multiplier = 0.99 × product of 1/p of each correct call. You may skip cards for free.'),
    ],
    odds: [{ label: b('Con un 7: más alta o igual', 'On a 7: higher or same'), value: '53.8 %' }],
  },
  keno: {
    summary: b('40 números, se sortean 10. Elige de 1 a 10.', '40 numbers, 10 are drawn. Pick 1 to 10.'),
    rules: [b('El pago depende de cuántos aciertas y del riesgo elegido. Probabilidades hipergeométricas.', 'Payout depends on hits and chosen risk. Hypergeometric probabilities.')],
    odds: [
      { label: b('1 número: acertar', '1 pick: hit'), value: '25 %' },
      { label: b('10 números: acertar los 10', '10 picks: all 10'), value: '1 / 847,660,528' },
      { label: b('RTP de las tablas', 'Table RTP'), value: '98.5–99.3 %' },
    ],
  },
  sicbo: {
    summary: b('Se lanzan tres dados. Muchas apuestas posibles con pagos fijos.', 'Three dice are rolled. Many bets with fixed payouts.'),
    rules: [
      b('Pequeño (4–10) / Grande (11–17) / Par / Impar 1:1 — pierden con trío.', 'Small (4–10) / Big (11–17) / Odd / Even 1:1 — lose on triples.'),
      b('Suma 4/17 60:1 · 5/16 30:1 · 6/15 17:1 · 7/14 12:1 · 8/13 8:1 · 9–12 6:1.', 'Total 4/17 60:1 · 5/16 30:1 · 6/15 17:1 · 7/14 12:1 · 8/13 8:1 · 9–12 6:1.'),
      b('Número: 1:1 / 2:1 / 3:1 · Doble 10:1 · Trío concreto 180:1 · Cualquier trío 30:1 · Combinación 5:1.', 'Single: 1:1 / 2:1 / 3:1 · Double 10:1 · Specific triple 180:1 · Any triple 30:1 · Combo 5:1.'),
    ],
    odds: [
      { label: b('Ventaja Pequeño/Grande', 'Edge Small/Big'), value: '2.78 %' },
      { label: b('Ventaja trío concreto', 'Edge specific triple'), value: '16.2 %' },
    ],
  },
};

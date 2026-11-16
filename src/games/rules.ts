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
  slots: {
    summary: b('Tragaperras clásica de 3 rodillos y 1 línea. Tira y mira qué sale en la línea del centro.', 'Classic 3-reel, 1-line slot machine. Spin and see what lands on the middle line.'),
    rules: [
      b('Tres iguales: 💎 ×500 · 7 ×80 · BAR ×20 · 🍒 ×10 · 🔔 ×9 · 🍋 ×5.', 'Three of a kind: 💎 ×500 · 7 ×80 · BAR ×20 · 🍒 ×10 · 🔔 ×9 · 🍋 ×5.'),
      b('Dos cerezas en cualquier sitio ×2; una cereza te devuelve la apuesta.', 'Two cherries anywhere ×2; one cherry gives your bet back.'),
      b('Cada rodillo es independiente y el resultado se decide antes de que giren.', 'Each reel is independent and the result is decided before they spin.'),
    ],
    odds: [
      { label: b('Alguna ganancia (incluye recuperar la apuesta)', 'Any return (incl. getting your bet back)'), value: '46.7 %' },
      { label: b('Tres diamantes', 'Three diamonds'), value: '0.007 %' },
    ],
  },
  trader: {
    summary: b('Bolsa: ¿el precio acabará más alto o más bajo que ahora? Eliges Sube o Baja y miras la gráfica.', 'Stock market: will the price end higher or lower than now? Pick Up or Down and watch the chart.'),
    rules: [
      b('El precio se mueve al azar durante unos segundos, igual de probable hacia arriba que hacia abajo.', 'The price moves at random for a few seconds, as likely up as down.'),
      b('Si aciertas el sentido final cobras ×1,98 tu apuesta.', 'Call the final direction right and you get ×1.98 your bet.'),
      b('No hay forma de adivinar el movimiento: cada recorrido se decide antes de mostrarse.', 'There is no way to predict the move: each path is decided before it is shown.'),
    ],
    odds: [
      { label: b('Probabilidad de acertar', 'Chance to be right'), value: '50 %' },
      { label: b('Pago', 'Payout'), value: '×1.98' },
    ],
  },
  videopoker: {
    summary: b('Video Póker «Jacks or Better», la máquina clásica de Las Vegas. Te dan 5 cartas, guardas las que quieras, cambias el resto y cobras según la jugada final.', 'Video Poker “Jacks or Better”, the classic Las Vegas machine. You get 5 cards, hold the ones you like, swap the rest and get paid for the final hand.'),
    rules: [
      b('Toca las cartas que quieres guardar (salen marcadas «GUARDADA») y pulsa Cambiar.', 'Tap the cards you want to keep (they show “HELD”) and tap Draw.'),
      b('Pagos por cada ficha: Escalera real ×800 · Escalera de color ×50 · Póker ×25 · Full ×9 · Color ×6 · Escalera ×4 · Trío ×3 · Doble pareja ×2 · Pareja de J o más ×1 (recuperas la apuesta).', 'Pays per chip: Royal flush ×800 · Straight flush ×50 · Four of a kind ×25 · Full house ×9 · Flush ×6 · Straight ×4 · Three of a kind ×3 · Two pair ×2 · Jacks or better ×1 (bet back).'),
      b('Las cartas nuevas salen de la misma baraja de 52, ya barajada antes de repartir.', 'New cards come from the same 52-card deck, shuffled before the deal.'),
    ],
    odds: [
      { label: b('Retorno con juego perfecto (dato publicado de la tabla 9/6)', 'Return with perfect play (published figure for the 9/6 table)'), value: '99.54 %' },
      { label: b('Manos con premio (simulado con la pista)', 'Hands that pay (simulated with the hint)'), value: '45.5 %' },
      { label: b('Escalera real', 'Royal flush'), value: '1 / 40 000' },
    ],
  },
  wheel: {
    summary: b('Rueda de la fortuna: eliges el riesgo, la rueda gira y paga lo que marque la flecha.', 'Fortune wheel: pick the risk, the wheel spins and pays what the arrow points at.'),
    rules: [
      b('30 casillas iguales; la rueda para en una al azar, decidida antes de girar.', '30 equal segments; the wheel stops on one at random, decided before it spins.'),
      b('Riesgo bajo: muchas casillas pagan poco (×1,2 a ×2,4). Medio: hasta ×4,7. Alto: una sola casilla paga ×29,7.', 'Low risk: many segments pay a little (×1.2 to ×2.4). Medium: up to ×4.7. High: one single segment pays ×29.7.'),
      b('Los tres riesgos devuelven lo mismo de media: el 99 %.', 'All three risks return the same on average: 99 %.'),
    ],
    odds: [
      { label: b('Ganar algo (bajo / medio / alto)', 'Win something (low / medium / high)'), value: '70 % / 47 % / 3.3 %' },
      { label: b('Retorno', 'Return'), value: '99 %' },
    ],
  },
  towers: {
    summary: b('Torre del Dragón: sube pisos eligiendo una puerta en cada uno. Detrás de algunas hay huevos de dragón. Retírate cuando quieras.', 'Dragon Tower: climb floors by picking a door on each. Some hide dragon eggs. Cash out whenever you like.'),
    rules: [
      b('Fácil: 4 puertas, 1 huevo. Medio: 3 y 1. Difícil: 2 y 1. Experto: 3 puertas y 2 huevos.', 'Easy: 4 doors, 1 egg. Medium: 3 and 1. Hard: 2 and 1. Expert: 3 doors and 2 eggs.'),
      b('Cada piso superado multiplica tu premio; si abres un huevo, pierdes la apuesta.', 'Each floor cleared grows your prize; open an egg and you lose the bet.'),
      b('Dónde están los huevos se decide al empezar. Son 8 pisos; al llegar arriba cobras solo.', 'Where the eggs are is decided at the start. There are 8 floors; reach the top and you get paid automatically.'),
    ],
    odds: [
      { label: b('Superar un piso (fácil / medio / difícil / experto)', 'Clear a floor (easy / medium / hard / expert)'), value: '75 / 67 / 50 / 33 %' },
      { label: b('Retorno', 'Return'), value: '99 %' },
    ],
  },
  diamonds: {
    summary: b('Diamantes: salen 5 gemas de 7 colores. Cuantas más del mismo color, más cobras, como en el póker.', 'Diamonds: 5 gems of 7 colours come out. The more of one colour, the more you win, like poker.'),
    rules: [
      b('Cinco iguales ×67 · Cuatro ×5 · Full (3+2) ×4 · Trío ×3 · Doble pareja ×2 · Pareja ×0,1.', 'Five alike ×67 · Four ×5 · Full (3+2) ×4 · Three ×3 · Two pair ×2 · Pair ×0.1.'),
      b('Cada gema es independiente y sale al azar entre los 7 colores.', 'Each gem is independent and random among 7 colours.'),
    ],
    odds: [
      { label: b('Cinco iguales', 'Five alike'), value: '1 / 2 401' },
      { label: b('Pareja (la más común)', 'Pair (the most common)'), value: '50 %' },
      { label: b('Retorno exacto', 'Exact return'), value: '99.0 %' },
    ],
  },
  pump: {
    summary: b('Globo: infla el globo bombeo a bombeo. Cada bombeo sube el premio… y puede reventarlo. Cobra antes de que explote.', 'Pump: inflate the balloon one pump at a time. Each pump raises the prize… and may pop it. Cash out before it bursts.'),
    rules: [
      b('Probabilidad de reventar en cada bombeo: fácil 4 %, medio 10 %, difícil 20 %, experto 33 %.', 'Chance to pop on each pump: easy 4 %, medium 10 %, hard 20 %, expert 33 %.'),
      b('El bombeo que lo revienta se decide al empezar; el globo no «avisa».', 'The pump that pops it is decided at the start; the balloon gives no warning.'),
      b('Si llegas al máximo de bombeos cobras automáticamente.', 'Reach the maximum pumps and you get paid automatically.'),
    ],
    odds: [{ label: b('Retorno', 'Return'), value: '99 %' }],
  },
  dragontiger: {
    summary: b('Dragon Tiger: una carta para el Dragón y otra para el Tigre. Gana la más alta. El juego de cartas más rápido del casino.', 'Dragon Tiger: one card for the Dragon, one for the Tiger. Highest wins. The fastest card game in the casino.'),
    rules: [
      b('El as vale 1 (la más baja) y el rey 13. Los palos no cuentan.', 'Ace counts 1 (lowest) and king 13. Suits don’t matter.'),
      b('Dragón o Tigre pagan 1 a 1. Si empatan, pierdes la mitad de esas apuestas.', 'Dragon or Tiger pay 1 to 1. On a tie you lose half of those bets.'),
      b('Empate paga 11 a 1. Se juega con 8 barajas.', 'Tie pays 11 to 1. Played with 8 decks.'),
    ],
    odds: [
      { label: b('Empate', 'Tie'), value: '7.47 %' },
      { label: b('Retorno Dragón / Tigre', 'Return Dragon / Tiger'), value: '96.27 %' },
      { label: b('Retorno Empate', 'Return Tie'), value: '89.64 %' },
    ],
  },
};

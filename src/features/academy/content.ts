import type { GameId } from '@/engine/games/types.ts';

type Bi = { es: string; en: string };
export type Level = 'beginner' | 'intermediate' | 'advanced';
export interface QuizQ { q: Bi; options: Bi[]; answer: number; explain: Bi }
export interface Lesson { id: string; game: GameId; level: Level; minutes: number; title: Bi; cards: Bi[]; quiz: QuizQ[]; sim?: string }

const b = (es: string, en: string): Bi => ({ es, en });
const q = (qes: string, qen: string, options: [string, string][], answer: number, ees: string, een: string): QuizQ => ({ q: b(qes, qen), options: options.map(([e, n]) => b(e, n)), answer, explain: b(ees, een) });
const L = (id: string, game: GameId, level: Level, minutes: number, title: [string, string], cards: [string, string][], quiz: QuizQ[], sim?: string): Lesson => ({
  id: `${game}.${id}`, game, level, minutes, title: b(...title), cards: cards.map(([e, n]) => b(e, n)), quiz, sim,
});

/**
 * Academy lessons. Every number is either derived in the text or verified by the engine tests
 * (probabilities, RTPs, house edges). No lesson promises a way to beat games of chance.
 */
export const LESSONS: Lesson[] = [
  // ───────────── POKER ─────────────
  L('hand-rankings', 'poker', 'beginner', 3, ['Ranking de manos', 'Hand rankings'], [
    ['De mayor a menor: escalera de color, póker, full, color, escalera, trío, doble pareja, pareja y carta alta.', 'High to low: straight flush, four of a kind, full house, flush, straight, three of a kind, two pair, pair and high card.'],
    ['El orden sigue la rareza. Con 7 cartas, terminas con una pareja el 43,8 % de las veces, color el 3,0 % y póker solo el 0,17 %.', 'The order follows rarity. With 7 cards you end with a pair 43.8 % of the time, a flush 3.0 % and four of a kind only 0.17 %.'],
    ['Solo cuentan tus 5 mejores cartas. Si la mejor jugada está en la mesa, todos los que la usan empatan y el bote se reparte.', 'Only your best 5 cards count. If the best hand is on the board, everyone using it ties and the pot is split.'],
    ['El “kicker” desempata: con A-K contra A-Q en una mesa con un As, gana el Rey.', 'The kicker breaks ties: A-K vs A-Q on an Ace-high board, the King wins.'],
  ], [
    q('¿Qué gana: color o escalera?', 'Which wins: flush or straight?', [['Escalera', 'Straight'], ['Color', 'Flush']], 1, 'El color es más raro (3,0 % frente a 4,6 % con 7 cartas).', 'A flush is rarer (3.0 % vs 4.6 % with 7 cards).'),
    q('Mesa A-A-K-K-Q. Tienes J-J. ¿Qué jugada tienes?', 'Board A-A-K-K-Q. You hold J-J. What is your hand?', [['Doble pareja A-K con Q', 'Two pair A-K, Q kicker'], ['Tres parejas', 'Three pairs']], 0, 'Solo se usan 5 cartas: la mejor es A-A-K-K-Q; tus jotas no juegan.', 'Only 5 cards play: the best is A-A-K-K-Q; your jacks do not play.'),
  ], 'poker-equity'),
  L('positions', 'poker', 'beginner', 3, ['Posiciones', 'Positions'], [
    ['El botón (D) actúa el último en flop, turn y river. Ver lo que hacen los demás antes de decidir es una ventaja real.', 'The button (D) acts last on the flop, turn and river. Seeing what others do before deciding is a real edge.'],
    ['Las ciegas ponen fichas obligatorias y juegan sin posición después del flop: por eso pierden fichas a largo plazo en casi cualquier jugador.', 'The blinds post forced bets and act first after the flop: that is why they lose chips over time for almost every player.'],
    ['Regla práctica: cuanto antes hablas, más fuerte debe ser tu mano para entrar. Desde el botón puedes abrir más manos.', 'Rule of thumb: the earlier you act, the stronger your hand must be to enter. From the button you can open more hands.'],
  ], [
    q('¿Quién actúa último después del flop?', 'Who acts last after the flop?', [['La ciega grande', 'The big blind'], ['El botón', 'The button'], ['El primero a la izquierda', 'First player to the left']], 1, 'El botón habla el último en todas las calles salvo preflop.', 'The button acts last on every street except preflop.'),
  ]),
  L('starting-hands', 'poker', 'intermediate', 4, ['Manos iniciales y rangos', 'Starting hands and ranges'], [
    ['Hay 169 manos iniciales distintas. Te llega una pareja el 5,9 % de las veces (1 de cada 17) y AA el 0,45 % (1 de cada 221).', 'There are 169 distinct starting hands. You get a pocket pair 5.9 % of the time (1 in 17) and AA 0.45 % (1 in 221).'],
    ['Un “rango” es el conjunto de manos con las que alguien jugaría una acción. Piensa en rangos, no en una mano exacta.', 'A “range” is the set of hands someone would take an action with. Think in ranges, not one exact hand.'],
    ['Las manos del mismo palo y conectadas (8♥9♥) ganan valor en mesas con muchos jugadores; las cartas altas sueltas (K-7 de distinto palo) suelen dar problemas.', 'Suited connectors (8♥9♥) gain value in multiway pots; loose high cards (offsuit K-7) often cause trouble.'],
    ['Los bots de esta app usan la fórmula de Chen para valorar manos preflop. ¡Es una aproximación, no una verdad absoluta!', 'This app’s bots use the Chen formula to value preflop hands. It is an approximation, not absolute truth!'],
  ], [
    q('¿Con qué frecuencia recibes una pareja?', 'How often are you dealt a pocket pair?', [['1 de cada 6', '1 in 6'], ['1 de cada 17', '1 in 17'], ['1 de cada 50', '1 in 50']], 1, '13 parejas × 6 combinaciones = 78 de 1.326 manos ≈ 5,9 %.', '13 pairs × 6 combos = 78 of 1,326 hands ≈ 5.9 %.'),
  ], 'poker-equity'),
  L('outs-odds', 'poker', 'intermediate', 4, ['Outs y probabilidades', 'Outs and odds'], [
    ['Los “outs” son las cartas que mejoran tu mano a probablemente ganadora. Un proyecto de color tiene 9 outs (13 del palo − 4 vistas).', '“Outs” are the cards that improve you to a likely winner. A flush draw has 9 outs (13 of the suit − 4 seen).'],
    ['En el flop quedan 47 cartas. Probabilidad de ligar en el turn: 9/47 = 19,1 %. Ligar en turn o river: 1 − (38/47 · 37/46) = 35,0 %.', 'On the flop 47 cards remain. Chance to hit on the turn: 9/47 = 19.1 %. On turn or river: 1 − (38/47 · 37/46) = 35.0 %.'],
    ['Atajo de 2 y 4: outs × 4 en el flop (dos cartas por venir) y outs × 2 en el turn. 9 × 4 = 36 % ≈ 35 %.', 'Rule of 2 and 4: outs × 4 on the flop (two cards to come) and outs × 2 on the turn. 9 × 4 = 36 % ≈ 35 %.'],
    ['Escalera abierta (5-6-7-8) = 8 outs → 31,5 % al river.', 'Open-ended straight draw (5-6-7-8) = 8 outs → 31.5 % by the river.'],
  ], [
    q('En el turn tienes 9 outs. ¿Probabilidad de ligar en el river?', 'On the turn you have 9 outs. Chance to hit on the river?', [['≈ 9,6 %', '≈ 9.6 %'], ['≈ 19,6 %', '≈ 19.6 %'], ['≈ 35 %', '≈ 35 %']], 1, 'Quedan 46 cartas: 9/46 = 19,6 % (atajo: 9 × 2 = 18 %).', '46 cards remain: 9/46 = 19.6 % (shortcut: 9 × 2 = 18 %).'),
    q('¿Cuántos outs tiene una escalera abierta?', 'How many outs does an open-ended straight draw have?', [['4', '4'], ['8', '8'], ['9', '9']], 1, 'Dos rangos completan la escalera, 4 cartas de cada uno.', 'Two ranks complete it, 4 cards each.'),
  ], 'poker-equity'),
  L('pot-odds-ev', 'poker', 'advanced', 5, ['Pot odds y valor esperado', 'Pot odds and expected value'], [
    ['Pot odds = lo que pagas / (bote + lo que pagas). Si el bote tiene 100 y te apuestan 50, pagas 50 para optar a 200: necesitas ganar ≥ 25 %.', 'Pot odds = what you pay / (pot + what you pay). Pot 100, opponent bets 50: you pay 50 to win 200, so you need ≥ 25 % equity.'],
    ['Valor esperado (EV) = P(ganar) × lo que ganas − P(perder) × lo que pierdes. Una decisión con EV positivo es correcta aunque esta vez salga mal.', 'Expected value (EV) = P(win) × amount won − P(lose) × amount lost. A +EV decision is correct even if it fails this time.'],
    ['Ejemplo: 35 % de equidad, pagas 50 para ganar 150 → EV = 0,35·150 − 0,65·50 = +20. Igualar es rentable a largo plazo.', 'Example: 35 % equity, pay 50 to win 150 → EV = 0.35·150 − 0.65·50 = +20. Calling is profitable in the long run.'],
    ['En póker no hay ventaja de la casa: ganas o pierdes contra los demás jugadores. Por eso decidir bien sí cambia los resultados a largo plazo.', 'Poker has no house edge: you win or lose against other players. That is why good decisions do change long-run results.'],
  ], [
    q('Bote 300, te apuestan 100. ¿Qué equidad mínima necesitas para igualar?', 'Pot 300, you face a 100 bet. Minimum equity to call?', [['20 %', '20 %'], ['25 %', '25 %'], ['33 %', '33 %']], 0, 'Pagas 100 para optar a 500 (300 + 100 + 100): 100/500 = 20 %.', 'You pay 100 to win 500 (300 + 100 + 100): 100/500 = 20 %.'),
  ], 'poker-equity'),
  L('mistakes-postflop', 'poker', 'advanced', 4, ['Postflop y errores habituales', 'Postflop and common mistakes'], [
    ['La textura importa: en K♠7♦2♣ (seca) es difícil que el rival haya ligado; en 9♥8♥7♠ (coordinada) hay proyectos por todas partes.', 'Texture matters: on K♠7♦2♣ (dry) it is hard for opponents to connect; on 9♥8♥7♠ (coordinated) draws are everywhere.'],
    ['Errores típicos: jugar demasiadas manos, igualar sin pot odds, ignorar la posición y farolear a jugadores que siempre pagan.', 'Typical mistakes: playing too many hands, calling without pot odds, ignoring position and bluffing players who always call.'],
    ['El “tilt” (jugar peor tras perder) es el error más caro. Una mala racha no cambia las probabilidades de la siguiente mano.', '“Tilt” (playing worse after losing) is the costliest mistake. A bad run does not change the odds of the next hand.'],
  ], [
    q('¿A quién NO conviene farolear?', 'Who should you NOT bluff?', [['A un jugador muy prudente', 'A very cautious player'], ['A una “calling station” que lo paga todo', 'A calling station who calls everything']], 1, 'Un farol solo funciona si el rival puede retirarse.', 'A bluff only works if the opponent can fold.'),
  ]),
  // ───────────── BLACKJACK ─────────────
  L('basics', 'blackjack', 'beginner', 3, ['Fundamentos', 'Fundamentals'], [
    ['Figuras valen 10 y el As 1 u 11. Una mano con As contado como 11 es “blanda” (A-6 = 17 blando) y no puede pasarse con una carta más.', 'Faces are 10 and Ace is 1 or 11. A hand with an Ace counted as 11 is “soft” (A-6 = soft 17) and cannot bust with one more card.'],
    ['La banca no decide: pide hasta 17 y aquí se planta con 17 blando. Tu ventaja es poder decidir; su ventaja es que si te pasas pierdes aunque ella también se pase.', 'The dealer does not decide: it draws to 17 and here stands on soft 17. Your edge is choice; its edge is that if you bust you lose even if it busts too.'],
    ['Blackjack natural (As + 10 en dos cartas) paga 3:2 y sale el 4,75 % de las manos.', 'A natural (Ace + 10 in two cards) pays 3:2 and happens in 4.75 % of hands.'],
  ], [
    q('A-6 es…', 'A-6 is…', [['17 duro', 'Hard 17'], ['17 blando', 'Soft 17']], 1, 'El As cuenta como 11 sin pasarse: es blando.', 'The Ace counts as 11 without busting: it is soft.'),
  ], 'bj-trainer'),
  L('basic-strategy', 'blackjack', 'intermediate', 5, ['Estrategia básica', 'Basic strategy'], [
    ['La estrategia básica es la jugada matemáticamente óptima para cada combinación de tu mano y la carta visible de la banca (calculada por simulación).', 'Basic strategy is the mathematically optimal play for each combination of your hand and the dealer’s up-card (computed by simulation).'],
    ['Reglas clave: divide siempre Ases y Ochos; nunca dividas 10 ni 5; dobla 11 contra 2–10; plántate con 12 contra 4–6; pide con 12–16 contra 7 o más.', 'Key rules: always split Aces and Eights; never split 10s or 5s; double 11 vs 2–10; stand on 12 vs 4–6; hit 12–16 vs 7 or higher.'],
    ['Con la banca mostrando 2–6 es más probable que se pase (hasta ~42 % con un 6), así que a menudo conviene plantarse y dejar que arriesgue ella.', 'With the dealer showing 2–6 it busts more often (up to ~42 % with a 6), so standing often lets the dealer take the risk.'],
    ['Seguirla no garantiza ganar: reduce la ventaja de la casa al mínimo posible (≈0,5 % con estas reglas).', 'Following it does not guarantee winning: it minimises the house edge (≈0.5 % with these rules).'],
  ], [
    q('Tienes 8-8 contra un 10. ¿Qué hace la estrategia básica?', 'You have 8-8 vs a 10. What does basic strategy do?', [['Plantarse', 'Stand'], ['Pedir', 'Hit'], ['Dividir', 'Split']], 2, '16 es la peor mano; dos manos que empiezan con 8 pierden menos en promedio.', '16 is the worst hand; two hands starting with 8 lose less on average.'),
    q('Tienes 11 contra un 6.', 'You have 11 vs a 6.', [['Doblar', 'Double'], ['Pedir', 'Hit']], 0, 'Es una de las situaciones más favorables para doblar.', 'It is one of the most favourable spots to double.'),
  ], 'bj-trainer'),
  L('house-edge', 'blackjack', 'intermediate', 4, ['Ventaja de la casa y reglas', 'House edge and rules'], [
    ['Con estrategia básica y estas reglas (6 barajas, S17, DAS, 3:2) la ventaja de la casa ronda el 0,5 %. Jugando “a ojo” suele superar el 2 %.', 'With basic strategy and these rules (6 decks, S17, DAS, 3:2) the house edge is about 0.5 %. Playing by feel usually exceeds 2 %.'],
    ['Cambios de reglas pesan mucho: pagar el blackjack 6:5 añade ≈1,4 %; que la banca pida con 17 blando añade ≈0,2 %.', 'Rule changes matter: paying blackjack 6:5 adds ≈1.4 %; dealer hitting soft 17 adds ≈0.2 %.'],
    ['Aquí se baraja cada ronda (equivalente a una barajadora continua): contar cartas no tiene efecto.', 'Here the shoe is reshuffled every round (like a continuous shuffler): card counting has no effect.'],
  ], [
    q('¿Qué regla empeora más tus números?', 'Which rule hurts you most?', [['Blackjack 6:5', 'Blackjack 6:5'], ['Doblar tras dividir', 'Double after split']], 0, 'El 6:5 añade ≈1,4 %; doblar tras dividir en realidad te favorece.', '6:5 adds ≈1.4 %; doubling after split actually helps you.'),
  ]),
  L('myths', 'blackjack', 'advanced', 3, ['Mitos', 'Myths'], [
    ['“La banca va a pasarse, lleva tres seguidas sin hacerlo”: falso. Con barajado continuo cada mano es independiente.', '“The dealer is due to bust after three good hands”: false. With continuous shuffling every hand is independent.'],
    ['El seguro (que aquí no ofrecemos) tiene una ventaja de la casa de ≈7 % con 6 barajas: es una apuesta lateral mala.', 'Insurance (not offered here) has a ≈7 % house edge with 6 decks: it is a bad side bet.'],
    ['Las malas decisiones de otros jugadores no cambian tu valor esperado: las cartas que “te roban” igual podían haberte ayudado.', 'Other players’ bad decisions do not change your expected value: the cards they “steal” could equally have helped you.'],
  ], [
    q('¿Cambia la probabilidad de la siguiente mano tras 5 derrotas?', 'Does the next hand’s probability change after 5 losses?', [['Sí, toca ganar', 'Yes, a win is due'], ['No', 'No']], 1, 'Cada mano se juega con un mazo recién barajado.', 'Each hand uses a freshly shuffled shoe.'),
  ]),
  // ───────────── CRASH ─────────────
  L('how-it-works', 'crash', 'beginner', 3, ['Cómo funciona', 'How it works'], [
    ['El punto de explosión se calcula antes de despegar: 0,99 / (1 − u), con u aleatorio entre 0 y 1. La animación solo lo enseña.', 'The crash point is computed before take-off: 0.99 / (1 − u), with u random between 0 and 1. The animation only shows it.'],
    ['Probabilidad de llegar a x = 0,99 / x. A 1,5× llega el 66 %; a 2× el 49,5 %; a 10× el 9,9 %; a 100× el 0,99 %.', 'Chance of reaching x = 0.99 / x. 1.5× is reached 66 % of the time; 2× 49.5 %; 10× 9.9 %; 100× 0.99 %.'],
    ['Alrededor del 2 % de las rondas explotan nada más empezar (1,00×).', 'About 2 % of rounds crash immediately (1.00×).'],
  ], [
    q('¿Probabilidad de llegar a 4×?', 'Chance of reaching 4×?', [['≈ 25 %', '≈ 25 %'], ['≈ 24,75 %', '≈ 24.75 %'], ['≈ 40 %', '≈ 40 %']], 1, '0,99 / 4 = 24,75 %.', '0.99 / 4 = 24.75 %.'),
  ], 'crash-sim'),
  L('expected-value', 'crash', 'intermediate', 3, ['Valor esperado e independencia', 'Expected value and independence'], [
    ['Si retiras siempre en x: ganas x con probabilidad 0,99/x. EV = x · 0,99/x = 0,99. Pierdes un 1 % de lo apostado en promedio, elijas el objetivo que elijas.', 'If you always cash out at x: you win x with probability 0.99/x. EV = x · 0.99/x = 0.99. You lose 1 % of what you bet on average, whatever target you pick.'],
    ['Cada ronda es independiente. “Lleva 30 rondas sin pasar de 10×, ya toca” es la falacia del jugador: la probabilidad sigue siendo 9,9 %.', 'Each round is independent. “30 rounds without 10×, it is due” is the gambler’s fallacy: the chance is still 9.9 %.'],
  ], [
    q('¿Qué objetivo tiene mejor valor esperado?', 'Which target has the better expected value?', [['1,2×', '1.2×'], ['10×', '10×'], ['Todos igual', 'All the same']], 2, 'EV = 0,99 para cualquier objetivo; solo cambia la variabilidad.', 'EV = 0.99 for any target; only volatility changes.'),
  ], 'crash-sim'),
  L('risk', 'crash', 'advanced', 3, ['Riesgo y sistemas', 'Risk and systems'], [
    ['Objetivos bajos ganan a menudo pero poco; objetivos altos ganan rara vez y mucho. Tu saldo oscila más cuanto más alto apuntas.', 'Low targets win often but little; high targets win rarely and big. Your balance swings more the higher you aim.'],
    ['Doblar la apuesta tras cada pérdida (martingala) parece seguro hasta que una racha mala agota el saldo. No cambia el 1 % de ventaja.', 'Doubling after each loss (martingale) looks safe until a bad run empties the balance. It does not change the 1 % edge.'],
  ], [
    q('¿La martingala elimina la ventaja de la casa?', 'Does the martingale remove the house edge?', [['Sí', 'Yes'], ['No', 'No']], 1, 'Ninguna secuencia de apuestas convierte rondas con EV 0,99 en positivas.', 'No betting sequence turns 0.99-EV rounds into positive ones.'),
  ], 'crash-sim'),
  // ───────────── DICE ─────────────
  L('probability', 'dice', 'beginner', 2, ['Probabilidad del dado', 'Dice probability'], [
    ['Hay 10.000 resultados equiprobables (0,00 a 99,99). “Menor que 25” gana con 2.500 de ellos: 25 %.', 'There are 10,000 equally likely results (0.00 to 99.99). “Under 25” wins with 2,500 of them: 25 %.'],
    ['El multiplicador es 0,99 / probabilidad: 25 % → 3,96×; 50 % → 1,98×; 90 % → 1,10×.', 'The multiplier is 0.99 / chance: 25 % → 3.96×; 50 % → 1.98×; 90 % → 1.10×.'],
  ], [
    q('Con un 10 % de probabilidad, ¿qué multiplicador recibes?', 'With a 10 % chance, which multiplier do you get?', [['10×', '10×'], ['9,9×', '9.9×']], 1, '0,99 / 0,10 = 9,9×.', '0.99 / 0.10 = 9.9×.'),
  ], 'dice-sim'),
  L('distribution-ev', 'dice', 'intermediate', 3, ['Distribución y valor esperado', 'Distribution and EV'], [
    ['EV de cualquier tirada = probabilidad × multiplicador = 0,99. Cambiar el objetivo no cambia el EV, solo la frecuencia de ganar.', 'EV of any roll = chance × multiplier = 0.99. Changing the target does not change EV, only how often you win.'],
    ['Perder 10 seguidas al 50 % parece imposible pero ocurre el 0,098 % de las veces: en 10.000 tiradas lo verás varias veces.', 'Losing 10 in a row at 50 % feels impossible but happens 0.098 % of the time: in 10,000 rolls you will see it several times.'],
  ], [
    q('¿Qué cambia al bajar la probabilidad de 50 % a 5 %?', 'What changes when lowering the chance from 50 % to 5 %?', [['El EV sube', 'EV goes up'], ['La variabilidad sube', 'Volatility goes up']], 1, 'El EV se mantiene en 0,99; ganas menos veces pero más cada vez.', 'EV stays at 0.99; you win less often but more each time.'),
  ], 'dice-sim'),
  L('risk', 'dice', 'advanced', 3, ['Riesgo y rachas', 'Risk and streaks'], [
    ['Con un 2 % de probabilidad esperas una victoria cada 50 tiradas, pero la probabilidad de no ganar ninguna en 100 tiradas es 0,98¹⁰⁰ ≈ 13,3 %.', 'At a 2 % chance you expect one win every 50 rolls, yet the chance of no win in 100 rolls is 0.98¹⁰⁰ ≈ 13.3 %.'],
    ['Apostar una fracción pequeña del saldo reduce la probabilidad de quedarte sin fichas, aunque no cambia el EV.', 'Betting a small fraction of your balance reduces the chance of running out, though it does not change EV.'],
  ], [
    q('¿Probabilidad de no ganar en 100 tiradas al 2 %?', 'Chance of no win in 100 rolls at 2 %?', [['≈ 0 %', '≈ 0 %'], ['≈ 13 %', '≈ 13 %'], ['≈ 50 %', '≈ 50 %']], 1, '0,98^100 ≈ 0,133.', '0.98^100 ≈ 0.133.'),
  ], 'dice-sim'),
  // ───────────── MINES ─────────────
  L('probability', 'mines', 'beginner', 3, ['Probabilidad de mina', 'Mine probability'], [
    ['Con m minas, la primera casilla es segura con probabilidad (25 − m)/25. Con 3 minas: 22/25 = 88 %.', 'With m mines, the first tile is safe with probability (25 − m)/25. With 3 mines: 22/25 = 88 %.'],
    ['Cada gema reduce las casillas libres: la segunda es segura con 21/24 = 87,5 %, la tercera 20/23 = 87,0 %…', 'Each gem reduces free tiles: the second is safe with 21/24 = 87.5 %, the third 20/23 = 87.0 %…'],
  ], [
    q('Con 5 minas, ¿probabilidad de que la primera casilla sea segura?', 'With 5 mines, chance the first tile is safe?', [['80 %', '80 %'], ['95 %', '95 %']], 0, '20/25 = 80 %.', '20/25 = 80 %.'),
  ], 'mines-sim'),
  L('cumulative-risk', 'mines', 'intermediate', 3, ['Riesgo acumulado', 'Cumulative risk'], [
    ['Sobrevivir k casillas = C(25−m, k) / C(25, k). Con 3 minas: 5 casillas → 49,6 %; 10 casillas → 19,8 %.', 'Surviving k tiles = C(25−m, k) / C(25, k). With 3 mines: 5 tiles → 49.6 %; 10 tiles → 19.8 %.'],
    ['Por eso el multiplicador crece cada vez más deprisa: compensa un riesgo que se acumula.', 'That is why the multiplier grows faster and faster: it compensates a risk that accumulates.'],
  ], [
    q('Con 3 minas, ¿probabilidad de sobrevivir 5 casillas?', 'With 3 mines, chance of surviving 5 tiles?', [['≈ 50 %', '≈ 50 %'], ['≈ 88 %', '≈ 88 %']], 0, 'C(22,5)/C(25,5) = 26.334 / 53.130 ≈ 49,6 %.', 'C(22,5)/C(25,5) = 26,334 / 53,130 ≈ 49.6 %.'),
  ], 'mines-sim'),
  L('ev', 'mines', 'advanced', 2, ['Valor esperado', 'Expected value'], [
    ['Multiplicador = 0,99 / P(sobrevivir). Por tanto EV = P × multiplicador = 0,99 en cualquier punto en que retires.', 'Multiplier = 0.99 / P(survive). Therefore EV = P × multiplier = 0.99 wherever you cash out.'],
    ['No existe un número “óptimo” de casillas que supere a la casa; elegir cuándo parar decide tu riesgo, no tu ventaja.', 'There is no “optimal” number of tiles that beats the house; choosing when to stop sets your risk, not your edge.'],
  ], [
    q('¿Cuándo es mayor el EV?', 'When is EV highest?', [['Retirando en 1 gema', 'Cash out at 1 gem'], ['Retirando en 10 gemas', 'Cash out at 10 gems'], ['Es igual', 'It is the same']], 2, 'El EV es 0,99 siempre.', 'EV is always 0.99.'),
  ], 'mines-sim'),
  // ───────────── PLINKO ─────────────
  L('distribution', 'plinko', 'beginner', 3, ['La distribución binomial', 'The binomial distribution'], [
    ['La bola rebota n veces al 50 %. La casilla final es el número de rebotes a la derecha: una distribución binomial.', 'The ball bounces n times at 50 %. The final bin is the number of right bounces: a binomial distribution.'],
    ['Con 8 filas, la casilla central sale el 27,3 % (70/256) y cada extremo solo el 0,39 % (1/256). Con 16 filas, cada extremo es 1/65.536.', 'With 8 rows, the centre bin hits 27.3 % (70/256) and each edge only 0.39 % (1/256). With 16 rows, each edge is 1/65,536.'],
  ], [
    q('Con 8 filas, ¿probabilidad de un extremo concreto?', 'With 8 rows, chance of one specific edge?', [['1/16', '1/16'], ['1/256', '1/256']], 1, 'Todos los rebotes deben ir al mismo lado: (1/2)⁸.', 'Every bounce must go the same way: (1/2)⁸.'),
  ], 'plinko-sim'),
  L('variance', 'plinko', 'intermediate', 3, ['Variabilidad y riesgo', 'Variance and risk'], [
    ['Riesgo bajo, medio y alto tienen la misma probabilidad por casilla; solo cambian los pagos.', 'Low, medium and high risk have the same probability per bin; only the payouts change.'],
    ['En riesgo alto el centro paga menos de 1×: la mayoría de bolas pierden algo y unas pocas pagan mucho.', 'On high risk the centre pays below 1×: most balls lose something and a few pay a lot.'],
  ], [
    q('¿El riesgo cambia dónde cae la bola?', 'Does risk change where the ball lands?', [['Sí', 'Yes'], ['No', 'No']], 1, 'La física es la misma; solo cambia la tabla de pagos.', 'Physics is the same; only the pay table changes.'),
  ], 'plinko-sim'),
  L('ev', 'plinko', 'advanced', 3, ['Calcular el EV', 'Computing EV'], [
    ['EV = Σ P(casilla i) × pago(i). Las tablas de esta app tienen un RTP entre 98,6 % y 99,0 %, verificado con pruebas automáticas.', 'EV = Σ P(bin i) × payout(i). This app’s tables have an RTP between 98.6 % and 99.0 %, verified by automated tests.'],
    ['Soltar más bolas a la vez no cambia el EV por bola; solo acelera los resultados.', 'Dropping more balls at once does not change the EV per ball; it only speeds up results.'],
  ], [
    q('Una tabla paga 2× al 50 % y 0× al 50 %. ¿EV?', 'A table pays 2× at 50 % and 0× at 50 %. EV?', [['1,0', '1.0'], ['2,0', '2.0']], 0, '0,5·2 + 0,5·0 = 1.', '0.5·2 + 0.5·0 = 1.'),
  ], 'plinko-sim'),
  // ───────────── CROSSING ─────────────
  L('risk-per-step', 'crossing', 'beginner', 2, ['Riesgo por carril', 'Risk per lane'], [
    ['Cada carril tiene la misma probabilidad de accidente: 4 % (fácil), 10 % (media), 18 % (difícil) o 30 % (extrema).', 'Every lane has the same hit chance: 4 % (easy), 10 % (medium), 18 % (hard) or 30 % (extreme).'],
    ['Los carriles son independientes: haber cruzado 5 no hace más ni menos peligroso el sexto.', 'Lanes are independent: having crossed 5 does not make the sixth more or less dangerous.'],
  ], [
    q('En media, ¿probabilidad de cruzar el siguiente carril?', 'On medium, chance of crossing the next lane?', [['90 %', '90 %'], ['Depende de cuántos llevas', 'Depends on how many you crossed']], 0, 'Siempre 90 %, cada carril es independiente.', 'Always 90 %, every lane is independent.'),
  ]),
  L('cumulative', 'crossing', 'intermediate', 3, ['Probabilidad acumulada', 'Cumulative probability'], [
    ['Sobrevivir k carriles = (1 − p)^k. En media: 5 carriles 59 %, 10 carriles 34,9 %, 20 carriles 12,2 %.', 'Surviving k lanes = (1 − p)^k. Medium: 5 lanes 59 %, 10 lanes 34.9 %, 20 lanes 12.2 %.'],
    ['El multiplicador es 0,99 / (1 − p)^k, así que cada carril multiplica por 1/(1 − p): ×1,111 en media.', 'The multiplier is 0.99 / (1 − p)^k, so each lane multiplies by 1/(1 − p): ×1.111 on medium.'],
  ], [
    q('En difícil (18 %), ¿probabilidad de cruzar 3 carriles?', 'On hard (18 %), chance of crossing 3 lanes?', [['≈ 55 %', '≈ 55 %'], ['≈ 82 %', '≈ 82 %']], 0, '0,82³ ≈ 0,551.', '0.82³ ≈ 0.551.'),
  ]),
  L('cashout-ev', 'crossing', 'advanced', 2, ['¿Cuándo retirarse?', 'When to stop?'], [
    ['Retirarte en cualquier carril tiene EV 0,99. La decisión es de gusto por el riesgo, no de ventaja.', 'Cashing out at any lane has EV 0.99. The decision is about risk appetite, not edge.'],
    ['Fijar antes de empezar un objetivo de carriles evita decidir “en caliente”.', 'Choosing a lane target before you start avoids deciding in the heat of the moment.'],
  ], [
    q('¿Retirarse antes mejora el EV?', 'Does stopping earlier improve EV?', [['Sí', 'Yes'], ['No, reduce la variabilidad', 'No, it reduces volatility']], 1, 'El EV es constante; parar antes solo suaviza los resultados.', 'EV is constant; stopping earlier only smooths results.'),
  ]),
  // ───────────── ROULETTE ─────────────
  L('european', 'roulette', 'beginner', 3, ['Ruleta europea', 'European roulette'], [
    ['37 casillas: 18 rojas, 18 negras y el 0 verde. Un pleno paga 35:1 aunque la probabilidad es 1/37.', '37 pockets: 18 red, 18 black and green 0. A straight-up bet pays 35:1 although the chance is 1/37.'],
    ['Esa diferencia es la ventaja de la casa: 1/37 ≈ 2,70 % en todas las apuestas. La americana (con 00) llega al 5,26 %.', 'That gap is the house edge: 1/37 ≈ 2.70 % on every bet. American roulette (with 00) reaches 5.26 %.'],
  ], [
    q('¿Qué apuesta tiene menos ventaja de la casa?', 'Which bet has the lowest house edge?', [['Rojo', 'Red'], ['Pleno', 'Straight up'], ['Todas igual', 'All the same']], 2, 'Todas devuelven 36/37 por unidad apostada.', 'All return 36/37 per unit staked.'),
  ], 'roulette-sim'),
  L('bets', 'roulette', 'intermediate', 3, ['Apuestas y probabilidades', 'Bets and probabilities'], [
    ['Rojo/negro, par/impar, 1–18/19–36: 18/37 = 48,6 %. Docena o columna: 12/37 = 32,4 %. Pleno: 2,7 %.', 'Red/black, odd/even, 1–18/19–36: 18/37 = 48.6 %. Dozen or column: 12/37 = 32.4 %. Straight: 2.7 %.'],
    ['Repartir fichas en muchas apuestas no reduce la ventaja: sumas varias apuestas con el mismo −2,7 %.', 'Spreading chips over many bets does not reduce the edge: you add several bets with the same −2.7 %.'],
  ], [
    q('¿Probabilidad de acertar una docena?', 'Chance of hitting a dozen?', [['33,3 %', '33.3 %'], ['32,4 %', '32.4 %']], 1, '12/37 por culpa del cero.', '12/37 because of zero.'),
  ], 'roulette-sim'),
  L('systems', 'roulette', 'advanced', 4, ['Sistemas y sus límites', 'Systems and their limits'], [
    ['Martingala: doblar tras perder. Gana 1 unidad casi siempre, pero perder 10 rojos seguidos (0,13 %) cuesta 1.023 unidades.', 'Martingale: double after a loss. It wins 1 unit almost always, but losing 10 reds in a row (0.13 %) costs 1,023 units.'],
    ['D’Alembert, Fibonacci o Labouchère cambian el tamaño de las apuestas, no la probabilidad de cada giro. El EV sigue siendo −2,7 %.', 'D’Alembert, Fibonacci or Labouchère change bet sizes, not the odds of each spin. EV stays at −2.7 %.'],
    ['Pruébalo sin riesgo en el simulador de ruleta.', 'Try it risk-free in the roulette simulator.'],
  ], [
    q('¿Por qué falla la martingala?', 'Why does the martingale fail?', [['Por los límites de saldo y apuesta', 'Balance and bet limits'], ['Porque la ruleta está trucada', 'Because roulette is rigged']], 0, 'Las rachas largas son raras pero inevitables, y su coste crece exponencialmente.', 'Long streaks are rare but inevitable, and their cost grows exponentially.'),
  ], 'roulette-sim'),
  // ───────────── LIMBO ─────────────
  L('multipliers', 'limbo', 'beginner', 2, ['Multiplicadores', 'Multipliers'], [
    ['Probabilidad de ganar con objetivo x = 0,99 / x. 2× → 49,5 %; 10× → 9,9 %; 1.000× → 0,099 %.', 'Win chance with target x = 0.99 / x. 2× → 49.5 %; 10× → 9.9 %; 1,000× → 0.099 %.'],
    ['El resultado sigue la misma distribución que Crash, pero sin animación de vuelo: es instantáneo.', 'The result follows the same distribution as Crash, but without a flight: it is instant.'],
  ], [
    q('¿Probabilidad con objetivo 5×?', 'Chance with a 5× target?', [['19,8 %', '19.8 %'], ['20 %', '20 %']], 0, '0,99 / 5 = 19,8 %.', '0.99 / 5 = 19.8 %.'),
  ], 'crash-sim'),
  L('risk-reward', 'limbo', 'intermediate', 3, ['Riesgo y recompensa', 'Risk and reward'], [
    ['EV = 0,99 para cualquier objetivo. Lo que cambia es la frecuencia: con 100× ganas el 0,99 % de las veces.', 'EV = 0.99 for any target. What changes is frequency: at 100× you win 0.99 % of the time.'],
    ['Probabilidad de al menos una victoria en n intentos: 1 − (1 − p)^n. Con 100× en 100 intentos: ≈ 63 %, no 100 %.', 'Chance of at least one win in n tries: 1 − (1 − p)^n. At 100× in 100 tries: ≈ 63 %, not 100 %.'],
  ], [
    q('100 intentos a 100×: ¿ganarás seguro una vez?', '100 tries at 100×: will you surely win once?', [['Sí', 'Yes'], ['No, ≈ 63 %', 'No, ≈ 63 %']], 1, '1 − 0,9901¹⁰⁰ ≈ 0,63.', '1 − 0.9901¹⁰⁰ ≈ 0.63.'),
  ]),
  // ───────────── COINFLIP ─────────────
  L('independence', 'coinflip', 'beginner', 2, ['Probabilidad e independencia', 'Probability and independence'], [
    ['Cada lanzamiento es 50/50 y no recuerda los anteriores. Acertar 5 seguidos: (1/2)⁵ = 3,1 %.', 'Every flip is 50/50 and has no memory. Calling 5 in a row: (1/2)⁵ = 3.1 %.'],
    ['El multiplicador tras k aciertos es 0,99 · 2^k, así que el EV es 0,99 sin importar cuándo retires.', 'The multiplier after k correct calls is 0.99 · 2^k, so EV is 0.99 whenever you cash out.'],
  ], [
    q('Han salido 4 caras. ¿Probabilidad de otra cara?', 'Four heads so far. Chance of another head?', [['50 %', '50 %'], ['3,1 %', '3.1 %']], 0, 'El 3,1 % es para 5 seguidas desde el principio; el siguiente lanzamiento es 50 %.', '3.1 % is for 5 in a row from scratch; the next flip is 50 %.'),
  ]),
  L('biases', 'coinflip', 'intermediate', 3, ['Sesgos cognitivos', 'Cognitive biases'], [
    ['Falacia del jugador: creer que tras muchas caras “toca” cruz. Mano caliente: creer que una racha seguirá. Ambas son ilusiones.', 'Gambler’s fallacy: believing tails is “due” after many heads. Hot hand: believing a streak will continue. Both are illusions.'],
    ['En 100 lanzamientos es normal ver rachas de 6 o 7 iguales. Que parezca un patrón no significa que lo sea.', 'In 100 flips, runs of 6 or 7 are normal. Looking like a pattern does not make it one.'],
  ], [
    q('¿Una racha larga predice el siguiente resultado?', 'Does a long streak predict the next result?', [['Sí', 'Yes'], ['No', 'No']], 1, 'Los lanzamientos son independientes.', 'Flips are independent.'),
  ]),
  // ───────────── BACCARAT ─────────────
  L('rules', 'baccarat', 'beginner', 3, ['Reglas', 'Rules'], [
    ['Solo cuenta la última cifra: 7 + 8 = 15 → 5. Un 8 o 9 con dos cartas es “natural” y nadie más pide.', 'Only the last digit counts: 7 + 8 = 15 → 5. An 8 or 9 in two cards is a “natural” and nobody draws.'],
    ['El Jugador pide con 0–5. La Banca decide según su total y la tercera carta del Jugador. Tú no tomas decisiones: solo eliges la apuesta.', 'The Player draws on 0–5. The Banker draws by its total and the Player’s third card. You make no decisions: you only choose the bet.'],
  ], [
    q('¿Cuánto vale K + 8?', 'What is K + 8 worth?', [['18', '18'], ['8', '8']], 1, 'K vale 0: 0 + 8 = 8 (natural).', 'K is 0: 0 + 8 = 8 (natural).'),
  ]),
  L('odds-edge', 'baccarat', 'intermediate', 3, ['Probabilidades y ventaja', 'Odds and edge'], [
    ['Con 8 barajas: gana Banca 45,86 %, Jugador 44,62 %, Empate 9,52 %. La Banca gana más por las reglas de robo.', 'With 8 decks: Banker 45.86 %, Player 44.62 %, Tie 9.52 %. Banker wins more because of the drawing rules.'],
    ['Por eso se cobra un 5 % de comisión a la Banca. Ventaja: Banca 1,06 %, Jugador 1,24 %, Empate 14,4 %, Parejas ≈ 10,4 %.', 'That is why Banker pays a 5 % commission. Edge: Banker 1.06 %, Player 1.24 %, Tie 14.4 %, Pairs ≈ 10.4 %.'],
  ], [
    q('¿Qué apuesta tiene peor valor?', 'Which bet has the worst value?', [['Banca', 'Banker'], ['Empate', 'Tie']], 1, 'El empate paga 8:1 pero su ventaja es del 14,4 %.', 'Tie pays 8:1 but its edge is 14.4 %.'),
  ]),
  L('decisions', 'baccarat', 'advanced', 2, ['Tendencias y decisiones', 'Trends and decisions'], [
    ['Las hojas de tendencias (“carreteras”) no predicen nada: cada mano se reparte de un mazo barajado.', 'Trend sheets (“roads”) predict nothing: each coup is dealt from a shuffled shoe.'],
    ['La única decisión con impacto es evitar las apuestas laterales caras.', 'The only impactful decision is avoiding expensive side bets.'],
  ], [
    q('Tras 6 Bancas seguidas, ¿qué cambia?', 'After 6 Banker wins in a row, what changes?', [['Nada', 'Nothing'], ['Toca Jugador', 'Player is due']], 0, 'Las probabilidades siguen igual.', 'The odds stay the same.'),
  ]),
  // ───────────── HI-LO ─────────────
  L('conditional', 'hilo', 'beginner', 3, ['Probabilidad condicional', 'Conditional probability'], [
    ['La baraja es infinita: cada carta tiene 1/13 de ser cada valor. Con un valor v, “más alta o igual” = (14 − v)/13.', 'The deck is infinite: each card has 1/13 chance of each value. On value v, “higher or same” = (14 − v)/13.'],
    ['Con un 3: más alta o igual = 11/13 = 84,6 %; más baja o igual = 3/13 = 23,1 %. Lo menos probable paga más.', 'On a 3: higher or same = 11/13 = 84.6 %; lower or same = 3/13 = 23.1 %. Less likely pays more.'],
  ], [
    q('Con una Q (12), ¿probabilidad de “más alta o igual”?', 'On a Queen (12), chance of “higher or same”?', [['2/13 ≈ 15,4 %', '2/13 ≈ 15.4 %'], ['12/13', '12/13']], 0, 'Solo Q o K: 2 de 13 valores.', 'Only Q or K: 2 of 13 values.'),
  ], 'hilo-trainer'),
  L('cumulative', 'hilo', 'intermediate', 2, ['Riesgo acumulado', 'Cumulative risk'], [
    ['Encadenar aciertos multiplica probabilidades: tres apuestas del 70 % salen bien juntas el 0,7³ = 34,3 %.', 'Chaining guesses multiplies probabilities: three 70 % guesses all succeed 0.7³ = 34.3 % of the time.'],
    ['El multiplicador hace lo inverso: 0,99 × (1/0,7)³ ≈ 2,89×.', 'The multiplier does the inverse: 0.99 × (1/0.7)³ ≈ 2.89×.'],
  ], [
    q('Dos aciertos del 50 % seguidos:', 'Two 50 % guesses in a row:', [['25 %', '25 %'], ['50 %', '50 %']], 0, '0,5 × 0,5 = 0,25.', '0.5 × 0.5 = 0.25.'),
  ], 'hilo-trainer'),
  L('decisions', 'hilo', 'advanced', 2, ['Decisiones', 'Decisions'], [
    ['Saltar una carta es gratis y no cambia nada: la siguiente carta es igual de aleatoria.', 'Skipping a card is free and changes nothing: the next card is just as random.'],
    ['Elegir siempre la opción más probable reduce la variabilidad, pero el EV sigue siendo 0,99.', 'Always picking the likelier option reduces volatility, but EV stays 0.99.'],
  ], [
    q('¿Saltar cartas mejora tus probabilidades?', 'Does skipping cards improve your odds?', [['Sí', 'Yes'], ['No', 'No']], 1, 'Con baraja infinita cada carta es independiente.', 'With an infinite deck every card is independent.'),
  ], 'hilo-trainer'),
  // ───────────── KENO ─────────────
  L('combinatorics', 'keno', 'intermediate', 4, ['Combinatoria del Keno', 'Keno combinatorics'], [
    ['P(h aciertos con s números) = C(s,h) · C(40−s, 10−h) / C(40,10). Es la distribución hipergeométrica.', 'P(h hits with s picks) = C(s,h) · C(40−s, 10−h) / C(40,10). It is the hypergeometric distribution.'],
    ['Con 1 número aciertas el 25 % (10 de 40). Con 5 números, acertar los 5 ocurre el 0,038 % de las veces.', 'With 1 pick you hit 25 % (10 of 40). With 5 picks, hitting all 5 happens 0.038 % of the time.'],
  ], [
    q('Con 1 número, ¿probabilidad de acierto?', 'With 1 pick, chance of a hit?', [['10 %', '10 %'], ['25 %', '25 %']], 1, 'Se sortean 10 de 40: 10/40.', '10 of 40 are drawn: 10/40.'),
  ]),
  L('distribution-ev', 'keno', 'advanced', 3, ['Distribución y EV', 'Distribution and EV'], [
    ['Las tablas de esta app tienen RTP entre 98,5 % y 99,3 %. Más números o más riesgo = premios mayores pero más raros.', 'This app’s tables have an RTP between 98.5 % and 99.3 %. More picks or more risk = bigger but rarer prizes.'],
    ['Elegir números “de la suerte” o “que salen poco” no cambia nada: todos tienen la misma probabilidad.', 'Picking “lucky” or “overdue” numbers changes nothing: all have the same chance.'],
  ], [
    q('¿El 17 sale más si salió en las últimas rondas?', 'Is 17 more likely if it came up recently?', [['Sí', 'Yes'], ['No', 'No']], 1, 'Cada sorteo es independiente.', 'Each draw is independent.'),
  ]),
  // ───────────── SIC BO ─────────────
  L('combinations', 'sicbo', 'beginner', 3, ['Combinaciones de tres dados', 'Three-dice combinations'], [
    ['Hay 6³ = 216 resultados. La suma 10 u 11 aparece 27 veces (12,5 % cada una); 3 o 18 solo una (0,46 %).', 'There are 6³ = 216 outcomes. A total of 10 or 11 appears 27 times (12.5 % each); 3 or 18 only once (0.46 %).'],
    ['Un trío cualquiera sale 6 de 216 veces (2,78 %); un trío concreto 1 de 216.', 'Any triple shows 6 of 216 times (2.78 %); a specific triple 1 of 216.'],
  ], [
    q('¿Cuántos resultados posibles hay con 3 dados?', 'How many outcomes are there with 3 dice?', [['18', '18'], ['216', '216']], 1, '6 × 6 × 6.', '6 × 6 × 6.'),
  ]),
  L('bets-ev', 'sicbo', 'intermediate', 3, ['Apuestas y valor esperado', 'Bets and expected value'], [
    ['Pequeño/Grande pierden con trío: ventaja 2,78 %. Número único: 7,87 %. Trío concreto (180:1): 16,2 %. Suma 4 (60:1): 15,3 %.', 'Small/Big lose on triples: edge 2.78 %. Single number: 7.87 %. Specific triple (180:1): 16.2 %. Total 4 (60:1): 15.3 %.'],
    ['Los pagos grandes atraen, pero suelen esconder ventajas de la casa mucho mayores.', 'Big payouts are attractive but usually hide much larger house edges.'],
  ], [
    q('¿Qué apuesta tiene menor ventaja?', 'Which bet has the lowest edge?', [['Grande', 'Big'], ['Trío concreto', 'Specific triple']], 0, '2,78 % frente a 16,2 %.', '2.78 % vs 16.2 %.'),
  ]),
];

export interface SimDef { id: string; game: GameId; title: Bi; body: Bi }
export const SIMULATORS: SimDef[] = [
  { id: 'bj-trainer', game: 'blackjack', title: b('Entrenador de estrategia básica', 'Basic strategy trainer'), body: b('Decide en manos aleatorias y compara con la jugada óptima.', 'Decide on random hands and compare with the optimal play.') },
  { id: 'poker-equity', game: 'poker', title: b('Simulador de manos de póker', 'Poker hand simulator'), body: b('Calcula equidad y outs por Monte Carlo.', 'Compute equity and outs with Monte Carlo.') },
  { id: 'mines-sim', game: 'mines', title: b('Probabilidades de Mines', 'Mines probabilities'), body: b('Compara la probabilidad exacta con miles de rondas simuladas.', 'Compare exact odds with thousands of simulated rounds.') },
  { id: 'roulette-sim', game: 'roulette', title: b('Simulador de ruleta y sistemas', 'Roulette & systems simulator'), body: b('Prueba apuestas planas o martingala en 1.000 giros.', 'Test flat betting or martingale over 1,000 spins.') },
  { id: 'crash-sim', game: 'crash', title: b('Simulador de Crash', 'Crash simulator'), body: b('Elige un objetivo y observa el resultado a largo plazo.', 'Pick a target and watch long-run results.') },
  { id: 'hilo-trainer', game: 'hilo', title: b('Entrenador Hi-Lo', 'Hi-Lo trainer'), body: b('Estima probabilidades y comprueba la respuesta exacta.', 'Estimate probabilities and check the exact answer.') },
  { id: 'plinko-sim', game: 'plinko', title: b('Distribución de Plinko', 'Plinko distribution'), body: b('Suelta miles de bolas y mira la campana binomial.', 'Drop thousands of balls and watch the binomial bell.') },
  { id: 'dice-sim', game: 'dice', title: b('Rachas en Dice', 'Dice streaks'), body: b('Simula tiradas y observa rachas y saldo.', 'Simulate rolls and observe streaks and balance.') },
];

export const lessonsFor = (g: GameId) => LESSONS.filter((l) => l.game === g);
export const lessonById = (id: string) => LESSONS.find((l) => l.id === id);

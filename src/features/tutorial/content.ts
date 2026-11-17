import type { GameId } from '@/engine/games/types.ts';
import type { TutorialStep } from './tutorial';

const info = (title: [string, string], body: [string, string]): TutorialStep => ({ kind: 'info', title: { es: title[0], en: title[1] }, body: { es: body[0], en: body[1] } });
const doIt = (event: string, title: [string, string], body: [string, string]): TutorialStep => ({ kind: 'do', event, title: { es: title[0], en: title[1] }, body: { es: body[0], en: body[1] } });
const quiz = (title: [string, string], body: [string, string], options: [string, string][], answer: number, explain: [string, string]): TutorialStep => ({
  kind: 'quiz', title: { es: title[0], en: title[1] }, body: { es: body[0], en: body[1] }, options: options.map(([es, en]) => ({ es, en })), answer, explain: { es: explain[0], en: explain[1] },
});

/**
 * One short interactive tutorial per game. "do" steps wait for the player to perform the real action
 * in the real game (always in free practice mode while the tutorial runs).
 */
export const TUTORIALS: Record<GameId, TutorialStep[]> = {
  poker: [
    info(['Texas Hold’em', 'Texas Hold’em'], ['Recibes 2 cartas privadas y se reparten 5 comunes. Gana la mejor jugada de 5 cartas.', 'You get 2 private cards and 5 shared cards are dealt. The best 5-card hand wins.']),
    info(['Rondas de apuestas', 'Betting rounds'], ['Preflop, flop (3 cartas), turn (1) y river (1). En tu turno: retirarte, pasar/igualar o subir.', 'Preflop, flop (3 cards), turn (1) and river (1). On your turn: fold, check/call or raise.']),
    doIt('poker:act', ['Tu turno', 'Your turn'], ['Cuando se iluminen tus botones, elige una acción. Si dudas, “Pasar” o “Igualar” son seguros para aprender.', 'When your buttons light up, pick an action. If unsure, “Check” or “Call” are safe while learning.']),
    quiz(['¿Qué gana?', 'Which wins?'], ['Escalera (5-6-7-8-9) contra Color (5 cartas del mismo palo).', 'Straight (5-6-7-8-9) against a Flush (5 cards of one suit).'], [['Escalera', 'Straight'], ['Color', 'Flush']], 1, ['El color es más raro que la escalera, por eso la gana.', 'A flush is rarer than a straight, so it wins.']),
    doIt('poker:handEnd', ['Termina la mano', 'Finish the hand'], ['Juega hasta el final. Verás quién gana y con qué jugada.', 'Play to the end. You will see who wins and with which hand.']),
  ],
  blackjack: [
    info(['Objetivo', 'Goal'], ['Acércate a 21 más que la banca sin pasarte. Figuras valen 10, el As 1 u 11.', 'Get closer to 21 than the dealer without going over. Faces are 10, Ace is 1 or 11.']),
    doIt('bj:deal', ['Reparte', 'Deal'], ['Elige un importe y pulsa Repartir. Recibes 2 cartas; la banca muestra una.', 'Choose an amount and tap Deal. You get 2 cards; the dealer shows one.']),
    info(['Tus opciones', 'Your options'], ['Pedir (otra carta), Plantarse, Doblar (dobla la apuesta y recibes solo una carta) y Dividir (si tienes pareja).', 'Hit (another card), Stand, Double (double the bet, receive one card) and Split (with a pair).']),
    doIt('bj:end', ['Termina la ronda', 'Finish the round'], ['Juega tu mano. La banca pide hasta 17 y se planta con 17 blando.', 'Play your hand. The dealer draws to 17 and stands on soft 17.']),
    quiz(['Pregunta rápida', 'Quick question'], ['Tienes 16 y la banca muestra un 10. ¿Qué dice la estrategia básica?', 'You have 16 and the dealer shows a 10. What does basic strategy say?'], [['Pedir', 'Hit'], ['Plantarse', 'Stand']], 0, ['Con 16 contra 10 se pierde a menudo de cualquier forma, pero pedir pierde un poco menos.', '16 vs 10 loses often either way, but hitting loses slightly less.']),
  ],
  crash: [
    info(['El cohete', 'The rocket'], ['El multiplicador sube desde 1,00×. En algún momento el cohete explota. El punto de explosión ya está decidido antes de despegar.', 'The multiplier climbs from 1.00×. At some point the rocket blows up. The crash point is decided before take-off.']),
    doIt('crash:start', ['Despega', 'Take off'], ['Pulsa Apostar para lanzar una ronda de práctica.', 'Tap Bet to launch a practice round.']),
    doIt('crash:end', ['Retira a tiempo', 'Cash out in time'], ['Pulsa Retirar antes de la explosión para cobrar apuesta × multiplicador.', 'Tap Cash out before the crash to collect bet × multiplier.']),
    quiz(['Probabilidades', 'Odds'], ['¿Cuál es la probabilidad de llegar a 2×?', 'What is the chance of reaching 2×?'], [['Un 50 %', 'About 50 %'], ['Un 49,5 %', '49.5 %'], ['Un 75 %', '75 %']], 1, ['P(≥x) = 0,99 / x. Para 2× → 49,5 %. El 1 % restante es la ventaja de la casa.', 'P(≥x) = 0.99 / x. For 2× → 49.5 %. The missing 1 % is the house edge.']),
  ],
  dice: [
    info(['Tú eliges el riesgo', 'You pick the risk'], ['Sale un número de 0,00 a 99,99. Elige “mayor que” o “menor que” un objetivo.', 'A number from 0.00 to 99.99 is rolled. Bet on “over” or “under” a target.']),
    doIt('dice:adjust', ['Mueve el objetivo', 'Move the target'], ['Desliza la barra: verás cómo cambian la probabilidad y el multiplicador.', 'Drag the slider: watch the chance and multiplier change.']),
    doIt('dice:roll', ['Tira', 'Roll'], ['Pulsa Tirar. El resultado se calcula antes de la animación.', 'Tap Roll. The result is computed before the animation.']),
    quiz(['Multiplicador', 'Multiplier'], ['Con un 50 % de probabilidad, ¿qué multiplicador pagas?', 'With a 50 % chance, which multiplier do you get?'], [['2,00×', '2.00×'], ['1,98×', '1.98×']], 1, ['0,99 / 0,50 = 1,98×. Siempre 0,99 / probabilidad.', '0.99 / 0.50 = 1.98×. Always 0.99 / chance.']),
  ],
  mines: [
    info(['Gemas y minas', 'Gems and mines'], ['Hay 25 casillas con minas escondidas. Cada gema que destapas sube el multiplicador.', '25 tiles hide some mines. Every gem you reveal raises the multiplier.']),
    doIt('mines:start', ['Empieza', 'Start'], ['Elige cuántas minas y pulsa Apostar.', 'Choose how many mines and tap Bet.']),
    doIt('mines:reveal', ['Destapa una casilla', 'Reveal a tile'], ['Toca cualquier casilla. Si es gema, sigues; si es mina, pierdes la ronda.', 'Tap any tile. A gem keeps you going; a mine ends the round.']),
    doIt('mines:end', ['Retira o arriesga', 'Cash out or push on'], ['Pulsa Retirar cuando quieras asegurar el multiplicador actual.', 'Tap Cash out whenever you want to lock the current multiplier.']),
  ],
  plinko: [
    info(['La caída', 'The drop'], ['La bola rebota en cada fila: 50 % izquierda, 50 % derecha. Las casillas del centro son las más probables.', 'The ball bounces on every row: 50 % left, 50 % right. Centre bins are the most likely.']),
    doIt('plinko:drop', ['Suelta una bola', 'Drop a ball'], ['Pulsa Soltar bola. Puedes soltar varias seguidas.', 'Tap Drop ball. You can drop several in a row.']),
    quiz(['Riesgo', 'Risk'], ['¿Qué cambia el riesgo alto?', 'What does high risk change?'], [['Más probabilidad de ganar', 'Higher chance to win'], ['Extremos más grandes y centro más bajo', 'Bigger edges, lower centre']], 1, ['La probabilidad de cada casilla no cambia; cambia cuánto paga cada una.', 'Bin probabilities never change; only what each bin pays.']),
  ],
  crossing: [
    info(['Cruza carriles', 'Cross the lanes'], ['Tu pollito avanza carril a carril. Cada carril tiene un riesgo fijo y sube el multiplicador.', 'Your chick moves lane by lane. Each lane has a fixed risk and raises the multiplier.']),
    doIt('crossing:start', ['Empieza', 'Start'], ['Elige dificultad y pulsa Apostar.', 'Pick a difficulty and tap Bet.']),
    doIt('crossing:advance', ['Avanza', 'Go'], ['Pulsa Avanzar para cruzar un carril.', 'Tap Go to cross a lane.']),
    doIt('crossing:end', ['Retírate a tiempo', 'Stop in time'], ['Retira para cobrar o sigue arriesgando. Cada paso es independiente.', 'Cash out to collect or keep going. Every step is independent.']),
  ],
  roulette: [
    info(['Ruleta europea', 'European roulette'], ['37 casillas: 0 a 36. Puedes apostar a números, colores, par/impar, docenas…', '37 pockets: 0 to 36. Bet on numbers, colours, odd/even, dozens…']),
    doIt('roulette:place', ['Coloca una ficha', 'Place a chip'], ['Elige una ficha y toca “Rojo” o cualquier número.', 'Pick a chip and tap “Red” or any number.']),
    doIt('roulette:spin', ['Gira', 'Spin'], ['Pulsa Girar. La casilla ganadora se decide antes del giro.', 'Tap Spin. The winning pocket is decided before the spin.']),
    quiz(['¿Y el cero?', 'What about zero?'], ['Si sale 0 y apostaste a Rojo…', 'If 0 hits and you bet on Red…'], [['Recuperas la mitad', 'You get half back'], ['Pierdes la apuesta', 'You lose the bet']], 1, ['El 0 es la fuente de la ventaja de la casa (1/37 ≈ 2,7 %).', 'Zero is where the house edge comes from (1/37 ≈ 2.7 %).']),
  ],
  limbo: [
    info(['Objetivo', 'Target'], ['Fijas un multiplicador objetivo. Si el resultado lo iguala o supera, ganas apuesta × objetivo.', 'Set a target multiplier. If the result meets or beats it, you win bet × target.']),
    doIt('limbo:adjust', ['Elige objetivo', 'Pick a target'], ['Cambia el objetivo y mira la probabilidad: 0,99 / objetivo.', 'Change the target and watch the chance: 0.99 / target.']),
    doIt('limbo:play', ['Juega', 'Play'], ['Pulsa Apostar.', 'Tap Bet.']),
  ],
  coinflip: [
    info(['Cara o cruz', 'Heads or tails'], ['Acierta y tu multiplicador se dobla (con un 1 % de ventaja de la casa). Puedes retirar o seguir.', 'Call it right and your multiplier doubles (with a 1 % house edge). Cash out or keep going.']),
    doIt('coin:start', ['Empieza', 'Start'], ['Pulsa Apostar para abrir la ronda.', 'Tap Bet to open the round.']),
    doIt('coin:call', ['Elige', 'Call it'], ['Elige Cara o Cruz.', 'Pick Heads or Tails.']),
    quiz(['Rachas', 'Streaks'], ['Han salido 5 caras seguidas. ¿Qué es más probable ahora?', 'Five heads in a row. What is more likely now?'], [['Cruz', 'Tails'], ['Cara', 'Heads'], ['Igual de probable', 'Equally likely']], 2, ['Cada lanzamiento es independiente: 50 % / 50 %. Pensar lo contrario es la falacia del jugador.', 'Every flip is independent: 50 % / 50 %. Thinking otherwise is the gambler’s fallacy.']),
  ],
  baccarat: [
    info(['Tres apuestas', 'Three bets'], ['Apuesta a Jugador, Banca o Empate. Gana la mano más cercana a 9 (solo cuenta la última cifra).', 'Bet on Player, Banker or Tie. The hand closest to 9 wins (only the last digit counts).']),
    doIt('bac:place', ['Coloca la ficha', 'Place a chip'], ['Toca una zona de apuesta.', 'Tap a betting area.']),
    doIt('bac:deal', ['Reparte', 'Deal'], ['Pulsa Repartir. Las terceras cartas siguen reglas fijas: no decides nada.', 'Tap Deal. Third cards follow fixed rules: no decisions needed.']),
  ],
  hilo: [
    info(['Más alta o más baja', 'Higher or lower'], ['Adivina si la siguiente carta será más alta o más baja. El As es la más baja y la K la más alta.', 'Guess whether the next card is higher or lower. Ace is lowest, King highest.']),
    doIt('hilo:start', ['Empieza', 'Start'], ['Pulsa Apostar para ver la primera carta.', 'Tap Bet to see the first card.']),
    doIt('hilo:guess', ['Adivina', 'Guess'], ['Elige una opción. Las menos probables pagan más.', 'Pick an option. Less likely options pay more.']),
    doIt('hilo:end', ['Retira cuando quieras', 'Cash out any time'], ['Retira para asegurar el multiplicador acumulado.', 'Cash out to lock in the accumulated multiplier.']),
  ],
  keno: [
    info(['Elige números', 'Pick numbers'], ['Elige de 1 a 10 números del 1 al 40. Se sortean 10. Cuantos más aciertos, más pagas.', 'Pick 1 to 10 numbers from 1 to 40. Ten are drawn. More hits pay more.']),
    doIt('keno:pick', ['Selecciona', 'Select'], ['Toca algunos números del tablero (o usa Auto).', 'Tap some numbers on the board (or use Auto).']),
    doIt('keno:draw', ['Sortea', 'Draw'], ['Pulsa Sortear y mira cómo salen las bolas.', 'Tap Draw and watch the balls come out.']),
  ],
  sicbo: [
    info(['Tres dados', 'Three dice'], ['Apuesta a la suma, a números concretos, a parejas o a tríos.', 'Bet on the total, specific numbers, doubles or triples.']),
    doIt('sicbo:place', ['Apuesta', 'Bet'], ['Toca “Pequeño” (4–10) o “Grande” (11–17).', 'Tap “Small” (4–10) or “Big” (11–17).']),
    doIt('sicbo:roll', ['Lanza', 'Roll'], ['Pulsa Tirar.', 'Tap Roll.']),
    quiz(['Ojo con los tríos', 'Watch the triples'], ['Sale 2-2-2 (suma 6). ¿Gana “Pequeño”?', '2-2-2 hits (total 6). Does “Small” win?'], [['Sí', 'Yes'], ['No', 'No']], 1, ['Pequeño y Grande pierden con cualquier trío: de ahí sale su 2,78 % de ventaja de la casa.', 'Small and Big lose on any triple — that is their 2.78 % house edge.']),
  ],
  slots: [
    info(['La tragaperras', 'The slot machine'], ['Tres rodillos. Lo que cuenta es la línea del centro: tres iguales pagan, y las cerezas siempre ayudan.', 'Three reels. Only the middle line counts: three of a kind pays, and cherries always help.']),
    doIt('slots:spin', ['Tira', 'Spin'], ['Elige tu ficha y pulsa Tirar (o baja la palanca).', 'Pick your chip and tap Spin (or pull the lever).']),
    quiz(['¿Qué paga más?', 'What pays more?'], ['¿Tres 7 o tres campanas?', 'Three 7s or three bells?'], [['Tres 7', 'Three 7s'], ['Tres campanas', 'Three bells']], 0, ['Los 7 son más raros, por eso pagan ×80 frente a ×9.', '7s are rarer, so they pay ×80 against ×9.']),
  ],
  cascade: [
    info(['Dulce Cascada', 'Sweet Cascade'], ['No hay líneas: si hay 8 o más dulces iguales en cualquier sitio, pagan. Desaparecen, caen otros y puede volver a pagar.', 'No lines: 8 or more matching sweets anywhere pay. They pop, new ones fall in and it can pay again.']),
    doIt('cascade:spin', ['Tira', 'Spin'], ['Elige tu ficha y pulsa Tirar.', 'Pick your chip and tap Spin.']),
    quiz(['Las bombas', 'The bombs'], ['Ganas ×2 y hay dos bombas ×3 y ×5 en pantalla. ¿Cuánto cobras?', 'You win ×2 and there are ×3 and ×5 bombs on screen. What do you get?'], [['×16', '×16'], ['×30', '×30']], 0, ['Las bombas se suman (3 + 5 = 8) y multiplican la ganancia: ×2 × 8 = ×16. Si no ganas nada, no hacen nada.', 'Bombs add up (3 + 5 = 8) and multiply the win: ×2 × 8 = ×16. With no win they do nothing.']),
  ],
  fishing: [
    info(['Lago de Oro', 'Golden Lake'], ['5 rodillos y 10 líneas: 3 o más iguales seguidos desde la izquierda pagan. 3 cajas de pesca 🧰 dan tiradas gratis.', '5 reels and 10 lines: 3 or more in a row from the left pay. 3 tackle boxes 🧰 give free spins.']),
    doIt('fishing:spin', ['Tira', 'Spin'], ['Elige tu ficha y pulsa Tirar.', 'Pick your chip and tap Spin.']),
    quiz(['El pescador', 'The fisherman'], ['En las gratis sale el pescador y hay peces de ×5 y ×10 en pantalla. ¿Cuánto cobras?', 'In the free spins the fisherman lands with ×5 and ×10 fish on screen. What do you get?'], [['×15', '×15'], ['Nada, los peces no pagan', 'Nothing, fish do not pay']], 0, ['El pescador recoge el valor de todos los peces visibles: 5 + 10 = ×15 la apuesta (y más si has subido de nivel).', 'The fisherman collects every visible fish: 5 + 10 = ×15 the bet (and more after levelling up).']),
  ],
  jade: [
    info(['Templo de Jade', 'Jade Temple'], ['5 rodillos y 10 líneas. El ídolo 🗿 es comodín; 3 o más en cualquier sitio dan 10 tiradas gratis con un símbolo especial que se expande.', '5 reels and 10 lines. The idol 🗿 is wild; 3 or more anywhere give 10 free spins with an expanding special symbol.']),
    doIt('jade:spin', ['Tira', 'Spin'], ['Elige tu ficha y pulsa Tirar.', 'Pick your chip and tap Spin.']),
    quiz(['El especial', 'The special'], ['En las gratis el especial sale en los rodillos 1, 3 y 5 (no seguidos). ¿Paga?', 'In free spins the special lands on reels 1, 3 and 5 (not adjacent). Does it pay?'], [['Sí, en las 10 líneas', 'Yes, on all 10 lines'], ['No, tienen que estar seguidos', 'No, they must be adjacent']], 0, ['El especial se expande y paga en todas las líneas aunque los rodillos no estén seguidos.', 'The special expands and pays on every line even when the reels are not adjacent.']),
  ],
  goldmine: [
    info(['Mina de Oro', 'Gold Mine'], ['5 rodillos y 10 líneas. Las pepitas de oro no pagan en líneas: con 5 o más en pantalla empiezan las re-tiradas.', '5 reels and 10 lines. Gold nuggets do not pay on lines: 5 or more on screen start the respins.']),
    doIt('goldmine:spin', ['Tira', 'Spin'], ['Elige tu ficha y pulsa Tirar.', 'Pick your chip and tap Spin.']),
    quiz(['Las re-tiradas', 'The respins'], ['Te queda 1 re-tirada y cae una pepita nueva. ¿Cuántas te quedan?', 'You have 1 respin left and a new nugget lands. How many are left?'], [['3', '3'], ['0', '0']], 0, ['Cada pepita nueva vuelve a poner el contador en 3. Si llenas las 15 casillas, ganas el GRAND (×1000).', 'Every new nugget resets the counter to 3. Fill all 15 cells for the GRAND (×1000).']),
  ],
  fruits: [
    info(['Fuego Frutal', 'Fruit Fire'], ['Frutas de toda la vida en 10 líneas. Las bolas de fuego son comodines con ×2, ×3 o ×5.', 'Classic fruits on 10 lines. Fireballs are wilds worth ×2, ×3 or ×5.']),
    doIt('fruits:spin', ['Tira', 'Spin'], ['Elige tu ficha y pulsa Tirar.', 'Pick your chip and tap Spin.']),
    quiz(['Dos comodines', 'Two wilds'], ['Una línea de tres 7 lleva un comodín ×2 y otro ×3. ¿Por cuánto se multiplica?', 'A line of three 7s has a ×2 and a ×3 wild. What is it multiplied by?'], [['×5', '×5'], ['×6', '×6']], 0, ['Los multiplicadores de los comodines de la misma línea se suman: 2 + 3 = ×5.', 'Wild multipliers on the same line add up: 2 + 3 = ×5.']),
  ],
  pirate: [
    info(['Noche Pirata', 'Pirate Night'], ['10 líneas y un loro comodín. Cada vez que hay un loro, tienes una re-tirada gratis y el loro camina un rodillo a la izquierda.', '10 lines and a wild parrot. Whenever a parrot is on screen you get a free respin and it walks one reel to the left.']),
    doIt('pirate:spin', ['Tira', 'Spin'], ['Elige tu ficha y pulsa Tirar.', 'Pick your chip and tap Spin.']),
    quiz(['¿Cuántas re-tiradas?', 'How many respins?'], ['Sale un loro en el rodillo 4. Si no sale ninguno más, ¿cuántas re-tiradas gratis tienes?', 'A parrot lands on reel 4. If no other appears, how many free respins do you get?'], [['4', '4'], ['1', '1']], 0, ['Camina del rodillo 4 al 3, al 2, al 1 y luego se va: 4 re-tiradas.', 'It walks from reel 4 to 3, 2, 1 and then leaves: 4 respins.']),
  ],
  trader: [
    info(['La bolsa', 'The market'], ['Eliges si el precio acabará más alto (Sube) o más bajo (Baja). Luego miras cómo se mueve la gráfica.', 'Pick whether the price will end higher (Up) or lower (Down). Then watch the chart move.']),
    doIt('trader:play', ['Haz tu apuesta', 'Make your call'], ['Pulsa Sube o Baja.', 'Tap Up or Down.']),
    quiz(['¿Se puede adivinar?', 'Can you predict it?'], ['Si ha subido 5 veces seguidas, ¿es más probable que baje?', 'If it went up 5 times in a row, is down now more likely?'], [['Sí', 'Yes'], ['No, sigue siendo 50 %', 'No, still 50 %']], 1, ['Cada movimiento es independiente: lo anterior no cambia lo siguiente.', 'Each move is independent: the past does not change the next one.']),
  ],
  videopoker: [
    info(['El video póker', 'Video poker'], ['Te dan 5 cartas. Guardas las buenas, cambias las demás una sola vez y cobras según la jugada.', 'You get 5 cards. Keep the good ones, swap the rest once, and get paid for the hand.']),
    doIt('vp:deal', ['Reparte', 'Deal'], ['Elige tu ficha y pulsa Repartir.', 'Pick your chip and tap Deal.']),
    doIt('vp:draw', ['Guarda y cambia', 'Hold and draw'], ['Toca las cartas que quieras guardar (o pulsa 💡 para ver la pista) y luego Cambiar.', 'Tap the cards to keep (or 💡 for a hint), then Draw.']),
  ],
  wheel: [
    info(['La rueda', 'The wheel'], ['Eliges riesgo y giras. Donde pare la flecha, eso cobras.', 'Pick a risk and spin. Wherever the arrow stops, that is your prize.']),
    doIt('wheel:spin', ['Gira', 'Spin'], ['Elige tu ficha y pulsa Girar.', 'Pick your chip and tap Spin.']),
  ],
  towers: [
    info(['La torre', 'The tower'], ['En cada piso eliges una puerta. Si no hay huevo, subes y tu premio crece.', 'On each floor you pick a door. No egg, you go up and your prize grows.']),
    doIt('towers:start', ['Empieza', 'Start'], ['Elige tu ficha y pulsa Apostar.', 'Pick your chip and tap Bet.']),
    doIt('towers:pick', ['Elige puerta', 'Pick a door'], ['Toca una puerta del piso iluminado.', 'Tap a door on the lit floor.']),
  ],
  diamonds: [
    info(['Los diamantes', 'Diamonds'], ['Salen 5 gemas. Cuantas más del mismo color, mejor premio.', '5 gems come out. The more of one colour, the bigger the prize.']),
    doIt('diamonds:play', ['Juega', 'Play'], ['Elige tu ficha y pulsa Jugar.', 'Pick your chip and tap Play.']),
  ],
  pump: [
    info(['El globo', 'The balloon'], ['Cada bombeo sube el premio, pero el globo puede explotar. Cobra a tiempo.', 'Every pump raises the prize, but the balloon may pop. Cash out in time.']),
    doIt('pump:start', ['Empieza', 'Start'], ['Elige tu ficha y pulsa Apostar.', 'Pick your chip and tap Bet.']),
    doIt('pump:pump', ['Bombea', 'Pump'], ['Pulsa Bombear (o toca el globo).', 'Tap Pump (or the balloon).']),
  ],
  dragontiger: [
    info(['Dragon Tiger', 'Dragon Tiger'], ['Una carta para cada lado. Gana la más alta. Así de fácil.', 'One card each side. Highest wins. That simple.']),
    doIt('dt:place', ['Apuesta', 'Bet'], ['Toca Dragón, Tigre o Empate para poner tu ficha.', 'Tap Dragon, Tiger or Tie to place your chip.']),
    doIt('dt:deal', ['Reparte', 'Deal'], ['Pulsa Repartir.', 'Tap Deal.']),
  ],
  horses: [
    info(['El programa', 'The race card'], ['Cada caballo tiene su ficha: velocidad, fondo, arranque, últimas carreras y qué terreno y distancia le gustan. Toca uno para verla.', 'Every horse has a profile: speed, stamina, acceleration, recent runs and the ground and trip it likes. Tap one to see it.']),
    doIt('horses:pick', ['Elige caballo', 'Pick a horse'], ['Toca el número de un caballo para apostar por él.', 'Tap a horse’s number to back it.']),
    doIt('horses:run', ['¡A correr!', 'And they’re off!'], ['Elige tu ficha y pulsa Correr.', 'Pick your chip and tap Race.']),
  ],
};

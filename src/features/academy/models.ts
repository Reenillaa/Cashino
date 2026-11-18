/**
 * "How it works" models: for each game, the outcomes with their exact probability and what they return,
 * the return to player, the formula in plain words and a worked example with 20 chips.
 * Every number is computed from the same engine the games use (or, for blackjack/baccarat/poker, the
 * standard published values already listed in the rules and checked by the engine tests).
 */
import type { GameId } from '@/engine/games/types.ts';
import { diceMultiplier, diceWinChance } from '@/engine/games/dice.ts';
import { limboWinChance } from '@/engine/games/limbo.ts';
import { winProbability as crashChance } from '@/engine/games/crash.ts';
import { streakMultiplier } from '@/engine/games/coinflip.ts';
import { minesMultiplier, surviveChance } from '@/engine/games/mines.ts';
import { binProbability, plinkoRtp, plinkoTable } from '@/engine/games/plinko.ts';
import { KENO_TABLES, kenoHitProbability, kenoRtp } from '@/engine/games/keno.ts';
import { CROSSING_CONFIG, crossingMultiplier, crossingSurvival } from '@/engine/games/crossing.ts';
import { FIRE_HIT, FIRE_MEAN, ROULETTE_PAYS, rouletteExpectedReturn } from '@/engine/games/roulette.ts';
import { SICBO_PAYS, TOTAL_PAYS, sicBoExpectedReturn, sicBoWinProbability } from '@/engine/games/sicbo.ts';
import { BACCARAT_PAYS } from '@/engine/games/baccarat.ts';
import { guessProbability } from '@/engine/games/hilo.ts';
import { parseCard } from '@/engine/cards/cards.ts';
import { CASCADE_PAYS, SYMBOL_WEIGHTS, SCATTER_CHANCE, BOMB_CHANCE, COLS, ROWS } from '@/engine/games/cascade.ts';
import { SLOT_ONE_CHERRY, SLOT_THREE, SLOT_TWO_CHERRIES, SLOT_WEIGHTS, slotsStats } from '@/engine/games/slots.ts';
import { TRADER_MULTIPLIER } from '@/engine/games/trader.ts';
import { VP_PAYS, VP_REFERENCE_RTP } from '@/engine/games/videopoker.ts';
import { wheelRtp } from '@/engine/games/wheel.ts';
import { FISHING_PAYS, FISHING_WEIGHTS, FISH_VALUES } from '@/engine/games/fishing.ts';
import { JADE_PAYS, JADE_WEIGHTS } from '@/engine/games/jade.ts';
import { MINE_PAYS, MINE_WEIGHTS, MINE_BONUS } from '@/engine/games/goldmine.ts';
import { FRUIT_PAYS, FRUIT_WEIGHTS } from '@/engine/games/fruits.ts';
import { PIRATE_PAYS, PIRATE_WEIGHTS } from '@/engine/games/pirate.ts';
import { ANGLER_FISH, anglerMultiplier, anglerReturn } from '@/engine/games/angler.ts';
import { PENGUIN_CONFIG, penguinMultiplier, penguinSurvival } from '@/engine/games/penguin.ts';
import { SCRATCH, scratchHit, scratchRtp } from '@/engine/games/scratch.ts';
import { towerMultiplier } from '@/engine/games/towers.ts';
import { diamondStats, DIAMOND_PAYS } from '@/engine/games/diamonds.ts';
import { pumpMultiplier } from '@/engine/games/pump.ts';
import { dtStats } from '@/engine/games/dragontiger.ts';

export type Lang = 'es' | 'en';
export interface ModelRow { label: string; p: number; mult: number | null }
export interface GameModel {
  idea: string;
  rowsTitle: string;
  rows: ModelRow[];
  /** Long-run share of every bet that comes back (null = player vs player). */
  rtp: number | null;
  formula: string;
  example: string;
  /** Optional full distribution (e.g. Plinko bins) drawn as a bar chart. */
  dist?: { title: string; bins: { label: string; p: number; mult: number }[] };
}

const num = (lang: Lang, v: number, d = 2) => v.toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: d });
export const fmtPct = (lang: Lang, p: number) => `${num(lang, p * 100, p < 0.001 ? 3 : p < 0.1 ? 2 : 1)} %`;
export const fmtMult = (lang: Lang, m: number) => `×${num(lang, m, 2)}`;
const L = (lang: Lang, es: string, en: string) => (lang === 'es' ? es : en);
const ret = (bet: number, mult: number) => Math.floor(bet * mult);

type Builder = (lang: Lang) => GameModel;

const MODELS: Record<GameId, Builder> = {
  dice: (lang) => {
    const rows = [90, 75, 50, 25, 10].map((tgt) => ({ label: L(lang, `Menor que ${tgt}`, `Under ${tgt}`), p: diceWinChance('under', tgt), mult: diceMultiplier('under', tgt) }));
    const m50 = diceMultiplier('under', 50);
    return {
      idea: L(lang, 'Sale un número del 0 al 100. Tú eliges la probabilidad de ganar: cuanto más difícil lo pones, más paga.', 'A number from 0 to 100 is rolled. You choose your chance to win: the harder you make it, the more it pays.'),
      rowsTitle: L(lang, 'Si apuestas a «menor que»…', 'If you bet “under”…'),
      rows,
      rtp: 0.99,
      formula: L(lang, `Multiplicador = 0,99 ÷ probabilidad. Con un 50 %: 0,99 ÷ 0,5 = ${fmtMult(lang, m50)}.`, `Multiplier = 0.99 ÷ chance. At 50 %: 0.99 ÷ 0.5 = ${fmtMult(lang, m50)}.`),
      example: L(lang, `Apuestas 20 a «menor que 50». La mitad de las veces te devuelven ${ret(20, m50)}; la otra mitad pierdes los 20. A la larga recuperas 19,8 de cada 20.`, `You bet 20 on “under 50”. Half the time you get ${ret(20, m50)} back; the other half you lose the 20. In the long run you get back 19.8 of every 20.`),
    };
  },
  limbo: (lang) => ({
    idea: L(lang, 'Sale un multiplicador al azar. Tú pones un objetivo: si el resultado llega, cobras apuesta × objetivo.', 'A random multiplier comes out. You set a target: if the result reaches it, you get bet × target.'),
    rowsTitle: L(lang, 'Según el objetivo que elijas…', 'Depending on your target…'),
    rows: [1.5, 2, 5, 10, 100].map((x) => ({ label: L(lang, `Objetivo ${fmtMult(lang, x)}`, `Target ${fmtMult(lang, x)}`), p: limboWinChance(x), mult: x })),
    rtp: 0.99,
    formula: L(lang, `Probabilidad de llegar = 0,99 ÷ objetivo. Para ×2: ${fmtPct(lang, limboWinChance(2))}.`, `Chance to reach it = 0.99 ÷ target. For ×2: ${fmtPct(lang, limboWinChance(2))}.`),
    example: L(lang, `Con 20 fichas y objetivo ×5 cobras 100… pero solo un ${fmtPct(lang, limboWinChance(5))} de las veces (1 de cada 5, más o menos).`, `With 20 chips and a ×5 target you collect 100… but only ${fmtPct(lang, limboWinChance(5))} of the time (about 1 in 5).`),
  }),
  crash: (lang) => ({
    idea: L(lang, 'El cohete sube y explota en un punto que ya está decidido antes de despegar. Si retiras antes de la explosión, cobras.', 'The rocket climbs and blows up at a point decided before take-off. Cash out before it does and you win.'),
    rowsTitle: L(lang, 'Si retiras siempre en…', 'If you always cash out at…'),
    rows: [1.2, 1.5, 2, 5, 10].map((x) => ({ label: fmtMult(lang, x), p: crashChance(x), mult: x })),
    rtp: 0.99,
    formula: L(lang, 'Probabilidad de que llegue a ×x = 0,99 ÷ x. Esperar más paga más, pero pasa menos.', 'Chance it reaches ×x = 0.99 ÷ x. Waiting longer pays more but happens less.'),
    example: L(lang, `Retirar siempre en ×2 con 20 fichas: cobras 40 un ${fmtPct(lang, crashChance(2))} de las veces y pierdes 20 el resto.`, `Always cashing out at ×2 with 20 chips: you collect 40 ${fmtPct(lang, crashChance(2))} of the time and lose 20 otherwise.`),
  }),
  coinflip: (lang) => ({
    idea: L(lang, 'Cara o cruz: 50 % cada una. Si aciertas, puedes cobrar o seguir para doblar el premio.', 'Heads or tails: 50 % each. When you guess right you can collect or keep going to double it.'),
    rowsTitle: L(lang, 'Acertar seguidas…', 'Guessing in a row…'),
    rows: [1, 2, 3, 4, 5].map((k) => ({ label: L(lang, `${k} ${k === 1 ? 'acierto' : 'aciertos'}`, `${k} ${k === 1 ? 'win' : 'wins'}`), p: 0.5 ** k, mult: streakMultiplier(k) })),
    rtp: 0.99,
    formula: L(lang, 'Cada acierto multiplica el premio por casi 2. Acertar k seguidas: 1 entre 2, 4, 8, 16…', 'Each correct call almost doubles the prize. k in a row: 1 in 2, 4, 8, 16…'),
    example: L(lang, `Con 20 fichas, 3 aciertos seguidos pagan ${ret(20, streakMultiplier(3))}, pero solo pasa 1 de cada 8 veces.`, `With 20 chips, 3 in a row pays ${ret(20, streakMultiplier(3))}, but it only happens 1 time in 8.`),
  }),
  mines: (lang) => ({
    idea: L(lang, 'Hay 25 casillas y algunas esconden una bomba. Cada diamante sube el premio; una bomba lo pierde todo.', 'There are 25 tiles and some hide a bomb. Every diamond raises the prize; a bomb loses it all.'),
    rowsTitle: L(lang, 'Con 3 bombas, destapar…', 'With 3 bombs, revealing…'),
    rows: [1, 2, 3, 4, 6, 8].map((k) => ({ label: L(lang, `${k} ${k === 1 ? 'diamante' : 'diamantes'}`, `${k} ${k === 1 ? 'diamond' : 'diamonds'}`), p: surviveChance(3, k), mult: minesMultiplier(3, k) })),
    rtp: 0.99,
    formula: L(lang, 'Cada casilla segura es un poco menos probable que la anterior (quedan menos sin bomba). Multiplicador = 0,99 ÷ probabilidad de llegar.', 'Each safe tile is a bit less likely than the last (fewer bomb-free tiles remain). Multiplier = 0.99 ÷ chance of getting there.'),
    example: L(lang, `Con 3 bombas, sacar 4 diamantes pasa un ${fmtPct(lang, surviveChance(3, 4))} de las veces y convierte 20 fichas en ${ret(20, minesMultiplier(3, 4))}.`, `With 3 bombs, finding 4 diamonds happens ${fmtPct(lang, surviveChance(3, 4))} of the time and turns 20 chips into ${ret(20, minesMultiplier(3, 4))}.`),
  }),
  plinko: (lang) => {
    const rows = 12, table = plinkoTable(rows, 'medium');
    const bins = table.map((m, i) => ({ label: `${i}`, p: binProbability(rows, i), mult: m }));
    const center = bins.slice(5, 8), edges = [bins[0], bins[bins.length - 1]];
    return {
      idea: L(lang, 'La bola rebota a izquierda o derecha en cada fila, mitad y mitad. Por eso casi siempre cae en el centro (paga poco) y muy pocas veces en los bordes (paga mucho).', 'The ball bounces left or right on every row, 50/50. That is why it almost always lands in the middle (small pay) and very rarely at the edges (big pay).'),
      rowsTitle: L(lang, '12 filas, riesgo medio', '12 rows, medium risk'),
      rows: [
        { label: L(lang, 'Las 3 casillas del centro', 'The 3 middle bins'), p: center.reduce((a, b) => a + b.p, 0), mult: center[1].mult },
        { label: L(lang, 'Alguno de los 2 bordes', 'Either of the 2 edges'), p: edges[0].p + edges[1].p, mult: edges[0].mult },
      ],
      rtp: plinkoRtp(rows, 'medium'),
      formula: L(lang, 'Probabilidad de cada casilla = caminos que llegan a ella ÷ 2 elevado a las filas. Sale una «campana».', 'Chance of each bin = paths that reach it ÷ 2 to the power of the rows. It makes a “bell”.'),
      example: L(lang, `Con 20 fichas, el centro te devuelve unas ${ret(20, center[1].mult)}; un borde, ${ret(20, edges[0].mult)}… pero solo 1 vez de cada ${Math.round(1 / (edges[0].p + edges[1].p))}.`, `With 20 chips, the middle returns about ${ret(20, center[1].mult)}; an edge, ${ret(20, edges[0].mult)}… but only 1 time in ${Math.round(1 / (edges[0].p + edges[1].p))}.`),
      dist: { title: L(lang, 'Dónde cae la bola (12 filas)', 'Where the ball lands (12 rows)'), bins },
    };
  },
  crossing: (lang) => ({
    idea: L(lang, 'Tu pollito cruza carril a carril. Cada carril tiene el mismo riesgo y el premio va subiendo.', 'Your chick crosses lane by lane. Each lane has the same risk and the prize keeps rising.'),
    rowsTitle: L(lang, 'En fácil, cruzar…', 'On easy, crossing…'),
    rows: [1, 2, 3, 5, 8].map((k) => ({ label: L(lang, `${k} ${k === 1 ? 'carril' : 'carriles'}`, `${k} ${k === 1 ? 'lane' : 'lanes'}`), p: crossingSurvival('easy', k), mult: crossingMultiplier('easy', k) })),
    rtp: 0.99,
    formula: L(lang, `Cada carril se cruza con un ${fmtPct(lang, 1 - CROSSING_CONFIG.easy.hitChance)} en fácil. Cruzar k seguidos = esa probabilidad multiplicada k veces.`, `Each lane is crossed ${fmtPct(lang, 1 - CROSSING_CONFIG.easy.hitChance)} of the time on easy. k in a row = that chance multiplied k times.`),
    example: L(lang, `Con 20 fichas, 3 carriles en fácil pagan ${ret(20, crossingMultiplier('easy', 3))} y se consiguen un ${fmtPct(lang, crossingSurvival('easy', 3))} de las veces.`, `With 20 chips, 3 lanes on easy pay ${ret(20, crossingMultiplier('easy', 3))} and succeed ${fmtPct(lang, crossingSurvival('easy', 3))} of the time.`),
  }),
  roulette: (lang) => ({
    idea: L(lang, 'Hay 37 casillas (del 0 al 36). El 0 no es rojo ni negro: ahí está la ventaja de la casa.', 'There are 37 pockets (0 to 36). Zero is neither red nor black: that is the house edge.'),
    rowsTitle: L(lang, 'Si apuestas a…', 'If you bet on…'),
    rows: [
      { label: L(lang, 'Rojo (o negro, par, impar…)', 'Red (or black, even, odd…)'), p: 18 / 37, mult: ROULETTE_PAYS.red + 1 },
      { label: L(lang, 'Una docena', 'A dozen'), p: 12 / 37, mult: ROULETTE_PAYS.dozen + 1 },
      { label: L(lang, 'Un número que no está en llamas', 'A number not on fire'), p: (1 / 37) * (1 - FIRE_HIT), mult: ROULETTE_PAYS.straight + 1 },
      { label: L(lang, 'Un número en llamas (media)', 'A number on fire (average)'), p: (1 / 37) * FIRE_HIT, mult: FIRE_MEAN + 1 },
    ],
    rtp: 36 / 37,
    formula: L(lang, `Se paga como si hubiera 36 casillas, pero hay 37: de cada 37 fichas vuelven 36 (97,3 %). Los plenos pagan 29:1, pero en cada tirada se encienden de 1 a 5 números de fuego (×50 a ×500). Con eso, un pleno devuelve de media un ${fmtPct(lang, rouletteExpectedReturn({ kind: 'straight', numbers: [17] }))}.`, `It pays as if there were 36 pockets, but there are 37: for every 37 chips, 36 come back (97.3 %). Straights pay 29:1, but every spin 1 to 5 fire numbers light up (×50 to ×500). With them, a straight returns ${fmtPct(lang, rouletteExpectedReturn({ kind: 'straight', numbers: [17] }))} on average.`),
    example: L(lang, `20 fichas al rojo: cobras 40 un ${fmtPct(lang, 18 / 37)} de las veces. Al 17: cobras 600 una vez de cada 37, y si además está en llamas a ×500, ¡10.020! Pero eso pasa muy, muy poco.`, `20 chips on red: you collect 40 ${fmtPct(lang, 18 / 37)} of the time. On 17: you collect 600 once in 37 spins, and if it is also on fire at ×500, 10,020! But that happens very, very rarely.`),
  }),
  keno: (lang) => ({
    idea: L(lang, 'Eliges números del 1 al 40 y salen 10 al azar. Cuantos más aciertes, más cobras. Como la lotería, pero rápido.', 'Pick numbers from 1 to 40 and 10 are drawn. The more you hit, the more you win. Like a lottery, but quick.'),
    rowsTitle: L(lang, 'Con 5 números elegidos (riesgo medio)…', 'With 5 numbers picked (medium risk)…'),
    rows: [0, 1, 2, 3, 4, 5].map((h) => ({ label: L(lang, `${h} ${h === 1 ? 'acierto' : 'aciertos'}`, `${h} ${h === 1 ? 'hit' : 'hits'}`), p: kenoHitProbability(5, h), mult: KENO_TABLES.medium[5][h] })),
    rtp: kenoRtp(5, 'medium'),
    formula: L(lang, 'La probabilidad de acertar se calcula contando combinaciones: de las 40 bolas salen 10, y miras cuántas de las tuyas están entre ellas.', 'Hit chances come from counting combinations: 10 of 40 balls are drawn, and you check how many of yours are among them.'),
    example: L(lang, `Lo más normal con 5 números es acertar 1 (${fmtPct(lang, kenoHitProbability(5, 1))}). Acertar los 5 pasa ${fmtPct(lang, kenoHitProbability(5, 5))} de las veces.`, `The most common result with 5 numbers is 1 hit (${fmtPct(lang, kenoHitProbability(5, 1))}). Hitting all 5 happens ${fmtPct(lang, kenoHitProbability(5, 5))} of the time.`),
  }),
  hilo: (lang) => {
    const c2 = parseCard('2s'), c7 = parseCard('7h'), cq = parseCard('Qd');
    const r = (label: string, p: number) => ({ label, p, mult: 0.99 / p });
    return {
      idea: L(lang, 'Ves una carta y adivinas si la siguiente será mayor o menor. Lo fácil paga poco y lo difícil paga mucho.', 'You see a card and guess whether the next one is higher or lower. Easy guesses pay little, hard ones pay a lot.'),
      rowsTitle: L(lang, 'Ejemplos de apuestas', 'Example guesses'),
      rows: [
        r(L(lang, 'Sale un 2 → «mayor o igual»', 'A 2 shows → “higher or same”'), guessProbability(c2, 'higherOrSame')),
        r(L(lang, 'Sale un 7 → «mayor o igual»', 'A 7 shows → “higher or same”'), guessProbability(c7, 'higherOrSame')),
        r(L(lang, 'Sale una Q → «mayor o igual»', 'A Q shows → “higher or same”'), guessProbability(cq, 'higherOrSame')),
      ],
      rtp: 0.99,
      formula: L(lang, 'Hay 13 valores posibles. La probabilidad es contar cuántos te valen ÷ 13, y el multiplicador = 0,99 ÷ probabilidad.', 'There are 13 possible values. Chance = how many work for you ÷ 13, and multiplier = 0.99 ÷ chance.'),
      example: L(lang, 'Con un 2 a la vista, «mayor o igual» casi siempre acierta y paga poco. Con una Q, acertar es difícil y paga mucho más.', 'With a 2 showing, “higher or same” almost always wins and pays little. With a Q, it is hard and pays much more.'),
    };
  },
  baccarat: (lang) => ({
    idea: L(lang, 'Apuestas a qué mano se acerca más a 9: Jugador o Banca (o empate). Las cartas siguen reglas fijas; tú solo eliges a quién apuestas.', 'You bet on which hand gets closer to 9: Player or Banker (or a tie). Cards follow fixed rules; you only pick a side.'),
    rowsTitle: L(lang, 'Probabilidad de cada resultado', 'Chance of each result'),
    rows: [
      { label: L(lang, 'Gana la Banca', 'Banker wins'), p: 0.4586, mult: BACCARAT_PAYS.banker + 1 },
      { label: L(lang, 'Gana el Jugador', 'Player wins'), p: 0.4462, mult: BACCARAT_PAYS.player + 1 },
      { label: L(lang, 'Empate', 'Tie'), p: 0.0952, mult: BACCARAT_PAYS.tie + 1 },
    ],
    rtp: 0.9894,
    formula: L(lang, 'La Banca gana algo más a menudo (45,9 % frente a 44,6 %), por eso se le cobra un 5 % de comisión. Apostar al empate tiene la peor ventaja (14,4 %).', 'Banker wins slightly more often (45.9 % vs 44.6 %), so a 5 % commission is charged. The tie bet has the worst edge (14.4 %).'),
    example: L(lang, '20 fichas a la Banca: si gana te devuelven 39 (40 menos la comisión). Con empate entre manos, te devuelven tus 20.', '20 chips on Banker: if it wins you get 39 back (40 minus commission). On a tie between hands, you get your 20 back.'),
  }),
  sicbo: (lang) => ({
    idea: L(lang, 'Se lanzan tres dados. Apuestas a la suma (pequeño, grande, un total) o a combinaciones como tríos.', 'Three dice are rolled. You bet on the total (small, big, an exact sum) or on combinations like triples.'),
    rowsTitle: L(lang, 'Si apuestas a…', 'If you bet on…'),
    rows: [
      { label: L(lang, 'Pequeño (suma 4–10)', 'Small (total 4–10)'), p: sicBoWinProbability({ kind: 'small' }), mult: SICBO_PAYS.small + 1 },
      { label: L(lang, 'Suma exacta 10', 'Exact total 10'), p: sicBoWinProbability({ kind: 'total', total: 10 }), mult: TOTAL_PAYS[10] + 1 },
      { label: L(lang, 'Cualquier trío', 'Any triple'), p: sicBoWinProbability({ kind: 'anyTriple' }), mult: SICBO_PAYS.anyTriple + 1 },
    ],
    rtp: sicBoExpectedReturn({ kind: 'small' }),
    formula: L(lang, 'Hay 216 combinaciones posibles (6 × 6 × 6). «Pequeño» gana con 105 de ellas: los tríos no cuentan, y ahí está la ventaja.', 'There are 216 possible combinations (6 × 6 × 6). “Small” wins with 105 of them: triples do not count, and that is the edge.'),
    example: L(lang, `20 fichas a «pequeño»: cobras 40 un ${fmtPct(lang, sicBoWinProbability({ kind: 'small' }))} de las veces.`, `20 chips on “small”: you collect 40 ${fmtPct(lang, sicBoWinProbability({ kind: 'small' }))} of the time.`),
  }),
  blackjack: (lang) => ({
    idea: L(lang, 'Llega lo más cerca de 21 sin pasarte y gana a la banca. Es el juego con menos ventaja para la casa si juegas bien.', 'Get closer to 21 than the dealer without going over. It is the game with the smallest house edge if you play well.'),
    rowsTitle: L(lang, 'Una mano típica (estrategia básica)', 'A typical hand (basic strategy)'),
    rows: [
      { label: L(lang, 'Ganas la mano', 'You win'), p: 0.424, mult: 2 },
      { label: L(lang, 'Empate', 'Push'), p: 0.085, mult: 1 },
      { label: L(lang, 'Pierdes la mano', 'You lose'), p: 0.491, mult: 0 },
      { label: L(lang, 'Blackjack natural (dentro de «ganas»)', 'Natural blackjack (part of “win”)'), p: 0.0475, mult: 2.5 },
    ],
    rtp: 0.995,
    formula: L(lang, 'Pierdes más manos de las que ganas, pero el blackjack paga 3 a 2 y puedes doblar cuando te conviene. Con la estrategia básica la casa solo gana un 0,5 %; jugando «a ojo», entre un 2 % y un 5 %.', 'You lose more hands than you win, but blackjack pays 3 to 2 and you can double when it helps. With basic strategy the house keeps only 0.5 %; playing by feel, 2 % to 5 %.'),
    example: L(lang, 'Con 20 fichas: ganar te devuelve 40, un blackjack 50 y un empate tus 20.', 'With 20 chips: a win returns 40, a blackjack 50 and a push your 20.'),
  }),
  slots: (lang) => {
    const st = slotsStats();
    const T = Object.values(SLOT_WEIGHTS).reduce((x, y) => x + y, 0);
    const three = (k: keyof typeof SLOT_WEIGHTS) => (SLOT_WEIGHTS[k] / T) ** 3;
    return {
      idea: L(lang, 'Tres rodillos giran y se paran. Si en la línea del centro salen tres iguales, cobras. Las cerezas siempre ayudan.', 'Three reels spin and stop. Three of a kind on the middle line pays. Cherries always help.'),
      rowsTitle: L(lang, 'En la línea del centro…', 'On the middle line…'),
      rows: [
        { label: L(lang, 'Una cereza', 'One cherry'), p: 3 * (4 / T) * (1 - 4 / T) ** 2, mult: SLOT_ONE_CHERRY },
        { label: L(lang, 'Dos cerezas', 'Two cherries'), p: 3 * (4 / T) ** 2 * (1 - 4 / T), mult: SLOT_TWO_CHERRIES },
        { label: L(lang, 'Tres limones', 'Three lemons'), p: three('lemon'), mult: SLOT_THREE.lemon },
        { label: L(lang, 'Tres BAR', 'Three BARs'), p: three('bar'), mult: SLOT_THREE.bar },
        { label: L(lang, 'Tres 7', 'Three 7s'), p: three('seven'), mult: SLOT_THREE.seven },
        { label: L(lang, 'Tres diamantes', 'Three diamonds'), p: three('diamond'), mult: SLOT_THREE.diamond },
      ],
      rtp: st.rtp,
      formula: L(lang, `Cada rodillo tiene ${T} paradas: 4 cerezas, 7 limones, 6 campanas, 4 BAR, 2 sietes y 1 diamante. Probabilidad de tres iguales = (paradas ÷ ${T})³.`, `Each reel has ${T} stops: 4 cherries, 7 lemons, 6 bells, 4 BARs, 2 sevens and 1 diamond. Three of a kind = (stops ÷ ${T})³.`),
      example: L(lang, `Con 20 fichas, casi la mitad de las tiradas te devuelven algo (${fmtPct(lang, st.hit)}), pero los premios gordos son muy raros: tres diamantes, 1 vez de cada ${Math.round(1 / three('diamond')).toLocaleString('es-ES')}.`, `With 20 chips almost half the spins return something (${fmtPct(lang, st.hit)}), but big prizes are very rare: three diamonds, 1 time in ${Math.round(1 / three('diamond')).toLocaleString('en-US')}.`),
    };
  },
  cascade: (lang) => {
    // exact chance of 8+ of one sweet on the first drop (binomial over the 30 cells); tumbles add more
    const n = COLS * ROWS;
    const W = SYMBOL_WEIGHTS.reduce((a, b) => a + b, 0);
    const pCell = (s: number) => (SYMBOL_WEIGHTS[s] / W) * (1 - SCATTER_CHANCE - BOMB_CHANCE.base);
    const choose = (a: number, b: number) => { let r = 1; for (let i = 1; i <= b; i++) r = (r * (a - b + i)) / i; return r; };
    const atLeast = (p: number, k: number) => { let s = 0; for (let j = k; j <= n; j++) s += choose(n, j) * p ** j * (1 - p) ** (n - j); return s; };
    const NAMES = [['corazones', 'hearts'], ['estrellas', 'stars'], ['gominolas', 'gumdrops'], ['cubos', 'cubes'], ['ciruelas', 'plums'], ['manzanas', 'apples'], ['sandías', 'melons'], ['uvas', 'grapes'], ['plátanos', 'bananas']];
    return {
      idea: L(lang, 'Cada casilla se sortea sola. Ganas si caen 8 o más dulces iguales en cualquier sitio; luego desaparecen y caen otros, así que una tirada puede pagar varias veces.', 'Every cell is drawn on its own. You win if 8 or more matching sweets land anywhere; then they pop and new ones fall, so one spin can pay several times.'),
      rowsTitle: L(lang, 'En la primera caída, 8 o más…', 'On the first drop, 8 or more…'),
      rows: [8, 4, 2, 0].map((s) => ({ label: L(lang, NAMES[s][0], NAMES[s][1]), p: atLeast(pCell(s), 8), mult: CASCADE_PAYS[s][0] })),
      rtp: 0.965,
      formula: L(lang, 'Probabilidad de 8+ de un dulce = suma binomial sobre 30 casillas. El retorno total (cascadas, bombas y tiradas gratis) se mide simulando 10 millones de tiradas: ≈96,5 %.', 'Chance of 8+ of a sweet = binomial sum over 30 cells. The total return (tumbles, bombs and free spins) is measured by simulating 10 million spins: ≈96.5 %.'),
      example: L(lang, 'Unas 3 de cada 10 tiradas pagan algo, casi siempre poco. El dinero gordo está en las tiradas gratis con bombas, que salen 1 vez de cada ~440: por eso la banca de una sesión sube y baja tanto.', 'About 3 in 10 spins pay something, usually little. The big money is in the free spins with bombs, about 1 in ~440: that is why a session swings so much.'),
    };
  },
  fishing: (lang) => {
    const W = FISHING_WEIGHTS.base.reduce((a, b) => a + b, 0);
    const p3 = (s: number) => (FISHING_WEIGHTS.base[s] / W) ** 3;
    const NAMES = [['flotadores', 'floats'], ['barcas', 'boats'], ['cañas', 'rods'], ['peces', 'fish']];
    const fishW = FISH_VALUES.reduce((a, [, w]) => a + w, 0);
    const bigFish = FISH_VALUES.filter(([v]) => v >= 50).reduce((a, [, w]) => a + w, 0) / fishW;
    return {
      idea: L(lang, 'Cinco rodillos y 10 líneas: 3 o más iguales seguidos desde la izquierda pagan. Lo gordo está en las tiradas gratis: el pescador recoge el valor de todos los peces que haya en pantalla.', 'Five reels and 10 lines: 3 or more in a row from the left pay. The big money is in the free spins: the fisherman collects the value of every fish on screen.'),
      rowsTitle: L(lang, 'En una línea concreta, 3 seguidos de…', 'On one line, 3 in a row of…'),
      rows: [0, 6, 7, 8].map((s, i) => ({ label: L(lang, NAMES[i][0], NAMES[i][1]), p: p3(s), mult: FISHING_PAYS[s][0] })),
      rtp: 0.956,
      formula: L(lang, `Cada casilla se sortea con pesos: 3 iguales en una línea = (peso ÷ ${W})³. El pez lleva un valor (×2 a ×2000 la apuesta); solo ${fmtPct(lang, bigFish)} de los peces valen ×50 o más. El retorno total se mide simulando 8 millones de tiradas: ≈95,6 %.`, `Each cell is drawn with weights: 3 of a kind on a line = (weight ÷ ${W})³. Fish carry a value (×2 to ×2000 the bet); only ${fmtPct(lang, bigFish)} of fish are worth ×50 or more. The total return is measured by simulating 8 million spins: ≈95.6 %.`),
      example: L(lang, 'Una de cada 4 tiradas paga algo, casi siempre poco. Las tiradas gratis salen ≈1 de cada 220: ahí está la mayor parte del retorno, así que puedes pasar muchas tiradas seguidas perdiendo.', 'One spin in 4 pays something, usually little. Free spins arrive about 1 in 220: most of the return lives there, so you can lose many spins in a row.'),
    };
  },
  jade: (lang) => {
    const W = JADE_WEIGHTS.base.reduce((a, b) => a + b, 0);
    const p3 = (s: number) => (JADE_WEIGHTS.base[s] / W) ** 3;
    const NAMES = [['hojas', 'leaves'], ['máscaras', 'masks'], ['serpientes', 'serpents'], ['exploradores', 'explorers']];
    return {
      idea: L(lang, 'Cinco rodillos y 10 líneas. El ídolo es comodín y además abre 10 tiradas gratis. En ellas se sortea un símbolo especial que, si sale en suficientes rodillos, los llena enteros y paga en las 10 líneas a la vez.', 'Five reels and 10 lines. The idol is wild and also opens 10 free spins. In them a special symbol is drawn: if it lands on enough reels it fills them and pays on all 10 lines at once.'),
      rowsTitle: L(lang, 'En una línea concreta, 3 seguidos de… (sin contar comodines)', 'On one line, 3 in a row of… (not counting wilds)'),
      rows: [0, 5, 7, 8].map((s, i) => ({ label: L(lang, NAMES[i][0], NAMES[i][1]), p: p3(s), mult: JADE_PAYS[s][0] })),
      rtp: 0.97,
      formula: L(lang, `3 iguales en una línea ≈ (peso ÷ ${W})³, algo más gracias a los ídolos comodín. El símbolo expandido paga su premio × 10 líneas. Retorno total medido simulando 8 millones de tiradas: ≈97 %.`, `3 of a kind on a line ≈ (weight ÷ ${W})³, a little more thanks to the wild idols. The expanded symbol pays its prize × 10 lines. Total return measured by simulating 8 million spins: ≈97 %.`),
      example: L(lang, 'Una de cada 4 tiradas paga algo. Las tiradas gratis salen ≈1 de cada 200 y de media dan unas 60 veces la apuesta, pero si el especial es una hoja suelen dar poco y si es el explorador pueden dar muchísimo.', 'One spin in 4 pays something. Free spins come about 1 in 200 and average about 60× the bet, but a leaf special usually pays little while the explorer can pay a lot.'),
    };
  },
  goldmine: (lang) => {
    const W = MINE_WEIGHTS.reduce((a, b) => a + b, 0);
    const p3 = (s: number) => (MINE_WEIGHTS[s] / W) ** 3;
    const pn = MINE_WEIGHTS[8] / W;
    // chance of 5+ nuggets among 15 cells (binomial)
    const choose = (a: number, k: number) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (a - k + i)) / i; return r; };
    let pBonus = 0;
    for (let k = MINE_BONUS.trigger; k <= 15; k++) pBonus += choose(15, k) * pn ** k * (1 - pn) ** (15 - k);
    const NAMES = [['picos', 'pickaxes'], ['vagonetas', 'carts'], ['lingotes', 'gold bars'], ['mineros', 'miners']];
    return {
      idea: L(lang, 'Cinco rodillos y 10 líneas. Lo gordo está en las pepitas: con 5 o más empiezan las re-tiradas y cada pepita nueva da 3 más. Los premios MINI, MAJOR y GRAND son fijos.', 'Five reels and 10 lines. The big money is in the nuggets: 5 or more start the respins and each new nugget gives 3 more. MINI, MAJOR and GRAND are fixed prizes.'),
      rowsTitle: L(lang, 'En una línea concreta, 3 seguidos de…', 'On one line, 3 in a row of…'),
      rows: [0, 4, 6, 7].map((s, i) => ({ label: L(lang, NAMES[i][0], NAMES[i][1]), p: p3(s), mult: MINE_PAYS[s][0] })),
      rtp: 0.958,
      formula: L(lang, `Cada casilla es pepita con probabilidad ${fmtPct(lang, pn)}. 5 o más de 15 = suma binomial = ${fmtPct(lang, pBonus)} (≈1 de cada ${Math.round(1 / pBonus)}). El retorno total se mide simulando 8 millones de tiradas: ≈95,8 %.`, `Each cell is a nugget with chance ${fmtPct(lang, pn)}. 5 or more of 15 = binomial sum = ${fmtPct(lang, pBonus)} (≈1 in ${Math.round(1 / pBonus)}). Total return measured by simulating 8 million spins: ≈95.8 %.`),
      example: L(lang, 'Una de cada 4 tiradas paga algo. Las re-tiradas dan de media unas 48 veces la apuesta, pero llenar la pantalla entera (GRAND) es rarísimo: más o menos 1 de cada 12.000 tiradas.', 'One spin in 4 pays something. The respins average about 48× the bet, but filling the whole screen (GRAND) is very rare: about 1 in 12,000 spins.'),
    };
  },
  fruits: (lang) => {
    const W = FRUIT_WEIGHTS.base.reduce((a, b) => a + b, 0);
    const p3 = (s: number) => (FRUIT_WEIGHTS.base[s] / W) ** 3;
    const NAMES = [['cerezas', 'cherries'], ['uvas', 'grapes'], ['campanas', 'bells'], ['sietes', 'sevens']];
    return {
      idea: L(lang, 'Frutas de siempre en 10 líneas. La gracia son las bolas de fuego: son comodines y multiplican la línea en la que están (×2, ×3 o ×5, y si hay varias se suman).', 'Classic fruits on 10 lines. The fun is the fireballs: they are wild and multiply the line they are on (×2, ×3 or ×5, and several add up).'),
      rowsTitle: L(lang, 'En una línea concreta, 3 seguidos de… (sin comodines)', 'On one line, 3 in a row of… (no wilds)'),
      rows: [0, 4, 6, 7].map((s, i) => ({ label: L(lang, NAMES[i][0], NAMES[i][1]), p: p3(s), mult: FRUIT_PAYS[s][0] })),
      rtp: 0.976,
      formula: L(lang, `3 iguales en una línea ≈ (peso ÷ ${W})³, más con comodines. Un comodín ×3 en una línea de campanas: ×2,5 × 3 = ×7,5. Retorno total medido con 8 millones de tiradas: ≈97,6 %.`, `3 of a kind on a line ≈ (weight ÷ ${W})³, more with wilds. A ×3 wild on a line of bells: ×2.5 × 3 = ×7.5. Total return measured with 8 million spins: ≈97.6 %.`),
      example: L(lang, 'Una de cada 4 tiradas paga algo. Las tiradas gratis salen ≈1 de cada 157 y traen el doble de comodines, con multiplicadores de hasta ×10.', 'One spin in 4 pays something. Free spins come about 1 in 157 and bring twice as many wilds, with multipliers up to ×10.'),
    };
  },
  pirate: (lang) => {
    const W = PIRATE_WEIGHTS.reduce((a, b) => a + b, 0);
    const p3 = (s: number) => (PIRATE_WEIGHTS[s] / W) ** 3;
    const noParrot = (1 - PIRATE_WEIGHTS[8] / W) ** 12;
    const NAMES = [['anclas', 'anchors'], ['cañones', 'cannons'], ['barcos', 'ships'], ['capitanes', 'captains']];
    return {
      idea: L(lang, 'Es la de premios más frecuentes de la sala: el loro comodín te regala re-tiradas mientras camina hacia la izquierda, así que muchas tiradas se alargan solas. A cambio, los premios máximos son más bajos (×2000).', 'The hall’s most frequent payer: the wild parrot gives you respins while it walks to the left, so many spins extend themselves. In exchange the top prize is lower (×2000).'),
      rowsTitle: L(lang, 'En una línea concreta, 3 seguidos de… (sin loro)', 'On one line, 3 in a row of… (no parrot)'),
      rows: [0, 4, 6, 7].map((s, i) => ({ label: L(lang, NAMES[i][0], NAMES[i][1]), p: p3(s), mult: PIRATE_PAYS[s][0] })),
      rtp: 0.955,
      formula: L(lang, `Probabilidad de que salga al menos un loro en los 12 huecos de los rodillos 2–5 = 1 − (1 − ${PIRATE_WEIGHTS[8]}/${W})¹² = ${fmtPct(lang, 1 - noParrot)}. El retorno total se mide simulando 8 millones de tiradas: ≈95,5 %.`, `Chance of at least one parrot in the 12 spots of reels 2–5 = 1 − (1 − ${PIRATE_WEIGHTS[8]}/${W})¹² = ${fmtPct(lang, 1 - noParrot)}. Total return measured by simulating 8 million spins: ≈95.5 %.`),
      example: L(lang, 'Casi 1 de cada 3 tiradas paga algo, así que el saldo se mueve menos que en las otras tragaperras. Un loro en el rodillo 5 da 4 re-tiradas seguidas.', 'Almost 1 spin in 3 pays something, so your balance swings less than in the other slots. A parrot on reel 5 gives 4 respins in a row.'),
    };
  },
  angler: (lang) => {
    const NAMES: Record<string, [string, string]> = { sardine: ['Sardina', 'Sardine'], bream: ['Dorada', 'Sea bream'], swordfish: ['Pez espada', 'Swordfish'], lanternfish: ['Pez linterna', 'Lanternfish'], goldshark: ['Tiburón dorado', 'Golden shark'] };
    return {
      idea: L(lang, 'Aquí no hay suerte "a ver qué sale": tú eliges el pez. Cada pez paga más o menos según lo raro que es, así que todos los peces devuelven lo mismo de media. Lo único que cambia es si quieres ganar poco a menudo o mucho de vez en cuando.', 'You pick the fish. Each one pays according to how rare it is, so every fish returns about the same on average. All that changes is whether you want to win little often or a lot rarely.'),
      rowsTitle: L(lang, 'Si eliges…', 'If you pick…'),
      rows: (['sardine', 'bream', 'swordfish', 'lanternfish', 'goldshark'] as const).map((f) => ({ label: L(lang, NAMES[f][0], NAMES[f][1]), p: ANGLER_FISH[f].p, mult: anglerMultiplier(f) })),
      rtp: anglerReturn('octopus'),
      formula: L(lang, 'Premio ≈ 1 ÷ probabilidad (por ejemplo, la dorada pica el 14 % → ×7,1). A eso se le resta lo que cuestan las capturas malas: 8 % × la mitad de la apuesta = 4 %. Por eso el retorno es ≈95–96 %. (El simulador cuenta también la fianza que se juega en cada lanzamiento, por eso su porcentaje sale algo más alto.)', 'Prize ≈ 1 ÷ chance (e.g. sea bream bites 14 % → ×7.1). Bad catches cost 8 % × half the bet = 4 %, so the return is ≈95–96 %. (The simulator also counts the bond put down with each cast, so its percentage looks a bit higher.)'),
      example: L(lang, 'Si siempre eliges el tiburón dorado, ganarás 1 vez de cada 500 lanzamientos (×500). Si eliges la sardina, ganarás 1 de cada 3, pero solo ×2,9. A la larga, las dos cosas te dejan casi igual.', 'Always picking the golden shark wins 1 cast in 500 (×500). Picking the sardine wins 1 in 3, but only ×2.9. In the long run both leave you about the same.'),
    };
  },
  penguin: (lang) => ({
    idea: L(lang, 'Igual que cruzar la calle, pero sobre hielo: cada bloque tiene la misma probabilidad de romperse, y el multiplicador está calculado para que retirarte en cualquier momento devuelva el 99 % de media.', 'Like crossing the road, but on ice: every floe has the same chance to crack, and the multiplier is set so cashing out at any point returns 99 % on average.'),
    rowsTitle: L(lang, 'En dificultad media, llegar a…', 'On medium, reaching…'),
    rows: [1, 3, 5, 8, 12].map((k) => ({ label: L(lang, `${k} saltos`, `${k} hops`), p: penguinSurvival('medium', k), mult: penguinMultiplier('medium', k) })),
    rtp: 0.99,
    formula: L(lang, `Probabilidad de llegar a k saltos = (1 − ${PENGUIN_CONFIG.medium.crack})^k. Multiplicador = 0,99 ÷ esa probabilidad. Por eso multiplicador × probabilidad = 0,99 siempre.`, `Chance to reach k hops = (1 − ${PENGUIN_CONFIG.medium.crack})^k. Multiplier = 0.99 ÷ that chance, so multiplier × chance = 0.99 always.`),
    example: L(lang, 'Retirarte pronto o tarde no cambia el retorno medio: solo cambia cuánto arriesgas en cada ronda. Que lleves varios saltos buenos no hace más probable que el siguiente aguante.', 'Cashing out early or late does not change the average return, only how much you risk per round. A run of good hops does not make the next one safer.'),
  }),
  horses: (lang) => ({
    idea: L(lang, 'La casa calcula sus cuotas simulando la carrera, pero solo tiene en cuenta en parte si a cada caballo le gustan el terreno y la distancia. Analizar eso es tu ventaja; apostar al azar te cuesta caro.', 'The bookmaker prices the race by simulating it, but only partly accounts for whether each horse likes the ground and trip. Studying that is your edge; betting at random costs you.'),
    rowsTitle: L(lang, 'Con 8 caballos, la probabilidad de acertar…', 'With 8 runners, the chance of getting right…'),
    rows: [
      { label: L(lang, 'El favorito gana (simulado)', 'The favourite wins (simulated)'), p: 0.43, mult: null },
      { label: L(lang, 'Colocado con un caballo al azar', 'Place with a random horse'), p: 3 / 8, mult: null },
      { label: L(lang, 'Ganador con un caballo al azar', 'Win with a random horse'), p: 1 / 8, mult: null },
      { label: L(lang, 'Gemela al azar', 'Random quinella'), p: 1 / 28, mult: null },
      { label: L(lang, 'Trío reversa al azar', 'Random trifecta box'), p: 1 / 56, mult: null },
      { label: L(lang, 'Trío en orden al azar', 'Random trifecta'), p: 1 / 336, mult: null },
    ],
    rtp: null,
    formula: L(lang, 'Cuota = (1 − margen) ÷ probabilidad que calcula la casa. Margen: 15 % ganador, 18 % colocado, 20–25 % gemelas y tríos.', 'Odds = (1 − margin) ÷ the bookmaker’s probability. Margin: 15 % win, 18 % place, 20–25 % quinellas and trifectas.'),
    example: L(lang, 'En simulación, apostar a ganador al azar devuelve ≈ 79 %, siempre al favorito ≈ 88 %, y un trío al azar ≈ 34 %. Elegir caballos a los que les gustan el terreno y la distancia del día se acercó al 110 % (con bastante margen de error).', 'In simulation, random win bets return ≈ 79 %, always backing the favourite ≈ 88 %, and a random trifecta ≈ 34 %. Picking horses that like the day’s ground and trip came close to 110 % (with a sizeable margin of error).'),
  }),
  scratch: (lang) => ({
    idea: L(lang, 'Un rasca y gana no se decide al rascar: el premio ya está escrito cuando compras el billete. Rascar solo te enseña lo que había debajo.', 'A scratch card is not decided while you scratch: the prize is already printed when you buy it. Scratching only shows what was underneath.'),
    rowsTitle: L(lang, 'Probabilidad de que el billete tenga premio', 'Chance that a ticket wins anything'),
    rows: (['tapas', 'playa', 'feria', 'siesta', 'paella'] as const).map((c) => ({ label: L(lang, `${SCRATCH[c].price} fichas`, `${SCRATCH[c].price} chips`), p: scratchHit(c), mult: scratchRtp(c) })),
    rtp: scratchRtp('playa'),
    formula: L(lang, 'Retorno = Σ premio × probabilidad. Por ejemplo, en Tapas de Oro: 1×18 % + 2×10 % + 3×5 % + 5×3 % + 20×0,6 % + 100×0,08 % = 0,88. De cada 100 fichas en billetes vuelven 88 de media. (La columna de la derecha es ese retorno, no un multiplicador.)', 'Return = Σ prize × chance. For Tapas de Oro: 1×18 % + 2×10 % + 3×5 % + 5×3 % + 20×0.6 % + 100×0.08 % = 0.88. Out of every 100 chips spent on tickets, 88 come back on average. (The right column is that return, not a multiplier.)'),
    example: L(lang, 'Muchos premios son "te devuelvo lo que pagaste": cuentan como premio pero no ganas nada. Y los grandes (×1.000, ×5.000) salen menos de una vez cada 10.000 billetes.', 'Many prizes are "you get your money back": they count as a win but you gain nothing. And the big ones (×1,000, ×5,000) come up less than once every 10,000 tickets.'),
  }),
  wheel: (lang) => ({
    idea: L(lang, 'Mismo retorno en los tres riesgos (99 %): cambia cómo llega el dinero, no cuánto pierdes de media.', 'Same return on all three risks (99 %): only how the money arrives changes, not how much you lose on average.'),
    rowsTitle: L(lang, 'En riesgo medio, de 30 casillas…', 'On medium risk, of 30 segments…'),
    rows: [
      { label: '×1,5', p: 6 / 30, mult: 1.5 },
      { label: '×2', p: 5 / 30, mult: 2 },
      { label: '×3', p: 2 / 30, mult: 3 },
      { label: '×4,7', p: 1 / 30, mult: 4.7 },
      { label: L(lang, 'Nada', 'Nothing'), p: 16 / 30, mult: 0 },
    ],
    rtp: wheelRtp('medium'),
    formula: L(lang, 'Retorno = suma de todos los multiplicadores ÷ 30 casillas = 29,7 ÷ 30 = 0,99.', 'Return = sum of all multipliers ÷ 30 segments = 29.7 ÷ 30 = 0.99.'),
    example: L(lang, 'En riesgo alto solo 1 casilla de 30 paga (×29,7): ganarás 1 de cada 30 giros de media, pero mucho de golpe.', 'On high risk only 1 segment in 30 pays (×29.7): you win 1 spin in 30 on average, but big.'),
  }),
  towers: (lang) => ({
    idea: L(lang, 'Cada piso es una apuesta nueva con las mismas probabilidades. Subir más alto multiplica el premio porque cada vez es más difícil llegar.', 'Each floor is a fresh bet with the same odds. Climbing higher multiplies the prize because getting there is harder and harder.'),
    rowsTitle: L(lang, 'En medio (3 puertas, 1 huevo), llegar a…', 'On medium (3 doors, 1 egg), reaching…'),
    rows: [1, 2, 4, 8].map((k) => ({ label: L(lang, `Piso ${k}`, `Floor ${k}`), p: (2 / 3) ** k, mult: towerMultiplier('medium', k) })),
    rtp: 0.99,
    formula: L(lang, 'Premio en el piso k = 0,99 ÷ (2/3)^k. Por eso el piso 8 paga ×25 pero solo llegas un 3,9 % de las veces.', 'Prize at floor k = 0.99 ÷ (2/3)^k. That is why floor 8 pays ×25 but you only get there 3.9 % of the time.'),
    example: L(lang, 'Retirarte pronto no cambia el retorno medio (99 %), solo hace los resultados menos extremos.', 'Cashing out early doesn’t change the average return (99 %), it just makes results less extreme.'),
  }),
  diamonds: (lang) => {
    const st = diamondStats();
    return {
      idea: L(lang, 'Como el póker pero con colores. Lo más normal es sacar una pareja, que solo te devuelve una décima parte.', 'Like poker but with colours. The most common result is a pair, which only gives you a tenth back.'),
      rowsTitle: L(lang, 'Al sacar 5 gemas…', 'Drawing 5 gems…'),
      rows: (['pair', 'twoPair', 'three', 'full', 'four', 'five'] as const).map((h) => ({ label: L(lang, { pair: 'Pareja', twoPair: 'Doble pareja', three: 'Trío', full: 'Full', four: 'Cuatro', five: 'Cinco iguales' }[h], { pair: 'Pair', twoPair: 'Two pair', three: 'Three', full: 'Full house', four: 'Four', five: 'Five alike' }[h]), p: st.probs[h], mult: DIAMOND_PAYS[h] })),
      rtp: st.rtp,
      formula: L(lang, 'Calculado contando las 16 807 combinaciones posibles (7 colores elevado a 5 gemas).', 'Computed by counting all 16,807 possible combinations (7 colours to the power of 5 gems).'),
      example: L(lang, 'Cinco iguales sale 1 vez cada 2 401 jugadas: paga ×67, pero no lo esperes pronto.', 'Five alike comes once every 2,401 plays: it pays ×67, but don’t expect it soon.'),
    };
  },
  pump: (lang) => ({
    idea: L(lang, 'El globo no se «cansa»: cada bombeo tiene la misma probabilidad de reventar que el anterior.', 'The balloon doesn’t “get tired”: every pump has the same chance to pop as the last.'),
    rowsTitle: L(lang, 'En medio (10 % por bombeo), sobrevivir a…', 'On medium (10 % per pump), surviving…'),
    rows: [1, 3, 5, 10].map((k) => ({ label: L(lang, `${k} bombeos`, `${k} pumps`), p: 0.9 ** k, mult: pumpMultiplier('medium', k) })),
    rtp: 0.99,
    formula: L(lang, 'Premio tras k bombeos = 0,99 ÷ 0,9^k.', 'Prize after k pumps = 0.99 ÷ 0.9^k.'),
    example: L(lang, 'Si siempre cobras a los 5 bombeos ganas el 59 % de las veces ×1,67: a la larga, 99 % de retorno.', 'Always cashing out at 5 pumps wins 59 % of the time ×1.67: in the long run, 99 % return.'),
  }),
  dragontiger: (lang) => {
    const s = dtStats();
    return {
      idea: L(lang, 'Parece 50/50, pero el empate (7,5 %) se come la mitad de tu apuesta: esa es la ventaja de la casa.', 'It looks 50/50, but the tie (7.5 %) eats half your bet: that is the house edge.'),
      rowsTitle: L(lang, 'Apostando al Dragón…', 'Betting on Dragon…'),
      rows: [
        { label: L(lang, 'Gana el Dragón', 'Dragon wins'), p: s.side, mult: 2 },
        { label: L(lang, 'Empate (recuperas la mitad)', 'Tie (half back)'), p: s.tie, mult: 0.5 },
        { label: L(lang, 'Gana el Tigre', 'Tiger wins'), p: s.side, mult: 0 },
      ],
      rtp: s.rtpSide,
      formula: L(lang, 'Con 8 barajas: P(empate) = 13 × 32 × 31 ÷ (416 × 415) = 7,47 %.', 'With 8 decks: P(tie) = 13 × 32 × 31 ÷ (416 × 415) = 7.47 %.'),
      example: L(lang, 'El empate paga 11 a 1 pero sale 1 de cada 13 veces: devuelve solo el 89,6 %. La peor apuesta de la mesa.', 'Tie pays 11 to 1 but lands 1 time in 13: it returns only 89.6 %. The worst bet on the table.'),
    };
  },
  videopoker: (lang) => ({
    idea: L(lang, 'Juegas contra una tabla de premios fija, no contra otros jugadores. Elegir bien qué cartas guardas sí cambia lo que te devuelve la máquina.', 'You play against a fixed pay table, not other players. Choosing well what to hold really changes what the machine returns.'),
    rowsTitle: L(lang, 'Jugando con la pista, la mano final es…', 'Playing the hint, the final hand is…'),
    rows: [
      { label: L(lang, 'Pareja de J o más', 'Jacks or better'), p: 0.2141, mult: VP_PAYS.jacks },
      { label: L(lang, 'Doble pareja', 'Two pair'), p: 0.1301, mult: VP_PAYS.twoPair },
      { label: L(lang, 'Trío', 'Three of a kind'), p: 0.07434, mult: VP_PAYS.trips },
      { label: L(lang, 'Escalera', 'Straight'), p: 0.01072, mult: VP_PAYS.straight },
      { label: L(lang, 'Color', 'Flush'), p: 0.01104, mult: VP_PAYS.flush },
      { label: L(lang, 'Full', 'Full house'), p: 0.01149, mult: VP_PAYS.fullHouse },
      { label: L(lang, 'Póker', 'Four of a kind'), p: 0.002321, mult: VP_PAYS.quads },
      { label: L(lang, 'Escalera real', 'Royal flush'), p: 0.00002333, mult: VP_PAYS.royal },
    ],
    rtp: VP_REFERENCE_RTP,
    formula: L(lang, 'Frecuencias de una simulación de 1,5 millones de manos con la estrategia de la pista 💡. Con juego perfecto, el retorno publicado para esta tabla (9/6) es 99,54 %; si guardas mal, baja varios puntos.', 'Frequencies from a 1.5-million-hand simulation using the 💡 hint strategy. With perfect play the published return for this 9/6 table is 99.54 %; holding badly costs several points.'),
    example: L(lang, 'Casi 1 de cada 2 manos paga algo, pero la mayoría solo te devuelve la apuesta. La escalera real sale 1 vez cada ~40 000 manos.', 'Almost 1 hand in 2 pays something, but most just give your bet back. A royal flush lands about once every 40,000 hands.'),
  }),
  trader: (lang) => ({
    idea: L(lang, 'Apuestas a si un precio acabará más alto o más bajo. Se mueve al azar: igual de fácil que suba que que baje.', 'You bet on whether a price ends higher or lower. It moves at random: up is as likely as down.'),
    rowsTitle: L(lang, 'Elijas lo que elijas…', 'Whatever you pick…'),
    rows: [
      { label: L(lang, 'Aciertas el sentido', 'You call it right'), p: 0.5, mult: TRADER_MULTIPLIER },
      { label: L(lang, 'Fallas', 'You call it wrong'), p: 0.5, mult: 0 },
    ],
    rtp: 0.99,
    formula: L(lang, 'Pago = 0,99 ÷ 0,5 = ×1,98. Que haya subido antes no cambia nada: cada movimiento es independiente.', 'Payout = 0.99 ÷ 0.5 = ×1.98. Past rises change nothing: each move is independent.'),
    example: L(lang, 'Con 20 fichas: aciertas y te devuelven 39; fallas y pierdes 20. Como en la bolsa de verdad a corto plazo, es una moneda al aire.', 'With 20 chips: right and you get 39 back; wrong and you lose 20. Like the real market in the very short term, it is a coin toss.'),
  }),
  poker: (lang) => ({
    idea: L(lang, 'Aquí no juegas contra la casa sino contra otros jugadores. Gana la mejor jugada de 5 cartas… o quien consigue que los demás se retiren.', 'Here you do not play against the house but against other players. The best 5-card hand wins… or whoever makes the others fold.'),
    rowsTitle: L(lang, 'Con 7 cartas, terminas teniendo…', 'With 7 cards you end up with…'),
    rows: [
      { label: L(lang, 'Pareja', 'One pair'), p: 0.438, mult: null },
      { label: L(lang, 'Doble pareja', 'Two pair'), p: 0.235, mult: null },
      { label: L(lang, 'Carta alta', 'High card'), p: 0.174, mult: null },
      { label: L(lang, 'Trío', 'Three of a kind'), p: 0.0483, mult: null },
      { label: L(lang, 'Escalera', 'Straight'), p: 0.0462, mult: null },
      { label: L(lang, 'Color', 'Flush'), p: 0.0303, mult: null },
      { label: L(lang, 'Full', 'Full house'), p: 0.026, mult: null },
      { label: L(lang, 'Póker', 'Four of a kind'), p: 0.00168, mult: null },
    ],
    rtp: null,
    formula: L(lang, 'La clave es comparar tu probabilidad de ganar la mano con lo que te cuesta seguir («pot odds»). Si pagas 10 para ganar un bote de 40, te basta con ganar más de 1 de cada 5 veces.', 'The key is comparing your chance to win with what it costs to continue (“pot odds”). Paying 10 to win a pot of 40 only needs you to win more than 1 time in 5.'),
    example: L(lang, 'Cuanto más rara es una jugada, más alta está: por eso el color (3 %) gana a la escalera (4,6 %).', 'The rarer a hand, the higher it ranks: that is why a flush (3 %) beats a straight (4.6 %).'),
  }),
};

export function gameModel(game: GameId, lang: Lang): GameModel {
  return MODELS[game](lang);
}

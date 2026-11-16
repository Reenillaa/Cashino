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
import { ROULETTE_PAYS } from '@/engine/games/roulette.ts';
import { SICBO_PAYS, TOTAL_PAYS, sicBoExpectedReturn, sicBoWinProbability } from '@/engine/games/sicbo.ts';
import { BACCARAT_PAYS } from '@/engine/games/baccarat.ts';
import { guessProbability } from '@/engine/games/hilo.ts';
import { parseCard } from '@/engine/cards/cards.ts';
import { SLOT_ONE_CHERRY, SLOT_THREE, SLOT_TWO_CHERRIES, SLOT_WEIGHTS, slotsStats } from '@/engine/games/slots.ts';
import { TRADER_MULTIPLIER } from '@/engine/games/trader.ts';

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
      { label: L(lang, 'Un número (pleno)', 'One number'), p: 1 / 37, mult: ROULETTE_PAYS.straight + 1 },
    ],
    rtp: 36 / 37,
    formula: L(lang, 'Se paga como si hubiera 36 casillas, pero hay 37. Por eso, de cada 37 fichas apostadas, vuelven 36.', 'It pays as if there were 36 pockets, but there are 37. So for every 37 chips bet, 36 come back.'),
    example: L(lang, `20 fichas al rojo: cobras 40 un ${fmtPct(lang, 18 / 37)} de las veces. Al 17: cobras 720, pero 1 vez de cada 37.`, `20 chips on red: you collect 40 ${fmtPct(lang, 18 / 37)} of the time. On 17: you collect 720, but 1 time in 37.`),
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

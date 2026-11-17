import type React from 'react';
import type { GameId } from '@/engine/games/types.ts';
import PokerScreen from './poker/Screen';
import BlackjackScreen from './blackjack/Screen';
import CrashScreen from './crash/Screen';
import DiceScreen from './dice/Screen';
import MinesScreen from './mines/Screen';
import PlinkoScreen from './plinko/Screen';
import CrossingScreen from './crossing/Screen';
import RouletteScreen from './roulette/Screen';
import LimboScreen from './limbo/Screen';
import CoinflipScreen from './coinflip/Screen';
import BaccaratScreen from './baccarat/Screen';
import HiloScreen from './hilo/Screen';
import KenoScreen from './keno/Screen';
import SicBoScreen from './sicbo/Screen';
import SlotsScreen from './slots/Screen';
import TraderScreen from './trader/Screen';
import VideoPokerScreen from './videopoker/Screen';
import WheelScreen from './wheel/Screen';
import TowersScreen from './towers/Screen';
import DiamondsScreen from './diamonds/Screen';
import PumpScreen from './pump/Screen';
import CascadeScreen from './cascade/Screen';
import FishingScreen from './fishing/Screen';
import JadeScreen from './jade/Screen';
import GoldmineScreen from './goldmine/Screen';
import FruitsScreen from './fruits/Screen';
import PirateScreen from './pirate/Screen';
import AnglerScreen from './angler/Screen';
import PenguinScreen from './penguin/Screen';
import DragonTigerScreen from './dragontiger/Screen';
import HorsesScreen from './horses/Screen';

type GameScreen = React.ComponentType<{ forceTutorial?: boolean }>;

export const GAME_SCREENS: Record<GameId, GameScreen> = {
  poker: PokerScreen,
  blackjack: BlackjackScreen,
  crash: CrashScreen,
  dice: DiceScreen,
  mines: MinesScreen,
  plinko: PlinkoScreen,
  crossing: CrossingScreen,
  roulette: RouletteScreen,
  limbo: LimboScreen,
  coinflip: CoinflipScreen,
  baccarat: BaccaratScreen,
  hilo: HiloScreen,
  keno: KenoScreen,
  sicbo: SicBoScreen,
  slots: SlotsScreen,
  trader: TraderScreen,
  videopoker: VideoPokerScreen,
  wheel: WheelScreen,
  towers: TowersScreen,
  diamonds: DiamondsScreen,
  pump: PumpScreen,
  cascade: CascadeScreen,
  fishing: FishingScreen,
  jade: JadeScreen,
  goldmine: GoldmineScreen,
  fruits: FruitsScreen,
  pirate: PirateScreen,
  angler: AnglerScreen,
  penguin: PenguinScreen,
  dragontiger: DragonTigerScreen,
  horses: HorsesScreen,
};

import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Chip, Segmented, Surface, T, formatCoins } from '@/design/components';
import { useT } from '@/i18n';
import { useGameSession, PlayError } from '@/features/play/session';
import { useSession } from '@/state/session';
import { GameShell } from '../shared/GameShell';
import { usePlayErrors } from '../shared/hooks';
import { META } from '../catalog';
import { PokerTableView } from './Table';
import { usePokerGame, type PokerSetup } from './usePokerGame';
import type { BotDifficulty } from '@/engine/poker/bots.ts';

const tint = META.poker.tint;
const STAKES = [
  { sb: 5, bb: 10, buyIn: 1000 },
  { sb: 25, bb: 50, buyIn: 5000 },
  { sb: 100, bb: 200, buyIn: 20000 },
];

export default function PokerScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const router = useRouter();
  const s = useGameSession('poker');
  const signedIn = useSession((st) => !!st.userId);
  const game = usePokerGame();
  const onError = usePlayErrors();
  const [format, setFormat] = useState<'cash' | 'sng'>('cash');
  const [opponents, setOpponents] = useState(4);
  const [difficulty, setDifficulty] = useState<BotDifficulty>('medium');
  const [stake, setStake] = useState(0);
  // Signed-in players play bots locally in practice; coins at stake online go through the server tables.
  const practice = s.mode === 'practice' || signedIn;
  const balance = practice ? s.balance : s.balance;
  const sit = () => {
    const cfg: PokerSetup = { format, opponents, difficulty, stakes: format === 'sng' ? { sb: 10, bb: 20, buyIn: STAKES[stake].buyIn / 2 } : STAKES[stake], practice };
    if (!game.start(cfg)) onError(new PlayError('insufficient'));
  };
  const table = game.table;
  return (
    <GameShell
      game="poker"
      mode={practice ? 'practice' : s.mode}
      balance={balance}
      locked={!!table}
      forceTutorial={forceTutorial}
      stage={
        table ? (
          <View style={{ flex: 1 }}>
            <PokerTableView table={table} heroSeat={0} equity={game.equity} onAction={game.heroAct} />
            {game.finished && (
              <Surface level={2} style={{ position: 'absolute', left: 24, right: 24, top: '30%', alignItems: 'center', gap: 10 }}>
                <T variant="headline" align="center">
                  {game.finished.place === 1 ? t('poker.tournamentWon') : game.finished.place > 0 ? t('poker.place', { n: game.finished.place }) : t('poker.eliminated')}
                </T>
                {game.finished.prize > 0 && <T variant="title" color="win" tabular>+{formatCoins(game.finished.prize)} Ti</T>}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {game.setup?.format === 'cash' && <Button title={t('poker.rebuy')} size="md" onPress={game.rebuy} />}
                  <Button title={t('poker.leave')} kind="secondary" size="md" onPress={game.leave} />
                </View>
              </Surface>
            )}
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, gap: 14, paddingBottom: 20 }}>
            <T variant="title">{t('poker.vsBots')}</T>
            <Segmented value={format} onChange={setFormat} options={[{ value: 'cash', label: t('poker.cash') }, { value: 'sng', label: t('poker.tournament') }]} />
            <T variant="caption" color="text3">{t('poker.seats')}</T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[1, 2, 3, 4, 5].map((n) => <Chip key={n} label={`${n + 1}`} selected={opponents === n} tint={tint} onPress={() => setOpponents(n)} />)}
            </View>
            <T variant="caption" color="text3">{t('poker.difficulty')}</T>
            <Segmented value={difficulty} onChange={setDifficulty} options={[{ value: 'easy', label: t('poker.easy') }, { value: 'medium', label: t('poker.medium') }, { value: 'advanced', label: t('poker.advanced') }]} />
            <T variant="caption" color="text3">{t('poker.buyIn')}</T>
            <View style={{ gap: 8 }}>
              {STAKES.map((st, i) => (
                <Chip
                  key={i}
                  selected={stake === i}
                  tint={tint}
                  onPress={() => setStake(i)}
                  label={format === 'cash' ? `${t('poker.blinds', { sb: st.sb, bb: st.bb })} · ${formatCoins(st.buyIn)} Ti` : `${t('poker.buyIn')} ${formatCoins(st.buyIn / 2)} Ti · 1.500 chips`}
                />
              ))}
            </View>
            {signedIn && <T variant="footnote" color="text3">{t('common.practiceBanner')}</T>}
          </ScrollView>
        )
      }
      controls={
        table ? null : (
          <View style={{ gap: 10 }}>
            <Button title={t('common.play')} onPress={sit} />
            <Button title={t('poker.online')} kind="secondary" icon="users" onPress={() => router.push('/online')} />
          </View>
        )
      }
    />
  );
}

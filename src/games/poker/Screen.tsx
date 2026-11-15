import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Chip, GameLogo, Segmented, Slider, Surface, T, formatCoins } from '@/design/components';
import { useT } from '@/i18n';
import { useGameSession, PlayError } from '@/features/play/session';
import { useSession } from '@/state/session';
import { GameShell } from '../shared/GameShell';
import { usePlayErrors } from '../shared/hooks';
import { META } from '../catalog';
import { PokerTableView } from './Table';
import { usePokerGame, type PokerSetup } from './usePokerGame';
import type { BotDifficulty } from '@/engine/poker/bots.ts';
import { Felt } from '../shared/Felt';
import { MoreOptions } from '../shared/MoreOptions';

const tint = META.poker.tint;

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
  const room = s.room;
  const [buyInPick, setBuyIn] = useState<{ room: string; v: number } | null>(null);
  const buyIn = buyInPick?.room === room.id ? buyInPick.v : room.max;
  // Signed-in players play bots locally in practice; coins at stake online go through the server tables.
  const practice = s.mode === 'practice' || signedIn;
  const sit = () => {
    // Cash: buy-in inside the room range. Sit & Go: entry = room minimum, 1,500 tournament chips each.
    const cfg: PokerSetup = {
      format, opponents, difficulty, practice,
      stakes: format === 'sng' ? { sb: room.poker.sb, bb: room.poker.bb, buyIn: room.min } : { sb: room.poker.sb, bb: room.poker.bb, buyIn },
    };
    if (!game.start(cfg)) onError(new PlayError('insufficient'));
  };
  const table = game.table;
  return (
    <GameShell
      game="poker"
      mode={practice ? 'practice' : s.mode}
      balance={s.balance}
      locked={!!table}
      describeRoom={(r) => `${t('rooms.blinds', { sb: r.poker.sb, bb: r.poker.bb })} · ${t('rooms.buyIn', { min: formatCoins(r.min), max: formatCoins(r.max) })}`}
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
                {game.finished.prize > 0 && <T variant="title" color="win" tabular>+{formatCoins(game.finished.prize)} {t('common.coins')}</T>}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {game.setup?.format === 'cash' && <Button title={t('poker.rebuy')} size="md" onPress={game.rebuy} />}
                  <Button title={t('poker.leave')} kind="secondary" size="md" onPress={game.leave} />
                </View>
              </Surface>
            )}
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, gap: 14, paddingBottom: 20 }}>
            <Felt shape="oval" colors={['#2E7D5B', '#0E3B2C']} style={{ height: 210, marginTop: 6 }}>
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <GameLogo game="poker" size={96} />
                <T weight="display" style={{ color: '#fff', fontSize: 22, marginTop: 6 }}>{t('poker.vsBots')}</T>
                <T variant="footnote" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {opponents + 1} {t('poker.seats').toLowerCase()} · {t(`poker.${difficulty}`)} · {formatCoins(format === 'sng' ? room.min : buyIn)} {t('common.coins')}
                </T>
              </View>
            </Felt>
            <MoreOptions game="poker" summary={`${format === 'cash' ? t('poker.cash') : t('poker.tournament')} · ${t('poker.blinds', { sb: room.poker.sb, bb: room.poker.bb })}`}>
            <View style={{ gap: 14 }}>
            <Segmented value={format} onChange={setFormat} options={[{ value: 'cash', label: t('poker.cash') }, { value: 'sng', label: t('poker.tournament') }]} />
            <T variant="caption" color="text3">{t('poker.seats')}</T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[1, 2, 3, 4, 5].map((n) => <Chip key={n} label={`${n + 1}`} selected={opponents === n} tint={tint} onPress={() => setOpponents(n)} />)}
            </View>
            <T variant="caption" color="text3">{t('poker.difficulty')}</T>
            <Segmented value={difficulty} onChange={setDifficulty} options={[{ value: 'easy', label: t('poker.easy') }, { value: 'medium', label: t('poker.medium') }, { value: 'advanced', label: t('poker.advanced') }]} />
            <T variant="caption" color="text3">{t('poker.buyIn')}</T>
            <Surface level={2} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <T variant="title" tabular>{formatCoins(format === 'sng' ? room.min : buyIn)} <T variant="callout" color="text3">{t('common.coins')}</T></T>
                <T variant="footnote" color="text3">{t('poker.blinds', { sb: room.poker.sb, bb: room.poker.bb })}</T>
              </View>
              {format === 'cash' ? (
                <Slider value={buyIn} min={room.min} max={room.max} step={Math.max(1, room.min / 2)} tint={tint} onChange={(v) => setBuyIn({ room: room.id, v })} accessibilityLabel={t('poker.buyIn')} />
              ) : (
                <T variant="footnote" color="text3">1.500 chips · 🏆 65 % / 35 %</T>
              )}
            </Surface>
            </View>
            </MoreOptions>
            {signedIn && <T variant="footnote" color="text3">{t('common.practiceBanner')}</T>}
          </ScrollView>
        )
      }
      controls={
        table ? null : (
          <View style={{ gap: 10 }}>
            <Button title={t('common.play')} onPress={sit} />
            <Button title={t('poker.online')} kind="ghost" size="sm" icon="users" onPress={() => router.push('/online')} />
          </View>
        )
      }
    />
  );
}

import React from 'react';
import { Alert, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { ListGroup, ListRow, Screen, Section, Segmented, Slider, T, ToggleRow } from '@/design/components';
import { SCREEN_PAD } from '@/design/tokens';
import { useT } from '@/i18n';
import { useSettings } from '@/state/settings';
import { useSession } from '@/state/session';
import { useWallet } from '@/state/wallet';
import { useProgress } from '@/state/progress';
import { useLearning } from '@/state/learning';
import { supabase, callFn, onlineConfigured } from '@/services/supabase';
import { scheduleDailyReminder } from '@/services/notifications';
import { changeTimeLimit, dayOf, useWellbeing } from '@/state/wellbeing';
import { useSaver } from '@/state/saver';
import { useNow } from '@/features/time/useNow';

function confirm(title: string, body: string, onOk: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${body}`)) onOk();
    return;
  }
  Alert.alert(title, body, [{ text: 'Cancel', style: 'cancel' }, { text: 'OK', style: 'destructive', onPress: onOk }]);
}

const TIME_STEPS = [0, 30, 60, 90, 120, 180];
const LOSS_STEPS = [0, 500, 1000, 2500, 5000, 10000];
const next = (steps: number[], v: number) => steps[(Math.max(0, steps.indexOf(v)) + 1) % steps.length];

export default function Settings() {
  const { t } = useT();
  const router = useRouter();
  const s = useSettings();
  const saverOn = useSaver((x) => x.active);
  const pendingRaw = useWellbeing((x) => x.pendingLimit);
  const now = useNow(60_000);
  const pending = pendingRaw && dayOf(now) < pendingRaw.from ? pendingRaw : null;
  const signedIn = useSession((x) => !!x.userId);
  const email = useSession((x) => x.email);
  const profile = useSession((x) => x.profile);
  const setPrivacy = (patch: Partial<typeof s.privacy>) => {
    const privacy = { ...s.privacy, ...patch };
    s.set({ privacy });
    if (supabase && profile) void supabase.from('profiles').update({ is_public: privacy.publicProfile, show_online: privacy.showOnline, allow_invites: privacy.allowInvites }).eq('id', profile.id);
  };
  const setNotif = async (patch: Partial<typeof s.notifications>) => {
    const notifications = { ...s.notifications, ...patch };
    if (patch.daily) {
      const perm = await Notifications.requestPermissionsAsync().catch(() => ({ granted: false }));
      if (!perm.granted) notifications.daily = false;
    }
    s.set({ notifications });
    void scheduleDailyReminder(notifications.daily);
  };
  return (
    <Screen title={t('settings.title')} back tabBar={false}>
      <Section title={t('settings.appearance')}>
        <View style={{ paddingHorizontal: SCREEN_PAD, gap: 12 }}>
          <Segmented value={s.language} onChange={(language) => s.set({ language })} options={[{ value: 'es', label: t('settings.spanish') }, { value: 'en', label: t('settings.english') }, { value: 'system', label: t('settings.system') }]} />
        </View>
      </Section>
      <Section title={t('settings.sound')}>
        <ListGroup>
          <ToggleRow icon="volume" title={t('settings.effects')} value={s.sound} onChange={(sound) => s.set({ sound })} />
          <ToggleRow icon="music" title={t('settings.music')} value={s.music} onChange={(music) => s.set({ music })} />
          <ToggleRow icon="vibrate" title={t('settings.haptics')} value={s.haptics} onChange={(haptics) => s.set({ haptics })} />
        </ListGroup>
        <View style={{ paddingHorizontal: SCREEN_PAD + 4, marginTop: 10 }}>
          <T variant="footnote" color="text3">{t('settings.effects')} · {t('settings.volume')}</T>
          <Slider value={Math.round(s.soundVolume * 100)} min={0} max={100} step={5} onChange={(v) => s.set({ soundVolume: v / 100 })} accessibilityLabel={`${t('settings.effects')} ${t('settings.volume')}`} />
          <T variant="footnote" color="text3">{t('settings.music')} · {t('settings.volume')}</T>
          <Slider value={Math.round(s.musicVolume * 100)} min={0} max={100} step={5} onChange={(v) => s.set({ musicVolume: v / 100 })} accessibilityLabel={`${t('settings.music')} ${t('settings.volume')}`} />
        </View>
      </Section>
      <Section title={t('settings.graphics')}>
        <ListGroup>
          <ToggleRow icon="sparkles" title={t('settings.animations')} value={s.animations} onChange={(animations) => s.set({ animations })} />
          <ToggleRow icon="layers" title={t('settings.reduceMotion')} value={s.reduceMotion} onChange={(reduceMotion) => s.set({ reduceMotion })} />
          <ToggleRow icon="eye" title={t('settings.reduceEffects')} value={s.reduceEffects} onChange={(reduceEffects) => s.set({ reduceEffects })} />
          <ToggleRow icon="sun" title={t('limits.autoSaver')} value={s.autoSaver} onChange={(autoSaver) => s.set({ autoSaver })} />
        </ListGroup>
        <T variant="caption" color="text3" style={{ paddingHorizontal: SCREEN_PAD, marginTop: 6 }}>{saverOn ? t('limits.saverOn') : t('limits.autoSaverBody')}</T>
        <View style={{ paddingHorizontal: SCREEN_PAD, marginTop: 10 }}>
          <Segmented size="sm" value={s.quality} onChange={(quality) => s.set({ quality })} options={[{ value: 'high', label: t('settings.qualityHigh') }, { value: 'balanced', label: t('settings.qualityBalanced') }, { value: 'low', label: t('settings.qualityLow') }]} />
        </View>
      </Section>
      <Section title={t('settings.gameplay')}>
        <ListGroup footer={t('settings.responsibleBody')}>
          <ToggleRow icon="chart" title={t('settings.showOdds')} value={s.showOdds} onChange={(showOdds) => s.set({ showOdds })} />
          <ListRow icon="clock" title={t('settings.sessionReminder')} value={s.breakReminderMin ? t('settings.every', { n: s.breakReminderMin }) : t('settings.never')} onPress={() => s.set({ breakReminderMin: s.breakReminderMin === 0 ? 30 : s.breakReminderMin === 30 ? 60 : 0 })} />
          <ListRow icon="hourglass" title={t('limits.time')} value={s.dailyTimeLimitMin ? t('limits.minutes', { n: s.dailyTimeLimitMin }) : t('limits.none')} onPress={() => changeTimeLimit(next(TIME_STEPS, s.dailyTimeLimitMin))} />
          <ListRow icon="chart" title={t('limits.loss')} value={s.dailyLossAlert ? `−${s.dailyLossAlert.toLocaleString('es-ES')}` : t('limits.none')} onPress={() => s.set({ dailyLossAlert: next(LOSS_STEPS, s.dailyLossAlert) })} />
        </ListGroup>
        <T variant="caption" color="text3" style={{ paddingHorizontal: SCREEN_PAD, marginTop: 6 }}>{pending ? t('limits.pending', { min: pending.prev }) : t('limits.body')}</T>
      </Section>
      <Section title={t('settings.notifications')}>
        <ListGroup>
          <ToggleRow icon="gift" title={t('settings.notifDaily')} value={s.notifications.daily} onChange={(daily) => void setNotif({ daily })} />
          <ToggleRow icon="users" title={t('settings.notifSocial')} value={s.notifications.social} onChange={(social) => void setNotif({ social })} />
          <ToggleRow icon="medal" title={t('settings.notifTournaments')} value={s.notifications.tournaments} onChange={(tournaments) => void setNotif({ tournaments })} />
        </ListGroup>
      </Section>
      <Section title={t('settings.privacy')}>
        <ListGroup>
          <ToggleRow icon="globe" title={t('settings.profilePublic')} value={s.privacy.publicProfile} onChange={(v) => setPrivacy({ publicProfile: v })} />
          <ToggleRow icon="eye" title={t('settings.showOnline')} value={s.privacy.showOnline} onChange={(v) => setPrivacy({ showOnline: v })} />
          <ToggleRow icon="mail" title={t('settings.allowInvites')} value={s.privacy.allowInvites} onChange={(v) => setPrivacy({ allowInvites: v })} />
        </ListGroup>
      </Section>
      <Section title={t('settings.account')}>
        <ListGroup>
          {signedIn ? (
            <>
              <ListRow icon="profile" title={email ?? ''} subtitle={profile ? `@${profile.username}` : undefined} />
              <ListRow icon="key" title={t('settings.changePassword')} onPress={() => email && supabase && void supabase.auth.resetPasswordForEmail(email)} />
              <ListRow icon="logout" title={t('settings.signOut')} onPress={() => void supabase?.auth.signOut()} />
              <ListRow icon="shield" title={t('settings.signOutAll')} onPress={() => void supabase?.auth.signOut({ scope: 'global' })} />
              <ListRow icon="share" title={t('settings.exportData')} onPress={() => void callFn<unknown>('account', { action: 'export' }).then((d) => {
                if (Platform.OS === 'web') {
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }));
                  a.download = 'my-data.json';
                  a.click();
                } else Alert.alert(t('settings.exportData'), JSON.stringify(d).slice(0, 800));
              }).catch(() => undefined)} />
              <ListRow icon="trash" destructive title={t('settings.deleteAccount')} onPress={() => confirm(t('settings.deleteAccount'), t('settings.deleteConfirm'), () => void callFn('account', { action: 'delete', confirm: 'DELETE' }).then(() => supabase?.auth.signOut()))} />
            </>
          ) : (
            <ListRow icon="profile" title={t('profile.createAccount')} subtitle={onlineConfigured ? t('profile.accountBenefits') : t('auth.notConfigured')} onPress={() => router.push('/auth')} />
          )}
        </ListGroup>
      </Section>
      <Section title={t('settings.data')}>
        <ListGroup footer={t('common.noMoneyDisclaimer')}>
          <ListRow icon="refresh" destructive title={t('settings.resetLocal')} onPress={() => confirm(t('settings.resetLocal'), t('settings.resetLocalConfirm'), () => {
            useWallet.getState().resetAll();
            useProgress.getState().resetAll();
            useLearning.getState().resetAll();
            s.reset();
          })} />
        </ListGroup>
      </Section>
      <Section title={t('settings.about')}>
        <ListGroup>
          <ListRow icon="info" title={t('settings.version')} value={Constants.expoConfig?.version ?? '1.0.0'} />
          <ListRow icon="shield" title={t('settings.responsible')} subtitle={t('settings.responsibleBody')} />
        </ListGroup>
      </Section>
    </Screen>
  );
}

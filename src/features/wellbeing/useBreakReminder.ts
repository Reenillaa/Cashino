import { useEffect, useRef } from 'react';
import { useSettings } from '@/state/settings';
import { useProgress } from '@/state/progress';
import i18n from '@/i18n';

/** Optional, gentle break reminder (off by default). Never blocks play. */
export function useBreakReminder() {
  const minutes = useSettings((s) => s.breakReminderMin);
  const started = useRef(Date.now());
  useEffect(() => {
    if (!minutes) return;
    started.current = Date.now();
    const id = setInterval(() => {
      useProgress.getState().pushToast({ kind: 'info', title: i18n.t('settings.responsible'), body: i18n.t('settings.responsibleBody') });
    }, minutes * 60_000);
    return () => clearInterval(id);
  }, [minutes]);
}

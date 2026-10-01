'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { Icon, type IconName } from './Icon';

const ICON: Record<string, IconName> = {
  ok: 'check',
  err: 'alert',
  warn: 'warning',
  info: 'info',
};

/** Toast surface — mounted once inside the authenticated shell. */
export function ToastHost() {
  const { toasts, dismissToast } = useStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div className="toast-host" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`} role="status">
          <span className="toast-ico">
            <Icon name={ICON[t.kind] ?? 'info'} size={15} />
          </span>
          <div className="grow">
            <div className="toast-title">{t.title}</div>
            {t.text ? <div className="toast-text">{t.text}</div> : null}
          </div>
          <button type="button" className="toast-x" onClick={() => dismissToast(t.id)} aria-label="Dismiss">
            <Icon name="close" size={12} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
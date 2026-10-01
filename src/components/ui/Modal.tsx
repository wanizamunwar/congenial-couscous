'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { Button } from './Button';

/* ==========================================================================
   MODAL — one dialog component used by every create/edit form.
   Locks page scroll, traps Tab focus and closes on Escape or backdrop click.
   ========================================================================== */

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: ReactNode;
  /** Sticky action bar. Omit for read-only dialogs. */
  footer?: ReactNode;
  /** Prevent closing while a save is running. */
  busy?: boolean;
  headActions?: ReactNode;
  bodyClassName?: string;
}

const SIZE_CLASS: Record<NonNullable<ModalProps['size']>, string> = {
  sm: '',
  md: 'is-md',
  lg: 'is-lg',
  xl: 'is-xl',
  full: 'is-full',
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = 'md',
  children,
  footer,
  busy = false,
  headActions,
  bodyClassName = '',
}: ModalProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (!busy) onClose();
        return;
      }
      if (e.key !== 'Tab' || !boxRef.current) return;
      const focusables = boxRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !boxRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose, busy],
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => onKey(e);
    document.addEventListener('keydown', onKeyDown, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = '';
    const timer = window.setTimeout(() => {
      const el = boxRef.current?.querySelector<HTMLElement>(
        'input:not([type=hidden]), select, textarea, [data-autofocus]',
      );
      el?.focus();
    }, 40);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(timer);
    };
  }, [open, onKey]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={boxRef}
        className={`modal ${SIZE_CLASS[size]}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
      >
        <header className="modal-head">
          <div className="grow">
            <div className="modal-title">{title}</div>
            {subtitle ? <div className="modal-sub">{subtitle}</div> : null}
          </div>
          <div className="modal-head-actions">
            {headActions}
            <Button
              size="sm"
              variant="ghost"
              iconOnly
              icon="close"
              onClick={onClose}
              aria-label="Close"
              title="Close"
              disabled={busy}
            />
          </div>
        </header>
        <div className={`modal-body ${bodyClassName}`}>{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------- Confirm --------------------------------- */

export interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Optional single input the user must type before confirming (e.g. RESET). */
  requireText?: string;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
  requireText,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');
  useEffect(() => {
    if (open) setTyped('');
  }, [open]);

  const blocked = Boolean(requireText) && typed.trim().toUpperCase() !== requireText?.toUpperCase();

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      busy={busy}
      footer={
        <>
          <span className="grow" />
          <Button onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'solid-danger' : 'primary'}
            onClick={onConfirm}
            loading={busy}
            disabled={blocked}
            icon={tone === 'danger' ? 'trash' : 'check'}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="row-t" style={{ gap: 11 }}>
        <Icon
          name={tone === 'danger' ? 'warning' : 'help'}
          size={18}
          style={{ color: tone === 'danger' ? 'var(--bad)' : 'var(--brand)', marginTop: 1 }}
        />
        <div className="grow">
          {message ? <div className="t-sm" style={{ lineHeight: 1.55, color: 'var(--ink-2)' }}>{message}</div> : null}
          {requireText ? (
            <div className="mt-3">
              <input
                className="input mono"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={requireText}
                aria-label={requireText}
                autoComplete="off"
              />
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
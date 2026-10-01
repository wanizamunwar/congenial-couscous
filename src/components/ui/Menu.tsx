'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Icon, type IconName } from './Icon';

function useOutside(onClose: () => void, active: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onClose);
    };
  }, [active, onClose]);
  return ref;
}

/** Flip the panel when it would leave the viewport. */
function useFlip(open: boolean) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const el = panelRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const next: React.CSSProperties = {};
      if (r.right > window.innerWidth - 8) next.insetInlineEnd = 'auto';
      if (r.left < 8) next.insetInlineStart = 'auto';
      if (r.bottom > window.innerHeight - 8 && r.top > r.bottom) {
        next.top = 'auto';
        next.bottom = 'calc(100% + 5px)';
      }
      setStyle(next);
    };
    place();
    window.requestAnimationFrame(place);
  }, [open]);
  return { panelRef, style };
}

/* ------------------------------- Popover --------------------------------- */

export interface PopoverProps {
  /** Render prop receives `open`, `toggle` and `close`. */
  trigger: (args: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode | ((args: { close: () => void }) => ReactNode);
  align?: 'start' | 'end';
  width?: number;
  className?: string;
  label?: string;
}

export function Popover({ trigger, children, align = 'end', width, className = '', label }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useOutside(close, open);
  const { panelRef, style } = useFlip(open);

  return (
    <div className="pop-wrap" ref={ref}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open ? (
        <div
          ref={panelRef}
          className={`pop ${className}`}
          role="dialog"
          aria-label={label}
          style={{
            ...(align === 'start' ? { insetInlineEnd: 'auto', insetInlineStart: 0 } : null),
            ...(width ? { width, minWidth: width } : null),
            ...style,
          }}
        >
          {typeof children === 'function' ? children({ close }) : children}
        </div>
      ) : null}
    </div>
  );
}

/* --------------------------------- Menu ---------------------------------- */

export interface MenuItemSpec {
  key: string;
  label: ReactNode;
  icon?: IconName;
  onSelect?: () => void;
  href?: string;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
}

export function MenuItems({
  items,
  onClose,
}: {
  items: (MenuItemSpec | 'sep' | { key: string; label: ReactNode })[];
  onClose?: () => void;
}) {
  const run = (it: MenuItemSpec) => {
    if (it.disabled) return;
    it.onSelect?.();
    onClose?.();
  };
  return (
    <div className="menu" style={{ position: 'static', boxShadow: 'none', border: 0, padding: 0 }}>
      {items.map((it, i) => {
        if (it === 'sep') return <div key={`sep-${i}`} className="menu-sep" />;
        const spec = it as MenuItemSpec;
        const cls = `menu-item${spec.active ? ' is-active' : ''}${spec.danger ? ' is-danger' : ''}`;
        const inner = (
          <>
            {spec.icon ? <Icon name={spec.icon} size={14} /> : null}
            <span className="grow truncate">{spec.label}</span>
          </>
        );
        if (spec.href) {
          return (
            <a
              key={spec.key}
              className={cls}
              href={spec.href}
              onClick={() => onClose?.()}
              aria-disabled={spec.disabled || undefined}
            >
              {inner}
            </a>
          );
        }
        return (
          <button
            key={spec.key}
            type="button"
            className={cls}
            disabled={spec.disabled}
            onClick={() => run(spec)}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}

/** Icon button that reveals a menu. */
export function MenuButton({
  icon = 'more-vert',
  items,
  title,
  label,
  align = 'end',
  className = '',
  dot = false,
  onOpenChange,
}: {
  icon?: IconName;
  items: (MenuItemSpec | 'sep' | { key: string; label: ReactNode })[];
  title?: string;
  label?: string;
  align?: 'start' | 'end';
  className?: string;
  dot?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => {
    setOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);
  const ref = useOutside(close, open);
  const { panelRef, style } = useFlip(open);

  return (
    <div className="pop-wrap" ref={ref}>
      <button
        type="button"
        className={`iconbtn${dot ? ' has-dot' : ''}${open ? ' is-on' : ''} ${className}`}
        title={title ?? label ?? 'Menu'}
        aria-label={title ?? label ?? 'Menu'}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name={icon} size={15} />
      </button>
      {open ? (
        <div
          ref={panelRef}
          className="menu"
          role="menu"
          style={{
            ...(align === 'start' ? { insetInlineEnd: 'auto', insetInlineStart: 0 } : null),
            ...style,
          }}
        >
          <MenuItems items={items} onClose={close} />
        </div>
      ) : null}
    </div>
  );
}
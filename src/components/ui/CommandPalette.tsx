'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Icon, type IconName } from './Icon';

export interface CmdItem {
  id: string;
  group: string;
  title: string;
  sub?: string;
  icon: IconName;
  href?: string;
  onSelect?: () => void;
  /** Extra text folded into the search index. */
  keywords?: string;
}

function Highlight({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const i = text.toLowerCase().indexOf(term.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + term.length)}</mark>
      {text.slice(i + term.length)}
    </>
  );
}

export function CommandPalette({
  open,
  onClose,
  items,
  placeholder,
  emptyText,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  items: CmdItem[];
  placeholder: string;
  emptyText: string;
  footer?: ReactNode;
}) {
  const router = useRouter();
  const [term, setTerm] = useState('');
  const [cursor, setCursor] = useState(0);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setTerm('');
      setCursor(0);
      const t = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [open]);

  const results = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return items.slice(0, 40);
    const terms = q.split(/\s+/);
    return items
      .map((it) => {
        const hay = `${it.title} ${it.sub ?? ''} ${it.group} ${it.keywords ?? ''}`.toLowerCase();
        let score = 0;
        for (const t of terms) {
          const at = hay.indexOf(t);
          if (at < 0) return null;
          score += at === 0 ? 12 : it.title.toLowerCase().startsWith(t) ? 8 : 3;
        }
        return { it, score };
      })
      .filter(Boolean)
      .sort((a, b) => b!.score - a!.score)
      .slice(0, 60)
      .map((x) => x!.it);
  }, [items, term]);

  useEffect(() => setCursor(0), [term]);

  const pick = useCallback(
    (it: CmdItem) => {
      onClose();
      if (it.onSelect) it.onSelect();
      else if (it.href) router.push(it.href);
    },
    [onClose, router],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor((c) => (results.length ? (c + 1) % results.length : 0));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor((c) => (results.length ? (c - 1 + results.length) % results.length : 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const it = results[cursor];
        if (it) pick(it);
      }
    },
    [results, cursor, onClose, pick],
  );

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>('.cmdk-item.is-cursor');
    node?.scrollIntoView({ block: 'nearest' });
  }, [cursor, results]);

  if (!open || !mounted) return null;

  let lastGroup = '';

  return createPortal(
    <div
      className="scrim"
      style={{ alignItems: 'flex-start', justifyContent: 'center' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Search">
        <div className="cmdk-input">
          <Icon name="search" size={17} style={{ color: 'var(--ink-4)' }} />
          <input
            ref={inputRef}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            aria-label={placeholder}
            autoComplete="off"
            spellCheck={false}
          />
          {term ? (
            <button type="button" className="iconbtn" onClick={() => setTerm('')} aria-label="Clear">
              <Icon name="close" size={14} />
            </button>
          ) : null}
        </div>
        <div className="cmdk-list" ref={listRef}>
          {results.length === 0 ? (
            <div className="empty" style={{ padding: '30px 18px' }}>
              <div className="empty-ico">
                <Icon name="search" size={17} />
              </div>
              <div className="empty-title">{emptyText}</div>
            </div>
          ) : (
            results.map((it, i) => {
              const header = it.group !== lastGroup ? it.group : null;
              lastGroup = it.group;
              return (
                <div key={it.id}>
                  {header ? <div className="cmdk-group">{header}</div> : null}
                  <button
                    type="button"
                    className={`cmdk-item${i === cursor ? ' is-cursor' : ''}`}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => pick(it)}
                  >
                    <Icon name={it.icon} size={15} />
                    <span className="cmdk-item-main">
                      <span className="cmdk-item-title truncate">
                        <Highlight text={it.title} term={term.trim()} />
                      </span>
                      {it.sub ? <span className="cmdk-item-sub truncate">{it.sub}</span> : null}
                    </span>
                    <Icon name="arrow-right" size={13} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                  </button>
                </div>
              );
            })
          )}
        </div>
        <div className="cmdk-foot">
          {footer ?? (
            <>
              <span>
                <kbd>↑</kbd> <kbd>↓</kbd> navigate
              </span>
              <span>
                <kbd>↵</kbd> open
              </span>
              <span>
                <kbd>esc</kbd> close
              </span>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
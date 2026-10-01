'use client';

import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export interface TabItem {
  key: string;
  label: ReactNode;
  icon?: IconName;
  count?: number;
  href?: string;
}

export function Tabs({
  items,
  active,
  onChange,
  className = '',
}: {
  items: TabItem[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={`tabs ${className}`} role="tablist">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          role="tab"
          aria-selected={it.key === active}
          className={`tab${it.key === active ? ' is-active' : ''}`}
          onClick={() => onChange(it.key)}
        >
          {it.icon ? <Icon name={it.icon} size={14} /> : null}
          <span>{it.label}</span>
          {typeof it.count === 'number' ? <span className="tab-count">{it.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
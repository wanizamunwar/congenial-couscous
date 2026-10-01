'use client';

import type { ReactNode } from 'react';
import type {
  DocCategory,
  MaterialCategory,
  PaymentStatus,
  Priority,
  ProjectStatus,
  TaskStatus,
} from '@/lib/types';
import type { TKey } from '@/lib/i18n';
import { translate } from '@/lib/i18n';

/** Maps a domain value to its badge variant + translated label. */
export function badgeFor(value: string, lang: 'en' | 'ar'): { cls: string; label: string } {
  const v = value as
    | ProjectStatus
    | TaskStatus
    | Priority
    | PaymentStatus
    | DocCategory
    | MaterialCategory;

  switch (v) {
    case 'Planning':
      return { cls: 'badge-planning', label: translate(lang, 'status.Planning') };
    case 'Active':
      return { cls: 'badge-active', label: translate(lang, 'status.Active') };
    case 'On Hold':
      return { cls: 'badge-hold', label: translate(lang, 'status.On Hold') };
    case 'Completed':
      return { cls: 'badge-completed', label: translate(lang, 'status.Completed') };
    case 'Cancelled':
      return { cls: 'badge-cancelled', label: translate(lang, 'status.Cancelled') };
    case 'Pending':
      return { cls: 'badge-pending', label: translate(lang, 'status.Pending') };
    case 'In Progress':
      return { cls: 'badge-inprogress', label: translate(lang, 'status.In Progress') };
    case 'Low':
      return { cls: 'badge-low', label: translate(lang, 'priority.Low') };
    case 'Medium':
      return { cls: 'badge-medium', label: translate(lang, 'priority.Medium') };
    case 'High':
      return { cls: 'badge-high', label: translate(lang, 'priority.High') };
    case 'Urgent':
      return { cls: 'badge-urgent', label: translate(lang, 'priority.Urgent') };
    case 'Paid':
      return { cls: 'badge-paid', label: translate(lang, 'payment.Paid') };
    case 'Partially Paid':
      return { cls: 'badge-partial', label: translate(lang, 'payment.Partially Paid') };
    case 'Overdue':
      return { cls: 'badge-unpaid', label: translate(lang, 'payment.Overdue') };
    default:
      return { cls: 'badge-neutral', label: value };
  }
}

export function stockBadge(state: 'out' | 'low' | 'available', lang: 'en' | 'ar') {
  if (state === 'out') return { cls: 'badge-cancelled', label: translate(lang, 'stock.out') };
  if (state === 'low') return { cls: 'badge-hold', label: translate(lang, 'stock.low') };
  return { cls: 'badge-completed', label: translate(lang, 'stock.available') };
}

export function Badge({
  value,
  lang,
  size,
  children,
  title,
}: {
  value?: string;
  lang: 'en' | 'ar';
  size?: 'lg';
  children?: ReactNode;
  title?: string;
}) {
  const info = value !== undefined ? badgeFor(value, lang) : null;
  const cls = info?.cls ?? 'badge-neutral';
  return (
    <span className={`badge ${cls}${size === 'lg' ? ' badge-lg' : ''}`} title={title}>
      <span className="dot" aria-hidden />
      {children ?? info?.label}
    </span>
  );
}

export function Tag({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <span className="tag" title={title}>
      {children}
    </span>
  );
}

/** Translated option labels for a const list of domain values. */
export function optionLabel(value: string, lang: 'en' | 'ar'): string {
  const keys = [
    `status.${value}`,
    `priority.${value}`,
    `payment.${value}`,
    `stock.${value}`,
    `type.${value}`,
    `mat.${value}`,
    `exp.${value}`,
    `doc.${value}`,
    `wx.${value}`,
  ] as TKey[];
  for (const k of keys) {
    const out = translate(lang, k);
    if (out !== k) return out;
  }
  return value;
}
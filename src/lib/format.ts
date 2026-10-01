/* ==========================================================================
   CLIENT-SIDE FORMATTING
   Locale-aware currency, dates, numbers and engineering quantities.
   ========================================================================== */

import type { CurrencyCode, Lang, Settings } from './types';

export const CURRENCY_META: Record<CurrencyCode, { symbol: string; decimals: number; label: string; rate: number }> = {
  SAR: { symbol: 'SAR', decimals: 2, label: 'Saudi Riyal', rate: 1 },
  AED: { symbol: 'AED', decimals: 2, label: 'UAE Dirham', rate: 0.98 },
  QAR: { symbol: 'QAR', decimals: 2, label: 'Qatari Riyal', rate: 0.99 },
  KWD: { symbol: 'KWD', decimals: 3, label: 'Kuwaiti Dinar', rate: 0.098 },
  BHD: { symbol: 'BHD', decimals: 3, label: 'Bahraini Dinar', rate: 0.098 },
  OMR: { symbol: 'OMR', decimals: 3, label: 'Omani Rial', rate: 0.102 },
  USD: { symbol: '$', decimals: 2, label: 'US Dollar', rate: 0.266 },
  EUR: { symbol: '€', decimals: 2, label: 'Euro', rate: 0.246 },
};

export function currencyRate(code: CurrencyCode, override?: number): number {
  if (typeof override === 'number' && override > 0) return override;
  return CURRENCY_META[code]?.rate ?? 1;
}

const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/** Convert a base-SAR amount into the display currency. */
export function convert(amountSar: number, code: CurrencyCode, override?: number): number {
  return amountSar * currencyRate(code, override);
}

/**
 * Money formatting. Uses Intl with Latin digits by default; `latinDigits`
 * is forced on for the Latin locale and off for Arabic numerals preference.
 */
export function money(
  amountSar: number,
  opts: { code?: CurrencyCode; rate?: number; lang?: Lang; compact?: boolean; decimals?: number } = {},
): string {
  const code = opts.code ?? 'SAR';
  const rate = currencyRate(code, opts.rate);
  const value = convert(amountSar, code, rate);
  const decimals = opts.decimals ?? CURRENCY_META[code].decimals;
  const lang = opts.lang ?? 'en';

  if (opts.compact && Math.abs(value) >= 1000) {
    return compactMoney(value, code, rate, lang);
  }

  try {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  } catch {
    return `${code} ${value.toFixed(decimals)}`;
  }
}

function compactMoney(value: number, code: CurrencyCode, _rate: number, _lang: Lang): string {
  const symbol = CURRENCY_META[code].symbol;
  const abs = Math.abs(value);
  const units: [number, string][] = [
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ];
  for (const [size, suffix] of units) {
    if (abs >= size) {
      const n = value / size;
      const digits = Math.abs(n) >= 100 ? 0 : Math.abs(n) >= 10 ? 1 : 2;
      return `${n.toFixed(digits)}${suffix}`;
    }
  }
  return `${value.toFixed(0)} ${symbol}`;
}

/** Axis / table money with a chosen precision, no currency symbol. */
export function moneyAxis(amountSar: number, code: CurrencyCode, rate?: number): string {
  const value = convert(amountSar, code, rate);
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${(value / 1e9).toFixed(abs >= 1e10 ? 0 : 1)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}K`;
  return value.toFixed(0);
}

export function number(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function int(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

export function percent(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '—';
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)}%`;
}

export function qty(value: number, decimals = 2): string {
  return `${number(value, decimals)}`;
}

/* ---------------------------------- dates -------------------------------- */

const HIJRI = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function parse(iso: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(iso: string, settings?: Pick<Settings, 'dateFormat'>, lang: Lang = 'en'): string {
  const d = parse(iso);
  if (!d) return '—';
  if (settings?.dateFormat === 'hijri') {
    return HIJRI.format(d);
  }
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(iso: string, lang: Lang = 'en'): string {
  const d = parse(iso);
  if (!d) return '—';
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

export function formatTime(iso: string, lang: Lang = 'en'): string {
  const d = parse(iso);
  if (!d) return '—';
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

export function monthLabel(year: number, monthIndex: number, lang: Lang = 'en'): string {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA' : 'en-GB', { month: 'short' }).format(
    new Date(Date.UTC(year, monthIndex, 1)),
  );
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(iso: string, days: number): string {
  const d = parse(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = parse(fromIso);
  const b = parse(toIso);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** "3 days ago" / "in 2 weeks" — locale aware, concise. */
export function relativeDays(iso: string, lang: Lang = 'en'): string {
  const target = parse(iso);
  if (!target) return '—';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  const rtf = new Intl.RelativeTimeFormat(lang === 'ar' ? 'ar' : 'en', { numeric: 'auto' });
  if (diff === 0) return rtf.format(0, 'day');
  if (Math.abs(diff) < 7) return rtf.format(diff, 'day');
  if (Math.abs(diff) < 31) return rtf.format(Math.round(diff / 7), 'week');
  if (Math.abs(diff) < 365) return rtf.format(Math.round(diff / 30), 'month');
  return rtf.format(Math.round(diff / 365), 'year');
}

export function relativeTime(iso: string, lang: Lang = 'en'): string {
  const d = parse(iso);
  if (!d) return '—';
  const secs = Math.round((d.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(lang === 'ar' ? 'ar' : 'en', { numeric: 'auto' });
  const abs = Math.abs(secs);
  if (abs < 60) return rtf.format(secs, 'second');
  if (abs < 3600) return rtf.format(Math.round(secs / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(secs / 3600), 'hour');
  if (abs < 2592000) return rtf.format(Math.round(secs / 86400), 'day');
  return rtf.format(Math.round(secs / 2592000), 'month');
}

/* --------------------------------- files --------------------------------- */

export function fileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function initials(name: string): string {
  const parts = name
    .replace(/^Engr\.?\s+/i, '')
    .replace(/^(Mr|Ms|Mrs|Dr)\.?\s+/i, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Convert Arabic-Indic digits back to Latin for API payloads. */
export function toLatinDigits(input: string): string {
  return input.replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)));
}

export function toArabicDigits(input: string): string {
  return input.replace(/[0-9]/g, (d) => arabicDigits[Number(d)]);
}

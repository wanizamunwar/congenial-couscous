import type { CurrencyCode, Accent, Density, ThemeMode, Lang } from '../types';

/** Currency catalogue with the SAR peg reference rate (1 SAR = rate units). */
export const CURRENCIES: {
  code: CurrencyCode;
  symbol: string;
  rate: number;
  decimals: number;
  label: string;
}[] = [
  { code: 'SAR', symbol: 'SAR', rate: 1, decimals: 2, label: 'Saudi Riyal' },
  { code: 'AED', symbol: 'AED', rate: 0.98, decimals: 2, label: 'UAE Dirham' },
  { code: 'QAR', symbol: 'QAR', rate: 0.99, decimals: 2, label: 'Qatari Riyal' },
  { code: 'KWD', symbol: 'KWD', rate: 0.098, decimals: 3, label: 'Kuwaiti Dinar' },
  { code: 'BHD', symbol: 'BHD', rate: 0.098, decimals: 3, label: 'Bahraini Dinar' },
  { code: 'OMR', symbol: 'OMR', rate: 0.102, decimals: 3, label: 'Omani Rial' },
  { code: 'USD', symbol: '$', rate: 0.266, decimals: 2, label: 'US Dollar' },
  { code: 'EUR', symbol: '€', rate: 0.246, decimals: 2, label: 'Euro' },
];

export const LAMBS = CURRENCIES.map((c) => c.code) as readonly CurrencyCode[];
export const ACCENTS = ['petrol', 'steel', 'ochre', 'graphite'] as const satisfies readonly Accent[];
export const DENSITIES = ['comfortable', 'compact'] as const satisfies readonly Density[];
export const THEME_MODES = ['light', 'dark', 'system'] as const satisfies readonly ThemeMode[];
export const LANGUAGES = ['en', 'ar'] as const satisfies readonly Lang[];

'use client';

import { useCallback } from 'react';
import { usePrefs } from './theme';
import { translate, type TKey } from './i18n';

/** Translator bound to the active interface language. */
export function useT() {
  const { lang } = usePrefs();
  return useCallback(
    (key: TKey, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang],
  );
}
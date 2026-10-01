/* ==========================================================================
   UI PREFERENCES — theme mode, accent, density, language
   Preferences live in the database once signed in, and are mirrored to
   localStorage so the very first paint (before React) is already correct.
   ========================================================================== */

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Accent, Density, Lang, ThemeMode } from './types';
import { dirOf } from './i18n';

const STORAGE_KEY = 'siteaxis.ui';

export interface UiPrefs {
  theme: ThemeMode;
  accent: Accent;
  density: Density;
  lang: Lang;
}

const DEFAULTS: UiPrefs = { theme: 'light', accent: 'petrol', density: 'comfortable', lang: 'en' };

function read(): UiPrefs {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<UiPrefs>;
    return {
      theme: ['light', 'dark', 'system'].includes(parsed.theme as string)
        ? (parsed.theme as ThemeMode)
        : DEFAULTS.theme,
      accent: ['petrol', 'steel', 'ochre', 'graphite'].includes(parsed.accent as string)
        ? (parsed.accent as Accent)
        : DEFAULTS.accent,
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
      lang: parsed.lang === 'ar' ? 'ar' : 'en',
    };
  } catch {
    return DEFAULTS;
  }
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Injected before paint by the root layout so there is never a flash. */
export const PREFS_BOOTSTRAP = `(function(){try{
var s=JSON.parse(localStorage.getItem('${STORAGE_KEY}')||'{}');
var r=document.documentElement;
var m=s.theme||'light';
if(m==='system'){m=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
r.setAttribute('data-theme',m);
r.setAttribute('data-accent',s.accent||'petrol');
r.setAttribute('data-density',s.density||'comfortable');
var l=s.lang||'en';
r.setAttribute('lang',l);
r.setAttribute('dir',l==='ar'?'rtl':'ltr');
}catch(e){}})();`;

interface PrefsContextValue extends UiPrefs {
  resolvedTheme: 'light' | 'dark';
  dir: 'ltr' | 'rtl';
  set: <K extends keyof UiPrefs>(key: K, value: UiPrefs[K]) => void;
  replace: (next: Partial<UiPrefs>) => void;
}

const PrefsContext = createContext<PrefsContextValue | null>(null);

export function UiPrefsProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: Partial<UiPrefs>;
}) {
  const [prefs, setPrefs] = useState<UiPrefs>(() => ({ ...read(), ...(initial ?? {}) }));
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => resolveTheme(prefs.theme));

  useEffect(() => {
    const next = resolveTheme(prefs.theme);
    setResolved(next);
    const root = document.documentElement;
    root.setAttribute('data-theme', next);
    root.setAttribute('data-accent', prefs.accent);
    root.setAttribute('data-density', prefs.density);
    root.setAttribute('lang', prefs.lang);
    root.setAttribute('dir', dirOf(prefs.lang));
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* storage unavailable — preferences simply do not persist locally */
    }
  }, [prefs]);

  // Follow the OS while in "system" mode.
  useEffect(() => {
    if (prefs.theme !== 'system' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolved(resolveTheme('system'));
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [prefs.theme]);

  const set = useCallback<PrefsContextValue['set']>((key, value) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }, []);

  const replace = useCallback((next: Partial<UiPrefs>) => {
    setPrefs((prev) => ({ ...prev, ...next }));
  }, []);

  const value = useMemo<PrefsContextValue>(
    () => ({ ...prefs, resolvedTheme: resolved, dir: dirOf(prefs.lang), set, replace }),
    [prefs, resolved, set, replace],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsContextValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used inside <UiPrefsProvider>');
  return ctx;
}
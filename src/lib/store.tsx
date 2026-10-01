/* ==========================================================================
   APPLICATION STORE
   A single full snapshot is fetched from the server, then every screen
   derives its own views from it. Mutations go through the API and the
   snapshot is refreshed afterwards so counts and dashboards stay truthful.
   ========================================================================== */

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  ApiError,
  createRecord,
  deleteRecord,
  updateRecord,
  type RecordKind,
} from './api';
import type {
  ActivityEntry,
  DocRecord,
  Expense,
  Material,
  Project,
  Settings,
  SiteReport,
  Snapshot,
  Task,
  UserProfile,
} from './types';
import { usePrefs } from './theme';
import { todayIso } from './format';

/* --------------------------------- toasts -------------------------------- */

export type ToastKind = 'ok' | 'err' | 'warn' | 'info';
export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  text?: string;
}

/* ------------------------------ notifications ---------------------------- */

export interface AppNotification {
  id: string;
  kind: 'overdueTask' | 'dueTask' | 'lowStock' | 'budget' | 'milestone' | 'missingReport';
  title: string;
  text: string;
  href: string;
  severity: 'bad' | 'warn' | 'info';
}

/* ------------------------------- context --------------------------------- */

interface StoreValue {
  ready: boolean;
  loading: boolean;
  data: Snapshot;
  projects: Project[];
  tasks: Task[];
  siteReports: SiteReport[];
  materials: Material[];
  expenses: Expense[];
  documents: DocRecord[];
  activity: ActivityEntry[];
  profile: UserProfile;
  settings: Settings;

  projectById: (id: string) => Project | undefined;
  projectName: (id: string) => string;
  projectCode: (id: string) => string;

  refresh: () => Promise<void>;
  save: <K extends RecordKind>(
    kind: K,
    payload: unknown,
    id?: string,
  ) => Promise<Record<string, unknown>>;
  destroy: (kind: RecordKind, id: string) => Promise<void>;
  saveSettings: (patch: Partial<Settings>) => Promise<void>;
  saveProfile: (patch: Partial<UserProfile>) => Promise<void>;
  signOut: () => Promise<void>;

  toasts: Toast[];
  notify: (kind: ToastKind, title: string, text?: string) => void;
  dismissToast: (id: string) => void;
  notifications: AppNotification[];
  markNotificationsRead: () => void;
  unreadCount: number;

  busy: string | null;
}

const EMPTY: Snapshot = {
  version: 1,
  seededAt: '',
  profile: {
    name: '',
    username: '',
    email: '',
    role: '',
    designation: '',
    company: '',
    phone: '',
    location: '',
    country: '',
    employeeId: '',
    bio: '',
    photo: null,
    qualifications: [],
    languages: [],
    memberships: [],
  },
  settings: {
    lang: 'en',
    theme: 'light',
    accent: 'petrol',
    density: 'comfortable',
    currency: 'SAR',
    currencyRate: 1,
    dateFormat: 'gregorian',
    notifications: {
      taskDue: true,
      taskOverdue: true,
      projectMilestone: true,
      lowStock: true,
      budgetAlert: true,
      dailyReport: true,
      emailDigest: false,
      digestFrequency: 'weekly',
      soundAlert: false,
    },
    security: { autoLockMinutes: 30, failedLockout: 5 },
    pdfFooter: '',
  },
  account: { username: '', email: '', displayName: '', lastLoginAt: null, createdAt: '' },
  projects: [],
  tasks: [],
  siteReports: [],
  materials: [],
  expenses: [],
  documents: [],
  activity: [],
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const prefs = usePrefs();
  const [data, setData] = useState<Snapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [readAt, setReadAt] = useState<number>(Date.now());
  const inFlight = useRef(false);

  const lang = data.settings.lang ?? prefs.lang;

  /* ------------------------------- loading ------------------------------- */

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch('/api/data', { credentials: 'same-origin', cache: 'no-store' });
      if (res.status === 401) {
        router.replace('/login');
        return;
      }
      if (!res.ok) throw new Error(`Snapshot failed (${res.status})`);
      const snap = (await res.json()) as Snapshot;
      setData(snap);
    } catch (err) {
      pushToast('err', 'Could not load data', (err as Error).message);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Reflect server-side language preference into the UI preferences.
  const syncedLang = useRef<string>('');
  useEffect(() => {
    if (data.settings.lang && data.settings.lang !== syncedLang.current) {
      syncedLang.current = data.settings.lang;
      if (prefs.lang !== data.settings.lang) prefs.set('lang', data.settings.lang);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.settings.lang]);

  /* -------------------------------- toasts ------------------------------- */

  function pushToast(kind: ToastKind, title: string, text?: string) {
    const id = `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-4), { id, kind, title, text }]);
    const ttl = kind === 'err' ? 7000 : 3800;
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, ttl);
  }

  const notify = useCallback((kind: ToastKind, title: string, text?: string) => {
    const id = `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-4), { id, kind, title, text }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), kind === 'err' ? 7000 : 3800);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  /* -------------------------------- CRUD --------------------------------- */

  const save = useCallback(
    async <K extends RecordKind>(kind: K, payload: unknown, id?: string) => {
      setBusy(id ?? 'new');
      try {
        const res = id
          ? await updateRecord<Record<string, unknown>>(
              kind,
              id,
              payload,
            )
          : await createRecord<Record<string, unknown>>(kind, payload);
        await refresh();
        return res.record;
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw err;
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  const destroy = useCallback(
    async (kind: RecordKind, id: string) => {
      setBusy(id);
      try {
        await deleteRecord(kind, id);
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  /* ------------------------------ settings ------------------------------- */

  const saveSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new ApiError(body.error ?? 'Could not save settings', res.status);
      }
      const body = (await res.json()) as { settings: Settings };
      setData((prev) => ({ ...prev, settings: body.settings }));
    },
    [],
  );

  const saveProfile = useCallback(async (patch: Partial<UserProfile>) => {
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        fields?: Record<string, string>;
      };
      throw new ApiError(body.error ?? 'Could not save profile', res.status, body.fields ?? {});
    }
    const body = (await res.json()) as { profile: UserProfile };
    setData((prev) => ({ ...prev, profile: body.profile }));
  }, []);

  const signOut = useCallback(async () => {
    await fetch('/api/auth/login', { method: 'DELETE', credentials: 'same-origin' });
    router.replace('/login');
  }, [router]);

  /* ---------------------------- derived selectors ------------------------- */

  const projectIndex = useMemo(() => {
    const map = new Map<string, Project>();
    for (const p of data.projects) map.set(p.id, p);
    return map;
  }, [data.projects]);

  const projectById = useCallback((id: string) => projectIndex.get(id), [projectIndex]);
  const projectName = useCallback(
    (id: string) => projectIndex.get(id)?.name ?? '—',
    [projectIndex],
  );
  const projectCode = useCallback(
    (id: string) => projectIndex.get(id)?.code ?? '—',
    [projectIndex],
  );

  const notifications = useMemo<AppNotification[]>(() => {
    if (!data.projects.length) return [];
    const prefs_ = data.settings.notifications;
    const out: AppNotification[] = [];
    const today = todayIso();
    const in7 = new Date();
    in7.setDate(in7.getDate() + 7);
    const in14 = new Date();
    in14.setDate(in14.getDate() + 14);
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (prefs_.taskOverdue || prefs_.taskDue) {
      const open = data.tasks.filter((t) => t.status !== 'Completed');
      const overdue = open.filter((t) => t.dueDate < today);
      const soon = open.filter((t) => t.dueDate >= today && t.dueDate <= iso(in7));
      if (prefs_.taskOverdue && overdue.length) {
        out.push({
          id: 'overdue',
          kind: 'overdueTask',
          title: 'notif.overdueTask',
          text: `${overdue.length} task${overdue.length === 1 ? '' : 's'} past the deadline — oldest: ${overdue
            .slice()
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]?.name ?? ''}`,
          href: '/tasks?status=overdue',
          severity: 'bad',
        });
      }
      if (prefs_.taskDue && soon.length) {
        out.push({
          id: 'soon',
          kind: 'dueTask',
          title: 'notif.dueTask',
          text: `${soon.length} task${soon.length === 1 ? '' : 's'} due within 7 days`,
          href: '/tasks',
          severity: 'warn',
        });
      }
    }

    if (prefs_.lowStock) {
      const low = data.materials.filter(
        (m) => m.minStock > 0 && m.quantity <= m.minStock,
      );
      if (low.length) {
        out.push({
          id: 'stock',
          kind: 'lowStock',
          title: 'notif.lowStock',
          text: `${low.length} material line${low.length === 1 ? '' : 's'} at or below the reorder level`,
          href: '/inventory?stock=low',
          severity: 'warn',
        });
      }
    }

    if (prefs_.budgetAlert) {
      const hot = data.projects.filter(
        (p) => p.budget > 0 && spentOf(p.id, data.expenses) / p.budget >= 0.9,
      );
      if (hot.length) {
        out.push({
          id: 'budget',
          kind: 'budget',
          title: 'notif.budget',
          text: `${hot.length} project${hot.length === 1 ? '' : 's'} at 90%+ of budget — ${hot[0].code}`,
          href: '/finance',
          severity: 'bad',
        });
      }
    }

    if (prefs_.projectMilestone) {
      const active = data.projects.filter((p) => p.status === 'Active' && p.endDate <= iso(in14));
      if (active.length) {
        out.push({
          id: 'milestone',
          kind: 'milestone',
          title: 'notif.milestone',
          text: `${active.length} active project${active.length === 1 ? '' : 's'} within 14 days of the expected completion date`,
          href: '/projects',
          severity: 'info',
        });
      }
    }

    if (prefs_.dailyReport) {
      const active = data.projects.filter((p) => p.status === 'Active');
      const missing = active.filter(
        (p) => !data.siteReports.some((r) => r.projectId === p.id && r.date === today),
      );
      if (missing.length) {
        out.push({
          id: 'report',
          kind: 'missingReport',
          title: 'notif.missingReport',
          text: `${missing.length} active project${missing.length === 1 ? '' : 's'} with no report filed today`,
          href: '/site-reports',
          severity: 'info',
        });
      }
    }

    const order = { bad: 0, warn: 1, info: 2 } as const;
    return out.sort((a, b) => order[a.severity] - order[b.severity]);
  }, [data.projects, data.tasks, data.materials, data.expenses, data.siteReports, data.settings.notifications]);

  const unreadCount = notifications.filter((n) => n.id !== 'due-soon').length;
  const markNotificationsRead = useCallback(() => setReadAt(Date.now()), []);
  void readAt;

  /* -------------------------------- value -------------------------------- */

  const value = useMemo<StoreValue>(
    () => ({
      ready: !loading,
      loading,
      data,
      projects: data.projects,
      tasks: data.tasks,
      siteReports: data.siteReports,
      materials: data.materials,
      expenses: data.expenses,
      documents: data.documents,
      activity: data.activity,
      profile: data.profile,
      settings: data.settings,
      projectById,
      projectName,
      projectCode,
      refresh,
      save,
      destroy,
      saveSettings,
      saveProfile,
      signOut,
      toasts,
      notify,
      dismissToast,
      notifications,
      markNotificationsRead,
      unreadCount,
      busy,
    }),
    [
      loading,
      data,
      projectById,
      projectName,
      projectCode,
      refresh,
      save,
      destroy,
      saveSettings,
      saveProfile,
      signOut,
      toasts,
      notify,
      dismissToast,
      notifications,
      markNotificationsRead,
      unreadCount,
      busy,
    ],
  );

  void lang;
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

/* ------------------------------ shared maths ----------------------------- */

/** Total spend recorded against a project, in SAR. */
export function spentOf(projectId: string, expenses: Expense[]): number {
  let sum = 0;
  for (const e of expenses) if (e.projectId === projectId) sum += e.amount;
  return sum;
}

/** Spend that is still owed (not fully settled). */
export function unpaidOf(projectId: string, expenses: Expense[]): number {
  let sum = 0;
  for (const e of expenses) {
    if (e.projectId === projectId && e.paymentStatus !== 'Paid') sum += e.amount;
  }
  return sum;
}

/** Stock health for a material line against its reorder level. */
export function stockState(m: Material): 'out' | 'low' | 'available' {
  if (m.quantity <= 0) return 'out';
  if (m.minStock > 0 && m.quantity <= m.minStock) return 'low';
  return 'available';
}

export function materialValue(m: Material): number {
  return m.quantity * m.unitPrice;
}
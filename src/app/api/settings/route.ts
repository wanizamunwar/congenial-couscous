import { NextResponse } from 'next/server';
import { handler, requireSession, fail, v, nowIso, HttpError } from '@/lib/server/api';
import { mutate } from '@/lib/server/db';
import { LAMBS, ACCENTS, DENSITIES, THEME_MODES, LANGUAGES } from '@/lib/server/enums';
import type { Settings } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const PATCH = handler(async (req: Request) => {
  const db = await requireSession();
  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return fail('Invalid request body', 400);
  }

  const before = db.settings.currency;
  const next = await mutate((d) => {
    const s: Settings = d.settings;
    if ('lang' in raw) s.lang = v.enum_(raw.lang, 'lang', LANGUAGES);
    if ('theme' in raw) s.theme = v.enum_(raw.theme, 'theme', THEME_MODES);
    if ('accent' in raw) s.accent = v.enum_(raw.accent, 'accent', ACCENTS);
    if ('density' in raw) s.density = v.enum_(raw.density, 'density', DENSITIES);
    if ('currency' in raw) s.currency = v.enum_(raw.currency, 'currency', LAMBS);
    if ('currencyRate' in raw) s.currencyRate = v.num(raw.currencyRate, 'currencyRate', { min: 0.0001, max: 10000 });
    if ('dateFormat' in raw) {
      s.dateFormat = v.enum_(raw.dateFormat, 'dateFormat', ['gregorian', 'hijri'] as const);
    }
    if ('pdfFooter' in raw) s.pdfFooter = v.str(raw.pdfFooter, 'pdfFooter', { required: false, max: 300 });
    if (raw.notifications && typeof raw.notifications === 'object') {
      const n = raw.notifications as Record<string, unknown>;
      if ('taskDue' in n) s.notifications.taskDue = v.bool(n.taskDue);
      if ('taskOverdue' in n) s.notifications.taskOverdue = v.bool(n.taskOverdue);
      if ('projectMilestone' in n) s.notifications.projectMilestone = v.bool(n.projectMilestone);
      if ('lowStock' in n) s.notifications.lowStock = v.bool(n.lowStock);
      if ('budgetAlert' in n) s.notifications.budgetAlert = v.bool(n.budgetAlert);
      if ('dailyReport' in n) s.notifications.dailyReport = v.bool(n.dailyReport);
      if ('emailDigest' in n) s.notifications.emailDigest = v.bool(n.emailDigest);
      if ('soundAlert' in n) s.notifications.soundAlert = v.bool(n.soundAlert);
      if ('digestFrequency' in n) {
        s.notifications.digestFrequency = v.enum_(n.digestFrequency, 'digestFrequency', [
          'daily',
          'weekly',
          'off',
        ] as const);
      }
    }
    if (raw.security && typeof raw.security === 'object') {
      const sec = raw.security as Record<string, unknown>;
      if ('autoLockMinutes' in sec) {
        s.security.autoLockMinutes = v.num(sec.autoLockMinutes, 'autoLockMinutes', {
          min: 0,
          max: 480,
          int: true,
        });
      }
      if ('failedLockout' in sec) {
        s.security.failedLockout = v.num(sec.failedLockout, 'failedLockout', {
          min: 3,
          max: 10,
          int: true,
        });
      }
    }
    d.activity.unshift({
      id: `act_${Date.now().toString(36)}`,
      at: nowIso(),
      kind: 'settings',
      action: 'update',
      entityId: 'set_1',
      summary: 'Application settings updated',
      projectId: null,
      actor: d.account.displayName,
    });
    d.activity = d.activity.slice(0, 400);
    return d.settings;
  });

  return NextResponse.json({ settings: next, currencyChanged: before !== next.currency });
});

export const GET = handler(async () => {
  const db = await requireSession();
  return NextResponse.json({ settings: db.settings });
});

export const DELETE = handler(async () => {
  throw new HttpError('Settings cannot be deleted. Use a restore from backup instead.', 405);
});

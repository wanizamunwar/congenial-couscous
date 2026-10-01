/* ==========================================================================
   ROUTE HANDLER HELPERS
   ========================================================================== */

import { NextResponse } from 'next/server';
import { getSession, readSessionToken, SESSION_COOKIE, createSessionToken, sessionCookieOptions } from './auth';
import { read } from './db';
import type { DBShape } from './types';

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data as object, init);
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...(extra ?? {}) }, { status });
}

export class HttpError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Guard every data route behind a valid signed session. */
export async function requireSession(): Promise<DBShape> {
  const session = await getSession();
  if (!session) throw new HttpError('Not authenticated', 401);
  return read();
}

/** Read the raw session cookie value (used by the middleware-free layout). */
export async function sessionFromCookieValue(value: string | undefined) {
  return readSessionToken(value);
}

export function setSessionCookie(res: NextResponse, token: string, remember: boolean) {
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(remember));
  return res;
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(false), maxAge: 0 });
  return res;
}

export function issueSession(username: string, remember: boolean) {
  return createSessionToken(username, remember);
}

/** Wrap a handler so thrown HttpErrors become clean JSON responses. */
export function handler<A extends unknown[]>(
  fn: (...args: A) => Promise<Response>,
): (...args: A) => Promise<Response> {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) return fail(err.message, err.status);
      const message = err instanceof Error ? err.message : 'Unexpected server error';
      // eslint-disable-next-line no-console
      console.error('[siteaxis]', err);
      return fail(message, 500);
    }
  };
}

/* ------------------------------ validation ------------------------------ */

export type FieldErrors = Record<string, string>;

export class ValidationError extends HttpError {
  fields: FieldErrors;
  constructor(fields: FieldErrors, message = 'Please correct the highlighted fields') {
    super(message, 422);
    this.fields = fields;
  }
}

export const v = {
  str(value: unknown, field: string, opts: { min?: number; max?: number; required?: boolean } = {}): string {
    const s = typeof value === 'string' ? value.trim() : '';
    const required = opts.required !== false;
    if (!s) {
      if (required) throw new ValidationError({ [field]: 'This field is required' });
      return '';
    }
    if (opts.min && s.length < opts.min) {
      throw new ValidationError({ [field]: `Must be at least ${opts.min} characters` });
    }
    if (opts.max && s.length > opts.max) {
      throw new ValidationError({ [field]: `Must not exceed ${opts.max} characters` });
    }
    return s;
  },
  num(
    value: unknown,
    field: string,
    opts: { min?: number; max?: number; required?: boolean; int?: boolean } = {},
  ): number {
    const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim()) : NaN;
    if (!Number.isFinite(n)) {
      if (opts.required === false) return 0;
      throw new ValidationError({ [field]: 'Enter a valid number' });
    }
    if (opts.int && !Number.isInteger(n)) {
      throw new ValidationError({ [field]: 'Enter a whole number' });
    }
    if (opts.min !== undefined && n < opts.min) {
      throw new ValidationError({ [field]: `Must be ${opts.min} or greater` });
    }
    if (opts.max !== undefined && n > opts.max) {
      throw new ValidationError({ [field]: `Must be ${opts.max} or less` });
    }
    return n;
  },
  enum_<T extends string>(value: unknown, field: string, allowed: readonly T[], required = true): T {
    const s = typeof value === 'string' ? value : '';
    if (!s) {
      if (required) throw new ValidationError({ [field]: 'Select a value' });
      return '' as T;
    }
    if (!allowed.includes(s as T)) {
      throw new ValidationError({ [field]: `Must be one of: ${allowed.join(', ')}` });
    }
    return s as T;
  },
  date(value: unknown, field: string, required = true): string {
    const s = typeof value === 'string' ? value.trim() : '';
    if (!s) {
      if (required) throw new ValidationError({ [field]: 'Select a date' });
      return '';
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) {
      throw new ValidationError({ [field]: 'Enter a valid date' });
    }
    return s;
  },
  email(value: unknown, field: string): string {
    const s = (typeof value === 'string' ? value : '').trim().toLowerCase();
    if (!s) throw new ValidationError({ [field]: 'Email is required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) {
      throw new ValidationError({ [field]: 'Enter a valid email address' });
    }
    return s;
  },
  bool(value: unknown): boolean {
    return value === true || value === 'true' || value === 1 || value === '1';
  },
  strArray(value: unknown, field: string): string[] {
    if (Array.isArray(value)) return value.map((x) => String(x).trim()).filter(Boolean);
    if (typeof value === 'string') {
      return value
        .split(/[,;\n]/)
        .map((x) => x.trim())
        .filter(Boolean);
    }
    throw new ValidationError({ [field]: 'Enter a valid list' });
  },
};

/** ISO date ordering check producing a field error. */
export function assertOrder(start: string, end: string, field: string) {
  if (start && end && end < start) {
    throw new ValidationError({ [field]: 'The end date cannot be earlier than the start date' });
  }
}

export function newId(prefix: string): string {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}_${stamp}${rand}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

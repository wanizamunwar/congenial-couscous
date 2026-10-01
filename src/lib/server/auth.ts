/* ==========================================================================
   AUTHENTICATION  (server-side)
   scrypt password hashing + HMAC-signed stateless session cookies.
   ========================================================================== */

import crypto from 'node:crypto';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'siteaxis_session';
const SESSION_TTL_SHORT = 12 * 60 * 60; // 12 h   — "Remember me" OFF
const SESSION_TTL_LONG = 30 * 24 * 60 * 60; // 30 d — "Remember me" ON

/** Per-install secret. Derived once and cached in the data dir. */
let cachedSecret: Buffer | null = null;
export function sessionSecret(): Buffer {
  if (cachedSecret) return cachedSecret;
  const fromEnv = process.env.SITAXIS_SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 32) {
    cachedSecret = Buffer.from(fromEnv, 'utf8');
    return cachedSecret;
  }
  // Deterministic from the absolute data path so sessions survive restarts in
  // a single-install deployment. Sufficient for an on-premise single-user app.
  const seed = process.env.SITAXIS_DATA_DIR || process.cwd();
  cachedSecret = crypto.createHash('sha256').update(`siteaxis::${seed}`).digest();
  return cachedSecret;
}

/* ------------------------------ passwords ------------------------------- */

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 } as const;

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt ?? crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .scryptSync(password.normalize('NFKC'), Buffer.from(s, 'hex'), SCRYPT_PARAMS.keylen, {
      N: SCRYPT_PARAMS.N,
      r: SCRYPT_PARAMS.r,
      p: SCRYPT_PARAMS.p,
    })
    .toString('hex');
  return { hash, salt: s };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  try {
    const { hash } = hashPassword(password, salt);
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(expectedHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/* ------------------------------- sessions ------------------------------- */

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

export function createSessionToken(userKey: string, remember: boolean): string {
  const expires = Math.floor(Date.now() / 1000) + (remember ? SESSION_TTL_LONG : SESSION_TTL_SHORT);
  const payload = b64url(Buffer.from(JSON.stringify({ u: userKey, e: expires, r: remember ? 1 : 0 })));
  const sig = b64url(crypto.createHmac('sha256', sessionSecret()).update(payload).digest());
  return `${payload}.${sig}`;
}

export function readSessionToken(token: string | undefined): { userKey: string; expires: number; remember: boolean } | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expect = b64url(crypto.createHmac('sha256', sessionSecret()).update(payload).digest());
  if (sig.length !== expect.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try {
    const data = JSON.parse(b64urlDecode(payload).toString('utf8')) as {
      u: string;
      e: number;
      r: number;
    };
    if (typeof data.e !== 'number' || data.e * 1000 < Date.now()) return null;
    return { userKey: data.u, expires: data.e, remember: data.r === 1 };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<{ userKey: string; remember: boolean } | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return readSessionToken(token);
}

export function sessionCookieOptions(remember: boolean) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: remember ? SESSION_TTL_LONG : SESSION_TTL_SHORT,
  };
}

/* ------------------------------ brute force ----------------------------- */

export const MAX_FAILED = 5;
export const LOCKOUT_MS = 5 * 60 * 1000;

export function lockRemainingMs(lockedUntil: number): number {
  return Math.max(0, lockedUntil - Date.now());
}

/** Dwell-time-independent equalisation for unknown usernames. */
export function dummyVerify(): void {
  hashPassword('timing-equalisation-placeholder', '00000000000000000000000000000000');
}

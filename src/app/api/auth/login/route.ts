import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import {
  handler,
  fail,
  issueSession,
  setSessionCookie,
  clearSessionCookie,
  nowIso,
} from '@/lib/server/api';
import {
  verifyPassword,
  hashPassword,
  dummyVerify,
  MAX_FAILED,
  LOCKOUT_MS,
  lockRemainingMs,
} from '@/lib/server/auth';
import { read, mutate } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

const RECOVERY_TTL_MS = 15 * 60 * 1000;

export const POST = handler(async (req: Request) => {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail('Invalid request body', 400);
  }

  const identifier = String(body.identifier ?? '')
    .trim()
    .toLowerCase();
  const password = String(body.password ?? '');
  const remember = body.remember === true || body.remember === 'true';

  if (!identifier) return fail('Enter your email or username', 422);
  if (!password) return fail('Enter your password', 422);

  const db = await read();
  const account = db.account;
  const match =
    identifier === account.username.toLowerCase() || identifier === account.email.toLowerCase();

  // Lockout applies regardless of whether the identifier exists.
  const locked = lockRemainingMs(account.lockedUntil);
  if (locked > 0) {
    return fail(
      `Too many failed attempts. Try again in ${Math.ceil(locked / 1000)} seconds.`,
      429,
      { locked: true, retryAfter: Math.ceil(locked / 1000) },
    );
  }

  if (!match) {
    dummyVerify();
    return fail('Incorrect username or password', 401);
  }

  if (!verifyPassword(password, account.passwordSalt, account.passwordHash)) {
    const attempts = await mutate((d) => {
      d.account.failedAttempts += 1;
      if (d.account.failedAttempts >= MAX_FAILED) {
        d.account.lockedUntil = Date.now() + LOCKOUT_MS;
        d.account.failedAttempts = 0;
      }
      return d.account.failedAttempts;
    });
    const remaining = Math.max(0, MAX_FAILED - (attempts + 1));
    return fail(
      remaining > 0
        ? `Incorrect username or password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        : 'Incorrect username or password. Account temporarily locked for 5 minutes.',
      401,
      { remaining },
    );
  }

  await mutate((d) => {
    d.account.failedAttempts = 0;
    d.account.lockedUntil = 0;
    d.account.lastLoginAt = nowIso();
    d.account.recoveryToken = '';
    d.account.recoveryExpiry = 0;
    d.activity.unshift({
      id: `act_${crypto.randomBytes(6).toString('hex')}`,
      at: nowIso(),
      kind: 'auth',
      action: 'login',
      entityId: d.account.username,
      summary: 'Signed in',
      projectId: null,
      actor: d.account.displayName,
    });
    d.activity = d.activity.slice(0, 400);
  });

  const token = issueSession(account.username, remember);
  const res = NextResponse.json({ ok: true, name: account.displayName });
  return setSessionCookie(res, token, remember);
});

export const DELETE = handler(async () => clearSessionCookie(NextResponse.json({ ok: true })));

/* ------------------------- password recovery flow ------------------------ */

export const PUT = handler(async (req: Request) => {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail('Invalid request body', 400);
  }
  const step = String(body.step ?? '');

  /* 1 — confirm the account exists and fetch the security question */
  if (step === 'question') {
    const identifier = String(body.identifier ?? '')
      .trim()
      .toLowerCase();
    if (!identifier) return fail('Enter your email or username', 422);
    const db = await read();
    const match =
      identifier === db.account.username.toLowerCase() || identifier === db.account.email.toLowerCase();
    if (!match) {
      dummyVerify();
      return fail('No account matches that email or username', 404);
    }
    return NextResponse.json({ ok: true, question: db.account.securityQuestion });
  }

  /* 2 — verify the security answer, issue a single-use recovery token */
  if (step === 'answer') {
    const answer = String(body.answer ?? '').trim();
    if (!answer) return fail('Enter the answer to your security question', 422);
    const db = await read();
    const ok = verifyPassword(
      answer.toUpperCase(),
      db.account.securityAnswerSalt,
      db.account.securityAnswerHash,
    );
    if (!ok) return fail('That answer does not match our records', 401);

    const token = crypto.randomBytes(24).toString('hex');
    await mutate((d) => {
      d.account.recoveryToken = token;
      d.account.recoveryExpiry = Date.now() + RECOVERY_TTL_MS;
    });
    return NextResponse.json({ ok: true, token, expiresInMinutes: RECOVERY_TTL_MS / 60000 });
  }

  /* 3 — set a new password against the recovery token */
  if (step === 'reset') {
    const token = String(body.token ?? '');
    const newPassword = String(body.newPassword ?? '');
    const confirm = String(body.confirmPassword ?? '');

    const db = await read();
    const valid =
      token.length > 0 &&
      token === db.account.recoveryToken &&
      db.account.recoveryExpiry > Date.now();
    if (!valid) return fail('Recovery session expired. Please start again.', 401);

    if (newPassword.length < 8) return fail('The new password must be at least 8 characters', 422);
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return fail('Include an uppercase letter, a lowercase letter and a digit', 422);
    }
    if (newPassword !== confirm) return fail('The two passwords do not match', 422);

    const { hash, salt } = hashPassword(newPassword);
    await mutate((d) => {
      d.account.passwordHash = hash;
      d.account.passwordSalt = salt;
      d.account.failedAttempts = 0;
      d.account.lockedUntil = 0;
      d.account.recoveryToken = '';
      d.account.recoveryExpiry = 0;
    });
    return clearSessionCookie(NextResponse.json({ ok: true }));
  }

  return fail('Unknown recovery step', 400);
});

import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { handler, requireSession, fail, v, ValidationError, nowIso } from '@/lib/server/api';
import { mutate } from '@/lib/server/db';
import { verifyPassword, hashPassword, MAX_FAILED, LOCKOUT_MS } from '@/lib/server/auth';
import type { UserProfile } from '@/lib/types';

export const dynamic = 'force-dynamic';

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export const PATCH = handler(async (req: Request) => {
  await requireSession();
  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return fail('Invalid request body', 400);
  }

  const profile = await mutate((d) => {
    const p: UserProfile = d.profile;
    if ('name' in raw) p.name = v.str(raw.name, 'name', { min: 2, max: 80 });
    if ('username' in raw) {
      const u = v.str(raw.username, 'username', { min: 3, max: 40 }).toLowerCase();
      if (!/^[a-z0-9._-]+$/.test(u)) {
        throw new ValidationError({
          username: 'Use lowercase letters, numbers, dot, dash or underscore',
        });
      }
      // The sign-in handle is an account credential, not a profile field.
      if (u !== d.account.username) {
        throw new ValidationError({
          username: 'The sign-in username cannot be changed from the profile page',
        });
      }
      p.username = u;
    }
    if ('email' in raw) {
      const e = v.email(raw.email, 'email');
      p.email = e;
      d.account.email = e;
    }
    if ('role' in raw) p.role = v.str(raw.role, 'role', { min: 2, max: 60 });
    if ('designation' in raw) p.designation = v.str(raw.designation, 'designation', { min: 2, max: 100 });
    if ('company' in raw) p.company = v.str(raw.company, 'company', { min: 2, max: 120 });
    if ('phone' in raw) {
      const ph = v.str(raw.phone, 'phone', { min: 6, max: 30 });
      if (!/^[+\d][\d\s()-]{5,}$/.test(ph)) {
        throw new ValidationError({ phone: 'Enter a valid phone number, e.g. +966 55 128 4470' });
      }
      p.phone = ph;
    }
    if ('location' in raw) p.location = v.str(raw.location, 'location', { min: 2, max: 120 });
    if ('country' in raw) p.country = v.str(raw.country, 'country', { min: 2, max: 80 });
    if ('employeeId' in raw) p.employeeId = v.str(raw.employeeId, 'employeeId', { min: 2, max: 40 });
    if ('bio' in raw) p.bio = v.str(raw.bio, 'bio', { required: false, max: 3000 });
    if ('photo' in raw) {
      const photo = raw.photo;
      if (photo === null || photo === '') {
        p.photo = null;
      } else if (typeof photo === 'string' && photo.startsWith('data:image/')) {
        if (photo.length > MAX_PHOTO_BYTES) {
          throw new ValidationError({ photo: 'The photo must be smaller than 2 MB' });
        }
        if (!/^data:image\/(png|jpe?g|webp);base64,/.test(photo)) {
          throw new ValidationError({ photo: 'Use a PNG, JPEG or WebP image' });
        }
        p.photo = photo;
      } else {
        throw new ValidationError({ photo: 'Unsupported image format' });
      }
    }
    if (Array.isArray(raw.qualifications)) {
      p.qualifications = (raw.qualifications as { id?: string; text?: string }[])
        .map((x, i) => ({ id: String(x.id ?? `q${i}`), text: String(x.text ?? '').trim() }))
        .filter((x) => x.text);
    }
    if (Array.isArray(raw.languages)) {
      p.languages = (raw.languages as { id?: string; text?: string }[])
        .map((x, i) => ({ id: String(x.id ?? `l${i}`), text: String(x.text ?? '').trim() }))
        .filter((x) => x.text);
    }
    if (Array.isArray(raw.memberships)) {
      p.memberships = (raw.memberships as { id?: string; text?: string }[])
        .map((x, i) => ({ id: String(x.id ?? `m${i}`), text: String(x.text ?? '').trim() }))
        .filter((x) => x.text);
    }
    d.activity.unshift({
      id: `act_${crypto.randomBytes(6).toString('hex')}`,
      at: nowIso(),
      kind: 'settings',
      action: 'update',
      entityId: 'profile',
      summary: 'Profile information updated',
      projectId: null,
      actor: d.account.displayName,
    });
    d.activity = d.activity.slice(0, 400);
    return p;
  });

  return NextResponse.json({ profile });
});

/* ----------------------------- change password --------------------------- */

export const POST = handler(async (req: Request) => {
  const db = await requireSession();
  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return fail('Invalid request body', 400);
  }

  const current = String(raw.currentPassword ?? '');
  const next = String(raw.newPassword ?? '');
  const confirm = String(raw.confirmPassword ?? '');

  if (!verifyPassword(current, db.account.passwordSalt, db.account.passwordHash)) {
    return fail('Your current password is incorrect', 401);
  }
  if (next.length < 8) return fail('The new password must be at least 8 characters', 422);
  if (!/[A-Z]/.test(next) || !/[a-z]/.test(next) || !/\d/.test(next)) {
    return fail('Include an uppercase letter, a lowercase letter and a digit', 422);
  }
  if (next !== confirm) return fail('The two passwords do not match', 422);
  if (next === current) return fail('Choose a password different from the current one', 422);
  if (verifyPassword(next, db.account.passwordSalt, db.account.passwordHash)) {
    return fail('The new password must differ from the current one', 422);
  }

  const { hash, salt } = hashPassword(next);
  await mutate((d) => {
    d.account.passwordHash = hash;
    d.account.passwordSalt = salt;
    d.account.failedAttempts = 0;
    d.account.lockedUntil = 0;
    d.activity.unshift({
      id: `act_${crypto.randomBytes(6).toString('hex')}`,
      at: nowIso(),
      kind: 'auth',
      action: 'update',
      entityId: 'password',
      summary: 'Password changed',
      projectId: null,
      actor: d.account.displayName,
    });
    d.activity = d.activity.slice(0, 400);
  });

  void MAX_FAILED;
  void LOCKOUT_MS;
  return NextResponse.json({ ok: true });
});

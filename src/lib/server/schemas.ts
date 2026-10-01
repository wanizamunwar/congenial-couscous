/* ==========================================================================
   RECORD VALIDATION  — server-side enforcement of every entity contract
   ========================================================================== */

import {
  PROJECT_STATUSES,
  PROJECT_TYPES,
  TASK_STATUSES,
  PRIORITIES,
  PAYMENT_STATUSES,
  WEATHER,
  MATERIAL_CATEGORIES,
  UNITS,
  EXPENSE_CATEGORIES,
  DOC_CATEGORIES,
  type Project,
  type Task,
  type SiteReport,
  type Material,
  type Expense,
  type DocRecord,
} from '../types';
import { v, assertOrder, newId, nowIso, ValidationError } from './api';

type Raw = Record<string, unknown>;

const clean = (x: unknown) => (typeof x === 'string' ? x.trim() : '');

/* -------------------------------- project -------------------------------- */

export function validateProject(raw: Raw, existing?: Project): Project {
  const now = nowIso();
  const startDate = v.date(raw.startDate, 'startDate');
  const endDate = v.date(raw.endDate, 'endDate');
  assertOrder(startDate, endDate, 'endDate');
  const status = v.enum_(raw.status, 'status', PROJECT_STATUSES);

  return {
    id: existing?.id ?? newId('prj'),
    code: v.str(raw.code, 'code', { min: 3, max: 32 }),
    name: v.str(raw.name, 'name', { min: 3, max: 140 }),
    client: v.str(raw.client, 'client', { min: 2, max: 120 }),
    location: v.str(raw.location, 'location', { min: 2, max: 120 }),
    type: v.enum_(raw.type, 'type', PROJECT_TYPES),
    startDate,
    endDate,
    manager: v.str(raw.manager, 'manager', { min: 2, max: 80 }),
    budget: v.num(raw.budget, 'budget', { min: 0, max: 100_000_000_000 }),
    status,
    progress: v.num(raw.progress, 'progress', { min: 0, max: 100, int: true }),
    notes: v.str(raw.notes, 'notes', { required: false, max: 4000 }),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

/* ---------------------------------- task --------------------------------- */

export function validateTask(raw: Raw, existing?: Task): Task {
  const startDate = v.date(raw.startDate, 'startDate');
  const dueDate = v.date(raw.dueDate, 'dueDate');
  assertOrder(startDate, dueDate, 'dueDate');
  return {
    id: existing?.id ?? newId('tsk'),
    projectId: v.str(raw.projectId, 'projectId', { min: 1, max: 64 }),
    name: v.str(raw.name, 'name', { min: 3, max: 160 }),
    description: v.str(raw.description, 'description', { required: false, max: 4000 }),
    assignee: v.str(raw.assignee, 'assignee', { min: 2, max: 80 }),
    priority: v.enum_(raw.priority, 'priority', PRIORITIES),
    startDate,
    dueDate,
    status: v.enum_(raw.status, 'status', TASK_STATUSES),
    notes: v.str(raw.notes, 'notes', { required: false, max: 4000 }),
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };
}

/* ------------------------------ site report ----------------------------- */

export function validateSiteReport(raw: Raw, existing?: SiteReport): SiteReport {
  const date = v.date(raw.date, 'date');
  const photos = Array.isArray(raw.photos)
    ? (raw.photos as SiteReport['photos']).filter((p) => p && p.id && p.file)
    : [];
  return {
    id: existing?.id ?? newId('dsr'),
    refNo: v.str(raw.refNo, 'refNo', { min: 3, max: 40 }),
    projectId: v.str(raw.projectId, 'projectId', { min: 1, max: 64 }),
    date,
    siteLocation: v.str(raw.siteLocation, 'siteLocation', { min: 2, max: 160 }),
    weather: v.enum_(raw.weather, 'weather', WEATHER),
    tempHigh: v.num(raw.tempHigh, 'tempHigh', { min: -30, max: 65 }),
    tempLow: v.num(raw.tempLow, 'tempLow', { min: -40, max: 65 }),
    workers: v.num(raw.workers, 'workers', { min: 0, max: 5000, int: true }),
    engineers: v.strArray(raw.engineers ?? [], 'engineers'),
    workCompleted: v.str(raw.workCompleted, 'workCompleted', { required: false, max: 6000 }),
    workInProgress: v.str(raw.workInProgress, 'workInProgress', { required: false, max: 6000 }),
    materialsUsed: v.str(raw.materialsUsed, 'materialsUsed', { required: false, max: 4000 }),
    equipmentUsed: v.str(raw.equipmentUsed, 'equipmentUsed', { required: false, max: 4000 }),
    issues: v.str(raw.issues, 'issues', { required: false, max: 4000 }),
    safetyObservations: v.str(raw.safetyObservations, 'safetyObservations', { required: false, max: 4000 }),
    tomorrowPlan: v.str(raw.tomorrowPlan, 'tomorrowPlan', { required: false, max: 4000 }),
    notes: v.str(raw.notes, 'notes', { required: false, max: 4000 }),
    photos,
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };
}

/* -------------------------------- material ------------------------------- */

export function validateMaterial(raw: Raw, existing?: Material): Material {
  return {
    id: existing?.id ?? newId('mat'),
    name: v.str(raw.name, 'name', { min: 2, max: 160 }),
    category: v.enum_(raw.category, 'category', MATERIAL_CATEGORIES),
    quantity: v.num(raw.quantity, 'quantity', { min: 0, max: 100_000_000 }),
    unit: v.enum_(raw.unit, 'unit', UNITS),
    unitPrice: v.num(raw.unitPrice, 'unitPrice', { min: 0, max: 100_000_000 }),
    supplier: v.str(raw.supplier, 'supplier', { min: 2, max: 140 }),
    projectId: v.str(raw.projectId, 'projectId', { min: 1, max: 64 }),
    receivedDate: v.date(raw.receivedDate, 'receivedDate'),
    minStock: v.num(raw.minStock, 'minStock', { min: 0, max: 100_000_000, required: false }),
    notes: v.str(raw.notes, 'notes', { required: false, max: 2000 }),
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };
}

/* -------------------------------- expense -------------------------------- */

export function validateExpense(raw: Raw, existing?: Expense): Expense {
  return {
    id: existing?.id ?? newId('exp'),
    projectId: v.str(raw.projectId, 'projectId', { min: 1, max: 64 }),
    category: v.enum_(raw.category, 'category', EXPENSE_CATEGORIES),
    description: v.str(raw.description, 'description', { min: 2, max: 200 }),
    amount: v.num(raw.amount, 'amount', { min: 0.01, max: 100_000_000_000 }),
    date: v.date(raw.date, 'date'),
    vendor: v.str(raw.vendor, 'vendor', { min: 2, max: 140 }),
    paymentStatus: v.enum_(raw.paymentStatus, 'paymentStatus', PAYMENT_STATUSES),
    refNo: v.str(raw.refNo, 'refNo', { required: false, max: 40 }),
    notes: v.str(raw.notes, 'notes', { required: false, max: 2000 }),
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };
}

/* -------------------------------- document ------------------------------- */

export function validateDocMeta(raw: Raw, existing?: DocRecord, file?: { name: string; type: string; size: number }): DocRecord {
  if (!existing && !file) {
    throw new ValidationError({ file: 'Select a file to upload' });
  }
  return {
    id: existing?.id ?? newId('doc'),
    projectId: v.str(raw.projectId, 'projectId', { min: 1, max: 64 }),
    name: v.str(raw.name ?? file?.name, 'name', { min: 2, max: 160 }),
    category: v.enum_(raw.category, 'category', DOC_CATEGORIES),
    fileName: v.str(raw.fileName ?? file?.name, 'fileName', { min: 1, max: 200 }),
    storedName: existing?.storedName ?? v.str(raw.storedName, 'storedName', { min: 1, max: 200 }),
    mime: existing?.mime ?? file?.type ?? 'application/octet-stream',
    size: existing?.size ?? file?.size ?? 0,
    uploadedAt: existing?.uploadedAt ?? nowIso(),
    description: v.str(raw.description, 'description', { required: false, max: 2000 }),
    rev: v.str(raw.rev, 'rev', { required: false, max: 20 }),
  };
}

/** Uniqueness of project code, checked outside the field validators. */
export async function assertProjectCodeUnique(
  projects: Project[],
  code: string,
  ignoreId?: string,
) {
  const dup = projects.find((p) => p.code.toLowerCase() === code.toLowerCase() && p.id !== ignoreId);
  if (dup) {
    throw new ValidationError({ code: `Project ID "${code}" is already used by "${dup.name}"` });
  }
}

export { clean };

/* ==========================================================================
   ANALYTICS
   Derived figures for the dashboard, finance screens and reports.
   Everything here is a pure function of the snapshot, so the numbers on
   screen always agree with the records that produced them.
   ========================================================================== */

import type { Expense, Material, Project, SiteReport, Snapshot, Task } from './types';
import { addDays, daysBetween, monthKey, todayIso } from './format';

export interface ProjectRoll {
  project: Project;
  spent: number;
  unpaid: number;
  budgetUsed: number; // 0..n, 1 = fully consumed
  openTasks: number;
  doneTasks: number;
  totalTasks: number;
  overdueTasks: number;
  reports: number;
  daysLeft: number;
  /** Expected completion on a straight-line programme, 0..100. */
  expected: number;
  /** progress − expected. Positive means ahead of programme. */
  variance: number;
  health: 'ok' | 'watch' | 'risk';
  materials: number;
  documents: number;
}

export interface MonthlyPoint {
  key: string; // yyyy-mm
  label: string;
  /** Spend recorded in the month, in SAR. */
  expenses: number;
  /** Running total across the window, in SAR. */
  cumulative: number;
  /** Number of expense lines booked in the month. */
  count: number;
}

export interface CategorySlice {
  key: string;
  label: string;
  value: number;
  share: number;
}

export function rollUp(
  snapshot: Pick<Snapshot, 'projects' | 'tasks' | 'expenses' | 'siteReports' | 'materials' | 'documents'>,
  today = todayIso(),
): ProjectRoll[] {
  const { projects, tasks, expenses, siteReports, materials, documents } = snapshot;

  return projects.map((project) => {
    let spent = 0;
    let unpaid = 0;
    for (const e of expenses) {
      if (e.projectId !== project.id) continue;
      spent += e.amount;
      if (e.paymentStatus !== 'Paid') unpaid += e.amount;
    }

    let openTasks = 0;
    let doneTasks = 0;
    let overdueTasks = 0;
    for (const t of tasks) {
      if (t.projectId !== project.id) continue;
      if (t.status === 'Completed') doneTasks += 1;
      else {
        openTasks += 1;
        if (t.dueDate < today) overdueTasks += 1;
      }
    }

    let reports = 0;
    for (const r of siteReports) if (r.projectId === project.id) reports += 1;

    let materialLines = 0;
    for (const m of materials) if (m.projectId === project.id) materialLines += 1;

    let docCount = 0;
    for (const d of documents) if (d.projectId === project.id) docCount += 1;

    const budgetUsed = project.budget > 0 ? spent / project.budget : 0;
    const total = daysBetween(project.startDate, project.endDate);
    const elapsed = daysBetween(project.startDate, today);
    const expected =
      total > 0 ? Math.max(0, Math.min(100, (elapsed / total) * 100)) : project.progress;
    const variance = project.progress - expected;

    let health: ProjectRoll['health'] = 'ok';
    if (project.status === 'Completed') health = 'ok';
    else if (
      budgetUsed >= 1 ||
      overdueTasks > 2 ||
      variance <= -12 ||
      project.endDate < today
    ) {
      health = 'risk';
    } else if (budgetUsed >= 0.85 || overdueTasks > 0 || variance <= -5) {
      health = 'watch';
    }

    return {
      project,
      spent,
      unpaid,
      budgetUsed,
      openTasks,
      doneTasks,
      totalTasks: openTasks + doneTasks,
      overdueTasks,
      reports,
      daysLeft: daysBetween(today, project.endDate),
      expected,
      variance,
      health,
      materials: materialLines,
      documents: docCount,
    };
  });
}

export interface PortfolioTotals {
  projects: number;
  active: number;
  completed: number;
  planning: number;
  onHold: number;
  budget: number;
  spent: number;
  unpaid: number;
  remaining: number;
  used: number;
  progress: number;
  tasksTotal: number;
  tasksDone: number;
  tasksOpen: number;
  tasksOverdue: number;
  reports: number;
  workersAvg: number;
  stockValue: number;
  lowStock: number;
  outOfStock: number;
  documents: number;
}

export function portfolioTotals(snapshot: Snapshot, today = todayIso()): PortfolioTotals {
  const { projects, tasks, expenses, siteReports, materials, documents } = snapshot;
  const rolls = rollUp(snapshot, today);

  let budget = 0;
  let spent = 0;
  let unpaid = 0;
  for (const p of projects) budget += p.budget;
  for (const e of expenses) {
    spent += e.amount;
    if (e.paymentStatus !== 'Paid') unpaid += e.amount;
  }

  const openTasks = tasks.filter((t) => t.status !== 'Completed');
  const progressSum = projects.reduce((acc, p) => acc + p.progress, 0);

  let workers = 0;
  for (const r of siteReports) workers += r.workers;

  let stockValue = 0;
  let lowStock = 0;
  let outOfStock = 0;
  for (const m of materials) {
    stockValue += m.quantity * m.unitPrice;
    if (m.quantity <= 0) outOfStock += 1;
    else if (m.minStock > 0 && m.quantity <= m.minStock) lowStock += 1;
  }

  return {
    projects: projects.length,
    active: projects.filter((p) => p.status === 'Active').length,
    completed: projects.filter((p) => p.status === 'Completed').length,
    planning: projects.filter((p) => p.status === 'Planning').length,
    onHold: projects.filter((p) => p.status === 'On Hold').length,
    budget,
    spent,
    unpaid,
    remaining: budget - spent,
    used: budget > 0 ? (spent / budget) * 100 : 0,
    progress: projects.length ? progressSum / projects.length : 0,
    tasksTotal: tasks.length,
    tasksDone: tasks.length - openTasks.length,
    tasksOpen: openTasks.length,
    tasksOverdue: openTasks.filter((t) => t.dueDate < today).length,
    reports: siteReports.length,
    workersAvg: siteReports.length ? workers / siteReports.length : 0,
    stockValue,
    lowStock,
    outOfStock,
    documents: documents.length,
  };
}

/** Month buckets from `months` back to the current month. */
export function monthlySeries(expenses: Expense[], months = 12): MonthlyPoint[] {
  const now = new Date();
  const buckets: MonthlyPoint[] = [];
  const index = new Map<string, number>();

  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(d);
    index.set(key, buckets.length);
    buckets.push({ key, label, expenses: 0, cumulative: 0, count: 0 });
  }

  for (const e of expenses) {
    const at = index.get(monthKey(e.date));
    if (at === undefined) continue;
    buckets[at].expenses += e.amount;
    buckets[at].count += 1;
  }

  let running = 0;
  for (const b of buckets) {
    running += b.expenses;
    b.cumulative = running;
  }
  return buckets;
}

export function byCategory(expenses: Expense[]): CategorySlice[] {
  const totals = new Map<string, number>();
  let grand = 0;
  for (const e of expenses) {
    totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
    grand += e.amount;
  }
  return [...totals.entries()]
    .map(([key, value]) => ({
      key,
      label: key,
      value,
      share: grand > 0 ? value / grand : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

export function byProject(expenses: Expense[], projects: Project[]): CategorySlice[] {
  const names = new Map(projects.map((p) => [p.id, p.name]));
  const totals = new Map<string, number>();
  let grand = 0;
  for (const e of expenses) {
    totals.set(e.projectId, (totals.get(e.projectId) ?? 0) + e.amount);
    grand += e.amount;
  }
  return [...totals.entries()]
    .map(([id, value]) => ({
      key: id,
      label: names.get(id) ?? '—',
      value,
      share: grand > 0 ? value / grand : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

export function byProjectStatus(projects: Project[]): CategorySlice[] {
  const order = ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'];
  const totals = new Map<string, number>();
  for (const p of projects) totals.set(p.status, (totals.get(p.status) ?? 0) + 1);
  const grand = projects.length;
  return order
    .filter((s) => totals.has(s))
    .map((key) => ({
      key,
      label: key,
      value: totals.get(key) ?? 0,
      share: grand > 0 ? (totals.get(key) ?? 0) / grand : 0,
    }));
}

export interface Deadline {
  id: string;
  kind: 'task' | 'project';
  title: string;
  projectId: string;
  projectName: string;
  date: string;
  days: number; // negative = overdue
  priority?: string;
  status?: string;
}

/** Upcoming and overdue deadlines inside the window, soonest first. */
export function deadlines(tasks: Task[], projects: Project[], withinDays = 14): Deadline[] {
  const today = todayIso();
  const limit = addDays(today, withinDays);
  const names = new Map(projects.map((p) => [p.id, p.name]));
  const out: Deadline[] = [];

  for (const t of tasks) {
    if (t.status === 'Completed') continue;
    if (t.dueDate > limit) continue;
    out.push({
      id: t.id,
      kind: 'task',
      title: t.name,
      projectId: t.projectId,
      projectName: names.get(t.projectId) ?? '—',
      date: t.dueDate,
      days: daysBetween(today, t.dueDate),
      priority: t.priority,
      status: t.status,
    });
  }

  for (const p of projects) {
    if (p.status !== 'Active') continue;
    if (p.endDate > limit) continue;
    out.push({
      id: p.id,
      kind: 'project',
      title: p.name,
      projectId: p.id,
      projectName: p.code,
      date: p.endDate,
      days: daysBetween(today, p.endDate),
      status: p.status,
    });
  }

  return out.sort((a, b) => a.days - b.days).slice(0, 40);
}

/** Labour headcount trend over the last `n` report days. */
export function labourTrend(reports: SiteReport[], n = 14): { label: string; workers: number }[] {
  return reports
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-n)
    .map((r) => ({ label: r.date.slice(5), workers: r.workers }));
}

export interface AssigneeLoad {
  name: string;
  open: number;
  done: number;
  overdue: number;
}

export function assigneeLoad(tasks: Task[]): AssigneeLoad[] {
  const map = new Map<string, AssigneeLoad>();
  const today = todayIso();
  for (const t of tasks) {
    const key = t.assignee || 'Unassigned';
    let row = map.get(key);
    if (!row) {
      row = { name: key, open: 0, done: 0, overdue: 0 };
      map.set(key, row);
    }
    if (t.status === 'Completed') row.done += 1;
    else {
      row.open += 1;
      if (t.dueDate < today) row.overdue += 1;
    }
  }
  return [...map.values()].sort((a, b) => b.open + b.done - (a.open + a.done));
}

export interface SupplierValue {
  name: string;
  value: number;
  lines: number;
}

export function supplierValue(materials: Material[], limit = 6): SupplierValue[] {
  const map = new Map<string, SupplierValue>();
  for (const m of materials) {
    let row = map.get(m.supplier);
    if (!row) {
      row = { name: m.supplier, value: 0, lines: 0 };
      map.set(m.supplier, row);
    }
    row.value += m.quantity * m.unitPrice;
    row.lines += 1;
  }
  return [...map.values()].sort((a, b) => b.value - a.value).slice(0, limit);
}

export interface StockLine {
  material: Material;
  value: number;
  state: 'out' | 'low' | 'available';
}

export function stockLines(materials: Material[]): StockLine[] {
  return materials
    .map((material) => {
      const state: StockLine['state'] =
        material.quantity <= 0
          ? 'out'
          : material.minStock > 0 && material.quantity <= material.minStock
            ? 'low'
            : 'available';
      return { material, value: material.quantity * material.unitPrice, state };
    })
    .sort((a, b) => b.value - a.value);
}

export function expiringPayments(expenses: Expense[], withinDays = 30): Expense[] {
  const limit = addDays(todayIso(), withinDays);
  const today = todayIso();
  return expenses
    .filter((e) => e.paymentStatus !== 'Paid' && e.date >= today && e.date <= limit)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function monthlyChange(points: MonthlyPoint[]): number {
  if (points.length < 2) return 0;
  const last = points[points.length - 1].expenses;
  const prev = points[points.length - 2].expenses;
  if (prev === 0) return last === 0 ? 0 : 100;
  return ((last - prev) / prev) * 100;
}
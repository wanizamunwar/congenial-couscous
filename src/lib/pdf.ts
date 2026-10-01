/* ==========================================================================
   PDF REPORT ENGINE
   jsPDF, A4 portrait, drafted in the same visual language as the screen:
   hairline rules, a drawing title block, monospaced numerics and a table
   engine that repeats its header row across page breaks.
   Arabic is typeset with a self-hosted Naskh face embedded on demand.
   ========================================================================== */

import type { Lang, Settings, Snapshot, UserProfile } from './types';
import type { TKey } from './i18n';
import { translate } from './i18n';
import { formatDate, formatDateTime, int, money, number } from './format';
import { byCategory, byProject, monthlySeries, portfolioTotals, rollUp, type ProjectRoll } from './analytics';
import { optionLabel } from '@/components/ui/Badge';

/* ------------------------------- constants -------------------------------- */

const A4 = { w: 210, h: 297 };
const M = { l: 14, r: 14, t: 14, b: 16 };
const CONTENT_W = A4.w - M.l - M.r;
const FOOT_Y = A4.h - M.b + 4;

const INK: RGB = [24, 32, 35];
const MUTED: RGB = [110, 122, 126];
const BRAND: RGB = [13, 79, 99];
const AMBER: RGB = [176, 122, 24];
const RULE: RGB = [206, 214, 216];
const SOFT: RGB = [244, 247, 247];
const ZEBRA: RGB = [250, 251, 251];
const BAD: RGB = [166, 42, 34];

type RGB = [number, number, number];

const SANS = 'helvetica';
const SANS_BOLD = 'helvetica';
const MONO = 'courier';
const NASKH = 'naskh';
const WORDMARK = 'SITEAXIS';

/* --------------------------------- types ---------------------------------- */

export type ReportType =
  | 'summary'
  | 'progress'
  | 'site'
  | 'siteAll'
  | 'expenses'
  | 'materials'
  | 'tasks';

export interface ReportRequest {
  type: ReportType;
  /** Empty or omitted = every project. */
  projectId?: string;
  /** Single daily report, for the "site" report type. */
  recordId?: string;
  from?: string;
  to?: string;
  includePhotos?: boolean;
  includeCharts?: boolean;
}

export interface ReportContext {
  snapshot: Snapshot;
  profile: UserProfile;
  settings: Settings;
  lang: Lang;
}

interface Doc {
  pdf: import('jspdf').jsPDF;
  lang: Lang;
  settings: Settings;
  y: number;
  page: number;
  arabic: boolean;
  title: string;
}

const rtl = (lang: Lang) => lang === 'ar';

/* ------------------------------ font handling ----------------------------- */

let arabicLoad: Promise<boolean> | null = null;

async function loadArabic(pdf: import('jspdf').jsPDF): Promise<boolean> {
  if (pdf.getFontList?.()[NASKH]) return true;
  if (!arabicLoad) {
    arabicLoad = (async () => {
      try {
        const res = await fetch('/fonts/NotoNaskhArabic-Regular.ttf');
        if (!res.ok) return false;
        const bytes = new Uint8Array(await res.arrayBuffer());
        let binary = '';
        const CHUNK = 0x8000;
        for (let i = 0; i < bytes.length; i += CHUNK) {
          binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)) as number[]);
        }
        const api = pdf as unknown as {
          addFileToVFS: (n: string, d: string) => void;
          addFont: (n: string, k: string, t: string) => void;
        };
        api.addFileToVFS('NotoNaskhArabic-Regular.ttf', window.btoa(binary));
        api.addFont('NotoNaskhArabic-Regular.ttf', NASKH, 'normal');
        return true;
      } catch {
        return false;
      }
    })();
  }
  return arabicLoad;
}

const ARABIC_RANGE = /[؀-ۿݐ-ݿﭐ-ﯿ]/;

function isArabicRun(s: string): boolean {
  return ARABIC_RANGE.test(s);
}

/**
 * jsPDF draws glyphs left to right and has no bidi engine. Reverse the run for
 * visual order, drop the shaping marks the simple encoder cannot place, and
 * parenthesise lam-alef ligatures so they cannot fuse incorrectly.
 */
function shapeArabic(s: string): string {
  const marks = /[ً-ٰٟۖ-ۭـ]/;
  const out: string[] = [];
  for (const ch of s) {
    out.push(marks.test(ch) ? `\u200f${ch}` : ch);
  }
  return out
    .reverse()
    .join('')
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ـ/g, '')
    .replace(/[ﭐ-ﯿ]/g, (m) => `(${m})`);
}

function faceFor(doc: Doc, s: string, mono: boolean, bold: boolean): string {
  if (isArabicRun(s)) return doc.arabic ? NASKH : SANS_BOLD;
  if (mono) return MONO;
  return bold ? SANS_BOLD : SANS;
}

function shaped(s: string, face: string): string {
  return face === NASKH ? shapeArabic(s) : s;
}

function runFont(doc: Doc, s: string, size: number, mono: boolean, bold: boolean) {
  const face = faceFor(doc, s, mono, bold);
  doc.pdf.setFont(face, face === SANS_BOLD && bold ? 'bold' : 'normal');
  doc.pdf.setFontSize(size);
  return shaped(s, face);
}

function measure(doc: Doc, s: string, size: number, mono = false, bold = false): number {
  const body = runFont(doc, s, size, mono, bold);
  return doc.pdf.getTextWidth(body);
}

interface TextOpts {
  size?: number;
  mono?: boolean;
  bold?: boolean;
  color?: RGB;
  align?: 'start' | 'end' | 'center';
  max?: number;
}

function write(doc: Doc, s: string, x: number, y: number, o: TextOpts = {}): void {
  const size = o.size ?? 8.4;
  const bold = o.bold ?? false;
  const mono = o.mono ?? false;
  const raw = s || '—';
  let body = runFont(doc, raw, size, mono, bold);
  if (o.max) {
    const per = size * (mono ? 0.602 : 0.5);
    const cap = Math.floor(o.max / per);
    if (cap > 4 && body.length > cap) body = `${body.slice(0, cap - 1)}…`;
  }
  doc.pdf.setTextColor(...(o.color ?? INK));

  // x is measured from the writing edge: 0 = left margin, CONTENT_W = right.
  let tx: number;
  let align: 'left' | 'right' | 'center';
  if (o.align === 'center') {
    tx = M.l + x;
    align = 'center';
  } else if (o.align === 'end') {
    tx = M.l + x;
    align = rtl(doc.lang) ? 'left' : 'right';
  } else {
    tx = rtl(doc.lang) ? M.l + CONTENT_W - x : M.l + x;
    align = rtl(doc.lang) ? 'right' : 'left';
  }
  doc.pdf.text(body, tx, y, { align });
}

/** Cell writer: `x` is the offset of the column's writing edge. */
function cell(doc: Doc, s: string, x: number, y: number, w: number, o: TextOpts = {}): void {
  write(doc, s, x + (o.align === 'end' ? w - 2.6 : o.align === 'center' ? w / 2 : 2.6), y, {
    ...o,
    max: w - 5.2,
  });
}

/* ------------------------------ page furniture ---------------------------- */

function label(doc: Doc, key: TKey): string {
  return translate(doc.lang, key);
}

function opt(doc: Doc, value: string): string {
  return optionLabel(value, doc.lang);
}

function hline(doc: Doc, y: number, color: RGB = RULE, weight = 0.2): void {
  doc.pdf.setDrawColor(...color);
  doc.pdf.setLineWidth(weight);
  doc.pdf.line(M.l, y, A4.w - M.r, y);
}

function box(doc: Doc, x: number, y: number, w: number, h: number, fill: RGB | null, stroke = true) {
  if (fill) {
    doc.pdf.setFillColor(...fill);
    doc.pdf.rect(x, y, w, h, 'F');
  }
  if (stroke) {
    doc.pdf.setDrawColor(...RULE);
    doc.pdf.setLineWidth(0.25);
    doc.pdf.rect(x, y, w, h);
  }
}

function footer(doc: Doc): void {
  hline(doc, FOOT_Y - 5);
  const stamp = formatDateTime(new Date().toISOString(), doc.lang);
  const right = `${stamp}   ·   ${doc.title}`;
  write(doc, right, CONTENT_W, FOOT_Y, { size: 6.6, mono: true, color: MUTED, align: 'end' });
  const pageNo = `${doc.lang === 'ar' ? 'صفحة' : 'Page'} ${doc.page}`;
  write(doc, `${WORDMARK}   ${pageNo}`, 0, FOOT_Y, { size: 6.6, mono: true, color: MUTED });
}

function nextPage(doc: Doc): void {
  footer(doc);
  doc.pdf.addPage();
  doc.page += 1;
  doc.y = M.t;
}

function need(doc: Doc, h: number): void {
  if (doc.y + h > FOOT_Y - 8) nextPage(doc);
}

/* ------------------------------ title block ------------------------------- */

function titleBlock(
  doc: Doc,
  code: string,
  title: string,
  meta: { label: string; value: string }[],
): void {
  const top = doc.y;
  const h = 32;
  const stampW = 46;
  const mainW = CONTENT_W - stampW;

  box(doc, M.l, top, CONTENT_W, h, SOFT);

  // Vertical divider between the record block and the drafting stamp.
  doc.pdf.setDrawColor(...RULE);
  doc.pdf.setLineWidth(0.3);
  const dx = rtl(doc.lang) ? M.l + stampW : M.l + mainW;
  doc.pdf.line(dx, top, dx, top + h);

  write(doc, code, 8, top + 8.4, { size: 6.4, mono: true, color: BRAND, max: mainW - 16 });
  write(doc, title, 8, top + 18.5, { size: 13, bold: true, max: mainW - 16 });
  hline(doc, top + 21.5, RULE, 0.2);
  const dx0 = rtl(doc.lang) ? M.l + mainW - 8 : M.l + 8;
  doc.pdf.line(rtl(doc.lang) ? dx0 - mainW + 16 : dx0, top + 21.5, rtl(doc.lang) ? dx0 : dx0 + mainW - 16, top + 21.5);

  const cols = Math.min(3, Math.max(1, meta.length));
  const colW = (mainW - 16) / cols;
  meta.slice(0, cols).forEach((m, i) => {
    const x = rtl(doc.lang) ? 8 + (cols - 1 - i) * colW : 8 + i * colW;
    write(doc, m.label.toUpperCase(), x, top + 25.6, { size: 5.2, color: MUTED, max: colW - 4 });
    write(doc, m.value, x, top + 30, { size: 7.2, mono: false, bold: true, max: colW - 4 });
  });

  // Drafting stamp.
  const cx = rtl(doc.lang) ? M.l + stampW / 2 : M.l + mainW + stampW / 2;
  write(doc, WORDMARK, cx - stampW / 2 + stampW / 2, top + 11, {
    size: 7.2,
    bold: true,
    color: BRAND,
    align: 'center',
    max: stampW - 8,
  });
  write(doc, doc.settings.pdfFooter || label(doc, 'rep.title'), cx - stampW / 2 + stampW / 2, top + 17, {
    size: 5.6,
    color: MUTED,
    align: 'center',
    max: stampW - 8,
  });
  write(doc, stampDate(doc), cx - stampW / 2 + stampW / 2, top + 27, {
    size: 5.6,
    mono: true,
    color: MUTED,
    align: 'center',
    max: stampW - 8,
  });

  doc.y = top + h + 11;
}

function stampDate(doc: Doc): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function sectionTitle(doc: Doc, heading: string, note?: string): void {
  need(doc, 22);
  write(doc, heading, 0, doc.y, { size: 8.6, bold: true, color: BRAND });
  if (note) write(doc, note, CONTENT_W, doc.y, { size: 6.6, mono: true, color: MUTED, align: 'end' });
  doc.y += 2.6;
  hline(doc, doc.y, BRAND, 0.4);
  doc.y += 5.6;
}

function paragraph(doc: Doc, body: string, size = 8.2): void {
  const maxW = CONTENT_W - 6;
  const words = (body || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) {
    write(doc, '—', 0, doc.y, { size, color: MUTED });
    doc.y += size * 1.5;
    return;
  }
  const lh = size * 1.45;
  let line = '';
  const lines: string[] = [];
  for (const w of words) {
    const probe = line ? `${line} ${w}` : w;
    if (line && measure(doc, probe, size) > maxW) {
      lines.push(line);
      line = w;
    } else {
      line = probe;
    }
  }
  if (line) lines.push(line);
  for (const l of lines) {
    need(doc, lh + 1);
    write(doc, l, 0, doc.y, { size });
    doc.y += lh;
  }
  doc.y += 4;
}

/* -------------------------------- tables ---------------------------------- */

export interface PdfColumn<T> {
  header: string;
  width: number; // mm
  align?: 'start' | 'end' | 'center';
  mono?: boolean;
  bold?: boolean;
  value: (row: T, index: number) => string;
  alert?: (row: T) => boolean;
}

const ROW_H = 5.2;
const HEAD_H = 6.6;

function table<T>(
  doc: Doc,
  cols: PdfColumn<T>[],
  rows: T[],
  opts: { total?: (rows: T[]) => string[] } = {},
): void {
  const width = cols.reduce((a, c) => a + c.width, 0);
  const scale = CONTENT_W / width;

  const head = () => {
    need(doc, HEAD_H + ROW_H + 6);
    box(doc, M.l, doc.y, CONTENT_W, HEAD_H, SOFT);
    let x = 0;
    for (const c of cols) {
      cell(doc, c.header.toUpperCase(), x * scale, doc.y + 4.4, c.width * scale, {
        size: 6,
        bold: true,
        color: MUTED,
        align: c.align ?? 'start',
      });
      x += c.width;
    }
    doc.y += HEAD_H;
  };

  head();

  if (!rows.length) {
    need(doc, 14);
    write(doc, label(doc, 'common.noResults'), 0, doc.y + 5, { size: 7.6, color: MUTED });
    doc.y += 12;
    return;
  }

  rows.forEach((row, ri) => {
    if (doc.y + ROW_H > FOOT_Y - 8) {
      nextPage(doc);
      head();
    }
    if (ri % 2 === 1) box(doc, M.l, doc.y, CONTENT_W, ROW_H, ZEBRA, false);
    let x = 0;
    for (const c of cols) {
      const bad = c.alert?.(row) ?? false;
      cell(doc, String(c.value(row, ri) ?? '—'), x * scale, doc.y + 3.8, c.width * scale, {
        size: 7.4,
        mono: c.mono,
        bold: c.bold,
        color: bad ? BAD : INK,
        align: c.align ?? 'start',
      });
      x += c.width;
    }
    doc.y += ROW_H;
    hline(doc, doc.y, [237, 241, 242], 0.1);
  });

  if (opts.total) {
    const vals = opts.total(rows);
    need(doc, HEAD_H + 6);
    box(doc, M.l, doc.y, CONTENT_W, HEAD_H, SOFT);
    let x = 0;
    for (let i = 0; i < cols.length; i += 1) {
      const c = cols[i];
      if (vals[i] !== undefined && vals[i] !== '') {
        cell(doc, vals[i], x * scale, doc.y + 4.4, c.width * scale, {
          size: 7.2,
          mono: c.mono,
          bold: true,
          align: c.align ?? 'start',
        });
      }
      x += c.width;
    }
    doc.y += HEAD_H;
  }

  doc.y += 9;
}

/* -------------------------------- gauges ---------------------------------- */

function progressBar(doc: Doc, x: number, y: number, w: number, pct: number, color: RGB): void {
  const clamped = Math.max(0, Math.min(100, pct));
  box(doc, x, y, w, 2.8, [232, 236, 237]);
  doc.pdf.setFillColor(...color);
  doc.pdf.rect(x, y, (w * clamped) / 100, 2.8, 'F');
}

function kpiGrid(doc: Doc, items: { label: string; value: string; sub?: string }[]): void {
  const perRow = 3;
  const gap = 4;
  const w = (CONTENT_W - gap * (perRow - 1)) / perRow;
  const h = 18;
  items.forEach((it, i) => {
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    const x = M.l + (rtl(doc.lang) ? (perRow - 1 - col) : col) * (w + gap);
    const y = doc.y + row * (h + gap);
    box(doc, x, y, w, h, ZEBRA);
    write(doc, it.label.toUpperCase(), x + 2.4, y + 5.2, { size: 5.3, color: MUTED, max: w - 4.8 });
    write(doc, it.value, x + 2.4, y + 12, { size: 10.2, mono: true, bold: true, max: w - 4.8 });
    if (it.sub) write(doc, it.sub, x + 2.4, y + 15.8, { size: 5.6, color: MUTED, max: w - 4.8 });
  });
  doc.y += Math.ceil(items.length / perRow) * (h + gap) + 8;
}

function barChart(doc: Doc, labels: string[], values: number[], height = 44): void {
  const max = Math.max(...values, 1);
  const step = CONTENT_W / Math.max(1, values.length);
  const barW = Math.min(13, step * 0.58);

  const base = doc.y + height;
  box(doc, M.l, base, CONTENT_W, 0.2, null, false);
  doc.pdf.setDrawColor(...RULE);
  doc.pdf.setLineWidth(0.2);
  doc.pdf.line(M.l, base, M.l + CONTENT_W, base);

  values.forEach((v, i) => {
    const slot = rtl(doc.lang) ? values.length - 1 - i : i;
    const h = Math.max(0.5, (v / max) * height);
    const x = M.l + step * slot + (step - barW) / 2;
    doc.pdf.setFillColor(...BRAND);
    doc.pdf.rect(x, base - h, barW, h, 'F');
    write(doc, labels[i], step * slot + step / 2, base + 3.6, {
      size: 5.4,
      mono: true,
      color: MUTED,
      align: 'center',
      max: step - 1,
    });
  });
  doc.y = base + 8;
}

/* ----------------------------- shared fragments --------------------------- */

function signOff(doc: Doc, ctx: ReportContext): void {
  need(doc, 46);
  sectionTitle(doc, label(doc, 'rep.signatures'));
  const cols = 3;
  const w = CONTENT_W / cols;
  const rows = [ctx.profile.name, label(doc, 'rep.of'), label(doc, 'rep.generated')];
  for (let i = 0; i < cols; i += 1) {
    const x = M.l + (rtl(doc.lang) ? (cols - 1 - i) * w : i * w);
    doc.pdf.setDrawColor(...RULE);
    doc.pdf.setLineWidth(0.3);
    doc.pdf.line(x + 6, doc.y + 9, x + w - 6, doc.y + 9);
    write(doc, rows[i], x + w / 2, doc.y + 13.6, {
      size: 6.2,
      color: MUTED,
      align: 'center',
      max: w - 12,
    });
  }
  doc.y += 20;
}

function stockState(m: Snapshot['materials'][number]): 'out' | 'low' | 'available' {
  if (m.quantity <= 0) return 'out';
  if (m.minStock > 0 && m.quantity <= m.minStock) return 'low';
  return 'available';
}

function materialByCategory(materials: Snapshot['materials']) {
  const map = new Map<string, number>();
  for (const m of materials) {
    map.set(m.category, (map.get(m.category) ?? 0) + m.quantity * m.unitPrice);
  }
  return [...map.entries()]
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value);
}

/* ------------------------------- entry point ------------------------------ */

export async function buildReport(req: ReportRequest, ctx: ReportContext): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  pdf.setProperties({
    title: `${WORDMARK} report`,
    subject: 'Engineering project management report',
    author: ctx.profile.name,
    creator: WORDMARK,
  });

  const arabic = ctx.lang === 'ar' ? await loadArabic(pdf) : false;
  const doc: Doc = { pdf, lang: ctx.lang, settings: ctx.settings, y: M.t, page: 1, arabic, title: '' };

  const { snapshot } = ctx;
  const L = (k: TKey) => label(doc, k);
  const cash = (v: number) =>
    money(v, { code: ctx.settings.currency, rate: ctx.settings.currencyRate, lang: doc.lang });
  const today = new Date().toISOString().slice(0, 10);
  const dt = (iso: string) => formatDate(iso, ctx.settings, doc.lang);

  const rolls = rollUp(snapshot);
  const totals = portfolioTotals(snapshot);
  const scoped = req.projectId ? rolls.filter((r) => r.project.id === req.projectId) : rolls;

  const period =
    req.from && req.to
      ? `${dt(req.from)} — ${dt(req.to)}`
      : req.from
        ? `${L('rep.from')} ${dt(req.from)}`
        : req.to
          ? `${L('rep.to')} ${dt(req.to)}`
          : dt(today);

  const inRange = (iso: string) => (!req.from || iso >= req.from) && (!req.to || iso <= req.to);

  const scopeMeta = (extra?: { label: string; value: string }) => [
    { label: L('rep.scope'), value: req.projectId ? scoped[0]?.project.code ?? '—' : L('rep.all') },
    { label: L('rep.period'), value: period },
    extra ?? { label: L('rep.generated'), value: dt(today) },
  ];

  /* ------------------------------- SUMMARY ------------------------------ */
  if (req.type === 'summary') {
    doc.title = L('rep.type.summary');
    titleBlock(
      doc,
      `${WORDMARK} / SUMMARY / ${req.projectId ? scoped[0]?.project.code ?? '—' : 'ALL'}`,
      L('rep.type.summary'),
      scopeMeta(),
    );

    sectionTitle(doc, L('dashboard.portfolioProgress'));
    kpiGrid(doc, [
      { label: L('dashboard.totalProjects'), value: int(totals.projects), sub: `${totals.active} ${L('status.Active')}` },
      { label: L('dashboard.avgProgress'), value: `${totals.progress.toFixed(1)}%`, sub: `${totals.completed} ${L('status.Completed')}` },
      { label: L('dashboard.totalExpenses'), value: cash(totals.spent), sub: `${totals.used.toFixed(1)}% ${L('fin.utilisation')}` },
      { label: L('dashboard.openTasks'), value: int(totals.tasksOpen), sub: `${totals.tasksOverdue} ${L('dashboard.overdue')}` },
      { label: L('dashboard.reportsFiled'), value: int(totals.reports), sub: `${int(totals.workersAvg)} ${L('dashboard.avgWorkers')}` },
      { label: L('dashboard.stockValue'), value: cash(totals.stockValue), sub: `${totals.lowStock} ${L('inv.low')}` },
    ]);

    sectionTitle(doc, L('projects.title'), `${scoped.length} ${L('common.rows')}`);
    table<ProjectRoll>(
      doc,
      [
        { header: L('projects.code'), width: 26, mono: true, value: (r) => r.project.code },
        { header: L('projects.name'), width: 54, value: (r) => r.project.name },
        { header: L('common.status'), width: 19, value: (r) => opt(doc, r.project.status) },
        { header: L('projects.progress'), width: 15, align: 'end', mono: true, value: (r) => `${r.project.progress}%`, alert: (r) => r.variance <= -12 && r.project.status !== 'Completed' },
        { header: L('projects.budget'), width: 27, align: 'end', mono: true, value: (r) => cash(r.project.budget) },
        { header: L('projects.spent'), width: 27, align: 'end', mono: true, value: (r) => cash(r.spent), alert: (r) => r.budgetUsed >= 1 },
        { header: L('fin.unpaidValue'), width: 25, align: 'end', mono: true, value: (r) => cash(r.unpaid) },
      ],
      scoped,
      {
        total: (rs) => [
          L('common.total'),
          `${rs.length}`,
          '',
          rs.length ? `${(rs.reduce((a, r) => a + r.project.progress, 0) / rs.length).toFixed(1)}%` : '',
          cash(rs.reduce((a, r) => a + r.project.budget, 0)),
          cash(rs.reduce((a, r) => a + r.spent, 0)),
          cash(rs.reduce((a, r) => a + r.unpaid, 0)),
        ],
      },
    );

    sectionTitle(doc, L('dashboard.projectHealth'));
    for (const r of scoped) {
      need(doc, 16);
      const tone: RGB = r.health === 'risk' ? BAD : r.health === 'watch' ? AMBER : BRAND;
      write(doc, r.project.code, 0, doc.y + 3.4, { size: 6.2, mono: true, color: MUTED });
      write(doc, r.project.name, 26, doc.y + 3.4, { size: 8, bold: true, max: CONTENT_W - 50 });
      write(
        doc,
        `${r.project.progress}%`,
        CONTENT_W,
        doc.y + 3.4,
        { size: 8, mono: true, bold: true, align: 'end' },
      );
      progressBar(doc, rtl(doc.lang) ? M.l + CONTENT_W - (CONTENT_W - 26) : M.l + 26, doc.y + 6, CONTENT_W - 26, r.project.progress, tone);
      write(
        doc,
        `${r.variance >= 0 ? '+' : ''}${r.variance.toFixed(1)}%  ${L('projects.variance')}   ·   ${r.overdueTasks} ${L('dashboard.overdue')}   ·   ${opt(doc, r.health === 'risk' ? 'Cancelled' : r.health === 'watch' ? 'On Hold' : 'Completed')}`,
        26,
        doc.y + 12.4,
        { size: 6.2, mono: true, color: MUTED },
      );
      doc.y += 16;
    }
    doc.y += 4;
  }

  /* ------------------------------- PROGRESS ----------------------------- */
  else if (req.type === 'progress') {
    doc.title = L('rep.type.progress');
    for (const r of scoped) {
      titleBlock(
        doc,
        `${r.project.code}  ·  ${r.project.client}`,
        `${L('rep.type.progress')} — ${r.project.name}`,
        [
          { label: L('projects.location'), value: r.project.location },
          { label: L('projects.manager'), value: r.project.manager },
          { label: L('common.status'), value: opt(doc, r.project.status) },
        ],
      );

      sectionTitle(doc, L('projects.tab.overview'));
      kpiGrid(doc, [
        { label: L('projects.progress'), value: `${r.project.progress}%`, sub: `${L('projects.variance')} ${r.variance >= 0 ? '+' : ''}${r.variance.toFixed(1)}%` },
        { label: L('projects.budget'), value: cash(r.project.budget), sub: `${L('projects.duration')} ${r.expected.toFixed(0)}%` },
        { label: L('projects.spent'), value: cash(r.spent), sub: `${L('fin.utilisation')} ${(r.budgetUsed * 100).toFixed(1)}%` },
        { label: L('projects.remaining'), value: cash(r.project.budget - r.spent), sub: `${L('fin.unpaidValue')} ${cash(r.unpaid)}` },
        { label: L('dashboard.openTasks'), value: int(r.openTasks), sub: `${r.doneTasks} ${L('status.Completed')}` },
        { label: L('dashboard.daysLeft' in {} ? 'dashboard.daysLeft' : 'projects.daysLeft'), value: int(r.daysLeft), sub: `${r.reports} ${L('dashboard.reportsFiled')}` },
      ]);

      sectionTitle(doc, L('dashboard.spendVsBudget'));
      progressBar(doc, M.l, doc.y, CONTENT_W, r.budgetUsed * 100, r.budgetUsed >= 1 ? BAD : BRAND);
      write(doc, `${cash(r.spent)}  /  ${cash(r.project.budget)}    ${(r.budgetUsed * 100).toFixed(1)}%`, CONTENT_W, doc.y + 8.4, {
        size: 7,
        mono: true,
        align: 'end',
      });
      doc.y += 14;

      if (r.project.notes) {
        sectionTitle(doc, L('common.notes'));
        paragraph(doc, r.project.notes);
      }

      sectionTitle(doc, L('projects.tab.tasks'), `${r.totalTasks}`);
      const tasks = snapshot.tasks
        .filter((x) => x.projectId === r.project.id)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      table(
        doc,
        [
          { header: L('tasks.name'), width: 82, value: (x) => x.name },
          { header: L('tasks.assignee'), width: 34, value: (x) => x.assignee || '—' },
          { header: L('tasks.priority'), width: 20, value: (x) => opt(doc, x.priority) },
          { header: L('tasks.dueDate'), width: 23, align: 'end', mono: true, value: (x) => dt(x.dueDate) },
          { header: L('common.status'), width: 23, value: (x) => opt(doc, x.status), alert: (x) => x.status !== 'Completed' && x.dueDate < today },
        ],
        tasks,
      );

      if (req.includeCharts !== false) {
        const months = monthlySeries(snapshot.expenses.filter((e) => e.projectId === r.project.id), 8);
        sectionTitle(doc, L('fin.monthly'));
        barChart(doc, months.map((m) => m.label), months.map((m) => m.expenses), 40);
      }
    }
  }

  /* --------------------------------- SITE ------------------------------- */
  else if (req.type === 'site') {
    doc.title = L('rep.type.site');
    const report = snapshot.siteReports.find((r) => r.id === req.recordId);
    if (report) {
      const proj = snapshot.projects.find((p) => p.id === report.projectId);
      titleBlock(
        doc,
        report.refNo,
        `${L('dsr.printHeader')} — ${proj?.name ?? ''}`,
        [
          { label: L('common.project'), value: proj?.code ?? '—' },
          { label: L('common.date'), value: dt(report.date) },
          { label: L('dsr.weather'), value: report.weather },
        ],
      );

      kpiGrid(doc, [
        { label: L('dsr.workers'), value: int(report.workers), sub: `${int(report.workers * 8)} ${L('dsr.manHours')}` },
        { label: L('dsr.tempHigh'), value: `${int(report.tempHigh)}°C`, sub: report.weather },
        { label: L('dsr.siteLocation'), value: report.siteLocation, sub: L('common.project') },
      ]);

      const blocks: [TKey, string][] = [
        ['dsr.workCompleted', report.workCompleted],
        ['dsr.workInProgress', report.workInProgress],
        ['dsr.materialsUsed', report.materialsUsed],
        ['dsr.equipmentUsed', report.equipmentUsed],
        ['dsr.issues', report.issues],
        ['dsr.safety', report.safetyObservations],
        ['dsr.tomorrow', report.tomorrowPlan],
        ['common.notes', report.notes],
      ];
      for (const [key, value] of blocks) {
        if (!value?.trim()) continue;
        sectionTitle(doc, L(key));
        paragraph(doc, value);
      }

      if (report.engineers.length) {
        sectionTitle(doc, L('dsr.engineers'));
        paragraph(doc, report.engineers.join('  ·  '));
      }

      if (req.includePhotos && report.photos.length) {
        sectionTitle(doc, L('dsr.photos'), `${report.photos.length}`);
        const cols = 2;
        const gap = 5;
        const w = (CONTENT_W - gap) / cols;
        const h = 30;
        report.photos.forEach((photo, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          if (col === 0 && row > 0) {
            if (doc.y + h > FOOT_Y - 10) nextPage(doc);
            else doc.y += h + gap;
          }
          const x = M.l + (rtl(doc.lang) ? (cols - 1 - col) * (w + gap) : col * (w + gap));
          box(doc, x, doc.y, w, h, ZEBRA);
          write(doc, photo.name, x + 3, doc.y + 9, { size: 6.6, bold: true, max: w - 6 });
          write(doc, photo.caption || '—', x + 3, doc.y + 14.6, { size: 6, max: w - 6 });
          write(doc, `${photo.mime.split('/').pop()}  ·  ${int(photo.size / 1024)} KB`, x + 3, doc.y + h - 4, {
            size: 5.6,
            mono: true,
            color: MUTED,
          });
        });
        doc.y += h + 10;
      }

      signOff(doc, ctx);
    }
  }

  /* ------------------------------- SITE ALL ----------------------------- */
  else if (req.type === 'siteAll') {
    doc.title = L('rep.type.siteAll');
    titleBlock(doc, `${WORDMARK} / DSR`, L('rep.type.siteAll'), scopeMeta());
    const rows = snapshot.siteReports
      .filter((r) => (!req.projectId || r.projectId === req.projectId) && inRange(r.date))
      .sort((a, b) => b.date.localeCompare(a.date));
    const workers = rows.reduce((a, r) => a + r.workers, 0);

    kpiGrid(doc, [
      { label: L('dashboard.reportsFiled'), value: int(rows.length), sub: period },
      { label: L('dsr.workers'), value: int(workers), sub: rows.length ? `${(workers / rows.length).toFixed(0)} ${L('dashboard.avgWorkers')}` : '—' },
      { label: L('dsr.manHours'), value: int(workers * 8), sub: L('common.total') },
    ]);

    sectionTitle(doc, L('dsr.title'), `${rows.length}`);
    table(
      doc,
      [
        { header: L('dsr.ref'), width: 30, mono: true, value: (r) => r.refNo },
        { header: L('common.date'), width: 21, align: 'end', mono: true, value: (r) => dt(r.date) },
        { header: L('dsr.siteLocation'), width: 46, value: (r) => r.siteLocation },
        { header: L('dsr.weather'), width: 28, value: (r) => opt(doc, r.weather) },
        { header: L('dsr.workers'), width: 17, align: 'end', mono: true, value: (r) => int(r.workers) },
        { header: L('dsr.tempHigh'), width: 17, align: 'end', mono: true, value: (r) => `${int(r.tempHigh)}°C` },
        { header: L('common.status'), width: 24, value: (r) => (r.issues ? L('dashboard.attention') : L('dashboard.onTrack')), alert: (r) => Boolean(r.issues) },
      ],
      rows,
      { total: (rs) => [L('common.total'), '', '', '', int(rs.reduce((a, r) => a + r.workers, 0)), '', ''] },
    );

    const flagged = rows.filter((r) => r.issues?.trim());
    if (flagged.length) {
      sectionTitle(doc, L('dsr.issues'), `${flagged.length}`);
      for (const r of flagged.slice(0, 15)) {
        write(doc, `${r.refNo}  ·  ${dt(r.date)}`, 0, doc.y, { size: 6.4, mono: true, color: BAD });
        doc.y += 4;
        paragraph(doc, r.issues, 7.4);
      }
    }
  }

  /* ------------------------------- EXPENSES ----------------------------- */
  else if (req.type === 'expenses') {
    doc.title = L('rep.type.expenses');
    titleBlock(doc, `${WORDMARK} / COST`, L('rep.type.expenses'), scopeMeta());
    const rows = snapshot.expenses
      .filter((e) => (!req.projectId || e.projectId === req.projectId) && inRange(e.date))
      .sort((a, b) => b.date.localeCompare(a.date));
    const sum = rows.reduce((a, e) => a + e.amount, 0);
    const unpaid = rows.filter((e) => e.paymentStatus !== 'Paid').reduce((a, e) => a + e.amount, 0);

    kpiGrid(doc, [
      { label: L('fin.spent'), value: cash(sum), sub: `${rows.length} ${L('common.rows')}` },
      { label: L('fin.unpaidValue'), value: cash(unpaid), sub: `${((unpaid / (sum || 1)) * 100).toFixed(1)}% ${L('fin.committed')}` },
      { label: L('fin.remaining'), value: cash(totals.budget - totals.spent), sub: `${L('fin.utilisation')} ${totals.used.toFixed(1)}%` },
    ]);

    sectionTitle(doc, L('fin.byCategory'));
    table(
      doc,
      [
        { header: L('common.category'), width: 72, value: (c) => opt(doc, c.key) },
        { header: L('common.total'), width: 40, align: 'end', mono: true, value: (c) => cash(c.value) },
        { header: '%', width: 22, align: 'end', mono: true, value: (c) => `${(c.share * 100).toFixed(1)}%` },
      ],
      byCategory(rows),
      { total: (cs) => [L('common.total'), cash(cs.reduce((a, c) => a + c.value, 0)), '100.0%'] },
    );

    sectionTitle(doc, L('fin.byProject'));
    table(
      doc,
      [
        { header: L('common.project'), width: 78, value: (c) => c.label },
        { header: L('common.amount'), width: 40, align: 'end', mono: true, value: (c) => cash(c.value) },
        { header: '%', width: 22, align: 'end', mono: true, value: (c) => `${(c.share * 100).toFixed(1)}%` },
      ],
      byProject(rows, snapshot.projects),
    );

    if (req.includeCharts !== false) {
      const months = monthlySeries(rows, 12);
      sectionTitle(doc, L('fin.monthly'), `${L('rep.period')} ${period}`);
      barChart(doc, months.map((m) => m.label), months.map((m) => m.expenses), 44);
    }

    sectionTitle(doc, L('fin.title'), `${rows.length} ${L('common.rows')}`);
    table(
      doc,
      [
        { header: L('common.date'), width: 19, align: 'end', mono: true, value: (e) => dt(e.date) },
        { header: L('common.project'), width: 24, mono: true, value: (e) => snapshot.projects.find((p) => p.id === e.projectId)?.code ?? '—' },
        { header: L('common.category'), width: 27, value: (e) => opt(doc, e.category) },
        { header: L('fin.description'), width: 52, value: (e) => e.description },
        { header: L('fin.vendor'), width: 28, value: (e) => e.vendor },
        { header: L('common.amount'), width: 25, align: 'end', mono: true, value: (e) => cash(e.amount) },
        { header: L('fin.paymentStatus'), width: 19, value: (e) => opt(doc, e.paymentStatus), alert: (e) => e.paymentStatus === 'Overdue' },
      ],
      rows,
      { total: (rs) => [L('common.total'), '', '', '', '', cash(rs.reduce((a, e) => a + e.amount, 0)), ''] },
    );
  }

  /* ------------------------------- MATERIALS ---------------------------- */
  else if (req.type === 'materials') {
    doc.title = L('rep.type.materials');
    titleBlock(doc, `${WORDMARK} / STOCK`, L('rep.type.materials'), scopeMeta());
    const rows = snapshot.materials
      .filter((m) => !req.projectId || m.projectId === req.projectId)
      .sort((a, b) => b.quantity * b.unitPrice - a.quantity * a.unitPrice);
    const value = rows.reduce((a, m) => a + m.quantity * m.unitPrice, 0);
    const low = rows.filter((m) => stockState(m) !== 'available');

    kpiGrid(doc, [
      { label: L('inv.totalValue'), value: cash(value), sub: `${rows.length} ${L('docs.count')}` },
      { label: L('inv.low'), value: int(rows.filter((m) => stockState(m) === 'low').length), sub: L('stock.low') },
      { label: L('inv.out'), value: int(rows.filter((m) => stockState(m) === 'out').length), sub: L('stock.out') },
    ]);

    if (req.includeCharts !== false) {
      const cats = materialByCategory(rows).slice(0, 8);
      sectionTitle(doc, L('inv.categories'));
      barChart(doc, cats.map((c) => c.key), cats.map((c) => c.value), 38);
    }

    sectionTitle(doc, L('inv.title'), `${rows.length} ${L('docs.count')}`);
    table(
      doc,
      [
        { header: L('inv.name'), width: 46, value: (m) => m.name },
        { header: L('common.category'), width: 30, value: (m) => opt(doc, m.category) },
        { header: L('inv.quantity'), width: 23, align: 'end', mono: true, value: (m) => `${number(m.quantity, 2)} ${m.unit}`, alert: (m) => stockState(m) !== 'available' },
        { header: L('inv.unitPrice'), width: 20, align: 'end', mono: true, value: (m) => cash(m.unitPrice) },
        { header: L('inv.totalCost'), width: 25, align: 'end', mono: true, value: (m) => cash(m.quantity * m.unitPrice) },
        { header: L('inv.stockStatus'), width: 22, value: (m) => opt(doc, stockState(m) === 'out' ? 'Out' : stockState(m) === 'low' ? 'Low' : 'Available'), alert: (m) => stockState(m) === 'out' },
        { header: L('inv.supplier'), width: 30, value: (m) => m.supplier },
      ],
      rows,
      { total: (rs) => [L('common.total'), '', '', '', cash(rs.reduce((a, m) => a + m.quantity * m.unitPrice, 0)), '', ''] },
    );

    if (low.length) {
      sectionTitle(doc, L('inv.reorder'), `${low.length}`);
      for (const m of low) {
        need(doc, 12);
        write(doc, m.name, 0, doc.y, { size: 8, bold: true, max: CONTENT_W - 46 });
        write(doc, `${number(m.quantity, 2)} ${m.unit}   /   ${L('inv.minStock')} ${number(m.minStock, 2)}`, CONTENT_W, doc.y, {
          size: 7,
          mono: true,
          color: stockState(m) === 'out' ? BAD : MUTED,
          align: 'end',
        });
        doc.y += 5.6;
      }
    }
  }

  /* --------------------------------- TASKS ------------------------------ */
  else if (req.type === 'tasks') {
    doc.title = L('rep.type.tasks');
    titleBlock(doc, `${WORDMARK} / TASKS`, L('rep.type.tasks'), scopeMeta());
    const rows = snapshot.tasks
      .filter((x) => (!req.projectId || x.projectId === req.projectId) && (!req.to || x.dueDate <= req.to))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const done = rows.filter((x) => x.status === 'Completed').length;
    const overdue = rows.filter((x) => x.status !== 'Completed' && x.dueDate < today);

    kpiGrid(doc, [
      { label: L('tasks.title'), value: int(rows.length), sub: L('common.total') },
      { label: L('tasks.markComplete'), value: rows.length ? `${((done / rows.length) * 100).toFixed(1)}%` : '0%', sub: `${done} ${L('status.Completed')}` },
      { label: L('dashboard.overdue'), value: int(overdue.length), sub: `${rows.length - done} ${L('dashboard.openTasks')}` },
    ]);

    sectionTitle(doc, L('tasks.byAssignee'));
    const loads = new Map<string, { open: number; done: number }>();
    for (const x of rows) {
      const key = x.assignee || '—';
      const row = loads.get(key) ?? { open: 0, done: 0 };
      if (x.status === 'Completed') row.done += 1;
      else row.open += 1;
      loads.set(key, row);
    }
    table(
      doc,
      [
        { header: L('tasks.assignee'), width: 76, value: (k) => k },
        { header: L('dashboard.openTasks'), width: 32, align: 'end', mono: true, value: (k) => int(loads.get(k)!.open) },
        { header: L('status.Completed'), width: 32, align: 'end', mono: true, value: (k) => int(loads.get(k)!.done) },
        { header: L('common.total'), width: 22, align: 'end', mono: true, value: (k) => int(loads.get(k)!.open + loads.get(k)!.done) },
      ],
      [...loads.keys()],
    );

    sectionTitle(doc, L('tasks.title'), `${rows.length}`);
    table(
      doc,
      [
        { header: L('tasks.name'), width: 60, value: (x) => x.name },
        { header: L('common.project'), width: 24, mono: true, value: (x) => snapshot.projects.find((p) => p.id === x.projectId)?.code ?? '—' },
        { header: L('tasks.assignee'), width: 28, value: (x) => x.assignee || '—' },
        { header: L('tasks.priority'), width: 18, value: (x) => opt(doc, x.priority) },
        { header: L('tasks.dueDate'), width: 21, align: 'end', mono: true, value: (x) => dt(x.dueDate) },
        { header: L('common.status'), width: 23, value: (x) => opt(doc, x.status), alert: (x) => x.status !== 'Completed' && x.dueDate < today },
      ],
      rows,
    );
  }

  footer(doc);
  return pdf.output('blob');
}

export async function downloadReport(req: ReportRequest, ctx: ReportContext): Promise<void> {
  const blob = await buildReport(req, ctx);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = reportFileName(req, ctx);
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function reportFileName(req: ReportRequest, ctx: ReportContext): string {
  const p = ctx.snapshot.projects.find((x) => x.id === req.projectId);
  const parts = [WORDMARK, req.type];
  if (p) parts.push(p.code);
  if (req.from) parts.push(req.from);
  if (req.to) parts.push(req.to);
  return `${parts.join('-')}.pdf`;
}
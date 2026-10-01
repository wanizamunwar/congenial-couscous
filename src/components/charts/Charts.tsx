/* ==========================================================================
   CHART PRIMITIVES
   Hand-built SVG charts. Every axis is hairlined and monospaced, tooltips are
   plain HTML so they inherit the theme, and nothing animates on scroll.
   ========================================================================== */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export interface Series {
  key: string;
  label: string;
  color: string;
  values: number[];
}

/**
 * Observe the host width so the SVG user units map 1:1 to CSS pixels.
 * Charts therefore stay crisp instead of being stretched by a viewBox.
 */
function useWidth(fallback = 640) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && Math.abs(w - width) > 0.5) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, Math.max(220, Math.round(width))] as const;
}

interface TipState {
  x: number;
  y: number;
  title: string;
  rows: { label: string; value: string; color?: string }[];
}

function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = 10 ** exp;
  const n = v / base;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * base;
}

function ticks(max: number, count = 4): number[] {
  const out: number[] = [];
  for (let i = 0; i <= count; i += 1) out.push((max / count) * i);
  return out;
}

/* --------------------------------- Tooltip -------------------------------- */

function ChartTip({ tip, rtl }: { tip: TipState | null; rtl: boolean }) {
  if (!tip) return null;
  return (
    <div
      className="chart-tip"
      style={{
        insetInlineStart: rtl ? undefined : `${tip.x}px`,
        insetInlineEnd: rtl ? `${tip.x}px` : undefined,
        top: `${tip.y}px`,
        transform: rtl ? 'translate(50%, -100%)' : 'translate(-50%, -100%)',
      }}
    >
      <div className="chart-tip-title">{tip.title}</div>
      {tip.rows.map((r, i) => (
        <div className="chart-tip-row" key={i}>
          {r.color ? <i className="sw" style={{ background: r.color }} /> : null}
          <span className="k">{r.label}</span>
          <span className="v">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/* --------------------------------- Legend --------------------------------- */

export function ChartLegend({
  items,
}: {
  items: { label: string; color: string; value?: string }[];
}) {
  if (items.length <= 1) return null;
  return (
    <div className="chart-legend">
      {items.map((it) => (
        <span className="chart-legend-item" key={it.label}>
          <i className="chart-legend-swatch" style={{ background: it.color }} />
          {it.label}
          {it.value ? <b className="chart-legend-val">{it.value}</b> : null}
        </span>
      ))}
    </div>
  );
}

/* ============================== COLUMN CHART ============================== */

export function ColumnChart({
  labels,
  series,
  height = 190,
  format = (v) => String(Math.round(v)),
  rtl = false,
  stacked = false,
  maxTicks = 4,
}: {
  labels: string[];
  series: Series[];
  height?: number;
  format?: (v: number) => string;
  rtl?: boolean;
  stacked?: boolean;
  maxTicks?: number;
}) {
  const [tip, setTip] = useState<TipState | null>(null);
  const [hostRef, W] = useWidth();

  const H = height;
  const padL = 46;
  const padR = 12;
  const padT = 10;
  const padB = 24;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const max = useMemo(() => {
    let m = 0;
    if (stacked) {
      for (let i = 0; i < labels.length; i += 1) {
        let sum = 0;
        for (const s of series) sum += s.values[i] ?? 0;
        if (sum > m) m = sum;
      }
    } else {
      for (const s of series) for (const v of s.values) if (v > m) m = v;
    }
    return niceCeil(m || 1);
  }, [labels.length, series, stacked]);

  const step = plotW / Math.max(1, labels.length);
  const band = Math.min(46, step * 0.62);
  const yOf = (v: number) => padT + plotH - (v / max) * plotH;

  return (
    <div className="chart-host" ref={hostRef}>
      <svg
        className="chart-svg"
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        role="img"
        aria-label="Column chart"
      >
        {ticks(max, maxTicks).map((t, i) => (
          <g key={i}>
            <line
              className="chart-grid-line"
              x1={padL}
              x2={W - padR}
              y1={yOf(t)}
              y2={yOf(t)}
              strokeDasharray={i === 0 ? undefined : '2 3'}
            />
            <text
              className={`chart-tick${i === maxTicks ? ' is-strong' : ''}`}
              x={rtl ? padL + 4 : W - padR - 4}
              y={yOf(t) - 3}
              textAnchor={rtl ? 'start' : 'end'}
            >
              {format(t)}
            </text>
          </g>
        ))}
        <line className="chart-axis-line" x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH} />

        {labels.map((label, i) => {
          const slot = rtl ? labels.length - 1 - i : i;
          const cx = padL + step * slot + step / 2;
          const stackedBase = new Array<number>(series.length).fill(0);
          return (
            <g key={i}>
              <rect
                className="chart-hover-band"
                x={padL + step * slot}
                y={padT}
                width={step}
                height={plotH}
              />
              {series.map((s, si) => {
                const v = s.values[i] ?? 0;
                if (stacked) {
                  const base = stackedBase[si] ?? 0;
                  stackedBase[si] = base + v;
                  const y0 = yOf(base + v);
                  const y1 = yOf(base);
                  return (
                    <rect
                      key={s.key}
                      className="chart-bar"
                      x={cx - band / 2}
                      y={y0}
                      width={band}
                      height={Math.max(0, y1 - y0)}
                      fill={s.color}
                    />
                  );
                }
                const each = series.length > 1 ? band / series.length : band;
                const x = cx - (band / 2) + each * si;
                return (
                  <rect
                    key={s.key}
                    className="chart-bar"
                    x={x}
                    y={yOf(v)}
                    width={Math.max(1, each - 1)}
                    height={Math.max(0, padT + plotH - yOf(v))}
                    fill={s.color}
                  />
                );
              })}
              <text
                className="chart-tick"
                x={cx}
                y={H - 8}
                textAnchor="middle"
              >
                {labels[i]}
              </text>
              <rect
                className="chart-hit"
                x={padL + step * slot}
                y={padT}
                width={step}
                height={plotH}
                onMouseMove={(e) => {
                  const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  setTip({
                    x: e.clientX - box.left,
                    y: e.clientY - box.top - 6,
                    title: label,
                    rows: series.map((s) => ({ label: s.label, value: format(s.values[i] ?? 0), color: s.color })),
                  });
                }}
                onMouseLeave={() => setTip(null)}
              />
            </g>
          );
        })}
      </svg>
      <ChartTip tip={tip} rtl={rtl} />
    </div>
  );
}

/* =============================== LINE / AREA ============================== */

export function LineChart({
  labels,
  series,
  height = 200,
  format = (v) => String(Math.round(v)),
  rtl = false,
  area = true,
  yMax,
  yMin = 0,
}: {
  labels: string[];
  series: Series[];
  height?: number;
  format?: (v) => string;
  rtl?: boolean;
  area?: boolean;
  yMax?: number;
  yMin?: number;
}) {
  const [tip, setTip] = useState<TipState | null>(null);
  const [hostRef, W] = useWidth();

  const H = height;
  const padL = 48;
  const padR = 12;
  const padT = 12;
  const padB = 24;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = Math.max(1, labels.length);

  const bounds = useMemo(() => {
    let lo = yMin;
    let hi = yMax ?? 0;
    if (yMax === undefined) {
      for (const s of series) for (const v of s.values) if (v > hi) hi = v;
      hi = niceCeil(hi || 1);
    }
    if (hi === lo) hi = lo + 1;
    return { lo, hi };
  }, [series, yMin, yMax]);

  const xOf = (i: number) => (rtl ? padL + plotW - (i / (n - 1 || 1)) * plotW : padL + (i / (n - 1 || 1)) * plotW);
  const yOf = (v: number) => padT + plotH - ((v - bounds.lo) / (bounds.hi - bounds.lo)) * plotH;

  const step = plotW / Math.max(1, n - 1);

  return (
    <div className="chart-host" ref={hostRef}>
      <svg
        className="chart-svg"
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        role="img"
        aria-label="Line chart"
      >
        {ticks(bounds.hi - bounds.lo, 4).map((t, i) => {
          const v = bounds.lo + t;
          return (
            <g key={i}>
              <line
                className="chart-grid-line"
                x1={padL}
                x2={W - padR}
                y1={yOf(v)}
                y2={yOf(v)}
                strokeDasharray={i === 0 ? undefined : '2 3'}
              />
              <text
                className="chart-tick"
                x={rtl ? padL + 4 : W - padR - 4}
                y={yOf(v) - 3}
                textAnchor={rtl ? 'start' : 'end'}
              >
                {format(v)}
              </text>
            </g>
          );
        })}
        <line className="chart-axis-line" x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH} />

        {series.map((s) => {
          const pts = s.values.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ');
          const baseY = padT + plotH;
          return (
            <g key={s.key}>
              {area ? (
                <polygon
                  className="chart-area"
                  points={`${xOf(0)},${baseY} ${pts} ${xOf(s.values.length - 1)},${baseY}`}
                  fill={s.color}
                />
              ) : null}
              <polyline className="chart-line" points={pts} stroke={s.color} />
              {s.values.map((v, i) => (
                <circle key={i} className="chart-dot" cx={xOf(i)} cy={yOf(v)} r={2.4} fill={s.color} />
              ))}
            </g>
          );
        })}

        {labels.map((label, i) =>
          n <= 13 || i % Math.ceil(n / 8) === 0 ? (
            <text key={i} className="chart-tick" x={xOf(i)} y={H - 7} textAnchor="middle">
              {label}
            </text>
          ) : null,
        )}

        {labels.map((_, i) => (
          <rect
            key={i}
            className="chart-hit"
            x={xOf(i) - step / 2}
            y={padT}
            width={step}
            height={plotH}
            onMouseMove={(e) => {
              const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
              setTip({
                x: e.clientX - box.left,
                y: e.clientY - box.top - 6,
                title: labels[i],
                rows: series.map((s) => ({ label: s.label, value: format(s.values[i] ?? 0), color: s.color })),
              });
            }}
            onMouseLeave={() => setTip(null)}
          />
        ))}
      </svg>
      <ChartTip tip={tip} rtl={rtl} />
    </div>
  );
}

/* ================================= DONUT ================================== */

export function DonutChart({
  slices,
  size = 168,
  thickness = 26,
  centerBig,
  centerSmall,
  format = (v) => String(Math.round(v)),
  rtl = false,
}: {
  slices: { key: string; label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerBig?: string;
  centerSmall?: string;
  format?: (v: number) => string;
  rtl?: boolean;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const total = slices.reduce((acc, s) => acc + s.value, 0);
  const r = size / 2;
  const ir = r - thickness;
  const C = 2 * Math.PI * ir;

  // In RTL the ring reads from the top towards the left, matching the layout.
  const ordered = rtl ? [...slices].reverse() : slices;

  let cursor = 0;
  const arcs = ordered.map((s) => {
    const frac = total > 0 ? s.value / total : 0;
    const arc = { ...s, dash: frac * C, offset: cursor * C, frac };
    cursor += frac;
    return arc;
  });

  const hovered = arcs.find((a) => a.key === hover);

  return (
    <div className="chart-host" style={{ display: 'grid', placeItems: 'center' }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Donut chart"
      >
        <circle cx={r} cy={r} r={ir} fill="none" stroke="var(--surface-inset)" strokeWidth={thickness} />
        {arcs.map((a) => (
          <circle
            key={a.key}
            className="donut-seg"
            cx={r}
            cy={r}
            r={ir}
            fill="none"
            stroke={a.color}
            strokeWidth={hover === a.key ? thickness + 3 : thickness}
            strokeDasharray={`${Math.max(0, a.dash - 1.5)} ${C}`}
            strokeDashoffset={-a.offset}
            onMouseEnter={() => setHover(a.key)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        <g className="donut-center">
          <text className="big" x={r} y={centerSmall ? r - 2 : r + 7}>
            {hovered ? format(hovered.value) : (centerBig ?? '')}
          </text>
          {centerSmall ? (
            <text className="small" x={r} y={r + 15}>
              {hovered ? `${(hovered.frac * 100).toFixed(1)}%` : centerSmall}
            </text>
          ) : null}
        </g>
      </svg>
    </div>
  );
}

/* ============================== RANKED BARS =============================== */

export function RankedBars({
  rows,
  format = (v) => String(Math.round(v)),
  onSelect,
  emptyText,
}: {
  rows: { key: string; label: string; value: number; sub?: string; color?: string }[];
  format?: (v: number) => string;
  onSelect?: (key: string) => void;
  emptyText?: ReactNode;
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0) || 1;
  if (!rows.length) {
    return <div className="empty" style={{ padding: '22px 14px' }}>{emptyText}</div>;
  }
  return (
    <div className="ranklist">
      {rows.map((r) => {
        const pct = Math.max(1.5, (r.value / max) * 100);
        const Tag = onSelect ? 'button' : 'div';
        return (
          <Tag
            key={r.key}
            className="rankrow"
            {...(onSelect
              ? { type: 'button' as const, onClick: () => onSelect(r.key), style: { textAlign: 'start' as const } }
              : {})}
          >
            <div className="rankrow-name">
              <div className="n">
                <span>{r.label}</span>
                {r.sub ? <span className="sub">{r.sub}</span> : null}
              </div>
              <div className="bar is-thin">
                <i style={{ width: `${pct}%`, background: r.color ?? 'var(--brand)' }} />
              </div>
            </div>
            <div className="rankrow-val">
              {format(r.value)}
              {r.sub ? <span className="sub">{r.sub}</span> : null}
            </div>
          </Tag>
        );
      })}
    </div>
  );
}

/* =============================== SPARKLINE ================================ */

export function Sparkline({
  values,
  width = 96,
  height = 26,
  color = 'var(--brand)',
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const d = values
    .map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / span) * (height - 3) - 1.5).toFixed(1)}`)
    .join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden style={{ overflow: 'visible' }}>
      <polyline className="chart-line" points={d} stroke={color} strokeWidth={1.3} />
    </svg>
  );
}

/* ============================ PALETTE HELPERS ============================= */

/** Categorical series colours — muted, print-safe, distinguishable. */
export const SERIES_COLORS = [
  'var(--brand)',
  '#b5651d',
  '#4a7c59',
  '#7a4f8c',
  '#8c5b3f',
  '#2f6f8f',
  '#96551f',
  '#3f6b52',
];

export function seriesColor(i: number): string {
  return SERIES_COLORS[i % SERIES_COLORS.length];
}

/** Smoothly interpolate a hover position to an index. */
export function useCursorIndex(count: number) {
  const [idx, setIdx] = useState(-1);
  const onMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const box = e.currentTarget.getBoundingClientRect();
      const rel = (e.clientX - box.left) / box.width;
      setIdx(Math.max(0, Math.min(count - 1, Math.floor(rel * count))));
    },
    [count],
  );
  return { idx, onMove, onLeave: () => setIdx(-1) };
}
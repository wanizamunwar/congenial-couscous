'use client';

import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/* --------------------------------- Panel --------------------------------- */

export interface PanelProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: IconName;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  note?: ReactNode;
  flush?: boolean;
  className?: string;
  bodyClassName?: string;
  id?: string;
}

export function Panel({
  title,
  subtitle,
  icon,
  actions,
  children,
  footer,
  note,
  flush,
  className = '',
  bodyClassName = '',
  id,
}: PanelProps) {
  return (
    <section className={`panel ${className}`} id={id}>
      {title || actions ? (
        <header className="panel-head">
          {title ? (
            <div className="panel-title">
              {icon ? <Icon name={icon} size={16} /> : null}
              <div style={{ minWidth: 0 }}>
                <div className="truncate">{title}</div>
                {subtitle ? <div className="panel-sub">{subtitle}</div> : null}
              </div>
            </div>
          ) : (
            <span />
          )}
          {actions ? <div className="panel-actions no-print">{actions}</div> : null}
        </header>
      ) : null}
      <div className={`panel-body${flush ? ' is-flush' : ''} ${bodyClassName}`}>{children}</div>
      {note ? <div className="panel-note">{note}</div> : null}
      {footer ? <div className="panel-foot no-print">{footer}</div> : null}
    </section>
  );
}

/* ----------------------------- Description list -------------------------- */

export function DescriptionList({
  items,
  columns = 1,
}: {
  items: { term: ReactNode; value: ReactNode }[];
  columns?: 1 | 2;
}) {
  return (
    <dl className={`dl${columns === 2 ? ' is-2' : ''}`}>
      {items.map((it, i) => (
        <div className="dl-row" key={i}>
          <dt>{it.term}</dt>
          <dd>{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------- Stat tile ------------------------------- */

export interface StatProps {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  icon?: IconName;
  accent?: string;
  foot?: ReactNode;
  delta?: { value: string; dir: 'up' | 'down' | 'flat' };
  onClick?: () => void;
  title?: string;
}

export function Stat({
  label,
  value,
  unit,
  icon,
  accent,
  foot,
  delta,
  onClick,
  title,
}: StatProps) {
  const inner = (
    <>
      <div className="stat-top">
        {icon ? (
          <Icon name={icon} size={14} className="stat-ico" />
        ) : null}
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-val">
        <span>{value}</span>
        {unit ? <span className="stat-unit">{unit}</span> : null}
      </div>
      <div className="stat-foot">
        {delta ? (
          <span className={`stat-delta ${delta.dir}`}>
            {delta.dir === 'up' ? '▲' : delta.dir === 'down' ? '▼' : '—'} {delta.value}
          </span>
        ) : null}
        {foot ? <span className="truncate">{foot}</span> : null}
      </div>
    </>
  );

  const style = accent ? ({ '--tile-accent': accent } as React.CSSProperties) : undefined;

  if (onClick) {
    return (
      <button type="button" className="stat" style={style} onClick={onClick} title={title}>
        {inner}
      </button>
    );
  }
  return (
    <div className="stat" style={style} title={title}>
      {inner}
    </div>
  );
}

/* -------------------------------- Progress ------------------------------- */

export function Bar({
  value,
  tone = 'brand',
  size = 'md',
  striped,
  label,
}: {
  value: number;
  tone?: 'brand' | 'ok' | 'warn' | 'bad';
  size?: 'thin' | 'md' | 'thick' | 'lg';
  striped?: boolean;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value || 0));
  return (
    <div
      className={`bar${size === 'thin' ? ' is-thin' : size === 'thick' ? ' is-thick' : size === 'lg' ? ' bar-lg' : ''}${striped ? ' is-striped' : ''}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <i
        className={tone === 'ok' ? 'bar-ok' : tone === 'warn' ? 'bar-warn' : tone === 'bad' ? 'bar-bad' : ''}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function BarRow({
  value,
  tone,
  size,
  striped,
  suffix = '%',
}: {
  value: number;
  tone?: 'brand' | 'ok' | 'warn' | 'bad';
  size?: 'thin' | 'md' | 'thick' | 'lg';
  striped?: boolean;
  suffix?: string;
}) {
  return (
    <div className="bar-row">
      <Bar value={value} tone={tone} size={size} striped={striped} />
      <span className="bar-val">{Math.round(value)}{suffix}</span>
    </div>
  );
}

/* ------------------------------- Empty state ----------------------------- */

export function EmptyState({
  icon = 'folder',
  title,
  text,
  action,
  compact,
}: {
  icon?: IconName;
  title: ReactNode;
  text?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="empty" style={compact ? { padding: '26px 20px' } : undefined}>
      <div className="empty-ico">
        <Icon name={icon} size={18} />
      </div>
      <div className="empty-title">{title}</div>
      {text ? <div className="empty-text">{text}</div> : null}
      {action}
    </div>
  );
}

/* --------------------------------- Alert --------------------------------- */

export function Alert({
  tone = 'info',
  title,
  children,
  action,
}: {
  tone?: 'info' | 'warn' | 'bad' | 'ok' | 'neutral';
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const icon: IconName =
    tone === 'warn' ? 'warning' : tone === 'bad' ? 'alert' : tone === 'ok' ? 'check' : 'info';
  return (
    <div className={`alert alert-${tone}`}>
      <Icon name={icon} size={15} />
      <div className="grow">
        {title ? <div className="alert-title">{title}</div> : null}
        {children ? <div>{children}</div> : null}
      </div>
      {action ? <div className="no-print">{action}</div> : null}
    </div>
  );
}

/* --------------------------------- Avatar -------------------------------- */

export function Avatar({
  name,
  src,
  size = 'md',
}: {
  name: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}) {
  const initials = name
    .replace(/^Engr\.?\s+/i, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div className={`avatar avatar-${size}`} title={name}>
      {src ? <img src={src} alt={name} /> : initials || '—'}
    </div>
  );
}
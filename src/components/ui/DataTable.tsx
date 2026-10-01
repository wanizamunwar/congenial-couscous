'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { Button } from './Button';
import { EmptyState } from './Panel';

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** Cell renderer. */
  render: (row: T) => ReactNode;
  /** Sort accessor; omit to make the column non-sortable. */
  sort?: (row: T) => string | number;
  align?: 'start' | 'end' | 'center';
  width?: string;
  /** Value used by the built-in search box. */
  search?: (row: T) => string;
  hideBelow?: 'sm' | 'md' | 'lg';
  printHide?: boolean;
}

export interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Extra filter controls rendered in the toolbar. */
  toolbar?: ReactNode;
  pageSize?: number;
  compact?: boolean;
  emptyIcon?: Parameters<typeof EmptyState>[0]['icon'];
  emptyTitle?: string;
  emptyText?: string;
  footer?: ReactNode;
  /** Initial sort. */
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  /** Externally-controlled search term (two-way bound). */
  query?: string;
  onQueryChange?: (q: string) => void;
  stickyFirst?: boolean;
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  searchable = true,
  searchPlaceholder,
  toolbar,
  pageSize = 25,
  compact = false,
  emptyIcon = 'list',
  emptyTitle,
  emptyText,
  footer,
  initialSort,
  query: queryProp,
  onQueryChange,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(initialSort?.key ?? null);
  const [dir, setDir] = useState<'asc' | 'desc'>(initialSort?.dir ?? 'asc');
  const [page, setPage] = useState(0);
  const [pageSizeState, setPageSizeState] = useState(pageSize);

  const term = queryProp ?? query;
  const setTerm = (v: string) => {
    if (onQueryChange) onQueryChange(v);
    if (queryProp === undefined) setQuery(v);
    setPage(0);
  };

  const filtered = useMemo(() => {
    if (!term.trim()) return rows;
    const needle = term.trim().toLowerCase();
    const cols = columns.filter((c) => c.search);
    return rows.filter((r) => cols.some((c) => (c.search!(r) ?? '').toLowerCase().includes(needle)));
  }, [rows, term, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sort) return filtered;
    const out = [...filtered];
    out.sort((a, b) => {
      const va = col.sort!(a);
      const vb = col.sort!(b);
      if (typeof va === 'number' && typeof vb === 'number') return va - vb;
      return String(va).localeCompare(String(vb), undefined, { numeric: true });
    });
    if (dir === 'desc') out.reverse();
    return out;
  }, [filtered, sortKey, dir, columns]);

  const total = sorted.length;
  const pages = Math.max(1, Math.ceil(total / pageSizeState));
  const safePage = Math.min(page, pages - 1);
  const pageRows = sorted.slice(safePage * pageSizeState, safePage * pageSizeState + pageSizeState);

  const toggleSort = (key: string) => {
    if (sortKey === key) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setDir('asc');
    }
    setPage(0);
  };

  if (rows.length === 0) {
    return (
      <div className="panel">
        {searchable || toolbar ? (
          <div className="toolbar">
            {searchable ? (
              <span className="input-icon grow">
                <Icon name="search" size={15} />
                <input
                  className="input"
                  value={term}
                  placeholder={searchPlaceholder}
                  onChange={(e) => setTerm(e.target.value)}
                />
              </span>
            ) : null}
            {toolbar}
          </div>
        ) : null}
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle ?? 'No records'}
          text={emptyText}
        />
      </div>
    );
  }

  const pageNumbers = buildPages(safePage + 1, pages);

  return (
    <div className="panel">
      {searchable || toolbar ? (
        <div className="toolbar no-print">
          {searchable ? (
            <span className="input-icon grow">
              <Icon name="search" size={15} />
              <input
                className="input"
                value={term}
                placeholder={searchPlaceholder ?? 'Search…'}
                onChange={(e) => setTerm(e.target.value)}
                aria-label="Search table"
              />
              {term ? (
                <button
                  type="button"
                  className="input-clear"
                  onClick={() => setTerm('')}
                  aria-label="Clear search"
                >
                  <Icon name="close" size={13} />
                </button>
              ) : null}
            </span>
          ) : null}
          {toolbar}
        </div>
      ) : null}

      <div className="tablewrap">
        <table className={`tbl${compact ? ' tbl--compact' : ''}`}>
          <thead>
            <tr>
              {columns.map((c) => {
                const sorted_ = sortKey === c.key;
                return (
                  <th
                    key={c.key}
                    style={c.width ? { width: c.width } : undefined}
                    className={[
                      c.align === 'end' ? 'is-right' : c.align === 'center' ? 'is-center' : '',
                      c.sort ? 'is-sortable' : '',
                      sorted_ ? 'is-sorted' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={c.sort ? () => toggleSort(c.key) : undefined}
                    aria-sort={sorted_ ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    scope="col"
                  >
                    <span className={`th-in${c.align === 'end' ? '' : ''}`}>
                      <span>{c.header}</span>
                      {c.sort ? (
                        <Icon
                          name={sorted_ ? (dir === 'asc' ? 'sort-asc' : 'sort-desc') : 'sort'}
                          size={12}
                          className="sort-ind"
                        />
                      ) : null}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr
                key={rowKey(row)}
                className={onRowClick ? 'is-clickable' : ''}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={[
                      c.align === 'end' ? 'is-right' : c.align === 'center' ? 'is-center' : '',
                      c.key === columns[0].key ? 'is-primary' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="tblfoot no-print">
        <span className="mono">
          {total.toLocaleString()} {total === 1 ? 'row' : 'rows'}
        </span>
        {term ? <span className="tag">“{term}”</span> : null}
        <label className="row" style={{ gap: 5 }}>
          <span className="t-muted-2">Rows</span>
          <select
            className="select"
            style={{ width: 'auto', minWidth: 66, height: 26 }}
            value={pageSizeState}
            onChange={(e) => {
              setPageSizeState(Number(e.target.value));
              setPage(0);
            }}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        {pages > 1 ? (
          <div className="pager">
            <button type="button" onClick={() => setPage(0)} disabled={safePage === 0} aria-label="First page">
              <Icon name="chevrons-left" size={13} />
            </button>
            <button
              type="button"
              onClick={() => setPage(safePage - 1)}
              disabled={safePage === 0}
              aria-label="Previous page"
            >
              <Icon name="chevron-left" size={13} />
            </button>
            {pageNumbers.map((p, i) =>
              p === '…' ? (
                <span key={`gap-${i}`} className="mono" style={{ padding: '0 2px', color: 'var(--ink-4)' }}>
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  className={p === safePage + 1 ? 'is-active' : ''}
                  onClick={() => setPage(p - 1)}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => setPage(safePage + 1)}
              disabled={safePage >= pages - 1}
              aria-label="Next page"
            >
              <Icon name="chevron-right" size={13} />
            </button>
            <button
              type="button"
              onClick={() => setPage(pages - 1)}
              disabled={safePage >= pages - 1}
              aria-label="Last page"
            >
              <Icon name="chevrons-right" size={13} />
            </button>
          </div>
        ) : null}
        {footer}
      </div>
    </div>
  );
}

function buildPages(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  const from = Math.max(2, current - 1);
  const to = Math.min(total - 1, current + 1);
  if (from > 2) out.push('…');
  for (let i = from; i <= to; i += 1) out.push(i);
  if (to < total - 1) out.push('…');
  out.push(total);
  return out;
}

/* ----------------------------- confirmation ------------------------------ */

export function DeleteButton({
  onConfirm,
  label = 'Delete',
  size = 'sm',
  disabled,
}: {
  onConfirm: () => void;
  label?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <Button
        size={size}
        variant="danger"
        icon="trash"
        disabled={disabled}
        onClick={() => setArmed(true)}
        title={label}
        aria-label={label}
        iconOnly
      />
    );
  }
  return (
    <span className="row" style={{ gap: 3 }}>
      <Button size="sm" variant="solid-danger" onClick={onConfirm}>
        Confirm
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setArmed(false)} icon="close" iconOnly aria-label="Cancel" />
    </span>
  );
}
'use client';

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Icon, type IconName } from './Icon';

/* --------------------------------- Field --------------------------------- */

export interface FieldProps {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  optionalLabel?: string;
  className?: string;
  children: ReactNode;
  span2?: boolean;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  optionalLabel,
  className = '',
  children,
  span2,
}: FieldProps) {
  return (
    <div className={`field${span2 ? ' span-2' : ''} ${className}`}>
      {label ? (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
          {required ? (
            <span className="req" aria-hidden>
              *
            </span>
          ) : optionalLabel ? (
            <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: 'none' }}>
              ({optionalLabel})
            </span>
          ) : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <span className="field-err" role="alert">
          <Icon name="alert" size={13} />
          {error}
        </span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </div>
  );
}

/* --------------------------------- Input --------------------------------- */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: IconName;
  affix?: ReactNode;
  affixLead?: boolean;
  error?: boolean;
  clearable?: boolean;
  onClear?: () => void;
  mono?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { icon, affix, affixLead = true, error, clearable, onClear, className = '', mono, ...rest },
  ref,
) {
  const control = (
    <input
      ref={ref}
      className={`input${error ? ' is-err' : ''}${mono ? ' mono' : ''} ${className}`}
      {...rest}
    />
  );

  if (affix) {
    return (
      <div className="input-group">
        {affixLead ? (
          <span className="input-affix is-lead" aria-hidden>
            {affix}
          </span>
        ) : null}
        {control}
        {!affixLead ? (
          <span className="input-affix" aria-hidden>
            {affix}
          </span>
        ) : null}
      </div>
    );
  }

  if (icon || clearable) {
    return (
      <span className="input-icon">
        {icon ? <Icon name={icon} size={15} /> : null}
        {control}
        {clearable && (String(rest.value ?? '') || rest.defaultValue) && onClear ? (
          <button
            type="button"
            className="input-clear"
            onClick={onClear}
            aria-label="Clear"
            tabIndex={-1}
          >
            <Icon name="close" size={13} />
          </button>
        ) : null}
      </span>
    );
  }

  return control;
});

/* -------------------------------- Select --------------------------------- */

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  selectSize?: 'sm' | 'md';
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { error, className = '', children, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={`select${error ? ' is-err' : ''} ${className}`} {...rest}>
      {children}
    </select>
  );
});

/* ------------------------------- Textarea -------------------------------- */

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean; code?: boolean }
>(function Textarea({ error, code, className = '', rows = 4, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={`textarea${error ? ' is-err' : ''}${code ? ' is-code' : ''} ${className}`}
      {...rest}
    />
  );
});

/* ------------------------------- Checkbox -------------------------------- */

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  hint?: ReactNode;
}

export function Checkbox({ label, hint, id, ...rest }: CheckboxProps) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <label className="check" htmlFor={inputId}>
      <input type="checkbox" id={inputId} {...rest} />
      <span>
        {label}
        {hint ? (
          <span className="field-hint" style={{ display: 'block' }}>
            {hint}
          </span>
        ) : null}
      </span>
    </label>
  );
}

/* -------------------------------- Switch --------------------------------- */

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  hint?: ReactNode;
}

export function Switch({ label, hint, id, ...rest }: SwitchProps) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <div className="switch-wrap">
      <label className="switch" htmlFor={inputId}>
        <input type="checkbox" id={inputId} {...rest} />
        <span>
          <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 500 }}>{label}</span>
          {hint ? (
            <span className="field-hint" style={{ display: 'block' }}>
              {hint}
            </span>
          ) : null}
        </span>
      </label>
    </div>
  );
}

/* -------------------------------- Segmented ------------------------------- */

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: ReactNode; icon?: IconName }[];
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="seg" role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          className={o.value === value ? 'is-active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.icon ? <Icon name={o.icon} size={14} /> : null}
          {o.label}
        </button>
      ))}
    </div>
  );
}
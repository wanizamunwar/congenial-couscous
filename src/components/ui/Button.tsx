'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export type ButtonVariant =
  | 'default'
  | 'primary'
  | 'danger'
  | 'solid-danger'
  | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconEnd?: IconName;
  loading?: boolean;
  block?: boolean;
  iconOnly?: boolean;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  default: '',
  primary: 'btn-primary',
  danger: 'btn-danger',
  'solid-danger': 'btn-solid-danger',
  ghost: 'btn-ghost',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'default',
    size = 'md',
    icon,
    iconEnd,
    loading = false,
    block = false,
    iconOnly = false,
    className = '',
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  const classes = [
    'btn',
    VARIANT_CLASS[variant],
    size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '',
    block ? 'btn-block' : '',
    iconOnly ? 'btn-icon' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="spin" aria-hidden /> : icon ? <Icon name={icon} size={iconSize} /> : null}
      {!iconOnly && children ? <span>{children}</span> : null}
      {!loading && iconEnd && !iconOnly ? <Icon name={iconEnd} size={iconSize} /> : null}
    </button>
  );
});

export interface LinkButtonProps {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  className?: string;
  children: ReactNode;
  title?: string;
}

export function LinkButton({
  href,
  variant = 'default',
  size = 'md',
  icon,
  className = '',
  children,
  title,
}: LinkButtonProps) {
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;
  return (
    <a
      href={href}
      title={title}
      className={['btn', VARIANT_CLASS[variant], size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      {icon ? <Icon name={icon} size={iconSize} /> : null}
      <span>{children}</span>
    </a>
  );
}
'use client';

import * as React from 'react';
import { cn } from './utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  active?: boolean;
  loading?: boolean;
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  active,
  loading,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  const variants: Record<string, string> = {
    primary: 'bg-ozon-600 text-white border-ozon-600 hover:bg-ozon-700 focus:ring-ozon-500',
    secondary: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-gray-500',
    ghost: 'bg-transparent text-gray-600 border-gray-200 hover:bg-gray-100 focus:ring-gray-500',
    danger: 'bg-red-600 text-white border-red-600 hover:bg-red-700 focus:ring-red-500',
  };
  const sizes: Record<string, string> = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-4 py-2',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], active && 'ring-2 ring-inset ring-ozon-600', className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {children}
    </button>
  );
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export function Card({ className, padded = true, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-4 shadow-sm',
        padded ? 'p-6' : '',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ozon-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500',
        className,
      )}
      {...props}
    />
  );
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'ozon' | 'fzr' | 'used' | 'new';
  count?: number;
}

export function Select({ className, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ozon-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500',
        className,
      )}
      {...props}
    />
  );
}


export function Badge({
  className,
  variant = 'ozon',
  count,
  children,
  ...props
}: BadgeProps) {
  const base =
    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors';
  const variants: Record<string, string> = {
    ozon: 'border-ozon-200 bg-ozon-50 text-ozon-700',
    fzr: 'border-fzr-200 bg-fzr-50 text-fzr-700',
    used: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    new: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  };
  return (
    <span className={cn(base, variants[variant], className)} {...props}>
      {children}
      {count !== undefined && (
        <span className="ml-1.5 opacity-75">{count}</span>
      )}
    </span>
  );
}

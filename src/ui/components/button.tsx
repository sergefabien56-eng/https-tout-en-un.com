import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...values: Parameters<typeof clsx>): string { return twMerge(clsx(...values)); }

const variants = cva('inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-blue)] disabled:pointer-events-none disabled:opacity-50', {
  variants: {
    variant: {
      primary: 'bg-[var(--brand-blue)] text-white hover:brightness-110',
      outline: 'border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-app)]',
      ghost: 'bg-transparent text-inherit hover:bg-[var(--border-subtle)]',
    },
    size: { default: 'h-11', icon: 'h-11 w-11 !p-0' },
  },
  defaultVariants: { variant: 'primary', size: 'default' },
});

export function Button({ className, variant, size, asChild = false, ...props }:
  React.ComponentProps<'button'> & VariantProps<typeof variants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : 'button';
  return <Component data-slot="button" className={cn(variants({ variant, size }), className)} {...props} />;
}

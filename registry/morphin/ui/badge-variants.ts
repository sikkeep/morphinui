import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * A static pill for counts, statuses and labels. A single digit renders as a circle because
 * `min-w` equals the height. The padding subtracts the 1 px border.
 */
export const badgeVariants = cva([
  'inline-flex shrink-0 items-center justify-center box-border align-middle',
  'h-(--badge-height) min-w-(--badge-height) px-[calc(var(--badge-padding)-1px)] gap-(--badge-gap)',
  'rounded-[999px] [corner-shape:var(--corner-shape)] border border-solid border-transparent bg-clip-padding',
  'font-medium leading-none whitespace-nowrap tabular-nums select-none',
  'outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-(--badge-icon)',
].join(' '), {
  variants: {
    variant: {
      neutral: 'bg-accent text-foreground',
      primary: 'bg-primary text-primary-foreground',
      outline: 'border-border bg-transparent text-foreground',
      brand: 'bg-brand text-brand-foreground',
      success: 'bg-success/15 text-success',
      warning: 'bg-warning/15 text-warning',
      info: 'bg-info/15 text-info',
      destructive: 'bg-destructive/15 text-destructive',
    },
    size: {
      sm: '[--badge-height:16px] [--badge-padding:4px] [--badge-gap:3px] [--badge-icon:10px] text-2xs',
      md: '[--badge-height:20px] [--badge-padding:6px] [--badge-gap:4px] [--badge-icon:12px] text-xs',
      lg: '[--badge-height:24px] [--badge-padding:7px] [--badge-gap:5px] [--badge-icon:14px] text-sm',
    },
  },
  defaultVariants: { variant: 'neutral', size: 'md' },
});

type RecipeVariants = VariantProps<typeof badgeVariants>;
export type BadgeOptions = { [Key in keyof RecipeVariants]: Exclude<RecipeVariants[Key], null> };
export type BadgeVariant = NonNullable<BadgeOptions['variant']>;
export type BadgeSize = NonNullable<BadgeOptions['size']>;
export const badgeVariantNames = ['neutral', 'primary', 'outline', 'brand', 'success', 'warning', 'info', 'destructive'] as const satisfies readonly BadgeVariant[];
export const badgeSizes = ['sm', 'md', 'lg'] as const satisfies readonly BadgeSize[];

/** The badge recipe with Tailwind conflict resolution, for custom elements. */
export function badgeClasses(options: Parameters<typeof badgeVariants>[0] = {}) {
  return cn(badgeVariants(options));
}

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * A surface for grouped content. `size` sets `--card-padding`, `--card-gap` and `--card-radius`, which
 * `CardMedia` reads to bleed to the edge. Hover, press and focus styles apply only with `data-interactive`.
 */
export const cardVariants = cva([
  'group/card relative box-border flex min-w-0 flex-col overflow-clip text-card-foreground',
  'gap-(--card-gap) p-(--card-padding) rounded-(--card-radius) [corner-shape:var(--corner-shape)]',
  'data-interactive:cursor-pointer data-interactive:touch-manipulation data-interactive:no-underline data-interactive:[-webkit-tap-highlight-color:transparent]',
  'data-interactive:transition-[background-color,border-color,scale] data-interactive:duration-150 data-interactive:ease-[cubic-bezier(0.2,0,0,1)]',
  'data-interactive:outline-none data-interactive:focus-visible:outline-solid data-interactive:focus-visible:outline-2 data-interactive:focus-visible:outline-offset-2 data-interactive:focus-visible:outline-ring',
  'data-interactive:not-data-disabled:active:scale-[0.99]',
  'motion-reduce:transition-none data-reduced-motion:transition-none data-reduced-motion:active:scale-100',
  'data-disabled:cursor-not-allowed data-disabled:opacity-50 data-interactive:data-disabled:pointer-events-none',
].join(' '), {
  variants: {
    variant: {
      filled: 'bg-card data-interactive:not-data-disabled:hover:bg-accent',
      outline: 'border border-border bg-transparent data-interactive:not-data-disabled:hover:bg-card',
    },
    size: {
      xs: '[--card-padding:12px] [--card-gap:10px] [--card-radius:16px]',
      sm: '[--card-padding:16px] [--card-gap:12px] [--card-radius:20px]',
      md: '[--card-padding:24px] [--card-gap:20px] [--card-radius:28px]',
      lg: '[--card-padding:32px] [--card-gap:24px] [--card-radius:36px]',
    },
  },
  defaultVariants: { variant: 'filled', size: 'md' },
});

type RecipeVariants = VariantProps<typeof cardVariants>;
export type CardOptions = { [Key in keyof RecipeVariants]: Exclude<RecipeVariants[Key], null> };
export type CardVariant = NonNullable<CardOptions['variant']>;
export type CardSize = NonNullable<CardOptions['size']>;
export const cardVariantNames = ['filled', 'outline'] as const satisfies readonly CardVariant[];
export const cardSizes = ['xs', 'sm', 'md', 'lg'] as const satisfies readonly CardSize[];

/** The card recipe with Tailwind conflict resolution, for custom elements. */
export function cardClasses(options: Parameters<typeof cardVariants>[0] = {}) {
  return cn(cardVariants(options));
}

/** Title and description on the left, an optional action on the right. */
export const cardHeaderClasses = 'grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1';
export const cardTitleClasses = 'col-start-1 text-base font-medium leading-snug tracking-tight text-card-foreground';
export const cardDescriptionClasses = 'col-start-1 text-sm text-muted-foreground';
export const cardActionClasses = 'col-start-2 row-span-2 row-start-1 self-start justify-self-end';
export const cardContentClasses = 'min-w-0 text-sm';
export const cardFooterClasses = 'flex flex-wrap items-center gap-2';

/**
 * Media that fills its box. Inset with its own radius by default; the bleed classes extend it to the
 * card's edges (and top or bottom edge when first or last), where the card's clip rounds it.
 */
export const cardMediaClasses = [
  'block min-w-0 overflow-clip bg-secondary [corner-shape:var(--corner-shape)]',
  '[&>img]:size-full [&>img]:object-cover [&>video]:size-full [&>video]:object-cover [&>canvas]:size-full',
].join(' ');
export const cardMediaInsetClasses = 'rounded-[20px]';
export const cardMediaBleedClasses = '-mx-(--card-padding) rounded-none first:-mt-(--card-padding) last:-mb-(--card-padding)';

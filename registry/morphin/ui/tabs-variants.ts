import { cva, type VariantProps } from 'class-variance-authority';

const reducedMotion = 'motion-reduce:transition-none in-data-reduced-motion:transition-none';

export const tabsRootClasses = 'flex min-w-0 flex-col gap-3 data-[orientation=vertical]:flex-row data-[orientation=vertical]:gap-4';

/**
 * The bar around the list: a soft pill in `primary`, a quiet rule in `secondary`. It caps at the parent
 * width so long lists scroll, and the pill clips to its own shape so the edge fades keep its round ends.
 */
export const tabsScrollerVariants = cva([
  'relative isolate inline-flex max-w-full min-w-0 self-start',
  'data-[orientation=vertical]:flex-col data-[orientation=vertical]:max-h-full',
].join(' '), {
  variants: {
    variant: {
      // `xs` tabs sit in a 2px padding, so the compact bar keeps its proportions.
      primary: 'overflow-clip rounded-[999px] [corner-shape:var(--corner-shape)] bg-muted p-1 data-[size=xs]:p-0.5 data-[orientation=vertical]:rounded-[24px]',
      secondary: 'border-b border-border data-[orientation=vertical]:border-s data-[orientation=vertical]:border-b-0',
    },
  },
  defaultVariants: { variant: 'primary' },
});

/**
 * The scrolling list. In `primary` it reaches over the bar's 4px padding (`-m-1 p-1`), so its scroll
 * clip falls on the bar's edge and never cuts the indicator or its shadow.
 */
export const tabsListVariants = cva([
  'relative isolate flex min-w-0 flex-1 items-center',
  'overflow-x-auto overflow-y-hidden overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
  'in-data-[overflow-start]:ps-8 in-data-[overflow-end]:pe-8',
  'data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch data-[orientation=vertical]:overflow-x-hidden data-[orientation=vertical]:overflow-y-auto',
  'data-[orientation=vertical]:in-data-[overflow-start]:ps-0 data-[orientation=vertical]:in-data-[overflow-start]:pt-8 data-[orientation=vertical]:in-data-[overflow-end]:pe-0 data-[orientation=vertical]:in-data-[overflow-end]:pb-8',
].join(' '), {
  variants: {
    variant: {
      primary: '-m-1 gap-0.5 p-1 in-data-[size=xs]:-m-0.5 in-data-[size=xs]:p-0.5',
      secondary: 'gap-1',
    },
  },
  defaultVariants: { variant: 'primary' },
});

/** The tab sits above the indicator (`z-10`) so its label reads over it. Only the color transitions here. */
export const tabsTabVariants = cva([
  'relative z-10 inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap border-0 bg-transparent font-medium',
  'text-muted-foreground transition-colors duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] select-none touch-manipulation [-webkit-tap-highlight-color:transparent]',
  'outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  '[&:not([data-disabled])]:hover:text-foreground data-active:text-foreground',
  'data-disabled:cursor-not-allowed data-disabled:opacity-50',
  '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
  reducedMotion,
].join(' '), {
  variants: {
    variant: {
      primary: 'rounded-[999px] [corner-shape:var(--corner-shape)]',
      secondary: 'rounded-[8px] [corner-shape:var(--corner-shape)]',
    },
    size: {
      xs: 'h-6 gap-1.5 px-2.5 text-2xs [&_svg:not([class*=size-])]:size-3.5',
      sm: 'h-7 px-3 text-xs',
      md: 'h-8 px-4 text-sm',
      lg: 'h-10 px-5 text-sm',
    },
    align: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
    },
  },
  defaultVariants: { variant: 'primary', size: 'md', align: 'center' },
});

/**
 * Base UI measures the active tab and writes `--active-tab-*`; the indicator slides and resizes over
 * 250 ms. Base UI keeps it hidden until measured, so it never slides in from the corner.
 */
export const tabsIndicatorVariants = cva([
  'pointer-events-none absolute top-0 left-0 z-0 w-(--active-tab-width) h-(--active-tab-height)',
  'translate-x-(--active-tab-left) translate-y-(--active-tab-top)',
  'transition-[translate,width,height] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]',
  reducedMotion,
].join(' '), {
  variants: {
    variant: {
      // A hairline ring and a short drop shadow that stay inside the bar's 4px padding, clear of the list's clip.
      primary: 'rounded-[999px] [corner-shape:var(--corner-shape)] bg-surface-raised shadow-[0_0_0_1px_color-mix(in_oklch,var(--foreground)_7%,transparent),0_1px_3px_-1px_oklch(0_0_0/0.14)] data-[orientation=vertical]:rounded-[20px]',
      secondary: [
        'bg-primary rounded-[999px]',
        // A 2 px line over the list's border: under the tabs when horizontal, beside them when vertical.
        'data-[orientation=horizontal]:top-auto data-[orientation=horizontal]:-bottom-px data-[orientation=horizontal]:h-0.5 data-[orientation=horizontal]:translate-y-0',
        'data-[orientation=vertical]:-left-px data-[orientation=vertical]:w-0.5 data-[orientation=vertical]:translate-x-0',
      ].join(' '),
    },
  },
  defaultVariants: { variant: 'primary' },
});

/** Chevrons shown only when the list overflows. They sit on the bar and are skipped by Tab. */
export const tabsScrollButtonVariants = cva([
  'absolute z-20 flex size-6 items-center justify-center rounded-full border-0 p-0 text-muted-foreground',
  'cursor-pointer outline-none transition-colors duration-150',
  'hover:text-foreground focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  '[&_svg]:pointer-events-none [&_svg]:size-3.5',
  reducedMotion,
].join(' '), {
  variants: {
    variant: {
      primary: 'bg-muted',
      secondary: 'bg-background shadow-xs',
    },
    edge: {
      start: 'start-0.5 top-1/2 -translate-y-1/2 in-data-[orientation=vertical]:start-1/2 in-data-[orientation=vertical]:top-0.5 in-data-[orientation=vertical]:-translate-x-1/2 in-data-[orientation=vertical]:translate-y-0',
      end: 'end-0.5 top-1/2 -translate-y-1/2 in-data-[orientation=vertical]:start-1/2 in-data-[orientation=vertical]:top-auto in-data-[orientation=vertical]:bottom-0.5 in-data-[orientation=vertical]:-translate-x-1/2 in-data-[orientation=vertical]:translate-y-0',
    },
  },
  defaultVariants: { variant: 'primary', edge: 'start' },
});

/**
 * Edge fades in the bar's color over hidden tabs. Solid under the chevron, then fading, so a label
 * dissolves before it reaches the chevron.
 */
export const tabsFadeVariants = cva('pointer-events-none absolute z-10', {
  variants: {
    variant: {
      primary: '',
      secondary: '',
    },
    edge: {
      start: 'inset-y-0 start-0 w-16 in-data-[orientation=vertical]:inset-x-0 in-data-[orientation=vertical]:top-0 in-data-[orientation=vertical]:bottom-auto in-data-[orientation=vertical]:h-16 in-data-[orientation=vertical]:w-auto',
      end: 'inset-y-0 end-0 w-16 in-data-[orientation=vertical]:inset-x-0 in-data-[orientation=vertical]:top-auto in-data-[orientation=vertical]:bottom-0 in-data-[orientation=vertical]:h-16 in-data-[orientation=vertical]:w-auto',
    },
  },
  compoundVariants: [
    { variant: 'primary', edge: 'start', class: 'bg-linear-to-r from-muted from-40% to-transparent in-data-[orientation=vertical]:bg-linear-to-b' },
    { variant: 'primary', edge: 'end', class: 'bg-linear-to-l from-muted from-40% to-transparent in-data-[orientation=vertical]:bg-linear-to-t' },
    { variant: 'secondary', edge: 'start', class: 'bg-linear-to-r from-background from-40% to-transparent in-data-[orientation=vertical]:bg-linear-to-b' },
    { variant: 'secondary', edge: 'end', class: 'bg-linear-to-l from-background from-40% to-transparent in-data-[orientation=vertical]:bg-linear-to-t' },
  ],
  defaultVariants: { variant: 'primary', edge: 'start' },
});

/** A presentational rule between `TabsTab`s. The keyboard skips it. */
export const tabsSeparatorClasses = 'pointer-events-none mx-0 my-1.5 w-px shrink-0 self-stretch bg-border in-data-[orientation=vertical]:mx-1.5 in-data-[orientation=vertical]:my-0 in-data-[orientation=vertical]:h-px in-data-[orientation=vertical]:w-auto';

/** A new panel fades in over 150 ms. Hidden panels unmount, so the fade runs on every switch. */
export const tabsPanelClasses = [
  'min-w-0 flex-1 rounded-[8px] text-sm leading-6 text-foreground outline-none',
  'transition-opacity duration-150 ease-[ease-in-out] data-starting-style:opacity-0',
  'focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  reducedMotion,
].join(' ');

export type TabsOptions = {
  variant?: NonNullable<VariantProps<typeof tabsListVariants>['variant']>;
  size?: NonNullable<VariantProps<typeof tabsTabVariants>['size']>;
  align?: NonNullable<VariantProps<typeof tabsTabVariants>['align']>;
};
export const tabsVariants = ['primary', 'secondary'] as const;
export const tabsSizes = ['xs', 'sm', 'md', 'lg'] as const;
export const tabsAligns = ['start', 'center', 'end'] as const;

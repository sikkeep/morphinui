import { cva, type VariantProps } from 'class-variance-authority';

export const dropdownContentVariants = cva([
  'relative isolate box-border w-56 max-w-[calc(100vw-24px)] max-h-(--available-height) overflow-y-auto overscroll-contain p-1',
  'rounded-[14px] [corner-shape:var(--corner-shape)] bg-menu text-popover-foreground shadow-popover',
  'text-sm leading-5 outline-none origin-(--transform-origin)',
], {
  variants: {
    reduceMotion: {
      false: 'transition-[opacity,scale,translate,filter] duration-150 ease-[cubic-bezier(0.2,0,0,1)] data-starting-style:opacity-0 data-starting-style:scale-95 data-starting-style:blur-[2px] data-ending-style:opacity-0 data-ending-style:translate-y-1 data-ending-style:blur-[1px] data-ending-style:duration-100 data-instant:transition-none motion-reduce:transition-none',
      true: 'transition-none',
    },
  },
  defaultVariants: { reduceMotion: false },
});

export const dropdownItemVariants = cva([
  'relative flex min-h-9 cursor-default items-center gap-2 rounded-[10px] [corner-shape:var(--corner-shape)] px-2.5 py-2',
  'text-sm font-medium leading-5 no-underline outline-none select-none',
  'transition-[background-color,color] duration-100 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none in-data-reduced-motion:transition-none',
  'data-disabled:pointer-events-none data-disabled:opacity-40',
  '[[data-moving-highlight]_&]:data-highlighted:bg-transparent [[data-moving-highlight]_&]:data-popup-open:bg-transparent',
  '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
], {
  variants: {
    variant: {
      default: 'text-popover-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground data-popup-open:bg-accent',
      destructive: 'text-destructive data-highlighted:bg-destructive/10',
    },
    inset: { true: 'ps-9' },
    size: {
      default: '',
      // A compact icon chip, such as social links in a row; the sliding highlight skips it.
      icon: [
        'size-6.5 min-h-0 justify-center rounded-[999px] p-0 bg-accent text-muted-foreground',
        'data-highlighted:bg-accent data-highlighted:text-popover-foreground [[data-moving-highlight]_&]:data-highlighted:bg-accent',
        '[&_svg:not([class*=size-])]:size-3.5',
      ],
    },
  },
  defaultVariants: { variant: 'default', inset: false, size: 'default' },
});

type ItemVariants = VariantProps<typeof dropdownItemVariants>;
type ItemOptions<Keys extends keyof ItemVariants> = { [Key in Keys]?: Exclude<ItemVariants[Key], null> };
export type DropdownItemOptions = ItemOptions<'variant' | 'inset'>;
/** Plain and link items can also render as icon chips. */
export type DropdownActionItemOptions = ItemOptions<'variant' | 'inset' | 'size'>;

export const dropdownRadioGroupVariants = cva('', {
  variants: {
    variant: {
      default: '',
      // A positioned row with its own sliding highlight.
      // The track is a faint wash of the text color over the menu, so the checked segment stands out from it.
      segmented: 'relative isolate flex gap-1 rounded-[999px] [corner-shape:var(--corner-shape)] bg-foreground/5 p-0.5',
    },
  },
  defaultVariants: { variant: 'default' },
});

export type DropdownRadioGroupVariant = Exclude<VariantProps<typeof dropdownRadioGroupVariants>['variant'], null | undefined>;

/** Radio items inside a segmented group. The checked surface slides with GSAP unless motion is reduced. */
export const dropdownSegmentVariants = cva([
  'flex-1 justify-center rounded-[999px] text-muted-foreground',
  'data-highlighted:text-popover-foreground data-checked:text-popover-foreground data-checked:bg-foreground/12',
  '[[data-moving-highlight]_&]:data-checked:bg-transparent',
], {
  variants: {
    size: {
      xs: 'min-h-6 min-w-6 p-1 [&_svg:not([class*=size-])]:size-3.5',
      sm: 'min-h-7 min-w-7 p-1.5 [&_svg:not([class*=size-])]:size-3.5',
      md: 'min-h-8 min-w-8 p-1.5',
    },
  },
  defaultVariants: { size: 'md' },
});

export type DropdownSegmentSize = Exclude<VariantProps<typeof dropdownSegmentVariants>['size'], null | undefined>;

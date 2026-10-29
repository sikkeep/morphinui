import { cva, type VariantProps } from 'class-variance-authority';

const reducedMotion = 'motion-reduce:transition-none in-data-reduced-motion:transition-none';

/** The list of items: hairline rows in `ghost`, separate surfaces with a gap in `card`. */
export const accordionVariants = cva('flex w-full min-w-0 flex-col', {
  variants: {
    variant: {
      ghost: '',
      card: '',
    },
    size: {
      sm: '',
      md: '',
    },
  },
  compoundVariants: [
    { variant: 'card', size: 'sm', class: 'gap-1.5' },
    { variant: 'card', size: 'md', class: 'gap-2' },
  ],
  defaultVariants: { variant: 'ghost', size: 'md' },
});

/**
 * One header and its panel. In `card` the item is the surface: it lightens on hover while closed and
 * takes the focus ring when its trigger is focused from the keyboard.
 */
export const accordionItemVariants = cva('relative min-w-0', {
  variants: {
    variant: {
      ghost: 'border-b border-border last:border-b-0',
      card: [
        'bg-card text-card-foreground [corner-shape:var(--corner-shape)]',
        'transition-colors duration-150 ease-[cubic-bezier(0.2,0,0,1)]',
        'not-data-open:has-[>[data-slot=accordion-header]>[data-slot=accordion-trigger]:enabled:hover]:bg-accent',
        'has-[>[data-slot=accordion-header]>[data-slot=accordion-trigger]:focus-visible]:outline-solid has-[>[data-slot=accordion-header]>[data-slot=accordion-trigger]:focus-visible]:outline-2 has-[>[data-slot=accordion-header]>[data-slot=accordion-trigger]:focus-visible]:outline-offset-2 has-[>[data-slot=accordion-header]>[data-slot=accordion-trigger]:focus-visible]:outline-ring',
        reducedMotion,
      ].join(' '),
    },
    size: {
      sm: '',
      md: '',
    },
  },
  compoundVariants: [
    { variant: 'card', size: 'sm', class: 'rounded-[16px]' },
    { variant: 'card', size: 'md', class: 'rounded-[20px]' },
  ],
  defaultVariants: { variant: 'ghost', size: 'md' },
});

export const accordionHeaderClasses = 'm-0 flex';

/**
 * The whole header row is the button. The chevron sits at the end and turns over with the panel; extra
 * icons in the label get `size-4` unless they set their own size.
 */
export const accordionTriggerVariants = cva([
  'group/accordion-trigger flex w-full min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 border-0 bg-transparent text-start font-medium text-foreground',
  'select-none touch-manipulation [-webkit-tap-highlight-color:transparent] outline-none',
  'data-disabled:cursor-not-allowed data-disabled:opacity-50',
  '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
].join(' '), {
  variants: {
    variant: {
      ghost: 'rounded-[8px] px-0 [corner-shape:var(--corner-shape)] focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
      card: '',
    },
    size: {
      sm: 'min-h-10 py-2.5 text-sm',
      md: 'min-h-12 py-3.5 text-base',
    },
  },
  compoundVariants: [
    { variant: 'card', size: 'sm', class: 'px-3' },
    { variant: 'card', size: 'md', class: 'px-4' },
  ],
  defaultVariants: { variant: 'ghost', size: 'md' },
});

export const accordionLabelClasses = 'flex min-w-0 flex-1 items-center gap-2';

/** Turns over in 250 ms as the panel opens and in 200 ms as it closes, on the panel's curve. */
export const accordionChevronClasses = [
  'size-4 text-muted-foreground',
  'transition-[rotate,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
  'group-hover/accordion-trigger:text-foreground group-data-disabled/accordion-trigger:text-muted-foreground',
  'group-data-panel-open/accordion-trigger:rotate-180 group-data-panel-open/accordion-trigger:text-foreground group-data-panel-open/accordion-trigger:duration-250',
  reducedMotion,
].join(' ');

/**
 * Base UI measures the content into `--accordion-panel-height` and waits for this transition before it
 * hides the panel: 250 ms to open, 200 ms to close. Padding belongs on the content, never here, or the
 * closed panel would keep a strip of it.
 */
export const accordionPanelClasses = [
  'group/accordion-panel h-(--accordion-panel-height) overflow-hidden',
  'transition-[height] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]',
  'data-starting-style:h-0 data-ending-style:h-0 data-ending-style:duration-200',
  reducedMotion,
].join(' ');

/** The panel's text. It fades in from a 2 px blur as the panel opens and fades out a little faster. */
export const accordionContentVariants = cva([
  'min-w-0 text-sm text-muted-foreground',
  'duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] transition-[opacity,filter]',
  'group-data-starting-style/accordion-panel:opacity-0 group-data-starting-style/accordion-panel:blur-[2px]',
  'group-data-ending-style/accordion-panel:opacity-0 group-data-ending-style/accordion-panel:blur-[2px] group-data-ending-style/accordion-panel:duration-150',
  reducedMotion,
].join(' '), {
  variants: {
    variant: {
      ghost: '',
      card: '',
    },
    size: {
      sm: 'pb-3 leading-5',
      md: 'pb-4 leading-6',
    },
  },
  compoundVariants: [
    { variant: 'card', size: 'sm', class: 'px-3' },
    { variant: 'card', size: 'md', class: 'px-4' },
  ],
  defaultVariants: { variant: 'ghost', size: 'md' },
});

type RecipeVariants = VariantProps<typeof accordionItemVariants>;
export type AccordionOptions = { [Key in keyof RecipeVariants]: Exclude<RecipeVariants[Key], null> };
export type AccordionVariant = NonNullable<AccordionOptions['variant']>;
export type AccordionSize = NonNullable<AccordionOptions['size']>;
export const accordionVariantNames = ['ghost', 'card'] as const satisfies readonly AccordionVariant[];
export const accordionSizes = ['sm', 'md'] as const satisfies readonly AccordionSize[];

import { cva, type VariantProps } from 'class-variance-authority';

/**
 * `md` is a 16 px circle and `sm` a 14 px one, matching the checkbox. Each sets `--choice-size`,
 * `--choice-dot` and `--choice-line`.
 */
export const radioSizeClasses = {
  sm: '[--choice-size:14px] [--choice-dot:5px] [--choice-line:16px]',
  md: '[--choice-size:16px] [--choice-dot:6px] [--choice-line:20px]',
} as const;

export const radioVariants = cva(
  [
    'group/radio relative inline-flex shrink-0 items-center justify-center box-border',
    'size-(--choice-size) rounded-[999px] [corner-shape:var(--corner-shape)]',
    'border border-input bg-field text-primary-foreground',
    'cursor-pointer touch-manipulation select-none [-webkit-tap-highlight-color:transparent]',
    'transition-[background-color,border-color,scale] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]',
    'motion-reduce:transition-none data-reduced-motion:transition-none',
    'outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    'data-invalid:border-destructive aria-invalid:border-destructive',
    '[&:not([data-disabled]):not([data-readonly])]:data-unchecked:hover:border-[color-mix(in_oklch,var(--input),var(--foreground)_30%)]',
    'data-checked:border-primary data-checked:bg-primary',
    '[&:not([data-disabled]):not([data-readonly])]:data-checked:hover:bg-primary-hover',
    '[&:not([data-disabled]):not([data-readonly])]:active:scale-90 data-reduced-motion:active:scale-100',
    'data-disabled:cursor-not-allowed data-disabled:opacity-50 data-readonly:cursor-default',
  ].join(' '),
  {
    variants: { size: radioSizeClasses },
    defaultVariants: { size: 'md' },
  },
);

export const radioIndicatorClasses = 'pointer-events-none flex size-full items-center justify-center';

/** The dot grows from half its size as it fades in, and shrinks back out. */
export const radioDotClasses = [
  'size-(--choice-dot) rounded-[999px] bg-primary-foreground',
  'scale-50 opacity-0 transition-[scale,opacity] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]',
  'group-data-checked/radio:scale-100 group-data-checked/radio:opacity-100',
  'motion-reduce:transition-none in-data-reduced-motion:transition-none',
].join(' ');

export const radioFieldVariants = cva('group/choice-field inline-flex max-w-full items-start gap-3 has-data-disabled:cursor-not-allowed', {
  variants: { labelPosition: { start: 'justify-between', end: null } },
  defaultVariants: { labelPosition: 'end' },
});

const textBySize = {
  sm: { label: 'text-xs leading-4', description: 'text-2xs' },
  md: { label: 'text-sm leading-5', description: 'text-xs' },
} as const;

export function radioLabelClasses(size: RadioSize = 'md') {
  return [textBySize[size].label, 'font-medium text-foreground group-has-data-disabled/choice-field:text-disabled-foreground'].join(' ');
}
export function radioDescriptionClasses(size: RadioSize = 'md') {
  return [textBySize[size].description, 'text-muted-foreground group-has-data-disabled/choice-field:text-disabled-foreground'].join(' ');
}

/** A card that is one big click target, like the checkbox card. The classes go on the field's `<label>`. */
export const radioCardClasses = [
  'flex w-full max-w-none gap-3 rounded-[20px] border border-transparent bg-card p-3.5 [corner-shape:var(--corner-shape)]',
  'transition-[background-color,border-color] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none has-data-reduced-motion:transition-none',
  'not-has-data-disabled:hover:bg-accent has-data-checked:border-primary has-data-disabled:opacity-50',
].join(' ');

export const radioGroupClasses = 'flex min-w-0 flex-col gap-3';
export const radioGroupItemsClasses = { vertical: 'flex flex-col gap-3', horizontal: 'flex flex-row flex-wrap gap-x-6 gap-y-3' } as const;
export const radioGroupLegendClasses = 'text-sm font-medium text-foreground';

export type RadioOptions = { size?: NonNullable<VariantProps<typeof radioVariants>['size']> };
export type RadioSize = NonNullable<RadioOptions['size']>;
export const radioSizes = Object.keys(radioSizeClasses) as RadioSize[];

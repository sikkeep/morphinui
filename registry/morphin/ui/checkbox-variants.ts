import { cva, type VariantProps } from 'class-variance-authority';

/**
 * `md` is a 16 px box and `sm` a 14 px box for dense tables. Each sets `--choice-size`, `--choice-icon`,
 * `--choice-radius` and `--choice-line` (the label's line height, which the box is centered on).
 */
export const checkboxSizeClasses = {
  sm: '[--choice-size:14px] [--choice-icon:10px] [--choice-radius:4px] [--choice-line:16px]',
  md: '[--choice-size:16px] [--choice-icon:12px] [--choice-radius:5px] [--choice-line:20px]',
} as const;

export const checkboxVariants = cva(
  [
    'group/checkbox relative inline-flex shrink-0 items-center justify-center box-border',
    'size-(--choice-size) rounded-(--choice-radius) [corner-shape:var(--corner-shape)]',
    'border border-input bg-field text-primary-foreground',
    'cursor-pointer touch-manipulation select-none [-webkit-tap-highlight-color:transparent]',
    'transition-[background-color,border-color,scale] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]',
    'motion-reduce:transition-none data-reduced-motion:transition-none',
    'outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    'data-invalid:border-destructive aria-invalid:border-destructive',
    '[&:not([data-disabled]):not([data-readonly])]:data-unchecked:hover:border-[color-mix(in_oklch,var(--input),var(--foreground)_30%)]',
    'data-checked:border-primary data-checked:bg-primary data-indeterminate:border-primary data-indeterminate:bg-primary',
    '[&:not([data-disabled]):not([data-readonly])]:data-checked:hover:bg-primary-hover [&:not([data-disabled]):not([data-readonly])]:data-indeterminate:hover:bg-primary-hover',
    '[&:not([data-disabled]):not([data-readonly])]:active:scale-90 data-reduced-motion:active:scale-100',
    'data-disabled:cursor-not-allowed data-disabled:opacity-50 data-readonly:cursor-default',
    // The box fills over 150 ms; the tick or dash then draws by stroke-dashoffset over 350 ms and undraws
    // in 150 ms. `--check-len` is set on each icon to its path length.
    '[&_[data-icon]_path]:[stroke-dasharray:var(--check-len)] [&_[data-icon]_path]:[stroke-dashoffset:var(--check-len)]',
    '[&_[data-icon]_path]:transition-[stroke-dashoffset] [&_[data-icon]_path]:duration-150 [&_[data-icon]_path]:ease-[cubic-bezier(0.22,1,0.36,1)]',
    'motion-reduce:[&_[data-icon]_path]:transition-none data-reduced-motion:[&_[data-icon]_path]:transition-none',
    '[&[data-checked]:not([data-indeterminate])_[data-icon=check]_path]:[stroke-dashoffset:0] [&[data-checked]:not([data-indeterminate])_[data-icon=check]_path]:duration-350',
    '[&[data-indeterminate]_[data-icon=minus]_path]:[stroke-dashoffset:0] [&[data-indeterminate]_[data-icon=minus]_path]:duration-350',
  ].join(' '),
  {
    variants: { size: checkboxSizeClasses },
    defaultVariants: { size: 'md' },
  },
);

/** The tick and the dash fill the box's inner cell. */
export const checkboxIndicatorClasses = 'pointer-events-none grid size-full place-items-center [&_svg]:[grid-area:1/1] [&_svg]:size-(--choice-icon)';

/** The path lengths of the Hugeicons `Tick02Icon` and `MinusSignIcon`, rounded up, for `--check-len`. */
export const checkIconLength = 21;
export const minusIconLength = 16;

export const checkboxFieldVariants = cva('group/choice-field inline-flex max-w-full items-start gap-3 has-data-disabled:cursor-not-allowed', {
  variants: { labelPosition: { start: 'justify-between', end: null } },
  defaultVariants: { labelPosition: 'end' },
});

const textBySize = {
  sm: { label: 'text-xs leading-4', description: 'text-2xs' },
  md: { label: 'text-sm leading-5', description: 'text-xs' },
} as const;

export function checkboxLabelClasses(size: CheckboxSize = 'md') {
  return [textBySize[size].label, 'font-medium text-foreground group-has-data-disabled/choice-field:text-disabled-foreground'].join(' ');
}
export function checkboxDescriptionClasses(size: CheckboxSize = 'md') {
  return [textBySize[size].description, 'text-muted-foreground group-has-data-disabled/choice-field:text-disabled-foreground'].join(' ');
}

/**
 * A card that is one big click target: the box, a title and a description on a solid surface that
 * lightens on hover and takes the primary border when ticked. The classes go on the field's `<label>`.
 */
export const checkboxCardClasses = [
  'flex w-full max-w-none gap-3 rounded-[20px] border border-transparent bg-card p-3.5 [corner-shape:var(--corner-shape)]',
  'transition-[background-color,border-color] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none has-data-reduced-motion:transition-none',
  'not-has-data-disabled:hover:bg-accent has-data-checked:border-primary has-data-indeterminate:border-primary',
  'has-data-disabled:opacity-50',
].join(' ');

export const checkboxGroupClasses = 'flex min-w-0 flex-col gap-3';
export const checkboxGroupItemsClasses = { vertical: 'flex flex-col gap-3', horizontal: 'flex flex-row flex-wrap gap-x-6 gap-y-3' } as const;
export const checkboxGroupLegendClasses = 'text-sm font-medium text-foreground';

export type CheckboxOptions = { size?: NonNullable<VariantProps<typeof checkboxVariants>['size']> };
export type CheckboxSize = NonNullable<CheckboxOptions['size']>;
export const checkboxSizes = Object.keys(checkboxSizeClasses) as CheckboxSize[];

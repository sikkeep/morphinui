import { cva, type VariantProps } from 'class-variance-authority';

const sizeClasses = {
  sm: '[--switch-width:28px] [--switch-height:16px] [--switch-icon:8px]',
  md: '[--switch-width:36px] [--switch-height:20px] [--switch-icon:10px]',
  lg: '[--switch-width:44px] [--switch-height:24px] [--switch-icon:12px]',
};

/**
 * The thumb rests at the start or the end through flex alignment, not a transform, so the
 * GSAP travel offset is the only transform on it. The track color changes at once.
 */
export const switchVariants = cva([
  'group/switch relative inline-flex shrink-0 items-center justify-start box-border p-0.5',
  'w-(--switch-width) h-(--switch-height) data-checked:justify-end',
  'rounded-[999px] [corner-shape:var(--corner-shape)] bg-input data-checked:bg-primary',
  'cursor-pointer touch-manipulation select-none [-webkit-tap-highlight-color:transparent]',
  'outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  'data-invalid:outline-solid data-invalid:outline-1 data-invalid:outline-offset-2 data-invalid:outline-destructive aria-invalid:outline-solid aria-invalid:outline-1 aria-invalid:outline-offset-2 aria-invalid:outline-destructive',
  '[&:not([data-disabled]):not([data-readonly])]:data-unchecked:hover:bg-[color-mix(in_oklch,var(--input),var(--foreground)_10%)]',
  '[&:not([data-disabled]):not([data-readonly])]:data-checked:hover:bg-primary-hover',
  'data-disabled:cursor-not-allowed data-disabled:opacity-50 data-readonly:cursor-default',
].join(' '), {
  variants: { size: sizeClasses },
  defaultVariants: { size: 'md' },
});

export const switchThumbClasses = [
  'pointer-events-none grid size-[calc(var(--switch-height)-4px)] shrink-0 place-items-center',
  'rounded-[999px] [corner-shape:var(--corner-shape)] bg-white group-data-checked/switch:bg-primary-foreground',
  'shadow-[0_1px_2px_oklch(0_0_0/0.18),0_0_0_0.5px_oklch(0_0_0/0.06)]',
  '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-(--switch-icon)',
].join(' ');

/** Both thumb icons share one grid cell and swap over 250 ms with a scale to 0.25 and a 2 px blur. */
export const switchIconVariants = cva([
  'flex [grid-area:1/1] transition-[opacity,scale,filter] duration-250 ease-[ease-in-out]',
  'motion-reduce:transition-none in-data-reduced-motion:transition-none',
].join(' '), {
  variants: {
    state: {
      checked: 'text-primary group-data-unchecked/switch:scale-25 group-data-unchecked/switch:opacity-0 group-data-unchecked/switch:blur-[2px]',
      unchecked: 'text-muted-foreground group-data-checked/switch:scale-25 group-data-checked/switch:opacity-0 group-data-checked/switch:blur-[2px]',
    },
  },
});

export const switchFieldVariants = cva('group/switch-field inline-flex max-w-full items-start gap-3 has-data-disabled:cursor-not-allowed', {
  variants: { labelPosition: { start: 'justify-between', end: null } },
  defaultVariants: { labelPosition: 'end' },
});

export const switchLabelClasses = 'text-sm font-medium text-foreground group-has-data-disabled/switch-field:text-disabled-foreground';
export const switchDescriptionClasses = 'text-xs text-muted-foreground group-has-data-disabled/switch-field:text-disabled-foreground';

export type SwitchOptions = { size?: NonNullable<VariantProps<typeof switchVariants>['size']> };
export type SwitchSize = NonNullable<SwitchOptions['size']>;
export const switchSizes = Object.keys(sizeClasses) as SwitchSize[];

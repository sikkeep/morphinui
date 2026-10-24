import { cva, type VariantProps } from 'class-variance-authority';

/** `--slider-track` is the track thickness; the thumb is a pill 8 px longer than that. */
const sizeClasses = {
  sm: '[--slider-track:14px] [--slider-thumb:22px]',
  md: '[--slider-track:20px] [--slider-thumb:28px]',
  lg: '[--slider-track:28px] [--slider-thumb:36px]',
};

export const sliderVariants = cva([
  'group/slider flex w-full min-w-0 flex-col gap-1',
  'data-disabled:opacity-50 data-disabled:cursor-not-allowed',
  'data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-40 data-[orientation=vertical]:w-auto data-[orientation=vertical]:items-center',
].join(' '), {
  variants: { size: sizeClasses },
  defaultVariants: { size: 'md' },
});

export const sliderHeaderClasses = 'flex min-w-0 items-baseline justify-between gap-3';
export const sliderLabelClasses = 'text-sm font-medium text-foreground';
export const sliderValueClasses = 'text-sm font-medium tabular-nums text-foreground';

export const sliderControlClasses = [
  'relative flex w-full touch-none select-none items-center',
  'data-[orientation=vertical]:h-full data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col data-[orientation=vertical]:justify-center',
  'data-disabled:pointer-events-none',
].join(' ');

export const sliderTrackClasses = [
  'relative h-(--slider-track) w-full rounded-[999px] [corner-shape:var(--corner-shape)] bg-secondary',
  'data-[orientation=vertical]:h-full data-[orientation=vertical]:w-(--slider-track)',
].join(' ');

/** The fill ends under the thumb's center, so only its end at the track's start is round. */
export const sliderIndicatorClasses = [
  'rounded-none [corner-shape:var(--corner-shape)] bg-primary',
  'data-[orientation=horizontal]:rounded-s-[999px] data-[orientation=vertical]:rounded-b-[999px]',
].join(' ');

/**
 * A primary pill with a lighter pill inside it. Base UI positions the thumb with `translate`, so the
 * press feedback uses `scale` on the inner pill only.
 */
export const sliderThumbClasses = [
  'relative grid h-(--slider-track) w-(--slider-thumb) place-items-center',
  'data-[orientation=vertical]:h-(--slider-thumb) data-[orientation=vertical]:w-(--slider-track)',
  'rounded-[999px] [corner-shape:var(--corner-shape)] bg-primary cursor-grab',
  'after:absolute after:inset-0.5 after:rounded-[999px] after:[corner-shape:var(--corner-shape)] after:bg-primary-foreground',
  'after:shadow-[0_1px_2px_oklch(0_0_0/0.25)] after:transition-[scale] after:duration-150 after:ease-[cubic-bezier(0.22,1,0.36,1)]',
  'motion-reduce:after:transition-none in-data-reduced-motion:after:transition-none',
  'outline-none has-focus-visible:outline-solid has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring',
].join(' ');

/**
 * Press feedback for the active thumb. Base UI sets `data-dragging` on every thumb of a range, so
 * `SliderThumb` applies this class only to the pressed one.
 */
export const sliderThumbPressedClasses = 'cursor-grabbing after:scale-90';

export type SliderOptions = { size?: NonNullable<VariantProps<typeof sliderVariants>['size']> };
export type SliderSize = NonNullable<SliderOptions['size']>;
export const sliderSizes = Object.keys(sizeClasses) as SliderSize[];

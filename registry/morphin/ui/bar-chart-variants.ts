import { cva, type VariantProps } from 'class-variance-authority';

export const barChartVariants = cva('w-full max-w-2xl', {
  variants: {
    size: {
      sm: '[--bar-chart-height:128px] [--bar-chart-width:20px] [--bar-chart-max-width:52px] [--bar-chart-gap:8px]',
      md: '[--bar-chart-height:176px] [--bar-chart-width:28px] [--bar-chart-max-width:64px] [--bar-chart-gap:10px]',
      lg: '[--bar-chart-height:240px] [--bar-chart-width:36px] [--bar-chart-max-width:80px] [--bar-chart-gap:12px]',
    },
  },
  defaultVariants: { size: 'md' },
});

export type BarChartSize = NonNullable<
  VariantProps<typeof barChartVariants>['size']
>;
export const barChartSizes = [
  'sm',
  'md',
  'lg',
] as const satisfies readonly BarChartSize[];

/** The radius is capped at 16 px, like Textarea's: a full pill turns a wide bar into a blob. */
export const barChartTrackClasses =
  'relative mx-auto h-full w-full max-w-(--bar-chart-max-width) rounded-[16px] [corner-shape:var(--corner-shape)] bg-foreground/5';
export const barChartFillClasses =
  'absolute inset-x-0 bottom-0 rounded-[16px] [corner-shape:var(--corner-shape)] bg-bar-chart';

/** A column softens while another is under the pointer. */
export const barChartColumnClasses = [
  'min-w-0 flex-1 transition-opacity duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] data-dimmed:opacity-55',
  'motion-reduce:transition-none in-data-reduced-motion:transition-none',
].join(' ');

/**
 * The title and the name of the bar under the pointer share one grid cell and cross-blur: both stay
 * mounted, one fading out as the other fades in, so nothing mounts and no text jumps.
 */
export const barChartSwapClasses = [
  'col-start-1 row-start-1 justify-self-start transition-[opacity,filter] duration-200 ease-in-out',
  'data-hidden:pointer-events-none data-hidden:opacity-0 data-hidden:blur-[2px]',
  'motion-reduce:transition-none in-data-reduced-motion:transition-none',
].join(' ');

/** The description (a change badge, say) leaves while the readout shows one bar. */
export const barChartDescriptionClasses = [
  'text-xs transition-[opacity,filter] duration-200 ease-in-out',
  'data-hidden:pointer-events-none data-hidden:opacity-0 data-hidden:blur-[2px]',
  'motion-reduce:transition-none in-data-reduced-motion:transition-none',
].join(' ');

/** A 1 px ring with a 2 px gap; opacity is the only animated property. */
export const barChartRingClasses =
  'pointer-events-none absolute -inset-[3px] rounded-[inherit] [corner-shape:inherit] border border-current opacity-0 data-active:opacity-100';

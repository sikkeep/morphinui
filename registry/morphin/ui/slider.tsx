'use client';

import { useRef, type ReactNode } from 'react';
import { Slider as BaseSlider } from '@base-ui/react/slider';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/registry/morphin/lib/motion';
import { useSound } from '@/registry/morphin/lib/sound';
import {
  sliderControlClasses, sliderHeaderClasses, sliderIndicatorClasses, sliderLabelClasses,
  sliderThumbClasses, sliderThumbPressedClasses, sliderTrackClasses, sliderValueClasses, sliderVariants, type SliderOptions,
} from '@/registry/morphin/ui/slider-variants';

function classes<State>(base: string, custom?: string | ((state: State) => string | undefined)) {
  return typeof custom === 'function' ? (state: State) => cn(base, custom(state)) : cn(base, custom);
}

export type SliderValueRenderer = (formattedValues: readonly string[], values: readonly number[]) => ReactNode;

export interface SliderProps<Value extends number | readonly number[] = number | readonly number[]>
  extends Omit<BaseSlider.Root.Props<Value>, 'className'>, SliderOptions {
  className?: string;
  /** Visible label above the track. */
  label?: ReactNode;
  /** Shows the formatted value beside the label; a function renders it from the formatted and raw values. Default: on when `label` is set. */
  showValue?: boolean | SliderValueRenderer;
  /** Accessible name for each thumb, useful for ranges ("Minimum price", "Maximum price"). */
  getThumbLabel?: (index: number) => string;
  /** Turns off the thumb's press feedback for this slider only. */
  reduceMotion?: boolean;
}

function thumbCount(value: unknown) {
  return Array.isArray(value) ? value.length : 1;
}

function thumbValue(value: unknown, index: number) {
  return Array.isArray(value) ? Number(value[index]) : Number(value);
}

/**
 * A Base UI slider with the label and value on top, then the track, fill and thumbs. Thumbs are
 * edge-aligned by default. Pass `children` to compose the parts yourself.
 */
export function Slider<Value extends number | readonly number[]>({
  size = 'md', className, label, showValue = Boolean(label), getThumbLabel, reduceMotion = false,
  thumbAlignment = 'edge', children, onValueChange, ...props
}: SliderProps<Value>) {
  const reduced = useReducedMotion() || reduceMotion;
  const play = useSound();
  // The value before a change: the controlled prop, or the last one an uncontrolled slider reported.
  const uncontrolled = useRef<unknown>(props.defaultValue ?? props.min ?? 0);
  const thumbs = thumbCount(props.value ?? props.defaultValue);
  const header = label || showValue;
  return <BaseSlider.Root
    data-slot="slider"
    data-size={size}
    data-reduced-motion={reduced || undefined}
    thumbAlignment={thumbAlignment}
    {...props}
    onValueChange={(value, details) => {
      const index = details.activeThumbIndex;
      const before = thumbValue(props.value ?? uncontrolled.current, index);
      onValueChange?.(value, details);
      if (details.isCanceled) return;
      uncontrolled.current = value;
      const after = thumbValue(value, index);
      play('select', { emphasis: 'subtle', ...(Number.isFinite(before) && after !== before && { direction: after > before ? 'forward' : 'back' }) });
    }}
    className={cn(sliderVariants({ size }), className)}
  >
    {children ?? <>
      {header && <div data-slot="slider-header" className={sliderHeaderClasses}>
        {label && <SliderLabel>{label}</SliderLabel>}
        {showValue && <SliderValue className="ms-auto">{typeof showValue === 'function' ? showValue : undefined}</SliderValue>}
      </div>}
      <SliderControl>
        <SliderTrack>
          <SliderIndicator className={thumbs > 1 ? 'data-[orientation=horizontal]:rounded-none data-[orientation=vertical]:rounded-none' : undefined} />
          {Array.from({ length: thumbs }, (_, index) => <SliderThumb key={index} index={index} getAriaLabel={getThumbLabel} />)}
        </SliderTrack>
      </SliderControl>
    </>}
  </BaseSlider.Root>;
}

export function SliderLabel({ className, ...props }: BaseSlider.Label.Props) {
  return <BaseSlider.Label data-slot="slider-label" {...props} className={classes(sliderLabelClasses, className)} />;
}

/** The value output. Defaults to the formatted values; pass a function as children to render your own. */
export function SliderValue({ className, children, ...props }: BaseSlider.Value.Props) {
  return <BaseSlider.Value data-slot="slider-value" {...props} className={classes(sliderValueClasses, className)}>
    {/* Plain text that never animates, so it stays readable while a thumb is dragged. */}
    {(formatted, values) => typeof children === 'function' ? children(formatted, values) : children ?? formatted.join(' – ')}
  </BaseSlider.Value>;
}

export function SliderControl({ className, ...props }: BaseSlider.Control.Props) {
  return <BaseSlider.Control data-slot="slider-control" {...props} className={classes(sliderControlClasses, className)} />;
}

export function SliderTrack({ className, ...props }: BaseSlider.Track.Props) {
  return <BaseSlider.Track data-slot="slider-track" {...props} className={classes(sliderTrackClasses, className)} />;
}

export function SliderIndicator({ className, ...props }: BaseSlider.Indicator.Props) {
  return <BaseSlider.Indicator data-slot="slider-indicator" {...props} className={classes(sliderIndicatorClasses, className)} />;
}

export function SliderThumb({ ref, className, index = 0, ...props }: BaseSlider.Thumb.Props) {
  return <BaseSlider.Thumb
    data-slot="slider-thumb"
    {...props}
    index={index}
    ref={ref}
    className={state => cn(
      sliderThumbClasses,
      state.dragging && state.activeThumbIndex === index && sliderThumbPressedClasses,
      typeof className === 'function' ? className(state) : className,
    )}
  />;
}

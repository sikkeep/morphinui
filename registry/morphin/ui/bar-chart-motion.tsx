'use client';

import { useLayoutEffect, useMemo, useRef, type ComponentProps } from 'react';
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/registry/morphin/lib/motion';

/** Seconds. Hover is quick in and softer out; counting is a short emphasis, with no delay. */
export const barChartMotion = {
  resize: { duration: 0.4, curve: '0.45,0,0.15,1' },
  hover: { enter: 0.15, exit: 0.25, ease: 'power1.out' },
  counter: { ease: 'power2.inOut', duration: 0.5 },
} as const;

gsap.registerPlugin(CustomEase);
export const barChartResizeEase = CustomEase.create(
  'morphin-bar-chart-resize',
  barChartMotion.resize.curve,
);

/** Keeps inline option objects from restarting a counter on unrelated parent renders. */
export function useBarChartFormatter(
  locale: string,
  options?: Intl.NumberFormatOptions,
) {
  const key = JSON.stringify(options ?? {});
  return useMemo(
    () =>
      new Intl.NumberFormat(
        locale,
        JSON.parse(key) as Intl.NumberFormatOptions,
      ),
    [locale, key],
  );
}

export interface BarChartNumberProps
  extends Omit<ComponentProps<'span'>, 'children'> {
  value: number;
  format?: Intl.NumberFormatOptions;
  locale?: string;
  reduceMotion?: boolean;
}

/** Counts from the drawn value; assistive technology always receives the current exact value. */
export function BarChartNumber({
  value,
  format,
  locale = 'en-US',
  reduceMotion = false,
  className,
  ...props
}: BarChartNumberProps) {
  const formatter = useBarChartFormatter(locale, format);
  const formatted = formatter.format(value);
  const reduced = useReducedMotion() || reduceMotion;
  const visual = useRef<HTMLSpanElement>(null);
  const drawn = useRef(value);

  useLayoutEffect(() => {
    const node = visual.current;
    if (!node) return;
    const from = drawn.current;
    if (
      reduced ||
      !Number.isFinite(from) ||
      !Number.isFinite(value) ||
      from === value
    ) {
      drawn.current = value;
      node.textContent = formatted;
      return;
    }

    // Start from the number that is on screen and let GSAP walk it to the new value.
    node.textContent = formatter.format(from);
    const running = { current: from };
    const tween = gsap.to(running, {
      current: value,
      ...barChartMotion.counter,
      onUpdate: () => {
        drawn.current = running.current;
        node.textContent = formatter.format(running.current);
      },
      onComplete: () => {
        drawn.current = value;
        node.textContent = formatted;
      },
    });
    return () => {
      tween.kill();
      // This text node belongs only to the animation; no React subtree is cloned or replaced.
      node.textContent = formatted;
    };
  }, [value, formatted, formatter, reduced]);

  return (
    <span
      {...props}
      data-slot="bar-chart-number"
      className={cn('inline-block tabular-nums', className)}
    >
      <span className="sr-only">{formatted}</span>
      <span ref={visual} aria-hidden="true" data-slot="bar-chart-number-visual">
        {formatted}
      </span>
    </span>
  );
}

'use client';

import type { ComponentProps, ComponentType } from 'react';
import { useRender } from '@base-ui/react/use-render';
import { Atom, type SpinnerProps as LoaderProps } from 'loading-dev';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/registry/morphin/lib/motion';

const spinnerSizes = { xs: 12, sm: 16, md: 20, lg: 24, xl: 32 } as const;
export type SpinnerSize = keyof typeof spinnerSizes;

export interface SpinnerProps extends Omit<ComponentProps<'span'>, 'children' | 'color'> {
  /** Any loading-dev spinner component, such as `Arc` or `Ring`. */
  loader?: ComponentType<LoaderProps>;
  /** A named size or a pixel value. */
  size?: SpinnerSize | number;
  /** Announced through `role="status"`. Omit it when nearby text already says what is loading. */
  label?: string;
  /** One cycle, in milliseconds. Defaults to the spinner's own timing. */
  duration?: number;
  /** Pauses the spinner for this instance only. */
  reduceMotion?: boolean;
  /** Renders another element, e.g. `render={<div />}`. */
  render?: useRender.RenderProp;
}

/** A loading-dev spinner that inherits the text color and pauses under the reduced-motion policy. */
export function Spinner({ loader: Loader = Atom, size = 'md', label, duration, reduceMotion = false, render, ref, className, ...props }: SpinnerProps) {
  const reduced = useReducedMotion() || reduceMotion;
  return useRender({
    defaultTagName: 'span',
    render,
    ref,
    props: {
      'data-slot': 'spinner',
      role: label ? 'status' : undefined,
      'aria-hidden': label ? undefined : true,
      ...props,
      className: cn('inline-flex shrink-0 items-center justify-center', className),
      children: <>
        <Loader size={typeof size === 'number' ? size : spinnerSizes[size]} duration={duration} playState={reduced ? 'paused' : 'running'} />
        {label && <span className="sr-only">{label}</span>}
      </>,
    },
  });
}

export const spinnerSizeNames = Object.keys(spinnerSizes) as SpinnerSize[];

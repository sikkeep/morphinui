'use client';

import { useEffect, useId, useRef, type ReactNode, type Ref, type RefObject } from 'react';
import { Fieldset } from '@base-ui/react/fieldset';
import { Switch as BaseSwitch } from '@base-ui/react/switch';
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { cn } from '@/lib/utils';
import { motionTokens, useReducedMotion } from '@/registry/morphin/lib/motion';
import { useSound } from '@/registry/morphin/lib/sound';
import {
  switchDescriptionClasses, switchFieldVariants, switchIconVariants, switchLabelClasses,
  switchThumbClasses, switchVariants, type SwitchOptions,
} from '@/registry/morphin/ui/switch-variants';

gsap.registerPlugin(CustomEase);
const toggleEase = CustomEase.create('morphin-toggle', motionTokens.toggle.curve);

/** Animates the thumb with GSAP each time the track's `data-checked` changes, never on mount. */
function useThumbTravel(thumb: RefObject<HTMLSpanElement | null>, reduced: boolean) {
  useEffect(() => {
    const node = thumb.current;
    const track = node?.parentElement;
    if (!node || !track || reduced) return;
    let context: gsap.Context | undefined;
    let timeline: gsap.core.Timeline | undefined;
    const settle = () => {
      context?.revert();
      context = timeline = undefined;
    };
    const observer = new MutationObserver(() => {
      const style = getComputedStyle(track);
      const inset = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
      const travel = track.clientWidth - inset - node.offsetWidth;
      const direction = (track.hasAttribute('data-checked') ? 1 : -1) * (style.direction === 'rtl' ? -1 : 1);
      // The rest position already moved by `travel`; start from wherever the thumb is drawn now.
      const drawn = timeline?.isActive() ? Number(gsap.getProperty(node, 'x')) : 0;
      settle();
      const { duration, overshoot, settle: back } = motionTokens.toggle;
      context = gsap.context(() => {
        timeline = gsap.timeline({ onComplete: settle })
          .add(gsap.fromTo(node, { x: drawn - direction * travel }, { x: direction * overshoot, duration: duration * 0.55, ease: toggleEase }))
          .add(gsap.to(node, { x: -direction * back, duration: duration * 0.25, ease: toggleEase }))
          .add(gsap.to(node, { x: 0, duration: duration * 0.2, ease: toggleEase }));
      });
    });
    observer.observe(track, { attributes: true, attributeFilter: ['data-checked'] });
    return () => {
      observer.disconnect();
      settle();
    };
  }, [thumb, reduced]);
}

export interface SwitchProps extends Omit<BaseSwitch.Root.Props, 'className' | 'children' | 'ref'>, SwitchOptions {
  ref?: Ref<HTMLElement>;
  /** Classes for the outermost element: the label row when `label` or `description` is set, otherwise the track. */
  className?: string;
  label?: ReactNode;
  description?: ReactNode;
  /** Where the label sits relative to the track. */
  labelPosition?: 'start' | 'end';
  /** Decorative icon in the thumb while checked; it swaps with a blur and scale. */
  checkedIcon?: ReactNode;
  /** Decorative icon in the thumb while unchecked. */
  uncheckedIcon?: ReactNode;
  /** Turns off the thumb travel and the icon swap for this switch only. */
  reduceMotion?: boolean;
}

export function Switch({
  ref, size = 'md', className, label, description, labelPosition = 'end', checkedIcon, uncheckedIcon, reduceMotion = false,
  'aria-labelledby': labelledBy, 'aria-describedby': describedBy, onCheckedChange, ...props
}: SwitchProps) {
  const reduced = useReducedMotion() || reduceMotion;
  const play = useSound();
  const thumb = useRef<HTMLSpanElement>(null);
  const id = useId();
  const labelId = label ? `${id}-label` : undefined;
  const descriptionId = description ? `${id}-description` : undefined;
  const hasText = Boolean(label || description);
  useThumbTravel(thumb, reduced);

  const control = <BaseSwitch.Root
    data-slot="switch"
    data-size={size}
    data-reduced-motion={reduced || undefined}
    {...props}
    ref={ref}
    aria-labelledby={labelledBy ?? (props['aria-label'] ? undefined : labelId)}
    aria-describedby={[describedBy, descriptionId].filter(Boolean).join(' ') || undefined}
    onCheckedChange={(checked, details) => {
      onCheckedChange?.(checked, details);
      if (!details.isCanceled) play('toggle', { direction: checked ? 'forward' : 'back' });
    }}
    className={cn(switchVariants({ size }), !hasText && className)}
  >
    <BaseSwitch.Thumb data-slot="switch-thumb" ref={thumb} className={switchThumbClasses}>
      {checkedIcon && <span data-slot="switch-icon" data-state="checked" aria-hidden="true" className={switchIconVariants({ state: 'checked' })}>{checkedIcon}</span>}
      {uncheckedIcon && <span data-slot="switch-icon" data-state="unchecked" aria-hidden="true" className={switchIconVariants({ state: 'unchecked' })}>{uncheckedIcon}</span>}
    </BaseSwitch.Thumb>
  </BaseSwitch.Root>;
  if (!hasText) return control;

  const text = <span data-slot="switch-content" className="flex min-w-0 flex-col gap-0.5">
    {label && <span id={labelId} data-slot="switch-label" className={switchLabelClasses}>{label}</span>}
    {description && <span id={descriptionId} data-slot="switch-description" className={switchDescriptionClasses}>{description}</span>}
  </span>;
  return <label data-slot="switch-field" className={cn(switchFieldVariants({ labelPosition }), className)}>
    {labelPosition === 'start' && text}
    <span className="flex h-5 shrink-0 items-center">{control}</span>
    {labelPosition === 'end' && text}
  </label>;
}

export interface SwitchGroupProps extends Omit<Fieldset.Root.Props, 'className'> {
  className?: string;
  /** Visible group name, rendered as the fieldset legend. */
  legend?: ReactNode;
  orientation?: 'vertical' | 'horizontal';
}

export function SwitchGroup({
  ref, className, legend, orientation = 'vertical', children, ...props
}: SwitchGroupProps) {
  return <Fieldset.Root data-slot="switch-group" data-orientation={orientation} {...props} ref={ref} className={cn('flex min-w-0 flex-col gap-3', className)}>
    {legend && <Fieldset.Legend data-slot="switch-group-legend" className="text-sm font-medium text-foreground">{legend}</Fieldset.Legend>}
    <div data-slot="switch-group-items" className={cn('flex gap-4', orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap gap-x-6')}>{children}</div>
  </Fieldset.Root>;
}

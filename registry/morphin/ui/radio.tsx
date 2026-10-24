'use client';

import { createContext, use, useId, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { Fieldset } from '@base-ui/react/fieldset';
import { Radio as BaseRadio } from '@base-ui/react/radio';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/registry/morphin/lib/motion';
import { useSound, type SoundOptions } from '@/registry/morphin/lib/sound';
import {
  radioCardClasses, radioDescriptionClasses, radioDotClasses, radioFieldVariants, radioGroupClasses, radioGroupItemsClasses,
  radioGroupLegendClasses, radioIndicatorClasses, radioLabelClasses, radioSizeClasses, radioVariants, type RadioOptions, type RadioSize,
} from '@/registry/morphin/ui/radio-variants';

export { radioVariants, radioSizes } from '@/registry/morphin/ui/radio-variants';
export type { RadioOptions, RadioSize } from '@/registry/morphin/ui/radio-variants';

/** What a group hands to its radios: they take its size unless they set their own. */
const RadioGroupContext = createContext<{ size?: RadioSize }>({});

export interface RadioProps<Value = string> extends Omit<BaseRadio.Root.Props<Value>, 'className' | 'children' | 'ref'>, RadioOptions {
  ref?: Ref<HTMLElement>;
  /** Classes for the outermost element: the label row when `label` or `description` is set, otherwise the circle. */
  className?: string;
  label?: ReactNode;
  description?: ReactNode;
  /** Where the label sits relative to the circle. */
  labelPosition?: 'start' | 'end';
  /** Turns off the fill, the dot and the press for this radio only. */
  reduceMotion?: boolean;
}

/**
 * One choice of a `RadioGroup`: a circle that fills, then shows its dot. With `label` or `description`
 * the circle sits inside a `<label>`, so the whole row is the click target.
 */
export function Radio({
  ref, size, className, label, description, labelPosition = 'end', reduceMotion = false,
  'aria-labelledby': labelledBy, 'aria-describedby': describedBy, ...props
}: RadioProps) {
  const group = use(RadioGroupContext);
  const resolvedSize = size ?? group.size ?? 'md';
  const reduced = useReducedMotion() || reduceMotion;
  const id = useId();
  const labelId = label ? `${id}-label` : undefined;
  const descriptionId = description ? `${id}-description` : undefined;
  const hasText = Boolean(label || description);

  const control = <BaseRadio.Root
    data-slot="radio"
    data-size={resolvedSize}
    data-reduced-motion={reduced || undefined}
    {...props}
    ref={ref}
    aria-labelledby={labelledBy ?? (props['aria-label'] ? undefined : labelId)}
    aria-describedby={[describedBy, descriptionId].filter(Boolean).join(' ') || undefined}
    className={cn(radioVariants({ size: resolvedSize }), !hasText && className)}
  >
    <BaseRadio.Indicator data-slot="radio-indicator" keepMounted className={radioIndicatorClasses}>
      <span data-slot="radio-dot" aria-hidden="true" className={radioDotClasses} />
    </BaseRadio.Indicator>
  </BaseRadio.Root>;
  if (!hasText) return control;

  const text = <span data-slot="radio-content" className="flex min-w-0 flex-col gap-0.5">
    {label && <span id={labelId} data-slot="radio-label" className={radioLabelClasses(resolvedSize)}>{label}</span>}
    {description && <span id={descriptionId} data-slot="radio-description" className={radioDescriptionClasses(resolvedSize)}>{description}</span>}
  </span>;
  return <label data-slot="radio-field" className={cn(radioFieldVariants({ labelPosition }), className)}>
    {labelPosition === 'start' && text}
    <span className={cn('flex h-(--choice-line) shrink-0 items-center', radioSizeClasses[resolvedSize])}>{control}</span>
    {labelPosition === 'end' && text}
  </label>;
}

export interface RadioCardProps extends Omit<RadioProps, 'label' | 'description' | 'labelPosition' | 'title'> {
  title: ReactNode;
  description?: ReactNode;
}

/**
 * A radio as a card: the circle, a title and a description on a surface that is one big click target.
 * The surface lightens on hover and takes the primary border when chosen. Put cards in a `RadioGroup`.
 */
export function RadioCard({
  title, description, className, ...props
}: RadioCardProps) {
  return <Radio {...props} label={title} description={description} className={cn(radioCardClasses, className)} />;
}

export interface RadioDotProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'>, RadioOptions {
  /** Whether the dot shows. */
  selected?: boolean;
  /** Turns off the fill and the dot transition for this glyph only. */
  reduceMotion?: boolean;
}

/**
 * The bare circle and dot, with no behavior: for a menu row that is itself the choice (a dropdown item
 * that manages the selection), where a nested focusable radio would be invalid. It is hidden from
 * assistive technology; the row carries the state.
 */
export function RadioDot({ selected = false, size = 'md', reduceMotion = false, className, ...props }: RadioDotProps) {
  const reduced = useReducedMotion() || reduceMotion;
  return <span
    data-slot="radio-dot-glyph"
    data-size={size}
    data-checked={selected || undefined}
    data-unchecked={!selected || undefined}
    data-reduced-motion={reduced || undefined}
    aria-hidden="true"
    {...props}
    className={cn(radioVariants({ size }), 'pointer-events-none cursor-default', className)}
  >
    <span className={radioIndicatorClasses}><span data-slot="radio-dot" className={radioDotClasses} /></span>
  </span>;
}

export interface RadioGroupProps<Value = string> extends Omit<BaseRadioGroup.Props<Value>, 'className'> {
  className?: string;
  /** Visible group name, rendered as the fieldset legend. */
  legend?: ReactNode;
  orientation?: 'vertical' | 'horizontal';
  /** Applies to every radio that does not set its own. */
  size?: RadioSize;
}

/**
 * Which way the choice moved, from the DOM order of the group's radios: each radio's hidden input
 * (the change event's target) follows it, and the radio still marked checked is the one being left.
 */
function choiceDirection(target: EventTarget | null): SoundOptions['direction'] {
  if (!(target instanceof HTMLInputElement)) return undefined;
  const group = target.closest('[data-slot="radio-group"]');
  if (!group) return undefined;
  const radios = Array.from(group.querySelectorAll('[role="radio"]'));
  const next = Array.from(group.querySelectorAll('input[type="radio"]')).indexOf(target);
  const previous = radios.findIndex(radio => radio.getAttribute('aria-checked') === 'true');
  if (next < 0 || previous < 0 || next === previous) return undefined;
  return next > previous ? 'forward' : 'back';
}

/**
 * Radios that share one value: exactly one is chosen. Arrow keys move the choice, and Tab enters and
 * leaves the group as one stop. Give it a `legend` or an `aria-label`.
 */
export function RadioGroup({
  ref, className, legend, orientation = 'vertical', size, children, onValueChange, ...props
}: RadioGroupProps) {
  const play = useSound();
  return <RadioGroupContext value={{ size }}>
    <Fieldset.Root
      data-slot="radio-group"
      data-orientation={orientation}
      render={<BaseRadioGroup
        {...props}
        ref={ref}
        onValueChange={(value, details) => {
          const direction = choiceDirection(details.event.target);
          onValueChange?.(value, details);
          if (!details.isCanceled) play('select', direction && { direction });
        }}
      />}
      className={cn(radioGroupClasses, className)}
    >
      {legend && <Fieldset.Legend data-slot="radio-group-legend" className={radioGroupLegendClasses}>{legend}</Fieldset.Legend>}
      <div data-slot="radio-group-items" className={radioGroupItemsClasses[orientation]}>{children}</div>
    </Fieldset.Root>
  </RadioGroupContext>;
}

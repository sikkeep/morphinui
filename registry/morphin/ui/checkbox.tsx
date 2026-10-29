'use client';

import { createContext, use, useId, type CSSProperties, type ReactNode, type Ref } from 'react';
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { CheckboxGroup as BaseCheckboxGroup } from '@base-ui/react/checkbox-group';
import { Fieldset } from '@base-ui/react/fieldset';
import { HugeiconsIcon } from '@hugeicons/react';
import { MinusSignIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/registry/morphin/lib/motion';
import { useSound } from '@/registry/morphin/lib/sound';
import {
  checkboxCardClasses, checkboxDescriptionClasses, checkboxFieldVariants, checkboxGroupClasses, checkboxGroupItemsClasses,
  checkboxGroupLegendClasses, checkboxIndicatorClasses, checkboxLabelClasses, checkboxVariants,
  checkboxSizeClasses, checkIconLength, minusIconLength, type CheckboxOptions, type CheckboxSize,
} from '@/registry/morphin/ui/checkbox-variants';

export { checkboxVariants, checkboxSizes } from '@/registry/morphin/ui/checkbox-variants';
export type { CheckboxOptions, CheckboxSize } from '@/registry/morphin/ui/checkbox-variants';

/** What a group hands to its checkboxes: they take its size unless they set their own. */
const CheckboxGroupContext = createContext<{ size?: CheckboxSize }>({});

export interface CheckboxProps extends Omit<BaseCheckbox.Root.Props, 'className' | 'children' | 'ref'>, CheckboxOptions {
  /** Classes for the outermost element: the label row when `label` or `description` is set, otherwise the box. */
  className?: string;
  label?: ReactNode;
  description?: ReactNode;
  /** Where the label sits relative to the box. */
  labelPosition?: 'start' | 'end';
  /** Turns off the fill, the draw and the press for this checkbox only. */
  reduceMotion?: boolean;
  ref?: Ref<HTMLElement>;
}

/**
 * A box that fills, then draws its tick. Inside a `CheckboxGroup` it is identified by
 * its `value`; with `indeterminate`, or as the group's `parent`, it shows a dash. With `label` or
 * `description` the box sits inside a `<label>`, so the whole row is the click target.
 */
export function Checkbox({
  ref, size, className, label, description, labelPosition = 'end', reduceMotion = false,
  'aria-labelledby': labelledBy, 'aria-describedby': describedBy, onCheckedChange, ...props
}: CheckboxProps) {
  const group = use(CheckboxGroupContext);
  const resolvedSize = size ?? group.size ?? 'md';
  const reduced = useReducedMotion() || reduceMotion;
  const play = useSound();
  const id = useId();
  const labelId = label ? `${id}-label` : undefined;
  const descriptionId = description ? `${id}-description` : undefined;
  const hasText = Boolean(label || description);

  const control = <BaseCheckbox.Root
    data-slot="checkbox"
    data-size={resolvedSize}
    data-reduced-motion={reduced || undefined}
    {...props}
    ref={ref}
    aria-labelledby={labelledBy ?? (props['aria-label'] ? undefined : labelId)}
    aria-describedby={[describedBy, descriptionId].filter(Boolean).join(' ') || undefined}
    // Base UI calls this only on the box the user changed, never on the boxes a group or a parent updates.
    onCheckedChange={(checked, details) => {
      onCheckedChange?.(checked, details);
      if (!details.isCanceled) play('toggle', { direction: checked ? 'forward' : 'back' });
    }}
    className={cn(checkboxVariants({ size: resolvedSize }), !hasText && className)}
  >
    <BaseCheckbox.Indicator data-slot="checkbox-indicator" keepMounted className={checkboxIndicatorClasses}>
      <HugeiconsIcon icon={Tick02Icon} data-icon="check" strokeWidth={3} aria-hidden="true" style={{ '--check-len': checkIconLength } as CSSProperties} />
      <HugeiconsIcon icon={MinusSignIcon} data-icon="minus" strokeWidth={3} aria-hidden="true" style={{ '--check-len': minusIconLength } as CSSProperties} />
    </BaseCheckbox.Indicator>
  </BaseCheckbox.Root>;
  if (!hasText) return control;

  const text = <span data-slot="checkbox-content" className="flex min-w-0 flex-col gap-0.5">
    {label && <span id={labelId} data-slot="checkbox-label" className={checkboxLabelClasses(resolvedSize)}>{label}</span>}
    {description && <span id={descriptionId} data-slot="checkbox-description" className={checkboxDescriptionClasses(resolvedSize)}>{description}</span>}
  </span>;
  return <label data-slot="checkbox-field" className={cn(checkboxFieldVariants({ labelPosition }), className)}>
    {labelPosition === 'start' && text}
    <span className={cn('flex h-(--choice-line) shrink-0 items-center', checkboxSizeClasses[resolvedSize])}>{control}</span>
    {labelPosition === 'end' && text}
  </label>;
}

export interface CheckboxCardProps extends Omit<CheckboxProps, 'label' | 'description' | 'labelPosition' | 'title'> {
  title: ReactNode;
  description?: ReactNode;
}

/**
 * A checkbox as a card: the box, a title and a description on a surface that is one big click target.
 * The surface lightens on hover and takes the primary border when ticked.
 */
export function CheckboxCard({
  ref, title, description, className, ...props
}: CheckboxCardProps) {
  return <Checkbox {...props} ref={ref} label={title} description={description} className={cn(checkboxCardClasses, className)} />;
}

export interface CheckboxGroupProps extends Omit<BaseCheckboxGroup.Props, 'className'> {
  className?: string;
  /** Visible group name, rendered as the fieldset legend. */
  legend?: ReactNode;
  orientation?: 'vertical' | 'horizontal';
  /** Applies to every checkbox that does not set its own. */
  size?: CheckboxSize;
}

/**
 * Checkboxes that share one value: the values of the ticked ones. Pass `allValues` and a checkbox with
 * `parent` for a "select all" that shows a dash while only some are ticked.
 */
export function CheckboxGroup({
  ref, className, legend, orientation = 'vertical', size, children, ...props
}: CheckboxGroupProps) {
  return <CheckboxGroupContext value={{ size }}>
    <Fieldset.Root
      data-slot="checkbox-group"
      data-orientation={orientation}
      render={<BaseCheckboxGroup {...props} ref={ref} />}
      className={cn(checkboxGroupClasses, className)}
    >
      {legend && <Fieldset.Legend data-slot="checkbox-group-legend" className={checkboxGroupLegendClasses}>{legend}</Fieldset.Legend>}
      <div data-slot="checkbox-group-items" className={checkboxGroupItemsClasses[orientation]}>{children}</div>
    </Fieldset.Root>
  </CheckboxGroupContext>;
}

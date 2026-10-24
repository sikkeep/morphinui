'use client';

import { createContext, use, useMemo, type ReactNode } from 'react';
import { Accordion as BaseAccordion } from '@base-ui/react/accordion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/registry/morphin/lib/motion';
import { useSound } from '@/registry/morphin/lib/sound';
import {
  accordionChevronClasses, accordionContentVariants, accordionHeaderClasses, accordionItemVariants,
  accordionLabelClasses, accordionPanelClasses, accordionTriggerVariants, accordionVariants,
  type AccordionSize, type AccordionVariant,
} from '@/registry/morphin/ui/accordion-variants';

export { accordionSizes, accordionVariantNames } from '@/registry/morphin/ui/accordion-variants';
export type { AccordionOptions, AccordionSize, AccordionVariant } from '@/registry/morphin/ui/accordion-variants';

type AccordionStyle = { variant: AccordionVariant; size: AccordionSize };
const AccordionStyleContext = createContext<AccordionStyle>({ variant: 'ghost', size: 'md' });

export interface AccordionProps<Value = unknown> extends Omit<BaseAccordion.Root.Props<Value>, 'className'> {
  className?: string;
  /** `ghost` divides rows with hairlines; `card` makes each item a surface. Reaches every item. */
  variant?: AccordionVariant;
  /** Reaches every item. */
  size?: AccordionSize;
  /** Opens and closes panels without motion. Also follows `prefers-reduced-motion` and `MotionProvider`. */
  reduceMotion?: boolean;
}

/**
 * A stack of headers that each show or hide a panel. One panel at a time by default; pass `multiple`
 * to let several stay open. Items are identified by their `value`.
 */
export function Accordion<Value = unknown>({
  variant = 'ghost', size = 'md', reduceMotion, className, ...props
}: AccordionProps<Value>) {
  const reduced = useReducedMotion() || reduceMotion === true;
  const style = useMemo(() => ({ variant, size }), [variant, size]);
  return <AccordionStyleContext value={style}>
    <BaseAccordion.Root<Value>
      data-slot="accordion"
      data-variant={variant}
      data-size={size}
      data-reduced-motion={reduced || undefined}
      className={cn(accordionVariants({ variant, size }), className)}
      {...props}
    />
  </AccordionStyleContext>;
}

export interface AccordionItemProps extends Omit<BaseAccordion.Item.Props, 'className'> {
  className?: string;
}

/** One header and its panel. Give it a `value` to open it from `value` or `defaultValue`. */
export function AccordionItem({ className, ref, onOpenChange, ...props }: AccordionItemProps) {
  const { variant, size } = use(AccordionStyleContext);
  const play = useSound();
  return <BaseAccordion.Item
    data-slot="accordion-item"
    className={cn(accordionItemVariants({ variant, size }), className)}
    {...props}
    onOpenChange={(open, details) => {
      onOpenChange?.(open, details);
      // Only the trigger: find-in-page opening a hidden-until-found panel stays quiet.
      if (details.reason === 'trigger-press' && !details.isCanceled) play(open ? 'open' : 'close', { emphasis: 'subtle' });
    }}
    ref={ref}
  />;
}

export interface AccordionTriggerProps extends Omit<BaseAccordion.Trigger.Props, 'className'> {
  className?: string;
  /** Props for the heading around the trigger (an `h3`); pass `render={<h2 />}` to change its level. */
  headerProps?: Omit<BaseAccordion.Header.Props, 'children'>;
  /** Replaces the chevron at the end. Pass `null` to show none. */
  icon?: ReactNode;
}

/** The heading and the button that opens and closes the item's panel. The chevron turns over while it is open. */
export function AccordionTrigger({
  className, headerProps, icon, children, ref, ...props
}: AccordionTriggerProps) {
  const { variant, size } = use(AccordionStyleContext);
  const { className: headerClassName, ...header } = headerProps ?? {};
  return <BaseAccordion.Header
    data-slot="accordion-header"
    {...header}
    className={state => cn(accordionHeaderClasses, typeof headerClassName === 'function' ? headerClassName(state) : headerClassName)}
  >
    <BaseAccordion.Trigger
      data-slot="accordion-trigger"
      className={cn(accordionTriggerVariants({ variant, size }), className)}
      {...props}
      ref={ref}
    >
      <span data-slot="accordion-label" className={accordionLabelClasses}>{children}</span>
      {icon === undefined
        ? <ChevronDown data-icon="inline-end" strokeWidth={2} aria-hidden="true" className={accordionChevronClasses} />
        : icon}
    </BaseAccordion.Trigger>
  </BaseAccordion.Header>;
}

export interface AccordionPanelProps extends Omit<BaseAccordion.Panel.Props, 'className'> {
  /** Classes for the content inside the panel, where the padding and text styles live. */
  className?: string;
  /** Classes for the panel itself, whose height animates. Do not pad it. */
  panelClassName?: string;
}

/**
 * The part that opens and closes. Its height eases to the content's and the content fades in. Pass
 * `hiddenUntilFound` (here or on `Accordion`) so the browser's find-in-page can open it.
 */
export function AccordionPanel({ className, panelClassName, children, ref, ...props }: AccordionPanelProps) {
  const { variant, size } = use(AccordionStyleContext);
  return <BaseAccordion.Panel
    data-slot="accordion-panel"
    className={cn(accordionPanelClasses, panelClassName)}
    {...props}
    ref={ref}
  >
    <div data-slot="accordion-content" className={cn(accordionContentVariants({ variant, size }), className)}>
      {children}
    </div>
  </BaseAccordion.Panel>;
}

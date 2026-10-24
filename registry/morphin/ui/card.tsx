'use client';

import { type HTMLAttributes, type Ref } from 'react';
import { useRender } from '@base-ui/react/use-render';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/registry/morphin/lib/motion';
import {
  cardActionClasses, cardClasses, cardContentClasses, cardDescriptionClasses, cardFooterClasses, cardHeaderClasses,
  cardMediaBleedClasses, cardMediaClasses, cardMediaInsetClasses, cardTitleClasses, type CardOptions,
} from '@/registry/morphin/ui/card-variants';

export { cardVariants, cardClasses, cardVariantNames, cardSizes } from '@/registry/morphin/ui/card-variants';
export type { CardOptions, CardVariant, CardSize } from '@/registry/morphin/ui/card-variants';

/** A disabled card must not navigate, even when `render` gives it its own href. */
const preventNavigation = (event: { preventDefault(): void }) => event.preventDefault();

type SlotProps = HTMLAttributes<HTMLElement> & {
  /** Renders a different element, e.g. `render={<h2 />}` for a title or `render={<a href="/" />}` for a card. */
  render?: useRender.RenderProp;
  ref?: Ref<HTMLElement>;
};

export interface CardProps extends CardOptions, SlotProps {
  /** Adds hover, press and focus styles for a card that is a link or button. Defaults to `true` when `render` is set. */
  interactive?: boolean;
  disabled?: boolean;
}

/**
 * A surface for grouped content, composed with `CardHeader`, `CardContent`, `CardFooter` and `CardMedia`.
 * Renders a `<div>`; pass `render={<a href="…" />}` to make the whole card a link.
 */
export function Card({
  ref, variant, size, interactive, disabled, render, className, ...props
}: CardProps) {
  const reduced = useReducedMotion();
  const active = interactive ?? render !== undefined;
  return useRender({
    defaultTagName: 'div',
    render,
    ref,
    props: {
      'data-slot': 'card',
      'data-variant': variant ?? 'filled',
      'data-size': size ?? 'md',
      'data-interactive': active || undefined,
      'data-disabled': disabled || undefined,
      ...(active && disabled ? { 'aria-disabled': true, tabIndex: -1, onClick: preventNavigation } : {}),
      'data-reduced-motion': reduced || undefined,
      ...props,
      className: cn(cardClasses({ variant, size }), className),
    },
  });
}

function useSlot(tag: string, slot: string, base: string, { ref, render, className, ...props }: SlotProps) {
  return useRender({
    defaultTagName: tag as 'div',
    render,
    ref,
    props: { 'data-slot': slot, ...props, className: cn(base, className) },
  });
}

/** Holds a `CardTitle`, a `CardDescription` and an optional `CardAction`. */
export function CardHeader(props: SlotProps) {
  return useSlot('div', 'card-header', cardHeaderClasses, props);
}

/** Renders an `<h3>`; pass `render={<h2 />}` to match your heading outline. */
export function CardTitle(props: SlotProps) {
  return useSlot('h3', 'card-title', cardTitleClasses, props);
}

export function CardDescription(props: SlotProps) {
  return useSlot('p', 'card-description', cardDescriptionClasses, props);
}

/** A control in the header's top end corner, such as a menu button or a badge. */
export function CardAction(props: SlotProps) {
  return useSlot('div', 'card-action', cardActionClasses, props);
}

export function CardContent(props: SlotProps) {
  return useSlot('div', 'card-content', cardContentClasses, props);
}

export function CardFooter(props: SlotProps) {
  return useSlot('div', 'card-footer', cardFooterClasses, props);
}

export interface CardMediaProps extends SlotProps {
  /** Extends the media to the card's edges instead of insetting it. */
  bleed?: boolean;
}

/** An image or video that fills its box. Size it with `aspect-video` or a height. */
export function CardMedia({ bleed, className, ...props }: CardMediaProps) {
  return useSlot('div', 'card-media', cn(cardMediaClasses, bleed ? cardMediaBleedClasses : cardMediaInsetClasses), { 'data-bleed': bleed || undefined, ...props, className } as SlotProps);
}

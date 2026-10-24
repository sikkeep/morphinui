'use client';

import {
  useEffect, useRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ComponentProps, type MouseEvent, type ReactNode, type Ref,
  type RefObject,
} from 'react';
import { useRender } from '@base-ui/react/use-render';
import { gsap } from 'gsap';
import { cn } from '@/lib/utils';
import { motionTokens, useReducedMotion } from '@/registry/morphin/lib/motion';
import { soundInput, useSound } from '@/registry/morphin/lib/sound';
import {
  chipClasses, chipGroupClasses, chipShimmerClasses, type ChipOptions,
} from '@/registry/morphin/ui/chip-variants';

export { chipVariants, chipClasses, chipVariantNames, chipSizes } from '@/registry/morphin/ui/chip-variants';
export type { ChipOptions, ChipVariant, ChipSize } from '@/registry/morphin/ui/chip-variants';

/** A disabled link must not navigate, even when `render` gives it its own href. */
const preventNavigation = (event: { preventDefault(): void }) => event.preventDefault();

interface CommonProps extends ChipOptions {
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  /** A glint sweeps across the label. Off under reduced motion. */
  shimmer?: boolean;
  /**
   * Makes it a toggle: a button with `aria-pressed`, drawn in the inverse colors while true (pass
   * false for "off"). A link with `selected` is the current page (`aria-current="page"`). Leave it
   * out for a chip that is only clicked, like "Add tag".
   */
  selected?: boolean;
  disabled?: boolean;
  /** Turns the press, hover and shimmer motion off. Also follows `prefers-reduced-motion` and `MotionProvider`. */
  reduceMotion?: boolean;
  /** Renders another element, e.g. your router's link. */
  render?: useRender.RenderProp;
  ref?: Ref<HTMLElement>;
}

type AnchorProps = CommonProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string };
type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
export type ChipProps = AnchorProps | ButtonProps;

function Icon({ side, children }: { side: 'inline-start' | 'inline-end'; children: ReactNode }) {
  return <span data-slot="chip-icon" data-icon={side} className="pointer-events-none inline-flex shrink-0 items-center justify-center" aria-hidden="true">{children}</span>;
}

/** A glint that crosses the label while `active`. The inline styles belong to the tween and are reverted with it. */
function useShimmer(target: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    const node = target.current;
    if (!node || !active) return;
    const tween = gsap.fromTo(node, { backgroundPosition: '100% 50%' }, { backgroundPosition: '0% 50%', duration: motionTokens.shimmer.duration, ease: 'none', repeat: -1 });
    return () => { tween.revert(); };
  }, [target, active]);
}

/**
 * A pill for a tag, a status or a filter. It is a `<span>` until it can be used: an `href` makes it a
 * link, and a click handler or `selected` makes it a button. Put two in a `ChipGroup` for a joined pair.
 */
export function Chip({
  ref, variant, size, uppercase, leadingIcon, trailingIcon, shimmer, selected, disabled, reduceMotion, render, className, children, href, onClick, ...props
}: ChipProps) {
  const reduced = useReducedMotion() || reduceMotion === true;
  const label = useRef<HTMLSpanElement>(null);
  const shimmering = shimmer === true && !reduced;
  useShimmer(label, shimmering);

  const play = useSound();
  const isLink = href !== undefined;
  const interactive = isLink || render !== undefined || onClick !== undefined || selected !== undefined;
  const state = interactive
    ? isLink || render !== undefined
      ? { 'aria-current': selected ? 'page' as const : undefined }
      : { type: 'button' as const, 'aria-pressed': selected }
    : {};
  const disabledProps = disabled && interactive
    ? isLink || render !== undefined
      // A disabled link must not navigate: drop the href and keep it announced as a link.
      ? { 'aria-disabled': true, role: 'link', tabIndex: -1, 'data-disabled': '', onClick: preventNavigation }
      : { disabled: true, 'data-disabled': '' }
    : { href };
  const handleClick = (event: MouseEvent<HTMLAnchorElement & HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    const input = soundInput(event);
    if (isLink || render !== undefined) play('navigate', { input, emphasis: 'subtle' });
    // The click flips the state, so a selected chip is turning off.
    else if (selected !== undefined) play('toggle', { input, emphasis: 'subtle', direction: selected ? 'back' : 'forward' });
    else play('tap', { input, emphasis: 'subtle' });
  };

  return useRender({
    defaultTagName: isLink ? 'a' : interactive ? 'button' : 'span',
    render,
    ref,
    props: {
      'data-slot': 'chip',
      'data-variant': variant ?? 'filled',
      'data-size': size ?? 'md',
      'data-interactive': interactive || undefined,
      'data-selected': selected || undefined,
      'data-shimmer': shimmering || undefined,
      'data-reduced-motion': reduced || undefined,
      ...state,
      ...props,
      ...(interactive && !disabled ? { onClick: handleClick } : {}),
      ...disabledProps,
      className: cn(chipClasses({ variant, size, uppercase }), className),
      children: <>
        {leadingIcon && <Icon side="inline-start">{leadingIcon}</Icon>}
        <span ref={label} data-slot="chip-label" className={cn('block', shimmering && chipShimmerClasses)}>{children}</span>
        {trailingIcon && <Icon side="inline-end">{trailingIcon}</Icon>}
      </>,
    },
  });
}

/** Chips side by side with no gap. Give it an `aria-label` when it holds a set of choices. */
export function ChipGroup({ ref, className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="chip-group" role="group" {...props} ref={ref} className={cn(chipGroupClasses, className)} />;
}

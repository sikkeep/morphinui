'use client';

import { type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { useRender } from '@base-ui/react/use-render';
import { cn } from '@/lib/utils';
import { badgeClasses, type BadgeOptions } from '@/registry/morphin/ui/badge-variants';

export { badgeVariants, badgeClasses, badgeVariantNames, badgeSizes } from '@/registry/morphin/ui/badge-variants';
export type { BadgeOptions, BadgeVariant, BadgeSize } from '@/registry/morphin/ui/badge-variants';

export interface BadgeProps extends BadgeOptions, HTMLAttributes<HTMLSpanElement> {
  /** Shows a decorative dot before the content, in the text color. */
  dot?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  /** Renders a different element, e.g. `render={<a href="/inbox" />}`. */
  render?: useRender.RenderProp;
  ref?: Ref<HTMLElement>;
}

function Icon({ side, children }: { side: 'inline-start' | 'inline-end'; children: ReactNode }) {
  return <span data-slot="badge-icon" data-icon={side} className="pointer-events-none inline-flex shrink-0 items-center justify-center" aria-hidden="true">{children}</span>;
}

/**
 * A non-interactive pill for counts, statuses and labels. The dot and icons are hidden from assistive
 * technology, so put meaningful state ("Online", "3 unread") in the text or an `aria-label`.
 */
export function Badge({
  ref, variant, size, dot, leadingIcon, trailingIcon, render, className, children, ...props
}: BadgeProps) {
  return useRender({
    defaultTagName: 'span',
    render,
    ref,
    props: {
      'data-slot': 'badge',
      'data-variant': variant ?? 'neutral',
      'data-size': size ?? 'md',
      ...props,
      className: cn(badgeClasses({ variant, size }), className),
      children: <>
        {dot && <span data-slot="badge-dot" data-icon="inline-start" aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />}
        {leadingIcon && <Icon side="inline-start">{leadingIcon}</Icon>}
        {children}
        {trailingIcon && <Icon side="inline-end">{trailingIcon}</Icon>}
      </>,
    },
  });
}

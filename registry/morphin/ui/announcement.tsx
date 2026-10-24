'use client';

import {
  useCallback, useEffect, useId, useLayoutEffect, useRef, useState,
  type HTMLAttributes, type MouseEventHandler, type ReactNode, type Ref,
} from 'react';
import type { useRender } from '@base-ui/react/use-render';
import { gsap } from 'gsap';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, ButtonLink, IconButton } from '@/registry/morphin/ui/button';
import { Card, type CardOptions } from '@/registry/morphin/ui/card';
import { useReducedMotion } from '@/registry/morphin/lib/motion';
import { soundInput, useSound } from '@/registry/morphin/lib/sound';
import {
  announcementCardSize, announcementDescriptionClasses, announcementDismissClasses, announcementIconClasses,
  announcementTitleClasses, type AnnouncementSize,
} from '@/registry/morphin/ui/announcement-variants';

export { announcementSizes } from '@/registry/morphin/ui/announcement-variants';
export type { AnnouncementSize } from '@/registry/morphin/ui/announcement-variants';

/** Enter and exit timing. The card collapses its height, so content below moves up smoothly. */
export const announcementMotion = {
  enter: { duration: 0.35, scale: 0.97, y: 8, ease: 'power2.out' },
  exit: { duration: 0.3, scale: 0.97, y: 6, ease: 'power2.inOut' },
} as const;

const collapsed = { height: 0, paddingTop: 0, paddingBottom: 0, opacity: 0 } as const;

export interface AnnouncementProps extends Omit<HTMLAttributes<HTMLElement>, 'title'>, Pick<CardOptions, 'variant'> {
  /** A decorative icon in a soft disc, hidden from assistive technology. */
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  /** Label of a full-width secondary button under the text. Use with `onAction`, `actionHref` or `actionRender`. */
  actionLabel?: ReactNode;
  onAction?: MouseEventHandler<HTMLElement>;
  /** Renders the action as a link. */
  actionHref?: string;
  /** Renders the action as a framework link, e.g. `actionRender={<Link href="/changelog" />}`. */
  actionRender?: useRender.RenderProp;
  /** Replaces the default action button. */
  action?: ReactNode;
  /** Shows a close button in the top corner. */
  dismissible?: boolean;
  /** Accessible name of the close button. Defaults to `"Dismiss"`. */
  dismissLabel?: string;
  /** Controlled visibility. Opening and closing animate. */
  open?: boolean;
  /** Defaults to `true`. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Defaults to `md`. */
  size?: AnnouncementSize;
  ref?: Ref<HTMLElement>;
}

/**
 * A compact notice built on `Card` with an optional icon, title, description, action and dismiss button.
 * With a title it is a region labelled by that title. Pass `role="status"` when it appears while the page
 * is in use so screen readers announce it.
 */
export function Announcement({
  ref, icon, title, description, actionLabel, onAction, actionHref, actionRender, action,
  dismissible, dismissLabel = 'Dismiss', open, defaultOpen = true, onOpenChange,
  size = 'md', variant, className, ...props
}: AnnouncementProps) {
  const titleId = useId();
  const reduced = useReducedMotion();
  const play = useSound();
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const isOpen = open ?? uncontrolled;
  const node = useRef<HTMLElement | null>(null);
  const setRefs = useCallback((element: HTMLElement | null) => {
    node.current = element;
    if (typeof ref === 'function') ref(element);
    else if (ref) ref.current = element;
  }, [ref]);

  // `shown` keeps the card mounted during the exit. It is adjusted during render when `open` changes.
  const [shown, setShown] = useState(isOpen);
  const [previous, setPrevious] = useState(isOpen);
  if (isOpen !== previous) {
    setPrevious(isOpen);
    if (isOpen) setShown(true);
    else if (reduced) setShown(false);
  }

  // Animate reopening only, never the first render.
  const wasOpen = useRef(isOpen);
  useLayoutEffect(() => {
    const element = node.current;
    const reopened = isOpen && wasOpen.current === false;
    wasOpen.current = isOpen;
    if (!element || !reopened || reduced) return;
    const context = gsap.context(() => {
      gsap.from(element, {
        ...collapsed, scale: announcementMotion.enter.scale, y: announcementMotion.enter.y,
        duration: announcementMotion.enter.duration, ease: announcementMotion.enter.ease, transformOrigin: 'top center',
        clearProps: 'height,paddingTop,paddingBottom,opacity,transform,transformOrigin',
      });
    }, element);
    return () => context.revert();
  }, [isOpen, reduced]);

  useEffect(() => {
    const element = node.current;
    if (isOpen || !shown || !element || reduced) return;
    const context = gsap.context(() => {
      gsap.fromTo(element, { height: element.offsetHeight }, {
        ...collapsed, scale: announcementMotion.exit.scale, y: announcementMotion.exit.y,
        duration: announcementMotion.exit.duration, ease: announcementMotion.exit.ease, transformOrigin: 'top center',
        onComplete: () => setShown(false),
      });
    }, element);
    return () => context.revert();
  }, [isOpen, shown, reduced]);

  const change = (next: boolean) => {
    if (open === undefined) setUncontrolled(next);
    onOpenChange?.(next);
  };

  if (!shown) return null;

  const hasAction = action !== undefined ? action !== null : actionLabel !== undefined;
  const isLink = actionHref !== undefined || actionRender !== undefined;
  return <Card
    data-slot="announcement"
    data-size={size}
    data-open={isOpen || undefined}
    data-reduced-motion={reduced || undefined}
    // Only a titled card is a region: an unnamed region is not a landmark.
    role={title ? 'region' : undefined}
    aria-labelledby={title ? titleId : undefined}
    {...props}
    ref={setRefs}
    variant={variant}
    size={announcementCardSize[size]}
    className={cn('gap-3', className)}
  >
    {icon && <span data-slot="announcement-icon" aria-hidden="true" className={announcementIconClasses}>{icon}</span>}
    {(title || description) && <div data-slot="announcement-text" className={cn('flex min-w-0 flex-col gap-0.5', dismissible && !icon && 'pe-7')}>
      {title && <p id={titleId} data-slot="announcement-title" className={announcementTitleClasses}>{title}</p>}
      {description && <p data-slot="announcement-description" className={announcementDescriptionClasses}>{description}</p>}
    </div>}
    {hasAction && (action !== undefined ? action : (isLink
      ? <ButtonLink data-slot="announcement-action" variant="secondary" size="sm" fullWidth href={actionHref} render={actionRender} onClick={onAction}>{actionLabel}</ButtonLink>
      : <Button data-slot="announcement-action" variant="secondary" size="sm" fullWidth onClick={onAction}>{actionLabel}</Button>))}
    {dismissible && <IconButton
      data-slot="announcement-dismiss"
      label={dismissLabel}
      variant="ghost"
      size="xs"
      className={announcementDismissClasses}
      onClick={(event) => {
        change(false);
        play('close', { input: soundInput(event), emphasis: 'subtle' });
      }}
    ><X /></IconButton>}
  </Card>;
}

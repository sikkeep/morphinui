'use client';

import { Children, createContext, isValidElement, use, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { Avatar as BaseAvatar } from '@base-ui/react/avatar';
import { HugeiconsIcon } from '@hugeicons/react';
import { UserIcon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/registry/morphin/lib/motion';
import {
  avatarClasses, avatarGroupClasses, avatarSizeClasses, avatarGroupHoverClasses, avatarStatusClasses, avatarSurfaceClasses,
  type AvatarOptions, type AvatarShape, type AvatarSize, type AvatarStatus,
} from '@/registry/morphin/ui/avatar-variants';

export { avatarVariants, avatarClasses, avatarSizeClasses, avatarSizes, avatarShapes, avatarStatuses } from '@/registry/morphin/ui/avatar-variants';
export type { AvatarOptions, AvatarSize, AvatarShape, AvatarStatus } from '@/registry/morphin/ui/avatar-variants';

const AvatarGroupContext = createContext<{ size?: AvatarSize; shape?: AvatarShape }>({});

/** Returns the first letters of the first and last words: "Elena Voss" becomes "EV". */
export function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const letter = (word: string) => Array.from(word)[0] ?? '';
  return (letter(words[0]) + (words.length > 1 ? letter(words[words.length - 1]) : '')).toUpperCase();
}

export interface AvatarProps extends AvatarOptions, Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Image URL. The fallback shows while it loads or if it fails. */
  src?: string;
  /** Accessible name. Defaults to `name`. */
  alt?: string;
  /** Used for the initials and, without `alt`, the accessible name. */
  name?: string;
  /** Replaces the initials. Without `name` or `fallback` a person icon shows. */
  fallback?: ReactNode;
  /** Shows a status dot and appends the status to the accessible name. */
  status?: AvatarStatus;
  /** Overrides the status word in the accessible name, e.g. for translation. */
  statusLabel?: string;
  /** Delay in milliseconds before the fallback shows, so a fast image does not flash it. */
  fallbackDelay?: number;
  /** Props for the `<img>`, such as `loading` or `referrerPolicy`. */
  imageProps?: Omit<BaseAvatar.Image.Props, 'src' | 'alt' | 'className'>;
  ref?: Ref<HTMLSpanElement>;
}

/**
 * An image with an initials or icon fallback. With `alt` or `name` it is announced as one image;
 * without either it is decorative and hidden from assistive technology.
 */
export function Avatar({
  ref, src, alt, name, fallback, size, shape, status, statusLabel, fallbackDelay, imageProps, className, ...props
}: AvatarProps) {
  const group = use(AvatarGroupContext);
  const reduced = useReducedMotion();
  const resolvedSize = size ?? group.size ?? 'md';
  const resolvedShape = shape ?? group.shape ?? 'circle';
  const label = alt ?? name;
  const named = label !== undefined && label !== '';
  const initials = name ? getInitials(name) : '';
  return <span
    data-slot="avatar"
    data-size={resolvedSize}
    data-shape={resolvedShape}
    data-status={status}
    data-reduced-motion={reduced || undefined}
    {...(named
      ? { role: 'img', 'aria-label': status ? `${label}, ${statusLabel ?? status}` : label }
      : { 'aria-hidden': true })}
    {...props}
    ref={ref}
    className={cn(avatarClasses({ size: resolvedSize, shape: resolvedShape }), className)}
  >
    <BaseAvatar.Root data-slot="avatar-surface" className={avatarSurfaceClasses}>
      {src && <BaseAvatar.Image
        data-slot="avatar-image"
        alt=""
        {...imageProps}
        src={src}
        className={cn('size-full object-cover', !reduced && 'transition-opacity duration-200 data-starting-style:opacity-0')}
      />}
      <BaseAvatar.Fallback data-slot="avatar-fallback" delay={fallbackDelay} className="flex size-full items-center justify-center">
        {fallback ?? (initials || <HugeiconsIcon icon={UserIcon} className="size-[55%]" aria-hidden="true" />)}
      </BaseAvatar.Fallback>
    </BaseAvatar.Root>
    {status && <span data-slot="avatar-status" data-status={status} aria-hidden="true" className={avatarStatusClasses(status, resolvedShape)} />}
  </span>;
}

export interface AvatarGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Size for items that do not set their own. Defaults to `md`. */
  size?: AvatarSize;
  /** Shape for items that do not set their own. Defaults to `circle`. */
  shape?: AvatarShape;
  /** Maximum number of avatars to show before a "+N" count. Shows all by default. */
  max?: number;
  /** Accessible name of the "+N" count. Defaults to "and N more". */
  countLabel?: (hidden: number) => string;
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/**
 * A row of overlapping avatars with an optional "+N" count. Give it an `aria-label`. On a card, set
 * `[--avatar-ring:var(--card)]` so the rings match the surface.
 */
export function AvatarGroup({
  ref, size = 'md', shape = 'circle', max, countLabel = hidden => `and ${hidden} more`, className, children, ...props
}: AvatarGroupProps) {
  const reduced = useReducedMotion();
  const items = Children.toArray(children).filter(isValidElement);
  const limit = max === undefined ? items.length : Math.max(0, Math.floor(max));
  const hidden = Math.max(0, items.length - limit);
  return <AvatarGroupContext value={{ size, shape }}>
    <div
      role="group"
      data-slot="avatar-group"
      data-size={size}
      data-reduced-motion={reduced || undefined}
      {...props}
      ref={ref}
      className={cn(avatarSizeClasses[size], avatarGroupClasses, !reduced && avatarGroupHoverClasses, className)}
    >
      {items.slice(0, limit)}
      {hidden > 0 && <span
        data-slot="avatar-group-count"
        role="img"
        aria-label={countLabel(hidden)}
        className={cn(avatarClasses({ size, shape }), 'bg-secondary tabular-nums')}
      >
        <span aria-hidden="true" className="flex size-full items-center justify-center">+{hidden}</span>
      </span>}
    </div>
  </AvatarGroupContext>;
}

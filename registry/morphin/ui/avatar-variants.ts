import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/** Sets `--avatar-size`, the status dot's `--avatar-dot` and the initials' text size. */
export const avatarSizeClasses = {
  xs: '[--avatar-size:24px] [--avatar-dot:7px] text-2xs',
  sm: '[--avatar-size:32px] [--avatar-dot:9px] text-xs',
  md: '[--avatar-size:40px] [--avatar-dot:11px] text-sm',
  lg: '[--avatar-size:48px] [--avatar-dot:13px] text-base',
  xl: '[--avatar-size:64px] [--avatar-dot:16px] text-xl',
  '2xl': '[--avatar-size:96px] [--avatar-dot:22px] text-3xl',
} as const;

/** The avatar shell. `circle` uses the `--corner-shape` superellipse, so it renders as a soft squircle. */
export const avatarVariants = cva(
  [
    'relative inline-flex shrink-0 items-center justify-center box-border align-middle select-none',
    'size-(--avatar-size) [corner-shape:var(--corner-shape)]',
    'font-medium leading-none uppercase text-foreground',
  ].join(' '),
  {
    variants: {
      size: avatarSizeClasses,
      shape: {
        circle: 'rounded-[999px]',
        square: 'rounded-[28%]',
      },
    },
    defaultVariants: { size: 'md', shape: 'circle' },
  },
);

type RecipeVariants = VariantProps<typeof avatarVariants>;
export type AvatarOptions = { [Key in keyof RecipeVariants]: Exclude<RecipeVariants[Key], null> };
export type AvatarSize = NonNullable<AvatarOptions['size']>;
export type AvatarShape = NonNullable<AvatarOptions['shape']>;
export const avatarSizes = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const satisfies readonly AvatarSize[];
export const avatarShapes = ['circle', 'square'] as const satisfies readonly AvatarShape[];

export const avatarStatuses = ['online', 'busy', 'away', 'offline'] as const;
export type AvatarStatus = (typeof avatarStatuses)[number];

const statusColors: Record<AvatarStatus, string> = {
  online: 'bg-success',
  busy: 'bg-destructive',
  away: 'bg-warning',
  offline: 'bg-muted-foreground',
};
/**
 * The status dot on the avatar's lower corner. Its ring color is `--avatar-ring` (the page background by
 * default); set `[--avatar-ring:var(--card)]` on a card.
 */
export function avatarStatusClasses(status: AvatarStatus, shape: AvatarShape = 'circle') {
  return cn(
    'absolute box-content size-(--avatar-dot) rounded-full ring-2 ring-[color:var(--avatar-ring,var(--background))]',
    shape === 'circle' ? 'right-[3%] bottom-[3%]' : '-right-0.5 -bottom-0.5',
    statusColors[status],
  );
}

/** The surface behind an image or initials. */
export const avatarSurfaceClasses = 'relative flex size-full items-center justify-center overflow-clip rounded-[inherit] [corner-shape:inherit] bg-secondary';

/** Overlaps items by 28% of `--avatar-size` and rings each one with `--avatar-ring`. */
export const avatarGroupClasses = [
  'isolate inline-flex items-center align-middle',
  '[&>*]:ring-2 [&>*]:ring-[color:var(--avatar-ring,var(--background))]',
  '[&>*:not(:first-child)]:-ms-[calc(var(--avatar-size)*0.28)]',
].join(' ');

/** Lifts the hovered item above its neighbors. */
export const avatarGroupHoverClasses = '[&>*]:transition-transform [&>*]:duration-150 [&>*]:ease-out [&>*:hover]:relative [&>*:hover]:z-10 [&>*:hover]:-translate-y-0.5';

/** The avatar recipe with Tailwind conflict resolution, for custom elements. */
export function avatarClasses(options: Parameters<typeof avatarVariants>[0] = {}) {
  return cn(avatarVariants(options));
}

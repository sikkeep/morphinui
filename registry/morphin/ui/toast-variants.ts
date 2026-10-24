import { cva } from 'class-variance-authority';

export const toastStates = ['default', 'loading', 'success', 'error'] as const;
export type ToastState = (typeof toastStates)[number];

export const toastPositions = ['bottom-right', 'bottom-left', 'bottom-center'] as const;
export type ToastPosition = (typeof toastPositions)[number];

/** The fixed box the stacked toasts are positioned in. It has no height, so it never blocks the page. */
export const toastViewportVariants = cva('fixed z-100 bottom-4 w-[min(360px,calc(100vw-2rem))] outline-none', {
  variants: {
    position: {
      'bottom-right': 'right-4',
      'bottom-left': 'left-4',
      'bottom-center': 'left-1/2 -translate-x-1/2',
    },
  },
  defaultVariants: { position: 'bottom-right' },
});

/**
 * One toast in the stack. Base UI supplies the geometry as CSS variables (`--toast-index`,
 * `--toast-offset-y`, `--toast-height`, `--toast-swipe-movement-*`): collapsed toasts peek out behind
 * the newest one, and hovering or focusing the stack (`data-expanded`) spreads them apart.
 */
export const toastRootVariants = cva([
  'group/toast absolute inset-x-0 bottom-0 box-border select-none origin-bottom touch-pan-y',
  '[--gap:0.75rem] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.06)))] [--shrink:calc(1-var(--scale))]',
  '[--height:var(--toast-frontmost-height,var(--toast-height))] h-(--height) z-[calc(100-var(--toast-index))]',
  '[--offset-y:calc(var(--toast-offset-y)*-1+var(--toast-index)*var(--gap)*-1+var(--toast-swipe-movement-y))]',
  'translate-x-(--toast-swipe-movement-x) translate-y-[calc(var(--toast-swipe-movement-y)-var(--toast-index)*var(--peek)-var(--shrink)*var(--height))] scale-(--scale)',
  // A bridge across the gap keeps the stack hovered while the pointer moves between toasts.
  'after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-[""]',
  'data-expanded:h-(--toast-height) data-expanded:scale-100 data-expanded:translate-x-(--toast-swipe-movement-x) data-expanded:translate-y-(--offset-y)',
  // GSAP animates the enter and exit inside the root. On ending the root only turns invisible, which
  // keeps it mounted until its transition ends; a swiped toast also slides off screen.
  'data-limited:opacity-0',
  'data-ending-style:invisible data-ending-style:data-[swipe-direction=left]:translate-x-[calc(var(--toast-swipe-movement-x)-150%)] data-ending-style:data-[swipe-direction=right]:translate-x-[calc(var(--toast-swipe-movement-x)+150%)] data-ending-style:data-[swipe-direction=left]:translate-y-(--offset-y) data-ending-style:data-[swipe-direction=right]:translate-y-(--offset-y)',
], {
  variants: {
    reduceMotion: {
      // Tailwind v4 moves the stack with `translate` and `scale`, not `transform`. The ending duration must outlast GSAP's 250 ms exit: Base UI unmounts when it ends.
      false: 'transition-[translate,scale,opacity,height,visibility] duration-350 ease-[cubic-bezier(0.22,1,0.36,1)] data-ending-style:duration-300 data-swiping:transition-none motion-reduce:transition-none',
      true: 'transition-none',
    },
  },
  defaultVariants: { reduceMotion: false },
});

/** The layer GSAP moves: it rises in, dims with depth, shakes on failure and drops out. */
export const toastMotionVariants = cva('size-full origin-bottom will-change-[transform,opacity,filter]');

/** The border beam wrapper. It clips its overflow, so it carries the shadow ring and the radius. */
export const toastBeamVariants = cva('size-full rounded-[18px] [corner-shape:var(--corner-shape)] shadow-popover');

/** The surface. It stays visible behind the newest toast, so older toasts peek out, and clips decorative layers. */
export const toastCardVariants = cva(
  'relative isolate size-full overflow-hidden rounded-[18px] [corner-shape:var(--corner-shape)] bg-popover text-popover-foreground',
);

/**
 * Hidden while the toast is behind the newest one. It keeps its natural height so Base UI's resize
 * observer can resize the toast as its text changes.
 */
export const toastContentVariants = cva([
  'relative flex w-full items-start gap-3.5 p-4',
  'transition-opacity duration-250 data-behind:pointer-events-none data-behind:opacity-0 data-expanded:opacity-100 motion-reduce:transition-none in-data-reduced-motion:transition-none',
]);

export const toastIconVariants = cva(
  'relative flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*=size-])]:size-5',
);

/** The small status circle on the icon: a spinner while loading, then a check or a cross. */
export const toastBadgeVariants = cva([
  'absolute -right-0.5 -bottom-0.5 z-10 flex size-4 items-center justify-center rounded-full ring-2 ring-popover',
  'transition-colors duration-200 motion-reduce:transition-none in-data-reduced-motion:transition-none',
  '[&_svg]:pointer-events-none',
], {
  variants: {
    state: {
      default: 'hidden',
      loading: 'bg-popover-foreground text-popover',
      success: 'bg-success-soft text-success-foreground',
      error: 'bg-destructive-soft text-destructive-foreground',
    },
  },
  defaultVariants: { state: 'default' },
});

/** The spinner and glyph layers of the badge; the one that does not match the state is hidden. */
export const toastBadgeLayerVariants = cva('absolute inset-0 flex items-center justify-center transition-opacity duration-150 motion-reduce:transition-none in-data-reduced-motion:transition-none', {
  variants: {
    visible: { true: '', false: 'opacity-0' },
  },
  defaultVariants: { visible: true },
});

/** The title. While loading, a highlight sweeps across it (see useShimmer). */
export const toastTitleVariants = cva('relative m-0 text-sm font-medium text-popover-foreground', {
  variants: {
    shimmer: {
      true: 'bg-[linear-gradient(90deg,var(--muted-foreground)_0%,var(--muted-foreground)_40%,var(--popover-foreground)_50%,var(--muted-foreground)_60%,var(--muted-foreground)_100%)] bg-size-[400%_100%] bg-no-repeat bg-clip-text text-transparent',
      false: '',
    },
  },
  defaultVariants: { shimmer: false },
});

export const toastCloseVariants = cva([
  'absolute top-3 right-3 z-30 flex size-4 cursor-pointer items-center justify-center rounded-full border-0 bg-accent p-0 text-muted-foreground',
  'opacity-0 transition-[opacity,color,background-color] duration-150 outline-none motion-reduce:transition-none in-data-reduced-motion:transition-none',
  'group-hover/toast:opacity-100 group-focus-within/toast:opacity-100 hover:bg-border hover:text-popover-foreground',
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring [@media(hover:none)]:opacity-100',
  '[&_svg]:pointer-events-none',
]);

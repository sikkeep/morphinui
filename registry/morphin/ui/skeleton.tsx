'use client';

import { type Ref } from 'react';
import { AsciiReveal, AsciiSkeleton, type AsciiRevealHandle, type AsciiRevealProps, type AsciiSkeletonProps } from 'ascii-reveal';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/registry/morphin/lib/motion';

/** Handle of a `SkeletonReveal` ref: `reveal()`, `hide()` and the wrapper `element`. */
export type SkeletonRevealHandle = AsciiRevealHandle;

// The glyphs and the decode come from the ascii-reveal package (MIT). Colors come from the theme tokens.
const themeClasses = '[--ascii-skeleton:var(--muted-foreground)] [--ascii-accent:var(--foreground)]';

export type SkeletonProps = Omit<AsciiSkeletonProps, 'as'> & {
  /** Element to render as. Default `span`. */
  as?: AsciiSkeletonProps['as'];
};

/**
 * An ASCII placeholder for content that is still loading: faint glyph rows with a band of denser glyphs
 * sweeping across. The glyphs are plain markup and CSS, so they paint on the first frame, render on the
 * server and reserve the space the content will take; the sweep is drawn on a small canvas after mount.
 * `animate={false}` keeps it still (cheaper for long lists). Hidden from assistive technology: announce the
 * loading state yourself (`aria-busy` on the region, or a `role="status"` label).
 */
export function Skeleton({ animate = true, className, ...props }: SkeletonProps) {
  const reduced = useReducedMotion();
  return <AsciiSkeleton
    data-slot="skeleton"
    data-reduced-motion={reduced || undefined}
    {...props}
    // The library checks the system setting itself; this also honors a MotionProvider.
    animate={animate && !reduced}
    className={cn(themeClasses, className)}
  />;
}

export interface SkeletonRevealProps extends Omit<AsciiRevealProps, 'revealOnMount'> {
  /**
   * Decode the content into place when the component first mounts with it. Default false: the reveal
   * follows `loading` going from true to false, which is what a skeleton hands over to.
   */
  revealOnMount?: boolean;
  ref?: Ref<SkeletonRevealHandle>;
}

/**
 * The hand-over from a skeleton to the real content. While `loading` is true it leaves the skeleton alone;
 * when it turns false the content that replaced it decodes into place through a glyph grid, in about
 * 400 ms. Content keeps its place in the DOM and screen readers read the real text the whole time.
 *
 * ```tsx
 * <SkeletonReveal loading={!data}>
 *   {data ? <Profile data={data} /> : <Skeleton lines={3} />}
 * </SkeletonReveal>
 * ```
 *
 * Under reduced motion (the system, or a `MotionProvider`) the content simply appears.
 */
export function SkeletonReveal({
  ref, loading, revealOnMount = false, className, ...props
}: SkeletonRevealProps) {
  const reduced = useReducedMotion();
  return <AsciiReveal
    data-slot="skeleton-reveal"
    data-reduced-motion={reduced || undefined}
    {...props}
    ref={ref}
    // Without a loading state the effect never hides anything, so content swaps in at once.
    loading={reduced ? undefined : loading}
    revealOnMount={reduced ? false : revealOnMount}
    className={cn(themeClasses, className)}
  />;
}

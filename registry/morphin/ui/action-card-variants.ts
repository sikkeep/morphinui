import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * A 116 × 128 px card with a preview tile and a one-line label. Resize it with `--action-card-width`
 * and `--action-card-height`. `data-morphing` hides it while an `ActionCardMenu` is open in its place.
 */
export const actionCardVariants = cva([
  '[--action-card-width:116px] [--action-card-height:128px]',
  'group/action-card relative flex shrink-0 cursor-pointer flex-col items-center gap-1 overflow-hidden box-border',
  'h-(--action-card-height) w-(--action-card-width) p-1 text-start no-underline select-none touch-manipulation [-webkit-tap-highlight-color:transparent]',
  'rounded-[16px] [corner-shape:var(--corner-shape)] border-0 bg-card',
  // Hover answers at once (150 ms) and lets go softly, with the ring that marks the active card (250 ms, smooth-out).
  'transition-[background-color,box-shadow] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none data-reduced-motion:transition-none',
  '[&:not([data-disabled])]:hover:duration-150',
  'outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  '[&:not([data-disabled])]:hover:bg-accent data-active:ring-1 data-active:ring-inset data-active:ring-border',
  'data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:opacity-50 data-morphing:invisible',
].join(' '));

/** The preview tile. Images and videos fill it. */
export const actionCardPreviewClasses = [
  'pointer-events-none flex h-25 w-full shrink-0 items-center justify-center overflow-hidden select-none',
  'rounded-[12px] [corner-shape:var(--corner-shape)] bg-background text-muted-foreground',
  '[&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-5',
  '[&>img]:size-full [&>img]:object-cover [&>video]:size-full [&>video]:object-cover',
].join(' ');

export const actionCardLabelClasses = [
  'flex h-4 w-full shrink-0 items-center justify-center px-1',
  'text-xs font-medium leading-4 text-muted-foreground transition-colors duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
  'group-data-active/action-card:text-foreground group-hover/action-card:text-foreground group-hover/action-card:duration-150',
].join(' ');

/** The card recipe merged with `className`, for custom elements. */
export function actionCardClasses(className?: string) {
  return cn(actionCardVariants(), className);
}

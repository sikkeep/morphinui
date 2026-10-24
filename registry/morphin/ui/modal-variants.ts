import { cva } from 'class-variance-authority';

export const modalSizes = ['xs', 'sm', 'md', 'lg', 'cover', 'full'] as const;
export type ModalSize = (typeof modalSizes)[number];
export const modalPlacements = ['center', 'top', 'bottom'] as const;
export type ModalPlacement = (typeof modalPlacements)[number];
export const modalBackdrops = ['opaque', 'blur', 'transparent'] as const;
export type ModalBackdrop = (typeof modalBackdrops)[number];
export const modalScrolls = ['inside', 'outside'] as const;
export type ModalScroll = (typeof modalScrolls)[number];

/**
 * The popup scales up from 0.96 over 250 ms and leaves in 150 ms. Base UI keeps it mounted until
 * these transitions end, so keep the ending duration.
 */
const popupMotion = {
  false: 'transition-[opacity,scale] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] data-starting-style:scale-96 data-starting-style:opacity-0 data-ending-style:scale-96 data-ending-style:opacity-0 data-ending-style:duration-150 data-instant:transition-none motion-reduce:transition-none',
  true: 'transition-none',
};

const backdropMotion = {
  false: 'transition-opacity duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-150 data-instant:transition-none motion-reduce:transition-none',
  true: 'transition-none',
};

export const modalBackdropVariants = cva('fixed inset-0 z-50', {
  variants: {
    backdrop: {
      opaque: 'bg-black/40',
      blur: 'bg-black/20 backdrop-blur-sm',
      transparent: 'bg-transparent',
    },
    reduceMotion: backdropMotion,
  },
  defaultVariants: { backdrop: 'opaque', reduceMotion: false },
});

/**
 * The scrolling layer around the popup. The popup centers itself with auto margins, which keep it
 * reachable when it is taller than the screen (flex centering would clip its top).
 */
export const modalViewportVariants = cva('fixed inset-0 z-50 flex justify-center overflow-y-auto overscroll-contain outline-none', {
  variants: {
    size: {
      xs: 'p-4', sm: 'p-4', md: 'p-4', lg: 'p-4', cover: 'p-4',
      full: 'p-0',
    },
  },
  defaultVariants: { size: 'md' },
});

export const modalPopupVariants = cva([
  'relative box-border flex w-full min-w-0 flex-col gap-4 bg-popover p-6 text-popover-foreground shadow-popover outline-none',
  'text-sm leading-6',
], {
  variants: {
    size: {
      xs: 'max-w-xs rounded-[24px] [corner-shape:var(--corner-shape)]',
      sm: 'max-w-sm rounded-[24px] [corner-shape:var(--corner-shape)]',
      md: 'max-w-md rounded-[24px] [corner-shape:var(--corner-shape)]',
      lg: 'max-w-lg rounded-[24px] [corner-shape:var(--corner-shape)]',
      cover: 'h-full max-w-none rounded-[24px] [corner-shape:var(--corner-shape)]',
      full: 'h-full max-w-none rounded-none',
    },
    placement: {
      center: 'my-auto',
      top: 'mb-auto sm:mt-[8vh]',
      bottom: 'mt-auto mb-0',
    },
    scroll: {
      inside: 'max-h-full',
      outside: '',
    },
    reduceMotion: popupMotion,
  },
  defaultVariants: { size: 'md', placement: 'center', scroll: 'inside', reduceMotion: false },
});

export const modalHeaderClasses = 'flex flex-col gap-1.5 pe-8';
export const modalTitleClasses = 'text-lg leading-6 font-medium tracking-tight text-popover-foreground';
export const modalDescriptionClasses = 'text-sm leading-5 text-muted-foreground';
/**
 * With `scroll="inside"` only the body scrolls. Its 8 px padding, offset by a negative margin, keeps
 * the scroll container from clipping focus rings.
 */
export const modalBodyClasses = 'min-h-0 flex-1 text-sm leading-6 text-popover-foreground in-data-[scroll=inside]:-m-2 in-data-[scroll=inside]:overflow-y-auto in-data-[scroll=inside]:overscroll-contain in-data-[scroll=inside]:p-2';
export const modalFooterClasses = 'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end';
export const modalIconClasses = 'flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground [&_svg]:pointer-events-none [&_svg:not([class*=size-])]:size-5';
export const modalCloseButtonClasses = 'absolute end-3 top-3';

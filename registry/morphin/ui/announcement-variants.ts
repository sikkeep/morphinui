import { cn } from '@/lib/utils';

export const announcementSizes = ['sm', 'md'] as const;
export type AnnouncementSize = (typeof announcementSizes)[number];

/** Maps each announcement size to a `Card` size: `sm` uses 12 px padding, `md` 16 px. */
export const announcementCardSize = { sm: 'xs', md: 'sm' } as const satisfies Record<AnnouncementSize, 'xs' | 'sm'>;

/** The leading icon in a soft disc. */
export const announcementIconClasses = cn(
  'flex size-8 shrink-0 items-center justify-center rounded-[999px] [corner-shape:var(--corner-shape)]',
  'bg-secondary text-foreground [&_svg]:pointer-events-none [&_svg:not([class*=size-])]:size-4',
);

export const announcementTitleClasses = 'text-sm font-medium leading-snug tracking-tight text-foreground';
export const announcementDescriptionClasses = 'text-xs leading-relaxed text-muted-foreground';

/** Pins the dismiss button to the top corner, inside the padding so the card's clip does not cut its focus ring. */
export const announcementDismissClasses = 'absolute end-2 top-2';

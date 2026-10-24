import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/** Link button class recipe. Use `linkButtonClasses` to merge your own utilities into it. */
export const linkButtonVariants = cva([
  'inline-flex shrink-0 items-center font-medium align-baseline whitespace-nowrap cursor-pointer select-none',
  'decoration-1 underline-offset-4 outline-none rounded-[4px] [corner-shape:var(--corner-shape)]',
  'transition-colors duration-150 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  'data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:opacity-50',
  '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-(--link-icon)',
], {
  variants: {
    variant: {
      primary: 'text-foreground hover:text-foreground',
      secondary: 'text-muted-foreground hover:text-foreground',
    },
    size: {
      md: 'text-sm gap-1.5 [--link-icon:16px]',
      sm: 'text-xs gap-1 [--link-icon:14px]',
      xs: 'text-2xs gap-1 [--link-icon:12px]',
    },
    underline: {
      hover: 'no-underline hover:underline',
      always: 'underline',
      none: 'no-underline',
    },
  },
  defaultVariants: { variant: 'primary', size: 'md', underline: 'hover' },
});

type RecipeVariants = VariantProps<typeof linkButtonVariants>;
export type LinkButtonOptions = { [Key in keyof RecipeVariants]: Exclude<RecipeVariants[Key], null> };

/** Same recipe with Tailwind conflict resolution, for custom elements. */
export function linkButtonClasses(options: Parameters<typeof linkButtonVariants>[0] = {}) {
  return cn(linkButtonVariants(options));
}

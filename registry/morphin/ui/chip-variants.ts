import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Chip class recipe. Hover, press and focus styles apply only with `data-interactive`, which `Chip`
 * sets when it renders a button or a link.
 */
export const chipVariants = cva(
  [
    "group/chip inline-flex shrink-0 w-fit items-center justify-center box-border align-middle",
    "h-(--chip-height) px-[calc(var(--chip-padding)-1px)] gap-(--chip-gap)",
    "rounded-[999px] [corner-shape:var(--corner-shape)] border border-solid border-transparent bg-clip-padding",
    "font-[560] leading-none whitespace-nowrap no-underline",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-(--chip-icon)",
    "data-interactive:cursor-pointer data-interactive:select-none data-interactive:touch-manipulation data-interactive:[-webkit-tap-highlight-color:transparent]",
    "data-interactive:transition-[background-color,border-color,color,scale] data-interactive:duration-150 data-interactive:ease-[cubic-bezier(0.2,0,0,1)]",
    "data-interactive:outline-none data-interactive:focus-visible:outline-solid data-interactive:focus-visible:outline-2 data-interactive:focus-visible:outline-offset-2 data-interactive:focus-visible:outline-ring",
    "data-interactive:not-data-disabled:active:scale-[0.97]",
    "motion-reduce:transition-none data-reduced-motion:transition-none data-reduced-motion:active:scale-100",
    "data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:opacity-50",
    // A selected chip is the inverse of its resting look, whatever its variant.
    "data-selected:border-transparent data-selected:bg-primary data-selected:text-primary-foreground",
    "data-selected:data-interactive:not-data-disabled:hover:bg-primary-hover",
  ].join(" "),
  {
    variants: {
      // Complete utility strings keep every variant discoverable by Tailwind's scanner.
      variant: {
        filled:
          "bg-accent text-muted-foreground data-interactive:not-data-disabled:not-data-selected:hover:bg-[color-mix(in_oklch,var(--accent),var(--foreground)_8%)] data-interactive:not-data-disabled:not-data-selected:active:bg-[color-mix(in_oklch,var(--accent),var(--foreground)_14%)]",
        outline:
          "border-foreground/15 bg-transparent text-muted-foreground data-interactive:not-data-disabled:not-data-selected:hover:bg-foreground/10",
      },
      size: {
        sm: "[--chip-height:22px] [--chip-padding:10px] [--chip-gap:4px] [--chip-icon:12px] text-2xs",
        md: "[--chip-height:26px] [--chip-padding:12px] [--chip-gap:5px] [--chip-icon:14px] text-xs",
        lg: "[--chip-height:32px] [--chip-padding:14px] [--chip-gap:6px] [--chip-icon:16px] text-sm",
      },
      uppercase: { true: "uppercase", false: "" },
    },
    defaultVariants: { variant: "filled", size: "md", uppercase: false },
  },
);

/**
 * Label classes while it shimmers: a lighter band over the label's own color. GSAP sweeps
 * `backgroundPosition` from 100% to 0%; apply these only while that runs.
 */
export const chipShimmerClasses = [
  "[--chip-glint:color-mix(in_oklab,currentColor_35%,white)] [--chip-spread:12px]",
  "bg-[linear-gradient(90deg,transparent_calc(50%-var(--chip-spread)),var(--chip-glint),transparent_calc(50%+var(--chip-spread))),linear-gradient(currentColor,currentColor)]",
  // The text fill, not `color`, goes transparent: the gradient's `currentColor` is the label's own color.
  "bg-size-[250%_100%,auto] bg-no-repeat bg-clip-text [-webkit-text-fill-color:transparent]",
].join(" ");

/** Chips side by side with no gap. */
export const chipGroupClasses = "inline-flex items-center align-middle";

type RecipeVariants = VariantProps<typeof chipVariants>;
export type ChipOptions = {
  [Key in keyof RecipeVariants]: Exclude<RecipeVariants[Key], null>;
};
export type ChipVariant = NonNullable<ChipOptions["variant"]>;
export type ChipSize = NonNullable<ChipOptions["size"]>;
export const chipVariantNames = [
  "filled",
  "outline",
] as const satisfies readonly ChipVariant[];
export const chipSizes = [
  "sm",
  "md",
  "lg",
] as const satisfies readonly ChipSize[];

/** Same recipe with Tailwind conflict resolution, for custom elements. */
export function chipClasses(options: Parameters<typeof chipVariants>[0] = {}) {
  return cn(chipVariants(options));
}

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Label weight 560 (static Inter rounds it to 600). Colors fade over 300 ms; the 0.97 press runs on 150 ms.
const baseClasses = [
  "morphin-button group/button relative inline-flex shrink-0 items-center justify-center box-border bg-clip-padding",
  "h-(--button-height) gap-2 px-(--button-padding) py-0",
  "rounded-[999px] [corner-shape:var(--corner-shape)] border border-solid border-transparent",
  "font-[560] leading-none text-center no-underline whitespace-nowrap align-middle",
  "cursor-pointer touch-manipulation select-none [-webkit-tap-highlight-color:transparent]",
  "transition-[background-color,border-color,color,scale] duration-[300ms,300ms,300ms,150ms] ease-out motion-reduce:transition-none data-reduced-motion:transition-none",
  "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring",
  "aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-(--button-icon)",
  "[&:not([data-disabled]):not([aria-disabled=true])]:hover:bg-(--button-hover)",
  "[&:not([data-disabled]):not([aria-disabled=true])]:active:bg-(--button-active)",
  "[&[aria-expanded=true]:not([data-disabled]):not([aria-disabled=true])]:bg-(--button-hover)",
  "[&[data-disabled]:not([data-loading])]:bg-disabled",
  "[&[data-disabled]:not([data-loading])]:text-disabled-foreground",
  "[&[data-disabled]:not([data-loading])]:border-transparent",
  "[&[data-disabled]:not([data-loading])]:cursor-not-allowed data-loading:cursor-progress",
].join(" ");

// Complete utility strings keep every variant discoverable by Tailwind's scanner.
const variantClasses = {
  primary:
    "bg-primary text-primary-foreground [--button-hover:var(--primary-hover)] [--button-active:var(--primary-active)]",
  secondary:
    "bg-secondary text-secondary-foreground [--button-hover:var(--secondary-hover)] [--button-active:var(--secondary-active)]",
  outline:
    "bg-transparent text-foreground border-border [--button-hover:var(--accent)] [--button-active:var(--secondary-active)] [&[data-disabled]:not([data-loading])]:bg-transparent [&[data-disabled]:not([data-loading])]:border-border",
  ghost:
    "bg-transparent text-foreground [--button-hover:var(--accent)] [--button-active:var(--secondary-active)] [&[data-disabled]:not([data-loading])]:bg-transparent",
  accent:
    "bg-brand text-brand-foreground [--button-hover:var(--brand-hover)] [--button-active:var(--brand-active)]",
  destructive:
    "bg-destructive text-destructive-foreground [--button-hover:var(--destructive-hover)] [--button-active:var(--destructive-active)]",
};

const sizeClasses = {
  xs: "[--button-height:28px] [--button-padding:11px] [--button-icon:13px] text-2xs gap-[5px]",
  sm: "[--button-height:32px] [--button-padding:12px] [--button-icon:14px] text-xs gap-1.5",
  md: "[--button-height:36px] [--button-padding:13px] [--button-icon:16px] text-sm",
  lg: "[--button-height:48px] [--button-padding:24px] [--button-icon:18px] text-base gap-2.5",
};

/** Button class recipe. Use `buttonClasses` to merge your own utilities into it. */
export const buttonVariants = cva(baseClasses, {
  variants: {
    variant: variantClasses,
    size: sizeClasses,
    iconOnly: {
      true: "morphin-button--icon w-(--button-height) p-0 gap-0",
      false:
        "has-[[data-icon=inline-start]]:ps-[calc(var(--button-padding)-3px)] has-[[data-icon=inline-end]]:pe-[calc(var(--button-padding)-3px)]",
    },
    fullWidth: { true: "w-full" },
    /** Disable press scaling without disabling content transitions. */
    static: { true: null, false: null },
    /** Disable content, press and loading motion for this instance. */
    reduceMotion: { true: "transition-none", false: null },
  },
  compoundVariants: [
    {
      static: false,
      reduceMotion: false,
      class:
        "[&:not([data-disabled]):not([aria-disabled=true])]:active:scale-[0.97] motion-reduce:[&:not([data-disabled]):not([aria-disabled=true])]:active:scale-100",
    },
  ],
  defaultVariants: {
    variant: "primary",
    size: "md",
    iconOnly: false,
    fullWidth: false,
    static: false,
    reduceMotion: false,
  },
});

type RecipeVariants = VariantProps<typeof buttonVariants>;
export type ButtonOptions = {
  [Key in keyof RecipeVariants]: Exclude<RecipeVariants[Key], null>;
};
export type ButtonVariant = NonNullable<ButtonOptions["variant"]>;
export type ButtonSize = NonNullable<ButtonOptions["size"]>;
export const buttonVariantNames = Object.keys(
  variantClasses,
) as ButtonVariant[];
export const buttonSizes = Object.keys(sizeClasses) as ButtonSize[];

/** The button recipe with Tailwind conflict resolution, for styling custom elements. */
export function buttonClasses(
  options: Parameters<typeof buttonVariants>[0] = {},
) {
  return cn(buttonVariants(options));
}

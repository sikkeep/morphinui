import { cva, type VariantProps } from 'class-variance-authority';

/**
 * The shell shared by Input and Textarea; the native control inside owns focus, validation and the
 * disabled state. Fill and border come from the `--field` and `--field-border` tokens.
 */
export const textFieldVariants = cva([
  'relative flex w-full min-w-0 items-center gap-2 border border-field-border bg-field text-foreground',
  '[--field-radius:999px] rounded-(--field-radius) [corner-shape:var(--corner-shape)]',
  // Focus ring as an `::after` border, since `outline` ignores corner-shape. Its radius is 4 px larger to stay concentric.
  'after:pointer-events-none after:absolute after:-inset-[5px] after:rounded-[calc(var(--field-radius)+4px)] after:[corner-shape:var(--corner-shape)] after:border-2 after:border-transparent after:content-[""]',
  'has-[:enabled:hover]:border-ring/50',
  'has-[:focus-visible]:border-ring has-[:focus-visible]:after:border-ring',
  'has-[[aria-invalid=true]]:border-destructive has-[[data-invalid]]:border-destructive',
  'has-[:focus-visible]:has-[[aria-invalid=true]]:after:border-destructive has-[:focus-visible]:has-[[data-invalid]]:after:border-destructive',
  'has-[:disabled]:cursor-not-allowed has-[:disabled]:border-field-border has-[:disabled]:bg-disabled has-[:disabled]:text-disabled-foreground',
  '[&_[data-icon]]:pointer-events-none [&_[data-icon]]:inline-flex [&_[data-icon]]:shrink-0 [&_[data-icon]]:text-muted-foreground',
  '[&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
].join(' '), {
  variants: {
    size: {
      sm: 'px-3 [--field-inset:12px] [--field-height:32px] [--field-padding:7px] text-xs',
      md: 'px-3.5 [--field-inset:14px] [--field-height:40px] [--field-padding:9px] text-sm',
      lg: 'px-4 [--field-inset:16px] [--field-height:48px] [--field-padding:13px] text-sm',
    },
  },
  defaultVariants: { size: 'md' },
});

export type TextFieldOptions = VariantProps<typeof textFieldVariants>;
export const textFieldControlClasses = 'block w-full min-w-0 bg-transparent text-inherit outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:placeholder:text-disabled-foreground';

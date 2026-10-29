import { cva, type VariantProps } from 'class-variance-authority';

/**
 * The composer's surface: a field-colored box with the signature corner shape, a 24 px radius cap (so a
 * tall draft stays inside the outline) and the text field's focus ring, drawn as an `::after` border
 * because `outline` ignores corner-shape. Only the textarea's focus rings the surface; toolbar buttons
 * carry their own outline.
 */
export const promptInputVariants = cva([
  '@container/prompt-input group/prompt-input relative flex w-full min-w-0 flex-col gap-1.5 border border-field-border bg-field text-foreground',
  'rounded-(--prompt-radius) [corner-shape:var(--corner-shape)]',
  'after:pointer-events-none after:absolute after:-inset-[5px] after:rounded-[calc(var(--prompt-radius)+4px)] after:[corner-shape:var(--corner-shape)] after:border-2 after:border-transparent after:content-[""]',
  'has-[[data-slot=prompt-input-textarea]:enabled:hover]:border-ring/50',
  'has-[[data-slot=prompt-input-textarea]:focus-visible]:border-ring has-[[data-slot=prompt-input-textarea]:focus-visible]:after:border-ring',
  'data-dragging:border-ring data-dragging:after:border-ring/40',
  'data-disabled:cursor-not-allowed data-disabled:bg-disabled data-disabled:text-disabled-foreground',
].join(' '), {
  variants: {
    size: {
      sm: 'p-1.5 [--prompt-radius:20px] [--prompt-inset:8px] text-sm',
      md: 'p-2 [--prompt-radius:24px] [--prompt-inset:10px] text-sm',
    },
  },
  defaultVariants: { size: 'md' },
});

export type PromptInputOptions = VariantProps<typeof promptInputVariants>;
export type PromptInputSize = NonNullable<PromptInputOptions['size']>;

/**
 * The native textarea: no border or fill of its own, bounded between `rows` and `maxRows` lines in CSS too.
 * One line is 32 px (24 px text and 4 px above and below), the height of the toolbar's buttons, so a
 * single-row composer lines its text up with the send button.
 */
export const promptInputTextareaClasses = [
  'block w-full min-w-0 resize-none bg-transparent px-(--prompt-inset) py-1 text-inherit leading-6 outline-none',
  'min-h-[calc(var(--prompt-rows)*1lh+8px)] max-h-[calc(var(--prompt-max-rows)*1lh+8px)]',
  'placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:placeholder:text-disabled-foreground',
].join(' ');

/**
 * The default disabled fill is `--disabled` (the muted color), which is the field's own color on dark themes,
 * so an empty composer's send button vanished. It takes the accent gray instead, the same selector as the
 * button recipe's so it replaces that fill.
 */
export const promptInputSubmitDisabledClasses = '[&[data-disabled]:not([data-loading])]:bg-accent [&[data-disabled]:not([data-loading])]:text-subtle-foreground';

export const promptInputToolbarClasses = 'flex min-w-0 items-center justify-between gap-2';
export const promptInputToolsClasses = 'flex min-w-0 items-center gap-1';

/** Attachments sit in a wrapping row above the text. */
export const promptInputAttachmentsClasses = 'flex flex-wrap gap-1.5 px-0.5 pt-0.5';
export const promptInputAttachmentClasses = [
  'relative inline-flex h-10 max-w-60 min-w-0 items-center gap-2 rounded-[14px] [corner-shape:var(--corner-shape)]',
  'bg-accent ps-1.5 pe-1 text-foreground',
].join(' ');
export const promptInputAttachmentPreviewClasses = [
  'grid size-7 shrink-0 place-items-center overflow-clip rounded-[10px] [corner-shape:var(--corner-shape)] bg-background text-muted-foreground',
  '[&>img]:size-full [&>img]:object-cover [&_svg:not([class*=size-])]:size-3.5',
].join(' ');

/** The time beside the voice button while it records: a pulsing dot and tabular digits. */
export const promptInputRecordingClasses = 'inline-flex items-center gap-1.5 ps-1 text-xs tabular-nums text-muted-foreground';
export const promptInputRecordingDotClasses = 'size-2 shrink-0 rounded-[999px] bg-destructive';

import { cva, type VariantProps } from 'class-variance-authority';

/** The thread fills its parent and scrolls; `--chat-column` (720 px unless set) caps the width of the conversation inside it. */
export const chatThreadClasses = 'relative flex min-h-0 flex-1 flex-col';
export const chatThreadViewportClasses = 'min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none [scrollbar-gutter:stable]';
export const chatThreadContentClasses = 'mx-auto flex w-full max-w-[var(--chat-column,720px)] flex-col gap-6 px-4 py-6';

/** Jump to latest: it rises and fades in when the reader has scrolled away from the newest message. */
export const chatThreadJumpClasses = [
  // No width here: the icon button's own square width must win.
  'absolute inset-x-0 bottom-3 mx-auto shadow-popover',
  'transition-[opacity,translate] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
  'data-hidden:pointer-events-none data-hidden:translate-y-2 data-hidden:opacity-0',
  'motion-reduce:transition-none data-reduced-motion:transition-none',
].join(' ');

/**
 * One message. A user's message sits at the end in a bubble; an assistant's is unboxed beside its mark.
 * Actions show on hover or focus, and always on a touch screen, which has no hover.
 */
export const chatMessageVariants = cva('group/message flex min-w-0', {
  variants: {
    from: {
      user: 'flex-col items-end gap-1.5 ps-10',
      assistant: 'items-start gap-3',
    },
  },
  defaultVariants: { from: 'assistant' },
});

export type ChatMessageOptions = VariantProps<typeof chatMessageVariants>;
export type ChatMessageFrom = NonNullable<ChatMessageOptions['from']>;

export const chatMessageBodyClasses = 'flex min-w-0 flex-1 flex-col gap-2';

export const chatMessageAvatarClasses = [
  'grid size-7 shrink-0 place-items-center rounded-[999px] [corner-shape:var(--corner-shape)] border border-border bg-card text-foreground',
  '[&_svg]:pointer-events-none [&_svg:not([class*=size-])]:size-3.5',
].join(' ');

export const chatMessageContentVariants = cva('min-w-0 text-sm leading-6 break-words whitespace-pre-wrap', {
  variants: {
    from: {
      user: 'max-w-full rounded-[20px] [corner-shape:var(--corner-shape)] bg-secondary px-4 py-2 text-secondary-foreground',
      assistant: 'pt-0.5 text-foreground',
    },
  },
  defaultVariants: { from: 'assistant' },
});

export const chatMessageActionsVariants = cva('flex items-center gap-0.5 -ms-1.5', {
  variants: {
    reveal: {
      hover: [
        'opacity-0 transition-opacity duration-150 ease-out motion-reduce:transition-none',
        'group-hover/message:opacity-100 group-focus-within/message:opacity-100 has-[[aria-pressed=true]]:opacity-100',
        '[@media(hover:none)]:opacity-100',
      ].join(' '),
      always: '',
    },
  },
  defaultVariants: { reveal: 'hover' },
});

export const chatMessageErrorClasses = [
  'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[14px] [corner-shape:var(--corner-shape)] bg-destructive/10 px-3 py-2 text-sm text-destructive',
  '[&>svg]:size-4 [&>svg]:shrink-0',
].join(' ');

export const chatThinkingClasses = 'inline-flex items-center gap-2 pt-0.5 text-sm leading-6 text-muted-foreground';

/**
 * A band of the text color over the label's quieter color: darker on light themes, lighter on dark ones. GSAP sweeps `backgroundPosition` from 100% to 0%; apply these
 * only while that runs.
 */
export const chatShimmerClasses = [
  '[--chat-glint:var(--foreground)] [--chat-spread:16px]',
  'bg-[linear-gradient(90deg,transparent_calc(50%-var(--chat-spread)),var(--chat-glint),transparent_calc(50%+var(--chat-spread))),linear-gradient(currentColor,currentColor)]',
  'bg-size-[250%_100%,auto] bg-no-repeat bg-clip-text [-webkit-text-fill-color:transparent]',
].join(' ');

export const chatReasoningTriggerClasses = [
  'group/reasoning-trigger inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-[999px] [corner-shape:var(--corner-shape)] text-sm leading-6 text-muted-foreground',
  'transition-colors duration-150 hover:text-foreground motion-reduce:transition-none',
  'outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  '[&_svg]:size-4 [&_svg]:shrink-0',
].join(' ');

export const chatReasoningChevronClasses = [
  'transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-panel-open/reasoning-trigger:rotate-180',
  'motion-reduce:transition-none in-data-reduced-motion:transition-none',
].join(' ');

/**
 * Base UI measures the content into `--collapsible-panel-height` and waits for this transition before it
 * hides the panel: 250 ms to open, 200 ms to close. Padding belongs on the content, never here.
 */
export const chatReasoningPanelClasses = [
  'overflow-hidden h-(--collapsible-panel-height)',
  'transition-[height] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]',
  'data-starting-style:h-0 data-ending-style:h-0 data-ending-style:duration-200',
  'motion-reduce:transition-none in-data-reduced-motion:transition-none',
].join(' ');

export const chatReasoningContentClasses = 'mt-2 border-s-2 border-border ps-3 text-sm leading-6 whitespace-pre-wrap text-muted-foreground';

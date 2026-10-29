'use client';

import {
  createContext, use, useCallback, useEffect, useLayoutEffect, useRef, useState,
  type ComponentProps, type ReactNode, type Ref, type RefObject,
} from 'react';
import { Collapsible } from '@base-ui/react/collapsible';
import { gsap } from 'gsap';
import { HugeiconsIcon } from '@hugeicons/react';
import { AiBrain01Icon, AlertCircleIcon, ArrowDown01Icon, ArrowDown02Icon, Copy01Icon, SparklesIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { motionTokens, useReducedMotion } from '@/registry/morphin/lib/motion';
import { IconButton, type IconButtonProps } from '@/registry/morphin/ui/button';
import { Spinner } from '@/registry/morphin/ui/spinner';
import {
  chatMessageActionsVariants, chatMessageAvatarClasses, chatMessageBodyClasses, chatMessageContentVariants, chatMessageErrorClasses,
  chatMessageVariants, chatReasoningChevronClasses, chatReasoningContentClasses, chatReasoningPanelClasses, chatReasoningTriggerClasses,
  chatShimmerClasses, chatThinkingClasses, chatThreadClasses, chatThreadContentClasses, chatThreadJumpClasses, chatThreadViewportClasses,
  type ChatMessageFrom,
} from '@/registry/morphin/ui/chat-variants';

export type { ChatMessageFrom, ChatMessageOptions } from '@/registry/morphin/ui/chat-variants';

/** A new message rises 8 px and sharpens from a 2 px blur. Durations are in seconds. */
export const chatMotion = { enter: 0.3, rise: 8, blur: 2, ease: 'power3.out' } as const;

/** Within this many pixels of the end the thread counts as "at the newest message" and keeps following it. */
const followDistance = 48;

interface ChatThreadContextValue {
  /** False during the thread's first commit, so the messages it opens with do not animate. */
  ready: RefObject<boolean>;
  /** Brings the newest message into view and follows it again. */
  follow: () => void;
}

const ChatThreadContext = createContext<ChatThreadContextValue | null>(null);

function setRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === 'function') ref(node);
  else if (ref) ref.current = node;
}

export interface ChatThreadProps extends ComponentProps<'div'> {
  /** Sets `aria-busy` on the log while a reply is written, so screen readers read it once it is done. */
  busy?: boolean;
  /** The jump button's name. Default "Jump to latest". */
  jumpLabel?: string;
  viewportClassName?: string;
  contentClassName?: string;
}

/**
 * The scrolling conversation. It opens at the newest message and follows a reply while it grows; scrolling
 * up lets go, and a button brings the reader back. A message the user sends always brings the thread down.
 */
export function ChatThread({
  ref, busy, jumpLabel = 'Jump to latest', className, viewportClassName, contentClassName, children,
  'aria-label': ariaLabel = 'Conversation', ...props
}: ChatThreadProps) {
  const reduced = useReducedMotion();
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const stuck = useRef(true);
  const lastTop = useRef(0);
  const ready = useRef(false);
  const [away, setAway] = useState(false);

  const toEnd = useCallback((behavior: ScrollBehavior = 'auto') => {
    const node = viewport.current;
    if (!node) return;
    stuck.current = true;
    if (behavior === 'smooth' && typeof node.scrollTo === 'function') node.scrollTo({ top: node.scrollHeight, behavior });
    else node.scrollTop = node.scrollHeight;
  }, []);

  const [context] = useState<ChatThreadContextValue>(() => ({ ready, follow: () => toEnd() }));

  useLayoutEffect(() => {
    const node = viewport.current;
    const inner = content.current;
    if (!node || !inner) return;
    node.scrollTop = node.scrollHeight;
    lastTop.current = node.scrollTop;
    if (typeof ResizeObserver === 'undefined') return;
    // A reply that grows, a panel that opens, a resized window: stay on the newest line while following.
    const observer = new ResizeObserver(() => {
      if (stuck.current) node.scrollTop = node.scrollHeight;
      else setAway(node.scrollHeight - node.scrollTop - node.clientHeight > followDistance);
    });
    observer.observe(inner);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Passive effects run after every child's layout effect, so the opening messages see `ready` false.
  useEffect(() => {
    ready.current = true;
    return () => { ready.current = false; };
  }, []);

  return <ChatThreadContext value={context}>
    <div data-slot="chat-thread" {...props} ref={ref} className={cn(chatThreadClasses, className)}>
      <div
        ref={viewport}
        data-slot="chat-thread-viewport"
        role="log"
        aria-label={ariaLabel}
        aria-busy={busy || undefined}
        tabIndex={0}
        onScroll={event => {
          const node = event.currentTarget;
          const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
          // Only a move up lets go: a smooth jump down and a growing reply both move down.
          if (distance <= followDistance) stuck.current = true;
          else if (node.scrollTop < lastTop.current) stuck.current = false;
          lastTop.current = node.scrollTop;
          setAway(distance > followDistance);
        }}
        className={cn(chatThreadViewportClasses, viewportClassName)}
      >
        <div ref={content} data-slot="chat-thread-content" className={cn(chatThreadContentClasses, contentClassName)}>
          {children}
        </div>
      </div>
      <IconButton
        data-slot="chat-thread-jump"
        data-hidden={!away || undefined}
        data-reduced-motion={reduced || undefined}
        inert={!away}
        variant="secondary"
        size="sm"
        label={jumpLabel}
        onClick={() => toEnd(reduced ? 'auto' : 'smooth')}
        className={chatThreadJumpClasses}
      >
        <HugeiconsIcon icon={ArrowDown02Icon} aria-hidden="true" strokeWidth={1.8} />
      </IconButton>
    </div>
  </ChatThreadContext>;
}

const ChatMessageContext = createContext<ChatMessageFrom>('assistant');

export interface ChatMessageProps extends ComponentProps<'article'> {
  from: ChatMessageFrom;
  /** Who wrote it, for assistive technology. Default "You" or "Assistant". */
  name?: string;
}

/**
 * One message: `from="user"` sits at the end in a bubble, `from="assistant"` is unboxed beside a mark.
 * Inside a `ChatThread`, a message added after the first render rises into place.
 */
export function ChatMessage({ ref, from, name, className, ...props }: ChatMessageProps) {
  const thread = use(ChatThreadContext);
  const reduced = useReducedMotion();
  const local = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const node = local.current;
    if (!node || !thread?.ready.current) return;
    if (from === 'user') thread.follow();
    if (reduced) return;
    const tween = gsap.fromTo(node,
      { opacity: 0, y: chatMotion.rise, filter: `blur(${chatMotion.blur}px)` },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: chatMotion.enter, ease: chatMotion.ease, clearProps: 'opacity,transform,filter' });
    return () => { tween.revert(); };
  }, [thread, from, reduced]);

  const setRefs = useCallback((node: HTMLElement | null) => {
    local.current = node;
    setRef(ref, node);
  }, [ref]);

  return <ChatMessageContext value={from}>
    <article
      data-slot="chat-message"
      data-from={from}
      aria-label={name ?? (from === 'user' ? 'You' : 'Assistant')}
      {...props}
      ref={setRefs}
      className={cn(chatMessageVariants({ from }), className)}
    />
  </ChatMessageContext>;
}

/** The assistant's mark beside its message. Sparkles by default; pass any icon or an image. */
export function ChatMessageAvatar({ ref, className, children, ...props }: ComponentProps<'span'>) {
  return <span data-slot="chat-message-avatar" aria-hidden="true" {...props} ref={ref} className={cn(chatMessageAvatarClasses, className)}>
    {children ?? <HugeiconsIcon icon={SparklesIcon} aria-hidden="true" strokeWidth={1.8} />}
  </span>;
}

/** The assistant's column beside the avatar: reasoning, text, attachments and actions. */
export function ChatMessageBody({ ref, className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="chat-message-body" {...props} ref={ref} className={cn(chatMessageBodyClasses, className)} />;
}

/** The text: a bubble for the user, plain text for the assistant. Line breaks are kept. */
export function ChatMessageContent({ ref, className, ...props }: ComponentProps<'div'>) {
  const from = use(ChatMessageContext);
  return <div data-slot="chat-message-content" {...props} ref={ref} className={cn(chatMessageContentVariants({ from }), className)} />;
}

export interface ChatMessageActionsProps extends ComponentProps<'div'> {
  /** `hover` shows them on hover and focus (always on touch screens); `always` keeps them visible. */
  reveal?: 'hover' | 'always';
}

/** A row of small actions under a message: copy, retry, feedback. */
export function ChatMessageActions({ ref, reveal = 'hover', className, ...props }: ChatMessageActionsProps) {
  return <div data-slot="chat-message-actions" role="group" aria-label="Message actions" {...props} ref={ref} className={cn(chatMessageActionsVariants({ reveal }), className)} />;
}

/** A small ghost icon button for `ChatMessageActions`. Pass `aria-pressed` for a toggle such as Good response. */
export function ChatMessageAction({ variant = 'ghost', size = 'xs', className, ...props }: IconButtonProps) {
  return <IconButton data-slot="chat-message-action" {...props} variant={variant} size={size} className={cn('text-muted-foreground aria-pressed:text-foreground', className)} />;
}

export interface ChatMessageCopyProps extends Omit<IconButtonProps, 'label' | 'children'> {
  /** What goes to the clipboard. */
  text: string;
  /** Default "Copy". */
  label?: string;
  /** The name for a moment after copying. Default "Copied". */
  copiedLabel?: string;
  onCopy?: () => void;
}

/** Copies the message; the icon turns into a check for a moment. */
export function ChatMessageCopy({ text, label = 'Copy', copiedLabel = 'Copied', onCopy, onClick, ...props }: ChatMessageCopyProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return <ChatMessageAction
    data-slot="chat-message-copy"
    {...props}
    label={copied ? copiedLabel : label}
    onClick={async event => {
      onClick?.(event);
      if (event.defaultPrevented) return;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        return;
      }
      setCopied(true);
      onCopy?.();
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    }}
  >
    {copied ? <HugeiconsIcon icon={Tick02Icon} aria-hidden="true" strokeWidth={1.8} /> : <HugeiconsIcon icon={Copy01Icon} aria-hidden="true" strokeWidth={1.8} />}
  </ChatMessageAction>;
}

export interface ChatMessageErrorProps extends ComponentProps<'div'> {
  /** A control at the end, such as a Retry button. */
  action?: ReactNode;
}

/** A failed reply, announced as an alert. */
export function ChatMessageError({ ref, action, className, children, ...props }: ChatMessageErrorProps) {
  return <div data-slot="chat-message-error" role="alert" {...props} ref={ref} className={cn(chatMessageErrorClasses, className)}>
    <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={1.8} aria-hidden="true" />
    <span className="min-w-0 flex-1">{children}</span>
    {action}
  </div>;
}

/** A glint crosses the text while `active`. The inline styles belong to the tween and are reverted with it. */
function useShimmer(target: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    const node = target.current;
    if (!node || !active) return;
    const tween = gsap.fromTo(node, { backgroundPosition: '100% 50%' }, { backgroundPosition: '0% 50%', duration: motionTokens.shimmer.duration, ease: 'none', repeat: -1 });
    return () => { tween.revert(); };
  }, [target, active]);
}

/** Text with a glint crossing it, still under reduced motion. */
export function ChatShimmer({ ref, active = true, className, ...props }: ComponentProps<'span'> & { active?: boolean }) {
  const reduced = useReducedMotion();
  const local = useRef<HTMLSpanElement | null>(null);
  const shimmering = active && !reduced;
  useShimmer(local, shimmering);
  const setRefs = useCallback((node: HTMLSpanElement | null) => {
    local.current = node;
    setRef(ref, node);
  }, [ref]);
  return <span data-slot="chat-shimmer" data-shimmer={shimmering || undefined} {...props} ref={setRefs} className={cn(shimmering && chatShimmerClasses, className)} />;
}

export interface ChatThinkingProps extends Omit<ComponentProps<'div'>, 'children'> {
  /** Default "Thinking". */
  label?: ReactNode;
}

/** Shown while the assistant has not written anything yet: a spinner and a shimmering label. */
export function ChatThinking({ ref, label = 'Thinking', className, ...props }: ChatThinkingProps) {
  return <div data-slot="chat-thinking" role="status" {...props} ref={ref} className={cn(chatThinkingClasses, className)}>
    <Spinner size="sm" />
    <ChatShimmer>{label}</ChatShimmer>
  </div>;
}

export interface ChatReasoningProps extends Omit<Collapsible.Root.Props, 'children'> {
  children?: ReactNode;
  /** True while the model is still thinking: the label shimmers. */
  streaming?: boolean;
  /** How long it thought, in seconds, for "Thought for 4s". */
  duration?: number;
  /** Replaces the label. */
  label?: ReactNode;
}

/** The model's reasoning, folded behind a "Thought for 4s" row that opens it. */
export function ChatReasoning({ streaming = false, duration, label, className, children, ...props }: ChatReasoningProps) {
  const reduced = useReducedMotion();
  const text = label ?? (streaming ? 'Thinking' : duration !== undefined ? `Thought for ${Math.max(1, Math.round(duration))}s` : 'Reasoning');
  return <Collapsible.Root
    data-slot="chat-reasoning"
    data-reduced-motion={reduced || undefined}
    {...props}
    className={state => cn('flex flex-col', typeof className === 'function' ? className(state) : className)}
  >
    <Collapsible.Trigger data-slot="chat-reasoning-trigger" className={chatReasoningTriggerClasses}>
      <HugeiconsIcon icon={AiBrain01Icon} strokeWidth={1.8} aria-hidden="true" />
      <ChatShimmer active={streaming}>{text}</ChatShimmer>
      <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={1.8} aria-hidden="true" className={chatReasoningChevronClasses} />
    </Collapsible.Trigger>
    <Collapsible.Panel data-slot="chat-reasoning-panel" className={chatReasoningPanelClasses}>
      <div data-slot="chat-reasoning-content" className={chatReasoningContentClasses}>{children}</div>
    </Collapsible.Panel>
  </Collapsible.Root>;
}

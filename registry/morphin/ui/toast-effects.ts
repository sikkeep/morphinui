'use client';

import { createElement, useEffect, useLayoutEffect, useRef, useState, type ComponentType, type ReactNode, type RefObject } from 'react';
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import type { ToastState } from '@/registry/morphin/ui/toast-variants';

const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

gsap.registerPlugin(CustomEase);
/** Same curve as the stack's CSS transitions in `toast-variants.ts`; change both together. */
const smooth = CustomEase.create('morphin-toast', '0.22,1,0.36,1');

/** Toast timing. Opening (350 ms) runs slower than closing (250 ms), both on one ease-out curve. */
export const toastMotion = {
  /** `cubic-bezier(0.22, 1, 0.36, 1)`, shared with the stack's CSS transitions. */
  ease: smooth,
  enter: { duration: 0.35, y: 48, scale: 0.97, blur: 2 },
  exit: { duration: 0.25, y: 16, scale: 0.97, blur: 2 },
  /** Older toasts behind the newest one: dimmer and softer per step back. */
  depth: { duration: 0.35, fade: 0.22, blur: 1 },
  shimmer: { duration: 2 },
} as const;

/** A GSAP context reverted on unmount, so no inline style outlives the toast. */
function useScopedContext() {
  const [context] = useState(() => gsap.context(() => {}));
  useEffect(() => () => context.revert(), [context]);
  return context;
}

export interface ToastPresenceInput {
  /** Base UI marks a closing toast `ending`. */
  ending: boolean;
  /** 0 for the newest toast, 1 for the one behind it, and so on. */
  depth: number;
  reduced: boolean;
}

/**
 * Animates a toast's enter, its depth in the stack and its exit. It moves `target`, an element inside
 * the Base UI root, because Base UI owns the root's transform.
 */
export function useToastPresence(
  root: RefObject<HTMLElement | null>,
  target: RefObject<HTMLElement | null>,
  { ending, depth, reduced }: ToastPresenceInput,
) {
  const context = useScopedContext();
  const [expanded, setExpanded] = useState(false);
  /** The depth step last drawn, so a repeated effect run (React Strict Mode) changes nothing. */
  const drawn = useRef<number | null>(null);
  /** Set once the enter finishes or is skipped; a run that only reverted the tween plays it again. */
  const entered = useRef(false);

  // Reduced motion turned on mid-stack: drop GSAP's inline styles so no toast stays dim and blurred.
  useClientLayoutEffect(() => {
    if (reduced) context.revert();
  }, [context, reduced]);

  // Base UI sets `data-expanded` on the root while the stack is spread out.
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const read = () => setExpanded(node.hasAttribute('data-expanded'));
    read();
    const observer = new MutationObserver(read);
    observer.observe(node, { attributes: true, attributeFilter: ['data-expanded'] });
    return () => observer.disconnect();
  }, [root]);

  useClientLayoutEffect(() => {
    // Enter once per toast; turning reduced motion off later must not replay it.
    if (entered.current) return;
    const node = target.current;
    if (!node || reduced) {
      entered.current = true;
      return;
    }
    const { enter, ease } = toastMotion;
    // Marked done on complete, not on start: Strict Mode reverts the first run's tween.
    context.add(() => gsap.fromTo(node,
      { y: enter.y, scale: enter.scale, opacity: 0, filter: `blur(${enter.blur}px)` },
      { y: 0, scale: 1, opacity: 1, filter: 'blur(0px)', duration: enter.duration, ease, overwrite: 'auto', onComplete: () => { entered.current = true; } }));
  }, [context, target, reduced]);

  useClientLayoutEffect(() => {
    const node = target.current;
    if (!node || reduced || ending) return;
    const step = expanded ? 0 : Math.min(depth, 3);
    // The first draw belongs to the enter; after that only a change of step animates.
    const previous = drawn.current;
    drawn.current = step;
    if (previous === null || previous === step) return;
    const { depth: stack, ease } = toastMotion;
    context.add(() => gsap.to(node, {
      opacity: 1 - step * stack.fade,
      filter: `blur(${step * stack.blur}px)`,
      duration: stack.duration,
      ease,
      overwrite: 'auto',
    }));
  }, [context, target, depth, expanded, ending, reduced]);

  useClientLayoutEffect(() => {
    const node = target.current;
    if (!node || reduced || !ending) return;
    const { exit, ease } = toastMotion;
    // A swiped toast already travels with the pointer; it only needs to fade.
    const swiped = root.current?.hasAttribute('data-swipe-direction') ?? false;
    context.add(() => gsap.to(node, {
      ...(!swiped && { y: exit.y, scale: exit.scale }),
      opacity: 0,
      filter: `blur(${exit.blur}px)`,
      duration: exit.duration,
      ease,
      overwrite: 'auto',
    }));
  }, [context, root, target, ending, reduced]);
}

/** Sweeps a highlight across the title while a toast is loading. */
export function useShimmer(target: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    const node = target.current;
    if (!node || !active) return;
    const tween = gsap.fromTo(node,
      { backgroundPosition: '100% 0' },
      { backgroundPosition: '0% 0', duration: toastMotion.shimmer.duration, ease: 'none', repeat: -1 });
    return () => { tween.revert(); };
  }, [target, active]);
}

/** The elements of a toast that state effects may animate. */
export interface ToastStatusRefs {
  /** The card; effects are scoped to it. */
  card: RefObject<HTMLElement | null>;
  /** The layer that may shake when a toast fails. */
  shake: RefObject<HTMLElement | null>;
  badge: RefObject<HTMLElement | null>;
  spinner: RefObject<HTMLElement | null>;
  glyph: RefObject<HTMLElement | null>;
  /** The text block; its `[data-word]` spans are what a wave may nudge. */
  text: RefObject<HTMLElement | null>;
}

/** Decorative layers an effects set may add. Each is mounted at the place its name says. */
export interface ToastStatusLayers {
  /** In the card, before the content. */
  tint?: ReactNode;
  /** In the content, before the icon. */
  bloom?: ReactNode;
  /** In the content, before the icon. */
  wave?: ReactNode;
  /** In the badge, behind the glyph. */
  halo?: ReactNode;
}

/** Props of an effects set's `Text` component, which renders a toast's title or description. */
export interface ToastTextProps {
  value: ReactNode;
  part: 'title' | 'description';
  state: ToastState;
  reduced: boolean;
}

/**
 * How a toast reacts when its state or text changes, passed to `<Toaster effects>`. The default is
 * `plainToastEffects`; another set, such as `proToastEffects` from the `toast-pro` item, can animate
 * the status and morph the text. `useStatus` runs as a hook, so define the set as a module-level
 * constant and never swap it on a mounted `Toaster` (remount it with a new `key` instead).
 */
export interface ToastEffects {
  /** Called as a hook in every toast. Animates the given elements and returns decorative layers to mount. */
  useStatus: (refs: ToastStatusRefs, input: { state: ToastState; reduced: boolean }) => ToastStatusLayers;
  /** Renders the title and the description, for example to morph text as it changes. */
  Text: ComponentType<ToastTextProps>;
}

const noLayers: ToastStatusLayers = {};

function PlainText({ value }: ToastTextProps) {
  return createElement('span', null, value);
}

/** The default effects: the icon and the colors swap with a CSS fade, and text renders as is. */
export const plainToastEffects: ToastEffects = {
  useStatus: () => noLayers,
  Text: PlainText,
};

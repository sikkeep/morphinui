'use client';

import { createContext, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Menu } from '@base-ui/react/menu';
import { gsap } from 'gsap';
import { cn } from '@/lib/utils';
import { motionTokens } from '@/registry/morphin/lib/motion';

const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** The highlighted row of the nearest menu. `undefined` outside a `Dropdown` or under reduced motion, where rows paint their own highlight. */
export const DropdownHighlightContext = createContext<HTMLElement | null | undefined>(undefined);

/** Tracks the row Base UI highlights. Returns the row and an `onItemHighlighted` handler that also calls yours. */
export function useHighlightedItem(onItemHighlighted?: Menu.Root.Props['onItemHighlighted']) {
  const [item, setItem] = useState<HTMLElement | null>(null);
  const onHighlight = useCallback<NonNullable<Menu.Root.Props['onItemHighlighted']>>((element, details) => {
    setItem(element ?? null);
    onItemHighlighted?.(element, details);
  }, [onItemHighlighted]);
  return [item, onHighlight] as const;
}

/** The attribute names a selector tests, such as `data-highlighted` in `[data-highlighted]`. */
function attributesOf(selector: string) {
  const names = Array.from(selector.matchAll(/\[([\w-]+)/g), match => match[1]);
  return names.length > 0 ? names : ['data-highlighted'];
}

/**
 * Follows the element matching `selector` inside `scope`, for lists without a highlight callback
 * (Base UI Select, or cmdk with `'[cmdk-item][data-selected=true]'`). Pass `scope` from a callback ref.
 */
export function useHighlightedElement(scope: HTMLElement | null, selector = '[data-highlighted]') {
  const [item, setItem] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!scope) return;
    const read = () => setItem(scope.querySelector<HTMLElement>(selector));
    // Items may already be highlighted when the scope mounts; read after the first paint.
    const frame = requestAnimationFrame(read);
    const observer = new MutationObserver(read);
    observer.observe(scope, { subtree: true, childList: true, attributeFilter: attributesOf(selector) });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [scope, selector]);
  return item;
}

const scopeSelector = '[data-highlight-scope]';
// The item a scope rests on: a checked menu radio, or the selected option of a select.
const restSelector = '[role="menuitemradio"][aria-checked="true"], [role="option"][aria-selected="true"]';
// Regions the surface skips, such as icon chips or a label row.
const ignoreSelector = '[data-highlight="none"]';

function owned(element: Element, scope: HTMLElement) {
  return element.closest(scopeSelector) === scope && !element.closest(ignoreSelector);
}

function usable(item: HTMLElement | null | undefined, scope: HTMLElement): item is HTMLElement {
  // Base UI marks a disabled item with an empty `data-disabled`; cmdk writes "true" or "false".
  const disabled = item?.getAttribute('data-disabled');
  return !!item?.isConnected && owned(item, scope) &&
    (disabled === null || disabled === 'false') && item.getAttribute('aria-disabled') !== 'true';
}

function first(scope: HTMLElement, selector: string) {
  return Array.from(scope.querySelectorAll<HTMLElement>(selector)).find(item => usable(item, scope)) ?? null;
}

export interface DropdownHighlightProps {
  /** The row to cover. `null` hides the surface, or sends it to the resting item when `rest` is on. */
  item: HTMLElement | null;
  /** Return to the checked radio item (or selected option) of this scope when nothing is highlighted. */
  rest?: boolean;
  className?: string;
}

/**
 * The sliding highlight surface. Render one inside each `data-highlight-scope` element (the popup
 * or a segmented group). It is positioned in layout coordinates, so a scaling popup does not offset it.
 */
export function DropdownHighlight({ item, rest = false, className }: DropdownHighlightProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const latest = useRef({ item, rest });
  const sync = useRef<((animate: boolean) => void) | null>(null);

  useClientLayoutEffect(() => {
    const surface = ref.current;
    const scope = surface?.parentElement;
    if (!surface || !scope) return;
    const context = gsap.context(() => {}, surface);
    let current: HTMLElement | null = null;
    let destination: { x: number; y: number; width: number; height: number; opacity: number } | null = null;
    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => sync.current?.(false));
    resize?.observe(scope);
    // Selection and submenu changes move the resting item, including a controlled value set elsewhere.
    const checks = typeof MutationObserver === 'undefined' ? undefined : new MutationObserver(() => sync.current?.(true));
    checks?.observe(scope, { subtree: true, attributeFilter: ['aria-checked', 'aria-selected', 'data-popup-open'] });

    // Base UI clears the highlight over separators, labels and padding; hold the row while the pointer is inside.
    let inside = false;
    const track = (next: boolean) => {
      if (inside === next) return;
      inside = next;
      sync.current?.(true);
    };
    const onOver = (event: PointerEvent) => track(event.target instanceof Element && owned(event.target, scope));
    const onLeave = () => track(false);
    scope.addEventListener('pointerover', onOver);
    scope.addEventListener('pointerleave', onLeave);

    sync.current = (animate) => {
      const { item, rest } = latest.current;
      // An open submenu keeps its trigger marked while focus is inside the submenu.
      const held = usable(item, scope) ? item : first(scope, '[role="menuitem"][data-popup-open]') ??
        (inside && usable(current, scope) ? current : null);
      const target = held ?? (rest ? first(scope, restSelector) : null);
      const from = {
        x: Number(gsap.getProperty(surface, 'x')) || 0,
        y: Number(gsap.getProperty(surface, 'y')) || 0,
        width: Number(gsap.getProperty(surface, 'width')) || 0,
        height: Number(gsap.getProperty(surface, 'height')) || 0,
        opacity: Number(gsap.getProperty(surface, 'opacity')) || 0,
      };
      // Tracked here rather than read from CSS: a hidden surface has no position to animate from.
      const shown = destination !== null || gsap.isTweening(surface);
      // The same row with a new size or position (a popup widening to its trigger) follows at once instead of gliding.
      const sameRow = current === target && shown && !gsap.isTweening(surface);
      if (current !== target) {
        if (current) resize?.unobserve(current);
        current = target;
        if (current) resize?.observe(current);
      }

      if (!target) {
        // Already hidden: keep the position it left, so the next hover can glide in from there.
        if (!shown) return;
        destination = null;
        context.revert();
        context.add(() => {
          gsap.fromTo(surface, from, { ...from, opacity: 0, duration: motionTokens.highlight.exitDuration, ease: motionTokens.highlight.ease });
        });
        return;
      }

      if (target.dataset.variant) surface.dataset.variant = target.dataset.variant;
      else delete surface.dataset.variant;
      let x = 0;
      let y = 0;
      let node: HTMLElement | null = target;
      while (node && node !== scope) {
        x += node.offsetLeft;
        y += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
      }
      const to = { x, y, width: target.offsetWidth, height: target.offsetHeight, opacity: 1 };
      // Observing a new target reports its size at once; an unchanged destination must not restart the tween.
      if (destination && Object.entries(to).every(([key, value]) => Math.abs(destination![key as keyof typeof to] - value) < 0.1)) return;
      destination = to;

      // `from` already holds the drawn position, so the interrupted tween can be reverted.
      context.revert();
      const { duration, enterDuration, ease } = motionTokens.highlight;
      context.add(() => {
        if (sameRow) {
          gsap.set(surface, to);
        } else if (shown && animate) {
          gsap.fromTo(surface, from, { ...to, duration, ease, overwrite: true });
        } else if (!animate || !held) {
          // The resting item on open appears in place; the menu's own entrance animates it.
          gsap.set(surface, to);
        } else if (from.width > 0) {
          // Returning after a fade-out: glide in from where the surface left.
          gsap.fromTo(surface, { ...from, opacity: 0 }, { ...to, duration, ease, overwrite: true });
        } else {
          // The first hover has nowhere to glide from, so it fades in place.
          gsap.set(surface, { ...to, opacity: 0 });
          gsap.to(surface, { opacity: 1, duration: enterDuration, ease: 'power1.out', overwrite: true });
        }
      });
    };

    return () => {
      sync.current = null;
      scope.removeEventListener('pointerover', onOver);
      scope.removeEventListener('pointerleave', onLeave);
      resize?.disconnect();
      checks?.disconnect();
      context.revert();
    };
  }, []);

  useClientLayoutEffect(() => {
    latest.current = { item, rest };
    sync.current?.(true);
  }, [item, rest]);

  return <span
    ref={ref}
    data-slot="dropdown-highlight"
    aria-hidden="true"
    className={cn('pointer-events-none absolute left-0 top-0 -z-10 rounded-[10px] [corner-shape:var(--corner-shape)] bg-accent opacity-0 data-[variant=destructive]:bg-destructive/10', className)}
  />;
}

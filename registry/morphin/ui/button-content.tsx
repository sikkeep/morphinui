'use client';

import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import { gsap } from 'gsap';
import { Atom } from 'loading-dev';
import { motionTokens } from '@/registry/morphin/lib/motion';

const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const slotSelector = '[data-motion-slot]';
// Applied only while the width animates; the inset leaves room for the blur that overflow-hidden would cut.
const resizeClip = 'inset(-12px -6px)';
// Attributes that change content. Style and class writes (GSAP, theming) are ignored.
const observedAttributes = [
  'd', 'points', 'viewBox', 'href', 'xlink:href', 'src', 'srcset', 'width', 'height', 'fill', 'stroke',
  'x', 'y', 'r', 'cx', 'cy', 'rx', 'ry', 'transform', 'data-motion-hidden', 'data-motion-slot',
];

type SlotSnapshot = { element: HTMLElement; html: string };
type SlotState = { x: number; y: number; scale: number; opacity: number; filter: string };

function slots(scope: HTMLElement) {
  return new Map<string, SlotSnapshot>(Array.from(scope.querySelectorAll<HTMLElement>(slotSelector))
    .filter(node => !node.closest('[data-motion-overlay]') && !node.hasAttribute('data-motion-hidden'))
    .map(element => [element.dataset.motionSlot!, { element, html: element.innerHTML }]));
}

function snapshot(scope: HTMLElement) {
  const copy = scope.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('[data-motion-overlay]').forEach(node => node.remove());
  // The decorative copy must not duplicate ids or slots.
  for (const node of [copy, ...copy.querySelectorAll<HTMLElement>('*')]) {
    node.removeAttribute('id');
    node.removeAttribute('data-slot');
    node.removeAttribute('data-motion-content');
    // The button's padding follows its real icons (`has-[[data-icon]]`); a fading copy must not hold it.
    node.removeAttribute('data-icon');
  }
  return copy;
}

const rest: SlotState = { x: 0, y: 0, scale: 1, opacity: 1, filter: 'blur(0px)' };

/** Current drawn state of a slot. Only read while it tweens: reading a resting slot leaves GSAP transform styles on it. */
function stateOf(element: HTMLElement): SlotState {
  if (!gsap.isTweening(element)) return rest;
  return {
    x: Number(gsap.getProperty(element, 'x')) || 0,
    y: Number(gsap.getProperty(element, 'y')) || 0,
    scale: Number(gsap.getProperty(element, 'scaleX')),
    opacity: Number(gsap.getProperty(element, 'opacity')),
    filter: element.style.filter || 'blur(0px)',
  };
}

type Padding = { start: number; end: number };

/** The button's inline padding, which shrinks beside an icon and so changes with the content. */
function paddingOf(button: HTMLElement | null): Padding {
  if (!button) return { start: 0, end: 0 };
  const style = getComputedStyle(button);
  return { start: parseFloat(style.paddingInlineStart) || 0, end: parseFloat(style.paddingInlineEnd) || 0 };
}

/** The content's layout width, with its fraction (`offsetWidth` rounds it, so the box would snap by up to half a pixel at the end). Unlike client rects, it ignores the press scale. */
function widthOf(node: HTMLElement) {
  const fractional = parseFloat(getComputedStyle(node).width);
  return fractional || node.offsetWidth;
}

/** Layout offset from the start of `scope`; unlike client rects, it ignores the press scale. */
function offsetIn(node: HTMLElement, scope: HTMLElement) {
  let offset = 0;
  for (let current: HTMLElement | null = node; current && current !== scope; current = current.offsetParent as HTMLElement | null) {
    offset += current.offsetLeft;
  }
  return offset;
}

/**
 * Animates content changes. An inert copy of the previous render fades out while the new content fades
 * in: text slides vertically, icons scale. The box tweens to its new width, and slots present before
 * and after travel with it so an unchanged icon stays on its edge.
 */
function useContentAnimation(ref: RefObject<HTMLSpanElement | null>, reduced: boolean) {
  useClientLayoutEffect(() => {
    const scope = ref.current;
    if (!scope || reduced || typeof MutationObserver === 'undefined') return;

    const button = scope.parentElement;
    // The layout width stays stable while the outer button scales on press.
    let naturalWidth = widthOf(scope);
    let naturalPadding = paddingOf(button);
    let previous = { copy: snapshot(scope), slots: slots(scope) };
    let resize: gsap.core.Tween | undefined;
    let overlay: HTMLElement | undefined;
    const context = gsap.context(() => {}, scope);
    const resizing = () => resize !== undefined && resize.progress() < 1;
    // Reverts every inline style the animation wrote, whether it finished or was interrupted.
    const settle = () => {
      context.revert();
      overlay?.remove();
      overlay = undefined;
      resize = undefined;
    };
    const observe = () => observer.observe(scope, {
      childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: observedAttributes,
    });

    const observer = new MutationObserver(() => {
      const current = slots(scope);
      const changed = new Set([...previous.slots.keys(), ...current.keys()].filter(key =>
        previous.slots.get(key)?.html !== current.get(key)?.html));
      if (!changed.size) return;

      // Read what is on screen before reverting, so an interrupted change continues from there.
      const old = previous;
      const starts = new Map(Array.from(old.slots, ([key, { element }]) => [key, stateOf(element)]));
      const fromWidth = resizing() ? widthOf(scope) : naturalWidth;
      const fromPadding = resizing() ? paddingOf(button) : naturalPadding;
      observer.disconnect();
      settle();
      naturalWidth = widthOf(scope);
      naturalPadding = paddingOf(button);
      previous = { copy: snapshot(scope), slots: slots(scope) };

      context.add(() => {
        const layer = document.createElement('span');
        layer.setAttribute('data-motion-overlay', '');
        layer.setAttribute('aria-hidden', 'true');
        layer.setAttribute('inert', '');
        layer.className = 'pointer-events-none absolute inset-0 flex items-center justify-start gap-[inherit]';
        layer.append(old.copy);
        scope.append(layer);
        overlay = layer;

        const { text, textResize, icon, resize: travelTiming } = motionTokens;
        const timeline = gsap.timeline({ onComplete: settle });
        // An icon coming or going also changes the button's own padding. It eases with the width, so the
        // box has no step when the change ends and the old copy (which held the old padding) is gone.
        const padded = Math.abs(naturalPadding.start - fromPadding.start) > 0.5 || Math.abs(naturalPadding.end - fromPadding.end) > 0.5;
        const resizes = Math.abs(naturalWidth - fromWidth) > 0.5 || padded;
        if (resizes) {
          resize = gsap.fromTo(scope, { width: fromWidth, clipPath: resizeClip }, {
            width: naturalWidth, clipPath: resizeClip, ...travelTiming, clearProps: 'width,clipPath',
          });
          timeline.add(resize, 0);
          if (padded && button) {
            timeline.add(gsap.fromTo(button,
              { paddingInlineStart: fromPadding.start, paddingInlineEnd: fromPadding.end },
              { paddingInlineStart: naturalPadding.start, paddingInlineEnd: naturalPadding.end, ...travelTiming, clearProps: 'paddingInlineStart,paddingInlineEnd' }), 0);
          }
        }

        const copies = new Map(Array.from(old.copy.querySelectorAll<HTMLElement>(slotSelector), node => [node.dataset.motionSlot!, node]));
        for (const key of new Set([...copies.keys(), ...current.keys()])) {
          const copy = copies.get(key);
          const slot = current.get(key)?.element;
          const start = starts.get(key);
          const swaps = changed.has(key);
          const isText = key === 'text';
          const token = isText ? text : icon;
          const fade = isText && resizes ? textResize : { duration: token.duration, ease: token.ease };
          const away = (direction: 1 | -1) => isText ? { y: direction * text.y } : { scale: icon.scale };
          const visible = copy !== undefined && !copy.hasAttribute('data-motion-hidden');
          // Distance from where the slot was drawn to its new place; both copies cover it on the width's curve.
          const travel = visible && slot && start ? offsetIn(copy, scope) + start.x - offsetIn(slot, scope) : 0;
          const travels = Math.abs(travel) > 0.5;

          if (copy && (!visible || !swaps || !start)) gsap.set(copy, { visibility: 'hidden' });
          else if (copy && start) {
            gsap.set(copy, start);
            timeline.to(copy, { opacity: 0, filter: `blur(${token.blur}px)`, ...away(-1), ...fade }, 0);
            // Only unchanged content travels. Replaced content fades in place, or the shrinking edge would clip it.
            if (travels && !swaps) timeline.to(copy, { x: start.x - travel, ...travelTiming }, 0);
          }
          if (slot && swaps) {
            timeline.add(gsap.fromTo(slot,
              { opacity: 0, filter: `blur(${token.blur}px)`, ...away(1) },
              { opacity: 1, filter: 'blur(0px)', ...(isText ? { y: 0 } : { scale: 1 }), ...fade }), 0);
          }
          if (slot && travels) timeline.add(gsap.fromTo(slot, { x: travel }, { x: 0, ...travelTiming }), 0);
        }
      });
      observe();
    });

    observe();
    const sizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => {
      if (resizing()) return;
      naturalWidth = widthOf(scope);
      naturalPadding = paddingOf(button);
    });
    sizeObserver?.observe(scope);
    // A new size or an icon prop moves the padding without resizing the content.
    if (button) sizeObserver?.observe(button);
    return () => {
      observer.disconnect();
      sizeObserver?.disconnect();
      settle();
    };
  }, [ref, reduced]);
}

export const buttonIconClasses = 'pointer-events-none inline-flex shrink-0 items-center justify-center';

interface ButtonContentProps {
  children: ReactNode;
  labelId?: string;
  iconOnly?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  reduced: boolean;
}

export function ButtonContent({ children, labelId, iconOnly, leadingIcon, trailingIcon, loading, loadingLabel, reduced }: ButtonContentProps) {
  const ref = useRef<HTMLSpanElement>(null);
  useContentAnimation(ref, reduced);
  // At rest the box fits its content; `justify-start` anchors the content while the width animates.
  return <span ref={ref} data-slot="button-content" data-motion-content className="relative -my-1 inline-flex shrink-0 items-center justify-start gap-[inherit] py-1">
    {(loading || leadingIcon) && <span data-slot="button-icon" data-icon="inline-start" data-motion-slot="leading" className={buttonIconClasses} aria-hidden="true">
      {loading ? <Atom className="[--ld-size:var(--button-icon)]!" playState={reduced ? 'paused' : 'running'} /> : leadingIcon}
    </span>}
    <span
      id={labelId}
      data-slot="button-label"
      data-motion-slot={iconOnly ? 'icon' : 'text'}
      data-motion-hidden={iconOnly && loading || undefined}
      className={iconOnly && loading ? 'sr-only' : 'inline-flex shrink-0 items-center justify-center gap-[inherit]'}
    >{loading && loadingLabel ? loadingLabel : children}</span>
    {!loading && trailingIcon && <span data-slot="button-icon" data-icon="inline-end" data-motion-slot="trailing" className={buttonIconClasses} aria-hidden="true">{trailingIcon}</span>}
  </span>;
}

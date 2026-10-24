'use client';

import {
  useEffect, useLayoutEffect, useRef, useState, type MutableRefObject, type ReactNode, type RefObject,
} from 'react';
import { Menu } from '@base-ui/react/menu';
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { cn } from '@/lib/utils';
import { motionTokens, useReducedMotion } from '@/registry/morphin/lib/motion';
import { ActionCard, ActionCardBody } from '@/registry/morphin/ui/action-card';
import { actionCardClasses } from '@/registry/morphin/ui/action-card-variants';
import { Dropdown, DropdownContent, DropdownRadioGroup, DropdownRadioItem } from '@/registry/morphin/ui/dropdown';

gsap.registerPlugin(CustomEase);
const grow = CustomEase.create('morphin-morph', motionTokens.morph.curve);

const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

// The morph owns the popup's opacity, scale and blur, so the dropdown's own enter and exit stay off.
const popupClasses = [
  'transition-none data-starting-style:opacity-100 data-starting-style:scale-100 data-starting-style:blur-none',
  'data-ending-style:opacity-100 data-ending-style:translate-y-0 data-ending-style:blur-none',
].join(' ');

// The open clip extends past the popup so its shadow is never cut.
const reach = 24;
const radius = 16;
const open = `inset(-${reach}px -${reach}px -${reach}px -${reach}px round ${radius}px)`;

interface Morph {
  timeline: gsap.core.Timeline | null;
  /** True once the enter has started and the card is hidden. */
  started: boolean;
}

function parts(popup: HTMLElement) {
  const face = popup.querySelector<HTMLElement>('[data-slot=action-card-menu-face]');
  const content = popup.querySelector<HTMLElement>('[data-slot=action-card-menu-content]');
  if (!face || !content) return null;
  // The header's title and icon animate from their copies on the card face.
  const pairs = ['title', 'icon'].flatMap((name) => {
    const from = face.querySelector<HTMLElement>(`[data-morph="${name}"]`);
    const to = content.querySelector<HTMLElement>(`[data-morph-target="${name}"]`);
    return from && to ? [{ from, to }] : [];
  });
  const travelling = new Set(pairs.map((pair) => pair.to));
  const header = [...content.querySelectorAll<HTMLElement>('[data-slot=action-card-menu-header] > *')].filter((node) => !travelling.has(node));
  const rows = [...content.querySelectorAll<HTMLElement>('[data-slot=dropdown-radio-item]')];
  // The card's tile and label leave before the rows arrive; the checked row's highlight comes with its row.
  const cardParts = ['preview', 'label'].flatMap((name) => face.querySelector<HTMLElement>(`[data-slot=action-card-${name}]`) ?? []);
  const highlight = popup.querySelector<HTMLElement>('[data-slot=dropdown-highlight]');
  return { face, pairs, cardParts, highlight, others: [...header, ...rows] };
}

/** Places the card face over the card and returns a `clip-path` for the card's region of the popup. */
function collapse(popup: HTMLElement, card: HTMLElement, face: HTMLElement) {
  const cardBox = card.getBoundingClientRect();
  const popupBox = popup.getBoundingClientRect();
  const left = cardBox.left - popupBox.left;
  const top = cardBox.top - popupBox.top;
  gsap.set(face, { left, top, width: cardBox.width, height: cardBox.height });
  return `inset(${top}px ${popupBox.right - cardBox.right}px ${popupBox.bottom - cardBox.bottom}px ${left}px round ${radius}px)`;
}

/** Grows the popup out of the card, moves the title and icon into the header, then raises the rows. */
function enter(popup: HTMLElement, card: HTMLElement) {
  const found = parts(popup);
  if (!found) return null;
  const { face, pairs, cardParts, highlight, others } = found;
  const token = motionTokens.morph;
  const collapsed = collapse(popup, card, face);
  const timeline = gsap.timeline({ defaults: { ease: grow } });
  gsap.set(pairs.map((pair) => pair.from), { opacity: 0 });
  timeline.fromTo(popup, { clipPath: collapsed }, { clipPath: open, duration: token.duration }, 0);
  // The card's tile and label are gone before the rows arrive; its own surface melts into the menu's.
  timeline.fromTo(cardParts, { opacity: 1 }, { opacity: 0, duration: token.fade, ease: 'power1.out' }, 0);
  timeline.fromTo(face, { autoAlpha: 1 }, { autoAlpha: 0, duration: token.fade * 2, ease: 'power1.out' }, 0.04);
  for (const { from, to } of pairs) {
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    const dx = a.left - b.left;
    const dy = a.top - b.top;
    const scale = b.width > 0 ? a.width / b.width : 1;
    if (to.dataset.morphTarget === 'icon') {
      // The icon sits under the title on the card and left of it in the header: it slides sideways first,
      // so it passes beside the title instead of through it.
      timeline.fromTo(to, { x: dx, transformOrigin: '0 0' }, { x: 0, duration: token.duration * 0.6, ease: 'power3.out' }, 0);
      timeline.fromTo(to, { y: dy, scale }, { y: 0, scale: 1, duration: token.duration }, 0);
    } else {
      timeline.fromTo(to, { x: dx, y: dy, scale, transformOrigin: '0 0' }, { x: 0, y: 0, scale: 1, duration: token.duration }, 0);
    }
  }
  if (highlight) {
    timeline.set(highlight, { visibility: 'hidden' }, 0);
    timeline.set(highlight, { visibility: 'visible' }, token.rowsDelay);
    timeline.fromTo(highlight, { opacity: 0 }, { opacity: 1, duration: token.rows, ease: 'power1.out' }, token.rowsDelay);
  }
  timeline.fromTo(others, { opacity: 0, y: token.rise }, {
    opacity: 1, y: 0, duration: token.rows, ease: 'power3.out', stagger: token.stagger,
  }, token.rowsDelay);
  return timeline;
}

/** Collapses the popup back into the card, then calls `done`. Starts from wherever an interrupted enter stopped. */
function exit(popup: HTMLElement, card: HTMLElement, done: () => void) {
  const found = parts(popup);
  if (!found) { done(); return null; }
  const { face, pairs, cardParts, highlight, others } = found;
  const token = motionTokens.morph;
  const collapsed = collapse(popup, card, face);
  const timeline = gsap.timeline({ defaults: { ease: token.exitEase }, onComplete: done });
  gsap.set(popup, { pointerEvents: 'none' });
  timeline.to(others, { opacity: 0, duration: 0.12, ease: 'power1.in', stagger: { each: 0.015, from: 'end' } }, 0);
  if (highlight) timeline.to(highlight, { opacity: 0, duration: 0.12, ease: 'power1.in' }, 0);
  timeline.to(face, { autoAlpha: 1, duration: token.fade * 1.6, ease: 'power1.out' }, 0.08);
  timeline.to(cardParts, { opacity: 1, duration: token.fade * 1.6, ease: 'power1.out' }, 0.12);
  for (const { from, to } of pairs) {
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    const x = Number(gsap.getProperty(to, 'x')) || 0;
    const y = Number(gsap.getProperty(to, 'y')) || 0;
    const scale = Number(gsap.getProperty(to, 'scale')) || 1;
    const dx = x + a.left - b.left;
    const dy = y + a.top - b.top;
    const target = b.width > 0 ? scale * (a.width / b.width) : 1;
    if (to.dataset.morphTarget === 'icon') {
      // The reverse of the enter: up and shrink first, then sideways into place beside the title.
      timeline.to(to, { y: dy, scale: target, transformOrigin: '0 0', duration: token.exitDuration }, 0);
      timeline.to(to, { x: dx, duration: token.exitDuration * 0.7, ease: 'power3.in' }, token.exitDuration * 0.3);
    } else {
      timeline.to(to, { x: dx, y: dy, scale: target, transformOrigin: '0 0', duration: token.exitDuration }, 0);
    }
  }
  timeline.to(popup, { clipPath: collapsed, duration: token.exitDuration }, 0);
  return timeline;
}

/**
 * Keeps the popup hidden until Base UI has positioned it, then starts the enter. It finds the popup
 * through its own marker because a child's layout effect runs before the parent's ref is attached.
 */
function MorphStart({ card, morph }: { card: RefObject<HTMLButtonElement | null>; morph: MutableRefObject<Morph> }) {
  const marker = useRef<HTMLSpanElement>(null);
  useClientLayoutEffect(() => {
    const popupNode = marker.current?.closest<HTMLElement>('[data-slot=action-card-menu]');
    const cardNode = card.current;
    if (!popupNode || !cardNode) return;
    gsap.set(popupNode, { clipPath: 'inset(100% 100% 100% 100%)' });
    const positioner = popupNode.parentElement;
    let frame = 0;
    let waited = 0;
    const start = () => {
      // Base UI keeps the positioner at opacity 0 until it is positioned.
      if (positioner?.style.opacity === '0' && waited++ < 30) { frame = requestAnimationFrame(start); return; }
      cardNode.setAttribute('data-morphing', '');
      morph.current.started = true;
      morph.current.timeline = enter(popupNode, cardNode);
      if (!morph.current.timeline) gsap.set(popupNode, { clearProps: 'clipPath' });
    };
    frame = requestAnimationFrame(start);
    const current = morph.current;
    return () => {
      cancelAnimationFrame(frame);
      current.timeline?.kill();
      current.timeline = null;
      current.started = false;
      cardNode.removeAttribute('data-morphing');
    };
  }, [card, morph]);
  return <span ref={marker} hidden />;
}

export interface ActionCardMenuOption {
  value: string;
  label: ReactNode;
  leadingIcon?: ReactNode;
  disabled?: boolean;
}

export interface ActionCardMenuProps {
  /** Shown on the card and in the menu header; it animates from one to the other along with `icon`. */
  title: string;
  icon?: ReactNode;
  /** Replaces the card's title and icon tile, e.g. `<ActionCardMedia />`. Only the popup and rows then animate. */
  preview?: ReactNode;
  options: ActionCardMenuOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The card's label. Defaults to the selected option's label. */
  label?: ReactNode;
  /** Shows the card's active ring. */
  active?: boolean;
  disabled?: boolean;
  /** Opens and closes without the morph. Also follows `prefers-reduced-motion` and `MotionProvider`. */
  reduceMotion?: boolean;
  /** Locks page scroll while the menu is open. Defaults to `false`. */
  modal?: boolean;
  /** Defaults to the title and the selected label. */
  'aria-label'?: string;
  className?: string;
  contentClassName?: string;
  /** Pass `{ container }` to render the popup inside a themed element. */
  portalProps?: Menu.Portal.Props;
}

/**
 * An action card that morphs into a single-choice menu in its place, animated with GSAP. Closing
 * reverses the morph. Under reduced motion the menu opens and closes without animation.
 */
export function ActionCardMenu({
  title, icon, preview, options, value, defaultValue, onValueChange, open: openProp, defaultOpen, onOpenChange,
  label, active, disabled, reduceMotion, modal, className, contentClassName, portalProps, ...props
}: ActionCardMenuProps) {
  const reduced = useReducedMotion() || reduceMotion === true;
  const [inner, setInner] = useState(defaultValue);
  const current = value !== undefined ? value : inner;
  const chosen = options.find((option) => option.value === current);
  const labelNode = label ?? chosen?.label;
  const card = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const actions = useRef<Menu.Root.Actions>(null);
  const morph = useRef<Morph>({ timeline: null, started: false });

  const tile = preview ?? <span className="flex flex-col items-center gap-1 text-xs font-medium">
    <span data-morph="title">{title}</span>
    {icon && <span data-morph="icon" className="inline-flex">{icon}</span>}
  </span>;

  const handleOpenChange = (next: boolean, details: Menu.Root.ChangeEventDetails) => {
    const cardNode = card.current;
    const popupNode = popup.current;
    if (!next && !reduced && cardNode && popupNode && morph.current.started) {
      // Keep the popup mounted until the exit finishes.
      details.preventUnmountOnClose();
      morph.current.timeline?.kill();
      morph.current.timeline = exit(popupNode, cardNode, () => {
        // Show the card before unmounting: Base UI returns focus to it, and a hidden element cannot take focus.
        cardNode.removeAttribute('data-morphing');
        actions.current?.unmount();
      });
    } else if (!next) {
      cardNode?.removeAttribute('data-morphing');
    }
    onOpenChange?.(next);
  };

  return <Dropdown
    open={openProp}
    defaultOpen={defaultOpen}
    onOpenChange={handleOpenChange}
    actionsRef={actions}
    modal={modal}
  >
    <Menu.Trigger
      ref={card}
      data-slot="action-card-menu-trigger"
      render={<ActionCard preview={tile} active={active} disabled={disabled} reduceMotion={reduced} className={className} aria-pressed={undefined} />}
      aria-label={props['aria-label'] ?? (typeof labelNode === 'string' ? `${title}: ${labelNode}` : title)}
    >
      {labelNode}
    </Menu.Trigger>
    <DropdownContent
      ref={popup}
      data-slot="action-card-menu"
      side="bottom"
      align="start"
      // Places the popup over the card instead of below it.
      sideOffset={({ anchor }) => -anchor.height}
      alignOffset={0}
      positionerProps={{ collisionAvoidance: { side: 'shift', align: 'shift' } }}
      portalProps={portalProps}
      reduceMotion={reduced}
      className={cn(!reduced && popupClasses, contentClassName)}
    >
      {!reduced && <MorphStart card={card} morph={morph} />}
      {!reduced && <div
        data-slot="action-card-menu-face"
        data-active={active || undefined}
        aria-hidden="true"
        className={actionCardClasses('pointer-events-none absolute z-0 cursor-default')}
      >
        <ActionCardBody preview={tile}>{labelNode}</ActionCardBody>
      </div>}
      <div data-slot="action-card-menu-content" className="relative z-10">
        <div data-slot="action-card-menu-header" aria-hidden="true" className="flex items-center gap-2 px-2.5 pt-2 pb-1.5 text-popover-foreground">
          {icon && <span data-morph-target="icon" className="inline-flex shrink-0 [&_svg:not([class*=size-])]:size-5">{icon}</span>}
          <span data-morph-target="title" className="text-sm leading-5 font-medium">{title}</span>
        </div>
        <DropdownRadioGroup
          value={current ?? ''}
          onValueChange={(next: string) => {
            if (value === undefined) setInner(next);
            onValueChange?.(next);
          }}
        >
          {options.map((option) => <DropdownRadioItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            leadingIcon={option.leadingIcon}
            closeOnClick
          >{option.label}</DropdownRadioItem>)}
        </DropdownRadioGroup>
      </div>
    </DropdownContent>
  </Dropdown>;
}

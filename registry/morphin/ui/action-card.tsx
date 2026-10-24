'use client';

import {
  useEffect, useRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ImgHTMLAttributes, type MouseEvent, type ReactNode,
  type Ref, type RefObject,
} from 'react';
import { useRender } from '@base-ui/react/use-render';
import { gsap } from 'gsap';
import { cn } from '@/lib/utils';
import {
  actionCardClasses, actionCardLabelClasses, actionCardPreviewClasses,
} from '@/registry/morphin/ui/action-card-variants';
import { motionTokens, springEase, useReducedMotion } from '@/registry/morphin/lib/motion';
import { soundInput, useSound } from '@/registry/morphin/lib/sound';

export { actionCardVariants, actionCardClasses } from '@/registry/morphin/ui/action-card-variants';

const finePointer = '(hover: hover) and (pointer: fine)';
const spring = springEase(motionTokens.spring);

/** A change of `active` right after a press on this card is the card's own doing; a card another one deactivated stays still. */
const ownChange = 600;

/**
 * The card's spring: it lifts a little under a mouse, sinks under a press and springs back on release, and
 * `active` turning on, or off right after a press, kicks it. One tween owns the card's scale, so these never
 * fight, and the kick starts from the scale the card is drawn at, so nothing jumps. Inline styles are
 * GSAP's and are reverted when the card unmounts or motion is reduced.
 */
function useCardSpring(ref: RefObject<HTMLElement | null>, enabled: boolean, active: boolean | undefined) {
  const kick = useRef<((becameActive: boolean) => void) | null>(null);
  const previous = useRef(active);

  useEffect(() => {
    const card = ref.current;
    if (!card || !enabled) return;
    const { hover, press, pressDuration, kick: kickScale } = motionTokens.spring;
    const state = { hovered: false, pressed: false, pressedAt: -Infinity, kickWaiting: false };
    const canHover = () => typeof window.matchMedia === 'function' && window.matchMedia(finePointer).matches;
    const target = () => state.pressed ? press : state.hovered ? hover : 1;
    const rest = () => { if (target() === 1) gsap.set(card, { clearProps: 'scale,transform' }); };
    const go = () => {
      // A press goes down at once; everything else is the spring.
      if (state.pressed) gsap.to(card, { scale: press, duration: pressDuration, ease: 'power2.out', overwrite: 'auto' });
      else gsap.to(card, { scale: target(), duration: motionTokens.spring.duration, ease: spring, overwrite: 'auto', onComplete: rest });
    };
    // A dip from where the card is, then the spring home: a fixed starting scale would jump when a release is still springing.
    const pop = () => {
      gsap.killTweensOf(card);
      gsap.timeline({ onComplete: rest })
        .to(card, { scale: target() * kickScale, duration: pressDuration, ease: 'power2.out' })
        .to(card, { scale: target(), duration: motionTokens.spring.duration, ease: spring });
    };
    kick.current = (becameActive: boolean) => {
      if (!becameActive && performance.now() - state.pressedAt > ownChange) return;
      // A hidden card (a menu has taken its place) kicks when it comes back instead.
      if (card.hasAttribute('data-morphing')) state.kickWaiting = true;
      else pop();
    };

    const enter = (event: PointerEvent) => { if (event.pointerType === 'mouse' && canHover()) { state.hovered = true; go(); } };
    const leave = () => { state.hovered = false; state.pressed = false; go(); };
    const down = (event: PointerEvent) => { if (event.button === 0) { state.pressed = true; state.pressedAt = performance.now(); go(); } };
    const up = () => { if (state.pressed) { state.pressed = false; go(); } };
    // A card that an `ActionCardMenu` has taken over is hidden and cannot report the pointer leaving, so it
    // drops its scale while hidden and works out where the pointer is when it comes back.
    const morph = new MutationObserver(() => {
      if (card.hasAttribute('data-morphing')) {
        state.hovered = false; state.pressed = false;
        gsap.killTweensOf(card);
        gsap.set(card, { clearProps: 'scale,transform' });
      } else {
        state.hovered = canHover() && card.matches(':hover');
        if (state.kickWaiting) { state.kickWaiting = false; pop(); }
        else if (state.hovered) go();
      }
    });
    card.addEventListener('pointerenter', enter);
    card.addEventListener('pointerleave', leave);
    card.addEventListener('pointerdown', down);
    card.addEventListener('pointerup', up);
    card.addEventListener('pointercancel', up);
    morph.observe(card, { attributes: true, attributeFilter: ['data-morphing'] });
    return () => {
      card.removeEventListener('pointerenter', enter);
      card.removeEventListener('pointerleave', leave);
      card.removeEventListener('pointerdown', down);
      card.removeEventListener('pointerup', up);
      card.removeEventListener('pointercancel', up);
      morph.disconnect();
      kick.current = null;
      gsap.killTweensOf(card);
      gsap.set(card, { clearProps: 'scale,transform' });
    };
  }, [ref, enabled]);

  // Not on mount, and not twice under Strict Mode: only an actual change kicks.
  useEffect(() => {
    if (previous.current === active) return;
    previous.current = active;
    kick.current?.(active === true);
  }, [active]);
}

/** A disabled link must not navigate, even when `render` gives it its own href. */
const preventNavigation = (event: { preventDefault(): void }) => event.preventDefault();

interface CommonProps {
  /** Content of the tile above the label: an icon, `ActionCardMedia` or any small UI. Hidden from assistive technology. */
  preview?: ReactNode;
  /** Marks the current page (links) or the pressed state (buttons). */
  active?: boolean;
  disabled?: boolean;
  /** Turns the hover and focus transitions off. Also follows `prefers-reduced-motion` and `MotionProvider`. */
  reduceMotion?: boolean;
  /** Renders a framework link, e.g. `render={<Link href="/new" />}`. */
  render?: useRender.RenderProp;
  ref?: Ref<HTMLElement>;
}

type AnchorProps = CommonProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string };
type ActionProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
export type ActionCardProps = AnchorProps | ActionProps;

/** The preview tile and label, shared by `ActionCard` and `ActionCardMenu`. */
export function ActionCardBody({ preview, children }: { preview?: ReactNode; children?: ReactNode }) {
  return <>
    {preview && <div data-slot="action-card-preview" aria-hidden="true" className={actionCardPreviewClasses}>{preview}</div>}
    <div data-slot="action-card-label" className={actionCardLabelClasses}>
      <span className="block w-full truncate text-center">{children}</span>
    </div>
  </>;
}

/**
 * A card for a single action. With `href` or `render` it is a link and `active` sets
 * `aria-current="page"`; otherwise it is a button and `active` sets `aria-pressed`.
 */
export function ActionCard({
  ref, preview, active, disabled, reduceMotion, render, className, children, href, onClick, ...props
}: ActionCardProps) {
  const reduced = useReducedMotion() || reduceMotion === true;
  const play = useSound();
  const card = useRef<HTMLElement | null>(null);
  useCardSpring(card, !reduced && !disabled, active);
  const isLink = href !== undefined || render !== undefined;
  // A card that opens a menu (`ActionCardMenu`) is a trigger, not a toggle: it taps and the menu plays its cue.
  const toggle = !isLink && active !== undefined && !props['aria-haspopup'];
  const handleClick = (event: MouseEvent<HTMLAnchorElement & HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    const input = soundInput(event);
    if (isLink) play('navigate', { input });
    else if (toggle) play('toggle', { input, direction: active ? 'back' : 'forward' });
    else play('tap', { input });
  };
  const disabledProps = disabled
    ? isLink
      // Drop the href so a disabled link cannot navigate; `role` keeps it announced as a link.
      ? { 'aria-disabled': true, role: 'link', tabIndex: -1, 'data-disabled': '', onClick: preventNavigation }
      : { disabled: true, 'data-disabled': '' }
    : { href, onClick: handleClick };
  return useRender({
    defaultTagName: href !== undefined ? 'a' : 'button',
    render,
    ref: ref ? [ref, card] : card,
    props: {
      'data-slot': 'action-card',
      'data-active': active || undefined,
      'data-reduced-motion': reduced || undefined,
      ...(isLink ? { 'aria-current': active ? 'page' : undefined } : { type: 'button', 'aria-pressed': active }),
      ...props,
      ...disabledProps,
      className: actionCardClasses(className),
      children: <ActionCardBody preview={preview}>{children}</ActionCardBody>,
    },
  });
}

const videoTypes = /\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i;

export interface ActionCardMediaProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  src: string;
  /** Defaults to `video` for mp4, webm, mov, m4v and ogv files, otherwise `image`. */
  type?: 'image' | 'video';
  /** Video poster, shown until playback starts and under reduced motion. */
  poster?: string;
  /** Defaults to `''` (decorative), since the card's label names it. */
  alt?: string;
}

/**
 * An image or video that fills the preview tile. Videos are muted, loop, play inline and stay
 * paused under reduced motion.
 */
export function ActionCardMedia({ src, type, poster, alt = '', className, ...props }: ActionCardMediaProps) {
  const video = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  const isVideo = (type ?? (videoTypes.test(src) ? 'video' : 'image')) === 'video';

  useEffect(() => {
    const node = video.current;
    if (!node) return;
    if (reduced) node.pause();
    else node.play()?.catch(() => {});
  }, [reduced, isVideo, src]);

  if (isVideo) {
    return <video
      ref={video}
      data-slot="action-card-media"
      src={src}
      poster={poster}
      className={cn('pointer-events-none', className)}
      autoPlay={!reduced}
      loop
      muted
      playsInline
      preload="metadata"
      draggable={false}
      aria-hidden="true"
    />;
  }
  return <img
    data-slot="action-card-media"
    src={src}
    alt={alt}
    draggable={false}
    loading="lazy"
    decoding="async"
    {...props}
    className={cn('pointer-events-none', className)}
  />;
}

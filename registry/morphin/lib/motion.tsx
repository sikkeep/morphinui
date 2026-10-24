'use client';

import { createContext, use, useSyncExternalStore, type ReactNode } from 'react';

export type ReducedMotion = 'system' | 'always';
export interface MotionProviderProps {
  children: ReactNode;
  /** `system` follows the user's setting; `always` turns motion off. Default `system`. */
  reducedMotion?: ReducedMotion;
}

const MotionContext = createContext(false);
const query = '(prefers-reduced-motion: reduce)';

function mediaQuery() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query) : undefined;
}

function subscribe(onChange: () => void) {
  const media = mediaQuery();
  if (!media) return () => {};
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function getSnapshot() {
  // An unavailable preference is treated conservatively, including SSR.
  return mediaQuery()?.matches ?? true;
}

/** Sets the reduced-motion policy for every Morphin component inside it. A nested provider can only reduce motion further. */
export function MotionProvider({ children, reducedMotion = 'system' }: MotionProviderProps) {
  const inherited = use(MotionContext);
  return <MotionContext value={inherited || reducedMotion === 'always'}>{children}</MotionContext>;
}

/** True when the system prefers reduced motion or a `MotionProvider` forces it. Follows system changes live. */
export function useReducedMotion() {
  const forced = use(MotionContext);
  const system = useSyncExternalStore(subscribe, getSnapshot, () => true);
  return forced || system;
}

/** Motion tokens shared by the components. Durations are in seconds; eases are GSAP ease names. */
export const motionTokens = {
  text: { duration: 0.15, y: 4, blur: 2, ease: 'power1.inOut' },
  /** A text swap that also changes the width fades on the resize curve, so it keeps pace with the edge. */
  textResize: { duration: 0.18, ease: 'power4.out' },
  icon: { duration: 0.25, scale: 0.25, blur: 2, ease: 'power1.inOut' },
  resize: { duration: 0.24, ease: 'power4.out' },
  highlight: { duration: 0.24, enterDuration: 0.12, exitDuration: 0.12, ease: 'power3.out' },
  /** A thumb travels past its rest by `overshoot` px, eases back by `settle` px, then lands; `curve` holds cubic-bezier control points. */
  toggle: { duration: 0.35, overshoot: 1, settle: 0, curve: '0.34,1.35,0.64,1' },
  /**
   * A card opens into its menu. The surface grows from the card over `duration` on `curve` (it leaves
   * gently and settles long, so it never pops); the card's tile and label are gone within `fade`, the
   * title and icon travel to the header, and the rows rise one after another from `rowsDelay`.
   * `exitDuration` closes it back.
   */
  morph: { duration: 0.5, exitDuration: 0.32, curve: '0.32,0.72,0,1', exitEase: 'power3.inOut', fade: 0.14, rowsDelay: 0.16, rows: 0.3, stagger: 0.045, rise: 8 },
  /** A glint crosses a chip label once every `duration` seconds. */
  shimmer: { duration: 2 },
  /**
   * The spring of a card that is hovered, pressed or toggled: stiffness 300 and mass 0.8 like the card that
   * opens into a menu, with the damping eased from 20 to 15 (about 18% overshoot instead of 7%), since a card
   * moves a few pixels and a tighter spring would hide its overshoot. It settles in about 0.4 s, so
   * `duration` leaves its tail. The press goes down at once on `pressDuration` and the spring catches it on
   * release; `kick` is the scale a toggled card pops from.
   */
  spring: { stiffness: 300, damping: 15, mass: 0.8, duration: 0.7, hover: 1.04, press: 0.95, pressDuration: 0.12, kick: 0.9 },
} as const;

/**
 * A damped spring as an easing function (GSAP takes one as `ease`): 0 to 1 over the token's `duration`,
 * passing 1 on the way while the damping is low, then settling. It is the physics of a spring, not a
 * bezier approximation, so the overshoot and the ringing follow the stiffness, damping and mass.
 */
export function springEase({ stiffness, damping, mass, duration }: { stiffness: number; damping: number; mass: number; duration: number }) {
  const omega = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const decay = zeta * omega;
  const ringing = omega * Math.sqrt(Math.max(1 - zeta * zeta, 0));
  return (progress: number) => {
    if (progress <= 0) return 0;
    if (progress >= 1) return 1;
    const time = progress * duration;
    // With no ringing (critical damping or more) the critically damped form stands in, since the underdamped one needs a frequency.
    if (ringing === 0) return 1 - Math.exp(-decay * time) * (1 + decay * time);
    return 1 - Math.exp(-decay * time) * (Math.cos(ringing * time) + (decay / ringing) * Math.sin(ringing * time));
  };
}

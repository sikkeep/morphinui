'use client';

import { createContext, use, useCallback, type KeyboardEvent, type ReactNode, type SyntheticEvent } from 'react';

/** The interface sounds components ask for, one per job. */
export type SoundCue =
  | 'tap' | 'type' | 'select' | 'toggle' | 'open' | 'close' | 'navigate'
  | 'success' | 'warning' | 'error' | 'loading' | 'ready' | 'attention' | 'count';

export interface SoundOptions {
  /** How much the action matters. */
  emphasis?: 'subtle' | 'normal' | 'strong';
  /** Which way the interaction moved: a switch turning off, a step back. */
  direction?: 'forward' | 'back';
  /** Multiplier for this cue only, 0 to 1. */
  volume?: number;
  /** What did the activating. */
  input?: 'mouse' | 'touch' | 'pen' | 'keyboard';
  /** Which key was typed, for `type`. */
  key?: 'printable' | 'space' | 'delete' | 'enter';
  /** How long a `count` runs, in milliseconds. */
  duration?: number;
}

/**
 * Plays a cue. `cuelumeSound` from `@morphin/sound-cuelume` is one; any function of this shape works. A player may
 * carry `fieldProps`: attributes it wants on a text field to sound the typing itself (Cuelume reads
 * `data-cuelume-type`). Without them, Input and Textarea call the player with the `type` cue.
 */
export type SoundPlayer = ((cue: SoundCue, options?: SoundOptions) => void) & {
  fieldProps?: Record<string, string>;
};

interface SoundState {
  player?: SoundPlayer;
  enabled: boolean;
  typing: boolean;
}

const SoundContext = createContext<SoundState>({ enabled: false, typing: false });

export interface SoundProviderProps {
  children: ReactNode;
  /** What plays the cues. A nested provider inherits it. */
  player?: SoundPlayer;
  /** Default true. A nested `enabled={false}` silences its region. Sound is off wherever there is no provider. */
  enabled?: boolean;
  /** Keystroke sounds in text fields. Off unless asked for: they are the most divisive cue. */
  typing?: boolean;
}

/**
 * Turns on interface sounds for the Morphin components inside it. Without a provider every component is
 * silent and nothing is loaded. Keep the user's choice (on, off) in your app and pass it as `enabled`;
 * sound must never be the only feedback, since many people keep it off.
 */
export function SoundProvider({ children, player, enabled = true, typing }: SoundProviderProps) {
  const parent = use(SoundContext);
  const value: SoundState = {
    player: player ?? parent.player,
    enabled: enabled && (player !== undefined || parent.enabled),
    typing: typing ?? parent.typing,
  };
  return <SoundContext value={value}>{children}</SoundContext>;
}

// Cues raised by one interaction compete, and the most specific one plays: an item that is picked also
// closes its menu, a trigger button also opens its dialog. Outcomes beat everything.
const rank: Record<SoundCue, number> = {
  tap: 0, type: 0, count: 1, navigate: 2, close: 3, open: 4, select: 5, toggle: 5,
  loading: 6, ready: 6, success: 7, warning: 7, error: 7, attention: 8,
};
/** A tap that follows a richer cue this soon belongs to the same gesture (a menu opens on press, the click comes after). */
const gesture = 250;
/** The same cue again this soon is dropped, so a dragged slider ticks instead of buzzing. */
const repeat = 50;
/** How long a tap waits for a richer cue of the same click, in milliseconds. */
const tapHold = 24;

let pending: { cue: SoundCue; options?: SoundOptions; player: SoundPlayer } | null = null;
let lastRich = -Infinity;
const lastPlayed = new Map<SoundCue, number>();

function flush() {
  const next = pending;
  pending = null;
  if (!next) return;
  const now = performance.now();
  if (next.cue === 'tap' && now - lastRich < gesture) return;
  if (now - (lastPlayed.get(next.cue) ?? -Infinity) < repeat) return;
  lastPlayed.set(next.cue, now);
  if (rank[next.cue] > rank.type) lastRich = now;
  next.player(next.cue, next.options);
}

function schedule(cue: SoundCue, options: SoundOptions | undefined, player: SoundPlayer) {
  if (pending && rank[pending.cue] > rank[cue]) return;
  const waiting = pending !== null;
  pending = { cue, options, player };
  // A tap waits a frame: a menu opens a frame after the press, so on a quick click its open arrives just
  // after the tap and should replace it. Anything richer plays on the next tick.
  if (cue === 'tap') { if (!waiting) setTimeout(flush, tapHold); }
  else setTimeout(flush, 0);
}

/**
 * Returns a function that plays a cue through the nearest `SoundProvider`, or does nothing when sound is
 * off. Call it from event handlers, never during render.
 */
export function useSound() {
  const { player, enabled, typing } = use(SoundContext);
  return useCallback((cue: SoundCue, options?: SoundOptions) => {
    if (!enabled || !player || (cue === 'type' && !typing)) return;
    schedule(cue, options, player);
  }, [player, enabled, typing]);
}

/**
 * What a text field needs to sound typing: `fieldProps` for a player that sounds it from the DOM (spread them on the
 * native field), or an `onKeyDown` for one that is called with the `type` cue. Both are empty unless sound and
 * `typing` are on. Call `onKeyDown` after the caller's own handler, and not when it prevented the default.
 */
export function useTypingSound(): {
  fieldProps?: Record<string, string>;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
} {
  const { player, enabled, typing } = use(SoundContext);
  const play = useSound();
  if (!enabled || !typing || !player) return {};
  if (player.fieldProps) return { fieldProps: player.fieldProps };
  return {
    onKeyDown(event) {
      const key = typedKey(event);
      if (key) play('type', { key });
    },
  };
}

/** What did the activating, read from a click or a key event. */
export function soundInput(event: SyntheticEvent): SoundOptions['input'] {
  const native = event.nativeEvent as Partial<PointerEvent & MouseEvent>;
  if (native.pointerType === 'mouse' || native.pointerType === 'touch' || native.pointerType === 'pen') return native.pointerType;
  return native.detail === 0 ? 'keyboard' : 'mouse';
}

/**
 * The key a keystroke typed, or nothing when it edits no text: a modifier shortcut, Enter in a one-line
 * field (it submits), deleting in an empty field, a password, or an IME composition.
 */
export function typedKey(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): SoundOptions['key'] {
  const field = event.currentTarget;
  if (event.nativeEvent.isComposing || field.readOnly || field.disabled) return undefined;
  if (field instanceof HTMLInputElement && field.type === 'password') return undefined;
  const { key } = event;
  if (key === 'Backspace' || key === 'Delete') {
    const selected = (field.selectionEnd ?? 0) - (field.selectionStart ?? 0) > 0;
    const edge = key === 'Backspace' ? (field.selectionStart ?? 0) > 0 : (field.selectionEnd ?? 0) < field.value.length;
    return selected || edge ? 'delete' : undefined;
  }
  if (key === 'Enter') return field instanceof HTMLTextAreaElement ? 'enter' : undefined;
  if (event.ctrlKey || event.metaKey) return undefined;
  if (key === ' ') return 'space';
  return key.length === 1 ? 'printable' : undefined;
}

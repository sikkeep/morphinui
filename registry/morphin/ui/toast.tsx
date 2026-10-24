'use client';

import { useEffect, useRef, useState, type ComponentProps, type ReactNode, type RefObject } from 'react';
import { Toast as BaseToast } from '@base-ui/react/toast';
import { BorderBeam, type BorderBeamColorVariant } from 'border-beam';
import { Bell, Check, X } from 'lucide-react';
import { Arc } from 'loading-dev';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/registry/morphin/lib/motion';
import { useSound, type SoundCue } from '@/registry/morphin/lib/sound';
import { plainToastEffects, useShimmer, useToastPresence, type ToastEffects } from '@/registry/morphin/ui/toast-effects';
import {
  toastBadgeLayerVariants, toastBadgeVariants, toastBeamVariants, toastCardVariants, toastCloseVariants,
  toastContentVariants, toastIconVariants, toastMotionVariants, toastPositions,
  toastRootVariants, toastStates, toastTitleVariants, toastViewportVariants,
  type ToastPosition, type ToastState,
} from '@/registry/morphin/ui/toast-variants';

export { toastPositions, toastStates };
export type { ToastEffects, ToastPosition, ToastState };

type ToastData = { icon?: ReactNode; beam?: boolean };
type SwipeDirection = 'up' | 'down' | 'left' | 'right';

export interface ToastOptions {
  title?: ReactNode;
  description?: ReactNode;
  /** `loading` stays until it changes; the other states close after the Toaster's `timeout`. Default: `default`. */
  state?: ToastState;
  /** The icon in the circle at the start of the toast. Default: a bell. */
  icon?: ReactNode;
  /** A beam of light that travels around the border. Default: on while the state is `loading`. */
  beam?: boolean;
  /** Milliseconds before the toast closes. `0` keeps it open. */
  timeout?: number;
  /** Called when the toast closes. */
  onClose?: () => void;
}
type ToastInput = string | ToastOptions;

// One manager for the page: `toast()` works anywhere, even outside React, and every <Toaster> shares it.
const manager = BaseToast.createToastManager<ToastData>();

function options(input: ToastInput): ToastOptions {
  return typeof input === 'string' ? { title: input } : input;
}

/** Maps toast options to Base UI's: the state becomes `type`, and errors are announced urgently. */
function toBase({ state, icon, beam, ...rest }: ToastOptions, previous?: ToastData) {
  const data = { ...(icon !== undefined && { icon }), ...(beam !== undefined && { beam }) };
  return {
    ...rest,
    ...(state && { type: state, priority: state === 'error' ? 'high' as const : 'low' as const }),
    // An update only changes the data it names; the icon and the beam of the toast stay otherwise.
    ...(Object.keys(data).length > 0 && { data: { ...previous, ...data } }),
  };
}

function show(input: ToastInput, state: ToastState = 'default') {
  return manager.add(toBase({ state, ...options(input) }));
}

/** Shows a toast and returns its id. Also: `toast.loading`, `.success`, `.error`, `.update`, `.dismiss`, `.promise`. */
export const toast = Object.assign((input: ToastInput) => show(input), {
  loading: (input: ToastInput) => show(input, 'loading'),
  success: (input: ToastInput) => show(input, 'success'),
  error: (input: ToastInput) => show(input, 'error'),
  /** Changes a toast in place, for example `loading` to `success`. A closed toast ignores it. */
  update: (id: string, input: ToastInput) => manager.update(id, current => toBase(options(input), current.data)),
  /** Closes one toast, or all of them without an id. */
  dismiss: (id?: string) => manager.close(id),
  /**
   * Shows a `loading` toast that becomes `success` or `error` when the promise settles, and returns the
   * same promise. The toast handles the failure, so a fire-and-forget call never reports an unhandled
   * rejection; await the returned promise when you also want to handle it yourself.
   */
  promise: <Value,>(promise: Promise<Value>, messages: {
    loading: ToastInput;
    success: ToastInput | ((value: Value) => ToastInput);
    error: ToastInput | ((error: unknown) => ToastInput);
  }): Promise<Value> => {
    manager.promise(promise, {
      loading: toBase(options(messages.loading)),
      success: (value: Value) => toBase(options(typeof messages.success === 'function' ? messages.success(value) : messages.success)),
      // Like `toast.error`, a failure is announced urgently.
      error: (error: unknown) => ({
        ...toBase(options(typeof messages.error === 'function' ? messages.error(error) : messages.error)),
        priority: 'high' as const,
      }),
    }).catch(() => undefined);
    return promise;
  },
});

/** The badge's check or cross. The explicit size keeps the icon circle's svg rule from making it 20 px. */
function StateGlyph({ state }: { state: ToastState }) {
  if (state === 'success') return <Check className="size-2.5" strokeWidth={3} />;
  if (state === 'error') return <X className="size-2.5" strokeWidth={3} />;
  return null;
}

const stateCues: Record<ToastState, SoundCue> = { default: 'ready', loading: 'loading', success: 'success', error: 'error' };
// The state each toast last sounded, shared by every Toaster: a second Toaster, or one remounted with a
// new `key`, does not sound a toast again.
const sounded = new Map<string, ToastState>();

/** Plays the cue for what a toast reports when it appears and each time its state changes. Closing is silent. */
function useToastSound(id: string, state: ToastState, ending: boolean) {
  const play = useSound();
  useEffect(() => {
    if (ending || sounded.get(id) === state) return;
    sounded.set(id, state);
    if (sounded.size > 100) sounded.delete(sounded.keys().next().value!);
    play(stateCues[state], { emphasis: 'subtle' });
  }, [id, state, ending, play]);
}

/** Whether the toast sits inside a dark theme: the nearest ancestors with a `.dark` or `.light` class decide. */
function useDarkTheme(ref: RefObject<HTMLElement | null>) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const read = () => setDark(node.closest('.dark, .light')?.classList.contains('dark') ?? false);
    read();
    // The theme can change while a toast is open, so watch every ancestor's class.
    const observer = new MutationObserver(read);
    for (let ancestor = node.parentElement; ancestor; ancestor = ancestor.parentElement) {
      observer.observe(ancestor, { attributes: true, attributeFilter: ['class'] });
    }
    return () => observer.disconnect();
  }, [ref]);
  return dark;
}

function ToastText({ title, description, state, reduced, effects }: { title: ReactNode; description: ReactNode; state: ToastState; reduced: boolean; effects: ToastEffects }) {
  const shimmer = state === 'loading' && !reduced;
  const titleRef = useRef<HTMLHeadingElement>(null);
  useShimmer(titleRef, shimmer);
  const { Text } = effects;
  return <>
    {title != null && <BaseToast.Title ref={titleRef} data-slot="toast-title" data-shimmer={shimmer || undefined} className={toastTitleVariants({ shimmer })}>
      <Text value={title} part="title" state={state} reduced={reduced} />
    </BaseToast.Title>}
    {description != null && <BaseToast.Description data-slot="toast-description" className="relative m-0 text-xs text-muted-foreground">
      <Text value={description} part="description" state={state} reduced={reduced} />
    </BaseToast.Description>}
  </>;
}

interface ToastCardProps {
  item: ReturnType<typeof BaseToast.useToastManager<ToastData>>['toasts'][number];
  /** 0 for the newest toast, 1 for the one behind it, and so on. */
  depth: number;
  reduced: boolean;
  swipeDirection: SwipeDirection[];
  beamColor: BorderBeamColorVariant;
  effects: ToastEffects;
  closeLabel: string;
}

function ToastCard({ item, depth, reduced, swipeDirection, beamColor, effects, closeLabel }: ToastCardProps) {
  const state = (toastStates as readonly string[]).includes(item.type ?? '') ? item.type as ToastState : 'default';
  // GSAP owns whatever inline styles these elements receive while they animate; the hooks revert them.
  const root = useRef<HTMLDivElement>(null);
  const motion = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const badge = useRef<HTMLSpanElement>(null);
  const spinner = useRef<HTMLSpanElement>(null);
  const glyph = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLDivElement>(null);
  useToastPresence(root, motion, { ending: item.transitionStatus === 'ending', depth, reduced });
  const layers = effects.useStatus({ card, shake: motion, badge, spinner, glyph, text }, { state, reduced });
  const dark = useDarkTheme(card);
  useToastSound(item.id, state, item.transitionStatus === 'ending');
  // The beam stays mounted for the toast's whole life: wrapping the card conditionally would remount it.
  const beam = !reduced && (item.data?.beam ?? state === 'loading');

  return <BaseToast.Root
    ref={root}
    toast={item}
    swipeDirection={swipeDirection}
    data-slot="toast"
    data-state={state}
    className={toastRootVariants({ reduceMotion: reduced })}
  >
    <div ref={motion} data-slot="toast-motion" className={toastMotionVariants()}>
      <BorderBeam data-slot="toast-beam" active={beam} colorVariant={beamColor} theme={dark ? 'dark' : 'light'} className={toastBeamVariants()}>
        <div ref={card} data-slot="toast-card" className={toastCardVariants()}>
          {layers.tint}
          <BaseToast.Content data-slot="toast-content" className={toastContentVariants()}>
            {layers.bloom}
            {layers.wave}
            <span data-slot="toast-icon" className={cn(toastIconVariants(), 'z-10')}>
              {item.data?.icon ?? <Bell strokeWidth={1.8} />}
              <span ref={badge} data-slot="toast-badge" className={toastBadgeVariants({ state })}>
                {layers.halo}
                <span ref={spinner} data-slot="toast-spinner" className={toastBadgeLayerVariants({ visible: state === 'loading' })}>
                  <Arc className="[--ld-size:0.625rem]!" playState={state === 'loading' && !reduced ? 'running' : 'paused'} />
                </span>
                <span ref={glyph} data-slot="toast-glyph" className={toastBadgeLayerVariants()}>
                  <StateGlyph state={state} />
                </span>
              </span>
            </span>
            <div className="relative z-10 flex min-w-0 flex-1 flex-col gap-1 pe-5">
              <div ref={text} className="flex flex-col gap-1">
                <ToastText title={item.title} description={item.description} state={state} reduced={reduced} effects={effects} />
              </div>
            </div>
            <BaseToast.Close data-slot="toast-close" aria-label={closeLabel} className={toastCloseVariants()}>
              <X className="size-2.5" strokeWidth={2.75} />
            </BaseToast.Close>
          </BaseToast.Content>
        </div>
      </BorderBeam>
    </div>
  </BaseToast.Root>;
}

function ToastList({ reduced, swipeDirection, beamColor, effects, closeLabel }: { reduced: boolean; swipeDirection: SwipeDirection[]; beamColor: BorderBeamColorVariant; effects: ToastEffects; closeLabel: string }) {
  const { toasts } = BaseToast.useToastManager<ToastData>();
  // Depth counts the toasts that are staying, newest first, so a closing one does not hold a place.
  const staying = toasts.filter(item => item.transitionStatus !== 'ending');
  return toasts.map(item => <ToastCard
    key={item.id}
    item={item}
    depth={Math.max(0, staying.indexOf(item))}
    reduced={reduced}
    swipeDirection={swipeDirection}
    beamColor={beamColor}
    effects={effects}
    closeLabel={closeLabel}
  />);
}

const swipeDirections: Record<ToastPosition, SwipeDirection[]> = {
  'bottom-right': ['right', 'down'],
  'bottom-left': ['left', 'down'],
  'bottom-center': ['down'],
};

export interface ToasterProps {
  /** Where the stack sits. Default: `bottom-right`. */
  position?: ToastPosition;
  /** How many toasts show at once; older ones wait out of sight. Default: 3. */
  limit?: number;
  /** Milliseconds before a toast closes by itself. `loading` toasts never do. Default: 5000. */
  timeout?: number;
  /** The colors of the border beam. Default: `colorful`. */
  beamColor?: BorderBeamColorVariant;
  /** How a toast reacts to state and text changes. Default: `plainToastEffects`. Pass a module-level constant. */
  effects?: ToastEffects;
  /** Turns off toast motion for this Toaster only. */
  reduceMotion?: boolean;
  /** The close button's accessible name. Default: "Dismiss notification". */
  closeLabel?: string;
  /** Classes for the viewport. */
  className?: string;
  /** For example `{ container }` to render the stack inside a themed region instead of the body. */
  portalProps?: ComponentProps<typeof BaseToast.Portal>;
}

/**
 * Render once, near the root of the app. Hover or focus the stack to spread it out; swipe a toast to dismiss it.
 * Toasts sound only when the Toaster is inside a `SoundProvider`, since they come from code, not from a gesture.
 */
export function Toaster({ position = 'bottom-right', limit = 3, timeout = 5000, beamColor = 'colorful', effects = plainToastEffects, reduceMotion, closeLabel = 'Dismiss notification', className, portalProps }: ToasterProps) {
  const reduced = useReducedMotion() || reduceMotion === true;
  return <BaseToast.Provider toastManager={manager} limit={limit} timeout={timeout}>
    <BaseToast.Portal {...portalProps}>
      <BaseToast.Viewport
        data-slot="toast-viewport"
        data-reduced-motion={reduced || undefined}
        className={cn(toastViewportVariants({ position }), className)}
      >
        <ToastList reduced={reduced} swipeDirection={swipeDirections[position]} beamColor={beamColor} effects={effects} closeLabel={closeLabel} />
      </BaseToast.Viewport>
    </BaseToast.Portal>
  </BaseToast.Provider>;
}

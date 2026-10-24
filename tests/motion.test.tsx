import { StrictMode, useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { gsap } from 'gsap';
import { Button, ButtonLink, IconButton } from '@/registry/morphin/ui/button';
import { MotionProvider, motionTokens, useReducedMotion } from '@/registry/morphin/lib/motion';

function systemMotion(initial = false) {
  let matches = initial;
  const listeners = new Set<() => void>();
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    get matches() { return matches; },
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_type: string, callback: () => void) => listeners.add(callback),
    removeEventListener: (_type: string, callback: () => void) => listeners.delete(callback),
  })));
  return {
    change(value: boolean) {
      act(() => { matches = value; listeners.forEach(listener => listener()); });
    },
    listeners,
  };
}

afterEach(() => {
  gsap.globalTimeline.clear();
  gsap.ticker.sleep();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('shared reduced motion', () => {
  it('follows live system preference changes', () => {
    const preference = systemMotion(false);
    function Preference() { return <output>{useReducedMotion() ? 'reduced' : 'full'}</output>; }
    render(<Preference />);
    expect(screen.getByRole('status')).toHaveTextContent('full');
    preference.change(true);
    expect(screen.getByRole('status')).toHaveTextContent('reduced');
    preference.change(false);
    expect(screen.getByRole('status')).toHaveTextContent('full');
  });

  it('keeps a forced reduction through nested providers', () => {
    systemMotion(false);
    render(<MotionProvider reducedMotion="always"><MotionProvider reducedMotion="system"><Button>Save</Button></MotionProvider></MotionProvider>);
    expect(screen.getByRole('button')).toHaveAttribute('data-reduced-motion', 'true');
  });

  it('does not let a local false override the system preference', () => {
    systemMotion(true);
    render(<Button reduceMotion={false} loading loadingLabel="Saving">Save</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('data-reduced-motion', 'true');
    expect(button.querySelector<HTMLElement>('.ld-atom')?.style.getPropertyValue('--ld-play-state')).toBe('paused');
    expect(button.className).not.toContain('active:scale-[0.97]');
  });

  it('unsubscribes from the preference when the component unmounts', () => {
    const preference = systemMotion();
    const { unmount } = render(<Button>Save</Button>);
    expect(preference.listeners.size).toBe(1);
    unmount();
    expect(preference.listeners.size).toBe(0);
  });

  it('uses Atom by default and pauses/resumes it with the live system preference', () => {
    const preference = systemMotion();
    const { rerender } = render(<Button loading loadingLabel="Saving">Save</Button>);
    const atom = screen.getByRole('button', { name: 'Saving' }).querySelector<HTMLElement>('.ld-atom')!;
    expect(atom).toHaveAttribute('aria-hidden', 'true');
    expect(atom.style.getPropertyValue('--ld-play-state')).toBe('running');
    preference.change(true);
    expect(atom.style.getPropertyValue('--ld-play-state')).toBe('paused');
    preference.change(false);
    expect(atom.style.getPropertyValue('--ld-play-state')).toBe('running');
    rerender(<MotionProvider reducedMotion="always"><Button loading>Save</Button></MotionProvider>);
    expect(screen.getByRole('button').querySelector<HTMLElement>('.ld-atom')?.style.getPropertyValue('--ld-play-state')).toBe('paused');
  });
});

describe('GSAP content changes', () => {
  it('skips first render and animates a changed text with its current accessible name', async () => {
    systemMotion();
    const animate = vi.spyOn(gsap, 'fromTo');
    const { rerender } = render(<StrictMode><Button>Save</Button></StrictMode>);
    expect(animate).not.toHaveBeenCalled();
    rerender(<StrictMode><Button>Saved</Button></StrictMode>);
    expect(screen.getByRole('button', { name: 'Saved' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Save', { exact: true }).closest('[data-motion-overlay]')).toHaveAttribute('aria-hidden', 'true'));
    await waitFor(() => expect(animate).toHaveBeenCalled());
    act(() => { gsap.globalTimeline.progress(1); });
    const text = screen.getByText('Saved');
    expect(text.style.opacity).toBe('');
    expect(text.style.filter).toBe('');
  });

  it('cross-fades outgoing text and icons, keeps overlays inert, and removes them when settled', async () => {
    systemMotion();
    const { rerender } = render(<Button trailingIcon={<svg><path d="M0 0" /></svg>}>Ready</Button>);
    rerender(<Button trailingIcon={<svg><path d="M1 1" /></svg>}>Done</Button>);
    const button = screen.getByRole('button', { name: 'Done' });
    await waitFor(() => expect(button.querySelector('[data-motion-overlay]')).not.toBeNull());
    const overlay = button.querySelector<HTMLElement>('[data-motion-overlay]')!;
    expect(overlay).toHaveAttribute('inert');
    expect(overlay).toHaveAttribute('aria-hidden', 'true');
    expect(overlay.querySelector('[id]')).toBeNull();
    const oldText = overlay.querySelector<HTMLElement>('[data-motion-slot="text"]')!;
    const newText = button.querySelector<HTMLElement>('[data-slot="button-label"]')!;
    const oldIcon = overlay.querySelector<HTMLElement>('[data-motion-slot="trailing"]')!;
    const newIcon = button.querySelector<HTMLElement>('[data-icon="inline-end"]')!;
    const tweens = [oldText, newText, oldIcon, newIcon].flatMap(node => gsap.getTweensOf(node));
    expect(tweens).toHaveLength(4);
    act(() => { tweens.forEach(tween => tween.pause().progress(0.5)); });
    for (const node of [oldText, newText, oldIcon, newIcon]) {
      expect(Number(node.style.opacity)).toBeGreaterThan(0);
      expect(Number(node.style.opacity)).toBeLessThan(1);
    }
    expect(Number(gsap.getProperty(oldText, 'y'))).toBeLessThan(0);
    expect(Number(gsap.getProperty(newText, 'y'))).toBeGreaterThan(0);
    expect(button).toHaveAccessibleName('Done');
    act(() => {
      const timelines = new Set(tweens.map(tween => tween.parent));
      tweens.forEach(tween => tween.paused(false));
      timelines.forEach(timeline => timeline?.pause().progress(1));
    });
    expect(button.querySelector('[data-motion-overlay]')).toBeNull();
    expect(newText.style.transform).toBe('');
    expect(newIcon.style.filter).toBe('');
  });

  it('measures layout width independently of the press scale and resumes from an interrupted width', async () => {
    systemMotion();
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
      if (!this.hasAttribute('data-motion-content')) return 0;
      return Number.parseFloat(this.style.width) || (this.querySelector('[data-slot="button-label"]')?.textContent?.length ?? 0) * 8;
    });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return { width: this.offsetWidth * 0.96, height: 20, x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 20, toJSON() {} };
    });
    const { rerender } = render(<Button>Go</Button>);
    rerender(<Button>Launch workspace</Button>);
    const content = screen.getByRole('button').querySelector<HTMLElement>('[data-motion-content]')!;
    await waitFor(() => expect(gsap.getTweensOf(content)).toHaveLength(1));
    const first = gsap.getTweensOf(content)[0];
    expect(first.vars.width).toBe(128);
    act(() => { first.pause().progress(0.5); });
    const interrupted = content.offsetWidth;
    rerender(<Button>Ready</Button>);
    await waitFor(() => expect(gsap.getTweensOf(content)[0]).not.toBe(first));
    const next = gsap.getTweensOf(content)[0];
    act(() => { next.pause().progress(0); });
    expect(Number.parseFloat(content.style.width)).toBeCloseTo(interrupted, 1);
    act(() => { next.progress(1); });
    expect(content.style.width).toBe('');
    expect(content.style.clipPath).toBe('');
  });

  it('eases the button padding with the width when an icon comes or goes, and the old copy does not hold it', async () => {
    systemMotion();
    // The padding follows a real leading icon (a direct child of the content), as `has-[[data-icon]]` does.
    const real = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element: Element, pseudo?: string | null) => {
      const style = real(element, pseudo);
      if (!(element as HTMLElement).matches?.('[data-slot="button"]')) return style;
      const start = element.querySelector('[data-motion-content] > [data-icon="inline-start"]') ? '10px' : '13px';
      return new Proxy(style, {
        get(target, key) {
          if (key === 'paddingInlineStart') return start;
          if (key === 'paddingInlineEnd') return '13px';
          const value = Reflect.get(target, key);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });
    });
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
      if (!this.hasAttribute('data-motion-content')) return 0;
      return Number.parseFloat(this.style.width) || (this.querySelector('[data-slot="button-label"]')?.textContent?.length ?? 0) * 8 + (this.querySelector(':scope > [data-icon]') ? 24 : 0);
    });
    const { rerender } = render(<Button>Save changes</Button>);
    const button = screen.getByRole('button');
    const content = button.querySelector<HTMLElement>('[data-motion-content]')!;

    rerender(<Button loading loadingLabel="Saving">Save changes</Button>);
    await waitFor(() => expect(gsap.getTweensOf(button).length).toBeGreaterThan(0));
    act(() => { gsap.getTweensOf(content)[0].parent?.pause().progress(1); });
    await waitFor(() => expect(button.querySelector('[data-motion-overlay]')).toBeNull());

    // Loading ends: the icon goes, and the padding eases from the loading value to the idle one.
    rerender(<Button loading={false} loadingLabel="Saving">Save changes</Button>);
    await waitFor(() => expect(gsap.getTweensOf(button).length).toBeGreaterThan(0));
    const padding = gsap.getTweensOf(button)[0];
    expect(padding.vars.paddingInlineStart).toBe(13);
    expect(padding.duration()).toBe(motionTokens.resize.duration);
    act(() => { padding.pause().progress(0); });
    expect(button.style.paddingInlineStart).toBe('10px');
    // The fading copy keeps no icon marker, so it cannot hold the old padding.
    expect(button.querySelector('[data-motion-overlay] [data-icon]')).toBeNull();
    act(() => { padding.parent?.pause().progress(1); });
    expect(button.style.paddingInlineStart).toBe('');
    expect(button.querySelector('[data-motion-overlay]')).toBeNull();
  });

  it('moves a slot that keeps its content from where it was drawn, on the width curve', async () => {
    systemMotion();
    // The label sits after the spinner once loading starts; the copy of the old label sits at the start.
    vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (this: HTMLElement) {
      if (this.dataset.motionSlot !== 'text' || this.closest('[data-motion-overlay]')) return 0;
      return this.parentElement?.querySelector('[data-motion-slot="leading"]') ? 24 : 0;
    });
    const { rerender } = render(<Button>Save</Button>);
    rerender(<Button loading>Save</Button>);
    const button = screen.getByRole('button');
    const label = button.querySelector<HTMLElement>('[data-slot="button-label"]')!;
    await waitFor(() => expect(gsap.getTweensOf(label)).toHaveLength(1));
    const travel = gsap.getTweensOf(label)[0];
    expect(travel.duration()).toBe(motionTokens.resize.duration);
    act(() => { travel.pause().progress(0); });
    expect(gsap.getProperty(label, 'x')).toBe(-24);
    expect(label.style.opacity).toBe('');
    expect(button.querySelector<HTMLElement>('[data-motion-overlay] [data-motion-slot="text"]')!.style.visibility).toBe('hidden');
    act(() => { travel.paused(false); travel.parent?.pause().progress(1); });
    expect(label.getAttribute('style') ?? '').toBe('');
    expect(button.querySelector('[data-motion-overlay]')).toBeNull();
  });

  it('leaves no inline styles on slots that did not move or change', async () => {
    systemMotion();
    const { rerender } = render(<Button leadingIcon={<svg><path d="M0 0" /></svg>}>Save</Button>);
    rerender(<Button leadingIcon={<svg><path d="M0 0" /></svg>}>Saved</Button>);
    const button = screen.getByRole('button');
    const label = button.querySelector<HTMLElement>('[data-slot="button-label"]')!;
    await waitFor(() => expect(gsap.getTweensOf(label).length).toBeGreaterThan(0));
    // A second change reads the in-flight state of the label, never the resting icon.
    rerender(<Button leadingIcon={<svg><path d="M0 0" /></svg>}>Saved!</Button>);
    await waitFor(() => expect(button.querySelector('[data-motion-overlay]')).not.toBeNull());
    act(() => { gsap.getTweensOf(label)[0]?.parent?.progress(1); });
    expect(button.querySelector<HTMLElement>('[data-icon="inline-start"]')!.getAttribute('style')).toBeNull();
  });

  it('fades text on the resize curve when the width changes, and as a plain swap when it does not', async () => {
    systemMotion();
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.hasAttribute('data-motion-content') ? (this.querySelector('[data-slot="button-label"]')?.textContent?.length ?? 0) * 8 : 0;
    });
    const { rerender } = render(<Button>Save</Button>);
    const label = () => screen.getByRole('button').querySelector<HTMLElement>('[data-slot="button-label"]')!;
    rerender(<Button>Done</Button>);
    await waitFor(() => expect(gsap.getTweensOf(label())).toHaveLength(1));
    expect(gsap.getTweensOf(label())[0].duration()).toBe(motionTokens.text.duration);
    rerender(<Button>Finished</Button>);
    await waitFor(() => expect(gsap.getTweensOf(label())[0]?.duration()).toBe(motionTokens.textResize.duration));
    expect(gsap.getTweensOf(label())[0].vars.ease).toBe(motionTokens.textResize.ease);
  });

  it('ignores new ReactNode identities when the rendered content is unchanged', async () => {
    systemMotion();
    const animate = vi.spyOn(gsap, 'fromTo');
    const { rerender } = render(<Button leadingIcon={<svg><path d="M0 0" /></svg>}>Save</Button>);
    rerender(<Button leadingIcon={<svg><path d="M0 0" /></svg>}>Save</Button>);
    await act(async () => {});
    expect(animate).not.toHaveBeenCalled();
  });

  it('animates a changed SVG without replaying the unchanged text', async () => {
    systemMotion();
    const animate = vi.spyOn(gsap, 'fromTo');
    const { rerender } = render(<Button leadingIcon={<svg><path d="M0 0" /></svg>}>Save</Button>);
    rerender(<Button leadingIcon={<svg><path d="M1 1" /></svg>}>Save</Button>);
    await waitFor(() => expect(animate).toHaveBeenCalled());
    expect(animate.mock.calls.every(([target]) => (target as HTMLElement).dataset.motionSlot === 'leading')).toBe(true);
  });

  it('reveals the latest content and stops active tweens when the preference changes', async () => {
    const preference = systemMotion();
    const { rerender } = render(<Button>Save</Button>);
    rerender(<Button>Saved</Button>);
    const text = screen.getByText('Saved');
    await waitFor(() => expect(gsap.getTweensOf(text).length).toBeGreaterThan(0));
    preference.change(true);
    expect(gsap.getTweensOf(text)).toHaveLength(0);
    expect(text.style.opacity).toBe('');
    expect(text.style.transform).toBe('');
    expect(text.style.filter).toBe('');
    expect(screen.getByRole('button', { name: 'Saved' })).toHaveAttribute('data-reduced-motion', 'true');
  });

  it('supports opt-out for text, icon and loading changes', async () => {
    systemMotion();
    const animate = vi.spyOn(gsap, 'fromTo');
    const { rerender } = render(<Button reduceMotion>Save</Button>);
    rerender(<Button reduceMotion loading loadingLabel="Saving">Save</Button>);
    await act(async () => {});
    expect(animate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Saving' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button').querySelector<HTMLElement>('.ld-atom')?.style.getPropertyValue('--ld-play-state')).toBe('paused');
  });

  it('keeps focus and the latest label during rapid updates', async () => {
    systemMotion();
    function Example() {
      const [count, setCount] = useState(0);
      return <Button onClick={() => setCount(value => value + 1)}>Count {count}</Button>;
    }
    render(<Example />);
    const button = screen.getByRole('button');
    button.focus();
    for (let index = 0; index < 5; index++) {
      fireEvent.click(button);
      await act(async () => {});
    }
    act(() => { gsap.globalTimeline.progress(1); });
    expect(button).toHaveFocus();
    expect(button).toHaveAccessibleName('Count 5');
    expect(button.textContent).toBe('Count 5');
    expect(screen.getByText('Count 5').style.opacity).toBe('');
  });

  it('reverts animation styles and tweens on unmount', async () => {
    systemMotion();
    const { rerender, unmount } = render(<IconButton label="Play"><svg><path d="M0 0" /></svg></IconButton>);
    rerender(<IconButton label="Pause"><svg><path d="M1 1" /></svg></IconButton>);
    const slot = screen.getByRole('button').querySelector<HTMLElement>('[data-motion-slot="icon"]')!;
    await waitFor(() => expect(gsap.getTweensOf(slot).length).toBeGreaterThan(0));
    unmount();
    expect(gsap.getTweensOf(slot)).toHaveLength(0);
    expect(slot.style.transform).toBe('');
  });

  it('animates navigation labels while preserving link semantics', async () => {
    systemMotion();
    const animate = vi.spyOn(gsap, 'fromTo');
    const { rerender } = render(<ButtonLink href="/start">Start</ButtonLink>);
    rerender(<ButtonLink href="/next">Continue</ButtonLink>);
    await waitFor(() => expect(animate).toHaveBeenCalled());
    expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/next');
  });
});

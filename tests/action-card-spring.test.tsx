import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gsap } from 'gsap';
import { MotionProvider, motionTokens, springEase } from '@/registry/morphin/lib/motion';
import { ActionCard } from '@/registry/morphin/ui/action-card';

const { hover, press, pressDuration, kick, duration } = motionTokens.spring;

/** A mouse that can hover; `reduce` is the system's reduced-motion preference. */
function pointer({ fine = true, reduce = false } = {}) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? reduce : query.includes('hover: hover') ? fine : false,
    addEventListener() {}, removeEventListener() {},
  }));
}

beforeEach(() => pointer());
afterEach(() => {
  gsap.globalTimeline.clear();
  gsap.ticker.sleep();
  vi.unstubAllGlobals();
});

const card = () => screen.getByRole('button', { name: 'Sort' });
// The newest tween: an older one lives until the next tick, when `overwrite: 'auto'` ends it.
const tween = () => gsap.getTweensOf(card()).at(-1)!;
const mouse = { pointerType: 'mouse' };

describe('springEase', () => {
  it('starts at 0, ends at 1 and overshoots by about 18% on the way, as the spring it models does', () => {
    const ease = springEase(motionTokens.spring);
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    const peak = Math.max(...Array.from({ length: 201 }, (_, index) => ease(index / 200)));
    expect(peak).toBeGreaterThan(1.15);
    expect(peak).toBeLessThan(1.21);
    // Settled before the end: no step when the tween stops.
    expect(Math.abs(ease(0.9999) - 1)).toBeLessThan(0.001);
  });

  it('rings less with more damping, and not at all when critically damped', () => {
    const peak = (damping: number) => {
      const { stiffness, mass, duration: length } = motionTokens.spring;
      const ease = springEase({ stiffness, mass, damping, duration: length });
      return Math.max(...Array.from({ length: 201 }, (_, index) => ease(index / 200)));
    };
    expect(peak(30)).toBeLessThan(peak(20));
    // Critical damping for stiffness 300 and mass 0.8 is 2 * sqrt(300 * 0.8) ≈ 31.
    expect(peak(31)).toBeLessThan(1.001);
  });
});

describe('ActionCard spring', () => {
  it('lifts under a mouse and springs back when it leaves, leaving no inline style at rest', () => {
    render(<ActionCard onClick={() => {}}>Sort</ActionCard>);
    expect(gsap.getTweensOf(card())).toHaveLength(0);
    fireEvent.pointerEnter(card(), mouse);
    expect(tween().vars.scale).toBe(hover);
    expect(typeof tween().vars.ease).toBe('function');
    expect(tween().duration()).toBe(duration);
    act(() => { tween().progress(1); });
    expect(gsap.getProperty(card(), 'scale')).toBe(hover);

    fireEvent.pointerLeave(card(), mouse);
    expect(tween().vars.scale).toBe(1);
    act(() => { tween().progress(1); });
    expect(card().style.transform).toBe('');
    expect(card().style.scale).toBe('');
  });

  it('does not lift under touch or a coarse pointer', () => {
    pointer({ fine: false });
    render(<ActionCard onClick={() => {}}>Sort</ActionCard>);
    fireEvent.pointerEnter(card(), mouse);
    fireEvent.pointerEnter(card(), { pointerType: 'touch' });
    expect(gsap.getTweensOf(card())).toHaveLength(0);
  });

  it('sinks at once under a press and springs to where it belongs on release', () => {
    render(<ActionCard onClick={() => {}}>Sort</ActionCard>);
    fireEvent.pointerEnter(card(), mouse);
    fireEvent.pointerDown(card(), { ...mouse, button: 0 });
    expect(tween().vars.scale).toBe(press);
    expect(tween().duration()).toBe(pressDuration);
    expect(tween().vars.ease).toBe('power2.out');
    fireEvent.pointerUp(card(), mouse);
    // Still hovered: it springs back to the lift, not to rest.
    expect(tween().vars.scale).toBe(hover);
    expect(typeof tween().vars.ease).toBe('function');
    // A press that slides off the card lets go of it too.
    fireEvent.pointerDown(card(), { ...mouse, button: 0 });
    fireEvent.pointerLeave(card(), mouse);
    expect(tween().vars.scale).toBe(1);
  });

  it('ignores a press of another button', () => {
    render(<ActionCard onClick={() => {}}>Sort</ActionCard>);
    fireEvent.pointerDown(card(), { ...mouse, button: 2 });
    expect(gsap.getTweensOf(card())).toHaveLength(0);
  });

  it('kicks when it becomes active: a dip, then the spring home; not on mount, not on a rerender with the same value', () => {
    const { rerender } = render(<ActionCard active={false}>Sort</ActionCard>);
    expect(gsap.getTweensOf(card())).toHaveLength(0);
    rerender(<ActionCard active={false}>Sort</ActionCard>);
    expect(gsap.getTweensOf(card())).toHaveLength(0);
    rerender(<ActionCard active>Sort</ActionCard>);
    const [dip, home] = gsap.getTweensOf(card());
    expect(dip.vars.scale).toBeCloseTo(kick, 3);
    expect(dip.duration()).toBe(pressDuration);
    expect(home.vars.scale).toBe(1);
    expect(typeof home.vars.ease).toBe('function');
    act(() => { dip.parent?.progress(1); });
    expect(card().style.transform).toBe('');
  });

  it('starts the kick from the scale it is drawn at, so a release that is still springing does not jump', () => {
    const { rerender } = render(<ActionCard active={false}>Sort</ActionCard>);
    fireEvent.pointerEnter(card(), mouse);
    fireEvent.pointerDown(card(), { ...mouse, button: 0 });
    act(() => { tween().progress(1); });
    fireEvent.pointerUp(card(), mouse);
    act(() => { tween().pause().progress(0.2); });
    const drawn = Number(gsap.getProperty(card(), 'scale'));
    rerender(<ActionCard active>Sort</ActionCard>);
    act(() => { gsap.getTweensOf(card())[0].parent?.pause().progress(0); });
    expect(Number(gsap.getProperty(card(), 'scale'))).toBeCloseTo(drawn, 3);
  });

  it('kicks a card that turns off only when it was just pressed, not when another card took over', () => {
    vi.spyOn(performance, 'now').mockReturnValue(10_000);
    const { rerender } = render(<ActionCard active>Sort</ActionCard>);
    // Another card was chosen: this one goes quiet.
    rerender(<ActionCard active={false}>Sort</ActionCard>);
    expect(gsap.getTweensOf(card())).toHaveLength(0);

    rerender(<ActionCard active>Sort</ActionCard>);
    act(() => { gsap.getTweensOf(card())[0].parent?.progress(1); });
    // A press on this card, then it turns off: that is its own doing.
    fireEvent.pointerDown(card(), { ...mouse, button: 0 });
    fireEvent.pointerUp(card(), mouse);
    act(() => { gsap.killTweensOf(card()); });
    rerender(<ActionCard active={false}>Sort</ActionCard>);
    expect(gsap.getTweensOf(card()).length).toBeGreaterThan(0);

    // The same turning off a long while after the press is not.
    act(() => { gsap.killTweensOf(card()); });
    rerender(<ActionCard active>Sort</ActionCard>);
    act(() => { gsap.killTweensOf(card()); });
    vi.mocked(performance.now).mockReturnValue(20_000);
    rerender(<ActionCard active={false}>Sort</ActionCard>);
    expect(gsap.getTweensOf(card())).toHaveLength(0);
  });

  it('holds a kick while a menu has taken the card over, and plays it when the card is back', async () => {
    const { rerender } = render(<ActionCard active={false}>Sort</ActionCard>);
    await act(async () => { card().setAttribute('data-morphing', ''); await Promise.resolve(); });
    rerender(<ActionCard active>Sort</ActionCard>);
    expect(gsap.getTweensOf(card())).toHaveLength(0);
    await act(async () => { card().removeAttribute('data-morphing'); await Promise.resolve(); });
    expect(gsap.getTweensOf(card()).length).toBeGreaterThan(0);
  });

  it('does nothing under reduced motion, from the system or a provider, or when disabled', () => {
    pointer({ reduce: true });
    const system = render(<ActionCard active={false}>Sort</ActionCard>);
    fireEvent.pointerEnter(card(), mouse);
    system.rerender(<ActionCard active>Sort</ActionCard>);
    expect(gsap.getTweensOf(card())).toHaveLength(0);
    system.unmount();

    pointer();
    const forced = render(<MotionProvider reducedMotion="always"><ActionCard active={false}>Sort</ActionCard></MotionProvider>);
    fireEvent.pointerEnter(card(), mouse);
    expect(gsap.getTweensOf(card())).toHaveLength(0);
    forced.unmount();

    render(<ActionCard disabled onClick={() => {}}>Sort</ActionCard>);
    fireEvent.pointerEnter(card(), mouse);
    expect(gsap.getTweensOf(card())).toHaveLength(0);
  });

  it('drops its scale while a menu has taken the card over, and reads the pointer again when it is back', () => {
    render(<ActionCard onClick={() => {}}>Sort</ActionCard>);
    fireEvent.pointerEnter(card(), mouse);
    act(() => { tween().progress(0.5); });
    expect(gsap.getProperty(card(), 'scale')).not.toBe(1);
    return act(async () => {
      card().setAttribute('data-morphing', '');
      await Promise.resolve();
      expect(gsap.getTweensOf(card())).toHaveLength(0);
      expect(card().style.transform).toBe('');
      card().removeAttribute('data-morphing');
      await Promise.resolve();
      // jsdom reports no hover, so it stays at rest instead of springing up.
      expect(gsap.getTweensOf(card())).toHaveLength(0);
    });
  });

  it('removes its listeners and styles when it unmounts', () => {
    const { unmount } = render(<ActionCard onClick={() => {}}>Sort</ActionCard>);
    const element = card();
    fireEvent.pointerEnter(element, mouse);
    unmount();
    expect(gsap.getTweensOf(element)).toHaveLength(0);
    fireEvent.pointerEnter(element, mouse);
    expect(gsap.getTweensOf(element)).toHaveLength(0);
  });

  it('keeps a ref the caller passes, and still springs', () => {
    const received: Array<HTMLElement | null> = [];
    render(<ActionCard ref={node => { received.push(node); }} onClick={() => {}}>Sort</ActionCard>);
    expect(received.at(0)).toBe(card());
    fireEvent.pointerEnter(card(), mouse);
    expect(tween().vars.scale).toBe(hover);
  });
});

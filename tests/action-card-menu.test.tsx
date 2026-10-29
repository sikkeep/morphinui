import { useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gsap } from 'gsap';
import { MotionProvider } from '@/registry/morphin/lib/motion';
import { ActionCardMenu } from '@/registry/morphin/ui/action-card-menu';
import { ActionCardMedia } from '@/registry/morphin/ui/action-card';

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  // jsdom has no layout; give the card and the popup real boxes so the morph has somewhere to start from.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const popup = this.matches('[data-slot=action-card-menu]');
    const width = popup ? 224 : 116;
    const height = popup ? 150 : 128;
    return { x: 0, y: 0, left: 0, top: 0, right: width, bottom: height, width, height, toJSON() {} } as DOMRect;
  });
});

afterEach(() => {
  gsap.globalTimeline.clear();
  gsap.ticker.sleep();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const options = [
  { value: 'new', label: 'New' },
  { value: 'popular', label: 'Popular' },
  { value: 'trending', label: 'Trending', disabled: true },
];

function Sort(props: Partial<React.ComponentProps<typeof ActionCardMenu>>) {
  return <ActionCardMenu title="Sort by" icon={<svg data-testid="icon" />} options={options} defaultValue="new" {...props} />;
}

const popupOf = () => document.querySelector<HTMLElement>('[data-slot=action-card-menu]');

describe('ActionCardMenu', () => {
  it('shows the card with the chosen label and names it with the title', () => {
    render(<Sort />);
    const card = screen.getByRole('button', { name: 'Sort by: New' });
    expect(card).toHaveAttribute('data-slot', 'action-card-menu-trigger');
    expect(card).toHaveAttribute('aria-haspopup', 'menu');
    expect(card).not.toHaveAttribute('aria-pressed');
    expect(card.querySelector('[data-slot=action-card-label]')).toHaveTextContent('New');
    expect(card.querySelector('[data-morph=title]')).toHaveTextContent('Sort by');
    expect(popupOf()).toBeNull();
  });

  it('opens a menu of radio items with the title and icon in its header, and picks one', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<MotionProvider reducedMotion="always"><Sort onValueChange={onValueChange} /></MotionProvider>);
    const card = screen.getByRole('button', { name: 'Sort by: New' });
    await user.click(card);
    await screen.findByRole('menu');
    expect(card).toHaveAttribute('aria-expanded', 'true');
    const header = document.querySelector('[data-slot=action-card-menu-header]')!;
    expect(header).toHaveTextContent('Sort by');
    expect(header.querySelector('[data-testid=icon]')).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: 'New' })).toBeChecked();
    expect(screen.getByRole('menuitemradio', { name: 'Trending' })).toHaveAttribute('aria-disabled', 'true');
    await user.click(screen.getByRole('menuitemradio', { name: 'Popular' }));
    expect(onValueChange).toHaveBeenCalledWith('popular');
    await waitFor(() => expect(popupOf()).toBeNull());
    expect(screen.getByRole('button', { name: 'Sort by: Popular' })).toBeInTheDocument();
  });

  it('follows a controlled value and does not change by itself', async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState('new');
      return <MotionProvider reducedMotion="always"><Sort value={value} onValueChange={(next) => setValue(next === 'popular' ? 'new' : next)} /></MotionProvider>;
    }
    render(<Controlled />);
    await user.click(screen.getByRole('button', { name: 'Sort by: New' }));
    await user.click(await screen.findByRole('menuitemradio', { name: 'Popular' }));
    await waitFor(() => expect(popupOf()).toBeNull());
    expect(screen.getByRole('button', { name: 'Sort by: New' })).toBeInTheDocument();
  });

  it('opens and closes at once under reduced motion, with no copy of the card', async () => {
    const user = userEvent.setup();
    render(<MotionProvider reducedMotion="always"><Sort /></MotionProvider>);
    const card = screen.getByRole('button', { name: 'Sort by: New' });
    await user.click(card);
    await screen.findByRole('menu');
    expect(document.querySelector('[data-slot=action-card-menu-face]')).toBeNull();
    expect(popupOf()!.style.clipPath).toBe('');
    expect(card).not.toHaveAttribute('data-morphing');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(popupOf()).toBeNull());
  });

  it('grows the popup out of the card: the card hides, its copy covers it and the surface is clipped to it', async () => {
    const user = userEvent.setup();
    render(<Sort />);
    const card = screen.getByRole('button', { name: 'Sort by: New' });
    await user.click(card);
    await waitFor(() => expect(card).toHaveAttribute('data-morphing'));
    const popup = popupOf()!;
    const face = popup.querySelector<HTMLElement>('[data-slot=action-card-menu-face]')!;
    expect(face).toHaveAttribute('aria-hidden', 'true');
    expect(face.querySelector('[data-slot=action-card-label]')).toHaveTextContent('New');
    // The card's own words are drawn by the header, which travels, so the copy hides them.
    expect(face.querySelector<HTMLElement>('[data-morph=title]')!.style.opacity).toBe('0');
    expect(face.style.width).toBe('116px');
    expect(face.style.height).toBe('128px');
    const surface = gsap.getTweensOf(popup).find((tween) => 'clipPath' in tween.vars);
    expect(surface).toBeDefined();
    surface!.pause(0);
    expect(popup.style.clipPath).toBe('inset(0px 108px 22px 0px round 16px)');
    // The surface grows to the popup's own box, with the popup's own radius, ...
    surface!.progress(1);
    expect(popup.style.clipPath).toBe('inset(0px 0px 0px 0px round 14px)');
    // ... and only then reaches past it, so the shadow is never cut.
    const reach = gsap.getTweensOf(popup).filter((tween) => 'clipPath' in tween.vars)[1];
    expect(reach.startTime()).toBeCloseTo(surface!.endTime());
    reach.progress(1);
    expect(popup.style.clipPath).toContain('-24px');
    expect(gsap.getTweensOf(popup.querySelector('[data-morph-target=title]')).length).toBeGreaterThan(0);
  });

  it('keeps every corner of the growing surface round: no side of the clip passes the popup before it is whole', async () => {
    const user = userEvent.setup();
    render(<Sort />);
    await user.click(screen.getByRole('button', { name: 'Sort by: New' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sort by: New' })).toHaveAttribute('data-morphing'));
    const popup = popupOf()!;
    const surface = gsap.getTweensOf(popup).find((tween) => 'clipPath' in tween.vars)!;
    surface.pause();
    for (const progress of [0.02, 0.1, 0.25, 0.5, 0.75, 0.95, 1]) {
      surface.progress(progress);
      const sides = [...popup.style.clipPath.matchAll(/-?[\d.]+(?=px)/g)].slice(0, 4).map(Number);
      // A negative side puts that corner's rounding outside the box, leaving the corner square.
      expect(Math.min(...sides)).toBeGreaterThanOrEqual(-0.001);
    }
  });

  it('does not scroll, and shows no scrollbar, while the surface opens', async () => {
    const user = userEvent.setup();
    render(<Sort />);
    await user.click(screen.getByRole('button', { name: 'Sort by: New' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sort by: New' })).toHaveAttribute('data-morphing'));
    const popup = popupOf()!;
    // The rows rise from 8 px low: their overflow would bring a scrollbar for a few frames (Windows).
    expect(popup.style.overflowY).toBe('hidden');
    expect(popup).toHaveClass('[scrollbar-width:none]', '[&::-webkit-scrollbar]:hidden');
    const timeline = gsap.getTweensOf(popup).find((tween) => 'clipPath' in tween.vars)!.parent!;
    act(() => { timeline.progress(1); });
    expect(popup.style.overflowY).toBe('');
  });

  describe('a menu shorter than the card (two rows: 114 px against 128 px)', () => {
    // jsdom does not keep `min-height` in an inline style, so the popup is 114 px tall throughout and the tweens are read.
    const shortPopup = () => vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const popup = this.matches('[data-slot=action-card-menu]');
      const width = popup ? 224 : 116;
      const height = popup ? 114 : 128;
      return { x: 0, y: 0, left: 0, top: 0, right: width, bottom: height, width, height, toJSON() {} } as DOMRect;
    });

    it('holds it at the card\'s height while it opens, so the copy of the card is not cut, then settles it', async () => {
      shortPopup();
      const user = userEvent.setup();
      render(<Sort />);
      const card = screen.getByRole('button', { name: 'Sort by: New' });
      await user.click(card);
      await waitFor(() => expect(card).toHaveAttribute('data-morphing'));
      const popup = popupOf()!;
      const surface = gsap.getTweensOf(popup).find((tween) => 'clipPath' in tween.vars)!;
      surface.pause(0);
      // The surface starts as the whole card: nothing of it is below the box.
      expect(popup.style.clipPath).toBe('inset(0px 108px 0px 0px round 16px)');
      // The popup is held at the card's height (128 px) and eases down to its own (114 px) along with the surface.
      const settle = gsap.getTweensOf(popup).find((tween) => 'minHeight' in tween.vars)!;
      expect(settle.vars.startAt).toMatchObject({ minHeight: 128 });
      expect(settle.vars.minHeight).toBe(114);
      expect(settle.duration()).toBe(surface.duration());
    });

    it('grows it back to the card\'s height as it closes, so the copy that lands on the card is whole', async () => {
      shortPopup();
      const user = userEvent.setup();
      render(<Sort />);
      const card = screen.getByRole('button', { name: 'Sort by: New' });
      await user.click(card);
      await waitFor(() => expect(card).toHaveAttribute('data-morphing'));
      act(() => { gsap.getTweensOf(popupOf()!).forEach((tween) => tween.progress(1)); });
      await user.keyboard('{Escape}');
      const grow = gsap.getTweensOf(popupOf()!).find((tween) => 'minHeight' in tween.vars && tween.progress() < 1)!;
      expect(grow.vars.minHeight).toBe(128);
      const closing = gsap.getTweensOf(popupOf()!).filter((tween) => 'clipPath' in tween.vars && tween.progress() < 1).at(-1)!;
      expect(closing.vars.clipPath).toBe('inset(0px 108px 0px 0px round 16px)');
    });

    it('needs no extra height when the menu is taller than the card', async () => {
      const user = userEvent.setup();
      render(<Sort />);
      await user.click(screen.getByRole('button', { name: 'Sort by: New' }));
      await waitFor(() => expect(popupOf()!.querySelector('[data-slot=action-card-menu-face]')).not.toBeNull());
      expect(popupOf()!.style.minHeight).toBe('');
      expect(gsap.getTweensOf(popupOf()!).some((tween) => 'minHeight' in tween.vars)).toBe(false);
    });
  });

  it('starts closing from a clip written with four sides, not from the short form the browser reports', async () => {
    const user = userEvent.setup();
    render(<Sort />);
    const card = screen.getByRole('button', { name: 'Sort by: New' });
    await user.click(card);
    await waitFor(() => expect(card).toHaveAttribute('data-morphing'));
    const popup = popupOf()!;
    gsap.getTweensOf(popup).forEach((tween) => tween.progress(1));
    // At rest all four sides are equal, and that is how the browser reads them back.
    popup.style.clipPath = 'inset(-24px round 14px)';
    await user.keyboard('{Escape}');
    const [tighten, close] = gsap.getTweensOf(popup).filter((tween) => 'clipPath' in tween.vars && tween.progress() < 1);
    expect(tighten.vars.startAt).toMatchObject({ clipPath: 'inset(-24px -24px -24px -24px round 14px)' });
    expect(tighten.vars.clipPath).toBe('inset(0px 0px 0px 0px round 14px)');
    expect(close.vars.startAt).toMatchObject({ clipPath: 'inset(0px 0px 0px 0px round 14px)' });
    expect(close.vars.clipPath).toBe('inset(0px 108px 22px 0px round 16px)');
    expect(popup.style.overflowY).toBe('hidden');
  });

  it('clears the card copy before the rows arrive and slides the icon sideways ahead of its rise', async () => {
    const user = userEvent.setup();
    render(<Sort />);
    await user.click(screen.getByRole('button', { name: 'Sort by: New' }));
    await waitFor(() => expect(popupOf()!.querySelector('[data-slot=action-card-menu-face]')).not.toBeNull());
    const popup = popupOf()!;
    const timeline = gsap.getTweensOf(popup).find((tween) => 'clipPath' in tween.vars)!.parent!;
    const face = popup.querySelector<HTMLElement>('[data-slot=action-card-menu-face]')!;
    const tile = face.querySelector<HTMLElement>('[data-slot=action-card-preview]')!;
    const label = face.querySelector<HTMLElement>('[data-slot=action-card-label]')!;
    const row = popup.querySelector<HTMLElement>('[data-slot=dropdown-radio-item]')!;
    const icon = popup.querySelector<HTMLElement>('[data-morph-target=icon]')!;
    timeline.pause();

    // The tile and label are gone (0.14 s) before the first row has started (0.16 s).
    timeline.time(0.05);
    expect(tile.style.opacity).not.toBe('');
    expect(Number(tile.style.opacity)).toBeGreaterThan(0);
    expect(Number(tile.style.opacity)).toBeLessThan(1);
    timeline.time(0.15);
    expect(tile.style.opacity).toBe('0');
    expect(label.style.opacity).toBe('0');
    expect(Number(row.style.opacity)).toBeLessThan(0.05);
    timeline.time(0.4);
    expect(Number(row.style.opacity)).toBeGreaterThan(0.5);

    // Halfway through the enter the icon has covered more of its sideways travel than its rise.
    const [ix, iy] = [icon, icon].map((node, index) => gsap.getTweensOf(node).find((tween) => (index === 0 ? 'x' : 'y') in tween.vars)!);
    expect(ix.duration()).toBeLessThan(iy.duration());
  });

  it('keeps the popup until the surface is back in the card, then shows the card and returns focus', async () => {
    const user = userEvent.setup();
    render(<Sort />);
    const card = screen.getByRole('button', { name: 'Sort by: New' });
    await user.click(card);
    await waitFor(() => expect(card).toHaveAttribute('data-morphing'));
    gsap.getTweensOf(popupOf()!).forEach((tween) => tween.progress(1));
    await user.keyboard('{Escape}');
    // Base UI would have unmounted it; the closing animation holds it.
    expect(popupOf()).not.toBeNull();
    expect(card).toHaveAttribute('data-morphing');
    expect(popupOf()!.style.pointerEvents).toBe('none');
    const closing = gsap.getTweensOf(popupOf()!).find((tween) => 'clipPath' in tween.vars && tween.progress() < 1)!;
    expect(closing).toBeDefined();
    act(() => { closing.parent!.progress(1); });
    await waitFor(() => expect(popupOf()).toBeNull());
    expect(card).not.toHaveAttribute('data-morphing');
    await waitFor(() => expect(card).toHaveFocus());
  });

  it('takes an image or a video as the card, and then only the surface and the rows animate', async () => {
    const user = userEvent.setup();
    render(<ActionCardMenu title="Category" preview={<ActionCardMedia src="/card.png" />} options={options} defaultValue="new" />);
    const card = screen.getByRole('button', { name: 'Category: New' });
    expect(card.querySelector('img')).toHaveAttribute('src', '/card.png');
    await user.click(card);
    await waitFor(() => expect(card).toHaveAttribute('data-morphing'));
    const popup = popupOf()!;
    expect(popup.querySelector('[data-slot=action-card-menu-face] img')).toBeInTheDocument();
    expect(popup.querySelector('[data-morph]')).toBeNull();
    expect(gsap.getTweensOf(popup).some((tween) => 'clipPath' in tween.vars)).toBe(true);
  });
});

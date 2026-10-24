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
    surface!.progress(1);
    expect(popup.style.clipPath).toContain('-24px');
    expect(gsap.getTweensOf(popup.querySelector('[data-morph-target=title]')).length).toBeGreaterThan(0);
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

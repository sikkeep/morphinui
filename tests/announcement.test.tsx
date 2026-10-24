import { createRef, useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { gsap } from 'gsap';
import { Announcement } from '@/registry/morphin/ui/announcement';
import { MotionProvider } from '@/registry/morphin/lib/motion';

afterEach(() => {
  gsap.globalTimeline.clear();
  gsap.ticker.sleep();
  vi.unstubAllGlobals();
});

// jsdom has no matchMedia, which the motion policy reads as "reduce".
const motionAllowed = () => vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));

/** Finishes the card's running tween, as the clock would. */
const finish = (element: Element) => act(() => { gsap.getTweensOf(element).forEach(tween => tween.progress(1)); });

describe('Announcement', () => {
  it('is a labelled card in the signature shape, named by its title', () => {
    motionAllowed();
    render(<Announcement title="What's new in v2" description="Charts and a command menu." />);
    const card = screen.getByRole('region', { name: "What's new in v2" });
    expect(card).toHaveAttribute('data-slot', 'announcement');
    expect(card).toHaveAttribute('data-size', 'md');
    expect(card).toHaveClass('bg-card', '[corner-shape:var(--corner-shape)]', '[--card-padding:16px]');
    expect(screen.getByText("What's new in v2")).toHaveAttribute('data-slot', 'announcement-title');
    expect(screen.getByText('Charts and a command menu.')).toHaveAttribute('data-slot', 'announcement-description');
  });

  it('shows only the parts it is given', () => {
    motionAllowed();
    const { container } = render(<Announcement title="2 seats left on your plan" actionLabel="Upgrade" onAction={() => {}} />);
    expect(container.querySelector('[data-slot=announcement-icon]')).toBeNull();
    expect(container.querySelector('[data-slot=announcement-description]')).toBeNull();
    expect(container.querySelector('[data-slot=announcement-dismiss]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Upgrade' })).toHaveAttribute('data-slot', 'announcement-action');
  });

  it('has no landmark role without a title, and hides a decorative icon', () => {
    motionAllowed();
    render(<Announcement icon={<span data-testid="icon">i</span>} description="Quiet note" data-testid="card" />);
    expect(screen.getByTestId('card')).not.toHaveAttribute('role');
    expect(screen.getByTestId('icon').closest('[data-slot=announcement-icon]')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('icon').closest('[data-slot=announcement-icon]')).toHaveClass('rounded-[999px]', '[corner-shape:var(--corner-shape)]');
  });

  it('takes the tight size, and the outline variant', () => {
    motionAllowed();
    render(<Announcement title="Small" size="sm" variant="outline" />);
    expect(screen.getByRole('region', { name: 'Small' })).toHaveClass('[--card-padding:12px]', 'border-border');
  });

  it('runs the action: a button by default, a link with a href or a render', async () => {
    motionAllowed();
    const user = userEvent.setup();
    const onAction = vi.fn();
    const { rerender } = render(<Announcement title="Update" actionLabel="See the changelog" onAction={onAction} />);
    await user.click(screen.getByRole('button', { name: 'See the changelog' }));
    expect(onAction).toHaveBeenCalledTimes(1);

    rerender(<Announcement title="Update" actionLabel="See the changelog" actionHref="/changelog" />);
    expect(screen.getByRole('link', { name: 'See the changelog' })).toHaveAttribute('href', '/changelog');

    rerender(<Announcement title="Update" actionLabel="Docs" actionRender={<a href="/docs" data-router="1" />} />);
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('data-router', '1');

    rerender(<Announcement title="Update" action={<button type="button">Custom</button>} />);
    expect(screen.getByRole('button', { name: 'Custom' })).toBeInTheDocument();
  });

  it('forwards the ref and native attributes', () => {
    motionAllowed();
    const ref = createRef<HTMLElement>();
    render(<Announcement ref={ref} title="Ref" role="status" id="note" />);
    expect(ref.current).toBe(screen.getByRole('status'));
    expect(ref.current).toHaveAttribute('id', 'note');
  });
});

describe('Announcement dismissal', () => {
  it('collapses on dismiss, then leaves the tree and says so', async () => {
    motionAllowed();
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<Announcement title="You're all set" dismissible dismissLabel="Close notice" onOpenChange={onOpenChange} />);
    const card = screen.getByRole('region', { name: "You're all set" });
    await user.click(screen.getByRole('button', { name: 'Close notice' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // It stays while it plays out.
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute('data-slot', 'announcement');
    const tween = gsap.getTweensOf(card)[0];
    expect(tween).toBeDefined();
    // Halfway through the 300 ms collapse: fading, and shorter than the card was.
    act(() => { tween.pause(0.15); });
    const opacity = Number(gsap.getProperty(card, 'opacity'));
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(1);
    finish(card);
    await waitFor(() => expect(screen.queryByRole('region')).toBeNull());
  });

  it('is removed at once under reduced motion', async () => {
    const user = userEvent.setup();
    render(<MotionProvider reducedMotion="always"><Announcement title="Gone" dismissible /></MotionProvider>);
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('can be controlled: closing animates out and opening brings it back', async () => {
    motionAllowed();
    function Controlled() {
      const [open, setOpen] = useState(true);
      return <>
        <button type="button" onClick={() => setOpen(value => !value)}>Toggle</button>
        <Announcement title="Controlled" open={open} onOpenChange={setOpen} dismissible />
      </>;
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole('button', { name: 'Toggle' }));
    const card = screen.getByRole('region', { name: 'Controlled' });
    expect(gsap.getTweensOf(card).length).toBeGreaterThan(0);
    finish(card);
    await waitFor(() => expect(screen.queryByRole('region')).toBeNull());

    await user.click(screen.getByRole('button', { name: 'Toggle' }));
    const back = await screen.findByRole('region', { name: 'Controlled' });
    // It opens up from nothing, and its inline styles go when it has.
    const enter = gsap.getTweensOf(back)[0];
    expect(enter).toBeDefined();
    finish(back);
    expect(back.getAttribute('style') ?? '').toBe('');
  });

  it('starts closed with defaultOpen false, and does not animate the first render', () => {
    motionAllowed();
    const { rerender } = render(<Announcement title="Later" defaultOpen={false} />);
    expect(screen.queryByRole('region')).toBeNull();
    rerender(<Announcement title="Later" defaultOpen={false} open />);
    expect(screen.getByRole('region', { name: 'Later' })).toBeInTheDocument();
  });

  it('does not tween on the first render of an open card', () => {
    motionAllowed();
    render(<Announcement title="Steady" />);
    expect(gsap.getTweensOf(screen.getByRole('region', { name: 'Steady' }))).toHaveLength(0);
  });
});

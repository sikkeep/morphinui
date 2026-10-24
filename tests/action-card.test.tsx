import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionProvider } from '@/registry/morphin/lib/motion';
import { ActionCard, ActionCardMedia, actionCardClasses, actionCardVariants } from '@/registry/morphin/ui/action-card';

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => vi.unstubAllGlobals());

describe('ActionCard', () => {
  it('renders a link with href and a button without, each with the preview and the label', async () => {
    const onClick = vi.fn();
    render(<>
      <ActionCard href="/new" preview={<svg data-testid="icon" />}>New</ActionCard>
      <ActionCard onClick={onClick}>Sort by</ActionCard>
    </>);
    const link = screen.getByRole('link', { name: 'New' });
    expect(link).toHaveAttribute('href', '/new');
    expect(link).toHaveAttribute('data-slot', 'action-card');
    expect(link.querySelector('[data-slot=action-card-preview] [data-testid=icon]')).toBeInTheDocument();
    expect(link.querySelector('[data-slot=action-card-preview]')).toHaveAttribute('aria-hidden', 'true');
    expect(link.querySelector('[data-slot=action-card-label]')).toHaveTextContent('New');
    const button = screen.getByRole('button', { name: 'Sort by' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button.querySelector('[data-slot=action-card-preview]')).toBeNull();
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('marks the active card as the current page for links and as pressed for buttons', () => {
    render(<>
      <ActionCard href="/a" active>Current</ActionCard>
      <ActionCard href="/b">Other</ActionCard>
      <ActionCard active>On</ActionCard>
      <ActionCard active={false}>Off</ActionCard>
      <ActionCard>Plain</ActionCard>
    </>);
    expect(screen.getByRole('link', { name: 'Current' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Current' })).toHaveAttribute('data-active');
    expect(screen.getByRole('link', { name: 'Other' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('button', { name: 'On' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Off' })).toHaveAttribute('aria-pressed', 'false');
    // A card that is only an action is a plain button, not a toggle.
    expect(screen.getByRole('button', { name: 'Plain' })).not.toHaveAttribute('aria-pressed');
  });

  it('keeps the Morphin shape and the token surface, at 116 by 128 px that variables can change', () => {
    render(<ActionCard preview={<span>p</span>}>Label</ActionCard>);
    const card = screen.getByRole('button', { name: 'Label' });
    expect(card).toHaveClass('rounded-[16px]', '[corner-shape:var(--corner-shape)]', 'bg-card', '[--action-card-width:116px]', '[--action-card-height:128px]', 'w-(--action-card-width)');
    expect(screen.getByText('p').parentElement).toHaveClass('rounded-[12px]', 'bg-background');
    expect(actionCardVariants()).toContain('[--action-card-width:116px]');
    expect(actionCardClasses('bg-muted')).toContain('bg-muted');
    expect(actionCardClasses('bg-muted')).not.toContain('bg-card');
  });

  it('drops the href of a disabled link and disables a disabled button', async () => {
    const onClick = vi.fn();
    render(<>
      <ActionCard href="/locked" disabled>Locked</ActionCard>
      <ActionCard disabled onClick={onClick}>Off</ActionCard>
    </>);
    const link = screen.getByRole('link', { name: 'Locked' });
    expect(link).not.toHaveAttribute('href');
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).toHaveAttribute('tabindex', '-1');
    const button = screen.getByRole('button', { name: 'Off' });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders a router link through render, forwards the ref and follows reduced motion', () => {
    const ref = createRef<HTMLElement>();
    const { rerender } = render(<ActionCard ref={ref} render={<a href="/inspirations" />} active>Inspirations</ActionCard>);
    const link = screen.getByRole('link', { name: 'Inspirations' });
    expect(ref.current).toBe(link);
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(link).not.toHaveAttribute('data-reduced-motion');
    rerender(<MotionProvider reducedMotion="always"><ActionCard href="/x">Still</ActionCard></MotionProvider>);
    expect(screen.getByRole('link', { name: 'Still' })).toHaveAttribute('data-reduced-motion');
  });

  it('fills the preview tile with an image or a video', () => {
    render(<>
      <ActionCard preview={<ActionCardMedia src="/hero.png" />}>Image</ActionCard>
      <ActionCard preview={<ActionCardMedia src="/hero.mp4" poster="/hero.png" />}>Video</ActionCard>
    </>);
    const tile = screen.getByRole('button', { name: 'Image' }).querySelector('[data-slot=action-card-preview]')!;
    expect(tile).toHaveClass('overflow-hidden', '[&>img]:size-full', '[&>img]:object-cover', '[&>video]:size-full');
    const image = tile.querySelector('img')!;
    expect(image).toHaveAttribute('src', '/hero.png');
    expect(image).toHaveAttribute('alt', '');
    expect(image).toHaveAttribute('loading', 'lazy');
    const video = screen.getByRole('button', { name: 'Video' }).querySelector('video')!;
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute('loop');
    expect(video).toHaveAttribute('playsinline');
    expect(video).toHaveAttribute('poster', '/hero.png');
    expect(video).toHaveAttribute('aria-hidden', 'true');
  });

  it('treats a source as a video by its extension or by type, and keeps a video paused under reduced motion', () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const { container, rerender } = render(<><ActionCardMedia src="/clip.webm?v=2" /><ActionCardMedia src="/stream" type="video" /><ActionCardMedia src="/photo.jpg" /></>);
    expect(container.querySelectorAll('video')).toHaveLength(2);
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(play).toHaveBeenCalled();
    pause.mockClear();
    rerender(<MotionProvider reducedMotion="always"><ActionCardMedia src="/clip.webm" /></MotionProvider>);
    expect(pause).toHaveBeenCalled();
    expect(container.querySelector('video')).not.toHaveAttribute('autoplay');
  });
});

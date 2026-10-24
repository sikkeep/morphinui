import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Skeleton, SkeletonReveal } from '@/registry/morphin/ui/skeleton';
import { MotionProvider } from '@/registry/morphin/lib/motion';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// jsdom has no matchMedia, which the motion policy reads as "reduce".
const motionAllowed = () => vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));

describe('Skeleton', () => {
  it('is static markup that paints at once: glyph rows, hidden from assistive technology', () => {
    motionAllowed();
    const { container } = render(<Skeleton lines={4} variant="braille" widths={['100%', '60%']} data-testid="sk" />);
    const root = screen.getByTestId('sk');
    expect(root).toHaveAttribute('data-slot', 'skeleton');
    expect(root).toHaveAttribute('data-ascii-skeleton');
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root).toHaveClass('ars-braille');
    expect(container.querySelectorAll('.ars-line')).toHaveLength(4);
    expect(container.querySelectorAll('.ars-line')[1]).toHaveStyle({ width: '60%' });
    expect(root).not.toHaveAttribute('data-reduced-motion');
  });

  it('draws a round block for an image or an avatar', () => {
    motionAllowed();
    const { container } = render(<Skeleton rows={6} width={64} height={64} circle />);
    const block = container.querySelector('.ars-block') as HTMLElement;
    expect(block).toHaveStyle({ width: '64px', height: '64px' });
    expect(block.style.getPropertyValue('--ars-radius')).toBe('50%');
  });

  it('is deterministic, so server and client markup match', () => {
    motionAllowed();
    const first = render(<Skeleton lines={3} seed={7} />).container.innerHTML;
    const second = render(<Skeleton lines={3} seed={7} />).container.innerHTML;
    expect(second).toBe(first);
    expect(render(<Skeleton lines={3} seed={8} />).container.innerHTML).not.toBe(first);
  });

  it('takes its colors from the theme tokens and merges classes', () => {
    motionAllowed();
    render(<Skeleton data-testid="sk" className="w-40" />);
    expect(screen.getByTestId('sk')).toHaveClass('[--ascii-skeleton:var(--muted-foreground)]', '[--ascii-accent:var(--foreground)]', 'w-40');
  });

  it('stops the sweep under reduced motion, from the system or from a MotionProvider', () => {
    // An unavailable preference (no matchMedia) counts as reduced.
    const system = render(<Skeleton data-testid="a" />);
    expect(screen.getByTestId('a')).toHaveAttribute('data-reduced-motion');
    expect(screen.getByTestId('a')).not.toHaveAttribute('data-ars-animate');
    system.unmount();

    motionAllowed();
    render(<MotionProvider reducedMotion="always"><Skeleton data-testid="b" /></MotionProvider>);
    expect(screen.getByTestId('b')).toHaveAttribute('data-reduced-motion');
    expect(screen.getByTestId('b')).not.toHaveAttribute('data-ars-animate');
  });

  it('sweeps when motion is allowed, unless animate is false', () => {
    motionAllowed();
    render(<><Skeleton data-testid="on" seed={3} /><Skeleton data-testid="off" animate={false} /></>);
    expect(screen.getByTestId('on')).toHaveAttribute('data-ars-animate', '3');
    expect(screen.getByTestId('off')).not.toHaveAttribute('data-ars-animate');
  });
});

describe('SkeletonReveal', () => {
  // jsdom has no layout: the engine measures text through a Range and draws on a canvas.
  const box = { x: 0, y: 0, top: 0, left: 0, right: 80, bottom: 20, width: 80, height: 20, toJSON() {} };
  const geometry = () => {
    Range.prototype.getBoundingClientRect = () => box as DOMRect;
    Range.prototype.getClientRects = () => [box] as unknown as DOMRectList;
  };

  it('wraps its content in a slotted element and leaves a skeleton alone while loading', () => {
    motionAllowed();
    const { container } = render(<SkeletonReveal loading data-testid="reveal"><Skeleton lines={2} /></SkeletonReveal>);
    const root = screen.getByTestId('reveal');
    expect(root).toHaveAttribute('data-slot', 'skeleton-reveal');
    expect(root).toHaveAttribute('aria-busy', 'true');
    expect(root).toHaveClass('[--ascii-skeleton:var(--muted-foreground)]');
    expect(container.querySelector('[data-ascii-skeleton]')).toBeInTheDocument();
  });

  it('keeps the real content in the DOM, readable, when loading ends', () => {
    motionAllowed();
    geometry();
    const { rerender } = render(<SkeletonReveal loading><Skeleton /></SkeletonReveal>);
    act(() => { rerender(<SkeletonReveal loading={false}><p>Ready at last</p></SkeletonReveal>); });
    expect(screen.getByText('Ready at last')).toBeInTheDocument();
  });

  it('shows content at once under reduced motion: nothing is hidden and nothing is decoded', () => {
    render(<SkeletonReveal loading data-testid="reveal"><p>Real content</p></SkeletonReveal>);
    const root = screen.getByTestId('reveal');
    expect(root).toHaveAttribute('data-reduced-motion');
    expect(root).not.toHaveAttribute('data-ar-pending');
    expect(root.querySelector('.ar-overlay')?.childElementCount ?? 0).toBe(0);
    expect(screen.getByText('Real content')).toBeVisible();
  });
});

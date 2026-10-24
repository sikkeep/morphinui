import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gsap } from 'gsap';
import { MotionProvider } from '@/registry/morphin/lib/motion';
import { Chip, ChipGroup, chipClasses, chipVariantNames, chipVariants } from '@/registry/morphin/ui/chip';

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});

afterEach(() => {
  gsap.globalTimeline.clear();
  gsap.ticker.sleep();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Chip', () => {
  it('is a plain span until it can be used, with stable slots and the Morphin shape', () => {
    render(<Chip>New</Chip>);
    const chip = screen.getByText('New').closest('[data-slot=chip]')!;
    expect(chip.tagName).toBe('SPAN');
    expect(chip).toHaveAttribute('data-variant', 'filled');
    expect(chip).toHaveAttribute('data-size', 'md');
    expect(chip).not.toHaveAttribute('data-interactive');
    expect(chip).not.toHaveAttribute('role');
    expect(chip).toHaveClass('rounded-[999px]', '[corner-shape:var(--corner-shape)]', 'bg-accent', 'h-(--chip-height)');
    expect(screen.getByText('New')).toHaveAttribute('data-slot', 'chip-label');
  });

  it('applies variants and sizes on the standard type scale, and uppercase on request', () => {
    for (const variant of chipVariantNames) expect(chipVariants({ variant })).toBeTruthy();
    expect(chipVariants({ variant: 'outline' })).toContain('border-foreground/15');
    expect(chipVariants({ size: 'sm' })).toContain('text-2xs');
    expect(chipVariants({ size: 'md' })).toContain('text-xs');
    expect(chipVariants({ size: 'lg' })).toContain('text-sm');
    expect(chipVariants({ uppercase: true })).toContain('uppercase');
    expect(chipVariants()).not.toMatch(/(^| )uppercase( |$)/);
    expect(chipClasses({ className: 'px-1' })).toContain('px-1');
  });

  it('becomes a toggle button with a click handler or selected, and reports its state', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(<Chip selected={false} onClick={onClick}>Hero</Chip>);
    const chip = screen.getByRole('button', { name: 'Hero' });
    expect(chip).toHaveAttribute('type', 'button');
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect(chip).toHaveAttribute('data-interactive');
    await user.click(chip);
    expect(onClick).toHaveBeenCalledOnce();
    rerender(<Chip selected onClick={onClick}>Hero</Chip>);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(chip).toHaveAttribute('data-selected');
    expect(chip).toHaveClass('data-selected:bg-primary', 'data-selected:text-primary-foreground');
    render(<Chip onClick={onClick}>Plain</Chip>);
    expect(screen.getByRole('button', { name: 'Plain' })).not.toHaveAttribute('aria-pressed');
  });

  it('is a link with href or render, and a selected link is the current page', () => {
    render(<>
      <Chip href="/inspo/hero" selected>Hero</Chip>
      <Chip href="/inspo/footer">Footer</Chip>
      <Chip render={<a href="/inspo/button" />}>Button</Chip>
    </>);
    expect(screen.getByRole('link', { name: 'Hero' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Footer' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Button' })).toHaveAttribute('data-slot', 'chip');
  });

  it('drops the href of a disabled link and disables a disabled button', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<><Chip href="/locked" disabled>Locked</Chip><Chip onClick={onClick} disabled>Off</Chip></>);
    const link = screen.getByRole('link', { name: 'Locked' });
    expect(link).not.toHaveAttribute('href');
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).toHaveAttribute('tabindex', '-1');
    const button = screen.getByRole('button', { name: 'Off' });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('places decorative icons before and after the label', () => {
    render(<Chip leadingIcon={<svg data-testid="lead" />} trailingIcon={<svg data-testid="trail" />}>Tag</Chip>);
    const chip = screen.getByText('Tag').closest('[data-slot=chip]')!;
    expect(chip.querySelector('[data-icon="inline-start"]')).toContainElement(screen.getByTestId('lead'));
    expect(chip.querySelector('[data-icon="inline-end"]')).toContainElement(screen.getByTestId('trail'));
    expect(chip.querySelectorAll('[aria-hidden=true]')).toHaveLength(2);
  });

  it('shimmers the label with GSAP, only while it can, and reverts the styles when it stops', () => {
    const { rerender, unmount } = render(<Chip shimmer>New</Chip>);
    const label = screen.getByText('New');
    expect(label).toHaveClass('bg-clip-text', '[-webkit-text-fill-color:transparent]');
    const tween = gsap.getTweensOf(label)[0];
    expect(tween).toBeDefined();
    tween.pause(0.5);
    expect(label.style.backgroundPosition).not.toBe('');
    rerender(<Chip>New</Chip>);
    expect(label).not.toHaveClass('bg-clip-text');
    expect(label.style.backgroundPosition).toBe('');
    unmount();
  });

  it('keeps the label still under reduced motion', () => {
    render(<MotionProvider reducedMotion="always"><Chip shimmer>New</Chip></MotionProvider>);
    const label = screen.getByText('New');
    expect(label).not.toHaveClass('bg-clip-text');
    expect(gsap.getTweensOf(label)).toHaveLength(0);
    expect(label.closest('[data-slot=chip]')).toHaveAttribute('data-reduced-motion');
  });

  it('forwards the ref and native attributes', () => {
    const ref = createRef<HTMLElement>();
    render(<Chip ref={ref} title="Added two days ago">2d ago</Chip>);
    expect(ref.current).toBe(screen.getByTitle('Added two days ago'));
  });
});

describe('ChipGroup', () => {
  it('lays chips out side by side with no gap, as a labelled group', () => {
    render(<ChipGroup aria-label="Added">
      <Chip shimmer uppercase>New</Chip>
      <Chip variant="outline" uppercase>2d ago</Chip>
    </ChipGroup>);
    const group = screen.getByRole('group', { name: 'Added' });
    expect(group).toHaveAttribute('data-slot', 'chip-group');
    expect(group).toHaveClass('inline-flex');
    expect(group).not.toHaveClass('gap-1');
    expect(group.querySelectorAll('[data-slot=chip]')).toHaveLength(2);
  });
});

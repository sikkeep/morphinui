import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardMedia, CardTitle, cardClasses } from '@/registry/morphin/ui/card';
import { MotionProvider } from '@/registry/morphin/lib/motion';

afterEach(() => vi.unstubAllGlobals());

// jsdom has no matchMedia, which the motion policy reads as "reduce".
const motionAllowed = () => vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));

describe('Card', () => {
  it('is a static div on the card surface, in the signature shape', () => {
    motionAllowed();
    render(<Card data-testid="card">Body</Card>);
    const card = screen.getByTestId('card');
    expect(card.tagName).toBe('DIV');
    expect(card).toHaveAttribute('data-slot', 'card');
    expect(card).toHaveAttribute('data-variant', 'filled');
    expect(card).toHaveAttribute('data-size', 'md');
    expect(card).not.toHaveAttribute('data-interactive');
    expect(card).toHaveClass('bg-card', 'rounded-(--card-radius)', '[corner-shape:var(--corner-shape)]', 'overflow-clip', '[--card-radius:28px]', '[--card-padding:24px]');
  });

  it('applies variants and sizes, and merges classes', () => {
    motionAllowed();
    render(<Card variant="outline" size="lg" className="w-80" data-testid="card" />);
    expect(screen.getByTestId('card')).toHaveClass('border', 'border-border', 'bg-transparent', '[--card-radius:36px]', 'w-80');
    expect(cardClasses({ size: 'xs' })).toContain('[--card-padding:12px]');
    expect(cardClasses({ size: 'xs' })).toContain('[--card-radius:16px]');
    expect(cardClasses({ size: 'sm' })).toContain('[--card-padding:16px]');
  });

  it('renders a link and turns interactive when given render, so the whole card is one link', () => {
    motionAllowed();
    render(<Card render={<a href="/pricing" />}>Pricing</Card>);
    const card = screen.getByRole('link', { name: 'Pricing' });
    expect(card).toHaveAttribute('href', '/pricing');
    expect(card).toHaveAttribute('data-interactive');
    expect(card).toHaveClass('data-interactive:cursor-pointer');
  });

  it('can be forced interactive or disabled, and keeps still under reduced motion', () => {
    motionAllowed();
    const { rerender } = render(<Card interactive disabled data-testid="card" />);
    expect(screen.getByTestId('card')).toHaveAttribute('data-interactive');
    expect(screen.getByTestId('card')).toHaveAttribute('data-disabled');
    rerender(<Card render={<button type="button" />} interactive={false} data-testid="card" />);
    expect(screen.getByTestId('card')).not.toHaveAttribute('data-interactive');
    rerender(<MotionProvider reducedMotion="always"><Card data-testid="card" /></MotionProvider>);
    expect(screen.getByTestId('card')).toHaveAttribute('data-reduced-motion');
  });

  it('forwards the ref and native attributes', () => {
    motionAllowed();
    const ref = createRef<HTMLElement>();
    render(<Card ref={ref} aria-label="Plan" id="plan" />);
    expect(ref.current).toBe(screen.getByLabelText('Plan'));
    expect(ref.current).toHaveAttribute('id', 'plan');
  });
});

describe('Card parts', () => {
  it('lays a header out with a title, a description and an action, each with a stable slot', () => {
    motionAllowed();
    render(<Card>
      <CardHeader>
        <CardTitle>Team plan</CardTitle>
        <CardDescription>For small teams</CardDescription>
        <CardAction><button type="button">Edit</button></CardAction>
      </CardHeader>
      <CardContent>Content</CardContent>
      <CardFooter>Footer</CardFooter>
    </Card>);
    expect(screen.getByRole('heading', { level: 3, name: 'Team plan' })).toHaveAttribute('data-slot', 'card-title');
    expect(screen.getByText('For small teams')).toHaveAttribute('data-slot', 'card-description');
    expect(screen.getByRole('button', { name: 'Edit' }).parentElement).toHaveAttribute('data-slot', 'card-action');
    expect(screen.getByText('Team plan').parentElement).toHaveAttribute('data-slot', 'card-header');
    expect(screen.getByText('Content')).toHaveAttribute('data-slot', 'card-content');
    expect(screen.getByText('Footer')).toHaveAttribute('data-slot', 'card-footer');
    expect(screen.getByText('Team plan').parentElement).toHaveClass('grid', 'grid-cols-[minmax(0,1fr)_auto]');
  });

  it('lets the title be another heading level', () => {
    motionAllowed();
    render(<Card><CardTitle render={<h2 />}>Plans</CardTitle></Card>);
    expect(screen.getByRole('heading', { level: 2, name: 'Plans' })).toBeInTheDocument();
  });

  it('insets media in its own rounded box, or bleeds it to the card edges', () => {
    motionAllowed();
    const { rerender } = render(<Card><CardMedia data-testid="media"><img alt="Cover" src="/c.jpg" /></CardMedia></Card>);
    const media = () => screen.getByTestId('media');
    expect(media()).toHaveAttribute('data-slot', 'card-media');
    expect(media()).not.toHaveAttribute('data-bleed');
    expect(media()).toHaveClass('rounded-[20px]', '[corner-shape:var(--corner-shape)]', 'overflow-clip');
    rerender(<Card><CardMedia bleed data-testid="media"><img alt="Cover" src="/c.jpg" /></CardMedia></Card>);
    expect(media()).toHaveAttribute('data-bleed');
    expect(media()).toHaveClass('-mx-(--card-padding)', 'rounded-none', 'first:-mt-(--card-padding)', 'last:-mb-(--card-padding)');
    expect(media()).not.toHaveClass('rounded-[20px]');
  });
});

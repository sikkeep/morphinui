import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge, badgeClasses, badgeVariants, badgeVariantNames } from '@/registry/morphin/ui/badge';

describe('Badge', () => {
  it('renders its content in a static, non-interactive span with stable slots', () => {
    render(<Badge>152</Badge>);
    const badge = screen.getByText('152');
    expect(badge.tagName).toBe('SPAN');
    expect(badge).toHaveAttribute('data-slot', 'badge');
    expect(badge).toHaveAttribute('data-variant', 'neutral');
    expect(badge).toHaveAttribute('data-size', 'md');
    expect(badge).not.toHaveAttribute('tabindex');
    expect(badge).not.toHaveAttribute('role');
  });

  it('keeps the Morphin shape, tabular digits and a circle for one digit', () => {
    render(<Badge>3</Badge>);
    expect(screen.getByText('3')).toHaveClass('rounded-[999px]', '[corner-shape:var(--corner-shape)]', 'tabular-nums', 'h-(--badge-height)', 'min-w-(--badge-height)');
  });

  it('applies every variant and size from the recipe, on the standard type scale', () => {
    for (const variant of badgeVariantNames) expect(badgeVariants({ variant })).toBeTruthy();
    expect(badgeVariants({ variant: 'primary' })).toContain('bg-primary');
    expect(badgeVariants({ variant: 'success' })).toContain('text-success');
    expect(badgeVariants({ variant: 'outline' })).toContain('border-border');
    expect(badgeVariants({ size: 'sm' })).toContain('text-2xs');
    expect(badgeVariants({ size: 'md' })).toContain('text-xs');
    expect(badgeVariants({ size: 'lg' })).toContain('text-sm');
  });

  it('merges consumer classes over the recipe', () => {
    render(<Badge variant="primary" className="bg-info">New</Badge>);
    const badge = screen.getByText('New');
    expect(badge).toHaveClass('bg-info');
    expect(badge).not.toHaveClass('bg-primary');
    expect(badgeClasses({ className: 'px-4' })).toContain('px-4');
  });

  it('places a decorative dot and icons, hidden from assistive technology', () => {
    render(<Badge dot leadingIcon={<svg data-testid="lead" />} trailingIcon={<svg data-testid="trail" />}>Online</Badge>);
    const badge = screen.getByText('Online');
    const dot = badge.querySelector('[data-slot=badge-dot]')!;
    expect(dot).toHaveAttribute('aria-hidden', 'true');
    expect(dot).toHaveClass('bg-current');
    expect(badge.querySelector('[data-icon="inline-start"] [data-testid=lead]')).toBeInTheDocument();
    expect(badge.querySelector('[data-icon="inline-end"] [data-testid=trail]')).toBeInTheDocument();
    expect(badge.querySelectorAll('[aria-hidden=true]')).toHaveLength(3);
  });

  it('forwards native attributes and the ref, and renders another element through render', () => {
    const ref = createRef<HTMLElement>();
    render(<><Badge ref={ref} aria-label="3 unread messages" title="Inbox">3</Badge><Badge render={<a href="/inbox" />}>Inbox</Badge></>);
    expect(ref.current).toBe(screen.getByLabelText('3 unread messages'));
    expect(ref.current).toHaveAttribute('title', 'Inbox');
    const link = screen.getByRole('link', { name: 'Inbox' });
    expect(link).toHaveAttribute('href', '/inbox');
    expect(link).toHaveAttribute('data-slot', 'badge');
  });
});

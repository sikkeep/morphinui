import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Avatar, AvatarGroup, getInitials, avatarStatuses } from '@/registry/morphin/ui/avatar';
import { MotionProvider } from '@/registry/morphin/lib/motion';

afterEach(() => vi.unstubAllGlobals());

// jsdom has no matchMedia, which the motion policy reads as "reduce".
const motionAllowed = () => vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));

describe('getInitials', () => {
  it('takes the first letter of the first and the last word', () => {
    expect(getInitials('Elena Voss')).toBe('EV');
    expect(getInitials('  ada   king  lovelace ')).toBe('AL');
    expect(getInitials('Madonna')).toBe('M');
    expect(getInitials('')).toBe('');
    expect(getInitials('😀 Smile')).toBe('😀S');
  });
});

describe('Avatar', () => {
  it('is one named image with the signature shape, showing initials behind a picture', () => {
    motionAllowed();
    render(<Avatar name="Elena Voss" src="/elena.jpg" />);
    const avatar = screen.getByRole('img', { name: 'Elena Voss' });
    expect(avatar).toHaveAttribute('data-slot', 'avatar');
    expect(avatar).toHaveAttribute('data-size', 'md');
    expect(avatar).toHaveAttribute('data-shape', 'circle');
    expect(avatar).toHaveClass('rounded-[999px]', '[corner-shape:var(--corner-shape)]', '[--avatar-size:40px]', 'size-(--avatar-size)');
    // The picture has not loaded (jsdom never loads one), so the initials show.
    expect(screen.getByText('EV')).toBeInTheDocument();
    expect(avatar.querySelector('[data-slot=avatar-surface]')).toHaveClass('overflow-clip', '[corner-shape:inherit]');
  });

  it('names itself from alt before name, and is decorative with neither', () => {
    motionAllowed();
    const { rerender } = render(<Avatar name="Elena Voss" alt="Elena at work" />);
    expect(screen.getByRole('img', { name: 'Elena at work' })).toBeInTheDocument();
    rerender(<Avatar fallback={<span data-testid="icon">i</span>} data-testid="decor" />);
    expect(screen.getByTestId('decor')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('shows a person icon when it has nothing else to show', () => {
    motionAllowed();
    const { container } = render(<Avatar data-testid="empty" />);
    expect(container.querySelector('[data-slot=avatar-fallback] svg')).toBeInTheDocument();
  });

  it('puts the status in the accessible name and draws a dot in the surface ring', () => {
    motionAllowed();
    const { rerender } = render(<Avatar name="Elena Voss" status="online" />);
    expect(screen.getByRole('img', { name: 'Elena Voss, online' })).toHaveAttribute('data-status', 'online');
    const dot = document.querySelector('[data-slot=avatar-status]')!;
    expect(dot).toHaveAttribute('aria-hidden', 'true');
    expect(dot).toHaveClass('bg-success', 'ring-[color:var(--avatar-ring,var(--background))]', 'size-(--avatar-dot)');
    rerender(<Avatar name="Elena Voss" status="busy" statusLabel="Ocupada" />);
    expect(screen.getByRole('img', { name: 'Elena Voss, Ocupada' })).toBeInTheDocument();
    for (const status of avatarStatuses) {
      rerender(<Avatar name="E" status={status} />);
      expect(document.querySelector('[data-slot=avatar-status]')).toHaveAttribute('data-status', status);
    }
  });

  it('applies sizes and the square shape, and merges classes', () => {
    motionAllowed();
    render(<Avatar name="E" size="2xl" shape="square" className="ring-1" data-testid="a" />);
    const avatar = screen.getByTestId('a');
    expect(avatar).toHaveClass('[--avatar-size:96px]', 'rounded-[28%]', '[corner-shape:var(--corner-shape)]', 'ring-1', 'text-3xl');
  });

  it('keeps the picture still under reduced motion', () => {
    render(<Avatar name="E" src="/e.jpg" data-testid="a" />);
    expect(screen.getByTestId('a')).toHaveAttribute('data-reduced-motion');
  });
});

describe('AvatarGroup', () => {
  const team = ['Elena Voss', 'Marcus Chen', 'Ada Lovelace', 'Alan Turing', 'Grace Hopper'];

  it('is a named group whose items take its size and shape and overlap in a ring', () => {
    motionAllowed();
    render(<AvatarGroup aria-label="Team" size="lg" shape="square">
      {team.slice(0, 3).map(name => <Avatar key={name} name={name} />)}
    </AvatarGroup>);
    const group = screen.getByRole('group', { name: 'Team' });
    expect(group).toHaveAttribute('data-slot', 'avatar-group');
    expect(group).toHaveClass('[--avatar-size:48px]', '[&>*:not(:first-child)]:-ms-[calc(var(--avatar-size)*0.28)]', '[&>*]:ring-[color:var(--avatar-ring,var(--background))]');
    for (const avatar of screen.getAllByRole('img')) {
      expect(avatar).toHaveAttribute('data-size', 'lg');
      expect(avatar).toHaveAttribute('data-shape', 'square');
    }
  });

  it('lets an item keep its own size', () => {
    motionAllowed();
    render(<AvatarGroup size="lg"><Avatar name="Elena Voss" size="xs" /></AvatarGroup>);
    expect(screen.getByRole('img', { name: 'Elena Voss' })).toHaveAttribute('data-size', 'xs');
  });

  it('shows at most max avatars and counts the rest', () => {
    motionAllowed();
    render(<AvatarGroup max={3} aria-label="Team">
      {team.map(name => <Avatar key={name} name={name} />)}
    </AvatarGroup>);
    expect(screen.getAllByRole('img').filter(item => item.getAttribute('data-slot') === 'avatar')).toHaveLength(3);
    const count = screen.getByRole('img', { name: 'and 2 more' });
    expect(count).toHaveAttribute('data-slot', 'avatar-group-count');
    expect(count).toHaveTextContent('+2');
    expect(count).toHaveClass('[corner-shape:var(--corner-shape)]', 'rounded-[999px]');
  });

  it('draws no count when everyone fits, and takes the count words from the caller', () => {
    motionAllowed();
    const { rerender } = render(<AvatarGroup max={9}>{team.map(name => <Avatar key={name} name={name} />)}</AvatarGroup>);
    expect(document.querySelector('[data-slot=avatar-group-count]')).toBeNull();
    rerender(<AvatarGroup max={1} countLabel={hidden => `y ${hidden} más`}>{team.map(name => <Avatar key={name} name={name} />)}</AvatarGroup>);
    expect(screen.getByRole('img', { name: 'y 4 más' })).toBeInTheDocument();
  });

  it('lifts the hovered item, and stands still under reduced motion', () => {
    motionAllowed();
    const { unmount } = render(<AvatarGroup data-testid="g"><Avatar name="Elena Voss" /></AvatarGroup>);
    expect(screen.getByTestId('g')).toHaveClass('[&>*:hover]:-translate-y-0.5');
    unmount();
    render(<MotionProvider reducedMotion="always"><AvatarGroup data-testid="g"><Avatar name="Elena Voss" /></AvatarGroup></MotionProvider>);
    expect(screen.getByTestId('g')).not.toHaveClass('[&>*:hover]:-translate-y-0.5');
    expect(screen.getByTestId('g')).toHaveAttribute('data-reduced-motion');
  });
});

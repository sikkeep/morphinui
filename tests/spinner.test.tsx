import { render, screen } from '@testing-library/react';
import { Ring } from 'loading-dev';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionProvider } from '@/registry/morphin/lib/motion';
import { Spinner } from '@/registry/morphin/ui/spinner';

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});

afterEach(() => vi.unstubAllGlobals());

const loader = () => document.querySelector<HTMLElement>('[data-slot=spinner] > [class^=ld-]')!;

describe('Spinner', () => {
  it('is a decorative Atom at the md size by default', () => {
    render(<Spinner />);
    expect(document.querySelector('[data-slot=spinner]')).toHaveAttribute('aria-hidden', 'true');
    expect(loader()).toHaveClass('ld-atom');
    expect(loader().style.getPropertyValue('--ld-size')).toBe('20px');
    expect(loader().style.getPropertyValue('--ld-play-state')).toBe('running');
  });

  it('announces a label as a status', () => {
    render(<Spinner label="Loading projects" size="xl" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading projects');
    expect(loader().style.getPropertyValue('--ld-size')).toBe('32px');
  });

  it('renders any loading-dev spinner at a pixel size and pauses under reduced motion', () => {
    render(<MotionProvider reducedMotion="always"><Spinner loader={Ring} size={14} duration={600} /></MotionProvider>);
    expect(loader()).toHaveClass('ld-ring');
    expect(loader().style.getPropertyValue('--ld-size')).toBe('14px');
    expect(loader().style.getPropertyValue('--ld-duration')).toBe('600ms');
    expect(loader().style.getPropertyValue('--ld-play-state')).toBe('paused');
  });
});

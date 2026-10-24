import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Radio, RadioCard, RadioDot, RadioGroup } from '@/registry/morphin/ui/radio';
import { MotionProvider } from '@/registry/morphin/lib/motion';

afterEach(() => vi.unstubAllGlobals());

// jsdom has no matchMedia, which the motion policy reads as "reduce".
const motionAllowed = () => vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));

function Plans(props: Partial<React.ComponentProps<typeof RadioGroup>>) {
  return <RadioGroup legend="Plan" defaultValue="pro" {...props}>
    <Radio value="free" label="Free" description="For trying things out." />
    <Radio value="pro" label="Pro" />
    <Radio value="max" label="Max" />
  </RadioGroup>;
}

describe('Radio', () => {
  it('is a round choice in the signature shape, on the field color', () => {
    motionAllowed();
    render(<RadioGroup aria-label="Plan"><Radio value="free" aria-label="Free" /></RadioGroup>);
    const radio = screen.getByRole('radio', { name: 'Free' });
    expect(radio).toHaveAttribute('data-slot', 'radio');
    expect(radio).toHaveAttribute('data-size', 'md');
    expect(radio).toHaveClass('rounded-[999px]', '[corner-shape:var(--corner-shape)]', 'bg-field', 'border-input', '[--choice-size:16px]', '[--choice-dot:6px]');
  });

  it('is a radio group named by its legend, with exactly one choice', async () => {
    motionAllowed();
    const user = userEvent.setup();
    render(<Plans />);
    expect(screen.getByRole('radiogroup', { name: 'Plan' })).toHaveAttribute('data-slot', 'radio-group');
    expect(screen.getByRole('radio', { name: 'Pro' })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('radio', { name: 'Max' }));
    expect(screen.getByRole('radio', { name: 'Max' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Pro' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getAllByRole('radio').filter(radio => radio.getAttribute('aria-checked') === 'true')).toHaveLength(1);
  });

  it('moves the choice with the arrow keys, as one tab stop', async () => {
    motionAllowed();
    const user = userEvent.setup();
    render(<><button type="button">Before</button><Plans /><button type="button">After</button></>);
    await user.tab();
    await user.tab();
    expect(screen.getByRole('radio', { name: 'Pro' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: 'Max' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'Max' })).toHaveAttribute('aria-checked', 'true');
    await user.tab();
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
  });

  it('can be controlled, and tells its owner the new value', async () => {
    motionAllowed();
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState('free');
      return <><Plans value={value} onValueChange={next => setValue(String(next))} /><output>{value}</output></>;
    }
    render(<Controlled />);
    await user.click(screen.getByRole('radio', { name: 'Max' }));
    expect(screen.getByRole('status')).toHaveTextContent('max');
  });

  it('shows a dot that scales in on the checked state, in its own slot', () => {
    motionAllowed();
    const { container } = render(<Plans />);
    const dot = container.querySelector('[data-slot=radio-dot]') as HTMLElement;
    expect(dot).toHaveAttribute('aria-hidden', 'true');
    expect(dot).toHaveClass('scale-50', 'opacity-0', 'duration-150', 'group-data-checked/radio:scale-100', 'group-data-checked/radio:opacity-100');
    expect(container.querySelectorAll('[data-slot=radio-indicator]')).toHaveLength(3);
  });

  it('puts a label and a description in one clickable row, named and described', async () => {
    motionAllowed();
    const user = userEvent.setup();
    render(<Plans defaultValue="max" />);
    const free = screen.getByRole('radio', { name: 'Free' });
    expect(free).toHaveAccessibleDescription('For trying things out.');
    await user.click(screen.getByText('For trying things out.'));
    expect(free).toHaveAttribute('aria-checked', 'true');
  });

  it('gives its radios its size, lets one keep its own, and lays out horizontally', () => {
    motionAllowed();
    const { container } = render(<RadioGroup legend="Size" size="sm" orientation="horizontal" defaultValue="a">
      <Radio value="a" label="A" />
      <Radio value="b" label="B" size="md" />
    </RadioGroup>);
    expect(screen.getByRole('radio', { name: 'A' })).toHaveAttribute('data-size', 'sm');
    expect(screen.getByRole('radio', { name: 'B' })).toHaveAttribute('data-size', 'md');
    expect(container.querySelector('[data-slot=radio-group-items]')).toHaveClass('flex-row');
  });

  it('is inert when disabled, and submits its value in a form', async () => {
    motionAllowed();
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); return Object.fromEntries(new FormData(event.currentTarget)); });
    render(<form onSubmit={onSubmit}>
      <RadioGroup name="plan" aria-label="Plan" defaultValue="pro">
        <Radio value="pro" aria-label="Pro" />
        <Radio value="max" aria-label="Max" disabled />
      </RadioGroup>
      <button type="submit">Send</button>
    </form>);
    const max = screen.getByRole('radio', { name: 'Max' });
    expect(max).toHaveAttribute('data-disabled');
    await user.click(max);
    expect(max).toHaveAttribute('aria-checked', 'false');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(onSubmit.mock.results[0].value).toEqual({ plan: 'pro' });
  });

  it('stands still under reduced motion, and forwards the ref', () => {
    const ref = createRef<HTMLElement>();
    render(<MotionProvider reducedMotion="always"><RadioGroup aria-label="Plan"><Radio ref={ref} value="a" aria-label="A" /></RadioGroup></MotionProvider>);
    expect(ref.current).toBe(screen.getByRole('radio', { name: 'A' }));
    expect(ref.current).toHaveAttribute('data-reduced-motion');
  });
});

describe('RadioCard', () => {
  it('is one big click target in a group, with a title and a description', async () => {
    motionAllowed();
    const user = userEvent.setup();
    const { container } = render(<RadioGroup legend="Plan" defaultValue="pro">
      <RadioCard value="starter" title="Starter" description="For side projects." />
      <RadioCard value="pro" title="Pro" description="For growing teams." />
      <RadioCard value="enterprise" title="Enterprise" disabled />
    </RadioGroup>);
    const starter = screen.getByRole('radio', { name: 'Starter' });
    expect(starter).toHaveAccessibleDescription('For side projects.');
    expect(screen.getByRole('radio', { name: 'Pro' })).toHaveAttribute('aria-checked', 'true');
    const card = container.querySelector('[data-slot=radio-field]') as HTMLElement;
    expect(card).toHaveClass('bg-card', 'rounded-[20px]', '[corner-shape:var(--corner-shape)]', 'not-has-data-disabled:hover:bg-accent', 'has-data-checked:border-primary');
    await user.click(screen.getByText('For side projects.'));
    expect(starter).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Pro' })).toHaveAttribute('aria-checked', 'false');
    await user.click(screen.getByRole('radio', { name: 'Enterprise' }));
    expect(screen.getByRole('radio', { name: 'Enterprise' })).toHaveAttribute('aria-checked', 'false');
  });
});

describe('RadioDot', () => {
  it('is the bare circle and dot for a menu row: no role, hidden, and driven by selected', () => {
    motionAllowed();
    const { rerender } = render(<RadioDot data-testid="dot" selected />);
    const dot = screen.getByTestId('dot');
    expect(dot).toHaveAttribute('data-slot', 'radio-dot-glyph');
    expect(dot).toHaveAttribute('aria-hidden', 'true');
    expect(dot).toHaveAttribute('data-checked');
    expect(dot).toHaveClass('rounded-[999px]', '[corner-shape:var(--corner-shape)]', 'group/radio', '[--choice-size:16px]');
    expect(dot.querySelector('[data-slot=radio-dot]')).toHaveClass('group-data-checked/radio:scale-100');
    expect(screen.queryByRole('radio')).toBeNull();
    rerender(<RadioDot data-testid="dot" size="sm" />);
    expect(screen.getByTestId('dot')).toHaveAttribute('data-unchecked');
    expect(screen.getByTestId('dot')).not.toHaveAttribute('data-checked');
    expect(screen.getByTestId('dot')).toHaveClass('[--choice-size:14px]');
  });
});

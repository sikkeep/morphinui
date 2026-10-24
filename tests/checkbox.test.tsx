import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Checkbox, CheckboxCard, CheckboxGroup } from '@/registry/morphin/ui/checkbox';
import { MotionProvider } from '@/registry/morphin/lib/motion';

afterEach(() => vi.unstubAllGlobals());

// jsdom has no matchMedia, which the motion policy reads as "reduce".
const motionAllowed = () => vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));

describe('Checkbox', () => {
  it('is a named checkbox in the signature shape, on the field color', () => {
    motionAllowed();
    render(<Checkbox aria-label="Accept" />);
    const box = screen.getByRole('checkbox', { name: 'Accept' });
    expect(box).toHaveAttribute('data-slot', 'checkbox');
    expect(box).toHaveAttribute('data-size', 'md');
    expect(box).toHaveAttribute('aria-checked', 'false');
    expect(box).toHaveClass('rounded-(--choice-radius)', '[corner-shape:var(--corner-shape)]', 'bg-field', 'border-input', '[--choice-size:16px]', 'size-(--choice-size)');
  });

  it('toggles with the pointer and the Space key, and tells its owner', async () => {
    motionAllowed();
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Accept" onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole('checkbox', { name: 'Accept' });
    await user.click(box);
    expect(box).toHaveAttribute('aria-checked', 'true');
    expect(box).toHaveAttribute('data-checked');
    expect(onCheckedChange).toHaveBeenLastCalledWith(true, expect.anything());
    box.focus();
    await user.keyboard(' ');
    expect(box).toHaveAttribute('aria-checked', 'false');
    expect(box).toHaveAttribute('data-unchecked');
  });

  it('draws a tick and a dash as strokes that the CSS reveals, each with its own path length', () => {
    motionAllowed();
    const { container } = render(<Checkbox aria-label="Accept" defaultChecked />);
    const check = container.querySelector('[data-icon=check]') as SVGElement;
    const minus = container.querySelector('[data-icon=minus]') as SVGElement;
    expect(check).toBeInTheDocument();
    expect(minus).toBeInTheDocument();
    expect(check.style.getPropertyValue('--check-len')).toBe('23');
    expect(minus.style.getPropertyValue('--check-len')).toBe('14');
    expect(check).toHaveAttribute('aria-hidden', 'true');
    const box = screen.getByRole('checkbox');
    // The 150 ms box fill, the 350 ms draw and the 150 ms undraw.
    expect(box).toHaveClass('duration-150', '[&[data-checked]:not([data-indeterminate])_[data-icon=check]_path]:duration-350');
  });

  it('shows a dash when indeterminate', () => {
    motionAllowed();
    render(<Checkbox aria-label="Some" indeterminate />);
    const box = screen.getByRole('checkbox', { name: 'Some' });
    expect(box).toHaveAttribute('aria-checked', 'mixed');
    expect(box).toHaveAttribute('data-indeterminate');
    expect(box).toHaveClass('data-indeterminate:bg-primary', '[&[data-indeterminate]_[data-icon=minus]_path]:[stroke-dashoffset:0]');
  });

  it('puts a label and a description in one clickable row, named and described', async () => {
    motionAllowed();
    const user = userEvent.setup();
    render(<Checkbox label="Email me updates" description="One message a week." />);
    const box = screen.getByRole('checkbox', { name: 'Email me updates' });
    expect(box).toHaveAccessibleDescription('One message a week.');
    expect(screen.getByText('Email me updates').closest('label')).toHaveAttribute('data-slot', 'checkbox-field');
    await user.click(screen.getByText('One message a week.'));
    expect(box).toHaveAttribute('aria-checked', 'true');
  });

  it('can put the label first, and takes the small size', () => {
    motionAllowed();
    const { container } = render(<Checkbox label="Remember me" labelPosition="start" size="sm" />);
    const row = container.querySelector('[data-slot=checkbox-field]') as HTMLElement;
    expect(row).toHaveClass('justify-between');
    expect(row.firstElementChild).toHaveAttribute('data-slot', 'checkbox-content');
    expect(screen.getByRole('checkbox')).toHaveClass('[--choice-size:14px]', '[--choice-line:16px]');
    expect(screen.getByText('Remember me')).toHaveClass('text-xs');
    // The box sits in a cell as tall as the label's line, with the size variables set on the cell too.
    expect(screen.getByRole('checkbox').parentElement).toHaveClass('h-(--choice-line)', '[--choice-line:16px]');
  });

  it('is inert when disabled or read-only, and submits its value in a form', async () => {
    motionAllowed();
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); return Object.fromEntries(new FormData(event.currentTarget)); });
    const { container } = render(<form onSubmit={onSubmit}>
      <Checkbox aria-label="Newsletter" name="newsletter" value="yes" defaultChecked />
      <Checkbox aria-label="Locked" name="locked" disabled />
      <button type="submit">Send</button>
    </form>);
    const locked = screen.getByRole('checkbox', { name: 'Locked' });
    expect(locked).toHaveAttribute('data-disabled');
    await user.click(locked);
    expect(locked).toHaveAttribute('aria-checked', 'false');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(onSubmit).toHaveBeenCalled();
    expect(onSubmit.mock.results[0].value).toEqual({ newsletter: 'yes' });
    expect(container.querySelector('input[type=checkbox][name=newsletter]')).toBeInTheDocument();
  });

  it('stands still under reduced motion, and forwards the ref', () => {
    const ref = createRef<HTMLElement>();
    render(<MotionProvider reducedMotion="always"><Checkbox ref={ref} aria-label="Still" /></MotionProvider>);
    expect(ref.current).toBe(screen.getByRole('checkbox', { name: 'Still' }));
    expect(ref.current).toHaveAttribute('data-reduced-motion');
  });
});

describe('CheckboxGroup', () => {
  it('shares one value among its checkboxes, named by its legend', async () => {
    motionAllowed();
    const user = userEvent.setup();
    function Group() {
      const [value, setValue] = useState<string[]>(['fuji']);
      return <>
        <CheckboxGroup legend="Apples" value={value} onValueChange={setValue}>
          <Checkbox value="fuji" label="Fuji" />
          <Checkbox value="gala" label="Gala" />
        </CheckboxGroup>
        <output>{value.join(',')}</output>
      </>;
    }
    render(<Group />);
    expect(screen.getByRole('group', { name: 'Apples' })).toHaveAttribute('data-slot', 'checkbox-group');
    expect(screen.getByRole('checkbox', { name: 'Fuji' })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('checkbox', { name: 'Gala' }));
    expect(screen.getByRole('status')).toHaveTextContent('fuji,gala');
    await user.click(screen.getByRole('checkbox', { name: 'Fuji' }));
    expect(screen.getByRole('status')).toHaveTextContent('gala');
  });

  it('gives its checkboxes its size, lets one keep its own, and lays out horizontally', () => {
    motionAllowed();
    const { container } = render(<CheckboxGroup legend="Sizes" size="sm" orientation="horizontal">
      <Checkbox value="a" label="A" />
      <Checkbox value="b" label="B" size="md" />
    </CheckboxGroup>);
    expect(screen.getByRole('checkbox', { name: 'A' })).toHaveAttribute('data-size', 'sm');
    expect(screen.getByRole('checkbox', { name: 'B' })).toHaveAttribute('data-size', 'md');
    expect(container.querySelector('[data-slot=checkbox-group-items]')).toHaveClass('flex-row');
  });

  it('has a parent checkbox that selects all and shows a dash for some', async () => {
    motionAllowed();
    const user = userEvent.setup();
    render(<CheckboxGroup legend="Fruit" allValues={['apple', 'pear']} defaultValue={['apple']}>
      <Checkbox parent label="All fruit" />
      <Checkbox value="apple" label="Apple" />
      <Checkbox value="pear" label="Pear" />
    </CheckboxGroup>);
    const all = screen.getByRole('checkbox', { name: 'All fruit' });
    expect(all).toHaveAttribute('aria-checked', 'mixed');
    await user.click(all);
    expect(screen.getByRole('checkbox', { name: 'Apple' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('checkbox', { name: 'Pear' })).toHaveAttribute('aria-checked', 'true');
    expect(all).toHaveAttribute('aria-checked', 'true');
    await user.click(all);
    expect(screen.getByRole('checkbox', { name: 'Pear' })).toHaveAttribute('aria-checked', 'false');
  });
});

describe('CheckboxCard', () => {
  it('is one big click target with a title and a description, on a solid surface', async () => {
    motionAllowed();
    const user = userEvent.setup();
    const { container } = render(<CheckboxCard title="Team plan" description="Up to ten seats." />);
    const box = screen.getByRole('checkbox', { name: 'Team plan' });
    expect(box).toHaveAccessibleDescription('Up to ten seats.');
    const card = container.querySelector('[data-slot=checkbox-field]') as HTMLElement;
    expect(card).toHaveClass('bg-card', 'rounded-[20px]', '[corner-shape:var(--corner-shape)]', 'not-has-data-disabled:hover:bg-accent', 'has-data-checked:border-primary');
    await user.click(screen.getByText('Up to ten seats.'));
    expect(box).toHaveAttribute('aria-checked', 'true');
  });

  it('works without a description, and takes the box props', async () => {
    motionAllowed();
    const onCheckedChange = vi.fn();
    render(<CheckboxCard title="No description" defaultChecked disabled onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole('checkbox', { name: 'No description' });
    expect(box).toHaveAttribute('aria-checked', 'true');
    expect(box).toHaveAttribute('data-disabled');
    expect(document.querySelector('[data-slot=checkbox-description]')).toBeNull();
  });

  it('sits in a group, and keeps the group value', async () => {
    motionAllowed();
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<CheckboxGroup legend="Plans" onValueChange={onValueChange}>
      <CheckboxCard value="a" title="A" />
      <CheckboxCard value="b" title="B" />
    </CheckboxGroup>);
    await user.click(screen.getByText('B'));
    expect(onValueChange).toHaveBeenLastCalledWith(['b'], expect.anything());
  });
});

import { useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { gsap } from 'gsap';
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectSeparator,
} from '@/registry/morphin/ui/select';
import { MotionProvider } from '@/registry/morphin/lib/motion';

afterEach(() => {
  gsap.globalTimeline.clear();
  gsap.ticker.sleep();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mockLayout() {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  // jsdom has no layout; give the options real geometry for the highlight.
  vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (this: HTMLElement) {
    return ({ Apple: 4, Banana: 40, Cherry: 76 } as Record<string, number>)[this.textContent?.replace('✓', '').trim() as string] ?? 0;
  });
  vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockReturnValue(4);
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(200);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(36);
  vi.spyOn(HTMLElement.prototype, 'offsetParent', 'get').mockImplementation(function (this: HTMLElement) {
    return this.parentElement?.closest<HTMLElement>('[data-highlight-scope]') ?? null;
  });
}

function Fruits(props: Partial<React.ComponentProps<typeof Select>> & { placeholder?: string; invalid?: boolean }) {
  const { placeholder, invalid, ...root } = props;
  return <Select {...root}>
    <SelectTrigger aria-label="Fruit" placeholder={placeholder} aria-invalid={invalid || undefined} />
    <SelectContent>
      <SelectItem value="apple">Apple</SelectItem>
      <SelectItem value="banana">Banana</SelectItem>
      <SelectItem value="cherry" disabled>Cherry</SelectItem>
    </SelectContent>
  </Select>;
}

describe('Select', () => {
  it('opens with the mouse, chooses an option and shows it in the trigger', async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<Fruits placeholder="Pick a fruit" onValueChange={onValueChange} />);
    const trigger = screen.getByRole('combobox', { name: 'Fruit' });
    expect(trigger).toHaveTextContent('Pick a fruit');
    expect(trigger).toHaveAttribute('data-placeholder');
    await user.click(trigger);
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Banana' }));
    expect(onValueChange).toHaveBeenCalledWith('banana', expect.anything());
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(trigger).toHaveTextContent('Banana');
    expect(trigger).not.toHaveAttribute('data-placeholder');
  });

  it('is operable with the keyboard and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<Fruits defaultValue="apple" />);
    const trigger = screen.getByRole('combobox', { name: 'Fruit' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    await screen.findByRole('listbox');
    await user.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(trigger).toHaveTextContent('Banana'));
    await waitFor(() => expect(trigger).toHaveFocus());

    await user.keyboard('{ArrowDown}');
    await screen.findByRole('listbox');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('skips disabled options and supports type-ahead', async () => {
    const user = userEvent.setup();
    render(<Fruits defaultValue="apple" />);
    await user.click(screen.getByRole('combobox', { name: 'Fruit' }));
    await screen.findByRole('listbox');
    expect(screen.getByRole('option', { name: 'Cherry' })).toHaveAttribute('aria-disabled', 'true');
    await user.keyboard('ban');
    await waitFor(() => expect(screen.getByRole('option', { name: 'Banana' })).toHaveAttribute('data-highlighted'));
  });

  it('takes part in forms through name, defaultValue and required', async () => {
    const user = userEvent.setup();
    const { container } = render(<form><Fruits name="fruit" defaultValue="apple" /><Fruits name="other" required /></form>);
    const form = container.querySelector('form')!;
    expect(new FormData(form).get('fruit')).toBe('apple');
    expect(form.checkValidity()).toBe(false);

    await user.click(screen.getAllByRole('combobox', { name: 'Fruit' })[0]);
    await user.click(await screen.findByRole('option', { name: 'Banana' }));
    await waitFor(() => expect(new FormData(form).get('fruit')).toBe('banana'));

    await user.click(screen.getAllByRole('combobox', { name: 'Fruit' })[1]);
    await user.click(await screen.findByRole('option', { name: 'Apple' }));
    await waitFor(() => expect(form.checkValidity()).toBe(true));
  });

  it('reflects invalid and disabled states on the trigger', () => {
    const { rerender } = render(<Fruits invalid />);
    const trigger = screen.getByRole('combobox', { name: 'Fruit' });
    expect(trigger).toHaveAttribute('aria-invalid', 'true');
    expect(trigger).toHaveClass('aria-invalid:border-destructive');
    rerender(<Fruits disabled />);
    expect(screen.getByRole('combobox', { name: 'Fruit' })).toHaveAttribute('data-disabled');
  });

  it('works as a controlled select and renders groups, labels and separators', async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState('a');
      return <><Select value={value} onValueChange={next => setValue(next as string)}>
        <SelectTrigger aria-label="Letter" leadingIcon={<svg data-testid="icon" />} />
        <SelectContent>
          <SelectGroup><SelectLabel>First</SelectLabel><SelectItem value="a">A</SelectItem></SelectGroup>
          <SelectSeparator />
          <SelectGroup><SelectLabel>Second</SelectLabel><SelectItem value="b" description="Second letter">B</SelectItem></SelectGroup>
        </SelectContent>
      </Select><output>{value}</output></>;
    }
    render(<Controlled />);
    const trigger = screen.getByRole('combobox', { name: 'Letter' });
    expect(screen.getByTestId('icon').closest('[data-icon="inline-start"]')).toBeInTheDocument();
    await user.click(trigger);
    expect(await screen.findByRole('group', { name: 'First' })).toHaveAttribute('data-slot', 'select-group');
    expect(screen.getByText('Second letter')).toBeInTheDocument();
    expect(document.querySelector('[data-slot="select-separator"]')).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: /^B/ }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('b'));
  });

  it('does not lock page scroll by default', async () => {
    const user = userEvent.setup();
    render(<Fruits />);
    await user.click(screen.getByRole('combobox', { name: 'Fruit' }));
    await screen.findByRole('listbox');
    expect(document.documentElement.style.overflowY).not.toBe('hidden');
  });

  it('slides one highlight between options and returns to the selection', async () => {
    mockLayout();
    const user = userEvent.setup();
    render(<Fruits defaultValue="apple" />);
    await user.click(screen.getByRole('combobox', { name: 'Fruit' }));
    const popup = await screen.findByRole('listbox').then(list => list.closest<HTMLElement>('[data-slot="select-content"]')!);
    expect(popup).toHaveAttribute('data-moving-highlight');
    const surface = popup.querySelector<HTMLElement>('[data-slot="dropdown-highlight"]')!;
    expect(surface.parentElement).toBe(popup);

    await user.hover(screen.getByRole('option', { name: 'Banana' }));
    await waitFor(() => expect(gsap.getTweensOf(surface).length).toBeGreaterThan(0));
    act(() => { gsap.getTweensOf(surface)[0].progress(1); });
    expect(Number(gsap.getProperty(surface, 'y'))).toBe(40);

    await user.unhover(popup);
    await waitFor(() => expect(gsap.getTweensOf(surface).length).toBeGreaterThan(0));
    act(() => { gsap.getTweensOf(surface)[0].progress(1); });
    // Back on the selected option.
    expect(Number(gsap.getProperty(surface, 'y'))).toBe(4);
  });

  it('drops the moving highlight when motion is reduced', async () => {
    const user = userEvent.setup();
    render(<MotionProvider reducedMotion="always"><Fruits defaultValue="apple" /></MotionProvider>);
    await user.click(screen.getByRole('combobox', { name: 'Fruit' }));
    const popup = (await screen.findByRole('listbox')).closest<HTMLElement>('[data-slot="select-content"]')!;
    expect(popup).toHaveAttribute('data-reduced-motion', 'true');
    expect(popup).not.toHaveAttribute('data-moving-highlight');
    expect(popup.querySelector('[data-slot="dropdown-highlight"]')).toBeNull();
    expect(screen.getByRole('option', { name: 'Apple' })).toHaveClass('data-highlighted:bg-accent');
  });

  it('shows item labels in the trigger while closed, and lets explicit items win', () => {
    const { rerender } = render(<Fruits defaultValue="banana" />);
    // The label comes from the SelectItem, not the raw value.
    expect(screen.getByRole('combobox', { name: 'Fruit' })).toHaveTextContent('Banana');
    rerender(<Select defaultValue="x" items={[{ value: 'x', label: 'Custom label' }]}><SelectTrigger aria-label="Fruit" /><SelectContent><SelectItem value="x">Ignored</SelectItem></SelectContent></Select>);
    expect(screen.getByRole('combobox', { name: 'Fruit' })).toHaveTextContent('Custom label');
  });
});

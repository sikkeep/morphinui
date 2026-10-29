import { createRef, useState } from 'react';
import { renderToString } from 'react-dom/server';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { gsap } from 'gsap';
import { de } from 'react-day-picker/locale';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Field, FieldDescription, FieldLabel } from '@/registry/morphin/ui/field';
import { DatePicker, toISODate, type DateRange } from '@/registry/morphin/ui/date-picker';

afterEach(() => {
  gsap.globalTimeline.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const today = new Date(2026, 9, 14);
const calendarProps = { today };
const day = (name: RegExp) => screen.getByRole('button', { name });

describe('DatePicker', () => {
  it('shows a placeholder, opens a calendar dialog, chooses a date, closes and returns focus', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<DatePicker aria-label="Due date" calendarProps={{ ...calendarProps, defaultMonth: today }} onValueChange={onValueChange} />);
    const trigger = screen.getByRole('button', { name: 'Due date Pick a date' });
    expect(trigger).toHaveAttribute('data-placeholder');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger.querySelector('[data-icon=inline-start] svg[aria-hidden="true"]')).not.toBeNull();

    await user.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Choose a date' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(dialog).toHaveAttribute('data-slot', 'date-picker-content');
    expect(dialog).toHaveClass('bg-menu', 'shadow-popover');
    // Focus lands on today, the grid's tab stop.
    await waitFor(() => expect(day(/October 14th, 2026/)).toHaveFocus());

    await user.click(day(/October 20th, 2026/));
    expect(onValueChange).toHaveBeenCalledWith(new Date(2026, 9, 20));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAccessibleName('Due date Oct 20, 2026');
    expect(trigger).not.toHaveAttribute('data-placeholder');
  });

  it('chooses with the keyboard', async () => {
    const user = userEvent.setup();
    render(<DatePicker aria-label="Start" defaultValue={new Date(2026, 9, 5)} calendarProps={calendarProps} />);
    const trigger = screen.getByRole('button', { name: 'Start Oct 5, 2026' });
    trigger.focus();
    await user.keyboard('{Enter}');
    await screen.findByRole('dialog');
    // The chosen day takes focus, and its month is shown.
    await waitFor(() => expect(day(/October 5th, 2026/)).toHaveFocus());
    await user.keyboard('{ArrowRight}{ArrowRight}{Enter}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveTextContent('Oct 7, 2026');
    expect(trigger).toHaveFocus();
  });

  it('follows a controlled value', async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState<Date | null>(new Date(2026, 0, 1));
      return <>
        <DatePicker aria-label="Date" value={value} onValueChange={next => setValue(next ?? null)} calendarProps={calendarProps} />
        <button type="button" onClick={() => setValue(null)}>Clear</button>
      </>;
    }
    render(<Controlled />);
    const trigger = screen.getByRole('button', { name: /^Date/ });
    expect(trigger).toHaveTextContent('Jan 1, 2026');
    await user.click(trigger);
    await screen.findByRole('dialog');
    await user.click(day(/January 9th, 2026/));
    await waitFor(() => expect(trigger).toHaveTextContent('Jan 9, 2026'));
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(trigger).toHaveTextContent('Pick a date');
  });

  it('submits a yyyy-mm-dd value with its form', async () => {
    const user = userEvent.setup();
    render(<form aria-label="Booking"><DatePicker name="date" aria-label="Date" calendarProps={{ ...calendarProps, defaultMonth: today }} /></form>);
    const form = screen.getByRole('form', { name: 'Booking' }) as HTMLFormElement;
    expect(new FormData(form).get('date')).toBe('');
    await user.click(screen.getByRole('button', { name: /^Date/ }));
    await screen.findByRole('dialog');
    await user.click(day(/October 3rd, 2026/));
    await waitFor(() => expect(new FormData(form).get('date')).toBe('2026-10-03'));
    expect(toISODate(new Date(987, 0, 2))).toBe('0987-01-02');
  });

  it('formats with a locale and Intl options', () => {
    const { rerender } = render(<DatePicker aria-label="Date" defaultValue={new Date(2026, 2, 8)} locale="de-DE" format={{ day: 'numeric', month: 'long', year: 'numeric' }} />);
    expect(screen.getByRole('button')).toHaveTextContent('8. März 2026');
    rerender(<DatePicker aria-label="Date" defaultValue={new Date(2026, 2, 8)} locale={de} key="de" />);
    expect(screen.getByRole('button')).toHaveTextContent('08.03.2026');
  });

  it('localizes the calendar with a date-fns locale', async () => {
    const user = userEvent.setup();
    render(<DatePicker aria-label="Datum" locale={de} calendarProps={{ ...calendarProps, defaultMonth: today }} />);
    await user.click(screen.getByRole('button', { name: /^Datum/ }));
    expect(await screen.findByRole('grid', { name: 'Oktober 2026' })).toBeInTheDocument();
  });

  it('is named and described by a Base UI field', () => {
    render(<Field>
      <FieldLabel>Check-in</FieldLabel>
      <DatePicker defaultValue={new Date(2026, 9, 1)} />
      <FieldDescription>From 3 pm.</FieldDescription>
    </Field>);
    const trigger = screen.getByRole('button', { name: 'Check-in Oct 1, 2026' });
    expect(screen.getByText('Check-in')).toHaveAttribute('for', trigger.id);
    expect(trigger).toHaveAccessibleDescription('From 3 pm.');
  });

  it('chooses a range over two clicks and closes when both ends are set', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<form aria-label="Trip">
      <DatePicker mode="range" name="trip" aria-label="Trip" onValueChange={onValueChange} calendarProps={{ ...calendarProps, defaultMonth: today, numberOfMonths: 2 }} />
    </form>);
    const trigger = screen.getByRole('button', { name: 'Trip Pick a date range' });
    await user.click(trigger);
    expect(await screen.findByRole('dialog', { name: 'Choose a date range' })).toBeInTheDocument();
    expect(screen.getAllByRole('grid')).toHaveLength(2);
    await user.click(day(/October 30th, 2026/));
    expect(onValueChange).toHaveBeenLastCalledWith({ from: new Date(2026, 9, 30), to: undefined });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Oct 30, 2026 –');
    await user.click(day(/November 2nd, 2026/));
    expect(onValueChange).toHaveBeenLastCalledWith({ from: new Date(2026, 9, 30), to: new Date(2026, 10, 2) });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveTextContent('Oct 30 – Nov 2, 2026');
    expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('trip')).toBe('2026-10-30/2026-11-02');
  });

  it('follows a controlled range', () => {
    function Controlled() {
      const [range] = useState<DateRange>({ from: new Date(2026, 0, 1), to: new Date(2026, 0, 7) });
      return <DatePicker mode="range" aria-label="Range" value={range} />;
    }
    render(<Controlled />);
    expect(screen.getByRole('button')).toHaveTextContent('Jan 1 – 7, 2026');
  });

  it('respects disabled dates from calendarProps and a disabled trigger', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DatePicker aria-label="Date" calendarProps={{ ...calendarProps, defaultMonth: today, disabled: { before: today } }} />);
    await user.click(screen.getByRole('button', { name: /^Date/ }));
    await screen.findByRole('dialog');
    expect(day(/October 2nd, 2026/)).toBeDisabled();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    rerender(<DatePicker aria-label="Date" disabled />);
    const trigger = screen.getByRole('button', { name: /^Date/ });
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveAttribute('data-disabled');
    await user.click(trigger);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('can be opened from outside and reports open changes', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    function Controlled() {
      const [open, setOpen] = useState(false);
      return <>
        <button type="button" onClick={() => setOpen(true)}>Open</button>
        <DatePicker aria-label="Date" open={open} onOpenChange={next => { setOpen(next); onOpenChange(next); }} calendarProps={{ ...calendarProps, defaultMonth: today }} />
      </>;
    }
    render(<Controlled />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await screen.findByRole('dialog');
    await user.click(day(/October 16th, 2026/));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('renders on the server with its form value', () => {
    const html = renderToString(<DatePicker aria-label="Due" name="due" defaultValue={new Date(2026, 0, 12)} />);
    expect(html).toContain('data-slot="date-picker-trigger"');
    expect(html).toContain('value="2026-01-12"');
    expect(html).toContain('Jan 12, 2026');
  });

  it('forwards its ref to the trigger and takes the select sizes', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<DatePicker ref={ref} aria-label="Date" size="lg" />);
    expect(ref.current).toHaveAttribute('data-slot', 'date-picker-trigger');
    expect(ref.current).toHaveAttribute('data-size', 'lg');
    expect(ref.current).toHaveClass('bg-field', 'border-field-border', 'rounded-[999px]');
  });
});

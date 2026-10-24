import { createRef, useState } from 'react';
import { renderToString } from 'react-dom/server';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { gsap } from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionProvider } from '@/registry/morphin/lib/motion';
import { Calendar, calendarMotion, type DateRange } from '@/registry/morphin/ui/calendar';

const month = new Date(2026, 9, 1);
const today = new Date(2026, 9, 14);

// jsdom has no matchMedia, which the motion policy reads as "reduce".
const motionAllowed = () => vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));

beforeEach(motionAllowed);
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const day = (name: RegExp) => screen.getByRole('button', { name });
const cellOf = (button: HTMLElement) => button.closest('[data-slot=calendar-day]')!;
const caption = (container: HTMLElement) => container.querySelector('[data-slot=calendar-month] > [data-slot=calendar-caption]')!;

describe('Calendar', () => {
  it('renders a month grid with weekdays, days and stable slots', () => {
    const { container } = render(<Calendar mode="single" defaultMonth={month} today={today} />);
    expect(screen.getByRole('grid', { name: 'October 2026' })).toHaveAttribute('data-slot', 'calendar-grid');
    expect(caption(container)).toHaveTextContent('October 2026');
    expect(container.querySelector('[data-slot=calendar]')).toHaveAttribute('data-size', 'md');
    expect(container.querySelectorAll('[data-slot=calendar-weekdays] th')).toHaveLength(7);
    const todayButton = day(/October 14th, 2026/);
    expect(todayButton).toHaveAttribute('data-slot', 'calendar-day-button');
    expect(todayButton).toHaveClass('rounded-[999px]', '[corner-shape:var(--corner-shape)]');
    expect(cellOf(todayButton)).toHaveAttribute('data-today');
    // Outside days show by default, muted.
    expect(container.querySelector('[data-slot=calendar-day][data-outside]')).not.toBeNull();
  });

  it('selects a day in single mode', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    function Controlled() {
      const [selected, setSelected] = useState<Date | undefined>();
      return <Calendar mode="single" defaultMonth={month} today={today} selected={selected} onSelect={value => { setSelected(value); onSelect(value); }} />;
    }
    render(<Controlled />);
    await user.click(day(/October 20th, 2026/));
    expect(onSelect).toHaveBeenCalledWith(new Date(2026, 9, 20));
    const selected = day(/October 20th, 2026/);
    expect(cellOf(selected)).toHaveAttribute('data-selected');
    expect(cellOf(selected)).toHaveAttribute('aria-selected', 'true');
  });

  it('moves focus with the arrow keys and pages months with PageDown', async () => {
    const user = userEvent.setup();
    render(<Calendar mode="single" defaultMonth={month} today={today} reduceMotion />);
    // Previous month, next month, then the grid's one tab stop: today.
    await user.tab();
    await user.tab();
    await user.tab();
    expect(day(/October 14th, 2026/)).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(day(/October 15th, 2026/)).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(day(/October 22nd, 2026/)).toHaveFocus();
    await user.keyboard('{PageDown}');
    expect(screen.getByRole('grid', { name: 'November 2026' })).toBeInTheDocument();
    expect(day(/November 22nd, 2026/)).toHaveFocus();
  });

  it('selects a range and marks its start, middle and end', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    function Range() {
      const [range, setRange] = useState<DateRange | undefined>();
      return <Calendar mode="range" defaultMonth={month} today={today} selected={range} onSelect={value => { setRange(value); onSelect(value); }} />;
    }
    render(<Range />);
    expect(screen.getByRole('grid')).toHaveAttribute('aria-multiselectable', 'true');
    await user.click(day(/October 5th, 2026/));
    await user.click(day(/October 8th, 2026/));
    expect(onSelect).toHaveBeenLastCalledWith({ from: new Date(2026, 9, 5), to: new Date(2026, 9, 8) });
    expect(cellOf(day(/October 5th, 2026/))).toHaveAttribute('data-range-start');
    expect(cellOf(day(/October 6th, 2026/))).toHaveAttribute('data-range-middle');
    expect(cellOf(day(/October 7th, 2026/))).toHaveAttribute('data-range-middle');
    expect(cellOf(day(/October 8th, 2026/))).toHaveAttribute('data-range-end');
    expect(cellOf(day(/October 9th, 2026/))).not.toHaveAttribute('data-selected');
  });

  it('disables days that match `disabled`', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Calendar mode="single" defaultMonth={month} today={today} disabled={{ before: today }} onSelect={onSelect} />);
    const past = day(/October 10th, 2026/);
    expect(past).toBeDisabled();
    expect(cellOf(past)).toHaveAttribute('data-disabled');
    await user.click(past);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('navigates months with lucide chevron icon buttons', async () => {
    const user = userEvent.setup();
    const onMonthChange = vi.fn();
    render(<Calendar mode="single" defaultMonth={month} today={today} onMonthChange={onMonthChange} reduceMotion />);
    const next = screen.getByRole('button', { name: /next month/i });
    expect(next).toHaveAttribute('data-slot', 'calendar-nav-button');
    expect(next.querySelector('svg.lucide-chevron-right')).not.toBeNull();
    await user.click(next);
    expect(onMonthChange).toHaveBeenCalledWith(new Date(2026, 10, 1));
    expect(screen.getByRole('grid', { name: 'November 2026' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /previous month/i }));
    expect(screen.getByRole('grid', { name: 'October 2026' })).toBeInTheDocument();
  });

  it('turns navigation off at the end month', () => {
    render(<Calendar mode="single" defaultMonth={month} endMonth={month} today={today} />);
    expect(screen.getByRole('button', { name: /next month/i })).toBeDisabled();
  });

  it('renders on the server', () => {
    const html = renderToString(<Calendar mode="range" defaultMonth={month} today={today} selected={{ from: new Date(2026, 9, 5), to: new Date(2026, 9, 8) }} />);
    expect(html).toContain('data-slot="calendar"');
    expect(html).toContain('data-range-middle');
  });

  it('forwards its ref to the root', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Calendar ref={ref} size="sm" defaultMonth={month} today={today} />);
    expect(ref.current).toHaveAttribute('data-slot', 'calendar');
    expect(ref.current).toHaveAttribute('data-size', 'sm');
    expect(ref.current).toHaveClass('[--calendar-cell:32px]');
  });

  describe('month motion', () => {
    it('slides the new month in and a copy of the old one out, then cleans up', async () => {
      const user = userEvent.setup();
      const timeline = vi.spyOn(gsap, 'timeline');
      const { container } = render(<Calendar mode="single" defaultMonth={month} today={today} />);
      // Never on the first render.
      expect(timeline).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: /next month/i }));
      expect(timeline).toHaveBeenCalledTimes(1);
      const tween = timeline.mock.results[0]!.value as gsap.core.Timeline;
      tween.pause(calendarMotion.duration / 2);

      const live = container.querySelector<HTMLElement>('[data-slot=calendar-month]')!;
      const weeks = live.querySelector<HTMLElement>(':scope > table > [data-slot=calendar-weeks]')!;
      const outgoing = live.querySelector<HTMLElement>('[data-calendar-outgoing]')!;
      expect(outgoing).toHaveAttribute('aria-hidden', 'true');
      expect(outgoing).toHaveAttribute('inert');
      expect(outgoing).toHaveTextContent('October 2026');
      expect(outgoing.querySelector('[id], [role=status]')).toBeNull();
      // The new month travels in from the right, the old one leaves to the left.
      expect(Number(gsap.getProperty(weeks, 'x'))).toBeGreaterThan(0);
      expect(Number(gsap.getProperty(outgoing, 'x'))).toBeLessThan(0);
      expect(Number(weeks.style.opacity)).toBeGreaterThan(0);
      expect(Number(weeks.style.opacity)).toBeLessThan(1);
      expect(caption(container)).toHaveTextContent('November 2026');
      expect(screen.getByRole('grid', { name: 'November 2026' })).toBeInTheDocument();

      tween.progress(1);
      expect(live.querySelector('[data-calendar-outgoing]')).toBeNull();
      expect(weeks.style.opacity).toBe('');
      expect(weeks.style.transform).toBe('');
    });

    it('travels the other way going back', async () => {
      const user = userEvent.setup();
      const timeline = vi.spyOn(gsap, 'timeline');
      const { container } = render(<Calendar mode="single" defaultMonth={month} today={today} />);
      await user.click(screen.getByRole('button', { name: /previous month/i }));
      const tween = timeline.mock.results[0]!.value as gsap.core.Timeline;
      tween.pause(calendarMotion.duration / 2);
      const weeks = container.querySelector<HTMLElement>('[data-slot=calendar-month] > table > [data-slot=calendar-weeks]')!;
      expect(Number(gsap.getProperty(weeks, 'x'))).toBeLessThan(0);
      tween.progress(1);
    });

    it('reverts an interrupted change and on unmount', async () => {
      const user = userEvent.setup();
      const timeline = vi.spyOn(gsap, 'timeline');
      const { container, unmount } = render(<Calendar mode="single" defaultMonth={month} today={today} />);
      const next = screen.getByRole('button', { name: /next month/i });
      await user.click(next);
      (timeline.mock.results[0]!.value as gsap.core.Timeline).pause(0.05);
      await user.click(next);
      (timeline.mock.results[1]!.value as gsap.core.Timeline).pause(0.05);
      expect(container.querySelectorAll('[data-calendar-outgoing]')).toHaveLength(1);
      expect(container.querySelector('[data-calendar-outgoing]')).toHaveTextContent('November 2026');
      unmount();
      expect(document.querySelector('[data-calendar-outgoing]')).toBeNull();
    });

    it('is skipped under reduced motion and with reduceMotion', async () => {
      const user = userEvent.setup();
      const timeline = vi.spyOn(gsap, 'timeline');
      const { container, unmount } = render(<MotionProvider reducedMotion="always"><Calendar mode="single" defaultMonth={month} today={today} /></MotionProvider>);
      expect(container.querySelector('[data-slot=calendar]')).toHaveAttribute('data-reduced-motion');
      await user.click(screen.getByRole('button', { name: /next month/i }));
      unmount();
      render(<Calendar mode="single" defaultMonth={month} today={today} reduceMotion />);
      await user.click(screen.getByRole('button', { name: /next month/i }));
      expect(timeline).not.toHaveBeenCalled();
      expect(document.querySelector('[data-calendar-outgoing]')).toBeNull();
    });
  });
});

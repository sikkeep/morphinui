import { StrictMode } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { gsap } from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionProvider } from '@/registry/morphin/lib/motion';
import { BarChart, BarChartNumber } from '@/registry/morphin/ui/bar-chart';

const data = [
  { id: 'jan', label: 'Jan', value: 3000 },
  { id: 'feb', label: 'Feb', value: 6000 },
];
const fill = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-slot="bar-chart-fill"]')!;
beforeEach(() =>
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  })),
);
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('BarChart', () => {
  it('names the figure and exposes exact formatted values in a table', () => {
    render(
      <BarChart
        title="Earnings"
        value="$7,462"
        description="Up 14.8%"
        action={<button>Monthly</button>}
        data={data}
        format={{ style: 'currency', currency: 'USD' }}
      />,
    );
    expect(
      screen.getByRole('figure', { name: 'Earnings' }),
    ).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Earnings' });
    expect(
      within(table).getByRole('row', { name: 'Jan $3,000.00' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Monthly' })).toBeInTheDocument();
    expect(screen.getByRole('region')).toHaveAttribute('tabindex', '0');
  });

  it('positions explicit ticks proportionally, expands a too-small max and keeps zero values', () => {
    const { container } = render(
      <BarChart
        title="Scale"
        max={1000}
        ticks={[0, 3000, 3000, NaN]}
        data={[...data, { id: 'zero', label: 'Zero', value: 0 }]}
      />,
    );
    expect(fill(container).style.height).toBe('50%');
    const axis = container.querySelector('[data-slot="bar-chart-axis"]')!;
    expect(axis.children).toHaveLength(2);
    expect((axis.children[1] as HTMLElement).style.bottom).toBe('50%');
    expect(screen.getByRole('row', { name: 'Zero 0' })).toBeInTheDocument();
  });

  it('omits invalid values and shows an empty message when none remain', () => {
    render(
      <BarChart
        title="Empty"
        data={[
          { id: 'bad', label: 'Bad', value: NaN },
          { id: 'negative', label: 'Negative', value: -1 },
          { id: 'infinite', label: 'Infinite', value: Infinity },
        ]}
        emptyLabel="Waiting for sales"
      />,
    );
    expect(screen.getByText('Waiting for sales')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('skips mount motion and retargets from the drawn height during a rapid update', () => {
    const animate = vi.spyOn(gsap, 'fromTo');
    const { container, rerender, unmount } = render(
      <StrictMode>
        <BarChart title="Sales" data={data} max={12000} />
      </StrictMode>,
    );
    expect(animate).not.toHaveBeenCalled();
    const node = fill(container);
    rerender(
      <StrictMode>
        <BarChart
          title="Sales"
          data={[{ ...data[0], value: 9000 }, data[1]]}
          max={12000}
        />
      </StrictMode>,
    );
    const tween = gsap.getTweensOf(node)[0];
    tween.pause().progress(0.5);
    const drawn = Number.parseFloat(node.style.height);
    expect(drawn).toBeGreaterThan(25);
    expect(drawn).toBeLessThan(75);
    rerender(
      <StrictMode>
        <BarChart
          title="Sales"
          data={[{ ...data[0], value: 7200 }, data[1]]}
          max={12000}
        />
      </StrictMode>,
    );
    expect(Number.parseFloat(node.style.height)).toBeCloseTo(drawn);
    expect(
      within(screen.getByRole('table')).getByRole('row', { name: 'Jan 7,200' }),
    ).toBeInTheDocument();
    gsap.getTweensOf(node)[0].pause().progress(1);
    expect(node.style.height).toBe('60%');
    unmount();
    expect(gsap.getTweensOf(node)).toHaveLength(0);
  });

  it('honors a live system preference change mid-tween and MotionProvider', () => {
    let reduced = false;
    const listeners = new Set<() => void>();
    vi.stubGlobal('matchMedia', () => ({
      get matches() {
        return reduced;
      },
      addEventListener: (_: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    }));
    const { container, rerender } = render(
      <BarChart title="Sales" data={data} max={12000} />,
    );
    rerender(
      <BarChart
        title="Sales"
        data={[{ ...data[0], value: 9000 }]}
        max={12000}
      />,
    );
    const node = fill(container);
    gsap.getTweensOf(node)[0].pause().progress(0.3);
    act(() => {
      reduced = true;
      listeners.forEach((listener) => listener());
    });
    expect(node.style.height).toBe('75%');
    expect(gsap.getTweensOf(node)).toHaveLength(0);
    expect(container.querySelector('[data-slot="bar-chart"]')).toHaveAttribute(
      'data-reduced-motion',
    );
    act(() => {
      reduced = false;
      listeners.forEach((listener) => listener());
    });
    rerender(
      <MotionProvider reducedMotion="always">
        <BarChart
          title="Sales"
          data={[{ ...data[0], value: 6000 }]}
          max={12000}
        />
      </MotionProvider>,
    );
    expect(fill(container).style.height).toBe('50%');
    expect(gsap.getTweensOf(fill(container))).toHaveLength(0);
  });
  it('fades a ring on fine-pointer hover without changing bar geometry and cleans up interrupted fades', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('hover: hover'),
      addEventListener() {},
      removeEventListener() {},
    }));
    const { container, unmount } = render(
      <BarChart title="Sales" data={data} />,
    );
    const column = container.querySelector<HTMLElement>(
      '[data-slot="bar-chart-column"]',
    )!;
    const track = column.querySelector<HTMLElement>(
      '[data-slot="bar-chart-track"]',
    )!;
    const ring = column.querySelector<HTMLElement>(
      '[data-slot="bar-chart-ring"]',
    )!;
    const height = fill(container).style.height;
    fireEvent.pointerEnter(column, { pointerType: 'mouse' });
    expect(ring).toHaveAttribute('data-active');
    const enter = gsap.getTweensOf(ring)[0];
    enter.pause().progress(0.5);
    const drawn = Number(ring.style.opacity);
    expect(drawn).toBeGreaterThan(0);
    expect(drawn).toBeLessThan(1);
    fireEvent.pointerLeave(column);
    expect(Number(ring.style.opacity)).toBeCloseTo(drawn);
    const exit = gsap.getTweensOf(ring)[0];
    expect(exit.duration()).toBeGreaterThan(enter.duration());
    exit.pause().progress(1);
    expect(ring.style.opacity).toBe('');
    expect(track.style.transform).toBe('');
    expect(fill(container).style.height).toBe(height);
    fireEvent.pointerEnter(column);
    unmount();
    expect(gsap.getTweensOf(ring)).toHaveLength(0);
    expect(ring.style.opacity).toBe('');
  });

  it('turns the header into the name and value of the bar under the pointer, and back', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('hover: hover'),
      addEventListener() {},
      removeEventListener() {},
    }));
    const { container } = render(
      <BarChart
        title="Sales"
        value={9000}
        description={<span>+5%</span>}
        data={data}
        reduceMotion
      />,
    );
    const slot = (name: string) =>
      container.querySelector<HTMLElement>(`[data-slot="bar-chart-${name}"]`)!;
    const columns = container.querySelectorAll<HTMLElement>(
      '[data-slot="bar-chart-column"]',
    );
    expect(slot('title')).not.toHaveAttribute('data-hidden');
    expect(slot('readout-label')).toHaveAttribute('data-hidden');
    expect(slot('value')).toHaveTextContent('9,000');
    fireEvent.pointerEnter(columns[1], { pointerType: 'mouse' });
    expect(slot('title')).toHaveAttribute('data-hidden');
    expect(slot('readout-label')).not.toHaveAttribute('data-hidden');
    expect(slot('readout-label')).toHaveTextContent('Feb');
    expect(slot('readout-label')).toHaveAttribute('aria-hidden', 'true');
    expect(slot('description')).toHaveAttribute('data-hidden');
    expect(slot('value')).toHaveTextContent('6,000');
    expect(columns[0]).toHaveAttribute('data-dimmed');
    expect(columns[1]).not.toHaveAttribute('data-dimmed');
    expect(screen.getByRole('figure', { name: 'Sales' })).toBeInTheDocument();
    fireEvent.pointerLeave(columns[1]);
    expect(slot('title')).not.toHaveAttribute('data-hidden');
    expect(slot('readout-label')).toHaveAttribute('data-hidden');
    expect(slot('readout-label')).toHaveTextContent('Feb');
    expect(slot('description')).not.toHaveAttribute('data-hidden');
    expect(slot('value')).toHaveTextContent('9,000');
    expect(columns[0]).not.toHaveAttribute('data-dimmed');
  });

  it('keeps the header as it is when the summary is not a number', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('hover: hover'),
      addEventListener() {},
      removeEventListener() {},
    }));
    const { container } = render(
      <BarChart title="Sales" value={<b>Custom</b>} data={data} reduceMotion />,
    );
    fireEvent.pointerEnter(
      container.querySelector('[data-slot="bar-chart-column"]')!,
      { pointerType: 'mouse' },
    );
    expect(
      container.querySelector('[data-slot="bar-chart-title"]'),
    ).not.toHaveAttribute('data-hidden');
    expect(
      container.querySelector('[data-slot="bar-chart-value"]'),
    ).toHaveTextContent('Custom');
  });

  it('ignores touch hover, suppresses zero-value rings and keeps reduced-motion feedback static', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('hover: hover'),
      addEventListener() {},
      removeEventListener() {},
    }));
    const { container, rerender } = render(
      <BarChart title="Sales" data={data} />,
    );
    const column = container.querySelector<HTMLElement>(
      '[data-slot="bar-chart-column"]',
    )!;
    const ring = column.querySelector<HTMLElement>(
      '[data-slot="bar-chart-ring"]',
    )!;
    const touch = new Event('pointerover', { bubbles: true });
    Object.defineProperty(touch, 'pointerType', { value: 'touch' });
    fireEvent(column, touch);
    expect(ring).not.toHaveAttribute('data-active');
    expect(gsap.getTweensOf(ring)).toHaveLength(0);
    fireEvent.pointerEnter(column);
    expect(gsap.getTweensOf(ring)).toHaveLength(1);
    rerender(<BarChart title="Sales" data={data} reduceMotion />);
    expect(gsap.getTweensOf(ring)).toHaveLength(0);
    expect(ring.style.opacity).toBe('');
    expect(ring).toHaveAttribute('data-active');
    rerender(
      <BarChart title="Sales" data={[{ ...data[0], value: 0 }]} reduceMotion />,
    );
    expect(ring).not.toHaveAttribute('data-active');
  });

  it('keeps custom React content under React ownership and supports localized accessible text and color overrides', () => {
    const click = vi.fn();
    const { container, rerender } = render(
      <BarChart
        title="Ventes"
        value={
          <button id="summary" onClick={click}>
            Summary
          </button>
        }
        data={data}
        color="rebeccapurple"
        scrollLabel="Faire défiler"
        categoryLabel="Mois"
        valueLabel="Montant"
      />,
    );
    const summary = screen.getByRole('button', { name: 'Summary' });
    rerender(
      <BarChart
        title="Ventes"
        value={
          <button id="summary" onClick={click}>
            Updated summary
          </button>
        }
        data={data}
        color="rebeccapurple"
        scrollLabel="Faire défiler"
        categoryLabel="Mois"
        valueLabel="Montant"
      />,
    );
    expect(screen.getByRole('button', { name: 'Updated summary' })).toBe(
      summary,
    );
    fireEvent.click(summary);
    expect(click).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll('#summary')).toHaveLength(1);
    expect(container.querySelector('[data-bar-chart-text-copy]')).toBeNull();
    expect(screen.getByRole('figure')).toHaveStyle(
      '--bar-chart: rebeccapurple',
    );
    expect(
      screen.getByRole('region', { name: 'Faire défiler' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Mois' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Montant' }),
    ).toBeInTheDocument();
  });

  it('keeps finite scales for subnormal and very large numbers and retains bars when reordered', () => {
    const { container, rerender } = render(
      <BarChart
        title="Tiny"
        data={[{ id: 'tiny', label: 'Tiny', value: Number.MIN_VALUE }]}
      />,
    );
    expect(fill(container).style.height).toBe('100%');
    rerender(
      <BarChart
        title="Large"
        data={[{ id: 'large', label: 'Large', value: Number.MAX_VALUE }]}
      />,
    );
    expect(fill(container).style.height).toBe('100%');
    rerender(<BarChart title="Sales" data={data} max={12000} reduceMotion />);
    const jan = container.querySelector('[data-bar-id="jan"]');
    rerender(
      <BarChart
        title="Sales"
        data={[data[1], data[0]]}
        max={12000}
        reduceMotion
      />,
    );
    expect(container.querySelector('[data-bar-id="jan"]')).toBe(jan);
    expect(
      container.querySelector('[data-slot="bar-chart-column"]'),
    ).toHaveAttribute('data-bar-id', 'feb');
  });
});

describe('BarChartNumber', () => {
  const visualOf = (container: HTMLElement) =>
    container.querySelector<HTMLElement>(
      '[data-slot="bar-chart-number-visual"]',
    )!;

  it('counts from the drawn value, exposes the exact target immediately and survives rapid updates', () => {
    const animate = vi.spyOn(gsap, 'to');
    const { container, rerender, unmount } = render(
      <StrictMode>
        <BarChartNumber value={1000} />
      </StrictMode>,
    );
    expect(animate).not.toHaveBeenCalled();
    rerender(
      <StrictMode>
        <BarChartNumber value={9000} />
      </StrictMode>,
    );
    const tween = animate.mock.results.at(-1)!.value as gsap.core.Tween;
    tween.pause().progress(0.5);
    const visual = visualOf(container);
    expect(visual).toHaveTextContent('5,000');
    expect(visual).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.sr-only')).toHaveTextContent('9,000');
    rerender(
      <StrictMode>
        <BarChartNumber value={7000} />
      </StrictMode>,
    );
    expect(visual).toHaveTextContent('5,000');
    const next = animate.mock.results.at(-1)!.value as gsap.core.Tween;
    expect(tween.isActive()).toBe(false);
    next.pause().progress(1);
    expect(visual).toHaveTextContent('7,000');
    rerender(
      <StrictMode>
        <BarChartNumber value={2000} />
      </StrictMode>,
    );
    const ending = animate.mock.results.at(-1)!.value as gsap.core.Tween;
    unmount();
    expect(ending.isActive()).toBe(false);
    expect(ending.parent).toBeNull();
  });

  it('does not restart on unrelated renders with inline formatter options and responds to locale changes', () => {
    const animate = vi.spyOn(gsap, 'to');
    const { container, rerender } = render(
      <BarChartNumber
        value={1000}
        format={{
          style: 'currency',
          currency: 'EUR',
          maximumFractionDigits: 0,
        }}
      />,
    );
    rerender(
      <BarChartNumber
        value={9000}
        format={{
          style: 'currency',
          currency: 'EUR',
          maximumFractionDigits: 0,
        }}
      />,
    );
    const tween = animate.mock.results.at(-1)!.value as gsap.core.Tween;
    tween.pause().progress(0.5);
    const count = animate.mock.calls.length;
    rerender(
      <BarChartNumber
        value={9000}
        className="changed-layout"
        format={{
          style: 'currency',
          currency: 'EUR',
          maximumFractionDigits: 0,
        }}
      />,
    );
    expect(animate).toHaveBeenCalledTimes(count);
    expect(visualOf(container)).toHaveTextContent('€5,000');
    rerender(
      <BarChartNumber
        value={9000}
        locale="de-DE"
        reduceMotion
        format={{
          style: 'currency',
          currency: 'EUR',
          maximumFractionDigits: 0,
        }}
      />,
    );
    expect(visualOf(container).textContent).toBe(
      new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(9000),
    );
    expect(tween.parent).toBeNull();
  });

  it('settles immediately when the live reduced-motion policy changes', () => {
    let reduced = false;
    const listeners = new Set<() => void>();
    vi.stubGlobal('matchMedia', () => ({
      get matches() {
        return reduced;
      },
      addEventListener: (_: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    }));
    const animate = vi.spyOn(gsap, 'to');
    const { container, rerender } = render(<BarChartNumber value={10} />);
    rerender(<BarChartNumber value={50} />);
    const tween = animate.mock.results.at(-1)!.value as gsap.core.Tween;
    tween.pause().progress(0.2);
    act(() => {
      reduced = true;
      listeners.forEach((listener) => listener());
    });
    expect(visualOf(container)).toHaveTextContent('50');
    expect(tween.parent).toBeNull();
    rerender(
      <MotionProvider reducedMotion="always">
        <BarChartNumber value={75} />
      </MotionProvider>,
    );
    expect(visualOf(container)).toHaveTextContent('75');
  });
});

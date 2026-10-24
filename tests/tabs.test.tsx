import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionProvider } from '@/registry/morphin/lib/motion';
import { Tabs, TabsList, TabsPanel, TabsSeparator, TabsTab, type TabsProps } from '@/registry/morphin/ui/tabs';

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function Example(props: Partial<TabsProps>) {
  return <Tabs defaultValue="overview" {...props}>
    <TabsList aria-label="Sections">
      <TabsTab value="overview">Overview</TabsTab>
      <TabsTab value="analytics">Analytics</TabsTab>
      <TabsTab value="reports" disabled>Reports</TabsTab>
      <TabsTab value="settings">Settings</TabsTab>
    </TabsList>
    <TabsPanel value="overview">Overview panel</TabsPanel>
    <TabsPanel value="analytics">Analytics panel</TabsPanel>
    <TabsPanel value="reports">Reports panel</TabsPanel>
    <TabsPanel value="settings">Settings panel</TabsPanel>
  </Tabs>;
}

describe('Tabs', () => {
  it('shows the selected panel and switches on click', async () => {
    const user = userEvent.setup();
    render(<Example />);
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Overview panel')).toBeInTheDocument();
    expect(screen.queryByText('Analytics panel')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Analytics' }));
    expect(screen.getByRole('tab', { name: 'Analytics' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Analytics panel');
    expect(screen.queryByText('Overview panel')).not.toBeInTheDocument();
  });

  it('names the tab list and links each panel to its tab', () => {
    render(<Example />);
    expect(screen.getByRole('tablist', { name: 'Sections' })).toBeInTheDocument();
    const tab = screen.getByRole('tab', { name: 'Overview' });
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', tab.id);
  });

  it('moves focus with the arrow keys, keeps a disabled tab unselectable and selects on Enter', async () => {
    const user = userEvent.setup();
    render(<Example />);
    screen.getByRole('tab', { name: 'Overview' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Analytics' })).toHaveFocus();
    // Like the ARIA pattern, a disabled tab stays reachable but cannot be chosen.
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Reports' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Settings panel');
  });

  it('does not select a disabled tab', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole('tab', { name: 'Reports' }));
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Reports' })).toHaveAttribute('data-disabled');
  });

  it('can be controlled', async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState('analytics');
      return <>
        <output>{value}</output>
        <Example value={value} defaultValue={undefined} onValueChange={next => setValue(String(next))} />
      </>;
    }
    render(<Controlled />);
    expect(screen.getByRole('tab', { name: 'Analytics' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: 'Settings' }));
    expect(screen.getByRole('status')).toHaveTextContent('settings');
  });

  it('lays out vertically and arrows move up and down', async () => {
    const user = userEvent.setup();
    render(<Example orientation="vertical" />);
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
    screen.getByRole('tab', { name: 'Overview' }).focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('tab', { name: 'Analytics' })).toHaveFocus();
  });

  it('exposes stable slots and the variant', () => {
    const { container } = render(<Example variant="secondary" />);
    for (const name of ['tabs', 'tabs-scroller', 'tabs-list', 'tabs-tab', 'tabs-panel', 'tabs-indicator']) {
      expect(container.querySelector(`[data-slot="${name}"]`), name).toBeInTheDocument();
    }
    expect(container.querySelector('[data-slot="tabs"]')).toHaveAttribute('data-variant', 'secondary');
  });

  it('styles the variants, sizes and alignment through the root', () => {
    const { container, rerender } = render(<Example />);
    const tab = () => screen.getByRole('tab', { name: 'Overview' });
    const scroller = () => container.querySelector('[data-slot="tabs-scroller"]')!;
    expect(scroller()).toHaveClass('bg-muted', 'rounded-[999px]');
    expect(tab()).toHaveClass('h-8', 'justify-center', 'rounded-[999px]');

    rerender(<Example variant="secondary" size="lg" align="start" />);
    expect(scroller()).toHaveClass('border-b');
    expect(scroller()).not.toHaveClass('bg-muted');
    expect(tab()).toHaveClass('h-10', 'justify-start');
    expect(container.querySelector('[data-slot="tabs-indicator"]')).toHaveClass('bg-primary');
  });

  it('has an xs size for compact bars, with a tighter bar padding', () => {
    const { container } = render(<Example size="xs" />);
    const scroller = container.querySelector('[data-slot="tabs-scroller"]')!;
    expect(scroller).toHaveAttribute('data-size', 'xs');
    expect(scroller).toHaveClass('data-[size=xs]:p-0.5');
    expect(container.querySelector('[data-slot="tabs-list"]')).toHaveClass('in-data-[size=xs]:p-0.5', 'in-data-[size=xs]:-m-0.5');
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveClass('h-6', 'text-2xs');
  });

  it('slides the indicator over 250 ms on the smooth ease-out', () => {
    const { container } = render(<Example />);
    const indicator = container.querySelector('[data-slot="tabs-indicator"]')!;
    expect(indicator).toHaveClass('transition-[translate,width,height]', 'duration-250', 'ease-[cubic-bezier(0.22,1,0.36,1)]');
    expect(indicator.className).toContain('translate-x-(--active-tab-left)');
  });

  it('fades a new panel in', () => {
    render(<Example />);
    expect(screen.getByRole('tabpanel')).toHaveClass('transition-opacity', 'duration-150', 'data-starting-style:opacity-0');
  });

  it('can leave the indicator out', () => {
    const { container } = render(<Tabs defaultValue="a"><TabsList aria-label="x" indicator={false}><TabsTab value="a">A</TabsTab></TabsList></Tabs>);
    expect(container.querySelector('[data-slot="tabs-indicator"]')).not.toBeInTheDocument();
  });

  it('marks reduced motion from the prop and from MotionProvider', () => {
    const { container, rerender } = render(<Example reduceMotion />);
    expect(container.querySelector('[data-slot="tabs"]')).toHaveAttribute('data-reduced-motion');
    expect(container.querySelector('[data-slot="tabs-indicator"]')).toHaveClass('in-data-reduced-motion:transition-none');
    rerender(<MotionProvider reducedMotion="always"><Example /></MotionProvider>);
    expect(container.querySelector('[data-slot="tabs"]')).toHaveAttribute('data-reduced-motion');
    rerender(<MotionProvider reducedMotion="system"><Example /></MotionProvider>);
    expect(container.querySelector('[data-slot="tabs"]')).not.toHaveAttribute('data-reduced-motion');
  });

  it('keeps hidden panels mounted when asked', () => {
    render(<Tabs defaultValue="a">
      <TabsList aria-label="x"><TabsTab value="a">A</TabsTab><TabsTab value="b">B</TabsTab></TabsList>
      <TabsPanel value="a">First</TabsPanel>
      <TabsPanel value="b" keepMounted>Second</TabsPanel>
    </Tabs>);
    expect(screen.getByText('Second', { selector: '[data-slot="tabs-panel"]' })).toBeInTheDocument();
  });

  it('renders a separator between tabs that the keyboard skips', () => {
    render(<Tabs defaultValue="a">
      <TabsList aria-label="x">
        <TabsTab value="a">A</TabsTab>
        <TabsSeparator />
        <TabsTab value="b">B</TabsTab>
      </TabsList>
    </Tabs>);
    expect(document.querySelector('[data-slot="tabs-separator"]')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('shows next and previous chevrons only while the list overflows', async () => {
    const user = userEvent.setup();
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get() { return this.dataset.slot === 'tabs-list' ? 400 : 0; } });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return this.dataset.slot === 'tabs-list' ? 200 : 0; } });
    let left = 0;
    Object.defineProperty(HTMLElement.prototype, 'scrollLeft', {
      configurable: true,
      get() { return this.dataset.slot === 'tabs-list' ? left : 0; },
      set(value: number) { if (this.dataset.slot === 'tabs-list') left = value; },
    });
    const scrollBy = vi.fn(function (this: HTMLElement, x?: ScrollToOptions | number) {
      if (this.dataset.slot === 'tabs-list' && x && typeof x === 'object') left += x.left ?? 0;
      this.dispatchEvent(new Event('scroll'));
    });
    HTMLElement.prototype.scrollBy = scrollBy as typeof HTMLElement.prototype.scrollBy;

    const { container } = render(<Example />);
    const list = container.querySelector('[data-slot="tabs-list"]')!;
    list.dispatchEvent(new Event('scroll'));
    expect(await screen.findByRole('button', { name: 'Show next tabs' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show previous tabs' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show next tabs' }));
    expect(scrollBy).toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'Show previous tabs' })).toBeInTheDocument();
  });

  it('can turn overflow chrome off', () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => 400 });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 200 });
    render(<Tabs defaultValue="a"><TabsList aria-label="x" overflow={false}><TabsTab value="a">A</TabsTab></TabsList></Tabs>);
    expect(screen.queryByRole('button', { name: /tabs/ })).not.toBeInTheDocument();
  });

  it('never scrolls the page to reveal the active tab, only the list', () => {
    const page = vi.fn();
    const scrollIntoView = vi.fn();
    vi.stubGlobal('scrollTo', page);
    const original = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    try {
      render(<Example defaultValue="settings" />);
      expect(scrollIntoView).not.toHaveBeenCalled();
      expect(page).not.toHaveBeenCalled();
    } finally {
      HTMLElement.prototype.scrollIntoView = original;
    }
  });

  it('keeps its own overflow handling when a ref is passed to TabsList, and names the chevrons as asked', () => {
    const ref = { current: null as HTMLDivElement | null };
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => 600 });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 200 });
    try {
      render(<Tabs defaultValue="a">
        <TabsList ref={ref} aria-label="Many" previousLabel="Earlier" nextLabel="Later">
          <TabsTab value="a">A</TabsTab><TabsTab value="b">B</TabsTab>
        </TabsList>
      </Tabs>);
      expect(ref.current).toBe(screen.getByRole('tablist'));
      expect(screen.getByRole('button', { name: 'Later', hidden: true })).toBeInTheDocument();
    } finally {
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollWidth;
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
    }
  });
});

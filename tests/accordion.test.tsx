import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionProvider } from '@/registry/morphin/lib/motion';
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger, type AccordionProps } from '@/registry/morphin/ui/accordion';

beforeEach(() => {
  // jsdom has no matchMedia, which the motion policy reads as "reduce".
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});

afterEach(() => vi.unstubAllGlobals());

const items = [
  ['shipping', 'Shipping', 'Orders ship within two days.'],
  ['returns', 'Returns', 'Free returns for 30 days.'],
  ['warranty', 'Warranty', 'Two years on every product.'],
] as const;

function Example(props: Partial<AccordionProps<string>>) {
  return <Accordion {...props}>
    {items.map(([value, label, text]) => <AccordionItem key={value} value={value} disabled={value === 'warranty' ? props.disabled : undefined}>
      <AccordionTrigger>{label}</AccordionTrigger>
      <AccordionPanel>{text}</AccordionPanel>
    </AccordionItem>)}
  </Accordion>;
}

const trigger = (name: string) => screen.getByRole('button', { name });

describe('Accordion', () => {
  it('exposes stable slots, a heading per item and the chevron at the end', () => {
    const { container } = render(<Example defaultValue={['shipping']} />);
    for (const slot of ['accordion', 'accordion-item', 'accordion-header', 'accordion-trigger', 'accordion-label', 'accordion-panel', 'accordion-content']) {
      expect(container.querySelector(`[data-slot="${slot}"]`), slot).toBeInTheDocument();
    }
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
    const chevron = trigger('Shipping').querySelector('[data-icon="inline-end"]');
    expect(chevron).toHaveAttribute('aria-hidden', 'true');
    expect(chevron).toHaveClass('size-4', 'group-data-panel-open/accordion-trigger:rotate-180');
    expect(container.querySelector('svg:not([class*="lucide"])')).toBeNull();
  });

  it('opens and closes by click, linking the trigger to its panel', async () => {
    const user = userEvent.setup();
    render(<Example />);
    const button = trigger('Shipping');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).not.toHaveAttribute('aria-controls');
    expect(screen.queryByText('Orders ship within two days.')).not.toBeInTheDocument();

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('data-panel-open');
    const panel = document.getElementById(button.getAttribute('aria-controls')!);
    expect(panel).toHaveAttribute('data-slot', 'accordion-panel');
    expect(panel).toHaveTextContent('Orders ship within two days.');

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps one panel open at a time unless multiple is set', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Example />);
    await user.click(trigger('Shipping'));
    await user.click(trigger('Returns'));
    expect(trigger('Shipping')).toHaveAttribute('aria-expanded', 'false');
    expect(trigger('Returns')).toHaveAttribute('aria-expanded', 'true');
    unmount();

    render(<Example multiple />);
    await user.click(trigger('Shipping'));
    await user.click(trigger('Returns'));
    expect(trigger('Shipping')).toHaveAttribute('aria-expanded', 'true');
    expect(trigger('Returns')).toHaveAttribute('aria-expanded', 'true');
  });

  it('toggles with Enter and Space, and Tab moves between triggers', async () => {
    const user = userEvent.setup();
    render(<Example />);
    trigger('Shipping').focus();
    await user.keyboard('{Enter}');
    expect(trigger('Shipping')).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard(' ');
    expect(trigger('Shipping')).toHaveAttribute('aria-expanded', 'false');
    await user.tab();
    expect(trigger('Returns')).toHaveFocus();
    await user.keyboard(' ');
    expect(trigger('Returns')).toHaveAttribute('aria-expanded', 'true');
  });

  it('can be controlled', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    function Controlled() {
      const [value, setValue] = useState<string[]>(['returns']);
      return <>
        <output>{value.join(',')}</output>
        <Example value={value} onValueChange={next => { onValueChange(next); setValue(next); }} />
      </>;
    }
    render(<Controlled />);
    expect(trigger('Returns')).toHaveAttribute('aria-expanded', 'true');
    await user.click(trigger('Shipping'));
    expect(onValueChange).toHaveBeenLastCalledWith(['shipping']);
    expect(screen.getByRole('status')).toHaveTextContent('shipping');
    expect(trigger('Shipping')).toHaveAttribute('aria-expanded', 'true');
    expect(trigger('Returns')).toHaveAttribute('aria-expanded', 'false');
  });

  it('does not open a disabled item', async () => {
    const user = userEvent.setup();
    render(<Example disabled />);
    await user.click(trigger('Warranty'));
    expect(trigger('Warranty')).toHaveAttribute('aria-expanded', 'false');
    expect(trigger('Warranty')).toHaveAttribute('data-disabled');
    expect(trigger('Warranty')).toHaveClass('data-disabled:opacity-50');
  });

  it('animates the panel height from the measured variable and fades the content', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(trigger('Shipping'));
    const panel = document.getElementById(trigger('Shipping').getAttribute('aria-controls')!)!;
    expect(panel).toHaveClass('h-(--accordion-panel-height)', 'overflow-hidden', 'data-starting-style:h-0', 'data-ending-style:h-0', 'duration-250', 'data-ending-style:duration-200');
    expect(panel.querySelector('[data-slot="accordion-content"]')).toHaveClass('group-data-starting-style/accordion-panel:opacity-0');
  });

  it('marks reduced motion from the system setting, a MotionProvider or the prop', () => {
    const root = () => document.querySelector('[data-slot="accordion"]');
    const { rerender } = render(<Example />);
    expect(root()).not.toHaveAttribute('data-reduced-motion');
    rerender(<Example reduceMotion />);
    expect(root()).toHaveAttribute('data-reduced-motion');
    rerender(<MotionProvider reducedMotion="always"><Example /></MotionProvider>);
    expect(root()).toHaveAttribute('data-reduced-motion');
    expect(document.querySelector('[data-slot="accordion-panel"], [data-slot="accordion-trigger"] svg')).toHaveClass('in-data-reduced-motion:transition-none', 'motion-reduce:transition-none');
  });

  it('hands variant and size to every item through the root', () => {
    const item = () => document.querySelector('[data-slot="accordion-item"]')!;
    const { rerender } = render(<Example defaultValue={['shipping']} />);
    expect(document.querySelector('[data-slot="accordion"]')).toHaveAttribute('data-variant', 'ghost');
    expect(item()).toHaveClass('border-b', 'border-border');
    expect(trigger('Shipping')).toHaveClass('text-base', 'min-h-12', 'focus-visible:outline-ring');

    rerender(<Example variant="card" size="sm" defaultValue={['shipping']} />);
    expect(document.querySelector('[data-slot="accordion"]')).toHaveAttribute('data-size', 'sm');
    expect(item()).toHaveClass('bg-card', 'rounded-[16px]', '[corner-shape:var(--corner-shape)]');
    expect(item()).not.toHaveClass('border-b');
    expect(trigger('Shipping')).toHaveClass('text-sm', 'px-3');
    expect(document.querySelector('[data-slot="accordion-content"]')).toHaveClass('px-3', 'pb-3');
  });

  it('forwards refs and merges classes', () => {
    const rootRef = createRef<HTMLDivElement>();
    const itemRef = createRef<HTMLDivElement>();
    const triggerRef = createRef<HTMLButtonElement>();
    const panelRef = createRef<HTMLDivElement>();
    render(<Accordion ref={rootRef} defaultValue={['a']} className="max-w-md">
      <AccordionItem ref={itemRef} value="a" className="custom-item">
        <AccordionTrigger ref={triggerRef} className="custom-trigger" headerProps={{ render: <h2 /> }}>A</AccordionTrigger>
        <AccordionPanel ref={panelRef} className="pb-6" panelClassName="custom-panel">Body</AccordionPanel>
      </AccordionItem>
    </Accordion>);
    expect(rootRef.current).toHaveAttribute('data-slot', 'accordion');
    expect(rootRef.current).toHaveClass('max-w-md');
    expect(itemRef.current).toHaveClass('custom-item');
    expect(triggerRef.current).toBe(trigger('A'));
    expect(triggerRef.current).toHaveClass('custom-trigger');
    expect(screen.getByRole('heading', { level: 2 })).toContainElement(triggerRef.current);
    expect(panelRef.current).toHaveClass('custom-panel');
    const content = panelRef.current!.querySelector('[data-slot="accordion-content"]');
    expect(content).toHaveClass('pb-6');
    expect(content).not.toHaveClass('pb-4');
  });

  it('replaces or removes the chevron with icon', () => {
    render(<Accordion>
      <AccordionItem value="a"><AccordionTrigger icon={null}>A</AccordionTrigger><AccordionPanel>One</AccordionPanel></AccordionItem>
      <AccordionItem value="b"><AccordionTrigger icon={<span data-testid="plus" />}>B</AccordionTrigger><AccordionPanel>Two</AccordionPanel></AccordionItem>
    </Accordion>);
    expect(trigger('A').querySelector('svg')).toBeNull();
    expect(trigger('B')).toContainElement(screen.getByTestId('plus'));
  });
});

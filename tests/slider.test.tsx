import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionProvider } from '@/registry/morphin/lib/motion';
import { Slider, SliderControl, SliderIndicator, SliderThumb, SliderTrack } from '@/registry/morphin/ui/slider';

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// jsdom has no layout, so Base UI keeps edge-aligned thumbs visibility-hidden: queries include hidden elements.

describe('Slider', () => {
  it('shows a label and the current value, and steps with the keyboard', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Slider label="Volume" defaultValue={30} step={5} onValueChange={onValueChange} />);
    const thumb = screen.getByRole('slider', { hidden: true });
    expect(thumb).toHaveAttribute('aria-labelledby', screen.getByText('Volume').id);
    expect(thumb).toHaveAttribute('aria-valuenow', '30');
    expect(screen.getByText('30').closest('[data-slot=slider-value]')).toBeInTheDocument();
    act(() => thumb.focus());
    await user.keyboard('{ArrowRight}');
    expect(thumb).toHaveAttribute('aria-valuenow', '35');
    expect(onValueChange).toHaveBeenLastCalledWith(35, expect.anything());
    expect(document.querySelector('[data-slot=slider-value]')).toHaveTextContent('35');
  });

  it('renders a thumb per value for ranges, with formatted values and thumb names', () => {
    render(<Slider
      label="Price"
      defaultValue={[100, 500]}
      max={1000}
      format={{ style: 'currency', currency: 'USD' }}
      locale="en-US"
      getThumbLabel={index => (index === 0 ? 'Minimum price' : 'Maximum price')}
    />);
    const [min, max] = screen.getAllByRole('slider', { hidden: true });
    expect(min).toHaveAttribute('aria-label', 'Minimum price');
    expect(min).toHaveAttribute('aria-valuenow', '100');
    expect(max).toHaveAttribute('aria-label', 'Maximum price');
    expect(max).toHaveAttribute('aria-valuenow', '500');
    expect(screen.getByText('$100.00 – $500.00')).toBeInTheDocument();
  });

  it('renders a custom value and hides it on request', () => {
    const { rerender } = render(<Slider label="Opacity" defaultValue={40} showValue={(_, [value]) => `${value} of 100`} />);
    expect(screen.getByText('40 of 100')).toBeInTheDocument();
    rerender(<Slider label="Opacity" defaultValue={40} showValue={false} />);
    expect(document.querySelector('[data-slot=slider-value]')).toBeNull();
  });

  it('supports vertical orientation and disabled state', () => {
    render(<Slider aria-label="Level" orientation="vertical" disabled defaultValue={20} />);
    const root = document.querySelector('[data-slot=slider]')!;
    expect(root).toHaveAttribute('data-orientation', 'vertical');
    expect(root).toHaveAttribute('data-disabled');
    expect(screen.getByRole('slider', { hidden: true })).toHaveAttribute('aria-orientation', 'vertical');
    expect(screen.getByRole('slider', { hidden: true })).toBeDisabled();
  });

  it('keeps the Morphin shape on the track, fill and thumb', () => {
    render(<Slider aria-label="Zoom" size="lg" defaultValue={50} />);
    expect(document.querySelector('[data-slot=slider-indicator]')).toHaveClass('data-[orientation=horizontal]:rounded-s-[999px]', 'rounded-none');
    for (const slot of ['slider-track', 'slider-thumb']) {
      expect(document.querySelector(`[data-slot=${slot}]`)).toHaveClass('rounded-[999px]', '[corner-shape:var(--corner-shape)]');
    }
    expect(document.querySelector('[data-slot=slider]')).toHaveClass('[--slider-track:28px]', '[--slider-thumb:36px]');
  });

  it('keeps the fill flat at the thumb for ranges, so no round end peeks out', () => {
    render(<Slider aria-label="Span" defaultValue={[20, 60]} />);
    const fill = document.querySelector('[data-slot=slider-indicator]');
    expect(fill).toHaveClass('data-[orientation=horizontal]:rounded-none', 'data-[orientation=vertical]:rounded-none');
    expect(fill).not.toHaveClass('data-[orientation=horizontal]:rounded-s-[999px]', 'data-[orientation=vertical]:rounded-b-[999px]');
  });

  it('shows the pressed state on the dragged thumb only, not on every thumb of a range', async () => {
    // jsdom has no pointer capture or layout.
    Object.assign(HTMLElement.prototype, { setPointerCapture() {}, releasePointerCapture() {}, hasPointerCapture: () => false });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 100, bottom: 20, width: 100, height: 20, toJSON() {} });
    render(<Slider aria-label="Span" defaultValue={[20, 80]} />);
    const thumbs = [...document.querySelectorAll<HTMLElement>('[data-slot=slider-thumb]')];
    const pressed = () => thumbs.filter(thumb => thumb.classList.contains('after:scale-90'));
    expect(pressed()).toHaveLength(0);
    fireEvent.pointerDown(thumbs[1], { pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1, clientX: 80, clientY: 0 });
    // Base UI reports dragging for the whole slider; the pressed style follows the one active thumb.
    for (const thumb of thumbs) expect(thumb).toHaveAttribute('data-dragging');
    await waitFor(() => expect(pressed()).toHaveLength(1));
    expect(pressed()[0]).toHaveClass('cursor-grabbing');
    fireEvent.pointerUp(document, { pointerId: 1, pointerType: 'mouse', button: 0 });
    await waitFor(() => expect(pressed()).toHaveLength(0));
  });

  it('composes custom anatomy from its parts', () => {
    render(<Slider aria-label="Custom" defaultValue={10}>
      <SliderControl><SliderTrack className="bg-secondary"><SliderIndicator /><SliderThumb /></SliderTrack></SliderControl>
    </Slider>);
    expect(document.querySelector('[data-slot=slider-header]')).toBeNull();
    expect(document.querySelector('[data-slot=slider-track]')).toHaveClass('bg-secondary');
    expect(screen.getByRole('slider', { hidden: true })).toHaveAttribute('aria-valuenow', '10');
  });

  it('marks reduced motion so the thumb press feedback switches off', () => {
    render(<MotionProvider reducedMotion="always"><Slider aria-label="Speed" defaultValue={1} /></MotionProvider>);
    expect(document.querySelector('[data-slot=slider]')).toHaveAttribute('data-reduced-motion');
    expect(document.querySelector('[data-slot=slider-thumb]')).toHaveClass('in-data-reduced-motion:after:transition-none');
  });
});

describe('Slider value', () => {
  it('shows the value as plain text that changes at once, with no per-digit animation', async () => {
    const user = userEvent.setup();
    render(<Slider label="Volume" defaultValue={39} />);
    const thumb = screen.getByRole('slider', { hidden: true });
    act(() => thumb.focus());
    await user.keyboard('{ArrowRight}');
    const output = document.querySelector('[data-slot=slider-value]')!;
    expect(output).toHaveTextContent(/^40$/);
    expect(output.querySelectorAll('[data-char]')).toHaveLength(0);
    expect(output).toHaveClass('tabular-nums');
  });
});

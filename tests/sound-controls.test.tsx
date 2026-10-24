import { useState, type ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundProvider } from '@/registry/morphin/lib/sound';
import { Switch } from '@/registry/morphin/ui/switch';
import { Checkbox, CheckboxCard, CheckboxGroup } from '@/registry/morphin/ui/checkbox';
import { Radio, RadioDot, RadioGroup } from '@/registry/morphin/ui/radio';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/registry/morphin/ui/tabs';
import { Slider } from '@/registry/morphin/ui/slider';
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from '@/registry/morphin/ui/accordion';
import { Input } from '@/registry/morphin/ui/input';
import { Textarea } from '@/registry/morphin/ui/textarea';
import { Calendar } from '@/registry/morphin/ui/calendar';

// The queue keeps its clock between tests, so every test starts well after the last cue.
beforeAll(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] }); });
afterAll(() => { vi.useRealTimers(); });
beforeEach(() => {
  vi.advanceTimersByTime(1000);
  // Reduced motion keeps GSAP out of these tests; sound does not depend on it.
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => { vi.unstubAllGlobals(); });

function withSound(ui: ReactNode, typing = false) {
  const player = vi.fn();
  const view = render(<SoundProvider player={player} typing={typing}>{ui}</SoundProvider>);
  return { player, view };
}

/** Runs one interaction, flushes the queue, then waits past the gesture window. */
function interact(run: () => void) {
  act(() => {
    run();
    vi.advanceTimersByTime(1);
  });
  vi.advanceTimersByTime(1000);
}

const click = (element: Element) => interact(() => fireEvent.click(element));
const key = (element: Element, value: string) => interact(() => fireEvent.keyDown(element, { key: value }));

describe('control sounds', () => {
  it('is silent without a provider', () => {
    const onCheckedChange = vi.fn();
    render(<>
      <Switch aria-label="Wi-Fi" onCheckedChange={onCheckedChange} />
      <Input aria-label="Name" />
    </>);
    click(screen.getByRole('switch', { name: 'Wi-Fi' }));
    key(screen.getByRole('textbox', { name: 'Name' }), 'a');
    expect(onCheckedChange).toHaveBeenCalledOnce();
  });

  it('toggles a switch forward and back, after its callback, never on mount or a controlled change', () => {
    const onCheckedChange = vi.fn();
    const { player, view } = withSound(<Switch aria-label="Wi-Fi" onCheckedChange={onCheckedChange} />);
    const control = screen.getByRole('switch', { name: 'Wi-Fi' });
    click(control);
    click(control);
    expect(onCheckedChange).toHaveBeenNthCalledWith(1, true, expect.objectContaining({ reason: 'none' }));
    expect(player.mock.calls).toEqual([['toggle', { direction: 'forward' }], ['toggle', { direction: 'back' }]]);
    view.unmount();

    const controlled = withSound(<Switch aria-label="Bluetooth" checked={false} />);
    controlled.view.rerender(<SoundProvider player={controlled.player}><Switch aria-label="Bluetooth" checked /></SoundProvider>);
    vi.advanceTimersByTime(1000);
    expect(controlled.player).not.toHaveBeenCalled();
  });

  it('does not play when the callback cancels the change', () => {
    const { player } = withSound(<Switch aria-label="Wi-Fi" onCheckedChange={(_, details) => details.cancel()} />);
    click(screen.getByRole('switch', { name: 'Wi-Fi' }));
    expect(player).not.toHaveBeenCalled();
  });

  it('toggles a checkbox and a checkbox card', () => {
    const { player } = withSound(<>
      <Checkbox label="Remember me" />
      <CheckboxCard title="Backups" defaultChecked />
    </>);
    click(screen.getByRole('checkbox', { name: 'Remember me' }));
    click(screen.getByRole('checkbox', { name: 'Backups' }));
    expect(player.mock.calls).toEqual([['toggle', { direction: 'forward' }], ['toggle', { direction: 'back' }]]);
  });

  it('toggles once per change in a group, the select-all parent included', () => {
    function Group() {
      const [value, setValue] = useState<string[]>([]);
      return <CheckboxGroup legend="Toppings" value={value} onValueChange={setValue} allValues={['cheese', 'ham', 'olives']}>
        <Checkbox parent label="All toppings" />
        <Checkbox value="cheese" label="Cheese" />
        <Checkbox value="ham" label="Ham" />
        <Checkbox value="olives" label="Olives" />
      </CheckboxGroup>;
    }
    const { player } = withSound(<Group />);
    click(screen.getByRole('checkbox', { name: 'All toppings' }));
    expect(screen.getByRole('checkbox', { name: 'Olives' })).toHaveAttribute('aria-checked', 'true');
    expect(player.mock.calls).toEqual([['toggle', { direction: 'forward' }]]);
    click(screen.getByRole('checkbox', { name: 'Ham' }));
    expect(player.mock.calls).toEqual([['toggle', { direction: 'forward' }], ['toggle', { direction: 'back' }]]);
  });

  it('selects a radio with a direction from the order of the radios, and RadioDot stays quiet', () => {
    const onValueChange = vi.fn();
    const { player } = withSound(<>
      <RadioGroup legend="Plan" defaultValue="pro" onValueChange={onValueChange}>
        <Radio value="free" label="Free" />
        <Radio value="pro" label="Pro" />
        <Radio value="max" label="Max" />
      </RadioGroup>
      <RadioDot selected />
    </>);
    click(screen.getByRole('radio', { name: 'Max' }));
    click(screen.getByRole('radio', { name: 'Free' }));
    expect(onValueChange).toHaveBeenNthCalledWith(1, 'max', expect.objectContaining({ reason: 'none' }));
    expect(player.mock.calls).toEqual([['select', { direction: 'forward' }], ['select', { direction: 'back' }]]);
    player.mockClear();
    click(screen.getByRole('radio', { name: 'Free' }));
    click(document.querySelector('[data-slot="radio-dot-glyph"]')!);
    expect(player).not.toHaveBeenCalled();
  });

  it('selects a tab subtly with a direction from the tab order, never for the initial tab', () => {
    const onValueChange = vi.fn();
    const { player } = withSound(<Tabs defaultValue="one" onValueChange={onValueChange}>
      <TabsList>
        <TabsTab value="one">One</TabsTab>
        <TabsTab value="two">Two</TabsTab>
        <TabsTab value="three">Three</TabsTab>
      </TabsList>
      <TabsPanel value="one">1</TabsPanel>
      <TabsPanel value="two">2</TabsPanel>
      <TabsPanel value="three">3</TabsPanel>
    </Tabs>);
    vi.advanceTimersByTime(1000);
    expect(player).not.toHaveBeenCalled();
    click(screen.getByRole('tab', { name: 'Three' }));
    click(screen.getByRole('tab', { name: 'Two' }));
    click(screen.getByRole('tab', { name: 'Two' }));
    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(player.mock.calls).toEqual([
      ['select', { emphasis: 'subtle', direction: 'forward' }],
      ['select', { emphasis: 'subtle', direction: 'back' }],
    ]);
  });

  it('selects subtly as a slider value goes up or down, only on real changes', () => {
    const onValueChange = vi.fn();
    const { player } = withSound(<Slider aria-label="Volume" defaultValue={50} max={100} onValueChange={onValueChange} />);
    const thumb = screen.getByRole('slider', { hidden: true });
    act(() => thumb.focus());
    key(thumb, 'ArrowRight');
    key(thumb, 'ArrowLeft');
    key(thumb, 'Home');
    key(thumb, 'Home');
    expect(onValueChange.mock.calls.map(([value]) => value)).toEqual([51, 50, 0]);
    expect(player.mock.calls).toEqual([
      ['select', { emphasis: 'subtle', direction: 'forward' }],
      ['select', { emphasis: 'subtle', direction: 'back' }],
      ['select', { emphasis: 'subtle', direction: 'back' }],
    ]);
  });

  it('reads the moved thumb of a controlled range', () => {
    function Range() {
      const [value, setValue] = useState<number[]>([20, 80]);
      return <Slider aria-label="Price" value={value} onValueChange={next => setValue([...next as number[]])} />;
    }
    const { player } = withSound(<Range />);
    const [, max] = screen.getAllByRole('slider', { hidden: true });
    act(() => max.focus());
    key(max, 'ArrowLeft');
    key(max, 'End');
    expect(player.mock.calls).toEqual([
      ['select', { emphasis: 'subtle', direction: 'back' }],
      ['select', { emphasis: 'subtle', direction: 'forward' }],
    ]);
  });

  it('opens and closes an accordion item subtly', () => {
    const { player } = withSound(<Accordion>
      <AccordionItem value="shipping">
        <AccordionTrigger>Shipping</AccordionTrigger>
        <AccordionPanel>Two days.</AccordionPanel>
      </AccordionItem>
    </Accordion>);
    const trigger = screen.getByRole('button', { name: 'Shipping' });
    click(trigger);
    click(trigger);
    expect(player.mock.calls).toEqual([['open', { emphasis: 'subtle' }], ['close', { emphasis: 'subtle' }]]);
  });

  it('plays keystrokes in text fields only with typing, and not when the caller prevented the key', () => {
    const silent = withSound(<Input aria-label="Name" />);
    key(screen.getByRole('textbox', { name: 'Name' }), 'a');
    expect(silent.player).not.toHaveBeenCalled();
    silent.view.unmount();

    const { player } = withSound(<>
      <Input aria-label="Name" />
      <Input aria-label="Code" onKeyDown={event => event.preventDefault()} />
      <Textarea aria-label="Bio" />
    </>, true);
    key(screen.getByRole('textbox', { name: 'Name' }), 'a');
    key(screen.getByRole('textbox', { name: 'Name' }), 'Enter');
    key(screen.getByRole('textbox', { name: 'Code' }), 'a');
    key(screen.getByRole('textbox', { name: 'Bio' }), ' ');
    key(screen.getByRole('textbox', { name: 'Bio' }), 'Enter');
    expect(player.mock.calls).toEqual([
      ['type', { key: 'printable' }],
      ['type', { key: 'space' }],
      ['type', { key: 'enter' }],
    ]);
  });

  it('lets a player that sounds typing from the DOM mark the field instead of being called', () => {
    const player = Object.assign(vi.fn(), { fieldProps: { 'data-cuelume-type': '' } });
    const view = render(<SoundProvider player={player} typing>
      <Input aria-label="Name" />
      <Textarea aria-label="Bio" />
    </SoundProvider>);
    const name = screen.getByRole('textbox', { name: 'Name' });
    const bio = screen.getByRole('textbox', { name: 'Bio' });
    // The attribute sits on the native field, which is where the player listens.
    expect(name.tagName).toBe('INPUT');
    expect(name).toHaveAttribute('data-cuelume-type');
    expect(bio.tagName).toBe('TEXTAREA');
    expect(bio).toHaveAttribute('data-cuelume-type');
    key(name, 'a');
    key(bio, 'a');
    expect(player).not.toHaveBeenCalled();

    // Typing is off, or sound is off: no attribute, so nothing can sound.
    view.rerender(<SoundProvider player={player}><Input aria-label="Name" /></SoundProvider>);
    expect(screen.getByRole('textbox', { name: 'Name' })).not.toHaveAttribute('data-cuelume-type');
    view.rerender(<SoundProvider player={player} typing enabled={false}><Input aria-label="Name" /></SoundProvider>);
    expect(screen.getByRole('textbox', { name: 'Name' })).not.toHaveAttribute('data-cuelume-type');
  });

  it('selects a day and navigates months with a direction', () => {
    const onMonthChange = vi.fn();
    const { player } = withSound(<Calendar
      mode="single"
      defaultMonth={new Date(2026, 9, 1)}
      today={new Date(2026, 9, 14)}
      disabled={{ before: new Date(2026, 9, 10) }}
      onMonthChange={onMonthChange}
      reduceMotion
    />);
    vi.advanceTimersByTime(1000);
    expect(player).not.toHaveBeenCalled();
    click(screen.getByRole('button', { name: /October 20th/ }));
    expect(player.mock.calls).toEqual([['select', undefined]]);
    player.mockClear();
    click(screen.getByRole('button', { name: /October 5th/ }));
    expect(player).not.toHaveBeenCalled();
    click(screen.getByRole('button', { name: /next month/i }));
    click(screen.getByRole('button', { name: /previous month/i }));
    expect(onMonthChange).toHaveBeenCalledTimes(2);
    expect(player.mock.calls).toEqual([
      ['navigate', { emphasis: 'subtle', direction: 'forward' }],
      ['navigate', { emphasis: 'subtle', direction: 'back' }],
    ]);
  });

  it('navigates from the caption dropdowns', () => {
    const { player } = withSound(<Calendar
      mode="single"
      captionLayout="dropdown"
      defaultMonth={new Date(2026, 9, 1)}
      startMonth={new Date(2020, 0, 1)}
      endMonth={new Date(2030, 11, 1)}
      reduceMotion
    />);
    const [months, years] = screen.getAllByRole('combobox');
    interact(() => fireEvent.change(months, { target: { value: '2' } }));
    interact(() => fireEvent.change(years, { target: { value: '2028' } }));
    expect(player.mock.calls).toEqual([
      ['navigate', { emphasis: 'subtle', direction: 'back' }],
      ['navigate', { emphasis: 'subtle', direction: 'forward' }],
    ]);
  });
});

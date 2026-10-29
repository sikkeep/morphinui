import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { gsap } from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { MotionProvider, motionTokens } from '@/registry/morphin/lib/motion';
import { Switch, SwitchGroup } from '@/registry/morphin/ui/switch';

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  // A 36 px track with a 2 px inset and a 16 px thumb leaves 16 px of travel.
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
    return this.dataset.slot === 'switch' ? 36 : 0;
  });
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
    return this.dataset.slot === 'switch-thumb' ? 16 : 0;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const thumbOf = (control: HTMLElement) => control.querySelector<HTMLElement>('[data-slot=switch-thumb]')!;

describe('Switch', () => {
  it('is named by its label, described by its description and toggles from the label row', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Switch label="Notifications" description="Email me about activity." onCheckedChange={onCheckedChange} />);
    const control = screen.getByRole('switch', { name: 'Notifications' });
    expect(control).toHaveAccessibleDescription('Email me about activity.');
    expect(control).toHaveAttribute('aria-checked', 'false');
    await user.click(screen.getByText('Email me about activity.'));
    expect(control).toHaveAttribute('aria-checked', 'true');
    expect(control).toHaveAttribute('data-checked');
    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
  });

  it('works with the keyboard and stays put when disabled', async () => {
    const user = userEvent.setup();
    render(<><Switch aria-label="Wi-Fi" /><Switch aria-label="Bluetooth" disabled /></>);
    await user.tab();
    const wifi = screen.getByRole('switch', { name: 'Wi-Fi' });
    expect(wifi).toHaveFocus();
    await user.keyboard(' ');
    expect(wifi).toHaveAttribute('aria-checked', 'true');
    const bluetooth = screen.getByRole('switch', { name: 'Bluetooth' });
    await user.click(bluetooth);
    expect(bluetooth).toHaveAttribute('aria-checked', 'false');
    expect(bluetooth).toHaveAttribute('data-disabled');
  });

  it('follows a controlled value and submits with its form', async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [on, setOn] = useState(true);
      return <form aria-label="Settings"><Switch name="beta" label="Beta" checked={on} onCheckedChange={setOn} /></form>;
    }
    render(<Controlled />);
    const form = screen.getByRole('form', { name: 'Settings' }) as HTMLFormElement;
    expect(new FormData(form).get('beta')).toBe('on');
    await user.click(screen.getByRole('switch', { name: 'Beta' }));
    expect(new FormData(form).get('beta')).toBeNull();
  });

  it('places the label before the track on request and keeps the size on the track', () => {
    render(<Switch label="Airplane mode" labelPosition="start" size="lg" />);
    const control = screen.getByRole('switch', { name: 'Airplane mode' });
    const row = control.closest('[data-slot=switch-field]')!;
    expect(row.firstElementChild).toHaveAttribute('data-slot', 'switch-content');
    expect(control).toHaveAttribute('data-size', 'lg');
    expect(control).toHaveClass('rounded-[999px]', '[corner-shape:var(--corner-shape)]', '[--switch-width:44px]');
  });

  it('stacks decorative thumb icons for a blur-and-scale swap', () => {
    render(<Switch aria-label="Dark mode" checkedIcon={<HugeiconsIcon icon={Tick02Icon} aria-hidden="true" />} uncheckedIcon={<HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />} />);
    const icons = screen.getByRole('switch').querySelectorAll('[data-slot=switch-icon]');
    expect(icons).toHaveLength(2);
    for (const icon of icons) {
      expect(icon).toHaveAttribute('aria-hidden', 'true');
      expect(icon).toHaveClass('[grid-area:1/1]', 'duration-250', 'in-data-reduced-motion:transition-none');
    }
    expect(icons[1]).toHaveClass('group-data-checked/switch:scale-25', 'group-data-checked/switch:blur-[2px]');
  });

  it('bounces the thumb from its old rest past the new one, and never on mount', async () => {
    const user = userEvent.setup();
    const fromTo = vi.spyOn(gsap, 'fromTo');
    const { unmount } = render(<Switch aria-label="Sync" defaultChecked style={{ padding: 2 }} />);
    expect(fromTo).not.toHaveBeenCalled();
    const control = screen.getByRole('switch');
    await user.click(control);
    expect(fromTo).toHaveBeenCalledTimes(1);
    const [target, from, to] = fromTo.mock.calls[0] as unknown as [HTMLElement, gsap.TweenVars, gsap.TweenVars];
    expect(target).toBe(thumbOf(control));
    // Turning off moves the rest to the start: the thumb starts 16 px to the right and overshoots left.
    expect(from.x).toBe(16);
    expect(to).toMatchObject({ x: -motionTokens.toggle.overshoot, duration: motionTokens.toggle.duration * 0.55 });
    await user.click(control);
    const [, back] = fromTo.mock.calls[1] as unknown as [HTMLElement, gsap.TweenVars];
    expect(Number(back.x)).toBeLessThan(0);
    unmount();
    expect(target.style.transform).toBe('');
  });

  it('skips the travel under reduced motion', async () => {
    const user = userEvent.setup();
    const fromTo = vi.spyOn(gsap, 'fromTo');
    render(<MotionProvider reducedMotion="always"><Switch aria-label="Sync" /></MotionProvider>);
    const control = screen.getByRole('switch');
    await user.click(control);
    expect(control).toHaveAttribute('aria-checked', 'true');
    expect(control).toHaveAttribute('data-reduced-motion');
    expect(fromTo).not.toHaveBeenCalled();
    expect(thumbOf(control).style.transform).toBe('');
  });
});

describe('SwitchGroup', () => {
  it('names its switches through a fieldset legend', () => {
    render(<SwitchGroup legend="Notifications" orientation="horizontal">
      <Switch label="Email" /><Switch label="Push" />
    </SwitchGroup>);
    const group = screen.getByRole('group', { name: 'Notifications' });
    expect(group.tagName).toBe('FIELDSET');
    expect(group).toHaveAttribute('data-orientation', 'horizontal');
    expect(screen.getAllByRole('switch')).toHaveLength(2);
  });
});

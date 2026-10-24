import { createRef, useRef, useState, type ReactNode } from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { gsap } from 'gsap';
import { Button } from '@/registry/morphin/ui/button';
import {
  Dropdown, DropdownTrigger, DropdownContent, DropdownItem, DropdownLinkItem,
  DropdownGroup, DropdownLabel, DropdownSeparator, DropdownRadioGroup, DropdownRadioItem,
  DropdownCheckboxItem, DropdownSub, DropdownSubTrigger, DropdownHighlight, useHighlightedElement,
} from '@/registry/morphin/ui/dropdown';
import { MotionProvider } from '@/registry/morphin/lib/motion';

afterEach(() => {
  gsap.globalTimeline.clear();
  gsap.ticker.sleep();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mockMenuLayout() {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  // jsdom has no layout; supply actual row geometry for motion assertions.
  vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (this: HTMLElement) {
    return { Inspo: 4, Vault: 40, Settings: 130, 'PNG image': 4 }[this.textContent as string] ?? 0;
  });
  vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (this: HTMLElement) {
    return { Light: 2, Dark: 80 }[this.getAttribute('aria-label') as string] ?? 4;
  });
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(216);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(36);
  vi.spyOn(HTMLElement.prototype, 'offsetParent', 'get').mockImplementation(function (this: HTMLElement) {
    return this.parentElement?.closest<HTMLElement>('[data-highlight-scope]') ?? null;
  });
}

function surfaceOf(scope: Element) {
  return Array.from(scope.querySelectorAll<HTMLElement>('[data-slot="dropdown-highlight"]')).find(surface => surface.parentElement === scope)!;
}

function ThemeExample() {
  const [section, setSection] = useState('inspo');
  const [theme, setTheme] = useState('light');
  return <Dropdown><DropdownTrigger>Account</DropdownTrigger><DropdownContent>
    <DropdownRadioGroup value={section} onValueChange={setSection}>
      <DropdownRadioItem value="inspo">Inspo</DropdownRadioItem>
      <DropdownRadioItem value="vault">Vault</DropdownRadioItem>
    </DropdownRadioGroup>
    <DropdownItem>Settings</DropdownItem>
    <DropdownSeparator />
    <DropdownLinkItem size="icon" href="https://x.com" aria-label="X">X</DropdownLinkItem>
    <DropdownRadioGroup variant="segmented" aria-label="Theme" value={theme} onValueChange={setTheme}>
      <DropdownRadioItem value="light" aria-label="Light">L</DropdownRadioItem>
      <DropdownRadioItem value="dark" aria-label="Dark">D</DropdownRadioItem>
    </DropdownRadioGroup>
  </DropdownContent></Dropdown>;
}

function Example({ onAction = () => {}, modal = true }) {
  const [value, setValue] = useState('inspo');
  const [checked, setChecked] = useState(false);
  return <><button>Outside</button><Dropdown modal={modal}>
    <DropdownTrigger render={<Button variant="outline" />}>Account</DropdownTrigger>
    <DropdownContent>
      <DropdownRadioGroup value={value} onValueChange={setValue}>
        <DropdownRadioItem value="inspo">Inspo</DropdownRadioItem>
        <DropdownRadioItem value="vault">Vault</DropdownRadioItem>
      </DropdownRadioGroup>
      <DropdownSeparator />
      <DropdownGroup><DropdownLabel>Actions</DropdownLabel>
        <DropdownItem disabled onClick={onAction}>Unavailable</DropdownItem>
        <DropdownItem onClick={onAction}>Settings</DropdownItem>
        <DropdownLinkItem href="/saved">Saved</DropdownLinkItem>
      </DropdownGroup>
      <DropdownCheckboxItem checked={checked} onCheckedChange={setChecked}>Show guides</DropdownCheckboxItem>
      <DropdownSub><DropdownSubTrigger>Export</DropdownSubTrigger>
        <DropdownContent side="inline-end" align="start"><DropdownItem onClick={onAction}>PNG image</DropdownItem></DropdownContent>
      </DropdownSub>
    </DropdownContent>
  </Dropdown></>;
}

describe('Dropdown', () => {
  it('opens with the keyboard, navigates, runs an action and restores focus', async () => {
    const action = vi.fn();
    const user = userEvent.setup();
    render(<Example onAction={action} />);
    const trigger = screen.getByRole('button', { name: 'Account' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    await screen.findByRole('menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('settings');
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Settings' })).toHaveFocus());
    await user.keyboard('{Enter}');
    expect(action).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('supports checked choices and checkbox updates without closing the menu', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole('button', { name: 'Account' }));
    expect(await screen.findByRole('menuitemradio', { name: 'Inspo' })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('menuitemradio', { name: 'Vault' }));
    expect(screen.getByRole('menuitemradio', { name: 'Vault' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemradio', { name: 'Inspo' })).toHaveAttribute('aria-checked', 'false');
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Show guides' }));
    expect(screen.getByRole('menuitemcheckbox')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('keeps disabled items inert and uses anchors for navigation', async () => {
    const action = vi.fn();
    const user = userEvent.setup();
    render(<Example onAction={action} />);
    await user.click(screen.getByRole('button', { name: 'Account' }));
    const disabled = await screen.findByRole('menuitem', { name: 'Unavailable' });
    expect(disabled).toHaveAttribute('aria-disabled', 'true');
    // CSS pointer-events is not applied by jsdom; exercise the handler guard.
    await user.click(disabled);
    expect(action).not.toHaveBeenCalled();
    const link = screen.getByRole('menuitem', { name: 'Saved' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/saved');
    expect(screen.getByRole('group', { name: 'Actions' })).toHaveAttribute('data-slot', 'dropdown-group');
  });

  it('dismisses with Escape or an outside interaction', async () => {
    const user = userEvent.setup();
    render(<Example modal={false} />);
    const trigger = screen.getByRole('button', { name: 'Account' });
    await user.click(trigger);
    await screen.findByRole('menu');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    await screen.findByRole('menu');
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('opens and selects nested menu items with the keyboard', async () => {
    const action = vi.fn();
    const user = userEvent.setup();
    render(<Example onAction={action} />);
    const trigger = screen.getByRole('button', { name: 'Account' });
    trigger.focus();
    await user.keyboard('{ArrowDown}export{ArrowRight}');
    const png = await screen.findByRole('menuitem', { name: 'PNG image' });
    await waitFor(() => expect(png).toHaveFocus());
    await user.keyboard('{Enter}');
    expect(action).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('forwards popup/trigger refs, merges callback classes and preserves themed portals', async () => {
    const trigger = createRef<HTMLButtonElement>();
    const popup = createRef<HTMLDivElement>();
    const user = userEvent.setup();
    function Themed() {
      const container = useRef<HTMLDivElement>(null);
      return <div className="dark" ref={container}><Dropdown>
        <DropdownTrigger ref={trigger}>Open</DropdownTrigger>
        <DropdownContent ref={popup} portalProps={{ container }} className={state => state.open ? 'w-64' : undefined}>
          <DropdownItem>Action</DropdownItem>
        </DropdownContent>
      </Dropdown></div>;
    }
    render(<Themed />);
    expect(trigger.current).toBe(screen.getByRole('button', { name: 'Open' }));
    await user.click(trigger.current!);
    await screen.findByRole('menu');
    expect(popup.current).toHaveClass('w-64');
    expect(popup.current).not.toHaveClass('w-56');
    expect(popup.current?.closest('.dark')).toBe(document.querySelector('.dark'));
  });

  it('uses the shared provider to disable menu transitions', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    const user = userEvent.setup();
    const { rerender } = render(<MotionProvider reducedMotion="system"><Example /></MotionProvider>);
    await user.click(screen.getByRole('button', { name: 'Account' }));
    const popup = await screen.findByRole('menu');
    expect(popup).not.toHaveAttribute('data-reduced-motion');
    expect(popup).toHaveClass('data-starting-style:opacity-0');
    rerender(<MotionProvider reducedMotion="always"><Example /></MotionProvider>);
    expect(popup).toHaveAttribute('data-reduced-motion', 'true');
    expect(popup).toHaveClass('transition-none');
    expect(popup).not.toHaveClass('data-starting-style:opacity-0');
  });

  it('slides one highlight on hover and interrupts it from its current position', async () => {
    mockMenuLayout();
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole('button', { name: 'Account' }));
    const popup = await screen.findByRole('menu');
    const surface = popup.querySelector<HTMLElement>('[data-slot="dropdown-highlight"]')!;
    await user.hover(screen.getByRole('menuitemradio', { name: 'Inspo' }));
    await waitFor(() => expect(Number(gsap.getProperty(surface, 'y'))).toBe(4));
    expect(gsap.getTweensOf(surface)).toHaveLength(0);

    await user.hover(screen.getByRole('menuitemradio', { name: 'Vault' }));
    await waitFor(() => expect(gsap.getTweensOf(surface).length).toBe(1));
    act(() => { gsap.getTweensOf(surface)[0].progress(0.2); });
    const interruptedY = Number(gsap.getProperty(surface, 'y'));
    expect(interruptedY).toBeGreaterThan(4);
    expect(interruptedY).toBeLessThan(40);
    await user.hover(screen.getByRole('menuitem', { name: 'Settings' }));
    expect(popup.querySelectorAll('[data-slot="dropdown-highlight"]')).toHaveLength(1);
    const tween = gsap.getTweensOf(surface)[0];
    expect(tween).toBeDefined();
    act(() => { tween.progress(0); });
    expect(Number(gsap.getProperty(surface, 'y'))).toBeGreaterThanOrEqual(interruptedY);
    act(() => { tween.progress(1); });
    expect(Number(gsap.getProperty(surface, 'y'))).toBe(130);
    expect(Number(gsap.getProperty(surface, 'width'))).toBe(216);
  });

  it('removes moving highlights and reverts active styles when motion is reduced or unmounted', async () => {
    mockMenuLayout();
    const user = userEvent.setup();
    const { rerender, unmount } = render(<MotionProvider reducedMotion="system"><Example /></MotionProvider>);
    await user.click(screen.getByRole('button', { name: 'Account' }));
    const popup = await screen.findByRole('menu');
    const surface = popup.querySelector<HTMLElement>('[data-slot="dropdown-highlight"]')!;
    await user.hover(screen.getByRole('menuitemradio', { name: 'Inspo' }));
    await user.hover(screen.getByRole('menuitemradio', { name: 'Vault' }));
    expect(gsap.getTweensOf(surface).length).toBeGreaterThan(0);
    rerender(<MotionProvider reducedMotion="always"><Example /></MotionProvider>);
    expect(popup.querySelector('[data-slot="dropdown-highlight"]')).toBeNull();
    expect(popup).not.toHaveAttribute('data-moving-highlight');
    expect(gsap.getTweensOf(surface)).toHaveLength(0);
    expect(surface.style.cssText).toBe('');
    expect(screen.getByRole('menuitemradio', { name: 'Vault' })).toHaveAttribute('data-highlighted');

    rerender(<MotionProvider reducedMotion="system"><Example /></MotionProvider>);
    const restored = popup.querySelector<HTMLElement>('[data-slot="dropdown-highlight"]')!;
    await user.hover(screen.getByRole('menuitem', { name: 'Settings' }));
    unmount();
    expect(gsap.getTweensOf(restored)).toHaveLength(0);
    expect(restored.style.cssText).toBe('');
  });

  it('keeps parent and submenu highlights independent and forwards highlight callbacks', async () => {
    mockMenuLayout();
    const highlighted = vi.fn();
    const user = userEvent.setup();
    render(<Dropdown onItemHighlighted={highlighted}><DropdownTrigger>Menu</DropdownTrigger><DropdownContent>
      <DropdownSub><DropdownSubTrigger>Export</DropdownSubTrigger><DropdownContent side="inline-end">
        <DropdownItem>PNG image</DropdownItem>
      </DropdownContent></DropdownSub>
    </DropdownContent></Dropdown>);
    screen.getByRole('button', { name: 'Menu' }).focus();
    await user.keyboard('{ArrowDown}');
    const parent = await screen.findByRole('menuitem', { name: 'Export' });
    await waitFor(() => expect(parent).toHaveFocus());
    await user.keyboard('{ArrowRight}');
    const child = await screen.findByRole('menuitem', { name: 'PNG image' });
    await waitFor(() => expect(child).toHaveFocus());
    expect(screen.getAllByRole('menu')).toHaveLength(2);
    expect(document.querySelectorAll('[data-slot="dropdown-highlight"]')).toHaveLength(2);
    // The parent surface stays on the open submenu trigger instead of fading out.
    const [parentMenu] = screen.getAllByRole('menu');
    expect(parent).toHaveAttribute('data-popup-open');
    await waitFor(() => expect(Number(gsap.getProperty(surfaceOf(parentMenu), 'opacity'))).toBe(1));
    expect(highlighted).toHaveBeenCalledWith(screen.getByRole('menuitem', { name: 'Export' }), expect.objectContaining({ label: 'Export' }));
  });

  it('rests on the checked choice when the highlight clears, without animating the first placement', async () => {
    mockMenuLayout();
    const user = userEvent.setup();
    render(<ThemeExample />);
    await user.click(screen.getByRole('button', { name: 'Account' }));
    const popup = await screen.findByRole('menu');
    const surface = surfaceOf(popup);
    await waitFor(() => expect(Number(gsap.getProperty(surface, 'opacity'))).toBe(1));
    expect(Number(gsap.getProperty(surface, 'y'))).toBe(4);
    expect(gsap.getTweensOf(surface)).toHaveLength(0);

    await user.hover(screen.getByRole('menuitem', { name: 'Settings' }));
    await waitFor(() => expect(gsap.getTweensOf(surface)).toHaveLength(1));
    act(() => { gsap.getTweensOf(surface)[0].progress(1); });
    expect(Number(gsap.getProperty(surface, 'y'))).toBe(130);

    // Moving into a segmented row returns the list surface to its checked item.
    await user.hover(screen.getByRole('menuitemradio', { name: 'Dark' }));
    await waitFor(() => expect(gsap.getTweensOf(surface)).toHaveLength(1));
    act(() => { gsap.getTweensOf(surface)[0].progress(1); });
    expect(Number(gsap.getProperty(surface, 'y'))).toBe(4);
    expect(Number(gsap.getProperty(surface, 'opacity'))).toBe(1);
  });

  it('gives segmented groups their own surface that follows hover and rests on the selection', async () => {
    mockMenuLayout();
    const user = userEvent.setup();
    render(<ThemeExample />);
    await user.click(screen.getByRole('button', { name: 'Account' }));
    const group = await screen.findByRole('group', { name: 'Theme' });
    expect(group).toHaveAttribute('data-variant', 'segmented');
    const segment = surfaceOf(group);
    await waitFor(() => expect(Number(gsap.getProperty(segment, 'x'))).toBe(2));
    expect(gsap.getTweensOf(segment)).toHaveLength(0);
    const dark = screen.getByRole('menuitemradio', { name: 'Dark' });
    expect(dark.querySelector('[data-slot="dropdown-item-indicator"]')).toBeNull();

    await user.hover(dark);
    await waitFor(() => expect(gsap.getTweensOf(segment)).toHaveLength(1));
    act(() => { gsap.getTweensOf(segment)[0].progress(1); });
    expect(Number(gsap.getProperty(segment, 'x'))).toBe(80);

    await user.hover(screen.getByRole('menuitem', { name: 'Settings' }));
    await waitFor(() => expect(gsap.getTweensOf(segment)).toHaveLength(1));
    act(() => { gsap.getTweensOf(segment)[0].progress(1); });
    await waitFor(() => expect(Number(gsap.getProperty(segment, 'x'))).toBe(2));
    expect(gsap.getTweensOf(segment)).toHaveLength(0);

    await user.click(dark);
    expect(dark).toHaveAttribute('aria-checked', 'true');
    await user.hover(screen.getByRole('menuitem', { name: 'Settings' }));
    await waitFor(() => expect(Number(gsap.getProperty(segment, 'x'))).toBe(80));
  });

  it('keeps a running slide when observing the new target reports its size', async () => {
    mockMenuLayout();
    // Browsers deliver an initial ResizeObserver entry for every observed element.
    vi.stubGlobal('ResizeObserver', class {
      constructor(private callback: ResizeObserverCallback) {}
      observe() { queueMicrotask(() => this.callback([], this as unknown as ResizeObserver)); }
      unobserve() {}
      disconnect() {}
    });
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole('button', { name: 'Account' }));
    const surface = surfaceOf(await screen.findByRole('menu'));
    await user.hover(screen.getByRole('menuitemradio', { name: 'Vault' }));
    await waitFor(() => expect(gsap.getTweensOf(surface)).toHaveLength(1));
    await act(() => new Promise(resolve => setTimeout(resolve)));
    expect(gsap.getTweensOf(surface)).toHaveLength(1);
    expect(gsap.getTweensOf(surface)[0].progress()).toBeLessThan(1);
  });

  it('shows the segmented selection statically when motion is reduced', async () => {
    const user = userEvent.setup();
    render(<MotionProvider reducedMotion="always"><ThemeExample /></MotionProvider>);
    await user.click(screen.getByRole('button', { name: 'Account' }));
    const group = await screen.findByRole('group', { name: 'Theme' });
    expect(document.querySelector('[data-slot="dropdown-highlight"]')).toBeNull();
    expect(screen.getByRole('menuitemradio', { name: 'Light' })).toHaveClass('data-checked:bg-foreground/12');
    expect(group).toHaveClass('flex');
  });

  it('holds the current row over separators and returns to the checked choice when the pointer leaves', async () => {
    mockMenuLayout();
    const user = userEvent.setup();
    render(<ThemeExample />);
    await user.click(screen.getByRole('button', { name: 'Account' }));
    const popup = await screen.findByRole('menu');
    const surface = surfaceOf(popup);
    await user.hover(screen.getByRole('menuitem', { name: 'Settings' }));
    await waitFor(() => expect(gsap.getTweensOf(surface)).toHaveLength(1));
    act(() => { gsap.getTweensOf(surface)[0].progress(1); });

    // Crossing a separator must not send the surface back toward Inspo.
    await user.hover(screen.getByRole('separator'));
    expect(screen.queryByRole('menuitem', { name: 'Settings' })).not.toHaveAttribute('data-highlighted');
    expect(gsap.getTweensOf(surface).filter(tween => tween.isActive())).toHaveLength(0);
    expect(Number(gsap.getProperty(surface, 'y'))).toBe(130);

    await user.unhover(popup);
    await waitFor(() => expect(gsap.getTweensOf(surface)).toHaveLength(1));
    act(() => { gsap.getTweensOf(surface)[0].progress(1); });
    expect(Number(gsap.getProperty(surface, 'y'))).toBe(4);
  });

  it('renders icon chips that the moving surface skips', async () => {
    mockMenuLayout();
    const user = userEvent.setup();
    render(<ThemeExample />);
    await user.click(screen.getByRole('button', { name: 'Account' }));
    const popup = await screen.findByRole('menu');
    const surface = surfaceOf(popup);
    const chip = screen.getByRole('menuitem', { name: 'X' });
    expect(chip).toHaveAttribute('data-highlight', 'none');
    expect(chip).toHaveClass('size-6.5', 'bg-accent');
    expect(chip).not.toHaveClass('px-2.5');

    await user.hover(screen.getByRole('menuitem', { name: 'Settings' }));
    await waitFor(() => expect(gsap.getTweensOf(surface)).toHaveLength(1));
    act(() => { gsap.getTweensOf(surface)[0].progress(1); });
    await user.hover(chip);
    await waitFor(() => expect(gsap.getTweensOf(surface)).toHaveLength(1));
    act(() => { gsap.getTweensOf(surface)[0].progress(1); });
    expect(Number(gsap.getProperty(surface, 'y'))).toBe(4);
  });

  it('sizes the segments of a segmented group: xs 24, sm 28 and md 32 px by default', async () => {
    const user = userEvent.setup();
    render(<MotionProvider reducedMotion="always">
      <Dropdown>
        <DropdownTrigger>Menu</DropdownTrigger>
        <DropdownContent>
          <DropdownRadioGroup variant="segmented" size="xs" aria-label="Theme" defaultValue="light">
            <DropdownRadioItem value="light" aria-label="Light">L</DropdownRadioItem>
            <DropdownRadioItem value="dark" aria-label="Dark">D</DropdownRadioItem>
          </DropdownRadioGroup>
          <DropdownRadioGroup variant="segmented" aria-label="Sound" defaultValue="on">
            <DropdownRadioItem value="on" aria-label="On">On</DropdownRadioItem>
          </DropdownRadioGroup>
        </DropdownContent>
      </Dropdown>
    </MotionProvider>);
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    const light = await screen.findByRole('menuitemradio', { name: 'Light' });
    expect(light.closest('[data-slot=dropdown-radio-group]')).toHaveAttribute('data-size', 'xs');
    expect(light).toHaveClass('min-h-6', 'min-w-6', 'p-1');
    expect(light).not.toHaveClass('min-h-9');
    expect(screen.getByRole('menuitemradio', { name: 'On' })).toHaveClass('min-h-8');
  });

  describe('width and icon position', () => {
    const icon = <svg data-testid="icon" />;
    async function open(content: Parameters<typeof DropdownContent>[0], items: ReactNode = null) {
      const user = userEvent.setup();
      render(<MotionProvider reducedMotion="always">
        <Dropdown>
          <DropdownTrigger>Menu</DropdownTrigger>
          <DropdownContent {...content}>{items}</DropdownContent>
        </Dropdown>
      </MotionProvider>);
      await user.click(screen.getByRole('button', { name: 'Menu' }));
      return screen.findByRole('menu');
    }
    const iconOf = (item: HTMLElement) => item.querySelector<HTMLElement>('[data-slot=dropdown-icon]')!;

    it('sets the width in pixels', async () => {
      expect((await open({ width: 300 })).style.width).toBe('300px');
    });

    it('matches the width of the trigger', async () => {
      expect((await open({ width: 'trigger' })).style.width).toBe('var(--anchor-width)');
    });

    it('takes any CSS length and keeps a function style', async () => {
      const menu = await open({ width: '20rem', style: { color: 'red' } });
      expect(menu.style.width).toBe('20rem');
      expect(menu.style.color).toBe('red');
    });

    it('puts the icon before the label by default', async () => {
      const menu = await open({}, <DropdownItem leadingIcon={icon}>Settings</DropdownItem>);
      const item = within(menu).getByRole('menuitem');
      expect(item.firstElementChild).toBe(iconOf(item));
      expect(iconOf(item)).toHaveAttribute('data-icon', 'inline-start');
      expect(iconOf(item)).not.toHaveClass('ms-auto');
      expect(menu).not.toHaveAttribute('data-icon-position');
    });

    it('puts every leading icon after its label at the right edge with iconPosition="end"', async () => {
      const menu = await open({ iconPosition: 'end' }, <>
        <DropdownItem leadingIcon={icon}>Settings</DropdownItem>
        <DropdownItem leadingIcon={icon} trailingIcon={<span data-testid="count">1</span>}>Saved</DropdownItem>
      </>);
      expect(menu).toHaveAttribute('data-icon-position', 'end');
      const [settings, saved] = within(menu).getAllByRole('menuitem');
      expect(settings.lastElementChild).toBe(iconOf(settings));
      expect(iconOf(settings)).toHaveAttribute('data-icon', 'inline-end');
      expect(iconOf(settings)).toHaveClass('ms-auto');
      // The trailing icon takes the free space and the leading icon is last, beside it.
      const parts = Array.from(saved.childNodes).map(node => (node as Element).getAttribute?.('data-slot') ?? node.textContent);
      expect(parts).toEqual(['Saved', 'dropdown-icon', 'dropdown-icon']);
      expect(saved.children[0]).toHaveClass('ms-auto');
      expect(saved.children[1]).not.toHaveClass('ms-auto');
    });

    it('keeps one flexible gap on radio, checkbox and submenu rows, so the check or chevron stays at the edge', async () => {
      const menu = await open({ iconPosition: 'end' }, <>
        <DropdownRadioGroup value="a">
          <DropdownRadioItem value="a" leadingIcon={icon}>Radio</DropdownRadioItem>
          <DropdownRadioItem value="b">Plain radio</DropdownRadioItem>
        </DropdownRadioGroup>
        <DropdownCheckboxItem checked leadingIcon={icon}>Check</DropdownCheckboxItem>
        <DropdownSub><DropdownSubTrigger leadingIcon={icon}>More</DropdownSubTrigger></DropdownSub>
      </>);
      const [radio, plain] = within(menu).getAllByRole('menuitemradio');
      expect(iconOf(radio)).toHaveClass('ms-auto');
      expect(radio.lastElementChild).not.toHaveClass('ms-auto');
      // With no icon the check takes the space itself.
      expect(plain.lastElementChild).toHaveClass('ms-auto');
      const check = within(menu).getByRole('menuitemcheckbox');
      expect(iconOf(check)).toHaveClass('ms-auto');
      expect(check.lastElementChild).not.toHaveClass('ms-auto');
      const sub = within(menu).getByRole('menuitem', { name: 'More' });
      expect(iconOf(sub)).toHaveClass('ms-auto');
      expect(sub.lastElementChild).not.toHaveClass('ms-auto');
    });

    it('lets a submenu inherit the icon position, and override it', async () => {
      const user = userEvent.setup();
      render(<MotionProvider reducedMotion="always">
        <Dropdown>
          <DropdownTrigger>Menu</DropdownTrigger>
          <DropdownContent iconPosition="end">
            <DropdownSub>
              <DropdownSubTrigger>More</DropdownSubTrigger>
              <DropdownContent side="inline-end" align="start">
                <DropdownItem leadingIcon={icon}>Inherits</DropdownItem>
              </DropdownContent>
            </DropdownSub>
          </DropdownContent>
        </Dropdown>
      </MotionProvider>);
      await user.click(screen.getByRole('button', { name: 'Menu' }));
      await user.click(await screen.findByRole('menuitem', { name: 'More' }));
      const inherits = await screen.findByRole('menuitem', { name: 'Inherits' });
      expect(iconOf(inherits)).toHaveAttribute('data-icon', 'inline-end');
    });
  });

  it('is non-modal by default so the page keeps scrolling, and locks it only when asked', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<><button>Outside</button><Dropdown><DropdownTrigger>Menu</DropdownTrigger>
      <DropdownContent><DropdownItem>Action</DropdownItem></DropdownContent></Dropdown></>);
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await screen.findByRole('menu');
    expect(document.body.style.overflowY).not.toBe('hidden');
    expect(document.documentElement.style.overflowY).not.toBe('hidden');
    unmount();

    render(<><button>Outside</button><Dropdown modal><DropdownTrigger>Menu</DropdownTrigger>
      <DropdownContent><DropdownItem>Action</DropdownItem></DropdownContent></Dropdown></>);
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await screen.findByRole('menu');
    await waitFor(() => expect(document.documentElement.style.overflowY).toBe('hidden'));
  });

  it('animates the first appearance and every return after the surface faded out', async () => {
    mockMenuLayout();
    const user = userEvent.setup();
    // Nothing is checked, so the surface has no resting item and fades out when the pointer leaves.
    render(<Dropdown><DropdownTrigger>Menu</DropdownTrigger><DropdownContent>
      <DropdownItem>Vault</DropdownItem><DropdownItem>Settings</DropdownItem>
    </DropdownContent></Dropdown>);
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    const popup = await screen.findByRole('menu');
    const surface = surfaceOf(popup);

    // The first hover fades in place: it is already at the row, but not yet visible.
    await user.hover(screen.getByRole('menuitem', { name: 'Settings' }));
    await waitFor(() => expect(gsap.getTweensOf(surface)).toHaveLength(1));
    act(() => { gsap.getTweensOf(surface)[0].pause().progress(0); });
    expect(Number(gsap.getProperty(surface, 'y'))).toBe(130);
    expect(Number(gsap.getProperty(surface, 'opacity'))).toBeLessThan(1);
    act(() => { gsap.getTweensOf(surface)[0].progress(1); });
    expect(Number(gsap.getProperty(surface, 'opacity'))).toBe(1);

    await user.unhover(popup);
    await waitFor(() => expect(gsap.getTweensOf(surface)).toHaveLength(1));
    act(() => { gsap.getTweensOf(surface)[0].progress(1); });
    expect(Number(gsap.getProperty(surface, 'opacity'))).toBe(0);

    // Returning to another row glides in from where the surface left instead of popping in.
    await user.hover(screen.getByRole('menuitem', { name: 'Vault' }));
    await waitFor(() => expect(gsap.getTweensOf(surface)).toHaveLength(1));
    // Hold the tween at its start so the real-time ticker cannot advance it before the assertions.
    act(() => { gsap.getTweensOf(surface)[0].pause().progress(0); });
    expect(Number(gsap.getProperty(surface, 'y'))).toBe(130);
    expect(Number(gsap.getProperty(surface, 'opacity'))).toBe(0);
    act(() => { gsap.getTweensOf(surface)[0].progress(1); });
    expect(Number(gsap.getProperty(surface, 'y'))).toBe(40);
    expect(Number(gsap.getProperty(surface, 'opacity'))).toBe(1);
  });

  it('closes the menu when a link item is chosen, unless closeOnClick is turned off', async () => {
    const user = userEvent.setup();
    function Links({ keepOpen = false }) {
      return <Dropdown><DropdownTrigger>Menu</DropdownTrigger><DropdownContent>
        <DropdownLinkItem href="#first" closeOnClick={keepOpen ? false : undefined}>First</DropdownLinkItem>
      </DropdownContent></Dropdown>;
    }
    const { unmount } = render(<Links />);
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await user.click(await screen.findByRole('menuitem', { name: 'First' }));
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    unmount();

    render(<Links keepOpen />);
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await user.click(await screen.findByRole('menuitem', { name: 'First' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('follows the active row of a custom list, such as a cmdk palette whose rows carry data-disabled="false"', async () => {
    mockMenuLayout();
    function Palette({ selected }: { selected: string }) {
      const [scope, setScope] = useState<HTMLDivElement | null>(null);
      const item = useHighlightedElement(scope, '[cmdk-item][data-selected=true]');
      return <div ref={setScope} data-highlight-scope="" data-testid="palette">
        <DropdownHighlight item={item} />
        {['Inspo', 'Vault'].map(name => <div key={name} cmdk-item="" role="option" data-disabled="false" data-selected={selected === name}>{name}</div>)}
      </div>;
    }
    const { rerender } = render(<Palette selected="Inspo" />);
    const surface = surfaceOf(screen.getByTestId('palette'));
    // The first row appears in place (no slide), once the hook has read it after the first frame.
    await waitFor(() => expect(Number(gsap.getProperty(surface, 'y'))).toBe(4));
    act(() => { gsap.getTweensOf(surface).forEach(tween => tween.progress(1)); });

    rerender(<Palette selected="Vault" />);
    await waitFor(() => expect(gsap.getTweensOf(surface)).toHaveLength(1));
    act(() => { gsap.getTweensOf(surface)[0].progress(1); });
    expect(Number(gsap.getProperty(surface, 'y'))).toBe(40);
  });
});

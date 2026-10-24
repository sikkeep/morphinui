import { StrictMode, useState, type ReactNode } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { gsap } from 'gsap';
import { SoundProvider, type SoundPlayer } from '@/registry/morphin/lib/sound';
import {
  Dropdown, DropdownCheckboxItem, DropdownContent, DropdownItem, DropdownLinkItem, DropdownRadioGroup,
  DropdownRadioItem, DropdownSub, DropdownSubTrigger, DropdownTrigger,
} from '@/registry/morphin/ui/dropdown';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/registry/morphin/ui/select';
import { Modal, ModalContent, ModalTitle, ModalTrigger } from '@/registry/morphin/ui/modal';
import { DatePicker } from '@/registry/morphin/ui/date-picker';
import { toast, Toaster } from '@/registry/morphin/ui/toast';

// The queue keeps its clock between tests. Only `performance` is faked, so the clock moves when a test
// says so (past the 50 ms repeat and the 250 ms gesture windows) while Base UI's timers run for real.
beforeAll(() => { vi.useFakeTimers({ toFake: ['performance'] }); });
afterAll(() => { vi.useRealTimers(); });

const player = vi.fn<SoundPlayer>();
beforeEach(() => {
  vi.advanceTimersByTime(1000);
  player.mockClear();
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => {
  act(() => toast.dismiss());
  gsap.globalTimeline.clear();
  gsap.ticker.sleep();
  vi.unstubAllGlobals();
});

/** The cues played since the last call. The queue plays on the next tick (a tap waits a frame); the clock then moves on. */
async function heard() {
  await act(() => new Promise(done => setTimeout(done, 40)));
  const calls = player.mock.calls.map(([cue, options]) => [cue, options]);
  player.mockClear();
  vi.advanceTimersByTime(1000);
  return calls;
}

const subtle = { emphasis: 'subtle' };
/**
 * A person's click on a menu or select trigger. Those open a frame after mousedown, before the button is
 * released, so the trigger's own tap comes after the open and is dropped as part of the same gesture.
 */
async function press(user: ReturnType<typeof userEvent.setup>, target: Element, role: string) {
  await user.pointer({ keys: '[MouseLeft>]', target });
  await screen.findByRole(role);
  await user.pointer({ keys: '[/MouseLeft]', target });
}
const withSound = (node: ReactNode) => <SoundProvider player={player}>{node}</SoundProvider>;

function Menu({ onOpenChange, open }: { onOpenChange?: (open: boolean, details: unknown) => void; open?: boolean }) {
  const [value, setValue] = useState('a');
  return <Dropdown open={open} onOpenChange={onOpenChange}>
    <DropdownTrigger>Menu</DropdownTrigger>
    <DropdownContent>
      <DropdownItem>Rename</DropdownItem>
      <DropdownLinkItem href="#docs">Docs</DropdownLinkItem>
      <DropdownCheckboxItem defaultChecked={false}>Pinned</DropdownCheckboxItem>
      <DropdownRadioGroup value={value} onValueChange={setValue}>
        <DropdownRadioItem value="a" closeOnClick>Alpha</DropdownRadioItem>
        <DropdownRadioItem value="b" closeOnClick>Beta</DropdownRadioItem>
      </DropdownRadioGroup>
      <DropdownSub>
        <DropdownSubTrigger>More</DropdownSubTrigger>
        <DropdownContent><DropdownItem>Archive</DropdownItem></DropdownContent>
      </DropdownSub>
    </DropdownContent>
  </Dropdown>;
}

describe('overlay sounds', () => {
  it('sounds a dropdown opening like picking an item, closes it quietly, and passes the change through untouched', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(withSound(<Menu onOpenChange={onOpenChange} />));
    await press(user, screen.getByRole('button', { name: 'Menu' }), 'menu');
    expect(await heard()).toEqual([['select', undefined]]);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(await heard()).toEqual([['close', subtle]]);
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onOpenChange.mock.calls[1][0]).toBe(false);
    expect(typeof onOpenChange.mock.calls[1][1].preventUnmountOnClose).toBe('function');
  });

  it('plays select for an item, a link item and a radio item, over the close they cause', async () => {
    const user = userEvent.setup();
    render(withSound(<Menu />));
    const trigger = screen.getByRole('button', { name: 'Menu' });
    for (const name of ['Rename', 'Docs', 'Beta']) {
      await press(user, trigger, 'menu');
      await heard();
      await user.click(await screen.findByText(name));
      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
      expect(await heard()).toEqual([['select', { input: 'mouse' }]]);
    }
  });

  it('plays a toggle with its direction for a checkbox item', async () => {
    const user = userEvent.setup();
    render(withSound(<Menu />));
    await press(user, screen.getByRole('button', { name: 'Menu' }), 'menu');
    await heard();
    await user.click(await screen.findByRole('menuitemcheckbox', { name: 'Pinned' }));
    expect(await heard()).toEqual([['toggle', { direction: 'forward' }]]);
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Pinned' }));
    expect(await heard()).toEqual([['toggle', { direction: 'back' }]]);
  });

  it('sounds a submenu opening like picking an item', async () => {
    const user = userEvent.setup();
    render(withSound(<Menu />));
    await press(user, screen.getByRole('button', { name: 'Menu' }), 'menu');
    await heard();
    screen.getByRole('menuitem', { name: 'More' }).focus();
    await user.keyboard('{ArrowRight}');
    await screen.findByRole('menuitem', { name: 'Archive' });
    expect(await heard()).toEqual([['select', undefined]]);
  });

  it('stays quiet when the app opens or closes a dropdown or a modal itself', async () => {
    const { rerender } = render(withSound(<Menu open={false} />));
    rerender(withSound(<Menu open />));
    await screen.findByRole('menu');
    rerender(withSound(<Menu open={false} />));
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    const dialog = (open: boolean) => withSound(<Modal open={open}><ModalContent><ModalTitle>Hi</ModalTitle></ModalContent></Modal>);
    rerender(dialog(true));
    await screen.findByRole('dialog');
    rerender(dialog(false));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await heard()).toEqual([]);
  });

  it('sounds a select opening like a pick, closes it quietly, and plays select for a pick', async () => {
    const user = userEvent.setup();
    render(withSound(<Select>
      <SelectTrigger aria-label="Fruit" placeholder="Pick" />
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
      </SelectContent>
    </Select>));
    const trigger = screen.getByRole('combobox', { name: 'Fruit' });
    await press(user, trigger, 'listbox');
    expect(await heard()).toEqual([['select', undefined]]);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(await heard()).toEqual([['close', subtle]]);
    await press(user, trigger, 'listbox');
    await heard();
    await user.click(await screen.findByRole('option', { name: 'Banana' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(await heard()).toEqual([['select', undefined]]);
  });

  it('plays open and close for a modal', async () => {
    const user = userEvent.setup();
    render(withSound(<Modal>
      <ModalTrigger>Open</ModalTrigger>
      <ModalContent><ModalTitle>Hello</ModalTitle></ModalContent>
    </Modal>));
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await screen.findByRole('dialog');
    expect(await heard()).toEqual([['open', undefined]]);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await heard()).toEqual([['close', undefined]]);
  });

  it('plays a quiet open and close for a date picker, and no close for the pick that closes it', async () => {
    const user = userEvent.setup();
    const today = new Date(2026, 9, 14);
    render(withSound(<DatePicker aria-label="Due" calendarProps={{ today, defaultMonth: today }} />));
    const trigger = screen.getByRole('button', { name: /Due/ });
    await user.click(trigger);
    await screen.findByRole('dialog');
    expect(await heard()).toEqual([['open', subtle]]);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await heard()).toEqual([['close', subtle]]);
    await user.click(trigger);
    await heard();
    await user.click(await screen.findByRole('button', { name: /October 20th, 2026/ }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // The calendar sounds the pick itself.
    expect((await heard()).map(([cue]) => cue)).not.toContain('close');
  });

  it('plays what a toast reports when it appears and when its state changes, and nothing when it closes', async () => {
    render(withSound(<Toaster timeout={0} />));
    let id = '';
    act(() => { id = toast.loading('Uploading'); });
    await screen.findByText('Uploading');
    expect(await heard()).toEqual([['loading', subtle]]);
    act(() => toast.update(id, { title: 'Uploaded', state: 'success' }));
    await screen.findByText('Uploaded');
    expect(await heard()).toEqual([['success', subtle]]);
    act(() => toast.update(id, { title: 'Still uploaded' }));
    await screen.findByText('Still uploaded');
    expect(await heard()).toEqual([]);
    act(() => { toast.error('Failed'); });
    await waitFor(() => expect(screen.getAllByText('Failed').length).toBeGreaterThan(0));
    expect(await heard()).toEqual([['error', subtle]]);
    act(() => { toast('Copied'); });
    await waitFor(() => expect(screen.getAllByText('Copied').length).toBeGreaterThan(0));
    expect(await heard()).toEqual([['ready', subtle]]);
    act(() => toast.dismiss());
    await waitFor(() => expect(screen.queryByText('Copied')).not.toBeInTheDocument());
    expect(await heard()).toEqual([]);
  });

  it('plays a toast once across Toasters, Strict Mode and a remounted Toaster', async () => {
    const { rerender } = render(<StrictMode>{withSound(<><Toaster key="a" timeout={0} /><Toaster timeout={0} /></>)}</StrictMode>);
    act(() => { toast.success('Saved'); });
    await waitFor(() => expect(screen.getAllByText('Saved').length).toBeGreaterThan(0));
    expect(await heard()).toEqual([['success', subtle]]);
    rerender(<StrictMode>{withSound(<><Toaster key="b" timeout={0} /><Toaster timeout={0} /></>)}</StrictMode>);
    await waitFor(() => expect(screen.getAllByText('Saved').length).toBeGreaterThan(0));
    expect(await heard()).toEqual([]);
  });

  it('is silent where sound is off', async () => {
    const user = userEvent.setup();
    render(<SoundProvider player={player} enabled={false}>
      <Menu />
      <Toaster timeout={0} />
    </SoundProvider>);
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Rename' }));
    act(() => { toast.success('Quiet'); });
    await screen.findByText('Quiet');
    expect(await heard()).toEqual([]);
  });

  it('works without a provider', async () => {
    const user = userEvent.setup();
    render(<><Menu /><Toaster timeout={0} /></>);
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Rename' }));
    act(() => { toast.success('Alone'); });
    expect(await screen.findByText('Alone')).toBeInTheDocument();
    expect(await heard()).toEqual([]);
  });
});

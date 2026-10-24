import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundProvider, soundInput, typedKey, useSound, type SoundCue, type SoundOptions } from '@/registry/morphin/lib/sound';

// The queue keeps its clock between tests, so every test starts well after the last cue.
beforeAll(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] }); });
afterAll(() => { vi.useRealTimers(); });
beforeEach(() => { vi.advanceTimersByTime(1000); });

function Cues({ cues }: { cues: Array<[SoundCue, SoundOptions?]> }) {
  const play = useSound();
  return <button type="button" onClick={() => cues.forEach(([cue, options]) => play(cue, options))}>go</button>;
}

// A tap waits a frame for a richer cue of the same click, so every press lets that frame pass.
const press = () => act(() => {
  fireEvent.click(screen.getByRole('button', { name: 'go' }));
  vi.advanceTimersByTime(30);
});

describe('sound', () => {
  it('is silent without a provider and when a region turns it off', () => {
    const player = vi.fn();
    const { rerender } = render(<Cues cues={[['tap']]} />);
    press();
    rerender(<SoundProvider player={player} enabled={false}><Cues cues={[['tap']]} /></SoundProvider>);
    press();
    rerender(<SoundProvider player={player}><SoundProvider enabled={false}><Cues cues={[['tap']]} /></SoundProvider></SoundProvider>);
    press();
    expect(player).not.toHaveBeenCalled();
  });

  it('plays through the nearest provider, and a nested provider inherits the player', () => {
    const player = vi.fn();
    render(<SoundProvider player={player}><SoundProvider><Cues cues={[['toggle', { direction: 'back' }]]} /></SoundProvider></SoundProvider>);
    press();
    expect(player).toHaveBeenCalledWith('toggle', { direction: 'back' });
  });

  it('plays keystrokes only when typing is asked for', () => {
    const player = vi.fn();
    const { rerender } = render(<SoundProvider player={player}><Cues cues={[['type', { key: 'printable' }]]} /></SoundProvider>);
    press();
    expect(player).not.toHaveBeenCalled();
    rerender(<SoundProvider player={player} typing><Cues cues={[['type', { key: 'printable' }]]} /></SoundProvider>);
    press();
    expect(player).toHaveBeenCalledWith('type', { key: 'printable' });
  });

  it('plays only the most specific cue of one interaction', () => {
    const player = vi.fn();
    const { rerender } = render(<SoundProvider player={player}><Cues cues={[['tap'], ['open']]} /></SoundProvider>);
    press();
    expect(player.mock.calls).toEqual([['open', undefined]]);
    vi.advanceTimersByTime(1000);
    player.mockClear();
    rerender(<SoundProvider player={player}><Cues cues={[['select'], ['close'], ['tap']]} /></SoundProvider>);
    press();
    expect(player.mock.calls).toEqual([['select', undefined]]);
  });

  it('drops a tap that follows a richer cue of the same gesture, and a cue repeated within 50 ms', () => {
    const player = vi.fn();
    const { rerender } = render(<SoundProvider player={player}><Cues cues={[['open']]} /></SoundProvider>);
    press();
    rerender(<SoundProvider player={player}><Cues cues={[['tap']]} /></SoundProvider>);
    vi.advanceTimersByTime(100);
    press();
    expect(player.mock.calls.map(([cue]) => cue)).toEqual(['open']);
    vi.advanceTimersByTime(300);
    press();
    expect(player.mock.calls.map(([cue]) => cue)).toEqual(['open', 'tap']);
    vi.advanceTimersByTime(1000);
    rerender(<SoundProvider player={player}><Cues cues={[['select']]} /></SoundProvider>);
    press();
    vi.advanceTimersByTime(10);
    press();
    expect(player.mock.calls.map(([cue]) => cue)).toEqual(['open', 'tap', 'select']);
  });

  it('holds a tap for a frame, so an open that lands just after it in the same click replaces it', () => {
    const player = vi.fn();
    function Quick() {
      const play = useSound();
      return <button type="button" onClick={() => { play('tap'); setTimeout(() => play('open', { emphasis: 'subtle' }), 16); }}>go</button>;
    }
    render(<SoundProvider player={player}><Quick /></SoundProvider>);
    press();
    expect(player.mock.calls).toEqual([['open', { emphasis: 'subtle' }]]);
  });

  it('reads the input method and the typed key', () => {
    let input: SoundOptions['input'];
    const keys: SoundOptions['key'][] = [];
    render(<>
      <button type="button" onClick={(event) => { input = soundInput(event); }}>b</button>
      <input aria-label="text" defaultValue="ab" onKeyDown={(event) => keys.push(typedKey(event))} />
      <input aria-label="secret" type="password" onKeyDown={(event) => keys.push(typedKey(event))} />
    </>);
    fireEvent.click(screen.getByRole('button', { name: 'b' }), { detail: 0 });
    expect(input).toBe('keyboard');
    fireEvent.click(screen.getByRole('button', { name: 'b' }), { detail: 1 });
    expect(input).toBe('mouse');
    const field = screen.getByRole('textbox', { name: 'text' }) as HTMLInputElement;
    field.setSelectionRange(2, 2);
    for (const key of ['x', ' ', 'Backspace', 'Enter', 'Shift']) fireEvent.keyDown(field, { key });
    fireEvent.keyDown(field, { key: 'c', metaKey: true });
    field.setSelectionRange(0, 0);
    fireEvent.keyDown(field, { key: 'Backspace' });
    fireEvent.keyDown(screen.getByLabelText('secret'), { key: 'x' });
    expect(keys).toEqual(['printable', 'space', 'delete', undefined, undefined, undefined, undefined, undefined]);
  });
});

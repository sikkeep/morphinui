import { beforeEach, describe, expect, it, vi } from 'vitest';

const cuelume = vi.hoisted(() => ({
  bind: vi.fn(),
  play: vi.fn(),
  setTheme: vi.fn(),
  setVolume: vi.fn(),
  unlock: vi.fn(),
}));
vi.mock('cuelume', () => cuelume);

const { cuelumeSound, setSoundButtonTheme, setSoundTheme, setSoundVolume, unlockSound } = await import('@/registry/morphin/lib/sound-cuelume');

describe('cuelumeSound', () => {
  beforeEach(() => cuelume.play.mockClear());

  it('binds Cuelume once on load, so a field marked data-cuelume-type sounds its own typing', () => {
    expect(cuelume.bind).toHaveBeenCalledTimes(1);
    expect(cuelumeSound.fieldProps).toEqual({ 'data-cuelume-type': '' });
  });

  it('plays a button tap as the select cue the tabs use, always subtle, in place of the glassy tap', () => {
    cuelumeSound('tap', { input: 'mouse', emphasis: 'normal' });
    expect(cuelume.play).toHaveBeenCalledWith('select', { input: 'mouse', emphasis: 'subtle' });
    cuelumeSound('tap');
    expect(cuelume.play).toHaveBeenLastCalledWith('select', { emphasis: 'subtle' });
  });

  it('gives buttons a material of their own, at the emphasis they ask for, and goes back with undefined', () => {
    setSoundButtonTheme('mech');
    cuelumeSound('tap', { input: 'mouse', emphasis: 'normal' });
    expect(cuelume.play).toHaveBeenLastCalledWith('tap', { input: 'mouse', emphasis: 'normal', theme: 'mech' });
    cuelumeSound('tap', { emphasis: 'subtle' });
    expect(cuelume.play).toHaveBeenLastCalledWith('tap', { emphasis: 'subtle', theme: 'mech' });
    // Other cues keep the app's theme.
    cuelumeSound('toggle', { direction: 'back' });
    expect(cuelume.play).toHaveBeenLastCalledWith('toggle', { direction: 'back' });
    setSoundButtonTheme(undefined);
    cuelumeSound('tap', { emphasis: 'normal' });
    expect(cuelume.play).toHaveBeenLastCalledWith('select', { emphasis: 'subtle' });
  });

  it('plays every other cue as it is', () => {
    cuelumeSound('toggle', { direction: 'back' });
    expect(cuelume.play).toHaveBeenLastCalledWith('toggle', { direction: 'back' });
    cuelumeSound('success', { emphasis: 'subtle' });
    expect(cuelume.play).toHaveBeenLastCalledWith('success', { emphasis: 'subtle' });
  });

  it('passes the settings through to Cuelume', () => {
    setSoundTheme('mech');
    setSoundVolume(0.5);
    void unlockSound();
    expect(cuelume.setTheme).toHaveBeenCalledWith('mech');
    expect(cuelume.setVolume).toHaveBeenCalledWith(0.5);
    expect(cuelume.unlock).toHaveBeenCalled();
  });
});

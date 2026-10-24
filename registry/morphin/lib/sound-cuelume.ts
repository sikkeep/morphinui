import { bind, play, setTheme, setVolume, unlock, type ThemeName } from 'cuelume';
import type { SoundPlayer } from '@/registry/morphin/lib/sound';

// Typing is sounded by Cuelume itself (it presses on keydown, lets go on keyup, skips passwords and follows
// held deletes), from the `data-cuelume-type` attribute that Input and Textarea carry while typing is on.
if (typeof document !== 'undefined') bind();

let buttonTheme: ThemeName | undefined;

/**
 * Plays Morphin's cues with Cuelume (MIT, Daniel Belyi): sounds synthesized live with Web Audio, with no
 * audio files. Pass it to `SoundProvider` as `player`. A button's `tap` sounds like Cuelume's `select`, the
 * crisp woody detent that tabs use, in place of its glassy `tap`, unless `setSoundButtonTheme` gives buttons
 * a material of their own.
 */
export const cuelumeSound: SoundPlayer = Object.assign(
  (...[cue, options]: Parameters<SoundPlayer>) => {
    if (cue !== 'tap') play(cue, options);
    // A material of its own: the theme's own tap, at the emphasis the button asked for.
    else if (buttonTheme) play('tap', { ...options, theme: buttonTheme });
    else play('select', { ...options, emphasis: 'subtle' });
  },
  { fieldProps: { 'data-cuelume-type': '' } },
);

/**
 * Gives every button press one material, whatever the rest of the sounds use: `mech` is a dry shutter
 * click, `bubble` a playful knock. `undefined` goes back to the tabs' woody detent. Keep the choice in your app.
 */
export function setSoundButtonTheme(theme: ThemeName | undefined) {
  buttonTheme = theme;
}

/**
 * Starts audio now. Call it from the click that turns sound on: some browsers only start audio inside a
 * user gesture, and a cue played later from code (a toast for a finished upload) would stay silent.
 */
export const unlockSound = unlock;

/** The material of every cue: `default`, `mech`, `bubble` or `press`. Keep the user's choice in your app. */
export const setSoundTheme = setTheme;

/** A volume multiplier, 0 to 1, for every cue. */
export const setSoundVolume = setVolume;

export type SoundTheme = ThemeName;

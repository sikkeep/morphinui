import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

type Palette = Record<string, string>;
const registry = JSON.parse(
  readFileSync(join(import.meta.dirname, '../registry.json'), 'utf8'),
) as {
  items: { name: string; cssVars?: { light: Palette; dark: Palette } }[];
};
const tokens = registry.items.find((item) => item.name === 'tokens')!.cssVars!;
const theme = registry.items.find((item) => item.name === 'theme')!.cssVars!;
const chart = registry.items.find(
  (item) => item.name === 'bar-chart',
)!.cssVars!;

function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((channel) => {
      const srgb = Number.parseInt(channel, 16) / 255;
      return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
    });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(a: string, b: string) {
  const light = Math.max(luminance(a), luminance(b));
  const dark = Math.min(luminance(a), luminance(b));
  return (light + 0.05) / (dark + 0.05);
}

describe('Morphin brand palette', () => {
  for (const mode of ['light', 'dark'] as const) {
    it(`keeps accent button text readable in every ${mode} state with an independent chart color`, () => {
      for (const state of ['brand', 'brand-hover', 'brand-active']) {
        expect(
          contrast(tokens[mode][state], tokens[mode]['brand-foreground']),
          `${mode} ${state}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
      expect(
        contrast(tokens[mode].brand, theme[mode].card),
      ).toBeGreaterThanOrEqual(3);
      expect(
        contrast(theme[mode].ring, theme[mode].background),
      ).toBeGreaterThanOrEqual(3);
      expect(chart[mode]['bar-chart']).toBe('#4cd676');
      expect(chart[mode]['bar-chart']).not.toBe(tokens[mode].brand);
    });
  }
});

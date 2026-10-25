import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const sources = join(import.meta.dirname, '../registry/morphin');
const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true })
  .flatMap(entry => entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)])
  .filter(file => /\.(tsx?|css)$/.test(file));

describe('registry conventions', () => {
  it('draws icons with lucide-react, never with hardcoded svg markup', () => {
    for (const file of files(sources)) {
      // Charts draw data with SVG paths; everything else must use lucide for glyphs.
      if (/chart-pro|split-bar-pro/.test(file)) continue;
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/<svg[\s>]/);
    }
  });

  it('sizes text with the type scale, never with an arbitrary pixel value', () => {
    // text-2xs ... text-6xl: their metrics come from the typography and tokens items, so a project that
    // retunes the scale retunes every component, and nothing sits between two steps (13px, say).
    for (const file of files(sources)) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/\btext-\[\d+(\.\d+)?(px|rem|em)\]/);
    }
  });

  it('writes recipe classes as complete strings, so Tailwind can find them', () => {
    for (const file of files(sources).filter(file => file.endsWith('-variants.ts'))) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/\$\{/);
    }
  });

  it('uses the React 19 API: ref as a prop, contexts rendered and read directly', () => {
    for (const file of files(sources)) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toMatch(/\bforwardRef\b|\buseContext\b|\bReact\.\w/);
      // `<SomeContext value>` instead of `<SomeContext.Provider>`; Base UI components named Provider are fine.
      expect(source, file).not.toMatch(/<\w*Context\.Provider\b/);
    }
  });

  it('does not use the retired display font', () => {
    for (const file of files(sources)) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/instrument[-_ ]?serif|font-serif/i);
    }
  });

  it('keeps Pro files out of the public registry, and every source file in some registry', () => {
    const read = (name: string) => JSON.parse(readFileSync(join(import.meta.dirname, '..', name), 'utf8')) as { items: { files?: { path: string }[] }[] };
    const paths = (name: string) => read(name).items.flatMap(item => item.files?.map(file => file.path) ?? []);
    const pro = existsSync(join(import.meta.dirname, '../registry-pro.json')) ? paths('registry-pro.json') : [];
    const free = paths('registry.json');
    for (const path of pro) expect(free, path).not.toContain(path);
    for (const path of free) expect(path, path).not.toMatch(/-pro[.-]/);
    for (const file of files(sources)) {
      const relative = file.slice(join(import.meta.dirname, '..').length + 1);
      expect([...free, ...pro], relative).toContain(relative);
    }
  });

  it('never lets free code or the public build reach Pro', () => {
    type Item = { name: string; files?: { path: string; content?: string }[]; registryDependencies?: string[] };
    const free = JSON.parse(readFileSync(join(import.meta.dirname, '../registry.json'), 'utf8')) as { items: Item[] };
    for (const item of free.items) {
      for (const dependency of item.registryDependencies ?? []) expect(dependency, item.name).not.toMatch(/-pro$/);
      for (const file of item.files ?? []) {
        const source = readFileSync(join(import.meta.dirname, '..', file.path), 'utf8');
        // `toast-pro`, `toast-pro-variants`, `./x-pro.tsx`; not a module that merely contains "-pro" (`labelable-provider`).
        expect(source, file.path).not.toMatch(/from ['"][^'"]*-pro(?:[-.][^'"]*)?['"]/);
      }
    }
    // The built public registry (when present) must not carry a Pro file.
    const built = join(import.meta.dirname, '../public/r');
    if (!existsSync(built)) return;
    for (const name of readdirSync(built).filter(file => file.endsWith('.json'))) {
      const item = JSON.parse(readFileSync(join(built, name), 'utf8')) as Item & { items?: Item[] };
      for (const entry of [item, ...(item.items ?? [])]) {
        expect(entry.name, name).not.toMatch(/-pro$/);
        for (const file of entry.files ?? []) expect(file.path, name).not.toMatch(/-pro[.-]/);
      }
    }
  });
});

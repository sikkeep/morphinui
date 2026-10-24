import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./', import.meta.url));

// Tests resolve `@/` like a project that installed the registry: `@/registry/morphin/...` for the
// sources and `@/lib/utils` for the shadcn `cn` helper. Visual work happens on morphin.dev/docs
// (`npm run site:install`), not in a preview app here.
export default defineConfig({
  resolve: { alias: { '@': root } },
  test: {
    root,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});

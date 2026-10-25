// Copies the built registry (public/r) into the morphin.dev site, which serves it at
// https://morphin.dev/r/{name}.json, and README.md as the site's `features/docs/content/library.md`, the
// body of /llms-full.txt. Run `npm run registry:build` first.
// MORPHIN_SITE_DIR points at the site; it defaults to the sibling cmllia/front checkout.
import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = join(root, 'public/r');
const site = resolve(root, process.env.MORPHIN_SITE_DIR ?? '../cmllia/front');
const target = join(site, 'public/r');

if (!existsSync(source)) throw new Error('public/r does not exist. Run `npm run registry:build` first.');
if (!existsSync(join(site, 'package.json'))) throw new Error(`${site} is not the site project. Set MORPHIN_SITE_DIR.`);

// Replace the folder so removed items do not linger on the site.
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });
console.log(`Copied ${(await readdir(target)).length} files to ${target}`);

const readme = join(site, 'features/docs/content/library.md');
await mkdir(join(readme, '..'), { recursive: true });
await cp(join(root, 'README.md'), readme);
console.log(`Copied README.md to ${readme}`);

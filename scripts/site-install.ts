// Installs registry items into the morphin.dev site (../cmllia/front) the way a user would, with the real
// shadcn CLI, from this checkout instead of the deployed registry. It replaces the manual routine:
//
//   1. build the registry (and the Pro registry with --pro) and copy public/r into the site,
//   2. serve public/r and build/r-pro on a local port,
//   3. point the site's components.json at that port, run `shadcn add … --overwrite`, put it back,
//   4. drop the self-referencing `--x: var(--x);` lines the CLI appends to the site's CSS,
//   5. format the installed files with the site's own Prettier.
//
// Usage: npm run site:install [-- [--pro] [--no-build] [item…]]
// Without items it installs every component item (and every Pro item with --pro).
// MORPHIN_SITE_DIR points at the site; it defaults to the sibling cmllia/front checkout.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import type { AddressInfo } from 'node:net';

const root = resolve(import.meta.dirname, '..');
const site = resolve(root, process.env.MORPHIN_SITE_DIR ?? '../cmllia/front');
const args = process.argv.slice(2);
const withPro = args.includes('--pro');
const build = !args.includes('--no-build');
const requested = args.filter(arg => !arg.startsWith('--'));

if (!existsSync(join(site, 'components.json'))) throw new Error(`${site} has no components.json. Set MORPHIN_SITE_DIR.`);

function run(command: string, commandArgs: string[], cwd: string) {
  return new Promise<void>((done, fail) => {
    const child = spawn(command, commandArgs, { cwd, stdio: 'inherit', env: { ...process.env, CI: '1' } });
    child.on('close', code => code === 0 ? done() : fail(new Error(`${command} ${commandArgs.join(' ')} exited with ${code}`)));
  });
}

type Registry = { items: { name: string; type: string }[] };
const readRegistry = async (file: string) => JSON.parse(await readFile(join(root, file), 'utf8')) as Registry;
const free = await readRegistry('registry.json');
const pro = withPro || requested.some(name => name.endsWith('-pro')) ? await readRegistry('registry-pro.json') : { items: [] };

const items = requested.length > 0
  ? requested
  : [...free.items.filter(item => item.type === 'registry:ui').map(item => item.name), ...pro.items.map(item => item.name)];
for (const name of items) {
  const known = [...free.items, ...pro.items].some(item => item.name === name);
  if (!known) throw new Error(`There is no registry item named "${name}".`);
}

if (build) {
  await run('npm', ['run', 'registry:build'], root);
  if (pro.items.length > 0) await run('npm', ['run', 'registry:pro:build'], root);
  await run('npm', ['run', 'registry:sync'], root);
}

/** Serves public/r and build/r-pro, like morphin.dev and the Pro worker (without the license check). */
const server = createServer(async (request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname));
  const base = path.startsWith('/r-pro/') ? join(root, 'build') : join(root, 'public');
  const file = join(base, path);
  if (!file.startsWith(base) || !existsSync(file) || extname(file) !== '.json') {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'content-type': 'application/json' }).end(await readFile(file));
});
await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

const configFile = join(site, 'components.json');
const originalConfig = await readFile(configFile, 'utf8');
const config = JSON.parse(originalConfig) as { tailwind: { css: string }; aliases: { components: string }; registries?: Record<string, string> };
const cssFile = join(site, config.tailwind.css);

try {
  config.registries = { ...config.registries, '@morphin': `${url}/r/{name}.json`, '@morphin-pro': `${url}/r-pro/{name}.json` };
  await writeFile(configFile, `${JSON.stringify(config, null, 2)}\n`);
  const shadcn = join(root, 'node_modules/.bin/shadcn');
  await run(shadcn, ['add', ...items.map(name => name.endsWith('-pro') ? `@morphin-pro/${name}` : `@morphin/${name}`), '--overwrite', '--yes', '--cwd', site], site);
} finally {
  await writeFile(configFile, originalConfig);
  server.close();
}

// The CLI maps every new variable onto itself inside `@theme inline`; those lines do nothing.
const css = await readFile(cssFile, 'utf8');
const selfReference = /^[ \t]*--([\w-]+):[ \t]*var\(--\1\);[ \t]*\n/gm;
const removed = css.match(selfReference)?.length ?? 0;
if (removed > 0) await writeFile(cssFile, css.replace(selfReference, ''));

// `@/x` is the site's root alias, so `@/shared/ui/morphin` is the folder the CLI wrote to.
const installed = config.aliases.components.replace(/^@\//, '');
if (existsSync(join(site, 'node_modules/.bin/prettier'))) {
  await run(join(site, 'node_modules/.bin/prettier'), ['--write', '--log-level', 'warn', installed], site);
}

console.log(`Installed ${items.join(', ')} into ${site}${removed > 0 ? `; removed ${removed} self-referencing CSS lines` : ''}.`);

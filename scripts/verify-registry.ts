// Installs the registry into a fresh shadcn project with the real shadcn CLI, then type-checks,
// builds and server-renders it. Requires network access (npm and the shadcn `utils` item).
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';
import type { AddressInfo } from 'node:net';

const root = resolve(import.meta.dirname, '..');
// The public repository ships without Pro; then the Pro scenario is skipped.
const withPro = existsSync(join(root, 'registry-pro.json'));
const fixture = join(root, 'tests/fixtures/registry-consumer');
const shadcn = join(root, 'node_modules/.bin/shadcn');

function run(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = { ...process.env, CI: '1' }) {
  return new Promise<string>((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    child.on('close', code => code === 0 ? resolvePromise(output) : reject(new Error(`${command} ${args.join(' ')} exited with ${code}\n${output}`)));
  });
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Serves public/ the way morphin.dev serves /r/{name}.json. */
async function serveRegistry() {
  const publicDir = join(root, 'public');
  const server = createServer(async (request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname));
    const file = join(publicDir, path);
    if (!file.startsWith(publicDir) || !existsSync(file) || extname(file) !== '.json') {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'content-type': 'application/json' }).end(await readFile(file));
  });
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  return { server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}


const maxToken = 'max-account-token';
const proToken = 'pro-account-token';
const freeToken = 'free-account-token';

/**
 * A stand-in for morphin.dev and its Pro worker (cmllia/worker-pro), with the same contract:
 * `GET /api/cli/whoami` answers for a token, and `/components/max/{name}.json` needs a Max (Lifetime)
 * account (401 AUTH_REQUIRED without a token, 401 UNAUTHORIZED for an unknown one, 403 PRO_REQUIRED
 * without a paid plan, 403 MAX_REQUIRED for the quarterly plan, which is Pro only).
 */
async function serveProRegistry() {
  const built = join(root, 'build/r-pro');
  const files = new Map<string, string>();
  for (const file of await readdir(built)) files.set(file, await readFile(join(built, file), 'utf8'));
  const accounts = new Map([
    [maxToken, { email: 'max@example.com', isPro: true, isMax: true, plan: 'MAX' }],
    [proToken, { email: 'pro@example.com', isPro: true, isMax: false, plan: 'PRO' }],
    [freeToken, { email: 'free@example.com', isPro: false, isMax: false, plan: 'FREE' }],
  ]);
  const send = (response: import('node:http').ServerResponse, status: number, body: unknown) =>
    response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'private, no-store' }).end(JSON.stringify(body));
  const server = createServer((request, response) => {
    const { pathname } = new URL(request.url ?? '/', 'http://localhost');
    const auth = /^Bearer\s+(\S+)$/.exec(request.headers.authorization ?? '')?.[1];
    const account = auth ? accounts.get(auth) : undefined;
    if (pathname === '/api/cli/whoami') return account ? send(response, 200, account) : send(response, 401, { error: 'Unauthorized' });
    const item = /^\/components\/max\/([a-z0-9-]+\.json)$/.exec(pathname)?.[1];
    if (!item) return send(response, 404, { error: 'Not found' });
    if (!auth) return send(response, 401, { error: 'AUTH_REQUIRED' });
    if (!account) return send(response, 401, { error: 'UNAUTHORIZED' });
    if (!account.isPro) return send(response, 403, { error: 'PRO_REQUIRED' });
    if (!account.isMax) return send(response, 403, { error: 'MAX_REQUIRED' });
    const file = files.get(item);
    return file ? response.writeHead(200, { 'content-type': 'application/json' }).end(file) : send(response, 404, { error: 'Not found' });
  });
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  return { server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}

const expectedFiles = [
  'src/components/ui/ai-chat.tsx', 'src/components/ui/chat.tsx', 'src/components/ui/chat-variants.ts',
  'src/components/ui/prompt-input.tsx', 'src/components/ui/prompt-input-variants.ts',
  'src/components/ui/bar-chart.tsx', 'src/components/ui/bar-chart-variants.ts', 'src/components/ui/bar-chart-motion.tsx',
  'src/components/ui/data-table.tsx', 'src/components/ui/data-table-variants.ts',
  'src/components/ui/button.tsx', 'src/components/ui/button-variants.ts', 'src/components/ui/button-content.tsx',
  'src/components/ui/dropdown.tsx', 'src/components/ui/dropdown-variants.ts', 'src/components/ui/dropdown-highlight.tsx',
  'src/components/ui/select.tsx', 'src/components/ui/select-variants.ts',
  'src/components/ui/button-group.tsx', 'src/components/ui/split-button.tsx',
  'src/components/ui/link-button.tsx', 'src/components/ui/link-button-variants.ts',
  'src/components/ui/badge.tsx', 'src/components/ui/badge-variants.ts',
  'src/components/ui/chip.tsx', 'src/components/ui/chip-variants.ts',
  'src/components/ui/avatar.tsx', 'src/components/ui/avatar-variants.ts',
  'src/components/ui/card.tsx', 'src/components/ui/card-variants.ts',
  'src/components/ui/announcement.tsx', 'src/components/ui/announcement-variants.ts',
  'src/components/ui/checkbox.tsx', 'src/components/ui/checkbox-variants.ts',
  'src/components/ui/radio.tsx', 'src/components/ui/radio-variants.ts',
  'src/components/ui/action-card.tsx', 'src/components/ui/action-card-variants.ts', 'src/components/ui/action-card-menu.tsx',
  'src/components/ui/toast.tsx', 'src/components/ui/toast-variants.ts', 'src/components/ui/toast-effects.ts',
  'src/components/ui/input.tsx', 'src/components/ui/textarea.tsx',
  'src/components/ui/field.tsx', 'src/components/ui/text-field-variants.ts', 'src/components/ui/text-field-feedback.tsx',
  'src/components/ui/switch.tsx', 'src/components/ui/switch-variants.ts',
  'src/components/ui/slider.tsx', 'src/components/ui/slider-variants.ts',
  'src/components/ui/modal.tsx', 'src/components/ui/modal-variants.ts',
  'src/components/ui/tabs.tsx', 'src/components/ui/tabs-variants.ts',
  'src/components/ui/accordion.tsx', 'src/components/ui/accordion-variants.ts',
  'src/components/ui/calendar.tsx', 'src/components/ui/calendar-variants.ts', 'src/components/ui/date-picker.tsx',
  'src/components/ui/spinner.tsx', 'src/components/ui/skeleton.tsx',
  'src/lib/motion.tsx', 'src/lib/sound.tsx', 'src/lib/sound-cuelume.ts', 'src/lib/utils.ts',
];

// The components every scenario installs; they pull in button, motion and tokens through registryDependencies.
const components = ['@morphin/ai-chat', '@morphin/bar-chart', '@morphin/data-table', '@morphin/dropdown', '@morphin/select', '@morphin/button-group', '@morphin/split-button', '@morphin/link-button', '@morphin/badge', '@morphin/chip', '@morphin/avatar', '@morphin/card', '@morphin/announcement', '@morphin/checkbox', '@morphin/radio', '@morphin/action-card', '@morphin/action-card-menu', '@morphin/toast', '@morphin/input', '@morphin/textarea', '@morphin/switch', '@morphin/slider', '@morphin/modal', '@morphin/tabs', '@morphin/accordion', '@morphin/calendar', '@morphin/date-picker', '@morphin/spinner', '@morphin/skeleton', '@morphin/sound-cuelume'];

async function scenario(name: string, items: string[], registryUrl: string, checkCss: (css: string) => void) {
  const project = await mkdtemp(join(tmpdir(), `morphin-registry-${name}-`));
  try {
    await cp(fixture, project, { recursive: true });
    const components = join(project, 'components.json');
    await writeFile(components, (await readFile(components, 'utf8')).replace('__MORPHIN_REGISTRY__', registryUrl));

    console.log(`[${name}] Installing the fixture…`);
    await run('npm', ['install', '--no-audit', '--no-fund', '--prefer-offline'], project);
    console.log(`[${name}] shadcn add ${items.join(' ')}`);
    await run(shadcn, ['add', ...items, '--yes', '--cwd', project], project);

    for (const file of expectedFiles) {
      const source = await readFile(join(project, file), 'utf8').catch(() => undefined);
      assert(source !== undefined, `[${name}] ${file} was not installed`);
      assert(!source.includes('@/registry/'), `[${name}] ${file} still imports from @/registry`);
    }
    const css = await readFile(join(project, 'src/index.css'), 'utf8');
    assert(css.includes('--corner-shape: superellipse(1.2)'), `[${name}] tokens were not written to src/index.css`);
    assert(css.includes('--color-brand: var(--brand)'), `[${name}] token utilities were not added to @theme inline`);
    assert(css.includes('--color-subtle-foreground: var(--subtle-foreground)') && css.includes('--success:'), `[${name}] text levels and status colors are missing`);
    assert(css.includes('--color-bar-chart: var(--bar-chart)') && css.includes('--bar-chart:'), `[${name}] the bar chart palette is missing`);
    checkCss(css);

    console.log(`[${name}] Type-checking, building and rendering on the server…`);
    await run('npm', ['run', 'check:types'], project);
    await run('npm', ['run', 'build'], project);
    await run('npm', ['run', 'check:ssr'], project);
    const assets = join(project, 'dist/assets');
    const stylesheet = (await readdir(assets)).find(file => file.endsWith('.css'));
    assert(stylesheet, `[${name}] the build produced no stylesheet`);
    const built = await readFile(join(assets, stylesheet), 'utf8');
    for (const marker of ['superellipse(1.2)', '.bg-primary', '.bg-brand', '.bg-bar-chart', '.shadow-popover', '.rounded-\\[999px\\]']) {
      assert(built.includes(marker), `[${name}] the built CSS is missing ${marker}`);
    }
    console.log(`[${name}] passed.`);
  } finally {
    await rm(project, { recursive: true, force: true });
  }
}

const cli = join(root, 'packages/morphinui/dist/index.js');

/** `npx morphinui add`: sets the @morphin registry up in a project that does not have it, then installs through shadcn. */
async function cliScenario(registryUrl: string) {
  const name = 'morphinui-cli';
  const project = await mkdtemp(join(tmpdir(), `morphin-registry-${name}-`));
  const env = { ...process.env, CI: '1', MORPHIN_REGISTRY_URL: `${registryUrl}/r`, MORPHINUI_SHADCN: shadcn };
  const morphinui = (...args: string[]) => run('node', [cli, ...args, '--cwd', project], project, env);
  try {
    await cp(fixture, project, { recursive: true });
    const file = join(project, 'components.json');
    const config = JSON.parse(await readFile(file, 'utf8')) as { registries?: unknown };
    delete config.registries;
    await writeFile(file, JSON.stringify(config, null, 2));

    console.log(`[${name}] Installing the fixture…`);
    await run('npm', ['install', '--no-audit', '--no-fund', '--prefer-offline'], project);

    const listing = await morphinui('list');
    for (const item of ['button', 'dropdown', 'modal', 'slider', 'switch', 'tabs']) assert(new RegExp(`^${item}\\s`, 'm').test(listing), `[${name}] list does not show ${item}`);

    console.log(`[${name}] morphinui add button @morphin/switch`);
    await morphinui('add', 'button', '@morphin/switch', '--yes');
    const installed = JSON.parse(await readFile(file, 'utf8')) as { registries?: Record<string, string> };
    assert(installed.registries?.['@morphin'] === `${registryUrl}/r/{name}.json`, `[${name}] the @morphin registry was not added to components.json`);
    for (const path of ['src/components/ui/button.tsx', 'src/components/ui/switch.tsx', 'src/components/ui/switch-variants.ts', 'src/lib/motion.tsx']) {
      assert(existsSync(join(project, path)), `[${name}] ${path} was not installed`);
    }
    assert((await readFile(join(project, 'src/index.css'), 'utf8')).includes('--corner-shape: superellipse(1.2)'), `[${name}] tokens were not written to src/index.css`);

    console.log(`[${name}] passed.`);
  } finally {
    await rm(project, { recursive: true, force: true });
  }
}

/** `morphinui add toast-pro`: refused without a license, installed with one, and the Pro effects type-check, build and render. */
async function proScenario(registryUrl: string, siteUrl: string) {
  const name = 'morphinui-pro';
  const project = await mkdtemp(join(tmpdir(), `morphin-registry-${name}-`));
  const config = await mkdtemp(join(tmpdir(), 'morphinui-config-'));
  const base: NodeJS.ProcessEnv = { ...process.env, CI: '1', MORPHIN_REGISTRY_URL: `${registryUrl}/r`, MORPHIN_SITE_URL: siteUrl, MORPHINUI_SHADCN: shadcn, MORPHINUI_CONFIG_DIR: config };
  delete base.MORPHIN_TOKEN;
  delete base.MORPHIN_PRO_URL;
  const morphinui = (env: NodeJS.ProcessEnv, ...args: string[]) => run('node', [cli, ...args, '--cwd', project], project, env);
  try {
    await cp(fixture, project, { recursive: true });
    const file = join(project, 'components.json');
    const json = JSON.parse(await readFile(file, 'utf8')) as { registries?: unknown };
    delete json.registries;
    await writeFile(file, JSON.stringify(json, null, 2));
    console.log(`[${name}] Installing the fixture…`);
    await run('npm', ['install', '--no-audit', '--no-fund', '--prefer-offline'], project);

    const refused = await morphinui(base, 'add', 'toast-pro', '--yes').then(() => false, () => true);
    assert(refused, `[${name}] a Pro component was installed without signing in`);
    const wrong = await morphinui(base, 'login', '--token', 'not-a-token').then(() => false, () => true);
    assert(wrong, `[${name}] login accepted an unknown token`);
    await morphinui(base, 'login', '--token', freeToken);
    const notPro = await morphinui(base, 'add', 'toast-pro', '--yes').then(() => false, () => true);
    assert(notPro, `[${name}] a Max component was installed for an account without a plan`);
    // The quarterly plan is Pro only: Max content needs Lifetime.
    await morphinui(base, 'login', '--token', proToken);
    assert((await morphinui(base, 'whoami')).includes('Pro'), `[${name}] whoami does not report Pro`);
    const notMax = await morphinui(base, 'add', 'toast-pro', '--yes').then(() => false, () => true);
    assert(notMax, `[${name}] a Max component was installed for a Pro (quarterly) account`);

    await morphinui(base, 'login', '--token', maxToken);
    assert(existsSync(join(config, 'config.json')), `[${name}] login did not save the token`);
    assert((await morphinui(base, 'whoami')).includes('Max'), `[${name}] whoami does not report Max`);
    assert((await morphinui(base, 'list')).includes('toast-pro'), `[${name}] list does not show the Pro component`);

    console.log(`[${name}] morphinui add toast-pro`);
    await morphinui(base, 'add', 'toast-pro', '--yes');
    const installed = JSON.parse(await readFile(file, 'utf8')) as { registries?: Record<string, { url: string; headers: Record<string, string> }> };
    assert(installed.registries?.['@morphin-pro']?.headers.Authorization === 'Bearer ${MORPHIN_TOKEN}', `[${name}] the Pro registry was not added with an environment header`);
    assert(installed.registries?.['@morphin-pro']?.url === `${siteUrl}/components/max/{name}.json`, `[${name}] the Pro registry does not point at the site`);
    assert(!(await readFile(file, 'utf8')).includes(maxToken), `[${name}] the token was written into components.json`);
    for (const path of ['src/components/ui/toast.tsx', 'src/components/ui/toast-effects.ts', 'src/components/ui/toast-pro.tsx', 'src/components/ui/toast-pro-variants.ts']) {
      assert(existsSync(join(project, path)), `[${name}] ${path} was not installed`);
    }
    assert(!/from '[^']*toast-pro/.test(await readFile(join(project, 'src/components/ui/toast.tsx'), 'utf8')), `[${name}] the free toast depends on the Pro item`);

    // A Max chart brings the shared chart primitives with it.
    console.log(`[${name}] morphinui add funnel-chart-pro`);
    await morphinui(base, 'add', 'funnel-chart-pro', '--yes');
    for (const path of ['src/components/ui/funnel-chart-pro.tsx', 'src/components/ui/funnel-chart-pro-variants.ts', 'src/components/ui/chart-pro.ts', 'src/components/ui/chart-pro-roll.tsx']) {
      assert(existsSync(join(project, path)), `[${name}] ${path} was not installed`);
    }

    console.log(`[${name}] morphinui add agent-inbox-pro`);
    await morphinui(base, 'add', 'agent-inbox-pro', '--yes');
    for (const path of ['src/components/ui/agent-inbox-pro.tsx', 'src/components/ui/agent-inbox-pro-variants.ts', 'src/components/ui/button-group.tsx', 'src/components/ui/spinner.tsx']) {
      assert(existsSync(join(project, path)), `[${name}] ${path} was not installed`);
    }

    // Only the Pro items were installed, so the fixture's App (which uses every component) gives way to a small one.
    await writeFile(join(project, 'src/App.tsx'), [
      "import { toast, Toaster } from '@/components/ui/toast';",
      "import { proToastEffects } from '@/components/ui/toast-pro';",
      "import { FunnelChart } from '@/components/ui/funnel-chart-pro';",
      "import { AgentInbox } from '@/components/ui/agent-inbox-pro';",
      "const stages = [{ id: 'visit', label: 'Visited', value: 1000 }, { id: 'buy', label: 'Bought', value: 120 }];",
      'export function App() {',
      "  return <><button type=\"button\" onClick={() => toast.success('Saved')}><Toaster effects={proToastEffects} />Save</button><FunnelChart title=\"Checkout\" stages={stages} /><AgentInbox tasks={[{ id: 'a', title: 'Import', status: 'waiting', startedAt: 0 }]} /></>;",
      '}',
      '',
    ].join('\n'));
    await run('npm', ['run', 'check:types'], project);
    await run('npm', ['run', 'build'], project);
    console.log(`[${name}] passed.`);
  } finally {
    await rm(project, { recursive: true, force: true });
    await rm(config, { recursive: true, force: true });
  }
}

console.log('Building the registry…');
await run('npm', ['run', 'registry:build'], root);
if (withPro) await run('npm', ['run', 'registry:pro:build'], root);
await run('npm', ['run', 'cli:build'], root);
const { server, url } = await serveRegistry();
const pro = withPro ? await serveProRegistry() : undefined;
try {
  // The Morphin look: the theme replaces the shadcn palette.
  await scenario('morphin-theme', ['@morphin/theme', '@morphin/typography', ...components], url, css => {
    assert(css.includes('--primary: #242422'), '[morphin-theme] the Morphin palette was not applied');
    assert(css.includes('--text-sm--line-height: 1.25rem'), '[morphin-theme] the type scale was not added to @theme');
  });
  // Components alone keep the project's own shadcn palette and only add missing tokens.
  await scenario('shadcn-theme', components, url, css => {
    assert(!css.includes('--primary: #242422'), '[shadcn-theme] installing a component replaced the project palette');
  });
  await cliScenario(url);
  if (pro) await proScenario(url, pro.url);
  console.log(`Registry verification passed: install, imports, tokens, types, build, server rendering, the morphinui CLI${pro ? ' and the Pro registry' : ''}.`);
} finally {
  server.close();
  pro?.server.close();
}

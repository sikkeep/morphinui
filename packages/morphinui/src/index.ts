#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  accountTier, authToken, componentNames, configFile, isProItem, proBase, registryBase, registryTemplate, shadcnRunner, siteBase, TOKEN_ENV,
  THEME_ITEMS, toItems, withMorphinRegistry, withProRegistry,
  type Account, type ComponentsConfig, type RegistryIndexItem,
} from './lib.js';

const help = `morphinui: add Morphin UI components to your project

Usage
  npx morphinui@latest init [--theme]
  npx morphinui@latest add <components...> [--all] [--overwrite] [--yes] [--path <dir>]
  npx morphinui@latest list
  npx morphinui@latest login [--token <token>]
  npx morphinui@latest whoami
  npx morphinui@latest logout

Commands
  init   Set up shadcn (components.json, utils) and the @morphin registry. --theme also installs the Morphin palette and type scale.
  add    Install components with their dependencies. Sets the project up first when it is not.
  list   Show every component in the registry (and your Pro components when you are logged in).
  login  Sign in with your morphin.dev account in the browser, so Max components (names ending in -pro, such as toast-pro; part of the Lifetime plan) can be added.
  whoami Show the signed-in account and its plan: Free, Pro or Max.
  logout Forget the saved token.

Options
  -c, --cwd <dir>    Project directory (default: the current one)
  -o, --overwrite    Overwrite files that already exist
  -y, --yes          Skip confirmation prompts
  -p, --path <dir>   Install into another directory
  -a, --all          Add every component
      --theme        Also install @morphin/theme and @morphin/typography
  -h, --help         Show this help
  -v, --version      Show the version

Components work like shadcn/ui: the source is copied into your project and you own it.
MORPHIN_REGISTRY_URL points the CLI at another registry folder (default https://morphin.dev/r).
MORPHIN_TOKEN supplies the token without \`login\` (for CI); MORPHIN_SITE_URL and MORPHIN_PRO_URL point at another site or Pro folder.`;

function run(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = {}) {
  return new Promise<void>((done, fail) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, ...env } });
    child.on('error', fail);
    child.on('close', code => code === 0 ? done() : fail(new Error(`${command} ${args.join(' ')} exited with code ${code}`)));
  });
}

function shadcn(args: string[], cwd: string, env: NodeJS.ProcessEnv = {}) {
  const { command, args: base } = shadcnRunner();
  return run(command, [...base, ...args], cwd, env);
}

async function ensureRegistry(cwd: string) {
  const file = join(cwd, 'components.json');
  const { config, changed } = withMorphinRegistry(JSON.parse(await readFile(file, 'utf8')) as ComponentsConfig, registryTemplate(registryBase()));
  if (changed) {
    await writeFile(file, `${JSON.stringify(config, null, 2)}\n`);
    console.log('Added the @morphin registry to components.json.');
  }
}

/** shadcn owns the project setup (components.json, utils, Tailwind theme); this only adds the registry on top. */
async function ensureProject(cwd: string, yes: boolean) {
  if (!existsSync(join(cwd, 'components.json'))) {
    console.log('No components.json found: setting the project up with shadcn first.\n');
    await shadcn(['init', ...(yes ? ['--yes'] : []), '--cwd', cwd], cwd);
  }
  await ensureRegistry(cwd);
}

async function readSavedToken() {
  try {
    return (JSON.parse(await readFile(configFile(), 'utf8')) as { token?: string }).token;
  } catch {
    return undefined;
  }
}

async function ensureProRegistry(cwd: string) {
  const file = join(cwd, 'components.json');
  const { config, changed } = withProRegistry(JSON.parse(await readFile(file, 'utf8')) as ComponentsConfig, proBase());
  if (changed) {
    await writeFile(file, `${JSON.stringify(config, null, 2)}\n`);
    console.log(`Added the @morphin-pro registry to components.json. It reads your token from ${TOKEN_ENV}, so the token is never written to the project.`);
  }
}

const pause = (ms: number) => new Promise(done => setTimeout(done, ms));

async function getJson<T>(url: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  const response = await fetch(url, init).catch((error: Error) => {
    throw new Error(`Could not reach ${new URL(url).origin}. Check your network connection.`, { cause: error });
  });
  return { status: response.status, body: (await response.json().catch(() => ({}))) as T };
}

/** The account behind a token, or why there is none. */
export async function whoami(token: string): Promise<Account> {
  const { status, body } = await getJson<Account & { error?: string }>(`${siteBase()}/api/cli/whoami`, { headers: { Authorization: `Bearer ${token}` } });
  if (status === 401) throw new Error('Your sign-in has expired. Run: npx morphinui@latest login');
  if (status !== 200) throw new Error(body.error ?? `morphin.dev answered ${status}.`);
  return body;
}

function openBrowser(url: string) {
  const [command, ...args] = process.platform === 'darwin' ? ['open', url]
    : process.platform === 'win32' ? ['cmd', '/c', 'start', '""', url]
    : ['xdg-open', url];
  try {
    const child = spawn(command, args, { stdio: 'ignore', detached: true });
    child.on('error', () => undefined);
    child.unref();
    return true;
  } catch {
    return false;
  }
}

/** The device flow of morphin.dev: the browser signs in and authorizes, the CLI polls for the token. */
async function signInWithBrowser() {
  const site = siteBase();
  const { status, body } = await getJson<{ sessionId?: string; url?: string }>(`${site}/api/cli/session`, { method: 'POST' });
  if (status !== 200 || !body.sessionId || !body.url) throw new Error(`Could not start signing in (morphin.dev answered ${status}).`);
  console.log(`Opening ${body.url}\nSign in there and authorize the CLI. If no browser opens, open that address yourself.`);
  openBrowser(body.url);
  const deadline = Date.now() + 2 * 60 * 1000;
  while (Date.now() < deadline) {
    await pause(2000);
    const poll = await getJson<{ status?: string; token?: string }>(`${site}/api/cli/session/${body.sessionId}`).catch(() => undefined);
    if (!poll) continue;
    if (poll.status === 404) throw new Error('The sign-in session expired. Run `morphinui login` again.');
    if (poll.body.status === 'done' && poll.body.token) return poll.body.token;
  }
  throw new Error('Signing in timed out. Run `morphinui login` again.');
}

/**
 * Signs in. The token comes from `--token`, from MORPHIN_TOKEN, from a pipe, or (usually) from the
 * browser device flow. It is checked against the account and saved with owner-only permissions.
 */
async function login(tokenOption: string | undefined) {
  let token = tokenOption?.trim() || process.env[TOKEN_ENV]?.trim();
  if (!token && !process.stdin.isTTY) {
    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    token = input.trim() || undefined;
  }
  token ??= await signInWithBrowser();
  const account = await whoami(token);
  const file = configFile();
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify({ token }, null, 2)}\n`, { mode: 0o600 });
  await chmod(file, 0o600);
  const who = account.email ?? account.username ?? 'your account';
  console.log(account.isMax
    ? `Signed in as ${who} (Max). Add Max components with: npx morphinui@latest add toast-pro`
    : `Signed in as ${who} (${accountTier(account)}). Max components come with the Lifetime plan: ${siteBase()}/pricing`);
}

async function fetchIndex(base = registryBase(), key?: string) {
  const url = `${base}/registry.json`;
  const response = await fetch(url, key ? { headers: { Authorization: `Bearer ${key}` } } : undefined).catch((error: Error) => {
    throw new Error(`Could not reach the Morphin registry at ${url}. Check your network connection.`, { cause: error });
  });
  if (!response.ok) {
    const { error } = (await response.json().catch(() => ({}))) as { error?: string };
    const reason = error === 'MAX_REQUIRED' ? `Max components come with the Lifetime plan: ${siteBase()}/pricing`
      : error === 'PRO_REQUIRED' ? `Your account has no paid plan: ${siteBase()}/pricing`
      : error === 'AUTH_REQUIRED' || error === 'UNAUTHORIZED' ? 'Your sign-in has expired. Run: npx morphinui@latest login'
      : error;
    throw new Error(reason ?? `The Morphin registry answered ${response.status} for ${url}.`);
  }
  return ((await response.json()) as { items: RegistryIndexItem[] }).items;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      cwd: { type: 'string', short: 'c' },
      overwrite: { type: 'boolean', short: 'o' },
      yes: { type: 'boolean', short: 'y' },
      path: { type: 'string', short: 'p' },
      all: { type: 'boolean', short: 'a' },
      theme: { type: 'boolean' },
      token: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  });
  const [command, ...names] = positionals;
  const cwd = resolve(values.cwd ?? process.cwd());

  if (values.version) {
    const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
    console.log(version);
    return;
  }
  if (values.help || !command) {
    console.log(help);
    return;
  }

  const passThrough = [
    ...(values.yes ? ['--yes'] : []),
    ...(values.overwrite ? ['--overwrite'] : []),
    ...(values.path ? ['--path', values.path] : []),
    '--cwd', cwd,
  ];

  if (command === 'list') {
    for (const item of await fetchIndex()) {
      console.log(`${item.name.padEnd(14)} ${item.description ?? item.title ?? ''}`);
    }
    const token = authToken(process.env, await readSavedToken());
    if (token) {
      console.log('\nPro');
      // A refused token (expired, no Pro plan) should not hide the free list above.
      const pro = await fetchIndex(proBase(), token).catch((error: Error) => {
        console.log(`  ${error.message}`);
        process.exitCode = 1;
        return [];
      });
      for (const item of pro) console.log(`${item.name.padEnd(14)} ${item.description ?? item.title ?? ''}`);
    } else {
      console.log('\nPro components need a morphin.dev Pro account: npx morphinui@latest login');
    }
    return;
  }

  if (command === 'login') {
    await login(values.token ?? names[0]);
    return;
  }

  if (command === 'whoami') {
    const token = authToken(process.env, await readSavedToken());
    if (!token) throw new Error('Not signed in. Run: npx morphinui@latest login');
    const account = await whoami(token);
    console.log(`${account.email ?? account.username ?? 'Signed in'} · ${accountTier(account)}`);
    return;
  }

  if (command === 'logout') {
    await rm(configFile(), { force: true });
    console.log('Logged out.');
    return;
  }

  if (command === 'init') {
    await ensureProject(cwd, values.yes ?? false);
    if (values.theme) await shadcn(['add', ...THEME_ITEMS, ...passThrough], cwd);
    console.log('\nDone. Add components with: npx morphinui@latest add button');
    return;
  }

  if (command === 'add') {
    const wanted = values.all ? componentNames(await fetchIndex()) : names;
    if (wanted.length === 0) {
      console.log('Name the components to add, for example: npx morphinui@latest add button dropdown\nRun `npx morphinui@latest list` to see them all.');
      process.exitCode = 1;
      return;
    }
    const items = toItems(wanted);
    const pro = items.some(isProItem);
    const token = authToken(process.env, await readSavedToken());
    if (pro) {
      const names = items.filter(isProItem).join(', ');
      if (!token) throw new Error(`${names} is Max content. Sign in with a Lifetime account: npx morphinui@latest login`);
      // Say why before shadcn reports a bare 403. Max items need Max: the quarterly plan is Pro only.
      const account = await whoami(token);
      if (!account.isMax) throw new Error(`${names} is Max content, which comes with the Lifetime plan: ${siteBase()}/pricing`);
    }
    await ensureProject(cwd, values.yes ?? false);
    if (pro) await ensureProRegistry(cwd);
    await shadcn(['add', ...(values.theme ? THEME_ITEMS : []), ...items, ...passThrough], cwd, pro ? { [TOKEN_ENV]: token! } : {});
    return;
  }

  throw new Error(`Unknown command "${command}". Run \`morphinui --help\`.`);
}

main().catch((error: Error) => {
  console.error(`\n${error.message}`);
  process.exit(1);
});

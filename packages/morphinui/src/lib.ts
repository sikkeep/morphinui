import { homedir } from 'node:os';
import { join } from 'node:path';

export const NAMESPACE = '@morphin';
export const DEFAULT_REGISTRY_URL = 'https://morphin.dev/r';
/** Pro items live in their own namespace, behind a morphin.dev Pro account; their names end in `-pro`. */
export const PRO_NAMESPACE = '@morphin-pro';
/** The site: it signs the CLI in (device flow) and says whether the account is Pro. */
export const DEFAULT_SITE_URL = 'https://morphin.dev';
/** Where the Pro items are served, behind the site's Pro worker: `{base}/{name}.json`. */
export const DEFAULT_PRO_PATH = '/components/max';
/**
 * The variable components.json refers to, so the token itself is never written into a project. It is
 * the same token (and variable) as the older @morphin/cli uses: a JWT from the morphin.dev account.
 */
export const TOKEN_ENV = 'MORPHIN_TOKEN';
/** The Morphin look: the palette and the type scale. Installed on request, since it replaces the project's palette. */
export const THEME_ITEMS = ['@morphin/theme', '@morphin/typography'];

export interface ComponentsConfig {
  registries?: Record<string, string | { url: string; params?: Record<string, string>; headers?: Record<string, string> }>;
  [key: string]: unknown;
}

/** MORPHIN_REGISTRY_URL points the CLI at a mirror or a local server; it is the folder that holds `{name}.json`. */
export function registryBase(env: NodeJS.ProcessEnv = process.env) {
  return (env.MORPHIN_REGISTRY_URL?.trim() || DEFAULT_REGISTRY_URL).replace(/\/+$/, '');
}

export function registryTemplate(base: string) {
  return `${base}/{name}.json`;
}

const plainName = /^[a-z0-9][a-z0-9-]*$/;

/** MORPHIN_SITE_URL points the CLI at another site (staging, or a local one). */
export function siteBase(env: NodeJS.ProcessEnv = process.env) {
  return (env.MORPHIN_SITE_URL?.trim() || DEFAULT_SITE_URL).replace(/\/+$/, '');
}

/** The folder that holds the Pro `{name}.json` files. MORPHIN_PRO_URL overrides it (a local server, for example). */
export function proBase(env: NodeJS.ProcessEnv = process.env) {
  return (env.MORPHIN_PRO_URL?.trim() || `${siteBase(env)}${DEFAULT_PRO_PATH}`).replace(/\/+$/, '');
}

export function proRegistry(base: string) {
  return { url: `${base}/{name}.json`, headers: { Authorization: `Bearer \${${TOKEN_ENV}}` } };
}

export const isProItem = (item: string) => item.startsWith(`${PRO_NAMESPACE}/`);

/** Where `login` keeps the token. MORPHINUI_CONFIG_DIR moves it. */
export function configFile(env: NodeJS.ProcessEnv = process.env) {
  return join(env.MORPHINUI_CONFIG_DIR?.trim() || join(homedir(), '.morphinui'), 'config.json');
}

/** The environment variable wins over the saved token, so CI can supply its own. */
export function authToken(env: NodeJS.ProcessEnv, saved?: string) {
  return env[TOKEN_ENV]?.trim() || saved?.trim() || undefined;
}

/** What morphin.dev answers to `GET /api/cli/whoami`. */
export interface Account {
  email?: string;
  username?: string;
  /** Any paid plan: the Pro components. */
  isPro?: boolean;
  /** The Lifetime plan: every paid thing, including the Max items of the `@morphin-pro` registry. */
  isMax?: boolean;
  plan?: string;
}

/** The account's tier as the CLI names it. Max items (the `@morphin-pro` registry) need `Max`. */
export function accountTier(account: Account): 'Free' | 'Pro' | 'Max' {
  return account.isMax ? 'Max' : account.isPro ? 'Pro' : 'Free';
}

/** Adds the @morphin-pro namespace, keeping one the project already defines. */
export function withProRegistry(config: ComponentsConfig, base: string) {
  if (config.registries?.[PRO_NAMESPACE] !== undefined) return { config, changed: false };
  return { config: { ...config, registries: { ...config.registries, [PRO_NAMESPACE]: proRegistry(base) } }, changed: true };
}

/** `button` and `@morphin/button` both mean the Morphin item, `toast-pro` the Pro one; other namespaces and URLs pass through to shadcn. */
export function toItem(input: string) {
  const name = input.trim();
  if (!name) throw new Error('Empty component name.');
  if (/^https?:\/\//.test(name) || name.startsWith('@')) return name;
  if (!plainName.test(name)) throw new Error(`"${name}" is not a valid component name. Run \`morphinui list\` to see them.`);
  return `${name.endsWith('-pro') ? PRO_NAMESPACE : NAMESPACE}/${name}`;
}

export function toItems(inputs: string[]) {
  return [...new Set(inputs.map(toItem))];
}

/** Adds the @morphin namespace without touching one the project already defines (a mirror, for example). */
export function withMorphinRegistry(config: ComponentsConfig, template: string) {
  if (config.registries?.[NAMESPACE] !== undefined) return { config, changed: false };
  return { config: { ...config, registries: { ...config.registries, [NAMESPACE]: template } }, changed: true };
}

export interface Runner {
  command: string;
  args: string[];
}

/** Runs the shadcn CLI through the package manager the project uses. MORPHINUI_SHADCN overrides it with a binary path. */
export function shadcnRunner(env: NodeJS.ProcessEnv = process.env): Runner {
  const override = env.MORPHINUI_SHADCN?.trim();
  if (override) return { command: override, args: [] };
  const agent = env.npm_config_user_agent ?? '';
  if (agent.startsWith('pnpm')) return { command: 'pnpm', args: ['dlx', 'shadcn@latest'] };
  if (agent.startsWith('yarn')) return { command: 'yarn', args: ['dlx', 'shadcn@latest'] };
  if (agent.startsWith('bun')) return { command: 'bunx', args: ['--bun', 'shadcn@latest'] };
  return { command: 'npx', args: ['--yes', 'shadcn@latest'] };
}

export interface RegistryIndexItem {
  name: string;
  type: string;
  title?: string;
  description?: string;
}

/** `add --all` installs the components; the theme replaces the project's palette, so it stays opt-in. */
export function componentNames(items: RegistryIndexItem[]) {
  return items.filter(item => item.type === 'registry:ui').map(item => item.name);
}

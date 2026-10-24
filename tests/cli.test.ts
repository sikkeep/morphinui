import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REGISTRY_URL, accountTier, authToken, componentNames, configFile, isProItem, proBase, proRegistry, registryBase, registryTemplate, siteBase,
  shadcnRunner, toItem, toItems, withMorphinRegistry, withProRegistry,
} from '../packages/morphinui/src/lib';

describe('morphinui CLI helpers', () => {
  it('maps plain names to the @morphin namespace and passes other specifiers through', () => {
    expect(toItem('button')).toBe('@morphin/button');
    expect(toItem('button-group')).toBe('@morphin/button-group');
    expect(toItem('@morphin/modal')).toBe('@morphin/modal');
    expect(toItem('@other/card')).toBe('@other/card');
    expect(toItem('https://example.com/r/card.json')).toBe('https://example.com/r/card.json');
    expect(toItems(['button', '@morphin/button', 'switch'])).toEqual(['@morphin/button', '@morphin/switch']);
  });

  it('rejects names that cannot be registry items', () => {
    expect(() => toItem('')).toThrow('Empty');
    expect(() => toItem('../etc/passwd')).toThrow('not a valid component name');
    expect(() => toItem('Button Group')).toThrow('not a valid component name');
  });

  it('uses morphin.dev unless MORPHIN_REGISTRY_URL says otherwise', () => {
    expect(registryBase({})).toBe(DEFAULT_REGISTRY_URL);
    expect(registryBase({ MORPHIN_REGISTRY_URL: 'http://127.0.0.1:3100/r/' })).toBe('http://127.0.0.1:3100/r');
    expect(registryBase({ MORPHIN_REGISTRY_URL: '  ' })).toBe(DEFAULT_REGISTRY_URL);
    expect(registryTemplate(DEFAULT_REGISTRY_URL)).toBe('https://morphin.dev/r/{name}.json');
  });

  it('adds the registry to components.json and keeps one the project already has', () => {
    const template = registryTemplate(DEFAULT_REGISTRY_URL);
    const fresh = withMorphinRegistry({ style: 'base-nova' }, template);
    expect(fresh).toEqual({ config: { style: 'base-nova', registries: { '@morphin': template } }, changed: true });

    const other = withMorphinRegistry({ registries: { '@acme': 'https://acme.test/{name}.json' } }, template);
    expect(other.changed).toBe(true);
    expect(other.config.registries).toEqual({ '@acme': 'https://acme.test/{name}.json', '@morphin': template });

    const mirror = { registries: { '@morphin': 'https://mirror.test/r/{name}.json' } };
    expect(withMorphinRegistry(mirror, template)).toEqual({ config: mirror, changed: false });
  });

  it('runs shadcn through the package manager that started it', () => {
    expect(shadcnRunner({}).command).toBe('npx');
    expect(shadcnRunner({ npm_config_user_agent: 'pnpm/9.0.0 npm/? node/v22' })).toEqual({ command: 'pnpm', args: ['dlx', 'shadcn@latest'] });
    expect(shadcnRunner({ npm_config_user_agent: 'yarn/4.1.0 npm/? node/v22' })).toEqual({ command: 'yarn', args: ['dlx', 'shadcn@latest'] });
    expect(shadcnRunner({ npm_config_user_agent: 'bun/1.1.0 npm/? node/v22' })).toEqual({ command: 'bunx', args: ['--bun', 'shadcn@latest'] });
    expect(shadcnRunner({ MORPHINUI_SHADCN: '/tmp/shadcn' })).toEqual({ command: '/tmp/shadcn', args: [] });
  });

  it('adds only components with --all, never the theme or shared items', () => {
    expect(componentNames([
      { name: 'motion', type: 'registry:lib' },
      { name: 'theme', type: 'registry:item' },
      { name: 'button', type: 'registry:ui' },
      { name: 'modal', type: 'registry:ui' },
    ])).toEqual(['button', 'modal']);
  });

  it('sends names ending in -pro to the Pro namespace', () => {
    expect(toItem('toast-pro')).toBe('@morphin-pro/toast-pro');
    expect(toItem('@morphin-pro/toast-pro')).toBe('@morphin-pro/toast-pro');
    expect(toItems(['button', 'toast-pro']).filter(isProItem)).toEqual(['@morphin-pro/toast-pro']);
    expect(isProItem('@morphin/button')).toBe(false);
  });

  it('serves Pro from the site behind the account token, and reads the token from the environment', () => {
    expect(siteBase({})).toBe('https://morphin.dev');
    expect(proBase({})).toBe('https://morphin.dev/components/max');
    expect(proBase({ MORPHIN_SITE_URL: 'http://localhost:3000/' })).toBe('http://localhost:3000/components/max');
    expect(proBase({ MORPHIN_PRO_URL: 'http://127.0.0.1:8787/' })).toBe('http://127.0.0.1:8787');
    const registry = proRegistry(proBase({}));
    expect(registry).toEqual({ url: 'https://morphin.dev/components/max/{name}.json', headers: { Authorization: 'Bearer ${MORPHIN_TOKEN}' } });

    const fresh = withProRegistry({ registries: { '@morphin': 'x' } }, proBase({}));
    expect(fresh.changed).toBe(true);
    expect(fresh.config.registries?.['@morphin-pro']).toEqual(registry);
    // A token is never written into the project, only the variable that holds it.
    expect(JSON.stringify(fresh.config)).not.toMatch(/eyJ/);

    const custom = { registries: { '@morphin-pro': 'https://mirror.test/{name}.json' } };
    expect(withProRegistry(custom, proBase({}))).toEqual({ config: custom, changed: false });
  });

  it('prefers the environment token over the saved one, and keeps it under the config folder', () => {
    expect(authToken({ MORPHIN_TOKEN: ' env ' }, 'saved')).toBe('env');
    expect(authToken({}, 'saved')).toBe('saved');
    expect(authToken({}, undefined)).toBeUndefined();
    expect(configFile({ MORPHINUI_CONFIG_DIR: '/tmp/morphin' })).toBe('/tmp/morphin/config.json');
  });
});

describe('account tier', () => {
  it('names Lifetime accounts Max, the quarterly plan Pro and no plan Free', () => {
    expect(accountTier({ isPro: true, isMax: true, plan: 'MAX' })).toBe('Max');
    expect(accountTier({ isPro: true, isMax: false, plan: 'PRO' })).toBe('Pro');
    expect(accountTier({ isPro: false, isMax: false })).toBe('Free');
    // An older backend sends no isMax: never read as Max.
    expect(accountTier({ isPro: true })).toBe('Pro');
  });
});

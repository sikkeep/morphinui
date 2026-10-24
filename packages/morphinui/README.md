# morphinui

The CLI for [Morphin UI](https://morphin.dev): add components to your project with one command.

```sh
npx morphinui@latest add button
npx morphinui@latest add dropdown modal slider
npx morphinui@latest list
```

Components work like [shadcn/ui](https://ui.shadcn.com): the source is copied into your project and you own it. `morphinui` is a thin layer over the shadcn CLI, so it does the same thing as `npx shadcn@latest add @morphin/button`, minus the setup:

1. If the project has no `components.json`, it runs `shadcn init` first (Tailwind CSS v4, `cn` helper, aliases).
2. It adds the `@morphin` registry to `components.json`, unless the project already defines one.
3. It runs `shadcn add @morphin/<name>`, which installs the files, their npm dependencies, the shared `motion` helper and the Morphin tokens.

## Commands

| Command | What it does |
| --- | --- |
| `init [--theme]` | Sets up shadcn and the `@morphin` registry. `--theme` also installs the Morphin palette and type scale (it replaces your current palette). |
| `add <components...>` | Installs components. `button` and `@morphin/button` mean the same. `--all` adds every component. |
| `list` | Shows every component in the registry. |

| Option | |
| --- | --- |
| `-c, --cwd <dir>` | Project directory |
| `-o, --overwrite` | Overwrite existing files |
| `-y, --yes` | Skip prompts |
| `-p, --path <dir>` | Install into another directory |
| `--theme` | Also install the theme and type scale |

`npm`, `pnpm`, `yarn` and `bun` all work: the CLI runs shadcn through the package manager that started it.

## Without this CLI

The same registry works with shadcn directly:

```json
{ "registries": { "@morphin": "https://morphin.dev/r/{name}.json" } }
```

```sh
npx shadcn@latest add @morphin/button
```

## Environment

| Variable | |
| --- | --- |
| `MORPHIN_REGISTRY_URL` | The folder that holds `{name}.json`, for a mirror or a local server. Default `https://morphin.dev/r`. |
| `MORPHINUI_SHADCN` | Path to a shadcn binary to run instead of `shadcn@latest`. |

MIT licensed.

## Max

```bash
npx morphinui@latest login          # signs in with your morphin.dev account in the browser
npx morphinui@latest whoami         # the account and its plan
npx morphinui@latest add toast-pro
npx morphinui@latest logout
```

Max content (Components Max and page templates, part of the Lifetime plan) is installed with this CLI from a private registry. Its items still carry their original names ending in `-pro`. `login` opens the browser to authorize the CLI (or takes `--token`, `MORPHIN_TOKEN` or a pipe), checks the account and saves the token in `~/.morphinui/config.json`. `add` checks the plan first, then registers `@morphin-pro` in `components.json` with a header that reads `MORPHIN_TOKEN`, so the token is never written to your project. Set `MORPHIN_TOKEN` yourself in CI, or in `.env.local`, never in a committed `.env`. `MORPHIN_SITE_URL` and `MORPHIN_PRO_URL` point at another site or Pro folder.

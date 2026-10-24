# Contributing to morphin-ui

morphin-ui is a copy-into-your-project component library in the shadcn registry format. Thank you for helping.

## Setup

```sh
nvm install   # install the Node.js version from .nvmrc
nvm use
npm install
npm test       # component behavior
```

Read [AGENTS.md](AGENTS.md) first: it explains the repository layout, the rules every component follows (Base UI, CVA, Tailwind tokens, GSAP with reduced motion) and what "done" means.

## Before you open a pull request

```sh
npm test                # component behavior
npm run typecheck
npm run build           # typecheck, registry JSON, preview
npm run test:registry   # installs the registry into fresh projects with the real shadcn CLI (needs network)
```

- Add or update tests for behavior you change.
- Add a section to `README.md`. Examples live on the docs site (morphin.dev/docs), not in this repository.
- Check visual changes in a browser: light and dark theme, keyboard, reduced motion, a narrow screen.
- Item names and installed file names are public. Add new ones; do not rename existing ones.
- Do not edit `public/r/` by hand; it is generated.

## Reporting a problem

Open an issue with the component, what you expected, what happened and, when it is visual, a screenshot. For security issues, email the maintainer instead of opening a public issue.

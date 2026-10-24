# Registry consumer fixture

A Vite + React 19 + Tailwind CSS v4 project in the state `npx shadcn@latest init -b base -p nova` leaves it:
`components.json`, the shadcn theme in `src/index.css` and `src/lib/utils.ts`. `npm run test:registry`
copies it to a temporary folder, points `@morphin` at a locally served build of the registry and runs
`shadcn add`, then type-checks, builds and server-renders the result. `src/App.tsx` imports the files the
CLI is expected to create.

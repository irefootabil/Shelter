# Adapost Urgenta Romania

Offline-first PWA for finding nearby civil protection shelters in Romania during emergencies.

The app will bundle shelter data locally, keep location processing on-device, and remain useful after first load when mobile data is unavailable. The user interface and emergency guidance are Romanian; technical documentation is English for clean implementation handoffs.

## Quick Start

Use:

```powershell
npm install
npm run dev
npm run build
npm run preview
```

Expected local dev URL: `http://localhost:5173`.

## GitHub Pages

The default production build targets a GitHub Pages project site at `/Shelter/`.

```powershell
npm run build
```

Publish the generated `dist/` directory, or push to `main` and use the included GitHub Actions workflow after enabling
GitHub Pages with `Source: GitHub Actions`.

If the repository name is not `Shelter`, update `VITE_BASE_PATH` in `.github/workflows/deploy-pages.yml` and the default
`base` value in `vite.config.ts`.

## Product Defaults

- Vite + React + TypeScript.
- Static HTTPS hosting: GitHub Pages, Netlify, Cloudflare Pages, or similar.
- Offline-first PWA with service worker precaching.
- Vendored shelter data derived from `mhlnu/adaposturi`, with official source attribution to IGSU.
- No maps in v1.
- No backend, accounts, analytics, or remote telemetry.
- User location stays on-device.

## Data Sources

- Official IGSU PDF: https://igsu.ro/resources/528ae255-7b59-4c84-bbed-252a49e871af.pdf
- Reference JSON repository: https://github.com/mhlnu/adaposturi

Shelter data may be stale or inaccurate. The app must show a clear source/date note and tell users to follow official authority instructions when available.

## Session Workflow

Every implementation session starts by reading:

- `PROJECT_CONTEXT.md`
- `SESSION_LEDGER.md`
- the current file in `docs/context-packets/`

Every session ends with verification, ledger update, context packet update, and a Git commit.

## Documentation Map

- `PROJECT_CONTEXT.md`: stable context for every future Codex session.
- `SESSION_LEDGER.md`: session history, current goal, touched files, verification, and commit tracking.
- `docs/PROJECT_BRIEF.md`: product goals, non-goals, users, and safety constraints.
- `docs/ARCHITECTURE.md`: module boundaries and data flow.
- `docs/DATA.md`: shelter schema, ranking, source, and data risks.
- `docs/OFFLINE_PWA.md`: service worker and offline behavior.
- `docs/TESTING_DEBUGGING.md`: verification, logging, debugging, and device testing.
- `docs/GIT_WORKFLOW.md`: mandatory Git workflow.
- `docs/FEATURE_PROMPTS.md`: module-sized prompts for future implementation chats.

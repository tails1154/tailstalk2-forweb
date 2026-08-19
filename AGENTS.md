# AGENTS.md

## Commands

```bash
# Deploy to production (builds + scp + docker deploy):
./deploy.sh

# Run i18n extraction before committing new <Trans> / t`...` strings:
cd packages/client && pnpm exec lingui extract

# Lingui compile (run automatically by deploy.sh):
pnpm --filter client exec lingui compile --typescript

# Run Panda CSS codegen (run automatically by deploy.sh):
pnpm --filter client exec panda codegen

# Lint:
pnpm exec eslint .
```

## Architecture

- **pnpm workspace** monorepo with `packages/client` (main app), `packages/stoat.js` (SDK), and i18n subpackages.
- **Solid.js** frontend (`solid-js` + `@solidjs/router`). Never destructure reactive props — use `splitProps`.
- **`@revolt/*`** path aliases map to `packages/client/components/` subdirectories (see `tsconfig.json` paths).
- **stoat.js** (`packages/stoat.js/src/`) is the SDK: `Client`, API HTTP calls, WS events, collection hydration.
- **i18n**: Lingui with `<Trans>` JSX macro and `t` tagged templates. Extract with `lingui extract`, compile with `lingui compile`. Catalogs live at `components/i18n/catalogs/{locale}/messages.po` (tracked) and `messages.ts` (compiled, gitignored).

## Deploy workflow

`deploy.sh` runs locally: `lingui compile` → `panda codegen` → `vite build` → tars `dist/` → scp to `tails1154.com:1699` → `docker cp` into `stoat-web-1` → restart. It also uploads `packages/client/public/tailstalk2.version` to `/home/tails1154/ecraft/tailstalk2.version` and installs `scripts/tailstalk2_version.py` at `/home/tails1154/ecraft/cgi-bin/tailstalk2_version.py`.

## Client update workflow

- Bump `packages/client/src/version.ts` for every client feature or bug-fix update.
- Keep `packages/client/public/tailstalk2.version` and `/home/tails1154/ecraft/tailstalk2.version` at the same version.
- The client checks `https://tails1154.com:9782/cgi-bin/tailstalk2_version.py`; keep the CGI endpoint CORS-enabled and no-cache.
- Do not rely on the static `/tailstalk2.version` file for browser fetches; the CGI endpoint supplies `Access-Control-Allow-Origin: *`.
- Run Lingui extraction and compilation whenever UI text is added or changed.
- Commit and push each client update to GitHub before deployment.
- Deploy client changes only with `./deploy.sh`; it is the required catalog, codegen, build, upload, and restart gate.

## Backend

The matching backend repo is at `../tailstalk2-backend`. It's a Rust monorepo (Rocket API on port 14702). Deploy with `cd ../tailstalk2-backend && ./deploy.sh`. The backend binary is a release build that's copied into a Docker image and restarted via docker compose.

The API base URL is hardcoded in `packages/client/components/common/lib/env.ts` (`DEFAULT_API_URL`).

## Admin panel

Located at `packages/client/components/app/interface/settings/user/Admin.tsx`. Only visible to users with discriminator `6547`. Uses HTTP Basic Auth against `GET /admin` (backend has argon2-hashed password in `../tailstalk2-backend/admin.toml`).

## Styling

- **Panda CSS** for generated styles via `styled-system/jsx` (`styled("div", { base: {...} })`).
- **Material Design tokens** via CSS variables: `--md-sys-color-surface`, `--md-sys-color-primary`, etc.
- **Material icons** imported from `@material-design-icons/svg/` as Solid components.
- `typography` from `@revolt/ui` provides M3 typography classes. Use `typography({ class: "label", size: "small" })` in JSX, NOT `typography.raw()` at module level (circular dependency).<｜end▁of▁thinking｜>

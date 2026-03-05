# GitHub Actions Workflows

## ci.yml — Continuous Integration

Runs on every push to `main`, `develop`, and `feature/**` branches, and on all PRs targeting `main` or `develop`.

| Job | What it does |
|-----|-------------|
| `typecheck` | Runs `tsc --noEmit` on `shared`, `server`, and `client` packages |
| `lint` | Runs ESLint on `client` and `server` source |
| `test` | Runs Jest for `server` and `client` workspaces |
| `build` | Builds all three packages in dependency order; uploads dist artifacts |

## deploy.yml — Production Deploy

Runs only on push to `main`. Uses a concurrency group so only one deploy runs at a time.

| Job | Target | Mechanism |
|-----|--------|-----------|
| `deploy-server` | Render | REST API trigger via `RENDER_API_KEY` + `RENDER_SERVICE_ID` |
| `deploy-client` | Vercel | `amondnet/vercel-action` with `--prod` flag |

## Required Repository Secrets

Set these in **Settings → Secrets and variables → Actions**:

| Secret | Used by |
|--------|---------|
| `RENDER_API_KEY` | deploy.yml |
| `RENDER_SERVICE_ID` | deploy.yml |
| `VERCEL_TOKEN` | deploy.yml |
| `VERCEL_ORG_ID` | deploy.yml |
| `VERCEL_PROJECT_ID` | deploy.yml |

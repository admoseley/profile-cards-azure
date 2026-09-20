# profile-cards-azure

Self-hosted GitHub profile cards for [@admoseley](https://github.com/admoseley) — trophies,
stats, top languages, and top contributed repos — prerendered on a schedule and served as
static SVGs from Azure Static Web Apps.

**Status:** in progress. See [`PROJECT-STATUS.md`](PROJECT-STATUS.md) for current state and
remaining work.

## Why this exists

The profile README depended on four third-party card services. Three were dead as of
2026-09-20, their owners unable to keep absorbing the hosting cost:

| Card | Host | Status |
|---|---|---|
| Trophies | `github-profile-trophy.vercel.app` | 402 Payment Required |
| Stats + Top Langs | `github-readme-stats.vercel.app` | 503 |
| Top Contributed Repo | `github-contributor-stats.vercel.app` | 402 |
| Streak | `github-readme-streak-stats.herokuapp.com` | 200 (alive) |

There is a second, independent problem that the outage was hiding. The profile showed ~330
lifetime contributions despite heavy recent activity. Actual trailing-year contributions are
**633**, of which **474 are `restrictedContributionsCount`** — private-repo work. A public
card service queries with *its own* token and can only ever see the public remainder.

Rendering under a personal PAT is the only way that work ever appears. Verified: the trophy
card renders 560 commit-points (rank A) with private access versus 83 without.

## How it works

A GitHub Actions cron renders the four SVGs every six hours and publishes them as static
files. There is no running service.

This is not a compromise. The upstream trophy project already caches for six hours
(`CONSTANTS.REVALIDATE_TIME`), so it was never really rendering per-request. Prerendering
matches that freshness exactly while being:

- **free** — Static Web Apps Free tier, and public-repo Actions minutes cost nothing;
- **reliable** — no cold start, so GitHub's camo image proxy can't time out and show a
  broken image, which is the risk with a scale-to-zero container;
- **structurally single-user** — there is no endpoint anyone else can call, so this can
  never accumulate the traffic-driven cost that killed the upstream services.

## Phase 1 decisions

- **Replacing something live?** Yes — three dead third-party services. Migration, not
  greenfield.
- **What does it store, and who signs in?** Nothing, and nobody. No database, no auth, no
  user input. The only secret is a read-only GitHub PAT used at render time.
- **Domain:** `trophy.clouddev.adrianmoseley.com` (the convention for Adrian's own side
  projects). DNS at GoDaddy.

## Layout

```
infra/        Terraform — Static Web App (Free), custom domain, budget alert
renderers/    Card renderers (Node ESM)
site-src/     Static source: landing page template, staticwebapp.config.json
site/         Build output (gitignored) — assembled by the render pipeline
vendor/       Upstream renderer checkouts, pinned in CI (gitignored)
```

Published paths: `/trophy.svg`, `/stats.svg`, `/top-langs.svg`, `/top-repos.svg`,
`/health.json`, and a landing page at `/`.

## Renderer sources

| Card | Source |
|---|---|
| Trophy | [`admoseley/github-profile-trophy-azure`](https://github.com/admoseley/github-profile-trophy-azure) (fork), via its composite `action.yml` |
| Stats, Top Langs | [`admoseley/github-readme-stats-azure`](https://github.com/admoseley/github-readme-stats-azure) (fork), imported at a pinned commit |
| Top Repos | Written here, in `renderers/` |

Top Repos is written from scratch because the `github-contributor-stats.vercel.app` upstream
is undiscoverable — a GitHub code search surfaces only READMEs pointing at the dead URL, with
no source repo behind it. Depending on an unmaintained project with no findable source is the
exact failure this repo exists to undo.

## Deliberate deviations from the site-launch playbook

Recorded so they don't get "corrected" back later:

1. **Secrets live in GitHub Actions, not Key Vault.** Rendering never runs inside Azure —
   Azure only serves static files — so there is no Azure runtime that could read a Key Vault
   secret. A Key Vault here would be a resource nothing reads.
2. **No `production` approval gate on the scheduled render.** That gate protects *code*
   reaching production; a cron regenerating data artifacts every six hours can't have a human
   in the loop without defeating its purpose. Code changes still go issue → branch → PR →
   squash merge, and the gate remains available for infrastructure changes.

## Cost

$0/month. Static Web Apps Free tier, free Actions minutes on a public repo. No container, no
database, no cache. Nothing here draws on the Azure credit.

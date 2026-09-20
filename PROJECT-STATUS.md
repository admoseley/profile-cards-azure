# Profile Cards on Azure — project status

**Last updated:** 2026-09-20 · **State:** planned, scaffolding not yet written · **Paused at Adrian's request**

Pick this file up first in a new session. The full approved plan lives at
`~/.claude/plans/i-just-forked-a-optimized-avalanche.md`.

---

## Why this project exists

The GitHub profile README at `admoseley/admoseley` depends on four third-party card
services. Three are dead or degraded — verified by direct HTTP probe on 2026-09-20:

| Card | Host | Status |
|---|---|---|
| GitHub Trophies | `github-profile-trophy.vercel.app` | **402 Payment Required** |
| Stats + Top Langs | `github-readme-stats.vercel.app` | **503** |
| Top Contributed Repo | `github-contributor-stats.vercel.app` | **402** |
| Streak stats | `github-readme-streak-stats.herokuapp.com` | 200 (alive) |

The upstream trophy owner posted a notice saying the service may be discontinued because
hosting costs became unsustainable. Adrian is self-hosting so his profile stops depending
on someone else's goodwill.

### The second problem, which matters more

Adrian's profile showed ~330 lifetime contributions and a 0-day streak despite heavy
recent AI/Claude Code work. That is **not** only because the services were down.

Trailing-year contributions are **633**, of which **474 are `restrictedContributionsCount`**
— private-repo work. Public card services query with *their own* token and can only ever
see the ~159 public ones. Running the renderer under **Adrian's own PAT** is the only way
those 474 ever appear.

**This has already been proven locally** (see "What's done" below), not assumed.

---

## What's done

- [x] Forked `ryo-ma/github-profile-trophy` → `admoseley/github-profile-trophy-azure`
- [x] Cloned to `~/Development/github-profile-trophy-azure` (HEAD `e3c89df`)
- [x] **Validated the renderer end to end locally** — the decisive de-risking step
- [x] Forked `anuraghazra/github-readme-stats` → `admoseley/github-readme-stats-azure`
- [x] Created `admoseley/profile-cards-azure` (public, empty)
- [x] Filed issues #1–#6 on `profile-cards-azure`

### The local validation result (the thing worth not re-deriving)

```bash
cd ~/Development/github-profile-trophy-azure
export GITHUB_TOKEN1="$(gh auth token)"
deno run --allow-net --allow-env --allow-read --allow-write \
  render_svg.ts admoseley /tmp/trophy-test.svg radical
```

Rendered card showed **Commits: 560pt, rank A "Ultra Committer"**.

`src/user_info.ts:75` computes `totalCommits = restrictedContributionsCount + totalCommitContributions`
= 474 + 83. So the private work **is** being counted. Without private access it would be
83 — rank C, not A. Deno 2.9.7 runs the repo's Deno 1.x-era code without modification.

---

## Decisions already made (do not re-litigate)

**Prerender to static SVG; do not host a live service.** `CONSTANTS.REVALIDATE_TIME` in
`src/utils.ts` is already 6 hours, so the original was never live-per-request. A GitHub
Actions cron renders every 6h and publishes static files to **Azure Static Web Apps, Free
tier**. Rationale: $0/mo; no cold-start broken images (a scale-to-zero Container App risks
GitHub's camo proxy timing out on first fetch); and structurally single-user, so Adrian can
never inherit the upstream owner's cost problem. Container Apps was considered and rejected
on those grounds — at always-on it was ~$10–18/mo for no functional gain.

**Domain:** `trophy.clouddev.adrianmoseley.com` (playbook convention for Adrian's own side
projects). DNS at GoDaddy.

**Top Contributed Repos is written from scratch.** The `github-contributor-stats.vercel.app`
upstream is undiscoverable — GitHub code search finds only READMEs pointing at the dead URL,
no source repo. Depending on an unmaintained ghost is the exact trap that caused this whole
exercise. ~150 lines against `contributionsCollection.commitContributionsByRepository`,
which under Adrian's PAT includes private repos — something the public service never could.

**Repo is public** — unlimited free Actions minutes, and the rendered output is public
anyway. gitleaks in CI from the first workflow guards it.

### Two deliberate deviations from the site-launch-playbook

Documented so a future session doesn't "correct" them back:

1. **Secrets in GitHub Actions, not Key Vault.** Rendering never runs inside Azure — Azure
   only serves static files — so no Azure runtime exists that could read a Key Vault secret.
   A Key Vault here would be a resource nothing reads.
2. **No `production` approval gate on the scheduled run.** The playbook gate protects *code*
   reaching production; a cron regenerating data artifacts every 6h cannot have a human in
   the loop without defeating itself. Code changes still go issue → branch → PR → squash.

---

## Remaining work

Each is its own issue → branch → PR → squash merge. Nothing below has been started.

### Issue #1 — Scaffold repo and CI baseline
`.gitignore` (node_modules, vendor/, site/, .env, .terraform), README with the Phase 1
decisions, `ci.yml` with gitleaks at `fetch-depth: 0` plus renderer lint/smoke as separate
jobs.

### Issue #2 — The four renderers
- **Trophy** — no code needed. Consume `admoseley/github-profile-trophy-azure` via its
  existing composite `action.yml` (inputs: `username`, `output_path`, `token`, `theme`),
  pinned by SHA.
- **Stats + Top Langs** — `renderers/stats.mjs` takes `--upstream <dir>` and dynamically
  imports by absolute path from a pinned checkout of the readme-stats fork
  (`src/cards/stats.js` → `renderStatsCard`, `src/fetchers/stats.js` → `fetchStats`, plus
  the `top-languages` equivalents). Node resolves the upstream's own `node_modules` from the
  importing file's location, so nothing needs copying or vendoring into git.
  Pass `count_private: true` and `include_all_commits: true`.
- **Top Repos** — `renderers/top-repos.mjs`, our own GraphQL query + SVG.

**Fail loudly.** Any renderer error must fail the job and leave the previously deployed SVGs
untouched. Never deploy a half-rendered set — a silently-swallowed failure means a blank card
with no signal, which is how the current breakage went unnoticed for months.

### Issue #3 — Terraform
`infra/` creating `rg-profilecards-prod` (Central US), SWA **Free**, custom domain, and a
subscription budget alert. State in `moseleytfstate3d4427`, key `profile-cards.terraform.tfstate`.
Infra CI: fmt, `init -backend=false`, validate, tflint, **Checkov enforcing** (`soft_fail: false`).

### Issue #4 — Render + deploy pipeline
`render-and-deploy.yml` on `schedule` (6h), `workflow_dispatch`, push to main. Deploy via
`Azure/static-web-apps-deploy@v1` with `skip_app_build: true`, `app_location: site` —
mirror `~/Development/SweepingCleanCS/.github/workflows/azure-static-web-apps.yml`.

Rollout version `yyyymmdd.HH.MM` UTC in `health.json`, a landing-page meta tag, and the
Actions run name. **Tag/Release only on code deploys**, not the 6-hourly refresh — that
would create ~120 tags a month.

### Issue #5 — Repoint the profile README
### Issue #6 — Follow-up: streak card still on free Heroku

### Published layout
```
/              landing page
/trophy.svg  /stats.svg  /top-langs.svg  /top-repos.svg
/health.json   { "version": "20260920.14.30", "generatedAt": "..." }
```
`staticwebapp.config.json`: `image/svg+xml` on `.svg`, `Cache-Control: public, max-age=3600`,
plus the playbook security headers on the landing page.

---

## Adrian's prerequisites — none of these are Claude's to do

1. **PAT** with `repo` + `read:user` → repo secret `PROFILE_STATS_PAT` on `profile-cards-azure`.
   `repo` is what makes private contributions visible; a bare `public_repo` token silently
   reproduces the current undercount.
2. **Profile setting:** Settings → Profile → *Include private contributions on my profile* → **on**.
3. **GoDaddy CNAME:** `trophy.clouddev.adrianmoseley.com` → the SWA default hostname.
   Must exist *before* `terraform apply` or custom-domain validation fails.
4. **`terraform apply`**, then paste the SWA deployment token into repo secret
   `AZURE_STATIC_WEB_APPS_API_TOKEN`.

---

## Verification

**The assertion that proves the whole point:** grep the rendered SVGs for the commit total.
It must be materially higher than the ~330 the dead public card showed. If it still reads
~330, the PAT scope or the profile privacy setting is wrong and the deploy is cosmetic.

```bash
curl -sI https://trophy.clouddev.adrianmoseley.com/trophy.svg | head -5
```
```bash
curl -s https://trophy.clouddev.adrianmoseley.com/health.json
```
Confirm `200`, `content-type: image/svg+xml`, and that `health.json`'s version matches the
merged commit — a green pipeline is not proof the live thing changed. Then load the profile
and confirm all four images render **through camo**, not just via direct curl.

---

## Cost

**$0/month.** SWA Free tier; public-repo Actions minutes are free (~4 runs/day × ~2 min).
No Container App, no Redis, no database. Nothing here draws on the ~$150 Azure credit.

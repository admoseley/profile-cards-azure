# Profile Cards on Azure — project status

**Last updated:** 2026-09-20 · **State:** shipped and live

**Live: https://trophy.clouddev.adrianmoseley.com** · $0/month

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

## What shipped

All six build issues are closed. The platform renders four cards every six
hours and publishes them to Azure Static Web Apps.

| | |
|---|---|
| Live | https://trophy.clouddev.adrianmoseley.com |
| Azure | `rg-profilecards-prod` / `swa-profilecards`, **Free** tier, Central US |
| Cost | $0/month, verified |
| Cadence | every 6h, plus `workflow_dispatch` and pushes to the renderers |
| Repo | `admoseley/profile-cards-azure` |

**The result that mattered:** the trophy card reports **577 commit points,
grade A** where the dead public service showed 86. 488 of the last year's 574
commits are private, and only a personal token can see them.

### Things worth not rediscovering

- **`commitContributionsByRepository` cannot rank private work.** GitHub returns
  restricted contributions only as an aggregate. Measured here it gave 6 repos
  totalling 85 commits — exactly the public figure — silently dropping ~488
  private commits. The top-repos card walks each repository's default-branch
  history instead, so its counts are all-time and will not tie out against the
  stats card's trailing-year numbers.
- **`anuraghazra/github-readme-stats` is deprecated.** We depend on
  `@stats-organization/github-readme-stats-core` directly rather than on the
  successor's composite action, so the version is locked in `package-lock.json`
  and a `repo`-scoped PAT is never handed to third-party action code. The
  `admoseley/github-readme-stats-azure` fork this made redundant still exists.
- **The renderer never throws on a fetch failure** — it returns a "Something
  went wrong" SVG with a status beginning `error`. Treated as fatal.
- **PAT scope: `repo` alone is sufficient**, verified in CI. `read:user` is not
  needed. Classic `repo` also grants write, which is more than this needs; a
  fine-grained token would be tighter but is untested against these queries.
  `verify-token.yml` exists to test one safely.
- **The custom domain needs two applies.** Validation is by CNAME delegation, so
  the record must resolve to a hostname that does not exist until the Static Web
  App has been created.
- **Webfonts are self-hosted**, because the site's CSP is `default-src 'self'`
  and because depending on a CDN would repeat the mistake this project undoes.

## Open follow-ups

| Issue | |
|---|---|
| [#6](https://github.com/admoseley/profile-cards-azure/issues/6) | Streak card still on a free Heroku app — same risk class as the ones that died |
| [#9](https://github.com/admoseley/profile-cards-azure/issues/9) | **PAT expires 2026-10-20.** Fails safe: cards go stale, not blank |
| [#12](https://github.com/admoseley/profile-cards-azure/issues/12) | Terraform perpetually reverts metadata the deploy action sets — fix with `ignore_changes` so a plan is empty when nothing changed |

## Setup, all completed

1. ✅ PAT with **`repo`** scope → repo secret `PROFILE_STATS_PAT`. (`read:user` proved
   unnecessary — verified in CI.)
2. ✅ Settings → Profile → *Include private contributions on my profile*.
3. ✅ GoDaddy CNAME `trophy.clouddev` → `purple-stone-0c5b1fa10.1.azurestaticapps.net`.
4. ✅ `terraform apply` (twice — see the two-pass note), deployment token → repo secret
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

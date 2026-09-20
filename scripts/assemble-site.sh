#!/usr/bin/env bash
#
# Assembles the deployable site/ directory from the rendered SVGs plus the
# committed sources in site-src/, stamping the rollout version into both the
# landing page and health.json.
#
# Usage: scripts/assemble-site.sh <version>
set -euo pipefail

VERSION="${1:?usage: assemble-site.sh <version>}"
GENERATED_AT="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
OUT="${OUT_DIR:-site}"

# Every card must be present. A partial set would publish a page with broken
# images while the pipeline reported success — the exact failure that let the
# original breakage go unnoticed for months. Fail before deploying, so the
# previously published cards stay live instead.
REQUIRED=(trophy.svg stats.svg top-langs.svg top-repos.svg)
missing=()
for card in "${REQUIRED[@]}"; do
  if [[ ! -s "${OUT}/${card}" ]]; then
    missing+=("${card}")
  fi
done

if (( ${#missing[@]} > 0 )); then
  echo "ERROR: missing or empty card(s): ${missing[*]}" >&2
  echo "Refusing to assemble a partial site; the live cards will be left alone." >&2
  exit 1
fi

cp site-src/staticwebapp.config.json "${OUT}/staticwebapp.config.json"

# Self-hosted webfonts. Deliberately not loaded from a font CDN: this project
# exists because third-party dependencies went away, and a strict
# default-src 'self' CSP would block them anyway.
mkdir -p "${OUT}/fonts"
cp site-src/fonts/*.woff2 "${OUT}/fonts/"

sed -e "s|__VERSION__|${VERSION}|g" \
    -e "s|__GENERATED_AT__|${GENERATED_AT}|g" \
    site-src/index.html > "${OUT}/index.html"

# health.json is how a deploy is verified: compare its version against the
# commit that was merged rather than trusting a green pipeline.
cat > "${OUT}/health.json" <<JSON
{
  "version": "${VERSION}",
  "generatedAt": "${GENERATED_AT}",
  "commit": "${GITHUB_SHA:-local}",
  "cards": ["trophy.svg", "stats.svg", "top-langs.svg", "top-repos.svg"]
}
JSON

echo "Assembled ${OUT}/ at version ${VERSION}:"
ls -la "${OUT}"

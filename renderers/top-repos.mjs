/**
 * "Top Contributed Repos" card — written from scratch.
 *
 * The card this replaces (github-contributor-stats.vercel.app) is dead (402)
 * and its source is undiscoverable: a GitHub code search surfaces only READMEs
 * pointing at the dead URL, with no repository behind it. Re-implementing ~150
 * lines is preferable to depending on an unmaintained project nobody can find.
 *
 * PRIVACY: most of Adrian's commit volume is in private repos, and this card is
 * published publicly. Private repositories are counted and ranked but never
 * named — they render as "Private repository". This matches GitHub's own
 * framing for the profile setting: show private contributions "without
 * revealing any repository or organization information".
 */

import { escapeXml, truncate, resolveTheme } from "./lib/svg.mjs";
import { graphql } from "./lib/token.mjs";

/**
 * Commits are counted per repository from each repo's own default-branch
 * history, filtered to Adrian as author.
 *
 * The obvious source — contributionsCollection.commitContributionsByRepository
 * — cannot be used: GitHub deliberately returns restricted (private) work only
 * as an aggregate `restrictedContributionsCount` and omits private repos from
 * the per-repository breakdown entirely. Measured against this account it
 * returned 6 repositories totalling 85 commits, exactly the public-only figure,
 * silently dropping ~488 private commits. Walking repository histories is the
 * only way to rank private work.
 *
 * Two consequences worth knowing:
 *  - Counts are all-time commits on the default branch, not the trailing year
 *    that contributionsCollection reports. For a "top repos" ranking that is
 *    arguably the more useful number, but it will not tie out against the
 *    stats card's commit total.
 *  - Only repos Adrian owns or collaborates on are considered; one-off commits
 *    to unaffiliated repos are out of scope.
 */
const QUERY = `
  query($uid: ID!) {
    viewer {
      repositories(
        first: 100
        ownerAffiliations: [OWNER, COLLABORATOR]
        isFork: false
      ) {
        totalCount
        nodes {
          nameWithOwner
          isPrivate
          defaultBranchRef {
            target {
              ... on Commit {
                history(author: { id: $uid }) { totalCount }
              }
            }
          }
        }
      }
    }
  }
`;

const VIEWER_ID_QUERY = `query { viewer { id } }`;

/**
 * @returns {Promise<Array<{label: string, commits: number, isPrivate: boolean}>>}
 */
export async function fetchTopRepos({ username, token, limit = 5 }) {
  const { viewer } = await graphql(VIEWER_ID_QUERY, {}, token);
  const data = await graphql(QUERY, { uid: viewer.id }, token);

  const repos = data.viewer?.repositories;
  if (repos?.totalCount > 100) {
    // Not paginated: 100 repos is far beyond where the top-5 could change.
    console.warn(
      `Note: ${repos.totalCount} repositories found; ranking the first 100.`,
    );
  }

  const ranked = (repos?.nodes ?? [])
    .map((node) => ({
      name: node?.nameWithOwner ?? "unknown",
      isPrivate: Boolean(node?.isPrivate),
      commits: node?.defaultBranchRef?.target?.history?.totalCount ?? 0,
    }))
    .filter((r) => r.commits > 0)
    .sort((a, b) => b.commits - a.commits)
    .slice(0, limit);

  // Disambiguate multiple private rows without leaking names. A single private
  // repo gets the bare label; several get numbered so the rows aren't identical.
  const privateCount = ranked.filter((r) => r.isPrivate).length;
  let seen = 0;

  return ranked.map((r) => {
    if (!r.isPrivate) return { label: r.name, commits: r.commits, isPrivate: false };
    seen += 1;
    const label = privateCount > 1 ? `Private repository ${seen}` : "Private repository";
    return { label, commits: r.commits, isPrivate: true };
  });
}

const WIDTH = 495;
const ROW_H = 26;
const PAD_X = 25;
const HEADER_H = 50;

export function renderTopRepos(rows, { theme = "dark", title = "Top Contributed Repos" } = {}) {
  const t = resolveTheme(theme);
  const height = HEADER_H + rows.length * ROW_H + 18;
  const max = Math.max(1, ...rows.map((r) => r.commits));

  const barX = 250;
  const barMax = WIDTH - barX - PAD_X - 46;

  const body = rows
    .map((row, i) => {
      const y = HEADER_H + i * ROW_H;
      const barW = Math.max(2, Math.round((row.commits / max) * barMax));
      // Private rows use a muted fill so it reads as a deliberate category
      // rather than looking like a rendering glitch.
      const fill = row.isPrivate ? t.text : t.accent;
      const opacity = row.isPrivate ? "0.45" : "0.9";
      return `
    <g transform="translate(${PAD_X}, ${y})">
      <text x="0" y="12" fill="${t.text}" font-size="13">${escapeXml(truncate(row.label, 28))}</text>
      <rect x="${barX - PAD_X}" y="3" rx="4" ry="4" width="${barW}" height="11"
            fill="${fill}" fill-opacity="${opacity}" />
      <text x="${WIDTH - PAD_X * 2 + 4}" y="12" fill="${t.text}" font-size="12"
            text-anchor="end">${escapeXml(row.commits)}</text>
    </g>`;
    })
    .join("");

  return `<svg width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}"
     xmlns="http://www.w3.org/2000/svg" role="img"
     aria-label="${escapeXml(title)}">
  <title>${escapeXml(title)}</title>
  <rect x="0.5" y="0.5" rx="4.5" width="${WIDTH - 1}" height="${height - 1}"
        fill="${t.bg}" stroke="${t.border}" stroke-opacity="0.15" />
  <text x="${PAD_X}" y="32" fill="${t.title}" font-size="18" font-weight="600"
        font-family="'Segoe UI', Ubuntu, Sans-Serif">${escapeXml(title)}</text>
  <g font-family="'Segoe UI', Ubuntu, Sans-Serif">${body}
  </g>
</svg>
`;
}

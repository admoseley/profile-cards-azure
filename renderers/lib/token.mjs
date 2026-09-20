/**
 * Token resolution and the private-access guard.
 *
 * The whole point of self-hosting these cards is that they run under Adrian's
 * own PAT and can therefore see private-repo contributions. A token with only
 * `public_repo` scope fails *silently*: every card renders successfully, the
 * numbers are just wrong (~83 commits instead of ~557). That is the worst kind
 * of failure — it looks like success. assertPrivateAccess() turns it into a
 * loud one.
 */

/** Env vars we accept a token from, in order of preference. */
const TOKEN_VARS = ["PROFILE_STATS_PAT", "GITHUB_TOKEN1", "GITHUB_TOKEN", "PAT_1"];

export function resolveToken() {
  for (const name of TOKEN_VARS) {
    const value = process.env[name];
    if (value && value.trim()) return value.trim();
  }
  throw new Error(
    `No GitHub token found. Set one of: ${TOKEN_VARS.join(", ")}.\n` +
      `Locally you can use:  export PROFILE_STATS_PAT="$(gh auth token)"`,
  );
}

/**
 * The stats core discovers tokens by scanning env for /PAT_\d*$/, and it reads
 * them at module-load time via a top-level loadConfigFromEnv() call. Static
 * imports are hoisted and run before any of our code, so setting PAT_1 in a
 * module body would be too late. Callers must invoke this *before* importing
 * the core, or re-run the core's loadConfigFromEnv() afterwards.
 */
export function exportTokenForStatsCore(token) {
  process.env.PAT_1 = token;
}

const GRAPHQL = "https://api.github.com/graphql";

export async function graphql(query, variables, token) {
  const res = await fetch(GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "profile-cards-azure",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`GitHub GraphQL HTTP ${res.status}: ${await res.text()}`);
  }

  const body = await res.json();
  if (body.errors?.length) {
    throw new Error(`GitHub GraphQL error: ${JSON.stringify(body.errors)}`);
  }
  return body.data;
}

const ACCESS_QUERY = `
  query($login: String!) {
    viewer { login }
    user(login: $login) {
      contributionsCollection {
        restrictedContributionsCount
        totalCommitContributions
      }
    }
  }
`;

/**
 * Verifies the token can actually see private contributions before we render
 * anything. Returns the contribution breakdown so callers can log it.
 *
 * @param {object} opts
 * @param {string} opts.username  Profile being rendered.
 * @param {string} opts.token
 * @param {boolean} [opts.requirePrivate=true]  Fail if zero private contributions are visible.
 */
export async function assertPrivateAccess({ username, token, requirePrivate = true }) {
  const data = await graphql(ACCESS_QUERY, { login: username }, token);

  const viewer = data.viewer?.login;
  const c = data.user?.contributionsCollection;
  if (!c) throw new Error(`GitHub returned no contribution data for "${username}".`);

  const restricted = c.restrictedContributionsCount ?? 0;
  const publicCommits = c.totalCommitContributions ?? 0;

  // Contribution *privacy* is scoped to the viewer: a token belonging to
  // someone else can never see these counts, so a mismatch here means the card
  // would silently render a stranger's public-only view of the profile.
  if (viewer?.toLowerCase() !== username.toLowerCase()) {
    throw new Error(
      `Token belongs to "${viewer}" but rendering "${username}". ` +
        `Private contributions are only visible to the profile's own token, ` +
        `so this would silently undercount.`,
    );
  }

  if (requirePrivate && restricted === 0) {
    throw new Error(
      `Token cannot see private contributions (restrictedContributionsCount = 0).\n` +
        `This is the silent-undercount failure: cards would render fine but show ` +
        `only ~${publicCommits} commits instead of the real total.\n` +
        `Fix: the PAT needs full "repo" scope (not just "public_repo"), and ` +
        `Settings -> Profile -> "Include private contributions on my profile" must be on.`,
    );
  }

  return { viewer, restricted, publicCommits, total: restricted + publicCommits };
}

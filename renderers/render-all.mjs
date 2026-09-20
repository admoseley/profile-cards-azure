/**
 * Renders the Node-based cards into site/.
 *
 * The trophy card is not rendered here: it is a Deno project and is produced by
 * the composite action in admoseley/github-profile-trophy-azure, wired up in
 * the deploy workflow. Locally you can render it with:
 *
 *   cd ../github-profile-trophy-azure
 *   GITHUB_TOKEN1="$(gh auth token)" deno run --allow-net --allow-env \
 *     --allow-read --allow-write render_svg.ts admoseley ../profile-cards-azure/site/trophy.svg radical
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  resolveToken,
  exportTokenForStatsCore,
  assertPrivateAccess,
} from "./lib/token.mjs";
import { fetchTopRepos, renderTopRepos } from "./top-repos.mjs";

const USERNAME = process.env.PROFILE_USERNAME || "admoseley";
const OUT_DIR = path.resolve(process.cwd(), process.env.OUT_DIR || "site");

/**
 * Card options mirror the query strings the profile README used against the
 * old public services, so the cards keep the same look. count_private and
 * include_all_commits are the ones that matter: they are why self-hosting was
 * worth doing at all.
 */
const STATS_OPTS = {
  username: USERNAME,
  theme: "dark",
  hide_border: "false",
  include_all_commits: "true",
  count_private: "true",
};

const TOP_LANGS_OPTS = {
  username: USERNAME,
  theme: "dark",
  hide_border: "false",
  layout: "compact",
  count_private: "true",
};

/**
 * The core renderer never throws on a data-fetch failure — it returns a
 * "Something went wrong" SVG with a status beginning "error". Writing that to
 * disk would publish a broken card that looks like a successful deploy, which
 * is exactly how the current breakage went unnoticed for months. Treat it as
 * fatal.
 */
async function renderCoreCard(handler, opts, name) {
  const result = await handler(opts);
  if (String(result?.status).startsWith("error")) {
    throw new Error(`${name}: renderer reported "${result.status}"`);
  }
  if (!result?.content) {
    throw new Error(`${name}: renderer returned empty output`);
  }
  return result.content;
}

async function main() {
  const token = resolveToken();

  // Fail before rendering anything if the token can't see private work.
  const access = await assertPrivateAccess({ username: USERNAME, token });
  console.log(
    `Token OK (viewer=${access.viewer}): ${access.total} commits visible ` +
      `(${access.restricted} private + ${access.publicCommits} public)`,
  );

  // The stats core reads tokens from env at module-load time, so PAT_1 has to
  // be set before the import is evaluated. A static import would be hoisted
  // above this line and pick up an empty config.
  exportTokenForStatsCore(token);
  const core = await import("@stats-organization/github-readme-stats-core");

  const [stats, topLangs] = await Promise.all([
    renderCoreCard(core.api, STATS_OPTS, "stats"),
    renderCoreCard(core.topLangs, TOP_LANGS_OPTS, "top-langs"),
  ]);

  const repoRows = await fetchTopRepos({ username: USERNAME, token, limit: 5 });
  const topRepos = renderTopRepos(repoRows, { theme: "dark" });

  await mkdir(OUT_DIR, { recursive: true });
  const written = [];
  for (const [file, svg] of [
    ["stats.svg", stats],
    ["top-langs.svg", topLangs],
    ["top-repos.svg", topRepos],
  ]) {
    const dest = path.join(OUT_DIR, file);
    await writeFile(dest, svg, "utf8");
    written.push(`${file} (${svg.length} bytes)`);
  }

  console.log(`Wrote to ${OUT_DIR}:`);
  for (const w of written) console.log(`  - ${w}`);
  console.log(
    `Top repos: ${repoRows.map((r) => `${r.label}=${r.commits}`).join(", ")}`,
  );
}

main().catch((err) => {
  console.error(`\nRender failed: ${err.message}`);
  process.exit(1);
});

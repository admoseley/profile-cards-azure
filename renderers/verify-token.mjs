/**
 * Token health check.
 *
 * Runs the same guard the render pipeline uses, but on its own, so the token
 * can be validated without rendering or deploying anything. Useful for:
 *  - confirming a newly rotated token still sees private contributions;
 *  - proving a fine-grained PAT is sufficient before swapping out a classic one;
 *  - diagnosing a failed render without re-running the whole pipeline.
 *
 * Prints only aggregate counts — never the token.
 */

import { resolveToken, assertPrivateAccess } from "./lib/token.mjs";

const USERNAME = process.env.PROFILE_USERNAME || "admoseley";

try {
  const token = resolveToken();
  const { viewer, restricted, publicCommits, total } = await assertPrivateAccess({
    username: USERNAME,
    token,
  });

  console.log(`PASS - token authenticates as "${viewer}"`);
  console.log(`  private (restricted) contributions: ${restricted}`);
  console.log(`  public commit contributions:        ${publicCommits}`);
  console.log(`  total visible:                      ${total}`);
  console.log(
    `\nPrivate contributions are visible, so the cards will reflect ` +
      `private work rather than the public-only undercount.`,
  );
} catch (err) {
  console.error(`FAIL - ${err.message}`);
  process.exit(1);
}

/**
 * Contribution streak card — written from scratch.
 *
 * Replaces github-readme-streak-stats.herokuapp.com, the last third-party
 * service the profile depended on. It was the only one of the five still
 * responding, but it is the same bet as the four that died: a free tier
 * absorbing someone else's traffic.
 *
 * Self-hosting also fixes its numbers. Queried with a public token it reported
 * 330 lifetime contributions and a 0-day current streak; the same account
 * queried with a personal token shows 823 in the trailing year alone, because
 * private contributions are only visible to the profile's own token.
 */

import { escapeXml, resolveTheme } from "./lib/svg.mjs";
import { graphql } from "./lib/token.mjs";

const CREATED_QUERY = `query($login: String!) { user(login: $login) { createdAt } }`;

// A contributionsCollection covers at most one year, so the full history has
// to be walked a year at a time and stitched together.
const YEAR_QUERY = `
  query($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount } }
        }
      }
    }
  }
`;

const iso = (d) => d.toISOString().slice(0, 10);

/** Fetches every contribution day from account creation to today. */
export async function fetchContributionDays({ username, token }) {
  const { user } = await graphql(CREATED_QUERY, { login: username }, token);
  const created = new Date(user.createdAt);
  const today = new Date();

  const days = new Map();
  let total = 0;

  for (let year = created.getUTCFullYear(); year <= today.getUTCFullYear(); year++) {
    // Clamp the window to the account's lifetime; GitHub rejects a range that
    // starts before the account existed.
    const from = new Date(Date.UTC(year, 0, 1));
    const to = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
    const start = from < created ? created : from;
    const end = to > today ? today : to;
    if (start > end) continue;

    const data = await graphql(
      YEAR_QUERY,
      { login: username, from: start.toISOString(), to: end.toISOString() },
      token,
    );
    const cal = data.user?.contributionsCollection?.contributionCalendar;
    if (!cal) continue;

    total += cal.totalContributions ?? 0;
    for (const week of cal.weeks ?? []) {
      for (const d of week.contributionDays ?? []) {
        days.set(d.date, d.contributionCount ?? 0);
      }
    }
  }

  return { days: [...days.entries()].sort((a, b) => a[0].localeCompare(b[0])), total, created };
}

/**
 * Current streak counts back from today. A zero today does not break it —
 * the day is still in progress — but a zero yesterday does.
 */
export function computeStreaks(days) {
  let longest = 0, longestStart = null, longestEnd = null;
  let run = 0, runStart = null;

  for (const [date, count] of days) {
    if (count > 0) {
      if (run === 0) runStart = date;
      run += 1;
      if (run > longest) { longest = run; longestStart = runStart; longestEnd = date; }
    } else {
      run = 0;
    }
  }

  let current = 0, currentStart = null, currentEnd = null;
  for (let i = days.length - 1; i >= 0; i--) {
    const [date, count] = days[i];
    if (count > 0) {
      current += 1;
      currentStart = date;
      if (currentEnd === null) currentEnd = date;
    } else if (i === days.length - 1) {
      continue; // today still has hours left in it
    } else {
      break;
    }
  }

  return { longest, longestStart, longestEnd, current, currentStart, currentEnd };
}

const W = 495, H = 195;
const fmt = (d) =>
  d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US",
      { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "";

export function renderStreak({ total, created, streaks }, { theme = "dark" } = {}) {
  const t = resolveTheme(theme);
  const col = W / 3;
  const ringR = 38;

  const panel = (x, big, label, sub, accent) => `
    <g transform="translate(${x}, 0)">
      <text x="${col / 2}" y="78" text-anchor="middle" fill="${accent ? t.accent : t.ink}"
            font-size="28" font-weight="700">${escapeXml(big)}</text>
      <text x="${col / 2}" y="104" text-anchor="middle" fill="${accent ? t.accent : t.text}"
            font-size="13" font-weight="600">${escapeXml(label)}</text>
      <text x="${col / 2}" y="126" text-anchor="middle" fill="${t.text}"
            font-size="11" opacity="0.8">${escapeXml(sub)}</text>
    </g>`;

  const s = streaks;
  const range = (a, b) => (a && b ? (a === b ? fmt(a) : `${fmt(a)} - ${fmt(b)}`) : "—");

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
     xmlns="http://www.w3.org/2000/svg" role="img"
     aria-label="Contribution streak: ${escapeXml(total)} total contributions, current streak ${escapeXml(s.current)} days, longest streak ${escapeXml(s.longest)} days">
  <title>Contribution streak</title>
  <rect x="0.5" y="0.5" rx="4.5" width="${W - 1}" height="${H - 1}"
        fill="${t.bg}" stroke="${t.border}" stroke-opacity="0.15" />
  <g font-family="'Segoe UI', Ubuntu, Sans-Serif">
    ${panel(0, String(total), "Total Contributions", `${fmt(iso(created))} - Present`, false)}

    <line x1="${col}" y1="34" x2="${col}" y2="${H - 34}" stroke="${t.text}" stroke-opacity="0.25" />
    <line x1="${col * 2}" y1="34" x2="${col * 2}" y2="${H - 34}" stroke="${t.text}" stroke-opacity="0.25" />

    <circle cx="${col * 1.5}" cy="82" r="${ringR}" fill="none"
            stroke="${t.accent}" stroke-width="5" />
    <text x="${col * 1.5}" y="92" text-anchor="middle" fill="${t.accent}"
          font-size="32" font-weight="700">${escapeXml(s.current)}</text>
    <text x="${col * 1.5}" y="142" text-anchor="middle" fill="${t.accent}"
          font-size="13" font-weight="600">Current Streak</text>
    <text x="${col * 1.5}" y="162" text-anchor="middle" fill="${t.text}"
          font-size="11" opacity="0.8">${escapeXml(range(s.currentStart, s.currentEnd))}</text>

    ${panel(col * 2, String(s.longest), "Longest Streak", range(s.longestStart, s.longestEnd), false)}
  </g>
</svg>
`;
}

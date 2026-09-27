/**
 * Contribution activity graph — an area chart of the last 12 months.
 *
 * Replaces github-readme-activity-graph, the same class of third-party service
 * as the four that shut down. Reuses the contribution calendar the streak card
 * already fetches, so it costs no extra API calls.
 *
 * Form: change over time, one series — so a line/area, with no legend, since a
 * single series is named by the title (a legend box for one series is noise).
 * The chart is served to GitHub's camo proxy as a flat image, so the hover layer
 * an interactive chart would normally carry is impossible here rather than
 * omitted; the exact figures live on the streak and stats cards instead.
 */

import { escapeXml, resolveTheme } from "./lib/svg.mjs";

const W = 880, H = 260;
const PAD = { t: 52, r: 26, b: 42, l: 54 };

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** Buckets daily contributions into weeks; 365 daily points is past the ink budget for 880px. */
function toWeekly(days) {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 364);
  const recent = days.filter(([d]) => new Date(`${d}T00:00:00Z`) >= cutoff);

  const weeks = [];
  for (let i = 0; i < recent.length; i += 7) {
    const chunk = recent.slice(i, i + 7);
    if (!chunk.length) continue;
    weeks.push({
      date: chunk[0][0],
      total: chunk.reduce((sum, [, c]) => sum + c, 0),
    });
  }
  return weeks;
}

export function renderActivity(days, { theme = "dark" } = {}) {
  const t = resolveTheme(theme);
  const weeks = toWeekly(days);
  if (weeks.length < 2) return null;

  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const max = Math.max(1, ...weeks.map((w) => w.total));

  // Round the axis top to something readable rather than the raw maximum.
  const step = max > 200 ? 100 : max > 100 ? 50 : max > 40 ? 20 : 10;
  const top = Math.ceil(max / step) * step;

  const x = (i) => PAD.l + (i / (weeks.length - 1)) * plotW;
  const y = (v) => PAD.t + plotH - (v / top) * plotH;

  const line = weeks.map((w, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(w.total).toFixed(1)}`).join(" ");
  const area = `${line} L${x(weeks.length - 1).toFixed(1)},${PAD.t + plotH} L${PAD.l},${PAD.t + plotH} Z`;

  // Recessive gridlines: horizontal only, at the labelled ticks.
  const ticks = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  const grid = ticks.map((v) => `
    <line x1="${PAD.l}" y1="${y(v).toFixed(1)}" x2="${W - PAD.r}" y2="${y(v).toFixed(1)}"
          stroke="${t.grid}" stroke-width="1"/>
    <text x="${PAD.l - 10}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end"
          fill="${t.text}" font-size="10">${v}</text>`).join("");

  // One label per month change, and never two closer than MIN_GAP apart. The
  // month-change rule alone is not enough: the series can start a few days
  // before a month boundary, which renders two labels on top of each other
  // ("SepOct").
  const MIN_GAP = 52;
  let lastMonth = -1;
  let lastLabelX = -Infinity;
  const xLabels = weeks.map((w, i) => {
    const d = new Date(`${w.date}T00:00:00Z`);
    const m = d.getUTCMonth();
    if (m === lastMonth) return "";
    const px = x(i);
    if (px - lastLabelX < MIN_GAP) {
      lastMonth = m; // consume the month so the next one still labels
      return "";
    }
    lastMonth = m;
    lastLabelX = px;
    return `<text x="${px.toFixed(1)}" y="${H - PAD.b + 20}" text-anchor="middle"
            fill="${t.text}" font-size="10">${MONTHS[m]}</text>`;
  }).join("");

  // Direct-label the peak only — a number on every point is noise.
  const peakIdx = weeks.reduce((best, w, i) => (w.total > weeks[best].total ? i : best), 0);
  const peak = weeks[peakIdx];
  const peakAnchor = x(peakIdx) > W - 120 ? "end" : x(peakIdx) < 120 ? "start" : "middle";
  const total = weeks.reduce((s, w) => s + w.total, 0);

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
     xmlns="http://www.w3.org/2000/svg" role="img"
     aria-label="Contribution activity over the last year: ${escapeXml(total)} contributions, peaking at ${escapeXml(peak.total)} in one week">
  <title>Contribution activity — last 12 months</title>
  <defs>
    <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${t.accent}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${t.accent}" stop-opacity="0.03"/>
    </linearGradient>
  </defs>

  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="6"
        fill="${t.bg}" stroke="${t.border}" stroke-opacity="0.15"/>

  <g font-family="'Segoe UI', Ubuntu, Sans-Serif">
    <text x="${PAD.l - 26}" y="30" fill="${t.title}" font-size="16" font-weight="600">Contribution Activity</text>
    <text x="${W - PAD.r}" y="30" text-anchor="end" fill="${t.text}" font-size="12">${escapeXml(total)} in the last year</text>

    ${grid}
    <path d="${area}" fill="url(#fill)"/>
    <path d="${line}" fill="none" stroke="${t.accent}" stroke-width="2"
          stroke-linejoin="round" stroke-linecap="round"/>

    <circle cx="${x(peakIdx).toFixed(1)}" cy="${y(peak.total).toFixed(1)}" r="4"
            fill="${t.accent}" stroke="${t.bg}" stroke-width="2"/>
    <text x="${x(peakIdx).toFixed(1)}" y="${(y(peak.total) - 12).toFixed(1)}"
          text-anchor="${peakAnchor}" fill="${t.ink}" font-size="11" font-weight="600">${escapeXml(peak.total)}</text>

    ${xLabels}
  </g>
</svg>
`;
}

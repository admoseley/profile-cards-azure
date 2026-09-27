/**
 * Architecture diagram for the platform.
 *
 * Rendered rather than hand-drawn so it gets light and dark variants from the
 * same source as every other card, and so it cannot drift from the themes.
 *
 * It shows the mechanism that makes the design work — that rendering happens in
 * CI and Azure only serves files — because that is the whole argument for why
 * this costs nothing and cannot be loaded by anyone else's traffic.
 */

import { escapeXml, resolveTheme } from "./lib/svg.mjs";

const W = 900, H = 330;
const MONO = "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace";
const SANS = "'Segoe UI', Ubuntu, Sans-Serif";

export function renderArchitecture({ theme = "dark" } = {}) {
  const t = resolveTheme(theme);
  const dark = theme !== "light";
  const panel = dark ? "#0e1013" : "#f6f8fa";

  const box = (x, y, w, h, title, lines, accent = false) => `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6"
            fill="${panel}" stroke="${accent ? t.accent : t.grid}"
            stroke-width="${accent ? 1.5 : 1}"/>
      <text x="${x + w / 2}" y="${y + 26}" text-anchor="middle"
            fill="${accent ? t.accent : t.ink}" font-size="13" font-weight="600"
            font-family="${SANS}">${escapeXml(title)}</text>
      ${lines.map((l, i) => `<text x="${x + w / 2}" y="${y + 48 + i * 17}"
            text-anchor="middle" fill="${t.text}" font-size="11"
            font-family="${MONO}">${escapeXml(l)}</text>`).join("")}
    </g>`;

  // Arrow with a label above it.
  const arrow = (x1, x2, y, label) => `
    <g>
      <line x1="${x1}" y1="${y}" x2="${x2 - 9}" y2="${y}"
            stroke="${t.accent}" stroke-width="1.5"/>
      <path d="M${x2 - 9},${y - 4.5} L${x2},${y} L${x2 - 9},${y + 4.5} Z" fill="${t.accent}"/>
      <text x="${(x1 + x2) / 2}" y="${y - 10}" text-anchor="middle"
            fill="${t.text}" font-size="10" font-family="${MONO}">${escapeXml(label)}</text>
    </g>`;

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
     xmlns="http://www.w3.org/2000/svg" role="img"
     aria-label="Architecture: a scheduled GitHub Actions workflow reads the GitHub GraphQL API, renders SVG cards, and deploys them to an Azure Static Web App, which GitHub's camo proxy serves into the profile README. No server runs between renders.">
  <title>profile-cards-azure — architecture</title>

  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="8"
        fill="${t.bg}" stroke="${t.border}" stroke-opacity="${dark ? 0.15 : 0.9}"/>

  <text x="40" y="40" fill="${t.title}" font-size="15" font-weight="600"
        font-family="${SANS}">Rendering pipeline</text>
  <text x="${W - 40}" y="40" text-anchor="end" fill="${t.accent}" font-size="12"
        font-weight="600" font-family="${MONO}">$0 / month</text>

  ${box(40, 70, 190, 96, "GitHub Actions", ["cron: every 6h", "Node + Deno", "16 SVGs, 2 themes"], true)}
  ${box(300, 70, 190, 96, "Azure Static Web App", ["Free tier", "Terraform-managed", "custom domain + TLS"], false)}
  ${box(560, 70, 190, 96, "GitHub camo", ["image proxy", "caches + serves", "to the README"], false)}

  ${arrow(230, 300, 118, "deploy")}
  ${arrow(490, 560, 118, "https")}

  ${box(40, 210, 190, 80, "GitHub GraphQL", ["personal token", "private contributions"], false)}

  <line x1="135" y1="210" x2="135" y2="166" stroke="${t.accent}" stroke-width="1.5"
        stroke-dasharray="3 3"/>
  <path d="M130.5,175 L135,166 L139.5,175 Z" fill="${t.accent}"/>
  <text x="148" y="192" fill="${t.text}" font-size="10" font-family="${MONO}">reads</text>

  <text x="300" y="238" fill="${t.ink}" font-size="12" font-weight="600"
        font-family="${SANS}">No server runs between renders.</text>
  <text x="300" y="258" fill="${t.text}" font-size="11" font-family="${MONO}">Azure only returns files — there is no endpoint to</text>
  <text x="300" y="275" fill="${t.text}" font-size="11" font-family="${MONO}">call, so no one else's traffic can generate load.</text>
  <text x="300" y="296" fill="${t.text}" font-size="11" font-family="${MONO}">That is what killed the services this replaced.</text>
</svg>
`;
}

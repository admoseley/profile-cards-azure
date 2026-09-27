/**
 * Profile hero banner.
 *
 * GitHub strips CSS and JavaScript from READMEs, so a profile's visual range is
 * normally limited to markdown and badge images. It does render SVG from an
 * external host through its camo proxy — and we have one — so a designed header
 * is possible here where it is not on most profiles.
 *
 * Fonts must come from the viewer's machine: camo proxies the SVG as an image
 * and external font URLs will not load. Generic stacks only.
 */

import { escapeXml, resolveTheme } from "./lib/svg.mjs";

const W = 1200;
const H = 260;
const MONO = "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace";

export function renderHero({
  name = "Adrian D. Moseley",
  title = "Staff Systems Engineer — Cloud & Endpoint Platform Engineering",
  tagline = "Azure · Windows 365 & Intune · Citrix DaaS · PowerShell automation",
  stats = [],
} = {}, { theme = "dark" } = {}) {
  const t = resolveTheme(theme);
  const dark = theme !== "light";

  // The grid and glow echo the platform's landing page, so the profile header
  // and the site the cards come from read as the same system.
  const grid = `
    <pattern id="g" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="${t.grid}" stroke-width="1"
            opacity="${dark ? 0.6 : 0.8}"/>
    </pattern>
    <radialGradient id="glow" cx="18%" cy="0%" r="75%">
      <stop offset="0%" stop-color="${t.accent}" stop-opacity="${dark ? 0.18 : 0.10}"/>
      <stop offset="100%" stop-color="${t.accent}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${t.bg}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${t.bg}" stop-opacity="1"/>
    </linearGradient>`;

  const statCells = stats.map((s, i) => {
    const x = 60 + i * 200;
    return `
      <text x="${x}" y="212" fill="${t.text}" font-size="11"
            letter-spacing="2.2" font-family="${MONO}">${escapeXml(s.label.toUpperCase())}</text>
      <text x="${x}" y="238" fill="${i === 0 ? t.accent : t.ink}" font-size="20"
            font-weight="600" font-family="${MONO}">${escapeXml(s.value)}</text>`;
  }).join("");

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
     xmlns="http://www.w3.org/2000/svg" role="img"
     aria-label="${escapeXml(name)} — ${escapeXml(title)}">
  <title>${escapeXml(name)} — ${escapeXml(title)}</title>
  <defs>${grid}</defs>

  <rect width="${W}" height="${H}" rx="8" fill="${t.bg}"/>
  <rect width="${W}" height="${H}" rx="8" fill="url(#g)"/>
  <rect width="${W}" height="${H}" rx="8" fill="url(#glow)"/>
  <rect x="${W * 0.62}" y="0" width="${W * 0.38}" height="${H}" fill="url(#fade)"/>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="8"
        fill="none" stroke="${t.border}" stroke-opacity="${dark ? 0.18 : 0.9}"/>

  <!-- accent rule -->
  <rect x="60" y="52" width="46" height="3" fill="${t.accent}"/>

  <text x="60" y="108" fill="${t.ink}" font-size="44" font-weight="700"
        font-family="${MONO}" letter-spacing="-1">${escapeXml(name)}</text>
  <text x="60" y="142" fill="${t.accent}" font-size="17" font-weight="600"
        font-family="${MONO}">${escapeXml(title)}</text>
  <text x="60" y="170" fill="${t.text}" font-size="14"
        font-family="${MONO}">${escapeXml(tagline)}</text>

  <line x1="60" y1="190" x2="${W - 60}" y2="190" stroke="${t.grid}" stroke-width="1"/>
  ${statCells}
</svg>
`;
}

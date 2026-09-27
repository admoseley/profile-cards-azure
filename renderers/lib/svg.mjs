/**
 * Minimal SVG helpers for the cards we render ourselves.
 *
 * Everything user- or API-supplied is escaped before it reaches the output.
 * Repo names come from the GitHub API rather than a form, but they are still
 * attacker-influenceable (anyone can create a repo with angle brackets in the
 * description and get it in front of this renderer), and the output is served
 * from Adrian's own domain — so escaping is not optional.
 */

const ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

export const escapeXml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);

/**
 * Truncate to a display width, adding an ellipsis. Measured in characters
 * rather than pixels — good enough for a fixed-width card in a monospace-ish
 * label column, and avoids pulling in a font-metrics dependency.
 */
export const truncate = (value, max) => {
  const s = String(value ?? "");
  return s.length <= max ? s : `${s.slice(0, Math.max(0, max - 1))}…`;
};

/** Themes mirror the names used by the other cards so the profile looks coherent. */
export const THEMES = {
  dark: {
    title: "#fb8c00",
    text: "#9f9f9f",
    bg: "#151515",
    border: "#e4e2e2",
    accent: "#fb8c00",
  },
  radical: {
    title: "#fe428e",
    text: "#a9fef7",
    bg: "#141321",
    border: "#e4e2e2",
    accent: "#f8d847",
  },
  default: {
    title: "#2f80ed",
    text: "#434d58",
    bg: "#fffefe",
    border: "#e4e2e2",
    accent: "#2f80ed",
  },
  /* Light theme is chosen, not an automatic inversion of the dark one. The
     amber accent is darkened to #b45309 so it still clears contrast against a
     white surface, where #fb8c00 would not. */
  light: {
    title: "#b45309",
    text: "#4b5563",
    bg: "#ffffff",
    border: "#d1d9e0",
    accent: "#b45309",
    ink: "#111827",
    grid: "#e5e7eb",
  },
};

/* Extra tokens the dark themes need for the hero and activity charts. */
THEMES.dark.ink = "#eef1f4";
THEMES.dark.grid = "#232830";
THEMES.radical.ink = "#ffffff";
THEMES.radical.grid = "#2a2838";
THEMES.default.ink = "#1f2328";
THEMES.default.grid = "#e5e7eb";

export const resolveTheme = (name) => THEMES[name] ?? THEMES.dark;

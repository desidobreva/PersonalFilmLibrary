/**
 * Common utility functions used across the application
 */

export function normalize(str) {
  return String(str || "").trim().toLowerCase();
}

export function safeNumber(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

export function isNA(x) {
  const s = String(x || "").trim();
  return !s || s === "N/A";
}

export function parseRuntimeMin(runtime) {
  // "148 min" -> 148
  const n = parseInt(String(runtime || ""), 10);
  return Number.isFinite(n) ? n : null;
}

export function releasedToISO(released) {
  // "16 Jul 2010" -> "2010-07-16"
  const t = Date.parse(String(released || ""));
  if (!Number.isFinite(t)) return "";
  const d = new Date(t);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

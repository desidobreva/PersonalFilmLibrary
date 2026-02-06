/**
 * UI helper functions for rendering and filtering
 */

import { normalize } from "./utils.js";

export function filterBySearch(list, q) {
  const query = normalize(q);
  if (!query) return list;
  return list.filter((m) => normalize(m.title).includes(query));
}

export function sortByTitleAsc(list) {
  return [...list].sort((a, b) => {
    const A = normalize(a.title);
    const B = normalize(b.title);
    if (A < B) return -1;
    if (A > B) return 1;
    return 0;
  });
}

export function metaLine(movie) {
  const parts = [];
  if (movie.rating !== "" && movie.rating != null) parts.push(`⭐ ${movie.rating}`);
  if (movie.year) parts.push(String(movie.year));
  if (movie.durationMin !== "" && movie.durationMin != null) parts.push(`${movie.durationMin} min`);
  return parts.join(" • ");
}

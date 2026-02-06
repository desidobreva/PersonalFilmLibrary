/**
 * OMDb API integration and poster caching
 */

import { KEYS, read, write } from "./storage.js";
import { normalize, isNA } from "./utils.js";

export const OMDB_API_KEY = "21021edc";

export async function fetchOmdbByTitleYear(title, year) {
  const t = String(title || "").trim();
  const y = Number(year);

  if (!t || !Number.isFinite(y)) return null;

  const url =
    `https://www.omdbapi.com/?apikey=${encodeURIComponent(OMDB_API_KEY)}` +
    `&t=${encodeURIComponent(t)}&y=${encodeURIComponent(String(y))}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.Response !== "True") return null;
    return data;
  } catch {
    return null;
  }
}

export function posterKey(title, year) {
  return `${normalize(title)}:${String(year || "")}`;
}

export function getPosterCache() {
  return read(KEYS.OMDB_POSTER, {});
}

export function setPosterCache(cache) {
  write(KEYS.OMDB_POSTER, cache);
}

export async function fetchPoster(title, year) {
  if (!OMDB_API_KEY) return null;

  const cache = getPosterCache();
  const k = posterKey(title, year);
  if (cache[k]) return cache[k];

  const url = `https://www.omdbapi.com/?apikey=${encodeURIComponent(OMDB_API_KEY)}&t=${encodeURIComponent(title)}&y=${encodeURIComponent(year)}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.Response !== "True") return null;
    if (isNA(data.Poster)) return null;

    cache[k] = data.Poster;
    setPosterCache(cache);
    return data.Poster;
  } catch {
    return null;
  }
}

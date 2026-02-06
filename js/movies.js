/**
 * Movies management and data utilities
 */

import { KEYS, read, write } from "./storage.js";

export const MOVIES_URL = "assets/data/movies.json";

let baseMoviesCache = null;

export async function loadBaseMovies() {
  const res = await fetch(MOVIES_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Cannot load movies.json");
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("movies.json must be an array");

  return data.map(x => ({
    id: Number(x.id),
    title: String(x.title),
    year: Number(x.year),
    rating: x.rating ?? "",
    durationMin: x.durationMin ?? "",
    releaseDate: x.releaseDate ?? "",
    director: x.director ?? "",
    poster: x.poster ?? "",
    source: "base"
  }));
}

export async function loadBaseMoviesOnce() {
  if (baseMoviesCache) return baseMoviesCache;
  baseMoviesCache = await loadBaseMovies();
  return baseMoviesCache;
}

export function getUserMovies(userId) {
  const map = read(KEYS.USER_MOVIES, {});
  return map[userId] || [];
}

export function setUserMovies(userId, movies) {
  const map = read(KEYS.USER_MOVIES, {});
  map[userId] = movies;
  write(KEYS.USER_MOVIES, map);
}

export function getFavorites(userId) {
  const map = read(KEYS.FAVORITES, {});
  return map[userId] || [];
}

export function setFavorites(userId, list) {
  const map = read(KEYS.FAVORITES, {});
  map[userId] = list;
  write(KEYS.FAVORITES, map);
}

export function getWatched(userId) {
  const map = read(KEYS.WATCHED, {});
  return map[userId] || [];
}

export function setWatched(userId, list) {
  const map = read(KEYS.WATCHED, {});
  map[userId] = list;
  write(KEYS.WATCHED, map);
}

export function getIds(key, userId) {
  const map = read(key, {});
  return map[userId] || [];
}

export function setIds(key, userId, ids) {
  const map = read(key, {});
  map[userId] = ids;
  write(key, map);
}

export function isIn(list, movieId) {
  return list.includes(movieId);
}

export function nextUserMovieId(baseMovies, userMovies) {
  const maxBase = Math.max(0, ...baseMovies.map(m => Number(m.id) || 0));
  const maxUser = Math.max(0, ...userMovies.map(m => Number(m.id) || 0));
  return Math.max(maxBase, maxUser) + 1;
}

export function dispatchMoviesChanged() {
  window.dispatchEvent(new CustomEvent("ft:moviesChanged"));
}

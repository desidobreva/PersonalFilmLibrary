
import { KEYS, read, write } from "./storage.js";
import { normalize } from "./utils.js";

export function generateCommentKey(movie) {
  if (movie.source === "base") {
    return String(movie.id);
  }
  // For user movies, use normalized title:year so comments are shared
  const titleKey = normalize(movie.title);
  return `${titleKey}:${movie.year}`;
}

export function getCommentsMap() {
  return read(KEYS.COMMENTS, {});
}

export function setCommentsMap(map) {
  write(KEYS.COMMENTS, map);
}

export function getMovieComments(movie) {
  const key = generateCommentKey(movie);
  const map = getCommentsMap();
  return map?.[key] || [];
}

export function addMovieComment(movie, comment) {
  const key = generateCommentKey(movie);
  const map = getCommentsMap();
  if (!map[key]) map[key] = [];
  map[key].push(comment);
  setCommentsMap(map);
}

/**
 * Clean up comments for a deleted user movie
 * This prevents orphaned comments from accumulating
 */
export function deleteMovieComments(movie) {
  const key = generateCommentKey(movie);
  const map = getCommentsMap();
  delete map[key];
  setCommentsMap(map);
}

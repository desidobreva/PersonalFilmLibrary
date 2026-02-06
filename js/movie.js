import { KEYS, read, getCurrentUser } from "./storage.js";
import { notify } from "./notify.js";
import { getMovieComments, addMovieComment } from "./comments.js";
import { getUserMovies } from "./movies.js";
import { normalize } from "./utils.js";
import { fetchOmdbByTitleYear } from "./omdb.js";

const titleEl = document.getElementById("movieTitle");
const metaEl = document.getElementById("movieMeta");
const posterEl = document.getElementById("moviePoster");

const commentPanel = document.getElementById("commentPanel");
const commentForm = document.getElementById("commentForm");
const commentsList = document.getElementById("commentsList");

const cAuthor = document.getElementById("cAuthor");
const cText = document.getElementById("cText");
const cAuthorError = document.getElementById("cAuthorError");
const cTextError = document.getElementById("cTextError");
const charCount = document.getElementById("charCount");

function getParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function getIdFromUrl() {
  const raw = getParam("id");
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

function getFrom() {
  return (getParam("from") || "").toLowerCase();
}

function formatDateISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function setPoster(url, alt) {
  if (!posterEl) return;

  if (!url || url === "N/A") {
    posterEl.innerHTML = `<div class="poster-fallback">No poster</div>`;
    return;
  }
  posterEl.innerHTML = `<img src="${url}" alt="${alt}" loading="lazy">`;
}

function renderMeta(rows) {
  if (!metaEl) return;

  metaEl.innerHTML = rows
    .filter(r => r.value && String(r.value).trim() !== "")
    .map(r => `
      <div class="meta-row">
        <span class="meta-label">${r.label}:</span>
        <span class="meta-value">${r.value}</span>
      </div>
    `)
    .join("");
}

function canComment(from) {
  return from === "favorites" || from === "watched";
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderComments(list) {
  if (!commentsList) return;

  if (!list.length) {
    commentsList.innerHTML = `
      <li class="comment">
        <div class="comment-head"><span>No comments yet</span><span></span></div>
        <p class="comment-text">Be the first to comment.</p>
      </li>
    `;
    return;
  }

  const sorted = [...list].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  commentsList.innerHTML = sorted
    .map(c => `
      <li class="comment">
        <div class="comment-head">
          <span>${escapeHtml(c.author)}</span>
          <span>${escapeHtml(c.date)}</span>
        </div>
        <p class="comment-text">${escapeHtml(c.text)}</p>
      </li>
    `)
    .join("");
}

function validateComment(author, text) {
  let ok = true;

  const a = normalize(author);
  const t = normalize(text);

  if (cAuthorError) cAuthorError.textContent = "";
  if (cTextError) cTextError.textContent = "";

  if (!a) {
    ok = false;
    if (cAuthorError) cAuthorError.textContent = "You must be logged in.";
  }

  if (t.length < 2) {
    ok = false;
    if (cTextError) cTextError.textContent = "Comment must be at least 2 characters.";
  }

  if (t.length > 200) {
    ok = false;
    if (cTextError) cTextError.textContent = "Comment must be 200 characters max.";
  }

  return ok;
}

async function init() {
  const id = getIdFromUrl();
  if (!id) {
    if (titleEl) titleEl.textContent = "Movie not found";
    renderMeta([{ label: "Error", value: "Missing or invalid id in URL." }]);
    return;
  }

  const from = getFrom();
  const user = getCurrentUser();
  const uid = user?.id ?? null;

  const baseMovies = await loadBaseMovies();
  let merged = [...baseMovies];

  if (uid) {
    merged = [...merged, ...getUserMovies(uid)];
  }

  const movie = merged.find(m => m.id === id);
  if (!movie) {
    if (titleEl) titleEl.textContent = "Movie not found";
    renderMeta([{ label: "Error", value: "No movie with this id." }]);
    setPoster(null, "No poster");
    return;
  }

  // Load and render comments for this movie (works for both base and user movies)
  renderComments(getMovieComments(movie));

  const allowForm = Boolean(uid) && canComment(from);
  if (commentPanel) commentPanel.hidden = !allowForm;

  if (allowForm && cAuthor) {
    cAuthor.value = user.email || "";
    cAuthor.readOnly = true;
  }

  if (cText && charCount) {
    const update = () => (charCount.textContent = String(cText.value.length));
    cText.addEventListener("input", update);
    update();
  }

  if (commentForm && allowForm) {
    commentForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const author = user?.email || "";
      const text = cText ? cText.value : "";

      if (!validateComment(author, text)) return;

      // Pass the movie object for proper key generation
      addMovieComment(movie, {
        author,
        date: formatDateISO(new Date()),
        text: normalize(text)
      });

      notify("Comment added!", "success");

      if (cText) cText.value = "";
      if (charCount) charCount.textContent = "0";

      // Reload comments to show the new one
      renderComments(getMovieComments(movie));
    });
  }

  if (titleEl) titleEl.textContent = movie.title;

  const omdb = await fetchOmdbByTitleYear(movie.title, movie.year);

  if (omdb) {
    setPoster(omdb.Poster, `${movie.title} poster`);
    renderMeta([
      { label: "Year", value: omdb.Year },
      { label: "Runtime", value: omdb.Runtime },
      { label: "Released", value: omdb.Released },
      { label: "Genre", value: omdb.Genre },
      { label: "Director", value: omdb.Director },
      { label: "Actors", value: omdb.Actors },
      { label: "IMDb", value: omdb.imdbRating ? `⭐ ${omdb.imdbRating}` : "" },
      { label: "Plot", value: omdb.Plot }
    ]);
  } else {
    setPoster(null, movie.title);
    renderMeta([
      { label: "Director", value: movie.director },
      { label: "Release", value: movie.releaseDate },
      { label: "Duration", value: movie.durationMin ? `${movie.durationMin} min` : "" },
      { label: "Rating", value: movie.rating ? `⭐ ${movie.rating}` : "" },
      { label: "Year", value: movie.year }
    ]);
  }

  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
    backBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (from === "favorites") window.location.href = "favorites.html";
      else if (from === "watched") window.location.href = "watched.html";
      else window.location.href = "catalog.html";
    });
  }
}

init().catch(err => {
  console.error(err);
  if (titleEl) titleEl.textContent = "Error";
  renderMeta([{ label: "Error", value: "Failed to load movie details." }]);
});

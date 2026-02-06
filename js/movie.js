import { KEYS, read, write, getCurrentUser } from "./storage.js";

const MOVIES_URL = "assets/data/movies.json";
const OMDB_API_KEY = "21021edc";

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

function normalize(str) {
  return String(str || "").trim();
}

function formatDateISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function loadBaseMovies() {
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
    source: "base"
  }));
}

function getUserMovies(userId) {
  const map = read(KEYS.USER_MOVIES, {});
  return map[userId] || [];
}

async function fetchOmdb(title, year) {
  if (!OMDB_API_KEY) return null;

  const url =
    `https://www.omdbapi.com/?apikey=${encodeURIComponent(OMDB_API_KEY)}` +
    `&t=${encodeURIComponent(title)}&y=${encodeURIComponent(year)}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  if (data.Response !== "True") return null;
  return data;
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

function getCommentsMap() {
  return read(KEYS.COMMENTS, {});
}

function setCommentsMap(map) {
  write(KEYS.COMMENTS, map);
}

function getMovieComments(movieId) {
  const map = getCommentsMap();
  return map?.[movieId] || [];
}

function addMovieComment(movieId, comment) {
  const map = getCommentsMap();
  if (!map[movieId]) map[movieId] = [];
  map[movieId].push(comment);
  setCommentsMap(map);
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

  renderComments(getMovieComments(String(id)));

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

      addMovieComment(String(id), {
        author,
        date: formatDateISO(new Date()),
        text: normalize(text)
      });

      if (cText) cText.value = "";
      if (charCount) charCount.textContent = "0";

      renderComments(getMovieComments(String(id)));
    });
  }

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

  if (titleEl) titleEl.textContent = movie.title;

  const omdb = await fetchOmdb(movie.title, movie.year);

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

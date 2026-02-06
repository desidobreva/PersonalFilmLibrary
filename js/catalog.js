import { KEYS, read, write, requireAuth, getCurrentUser } from "./storage.js";
import { notify } from "./notify.js";

const MOVIES_URL = "assets/data/movies.json";

const moviesContainer = document.getElementById("moviesContainer");
const sortSelect = document.getElementById("sortBy");
const toggleTitleBtn = document.getElementById("toggleTitleBtn");
const searchInput = document.getElementById("searchInput");

let sortDir = "asc"; 

let baseMoviesCache = null;

const CATALOG_STATE_KEY = "pfl:catalogState";

function saveCatalogState() {
  const state = {
    sortBy: sortSelect?.value || "title",
    sortDir,
    search: searchInput?.value || "",
    scrollY: window.scrollY || 0
  };
  sessionStorage.setItem(CATALOG_STATE_KEY, JSON.stringify(state));
}

function loadCatalogState() {
  try {
    const raw = sessionStorage.getItem(CATALOG_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function applyCatalogState(state) {
  if (!state) return;

  if (sortSelect && state.sortBy) sortSelect.value = state.sortBy;
  sortDir = state.sortDir === "desc" ? "desc" : "asc";

  if (searchInput && typeof state.search === "string") searchInput.value = state.search;

  updateSortToggleLabel();
}

function normalize(str) {
  return String(str || "").trim().toLowerCase();
}

function safeNumber(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
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
    poster: x.poster ?? "",
    source: "base"
  }));
}

async function loadBaseMoviesOnce() {
  if (baseMoviesCache) return baseMoviesCache;
  baseMoviesCache = await loadBaseMovies();
  return baseMoviesCache;
}

function getUserMovies(userId) {
  const map = read(KEYS.USER_MOVIES, {});
  return map[userId] || [];
}

function setUserMovies(userId, movies) {
  const map = read(KEYS.USER_MOVIES, {});
  map[userId] = movies;
  write(KEYS.USER_MOVIES, map);
}

function getFavorites(userId) {
  const map = read(KEYS.FAVORITES, {});
  return map[userId] || [];
}

function setFavorites(userId, list) {
  const map = read(KEYS.FAVORITES, {});
  map[userId] = list;
  write(KEYS.FAVORITES, map);
}

function getWatched(userId) {
  const map = read(KEYS.WATCHED, {});
  return map[userId] || [];
}

function setWatched(userId, list) {
  const map = read(KEYS.WATCHED, {});
  map[userId] = list;
  write(KEYS.WATCHED, map);
}

function isIn(list, movieId) {
  return list.includes(movieId);
}

function updateSortToggleLabel() {
  if (!toggleTitleBtn || !sortSelect) return;

  const sortBy = (sortSelect.value || "title").toLowerCase();

  const labelMap = {
    title: "Title",
    rating: "Rating",
    releasedate: "Release date",
    duration: "Duration",
    year: "Year"
  };

  const name = labelMap[sortBy] || "Sort";
  const arrow = sortDir === "asc" ? "↑" : "↓";

  toggleTitleBtn.textContent = `${name} ${arrow}`;
}

function createPosterEl(movie) {
  const wrap = document.createElement("div");
  wrap.className = "poster";

  if (movie?.source === "user") {
    wrap.innerHTML = `<div class="poster-fallback">No poster</div>`;
    return wrap;
  }

  if (movie?.poster) {
    const img = document.createElement("img");
    img.src = `assets/img/posters/${movie.poster}`;
    img.alt = `${movie.title} poster`;
    img.loading = "lazy";

    img.addEventListener("error", () => {
      wrap.innerHTML = `<div class="poster-fallback">No poster</div>`;
    });

    wrap.appendChild(img);
    return wrap;
  }

  wrap.innerHTML = `<div class="poster-fallback">Poster</div>`;
  return wrap;
}

function createMovieCard(movie, options) {
  const card = document.createElement("div");
  card.className = "card movie-card";

  const inner = document.createElement("div");
  inner.className = "card-inner";

  const poster = createPosterEl(movie);

  const title = document.createElement("div");
  title.className = "movie-title";
  title.textContent = movie.title;

  const meta = document.createElement("div");
  meta.className = "movie-meta";
  meta.innerHTML = `
    <span>${movie.year || ""}</span>
    <span>⭐ ${movie.rating || "-"}</span>
  `;

  const row = document.createElement("div");
  row.className = "row";

  const moreBtn = document.createElement("a");
  moreBtn.className = "btn primary";
  moreBtn.textContent = "More info";
  moreBtn.href = `movie.html?id=${movie.id}&from=catalog`;
  row.appendChild(moreBtn);

  moreBtn.addEventListener("click", () => {
    saveCatalogState();
  });

  if (options?.canAct) {
    const favBtn = document.createElement("button");
    favBtn.className = "btn";
    favBtn.textContent = "Add to Favorites";
    favBtn.addEventListener("click", () => options.onAddFavorite(movie.id));
    row.appendChild(favBtn);

    const watchedBtn = document.createElement("button");
    watchedBtn.className = "btn";
    watchedBtn.textContent = "Mark as Watched";
    watchedBtn.addEventListener("click", () => options.onAddWatched(movie.id));
    row.appendChild(watchedBtn);

    if (movie.source === "user") {
      const removeBtn = document.createElement("button");
      removeBtn.className = "btn danger";
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", () => options.onRemoveUserMovie(movie.id));
      row.appendChild(removeBtn);
    }
  }

  inner.append(poster, title, meta, row);
  card.appendChild(inner);
  return card;
}

function applyFilters(movies) {
  const q = normalize(searchInput?.value || "");

  return movies.filter(m => {
    const okText = !q || normalize(m.title).includes(q);
    return okText;
  });
}

function sortMovies(movies) {
  const sortBy = (sortSelect?.value || "title").toLowerCase();
  const dir = sortDir;

  const arr = [...movies];

  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const toTime = (v) => {
    const t = Date.parse(String(v || ""));
    return Number.isFinite(t) ? t : 0;
  };

  if (sortBy === "title") {
    arr.sort((a, b) => normalize(a.title).localeCompare(normalize(b.title)));
  } else if (sortBy === "rating") {
    arr.sort((a, b) => toNum(a.rating) - toNum(b.rating));
  } else if (sortBy === "releasedate") {
    arr.sort((a, b) => toTime(a.releaseDate) - toTime(b.releaseDate));
  } else if (sortBy === "duration") {
    arr.sort((a, b) => toNum(a.durationMin) - toNum(b.durationMin));
  } else if (sortBy === "year") {
    arr.sort((a, b) => toNum(a.year) - toNum(b.year));
  }

  if (dir === "desc") arr.reverse();
  return arr;
}


function render(movies, options) {
  if (!moviesContainer) return;
  moviesContainer.innerHTML = "";

  const filtered = applyFilters(movies);
  const sorted = sortMovies(filtered);

  sorted.forEach(m => moviesContainer.appendChild(createMovieCard(m, options)));
}

async function init() {
  const baseMovies = await loadBaseMoviesOnce();

  const user = getCurrentUser();
  const uid = user?.id ?? null;

  const userMovies = uid ? getUserMovies(uid) : [];
  let merged = [...baseMovies, ...userMovies];

  const options = {
    canAct: Boolean(uid),

    onAddFavorite: (movieId) => {
      const u = requireAuth();
      if (!u) return;

      const fav = getFavorites(u.id);
      if (isIn(fav, movieId)) {
        notify("This movie is already in Favorites.");
        return;
      }
      fav.push(movieId);
      setFavorites(u.id, fav);
      notify("Added to Favorites!");
    },

    onAddWatched: (movieId) => {
      const u = requireAuth();
      if (!u) return;

      const list = getWatched(u.id);
      if (isIn(list, movieId)) {
        notify("This movie is already marked as Watched.");
        return;
      }
      list.push(movieId);
      setWatched(u.id, list);
      notify("Marked as Watched!");
    },

    onRemoveUserMovie: (movieId) => {
      const u = requireAuth();
      if (!u) return;

      const list = getUserMovies(u.id);
      const next = list.filter(x => Number(x.id) !== Number(movieId));
      setUserMovies(u.id, next);

      merged = [...baseMovies, ...next];
      render(merged, options);
    }
  };

  const saved = loadCatalogState();
  applyCatalogState(saved);
  render(merged, options);
  if (saved?.scrollY) {
    requestAnimationFrame(() => window.scrollTo(0, saved.scrollY));
  }

  if (toggleTitleBtn) {
    toggleTitleBtn.addEventListener("click", () => {
      sortDir = sortDir === "asc" ? "desc" : "asc";
      updateSortToggleLabel();
      saveCatalogState();
      render(merged, options);
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      updateSortToggleLabel();
      saveCatalogState();
      render(merged, options);
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      saveCatalogState();
      render(merged, options);
    });
  }

  window.addEventListener("ft:moviesChanged", () => {
    const u = getCurrentUser();
    if (!u?.id) return;
    const refreshedUserMovies = getUserMovies(u.id);
    merged = [...baseMovies, ...refreshedUserMovies];
    render(merged, { ...options, canAct: true });
  });
}

init().catch(err => {
  console.error(err);
  if (moviesContainer) moviesContainer.innerHTML = "<p>Failed to load movies.</p>";
});

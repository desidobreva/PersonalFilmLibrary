import { requireAuth, getCurrentUser } from "./storage.js";
import { notify } from "./notify.js";
import { 
  loadBaseMoviesOnce, 
  getUserMovies, 
  setUserMovies, 
  getFavorites, 
  setFavorites, 
  getWatched, 
  setWatched, 
  isIn, 
  dispatchMoviesChanged 
} from "./movies.js";
import { deleteMovieComments } from "./comments.js";
import { normalize, safeNumber } from "./utils.js";

const moviesContainer = document.getElementById("moviesContainer");
const sortSelect = document.getElementById("sortBy");
const toggleTitleBtn = document.getElementById("toggleTitleBtn");
const searchInput = document.getElementById("searchInput");

let sortDir = "asc"; 

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

  if (movie?.poster) {
    const img = document.createElement("img");
    
    // Check if poster is a URL (from OMDb) or local file path
    if (String(movie.poster).startsWith("http")) {
      img.src = movie.poster;  // OMDb URL
      console.log(`Loading OMDb poster for "${movie.title}":`, movie.poster);
    } else {
      img.src = `assets/img/posters/${movie.poster}`;  // Local file
      console.log(`Loading local poster for "${movie.title}":`, movie.poster);
    }
    
    img.alt = `${movie.title} poster`;
    img.loading = "lazy";

    img.addEventListener("error", () => {
      console.error(`Failed to load poster for "${movie.title}":`, img.src);
      wrap.innerHTML = `<div class="poster-fallback">No poster</div>`;
    });

    wrap.appendChild(img);
    return wrap;
  }

  wrap.innerHTML = `<div class="poster-fallback">No poster</div>`;
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
      removeBtn.addEventListener("click", () => options.onRemoveUserMovie(movie));
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

    onRemoveUserMovie: (movie) => {
      const u = requireAuth();
      if (!u) return;

      // Remove from user movies
      const list = getUserMovies(u.id);
      const next = list.filter(x => Number(x.id) !== Number(movie.id));
      setUserMovies(u.id, next);

      // Also remove from favorites if it's there
      const favs = getFavorites(u.id);
      const nextFavs = favs.filter(x => Number(x) !== Number(movie.id));
      setFavorites(u.id, nextFavs);

      // Also remove from watched if it's there
      const watched = getWatched(u.id);
      const nextWatched = watched.filter(x => Number(x) !== Number(movie.id));
      setWatched(u.id, nextWatched);

      // Clean up comments for this movie
      deleteMovieComments(movie);

      merged = [...baseMovies, ...next];
      render(merged, options);
      notify("Movie removed!");
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

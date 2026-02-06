import { KEYS, read, write, requireAuth, getCurrentUser } from "./storage.js";

const MOVIES_URL = "assets/data/movies.json";
const moviesContainer = document.getElementById("moviesContainer");

function normalize(str) {
  return String(str || "").trim().toLowerCase();
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
    genre: x.genre ?? "",
    poster: x.poster ?? "",
    source: "base"
  }));
}

function getUserMovies(userId) {
  const map = read(KEYS.USER_MOVIES, {});
  return map[userId] || [];
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

function createMovieCard(movie, { onRemoveFavorite }) {
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
  moreBtn.href = `movie.html?id=${movie.id}&from=favorites`;
  row.appendChild(moreBtn);

  const removeBtn = document.createElement("button");
  removeBtn.className = "btn danger";
  removeBtn.textContent = "Remove";
  removeBtn.addEventListener("click", () => onRemoveFavorite(movie.id));
  row.appendChild(removeBtn);

  inner.append(poster, title, meta, row);
  card.appendChild(inner);
  return card;
}

async function init() {
  const user = getCurrentUser();
  if (!user?.id) {
    alert("Please sign in to access this page.");
    window.location.href = "login.html";
    return;
  }

  const baseMovies = await loadBaseMovies();
  const userMovies = getUserMovies(user.id);
  const merged = [...baseMovies, ...userMovies];

  const favIds = getFavorites(user.id);
  const favMovies = merged.filter(m => favIds.includes(m.id));

  if (!moviesContainer) return;
  moviesContainer.innerHTML = "";

  if (!favMovies.length) {
    moviesContainer.innerHTML = "<p>No favorites yet.</p>";
    return;
  }

  const onRemoveFavorite = (movieId) => {
    const u = requireAuth();
    if (!u) return;

    const list = getFavorites(u.id).filter(id => Number(id) !== Number(movieId));
    setFavorites(u.id, list);
    window.location.reload();
  };

  favMovies.forEach(m => moviesContainer.appendChild(createMovieCard(m, { onRemoveFavorite })));
}

init().catch(err => {
  console.error(err);
  if (moviesContainer) moviesContainer.innerHTML = "<p>Failed to load favorites.</p>";
});

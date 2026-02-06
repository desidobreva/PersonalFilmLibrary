// js/favorites.js
import { KEYS, requireAuth } from "./storage.js";
import { 
  loadBaseMoviesOnce, 
  getUserMovies, 
  getIds, 
  setIds
} from "./movies.js";
import { filterBySearch, sortByTitleAsc, metaLine } from "./ui-helpers.js";
import { fetchPoster } from "./omdb.js";

const grid = document.getElementById("moviesContainer");
const searchInput = document.getElementById("favSearch");
const clearBtn = document.getElementById("clearFavoritesBtn");

let mergedMovies = [];
let userId = null;

function createCard(movie) {
  const card = document.createElement("article");
  card.className = "card movie-card";

  const inner = document.createElement("div");
  inner.className = "card-inner";

  const poster = document.createElement("div");
  poster.className = "poster";
  poster.innerHTML = `<div class="poster-fallback">Poster</div>`;

  fetchPoster(movie.title, movie.year).then((url) => {
    if (!url) return;
    poster.innerHTML = `<img src="${url}" alt="${movie.title} poster" loading="lazy">`;
  });

  const title = document.createElement("h2");
  title.className = "movie-title";
  title.textContent = movie.title;

  const meta = document.createElement("div");
  meta.className = "movie-meta";
  const metaText = metaLine(movie);
  meta.innerHTML = metaText ? `<span>${metaText}</span>` : `<span>${movie.year || ""}</span>`;

  const row = document.createElement("div");
  row.className = "row";

  const more = document.createElement("a");
  more.className = "btn primary";
  more.href = `movie.html?id=${encodeURIComponent(movie.id)}&from=favorites`;
  more.textContent = "More info";

  const removeBtn = document.createElement("button");
  removeBtn.className = "btn danger";
  removeBtn.type = "button";
  removeBtn.textContent = "Remove";
  removeBtn.addEventListener("click", () => {
    let ids = getIds(KEYS.FAVORITES, userId);
    ids = ids.filter((id) => id !== movie.id);
    setIds(KEYS.FAVORITES, userId, ids);
    render();
  });

  row.appendChild(more);
  row.appendChild(removeBtn);

  inner.appendChild(poster);   // ✅ важно: първо постера
  inner.appendChild(title);
  inner.appendChild(meta);
  inner.appendChild(row);
  card.appendChild(inner);

  return card;
}

function render() {
  if (!grid) return;

  const ids = getIds(KEYS.FAVORITES, userId);
  const favMovies = mergedMovies.filter((m) => ids.includes(m.id));

  const q = searchInput ? searchInput.value : "";
  const filtered = filterBySearch(favMovies, q);
  const sorted = sortByTitleAsc(filtered);

  grid.innerHTML = "";

  if (sorted.length === 0) {
    grid.innerHTML = `<div class="card"><div class="card-inner">No favorite movies yet.</div></div>`;
    return;
  }

  for (const m of sorted) {
    grid.appendChild(createCard(m));
  }
}

async function init() {
  const user = requireAuth();
  if (!user) return;

  userId = user.id ?? user.userId;

  const baseMovies = await loadBaseMoviesOnce();
  const userMovies = getUserMovies(userId);
  mergedMovies = [...baseMovies, ...userMovies];

  if (searchInput) searchInput.addEventListener("input", render);

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (!confirm("Clear all favorite movies?")) return;
      setIds(KEYS.FAVORITES, userId, []);
      render();
    });
  }

  render();
}

init().catch((err) => {
  console.error(err);
  if (grid) grid.innerHTML = `<div class="card"><div class="card-inner">Error loading favorites.</div></div>`;
});

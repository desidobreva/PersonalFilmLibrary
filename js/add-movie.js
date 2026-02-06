import { KEYS, read, write, requireAuth, getCurrentUser } from "./storage.js";
import { notify } from "./notify.js";

const MOVIES_URL = "assets/data/movies.json";
const OMDB_API_KEY = "21021edc";

const openBtn = document.getElementById("openAddMovieBtn");
const panel = document.getElementById("addMoviePanel");
const form = document.getElementById("addMovieForm");
const cancelBtn = document.getElementById("cancelAddMovieBtn");

const inTitle = document.getElementById("amTitle");
const inYear = document.getElementById("amYear");
const inRuntime = document.getElementById("amRuntime");
const inRelease = document.getElementById("amRelease");
const inRating = document.getElementById("amRating");
const inDirector = document.getElementById("amDirector");

let baseMoviesCache = null;

function normalizeKey(str) {
  return String(str || "").trim().toLowerCase();
}

function showPanel(show) {
  if (!panel) return;
  panel.hidden = !show;
}

async function loadBaseMoviesOnce() {
  if (baseMoviesCache) return baseMoviesCache;

  const res = await fetch(MOVIES_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Cannot load movies.json");
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("movies.json must be an array");

  baseMoviesCache = data.map(x => ({
    id: Number(x.id),
    title: String(x.title),
    year: Number(x.year)
  }));

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

function dispatchMoviesChanged() {
  window.dispatchEvent(new CustomEvent("ft:moviesChanged"));
}

function validateFormInput() {
  const title = (inTitle?.value || "").trim();
  const year = Number(inYear?.value || "");
  const runtimeMin = Number(inRuntime?.value || "");
  const release = (inRelease?.value || "").trim();
  const rating = Number(inRating?.value || "");
  const director = (inDirector?.value || "").trim();

  if (!title) return { error: "Title is required." };
  if (!year || year < 1880 || year > 2100) return { error: "Enter a valid year." };
  if (!runtimeMin || runtimeMin < 1) return { error: "Enter a valid duration in minutes." };
  if (!release) return { error: "Release date is required." };
  if (!Number.isFinite(rating) || rating < 0 || rating > 10) return { error: "Rating must be between 0 and 10." };
  if (!director) return { error: "Director is required." };

  return { title, year, runtimeMin, release, rating, director };
}

async function fetchOmdbExact(title, year) {
  if (!OMDB_API_KEY) return null;

  const url =
    `https://www.omdbapi.com/?apikey=${encodeURIComponent(OMDB_API_KEY)}` +
    `&t=${encodeURIComponent(title)}&y=${encodeURIComponent(year)}`;

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

async function onOpen() {
  const user = requireAuth();
  if (!user) return;

  showPanel(true);
  inTitle?.focus();
}

function onCancel() {
  form?.reset();
  showPanel(false);
}

async function onSubmit(e) {
  e.preventDefault();

  const user = requireAuth();
  if (!user) return;

  const baseMovies = await loadBaseMoviesOnce();
  const currentUserMovies = getUserMovies(user.id);

  const input = validateFormInput();
  if (input.error) {
    notify(input.error, "error");
    return;
  }

  const omdb = await fetchOmdbExact(input.title, input.year);
  if (!omdb) {
    notify("No movie found in OMDb with this title and year. It will NOT be added.", "error");
    return;
  }

  const canonicalTitle = String(omdb.Title || input.title).trim();
  const canonicalYear = Number(omdb.Year) || input.year;

  // обединяваме всички филми (базови + всички потребителски)
  const userMoviesMap = read(KEYS.USER_MOVIES, {});
  const allUserMovies = Object.values(userMoviesMap).flat();
  const merged = [...baseMovies, ...allUserMovies];

  // проверка дали филмът вече съществува глобално
  let existingMovie = merged.find(m =>
    normalizeKey(m.title) === normalizeKey(canonicalTitle) &&
    Number(m.year) === canonicalYear
  );

  let id;
  if (existingMovie) {
    // използваме съществуващото глобално id
    id = existingMovie.id;
  } else {
    // ако е нов филм – генерираме нов глобален id
    const maxBase = Math.max(0, ...baseMovies.map(m => Number(m.id) || 0));
    const maxUser = Math.max(0, ...allUserMovies.map(m => Number(m.id) || 0));
    id = Math.max(maxBase, maxUser) + 1;
  }

  // създаваме филма за текущия потребител
  const movie = {
    id,
    title: canonicalTitle,
    year: canonicalYear,
    durationMin: String(input.runtimeMin),
    releaseDate: input.release,
    rating: omdb.imdbRating ?? "",
    director: input.director,
    source: "user"
  };

  currentUserMovies.push(movie);
  setUserMovies(user.id, currentUserMovies);

  form.reset();
  showPanel(false);

  dispatchMoviesChanged();
}


function init() {
  if (!openBtn || !panel || !form || !cancelBtn) return;

  openBtn.addEventListener("click", onOpen);
  cancelBtn.addEventListener("click", onCancel);
  form.addEventListener("submit", onSubmit);

  window.addEventListener("storage", () => {
    const u = getCurrentUser();
    if (!u) showPanel(false);
  });
}

init();

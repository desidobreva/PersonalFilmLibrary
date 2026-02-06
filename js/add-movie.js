
import { requireAuth, getCurrentUser } from "./storage.js";
import { notify } from "./notify.js";
import { 
  loadBaseMoviesOnce, 
  getUserMovies, 
  setUserMovies, 
  nextUserMovieId, 
  dispatchMoviesChanged, 
} from "./movies.js";
import { normalize, isNA, parseRuntimeMin, releasedToISO } from "./utils.js";
import { fetchOmdbByTitleYear } from "./omdb.js";

// Elements (must exist in catalog.html)
const openBtn = document.getElementById("openAddMovieBtn");
const panel = document.getElementById("addMoviePanel");
const form = document.getElementById("addMovieForm");
const cancelBtn = document.getElementById("cancelAddMovieBtn");

// Inputs
const inTitle = document.getElementById("amTitle");
const inYear = document.getElementById("amYear");
const inRuntime = document.getElementById("amRuntime");
const inRelease = document.getElementById("amRelease");
const inRating = document.getElementById("amRating");
const inDirector = document.getElementById("amDirector");

let baseMoviesCache = null;

function showPanel(show) {
  if (!panel) return;
  panel.hidden = !show;
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

  // 1) Минимална валидация за заявка към OMDb
  const rawTitle = (inTitle?.value || "").trim();
  const rawYear = Number(inYear?.value || "");

  if (!rawTitle) {
    notify("Title is required.", "error");
    return;
  }
  if (!rawYear || rawYear < 1880 || rawYear > 2100) {
    notify("Enter a valid year.", "error");
    return;
  }

  // 2) Проверка в OMDb: ако намеримо - отлично, ако не - ползваме form данни
  const omdb = await fetchOmdbByTitleYear(rawTitle, rawYear);

  // 3) Получаваме данни - или от OMDb, или от формата
  const canonicalTitle = omdb?.Title || rawTitle;
  const canonicalYear = omdb ? Number(omdb.Year) : rawYear;

  // Вземаме runtime/release/rating/director от OMDb, ако ги има.
  // Ако OMDb върне N/A или няма данни, ползваме това от формата.
  const runtimeFromOmdb = omdb ? parseRuntimeMin(omdb.Runtime) : null;
  const runtimeMin = runtimeFromOmdb ?? Number(inRuntime?.value || "");

  const releaseFromOmdb = omdb ? releasedToISO(omdb.Released) : "";
  const releaseDate = !isNA(releaseFromOmdb) ? releaseFromOmdb : (inRelease?.value || "").trim();

  const ratingFromOmdb = omdb && !isNA(omdb.imdbRating) ? Number(omdb.imdbRating) : Number(inRating?.value || "");
  const directorFromOmdb = omdb && !isNA(omdb.Director) ? String(omdb.Director).trim() : (inDirector?.value || "").trim();

  // 4) Валидации за полетата
  if (!runtimeMin || runtimeMin < 1) {
    notify("Enter a valid duration in minutes.", "error");
    return;
  }
  if (!releaseDate) {
    notify("Release date is required.", "error");
    return;
  }
  if (!Number.isFinite(ratingFromOmdb) || ratingFromOmdb < 0 || ratingFromOmdb > 10) {
    notify("Rating must be between 0 and 10.", "error");
    return;
  }
  if (!directorFromOmdb) {
    notify("Director is required.", "error");
    return;
  }

  // 5) Duplicate check (по каноничното заглавие + година)
  const merged = [...baseMovies, ...currentUserMovies];
  const exists = merged.some(m =>
    normalize(m.title) === normalize(canonicalTitle) &&
    Number(m.year) === Number(canonicalYear)
  );

  if (exists) {
    notify("A movie with this title already exists.", "error");
    return;
  }

  // 6) Build movie (с OMDb Title и данни, или само form данни)
  const id = nextUserMovieId(baseMovies, currentUserMovies);

  const posterUrl = omdb && !isNA(omdb.Poster) ? omdb.Poster : "";

  const movie = {
    id,
    title: canonicalTitle,
    year: canonicalYear,
    durationMin: String(runtimeMin),
    releaseDate: releaseDate,
    rating: String(ratingFromOmdb),
    director: directorFromOmdb,
    poster: posterUrl,
    source: "user"
  };

  // (по желание) обнови и input-ите да се вижда, че е "коригирано":
  if (inTitle) inTitle.value = canonicalTitle;
  if (inYear) inYear.value = String(canonicalYear);
  if (inRuntime) inRuntime.value = String(runtimeMin);
  if (inRelease) inRelease.value = String(releaseDate);
  if (inRating) inRating.value = String(ratingFromOmdb);
  if (inDirector) inDirector.value = String(directorFromOmdb);

  // 7) Запис в localStorage
  currentUserMovies.push(movie);
  setUserMovies(user.id, currentUserMovies);

  notify(`"${movie.title}" added to your library!`, "success");

  console.log("✅ Movie added:", movie);
  console.log("Poster URL stored:", movie.poster);
  console.log("From OMDb:", !!omdb);

  form.reset();
  showPanel(false);
  dispatchMoviesChanged();
}


function init() {
  // Ако страницата няма тези елементи, просто не правим нищо
  if (!openBtn || !panel || !form || !cancelBtn) return;

  openBtn.addEventListener("click", onOpen);
  cancelBtn.addEventListener("click", onCancel);
  form.addEventListener("submit", onSubmit);

  // Ако user logout-не, да се скрие панела
  window.addEventListener("storage", () => {
    const u = getCurrentUser();
    if (!u) showPanel(false);
  });
}

init();
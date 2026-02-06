export const KEYS = {
  USERS: "ft:users",
  USER_MOVIES: "ft:userMovies",
  FAVORITES: "ft:favorites",
  WATCHED: "ft:watched",
  COMMENTS: "ft:comments",
  OMDB_POSTER: "ft:omdbPoster",
  OMDB_DETAILS: "ft:omdbDetails",

  SESSION: "ft:session",
  CURRENT_USER: "currentUser"
};

localStorage.removeItem(KEYS.CURRENT_USER);
localStorage.removeItem(KEYS.SESSION);

export function read(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw || raw === "null" || raw === "undefined") return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

export function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function readSession(key, fallback) {
  const raw = sessionStorage.getItem(key);
  if (!raw || raw === "null" || raw === "undefined") return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

function writeSession(key, value) {
  sessionStorage.setItem(key, JSON.stringify(value));
}

export function getSession() {
  return readSession(KEYS.SESSION, null);
}

export function setSession(userId) {
  writeSession(KEYS.SESSION, { userId });
}

export function clearSession() {
  sessionStorage.removeItem(KEYS.SESSION);
}

export function setCurrentUser(user) {
  writeSession(KEYS.CURRENT_USER, { id: user.id, email: user.email });
}

export function clearCurrentUser() {
  sessionStorage.removeItem(KEYS.CURRENT_USER);
}

export function getCurrentUser() {
  const session = readSession(KEYS.SESSION, null);
  if (!session?.userId) {
    clearCurrentUser();
    return null;
  }

  const cached = readSession(KEYS.CURRENT_USER, null);
  if (cached?.id && String(cached.id) === String(session.userId) && cached?.email) {
    return { id: cached.id, email: cached.email };
  }

  const users = read(KEYS.USERS, []);
  const u = users.find(x => String(x.id) === String(session.userId));
  if (u) {
    const safe = { id: u.id, email: u.email };
    setCurrentUser(safe);
    return safe;
  }

  clearCurrentUser();
  clearSession();
  return null;
}

export function logout() {
  clearCurrentUser();
  clearSession();

  localStorage.removeItem(KEYS.CURRENT_USER);
  localStorage.removeItem(KEYS.SESSION);
}

export function requireAuth() {
  const u = getCurrentUser();
  if (!u) {
    alert("You need an account to use this feature.");
    window.location.href = "login.html";
    return null;
  }
  return u;
}

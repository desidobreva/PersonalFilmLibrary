import { KEYS, read, write, uid, setSession, clearSession, getCurrentUser } from "./storage.js";

function hashPassword(pw) {
  let h = 0;
  for (let i = 0; i < pw.length; i++) h = (h * 31 + pw.charCodeAt(i)) >>> 0;
  return String(h);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function initRegister() {
  const form = document.getElementById("registerForm");
  if (!form) return;

  const email = document.getElementById("rEmail");
  const pw = document.getElementById("rPassword");
  const pw2 = document.getElementById("rPassword2");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const em = (email?.value || "").trim().toLowerCase();
    const p1 = pw?.value || "";
    const p2 = pw2?.value || "";

    if (!isValidEmail(em)) return alert("Please enter a valid email.");
    if (p1.length < 6) return alert("Password must be at least 6 characters.");
    if (p1 !== p2) return alert("Passwords do not match.");

    const users = read(KEYS.USERS, []);
    if (users.some(u => u.email === em)) {
      return alert("This email is already registered.");
    }

    const user = { id: uid(), email: em, passwordHash: hashPassword(p1) };
    users.push(user);
    write(KEYS.USERS, users);

    setSession(user.id);
    window.location.href = "catalog.html";
  });
}

export function initLogin() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  const email = document.getElementById("lEmail");
  const pw = document.getElementById("lPassword");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const em = (email?.value || "").trim().toLowerCase();
    const p = pw?.value || "";

    const users = read(KEYS.USERS, []);
    const user = users.find(u => u.email === em);
    if (!user) return alert("Invalid credentials.");

    if (user.passwordHash !== hashPassword(p)) return alert("Invalid credentials.");

    setSession(user.id);
    window.location.href = "catalog.html";
  });
}

export function initLogoutButton() {
  const btn = document.getElementById("logoutBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    clearSession();
    window.location.href = "login.html";
  });
}

export function updateAccountLink() {
  const el = document.getElementById("accountLink");
  if (!el) return;

  const u = getCurrentUser();
  el.textContent = u ? "Logout" : "Account";
  el.href = u ? "#" : "login.html";
  el.addEventListener("click", (e) => {
    if (!u) return;
    e.preventDefault();
    clearSession();
    window.location.href = "login.html";
  });
}

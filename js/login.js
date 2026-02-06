import { KEYS, read, setCurrentUser, setSession } from "./storage.js";

const form = document.getElementById("loginForm");

const emailInput = document.getElementById("email");
const passInput  = document.getElementById("password");

const emailErr = document.getElementById("emailError");
const passErr  = document.getElementById("passwordError");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function clearErrors() {
  emailErr.textContent = "";
  passErr.textContent = "";
  emailInput.classList.remove("is-invalid");
  passInput.classList.remove("is-invalid");
}

function setError(el, input, msg) {
  el.textContent = msg;
  input.classList.add("is-invalid");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  clearErrors();

  const email = normalizeEmail(emailInput.value);
  const pass  = String(passInput.value || "");

  let ok = true;

  if (!email) {
    setError(emailErr, emailInput, "Email is required.");
    ok = false;
  } else if (!isValidEmail(email)) {
    setError(emailErr, emailInput, "Please enter a valid email address.");
    ok = false;
  }

  if (!pass) {
    setError(passErr, passInput, "Password is required.");
    ok = false;
  }

  if (!ok) return;

  const users = read(KEYS.USERS, []);
  const user = users.find(u => normalizeEmail(u.email) === email);

  if (!user) {
    setError(emailErr, emailInput, "No account found with this email.");
    return;
  }

  if (String(user.password) !== pass) {
    setError(passErr, passInput, "Wrong password.");
    return;
  }

  setSession(user.id);
  setCurrentUser({ id: user.id, email: user.email });

  window.location.href = "catalog.html";
});

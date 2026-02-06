import { KEYS, read, write, setCurrentUser, setSession } from "./storage.js";

const form = document.getElementById("registerForm");

const emailInput = document.getElementById("regEmail");
const passInput  = document.getElementById("regPass");
const pass2Input = document.getElementById("regPass2");

const emailErr = document.getElementById("regEmailError");
const passErr  = document.getElementById("regPassError");
const pass2Err = document.getElementById("regPass2Error");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function clearErrors() {
  emailErr.textContent = "";
  passErr.textContent = "";
  pass2Err.textContent = "";

  emailInput.classList.remove("is-invalid");
  passInput.classList.remove("is-invalid");
  pass2Input.classList.remove("is-invalid");
}

function setError(el, input, msg) {
  el.textContent = msg;
  input.classList.add("is-invalid");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(p) {
  const pass = String(p || "");

  if (pass.length < 6) return "Password must be at least 6 characters.";
  if (/\s/.test(pass)) return "Password must not contain spaces.";
  if (!/[A-Za-z]/.test(pass)) return "Password must contain at least one letter.";
  if (!/\d/.test(pass)) return "Password must contain at least one number.";

  return ""; 
}

function makeUserId() {
  return "u_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  clearErrors();

  const email = normalizeEmail(emailInput.value);
  const pass  = String(passInput.value || "");
  const pass2 = String(pass2Input.value || "");

  let ok = true;

  if (!email) {
    setError(emailErr, emailInput, "Email is required.");
    ok = false;
  } else if (!isValidEmail(email)) {
    setError(emailErr, emailInput, "Please enter a valid email address.");
    ok = false;
  }

  const passMsg = validatePassword(pass);
  if (passMsg) {
    setError(passErr, passInput, passMsg);
    ok = false;
  }

  if (!pass2) {
    setError(pass2Err, pass2Input, "Please confirm your password.");
    ok = false;
  } else if (pass !== pass2) {
    setError(pass2Err, pass2Input, "Passwords do not match.");
    ok = false;
  }

  if (!ok) return;

  const users = read(KEYS.USERS, []);
  const exists = users.some(u => normalizeEmail(u.email) === email);
  if (exists) {
    setError(emailErr, emailInput, "A user with this email already exists.");
    return;
  }

  const newUser = { id: makeUserId(), email, password: pass };
  users.push(newUser);
  write(KEYS.USERS, users);

  setSession(newUser.id);
  setCurrentUser({ id: newUser.id, email: newUser.email });

  window.location.href = "catalog.html";
});

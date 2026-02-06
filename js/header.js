import { getCurrentUser, logout } from "./storage.js";

function qs(id) {
  return document.getElementById(id);
}

function updateHeader() {
  const user = getCurrentUser();

  const accountLink = qs("accountLink"); 
  const userEmail = qs("userEmail");     
  const logoutBtn = qs("logoutBtn");     

  if (!accountLink || !userEmail || !logoutBtn) return;

  if (user?.email) {
    userEmail.textContent = user.email;
    userEmail.style.display = "inline";
    logoutBtn.style.display = "inline-flex";
    accountLink.style.display = "none";
  } else {
    userEmail.textContent = "";
    userEmail.style.display = "none";
    logoutBtn.style.display = "none";
    accountLink.style.display = "inline-flex";
    accountLink.href = "login.html";
    accountLink.textContent = "Account";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateHeader();

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      logout();

      window.location.replace("catalog.html");
    });
  }
});

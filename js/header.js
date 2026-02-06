import { getCurrentUser, logout } from "./storage.js";

function qs(id) {
  return document.getElementById(id);
}

function updateHeader() {
  const user = getCurrentUser();

  const accountLink = qs("accountLink"); 
  const userEmail = qs("userEmail");     
  const logoutBtn = qs("logoutBtn");
  
  // Hide/show protected navigation links
  const nav = document.querySelector(".nav");
  const favLink = nav?.querySelector('a[href="favorites.html"]');
  const watchedLink = nav?.querySelector('a[href="watched.html"]');

  if (!accountLink || !userEmail || !logoutBtn) return;

  if (user?.email) {
    userEmail.textContent = user.email;
    userEmail.style.display = "inline";
    logoutBtn.style.display = "inline-flex";
    accountLink.style.display = "none";
    
    // Show protected links when logged in
    if (favLink) favLink.style.display = "inline";
    if (watchedLink) watchedLink.style.display = "inline";
  } else {
    userEmail.textContent = "";
    userEmail.style.display = "none";
    logoutBtn.style.display = "none";
    accountLink.style.display = "inline-flex";
    accountLink.href = "login.html";
    accountLink.textContent = "Account";
    
    // Hide protected links when not logged in
    if (favLink) favLink.style.display = "none";
    if (watchedLink) watchedLink.style.display = "none";
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

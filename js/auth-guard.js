import { getCurrentUser } from "./storage.js";
import { notify } from "./notify.js";

const user = getCurrentUser();
if (!user) {
  notify("Please sign in to access this page.", "error");
  window.location.href = "login.html";
}

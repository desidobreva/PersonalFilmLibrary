let toastEl = null;
let hideTimer = null;

export function notify(message, type = "info", ms = 2200) {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "toast";
    document.body.appendChild(toastEl);
  }

  toastEl.className = `toast ${type}`;
  toastEl.textContent = message;

  requestAnimationFrame(() => toastEl.classList.add("show"));

  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, ms);
}

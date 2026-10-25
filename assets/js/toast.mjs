// One toast at a time. The message is announced politely through an always-present live region and the toast never
// takes focus. It stays 12 s (never under 10 s), and the clock stops while the pointer or focus is on it.
import { ToastTimer, TOAST_MS } from "./continue-math.mjs";

export function createToast() {
  const live = document.createElement("p");
  live.className = "sr-only";
  live.setAttribute("role", "status");
  live.setAttribute("aria-live", "polite");
  const box = document.createElement("div");
  box.className = "toast";
  box.hidden = true;
  box.innerHTML = '<span class="toast-text" aria-hidden="true"></span><button type="button" class="button-secondary button-small toast-action"></button><button type="button" class="button-secondary button-small toast-dismiss">Dismiss</button>';
  document.body.append(live, box);
  document.getElementById("main")?.setAttribute("tabindex", "-1");   // somewhere to put focus if the toast closes while it holds it
  const text = box.querySelector(".toast-text");
  const action = box.querySelector(".toast-action");
  const dismiss = box.querySelector(".toast-dismiss");

  let timer = null;
  let tick = 0;
  let onAction = null;
  const hide = () => {
    clearInterval(tick);
    timer = null;
    onAction = null;
    const hadFocus = box.contains(document.activeElement);
    box.hidden = true;
    if (hadFocus) document.getElementById("main")?.focus?.({ preventScroll: true });
  };
  const hold = () => timer?.pause(Date.now());
  const release = () => { if (timer && !box.matches(":hover") && !box.contains(document.activeElement)) timer.resume(Date.now()); };
  box.addEventListener("mouseenter", hold);
  box.addEventListener("mouseleave", release);
  box.addEventListener("focusin", hold);
  box.addEventListener("focusout", () => setTimeout(release, 0));
  box.addEventListener("keydown", (ev) => { if (ev.key === "Escape") { ev.stopPropagation(); hide(); } });
  dismiss.addEventListener("click", hide);
  action.addEventListener("click", () => { const fn = onAction; if (fn) fn(); });

  return {
    element: box,
    // show({ text, actionLabel, onAction }): replaces any toast on screen.
    show({ text: message, actionLabel = null, onAction: fn = null, ms = TOAST_MS }) {
      clearInterval(tick);
      text.textContent = message;
      action.textContent = actionLabel ?? "";
      action.hidden = !actionLabel;
      onAction = fn;
      live.textContent = "";
      box.hidden = false;
      timer = new ToastTimer(ms).start(Date.now());
      if (box.matches(":hover")) timer.pause(Date.now());
      tick = setInterval(() => { if (timer?.expired(Date.now())) hide(); }, 250);
      setTimeout(() => { live.textContent = message; }, 50);   // after the empty write, so the same text is announced again
    },
    hide,
  };
}

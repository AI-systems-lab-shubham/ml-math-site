// One shared four-option status menu for the outline's status buttons (.outline-state-btn).
// Open: click, Enter, Space, ArrowDown or ArrowUp on the button. In the menu: arrows (wrapping), Home, End,
// Enter or Space to choose, Esc to close with focus back on the button. Tab closes it and focus carries on
// from where the menu sits (it is moved to just after its button while open, so the next stop is the row's link).
// It also closes when its row is removed, its module collapses, the outline scrolls or the window resizes.
import { STATUSES, STATUS_LABEL } from "./progress.mjs";
import { stateIcon } from "./state-icons.mjs";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function createStatusMenu({ nav, progress, titleOf }) {
  const menu = document.createElement("div");
  menu.className = "status-menu";
  menu.setAttribute("role", "menu");
  menu.hidden = true;
  menu.innerHTML = STATUSES.map((st) => `<button type="button" role="menuitemradio" aria-checked="false" tabindex="-1" class="status-item state-${st}" data-status="${st}">${stateIcon(st)}<span>${esc(STATUS_LABEL[st])}</span></button>`).join("");
  document.body.append(menu);

  let owner = null;     // the status button the menu belongs to while open
  let tabbing = false;  // Tab was pressed inside the menu: close when focus leaves
  const items = () => [...menu.querySelectorAll('[role="menuitemradio"]')];
  const isOpen = () => !menu.hidden && owner !== null;

  function markChecked() {
    const current = owner ? progress.status(owner.dataset.statusOf) : null;
    for (const it of items()) it.setAttribute("aria-checked", String(it.dataset.status === current));
  }

  function place() {
    const r = owner.getBoundingClientRect();
    const w = menu.offsetWidth;
    const h = menu.offsetHeight;
    const gap = 4;
    let top = r.bottom + gap;
    if (top + h > innerHeight - 8) top = Math.max(8, r.top - h - gap);
    const left = Math.min(Math.max(8, r.left), Math.max(8, innerWidth - w - 8));
    menu.style.top = `${Math.round(top)}px`;
    menu.style.left = `${Math.round(left)}px`;
  }

  function open(btn) {
    if (owner && owner !== btn) owner.setAttribute("aria-expanded", "false");
    owner = btn;
    menu.setAttribute("aria-label", `Set status for ${titleOf(btn.dataset.statusOf)}`);
    btn.after(menu);                       // next in tab order after the button
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    markChecked();
    place();
    (items().find((it) => it.getAttribute("aria-checked") === "true") ?? items()[0]).focus();
  }

  function close({ returnFocus = false } = {}) {
    if (!owner) return;
    const btn = owner;
    owner = null;
    tabbing = false;
    menu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    if (returnFocus && btn.isConnected) btn.focus();
    document.body.append(menu);            // out of the row, so removing the row never takes the menu with it
  }

  nav.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".outline-state-btn");
    if (!btn) return;
    if (owner === btn) close({ returnFocus: true }); else open(btn);
  });
  nav.addEventListener("keydown", (ev) => {
    const btn = ev.target.closest?.(".outline-state-btn");
    if (btn && (ev.key === "ArrowDown" || ev.key === "ArrowUp")) { ev.preventDefault(); open(btn); }
  });

  menu.addEventListener("keydown", (ev) => {
    const list = items();
    const i = list.indexOf(document.activeElement);
    const go = (n) => { ev.preventDefault(); list[(n + list.length) % list.length].focus(); };
    if (ev.key === "ArrowDown") go(i + 1);
    else if (ev.key === "ArrowUp") go(i - 1);
    else if (ev.key === "Home") go(0);
    else if (ev.key === "End") go(list.length - 1);
    else if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); close({ returnFocus: true }); }
    else if (ev.key === "Tab") tabbing = true;           // default Tab behaviour carries focus on; focusout closes the menu
  });
  menu.addEventListener("click", (ev) => {
    const item = ev.target.closest('[role="menuitemradio"]');
    if (!item || !owner) return;
    const id = owner.dataset.statusOf;
    close({ returnFocus: true });
    progress.setStatus(id, item.dataset.status);
  });
  menu.addEventListener("focusout", (ev) => {
    if (!isOpen()) return;
    const to = ev.relatedTarget;
    const stays = to && (menu.contains(to) || to.closest?.(".outline-state-btn"));
    if (tabbing || !stays) close();
  });
  document.addEventListener("pointerdown", (ev) => {
    if (isOpen() && !menu.contains(ev.target) && !ev.target.closest?.(".outline-state-btn")) close();
  });

  // Collapsing the module that holds the menu's row closes it; focus goes to that module's chevron button.
  new MutationObserver(() => {
    const list = owner?.closest("ul.sub");
    if (!isOpen() || !list?.hidden) return;
    const hadFocus = menu.contains(document.activeElement) || document.activeElement === owner || document.activeElement === document.body;
    close();
    if (hadFocus) nav.querySelector(`[aria-controls="${list.id}"]`)?.focus();
  }).observe(nav, { attributes: true, attributeFilter: ["hidden"], subtree: true });
  // The row is removed from the outline.
  new MutationObserver(() => { if (owner && !nav.contains(owner)) close(); }).observe(nav, { childList: true, subtree: true });
  nav.addEventListener("scroll", () => close());
  addEventListener("resize", () => close());
  progress.subscribe(() => { if (isOpen()) markChecked(); });

  return { close, isOpen, element: menu };
}

const KEY = "duckingo.sidebarCollapsed";

export function initSidebar(app: HTMLElement) {
  const btn = document.getElementById("sidebar-toggle");
  const menuBtn = document.getElementById("menu-btn");

  const apply = (collapsed: boolean) => {
    app.classList.toggle("sidebar-collapsed", collapsed);
    if (btn) {
      btn.setAttribute("aria-expanded", String(!collapsed));
      btn.setAttribute("aria-label", collapsed ? "Expand tools" : "Collapse tools");
      btn.textContent = collapsed ? "›" : "‹";
    }
    try {
      localStorage.setItem(KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  let stored = false;
  try {
    stored = localStorage.getItem(KEY) === "1";
  } catch {
    stored = false;
  }
  apply(stored);

  btn?.addEventListener("click", () => apply(!app.classList.contains("sidebar-collapsed")));

  menuBtn?.addEventListener("click", () => {
    const open = app.classList.toggle("nav-open");
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
}

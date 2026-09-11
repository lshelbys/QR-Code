const SIDEBAR_KEY = "duckingo.sidebarCollapsed";
const app = document.getElementById("app");
const menuBtn = document.getElementById("menu-btn");
const sidebarToggle = document.getElementById("sidebar-toggle");
const thread = document.getElementById("chat-thread");
const inner = document.getElementById("chat-inner");
const empty = document.getElementById("empty-state");
const form = document.getElementById("composer");
const input = document.getElementById("composer-input");
const sendBtn = document.getElementById("send-btn");
const newChatBtn = document.getElementById("new-chat-btn");

const PREVIEW_REPLY =
  "This is the Duckingo assistant surface. Live Gemini replies will arrive through a Cloudflare Worker in a later build. For now you can explore the layout, prompts, and tools — the QR code generator is already available in the sidebar.";

function autosize() {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
}

function setSendEnabled() {
  sendBtn.disabled = !input.value.trim();
}

function hideEmpty() {
  if (empty) empty.remove();
}

function scrollThread() {
  thread.scrollTop = thread.scrollHeight;
}

function bubble(role, html, typing = false) {
  const row = document.createElement("article");
  row.className = `msg msg--${role}`;
  row.innerHTML = `
    <span class="msg__avatar" aria-hidden="true">${role === "assistant" ? "D" : "You"}</span>
    <div class="msg__stack">
      <p class="msg__who">${role === "assistant" ? "Duckingo" : "You"}</p>
      <div class="msg__bubble">${html}</div>
    </div>
  `;
  if (typing) row.dataset.typing = "true";
  inner.appendChild(row);
  scrollThread();
  return row;
}

function send(text) {
  const value = text.trim();
  if (!value) return;
  hideEmpty();
  const userRow = bubble("user", "<p></p>");
  userRow.querySelector(".msg__bubble p").textContent = value;
  input.value = "";
  autosize();
  setSendEnabled();

  const pending = bubble(
    "assistant",
    `<p class="typing" aria-label="Duckingo is composing"><span></span><span></span><span></span></p>`,
    true,
  );
  window.setTimeout(() => {
    const body = pending.querySelector(".msg__bubble");
    body.innerHTML = "<p></p>";
    body.querySelector("p").textContent = PREVIEW_REPLY;
    delete pending.dataset.typing;
    scrollThread();
  }, 700);
}

function applySidebar(collapsed) {
  app.classList.toggle("sidebar-collapsed", collapsed);
  if (sidebarToggle) {
    sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
    sidebarToggle.setAttribute("aria-label", collapsed ? "Show tools" : "Hide tools");
    sidebarToggle.textContent = collapsed ? "›" : "‹";
  }
  try {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
  } catch {
    /* ignore */
  }
}

try {
  applySidebar(localStorage.getItem(SIDEBAR_KEY) === "1");
} catch {
  applySidebar(false);
}

sidebarToggle?.addEventListener("click", () => {
  applySidebar(!app.classList.contains("sidebar-collapsed"));
});

menuBtn?.addEventListener("click", () => {
  const open = app.classList.toggle("nav-open");
  menuBtn.setAttribute("aria-expanded", String(open));
  menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  send(input.value);
});

input.addEventListener("input", () => {
  autosize();
  setSendEnabled();
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    send(input.value);
  }
});

document.querySelectorAll("[data-prompt]").forEach((btn) => {
  btn.addEventListener("click", () => send(btn.getAttribute("data-prompt") || ""));
});

newChatBtn?.addEventListener("click", () => {
  window.location.reload();
});

autosize();
setSendEnabled();

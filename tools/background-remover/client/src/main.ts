import "./style.css";
import {
  compositeCutout,
  isSupportedImage,
  normalizeHex,
  preloadCutoutModel,
  removeImageBackground,
} from "./remove";

const PRESETS = [
  { id: "transparent", label: "Transparent", value: "transparent" },
  { id: "white", label: "White", value: "#FFFFFF" },
  { id: "black", label: "Black", value: "#000000" },
  { id: "gray", label: "Light gray", value: "#F4F4F4" },
] as const;

type Elements = {
  app: HTMLElement;
  menuBtn: HTMLButtonElement;
  dropzone: HTMLElement;
  fileInput: HTMLInputElement;
  browseBtn: HTMLButtonElement;
  status: HTMLElement;
  progress: HTMLProgressElement;
  workspace: HTMLElement;
  empty: HTMLElement;
  originalImg: HTMLImageElement;
  resultImg: HTMLImageElement;
  stage: HTMLElement;
  swatches: HTMLElement;
  colorPicker: HTMLInputElement;
  hexInput: HTMLInputElement;
  downloadBtn: HTMLButtonElement;
  resetBtn: HTMLButtonElement;
  error: HTMLElement;
};

const els = {} as Elements;
let cutoutBlob: Blob | null = null;
let cutoutUrl = "";
let originalUrl = "";
let background: string = "transparent";
let busy = false;

function $(id: string) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id}`);
  return node;
}

function bind() {
  els.app = $("app");
  els.menuBtn = $("menu-btn") as HTMLButtonElement;
  els.dropzone = $("dropzone");
  els.fileInput = $("file-input") as HTMLInputElement;
  els.browseBtn = $("browse-btn") as HTMLButtonElement;
  els.status = $("status");
  els.progress = $("progress") as HTMLProgressElement;
  els.workspace = $("workspace-panel");
  els.empty = $("empty-panel");
  els.originalImg = $("original-img") as HTMLImageElement;
  els.resultImg = $("result-img") as HTMLImageElement;
  els.stage = $("stage");
  els.swatches = $("swatches");
  els.colorPicker = $("color-picker") as HTMLInputElement;
  els.hexInput = $("hex-input") as HTMLInputElement;
  els.downloadBtn = $("download-btn") as HTMLButtonElement;
  els.resetBtn = $("reset-btn") as HTMLButtonElement;
  els.error = $("error");
}

function setBusy(next: boolean) {
  busy = next;
  els.dropzone.classList.toggle("is-busy", next);
  els.browseBtn.disabled = next;
  els.fileInput.disabled = next;
  els.downloadBtn.disabled = next || !cutoutBlob;
  els.resetBtn.disabled = next;
  els.colorPicker.disabled = next || !cutoutBlob;
  els.hexInput.disabled = next || !cutoutBlob;
}

function showError(message: string) {
  els.error.hidden = !message;
  els.error.textContent = message;
}

function setStatus(label: string, percent = 0) {
  els.status.textContent = label;
  els.progress.value = percent;
  els.progress.hidden = !label;
}

function revoke(url: string) {
  if (url) URL.revokeObjectURL(url);
}

function reset(keepError = false) {
  revoke(cutoutUrl);
  revoke(originalUrl);
  cutoutBlob = null;
  cutoutUrl = "";
  originalUrl = "";
  background = "transparent";
  els.originalImg.removeAttribute("src");
  els.resultImg.removeAttribute("src");
  els.empty.hidden = false;
  els.workspace.hidden = true;
  els.fileInput.value = "";
  paintStage();
  renderSwatches();
  if (!keepError) showError("");
  setStatus("");
  setBusy(false);
}

function paintStage() {
  if (background === "transparent") {
    els.stage.classList.add("stage--check");
    els.stage.style.background = "";
  } else {
    els.stage.classList.remove("stage--check");
    els.stage.style.background = background;
  }
  if (cutoutUrl) els.resultImg.src = cutoutUrl;
}

function renderSwatches() {
  els.swatches.innerHTML = "";
  for (const preset of PRESETS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "swatch";
    button.dataset.value = preset.value;
    button.setAttribute("aria-pressed", String(background === preset.value));
    if (preset.value === "transparent") button.classList.add("swatch--check");
    else button.style.setProperty("--swatch", preset.value);
    button.innerHTML = `<span class="swatch__chip" aria-hidden="true"></span><span>${preset.label}</span>`;
    button.addEventListener("click", () => setBackground(preset.value));
    els.swatches.appendChild(button);
  }

  const customActive = !PRESETS.some((preset) => preset.value === background);
  els.colorPicker.value = background === "transparent" ? "#FFFFFF" : background;
  els.hexInput.value = background === "transparent" ? "" : background;
  els.hexInput.placeholder = "#RRGGBB";
  els.colorPicker.parentElement?.classList.toggle("is-active", customActive);
}

function setBackground(value: string) {
  background = normalizeHex(value);
  paintStage();
  renderSwatches();
}

async function processFile(file: File) {
  if (busy) return;
  if (!isSupportedImage(file)) {
    showError("Please choose a PNG, JPG, or WebP image.");
    return;
  }

  setBusy(true);
  showError("");
  setStatus("Preparing image…", 5);
  revoke(originalUrl);
  originalUrl = URL.createObjectURL(file);
  els.originalImg.src = originalUrl;
  els.empty.hidden = true;
  els.workspace.hidden = false;

  try {
    const result = await removeImageBackground(file, setStatus);
    revoke(cutoutUrl);
    cutoutBlob = result.blob;
    cutoutUrl = URL.createObjectURL(result.blob);
    setBackground(background);
    setStatus(
      result.fallback
        ? "Used a simpler backup. Pick a fill color, or try a photo with a clearer subject."
        : "Background removed. Pick a fill color if you want one.",
      100,
    );
    els.downloadBtn.disabled = false;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not remove the background.";
    showError(message);
    setStatus("");
  } finally {
    setBusy(false);
    window.setTimeout(() => {
      if (!busy && cutoutBlob) setStatus("");
    }, 1600);
  }
}

async function download() {
  if (!cutoutBlob) return;
  setBusy(true);
  try {
    const blob = await compositeCutout(cutoutBlob, background);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      background === "transparent" ? "duckingo-cutout.png" : "duckingo-background.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not download the image.";
    showError(message);
  } finally {
    setBusy(false);
  }
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  els.dropzone.classList.remove("is-drag");
  const file = event.dataTransfer?.files[0];
  if (file) void processFile(file);
}

function init() {
  bind();
  renderSwatches();
  paintStage();

  els.menuBtn.addEventListener("click", () => {
    const open = els.app.classList.toggle("nav-open");
    els.menuBtn.setAttribute("aria-expanded", String(open));
    els.menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });

  els.browseBtn.addEventListener("click", () => els.fileInput.click());
  els.fileInput.addEventListener("change", () => {
    const file = els.fileInput.files?.[0];
    if (file) void processFile(file);
  });

  els.dropzone.addEventListener("dragenter", (event) => {
    event.preventDefault();
    els.dropzone.classList.add("is-drag");
  });
  els.dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    els.dropzone.classList.add("is-drag");
  });
  els.dropzone.addEventListener("dragleave", () => els.dropzone.classList.remove("is-drag"));
  els.dropzone.addEventListener("drop", onDrop);

  els.colorPicker.addEventListener("input", () => setBackground(els.colorPicker.value));
  els.hexInput.addEventListener("change", () => setBackground(els.hexInput.value || "#FFFFFF"));
  els.downloadBtn.addEventListener("click", () => void download());
  els.resetBtn.addEventListener("click", () => reset());

  window.addEventListener("paste", (event) => {
    const file = [...(event.clipboardData?.files ?? [])].find((item) => item.type.startsWith("image/"));
    if (file) void processFile(file);
  });

  els.dropzone.addEventListener(
    "pointerenter",
    () => {
      void preloadCutoutModel().catch(() => undefined);
    },
    { once: true },
  );
}

init();

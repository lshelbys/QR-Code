import { initSidebar } from "./sidebar";
import { isSupportedImage, normalizeHex, removeImageBackground } from "./remove";
import {
  EXPORT_FORMATS,
  canvasToBlob,
  renderStudio,
  type StudioDoc,
} from "./compose";
import "./style.css";

type ToolId = "crop" | "resize" | "background" | "export";
type CropRect = { x: number; y: number; w: number; h: number };
type Handle = "move" | "nw" | "ne" | "sw" | "se";
type ExportId = (typeof EXPORT_FORMATS)[number]["id"];

const FILLS = [
  { value: "transparent", label: "Transparent", check: true },
  { value: "#FFFFFF", label: "White", check: false },
  { value: "#000000", label: "Black", check: false },
  { value: "#F3F4F6", label: "Light gray", check: false },
] as const;

const app = document.querySelector<HTMLDivElement>("#app")!;
initSidebar(app);

const dropzone = document.querySelector<HTMLElement>("#dropzone")!;
const fileInput = document.querySelector<HTMLInputElement>("#file-input")!;
const browseBtn = document.querySelector<HTMLButtonElement>("#browse-btn")!;
const emptyPanel = document.querySelector<HTMLElement>("#empty-panel")!;
const workspacePanel = document.querySelector<HTMLElement>("#workspace-panel")!;
const stage = document.querySelector<HTMLElement>("#stage")!;
const preview = document.querySelector<HTMLImageElement>("#preview")!;
const cropOverlay = document.querySelector<HTMLElement>("#crop")!;
const cropBox = document.querySelector<HTMLElement>("#crop-box")!;
const errorEl = document.querySelector<HTMLElement>("#error")!;
const progressEl = document.querySelector<HTMLProgressElement>("#progress")!;
const statusEl = document.querySelector<HTMLElement>("#status")!;
const metaEl = document.querySelector<HTMLElement>("#meta")!;
const inspector = document.querySelector<HTMLElement>(".inspector")!;
const panels = document.querySelectorAll<HTMLElement>(".panel");
const cropAspect = document.querySelector<HTMLSelectElement>("#crop-aspect")!;
const lockRatio = document.querySelector<HTMLInputElement>("#lock-ratio")!;
const resizeW = document.querySelector<HTMLInputElement>("#resize-w")!;
const resizeH = document.querySelector<HTMLInputElement>("#resize-h")!;
const swatches = document.querySelector<HTMLElement>("#swatches")!;
const colorPicker = document.querySelector<HTMLInputElement>("#color-picker")!;
const hexInput = document.querySelector<HTMLInputElement>("#hex-input")!;
const exportFormatEl = document.querySelector<HTMLSelectElement>("#export-format")!;
const qualityField = document.querySelector<HTMLElement>("#quality-field")!;
const qualityInput = document.querySelector<HTMLInputElement>("#export-quality")!;
const qualityLabel = document.querySelector<HTMLElement>("#quality-label")!;
const downloadBtn = document.querySelector<HTMLButtonElement>("#download-btn")!;
const resetBtn = document.querySelector<HTMLButtonElement>("#reset-btn")!;
const removeBtn = document.querySelector<HTMLButtonElement>("#remove-bg")!;
const restoreBtn = document.querySelector<HTMLButtonElement>("#restore-bg")!;
const cropApplyBtn = document.querySelector<HTMLButtonElement>("#crop-apply")!;
const cropResetBtn = document.querySelector<HTMLButtonElement>("#crop-reset")!;

let originalFile: File | null = null;
let originalUrl: string | null = null;
let cutoutBlob: Blob | null = null;
let previewUrl: string | null = null;
let naturalWidth = 0;
let naturalHeight = 0;
let crop: CropRect | null = null;
let cropDraft: CropRect | null = null;
let outputWidth = 0;
let outputHeight = 0;
let fill = "transparent";
let exportId: ExportId = "png";
let quality = 0.92;
let activeTool: ToolId = "crop";
let busy = false;
let previewTimer: number | null = null;
let drag: { mode: Handle; startX: number; startY: number; start: CropRect } | null = null;

function setError(message: string | null) {
  errorEl.hidden = !message;
  errorEl.textContent = message ?? "";
}

function setStatus(text: string) {
  statusEl.textContent = text;
}

function setProgress(percent: number | null, label?: string) {
  if (percent == null) {
    progressEl.hidden = true;
    progressEl.value = 0;
    return;
  }
  progressEl.hidden = false;
  progressEl.value = Math.max(0, Math.min(100, percent));
  if (label) setStatus(label);
}

function setBusy(next: boolean) {
  busy = next;
  document.querySelector(".studio-shell")?.classList.toggle("is-busy", next);
  fileInput.disabled = next;
  browseBtn.disabled = next;
  downloadBtn.disabled = next || !originalFile;
  removeBtn.disabled = next || !originalFile;
  restoreBtn.disabled = next || !cutoutBlob;
  cropApplyBtn.disabled = next || !originalFile;
  cropResetBtn.disabled = next || !originalFile;
  resetBtn.disabled = next || !originalFile;
}

function sourceBlob(): Blob | null {
  return cutoutBlob ?? originalFile;
}

function defaultCrop(): CropRect {
  return { x: 0, y: 0, w: naturalWidth, h: naturalHeight };
}

function clampCrop(next: CropRect): CropRect {
  const w = Math.max(8, Math.min(next.w, naturalWidth));
  const h = Math.max(8, Math.min(next.h, naturalHeight));
  return {
    x: Math.max(0, Math.min(next.x, naturalWidth - w)),
    y: Math.max(0, Math.min(next.y, naturalHeight - h)),
    w,
    h,
  };
}

function effectiveCrop(): CropRect {
  return cropDraft ?? crop ?? defaultCrop();
}

function cropRatio(): number | null {
  if (cropAspect.value === "free") return null;
  const value = Number(cropAspect.value);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function fitCropToAspect(box: CropRect, ratio: number): CropRect {
  let width = box.w;
  let height = width / ratio;
  if (height > naturalHeight) {
    height = naturalHeight;
    width = height * ratio;
  }
  if (width > naturalWidth) {
    width = naturalWidth;
    height = width / ratio;
  }
  return clampCrop({ x: box.x, y: box.y, w: width, h: height });
}

function studioDoc(): StudioDoc | null {
  if (!originalFile) return null;
  const applied = crop ?? defaultCrop();
  return {
    original: originalFile,
    cutout: cutoutBlob,
    naturalWidth,
    naturalHeight,
    crop: crop,
    width: outputWidth || applied.w,
    height: outputHeight || applied.h,
    fill,
  };
}

function updateMeta() {
  const applied = crop ?? defaultCrop();
  const outW = outputWidth || applied.w;
  const outH = outputHeight || applied.h;
  metaEl.textContent = originalFile
    ? `${originalFile.name} · source ${naturalWidth}×${naturalHeight} · output ${outW}×${outH}`
    : "";
  if (!busy) {
    if (!originalFile) setStatus("");
    else if (cutoutBlob) setStatus("Background removed. Crop, resize, fill, then export.");
    else setStatus("Crop, resize, remove the background, then export.");
  }
}

function showWorkspace(hasImage: boolean) {
  emptyPanel.hidden = hasImage;
  workspacePanel.hidden = !hasImage;
  inspector.classList.toggle("is-empty", !hasImage);
  downloadBtn.disabled = !hasImage || busy;
  resetBtn.disabled = !hasImage || busy;
  cropOverlay.hidden = !hasImage || activeTool !== "crop";
}

function syncResizeInputs() {
  const applied = crop ?? defaultCrop();
  resizeW.value = String(Math.round(outputWidth || applied.w));
  resizeH.value = String(Math.round(outputHeight || applied.h));
}

function layoutCropOverlay() {
  if (!naturalWidth || cropOverlay.hidden || !preview.naturalWidth) return;
  const rect = preview.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const box = effectiveCrop();
  const scaleX = rect.width / naturalWidth;
  const scaleY = rect.height / naturalHeight;
  cropBox.style.left = `${box.x * scaleX}px`;
  cropBox.style.top = `${box.y * scaleY}px`;
  cropBox.style.width = `${box.w * scaleX}px`;
  cropBox.style.height = `${box.h * scaleY}px`;
  cropBox.dataset.size = `${Math.round(box.w)} × ${Math.round(box.h)}`;
}

async function refreshPreview() {
  const source = sourceBlob();
  if (!source || !originalFile) return;
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
  if (activeTool === "crop") {
    previewUrl = URL.createObjectURL(source);
    preview.src = previewUrl;
    preview.alt = originalFile.name;
    stage.classList.toggle("stage--check", fill === "transparent");
    preview.addEventListener("load", layoutCropOverlay, { once: true });
    return;
  }
  const doc = studioDoc();
  if (!doc) return;
  const canvas = await renderStudio(doc);
  const blob = await canvasToBlob(canvas, "image/png", 1);
  previewUrl = URL.createObjectURL(blob);
  preview.src = previewUrl;
  preview.alt = originalFile.name;
  stage.classList.toggle("stage--check", fill === "transparent");
}

function schedulePreview() {
  if (previewTimer) window.clearTimeout(previewTimer);
  previewTimer = window.setTimeout(() => {
    void refreshPreview();
  }, 60);
}

function setActiveTool(tool: ToolId) {
  activeTool = tool;
  document.querySelectorAll<HTMLButtonElement>(".rail__btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.tool === tool);
  });
  panels.forEach((panel) => {
    panel.hidden = panel.dataset.panel !== tool;
  });
  cropOverlay.hidden = !originalFile || tool !== "crop";
  const format = EXPORT_FORMATS.find((item) => item.id === exportId)!;
  qualityField.hidden = !format.quality;
  if (location.hash.replace("#", "") !== tool) {
    history.replaceState(null, "", `#${tool}`);
  }
  schedulePreview();
  requestAnimationFrame(layoutCropOverlay);
}

function toolFromHash(): ToolId {
  const hash = location.hash.replace("#", "");
  if (hash === "crop" || hash === "resize" || hash === "background" || hash === "export") {
    return hash;
  }
  return "crop";
}

function imagePoint(event: PointerEvent) {
  const rect = preview.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * naturalWidth,
    y: ((event.clientY - rect.top) / rect.height) * naturalHeight,
  };
}

function startDrag(mode: Handle, event: PointerEvent) {
  event.preventDefault();
  event.stopPropagation();
  cropDraft = { ...effectiveCrop() };
  const point = imagePoint(event);
  drag = {
    mode,
    startX: point.x,
    startY: point.y,
    start: { ...cropDraft },
  };
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
}

function onPointerMove(event: PointerEvent) {
  if (!drag || !cropDraft) return;
  const point = imagePoint(event);
  const dx = point.x - drag.startX;
  const dy = point.y - drag.startY;
  const start = drag.start;
  let next = { ...start };

  if (drag.mode === "move") {
    next.x = start.x + dx;
    next.y = start.y + dy;
  } else {
    if (drag.mode.includes("w")) {
      next.x = start.x + dx;
      next.w = start.w - dx;
    }
    if (drag.mode.includes("e")) next.w = start.w + dx;
    if (drag.mode.includes("n")) {
      next.y = start.y + dy;
      next.h = start.h - dy;
    }
    if (drag.mode.includes("s")) next.h = start.h + dy;
    if (next.w < 8) {
      next.x = start.x + start.w - 8;
      next.w = 8;
    }
    if (next.h < 8) {
      next.y = start.y + start.h - 8;
      next.h = 8;
    }
  }

  const ratio = cropRatio();
  if (ratio && drag.mode !== "move") next = fitCropToAspect(next, ratio);
  cropDraft = clampCrop(next);
  layoutCropOverlay();
}

function onPointerUp() {
  drag = null;
}

function setFill(next: string, fromCustom = false) {
  fill = next === "transparent" ? "transparent" : normalizeHex(next);
  document.querySelectorAll<HTMLButtonElement>(".swatch").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.fill === fill));
  });
  document.querySelector(".custom-color")?.classList.toggle("is-active", fromCustom);
  if (fill !== "transparent") {
    colorPicker.value = fill;
    hexInput.value = fill;
  }
  updateMeta();
  schedulePreview();
}

function renderSwatches() {
  swatches.replaceChildren();
  for (const item of FILLS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = item.check ? "swatch swatch--check" : "swatch";
    btn.dataset.fill = item.value;
    btn.setAttribute("aria-pressed", String(item.value === fill));
    btn.innerHTML = `<span class="swatch__chip" ${item.check ? "" : `style="--swatch:${item.value}"`}></span><span>${item.label}</span>`;
    btn.addEventListener("click", () => setFill(item.value));
    swatches.append(btn);
  }
}

async function loadFile(file: File) {
  if (!isSupportedImage(file)) {
    setError("Choose an image file (PNG, JPEG, WebP, or BMP).");
    return;
  }
  setError(null);
  setProgress(null);
  if (originalUrl) URL.revokeObjectURL(originalUrl);
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  originalFile = file;
  originalUrl = URL.createObjectURL(file);
  cutoutBlob = null;
  crop = null;
  cropDraft = null;
  fill = "transparent";
  const bitmap = await createImageBitmap(file);
  naturalWidth = bitmap.width;
  naturalHeight = bitmap.height;
  bitmap.close();
  outputWidth = naturalWidth;
  outputHeight = naturalHeight;
  cropDraft = defaultCrop();
  showWorkspace(true);
  syncResizeInputs();
  setFill("transparent");
  updateMeta();
  restoreBtn.disabled = true;
  await refreshPreview();
  requestAnimationFrame(layoutCropOverlay);
}

function clearImage() {
  if (originalUrl) URL.revokeObjectURL(originalUrl);
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  originalFile = null;
  originalUrl = null;
  cutoutBlob = null;
  previewUrl = null;
  crop = null;
  cropDraft = null;
  naturalWidth = 0;
  naturalHeight = 0;
  outputWidth = 0;
  outputHeight = 0;
  fill = "transparent";
  preview.removeAttribute("src");
  preview.alt = "";
  showWorkspace(false);
  updateMeta();
  setError(null);
  setProgress(null);
  setStatus("");
}

function applyCrop() {
  crop = clampCrop(effectiveCrop());
  cropDraft = { ...crop };
  outputWidth = Math.round(crop.w);
  outputHeight = Math.round(crop.h);
  syncResizeInputs();
  updateMeta();
  schedulePreview();
}

function resetCrop() {
  crop = null;
  cropDraft = defaultCrop();
  outputWidth = naturalWidth;
  outputHeight = naturalHeight;
  syncResizeInputs();
  layoutCropOverlay();
  updateMeta();
  schedulePreview();
}

function applyWidth(nextWidth: number) {
  const applied = crop ?? defaultCrop();
  const ratio = applied.w / applied.h;
  outputWidth = Math.max(1, Math.min(8192, Math.round(nextWidth)));
  if (lockRatio.checked) outputHeight = Math.max(1, Math.min(8192, Math.round(outputWidth / ratio)));
  syncResizeInputs();
  updateMeta();
  schedulePreview();
}

function applyHeight(nextHeight: number) {
  const applied = crop ?? defaultCrop();
  const ratio = applied.w / applied.h;
  outputHeight = Math.max(1, Math.min(8192, Math.round(nextHeight)));
  if (lockRatio.checked) outputWidth = Math.max(1, Math.min(8192, Math.round(outputHeight * ratio)));
  syncResizeInputs();
  updateMeta();
  schedulePreview();
}

async function removeBackground() {
  if (!originalFile || busy) return;
  setBusy(true);
  setError(null);
  setProgress(4, "Starting…");
  try {
    const result = await removeImageBackground(originalFile, (label, percent) => {
      setProgress(percent, label);
    });
    cutoutBlob = result.blob;
    fill = "transparent";
    setFill("transparent");
    restoreBtn.disabled = false;
    setProgress(100, result.fallback ? "Backup cutout ready. Edges may be rough." : "Background removed.");
    updateMeta();
    await refreshPreview();
  } catch (error) {
    setError(error instanceof Error ? error.message : "Could not remove the background.");
  } finally {
    setBusy(false);
    window.setTimeout(() => setProgress(null), 800);
  }
}

function restoreOriginal() {
  cutoutBlob = null;
  restoreBtn.disabled = true;
  setFill("transparent");
  updateMeta();
  schedulePreview();
}

async function downloadCurrent() {
  const doc = studioDoc();
  const format = EXPORT_FORMATS.find((item) => item.id === exportId);
  if (!doc || !originalFile || !format) return;
  setBusy(true);
  try {
    const exportDoc = {
      ...doc,
      fill: format.id !== "png" && doc.fill === "transparent" ? "#FFFFFF" : doc.fill,
    };
    const canvas = await renderStudio(exportDoc);
    const blob = await canvasToBlob(canvas, format.mime, format.quality ? quality : 1);
    const stem = originalFile.name.replace(/\.[^.]+$/, "") || "duckingo-image";
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${stem}-studio.${format.ext}`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    setError(error instanceof Error ? error.message : "Could not export the image.");
  } finally {
    setBusy(false);
  }
}

browseBtn.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("click", (event) => {
  if ((event.target as HTMLElement).closest("button, input")) return;
  fileInput.click();
});
dropzone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileInput.click();
  }
});
fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) void loadFile(file);
  fileInput.value = "";
});

for (const type of ["dragenter", "dragover"] as const) {
  dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.add("is-drag");
  });
}
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-drag"));
dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("is-drag");
  const file = event.dataTransfer?.files[0];
  if (file) void loadFile(file);
});
window.addEventListener("paste", (event) => {
  const file = [...(event.clipboardData?.files ?? [])].find((item) => item.type.startsWith("image/"));
  if (file) void loadFile(file);
});

document.querySelectorAll<HTMLButtonElement>(".rail__btn").forEach((btn) => {
  btn.addEventListener("click", () => setActiveTool(btn.dataset.tool as ToolId));
});
cropApplyBtn.addEventListener("click", applyCrop);
cropResetBtn.addEventListener("click", resetCrop);
cropAspect.addEventListener("change", () => {
  const ratio = cropRatio();
  if (ratio) cropDraft = fitCropToAspect(effectiveCrop(), ratio);
  layoutCropOverlay();
});
cropBox.addEventListener("pointerdown", (event) => startDrag("move", event));
cropOverlay.querySelectorAll<HTMLElement>(".crop__handle").forEach((handle) => {
  handle.addEventListener("pointerdown", (event) => startDrag(handle.dataset.handle as Handle, event));
});
window.addEventListener("pointermove", onPointerMove);
window.addEventListener("pointerup", onPointerUp);
window.addEventListener("resize", layoutCropOverlay);
preview.addEventListener("load", layoutCropOverlay);

resizeW.addEventListener("input", () => applyWidth(Number(resizeW.value)));
resizeH.addEventListener("input", () => applyHeight(Number(resizeH.value)));
document.querySelectorAll<HTMLButtonElement>("[data-scale], [data-width]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const applied = crop ?? defaultCrop();
    if (btn.dataset.scale) applyWidth(applied.w * Number(btn.dataset.scale));
    else if (btn.dataset.width) applyWidth(Number(btn.dataset.width));
  });
});

removeBtn.addEventListener("click", () => void removeBackground());
restoreBtn.addEventListener("click", restoreOriginal);
colorPicker.addEventListener("input", () => setFill(colorPicker.value, true));
hexInput.addEventListener("change", () => setFill(hexInput.value, true));
exportFormatEl.addEventListener("change", () => {
  exportId = exportFormatEl.value as ExportId;
  qualityField.hidden = !EXPORT_FORMATS.find((item) => item.id === exportId)?.quality;
});
qualityInput.addEventListener("input", () => {
  quality = Number(qualityInput.value) / 100;
  qualityLabel.textContent = qualityInput.value;
});
downloadBtn.addEventListener("click", () => void downloadCurrent());
resetBtn.addEventListener("click", clearImage);

window.addEventListener("hashchange", () => setActiveTool(toolFromHash()));
renderSwatches();
setActiveTool(toolFromHash());
showWorkspace(false);
updateMeta();
dropzone.setAttribute("tabindex", "0");
dropzone.setAttribute("role", "button");
dropzone.setAttribute("aria-label", "Upload an image");

import { initSidebar } from "./sidebar";
import { isSupportedImage, normalizeHex, removeImageBackground } from "./remove";
import {
  EXPORT_FORMATS,
  canvasToBlob,
  renderStudio,
  rotatedBox,
  type Rotation,
  type StudioDoc,
} from "./compose";
import "./style.css";

type ToolId = "crop" | "transform" | "cutout" | "adjust" | "export";
type CropRect = { x: number; y: number; w: number; h: number };
type Handle = "move" | "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";
type ExportId = (typeof EXPORT_FORMATS)[number]["id"];
type Snapshot = {
  crop: CropRect | null;
  outputWidth: number;
  outputHeight: number;
  fill: string;
  rotation: Rotation;
  flipH: boolean;
  flipV: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  useCutout: boolean;
};

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
const stageWrap = document.querySelector<HTMLElement>("#stage-wrap")!;
const preview = document.querySelector<HTMLImageElement>("#preview")!;
const cropOverlay = document.querySelector<HTMLElement>("#crop")!;
const cropBox = document.querySelector<HTMLElement>("#crop-box")!;
const errorEl = document.querySelector<HTMLElement>("#error")!;
const progressEl = document.querySelector<HTMLProgressElement>("#progress")!;
const statusEl = document.querySelector<HTMLElement>("#status")!;
const metaEl = document.querySelector<HTMLElement>("#meta")!;
const docName = document.querySelector<HTMLElement>("#doc-name")!;
const panels = document.querySelectorAll<HTMLElement>(".panel");
const cropAspect = document.querySelector<HTMLSelectElement>("#crop-aspect")!;
const cropX = document.querySelector<HTMLInputElement>("#crop-x")!;
const cropY = document.querySelector<HTMLInputElement>("#crop-y")!;
const cropW = document.querySelector<HTMLInputElement>("#crop-w")!;
const cropH = document.querySelector<HTMLInputElement>("#crop-h")!;
const lockRatio = document.querySelector<HTMLInputElement>("#lock-ratio")!;
const resizeW = document.querySelector<HTMLInputElement>("#resize-w")!;
const resizeH = document.querySelector<HTMLInputElement>("#resize-h")!;
const swatches = document.querySelector<HTMLElement>("#swatches")!;
const colorPicker = document.querySelector<HTMLInputElement>("#color-picker")!;
const hexInput = document.querySelector<HTMLInputElement>("#hex-input")!;
const formatGrid = document.querySelector<HTMLElement>("#format-grid")!;
const qualityField = document.querySelector<HTMLElement>("#quality-field")!;
const qualityInput = document.querySelector<HTMLInputElement>("#export-quality")!;
const qualityLabel = document.querySelector<HTMLElement>("#quality-label")!;
const exportEstimate = document.querySelector<HTMLElement>("#export-estimate")!;
const downloadBtn = document.querySelector<HTMLButtonElement>("#download-btn")!;
const downloadTop = document.querySelector<HTMLButtonElement>("#download-top")!;
const resetBtn = document.querySelector<HTMLButtonElement>("#reset-btn")!;
const replaceBtn = document.querySelector<HTMLButtonElement>("#replace-btn")!;
const removeBtn = document.querySelector<HTMLButtonElement>("#remove-bg")!;
const restoreBtn = document.querySelector<HTMLButtonElement>("#restore-bg")!;
const cropApplyBtn = document.querySelector<HTMLButtonElement>("#crop-apply")!;
const cropResetBtn = document.querySelector<HTMLButtonElement>("#crop-reset")!;
const undoBtn = document.querySelector<HTMLButtonElement>("#undo-btn")!;
const redoBtn = document.querySelector<HTMLButtonElement>("#redo-btn")!;
const zoomInBtn = document.querySelector<HTMLButtonElement>("#zoom-in")!;
const zoomOutBtn = document.querySelector<HTMLButtonElement>("#zoom-out")!;
const zoomLabel = document.querySelector<HTMLButtonElement>("#zoom-label")!;
const brightnessInput = document.querySelector<HTMLInputElement>("#brightness")!;
const contrastInput = document.querySelector<HTMLInputElement>("#contrast")!;
const saturationInput = document.querySelector<HTMLInputElement>("#saturation")!;
const brightnessLabel = document.querySelector<HTMLElement>("#brightness-label")!;
const contrastLabel = document.querySelector<HTMLElement>("#contrast-label")!;
const saturationLabel = document.querySelector<HTMLElement>("#saturation-label")!;

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
let rotation: Rotation = 0;
let flipH = false;
let flipV = false;
let brightness = 100;
let contrast = 100;
let saturation = 100;
let useCutout = false;
let exportId: ExportId = "png";
let quality = 0.92;
let activeTool: ToolId = "crop";
let busy = false;
let userZoom = 1;
let previewTimer: number | null = null;
let estimateTimer: number | null = null;
let undos: Snapshot[] = [];
let historyIndex = -1;
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

function snapshot(): Snapshot {
  return {
    crop,
    outputWidth,
    outputHeight,
    fill,
    rotation,
    flipH,
    flipV,
    brightness,
    contrast,
    saturation,
    useCutout,
  };
}

function applySnapshot(next: Snapshot) {
  crop = next.crop ? { ...next.crop } : null;
  cropDraft = crop ? { ...crop } : defaultCrop();
  outputWidth = next.outputWidth;
  outputHeight = next.outputHeight;
  fill = next.fill;
  rotation = next.rotation;
  flipH = next.flipH;
  flipV = next.flipV;
  brightness = next.brightness;
  contrast = next.contrast;
  saturation = next.saturation;
  useCutout = next.useCutout && Boolean(cutoutBlob);
  brightnessInput.value = String(brightness);
  contrastInput.value = String(contrast);
  saturationInput.value = String(saturation);
  brightnessLabel.textContent = String(brightness);
  contrastLabel.textContent = String(contrast);
  saturationLabel.textContent = String(saturation);
  document.querySelectorAll<HTMLButtonElement>(".swatch").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.fill === fill));
  });
  restoreBtn.disabled = busy || !cutoutBlob;
  syncResizeInputs();
  syncCropInputs();
  updateMeta();
  schedulePreview();
}

function pushHistory() {
  const next = snapshot();
  const prev = undos[historyIndex];
  if (prev && JSON.stringify(prev) === JSON.stringify(next)) return;
  undos = undos.slice(0, historyIndex + 1);
  undos.push(structuredClone(next));
  historyIndex = undos.length - 1;
  undoBtn.disabled = historyIndex <= 0;
  redoBtn.disabled = true;
}

function undo() {
  if (historyIndex <= 0) return;
  historyIndex -= 1;
  applySnapshot(structuredClone(undos[historyIndex]));
  undoBtn.disabled = historyIndex <= 0;
  redoBtn.disabled = false;
}

function redo() {
  if (historyIndex >= undos.length - 1) return;
  historyIndex += 1;
  applySnapshot(structuredClone(undos[historyIndex]));
  undoBtn.disabled = false;
  redoBtn.disabled = historyIndex >= undos.length - 1;
}

function setBusy(next: boolean) {
  busy = next;
  document.querySelector(".studio-shell")?.classList.toggle("is-busy", next);
  fileInput.disabled = next;
  browseBtn.disabled = next;
  downloadBtn.disabled = next || !originalFile;
  downloadTop.disabled = next || !originalFile;
  replaceBtn.disabled = next || !originalFile;
  removeBtn.disabled = next || !originalFile;
  restoreBtn.disabled = next || !cutoutBlob;
  cropApplyBtn.disabled = next || !originalFile;
  cropResetBtn.disabled = next || !originalFile;
  resetBtn.disabled = next || !originalFile;
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
  const oriented = rotatedBox(applied.w, applied.h, rotation);
  return {
    original: originalFile,
    cutout: cutoutBlob,
    useCutout,
    crop,
    width: outputWidth || oriented.width,
    height: outputHeight || oriented.height,
    fill,
    rotation,
    flipH,
    flipV,
    brightness,
    contrast,
    saturation,
  };
}

function displaySize() {
  if (activeTool === "crop") return { w: naturalWidth, h: naturalHeight };
  return { w: outputWidth || naturalWidth, h: outputHeight || naturalHeight };
}

function fitScale() {
  const wrap = stageWrap.getBoundingClientRect();
  const { w, h } = displaySize();
  if (!w || !h || !wrap.width) return 1;
  return Math.min((wrap.width - 48) / w, (wrap.height - 48) / h);
}

function applyZoom() {
  if (!originalFile) return;
  const { w, h } = displaySize();
  const scale = fitScale() * userZoom;
  preview.style.width = `${Math.max(8, w * scale)}px`;
  preview.style.height = `${Math.max(8, h * scale)}px`;
  zoomLabel.textContent = userZoom === 1 ? "Fit" : `${Math.round(userZoom * 100)}%`;
  layoutCropOverlay();
}

function updateMeta() {
  const applied = crop ?? defaultCrop();
  const outW = outputWidth || applied.w;
  const outH = outputHeight || applied.h;
  docName.textContent = originalFile
    ? `${originalFile.name} · ${outW}×${outH}`
    : "Drop a photo, then edit on this canvas";
  metaEl.textContent = originalFile
    ? `Source ${naturalWidth}×${naturalHeight}${useCutout ? " · cutout" : ""}${rotation ? ` · ${rotation}°` : ""}`
    : "";
  if (!busy) {
    if (!originalFile) setStatus("");
    else if (useCutout) setStatus("Background removed. Transform, fill, or export.");
    else setStatus("Crop, transform, cut out, adjust, then export.");
  }
  scheduleEstimate();
}

function showWorkspace(hasImage: boolean) {
  emptyPanel.hidden = hasImage;
  workspacePanel.hidden = !hasImage;
  downloadBtn.disabled = !hasImage || busy;
  downloadTop.disabled = !hasImage || busy;
  replaceBtn.disabled = !hasImage || busy;
  resetBtn.disabled = !hasImage || busy;
  cropOverlay.hidden = !hasImage || activeTool !== "crop";
}

function syncResizeInputs() {
  resizeW.value = String(Math.round(outputWidth));
  resizeH.value = String(Math.round(outputHeight));
}

function syncCropInputs() {
  const box = effectiveCrop();
  cropX.value = String(Math.round(box.x));
  cropY.value = String(Math.round(box.y));
  cropW.value = String(Math.round(box.w));
  cropH.value = String(Math.round(box.h));
}

function layoutCropOverlay() {
  if (!naturalWidth || cropOverlay.hidden || !preview.clientWidth) return;
  const box = effectiveCrop();
  const scaleX = preview.clientWidth / naturalWidth;
  const scaleY = preview.clientHeight / naturalHeight;
  cropBox.style.left = `${box.x * scaleX}px`;
  cropBox.style.top = `${box.y * scaleY}px`;
  cropBox.style.width = `${box.w * scaleX}px`;
  cropBox.style.height = `${box.h * scaleY}px`;
  cropBox.dataset.size = `${Math.round(box.w)} × ${Math.round(box.h)}`;
}

async function refreshPreview() {
  const source = useCutout && cutoutBlob ? cutoutBlob : originalFile;
  if (!source || !originalFile) return;
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
  if (activeTool === "crop") {
    previewUrl = URL.createObjectURL(source);
    preview.src = previewUrl;
    preview.alt = originalFile.name;
    preview.addEventListener("load", applyZoom, { once: true });
    return;
  }
  const doc = studioDoc();
  if (!doc) return;
  const canvas = await renderStudio(doc);
  const blob = await canvasToBlob(canvas, "image/png", 1);
  previewUrl = URL.createObjectURL(blob);
  preview.src = previewUrl;
  preview.alt = originalFile.name;
  preview.addEventListener("load", applyZoom, { once: true });
}

function schedulePreview() {
  if (previewTimer) window.clearTimeout(previewTimer);
  previewTimer = window.setTimeout(() => {
    void refreshPreview();
  }, 50);
}

function scheduleEstimate() {
  if (estimateTimer) window.clearTimeout(estimateTimer);
  if (activeTool !== "export" || !originalFile) {
    exportEstimate.textContent = "";
    return;
  }
  estimateTimer = window.setTimeout(() => {
    void (async () => {
      const doc = studioDoc();
      const format = EXPORT_FORMATS.find((item) => item.id === exportId);
      if (!doc || !format) return;
      const exportDoc = {
        ...doc,
        fill: format.id !== "png" && doc.fill === "transparent" ? "#FFFFFF" : doc.fill,
      };
      const canvas = await renderStudio(exportDoc);
      const blob = await canvasToBlob(canvas, format.mime, format.quality ? quality : 1);
      const kb = Math.max(1, Math.round(blob.size / 1024));
      exportEstimate.textContent = `About ${kb} KB · ${doc.width}×${doc.height} ${format.label}`;
    })();
  }, 200);
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
  const hash = tool === "cutout" ? "background" : tool;
  if (location.hash.replace("#", "") !== hash) window.history.replaceState(null, "", `#${hash}`);
  schedulePreview();
}

function toolFromHash(): ToolId {
  const hash = location.hash.replace("#", "");
  if (hash === "resize") return "transform";
  if (hash === "background") return "cutout";
  if (hash === "crop" || hash === "transform" || hash === "cutout" || hash === "adjust" || hash === "export") {
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
  drag = { mode, startX: point.x, startY: point.y, start: { ...cropDraft } };
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
  syncCropInputs();
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
    btn.addEventListener("click", () => {
      setFill(item.value);
      pushHistory();
    });
    swatches.append(btn);
  }
}

function renderFormats() {
  formatGrid.replaceChildren();
  for (const item of EXPORT_FORMATS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = item.id === exportId ? "format-card is-active" : "format-card";
    btn.innerHTML = `<span>${item.label}</span><small>${item.hint}</small>`;
    btn.addEventListener("click", () => {
      exportId = item.id;
      document.querySelectorAll(".format-card").forEach((other) => {
        other.classList.toggle("is-active", other === btn);
      });
      qualityField.hidden = !item.quality;
      scheduleEstimate();
    });
    formatGrid.append(btn);
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
  rotation = 0;
  flipH = false;
  flipV = false;
  brightness = 100;
  contrast = 100;
  saturation = 100;
  useCutout = false;
  userZoom = 1;
  const bitmap = await createImageBitmap(file);
  naturalWidth = bitmap.width;
  naturalHeight = bitmap.height;
  bitmap.close();
  outputWidth = naturalWidth;
  outputHeight = naturalHeight;
  cropDraft = defaultCrop();
  brightnessInput.value = "100";
  contrastInput.value = "100";
  saturationInput.value = "100";
  brightnessLabel.textContent = "100";
  contrastLabel.textContent = "100";
  saturationLabel.textContent = "100";
  showWorkspace(true);
  syncResizeInputs();
  syncCropInputs();
  setFill("transparent");
  undos = [];
  historyIndex = -1;
  pushHistory();
  updateMeta();
  restoreBtn.disabled = true;
  await refreshPreview();
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
  rotation = 0;
  flipH = false;
  flipV = false;
  useCutout = false;
  preview.removeAttribute("src");
  preview.alt = "";
  undos = [];
  historyIndex = -1;
  undoBtn.disabled = true;
  redoBtn.disabled = true;
  showWorkspace(false);
  updateMeta();
  setError(null);
  setProgress(null);
  setStatus("");
}

function applyCrop() {
  crop = clampCrop(effectiveCrop());
  cropDraft = { ...crop };
  const oriented = rotatedBox(crop.w, crop.h, rotation);
  outputWidth = Math.round(oriented.width);
  outputHeight = Math.round(oriented.height);
  syncResizeInputs();
  syncCropInputs();
  updateMeta();
  pushHistory();
  schedulePreview();
}

function resetCrop() {
  crop = null;
  cropDraft = defaultCrop();
  const oriented = rotatedBox(naturalWidth, naturalHeight, rotation);
  outputWidth = oriented.width;
  outputHeight = oriented.height;
  syncResizeInputs();
  syncCropInputs();
  layoutCropOverlay();
  updateMeta();
  pushHistory();
  schedulePreview();
}

function applyWidth(nextWidth: number) {
  const applied = crop ?? defaultCrop();
  const oriented = rotatedBox(applied.w, applied.h, rotation);
  const ratio = oriented.width / oriented.height;
  outputWidth = Math.max(1, Math.min(8192, Math.round(nextWidth)));
  if (lockRatio.checked) outputHeight = Math.max(1, Math.min(8192, Math.round(outputWidth / ratio)));
  syncResizeInputs();
  updateMeta();
  schedulePreview();
}

function applyHeight(nextHeight: number) {
  const applied = crop ?? defaultCrop();
  const oriented = rotatedBox(applied.w, applied.h, rotation);
  const ratio = oriented.width / oriented.height;
  outputHeight = Math.max(1, Math.min(8192, Math.round(nextHeight)));
  if (lockRatio.checked) outputWidth = Math.max(1, Math.min(8192, Math.round(outputHeight * ratio)));
  syncResizeInputs();
  updateMeta();
  schedulePreview();
}

function rotateBy(delta: 90 | -90) {
  rotation = (((rotation + delta + 360) % 360) as Rotation);
  const swapped = rotatedBox(outputWidth, outputHeight, 90);
  outputWidth = swapped.width;
  outputHeight = swapped.height;
  syncResizeInputs();
  updateMeta();
  pushHistory();
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
    useCutout = true;
    fill = "transparent";
    setFill("transparent");
    restoreBtn.disabled = false;
    setProgress(100, result.fallback ? "Backup cutout ready. Edges may be rough." : "Background removed.");
    pushHistory();
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
  useCutout = false;
  restoreBtn.disabled = !cutoutBlob;
  setFill("transparent");
  updateMeta();
  pushHistory();
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
replaceBtn.addEventListener("click", () => fileInput.click());
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

const bindDrop = (el: HTMLElement) => {
  for (const type of ["dragenter", "dragover"] as const) {
    el.addEventListener(type, (event) => {
      event.preventDefault();
      dropzone.classList.add("is-drag");
    });
  }
  el.addEventListener("dragleave", () => dropzone.classList.remove("is-drag"));
  el.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("is-drag");
    const file = event.dataTransfer?.files[0];
    if (file) void loadFile(file);
  });
};
bindDrop(dropzone);
bindDrop(stageWrap);
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
  syncCropInputs();
  layoutCropOverlay();
});
for (const input of [cropX, cropY, cropW, cropH]) {
  input.addEventListener("change", () => {
    cropDraft = clampCrop({
      x: Number(cropX.value),
      y: Number(cropY.value),
      w: Number(cropW.value),
      h: Number(cropH.value),
    });
    layoutCropOverlay();
  });
}
cropBox.addEventListener("pointerdown", (event) => startDrag("move", event));
cropOverlay.querySelectorAll<HTMLElement>(".crop__handle").forEach((handle) => {
  handle.addEventListener("pointerdown", (event) => startDrag(handle.dataset.handle as Handle, event));
});
window.addEventListener("pointermove", onPointerMove);
window.addEventListener("pointerup", onPointerUp);
window.addEventListener("resize", applyZoom);
preview.addEventListener("load", applyZoom);
new ResizeObserver(applyZoom).observe(stageWrap);

resizeW.addEventListener("change", () => {
  applyWidth(Number(resizeW.value));
  pushHistory();
});
resizeH.addEventListener("change", () => {
  applyHeight(Number(resizeH.value));
  pushHistory();
});
document.querySelectorAll<HTMLButtonElement>("[data-scale], [data-width]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const applied = crop ?? defaultCrop();
    const oriented = rotatedBox(applied.w, applied.h, rotation);
    if (btn.dataset.scale) applyWidth(oriented.width * Number(btn.dataset.scale));
    else if (btn.dataset.width) applyWidth(Number(btn.dataset.width));
    pushHistory();
  });
});
document.querySelector("#rotate-ccw")!.addEventListener("click", () => rotateBy(-90));
document.querySelector("#rotate-cw")!.addEventListener("click", () => rotateBy(90));
document.querySelector("#flip-h")!.addEventListener("click", () => {
  flipH = !flipH;
  pushHistory();
  schedulePreview();
});
document.querySelector("#flip-v")!.addEventListener("click", () => {
  flipV = !flipV;
  pushHistory();
  schedulePreview();
});

removeBtn.addEventListener("click", () => void removeBackground());
restoreBtn.addEventListener("click", restoreOriginal);
colorPicker.addEventListener("change", () => {
  setFill(colorPicker.value, true);
  pushHistory();
});
hexInput.addEventListener("change", () => {
  setFill(hexInput.value, true);
  pushHistory();
});

const bindAdjust = (input: HTMLInputElement, label: HTMLElement, assign: (value: number) => void) => {
  input.addEventListener("input", () => {
    assign(Number(input.value));
    label.textContent = input.value;
    schedulePreview();
  });
  input.addEventListener("change", pushHistory);
};
bindAdjust(brightnessInput, brightnessLabel, (value) => {
  brightness = value;
});
bindAdjust(contrastInput, contrastLabel, (value) => {
  contrast = value;
});
bindAdjust(saturationInput, saturationLabel, (value) => {
  saturation = value;
});
document.querySelector("#reset-adjust")!.addEventListener("click", () => {
  brightness = 100;
  contrast = 100;
  saturation = 100;
  brightnessInput.value = "100";
  contrastInput.value = "100";
  saturationInput.value = "100";
  brightnessLabel.textContent = "100";
  contrastLabel.textContent = "100";
  saturationLabel.textContent = "100";
  pushHistory();
  schedulePreview();
});

qualityInput.addEventListener("input", () => {
  quality = Number(qualityInput.value) / 100;
  qualityLabel.textContent = qualityInput.value;
  scheduleEstimate();
});
downloadBtn.addEventListener("click", () => void downloadCurrent());
downloadTop.addEventListener("click", () => void downloadCurrent());
resetBtn.addEventListener("click", clearImage);
undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);
zoomInBtn.addEventListener("click", () => {
  userZoom = Math.min(6, Math.round(userZoom * 1.25 * 100) / 100);
  applyZoom();
});
zoomOutBtn.addEventListener("click", () => {
  userZoom = Math.max(0.2, Math.round((userZoom / 1.25) * 100) / 100);
  applyZoom();
});
zoomLabel.addEventListener("click", () => {
  userZoom = 1;
  applyZoom();
});
stageWrap.addEventListener(
  "wheel",
  (event) => {
    if (!originalFile) return;
    event.preventDefault();
    userZoom = Math.min(6, Math.max(0.2, userZoom + (event.deltaY > 0 ? -0.12 : 0.12)));
    applyZoom();
  },
  { passive: false },
);

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if ((event.metaKey || event.ctrlKey) && key === "z") {
    event.preventDefault();
    if (event.shiftKey) redo();
    else undo();
  }
  if (event.key === "Enter" && activeTool === "crop" && originalFile) applyCrop();
});

window.addEventListener("hashchange", () => setActiveTool(toolFromHash()));
renderSwatches();
renderFormats();
setActiveTool(toolFromHash());
showWorkspace(false);
updateMeta();
dropzone.setAttribute("tabindex", "0");
dropzone.setAttribute("role", "button");
dropzone.setAttribute("aria-label", "Upload an image");

const MAX_EDGE = 2560;
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/bmp"]);

export function isSupportedImage(file: File): boolean {
  if (ACCEPTED_TYPES.has(file.type)) return true;
  return /\.(png|jpe?g|webp|bmp)$/i.test(file.name);
}

export async function constrainImage(source: Blob, maxEdge = MAX_EDGE): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  if (scale === 1) {
    bitmap.close();
    return source;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not prepare the image.");
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvasToBlob(canvas, "image/png");
}

export type ProgressFn = (label: string, percent: number) => void;

export type RemovalResult = { blob: Blob; fallback: boolean };

let modelWarmup: Promise<void> | null = null;

export async function removeImageBackground(
  source: Blob,
  onProgress: ProgressFn,
): Promise<RemovalResult> {
  const prepared = await constrainImage(source);
  await preloadCutoutModel(onProgress).catch(() => undefined);
  try {
    const blob = await removeWithAi(prepared, onProgress);
    onProgress("Cleaning the cutout…", 92);
    return { blob: await refineCutout(blob), fallback: false };
  } catch (error) {
    console.warn("AI background removal failed, using edge fill.", error);
    onProgress("Using a simpler backup method…", 70);
    const blob = await removeByEdgeFill(prepared);
    return { blob: await refineCutout(blob), fallback: true };
  }
}

function aiConfig(onProgress?: ProgressFn) {
  return {
    device: "cpu" as const,
    proxyToWorker: false,
    model: "isnet_fp16" as const,
    output: {
      format: "image/png" as const,
      quality: 1,
    },
    progress: (key: string, current: number, total: number) => {
      if (!onProgress) return;
      const percent = total > 0 ? Math.min(99, Math.round((current / total) * 100)) : 0;
      const loading = /fetch|download|load/i.test(key);
      onProgress(loading ? "Loading the cutout model…" : "Removing the background…", percent);
    },
  };
}

export async function preloadCutoutModel(onProgress?: ProgressFn): Promise<void> {
  if (modelWarmup) return modelWarmup;
  modelWarmup = (async () => {
    const { preload } = await import("@imgly/background-removal");
    await preload(aiConfig(onProgress));
  })();
  try {
    await modelWarmup;
  } catch (error) {
    modelWarmup = null;
    throw error;
  }
}

async function removeWithAi(source: Blob, onProgress: ProgressFn): Promise<Blob> {
  const hardwareThreads = Object.getOwnPropertyDescriptor(navigator, "hardwareConcurrency");
  try {
    Object.defineProperty(navigator, "hardwareConcurrency", {
      configurable: true,
      get: () => 1,
    });
  } catch {
    /* GitHub Pages has no COOP/COEP, so keep inference on one thread. */
  }

  try {
    const { removeBackground } = await import("@imgly/background-removal");
    const blob = await removeBackground(source, aiConfig(onProgress));
    if (!(blob instanceof Blob)) {
      throw new Error("Background removal did not return an image.");
    }
    return blob;
  } finally {
    if (hardwareThreads) {
      try {
        Object.defineProperty(navigator, "hardwareConcurrency", hardwareThreads);
      } catch {
        /* ignore */
      }
    }
  }
}

export async function refineCutout(source: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    bitmap.close();
    return source;
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = image;
  for (let i = 3; i < data.length; i += 4) {
    const alpha = data[i];
    if (alpha < 40) data[i] = 0;
    else if (alpha > 180) data[i] = 255;
    else data[i] = Math.round(((alpha - 40) / 140) * 255);
  }
  ctx.putImageData(image, 0, 0);
  return canvasToBlob(canvas, "image/png");
}

export async function removeByEdgeFill(source: Blob, tolerance = 36): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not read the image.");
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = image;
  const background = sampleBackground(data, width, height);
  const maxDist = tolerance * tolerance * 3;
  const visited = new Uint8Array(width * height);
  const stack: number[] = [];

  const enqueue = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = y * width + x;
    if (visited[index]) return;
    const i = index * 4;
    const dist =
      (data[i] - background.r) ** 2 +
      (data[i + 1] - background.g) ** 2 +
      (data[i + 2] - background.b) ** 2;
    if (dist > maxDist) return;
    visited[index] = 1;
    stack.push(index);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (stack.length) {
    const index = stack.pop() as number;
    const x = index % width;
    const y = Math.floor(index / width);
    data[index * 4 + 3] = 0;
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  featherAlpha(data, width, height);
  ctx.putImageData(image, 0, 0);
  return canvasToBlob(canvas, "image/png");
}

function sampleBackground(data: Uint8ClampedArray, width: number, height: number) {
  const size = Math.max(1, Math.min(8, width, height));
  const patches = [
    samplePatch(data, width, 0, 0, size),
    samplePatch(data, width, width - size, 0, size),
    samplePatch(data, width, 0, height - size, size),
    samplePatch(data, width, width - size, height - size, size),
  ];
  return {
    r: Math.round(patches.reduce((sum, patch) => sum + patch.r, 0) / patches.length),
    g: Math.round(patches.reduce((sum, patch) => sum + patch.g, 0) / patches.length),
    b: Math.round(patches.reduce((sum, patch) => sum + patch.b, 0) / patches.length),
  };
}

function samplePatch(
  data: Uint8ClampedArray,
  width: number,
  startX: number,
  startY: number,
  size: number,
) {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let y = startY; y < startY + size; y += 1) {
    for (let x = startX; x < startX + size; x += 1) {
      const i = (y * width + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count += 1;
    }
  }
  return { r: r / count, g: g / count, b: b / count };
}

function featherAlpha(data: Uint8ClampedArray, width: number, height: number) {
  const copy = new Uint8ClampedArray(data);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const alphaIndex = index * 4 + 3;
      if (copy[alphaIndex] === 0) continue;
      let transparentNeighbors = 0;
      if (copy[((y - 1) * width + x) * 4 + 3] === 0) transparentNeighbors += 1;
      if (copy[((y + 1) * width + x) * 4 + 3] === 0) transparentNeighbors += 1;
      if (copy[(y * width + x - 1) * 4 + 3] === 0) transparentNeighbors += 1;
      if (copy[(y * width + x + 1) * 4 + 3] === 0) transparentNeighbors += 1;
      if (transparentNeighbors > 0) {
        data[alphaIndex] = Math.max(0, 255 - transparentNeighbors * 70);
      }
    }
  }
}

export async function compositeCutout(cutout: Blob, background: string): Promise<Blob> {
  const bitmap = await createImageBitmap(cutout);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not create the export canvas.");
  }
  if (background !== "transparent") {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvasToBlob(canvas, "image/png");
}

export function normalizeHex(value: string): string | "transparent" {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "transparent") return "transparent";
  const hex = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (/^#[0-9a-f]{3}$/.test(hex)) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toUpperCase();
  }
  if (/^#[0-9a-f]{6}$/.test(hex)) return hex.toUpperCase();
  return "#FFFFFF";
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not encode the image."));
    }, type);
  });
}

export type CropRect = { x: number; y: number; w: number; h: number };

export type StudioDoc = {
  original: Blob;
  cutout: Blob | null;
  naturalWidth: number;
  naturalHeight: number;
  crop: CropRect | null;
  width: number;
  height: number;
  fill: string;
};

export function sourceOf(doc: StudioDoc): Blob {
  return doc.cutout ?? doc.original;
}

export async function measureBlob(blob: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(blob);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

export async function renderStudio(doc: StudioDoc): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(sourceOf(doc));
  const sx = Math.max(0, Math.round(doc.crop?.x ?? 0));
  const sy = Math.max(0, Math.round(doc.crop?.y ?? 0));
  const sw = Math.max(1, Math.round(doc.crop?.w ?? bitmap.width));
  const sh = Math.max(1, Math.round(doc.crop?.h ?? bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(doc.width));
  canvas.height = Math.max(1, Math.round(doc.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not draw the preview.");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (doc.fill !== "transparent") {
    ctx.fillStyle = doc.fill;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

export async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality = 0.92): Promise<Blob> {
  const mime = type === "image/jpg" ? "image/jpeg" : type;
  return new Promise((resolve, reject) => {
    const done = (blob: Blob | null) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not encode the image."));
    };
    if (mime === "image/png") canvas.toBlob(done, mime);
    else canvas.toBlob(done, mime, quality);
  });
}

export const EXPORT_FORMATS = [
  { id: "png", label: "PNG", mime: "image/png", ext: "png", quality: false },
  { id: "jpeg", label: "JPEG", mime: "image/jpeg", ext: "jpg", quality: true },
  { id: "webp", label: "WebP", mime: "image/webp", ext: "webp", quality: true },
] as const;

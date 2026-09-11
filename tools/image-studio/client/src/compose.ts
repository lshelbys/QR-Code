export type CropRect = { x: number; y: number; w: number; h: number };
export type Rotation = 0 | 90 | 180 | 270;

export type StudioDoc = {
  original: Blob;
  cutout: Blob | null;
  useCutout: boolean;
  crop: CropRect | null;
  width: number;
  height: number;
  fill: string;
  rotation: Rotation;
  flipH: boolean;
  flipV: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
};

export function sourceOf(doc: StudioDoc): Blob {
  return doc.useCutout && doc.cutout ? doc.cutout : doc.original;
}

export function rotatedBox(width: number, height: number, rotation: Rotation | 90) {
  return rotation % 180 === 0
    ? { width, height }
    : { width: height, height: width };
}

export async function renderStudio(doc: StudioDoc): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(sourceOf(doc));
  const sx = Math.max(0, Math.round(doc.crop?.x ?? 0));
  const sy = Math.max(0, Math.round(doc.crop?.y ?? 0));
  const sw = Math.max(1, Math.round(doc.crop?.w ?? bitmap.width));
  const sh = Math.max(1, Math.round(doc.crop?.h ?? bitmap.height));

  const cropped = document.createElement("canvas");
  cropped.width = sw;
  cropped.height = sh;
  const cropCtx = cropped.getContext("2d");
  if (!cropCtx) {
    bitmap.close();
    throw new Error("Could not crop the image.");
  }
  cropCtx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
  bitmap.close();

  const oriented = rotatedBox(sw, sh, doc.rotation);
  const transformed = document.createElement("canvas");
  transformed.width = oriented.width;
  transformed.height = oriented.height;
  const transformCtx = transformed.getContext("2d");
  if (!transformCtx) throw new Error("Could not transform the image.");
  transformCtx.translate(oriented.width / 2, oriented.height / 2);
  transformCtx.rotate((doc.rotation * Math.PI) / 180);
  transformCtx.scale(doc.flipH ? -1 : 1, doc.flipV ? -1 : 1);
  transformCtx.drawImage(cropped, -sw / 2, -sh / 2);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(doc.width));
  canvas.height = Math.max(1, Math.round(doc.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not draw the preview.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (doc.fill !== "transparent") {
    ctx.fillStyle = doc.fill;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  const filter = [
    doc.brightness !== 100 ? `brightness(${doc.brightness}%)` : "",
    doc.contrast !== 100 ? `contrast(${doc.contrast}%)` : "",
    doc.saturation !== 100 ? `saturate(${doc.saturation}%)` : "",
  ]
    .filter(Boolean)
    .join(" ");
  if (filter) ctx.filter = filter;
  ctx.drawImage(transformed, 0, 0, canvas.width, canvas.height);
  ctx.filter = "none";
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
  { id: "png", label: "PNG", mime: "image/png", ext: "png", quality: false, hint: "Keeps transparency" },
  { id: "jpeg", label: "JPEG", mime: "image/jpeg", ext: "jpg", quality: true, hint: "Smaller photos" },
  { id: "webp", label: "WebP", mime: "image/webp", ext: "webp", quality: true, hint: "Small and sharp" },
] as const;

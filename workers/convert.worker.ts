import ImageTracer from "imagetracerjs";
import type { Settings, WorkerIn, WorkerOut } from "@/lib/types";

const post = (m: WorkerOut) => (self as unknown as Worker).postMessage(m);

const TRACE_MAX_SIDE = 1024;
const TRACE_PRESETS = {
  low: { numberofcolors: 8, ltres: 2, qtres: 2, pathomit: 16 },
  medium: { numberofcolors: 16, ltres: 1, qtres: 1, pathomit: 8 },
  high: { numberofcolors: 32, ltres: 0.5, qtres: 0.5, pathomit: 4 },
} as const;

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function encodeWebP(canvas: OffscreenCanvas, quality: number): Promise<Blob> {
  const blob = await canvas.convertToBlob({ type: "image/webp", quality: quality / 100 });
  if (blob.type === "image/webp") return blob;
  // Browser can't encode WebP natively (e.g. Safari): use the WASM encoder.
  const { default: encode } = await import("@jsquash/webp/encode");
  const data = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
  const buf = await encode(data, { quality });
  return new Blob([buf], { type: "image/webp" });
}

function drawScaled(bitmap: ImageBitmap, w: number, h: number): OffscreenCanvas {
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas;
}

async function convert(file: File, s: Settings, id: string) {
  post({ type: "stage", id, stage: "decoding" });
  const bitmap = await createImageBitmap(file);
  let w = bitmap.width;
  let h = bitmap.height;
  if (s.maxWidth > 0 && w > s.maxWidth) {
    h = Math.max(1, Math.round((h * s.maxWidth) / w));
    w = s.maxWidth;
  }

  post({ type: "stage", id, stage: "encoding" });

  if (s.format === "svg-traced") {
    const scale = Math.min(1, TRACE_MAX_SIDE / Math.max(w, h));
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));
    const canvas = drawScaled(bitmap, tw, th);
    bitmap.close();
    const data = canvas.getContext("2d")!.getImageData(0, 0, tw, th);
    const svg = ImageTracer.imagedataToSVG(data, {
      ...TRACE_PRESETS[s.traceDetail],
      viewbox: true,
      roundcoords: 1,
      strokewidth: 0,
    });
    return { blob: new Blob([svg], { type: "image/svg+xml" }), width: tw, height: th };
  }

  const canvas = drawScaled(bitmap, w, h);
  bitmap.close();
  const webp = await encodeWebP(canvas, s.quality);

  if (s.format === "svg-embedded") {
    const b64 = toBase64(await webp.arrayBuffer());
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
      `width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<image width="${w}" height="${h}" href="data:image/webp;base64,${b64}"/></svg>`;
    return { blob: new Blob([svg], { type: "image/svg+xml" }), width: w, height: h };
  }

  return { blob: webp, width: w, height: h };
}

self.onmessage = async (e: MessageEvent<WorkerIn>) => {
  const { id, file, settings } = e.data;
  try {
    const r = await convert(file, settings, id);
    post({ type: "done", id, ...r });
  } catch (err) {
    post({
      type: "error",
      id,
      message: err instanceof Error ? err.message : "Could not convert this file.",
    });
  }
};

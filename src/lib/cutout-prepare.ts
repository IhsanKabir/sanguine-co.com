/**
 * Prepares a cut-out in the admin's browser before upload, so no large file ever passes
 * through the server: hardens the edges (the faint haze background-removal tools leave is
 * dropped), trims the empty margins, and makes the two WebP sizes the home page uses.
 * Browser only.
 */
export interface PreparedCutout {
  large: Blob;
  small: Blob;
  /** Size of the large picture. */
  width: number;
  height: number;
  /** "webp", or "png" in a browser that cannot write WebP. */
  ext: "webp" | "png";
}

const ALPHA_LOW = 120;   // at or below: clear
const ALPHA_HIGH = 200;  // at or above: solid; a short ramp between
const SIZES = { large: 900, small: 450 } as const;
const QUALITY = 0.82;
const MAX_PIXELS = 40_000_000;   // 40 megapixels: a small file can still be a huge image

/** Whether the picture has a transparent background at all (at least 2% of it see-through). */
function hasTransparency(d: Uint8ClampedArray): boolean {
  let clear = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 250) clear++;
  return clear / (d.length / 4) > 0.02;
}

function hardenAndBound(d: Uint8ClampedArray, w: number, h: number) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4 + 3, a = d[i];
      d[i] = a <= ALPHA_LOW ? 0 : a >= ALPHA_HIGH ? 255 : Math.round(((a - ALPHA_LOW) / (ALPHA_HIGH - ALPHA_LOW)) * 255);
      if (d[i] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error("Could not make the picture."))), "image/webp", QUALITY));
}

async function resized(src: HTMLCanvasElement, box: { x: number; y: number; w: number; h: number }, limit: number) {
  const k = Math.min(1, limit / Math.max(box.w, box.h));   // fit inside limit x limit, never enlarge
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(box.w * k));
  out.height = Math.max(1, Math.round(box.h * k));
  const g = out.getContext("2d");
  if (!g) throw new Error("This browser cannot prepare pictures.");
  g.imageSmoothingQuality = "high";
  g.drawImage(src, box.x, box.y, box.w, box.h, 0, 0, out.width, out.height);
  return { blob: await toBlob(out), width: out.width, height: out.height };
}

export async function prepareCutout(file: File): Promise<PreparedCutout> {
  const bitmap = await createImageBitmap(file);
  if (bitmap.width * bitmap.height > MAX_PIXELS) {
    bitmap.close();
    throw new Error("The picture is too large (over 40 megapixels). Please save a smaller copy and try again.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const g = canvas.getContext("2d", { willReadFrequently: true });
  if (!g) throw new Error("This browser cannot prepare pictures.");
  g.drawImage(bitmap, 0, 0);
  bitmap.close();
  const img = g.getImageData(0, 0, canvas.width, canvas.height);
  if (!hasTransparency(img.data)) {
    throw new Error("This picture has no transparent background. Remove the background first (for example with your phone's \"lift subject\" or remove.bg), save it as PNG, then upload it here.");
  }
  const box = hardenAndBound(img.data, canvas.width, canvas.height);
  if (!box) throw new Error("The picture is empty after removing the background.");
  g.putImageData(img, 0, 0);
  const large = await resized(canvas, box, SIZES.large);
  const small = await resized(canvas, box, SIZES.small);
  canvas.width = 0;   // release the full-size picture's memory now
  canvas.height = 0;
  return { large: large.blob, small: small.blob, width: large.width, height: large.height, ext: large.blob.type === "image/webp" ? "webp" : "png" };
}

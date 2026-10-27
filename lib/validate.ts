const ALLOWED_EXT = /\.(png|jpe?g)$/i;
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", ""]);

/** Accepts only real PNG / JPG / JPEG files: extension, MIME type and file signature must all agree. */
export async function isAllowedImage(file: File): Promise<boolean> {
  if (!ALLOWED_EXT.test(file.name)) return false;
  if (!ALLOWED_MIME.has(file.type)) return false;
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const png =
    head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  const jpg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  return png || jpg;
}

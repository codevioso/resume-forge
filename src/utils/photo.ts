/**
 * Turns an uploaded image into a small JPEG data URL for the resume.
 *
 * A phone photo is 3–8 MB, which as base64 alone outgrows the browser's
 * ~5 MB localStorage (so the resume could not be saved) and makes every PDF
 * export upload it again. No template prints a photo larger than about 150px,
 * so 600px on the long side stays sharp at print resolution and comes out
 * around 50–100 KB.
 */
const MAX_SIDE = 600;
const QUALITY = 0.88;

export async function photoToDataUrl(file: File): Promise<string> {
  const source = await readAsDataUrl(file);
  const img = await loadImage(source);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return source;
  // JPEG has no transparency; a transparent PNG would otherwise turn black.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', QUALITY);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the image'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Not an image the browser can open'));
    img.src = src;
  });
}

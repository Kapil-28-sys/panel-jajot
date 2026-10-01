/**
 * Image handling for Settings > Branding.
 *
 * The project has no upload endpoint/mechanism in the frontend to reuse, so uploaded
 * logo / favicon / login images are downscaled in the browser and stored as data URLs
 * inside the theme JSON (see CHANGES.md). A plain https:// URL can be pasted instead.
 */

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsDataURL(file);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("That file isn't a readable image."));
    img.src = src;
  });

/**
 * @param {File} file
 * @param {{maxSize?: number, mime?: string, quality?: number}} opts
 *        maxSize = longest edge in px; mime = output type for raster images
 */
export async function fileToThemeImage(file, { maxSize = 512, mime = "image/png", quality = 0.85 } = {}) {
  if (!file || !file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Image is larger than 5 MB.");

  const dataUrl = await readAsDataUrl(file);

  // SVG / ICO stay as they are (already small, scaling would rasterise or break them).
  if (file.type === "image/svg+xml" || file.type === "image/x-icon" || file.type === "image/vnd.microsoft.icon") {
    if (dataUrl.length > 200000) throw new Error("This file is too large. Use one under 150 KB.");
    return dataUrl;
  }

  const img = await loadImage(dataUrl);
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (mime === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(mime, quality);
}

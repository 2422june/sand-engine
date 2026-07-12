const cache = new Map<string, HTMLImageElement>();

/** Loads (and memoizes) an `HTMLImageElement` for a bundled asset URL. Decoding is async — check {@link isImageReady} before drawing. */
export function loadImage(src: string): HTMLImageElement {
  let img = cache.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    cache.set(src, img);
  }
  return img;
}

export function isImageReady(img: HTMLImageElement): boolean {
  return img.complete && img.naturalWidth > 0;
}

/** Draws `img` into the destination rect with CSS `object-fit: cover` semantics (crops to fill, preserves aspect ratio). */
export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  const srcRatio = img.naturalWidth / img.naturalHeight;
  const dstRatio = dw / dh;
  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  if (srcRatio > dstRatio) {
    sw = img.naturalHeight * dstRatio;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / dstRatio;
    sy = (img.naturalHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

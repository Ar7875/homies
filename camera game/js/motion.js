const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

export const prefersReducedMotion = () => reducedQuery.matches;

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const translateY = (px) => `translate3d(0, ${px}px, 0)`;

const decoded = new Map();

/** Load + decode an image once so it can be shown without a loading flash. Resolves with the image. */
export function preloadImage(src) {
  if (!decoded.has(src)) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    decoded.set(
      src,
      img.decode().then(
        () => img,
        () => img,
      ),
    );
  }
  return decoded.get(src);
}

/** Resolve when an <img> already in the DOM is loaded and decoded (or after a timeout). */
export function whenImageReady(img, timeout = 1500) {
  const loaded =
    img.complete && img.naturalWidth
      ? Promise.resolve()
      : new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        });
  return Promise.race([
    loaded.then(() => img.decode().catch(() => undefined)),
    wait(timeout),
  ]);
}

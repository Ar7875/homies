import { prefersReducedMotion } from "../motion.js";

const SIDE_MARGIN = 20;
const VERTICAL_MARGIN = 90;

/** Expands a gallery card into the centre of the screen over a dimmed overlay. */
export function createLightbox(root, container, { onOpen, onClose } = {}) {
  const backdrop = root.querySelector(".lightbox__backdrop");
  const closeButton = root.querySelector(".lightbox__close");

  let current = null; // { card, img }
  let busy = false;

  /** Transform that maps the centred image back onto the card's on-screen box. */
  function cardTransform(card, img) {
    const box = container.getBoundingClientRect();
    const from = card.getBoundingClientRect();
    const left = parseFloat(img.style.left);
    const top = parseFloat(img.style.top);
    const scaleX = from.width / parseFloat(img.style.width);
    const scaleY = from.height / parseFloat(img.style.height);
    return `translate3d(${from.left - box.left - left}px, ${from.top - box.top - top}px, 0) scale(${scaleX}, ${scaleY})`;
  }

  async function open(card, src, alt) {
    if (current || busy) return;
    busy = true;
    const reduced = prefersReducedMotion();

    const box = container.getBoundingClientRect();
    const from = card.getBoundingClientRect();
    const aspect = from.width / from.height;
    let width = box.width - SIDE_MARGIN * 2;
    let height = width / aspect;
    const maxHeight = box.height - VERTICAL_MARGIN * 2;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspect;
    }

    const img = document.createElement("img");
    img.className = "lightbox__img";
    img.src = src;
    img.alt = alt;
    img.draggable = false;
    Object.assign(img.style, {
      left: `${(box.width - width) / 2}px`,
      top: `${(box.height - height) / 2}px`,
      width: `${width}px`,
      height: `${height}px`,
    });

    root.hidden = false;
    root.append(img);
    card.style.visibility = "hidden";
    current = { card, img };
    onOpen?.();

    const duration = reduced ? 160 : 420;
    backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduced ? 160 : 280, easing: "ease-out" });
    closeButton.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, delay: reduced ? 0 : 140, fill: "backwards" });
    const grow = reduced
      ? img.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing: "ease-out" })
      : img.animate([{ transform: cardTransform(card, img) }, { transform: "none" }], {
          duration,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        });

    closeButton.focus({ preventScroll: true });
    await grow.finished;
    busy = false;
  }

  async function close() {
    if (!current || busy) return;
    busy = true;
    const reduced = prefersReducedMotion();
    const { card, img } = current;

    const shrink = reduced
      ? img.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: "forwards" })
      : img.animate([{ transform: "none" }, { transform: cardTransform(card, img) }], {
          duration: 320,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          fill: "forwards",
        });
    backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduced ? 140 : 300, easing: "ease-in", fill: "forwards" });
    closeButton.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: "forwards" });

    await shrink.finished;

    card.style.visibility = "";
    img.remove();
    root.hidden = true;
    root.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    current = null;
    busy = false;
    onClose?.();
    card.focus({ preventScroll: true });
  }

  root.addEventListener("click", close);

  return { open, close, isOpen: () => Boolean(current) };
}

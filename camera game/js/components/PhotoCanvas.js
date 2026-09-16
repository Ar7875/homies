import { prefersReducedMotion, preloadImage } from "../motion.js";

const COLUMN_WIDTH = 150;
const PAD_X = 40;
const PAD_TOP = 92; // clears the header
const PAD_BOTTOM = 56;
const MAX_CARD_HEIGHT = 240;

/** Small seeded PRNG so the scattered layout is the same every time the folder opens. */
function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Loose, staggered masonry: cards of varying widths, jittered inside their columns. */
function layout(items, viewWidth, viewHeight) {
  const rand = seeded(items.length * 7919 + 17);
  const n = items.length;
  const columns = n <= 2 ? n : n <= 4 ? 2 : n <= 9 ? 3 : 4;
  const columnY = Array.from({ length: columns }, () => PAD_TOP + rand() * 56);

  const placed = items.map(({ src, aspect }) => {
    const column = columnY.indexOf(Math.min(...columnY));
    let w = 104 + rand() * 34;
    let h = w / aspect;
    if (h > MAX_CARD_HEIGHT) {
      h = MAX_CARD_HEIGHT;
      w = h * aspect;
    }
    const x = PAD_X + column * COLUMN_WIDTH + rand() * Math.max(0, COLUMN_WIDTH - w - 8);
    const y = columnY[column] + rand() * 18;
    columnY[column] = y + h + 22 + rand() * 26;
    return { src, x, y, w, h };
  });

  const contentWidth = PAD_X * 2 + columns * COLUMN_WIDTH;
  const contentHeight = Math.max(...columnY) + PAD_BOTTOM;
  const width = Math.max(viewWidth, contentWidth);
  const height = Math.max(viewHeight, contentHeight);
  const offsetX = (width - contentWidth) / 2;
  const offsetY = Math.max(0, (viewHeight - contentHeight) / 2);
  placed.forEach((p) => {
    p.x = Math.round(p.x + offsetX);
    p.y = Math.round(p.y + offsetY);
    p.w = Math.round(p.w);
    p.h = Math.round(p.h);
  });
  return { width, height, placed };
}

/**
 * Free-scroll canvas that the folder's photos fan out onto.
 * `onOpenPhoto(card, src, index)` is called when a card is tapped.
 */
export function createPhotoCanvas(root, { onOpenPhoto }) {
  const scroller = root.querySelector(".gallery__scroller");
  const canvas = root.querySelector(".gallery__canvas");
  const back = root.querySelector(".gallery__back");

  let open = false;
  let busy = false;
  let cards = [];
  let dragMoved = false;

  // Mouse drag-to-pan (touch already pans natively).
  scroller.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const start = { x: event.clientX, y: event.clientY, left: scroller.scrollLeft, top: scroller.scrollTop };
    dragMoved = false;

    const move = (e) => {
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (!dragMoved && Math.hypot(dx, dy) > 4) {
        dragMoved = true;
        scroller.classList.add("is-dragging");
      }
      if (dragMoved) {
        scroller.scrollLeft = start.left - dx;
        scroller.scrollTop = start.top - dy;
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      scroller.classList.remove("is-dragging");
      // Let the click that follows a drag see `dragMoved`, then reset.
      setTimeout(() => (dragMoved = false), 0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  });

  /** Folder centre, expressed in canvas coordinates. */
  function originIn(fromRect) {
    const view = scroller.getBoundingClientRect();
    return {
      x: fromRect.left + fromRect.width / 2 - view.left + scroller.scrollLeft,
      y: fromRect.top + fromRect.height / 2 - view.top + scroller.scrollTop,
    };
  }

  async function show(photos, fromRect) {
    if (open || busy || !photos.length) return;
    busy = true;
    open = true;
    const reduced = prefersReducedMotion();

    const images = await Promise.all(photos.map((src) => preloadImage(src)));
    const items = photos.map((src, i) => ({
      src,
      aspect: (images[i].naturalWidth || 3) / (images[i].naturalHeight || 4),
    }));

    root.hidden = false;
    const view = scroller.getBoundingClientRect();
    const { width, height, placed } = layout(items, view.width, view.height);

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.replaceChildren();
    cards = placed.map((p, index) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "gallery__card";
      card.style.cssText = `left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px`;
      card.setAttribute("aria-label", `Open homie picture ${index + 1}`);
      const img = document.createElement("img");
      img.src = p.src;
      img.alt = "";
      img.draggable = false;
      card.append(img);
      card.addEventListener("click", () => {
        if (!dragMoved) onOpenPhoto(card, p.src, index);
      });
      canvas.append(card);
      return { el: card, ...p };
    });

    scroller.scrollLeft = (width - view.width) / 2;
    scroller.scrollTop = 0;

    root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduced ? 160 : 220, easing: "ease-out" });

    if (!reduced) {
      const origin = originIn(fromRect);
      await Promise.all(
        cards.map(({ el, x, y, w: cw, h }, i) =>
          el.animate(
            [
              {
                transform: `translate3d(${origin.x - (x + cw / 2)}px, ${origin.y - (y + h / 2)}px, 0) scale(0.2)`,
                opacity: 0,
              },
              { opacity: 1, offset: 0.25 },
              { transform: "translate3d(0, 0, 0) scale(1)", opacity: 1 },
            ],
            { duration: 560, delay: i * 28, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "backwards" },
          ).finished,
        ),
      );
    }

    back.focus({ preventScroll: true });
    busy = false;
  }

  async function hide(toRect) {
    if (!open || busy) return;
    busy = true;
    const reduced = prefersReducedMotion();

    if (!reduced) {
      const origin = originIn(toRect);
      const last = cards.length - 1;
      await Promise.all(
        cards.map(({ el, x, y, w: cw, h }, i) =>
          el.animate(
            [
              { transform: "translate3d(0, 0, 0) scale(1)", opacity: 1 },
              { opacity: 1, offset: 0.7 },
              {
                transform: `translate3d(${origin.x - (x + cw / 2)}px, ${origin.y - (y + h / 2)}px, 0) scale(0.2)`,
                opacity: 0,
              },
            ],
            { duration: 340, delay: (last - i) * 14, easing: "cubic-bezier(0.4, 0, 0.8, 0.4)", fill: "forwards" },
          ).finished,
        ),
      );
    }

    await root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduced ? 140 : 160, easing: "ease-in", fill: "forwards" })
      .finished;

    root.hidden = true;
    root.getAnimations().forEach((a) => a.cancel());
    canvas.replaceChildren();
    cards = [];
    open = false;
    busy = false;
  }

  return { show, hide, isOpen: () => open };
}

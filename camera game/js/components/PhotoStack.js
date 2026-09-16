import { prefersReducedMotion } from "../motion.js";

// Slot geometry from Figma (relative to the 80 x 79.47 folder), newest first.
// Rotation pivots on each thumbnail's top-left corner, as in Figma.
const SLOTS = [
  { x: 21.676, y: 16.22, r: 1.49785, shadow: "-0.715px 1.43px 1.43px rgba(0, 0, 0, 0.5)" },
  { x: 13.101, y: 14.154, r: -7.07523, shadow: "-0.715px 1.43px 1.43px rgba(45, 45, 45, 0.2)" },
  { x: 8.609, y: 16.22, r: 0, shadow: "-0.715px 1.43px 1.43px rgba(0, 0, 0, 0)" },
];
const VISIBLE = SLOTS.length;

const slotTransform = ({ x, y, r }) => `translate3d(${x}px, ${y}px, 0) rotate(${r}deg)`;

function placeInSlot(el, depth) {
  const slot = SLOTS[Math.min(depth, VISIBLE - 1)];
  el.style.transform = slotTransform(slot);
  el.style.boxShadow = slot.shadow;
  el.style.opacity = depth < VISIBLE ? "1" : "0";
}

/** Thumbnails inside the folder. Newest sits on top; older ones fan back and eventually hide. */
export function createPhotoStack(root) {
  const items = []; // newest first

  function push(src) {
    const reduced = prefersReducedMotion();

    // Anything already fully hidden underneath can go.
    while (items.length > VISIBLE) items.pop().remove();

    const el = document.createElement("div");
    el.className = "folder__photo";
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    img.draggable = false;
    el.append(img);

    items.unshift(el);
    items.forEach((item, depth) => depth > 0 && placeInSlot(item, depth));

    placeInSlot(el, 0);
    root.append(el);

    const rest = SLOTS[0];
    const animation = reduced
      ? el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" })
      : el.animate(
          [
            {
              transform: slotTransform({ x: rest.x, y: -54, r: -4 }),
              easing: "cubic-bezier(0.2, 0.75, 0.25, 1)",
            },
            {
              offset: 0.82,
              transform: slotTransform({ x: rest.x, y: rest.y + 1.2, r: rest.r + 0.4 }),
              easing: "ease-in-out",
            },
            { transform: slotTransform(rest) },
          ],
          { duration: 560 },
        );

    return animation;
  }

  return { push };
}

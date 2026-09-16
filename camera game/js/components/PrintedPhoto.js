import { prefersReducedMotion, preloadImage, translateY, wait } from "../motion.js";

const POLAROID_HEIGHT = 286.007;
// Start fully inside the camera, including the shadow below the paper.
const TRAVEL = POLAROID_HEIGHT + 5;
const PRINT_DURATION = 1150;
// Prints deeper than this are fully covered, so they're faded out and removed.
const MAX_PILE = 6;

const pad = (n) => String(n).padStart(2, "0");

/** A random dd.mm.yy between 2019 and today, like a date stamp written on the print. */
function randomDate() {
  const start = Date.UTC(2019, 0, 1);
  const date = new Date(start + Math.random() * (Date.now() - start));
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${String(date.getFullYear()).slice(-2)}`;
}

/**
 * Where a print comes to rest on the pile. The first one lies straight (as in Figma);
 * later ones tilt a little, alternating sides, so the edges underneath stay visible.
 */
function restingPose(position) {
  if (position === 0) return { x: 0, y: 0, r: 0 };
  const side = position % 2 === 0 ? 1 : -1;
  return {
    x: +((Math.random() * 2 - 1) * 4).toFixed(2),
    y: +(Math.random() * 4).toFixed(2),
    r: +(side * (1.5 + Math.random() * 2.2)).toFixed(2),
  };
}

const poseTransform = ({ x, y, r }) => `translate3d(${x}px, ${y}px, 0) rotate(${r}deg)`;

function buildPolaroid(src, label) {
  const el = document.createElement("div");
  el.className = "polaroid";

  const photo = document.createElement("div");
  photo.className = "polaroid__photo";

  const img = document.createElement("img");
  img.src = src;
  img.alt = label;
  img.draggable = false;

  const date = document.createElement("p");
  date.className = "polaroid__date";
  date.textContent = randomDate();

  photo.append(img);
  el.append(photo, date);
  return { el, date };
}

/** Keyframes for a motor-driven eject: short push, tiny hitch, steady glide, soft settle. */
function printKeyframes() {
  const at = (progress) => translateY(-TRAVEL * (1 - progress));
  return [
    { offset: 0, transform: at(0), easing: "cubic-bezier(0.33, 0, 0.2, 1)" },
    { offset: 0.17, transform: at(0.1), easing: "cubic-bezier(0.5, 0, 0.5, 1)" },
    { offset: 0.27, transform: at(0.14), easing: "cubic-bezier(0.45, 0.05, 0.2, 1)" },
    { offset: 0.9, transform: translateY(1.5), easing: "cubic-bezier(0.4, 0, 0.6, 1)" },
    { offset: 1, transform: translateY(0) },
  ];
}

/** Prints photos out of the camera slot onto a growing pile; the newest is always on top. */
export function createPrintedPhoto(slot) {
  const pile = []; // oldest first
  let printed = 0;

  function trimPile() {
    while (pile.length > MAX_PILE) {
      const buried = pile.shift();
      buried
        .animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" })
        .finished.then(() => buried.remove(), () => buried.remove());
    }
  }

  /**
   * Prints `src` out of the camera slot, in front of the earlier prints.
   * `onNearlyDone` fires shortly before the paper settles so the folder can start receiving it.
   */
  async function print(src, { label = "", onNearlyDone } = {}) {
    const reduced = prefersReducedMotion();
    // Photos are preloaded ahead of time; never let a slow decode hold up the shutter.
    await Promise.race([preloadImage(src), wait(600)]);

    const { el, date } = buildPolaroid(src, label);
    slot.append(el);
    pile.push(el);
    const pose = restingPose(printed);
    printed += 1;

    const duration = reduced ? 220 : PRINT_DURATION;
    const eject = reduced
      ? el.animate(
          [
            { opacity: 0, transform: translateY(0) },
            { opacity: 1, transform: translateY(0) },
          ],
          { duration, easing: "ease-out", fill: "both" },
        )
      : el.animate(printKeyframes(), { duration, fill: "both" });

    const nearlyDone = setTimeout(() => onNearlyDone?.(), duration * (reduced ? 0.6 : 0.78));

    try {
      await eject.finished;
    } finally {
      clearTimeout(nearlyDone);
    }

    // Bake the resting position into inline style so later animations start from it.
    el.style.transform = translateY(0);
    el.style.opacity = "1";
    eject.cancel();

    // The date gets "written" once the print is out.
    date.animate(
      [
        { opacity: 0, transform: translateY(reduced ? 0 : 2) },
        { opacity: 1, transform: translateY(0) },
      ],
      { duration: reduced ? 150 : 320, easing: "ease-out", fill: "forwards" },
    );

    // Drop onto the pile with a slight tilt.
    const rest = poseTransform(pose);
    if (pose.r !== 0) {
      const settle = el.animate([{ transform: translateY(0) }, { transform: rest }], {
        duration: reduced ? 0 : 420,
        easing: "cubic-bezier(0.25, 0.8, 0.3, 1)",
        fill: "forwards",
      });
      await settle.finished;
      el.style.transform = rest;
      settle.cancel();
    }

    trimPile();
  }

  return { print };
}

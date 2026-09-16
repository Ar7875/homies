import { prefersReducedMotion, wait } from "../motion.js";
import { createPhotoStack } from "./PhotoStack.js";

export function createPhotoFolder(root) {
  const stack = createPhotoStack(root.querySelector(".folder__stack"));
  let count = 0;

  function nudge() {
    root.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.04)", offset: 0.35 },
        { transform: "scale(1)" },
      ],
      { duration: 320, easing: "cubic-bezier(0.3, 0, 0.3, 1)" },
    );
  }

  /** Slides a photo into the folder; resolves once it has landed. */
  async function add(src) {
    count += 1;
    root.setAttribute("aria-label", `Open photo folder, ${count} ${count === 1 ? "photo" : "photos"}`);

    const drop = stack.push(src);
    if (!prefersReducedMotion()) {
      wait(drop.effect.getTiming().duration * 0.55).then(nudge);
    }
    await drop.finished;
  }

  /** Small "nothing in here yet" shake. */
  function wiggle() {
    if (prefersReducedMotion()) return;
    root.animate(
      [
        { transform: "rotate(0deg)" },
        { transform: "rotate(-5deg)", offset: 0.2 },
        { transform: "rotate(4deg)", offset: 0.45 },
        { transform: "rotate(-2deg)", offset: 0.7 },
        { transform: "rotate(0deg)" },
      ],
      { duration: 380, easing: "ease-in-out" },
    );
  }

  return { add, wiggle };
}

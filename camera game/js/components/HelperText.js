import { prefersReducedMotion, translateY } from "../motion.js";

export function createHelperText(el) {
  let dismissed = false;

  function dismiss() {
    if (dismissed || !el) return;
    dismissed = true;
    const fade = el.animate(
      [
        { opacity: 1, transform: translateY(0) },
        { opacity: 0, transform: translateY(prefersReducedMotion() ? 0 : 4) },
      ],
      { duration: 240, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" },
    );
    fade.finished.then(() => el.remove());
  }

  return { dismiss };
}

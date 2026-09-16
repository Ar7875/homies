import { prefersReducedMotion } from "../motion.js";

export function createShutterButton(button, { onPress }) {
  const face = button.querySelector(".shutter__face");
  const glow = button.querySelector(".shutter__glow");

  function tap() {
    if (prefersReducedMotion()) return;
    face.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(0.95)", offset: 0.4 },
        { transform: "scale(1)" },
      ],
      { duration: 160, easing: "cubic-bezier(0.3, 0, 0.3, 1)" },
    );
  }

  // Feedback on touch-down feels instant; keyboard activation (detail === 0) gets it on click.
  button.addEventListener("pointerdown", (event) => {
    if (event.isPrimary && event.button === 0) tap();
  });
  button.addEventListener("click", (event) => {
    if (event.detail === 0) tap();
    onPress();
  });

  /** Stop the attention pulse after the first interaction. */
  function calm() {
    if (button.classList.contains("is-calm")) return;
    button.classList.add("is-calm");
    glow.addEventListener("transitionend", () => button.classList.add("is-still"), { once: true });
  }

  function markFinished() {
    button.setAttribute("aria-disabled", "true");
    button.setAttribute("aria-label", "All photos taken");
  }

  return { calm, markFinished };
}

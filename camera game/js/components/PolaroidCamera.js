import { whenImageReady } from "../motion.js";

/** The camera pops in once, as soon as its image is decoded. */
export function createPolaroidCamera(root) {
  const img = root.querySelector("img");
  let entered = false;

  async function enter() {
    if (entered) return;
    entered = true;
    await whenImageReady(img);
    root.classList.add("is-entered");
  }

  return { enter };
}

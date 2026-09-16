const FIGMA_HEIGHT = 852;
const FIGMA_CAMERA_TOP = 17;
// Camera box top (17) -> bottom of the printed polaroid (550) incl. shadow, at scale 1.
const STAGE_CONTENT_HEIGHT = 537;
const GAP_ABOVE_FOLDER = 14;

const clamp = (min, value, max) => Math.min(max, Math.max(min, value));

/**
 * Keeps the Figma composition on other screen sizes: the camera keeps its relative
 * distance from the top, and the camera + print only shrink when the printed photo
 * would otherwise run into the folder / shutter area.
 */
export function initLayout(app, folder) {
  function update() {
    const appRect = app.getBoundingClientRect();
    const folderTop = folder.getBoundingClientRect().top - appRect.top;

    const top = clamp(8, (FIGMA_CAMERA_TOP * appRect.height) / FIGMA_HEIGHT, 40);
    const scale = clamp(0.6, (folderTop - GAP_ABOVE_FOLDER - top) / STAGE_CONTENT_HEIGHT, 1);

    app.style.setProperty("--cam-top", `${top.toFixed(2)}px`);
    app.style.setProperty("--stage-scale", scale.toFixed(4));
  }

  update();
  new ResizeObserver(update).observe(app);
  window.visualViewport?.addEventListener("resize", update);
}

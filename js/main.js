import { photos } from "./photos.js";
import { preloadImage } from "./motion.js";
import { initLayout } from "./layout.js";
import { createPolaroidCamera } from "./components/PolaroidCamera.js";
import { createPrintedPhoto } from "./components/PrintedPhoto.js";
import { createShutterButton } from "./components/ShutterButton.js";
import { createPhotoFolder } from "./components/PhotoFolder.js";
import { createHelperText } from "./components/HelperText.js";
import { createPhotoCanvas } from "./components/PhotoCanvas.js";
import { createLightbox } from "./components/Lightbox.js";

const $ = (id) => document.getElementById(id);

const state = {
  currentPhotoIndex: 0,
  generatedPhotos: [],
  isAnimating: false,
  hasInteracted: false,
};

initLayout($("app"), $("folder"));

const camera = createPolaroidCamera($("camera"));
const printed = createPrintedPhoto($("print-slot"));
const folder = createPhotoFolder($("folder"));
const helper = createHelperText($("helper"));
const nudge = createHelperText($("nudge"));
const announcer = $("announcer");

const preloadFrom = (index, count = 3) =>
  photos.slice(index, index + count).forEach((src) => preloadImage(src));

const shutter = createShutterButton($("shutter"), { onPress: takePhoto });

async function takePhoto() {
  if (!state.hasInteracted) {
    state.hasInteracted = true;
    helper.dismiss();
    nudge.dismiss();
    shutter.calm();
  }

  if (state.isAnimating || state.currentPhotoIndex >= photos.length) return;
  state.isAnimating = true;

  const index = state.currentPhotoIndex;
  const src = photos[index];
  state.currentPhotoIndex += 1;
  preloadFrom(index + 1);

  try {
    let landed;
    const addToFolder = () => {
      landed ??= folder.add(src);
      return landed;
    };

    await printed.print(src, {
      label: `Homie picture ${index + 1} of ${photos.length}`,
      onNearlyDone: addToFolder,
    });
    await addToFolder();

    state.generatedPhotos.push(src);
    announcer.textContent = `Printed photo ${index + 1} of ${photos.length}`;
  } finally {
    state.isAnimating = false;
    if (state.currentPhotoIndex >= photos.length) shutter.markFinished();
  }
}

// ---------- Folder -> canvas -> lightbox ----------

const folderEl = $("folder");
const galleryEl = $("gallery");
const setBackgroundInert = (value) => {
  $("stage").inert = value;
  $("dock").inert = value;
};

const lightbox = createLightbox($("lightbox"), $("app"), {
  onOpen: () => (galleryEl.inert = true),
  onClose: () => (galleryEl.inert = false),
});

const gallery = createPhotoCanvas(galleryEl, {
  onOpenPhoto: (card, src, index) => lightbox.open(card, src, `Homie picture ${index + 1}`),
});

async function openFolder() {
  if (state.isAnimating || gallery.isOpen()) return;
  if (!state.generatedPhotos.length) {
    folder.wiggle();
    return;
  }
  setBackgroundInert(true);
  await gallery.show(state.generatedPhotos, folderEl.getBoundingClientRect());
}

async function closeFolder() {
  if (!gallery.isOpen()) return;
  await gallery.hide(folderEl.getBoundingClientRect());
  setBackgroundInert(false);
  folderEl.focus({ preventScroll: true });
}

folderEl.addEventListener("click", openFolder);
folderEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openFolder();
  }
});
$("gallery-back").addEventListener("click", closeFolder);
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (lightbox.isOpen()) lightbox.close();
  else closeFolder();
});

camera.enter();
preloadFrom(0);

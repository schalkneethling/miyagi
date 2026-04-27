let liveRegion = null;

function ensureLiveRegion() {
  if (liveRegion) {
    return liveRegion;
  }
  liveRegion = document.createElement("div");
  liveRegion.setAttribute("role", "status");
  liveRegion.setAttribute("aria-live", "polite");
  liveRegion.style.position = "absolute";
  liveRegion.style.width = "1px";
  liveRegion.style.height = "1px";
  liveRegion.style.overflow = "hidden";
  liveRegion.style.clipPath = "inset(100%)";
  document.body.appendChild(liveRegion);
  return liveRegion;
}

export function announce(message) {
  const region = ensureLiveRegion();
  region.textContent = "";
  setTimeout(() => {
    region.textContent = message;
  }, 50);
}

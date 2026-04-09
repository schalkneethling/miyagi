import "./_accordion-tabs.js";
import "./_socket.js";
import {
  goto as gotoIsTriggered,
  search as searchIsTriggered,
} from "./_is-triggered.js";

if (
  window.location.pathname.startsWith("/component?") &&
  window.location.href.indexOf("&embedded=true") >= 0 &&
  window.self === window.top
) {
  window.location = new URL(window.location).replace("&embedded=true", "");
}

document.addEventListener("DOMContentLoaded", () => {
  const mockDataEl = document.getElementById("miyagi-mock-data");
  if (mockDataEl) {
    try {
      const detail = JSON.parse(mockDataEl.textContent);
      document.dispatchEvent(new CustomEvent("miyagi:mockdata", { detail }));
    } catch (e) {
      console.debug("[miyagi] Failed to parse mock data island:", e);
    }
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const links = Array.from(document.querySelectorAll(".Component-file"));
  const styleguide = document.querySelector(".Styleguide");

  if (links.length > 0) {
    import("./_iframe-links.js")
      .then((module) => {
        module.default(links);
      })
      .catch((err) => console.error(err));
  }

  if (document.querySelector(".Code")) {
    import("./_prism.js");
  }

  if (styleguide) {
    import("./styleguide/index.js")
      .then((Styleguide) => new Styleguide.default(styleguide))
      .catch((err) => console.error(err));
  }

  if (document.querySelector(".js-openMockData")) {
    import("./_mock-data.js");
  }
});

document.addEventListener("keyup", (e) => {
  const { path, originalTarget, target, key } = e;
  const el = path ? path[0] : originalTarget || target;

  if (searchIsTriggered(el, key)) {
    parent.window.dispatchEvent(new CustomEvent("searchTriggered"));
  } else if (gotoIsTriggered(el, key)) {
    parent.window.dispatchEvent(new CustomEvent("gotoTriggered"));
  }
});

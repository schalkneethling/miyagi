const CACHE_PREFIX = "miyagi-controls::";
const LS_MODE_KEY = "miyagi-controls-mode";

function getPanel() {
  return document.getElementById("controls-panel");
}

function getFieldsContainer() {
  return document.getElementById("controls-fields");
}

function hidePanel() {
  const panel = getPanel();
  if (!panel) {
    return;
  }
  panel.hidden = true;
  getFieldsContainer().innerHTML = "";
}

function showPanel() {
  const panel = getPanel();
  if (panel) {
    panel.hidden = false;
  }
}

function initMode() {
  const panel = getPanel();
  if (!panel) {
    return;
  }

  const mode = localStorage.getItem(LS_MODE_KEY) ?? "docked";
  panel.setAttribute("data-mode", mode);

  const toggle = document.getElementById("controls-mode-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const next =
        panel.getAttribute("data-mode") === "docked" ? "floating" : "docked";
      panel.setAttribute("data-mode", next);
      localStorage.setItem(LS_MODE_KEY, next);
    });
  }
}

function buildOverrideSrc(baseSrc, property, value) {
  const url = new URL(baseSrc, window.location.origin);
  url.searchParams.set(`overrides[${property}]`, String(value));
  return url.pathname + url.search;
}

function updateIframe(src) {
  const iframe = document.getElementById("iframe");
  const frameWrapper = document.querySelector(".FrameWrapper");
  if (!iframe || !frameWrapper) {
    return;
  }
  iframe.remove();
  iframe.src = src;
  frameWrapper.appendChild(iframe);
  loadControls(src);
}

function renderControls(controls, iframeSrc) {
  const fieldsContainer = getFieldsContainer();
  fieldsContainer.innerHTML = "";

  const url = new URL(iframeSrc, window.location.origin);
  const urlOverrides = {};
  url.searchParams.forEach((value, key) => {
    const match = key.match(/^overrides\[(.+)\]$/);
    if (match) {
      urlOverrides[match[1]] = value;
    }
  });

  controls.forEach(({ property, type, values, current }) => {
    const displayValue =
      urlOverrides[property] !== undefined ? urlOverrides[property] : current;

    const fieldEl = document.createElement("div");
    fieldEl.className = "Controls-field";

    const labelEl = document.createElement("label");
    labelEl.className = "Controls-label";

    const labelText = document.createElement("span");
    labelText.className = "Controls-labelText";
    labelText.textContent = property;
    labelEl.appendChild(labelText);

    let inputEl;

    if (type === "enum") {
      inputEl = document.createElement("select");
      inputEl.className = "Controls-select";
      values.forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        if (value === displayValue) {
          option.selected = true;
        }
        inputEl.appendChild(option);
      });
      inputEl.addEventListener("change", () => {
        updateIframe(buildOverrideSrc(iframeSrc, property, inputEl.value));
      });
    } else if (type === "boolean") {
      inputEl = document.createElement("input");
      inputEl.type = "checkbox";
      inputEl.className = "Controls-checkbox";
      inputEl.checked =
        typeof displayValue === "string"
          ? displayValue === "true"
          : Boolean(displayValue);
      inputEl.addEventListener("change", () => {
        updateIframe(buildOverrideSrc(iframeSrc, property, inputEl.checked));
      });
    }

    if (inputEl) {
      labelEl.appendChild(inputEl);
      fieldEl.appendChild(labelEl);
      fieldsContainer.appendChild(fieldEl);
    }
  });

  showPanel();
}

export async function loadControls(iframeSrc) {
  const url = new URL(iframeSrc, window.location.origin);
  const file = url.searchParams.get("file");
  const variation = url.searchParams.get("variation");

  if (!file || !variation) {
    hidePanel();
    return;
  }

  const cacheKey = `${CACHE_PREFIX}${file}::${variation}`;
  let data = null;
  try {
    data = JSON.parse(sessionStorage.getItem(cacheKey) ?? "null");
  } catch {
    sessionStorage.removeItem(cacheKey);
  }

  if (!data) {
    try {
      const res = await fetch(
        `/api/component-controls?file=${encodeURIComponent(file)}&variation=${encodeURIComponent(variation)}`,
      );
      data = await res.json();
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
    } catch {
      hidePanel();
      return;
    }
  }

  if (data.controls?.length) {
    renderControls(data.controls, iframeSrc);
  } else {
    hidePanel();
  }
}

export function invalidateControlsCache(paths) {
  for (const key of Object.keys(sessionStorage)) {
    if (!key.startsWith(CACHE_PREFIX)) {
      continue;
    }

    if (!paths || paths.length === 0) {
      sessionStorage.removeItem(key);
      continue;
    }

    const file = key.slice(CACHE_PREFIX.length).split("::")[0];
    if (paths.some((p) => p.includes(file))) {
      sessionStorage.removeItem(key);
    }
  }
}

window.addEventListener("message", (e) => {
  if (e.data?.type === "miyagi:invalidate-cache") {
    invalidateControlsCache(e.data.paths ?? []);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  initMode();
  const iframe = document.getElementById("iframe");
  if (iframe) {
    const src = iframe.getAttribute("src");
    if (src) {
      loadControls(src);
    }
  }
});

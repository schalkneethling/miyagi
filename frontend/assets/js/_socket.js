const SOCKET_PATH = "/__miyagi_ws";
const INITIAL_RETRY_DELAY_MS = 250;
const MAX_RETRY_DELAY_MS = 5000;

let retryDelay = INITIAL_RETRY_DELAY_MS;
let websocket;

function getWebSocketUrl() {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}${SOCKET_PATH}`;
}

function triggerReload(scope) {
  if (scope === "parent") {
    parent.window.location.reload();
    return;
  }

  window.location.reload();
}

function parseLegacyScope(messageData) {
  if (messageData === "reloadParent") {
    return "parent";
  }

  if (typeof messageData === "string" && messageData.length === 0) {
    return "iframe";
  }

  return null;
}

function parseJsonScope(messageData) {
  try {
    const parsed = JSON.parse(messageData);
    return parsed.scope || "iframe";
  } catch {
    return "iframe";
  }
}

function parseScope(messageData) {
  const legacyScope = parseLegacyScope(messageData);
  if (legacyScope) {
    return legacyScope;
  }

  return parseJsonScope(messageData);
}

function scheduleReconnect() {
  const jitter = Math.floor(Math.random() * 100);
  const delay = Math.min(retryDelay + jitter, MAX_RETRY_DELAY_MS);
  retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);

  window.setTimeout(() => {
    connect();
  }, delay);
}

function connect() {
  websocket = new WebSocket(getWebSocketUrl());

  websocket.onopen = () => {
    retryDelay = INITIAL_RETRY_DELAY_MS;
  };

  websocket.onmessage = (message) => {
    triggerReload(parseScope(message.data));
  };

  websocket.onerror = () => {
    websocket.close();
  };

  websocket.onclose = () => {
    scheduleReconnect();
  };
}

connect();

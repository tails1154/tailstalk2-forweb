const TAILSTALK_ORIGINS = new Set([
  "https://tails1154.com:9961",
  "http://tails1154.com:9954",
]);

const DEFAULT_ENABLED = true;

function isTailsTalkUrl(url) {
  try {
    return TAILSTALK_ORIGINS.has(new URL(url).origin);
  } catch {
    return false;
  }
}

async function isEnabled() {
  const stored = await chrome.storage.local.get({ enabled: DEFAULT_ENABLED });
  return stored.enabled === true;
}

async function sendToClients(message) {
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs
      .filter((tab) => tab.id !== undefined && isTailsTalkUrl(tab.url))
      .map((tab) =>
        chrome.tabs.sendMessage(tab.id, message).catch(() => undefined),
      ),
  );
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "rpc:hello") {
    isEnabled().then((enabled) => sendResponse({ enabled }));
    return true;
  }

  if (message?.type === "rpc:set-enabled") {
    const enabled = message.enabled === true;
    chrome.storage.local.set({ enabled }).then(() => {
      void sendToClients({
        source: "tailstalk2-rpc-extension",
        type: "rpc:enabled",
        activity: enabled,
      });
      sendResponse({ enabled });
    });
    return true;
  }

  if (message?.type === "rpc:activity") {
    isEnabled().then((enabled) => {
      if (enabled) {
        void sendToClients({
          source: "tailstalk2-rpc-extension",
          type: "rpc:activity",
          activity: message.activity,
        });
      }
    });
  }
});

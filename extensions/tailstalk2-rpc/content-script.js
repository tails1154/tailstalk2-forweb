const APP_SOURCE = "tailstalk2-web";
const EXTENSION_SOURCE = "tailstalk2-rpc-extension";
const MAX_LENGTHS = { title: 96, site: 48, details: 96, state: 96 };
const IS_TAILSTALK = [
  "https://tails1154.com:9961",
  "http://tails1154.com:9954",
].includes(location.origin);

function clean(value, max) {
  if (typeof value !== "string") return undefined;
  const text = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return text ? text.slice(0, max) : undefined;
}

function validActivity(activity) {
  if (!activity || typeof activity !== "object") return undefined;
  return {
    title: clean(activity.title, MAX_LENGTHS.title),
    site: clean(activity.site, MAX_LENGTHS.site),
    details: clean(activity.details, MAX_LENGTHS.details),
    state: clean(activity.state, MAX_LENGTHS.state),
    url: location.href.slice(0, 2048),
  };
}

function sendActivity(activity) {
  const sanitized = validActivity(activity);
  if (!sanitized || (!sanitized.title && !sanitized.site)) return;
  chrome.runtime.sendMessage({ type: "rpc:activity", activity: sanitized });
}

if (IS_TAILSTALK) {
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.source !== EXTENSION_SOURCE) return;
    window.postMessage(message, location.origin);
  });

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    if (event.data?.source !== APP_SOURCE) return;

    if (event.data.type === "rpc:hello") {
      chrome.runtime.sendMessage({ type: "rpc:hello" }).then((response) => {
        window.postMessage(
          {
            source: EXTENSION_SOURCE,
            type: "rpc:enabled",
            activity: response?.enabled === true,
          },
          location.origin,
        );
      });
    }

    if (event.data.type === "rpc:set-enabled") {
      chrome.runtime.sendMessage({
        type: "rpc:set-enabled",
        enabled: event.data.enabled === true,
      });
    }
  });
} else {
  let customActivity;
  const publish = () => {
    if (!customActivity) {
      sendActivity({ title: document.title, site: location.hostname });
    }
  };
  publish();
  new MutationObserver(publish).observe(document.querySelector("title") ?? document.head, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  // Websites may provide a tailored activity template without an API key.
  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    if (event.data?.source !== "tailstalk2-rpc" || event.data.type !== "activity") return;
    customActivity = event.data.activity;
    sendActivity(event.data.activity);
  });
}

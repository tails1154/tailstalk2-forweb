import type { Client } from "stoat.js";

const APP_SOURCE = "tailstalk2-web";
const EXTENSION_SOURCE = "tailstalk2-rpc-extension";
const MAX_ACTIVITY_TEXT = 128;

type BrowserRpcActivity = {
  title?: unknown;
  url?: unknown;
  site?: unknown;
  details?: unknown;
  state?: unknown;
};

type BrowserRpcMessage = {
  source?: unknown;
  type?: unknown;
  activity?: BrowserRpcActivity | boolean;
};

let setEnabled: ((enabled: boolean) => void) | undefined;

function trim(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const result = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return result ? result.slice(0, max) : undefined;
}

function formatActivity(activity: BrowserRpcActivity): string | undefined {
  const title = trim(activity.title, 96);
  const site = trim(activity.site, 48);
  const details = trim(activity.details, 48);
  const state = trim(activity.state, 48);
  if (!title && !site) return undefined;

  const prefix = site ? `Browsing ${site}` : "Browsing the web";
  const text = [title ? `${prefix}: ${title}` : prefix, details, state]
    .filter(Boolean)
    .join(" · ");
  return text.slice(0, MAX_ACTIVITY_TEXT);
}

function isExtensionMessage(message: BrowserRpcMessage): boolean {
  return message.source === EXTENSION_SOURCE;
}

/**
 * Tell the helper extension whether page activity sharing is enabled.
 * This is intentionally a window message so the optional extension remains
 * independent from the application bundle.
 */
export function setBrowserRpcEnabled(enabled: boolean): void {
  window.postMessage(
    {
      source: APP_SOURCE,
      type: "rpc:set-enabled",
      enabled,
    },
    window.location.origin,
  );
  setEnabled?.(enabled);
}

/**
 * Listen for sanitized activity from the optional browser extension and
 * publish it through the existing authenticated user-status API.
 */
export function startBrowserRpc(getClient: () => Client | undefined): () => void {
  let enabled = true;
  let previousText: string | undefined;
  let originalText: string | undefined;
  let lastPublishedText: string | undefined;
  let updateId = 0;

  const clearPublishedActivity = async () => {
    const client = getClient();
    if (!client?.user || !lastPublishedText) return;
    if (client.user.status?.text !== lastPublishedText) return;

    if (originalText) {
      await client.user.edit({ status: { text: originalText } });
    } else {
      await client.user.edit({ remove: ["StatusText"] });
    }

    lastPublishedText = undefined;
    previousText = undefined;
    originalText = undefined;
  };

  const onMessage = (event: MessageEvent<BrowserRpcMessage>) => {
    if (event.source !== window || !isExtensionMessage(event.data)) return;

    if (event.data.type === "rpc:activity" && enabled) {
      const text = formatActivity(
        event.data.activity && typeof event.data.activity === "object"
          ? event.data.activity
          : {},
      );
      if (!text || text === previousText) return;

      const client = getClient();
      if (!client?.user) return;

      if (originalText === undefined) {
        originalText = client.user.status?.text ?? undefined;
      }
      previousText = text;
      const currentUpdate = ++updateId;

      void client.user
        .edit({ status: { text } })
        .then(() => {
          if (currentUpdate === updateId) lastPublishedText = text;
        })
        .catch(() => undefined);
    }

    if (event.data.type === "rpc:enabled" && typeof event.data.activity === "boolean") {
      enabled = event.data.activity;
    }
  };

  setEnabled = (value) => {
    enabled = value;
    if (!value) void clearPublishedActivity();
  };

  window.addEventListener("message", onMessage);
  window.postMessage(
    {
      source: APP_SOURCE,
      type: "rpc:hello",
      enabled,
    },
    window.location.origin,
  );

  return () => {
    window.removeEventListener("message", onMessage);
    setEnabled = undefined;
    void clearPublishedActivity();
  };
}

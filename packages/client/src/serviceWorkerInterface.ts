import { createEffect, createSignal, onCleanup } from "solid-js";

import { useLingui } from "@lingui-solid/solid/macro";
import { CONFIGURATION } from "@revolt/common";
import { useSnackbar } from "@revolt/ui";
import { registerSW } from "virtual:pwa-register";
import { CURRENT_VERSION } from "./version";

const [pendingUpdate, setPendingUpdate] = createSignal<
  () => void | Promise<void>
>();
const VERSION_ENDPOINT =
  "https://tails1154.com:9782/cgi-bin/tailstalk2_version.py";
const SERVER_ENDPOINT = new URL(CONFIGURATION.DEFAULT_API_URL).origin;

export { pendingUpdate };

let suppressLeaveSitePrompt = false;

export function suppressLeaveSitePromptOnce() {
  suppressLeaveSitePrompt = true;
}

export function isLeaveSitePromptSuppressed() {
  return suppressLeaveSitePrompt;
}

function isNewerVersion(remote: string, current: string): boolean {
  const remoteParts = remote.split(".").map(Number);
  const currentParts = current.split(".").map(Number);

  if (
    remoteParts.length === currentParts.length &&
    remoteParts.every(Number.isFinite) &&
    currentParts.every(Number.isFinite)
  ) {
    for (let index = 0; index < remoteParts.length; index++) {
      if (remoteParts[index] !== currentParts[index]) {
        return remoteParts[index] > currentParts[index];
      }
    }
    return false;
  }

  return remote !== current;
}

async function checkPublishedVersion() {
  try {
    const response = await fetch(`${VERSION_ENDPOINT}?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!response.ok) return;

    const remoteVersion = (await response.text()).trim();
    if (!remoteVersion || !isNewerVersion(remoteVersion, CURRENT_VERSION)) {
      return;
    }

    queueUpdate(() => installLatestVersion());
  } catch {
    // The version endpoint is optional; service-worker updates still run.
  }
}

async function clearClientCaches() {
  if (!("caches" in window)) return;

  const cacheNames = await window.caches.keys();
  await Promise.all(
    cacheNames.map((cacheName) => window.caches.delete(cacheName)),
  );
}

/** Wait through a backend/container restart before reloading the app. */
let waitingForServer = false;

async function waitForServer() {
  while (true) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetch(`${SERVER_ENDPOINT}/?t=${Date.now()}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (response.ok) return;
      await new Promise((resolve) => window.setTimeout(resolve, 5000));
    } catch {
      await new Promise((resolve) => window.setTimeout(resolve, 5000));
    } finally {
      window.clearTimeout(timeout);
    }
  }
}

function queueUpdate(update: () => void | Promise<void>) {
  if (pendingUpdate() || waitingForServer) return;

  waitingForServer = true;
  void waitForServer().then(() => {
    waitingForServer = false;
    setPendingUpdate(() => update);
  });
}

async function installLatestVersion(updateServiceWorker?: () => Promise<void>) {
  suppressLeaveSitePrompt = true;

  try {
    await clearClientCaches();
  } catch {
    // Cache Storage may be unavailable or restricted; continue with the update.
  }

  if (updateServiceWorker) {
    await updateServiceWorker();
  }

  await waitForServer();
  window.location.reload();
}

if (import.meta.env.PROD) {
  const updateSW = registerSW({
    onNeedRefresh() {
      queueUpdate(() => installLatestVersion(() => updateSW(true)));
    },
    onOfflineReady() {
      console.info("Ready to work offline =)");
      // toast to users
    },
    onRegistered(r) {
      if (!r) return;

      const checkForUpdate = () => {
        void r.update();
        void checkPublishedVersion();
      };

      // Check once immediately, when the tab becomes active, and every five seconds.
      checkForUpdate();
      const interval = window.setInterval(checkForUpdate, 5 * 1000);
      window.addEventListener("focus", checkForUpdate);
      document.addEventListener("visibilitychange", checkForUpdate);

      window.addEventListener("beforeunload", () => {
        window.clearInterval(interval);
        window.removeEventListener("focus", checkForUpdate);
        document.removeEventListener("visibilitychange", checkForUpdate);
      }, { once: true });
    },
  });
}

/** Shows a single prompt when Workbox has downloaded a newer app build. */
export function ServiceWorkerUpdatePrompt() {
  const snackbar = useSnackbar();
  const { t } = useLingui();
  let prompted = false;

  createEffect(() => {
    const update = pendingUpdate();
    if (!update || prompted) return;

    prompted = true;
    snackbar.show({
      message: t`A newer version of TailsTalk 2 is available.`,
      action: t`Install now`,
      closeable: true,
      closeOnAction: true,
      onAction: update,
    });
  });

  onCleanup(() => {
    prompted = false;
  });

  return null;
}

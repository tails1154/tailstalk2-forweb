import { createEffect, createSignal, onCleanup } from "solid-js";

import { useLingui } from "@lingui-solid/solid/macro";
import { useSnackbar } from "@revolt/ui";
import { registerSW } from "virtual:pwa-register";
import { CURRENT_VERSION } from "./version";

const [pendingUpdate, setPendingUpdate] = createSignal<() => void>();
const VERSION_ENDPOINT = "https://tails1154.com:9782/tailstalk2.version";

export { pendingUpdate };

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

    setPendingUpdate(() => () => window.location.reload());
  } catch {
    // The version endpoint is optional; service-worker updates still run.
  }
}

if (import.meta.env.PROD) {
  const updateSW = registerSW({
    onNeedRefresh() {
      setPendingUpdate(() => () => void updateSW(true));
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

      // Check once immediately, when the tab becomes active, and every minute.
      checkForUpdate();
      const interval = window.setInterval(checkForUpdate, 60 * 1000);
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

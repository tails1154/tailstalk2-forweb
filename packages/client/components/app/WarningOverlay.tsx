import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import { Portal } from "solid-js/web";

import { Trans, useLingui } from "@lingui-solid/solid/macro";
import { styled } from "styled-system/jsx";

import MdWarning from "@material-design-icons/svg/outlined/warning.svg?component-solid";
import MdBlock from "@material-design-icons/svg/outlined/block.svg?component-solid";
import MdInfo from "@material-design-icons/svg/outlined/info.svg?component-solid";

import { requestClientJson } from "../client/customApi";

import { useClient } from "@revolt/client";
import { Button, Column, Text, iconSize } from "@revolt/ui";

/** One warning or notice from the server */
interface WarningItem {
  reason: string;
  created_at: string;
  /** "warning" for staff warnings, "crisis" for a crisis support notice */
  kind: string;
}

/** How often the open client asks the server for new notices */
const CHECK_INTERVAL_MS = 15_000;

/**
 * Shows staff warnings, crisis support notices and suspensions.
 * Checks on load and then every 15 seconds, so a notice sent while the app is open appears without a reload.
 */
export function WarningOverlay() {
  const client = useClient();
  const { t } = useLingui();
  const [warnings, setWarnings] = createSignal<WarningItem[]>([]);
  const [visible, setVisible] = createSignal(false);
  const [countdown, setCountdown] = createSignal(5);
  const [canDismiss, setCanDismiss] = createSignal(false);
  const [isSuspended, setIsSuspended] = createSignal(false);
  const [suspendedUntil, setSuspendedUntil] = createSignal("");
  // created_at values already announced, so each notice only pops up once
  const announced = new Set<string>();
  let countdownTimer: number | undefined;
  let checkTimer: number | undefined;

  const hasCrisis = () => warnings().some((w) => w.kind === "crisis");

  onMount(() => {
    const until = (client().user as { suspendedUntil?: string } | undefined)?.suspendedUntil;
    if (until && new Date(until).getTime() > Date.now()) {
      setIsSuspended(true);
      setSuspendedUntil(new Date(until).toLocaleString());
      setVisible(true);
      return;
    }

    void checkWarnings();
    checkTimer = window.setInterval(() => void checkWarnings(), CHECK_INTERVAL_MS);
  });

  onCleanup(() => {
    clearInterval(checkTimer);
    clearInterval(countdownTimer);
  });

  /** Fetches unacknowledged notices and announces any that have not been shown yet */
  async function checkWarnings() {
    try {
      // The server only returns warnings the user has not acknowledged
      const res = await requestClientJson<{ warnings?: WarningItem[] }>(
        client().api,
        "GET",
        "/users/@me/warnings",
      );
      const pending = res.warnings ?? [];
      const fresh = pending.filter((w) => !announced.has(w.created_at));
      if (fresh.length === 0) return;

      for (const w of fresh) announced.add(w.created_at);
      setWarnings(pending);
      // A new notice always gets the full dismiss countdown
      startCountdown();
      setVisible(true);
    } catch {
      // Network errors are retried on the next check
    }
  }

  function startCountdown() {
    clearInterval(countdownTimer);
    let remaining = 5;
    setCanDismiss(false);
    setCountdown(remaining);
    countdownTimer = window.setInterval(() => {
      remaining--;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(countdownTimer);
        setCanDismiss(true);
      }
    }, 1000);
  }

  async function dismiss() {
    if (!canDismiss()) return;
    try {
      await requestClientJson(client().api, "POST", "/users/@me/warnings/acknowledge");
    } catch {
      // Still hide the overlay. The server keeps the notices until the next acknowledgement.
    }
    setVisible(false);
  }

  return (
    <Show when={visible()}>
      <Portal mount={document.getElementById("floating") ?? document.body}>
        <Overlay>
          <Modal role="alertdialog" aria-modal="true" aria-labelledby="warning-overlay-title">
            <Column gap="md">
              <Header id="warning-overlay-title">
                <Show
                  when={isSuspended()}
                  fallback={
                    <Show
                      when={hasCrisis()}
                      fallback={<MdWarning {...iconSize(28)} style={{ color: "var(--md-sys-color-error)" }} />}
                    >
                      <MdInfo {...iconSize(28)} style={{ color: "var(--md-sys-color-primary)" }} />
                    </Show>
                  }
                >
                  <MdBlock {...iconSize(28)} style={{ color: "var(--md-sys-color-error)" }} />
                </Show>
                <Text class="title" size="medium">
                  <Show
                    when={!isSuspended()}
                    fallback={t`Account Suspended`}
                  >
                    <Show when={hasCrisis()} fallback={t`Account Warning`}>
                      {t`Support is available`}
                    </Show>
                  </Show>
                </Text>
              </Header>

              <Show when={isSuspended()}>
                <Column gap="sm">
                  <WarningCard>
                    <Text class="body" size="small">
                      <Trans>Your account has been suspended until {suspendedUntil()}.</Trans>
                    </Text>
                  </WarningCard>
                  <Text
                    class="body"
                    size="small"
                  >
                    <Trans>Do not create another account.</Trans>
                  </Text>
                  <Text
                    class="label"
                    size="small"
                  >
                    <Trans>You cannot perform any actions while suspended.</Trans>
                  </Text>
                </Column>
              </Show>

              <Show when={!isSuspended()}>
                <Column gap="sm">
                  <For each={warnings()}>
                    {(w) => (
                      <Show
                        when={w.kind === "crisis"}
                        fallback={
                          <WarningCard>
                            <Text class="body" size="small">
                              {w.reason}
                            </Text>
                            <Text class="label" size="small">
                              {new Date(w.created_at).toLocaleString()}
                            </Text>
                          </WarningCard>
                        }
                      >
                        <CrisisCard>
                          <Text class="body" size="small">
                            <Trans>
                              You are not alone. If you are thinking about hurting yourself, you can call or
                              text 988 (US) at any time to talk to someone. If you are in danger right now,
                              call your local emergency number.
                            </Trans>
                          </Text>
                          <Text class="label" size="small">
                            {new Date(w.created_at).toLocaleString()}
                          </Text>
                        </CrisisCard>
                      </Show>
                    )}
                  </For>
                </Column>

                <Show
                  when={canDismiss()}
                  fallback={
                    <Text
                      class="label"
                      size="small"
                    >
                      <Trans>You can dismiss this in {countdown()} seconds</Trans>
                    </Text>
                  }
                >
                  <Button onPress={() => dismiss()}>
                    <Trans>I understand, dismiss</Trans>
                  </Button>
                </Show>
              </Show>
            </Column>
          </Modal>
        </Overlay>
      </Portal>
    </Show>
  );
}

const Overlay = styled("div", {
  base: {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0, 0, 0, 0.6)",
    zIndex: 99999,
  },
});

const Modal = styled("div", {
  base: {
    maxWidth: "500px",
    width: "90%",
    padding: "var(--gap-xl)",
    background: "var(--md-sys-color-surface-container-high)",
    borderRadius: "var(--borderRadius-lg)",
  },
});

const Header = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    gap: "var(--gap-md)",
  },
});

const WarningCard = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--gap-xs)",
    padding: "var(--gap-md)",
    background: "var(--md-sys-color-error-container)",
    color: "#fff",
    borderRadius: "var(--borderRadius-sm)",
  },
});

/** Support notice. Calm colours, since it is help and not a penalty. */
const CrisisCard = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--gap-xs)",
    padding: "var(--gap-md)",
    background: "var(--md-sys-color-secondary-container)",
    color: "var(--md-sys-color-on-secondary-container)",
    borderRadius: "var(--borderRadius-sm)",
  },
});

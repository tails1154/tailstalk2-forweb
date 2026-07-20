import { Show, createSignal, onMount } from "solid-js";
import { Portal } from "solid-js/web";

import { styled } from "styled-system/jsx";

import MdWarning from "@material-design-icons/svg/outlined/warning.svg?component-solid";
import MdBlock from "@material-design-icons/svg/outlined/block.svg?component-solid";

import { useClient } from "@revolt/client";
import { Button, Column, Text, iconSize, typography } from "@revolt/ui";

interface WarningItem {
  reason: string;
  created_at: string;
}

export function WarningOverlay() {
  const client = useClient();
  const [warnings, setWarnings] = createSignal<WarningItem[]>([]);
  const [visible, setVisible] = createSignal(false);
  const [countdown, setCountdown] = createSignal(5);
  const [canDismiss, setCanDismiss] = createSignal(false);
  const [isSuspended, setIsSuspended] = createSignal(false);
  const [suspendedUntil, setSuspendedUntil] = createSignal("");

  onMount(async () => {
    const user = client().user;
    if (user?.suspendedUntil) {
      const until = user.suspendedUntil;
      const untilDate = new Date(until);
      if (untilDate.getTime() > Date.now()) {
        setIsSuspended(true);
        setSuspendedUntil(untilDate.toLocaleString());
        setVisible(true);
        return;
      }
    }

    try {
      const res = await client().api.get("/users/@me/warnings");
      if (res.warnings?.length > 0) {
        setWarnings(res.warnings);
        setVisible(true);
        startCountdown();
      }
    } catch {}
  });

  function startCountdown() {
    let remaining = 5;
    setCountdown(remaining);
    const interval = setInterval(() => {
      remaining--;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setCanDismiss(true);
      }
    }, 1000);
  }

  function dismiss() {
    if (!canDismiss()) return;
    setVisible(false);
  }

  return (
    <Show when={visible()}>
      <Portal mount={document.getElementById("floating") ?? document.body}>
        <Overlay>
          <Modal>
            <Column gap="md">
              <Header>
                <Show
                  when={isSuspended()}
                  fallback={<MdWarning {...iconSize(28)} style={{ color: "var(--md-sys-color-error)" }} />}
                >
                  <MdBlock {...iconSize(28)} style={{ color: "var(--md-sys-color-error)" }} />
                </Show>
                <Text class={typography({ class: "title", size: "medium" })}>
                  {isSuspended() ? "Account Suspended" : "Account Warning"}
                </Text>
              </Header>
              <Show when={isSuspended()}>
                <Column gap="sm">
                  <WarningCard>
                    <Text class={typography({ class: "body", size: "small" })}>
                      Your account has been suspended until {suspendedUntil()}.
                    </Text>
                  </WarningCard>
                  <Text
                    class={typography({ class: "body", size: "small" })}
                    style={{ color: "var(--md-sys-color-error)", textAlign: "center", fontWeight: 600 }}
                  >
                    Do not create another account.
                  </Text>
                  <Text
                    class={typography({ class: "label", size: "small" })}
                    style={{ color: "var(--md-sys-color-on-surface-variant)", textAlign: "center" }}
                  >
                    You cannot perform any actions while suspended.
                  </Text>
                </Column>
              </Show>
              <Show when={!isSuspended()}>
                <Column gap="sm">
                  <For each={warnings()}>
                    {(w) => (
                      <WarningCard>
                        <Text class={typography({ class: "body", size: "small" })}>
                          {w.reason}
                        </Text>
                        <Text
                          class={typography({ class: "label", size: "small" })}
                          style={{ color: "var(--md-sys-color-on-surface-variant)" }}
                        >
                          {new Date(w.created_at).toLocaleString()}
                        </Text>
                      </WarningCard>
                    )}
                  </For>
                </Column>
                <Show
                  when={canDismiss()}
                  fallback={
                    <Text
                      class={typography({ class: "label", size: "small" })}
                      style={{ color: "var(--md-sys-color-on-surface-variant)", textAlign: "center" }}
                    >
                      You can dismiss this warning in {countdown()} seconds
                    </Text>
                  }
                >
                  <Button onPress={dismiss}>
                    I understand, dismiss
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
    padding: "var(--gap-md)",
    background: "var(--md-sys-color-error-container)",
    borderRadius: "var(--borderRadius-sm)",
  },
});

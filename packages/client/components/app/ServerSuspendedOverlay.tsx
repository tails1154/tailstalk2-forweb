import { createEffect, createSignal, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";

import { Trans } from "@lingui-solid/solid/macro";
import MdWarning from "@material-design-icons/svg/round/warning.svg?component-solid";
import { styled } from "styled-system/jsx";

import { useClient } from "@revolt/client";
import { useSmartParams } from "@revolt/routing";
import { Button, Text, iconSize } from "@revolt/ui";

/** Blocks a suspended server while preserving the mature-content warning treatment. */
export function ServerSuspendedOverlay() {
  const client = useClient();
  const params = useSmartParams();
  const [visible, setVisible] = createSignal(false);

  createEffect(() => {
    const serverId = params().serverId;
    setVisible(false);
    if (!serverId) return;

    let cancelled = false;
    client()
      .api.get(`/servers/${serverId}`, { include_channels: false })
      .catch((error: unknown) => {
        if (!cancelled && (error as { type?: string })?.type === "ServerSuspended") {
          setVisible(true);
        }
      });

    onCleanup(() => {
      cancelled = true;
    });
  });

  return (
    <Portal mount={document.getElementById("floating") ?? document.body}>
      {visible() && (
        <Base>
          <MdWarning {...iconSize("8em")} />
          <Text class="headline" size="large">
            <Trans>This server is suspended.</Trans>
          </Text>
          <Actions>
            <Button variant="filled" onPress={() => history.back()}>
              <Trans>Back</Trans>
            </Button>
          </Actions>
        </Base>
      )}
    </Portal>
  );
}

const Base = styled("div", {
  base: {
    position: "fixed",
    inset: 0,
    zIndex: 100000,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "var(--gap-lg)",
    userSelect: "none",
    overflowY: "auto",
    color: "var(--md-sys-color-on-surface)",
    background: "var(--md-sys-color-surface-container-low)",
    gap: "var(--gap-md)",
    "& svg": { fill: "orange" },
  },
});

const Actions = styled("div", {
  base: {
    display: "flex",
    marginTop: "var(--gap-lg)",
    gap: "var(--gap-lg)",
  },
});

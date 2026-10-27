import { createSignal, onMount, Show } from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";
import { useNavigate, useParams } from "@solidjs/router";

import { useClient } from "@revolt/client";
import { Dialog, Text } from "@revolt/ui";

export function GiftRedeem() {
  const client = useClient();
  const navigate = useNavigate();
  const params = useParams<{ giftId: string }>();
  const [status, setStatus] = createSignal<
    "ready" | "loading" | "success" | "error"
  >("ready");

  onMount(() => {
    document.title = "TailsTalk 2";
  });

  const close = () => navigate("/app");

  async function redeem() {
    setStatus("loading");
    try {
      await client().api.post(`/gifts/${encodeURIComponent(params.giftId)}`);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <Dialog
      show
      onClose={close}
      title={<Trans>Redeem TailsTalk 2 Premium</Trans>}
      isDisabled={status() === "loading"}
      actions={
        status() === "success"
          ? [{ text: <Trans>Return to TailsTalk 2</Trans>, onClick: close }]
          : [
              { text: <Trans>Not now</Trans>, onClick: close },
              {
                text: <Trans>Redeem</Trans>,
                onClick: redeem,
                isDisabled: status() === "loading",
              },
            ]
      }
    >
      <Show when={status() === "success"}>
        <Trans>You now have TailsTalk 2 Premium and its Premium benefits.</Trans>
      </Show>
      <Show when={status() === "error"}>
        <Text style={{ color: "var(--md-sys-color-error)" }}>
          <Trans>This gift is invalid, expired, or already redeemed.</Trans>
        </Text>
      </Show>
      <Show when={status() === "ready" || status() === "loading"}>
        <Trans>
          Redeem this one-time gift to receive TailsTalk 2 Premium and its
          Premium benefits immediately.
        </Trans>
      </Show>
    </Dialog>
  );
}

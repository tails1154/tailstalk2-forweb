import { Show, createSignal } from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";

import { Button, Column, Dialog, DialogProps, Text } from "@revolt/ui";

import { Modals } from "../types";

/**
 * Choose which project's source code to view.
 */
export function SourceCodeModal(
  props: DialogProps & Modals & { type: "source_code" },
) {
  const [step, setStep] = createSignal<"choice" | "tailstalk">("choice");

  function openRepository(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
    props.onClose();
  }

  return (
    <Dialog
      show={props.show}
      onClose={props.onClose}
      title={<Trans>Source Code</Trans>}
      actions={[{ text: <Trans>Close</Trans> }]}
    >
      <Column gap="md">
        <Show
          when={step() === "choice"}
          fallback={
            <>
              <Text>
                <Trans>Do you want to view the backend or frontend code?</Trans>
              </Text>
              <Button
                onPress={() =>
                  openRepository(
                    "https://github.com/tails1154/tailstalk2-backend",
                  )
                }
              >
                <Trans>View backend source code</Trans>
              </Button>
              <Button
                onPress={() =>
                  openRepository(
                    "https://github.com/tails1154/tailstalk2-forweb",
                  )
                }
              >
                <Trans>View frontend source code</Trans>
              </Button>
              <Button variant="tonal" onPress={() => setStep("choice")}>
                <Trans>Back</Trans>
              </Button>
            </>
          }
        >
          <Text>
            <Trans>
              Do you want to view Stoat or TailsTalk 2's source code?
            </Trans>
          </Text>
          <Button
            onPress={() => openRepository("https://github.com/stoatchat")}
          >
            <Trans>View Stoat source code</Trans>
          </Button>
          <Button onPress={() => setStep("tailstalk")}>
            <Trans>View TailsTalk 2 source code</Trans>
          </Button>
        </Show>
      </Column>
    </Dialog>
  );
}

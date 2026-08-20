import { For, Show } from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";
import { Server } from "stoat.js";

import { Column, Dialog, DialogProps, Text } from "@revolt/ui";

import { Modals } from "../types";

export function ServerOnboardingModal(
  props: DialogProps & Modals & { type: "server_onboarding" },
) {
  const rules = () => props.onboarding.rules.split(/\r?\n/).filter(Boolean);
  return (
    <Dialog
      show={props.show}
      onClose={props.onClose}
      title={props.onboarding.title || props.server.name}
      actions={[{ text: <Trans>Continue</Trans> }]}
    >
      <Column gap="md">
        <Show when={props.onboarding.message}>
          <Text>{props.onboarding.message}</Text>
        </Show>
        <Show when={rules().length}>
          <Text class="title" size="medium"><Trans>Server rules</Trans></Text>
          <For each={rules()}>{(rule) => <Text>• {rule}</Text>}</For>
        </Show>
      </Column>
    </Dialog>
  );
}

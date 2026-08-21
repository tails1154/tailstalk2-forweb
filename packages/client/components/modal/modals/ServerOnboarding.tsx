import { For, Show, createSignal } from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";
import { Server } from "stoat.js";

import { Checkbox, Column, Dialog, DialogProps, Text } from "@revolt/ui";
import { useClient } from "@revolt/client";
import { useMutation } from "@tanstack/solid-query";
import { useModals } from "..";

import { Modals } from "../types";

export function ServerOnboardingModal(
  props: DialogProps & Modals & { type: "server_onboarding" },
) {
  const client = useClient();
  const { showError } = useModals();
  const [answers, setAnswers] = createSignal<Record<string, string[]>>({});
  const rules = () => props.onboarding.rules.split(/\r?\n/).filter(Boolean);
  const questions = () => props.onboarding.questions ?? [];

  const complete = useMutation(() => ({
    mutationFn: () =>
      client().api.post(
        `/servers/${props.server.id}/onboarding/complete` as never,
        { answers: answers() } as never,
      ),
    onSuccess: () => {
      props.onComplete?.();
      props.onClose();
    },
    onError: showError,
  }));

  function select(questionId: string, optionId: string, multiple: boolean) {
    const current = answers()[questionId] ?? [];
    const next = current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : multiple
        ? [...current, optionId]
        : [optionId];
    setAnswers({ ...answers(), [questionId]: next });
  }

  return (
    <Dialog
      show={props.show}
      onClose={props.onClose}
      title={props.onboarding.title || props.server.name}
      actions={[{ text: <Trans>Continue</Trans>, onClick: () => complete.mutateAsync().then(() => undefined) }]}
      isDisabled={complete.isPending}
    >
      <Column gap="md">
        <Show when={props.onboarding.message}>
          <Text>{props.onboarding.message}</Text>
        </Show>
        <Show when={rules().length}>
          <Text class="title" size="medium"><Trans>Server rules</Trans></Text>
          <For each={rules()}>{(rule) => <Text>• {rule}</Text>}</For>
        </Show>
        <For each={questions()}>
          {(question) => (
            <Column gap="sm">
              <Text class="title" size="medium">{question.prompt}</Text>
              <For each={question.options}>
                {(option) => (
                  <Checkbox
                    checked={answers()[question.id]?.includes(option.id) ?? false}
                    onChange={() => select(question.id, option.id, question.multiple)}
                  >
                    {option.label}
                  </Checkbox>
                )}
              </For>
            </Column>
          )}
        </For>
      </Column>
    </Dialog>
  );
}

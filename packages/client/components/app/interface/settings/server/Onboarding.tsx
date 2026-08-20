import { createFormControl, createFormGroup } from "solid-forms";
import { Show, createEffect } from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";

import { useClient } from "@revolt/client";
import { CircularProgress, Column, Form2, Row, Text } from "@revolt/ui";
import { useMutation, useQuery } from "@tanstack/solid-query";

import { ServerSettingsProps } from "../ServerSettings";

type ServerOnboarding = {
  enabled: boolean;
  title: string;
  message: string;
  rules: string;
};

export default function ServerOnboardingSettings(props: ServerSettingsProps) {
  const { t } = useLingui();
  const client = useClient();
  const path = `/servers/${props.server.id}/onboarding`;
  const settings = useQuery(() => ({
    queryKey: ["server-onboarding", props.server.id],
    queryFn: () => client().api.get(path) as Promise<ServerOnboarding>,
  }));
  const group = createFormGroup({
    enabled: createFormControl(false),
    title: createFormControl(""),
    message: createFormControl(""),
    rules: createFormControl(""),
  });

  createEffect(() => {
    const value = settings.data;
    if (value && !group.isDirty) {
      group.controls.enabled.setValue(value.enabled);
      group.controls.title.setValue(value.title);
      group.controls.message.setValue(value.message);
      group.controls.rules.setValue(value.rules);
    }
  });

  const save = useMutation(() => ({
    mutationFn: () =>
      client().api.patch(path, {
        enabled: group.controls.enabled.value,
        title: group.controls.title.value.trim(),
        message: group.controls.message.value.trim(),
        rules: group.controls.rules.value.trim(),
      }),
    onSuccess: () => group.markAsPristine(),
  }));

  function reset() {
    const value = settings.data;
    group.controls.enabled.setValue(value?.enabled ?? false);
    group.controls.title.setValue(value?.title ?? "");
    group.controls.message.setValue(value?.message ?? "");
    group.controls.rules.setValue(value?.rules ?? "");
  }

  const submit = Form2.useSubmitHandler(group, () => save.mutateAsync(), reset);

  return (
    <Column gap="xl">
      <Column gap="sm">
        <Text class="title" size="large"><Trans>Server onboarding</Trans></Text>
        <Text><Trans>Show new members a welcome message and server rules when they first join.</Trans></Text>
      </Column>
      <Show when={!settings.isPending} fallback={<CircularProgress />}>
        <form onSubmit={submit}>
          <Column gap="lg">
            <Form2.Checkbox control={group.controls.enabled}>
              <Trans>Enable server onboarding</Trans>
            </Form2.Checkbox>
            <Form2.TextField name="onboarding-title" control={group.controls.title} label={t`Welcome title`} maxlength={80} />
            <Form2.TextField name="onboarding-message" control={group.controls.message} label={t`Welcome message`} rows={4} maxlength={2000} />
            <Form2.TextField name="onboarding-rules" control={group.controls.rules} label={t`Server rules`} rows={6} maxlength={5000} />
            <Row>
              <Form2.Reset group={group} onReset={reset} />
              <Form2.Submit group={group} requireDirty><Trans>Save</Trans></Form2.Submit>
              <Show when={save.isPending}><CircularProgress /></Show>
            </Row>
          </Column>
        </form>
      </Show>
    </Column>
  );
}

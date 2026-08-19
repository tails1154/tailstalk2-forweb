import { createFormControl, createFormGroup } from "solid-forms";
import { Show, createEffect } from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";

import { useClient } from "@revolt/client";
import {
  CircularProgress,
  Column,
  Form2,
  Row,
  Text,
} from "@revolt/ui";
import { useMutation, useQuery } from "@tanstack/solid-query";

import { ServerSettingsProps } from "../ServerSettings";

type XPSettings = {
  enabled: boolean;
  xp_per_message: number;
};

export default function ServerXPSettings(props: ServerSettingsProps) {
  const { t } = useLingui();
  const client = useClient();
  const path = `/servers/${props.server.id}/xp`;

  const settings = useQuery(() => ({
    queryKey: ["server-xp", props.server.id],
    queryFn: () => client().api.get(path) as Promise<XPSettings>,
  }));

  const editGroup = createFormGroup({
    enabled: createFormControl(true),
    xpPerMessage: createFormControl(5),
  });

  createEffect(() => {
    const value = settings.data;
    if (value && !editGroup.isDirty) {
      editGroup.controls.enabled.setValue(value.enabled);
      editGroup.controls.xpPerMessage.setValue(value.xp_per_message);
    }
  });

  const save = useMutation(() => ({
    mutationFn: () =>
      client().api.patch(path, {
        enabled: editGroup.controls.enabled.value,
        xp_per_message: Number(editGroup.controls.xpPerMessage.value),
      }),
    onSuccess: () => editGroup.markAsPristine(),
  }));

  function onReset() {
    const value = settings.data;
    editGroup.controls.enabled.setValue(value?.enabled ?? true);
    editGroup.controls.xpPerMessage.setValue(value?.xp_per_message ?? 5);
  }

  const submit = Form2.useSubmitHandler(editGroup, () => save.mutateAsync(), onReset);

  return (
    <Column gap="xl">
      <Column gap="sm">
        <Text class="title" size="large">
          <Trans>Experience points</Trans>
        </Text>
        <Text>
          <Trans>Reward members with XP when they send messages in this server.</Trans>
        </Text>
      </Column>
      <Show when={!settings.isPending} fallback={<CircularProgress />}>
        <form onSubmit={submit}>
          <Column gap="lg">
            <Form2.Checkbox control={editGroup.controls.enabled}>
              <Trans>Enable server XP</Trans>
            </Form2.Checkbox>
            <Form2.TextField
              type="number"
              min={0}
              max={20}
              name="xp-per-message"
              control={editGroup.controls.xpPerMessage}
              label={t`XP per message`}
              description={t`Choose how much XP a member earns for each message.`}
            />
            <Row>
              <Form2.Reset group={editGroup} onReset={onReset} />
              <Form2.Submit group={editGroup} requireDirty>
                <Trans>Save</Trans>
              </Form2.Submit>
              <Show when={save.isPending}>
                <CircularProgress />
              </Show>
            </Row>
          </Column>
        </form>
      </Show>
    </Column>
  );
}

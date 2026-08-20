import { createFormControl, createFormGroup } from "solid-forms";
import { Show, createEffect } from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";

import { useClient } from "@revolt/client";
import { CircularProgress, Column, Form2, Row, Text } from "@revolt/ui";
import { useMutation, useQuery } from "@tanstack/solid-query";

import { ServerSettingsProps } from "../ServerSettings";

type Page = { enabled: boolean; title: string; description: string; links: { label: string; url: string }[] };

export default function ServerPageSettings(props: ServerSettingsProps) {
  const { t } = useLingui();
  const client = useClient();
  const path = `/servers/${props.server.id}/page`;
  const page = useQuery(() => ({ queryKey: ["server-page", props.server.id], queryFn: () => client().api.get(path) as Promise<Page> }));
  const group = createFormGroup({ enabled: createFormControl(false), title: createFormControl(""), description: createFormControl(""), links: createFormControl("") });

  createEffect(() => {
    if (page.data && !group.isDirty) {
      group.controls.enabled.setValue(page.data.enabled);
      group.controls.title.setValue(page.data.title);
      group.controls.description.setValue(page.data.description);
      group.controls.links.setValue(page.data.links.map((link) => `${link.label}|${link.url}`).join("\n"));
    }
  });

  const save = useMutation(() => ({
    mutationFn: () => client().api.patch(path, {
      enabled: group.controls.enabled.value,
      title: group.controls.title.value.trim(),
      description: group.controls.description.value.trim(),
      links: group.controls.links.value.split(/\r?\n/).filter(Boolean).map((line) => {
        const [label, ...url] = line.split("|");
        return { label: label.trim(), url: url.join("|").trim() };
      }),
    }),
    onSuccess: () => group.markAsPristine(),
  }));

  const reset = () => {
    group.controls.enabled.setValue(page.data?.enabled ?? false);
    group.controls.title.setValue(page.data?.title ?? "");
    group.controls.description.setValue(page.data?.description ?? "");
    group.controls.links.setValue(page.data?.links.map((link) => `${link.label}|${link.url}`).join("\n") ?? "");
  };
  const submit = Form2.useSubmitHandler(group, () => save.mutateAsync(), reset);

  return <Column gap="xl">
    <Column gap="sm"><Text class="title" size="large"><Trans>Custom server page</Trans></Text><Text><Trans>Create a public landing page for your server with a description and useful links.</Trans></Text></Column>
    <Show when={!page.isPending} fallback={<CircularProgress />}>
      <form onSubmit={submit}><Column gap="lg">
        <Form2.Checkbox control={group.controls.enabled}><Trans>Enable public server page</Trans></Form2.Checkbox>
        <Form2.TextField name="page-title" control={group.controls.title} label={t`Page title`} maxlength={120} />
        <Form2.TextField name="page-description" control={group.controls.description} label={t`Page description`} rows={5} maxlength={2000} />
        <Form2.TextField name="page-links" control={group.controls.links} label={t`Links`} rows={5} helper={t`One link per line in the format Label|https://example.com`} />
        <Row><Form2.Reset group={group} onReset={reset} /><Form2.Submit group={group} requireDirty><Trans>Save</Trans></Form2.Submit><Show when={save.isPending}><CircularProgress /></Show></Row>
      </Column></form>
    </Show>
  </Column>;
}

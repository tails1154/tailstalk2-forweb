import { For, Show, createSignal, onMount } from "solid-js";
import { styled } from "styled-system/jsx";

import { Trans, useLingui } from "@lingui-solid/solid/macro";

import { useClient } from "@revolt/client";
import { requestClientJson } from "../../../../client/customApi";
import { useModals } from "@revolt/modal";
import { Button, Column, CircularProgress, Text } from "@revolt/ui";

interface FeatureRequest {
  id: string;
  title: string;
  body: string;
  author_name: string;
  status: "pending" | "approved" | "denied";
  admin_response: string;
}

function statusLabel(status: FeatureRequest["status"]) {
  switch (status) {
    case "approved":
      return <Trans>Approved</Trans>;
    case "denied":
      return <Trans>Denied</Trans>;
    default:
      return <Trans>Pending review</Trans>;
  }
}

export function FeatureRequests() {
  const client = useClient();
  const { t } = useLingui();
  const { openModal } = useModals();
  const [requests, setRequests] = createSignal<FeatureRequest[]>([]);
  const [title, setTitle] = createSignal("");
  const [body, setBody] = createSignal("");
  const [loading, setLoading] = createSignal(true);
  const [submitting, setSubmitting] = createSignal(false);
  const [status, setStatus] = createSignal<string>();

  const load = async () => {
    setLoading(true);
    try {
      const data = (await client().api.get("/feature-requests")) as FeatureRequest[];
      setRequests(data);
      const response = data.find(
        (request) =>
          request.status !== "pending" &&
          !localStorage.getItem(`feature-request-response:${request.id}:${request.status}`),
      );
      if (response) {
        localStorage.setItem(
          `feature-request-response:${response.id}:${response.status}`,
          "shown",
        );
        openModal({ type: "feature_request_response", request: response });
      }
    } catch {
      setStatus(t`Unable to load feature requests right now.`);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => void load());

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (!title().trim() || !body().trim()) return;
    setSubmitting(true);
    try {
      const request = await requestClientJson<FeatureRequest>(client().api, "POST", "/feature-requests", {
        title: title().trim(),
        body: body().trim(),
      });
      setRequests((current) => [request, ...current]);
      setTitle("");
      setBody("");
      setStatus(t`Feature request submitted for review.`);
    } catch {
      setStatus(t`Unable to submit this feature request right now.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Column gap="lg">
      <Column gap="xs">
        <Text class="headline" size="small"><Trans>Feature request forum</Trans></Text>
        <Text class="body" size="medium">
          <Trans>Suggest ideas for TailsTalk 2 and track their review status.</Trans>
        </Text>
      </Column>
      <Form onSubmit={submit}>
        <Column gap="sm">
          <Text class="title" size="small"><Trans>Request a feature</Trans></Text>
          <Input
            required
            maxlength="120"
            placeholder={t`Feature title`}
            value={title()}
            onInput={(event) => setTitle(event.currentTarget.value)}
          />
          <Textarea
            required
            maxlength="4000"
            placeholder={t`Describe the feature you would like to see.`}
            value={body()}
            onInput={(event) => setBody(event.currentTarget.value)}
          />
          <Button type="submit" isDisabled={submitting()}>
            <Trans>Submit request</Trans>
          </Button>
        </Column>
      </Form>
      <Show when={status()}><Status>{status()}</Status></Show>
      <Show when={!loading()} fallback={<CircularProgress />}>
        <Column gap="sm">
          <Text class="title" size="small"><Trans>Your requests</Trans></Text>
          <Show when={requests().length > 0} fallback={<Text><Trans>You have not submitted any feature requests yet.</Trans></Text>}>
            <For each={requests()}>
              {(request) => (
                <RequestCard>
                  <Text class="title" size="medium">{request.title}</Text>
                  <Text class="body" size="small">{request.body}</Text>
                  <Text class="label" size="small">{statusLabel(request.status)}</Text>
                </RequestCard>
              )}
            </For>
          </Show>
        </Column>
      </Show>
    </Column>
  );
}

const Form = styled("form", { base: { width: "100%" } });
const Input = styled("input", { base: { width: "100%", padding: "var(--gap-md)", borderRadius: "var(--borderRadius-md)", border: "1px solid var(--md-sys-color-outline-variant)", background: "var(--md-sys-color-surface-container)", color: "var(--md-sys-color-on-surface)" } });
const Textarea = styled("textarea", { base: { width: "100%", minHeight: "120px", padding: "var(--gap-md)", borderRadius: "var(--borderRadius-md)", border: "1px solid var(--md-sys-color-outline-variant)", background: "var(--md-sys-color-surface-container)", color: "var(--md-sys-color-on-surface)", resize: "vertical" } });
const RequestCard = styled("article", { base: { display: "flex", flexDirection: "column", gap: "var(--gap-xs)", padding: "var(--gap-md)", borderRadius: "var(--borderRadius-md)", background: "var(--md-sys-color-surface-container)" } });
const Status = styled("div", { base: { padding: "var(--gap-md)", borderRadius: "var(--borderRadius-md)", background: "var(--md-sys-color-primary-container)", color: "var(--md-sys-color-on-primary-container)" } });

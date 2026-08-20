import { JSX, Show } from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";

import { useClient } from "@revolt/client";
import { CircularProgress, Column, Row, Text } from "@revolt/ui";
import { useQuery } from "@tanstack/solid-query";

import { ServerSettingsProps } from "../ServerSettings";

type ServerAnalytics = {
  member_count: number;
  channel_count: number;
  message_count: number;
};

export default function ServerAnalyticsSettings(props: ServerSettingsProps) {
  const client = useClient();
  const analytics = useQuery(() => ({
    queryKey: ["server-analytics", props.server.id],
    queryFn: () =>
      client().api.get(`/servers/${props.server.id}/analytics`) as Promise<ServerAnalytics>,
  }));

  return (
    <Column gap="xl">
      <Column gap="sm">
        <Text class="title" size="large">
          <Trans>Server analytics</Trans>
        </Text>
        <Text>
          <Trans>See an overview of activity and membership in your server.</Trans>
        </Text>
      </Column>
      <Show when={!analytics.isPending} fallback={<CircularProgress />}>
        <Row gap="lg" wrap>
          <Metric label={<Trans>Members</Trans>} value={analytics.data?.member_count ?? 0} />
          <Metric label={<Trans>Channels</Trans>} value={analytics.data?.channel_count ?? 0} />
          <Metric label={<Trans>Total messages</Trans>} value={analytics.data?.message_count ?? 0} />
        </Row>
      </Show>
    </Column>
  );
}

function Metric(props: { label: JSX.Element; value: number }) {
  return (
    <Column gap="xs">
      <Text class="title" size="large">{props.value.toLocaleString()}</Text>
      <Text>{props.label}</Text>
    </Column>
  );
}

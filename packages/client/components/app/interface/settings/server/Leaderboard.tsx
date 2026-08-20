import { For, Show } from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";

import { useClient } from "@revolt/client";
import { CircularProgress, Column, Row, Text } from "@revolt/ui";
import { useQuery } from "@tanstack/solid-query";

import { ServerSettingsProps } from "../ServerSettings";

type Entry = { rank: number; user_id: string; xp: number; level: number };

export default function ServerLeaderboard(props: ServerSettingsProps) {
  const client = useClient();
  const leaderboard = useQuery(() => ({
    queryKey: ["server-xp-leaderboard", props.server.id],
    queryFn: () => client().api.get(`/servers/${props.server.id}/xp/leaderboard`) as Promise<Entry[]>,
  }));

  return (
    <Column gap="xl">
      <Column gap="sm">
        <Text class="title" size="large"><Trans>XP leaderboard</Trans></Text>
        <Text><Trans>See which members have earned the most XP in this server.</Trans></Text>
      </Column>
      <Show when={!leaderboard.isPending} fallback={<CircularProgress />}>
        <Show when={leaderboard.data?.length} fallback={<Text><Trans>No XP has been earned yet.</Trans></Text>}>
          <Column gap="sm">
            <For each={leaderboard.data}>
              {(entry) => {
                const member = () => client().users.get(entry.user_id);
                return (
                  <Row justify="space-between">
                    <Text>#{entry.rank} {member()?.username ?? entry.user_id}</Text>
                    <Text>{entry.xp} XP · <Trans>Level</Trans> {entry.level}</Text>
                  </Row>
                );
              }}
            </For>
          </Column>
        </Show>
      </Show>
    </Column>
  );
}

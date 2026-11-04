import { For, Show } from "solid-js";
import { Trans, useLingui } from "@lingui-solid/solid/macro";
import { useClient } from "@revolt/client";
import { Avatar, CircularProgress, Column, Row, Text } from "@revolt/ui";
import { useQuery } from "@tanstack/solid-query";
import { ServerSettingsProps } from "../ServerSettings";

type AuditEntry = { id: string; user: string; reason?: string; action: { type?: string; [key: string]: unknown } };
type AuditUser = { id?: string; _id?: string; username: string; avatar?: { _id?: string } };
type AuditResponse = { audit_logs: AuditEntry[]; users: AuditUser[] };

export default function ServerAuditLog(props: ServerSettingsProps) {
  const { t } = useLingui();
  const client = useClient();
  const query = useQuery(() => ({ queryKey: ["server-audit-log", props.server.id], queryFn: () => client().api.get(`/servers/${props.server.id}/audit_logs`, { limit: 100, include_users: true }) as Promise<AuditResponse> }));
  const nameFor = (id: string) => query.data?.users.find((user) => (user.id ?? user._id) === id)?.username ?? id;

  return <Column gap="xl">
    <Column gap="sm"><Text class="title" size="large"><Trans>Moderation audit timeline</Trans></Text><Text><Trans>Review server changes and moderation actions in reverse chronological order.</Trans></Text></Column>
    <Show when={!query.isPending} fallback={<CircularProgress />}>
      <Show when={query.data?.audit_logs.length} fallback={<Text><Trans>No audit events yet.</Trans></Text>}>
        <Column gap="md"><For each={query.data?.audit_logs}>{(entry) => <Row gap="md" align="start"><Avatar fallback={nameFor(entry.user)} size={36} /><Column gap="xs"><Text><strong>{nameFor(entry.user)}</strong> {entry.action.type ?? t`changed something`}</Text><Text size="small">{entry.reason ?? t`No reason provided.`}</Text><Text size="small">{entry.id}</Text></Column></Row>}</For></Column>
      </Show>
    </Show>
  </Column>;
}

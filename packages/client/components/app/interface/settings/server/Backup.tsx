import { Show, createSignal } from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";

import { useClient } from "@revolt/client";
import { requestClientJson } from "../../../../client/customApi";
import { Button, Column, Text, useSnackbar } from "@revolt/ui";

import { ServerSettingsProps } from "../ServerSettings";

export default function ServerBackupSettings(props: ServerSettingsProps) {
  const { t } = useLingui();
  const client = useClient();
  const snackbar = useSnackbar();
  const [busy, setBusy] = createSignal(false);

  async function exportBackup() {
    setBusy(true);
    try {
      const backup = await client().api.get(`/servers/${props.server.id}/backup`);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${props.server.name.replace(/[^a-z0-9-_]/gi, "-")}.tt2`;
      link.click();
      URL.revokeObjectURL(link.href);
      snackbar.show({ message: t`Server backup downloaded.`, placement: "bottom", closeable: true });
    } catch { snackbar.show({ message: t`Unable to create a server backup.`, placement: "bottom", closeable: true }); }
    finally { setBusy(false); }
  }

  async function restoreBackup(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await requestClientJson(client().api, "POST", `/servers/${props.server.id}/backup`, JSON.parse(await file.text()));
      snackbar.show({ message: t`Server backup restored.`, placement: "bottom", closeable: true });
    } catch { snackbar.show({ message: t`Unable to restore this server backup.`, placement: "bottom", closeable: true }); }
    finally { setBusy(false); }
  }

  return <Column gap="xl">
    <Column gap="sm"><Text class="title" size="large"><Trans>Server backup and restore</Trans></Text><Text><Trans>Export or restore server configuration, including roles, categories, channels, and permissions.</Trans></Text></Column>
    <Column gap="sm"><Show when={props.server.havePermission("BackupServer")}><Button onPress={exportBackup} isDisabled={busy()}><Trans>Download backup</Trans></Button></Show><Show when={props.server.havePermission("RestoreServer")}><Button onPress={() => document.getElementById(`server-backup-${props.server.id}`)?.click()} isDisabled={busy()}><Trans>Restore backup</Trans></Button><input id={`server-backup-${props.server.id}`} type="file" accept=".tt2,application/json" hidden onChange={restoreBackup} /></Show><Show when={busy()}><Text><Trans>Working…</Trans></Text></Show></Column>
  </Column>;
}

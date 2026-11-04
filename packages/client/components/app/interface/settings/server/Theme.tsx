import { createEffect, createSignal, Show } from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";
import { useClient } from "@revolt/client";
import { Button, CircularProgress, Column, Row, Text, TextField, useSnackbar } from "@revolt/ui";
import { useQuery } from "@tanstack/solid-query";

import { requestClientJson } from "../../../../client/customApi";
import { CustomTheme } from "@revolt/state/stores/Theme";
import { ServerSettingsProps } from "../ServerSettings";

type ServerThemeResponse = CustomTheme & { surface_high: string; on_surface: string };

function fromApi(theme: ServerThemeResponse): CustomTheme {
  return { ...theme, surfaceHigh: theme.surface_high, onSurface: theme.on_surface };
}

export default function ServerThemeSettings(props: ServerSettingsProps) {
  const { t } = useLingui();
  const client = useClient();
  const snackbar = useSnackbar();
  const [draft, setDraft] = createSignal<CustomTheme>();
  const [busy, setBusy] = createSignal(false);
  const query = useQuery(() => ({
    queryKey: ["server-theme", props.server.id],
    queryFn: () => requestClientJson<ServerThemeResponse | null>(client().api, "GET", `/servers/${props.server.id}/theme`),
  }));

  createEffect(() => {
    const existing = query.data;
    if (existing) setDraft(fromApi(existing));
  });

  const ensureDraft = () => draft() ?? {
    id: `server-${props.server.id}`,
    name: `${props.server.name} theme`,
    description: t`A theme for this server.`,
    primary: "#06b6d4",
    secondary: "#3b82f6",
    background: "#11131a",
    surface: "#1a1d2e",
    surfaceHigh: "#2c3254",
    onSurface: "#e2e8f0",
    gradient: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
  };

  async function save() {
    setBusy(true);
    try {
      const theme = ensureDraft();
      const response = await requestClientJson<ServerThemeResponse>(client().api, "PATCH", `/servers/${props.server.id}/theme`, {
        theme: { ...theme, surface_high: theme.surfaceHigh, on_surface: theme.onSurface },
      });
      setDraft(fromApi(response));
      snackbar.show({ message: t`Server theme saved.`, placement: "bottom", closeable: true });
    } catch {
      snackbar.show({ message: t`Unable to save the server theme right now.`, placement: "bottom", closeable: true });
    } finally { setBusy(false); }
  }

  async function reset() {
    setBusy(true);
    try {
      await requestClientJson(client().api, "PATCH", `/servers/${props.server.id}/theme`, { theme: null });
      setDraft(undefined);
      snackbar.show({ message: t`Server theme reset.`, placement: "bottom", closeable: true });
    } catch {
      snackbar.show({ message: t`Unable to reset the server theme right now.`, placement: "bottom", closeable: true });
    } finally { setBusy(false); }
  }

  return <Column gap="xl">
    <Column gap="sm"><Text class="title" size="large"><Trans>Custom server theme</Trans></Text><Text><Trans>Choose the colours everyone sees when they visit this server.</Trans></Text></Column>
    <Show when={!query.isPending} fallback={<CircularProgress />}>
      <Column gap="md">
        <TextField label={t`Theme name`} value={ensureDraft().name} onChange={(e) => setDraft({ ...ensureDraft(), name: e.currentTarget.value })} />
        <Row gap="md" wrap>
          {(["primary", "secondary", "background", "surface", "surfaceHigh", "onSurface"] as const).map((key) => <label style={{ display: "flex", "align-items": "center", gap: "8px" }}><span>{key}</span><input type="color" value={ensureDraft()[key]} onInput={(e) => setDraft({ ...ensureDraft(), [key]: e.currentTarget.value })} /></label>)}
        </Row>
        <Row gap="md"><Button variant="filled" isDisabled={busy()} onPress={() => void save()}><Trans>Save theme</Trans></Button><Button variant="outlined" isDisabled={busy()} onPress={() => void reset()}><Trans>Reset to default</Trans></Button></Row>
      </Column>
    </Show>
  </Column>;
}

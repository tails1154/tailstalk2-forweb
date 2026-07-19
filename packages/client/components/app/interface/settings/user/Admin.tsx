import { Show, createSignal } from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";
import { styled } from "styled-system/jsx";

import MdAdminPanelSettings from "@material-design-icons/svg/outlined/admin_panel_settings.svg?component-solid";

import { CONFIGURATION } from "@revolt/common";
import { Button, Column, Text, TextField, iconSize, typography } from "@revolt/ui";

export function AdminPanel() {
  const [password, setPassword] = createSignal("");
  const [authenticated, setAuthenticated] = createSignal(false);
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [serverTime, setServerTime] = createSignal("");

  async function authenticate() {
    setLoading(true);
    setError("");

    try {
      const credentials = btoa(`tails1154:${password()}`);
      const res = await fetch(`${CONFIGURATION.DEFAULT_API_URL}/admin`, {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setAuthenticated(true);
        setServerTime(data.server_time ?? "");
      } else {
        setError("Invalid admin password.");
      }
    } catch {
      setError("Network error. Could not reach the admin API.");
    } finally {
      setLoading(false);
      // Clear password from memory after use
      setPassword("");
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      authenticate();
    }
  }

  return (
    <Column gap="lg">
      <Show
        when={authenticated()}
        fallback={
          <Column gap="md">
            <Text class={typography({ class: "label", size: "large" })}>
              <Trans>Admin authentication required</Trans>
            </Text>
            <Column gap="sm">
              <TextField
                type="password"
                placeholder="Admin password"
                value={password()}
                onChange={(e) => setPassword(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                disabled={loading()}
              />
              <Button onPress={authenticate} disabled={loading()}>
                <Trans>Authenticate</Trans>
              </Button>
            </Column>
            <Show when={error()}>
              <Text
                class={typography({ class: "label" })}
                style={{ color: "var(--md-sys-color-error)" }}
              >
                {error()}
              </Text>
            </Show>
          </Column>
        }
      >
        <Column gap="md">
          <AdminHeader>
            <MdAdminPanelSettings {...iconSize(24)} />
            <Text class={typography({ class: "title", size: "large" })}>
              <Trans>Admin Panel</Trans>
            </Text>
          </AdminHeader>
          <Text class={typography({ class: "body" })}>
            <Trans>Welcome to the admin panel.</Trans>
          </Text>
          <Show when={serverTime()}>
            {(time) => (
              <Text class={typography({ class: "body" })}>
                Server time: {time()}
              </Text>
            )}
          </Show>
        </Column>
      </Show>
    </Column>
  );
}

const AdminHeader = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    gap: "var(--gap-md)",
  },
});

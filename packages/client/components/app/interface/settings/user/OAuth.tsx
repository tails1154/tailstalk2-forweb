import { For, Show, createResource, createSignal } from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";

import { useClient } from "@revolt/client";
import {
  Button,
  CategoryButton,
  Checkbox,
  CircularProgress,
  Column,
  Row,
  Text,
  TextField,
  iconSize,
  useSnackbar,
} from "@revolt/ui";

import MdApi from "@material-design-icons/svg/outlined/api.svg?component-solid";
import MdContentCopy from "@material-design-icons/svg/outlined/content_copy.svg?component-solid";
import MdDelete from "@material-design-icons/svg/outlined/delete.svg?component-solid";
import MdRefresh from "@material-design-icons/svg/outlined/refresh.svg?component-solid";

interface OAuthApplication {
  client_id: string;
  name: string;
  redirect_uris: string[];
  allowed_scopes: string[];
  public: boolean;
  revoked: boolean;
  created_at: string;
  client_secret?: string;
}

type OAuthApi = {
  get(path: string): Promise<unknown>;
  post(path: string, data?: unknown): Promise<unknown>;
};

const SCOPES = [
  ["identify", "Basic profile information"],
  ["servers", "Servers the user belongs to"],
  ["server_members", "Membership and roles"],
  ["permissions", "Effective server and channel permissions"],
] as const;

export function OAuthSettings() {
  const client = useClient();
  const api = () => client().api as unknown as OAuthApi;
  const snackbar = useSnackbar();
  const { t } = useLingui();
  const [applications, { refetch }] = createResource(
    () => api().get("/oauth/applications/@me") as Promise<OAuthApplication[]>,
  );
  const [name, setName] = createSignal("");
  const [redirectUri, setRedirectUri] = createSignal("");
  const [isPublic, setIsPublic] = createSignal(false);
  const [scopes, setScopes] = createSignal<string[]>(["identify"]);
  const [saving, setSaving] = createSignal(false);
  const [secret, setSecret] = createSignal<string>();

  const toggleScope = (scope: string, checked: boolean) => {
    setScopes((current) =>
      checked
        ? [...new Set([...current, scope])]
        : current.filter((value) => value !== scope),
    );
  };

  const copy = async (value: string, message: string) => {
    await navigator.clipboard.writeText(value);
    snackbar.show({ message, placement: "bottom", closeable: true });
  };

  const createApplication = async () => {
    if (!name().trim() || !redirectUri().trim() || scopes().length === 0) {
      snackbar.show({
        message: t`Enter an application name, redirect URI, and at least one scope.`,
        placement: "bottom",
        closeable: true,
      });
      return;
    }

    setSaving(true);
    try {
      const application = (await api().post("/oauth/applications", {
        name: name().trim(),
        redirect_uris: [redirectUri().trim()],
        allowed_scopes: scopes(),
        public: isPublic(),
      })) as OAuthApplication;
      setSecret(application.client_secret);
      setName("");
      setRedirectUri("");
      snackbar.show({
        message: t`OAuth application created. Save the secret now; it will not be shown again.`,
        placement: "bottom",
        closeable: true,
      });
      await refetch();
    } catch {
      snackbar.show({
        message: t`Could not create the OAuth application. Check the redirect URI and scopes.`,
        placement: "bottom",
        closeable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const rotateSecret = async (application: OAuthApplication) => {
    try {
      const updated = (await api().post(
        `/oauth/applications/${application.client_id}/rotate-secret`,
      )) as OAuthApplication;
      setSecret(updated.client_secret);
      snackbar.show({
        message: t`Secret rotated. Save the new secret now; it will not be shown again.`,
        placement: "bottom",
        closeable: true,
      });
    } catch {
      snackbar.show({
        message: t`Could not rotate this application's secret.`,
        placement: "bottom",
        closeable: true,
      });
    }
  };

  const revoke = async (application: OAuthApplication) => {
    if (!window.confirm(t`Revoke this OAuth application and all of its tokens?`)) return;
    try {
      await api().post(`/oauth/applications/${application.client_id}/revoke`);
      snackbar.show({
        message: t`OAuth application revoked.`,
        placement: "bottom",
        closeable: true,
      });
      await refetch();
    } catch {
      snackbar.show({
        message: t`Could not revoke this OAuth application.`,
        placement: "bottom",
        closeable: true,
      });
    }
  };

  return (
    <Column gap="lg">
      <Column gap="sm">
        <Text class="headline">
          <Trans>OAuth Applications</Trans>
        </Text>
        <Text>
          <Trans>
            Create applications that can securely connect to TailsTalk 2 using OAuth 2.1.
          </Trans>
        </Text>
      </Column>

      <CategoryButton.Group>
        <TextField
          label={t`Application name`}
          value={name()}
          onInput={(event) => setName(event.currentTarget.value)}
        />
        <TextField
          label={t`Exact HTTPS redirect URI`}
          placeholder="https://example.com/auth/callback"
          value={redirectUri()}
          onInput={(event) => setRedirectUri(event.currentTarget.value)}
        />
        <Column gap="xs">
          <Text class="label"><Trans>Allowed scopes</Trans></Text>
          <For each={SCOPES}>
            {([scope, description]) => (
              <Checkbox
                checked={scopes().includes(scope)}
                onChange={(event) => toggleScope(scope, event.currentTarget.checked)}
              >
                <Trans>{scope}: {description}</Trans>
              </Checkbox>
            )}
          </For>
        </Column>
        <Checkbox checked={isPublic()} onChange={(event) => setIsPublic(event.currentTarget.checked)}>
          <Trans>Public client (requires PKCE)</Trans>
        </Checkbox>
        <Button onPress={createApplication} isDisabled={saving()}>
          <Show when={saving()} fallback={<Trans>Create OAuth application</Trans>}>
            <CircularProgress />
          </Show>
        </Button>
      </CategoryButton.Group>

      <Show when={secret()}>
        <CategoryButton.Group>
          <Text>
            <Trans>Copy this client secret now. It cannot be retrieved later.</Trans>
          </Text>
          <CategoryButton
            icon={<MdContentCopy {...iconSize(20)} />}
            action="copy"
            onClick={() => copy(secret()!, t`Client secret copied.`)}
          >
            {secret()}
          </CategoryButton>
        </CategoryButton.Group>
      </Show>

      <Show when={applications.loading} fallback={
        <Show when={applications()?.length} fallback={<Text><Trans>You have no OAuth applications yet.</Trans></Text>}>
          <CategoryButton.Group>
            <For each={applications()}>
              {(application) => (
                <CategoryButton.Collapse
                  icon={<MdApi {...iconSize(22)} />}
                  title={application.name}
                  description={application.public ? t`Public client` : t`Confidential client`}
                >
                  <Text>{application.revoked ? <Trans>Revoked</Trans> : application.client_id}</Text>
                  <Text>{application.redirect_uris[0]}</Text>
                  <Text>{application.allowed_scopes.join(", ")}</Text>
                  <Row gap="sm">
                    <CategoryButton
                      icon={<MdContentCopy {...iconSize(18)} />}
                      action="copy"
                      onClick={() => copy(application.client_id, t`Client ID copied.`)}
                    >
                      <Trans>Copy client ID</Trans>
                    </CategoryButton>
                    <Show when={!application.public && !application.revoked}>
                      <CategoryButton
                        icon={<MdRefresh {...iconSize(18)} />}
                        action="chevron"
                        onClick={() => rotateSecret(application)}
                      >
                        <Trans>Rotate secret</Trans>
                      </CategoryButton>
                    </Show>
                    <Show when={!application.revoked}>
                      <CategoryButton
                        icon={<MdDelete {...iconSize(18)} />}
                        action="chevron"
                        onClick={() => revoke(application)}
                      >
                        <Trans>Revoke application</Trans>
                      </CategoryButton>
                    </Show>
                  </Row>
                </CategoryButton.Collapse>
              )}
            </For>
          </CategoryButton.Group>
        </Show>
      }>
        <CircularProgress />
      </Show>
    </Column>
  );
}

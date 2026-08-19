import { For, Match, Show, Switch, createSignal } from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";
import { useQuery, useQueryClient } from "@tanstack/solid-query";
import { Server, ServerInvite } from "stoat.js";
import { styled } from "styled-system/jsx";

import { useClient } from "@revolt/client";
import { CONFIGURATION } from "@revolt/common";
import { useModals } from "@revolt/modal";
import {
  Avatar,
  Button,
  CircularProgress,
  Column,
  DataTable,
  Row,
  Text,
} from "@revolt/ui";

import MdDelete from "@material-design-icons/svg/outlined/delete.svg?component-solid";

/**
 * List and invalidate server invites
 */
export function ListServerInvites(props: { server: Server }) {
  const { t } = useLingui();
  const client = useClient();
  const queryClient = useQueryClient();
  const { showError, openModal } = useModals();
  const [vanityUrl, setVanityUrl] = createSignal<string>();
  const [vanityCode, setVanityCode] = createSignal("");
  const query = useQuery(() => ({
    queryKey: ["invites", props.server.id],
    queryFn: () => props.server.fetchInvites() as Promise<ServerInvite[]>,
  }));

  const serverDoesntHaveChannels = () =>
    !props.server.defaultChannel || props.server.channels.length == 0;

  async function deleteInvite(invite: ServerInvite) {
    try {
      await invite.delete();
      queryClient.setQueryData(
        ["invites", props.server.id],
        query.data!.filter((entry) => entry.id !== invite.id),
      );
      if (vanityUrl()?.endsWith(`/invite/${invite.id}`)) setVanityUrl();
    } catch (error) {
      showError(error);
    }
  }

  async function createInvite() {
    const defaultChannel =
      props.server.defaultChannel || props.server.channels[0] || null;
    if (defaultChannel) {
      openModal({
        type: "create_invite",
        channel: defaultChannel,
      });
    }
  }

  async function createVanity() {
    const code = vanityCode().trim().toLowerCase();
    if (!code) return;

    try {
      const [authHeader, authValue] = client().authenticationHeader;
      const response = await fetch(
        `${CONFIGURATION.DEFAULT_API_URL}/servers/${props.server.id}/vanity`,
        {
          method: "POST",
          headers: {
            [authHeader]: authValue,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        },
      );
      if (!response.ok) {
        const error = await response.json().catch(() => undefined);
        throw new Error(error?.error ?? `Vanity URL request failed (${response.status})`);
      }
      const url = `https://tails1154.com:9961/invite/${code}`;
      setVanityUrl(url);
      await navigator.clipboard?.writeText(url);
      queryClient.invalidateQueries({ queryKey: ["invites", props.server.id] });
      setVanityCode("");
    } catch (error) {
      showError(error);
    }
  }

  async function submitToDiscovery() {
    const invite = query.data?.[0]?.id;
    if (!invite) {
      showError(new Error(t`Create an invite before submitting your server to Discovery.`));
      return;
    }
    const description = prompt(t`Describe your server for Discovery:`);
    if (description === null) return;
    try {
      const [authHeader, authValue] = client().authenticationHeader;
      const response = await fetch(`${CONFIGURATION.DEFAULT_API_URL}/discovery/servers/${props.server.id}`, {
        method: "POST",
        headers: { [authHeader]: authValue, "Content-Type": "application/json" },
        body: JSON.stringify({ invite, description }),
      });
      if (!response.ok) throw new Error(await response.text());
      alert(t`Your server was submitted for Discovery review.`);
    } catch (error) {
      showError(error);
    }
  }

  return (
    <Column>
      <Button
        group="standard"
        onPress={createInvite}
        isDisabled={serverDoesntHaveChannels()}
        use:floating={{
          tooltip: serverDoesntHaveChannels()
            ? {
                content: t`Create a channel before inviting others!`,
                placement: "bottom",
              }
            : undefined,
        }}
      >
        <Trans>Create invite</Trans>
      </Button>
      <Button group="standard" onPress={createVanity}>
        <Trans>Create vanity URL</Trans>
      </Button>
      <Button group="standard" onPress={submitToDiscovery}>
        <Trans>Submit server to Discovery</Trans>
      </Button>
      <VanityInput
        value={vanityCode()}
        placeholder={t`Choose a vanity code (3–32 lowercase characters)`}
        onInput={(event) => setVanityCode(event.currentTarget.value)}
        onKeyDown={(event) => event.key === "Enter" && createVanity()}
      />
      <Show when={vanityUrl()}>
        <VanityCard>
          <Column gap="xs">
            <Text class="title" size="small"><Trans>Active vanity URL</Trans></Text>
            <a href={vanityUrl()} target="_blank" rel="noreferrer">{vanityUrl()}</a>
          </Column>
          <Button
            variant="tonal"
            onPress={async () => await navigator.clipboard?.writeText(vanityUrl()!)}
          >
            <Trans>Copy</Trans>
          </Button>
        </VanityCard>
      </Show>
      <DataTable
        columns={[<Trans>Inviter</Trans>, <Trans>Invite Code</Trans>, <></>]}
        itemCount={query.data?.length}
      >
        {(page, itemsPerPage) => (
          <Switch>
            <Match when={query.isLoading}>
              <DataTable.Row>
                <DataTable.Cell colspan={3}>
                  <CircularProgress />
                </DataTable.Cell>
              </DataTable.Row>
            </Match>
            <Match when={query.data}>
              <For
                each={query.data!.slice(
                  page * itemsPerPage,
                  page * itemsPerPage + itemsPerPage,
                )}
              >
                {(item) => (
                  <DataTable.Row>
                    <DataTable.Cell>
                      <Row align>
                        <Avatar
                          src={item.creator?.animatedAvatarURL}
                          size={32}
                        />
                        <Column gap="none">
                          <span>
                            {item.creator?.displayName ?? "Unknown User"}
                          </span>
                          <Text class="label">#{item.channel?.name}</Text>
                        </Column>
                      </Row>
                    </DataTable.Cell>
                    <DataTable.Cell>{item.id}</DataTable.Cell>
                    <DataTable.Cell width="40px">
                      <Button
                        size="icon"
                        variant="filled"
                        use:floating={{
                          tooltip: {
                            placement: "bottom",
                            content: t`Delete Invite`,
                          },
                        }}
                        onPress={() => deleteInvite(item)}
                      >
                        <MdDelete />
                      </Button>
                    </DataTable.Cell>
                  </DataTable.Row>
                )}
              </For>
            </Match>
          </Switch>
        )}
      </DataTable>
    </Column>
  );
}

const VanityInput = styled("input", {
  base: {
    width: "100%",
    minHeight: "40px",
    padding: "0 var(--gap-md)",
    border: "1px solid var(--md-sys-color-outline-variant)",
    borderRadius: "var(--borderRadius-sm)",
    color: "var(--md-sys-color-on-surface)",
    background: "var(--md-sys-color-surface-container)",
    font: "inherit",
  },
});

const VanityCard = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "var(--gap-md)",
    padding: "var(--gap-md)",
    borderRadius: "var(--borderRadius-md)",
    background: "var(--md-sys-color-primary-container)",
    color: "var(--md-sys-color-on-primary-container)",
    "& a": { color: "inherit", overflowWrap: "anywhere" },
  },
});

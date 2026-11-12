import { For, Show, createResource, createSignal } from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";

import { useClient } from "@revolt/client";
import {
  Button,
  CircularProgress,
  Column,
  Row,
  Text,
  typography,
  useSnackbar,
} from "@revolt/ui";

import { requestClientJson } from "../../../../client/customApi";

type Quest = {
  id: string;
  name: string;
  description: string;
  progress: number;
  target: number;
  reward_points: number;
  resets_at: number;
  completed: boolean;
  claimed: boolean;
};

type QuestsResponse = { tails_points: number; quests: Quest[] };

type Decoration = {
  id: string;
  name: string;
  asset_url: string;
  price_points: number;
  enabled: boolean;
  owned: boolean;
  equipped: boolean;
};

/**
 * Tails Points: complete message quests to earn points, then spend them on
 * profile decorations.
 */
export function TailsPoints() {
  const { t } = useLingui();
  const client = useClient();
  const snackbar = useSnackbar();
  const [busy, setBusy] = createSignal<string>();

  const [quests, { refetch: refetchQuests }] = createResource(() =>
    requestClientJson<QuestsResponse>(client().api, "GET", "/users/quests"),
  );

  const [decorations, { refetch: refetchDecorations }] = createResource(() =>
    requestClientJson<Decoration[]>(
      client().api,
      "GET",
      "/users/profile-decorations",
    ),
  );

  function refreshAll() {
    return Promise.all([refetchQuests(), refetchDecorations()]);
  }

  async function run(key: string, action: () => Promise<unknown>, success: string) {
    setBusy(key);
    try {
      await action();
      await refreshAll();
      snackbar.show({ message: success });
    } catch (err) {
      snackbar.show({
        message: err instanceof Error ? err.message : t`Something went wrong.`,
      });
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <Column gap="lg">
      <Column gap="xs">
        <Text class={typography({ class: "title", size: "medium" })}>
          <Trans>Tails Points</Trans>
        </Text>
        <Text class={typography({ class: "body", size: "small" })}>
          <Trans>
            Balance: {quests()?.tails_points ?? 0} Tails Points. Complete quests
            to earn points and spend them on profile decorations.
          </Trans>
        </Text>
      </Column>

      <Column gap="sm">
        <Text class={typography({ class: "title", size: "small" })}>
          <Trans>Quests</Trans>
        </Text>
        <Show when={quests.loading}>
          <CircularProgress />
        </Show>
        <For each={quests()?.quests ?? []}>
          {(quest) => (
            <Row gap="md" align>
              <Column gap="xs" style={{ flex: "1" }}>
                <Text>
                  {quest.name} · <Trans>+{quest.reward_points} points</Trans>
                </Text>
                <Text class={typography({ class: "label" })}>
                  {quest.description} ({Math.min(quest.progress, quest.target)}/
                  {quest.target})
                </Text>
              </Column>
              <Show
                when={!quest.claimed}
                fallback={<Text class={typography({ class: "label" })}><Trans>Claimed</Trans></Text>}
              >
                <Button
                  isDisabled={!quest.completed || busy() !== undefined}
                  onPress={() =>
                    run(
                      `quest:${quest.id}`,
                      () =>
                        requestClientJson(
                          client().api,
                          "POST",
                          `/users/quests/${quest.id}/claim`,
                        ),
                      t`Reward claimed.`,
                    )
                  }
                >
                  <Show
                    when={busy() === `quest:${quest.id}`}
                    fallback={quest.completed ? <Trans>Claim</Trans> : <Trans>In progress</Trans>}
                  >
                    <CircularProgress />
                  </Show>
                </Button>
              </Show>
            </Row>
          )}
        </For>
      </Column>

      <Column gap="sm">
        <Text class={typography({ class: "title", size: "small" })}>
          <Trans>Decoration shop</Trans>
        </Text>
        <Show when={decorations.loading}>
          <CircularProgress />
        </Show>
        <For each={decorations() ?? []}>
          {(decoration) => (
            <Row gap="md" align>
              <img
                src={decoration.asset_url}
                alt=""
                width="48"
                height="48"
                style={{ "object-fit": "contain" }}
              />
              <Column gap="xs" style={{ flex: "1" }}>
                <Text>{decoration.name}</Text>
                <Text class={typography({ class: "label" })}>
                  {decoration.price_points} <Trans>Tails Points</Trans>
                </Text>
              </Column>
              <Show
                when={decoration.owned}
                fallback={
                  <Button
                    isDisabled={busy() !== undefined}
                    onPress={() =>
                      run(
                        `buy:${decoration.id}`,
                        () =>
                          requestClientJson(
                            client().api,
                            "POST",
                            `/users/profile-decorations/${decoration.id}/purchase`,
                          ),
                        t`Decoration purchased.`,
                      )
                    }
                  >
                    <Trans>Buy</Trans>
                  </Button>
                }
              >
                <Show
                  when={decoration.equipped}
                  fallback={
                    <Button
                      isDisabled={busy() !== undefined}
                      onPress={() =>
                        run(
                          `equip:${decoration.id}`,
                          () =>
                            requestClientJson(
                              client().api,
                              "POST",
                              `/users/profile-decorations/${decoration.id}/equip`,
                            ),
                          t`Decoration equipped.`,
                        )
                      }
                    >
                      <Trans>Equip</Trans>
                    </Button>
                  }
                >
                  <Button
                    isDisabled={busy() !== undefined}
                    onPress={() =>
                      run(
                        `unequip:${decoration.id}`,
                        () =>
                          requestClientJson(
                            client().api,
                            "DELETE",
                            "/users/profile-decorations/equip",
                          ),
                        t`Decoration removed.`,
                      )
                    }
                  >
                    <Trans>Unequip</Trans>
                  </Button>
                </Show>
              </Show>
            </Row>
          )}
        </For>
      </Column>
    </Column>
  );
}

import { Show, createSignal } from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";

import { useClient } from "@revolt/client";
import { requestClientJson } from "../../../../client/customApi";
import {
  Button,
  CircularProgress,
  Column,
  Row,
  Text,
  useSnackbar,
} from "@revolt/ui";
import { useQuery } from "@tanstack/solid-query";
import { css } from "styled-system/css";

import { ServerSettingsProps } from "../ServerSettings";

type ServerBoost = {
  id: string;
  user_id: string;
};

type ServerBoostSummary = {
  server_id: string;
  boost_count: number;
  level: number;
  next_level?: number;
  user_boosts: ServerBoost[];
  available_premium_boosts: number;
  user_level: number;
  boost_cost_levels: number;
  is_premium: boolean;
  progress_enabled: boolean;
  can_manage: boolean;
};

export default function ServerBoosts(props: ServerSettingsProps) {
  const { t } = useLingui();
  const client = useClient();
  const snackbar = useSnackbar();
  const busy = createSignal(false);
  const [isBusy, setBusy] = busy;
  const boosts = useQuery(() => ({
    queryKey: ["server-boosts", props.server.id],
    queryFn: () =>
      requestClientJson<ServerBoostSummary>(
        client().api,
        "GET",
        `/servers/${props.server.id}/boosts`,
      ),
  }));

  async function addBoost() {
    if (isBusy()) return;
    setBusy(true);
    try {
      await requestClientJson<ServerBoostSummary>(
        client().api,
        "POST",
        `/servers/${props.server.id}/boosts`,
      );
      await boosts.refetch();
    } catch {
      snackbar.show({
        message: t`Unable to add a boost right now.`,
        placement: "bottom",
        closeable: true,
      });
    } finally {
      setBusy(false);
    }
  }

  async function removeBoost(boostId: string) {
    if (isBusy()) return;
    setBusy(true);
    try {
      await requestClientJson<ServerBoostSummary>(
        client().api,
        "DELETE",
        `/servers/${props.server.id}/boosts/${boostId}`,
      );
      await boosts.refetch();
    } catch {
      snackbar.show({
        message: t`Unable to remove this boost right now.`,
        placement: "bottom",
        closeable: true,
      });
    } finally {
      setBusy(false);
    }
  }

  async function toggleProgress(enabled: boolean) {
    if (isBusy()) return;
    setBusy(true);
    try {
      await requestClientJson<ServerBoostSummary>(
        client().api,
        "PATCH",
        `/servers/${props.server.id}/boosts/settings`,
        { progress_enabled: enabled },
      );
      await boosts.refetch();
    } catch {
      snackbar.show({
        message: t`Unable to update boost display settings right now.`,
        placement: "bottom",
        closeable: true,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Column gap="xl">
      <Column gap="sm">
        <Text class="title" size="large">
          <Trans>Server boosts</Trans>
        </Text>
        <Text>
          <Trans>Support this server and unlock optional cosmetic perks.</Trans>
        </Text>
      </Column>

      <Show when={!boosts.isPending} fallback={<CircularProgress />}>
        <Show when={boosts.data}>
          {(data) => (
            <Column gap="lg">
              <Row gap="xl" wrap>
                <Stat label={t`Boosts`} value={data().boost_count} />
                <Stat label={t`Server level`} value={data().level} />
                <Show when={data().next_level !== undefined}>
                  <Stat label={t`Next level at`} value={data().next_level!} />
                </Show>
              </Row>

              <Show when={data().progress_enabled}>
                <Column gap="sm">
                  <Text class="title" size="medium">
                    <Trans>Boost progress</Trans>
                  </Text>
                  <ProgressTrack>
                    <ProgressFill
                      style={{ width: `${progressPercent(data())}%` }}
                    />
                  </ProgressTrack>
                  <Text>
                    <Trans>
                      {data().next_level
                        ? `${data().boost_count} of ${data().next_level} boosts toward the next level`
                        : "This server has reached the highest boost level."}
                    </Trans>
                  </Text>
                </Column>
              </Show>

              <Show when={data().can_manage}>
                <Button
                  variant="outlined"
                  isDisabled={isBusy()}
                  onPress={() => void toggleProgress(!data().progress_enabled)}
                >
                  {data().progress_enabled ? (
                    <Trans>Hide boost progress from members</Trans>
                  ) : (
                    <Trans>Show boost progress to members</Trans>
                  )}
                </Button>
              </Show>

              <Column gap="sm">
                <Text>
                  <Trans>
                    Level 1 unlocks at 2 boosts, level 2 at 5, and level 3 at 10.
                  </Trans>
                </Text>
                <Text>
                  <Trans>
                    Boosts never lock vanity links or custom invite links behind a paywall.
                  </Trans>
                </Text>
              </Column>

              <Column gap="sm">
                <Text class="title" size="medium">
                  <Trans>Your boosts</Trans>
                </Text>
                <Show
                  when={data().user_boosts.length > 0}
                  fallback={<Text><Trans>You have not boosted this server.</Trans></Text>}
                >
                  {data().user_boosts.map((boost) => (
                    <Row gap="md" align="center">
                      <Text><Trans>Active boost</Trans></Text>
                      <Button
                        variant="outlined"
                        isDisabled={isBusy()}
                        onPress={() => void removeBoost(boost.id)}
                      >
                        <Trans>Remove</Trans>
                      </Button>
                    </Row>
                  ))}
                </Show>
              </Column>

              <Column gap="sm">
                <Text class="title" size="medium">
                  <Trans>Boost shop</Trans>
                </Text>
                <Text>
                  <Trans>Spend one XP level to buy one server boost. You keep the boost until you remove it.</Trans>
                </Text>
                <Button
                  variant="filled"
                  isDisabled={isBusy() || data().user_level <= 1}
                  onPress={() => void addBoost()}
                >
                  <Trans>Spend one XP level to add a boost</Trans>
                </Button>
                <Text>
                  <Trans>Your current level is {data().user_level}. Each boost costs one level.</Trans>
                </Text>
              </Column>
            </Column>
          )}
        </Show>
      </Show>
    </Column>
  );
}

function progressPercent(data: ServerBoostSummary) {
  if (!data.next_level) return 100;
  const previous = data.level === 0 ? 0 : data.level === 1 ? 2 : 5;
  return Math.min(
    100,
    Math.round(((data.boost_count - previous) / (data.next_level - previous)) * 100),
  );
}

function Stat(props: { label: string; value: number }) {
  return (
    <Column gap="xs">
      <Text class="title" size="large">{props.value.toLocaleString()}</Text>
      <Text>{props.label}</Text>
    </Column>
  );
}

const ProgressTrack = (props: { children: unknown }) => (
  <div class={css({
    height: "10px",
    width: "100%",
    borderRadius: "var(--borderRadius-full)",
    overflow: "hidden",
    background: "var(--md-sys-color-surface-container-highest)",
  })}>
    {props.children}
  </div>
);

const ProgressFill = (props: { style: { width: string } }) => (
  <div class={css({
    height: "100%",
    borderRadius: "var(--borderRadius-full)",
    background: "var(--md-sys-color-primary)",
    transition: "width 200ms ease",
  })} style={props.style} />
);

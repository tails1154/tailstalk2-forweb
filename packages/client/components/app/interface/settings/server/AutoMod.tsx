import { createEffect, createSignal, onMount } from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";

import {
  Button,
  CircularProgress,
  ColouredText,
  Column,
  Row,
  Text,
} from "@revolt/ui";
import { useClient } from "@revolt/client";

import { ServerSettingsProps } from "../ServerSettings";

/** Configure the server's message AutoMod rules. */
export default function ServerAutoModSettings(props: ServerSettingsProps) {
  const { t } = useLingui();
  const client = useClient();
  const [enabled, setEnabled] = createSignal(false);
  const [blockedWords, setBlockedWords] = createSignal("");
  const [mentionLimit, setMentionLimit] = createSignal(5);
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal<string>();

  createEffect(() => {
    const config = props.server.automod;
    setEnabled(config?.enabled ?? false);
    setBlockedWords(config?.blocked_words.join("\n") ?? "");
    setMentionLimit(config?.mention_limit ?? 5);
  });

  onMount(async () => {
    try {
      const server = (await client().api.get(`/servers/${props.server.id}`, {
        include_channels: false,
      })) as { automod?: typeof props.server.automod };
      const config = server.automod;
      setEnabled(config?.enabled ?? false);
      setBlockedWords(config?.blocked_words.join("\n") ?? "");
      setMentionLimit(config?.mention_limit ?? 5);
    } catch {
      // Keep the hydrated values if the refresh is unavailable.
    }
  });

  async function save() {
    setSaving(true);
    setError(undefined);
    try {
      await props.server.edit({
        remove: [],
        automod: {
          enabled: enabled(),
          blocked_words: blockedWords()
            .split("\n")
            .map((word) => word.trim())
            .filter(Boolean),
          mention_limit: Math.max(0, Number(mentionLimit()) || 0),
        },
      });
    } catch {
      setError(t`Unable to save AutoMod settings right now.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Column gap="xl">
      <Column gap="sm">
        <Text class="title" size="large">
          <Trans>AutoMod</Trans>
        </Text>
        <Text>
          <Trans>
            Automatically block messages containing phrases you choose and
            messages that mention too many people.
          </Trans>
        </Text>
      </Column>

      <Column gap="lg">
        <label>
          <input
            type="checkbox"
            checked={enabled()}
            onChange={(event) => setEnabled(event.currentTarget.checked)}
          />{" "}
          <Trans>Enable AutoMod</Trans>
        </label>

        <label>
          <Text>
            <Trans>Blocked words and phrases</Trans>
          </Text>
          <Text size="small">
            <Trans>Enter one word or phrase per line.</Trans>
          </Text>
          <textarea
            value={blockedWords()}
            onInput={(event) => setBlockedWords(event.currentTarget.value)}
            rows={8}
            style={{
              width: "100%",
              "min-height": "150px",
              padding: "var(--gap-md)",
              "border-radius": "var(--borderRadius-md)",
              border: "1px solid var(--md-sys-color-outline-variant)",
              background: "var(--md-sys-color-surface-container)",
              color: "var(--md-sys-color-on-surface)",
              resize: "vertical",
            }}
          />
        </label>

        <label>
          <Text>
            <Trans>Mention spam limit</Trans>
          </Text>
          <Text size="small">
            <Trans>Block messages with more mentions than this number.</Trans>
          </Text>
          <input
            type="number"
            min="0"
            max="100"
            value={mentionLimit()}
            onInput={(event) => setMentionLimit(Number(event.currentTarget.value))}
          />
        </label>

        <Row>
          <Button onPress={save} isDisabled={saving()}>
            <Trans>Save AutoMod settings</Trans>
          </Button>
          {saving() && <CircularProgress />}
        </Row>
        {error() && (
          <ColouredText colour="var(--md-sys-color-error)">
            {error()}
          </ColouredText>
        )}
      </Column>
    </Column>
  );
}

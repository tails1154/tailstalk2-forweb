import { createSignal, Show } from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";
import { styled } from "styled-system/jsx";

import { Avatar, Column, Dialog, DialogProps, Text } from "@revolt/ui";

import { useModals } from "..";
import { Modals } from "../types";

const Select = styled("select", {
  base: {
    width: "100%",
    boxSizing: "border-box",
    padding: "0.7em 0.8em",
    borderRadius: "var(--borderRadius-md)",
    border: "1px solid var(--secondary-header)",
    background: "var(--background-secondary)",
    color: "var(--foreground)",
    fontSize: "1em",
  },
});

/**
 * Apply or remove a native server timeout.
 */
export function TimeoutMemberModal(
  props: DialogProps & Modals & { type: "timeout_member" },
) {
  const { t } = useLingui();
  const { showError } = useModals();
  const [duration, setDuration] = createSignal("300");
  const [submitting, setSubmitting] = createSignal(false);

  async function submit() {
    setSubmitting(true);
    try {
      const seconds = Number(duration());
      if (seconds === 0) {
        await props.member.edit({ remove: ["Timeout"] });
      } else {
        await props.member.edit({
          timeout: new Date(Date.now() + seconds * 1000).toISOString(),
        });
      }
      props.onClose();
    } catch (error) {
      showError(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      show={props.show}
      onClose={props.onClose}
      title={<Trans>Timeout member</Trans>}
      isDisabled={submitting()}
      actions={[
        { text: <Trans>Cancel</Trans> },
        {
          text: <Trans>Apply</Trans>,
          onClick: () => {
            void submit();
            return false;
          },
          isDisabled: submitting(),
        },
      ]}
    >
      <Column align>
        <Avatar src={props.member.user?.animatedAvatarURL} size={64} />
        <Text>
          <Trans>Choose how long {props.member.user?.username} should be timed out.</Trans>
        </Text>
        <Select
          aria-label={t`Timeout duration`}
          value={duration()}
          onChange={(event) => setDuration(event.currentTarget.value)}
        >
          <option value="300">{t`5 minutes`}</option>
          <option value="600">{t`10 minutes`}</option>
          <option value="3600">{t`1 hour`}</option>
          <option value="21600">{t`6 hours`}</option>
          <option value="86400">{t`1 day`}</option>
          <Show when={props.member.timeout}>
            <option value="0">{t`Remove timeout`}</option>
          </Show>
        </Select>
      </Column>
    </Dialog>
  );
}

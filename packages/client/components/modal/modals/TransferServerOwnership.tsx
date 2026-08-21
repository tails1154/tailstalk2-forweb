import { For, Show, createResource, createSignal } from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";
import { useMutation } from "@tanstack/solid-query";

import { useClient } from "@revolt/client";
import { Column, Dialog, DialogProps, Text } from "@revolt/ui";

import { useModals } from "..";
import { Modals } from "../types";

/**
 * Transfer a server to another existing member.
 */
export function TransferServerOwnershipModal(
  props: DialogProps & Modals & { type: "transfer_server_ownership" },
) {
  const { t } = useLingui();
  const client = useClient();
  const { mfaFlow, showError } = useModals();
  const [selectedUser, setSelectedUser] = createSignal("");
  const [confirmations, setConfirmations] = createSignal(0);
  const [members] = createResource(() => props.server.fetchMembers());

  function confirmTransfer() {
    if (!selectedUser()) {
      showError(new Error(t`Select a member first.`));
      return false;
    }

    if (confirmations() < 4) {
      setConfirmations((value) => value + 1);
      return false;
    }

    return transfer.mutateAsync();
  }

  const transfer = useMutation(() => ({
    mutationFn: async () => {
      const userId = selectedUser();
      if (!userId) throw new Error(t`Select a member first.`);

      const mfa = await client().account.mfa();
      const ticket = await mfaFlow(mfa);
      if (!ticket) return;

      await props.server.edit(
        { owner: userId, remove: [] },
        { mfaTicket: ticket.token },
      );
    },
    onError: showError,
    onSuccess: props.onClose,
  }));

  const eligibleMembers = () =>
    members()?.users.filter((user) => user.id !== props.server.ownerId) ?? [];

  return (
    <Dialog
      show={props.show}
      onClose={props.onClose}
      title={<Trans>Transfer server ownership</Trans>}
      actions={[
        { text: <Trans>Cancel</Trans> },
        {
          text: <Trans>I UNDERSTAND — CONFIRM NEXT WARNING</Trans>,
          onClick: confirmTransfer,
        },
      ]}
      isDisabled={transfer.isPending || members.loading}
    >
      <Column gap="lg">
        <Text>
          <Trans>
            Choose a current member to become the new owner. This requires five
            confirmations and MFA verification.
          </Trans>
        </Text>
        <Show when={confirmations() === 0}>
          <Text>
            <Trans>
              WARNING: Ownership transfer is a serious account action. Do not
              continue unless you intentionally want to give this server away.
            </Trans>
          </Text>
        </Show>
        <Show when={confirmations() === 1}>
          <Text>
            <Trans>
              WARNING: After the transfer, you will no longer be the server
              owner and this action cannot be undone from this dialog.
            </Trans>
          </Text>
        </Show>
        <Show when={confirmations() === 2}>
          <Text>
            <Trans>
              WARNING: You may lose access to owner-only server settings
              immediately after the transfer.
            </Trans>
          </Text>
        </Show>
        <Show when={confirmations() === 3}>
          <Text>
            <Trans>
              FINAL WARNING: Verify the selected member carefully. The new owner
              will control this server.
            </Trans>
          </Text>
        </Show>
        <Show when={confirmations() === 4}>
          <Text>
            <Trans>
              FINAL CONFIRMATION: Pressing the button will start MFA
              verification and transfer ownership after it succeeds.
            </Trans>
          </Text>
        </Show>
        <Show
          when={!members.loading}
          fallback={<Text>{t`Loading members…`}</Text>}
        >
          <label>
            <Text>{t`New owner`}</Text>
            <select
              value={selectedUser()}
              onChange={(event) => setSelectedUser(event.currentTarget.value)}
            >
              <option value="">{t`Select a member`}</option>
              <For each={eligibleMembers()}>
                {(user) => (
                  <option value={user.id}>
                    {user.displayName ?? user.username}
                  </option>
                )}
              </For>
            </select>
          </label>
        </Show>
      </Column>
    </Dialog>
  );
}

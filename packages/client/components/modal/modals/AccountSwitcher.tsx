import { For } from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";
import { useNavigate } from "@revolt/routing";
import { useClient, useClientLifecycle } from "@revolt/client";
import { useModals } from "@revolt/modal";
import { useState } from "@revolt/state";
import { Avatar, Button, Column, Dialog, Row, Text } from "@revolt/ui";
import type { Session } from "@revolt/state/stores/Auth";

import type { DialogProps } from "@revolt/ui";
import type { Modals } from "../types";

export function AccountSwitcherModal(
  props: DialogProps & Modals & { type: "account_switcher" },
) {
  const state = useState();
  const client = useClient();
  const navigate = useNavigate();
  const { logout, switchAccount } = useClientLifecycle();
  const { openModal } = useModals();

  const accountLabel = (account: Session) =>
    account.displayName ?? account.username ?? account.userId;

  function switchTo(account: Session) {
    props.onClose();
    switchAccount(account);
  }

  function addAccount() {
    props.onClose();
    logout(true);
    navigate("/login/auth");
  }

  return (
    <Dialog
      show={props.show}
      onClose={props.onClose}
      title={<Trans>Switch account</Trans>}
      actions={[{ text: <Trans>Close</Trans> }]}
    >
      <Column gap="md">
        <For each={state.auth.getAccounts()}>
          {(account) => (
            <Button
              variant="text"
              onPress={() => switchTo(account)}
              isDisabled={account._id === client().sessionId}
            >
              <Row align gap="sm">
                <Avatar size={32} src={account.avatar} fallback={accountLabel(account)} />
                <Column gap="none" align="start">
                  <Text>{accountLabel(account)}</Text>
                  <Text class="label">
                    {account.username ?? account.userId}
                  </Text>
                </Column>
              </Row>
            </Button>
          )}
        </For>
        <Button onPress={addAccount}>
          <Trans>Add account</Trans>
        </Button>
        <Button
          variant="text"
          onPress={() => {
            props.onClose();
            openModal({ type: "settings", config: "user" });
          }}
        >
          <Trans>Manage current account</Trans>
        </Button>
      </Column>
    </Dialog>
  );
}

import { Trans } from "@lingui-solid/solid/macro";
import { useMutation } from "@tanstack/solid-query";

import { Dialog, DialogProps } from "@revolt/ui";

import { useModals } from "..";
import { Modals } from "../types";

/**
 * Modal to sign out of all sessions
 */
export function SignOutSessionsModal(
  props: DialogProps & Modals & { type: "sign_out_sessions" },
) {
  const { mfaFlow, showError } = useModals();

  const signOutSessions = useMutation(() => ({
    mutationFn: async () => {
      const mfa = await props.client.account.mfa();
      const ticket = await mfaFlow(mfa);
      if (!ticket) return;

      const config = props.client.api.config;
      const response = await fetch(
        `${config.baseURL}/auth/session/all?revoke_self=false`,
        {
          method: "DELETE",
          headers: {
            ...(config.headers ?? {}),
            "X-MFA-Ticket": ticket.token,
          },
        },
      );
      if (!response.ok) {
        throw new Error(`Unable to sign out sessions (${response.status})`);
      }
    },
    onError: showError,
    onSuccess: props.onClose,
  }));

  return (
    <Dialog
      show={props.show}
      onClose={props.onClose}
      title={<Trans>Are you sure you want to clear your sessions?</Trans>}
      actions={[
        { text: <Trans>Cancel</Trans> },
        {
          text: <Trans>Accept</Trans>,
          onClick: () => signOutSessions.mutateAsync(),
        },
      ]}
      isDisabled={signOutSessions.isPending}
    >
      <Trans>You cannot undo this action.</Trans>
    </Dialog>
  );
}

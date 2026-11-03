import { Trans } from "@lingui-solid/solid/macro";

import { Dialog, DialogProps } from "@revolt/ui";

import { Modals } from "../types";

export function CancelPremiumModal(
  props: DialogProps & Modals & { type: "cancel_premium" },
) {
  return (
    <Dialog
      show={props.show}
      onClose={props.onClose}
      title={<Trans>Cancel TailsTalk 2 Premium?</Trans>}
      actions={[
        { text: <Trans>Keep Premium</Trans> },
        {
          text: <Trans>Cancel subscription</Trans>,
          onClick: props.onConfirm,
        },
      ]}
    >
      {props.gifted ? (
        <Trans>
          WARNING! THIS IS A GIFTED SUBSCRIPTION! Are you SURE you want to
          cancel it?
        </Trans>
      ) : props.immediate ? (
        <Trans>
          This immediately cancels your TailsTalk 2 Premium subscription and
          removes Premium access and its badge.
        </Trans>
      ) : (
        <Trans>
          Your Premium access and badge will remain active until the end of the
          current billing period. You can uncancel it later.
        </Trans>
      )}
    </Dialog>
  );
}

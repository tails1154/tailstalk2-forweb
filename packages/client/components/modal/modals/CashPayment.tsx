import { Trans } from "@lingui-solid/solid/macro";

import { Dialog, DialogProps } from "@revolt/ui";

import { Modals } from "../types";

export function CashPaymentModal(
  props: DialogProps & Modals & { type: "cash_payment" },
) {
  return (
    <Dialog
      show={props.show}
      onClose={props.onClose}
      title={<Trans>Request cash payment</Trans>}
      actions={[
        { text: <Trans>Go back</Trans> },
        {
          text: <Trans>Confirm request</Trans>,
          onClick: props.onConfirm,
        },
      ]}
    >
      <Trans>
        Confirm that you want to request TailsTalk 2 Premium using a cash
        payment. tails1154 will direct message you with further instructions.
        No payment is taken now.
      </Trans>
    </Dialog>
  );
}

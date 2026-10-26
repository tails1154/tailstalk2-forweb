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
      <Trans>
        Your Premium access and badge will remain active until the end of the
        current billing period. You can uncancel it later.
      </Trans>
    </Dialog>
  );
}

import { Trans } from "@lingui-solid/solid/macro";

import { Dialog, DialogProps } from "@revolt/ui";

import { Modals } from "../types";

export function ChannelToggleMatureModal(
  props: DialogProps & Modals & { type: "channel_toggle_mature" },
) {
  return (
    <Dialog
      show={props.show}
      onClose={props.onClose}
      title={<Trans>Mark this channel as mature?</Trans>}
      actions={[
        { text: <Trans>Close</Trans> },
      ]}
    >
      <Trans>
        Mature content on TailsTalk 2 is not allowed. This channel cannot be marked as mature.
      </Trans>
    </Dialog>
  );
}

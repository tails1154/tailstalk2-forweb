import { Trans } from "@lingui-solid/solid/macro";
import { Column, Dialog, DialogProps, Text } from "@revolt/ui";

import { Modals } from "../types";

export function FeatureRequestResponseModal(
  props: DialogProps & Modals & { type: "feature_request_response" },
) {
  const approved = props.request.status === "approved";
  return (
    <Dialog
      show={props.show}
      onClose={props.onClose}
      title={approved ? <Trans>Feature request approved</Trans> : <Trans>Feature request update</Trans>}
      actions={[{ text: <Trans>Close</Trans> }]}
    >
      <Column gap="sm">
        <Text class="title" size="medium">{props.request.title}</Text>
        <Text>
          {approved ? (
            <Trans>Your feature request was approved.</Trans>
          ) : (
            <Trans>Your feature request was not approved.</Trans>
          )}
        </Text>
        <ShowResponse response={props.request.admin_response} />
      </Column>
    </Dialog>
  );
}

function ShowResponse(props: { response: string }) {
  return props.response ? <Text>{props.response}</Text> : null;
}

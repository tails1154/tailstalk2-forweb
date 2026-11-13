import { Show, createSignal } from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";
import { Client } from "stoat.js";

import { requestClientJson } from "../../../../client/customApi";

import { Text } from "@revolt/ui";

const [aisdAllowed, setAisdAllowed] = createSignal(false);
const [aisdUrl, setAisdUrl] = createSignal("");
let checkedFor: string | undefined;

/**
 * Asks the server whether this account may open the AISD review panel.
 * The server makes the decision. The client only shows the result.
 */
export function refreshAisdAccess(client: Client) {
  const userId = client.user?.id;
  if (!userId) {
    checkedFor = undefined;
    setAisdAllowed(false);
    return;
  }
  if (checkedFor === userId) return;
  checkedFor = userId;

  requestClientJson<{ allowed: boolean; url: string }>(
    client.api,
    "GET",
    "/admin/safety/panel-access",
  )
    .then((access) => {
      setAisdAllowed(access.allowed === true);
      setAisdUrl(access.url);
    })
    .catch(() => {
      checkedFor = undefined;
      setAisdAllowed(false);
    });
}

export { aisdAllowed };

export function AisdReview() {
  return (
    <Show
      when={aisdAllowed()}
      fallback={
        <Text>
          <Trans>This account does not have access to the review panel.</Trans>
        </Text>
      }
    >
      <Text class="title" size="large">
        <Trans>AISD Safety Review</Trans>
      </Text>
      <Text>
        <Trans>Review messages from school accounts that were flagged for safety.</Trans>
      </Text>
      <a href={aisdUrl()} target="_blank" rel="noopener noreferrer">
        <Trans>Open the review panel</Trans>
      </a>
    </Show>
  );
}

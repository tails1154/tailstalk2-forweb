import { Show, createSignal } from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";
import { Client } from "stoat.js";

import MdShield from "@material-design-icons/svg/outlined/shield.svg?component-solid";

import { requestClientJson } from "../../../../client/customApi";

import { CategoryButton, Column, Text, iconSize } from "@revolt/ui";

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

/**
 * School safety review settings page. Only shown to accounts the server allows into the panel.
 */
export function AisdReview() {
  return (
    <Column gap="lg">
      <Show
        when={aisdAllowed()}
        fallback={
          <Text>
            <Trans>This account does not have access to the review panel.</Trans>
          </Text>
        }
      >
        <Column gap="sm">
          <Text class="title" size="large">
            <Trans>School safety review</Trans>
          </Text>
          <Text>
            <Trans>
              Messages from school accounts that were flagged for safety. Message
              text is shown to staff only.
            </Trans>
          </Text>
        </Column>

        <Show when={aisdUrl()}>
          <CategoryButton.Group>
            <a href={aisdUrl()} target="_blank" rel="noopener noreferrer">
              <CategoryButton
                action="external"
                icon={<MdShield {...iconSize(22)} />}
                onClick={() => void 0}
                description={
                  <Trans>Open the queue, search alerts, and act on accounts.</Trans>
                }
              >
                <Trans>Open review panel</Trans>
              </CategoryButton>
            </a>
          </CategoryButton.Group>
        </Show>
      </Show>
    </Column>
  );
}

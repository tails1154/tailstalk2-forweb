import { Show, createResource, createSignal } from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";

import { useClient } from "@revolt/client";
import { CategoryButton, Column } from "@revolt/ui";

export function SupporterSubscription() {
  const client = useClient();
  const [checkoutLoading, setCheckoutLoading] = createSignal(false);
  const [cancelLoading, setCancelLoading] = createSignal(false);
  const [account] = createResource(() =>
    (client().api as unknown as { get: (path: string) => Promise<AccountInfo> }).get(
      "/auth/account/",
    ),
  );

  async function startCheckout() {
    setCheckoutLoading(true);
    try {
      const { url } = await client().account.createStripeCheckout();
      window.location.assign(url);
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function cancelSubscription() {
    if (!window.confirm("Cancel TailsTalk 2 Premium at the end of your current billing period?")) return;
    setCancelLoading(true);
    try {
      await client().account.cancelStripeSubscription();
      await account.refetch();
    } finally {
      setCancelLoading(false);
    }
  }

  return (
    <CategoryButton.Collapse
      title={<Trans>TailsTalk 2 Premium</Trans>}
      description={<Trans>Support TailsTalk 2 and unlock Premium benefits.</Trans>}
    >
      <Column gap="md" style={{ padding: "0.75rem 1rem 1rem" }}>
        <Show
          when={account()?.subscription}
          fallback={
            <div>
              <Trans>
                Subscribe to receive the TailsTalk Supporter badge with TailsTalk 2 Premium. Stripe
                handles payment securely; TailsTalk 2 never sees your card
                details.
              </Trans>
            </div>
          }
        >
          {(subscription) => (
            <div>
              <Trans>
                You have an active {subscription().tier} subscription. Your
                Supporter badge is enabled.
                <Show when={subscription().cancel_at_period_end}>
                  <br />
                  <Trans>Your subscription is scheduled to end at the end of this billing period.</Trans>
                </Show>
              </Trans>
            </div>
          )}
        </Show>
        <div>
          <Trans>Supporter features:</Trans>
          <br />
          <Trans>• TailsTalk Supporter profile badge</Trans>
          <br />
          <Trans>• Support independent development</Trans>
          <br />
          <Trans>• More supporter perks may be added later</Trans>
        </div>
        <Show when={!account()?.subscription}>
          <CategoryButton icon="blank" onClick={startCheckout} isDisabled={checkoutLoading()}>
            <Trans>Subscribe with Stripe</Trans>
          </CategoryButton>
        </Show>
        <Show when={account()?.subscription && !account()?.subscription?.cancel_at_period_end}>
          <CategoryButton icon="blank" onClick={cancelSubscription} isDisabled={cancelLoading()}>
            <Trans>Cancel subscription</Trans>
          </CategoryButton>
        </Show>
      </Column>
    </CategoryButton.Collapse>
  );
}

type AccountInfo = {
  subscription?: {
    provider: string;
    tier: string;
    active_until: string;
    cancel_at_period_end: boolean;
  };
};

import {
  Show,
  createResource,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";

import { useClient } from "@revolt/client";
import { useModals } from "@revolt/modal";
import { CategoryButton, Column } from "@revolt/ui";

import { suppressLeaveSitePromptOnce } from "../../../../../src/serviceWorkerInterface";

export function SupporterSubscription() {
  const client = useClient();
  const { openModal, showError } = useModals();
  const [checkoutLoading, setCheckoutLoading] = createSignal(false);
  const [cancelLoading, setCancelLoading] = createSignal(false);
  const [resumeLoading, setResumeLoading] = createSignal(false);
  const [cashPaymentLoading, setCashPaymentLoading] = createSignal(false);
  const [account, { refetch }] = createResource(() =>
    (
      client().api as unknown as { get: (path: string) => Promise<AccountInfo> }
    ).get("/auth/account/"),
  );

  onMount(() => {
    const refresh = window.setInterval(() => void refetch(), 30_000);
    onCleanup(() => window.clearInterval(refresh));
  });

  async function startCheckout() {
    setCheckoutLoading(true);
    try {
      const { url } = await client().account.createStripeCheckout();
      suppressLeaveSitePromptOnce();
      window.location.assign(url);
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function cancelSubscription() {
    setCancelLoading(true);
    try {
      await client().account.cancelStripeSubscription();
      await refetch();
    } catch (error) {
      showError(error);
      throw error;
    } finally {
      setCancelLoading(false);
    }
  }

  async function resumeSubscription() {
    setResumeLoading(true);
    try {
      await client().account.resumeStripeSubscription();
      await refetch();
    } finally {
      setResumeLoading(false);
    }
  }

  async function requestCashPayment() {
    setCashPaymentLoading(true);
    try {
      await client().account.requestCashPayment();
      await refetch();
    } catch (error) {
      showError(error);
      throw error;
    } finally {
      setCashPaymentLoading(false);
    }
  }

  return (
    <CategoryButton.Collapse
      title={<Trans>TailsTalk 2 Premium</Trans>}
      description={
        <Trans>Get TailsTalk 2 Premium and unlock Premium benefits.</Trans>
      }
    >
      <Column gap="md" style={{ padding: "0.75rem 1rem 1rem" }}>
        <Show
          when={account()?.subscription}
          fallback={
            <div>
              <Trans>
                Subscribe to receive the TailsTalk 2 Premium badge with
                TailsTalk 2 Premium. Stripe handles payment securely; TailsTalk
                2 never sees your card details.
              </Trans>
            </div>
          }
        >
          {(subscription) => (
            <div>
              <Trans>
                You have an active {subscription().tier} subscription. Your
                TailsTalk 2 Premium badge is enabled.
                <Show when={subscription().cancel_at_period_end}>
                  <br />
                  <Trans>
                    Your subscription is scheduled to end at the end of this
                    billing period.
                  </Trans>
                </Show>
              </Trans>
            </div>
          )}
        </Show>
        <div>
          <Trans>Premium benefits:</Trans>
          <br />
          <Trans>• TailsTalk 2 Premium profile badge</Trans>
          <br />
          <Trans>• Attachments up to 2 GB</Trans>
          <br />
          <Trans>• More Premium benefits may be added later</Trans>
        </div>
        <Show when={!account()?.subscription}>
          <CategoryButton
            icon="blank"
            onClick={startCheckout}
            disabled={checkoutLoading()}
          >
            <Trans>Subscribe with Stripe</Trans>
          </CategoryButton>
          <CategoryButton
            icon="blank"
            onClick={() =>
              openModal({ type: "cash_payment", onConfirm: requestCashPayment })
            }
            disabled={
              cashPaymentLoading() ||
              account()?.cash_payment_request?.status === "pending"
            }
          >
            <Show
              when={account()?.cash_payment_request?.status === "pending"}
              fallback={<Trans>Request cash payment</Trans>}
            >
              <Trans>Cash payment request pending</Trans>
            </Show>
          </CategoryButton>
        </Show>
        <Show
          when={
            account()?.subscription &&
            !account()?.subscription?.cancel_at_period_end
          }
        >
          <CategoryButton
            icon="blank"
            onClick={() =>
              openModal({
                type: "cancel_premium",
                onConfirm: cancelSubscription,
                gifted: account()?.subscription?.provider === "gift",
              })
            }
            disabled={cancelLoading()}
          >
            <Trans>Cancel subscription</Trans>
          </CategoryButton>
        </Show>
        <Show when={account()?.subscription?.cancel_at_period_end}>
          <CategoryButton
            icon="blank"
            onClick={resumeSubscription}
            disabled={resumeLoading()}
          >
            <Trans>Uncancel subscription</Trans>
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
  cash_payment_request?: {
    status: "pending" | "approved" | "declined" | "completed";
    requested_at: string;
  };
};

import { Match, Show, Switch, createSignal, onMount } from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";
import { useNavigate } from "@solidjs/router";
import { useClient, useClientLifecycle } from "@revolt/client";
import { useModals } from "@revolt/modal";
import { Button, Column, Row, Text } from "@revolt/ui";
import { useState } from "@revolt/state";

import { suppressLeaveSitePromptOnce } from "./serviceWorkerInterface";
import { FlowTitle } from "@revolt/auth/src/flows/Flow";
import { PublicPage } from "./PublicPage";

/** Public Google Play account-deletion flow. */
export function AccountDeletionPage() {
  const state = useState();
  const navigate = useNavigate();
  const client = useClient();
  const { mfaFlow, showError } = useModals();
  const { isLoggedIn, lifecycle, logout } = useClientLifecycle();
  const [confirmed, setConfirmed] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);
  const [stripeCancellationFailed, setStripeCancellationFailed] =
    createSignal(false);
  const [deletionFailed, setDeletionFailed] = createSignal(false);

  onMount(() => {
    state.layout.setNextPath("/delete-account");
    // An unauthenticated public visit has no client connection that can ever
    // set loadedOnce(), so waiting for that flag leaves the page stuck on
    // "Checking your session...". A missing session is enough to redirect;
    // FlowLogin consumes nextPath after authentication.
    if (!isLoggedIn()) {
      navigate("/login/auth", { replace: true });
    }
  });

  async function deleteAccount() {
    setDeleting(true);
    setDeletionFailed(false);
    try {
      // Fetch MFA methods at click time. The page is also reachable before
      // login, so a query created while anonymous can otherwise leave us with
      // stale/undefined MFA data after the login redirect.
      const ticket = await mfaFlow(await client().account.mfa());
      if (!ticket) return;

      const result = await ticket.deleteAccount();
      setStripeCancellationFailed(
        result?.stripe_cancellation_failed === true,
      );
      setConfirmed(true);
      suppressLeaveSitePromptOnce();
      await logout();
    } catch (error) {
      setDeletionFailed(true);
      showError(error);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <PublicPage title="Delete account">
      <Column gap="lg">
      <FlowTitle>
        <Trans>Delete your TailsTalk 2 account</Trans>
      </FlowTitle>
      <Switch>
        <Match when={confirmed()}>
          <Column gap="md">
            <Text>
              <Trans>
                Your account, messages, and servers have been queued for
                deletion.
              </Trans>
            </Text>
            <Show when={stripeCancellationFailed()}>
              <Text role="alert">
                <Trans>
                  We could not cancel your Stripe subscription automatically.
                  If you purchased TailsTalk 2 Premium with Stripe, contact
                  payments@tails1154.com so we can cancel it manually.
                </Trans>
              </Text>
            </Show>
          </Column>
        </Match>
        <Match when={deletionFailed()}>
          <Text role="alert">
            <Trans>
              We could not complete the deletion request. Contact
              delete@tails1154.com as soon as possible so we can delete your
              account manually.
            </Trans>
          </Text>
        </Match>
        <Match when={isLoggedIn()}>
          <Column gap="md">
            <Text>
              <Trans>
                This permanently disables your account and queues your
                account, messages, and servers for deletion. Any active
                subscription will also be canceled when possible.
              </Trans>
            </Text>
            <Text>
              <Trans>
                You will be asked to confirm your password or authenticator
                before this happens.
              </Trans>
            </Text>
            <Row justify>
              <Button variant="text" onPress={() => navigate("/app")}>
                <Trans>Cancel</Trans>
              </Button>
              <Button
                variant="filled"
                isDisabled={deleting()}
                onPress={deleteAccount}
              >
                <Trans>Delete account</Trans>
              </Button>
            </Row>
          </Column>
        </Match>
        <Match when={!lifecycle.loadedOnce()}>
          <Text>
            <Trans>Checking your session...</Trans>
          </Text>
        </Match>
      </Switch>
      </Column>
    </PublicPage>
  );
}

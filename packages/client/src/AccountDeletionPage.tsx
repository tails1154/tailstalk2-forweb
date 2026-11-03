import { Match, Show, Switch, createEffect, createSignal, onMount } from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";
import { useNavigate } from "@solidjs/router";
import { createQuery } from "@tanstack/solid-query";

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
  // This page is public, so do not dereference client.user while the session
  // is still logged out. The settings page can safely use createMfaResource,
  // but this route is also rendered before the login redirect runs.
  const mfa = createQuery(() => ({
    queryKey: ["mfa", client().user?.id ?? "anonymous"],
    queryFn: () => client().account.mfa(),
    enabled: !!client().user,
    throwOnError: true,
  }));
  const [confirmed, setConfirmed] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);
  const [stripeCancellationFailed, setStripeCancellationFailed] =
    createSignal(false);
  const [deletionFailed, setDeletionFailed] = createSignal(false);

  onMount(() => {
    state.layout.setNextPath("/delete-account");
  });

  createEffect(() => {
    if (confirmed()) return;
    if (lifecycle.loadedOnce() && !isLoggedIn()) {
      state.layout.setNextPath("/delete-account");
      navigate("/login/auth", { replace: true });
    }
  });

  async function deleteAccount() {
    setDeleting(true);
    try {
      const ticket = await mfaFlow(mfa.data!);
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
                isDisabled={deleting() || mfa.isLoading}
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

import { Match, Show, Switch, createEffect, createSignal, onMount } from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";
import { styled } from "styled-system/jsx";

import { useClientLifecycle } from "@revolt/client";
import { State, TransitionType } from "@revolt/client/Controller";
import { useModals } from "@revolt/modal";
import {
  Button,
  CircularProgress,
  Column,
  Dialog,
  Row,
  Text,
  iconSize,
} from "@revolt/ui";

import MdArrowBack from "@material-design-icons/svg/filled/arrow_back.svg?component-solid";

import { useState } from "@revolt/state";
import { suppressLeaveSitePromptOnce } from "../../../../src/serviceWorkerInterface";
import { FlowTitle } from "./Flow";
import { Fields, Form, isInvalidStudentId } from "./Form";

const AccountWarning = styled("div", {
  base: {
    padding: "12px 16px",
    borderRadius: "12px",
    color: "var(--md-sys-color-on-error-container)",
    background: "var(--md-sys-color-error-container)",
    fontSize: "0.9em",
    lineHeight: "1.4",
  },
});

/**
 * Flow for logging into an account
 */
export default function FlowLogin() {
  const state = useState();
  const modals = useModals();
  const { t } = useLingui();
  const { lifecycle, isLoggedIn, login, loginWithPasskey, selectUsername } = useClientLifecycle();
  const [aisdChoice, setAisdChoice] = createSignal<boolean | null>(null);
  const [studentIdError, setStudentIdError] = createSignal(false);
  const [loginLoading, setLoginLoading] = createSignal(false);

  onMount(() => {
    let notice: { reason?: string } | undefined;
    try {
      notice = JSON.parse(localStorage.getItem("tailstalk2:ban-notice") ?? "null");
      localStorage.removeItem("tailstalk2:ban-notice");
    } catch {
      notice = undefined;
    }
    if (!notice) return;

    modals.showError(
      new Error(
        t`You are banned from TailsTalk 2.\n\nReason: ${notice.reason ?? "Your account has been disabled."}\n\nDo not create another account.`,
      ),
    );
  });

  createEffect(() => {
    if (!lifecycle.loadedOnce()) return;

    suppressLeaveSitePromptOnce();
    window.location.replace(state.layout.popNextPath() ?? "/");
  });
  /**
   * Log into account
   * @param data Form Data
   */
  async function performLogin(data: FormData) {
    if (loginLoading()) return;
    const studentId = (data.get("student-id") as string | null)?.trim();
    if (aisdChoice() && isInvalidStudentId(studentId ?? "")) {
      setStudentIdError(true);
      return;
    }
    setStudentIdError(false);
    const email = aisdChoice()
      ? `${studentId}@cats.angletonisd.net`
      : (data.get("email") as string);
    const password = data.get("password") as string;

    if (!email || !password) return;

    setLoginLoading(true);
    try {
      await login({ email, password }, modals);
    } catch (error) {
      if (error instanceof Error && error.name === "DisabledAccount") {
        modals.showError(new Error(t`This account cannot sign in.`));
      } else {
        modals.showError(error);
      }
    } finally {
      setLoginLoading(false);
    }
  }

  async function performPasskeyLogin() {
    if (loginLoading()) return;
    const emailField = document.querySelector('mdui-text-field[name="email"]') as
      | (HTMLElement & { value: string })
      | null;
    const email = (emailField?.value ?? "").trim();
    if (!email) {
      modals.showError(new Error(t`Enter your email to use a passkey.`));
      return;
    }
    setLoginLoading(true);
    try {
      await loginWithPasskey(email, modals);
    } catch (error) {
      if (
        error instanceof Error &&
        [
          "Your browser did not return a passkey.",
          "Your browser returned an invalid passkey response.",
        ].includes(error.message)
      ) {
        modals.showError(new Error(t`Your browser could not complete the passkey sign-in.`));
      } else {
        modals.showError(error);
      }
    } finally {
      setLoginLoading(false);
    }
  }

  /**
   * Select a new username
   * @param data Form Data
   */
  async function select(data: FormData) {
    const username = data.get("username") as string;
    await selectUsername(username);
  }

  return (
    <>
      <Dialog
        show={aisdChoice() === null}
        onClose={() => undefined}
        title={<Trans>Are you an AISD student?</Trans>}
      >
        <Column>
          <Text>
            <Trans>Select the login method that applies to you.</Trans>
          </Text>
          <Row justify>
            <Button type="button" onPress={() => setAisdChoice(true)}>
              <Trans>Yes, I’m an AISD student</Trans>
            </Button>
            <Button type="button" onPress={() => setAisdChoice(false)}>
              <Trans>No, continue with email</Trans>
            </Button>
          </Row>
        </Column>
      </Dialog>
      <Switch
        fallback={
          <>
            <FlowTitle subtitle={<Trans>Sign into TailsTalk 2</Trans>} emoji="wave">
              <Trans>Welcome!</Trans>
            </FlowTitle>
            <AccountWarning role="alert">
              <Trans>Your tails1154 account and TailsTalk 2 account are separate accounts.</Trans>
            </AccountWarning>
            <Form onSubmit={performLogin}>
              <Fields fields={[aisdChoice() ? "student-id" : "email", "password"]} />
              <Show when={studentIdError()}>
                <AccountWarning role="alert">
                  <Trans>You don't have to put @cats.angletonisd.net in this box or your ID is invalid. Please remove it</Trans>
                </AccountWarning>
              </Show>
              <Column gap="xl" align>
                <a href="/login/reset">
                  <Button variant="text">
                    <Trans>Reset password</Trans>
                  </Button>
                </a>
                <a href="/login/resend">
                  <Button variant="text">
                    <Trans>Resend verification</Trans>
                  </Button>
                </a>
              </Column>
              <Row align justify>
                <a href="..">
                  <Button variant="text">
                    <MdArrowBack {...iconSize("1.2em")} /> <Trans>Back</Trans>
                  </Button>
                </a>
                <Button type="submit">
                  <Trans>Login</Trans>
                </Button>
              </Row>
              <Show when={!aisdChoice()}>
                <Button type="button" variant="outlined" onPress={performPasskeyLogin}>
                  <Trans>Sign in with a passkey</Trans>
                </Button>
              </Show>
            </Form>
          </>
        }
      >
        <Match when={loginLoading()}>
          <Column align>
            <CircularProgress />
          </Column>
        </Match>
        <Match when={isLoggedIn()}>
          <CircularProgress />
        </Match>
        <Match when={lifecycle.state() === State.Onboarding}>
          <FlowTitle>
            <Trans>Choose a username</Trans>
          </FlowTitle>

          <Text>
            <Trans>
              Pick a username that you want people to be able to find you by.
              This can be changed later in your user settings.
            </Trans>
          </Text>

          <Form onSubmit={select}>
            <Fields fields={["username"]} />
            <Row align justify>
              <Button
                variant="text"
                onPress={() =>
                  lifecycle.transition({
                    type: TransitionType.Cancel,
                  })
                }
              >
                <MdArrowBack {...iconSize("1.2em")} /> <Trans>Cancel</Trans>
              </Button>
              <Button type="submit">
                <Trans>Confirm</Trans>
              </Button>
            </Row>
          </Form>
        </Match>
      </Switch>
    </>
  );
}

import { Match, Switch, createSignal } from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";

import { useClientLifecycle } from "@revolt/client";
import { State, TransitionType } from "@revolt/client/Controller";
import { useModals } from "@revolt/modal";
import { Navigate } from "@revolt/routing";
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
import { FlowTitle } from "./Flow";
import { Fields, Form } from "./Form";

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
  const { lifecycle, isLoggedIn, login, selectUsername } = useClientLifecycle();
  const [aisdChoice, setAisdChoice] = createSignal<boolean | null>(null);

  /**
   * Log into account
   * @param data Form Data
   */
  async function performLogin(data: FormData) {
    const studentId = (data.get("student-id") as string | null)?.trim();
    const email = aisdChoice()
      ? `${studentId}@cats.angletonisd.net`
      : (data.get("email") as string);
    const password = data.get("password") as string;

    if (!email || !password) return;

    await login(
      {
        email,
        password,
      },
      modals,
    );
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
            </Form>
          </>
        }
      >
        <Match when={isLoggedIn()}>
          <Navigate href={state.layout.popNextPath() ?? "/app"} />
        </Match>
        <Match when={lifecycle.state() === State.LoggingIn}>
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

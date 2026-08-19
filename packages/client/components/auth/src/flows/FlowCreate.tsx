import { Trans } from "@lingui-solid/solid/macro";

import { useApi, useClient, useClientLifecycle } from "@revolt/client";
import { CONFIGURATION } from "@revolt/common";
import { useModals } from "@revolt/modal";
import { useNavigate, useParams } from "@revolt/routing";
import { Button, Column, Dialog, Row, Text, iconSize } from "@revolt/ui";

import MdArrowBack from "@material-design-icons/svg/filled/arrow_back.svg?component-solid";

import { createSignal, Show } from "solid-js";
import { FlowTitle } from "./Flow";
import { setFlowCheckEmail } from "./FlowCheck";
import { Fields, Form } from "./Form";

/**
 * Flow for creating a new account
 */
export default function FlowCreate() {
  const api = useApi();
  const getClient = useClient();
  const navigate = useNavigate();
  const { code } = useParams();
  const modals = useModals();
  const [aisdChoice, setAisdChoice] = createSignal<boolean | null>(null);
  const isAisdStudent = () => aisdChoice() === true;
  const { login } = useClientLifecycle();

  /**
   * Create an account
   * @param data Form Data
   */
  async function create(data: FormData) {
    const studentId = (data.get("student-id") as string | null)?.trim();
    const email = isAisdStudent()
      ? `${studentId}@cats.angletonisd.net`
      : (data.get("email") as string);
    const password = data.get("new-password") as string;
    const captcha = data.get("captcha") as string;
    const invite = data.get("invite") as string;

    await api.post("/auth/account/create", {
      email,
      password,
      captcha,
      ...(invite ? { invite } : {}),
    });

    const client = getClient();
    if (client.configuration && !client.configuration.features.email) {
      await login(
        {
          email,
          password,
        },
        modals,
      );
      navigate("/login/auth", { replace: true });
    } else {
      setFlowCheckEmail(email);
      navigate("/login/check", { replace: true });
    }
  }

  const isInviteOnly = () => {
    const client = getClient();
    if (client.configured()) {
      return client.configuration?.features.invite_only;
    }
    return false;
  };

  return (
    <>
      <Dialog
        show={aisdChoice() === null}
        onClose={() => navigate("..")}
        title={<Trans>Are you an AISD student?</Trans>}
      >
        <Column>
          <Text>
            <Trans>Select the registration method that applies to you.</Trans>
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
      <FlowTitle subtitle={<Trans>Create an account</Trans>} emoji="wave">
        <Trans>Hello!</Trans>
      </FlowTitle>
      <Show when={aisdChoice() !== null}>
        <Form onSubmit={create} captcha={CONFIGURATION.HCAPTCHA_SITEKEY}>
          <Fields
            fields={[
              isAisdStudent() ? "student-id" : "email",
              "new-password",
            ]}
          />
          <Show when={isInviteOnly()}>
            <Fields fields={[{ field: "invite", value: code }]} />
          </Show>
          <Row justify>
            <a href="..">
              <Button variant="text">
                <MdArrowBack {...iconSize("1.2em")} /> <Trans>Back</Trans>
              </Button>
            </a>
            <Button type="submit">
              <Trans>Register</Trans>
            </Button>
          </Row>
        </Form>
      </Show>
      {import.meta.env.DEV && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            background: "white",
            color: "black",
            cursor: "pointer",
          }}
          onClick={() => {
            setFlowCheckEmail("insert@stoat.chat");
            navigate("/login/check", { replace: true });
          }}
        >
          Mock Submission
        </div>
      )}
    </>
  );
}

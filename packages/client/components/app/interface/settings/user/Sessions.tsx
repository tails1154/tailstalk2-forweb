import {
  BiLogosAndroid,
  BiLogosApple,
  BiLogosWindows,
  BiRegularQuestionMark,
} from "solid-icons/bi";
import { FaBrandsLinux } from "solid-icons/fa";
import {
  Accessor,
  For,
  Match,
  Show,
  Switch,
  createMemo,
  createSignal,
  onMount,
} from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";
import { Session } from "stoat.js";
import { styled } from "styled-system/jsx";

import { useClient } from "@revolt/client";
import { useModals } from "@revolt/modal";
import {
  CategoryButton,
  CircularProgress,
  Column,
  Time,
  Text,
  TextField,
  iconSize,
} from "@revolt/ui";

import MdLogout from "@material-design-icons/svg/outlined/logout.svg?component-solid";
import MdKey from "@material-design-icons/svg/outlined/key.svg?component-solid";
import { requestClientJson } from "../../../../client/customApi";
import { createPasskeyCredential } from "../../../../client/passkeys";

/**
 * Sessions
 */
export function Sessions() {
  const client = useClient();
  onMount(() => client().sessions.fetch());

  /**
   * Sort the other sessions by created date
   */
  const otherSessions = createMemo(() =>
    client()
      .sessions.filter((session) => !session.current)
      .sort((a, b) => +b.createdAt - +a.createdAt),
  );

  return (
    <Column gap="lg">
      <Switch fallback={<CircularProgress />}>
        <Match when={client().sessions.size()}>
          <ManageCurrentSession otherSessions={otherSessions} />
          <ListOtherSessions otherSessions={otherSessions} />
        </Match>
      </Switch>
      <PasskeySettings />
    </Column>
  );
}

type PasskeyEntry = { id: string; name: string };

function PasskeySettings() {
  const client = useClient();
  const { showError } = useModals();
  const { t } = useLingui();
  const [passkeys, setPasskeys] = createSignal<PasskeyEntry[]>([]);
  const [password, setPassword] = createSignal("");
  const [name, setName] = createSignal("");
  const [busy, setBusy] = createSignal(false);

  async function refresh() {
    try {
      setPasskeys(await requestClientJson<PasskeyEntry[]>(client().api, "GET", "/auth/session/passkeys"));
    } catch (error) {
      showError(error);
    }
  }

  onMount(refresh);

  async function addPasskey() {
    if (!password()) {
      showError(new Error(t`Enter your password to add a passkey.`));
      return;
    }
    setBusy(true);
    try {
      const start = await requestClientJson<{
        challenge_id: string;
        publicKey: Parameters<typeof createPasskeyCredential>[0];
      }>(client().api, "POST", "/auth/session/passkeys/register/start", { password: password() });
      const credential = await createPasskeyCredential(start.publicKey);
      await requestClientJson(client().api, "POST", "/auth/session/passkeys/register/finish", {
        challenge_id: start.challenge_id,
        credential,
        name: name().trim() || "Passkey",
      });
      setPassword("");
      setName("");
      await refresh();
    } catch (error) {
      if (error instanceof Error && [
        "Your browser did not return a passkey.",
        "Your browser returned an invalid passkey response.",
        "Passkey registration options are incomplete.",
      ].includes(error.message)) {
        showError(new Error(t`Your browser could not complete passkey registration.`));
      } else {
        showError(error);
      }
    } finally {
      setBusy(false);
    }
  }

  async function removePasskey(id: string) {
    if (!password()) {
      showError(new Error(t`Enter your password to remove a passkey.`));
      return;
    }
    setBusy(true);
    try {
      await requestClientJson(client().api, "DELETE", `/auth/session/passkeys/${encodeURIComponent(id)}`, {
        password: password(),
      });
      setPassword("");
      await refresh();
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Column gap="md">
      <Text><Trans>Passkeys</Trans></Text>
      <Text><Trans>Use your device unlock, security key, or password manager to sign in.</Trans></Text>
      <TextField
        type="password"
        label={t`Confirm your password`}
        value={password()}
        onInput={(event) => setPassword(event.currentTarget.value)}
        autocomplete="current-password"
      />
      <TextField
        label={t`Passkey name`}
        value={name()}
        onInput={(event) => setName(event.currentTarget.value)}
        maxlength={80}
      />
      <CategoryButton.Group>
        <CategoryButton action="chevron" icon={<MdKey {...iconSize(22)} />} onClick={addPasskey} disabled={busy()}>
          <Trans>Add a passkey</Trans>
        </CategoryButton>
        <For each={passkeys()}>
          {(passkey) => (
            <CategoryButton action="chevron" icon={<MdKey {...iconSize(22)} />} onClick={() => removePasskey(passkey.id)} disabled={busy()}>
              <Trans>Remove passkey: {passkey.name}</Trans>
            </CategoryButton>
          )}
        </For>
      </CategoryButton.Group>
    </Column>
  );
}

/**
 * Manage user's current session
 */
function ManageCurrentSession(props: { otherSessions: Accessor<Session[]> }) {
  const client = useClient();
  const { openModal } = useModals();

  /**
   * Resolve current session
   */
  const currentSession = () => client().sessions.get(client().sessionId!);

  return (
    <CategoryButton.Group>
      <CategoryButton.Collapse
        title={<Trans>Current Session</Trans>}
        description={currentSession()?.name}
        icon={<SessionIcon session={currentSession()} />}
      >
        <CategoryButton
          icon="blank"
          action="chevron"
          onClick={() =>
            currentSession() &&
            openModal({
              type: "rename_session",
              session: currentSession()!,
            })
          }
        >
          <Trans>Rename</Trans>
        </CategoryButton>
      </CategoryButton.Collapse>
      {/* <CategoryButton
        action="chevron"
        icon={
          <MdAutoMode
            {...iconSize(24)}
            fill="var(--md-sys-color-error)"
          />
        }
        description={Keeps your last sessions active and automatically logs you out of other ones"}
      >
        Keep Last Active Sessions
      </CategoryButton> */}
      <Show when={props.otherSessions().length}>
        <CategoryButton
          action="chevron"
          onClick={() =>
            openModal({
              type: "sign_out_sessions",
              client: client(),
            })
          }
          icon={<MdLogout {...iconSize(24)} fill="var(--md-sys-color-error)" />}
          description={
            <Trans>Logs you out of all sessions except this device.</Trans>
          }
        >
          <Trans>Log Out Other Sessions</Trans>
        </CategoryButton>
      </Show>
    </CategoryButton.Group>
  );
}

/**
 * List other logged in sessions
 */
function ListOtherSessions(props: { otherSessions: Accessor<Session[]> }) {
  const { openModal } = useModals();

  return (
    <Show when={props.otherSessions().length}>
      <Column>
        <CategoryButton.Group>
          <For each={props.otherSessions()}>
            {(session) => (
              <CategoryButton.Collapse
                icon={<SessionIcon session={session} />}
                title={<Capitalise>{session.name}</Capitalise>}
                description={
                  <Trans>
                    Created <Time value={session.createdAt} format="relative" />
                  </Trans>
                }
              >
                <CategoryButton
                  icon="blank"
                  action="chevron"
                  onClick={() =>
                    openModal({
                      type: "rename_session",
                      session,
                    })
                  }
                >
                  <Trans>Rename</Trans>
                </CategoryButton>
                <CategoryButton
                  icon="blank"
                  action="chevron"
                  onClick={() => session.delete()}
                >
                  <Trans>Log Out</Trans>
                </CategoryButton>
              </CategoryButton.Collapse>
            )}
          </For>
        </CategoryButton.Group>
      </Column>
    </Show>
  );
}

/**
 * Capitalize session titles
 */
const Capitalise = styled("div", {
  base: {
    textTransform: "capitalize",
  },
});

/**
 * Show icon for session
 */
function SessionIcon(props: { session?: Session }) {
  return (
    <Switch fallback={<BiRegularQuestionMark size={22} />}>
      <Match when={/linux/i.test(props.session?.name ?? "")}>
        <FaBrandsLinux size={22} />
      </Match>
      <Match when={/windows/i.test(props.session?.name ?? "")}>
        <BiLogosWindows size={22} />
      </Match>
      <Match when={/android/i.test(props.session?.name ?? "")}>
        <BiLogosAndroid size={22} />
      </Match>
      <Match when={/mac.*os|i(Pad)?os/i.test(props.session?.name ?? "")}>
        <BiLogosApple size={22} />
      </Match>
    </Switch>
  );
}

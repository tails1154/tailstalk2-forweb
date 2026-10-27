import { For } from "solid-js";
import { useLingui } from "@lingui-solid/solid/macro";
import { styled } from "styled-system/jsx";

import { useUsers } from "@revolt/markdown/users";
import { useVoice } from "@revolt/rtc";
import { Avatar, Text } from "@revolt/ui/components/design";

import { VoiceCallCardActions } from "./VoiceCallCardActions";
import { VoiceCallCardStatus } from "./VoiceCallCardStatus";

export function VoiceCallCardActiveRoom() {
  const voice = useVoice();
  const { t } = useLingui();
  const users = useUsers(voice.participants, true);

  return (
    <View>
      <Participants>
        <For each={users()}>
          {(user) => (
            <Participant>
              <Avatar size={48} src={user?.avatar} fallback={user?.username} />
              <Text>{user?.username ?? t`Unknown user`}</Text>
            </Participant>
          )}
        </For>
      </Participants>
      <VoiceCallControls>
        <VoiceCallControlHolder>
          <VoiceCallCardStatus />
        </VoiceCallControlHolder>
        <VoiceCallCardActions size="sm" />
      </VoiceCallControls>
    </View>
  );
}

const View = styled("div", {
  base: {
    minHeight: 0,
    height: "100%",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "var(--gap-md)",
    padding: "var(--gap-md)",
  },
});

const Participants = styled("div", {
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignContent: "center",
    justifyContent: "center",
    gap: "var(--gap-md)",
    flex: "1",
    minHeight: 0,
    overflow: "auto",
  },
});

const Participant = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    gap: "var(--gap-md)",
    padding: "var(--gap-lg)",
    minWidth: "180px",
    borderRadius: "var(--borderRadius-lg)",
    background: "var(--md-sys-color-surface-container)",
  },
});

const VoiceCallControls = styled("div", {
  base: {
    display: "flex",
    flexShrink: 0,
    flexDirection: "row-reverse",
    alignItems: "center",
  },
});

const VoiceCallControlHolder = styled("div", {
  base: {
    display: "flex",
    flex: "1",
    justifyContent: "flex-start",
    padding: "var(--gap-md)",
  },
});

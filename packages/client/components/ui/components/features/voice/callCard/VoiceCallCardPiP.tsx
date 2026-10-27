import { For } from "solid-js";
import { styled } from "styled-system/jsx";

import { useUsers } from "@revolt/markdown/users";
import { useVoice } from "@revolt/rtc";
import { Avatar } from "@revolt/ui/components/design";

import { VoiceCallCardActions } from "./VoiceCallCardActions";
import { VoiceCallCardStatus } from "./VoiceCallCardStatus";

export function VoiceCallCardPiP() {
  const voice = useVoice();
  const users = useUsers(voice.participants);

  return (
    <MiniCard>
      <VoiceCallCardStatus pip />
      <Users>
        <For each={users()}>
          {(user) => <Avatar size={24} src={user?.avatar} fallback={user?.username} shape="square" />}
        </For>
      </Users>
      <VoiceCallCardActions size="xs" />
    </MiniCard>
  );
}

const Users = styled("div", {
  base: { display: "flex", gap: "var(--gap-sm)", flexWrap: "wrap" },
});

const MiniCard = styled("div", {
  base: {
    userSelect: "none",
    pointerEvents: "all",
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    flexDirection: "column",
    justifyContent: "end",
    gap: "var(--gap-md)",
    padding: "var(--gap-md)",
    borderRadius: "var(--borderRadius-lg)",
    background: "var(--md-sys-color-secondary-container)",
  },
});

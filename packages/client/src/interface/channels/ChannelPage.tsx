import { Component, Match, Show, Switch, createMemo } from "solid-js";

import { Channel } from "stoat.js";
import { styled } from "styled-system/jsx";

import { useClient } from "@revolt/client";
import { Navigate, useParams } from "@revolt/routing";
import { useVoice } from "@revolt/rtc";
import { Header } from "@revolt/ui";

import { VoiceCallCardActiveRoom } from "../../../components/ui/components/features/voice/callCard/VoiceCallCardActiveRoom";
import { VoiceCallCardPreview } from "../../../components/ui/components/features/voice/callCard/VoiceCallCardPreview";
import { AgeGate } from "./AgeGate";
import { ChannelHeader } from "./ChannelHeader";
import { ForumChannel } from "./forum/ForumChannel";
import { TextChannel } from "./text/TextChannel";

/**
 * Channel layout
 */
const Base = styled("div", {
  base: {
    minWidth: 0,
    flexGrow: 1,
    display: "flex",
    position: "relative",
    flexDirection: "column",
  },
});

export interface ChannelPageProps {
  channel: Channel;
}

const TEXT_CHANNEL_TYPES: Channel["type"][] = [
  "TextChannel",
  "DirectMessage",
  "Group",
  "SavedMessages",
];

/**
 * Channel component
 */
export const ChannelPage: Component = () => {
  const params = useParams();
  const client = useClient();
  const channel = createMemo(() => client()!.channels.get(params.channel)!);

  return (
    <Base>
      <Switch fallback="Unknown channel type!">
        <Match when={!channel()}>
          <Navigate href={"../.."} />
        </Match>
        <Match when={channel()!.serverId && channel()!.isVoice}>
          <VoiceChannel channel={channel()!} />
        </Match>
        <Match when={TEXT_CHANNEL_TYPES.includes(channel()!.type)}>
          <AgeGate
            enabled={channel().mature}
            contentId={channel().id}
            contentName={"#" + channel().name}
            contentType="channel"
          >
            <ShowForumOrText channel={channel()} />
          </AgeGate>
        </Match>
        {/* <Match when={channel()!.type === "VoiceChannel"}>
            <Header placement="primary">
              <ChannelHeader channel={channel()} />
            </Header>
          </Match> */}
      </Switch>
    </Base>
  );
};

function ShowForumOrText(props: { channel: Channel }) {
  return (
    <Show
      when={props.channel.forum}
      fallback={<TextChannel channel={props.channel} />}
    >
      <ForumChannel channel={props.channel} />
    </Show>
  );
}

function VoiceChannel(props: { channel: Channel }) {
  const voice = useVoice();
  const connected = () =>
    voice.channel()?.id === props.channel.id && voice.state() !== "READY";

  return (
    <VoiceView>
      <Header placement="primary">
        <ChannelHeader channel={props.channel} />
      </Header>
      <VoicePanel>
        <Show
          when={connected()}
          fallback={<VoiceCallCardPreview channel={props.channel} />}
        >
          <VoiceCallCardActiveRoom />
        </Show>
      </VoicePanel>
    </VoiceView>
  );
}

const VoiceView = styled("div", {
  base: {
    minWidth: 0,
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
  },
});

const VoicePanel = styled("main", {
  base: {
    flexGrow: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "var(--gap-xl)",
  },
});

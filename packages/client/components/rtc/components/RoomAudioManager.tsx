import { For, createEffect } from "solid-js";

import { useState } from "@revolt/state";

import { useVoice } from "../state";

export function RoomAudioManager() {
  const voice = useVoice();
  const state = useState();

  return (
    <div style={{ display: "none" }}>
      <For each={voice.remoteStreams()}>
        {(remote) => {
          let audio: HTMLAudioElement | undefined;
          createEffect(() => {
            if (!audio) return;
            audio.srcObject = remote.stream;
            audio.volume = state.voice.outputVolume * state.voice.getUserVolume(remote.userId);
            audio.muted = voice.deafen() || state.voice.getUserMuted(remote.userId);
            void audio.play().catch(() => undefined);
          });
          return <audio ref={(element) => (audio = element)} autoplay />;
        }}
      </For>
    </div>
  );
}

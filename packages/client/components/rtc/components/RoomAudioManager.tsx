import { For } from "solid-js";
import { AudioTrack, useTracks } from "solid-livekit-components";
import { Track } from "livekit-client";

/** Render subscribed LiveKit audio tracks outside the visual call layout. */
export function RoomAudioManager() {
  const audioTracks = useTracks(
    [Track.Source.Microphone, Track.Source.ScreenShareAudio],
    { onlySubscribed: true },
  );

  return (
    <For each={audioTracks()}>
      {(track) => <AudioTrack trackRef={track} autoplay />}
    </For>
  );
}

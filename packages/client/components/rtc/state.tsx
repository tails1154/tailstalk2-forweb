import {
  Accessor,
  batch,
  createContext,
  createSignal,
  JSX,
  Setter,
  useContext,
} from "solid-js";
import {
  RoomContext,
  TrackReferenceOrPlaceholder,
  useTracks,
} from "solid-livekit-components";

import {
  Room,
  ScreenSharePresets,
  Track,
  VideoResolution,
} from "livekit-client";
import { DenoiseTrackProcessor } from "livekit-rnnoise-processor";
import { Channel } from "stoat.js";

import { SoundController, useClient, useSound } from "@revolt/client";
import { CONFIGURATION } from "@revolt/common";
import { ModalController, useModals } from "@revolt/modal";
import { useState } from "@revolt/state";
import {
  ScreenShareQualityName,
  Voice as VoiceSettings,
} from "@revolt/state/stores/Voice";
import { VoiceCallCardContext } from "@revolt/ui/components/features/voice/callCard/VoiceCallCard";

import { InRoom } from "./components/InRoom";
import { RoomAudioManager } from "./components/RoomAudioManager";

type State =
  | "READY"
  | "DISCONNECTED"
  | "CONNECTING"
  | "CONNECTED"
  | "RECONNECTING";

type ScreenShareQuality = {
  name: ScreenShareQualityName;
  resolution: VideoResolution;
  fullName: string;
  contentHint: string;
};

// Keep this outside Voice as a final safety net. During app route transitions
// Solid can briefly mount two voice contexts, and each one would otherwise be
// able to call join_call before the other context updates its local state.
let activeVoiceChannelId: string | undefined;

const VOICE_SIGNALING_URL =
  (import.meta.env.VITE_VOICE_URL as string | undefined) ??
  "wss://tails1154.com:9961/vc";

type VoicePeer = {
  id: string;
  userId: string;
  username?: string;
  connection: RTCPeerConnection;
};

type RemoteVoiceStream = { peerId: string; userId: string; stream: MediaStream };

class Voice {
  #settings: VoiceSettings;

  channel: Accessor<Channel | undefined>;
  #setChannel: Setter<Channel | undefined>;

  room: Accessor<Room | undefined>;
  #setRoom: Setter<Room | undefined>;

  vidTracks: Accessor<TrackReferenceOrPlaceholder[]>;

  state: Accessor<State>;
  #setState: Setter<State>;

  deafen: Accessor<boolean>;
  microphone: Accessor<boolean>;

  video: Accessor<boolean>;
  #setVideo: Setter<boolean>;

  screenshare: Accessor<boolean>;
  #setScreenshare: Setter<boolean>;

  fullscreen: Accessor<boolean>;
  #setFullscreen: Setter<boolean>;

  focusId: Accessor<string | undefined>;
  #setFocus: Setter<string | undefined>;

  showBar: Accessor<boolean>;
  #setShowBar: Setter<boolean>;

  private sound: SoundController;

  /** Prevent an older async join request from connecting after a newer one. */
  private connectionGeneration = 0;
  /** Prevent two UI entry points from starting the same join concurrently. */
  private connectingChannelId?: string;

  private openModal;
  private getClient;
  private screenShareTracks: Set<string>;
  private voiceSocket?: WebSocket;
  private localVoiceStream?: MediaStream;
  private voicePeers = new Map<string, VoicePeer>();
  private localVoicePeerId?: string;
  private explicitVoiceDisconnect = false;

  constructor(
    voiceSettings: VoiceSettings,
    modals: ModalController,
    sound: SoundController,
  ) {
    this.#settings = voiceSettings;
    this.sound = sound;

    const [channel, setChannel] = createSignal<Channel>();
    this.channel = channel;
    this.#setChannel = setChannel;

    const [room, setRoom] = createSignal<Room>();
    this.room = room;
    this.#setRoom = setRoom;

    this.vidTracks = () => [];

    const [state, setState] = createSignal<State>("READY");
    this.state = state;
    this.#setState = setState;

    this.deafen = () => voiceSettings.deafen;
    this.microphone = () => voiceSettings.micOn && !voiceSettings.deafen;

    const [video, setVideo] = createSignal(false);
    this.video = video;
    this.#setVideo = setVideo;

    const [screenshare, setScreenshare] = createSignal(false);
    this.screenshare = screenshare;
    this.#setScreenshare = setScreenshare;

    const [fullscreen, setFullscreen] = createSignal(false);
    this.fullscreen = fullscreen;
    this.#setFullscreen = setFullscreen;

    const [focus, setFocus] = createSignal<string>();
    this.focusId = focus;
    this.#setFocus = setFocus;

    const [showBar, setShowBar] = createSignal(true);
    this.showBar = showBar;
    this.#setShowBar = setShowBar;

    this.openModal = modals.openModal;

    this.getClient = useClient();

    this.screenShareTracks = new Set();

    const [remoteStreams, setRemoteStreams] = createSignal<RemoteVoiceStream[]>([]);
    this.remoteStreams = remoteStreams;
    this.setRemoteStreams = setRemoteStreams;

    const [participants, setParticipants] = createSignal<string[]>([]);
    this.participants = participants;
    this.setParticipants = setParticipants;
  }

  remoteStreams: Accessor<RemoteVoiceStream[]>;
  private setRemoteStreams: Setter<RemoteVoiceStream[]>;
  participants: Accessor<string[]>;
  private setParticipants: Setter<string[]>;

  async connect(channel: Channel, auth?: { url: string; token: string }) {
    // A channel can expose both the header join button and the call-card
    // preview during a render transition. Ignore a duplicate event while the
    // first join is already in progress instead of forcing it out.
    const currentChannel = this.channel();
    const currentState = this.state();
    if (
      currentChannel?.id === channel.id &&
      (currentState === "CONNECTING" ||
        currentState === "CONNECTED" ||
        currentState === "RECONNECTING")
    ) {
      return;
    }

    if (this.connectingChannelId === channel.id) return;
    if (activeVoiceChannelId === channel.id) return;
    this.connectingChannelId = channel.id;
    activeVoiceChannelId = channel.id;

    // TailsTalk 2 voice uses its own WebRTC mesh and signaling service. Keep
    // this path independent from the legacy LiveKit/voice-ingress stack.
    await this.connectCustomVoice(channel);
    return;

    this.disconnect();
    const generation = ++this.connectionGeneration;

    const room = new Room({
      audioCaptureDefaults: {
        deviceId: this.#settings.preferredAudioInputDevice,
        echoCancellation: this.#settings.echoCancellation,
        noiseSuppression: this.#settings.noiseSupression === "browser",
        autoGainControl: this.#settings.autoGainControl,
      },
      audioOutput: {
        deviceId: this.#settings.preferredAudioOutputDevice,
      },
      videoCaptureDefaults: {
        deviceId: this.#settings.preferredVideoDevice,
      },
    });

    this.vidTracks = useTracks(
      [
        { source: Track.Source.Camera, withPlaceholder: true },
        { source: Track.Source.ScreenShare, withPlaceholder: false },
      ],
      { room, onlySubscribed: false },
    );

    batch(() => {
      this.#setRoom(room);
      this.#setChannel(channel);
      this.#setState("CONNECTING");
      this.#setVideo(false);
      this.#setScreenshare(false);
    });

    room.addListener("connected", () => {
      this.#setState("CONNECTED");
      if (this.speakingPermission)
        room.localParticipant
          .setMicrophoneEnabled(this.#settings.micOn)
          .then((track) => {
            this.#settings.micOn = track != null;
            if (this.#settings.noiseSupression === "enhanced") {
              track?.audioTrack?.setProcessor(
                new DenoiseTrackProcessor({
                  workletCDNURL: CONFIGURATION.RNNOISE_WORKLET_CDN_URL,
                }),
              );
            }
          });
      for (const p of room.remoteParticipants.values()) {
        const screenShareTrack = p.getTrackPublication(
          Track.Source.ScreenShare,
        );
        if (screenShareTrack) {
          this.screenShareTracks.add(screenShareTrack.trackSid);
        }
      }
      this.sound.playSound("userJoinVoice");
    });

    room.addListener("disconnected", () => this.#setState("DISCONNECTED"));

    room.addListener("participantConnected", () => {
      this.sound.playSound("userJoinVoice");
    });

    room.addListener("participantDisconnected", () => {
      this.sound.playSound("userLeaveVoice");
    });

    room.addListener("trackPublished", (pub) => {
      if (pub.source === Track.Source.ScreenShare) {
        pub.once("subscribed", (track) => {
          // Play the sound once playback starts, which might be quite a bit after subscription
          // as it starts paused for the screen share settings modal.
          track.once("videoPlaybackStarted", () => {
            this.sound.playSound("streamStart");
            if (track.sid) {
              this.screenShareTracks.add(track.sid);
            }
          });
        });
      }
    });

    room.addListener("trackUnpublished", (unpub) => {
      if (this.screenShareTracks.has(unpub.trackSid)) {
        this.sound.playSound("streamEnd");
        this.screenShareTracks.delete(unpub.trackSid);
      }
    });

    try {
      if (!auth) {
        // A second join request uses force_disconnect and removes the first
        // LiveKit session. Do not retry here; the user can safely retry after
        // the failed request has been surfaced.
        auth = await channel.joinCall(
          "worldwide",
          currentChannel?.id !== channel.id,
        );
      }

      if (!auth?.url || !auth?.token) {
        throw new Error("Voice server did not provide room credentials");
      }

      // The request may have completed after another connect/disconnect began.
      // Never let that stale request create a second LiveKit participant.
      if (generation !== this.connectionGeneration) {
        room.disconnect();
        return;
      }

      await room.connect(auth!.url, auth!.token, {
        autoSubscribe: true,
      });

      if (generation !== this.connectionGeneration || this.room() !== room) {
        room.disconnect();
      }
    } catch (error) {
      room.removeAllListeners();
      room.disconnect();

      if (generation === this.connectionGeneration && this.room() === room) {
        batch(() => {
          this.#setState("READY");
          this.#setRoom();
          this.#setChannel();
          this.vidTracks = () => [];
        });
        this.onErr(error);
      }
    } finally {
      if (this.connectingChannelId === channel.id) {
        this.connectingChannelId = undefined;
      }
      if (activeVoiceChannelId === channel.id && this.room() === undefined) {
        activeVoiceChannelId = undefined;
      }
    }
  }

  private async connectCustomVoice(channel: Channel) {
    this.disconnectCustomVoice();
    const generation = ++this.connectionGeneration;
    this.explicitVoiceDisconnect = false;
    this.#setChannel(channel);
    this.#setState("CONNECTING");
    this.#setVideo(false);
    this.#setScreenshare(false);

    try {
      const [header, token] = this.getClient().authenticationHeader;
      this.localVoiceStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: this.#settings.preferredAudioInputDevice || undefined,
          echoCancellation: this.#settings.echoCancellation,
          noiseSuppression: this.#settings.noiseSupression === "browser",
          autoGainControl: this.#settings.autoGainControl,
        },
        video: false,
      });
      this.localVoiceStream.getAudioTracks().forEach((track) => {
        track.enabled = this.#settings.micOn && !this.#settings.deafen;
      });

      const socket = new WebSocket(VOICE_SIGNALING_URL);
      this.voiceSocket = socket;

      socket.addEventListener("message", (event) => {
        try {
          void this.handleVoiceSignal(JSON.parse(event.data as string), channel, generation).catch((error) => this.onErr(error));
        } catch (error) {
          this.onErr(error);
        }
      });
      socket.addEventListener("close", () => {
        if (!this.explicitVoiceDisconnect && generation === this.connectionGeneration) {
          this.#setState("DISCONNECTED");
        }
      });

      await new Promise<void>((resolve, reject) => {
        socket.addEventListener("open", () => {
          socket.send(JSON.stringify({
            type: "join",
            room: channel.id,
            token: header === "X-Bot-Token" ? token : token,
          }));
        }, { once: true });
        socket.addEventListener("error", () => reject(new Error("Voice signaling connection failed")), { once: true });
        socket.addEventListener("close", () => {
          if (this.state() === "CONNECTING") reject(new Error("Voice signaling connection closed"));
        }, { once: true });
      });
    } catch (error) {
      this.disconnectCustomVoice();
      this.#setState("READY");
      if (activeVoiceChannelId === channel.id) activeVoiceChannelId = undefined;
      this.onErr(error);
    } finally {
      if (this.connectingChannelId === channel.id) this.connectingChannelId = undefined;
    }
  }

  private async handleVoiceSignal(message: any, channel: Channel, generation: number) {
    if (generation !== this.connectionGeneration) return;
    if (message.type === "error") throw new Error(`Voice error: ${message.code}`);

    if (message.type === "joined") {
      this.localVoicePeerId = message.peer_id;
      this.setParticipants([this.getClient().user?.id ?? "", ...message.peers.map((peer: any) => peer.user_id)].filter(Boolean));
      this.#setState("CONNECTED");
      for (const peer of message.peers) await this.createVoicePeer(peer, this.localVoicePeerId! < peer.peer_id);
      this.sound.playSound("userJoinVoice");
      return;
    }

    if (message.type === "peer_joined") {
      this.setParticipants((ids) => [...new Set([...ids, message.user_id])]);
      await this.createVoicePeer({ peer_id: message.peer_id, user_id: message.user_id, username: message.username }, this.localVoicePeerId! < message.peer_id);
      this.sound.playSound("userJoinVoice");
      return;
    }

    if (message.type === "peer_left") {
      this.voicePeers.get(message.peer_id)?.connection.close();
      this.voicePeers.delete(message.peer_id);
      this.setRemoteStreams((streams) => streams.filter((stream) => stream.peerId !== message.peer_id));
      this.setParticipants((ids) => ids.filter((id) => id !== message.user_id));
      this.sound.playSound("userLeaveVoice");
      return;
    }

    const peer = this.voicePeers.get(message.from);
    if (!peer) return;
    if (message.type === "offer") {
      await peer.connection.setRemoteDescription(message.payload);
      const answer = await peer.connection.createAnswer();
      await peer.connection.setLocalDescription(answer);
      this.sendVoiceSignal({ type: "answer", to: message.from, payload: answer });
    } else if (message.type === "answer") {
      await peer.connection.setRemoteDescription(message.payload);
    } else if (message.type === "candidate" && message.payload) {
      await peer.connection.addIceCandidate(message.payload);
    }
  }

  private async createVoicePeer(info: { peer_id: string; user_id: string; username?: string }, initiator: boolean) {
    if (this.voicePeers.has(info.peer_id)) return;
    const connection = new RTCPeerConnection();
    const peer = { id: info.peer_id, userId: info.user_id, username: info.username, connection };
    this.voicePeers.set(info.peer_id, peer);
    this.localVoiceStream?.getTracks().forEach((track) => connection.addTrack(track, this.localVoiceStream!));
    connection.onicecandidate = (event) => {
      if (event.candidate) this.sendVoiceSignal({ type: "candidate", to: info.peer_id, payload: event.candidate });
    };
    connection.ontrack = (event) => {
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      this.setRemoteStreams((streams) => [
        ...streams.filter((item) => item.peerId !== info.peer_id),
        { peerId: info.peer_id, userId: info.user_id, stream },
      ]);
    };
    if (initiator) {
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      this.sendVoiceSignal({ type: "offer", to: info.peer_id, payload: offer });
    }
  }

  private sendVoiceSignal(message: object) {
    if (this.voiceSocket?.readyState === WebSocket.OPEN) this.voiceSocket.send(JSON.stringify(message));
  }

  private disconnectCustomVoice() {
    this.explicitVoiceDisconnect = true;
    this.voiceSocket?.close();
    this.voiceSocket = undefined;
    this.voicePeers.forEach((peer) => peer.connection.close());
    this.voicePeers.clear();
    this.localVoiceStream?.getTracks().forEach((track) => track.stop());
    this.localVoiceStream = undefined;
    this.localVoicePeerId = undefined;
    this.setRemoteStreams([]);
    this.setParticipants([]);
  }

  disconnect() {
    const hadActiveRoom =
      this.room() !== undefined && this.state() !== "READY";
    const disconnectedChannelId = this.channel()?.id;
    this.connectionGeneration++;
    this.disconnectCustomVoice();

    try {
      const room = this.room();

      if (room) {
        room.removeAllListeners();
        room.disconnect();
      }

      batch(() => {
        this.#setState("READY");
        this.#setRoom();
        this.#setChannel();
        this.#setFullscreen(false);
        this.vidTracks = () => [];
      });

      if (activeVoiceChannelId === disconnectedChannelId) {
        activeVoiceChannelId = undefined;
      }

      this.screenShareTracks = new Set();

      if (hadActiveRoom) {
        this.sound.playSound("userLeaveVoice");
      }
    } catch (e) {
      this.onErr(e);
    }
  }

  async toggleDeafen(fromMute?: boolean) {
    try {
      if (!this.localVoiceStream && !this.room()) throw "invalid state";
      if (!this.room()) {
        this.#settings.deafen = !this.#settings.deafen;
        if (fromMute) this.#settings.micOn = !this.#settings.deafen;
        this.setRemoteStreams((streams) => [...streams]);
        return;
      }
      const room = this.room()!;
      await room.localParticipant.setMicrophoneEnabled(
        (this.#settings.micOn || !!fromMute) &&
          !room.localParticipant.isMicrophoneEnabled,
      );

      this.#settings.deafen = !this.#settings.deafen;
      if (fromMute) {
        this.#settings.micOn = room.localParticipant.isMicrophoneEnabled;
      }
      if (this.#settings.deafen) {
        this.sound.playSound("deafen");
      } else {
        this.sound.playSound("undeafen");
      }
    } catch (e) {
      this.onErr(e);
    }
  }

  async toggleMute() {
    if (this.#settings.deafen) {
      this.toggleDeafen(true);
      return;
    }
    try {
      if (!this.room()) {
        if (!this.localVoiceStream) throw "invalid state";
        const enabled = !this.localVoiceStream.getAudioTracks().some((track) => track.enabled);
        this.localVoiceStream.getAudioTracks().forEach((track) => (track.enabled = enabled));
        this.#settings.micOn = enabled;
        this.sound.playSound(enabled ? "unmute" : "mute");
        return;
      }
      const room = this.room()!;
      await room.localParticipant.setMicrophoneEnabled(
        !room.localParticipant.isMicrophoneEnabled,
      );

      this.#settings.micOn = room.localParticipant.isMicrophoneEnabled;

      if (this.#settings.micOn) {
        this.sound.playSound("unmute");
      } else {
        this.sound.playSound("mute");
      }
    } catch (e) {
      this.onErr(e);
    }
  }

  async toggleCamera() {
    if (!this.room()) return;
    try {
      const room = this.room();
      if (!room) throw "invalid state";
      await room.localParticipant.setCameraEnabled(
        !room.localParticipant.isCameraEnabled,
      );

      this.#setVideo(room.localParticipant.isCameraEnabled);
    } catch (e) {
      this.onErr(e);
    }
  }

  /**
   * Get the enabled screen share qualities. "low" will always be enabled.
   * Each screen share quality is checked against the limit if the limit is available on the client.
   *
   * TODO: Translate the fullNames here, I can't figure out how to do it.
   *
   * @param name The name of the screen share quality to get
   * @returns A partial record of ScreenShareQualityName to ScreenShareQuality. Will always contain "low" quality.
   */
  getEnabledScreenShareQualities(): Partial<
    Record<ScreenShareQualityName, ScreenShareQuality>
  > {
    // Always enable low
    const qualities: Partial<
      Record<ScreenShareQualityName, ScreenShareQuality>
    > = {
      low: {
        name: "low",
        resolution: ScreenSharePresets.h720fps30.resolution,
        fullName: `720p 30FPS`,
        contentHint: "motion",
      },
    };

    if (this.getClient().configured()) {
      // TODO: Use new user limits if the user is new - I don't think there's a way to do that now?
      const limit =
        this.getClient().configuration?.features.limits.default
          .video_resolution;

      // TODO: Add more resolutions to stream from if they're enabled. May tie into premium users in the future?
      if (limit) {
        if (
          (limit[0] === 0 || limit[0] >= 1920) &&
          (limit[1] === 0 || limit[1] >= 1080)
        ) {
          qualities.high = {
            name: "high",
            resolution: ScreenSharePresets.h1080fps30.resolution,
            fullName: `1080p 30FPS`,
            contentHint: "motion",
          };
          const originalResolution = ScreenSharePresets.original.resolution;
          originalResolution.frameRate = 5;
          originalResolution.aspectRatio = 0;
          if (this.getClient().configured()) {
            // TODO: Use new user limits if the user is new - I don't think there's a way to do that now?
            const limit =
              this.getClient().configuration?.features.limits.default
                .video_resolution;
            if (limit) {
              originalResolution.width = limit[0];
              originalResolution.height = limit[1];
              // If both resolutions are limited, set aspect ratio
              if (
                originalResolution.height !== 0 &&
                originalResolution.width !== 0
              ) {
                originalResolution.aspectRatio =
                  originalResolution.width / originalResolution.height;
              }
            }
          }
          qualities.text = {
            name: "text",
            resolution: originalResolution,
            fullName: `Source 5FPS`,
            contentHint: "text",
          };
        }
      }
    }
    return qualities;
  }

  async toggleScreenshare() {
    const room = this.room();
    if (!room) return;

    if (this.screenshare()) {
      await room.localParticipant.setScreenShareEnabled(false);

      this.#setScreenshare(room.localParticipant.isScreenShareEnabled);

      this.sound.playSound("streamEnd");
    } else {
      const qualities = this.getEnabledScreenShareQualities();
      let screenPickerQualityName: ScreenShareQualityName | undefined;
      let screenPickerAudio: boolean | undefined;

      // Register the modal on screen picker handler if it exists
      if (window.native && window.native.onceScreenPicker) {
        window.native.onceScreenPicker((sources) => {
          this.openModal({
            type: "screen_share_picker",
            onCancel: () => {
              window.native.screenPickerCallback(-1, false);
            },
            callback: (
              idx: number,
              qualityName: ScreenShareQualityName,
              audio: boolean,
            ) => {
              window.native.screenPickerCallback(idx, audio);
              screenPickerQualityName = qualityName;
              screenPickerAudio = audio;
            },
            sources: sources,
            qualities: Object.keys(qualities).map((k) => {
              const v = qualities[k as ScreenShareQualityName]!;
              return { name: k, fullName: v.fullName };
            }),
          });
        });
      }

      try {
        const localTrack = await room.localParticipant.setScreenShareEnabled(
          true,
          {
            resolution:
              this.getEnabledScreenShareQualities()[
                this.#settings.screenShareQuality || "low"
              ]?.resolution,
            audio: true,
          },
        );

        const screenAudioTrack = room.localParticipant.getTrackPublication(
          Track.Source.ScreenShareAudio,
        );

        this.#setScreenshare(room.localParticipant.isScreenShareEnabled);

        if (localTrack) {
          // This event is only fired if the screen share is ended by closing the window being streamed.
          // This catches the ending and disables screen sharing on our side. If this weren't here,
          // livekit would still share stream audio after closing the window being streamed.
          localTrack.on("ended", () => {
            this.toggleScreenshare();
            const oldAudioTrack = room.localParticipant.getTrackPublication(
              Track.Source.ScreenShareAudio,
            );
            if (oldAudioTrack && oldAudioTrack.track) {
              room.localParticipant.unpublishTrack(oldAudioTrack.track);
            }
          });

          const callback = async (
            qualityName: ScreenShareQualityName,
            audio: boolean,
          ) => {
            const quality = qualities[qualityName] || qualities.low!;

            if (localTrack.videoTrack) {
              await localTrack.videoTrack.mediaStreamTrack.applyConstraints({
                frameRate: { max: quality.resolution.frameRate },
                width:
                  quality.resolution.width === 0
                    ? undefined
                    : { max: quality.resolution.width },
                height:
                  quality.resolution.width === 0
                    ? undefined
                    : { max: quality.resolution.height },
              });
              localTrack.videoTrack.mediaStreamTrack.contentHint =
                quality.contentHint;
              if (!audio && screenAudioTrack?.track) {
                room.localParticipant.unpublishTrack(screenAudioTrack.track);
              }
              this.sound.playSound("streamStart");
            }
          };

          if (screenPickerQualityName) {
            callback(
              screenPickerQualityName || "low",
              screenPickerAudio || false,
            );
          } else if (this.#settings.screenShareQualityAsk) {
            if (Object.keys(qualities).length > 1) {
              localTrack.pauseUpstream();
              screenAudioTrack?.pauseUpstream();
              this.openModal({
                onCancel: async () => {
                  await room.localParticipant.setScreenShareEnabled(false);
                  this.#setScreenshare(
                    room.localParticipant.isScreenShareEnabled,
                  );
                },
                type: "screen_share_settings",
                trackReference: {
                  participant: room.localParticipant,
                  publication: localTrack,
                  source: Track.Source.ScreenShare,
                },
                qualities: Object.keys(qualities).map((k) => {
                  const v = qualities[k as ScreenShareQualityName]!;
                  return { name: k, fullName: v.fullName };
                }),
                audio: !!screenAudioTrack,
                callback: async (qualityName, audio) => {
                  callback(qualityName, audio);
                  localTrack.resumeUpstream();
                  if (audio) {
                    screenAudioTrack?.resumeUpstream();
                  }
                },
              });
            } else {
              callback(
                this.#settings.screenShareQuality || "low",
                this.#settings.screenShareAudio,
              );
            }
          }
        }
      } catch (e) {
        this.onErr(e);
      }
    }
  }

  toggleFullscreen(fullscreen: boolean = !this.fullscreen()) {
    this.#setFullscreen(fullscreen);
  }

  trackId(t: TrackReferenceOrPlaceholder) {
    return `${t.source}_${t.participant.sid}`;
  }

  toggleFocus(t?: TrackReferenceOrPlaceholder) {
    const id = t ? this.trackId(t) : undefined;
    this.#setFocus(
      this.focusId() === id || this.vidTracks().length < 2 ? undefined : id,
    );
  }

  isFocus(t: TrackReferenceOrPlaceholder) {
    return this.trackId(t) === this.focusId();
  }

  focusTrack() {
    const id = this.focusId();
    return id
      ? this.vidTracks().find((t) => this.trackId(t) === id)
      : undefined;
  }

  toggleShowBar() {
    this.#setShowBar((s) => !s);
  }

  getConnectedUser(userId: string) {
    return this.room()?.getParticipantByIdentity(userId);
  }

  showCard(channel: Channel) {
    return (
      channel.isVoice &&
      (this.channel()?.id === channel.id ||
        channel.type === "TextChannel" ||
        channel.voiceParticipants.size)
    );
  }

  get listenPermission() {
    return !!this.channel()?.havePermission("Listen");
  }

  get speakingPermission() {
    return !!this.channel()?.havePermission("Speak");
  }

  private onErr(e: unknown) {
    if ((e as Error).name !== "NotAllowedError")
      this.openModal({ type: "error2", error: e });
  }
}

const voiceContext = createContext<Voice>(null as unknown as Voice);

/**
 * Mount global voice context and room audio manager
 */
export function VoiceContext(props: { children: JSX.Element }) {
  const state = useState();
  const modals = useModals();
  const sound = useSound();
  const voice = new Voice(state.voice, modals, sound);

  return (
    <voiceContext.Provider value={voice}>
      <RoomContext.Provider value={voice.room}>
        <VoiceCallCardContext>{props.children}</VoiceCallCardContext>
        <InRoom>
          <RoomAudioManager />
        </InRoom>
      </RoomContext.Provider>
    </voiceContext.Provider>
  );
}

export const useVoice = () => useContext(voiceContext);

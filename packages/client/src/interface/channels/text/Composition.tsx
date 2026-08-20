import { createCountdownFromNow } from "@solid-primitives/date";
import {
  For,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
} from "solid-js";

import { useLingui } from "@lingui-solid/solid/macro";
import { Channel } from "stoat.js";

import { styled } from "styled-system/jsx";

import { useClient } from "@revolt/client";
import { CONFIGURATION, debounce } from "@revolt/common";
import { Keybind, KeybindAction, createKeybind } from "@revolt/keybinds";
import { useModals } from "@revolt/modal";
import { useState } from "@revolt/state";
import {
  CompositionMediaPicker,
  Button,
  FileCarousel,
  FileDropAnywhereCollector,
  FilePasteCollector,
  IconButton,
  MessageBox,
  MessageReplyPreview,
  Tooltip,
  humanFileSize,
} from "@revolt/ui";
import { Symbol } from "@revolt/ui/components/utils/Symbol";
import { useSearchSpace } from "@revolt/ui/components/utils/autoComplete";
import { UserSlowmodes } from "stoat.js/lib/events/v1";

interface Props {
  /**
   * Channel to compose for
   */
  channel: Channel;

  /**
   * Notify parent component when a message is sent
   */
  onMessageSend?: () => void;
}

/**
 * Message composition engine
 */
export function MessageComposition(props: Props) {
  const state = useState();
  const { t } = useLingui();
  const client = useClient();
  const { openModal } = useModals();

  const currentSlowmode = (): UserSlowmodes | undefined => {
    return client().userSlowmodes.get(props.channel.id);
  };
  const countdownForEntry = createMemo(() => {
    const entry = currentSlowmode();
    if (!entry) return;
    const receivedAt = entry.receivedAt ?? Date.now();
    const targetTs = receivedAt + entry.retry_after * 1000;
    return createCountdownFromNow(targetTs);
  });

  const isSlowmodeExempt = (): boolean => {
    return props.channel.havePermission("BypassSlowmode");
  };

  const cooldownRemaining = createMemo(() => {
    if (!props.channel.slowmode || isSlowmodeExempt()) return 0;

    const cd = countdownForEntry();
    if (!cd) return 0;

    const [store] = cd;

    const h = store.hours ?? 0;
    const m = store.minutes ?? 0;
    const s = store.seconds ?? 0;

    const totalSeconds = h * 3600 + m * 60 + s;
    return totalSeconds > 0 ? totalSeconds : 0;
  });

  const slowmodeText = createMemo(() => {
    const s = cooldownRemaining();
    if (!s) return "";

    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    }
    return `${m}:${sec.toString().padStart(2, "0")}`;
  });

  const slowmodeWaitTime = createMemo(() => {
    const s = props.channel.slowmode;
    if (!s) return "";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;

    if (h > 0 && m === 0 && sec === 0)
      return h === 1 ? t`1 hour` : t`${h} hours`;
    if (m > 0 && sec === 0 && h === 0)
      return m === 1 ? t`1 minute` : t`${m} minutes`;

    const parts = [];
    if (h > 0) parts.push(h === 1 ? t`1 hour` : t`${h} hours`);
    if (m > 0) parts.push(m === 1 ? t`1 minute` : t`${m} minutes`);
    if (sec > 0) parts.push(sec === 1 ? t`1 second` : t`${sec} seconds`);
    return parts.join(" ");
  });

  createKeybind(KeybindAction.CHAT_JUMP_END, () =>
    setNodeReplacement(["_focus"]),
  );

  createKeybind(KeybindAction.CHAT_FOCUS_COMPOSITION, () =>
    setNodeReplacement(["_focus"]),
  );

  /**
   * Get the draft for the current channel
   * @returns Draft
   */
  function draft() {
    return state.draft.getDraft(props.channel.id);
  }

  const messageLength = () => draft().content?.length ?? 0;

  const maxMessageLength = () => {
    const cl = client();
    return cl.configured()
      ? (cl.configuration?.features.limits.default.message_length ?? 2000)
      : 2000;
  };

  const isAlmostTooLong = () => messageLength() > maxMessageLength() - 200;

  const wayTooLong = () => messageLength() > maxMessageLength() + 9999;

  // Whether the send button should be active/clickable
  const canSend = createMemo(() => {
    const draftContent = draft()?.content ?? "";
    const draftFiles = draft()?.files ?? [];

    const tooLong = messageLength() > maxMessageLength();

    const isSlowmode = currentSlowmode();

    return (
      !tooLong &&
      (draftContent.trim().length > 0 || draftFiles.length > 0) &&
      !isSlowmode
    );
  });

  // TEMP
  function currentValue() {
    return draft()?.content ?? "";
  }

  const [initialValue, setInitialValue] = createSignal([
    currentValue(),
  ] as const);

  const [nodeReplacement, setNodeReplacement] =
    createSignal<readonly [string | "_focus"]>();

  const [pollOpen, setPollOpen] = createSignal(false);
  const [pollQuestion, setPollQuestion] = createSignal("");
  const [pollOptions, setPollOptions] = createSignal(["", ""]);
  const [pollMultiple, setPollMultiple] = createSignal(false);

  function resetPoll() {
    setPollOpen(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setPollMultiple(false);
  }

  async function sendPoll() {
    const question = pollQuestion().trim();
    const options = pollOptions().map((option) => option.trim()).filter(Boolean);
    if (!question || options.length < 2 || currentSlowmode()) return;

    stopTyping();
    props.onMessageSend?.();
    await props.channel.sendMessage({
      poll: {
        question,
        options,
        multiple: pollMultiple(),
      },
    } as never);
    resetPoll();
  }

  // bind this composition instance to the global node replacement signal
  state.draft._setNodeReplacement = setNodeReplacement;
  onCleanup(() => (state.draft._setNodeReplacement = undefined));

  createEffect(
    on(
      () => props.channel,
      () => setInitialValue([currentValue()]),
      { defer: true },
    ),
  );

  createEffect(
    on(
      () => currentValue(),
      (value) => {
        if (value === "") {
          setInitialValue([""]);
        }
      },
      { defer: true },
    ),
  );
  // END TEMP

  /**
   * Keep track of last time we sent a typing packet
   */
  let isTyping: number | undefined = undefined;

  /**
   * Send typing packet
   */
  function startTyping() {
    if (typeof isTyping === "number" && +new Date() < isTyping) return;

    const ws = client()!.events;
    if (ws.state() === 2) {
      isTyping = +new Date() + 2500;
      ws.send({
        type: "BeginTyping",
        channel: props.channel.id,
      });
    }
  }

  /**
   * Send stop typing packet
   */
  function stopTyping() {
    if (isTyping) {
      const ws = client()!.events;
      if (ws.state() === 2) {
        isTyping = undefined;
        ws.send({
          type: "EndTyping",
          channel: props.channel.id,
        });
      }
    }
  }

  /**
   * Stop typing after some time
   */
  const delayedStopTyping = debounce(stopTyping, 1000); // eslint-disable-line solid/reactivity

  /**
   * Send a message using the current draft
   * @param useContent Content to send
   */
  async function sendMessage(useContent?: unknown) {
    if (!canSend() && typeof useContent !== "string") {
      return;
    } else if (currentSlowmode()) {
      return;
    }
    stopTyping();
    props.onMessageSend?.();

    if (typeof useContent === "string") {
      const currentDraft = draft();
      if (
        currentDraft?.replies?.length &&
        !currentDraft.content &&
        !currentDraft.files?.length
      ) {
        state.draft.setDraft(props.channel.id, {
          ...currentDraft,
          content: useContent,
        });
        return state.draft.sendDraft(client(), props.channel);
      }
      return props.channel.sendMessage(useContent);
    }

    state.draft.sendDraft(client(), props.channel);
  }

  /**
   * Shorthand for updating the draft
   */
  function setContent(content: string) {
    state.draft.setDraft(props.channel.id, { content });
    startTyping();
  }

  /**
   * Handle files being added to the draft.
   * @param files List of files
   */
  function onFiles(files: File[]) {
    const rejectedFiles: File[] = [];
    const validFiles: File[] = [];

    const maxSize = client().configured()
      ? (client().configuration?.features.limits.default.file_upload_size_limits
          .attachments ?? CONFIGURATION.MAX_FILE_SIZE)
      : CONFIGURATION.MAX_FILE_SIZE;

    for (const file of files) {
      if (file.size > maxSize) {
        console.log("File too large:", file);
        rejectedFiles.push(file);
      } else {
        validFiles.push(file);
      }
    }

    if (rejectedFiles.length > 0) {
      const maxSizeFormatted = humanFileSize(maxSize);

      if (rejectedFiles.length === 1) {
        const file = rejectedFiles[0];
        const fileSize = humanFileSize(file.size);
        const error = new Error(
          t`The file "${file.name}" (${fileSize}) exceeds the maximum size limit of ${maxSizeFormatted}.`,
        );
        error.name = "File too large";
        openModal({
          type: "error2",
          error,
        });
      } else {
        const error = new Error(
          t`${rejectedFiles.length} files exceed the maximum size limit of ${maxSizeFormatted} and were not uploaded.`,
        );
        error.name = "Files too large";
        openModal({
          type: "error2",
          error,
        });
      }
    }

    for (const file of validFiles) {
      state.draft.addFile(props.channel.id, file);
    }
  }

  /**
   * Add a file to the message
   */
  function addFile() {
    const input = document.createElement("input");
    input.accept = "*";
    input.type = "file";
    input.multiple = true;
    input.style.display = "none";

    input.addEventListener("change", async (e) => {
      // Get all attached files
      const files = (e.currentTarget as HTMLInputElement)?.files;

      // Remove element from DOM
      input.remove();

      // Skip execution if no files specified
      if (!files) return;
      onFiles([...files]);
    });

    // iOS requires us to append the file input
    // to DOM to allow us to add any images
    document.body.appendChild(input);
    input.click();
  }

  /**
   * Remove a file by its ID
   * @param fileId File ID
   */
  function removeFile(fileId: string) {
    state.draft.removeFile(props.channel.id, fileId);
  }

  const searchSpace = useSearchSpace(() => props.channel, client);

  return (
    <>
      <Show when={pollOpen()}>
        <PollPanel>
          <PollHeading>{t`Create poll`}</PollHeading>
          <PollInput
            value={pollQuestion()}
            placeholder={t`Ask a question`}
            onInput={(event) => setPollQuestion(event.currentTarget.value)}
          />
          <For each={pollOptions()}>
            {(option, index) => (
              <PollInput
                value={option}
                placeholder={t`Option ${index() + 1}`}
                onInput={(event) =>
                  setPollOptions((current) => {
                    const next = [...current];
                    next[index()] = event.currentTarget.value;
                    return next;
                  })
                }
              />
            )}
          </For>
          <PollActions>
            <Button
              variant="text"
              onPress={() => setPollOptions((options) => [...options, ""])}
              isDisabled={pollOptions().length >= 10}
            >
              {t`Add option`}
            </Button>
            <label>
              <input
                type="checkbox"
                checked={pollMultiple()}
                onChange={(event) => setPollMultiple(event.currentTarget.checked)}
              />{" "}
              {t`Allow multiple selections`}
            </label>
            <Button variant="tonal" onPress={resetPoll}>
              {t`Cancel`}
            </Button>
            <Button onPress={sendPoll} isDisabled={!pollQuestion().trim() || pollOptions().filter(Boolean).length < 2}>
              {t`Create poll`}
            </Button>
          </PollActions>
        </PollPanel>
      </Show>
      <Show when={state.draft.hasAdditionalElements(props.channel.id)}>
        <Keybind
          keybind={KeybindAction.CHAT_REMOVE_COMPOSITION_ELEMENT}
          onPressed={() => state.draft.popFromDraft(props.channel.id)}
        />
      </Show>
      <FileCarousel
        files={draft().files ?? []}
        getFile={state.draft.getFile}
        addFile={addFile}
        removeFile={removeFile}
      />
      <For each={draft().replies ?? []}>
        {(reply) => {
          const message = client()!.messages.get(reply.id);

          /**
           * Toggle mention on reply
           */
          function toggle() {
            state.draft.toggleReplyMention(props.channel.id, reply.id);
          }

          /**
           * Dismiss a reply
           */
          function dismiss() {
            state.draft.removeReply(props.channel.id, reply.id);
          }

          return (
            <MessageReplyPreview
              message={message}
              mention={reply.mention}
              toggle={toggle}
              dismiss={dismiss}
              self={message?.authorId === client()!.user!.id}
            />
          );
        }}
      </For>
      <Show when={props.channel.slowmode}>
        <SlowmodeContainer>
          <Tooltip
            content={t`Members can send one message every ${slowmodeWaitTime()}.`}
            placement="top"
          >
            <SlowmodeRow>
              <Symbol style={{ "font-size": "1rem" }}>schedule</Symbol>
              <SlowmodeText>
                <Switch fallback={t`Slowmode is enabled.`}>
                  <Match when={isSlowmodeExempt()}>{t`Slowmode Immune`}</Match>
                  <Match when={cooldownRemaining() > 0}>{slowmodeText()}</Match>
                </Switch>
              </SlowmodeText>
            </SlowmodeRow>
          </Tooltip>
        </SlowmodeContainer>
      </Show>
      <MessageBox
        initialValue={initialValue()}
        nodeReplacement={nodeReplacement()}
        onSendMessage={() => sendMessage()}
        onTyping={delayedStopTyping}
        onEditLastMessage={() => state.draft.setEditingMessage(true)}
        content={draft()?.content ?? ""}
        setContent={setContent}
        actionsStart={
          <>
            <Show when={props.channel.havePermission("UploadFiles")}>
              <MessageBox.InlineIcon size="wide">
                <IconButton onPress={addFile}>
                  <Symbol>add</Symbol>
                </IconButton>
              </MessageBox.InlineIcon>
            </Show>
            <Show when={props.channel.havePermission("SendMessage")}>
              <MessageBox.InlineIcon size="wide">
                <Tooltip content={t`Create poll`} placement="top">
                  <IconButton onPress={() => setPollOpen((open) => !open)}>
                    <Symbol>poll</Symbol>
                  </IconButton>
                </Tooltip>
              </MessageBox.InlineIcon>
            </Show>
            <Show
              when={
                !props.channel.havePermission("UploadFiles") &&
                !props.channel.havePermission("SendMessage")
              }
            >
              <MessageBox.InlineIcon size="short" />
            </Show>
          </>
        }
        actionsEnd={
          <MessageBox.ActionContainer column>
            <Show when={isAlmostTooLong()}>
              <MessageBox.FloatingAction
                size="normal"
                error={messageLength() > maxMessageLength()}
              >
                {wayTooLong()
                  ? "Too Long"
                  : maxMessageLength() - messageLength()}
              </MessageBox.FloatingAction>
            </Show>
            <MessageBox.ActionContainer>
              <CompositionMediaPicker
                onMessage={sendMessage}
                onTextReplacement={(text) => setNodeReplacement([text])}
              >
                {(triggerProps) => (
                  <>
                    <MessageBox.InlineIcon size="normal">
                      <IconButton onPress={triggerProps.onClickEmoji}>
                        <Symbol>emoticon</Symbol>
                      </IconButton>
                    </MessageBox.InlineIcon>

                    <div ref={triggerProps.ref} />
                  </>
                )}
              </CompositionMediaPicker>
            </MessageBox.ActionContainer>
          </MessageBox.ActionContainer>
        }
        placeholder={
          props.channel.type === "SavedMessages"
            ? t`Save to your notes`
            : props.channel.type === "DirectMessage"
              ? t`Message ${props.channel.recipient?.username}`
              : t`Message ${props.channel.name}`
        }
        sendingAllowed={props.channel.havePermission("SendMessage")}
        autoCompleteSearchSpace={searchSpace}
        updateDraftSelection={(start, end) =>
          state.draft.setSelection(props.channel.id, start, end)
        }
        hasActionsAppend={
          state.settings.getValue("appearance:show_send_button") || false
        }
        actionsAppend={
          <Show when={state.settings.getValue("appearance:show_send_button")}>
            <IconButton
              _compositionSendMessage
              size="sm"
              variant={canSend() ? "filled" : "tonal"}
              shape="square"
              isDisabled={!canSend()}
              onPress={sendMessage}
            >
              <Symbol fill={true}>send</Symbol>
            </IconButton>
          </Show>
        }
      />
      <FilePasteCollector onFiles={onFiles} />
      <FileDropAnywhereCollector onFiles={onFiles} />
    </>
  );
}

const SlowmodeContainer = styled("div", {
  base: {
    display: "flex",
    justifyContent: "flex-end",
    padding: "0 12px 6px 0",
  },
});

const PollPanel = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--gap-sm)",
    margin: "0 12px 8px",
    padding: "12px",
    borderRadius: "12px",
    background: "var(--md-sys-color-surface-container)",
  },
});

const PollHeading = styled("strong", {
  base: { fontSize: "1rem" },
});

const PollInput = styled("input", {
  base: {
    minHeight: "36px",
    padding: "0 10px",
    border: "1px solid var(--md-sys-color-outline)",
    borderRadius: "8px",
    background: "var(--md-sys-color-surface)",
    color: "var(--md-sys-color-on-surface)",
  },
});

const PollActions = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "var(--gap-sm)",
  },
});

const SlowmodeRow = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    gap: "var(--gap-sm)",
  },
});

const SlowmodeText = styled("span", {
  base: {
    fontSize: "0.75rem",
    fontWeight: "600",
  },
});

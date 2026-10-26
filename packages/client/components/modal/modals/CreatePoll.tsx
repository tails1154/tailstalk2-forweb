import { For, Show, createSignal } from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";
import { styled } from "styled-system/jsx";

import { Dialog, DialogProps, Button } from "@revolt/ui";

import { useModals } from "..";
import { Modals } from "../types";

const Field = styled("input", {
  base: {
    width: "100%",
    boxSizing: "border-box",
    padding: "0.7em 0.8em",
    borderRadius: "var(--borderRadius-md)",
    border: "1px solid var(--secondary-header)",
    background: "var(--background-secondary)",
    color: "var(--foreground)",
    fontSize: "1em",
  },
});

const Select = styled("select", {
  base: {
    width: "100%",
    boxSizing: "border-box",
    padding: "0.7em 0.8em",
    borderRadius: "var(--borderRadius-md)",
    border: "1px solid var(--secondary-header)",
    background: "var(--background-secondary)",
    color: "var(--foreground)",
    fontSize: "1em",
  },
});

const Stack = styled("div", {
  base: { display: "flex", flexDirection: "column", gap: "0.75em" },
});

export function CreatePollModal(
  props: DialogProps & Modals & { type: "create_poll" },
) {
  const { showError } = useModals();
  const [question, setQuestion] = createSignal("");
  const [options, setOptions] = createSignal(["", ""]);
  const [multiple, setMultiple] = createSignal(false);
  const [duration, setDuration] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);

  async function submit() {
    const cleanQuestion = question().trim();
    const cleanOptions = options().map((option) => option.trim());
    if (!cleanQuestion || cleanOptions.length < 2 || cleanOptions.some((option) => !option)) return;

    setSubmitting(true);
    try {
      await props.channel.sendMessage({
        content: "",
        poll: {
          question: cleanQuestion,
          options: cleanOptions,
          multiple: multiple(),
          ...(duration() ? { duration: Number(duration()) } : {}),
        },
      } as never);
      props.onClose();
    } catch (error) {
      showError(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      show={props.show}
      onClose={props.onClose}
      title={<Trans>Create poll</Trans>}
      isDisabled={submitting()}
      actions={[
        { text: <Trans>Close</Trans> },
        { text: <Trans>Create</Trans>, onClick: () => { void submit(); return false; }, isDisabled: submitting() },
      ]}
    >
      <Stack>
        <label>
          <Trans>Question</Trans>
          <Field value={question()} maxlength={256} onInput={(event) => setQuestion(event.currentTarget.value)} />
        </label>
        <Stack>
          <Trans>Options</Trans>
          <For each={options().map((_, index) => index)}>{(index) => (
            <div style={{ display: "flex", gap: "0.5em" }}>
              <Field
                value={options()[index]}
                maxlength={128}
                placeholder={`Option ${index + 1}`}
                onInput={(event) => setOptions((items) => items.map((item, i) => i === index ? event.currentTarget.value : item))}
              />
              <Show when={options().length > 2}>
                <Button onPress={() => setOptions((items) => items.filter((_, i) => i !== index))}>×</Button>
              </Show>
            </div>
          )}</For>
          <Show when={options().length < 10}>
            <Button onPress={() => setOptions((items) => [...items, ""])}><Trans>Add option</Trans></Button>
          </Show>
        </Stack>
        <label>
          <input type="checkbox" checked={multiple()} onChange={(event) => setMultiple(event.currentTarget.checked)} />{" "}
          <Trans>Allow multiple selections</Trans>
        </label>
        <label>
          <Trans>Close voting</Trans>
          <Select value={duration()} onChange={(event) => setDuration(event.currentTarget.value)}>
            <option value=""><Trans>Never</Trans></option>
            <option value="3600"><Trans>After 1 hour</Trans></option>
            <option value="86400"><Trans>After 1 day</Trans></option>
            <option value="259200"><Trans>After 3 days</Trans></option>
            <option value="604800"><Trans>After 1 week</Trans></option>
          </Select>
        </label>
      </Stack>
    </Dialog>
  );
}

import { Show, createSignal } from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";
import { styled } from "styled-system/jsx";

import { Column, Dialog, DialogProps } from "@revolt/ui";

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

export function ReportActionModal(
  props: DialogProps & Modals & { type: "report_action" },
) {
  const { showError } = useModals();
  const [action, setAction] = createSignal<"warn" | "suspend" | "ban" | "none">("warn");
  const [reason, setReason] = createSignal("");
  const [suspendHours, setSuspendHours] = createSignal("24");
  const [submitting, setSubmitting] = createSignal(false);

  async function submit() {
    const hours = Number.parseInt(suspendHours(), 10);
    if (action() === "suspend" && (!Number.isFinite(hours) || hours < 1)) return;

    setSubmitting(true);
    try {
      await props.onConfirm(
        action(),
        reason().trim() || undefined,
        action() === "suspend" ? hours : undefined,
      );
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
      title={<Trans>Resolve report</Trans>}
      isDisabled={submitting()}
      actions={[
        { text: <Trans>Cancel</Trans> },
        {
          text: <Trans>Resolve report</Trans>,
          onClick: () => {
            void submit();
            return false;
          },
          isDisabled: submitting(),
        },
      ]}
    >
      <Column gap="sm">
        <label>
          <Trans>Action for the reported user</Trans>
          <Select
            value={action()}
            onChange={(event) =>
              setAction(
                event.currentTarget.value as
                  | "warn"
                  | "suspend"
                  | "ban"
                  | "none",
              )
            }
          >
            <option value="warn"><Trans>Warn</Trans></option>
            <option value="suspend"><Trans>Suspend</Trans></option>
            <option value="ban"><Trans>Ban</Trans></option>
            <option value="none"><Trans>No account action</Trans></option>
          </Select>
        </label>
        <label>
          <Trans>Reason</Trans>
          <Field
            value={reason()}
            placeholder={"Optional"}
            onInput={(event) => setReason(event.currentTarget.value)}
          />
        </label>
        <Show when={action() === "suspend"}>
          <label>
            <Trans>Suspension length in hours</Trans>
            <Field
              type="number"
              min="1"
              value={suspendHours()}
              onInput={(event) => setSuspendHours(event.currentTarget.value)}
            />
          </label>
        </Show>
      </Column>
    </Dialog>
  );
}

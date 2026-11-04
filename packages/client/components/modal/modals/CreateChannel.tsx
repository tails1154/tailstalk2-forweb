import { createFormControl, createFormGroup } from "solid-forms";

import { Trans, useLingui } from "@lingui-solid/solid/macro";

import { useNavigate } from "@revolt/routing";
import { Column, Dialog, DialogProps, Form2, Radio2 } from "@revolt/ui";
import { Show } from "solid-js";

import { useModals } from "..";
import { Modals } from "../types";

/**
 * Modal to create a new server channel
 */
export function CreateChannelModal(
  props: DialogProps & Modals & { type: "create_channel" },
) {
  const { t } = useLingui();
  const navigate = useNavigate();
  const { showError } = useModals();

  const group = createFormGroup({
    name: createFormControl("", { required: true }),
    type: createFormControl("Text"),
    forum: createFormControl(""),
  });

  async function onSubmit() {
    try {
      const channel = await props.server.createChannel({
        type: "Text",
        name: group.controls.name.value,
        forum:
          group.controls.type.value === "Forum"
            ? group.controls.forum.value || undefined
            : undefined,
      });

      if (props.cb) {
        props.cb(channel);
      } else {
        navigate(`/server/${props.server.id}/channel/${channel.id}`);
      }

      props.onClose();
    } catch (error) {
      showError(error);
    }
  }

  const submit = Form2.useSubmitHandler(group, onSubmit);

  return (
    <Dialog
      show={props.show}
      onClose={props.onClose}
      title={<Trans>Create channel</Trans>}
      actions={[
        { text: <Trans>Close</Trans> },
        {
          text: <Trans>Create</Trans>,
          onClick: () => {
            onSubmit();
            return false;
          },
          isDisabled: !Form2.canSubmit(group),
        },
      ]}
      isDisabled={group.isPending}
    >
      <form onSubmit={submit}>
        <Column>
          <Form2.TextField
            minlength={1}
            maxlength={32}
            counter
            name="name"
            control={group.controls.name}
            label={t`Channel Name`}
          />

          <Form2.Radio control={group.controls.type}>
            <Radio2.Option value="Text">
              <Trans>Text Channel</Trans>
            </Radio2.Option>
            <Radio2.Option value="Forum">
              <Trans>Forum Channel</Trans>
            </Radio2.Option>
          </Form2.Radio>

          <Show when={group.controls.type.value === "Forum"}>
            <Form2.TextField
              maxlength={256}
              name="forum"
              control={group.controls.forum}
              label={t`Forum purpose`}
              placeholder={t`What should people discuss here?`}
            />
          </Show>
        </Column>
      </form>
    </Dialog>
  );
}

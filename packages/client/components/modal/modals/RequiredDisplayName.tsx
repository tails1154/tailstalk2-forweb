import { createFormControl, createFormGroup } from "solid-forms";
import { Trans, useLingui } from "@lingui-solid/solid/macro";
import { Column, Dialog, DialogProps, Form2 } from "@revolt/ui";
import { useModals } from "..";
import { Modals } from "../types";

export function RequiredDisplayNameModal(
  props: DialogProps & Modals & { type: "required_display_name" },
) {
  const { t } = useLingui();
  const { showError } = useModals();
  const group = createFormGroup({
    displayName: createFormControl("", { required: true }),
  });

  async function onSubmit() {
    try {
      await props.callback(group.controls.displayName.value.trim());
      props.onClose();
    } catch (error) {
      showError(error);
    }
  }

  const submit = Form2.useSubmitHandler(group, onSubmit);
  return (
    <Dialog
      show={props.show}
      onClose={() => undefined}
      title={<Trans>Choose your name</Trans>}
      actions={[{ text: <Trans>Continue</Trans>, onClick: () => { onSubmit(); return false; }, isDisabled: !Form2.canSubmit(group) }]}
      isDisabled={group.isPending}
    >
      <form onSubmit={submit}>
        <Column>
          <p><Trans>Set the name other people will see on your profile.</Trans></p>
          <Form2.TextField minlength={2} maxlength={32} counter name="displayName" control={group.controls.displayName} label={t`Name`} />
        </Column>
      </form>
    </Dialog>
  );
}

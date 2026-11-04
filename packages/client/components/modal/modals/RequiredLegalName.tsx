import { createFormControl, createFormGroup } from "solid-forms";
import { Trans, useLingui } from "@lingui-solid/solid/macro";
import { Column, Dialog, DialogProps, Form2 } from "@revolt/ui";
import { useModals } from "..";
import { Modals } from "../types";

export function RequiredLegalNameModal(
  props: DialogProps & Modals & { type: "required_legal_name" },
) {
  const { t } = useLingui();
  const { showError } = useModals();
  const group = createFormGroup({
    legalName: createFormControl("", { required: true }),
  });

  async function onSubmit() {
    try {
      await props.callback(group.controls.legalName.value.trim());
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
      title={<Trans>Confirm your legal name</Trans>}
      actions={[{ text: <Trans>Continue</Trans>, onClick: () => { onSubmit(); return false; }, isDisabled: !Form2.canSubmit(group) }]}
      isDisabled={group.isPending}
    >
      <form onSubmit={submit}>
        <Column>
          <p><Trans>Your legal name is private and is used only for safety and legal requests. It will not be shown on your profile.</Trans></p>
          <p><strong><Trans>IMPORTANT: Entering a false legal name may violate the Acceptable Use Policy and may be treated as fraudulent information. Do not enter a nickname, joke, or someone else&apos;s name.</Trans></strong></p>
          <Form2.TextField minlength={2} maxlength={100} counter name="legalName" control={group.controls.legalName} label={t`Legal name`} />
        </Column>
      </form>
    </Dialog>
  );
}

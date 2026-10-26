import { Trans } from "@lingui-solid/solid/macro";
import { useNavigate } from "@solidjs/router";
import { CategoryButton, Column } from "@revolt/ui";

export function StripeSuccess() {
  return <StripeReturnMessage success />;
}

export function StripeCancel() {
  return <StripeReturnMessage success={false} />;
}

function StripeReturnMessage(props: { success: boolean }) {
  const navigate = useNavigate();

  return (
    <Column gap="lg" style={{ "max-width": "32rem", margin: "6rem auto", padding: "1.5rem" }}>
      <h1>
        {props.success ? <Trans>Thank you for supporting TailsTalk 2!</Trans> : <Trans>Checkout canceled</Trans>}
      </h1>
      <p>
        {props.success ? (
          <Trans>Your TailsTalk 2 Premium subscription is being activated. You can return to the app now.</Trans>
        ) : (
          <Trans>No payment was made. You can subscribe to TailsTalk 2 Premium whenever you are ready.</Trans>
        )}
      </p>
      <CategoryButton icon="blank" onClick={() => navigate("/settings")}>
        <Trans>Return to account settings</Trans>
      </CategoryButton>
    </Column>
  );
}

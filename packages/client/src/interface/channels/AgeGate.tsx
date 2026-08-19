import { JSXElement, Match, Switch } from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";
import { styled } from "styled-system/jsx";

import { Button, Text, iconSize } from "@revolt/ui";

import MdWarning from "@material-design-icons/svg/round/warning.svg?component-solid";

/**
 * Age gate filter for any content
 */
export function AgeGate(props: {
  enabled: boolean;
  contentId: string;
  contentName: string;
  contentType: "channel";
  children: JSXElement;
}) {
  return (
    <Switch fallback={props.children}>
      <Match when={props.enabled}>
          <Base>
            <MdWarning {...iconSize("8em")} />
            <Text class="headline" size="large">
              {props.contentName}
            </Text>

            <Text class="body" size="large">
              <Trans>Mature content on TailsTalk 2 is not allowed.</Trans>
            </Text>

            <Actions>
              <Button variant="filled" onPress={() => history.back()}>
                <Trans>Back</Trans>
              </Button>
            </Actions>
          </Base>
        </Match>
      </Switch>
  );
}

const Base = styled("div", {
  base: {
    height: "100%",

    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "var(--gap-lg)",
    userSelect: "none",
    overflowY: "auto",
    color: "var(--md-sys-color-on-surface)",

    "& svg": {
      fill: "orange",
    },

    gap: "var(--gap-md)",
  },
});

const Actions = styled("div", {
  base: {
    display: "flex",
    marginTop: "var(--gap-lg)",
    gap: "var(--gap-lg)",
  },
});

import { For, Show } from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";
import { useState } from "@revolt/state";
import {
  AVAILABLE_EXPERIMENTS,
  EXPERIMENTS,
} from "@revolt/state/stores/Experiments";
import { Button, CategoryButton, Checkbox, Column } from "@revolt/ui";

import { suppressLeaveSitePromptOnce } from "../../../../../src/serviceWorkerInterface";

const DEVELOPMENT_BUILD_URL = "http://tails1154.com:9954";

/**
 * Advanced settings
 */
export default function AdvancedSettings() {
  const state = useState();
  const isUsingDevelopmentBuild =
    window.location.origin === DEVELOPMENT_BUILD_URL;

  return (
    <Column gap="xl">
      <Column>
        <Show when={isUsingDevelopmentBuild}>
          <Button
            onPress={() => {
              suppressLeaveSitePromptOnce();
              window.location.assign("https://tails1154.com:9961");
            }}
          >
            <Trans>Stop Using Development Build</Trans>
          </Button>
        </Show>
        <Checkbox
          checked={state.settings.getValue("appearance:compact_mode")}
          onChange={(e) =>
            state.settings.setValue(
              "appearance:compact_mode",
              e.currentTarget.checked,
            )
          }
        >
          Compact mode
        </Checkbox>
        <Checkbox
          checked={state.settings.getValue("advanced:copy_id")}
          onChange={(e) =>
            state.settings.setValue("advanced:copy_id", e.currentTarget.checked)
          }
        >
          Show 'copy ID' in context menus
        </Checkbox>
        <Checkbox
          checked={state.settings.getValue("advanced:admin_panel")}
          onChange={(e) =>
            state.settings.setValue(
              "advanced:admin_panel",
              e.currentTarget.checked,
            )
          }
        >
          Show admin panel shortcuts in context menus
        </Checkbox>
      </Column>
      <CategoryButton.Group>
        <For each={AVAILABLE_EXPERIMENTS}>
          {(key) => (
            <CategoryButton
              action={
                <Checkbox
                  checked={state.experiments.isEnabled(key)}
                  onChange={(event) =>
                    state.experiments.setEnabled(
                      key,
                      event.currentTarget.checked,
                    )
                  }
                />
              }
              description={EXPERIMENTS[key].description}
              onClick={() => void 0}
            >
              {EXPERIMENTS[key].title}
            </CategoryButton>
          )}
        </For>
      </CategoryButton.Group>
    </Column>
  );
}

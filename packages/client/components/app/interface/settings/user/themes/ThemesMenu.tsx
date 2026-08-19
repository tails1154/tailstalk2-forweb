import { Trans, useLingui } from "@lingui-solid/solid/macro";
import { For, Show, createSignal, onMount, type JSX } from "solid-js";
import { styled } from "styled-system/jsx";

import { useState } from "@revolt/state";
import { CustomTheme } from "@revolt/state/stores/Theme";
import { Button, Column, Row, Text } from "@revolt/ui";

import MdDelete from "@material-design-icons/svg/outlined/delete.svg?component-solid";

type ThemePreset = "tailstalk2" | "stoat" | "discord";

const themes: Array<{
  id: ThemePreset;
  colours: string[];
}> = [
  {
    id: "tailstalk2",
    colours: ["#06b6d4", "#3b82f6", "#1a1d2e", "#2c3254"],
  },
  {
    id: "stoat",
    colours: ["#5865f2", "#6750a4", "#e8def8", "#1c1b1f"],
  },
  {
    id: "discord",
    colours: ["#5865f2", "#23a559", "#313338", "#404249"],
  },
];

function themeName(id: ThemePreset) {
  switch (id) {
    case "tailstalk2": return <Trans>TailsTalk 2</Trans>;
    case "stoat": return <Trans>Stoat</Trans>;
    case "discord": return <Trans>Discord</Trans>;
  }
}

function themeDescription(id: ThemePreset) {
  switch (id) {
    case "tailstalk2": return <Trans>The familiar cyan and navy TailsTalk 2 style.</Trans>;
    case "stoat": return <Trans>The Material You theme from the original Stoat client.</Trans>;
    case "discord": return <Trans>Discord's dark interface with Blurple accents.</Trans>;
  }
}

/*
 * Keep the swatches next to the labels so the preview remains useful even
 * before the selected theme has finished applying its CSS variables.
 */
const themePreviews = [
  {
    id: "tailstalk2" as const,
    colours: ["#06b6d4", "#3b82f6", "#1a1d2e", "#2c3254"],
  },
  {
    id: "stoat" as const,
    colours: ["#5865f2", "#6750a4", "#e8def8", "#1c1b1f"],
  },
  {
    id: "discord" as const,
    colours: ["#5865f2", "#23a559", "#313338", "#404249"],
  },
];

const themesWithPreviews = themes.map((theme) => ({
  ...theme,
  colours: themePreviews.find((preview) => preview.id === theme.id)!.colours,
}));

const featuredThemes: CustomTheme[] = [
  {
    id: "store-sunset",
    name: "Sunset Arcade",
    description: "A warm sunset gradient for late-night conversations.",
    primary: "#fb7185",
    secondary: "#fbbf24",
    background: "#1c1024",
    surface: "#291535",
    surfaceHigh: "#45204b",
    onSurface: "#fff1f2",
    gradient: "linear-gradient(135deg, #fb7185 0%, #f59e0b 100%)",
  },
  {
    id: "store-forest",
    name: "Forest Signal",
    description: "A calm green and teal palette inspired by the outdoors.",
    primary: "#34d399",
    secondary: "#2dd4bf",
    background: "#071a17",
    surface: "#0d2924",
    surfaceHigh: "#17443a",
    onSurface: "#ecfdf5",
    gradient: "linear-gradient(135deg, #059669 0%, #06b6d4 100%)",
  },
];

/** Theme selection and the small set of display controls shared by themes. */
export function ThemesMenu() {
  const state = useState();
  const { t } = useLingui();
  const [tab, setTab] = createSignal<"store" | "create">("store");
  const [status, setStatus] = createSignal<string>();
  const [draft, setDraft] = createSignal<CustomTheme>({
    id: `theme-${Date.now()}`,
    name: "My theme",
    description: "A custom palette made by me.",
    primary: "#06b6d4",
    secondary: "#3b82f6",
    background: "#11131a",
    surface: "#1a1d2e",
    surfaceHigh: "#2c3254",
    onSurface: "#e2e8f0",
    gradient: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
  });

  onMount(() => {
    const encoded = new URLSearchParams(window.location.search).get("theme");
    if (!encoded) return;
    try {
      const imported = JSON.parse(decodeURIComponent(atob(encoded))) as CustomTheme;
      state.theme.setCustomTheme({
        ...imported,
        id: `import-${Date.now()}`,
        description: imported.description || t`A shared custom theme.`,
      });
      setTab("create");
      setStatus(t`Theme imported and applied.`);
      window.history.replaceState({}, "", window.location.pathname);
    } catch {
      setStatus(t`That theme link is invalid.`);
    }
  });

  const updateDraft = (key: keyof CustomTheme, value: string) =>
    setDraft({ ...draft(), [key]: value });

  const saveDraft = () => {
    const theme = { ...draft(), id: draft().id || `theme-${Date.now()}` };
    state.theme.setCustomTheme(theme);
    setDraft(theme);
    setStatus(t`Theme saved to your library.`);
  };

  const shareDraft = async () => {
    const encoded = btoa(encodeURIComponent(JSON.stringify(draft())));
    const link = `${window.location.origin}${window.location.pathname}?theme=${encoded}`;
    await navigator.clipboard?.writeText(link);
    setStatus(t`Share link copied to your clipboard.`);
  };

  const applyTheme = (theme: CustomTheme) => {
    state.theme.setCustomTheme({
      ...theme,
      description: theme.description || t`A custom palette from the theme store.`,
    });
    setTab("create");
    setStatus(t`Theme applied and opened in your themes menu.`);
  };

  const deleteTheme = (theme: CustomTheme) => {
    state.theme.removeCustomTheme(theme.id);
    setStatus(t`Theme deleted from your library.`);
  };

  const storeThemes = () => {
    const seen = new Set<string>();
    return [...featuredThemes, ...state.theme.customThemes].filter((theme) => {
      if (seen.has(theme.id)) return false;
      seen.add(theme.id);
      return true;
    });
  };

  return (
    <Column gap="lg">
      <Column gap="xs">
        <Text class="headline" size="small"><Trans>Themes</Trans></Text>
        <Text class="body" size="medium">
          <Trans>Choose the look and feel of TailsTalk 2. Your choice is saved automatically.</Trans>
        </Text>
      </Column>

      <Column gap="sm">
        {themesWithPreviews.map((theme) => (
          <ThemeCard
            type="button"
            selected={state.theme.preset === theme.id}
            aria-pressed={state.theme.preset === theme.id}
            onClick={() => state.theme.setPreset(theme.id)}
          >
            <Swatches>
              {theme.colours.map((colour) => (
                <Swatch style={{ "background-color": colour }} />
              ))}
            </Swatches>
            <Column gap="xs" style={{ flex: 1, "text-align": "left" }}>
              <Text class="title" size="medium">{themeName(theme.id)}</Text>
              <Text class="body" size="small">
                {themeDescription(theme.id)}
              </Text>
            </Column>
            <SelectionMark selected={state.theme.preset === theme.id}>
              {state.theme.preset === theme.id ? "✓" : ""}
            </SelectionMark>
          </ThemeCard>
        ))}
      </Column>

      <Row>
        <Button group="connected-start" groupActive={tab() === "store"} onPress={() => setTab("store")}>
          <Trans>Theme store</Trans>
        </Button>
        <Button group="connected-end" groupActive={tab() === "create"} onPress={() => setTab("create")}>
          <Trans>Create theme</Trans>
        </Button>
      </Row>

      <Show when={tab() === "store"}>
        <Column gap="sm">
          <Text class="title" size="small"><Trans>Community themes</Trans></Text>
          <For each={storeThemes()}>
            {(theme) => (
              <ThemeRow>
                <ThemeCard type="button" onClick={() => applyTheme(theme)}>
                  <Swatches style={{ background: theme.gradient }} />
                  <Column gap="xs" style={{ flex: 1, "text-align": "left" }}>
                    <Text class="title" size="medium">{theme.name}</Text>
                    <Text class="body" size="small">
                      {theme.description || <Trans>Custom community palette.</Trans>}
                    </Text>
                  </Column>
                </ThemeCard>
                <Show when={state.theme.customThemes.some((saved) => saved.id === theme.id)}>
                  <Button
                    variant="text"
                    aria-label={t`Delete theme`}
                    onPress={() => deleteTheme(theme)}
                  >
                    <MdDelete />
                  </Button>
                </Show>
              </ThemeRow>
            )}
          </For>
        </Column>
      </Show>

      <Show when={tab() === "create"}>
        <ThemeEditor draft={draft()} update={updateDraft} save={saveDraft} share={shareDraft} />
      </Show>
      <Show when={status()}><Status>{status()}</Status></Show>

      <Column gap="sm">
        <Text class="title" size="small"><Trans>Colour mode</Trans></Text>
        <Row>
          <Button
            group="connected-start"
            groupActive={state.theme.mode === "light"}
            onPress={() => state.theme.setMode("light")}
          >
            <Trans>Light</Trans>
          </Button>
          <Button
            group="connected"
            groupActive={state.theme.mode === "dark"}
            onPress={() => state.theme.setMode("dark")}
          >
            <Trans>Dark</Trans>
          </Button>
          <Button
            group="connected-end"
            groupActive={state.theme.mode === "system"}
            onPress={() => state.theme.setMode("system")}
          >
            <Trans>System</Trans>
          </Button>
        </Row>
      </Column>
    </Column>
  );
}

function ThemeEditor(props: {
  draft: CustomTheme;
  update: (key: keyof CustomTheme, value: string) => void;
  save: () => void;
  share: () => void;
}) {
  return (
    <Column gap="sm">
      <Text class="title" size="small"><Trans>Build your theme</Trans></Text>
      <ThemeInput label="Name" value={props.draft.name} type="text" onInput={(value) => props.update("name", value)} />
      <ThemeInput label={<Trans>Description</Trans>} value={props.draft.description || ""} type="text" onInput={(value) => props.update("description", value)} />
      <ColorGrid>
        <ThemeInput label="Primary" value={props.draft.primary} type="color" onInput={(value) => props.update("primary", value)} />
        <ThemeInput label="Secondary" value={props.draft.secondary} type="color" onInput={(value) => props.update("secondary", value)} />
        <ThemeInput label="Background" value={props.draft.background} type="color" onInput={(value) => props.update("background", value)} />
        <ThemeInput label="Surface" value={props.draft.surface} type="color" onInput={(value) => props.update("surface", value)} />
        <ThemeInput label="Raised surface" value={props.draft.surfaceHigh} type="color" onInput={(value) => props.update("surfaceHigh", value)} />
        <ThemeInput label="Text" value={props.draft.onSurface} type="color" onInput={(value) => props.update("onSurface", value)} />
      </ColorGrid>
      <ThemeInput label="Gradient CSS" value={props.draft.gradient} type="text" onInput={(value) => props.update("gradient", value)} />
      <Row>
        <Button onPress={props.save}><Trans>Save and apply</Trans></Button>
        <Button variant="tonal" onPress={props.share}><Trans>Copy share link</Trans></Button>
      </Row>
    </Column>
  );
}

function ThemeInput(props: { label: string | JSX.Element; value: string; type: string; onInput: (value: string) => void }) {
  return (
    <label>
      <InputLabel>{props.label}</InputLabel>
      <input type={props.type} value={props.value} onInput={(event) => props.onInput(event.currentTarget.value)} />
    </label>
  );
}

const ThemeCard = styled("button", {
  base: {
    display: "flex",
    alignItems: "center",
    gap: "var(--gap-md)",
    width: "100%",
    padding: "var(--gap-md)",
    border: "1px solid var(--md-sys-color-outline-variant)",
    borderRadius: "var(--borderRadius-md)",
    color: "var(--md-sys-color-on-surface)",
    background: "var(--md-sys-color-surface-container)",
    cursor: "pointer",
    font: "inherit",
    textAlign: "left",
    transition: "border-color var(--transitions-fast), background var(--transitions-fast)",
    _hover: { background: "var(--md-sys-color-surface-container-high)" },
  },
  variants: {
    selected: {
      true: {
        borderColor: "var(--md-sys-color-primary)",
        background: "var(--md-sys-color-primary-container)",
      },
    },
  },
});

const ThemeRow = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    gap: "var(--gap-sm)",
  },
});

const Swatches = styled("div", {
  base: {
    display: "flex",
    flexShrink: 0,
    width: "64px",
    height: "64px",
    overflow: "hidden",
    borderRadius: "var(--borderRadius-md)",
    transform: "rotate(-6deg)",
  },
});

const Swatch = styled("span", {
  base: { flex: 1 },
});

const SelectionMark = styled("span", {
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    width: "24px",
    height: "24px",
    border: "2px solid var(--md-sys-color-outline)",
    borderRadius: "var(--borderRadius-full)",
    color: "var(--md-sys-color-on-primary)",
    fontWeight: 700,
  },
  variants: {
    selected: {
      true: {
        borderColor: "var(--md-sys-color-primary)",
        background: "var(--md-sys-color-primary)",
      },
    },
  },
});

const ColorGrid = styled("div", {
  base: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "var(--gap-sm)",
  },
});

const InputLabel = styled("span", {
  base: { display: "block", marginBottom: "4px", fontSize: "12px", color: "var(--md-sys-color-on-surface-variant)" },
});

const Status = styled("div", {
  base: { padding: "var(--gap-md)", borderRadius: "var(--borderRadius-md)", background: "var(--md-sys-color-primary-container)", color: "var(--md-sys-color-on-primary-container)" },
});

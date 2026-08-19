import { Trans, useLingui } from "@lingui-solid/solid/macro";
import { For, Show, createSignal, onMount, type JSX } from "solid-js";
import { styled } from "styled-system/jsx";

import { useClient } from "@revolt/client";
import { requestClientJson } from "../../../../../client/customApi";
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

type ThemeStoreEntry = CustomTheme & { owner_id?: string };
type ThemeApiEntry = Omit<ThemeStoreEntry, "surfaceHigh" | "onSurface"> & {
  surface_high: string;
  on_surface: string;
};

function fromApiTheme(theme: ThemeApiEntry): ThemeStoreEntry {
  return {
    ...theme,
    surfaceHigh: theme.surface_high,
    onSurface: theme.on_surface,
  };
}

function featuredThemes(t: ReturnType<typeof useLingui>["t"]): CustomTheme[] {
  return [
    {
      id: "store-sunset",
      name: t`Sunset Arcade`,
      description: t`A warm sunset gradient for late-night conversations.`,
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
      name: t`Forest Signal`,
      description: t`A calm green and teal palette inspired by the outdoors.`,
      primary: "#34d399",
      secondary: "#2dd4bf",
      background: "#071a17",
      surface: "#0d2924",
      surfaceHigh: "#17443a",
      onSurface: "#ecfdf5",
      gradient: "linear-gradient(135deg, #059669 0%, #06b6d4 100%)",
    },
  ];
}

/** Theme selection and the small set of display controls shared by themes. */
export function ThemesMenu() {
  const state = useState();
  const client = useClient();
  const { t } = useLingui();
  const [tab, setTab] = createSignal<"store" | "create">("store");
  const [status, setStatus] = createSignal<string>();
  const [publishedThemes, setPublishedThemes] = createSignal<ThemeStoreEntry[]>([]);
  const [publishing, setPublishing] = createSignal(false);
  const [draft, setDraft] = createSignal<CustomTheme>({
    id: `theme-${Date.now()}`,
    name: t`My theme`,
    description: t`A custom palette made by me.`,
    primary: "#06b6d4",
    secondary: "#3b82f6",
    background: "#11131a",
    surface: "#1a1d2e",
    surfaceHigh: "#2c3254",
    onSurface: "#e2e8f0",
    gradient: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
  });

  onMount(() => {
    void client().api
      .get("/themes")
      .then((themes) =>
        setPublishedThemes((themes as ThemeApiEntry[]).map(fromApiTheme)),
      )
      .catch(() => setStatus(t`Unable to load the theme store right now.`));

    const themePath = window.location.pathname.match(/^\/theme\/([A-Za-z0-9_-]+)$/);
    if (themePath) {
      void client().api
        .get(`/themes/${themePath[1]}`)
        .then((theme) => {
          applyTheme(fromApiTheme(theme as ThemeApiEntry));
          window.history.replaceState({}, "", window.location.pathname.replace(/^\/theme\/.+$/, "/"));
        })
        .catch(() => setStatus(t`That theme could not be found.`));
      return;
    }

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

  const publishDraft = async (): Promise<ThemeStoreEntry | undefined> => {
    setPublishing(true);
    try {
      const { id: _id, surfaceHigh, onSurface, ...theme } = draft();
      const published = fromApiTheme(
        await requestClientJson<ThemeApiEntry>(client().api, "POST", "/themes", {
          ...theme,
          surface_high: surfaceHigh,
          on_surface: onSurface,
        }),
      );
      setPublishedThemes((current) => [...current, published]);
      setDraft(published);
      setStatus(t`Theme uploaded to the community theme store.`);
      return published;
    } catch {
      setStatus(t`Unable to upload this theme right now.`);
    } finally {
      setPublishing(false);
    }
  };

  const shareDraft = async () => {
    const published = publishedThemes().find((theme) => theme.id === draft().id) ||
      (await publishDraft());
    if (!published) return;
    const link = `${window.location.origin}/theme/${published.id}`;
    await navigator.clipboard?.writeText(link);
    setStatus(t`Theme link copied to your clipboard.`);
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

  const deletePublishedTheme = async (theme: ThemeStoreEntry) => {
    try {
      await client().api.delete(`/themes/${theme.id}`);
      setPublishedThemes((current) => current.filter((entry) => entry.id !== theme.id));
      state.theme.removeCustomTheme(theme.id);
      setStatus(t`Theme removed from the community theme store.`);
    } catch {
      setStatus(t`Unable to remove this theme right now.`);
    }
  };

  const storeThemes = () => {
    const seen = new Set<string>();
    return [...featuredThemes(t), ...publishedThemes(), ...state.theme.customThemes].filter((theme) => {
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
        <For each={themesWithPreviews}>
          {(theme) => (
          <ThemeCard
            type="button"
            selected={state.theme.preset === theme.id}
            aria-pressed={state.theme.preset === theme.id}
            onClick={() => state.theme.setPreset(theme.id)}
          >
            <Swatches>
              <For each={theme.colours}>
                {(colour) => <Swatch style={{ "background-color": colour }} />}
              </For>
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
          )}
        </For>
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
                <Show
                  when={
                    state.theme.customThemes.some((saved) => saved.id === theme.id) ||
                    ("owner_id" in theme && theme.owner_id === client().user?.id)
                  }
                >
                  <Button
                    variant="text"
                    aria-label={t`Delete theme`}
                    onPress={() =>
                      "owner_id" in theme
                        ? void deletePublishedTheme(theme)
                        : deleteTheme(theme)
                    }
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
        <ThemeEditor
          draft={draft()}
          update={updateDraft}
          save={saveDraft}
          share={shareDraft}
          publish={() => void publishDraft()}
          publishing={publishing()}
        />
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
  publish: () => void;
  publishing: boolean;
}) {
  return (
    <Column gap="sm">
      <Text class="title" size="small"><Trans>Build your theme</Trans></Text>
      <ThemeInput label={<Trans>Name</Trans>} value={props.draft.name} type="text" onInput={(value) => props.update("name", value)} />
      <ThemeInput label={<Trans>Description</Trans>} value={props.draft.description || ""} type="text" onInput={(value) => props.update("description", value)} />
      <ColorGrid>
        <ThemeInput label={<Trans>Primary</Trans>} value={props.draft.primary} type="color" onInput={(value) => props.update("primary", value)} />
        <ThemeInput label={<Trans>Secondary</Trans>} value={props.draft.secondary} type="color" onInput={(value) => props.update("secondary", value)} />
        <ThemeInput label={<Trans>Background</Trans>} value={props.draft.background} type="color" onInput={(value) => props.update("background", value)} />
        <ThemeInput label={<Trans>Surface</Trans>} value={props.draft.surface} type="color" onInput={(value) => props.update("surface", value)} />
        <ThemeInput label={<Trans>Raised surface</Trans>} value={props.draft.surfaceHigh} type="color" onInput={(value) => props.update("surfaceHigh", value)} />
        <ThemeInput label={<Trans>Text</Trans>} value={props.draft.onSurface} type="color" onInput={(value) => props.update("onSurface", value)} />
      </ColorGrid>
      <ThemeInput label={<Trans>Gradient CSS</Trans>} value={props.draft.gradient} type="text" onInput={(value) => props.update("gradient", value)} />
      <Row>
        <Button onPress={props.save}><Trans>Save and apply</Trans></Button>
        <Button variant="tonal" onPress={props.share}><Trans>Copy share link</Trans></Button>
        <Button onPress={props.publish} isDisabled={props.publishing}>
          <Trans>Publish to theme store</Trans>
        </Button>
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

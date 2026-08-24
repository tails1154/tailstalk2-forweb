import { createEffect } from "solid-js";

import { useState } from "@revolt/state";
import type { SelectedTheme } from "@revolt/state/stores/Theme";

import { createMaterialColourVariables, createTailsTalk2WebVariables } from ".";
import { Masks } from "./Masks";
import { FONTS, MONOSPACE_FONTS } from "./fonts";
import { legacyThemeUnsetShim } from "./legacyThemeGeneratorCode";

function hexToRgbTriplet(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

// TailsTalk 2 keeps the existing cyan/navy palette used by the app today.
const tailsTalk2Colors = {
  "--md-sys-color-surface-dim": "#11131a",
  "--md-sys-color-surface": "#1a1d2e",
  "--md-sys-color-surface-bright": "#252a45",
  "--md-sys-color-surface-container-lowest": "#0c0e17",
  "--md-sys-color-surface-container-low": "#1a1d2e",
  "--md-sys-color-surface-container": "#1e2235",
  "--md-sys-color-surface-container-high": "#252a45",
  "--md-sys-color-surface-container-highest": "#2c3254",
  "--md-sys-color-on-surface": "#e2e8f0",
  "--md-sys-color-on-surface-variant": "#94a3b8",
  "--md-sys-color-outline": "#64748b",
  "--md-sys-color-outline-variant": "#334155",
  "--md-sys-color-primary": "#06b6d4",
  "--md-sys-color-on-primary": "#020617",
  "--md-sys-color-primary-container": "#155e75",
  "--md-sys-color-on-primary-container": "#e2e8f0",
  "--md-sys-color-secondary": "#38bdf8",
  "--md-sys-color-on-secondary": "#020617",
  "--md-sys-color-secondary-container": "#1e3a5f",
  "--md-sys-color-on-secondary-container": "#e2e8f0",
  "--md-sys-color-tertiary": "#2dd4bf",
  "--md-sys-color-on-tertiary": "#020617",
  "--md-sys-color-tertiary-container": "#134e4a",
  "--md-sys-color-on-tertiary-container": "#e2e8f0",
  "--md-sys-color-error": "#f87171",
  "--md-sys-color-on-error": "#020617",
  "--md-sys-color-error-container": "#7f1d1d",
  "--md-sys-color-on-error-container": "#fef2f2",
  "--brand-presence-online": "#10b981",
  "--brand-presence-idle": "#f59e0b",
  "--brand-presence-busy": "#ef4444",
  "--brand-presence-focus": "#06b6d4",
  "--brand-presence-invisible": "#64748b",
  "--gradient-primary":
    "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #2563eb 100%)",
  "--gradient-subtle": "linear-gradient(135deg, #0e2a3a 0%, #1a1d2e 100%)",
} as const;

// Discord's familiar dark palette, kept separate from the TailsTalk 2 palette.
const discordColors = {
  "--md-sys-color-surface-dim": "#1e1f22",
  "--md-sys-color-surface": "#313338",
  "--md-sys-color-surface-bright": "#404249",
  "--md-sys-color-surface-container-lowest": "#1e1f22",
  "--md-sys-color-surface-container-low": "#2b2d31",
  "--md-sys-color-surface-container": "#313338",
  "--md-sys-color-surface-container-high": "#383a40",
  "--md-sys-color-surface-container-highest": "#404249",
  "--md-sys-color-on-surface": "#f2f3f5",
  "--md-sys-color-on-surface-variant": "#b5bac1",
  "--md-sys-color-outline": "#6d6f78",
  "--md-sys-color-outline-variant": "#4e5058",
  "--md-sys-color-primary": "#5865f2",
  "--md-sys-color-on-primary": "#ffffff",
  "--md-sys-color-primary-container": "#4752c4",
  "--md-sys-color-on-primary-container": "#ffffff",
  "--md-sys-color-secondary": "#23a559",
  "--md-sys-color-on-secondary": "#ffffff",
  "--md-sys-color-secondary-container": "#248046",
  "--md-sys-color-on-secondary-container": "#ffffff",
  "--md-sys-color-tertiary": "#f23f42",
  "--md-sys-color-on-tertiary": "#ffffff",
  "--md-sys-color-tertiary-container": "#da373c",
  "--md-sys-color-on-tertiary-container": "#ffffff",
  "--md-sys-color-error": "#f23f42",
  "--md-sys-color-on-error": "#ffffff",
  "--md-sys-color-error-container": "#da373c",
  "--md-sys-color-on-error-container": "#ffffff",
  "--brand-presence-online": "#23a559",
  "--brand-presence-idle": "#f0b232",
  "--brand-presence-busy": "#f23f42",
  "--brand-presence-focus": "#5865f2",
  "--brand-presence-invisible": "#80848e",
  "--gradient-primary": "linear-gradient(135deg, #5865f2 0%, #7289da 100%)",
  "--gradient-subtle": "linear-gradient(135deg, #383a40 0%, #2b2d31 100%)",
} as const;

const minecraftColors = {
  "--md-sys-color-surface-dim": "#101510",
  "--md-sys-color-surface": "#1b241b",
  "--md-sys-color-surface-bright": "#2b3a2b",
  "--md-sys-color-surface-container-lowest": "#0b100b",
  "--md-sys-color-surface-container-low": "#162016",
  "--md-sys-color-surface-container": "#1b241b",
  "--md-sys-color-surface-container-high": "#253125",
  "--md-sys-color-surface-container-highest": "#2b3a2b",
  "--md-sys-color-on-surface": "#e8f5e0",
  "--md-sys-color-on-surface-variant": "#b7c9ae",
  "--md-sys-color-outline": "#78906f",
  "--md-sys-color-outline-variant": "#40533d",
  "--md-sys-color-primary": "#55c93f",
  "--md-sys-color-on-primary": "#071006",
  "--md-sys-color-primary-container": "#2f7428",
  "--md-sys-color-on-primary-container": "#e8f5e0",
  "--md-sys-color-secondary": "#c58b4b",
  "--md-sys-color-on-secondary": "#160d05",
  "--md-sys-color-secondary-container": "#704a25",
  "--md-sys-color-on-secondary-container": "#ffe9ca",
  "--md-sys-color-tertiary": "#5bb7d8",
  "--md-sys-color-on-tertiary": "#061116",
  "--md-sys-color-tertiary-container": "#24566a",
  "--md-sys-color-on-tertiary-container": "#d2f2ff",
  "--md-sys-color-error": "#ffb4ab",
  "--md-sys-color-on-error": "#210b08",
  "--md-sys-color-error-container": "#7d2a20",
  "--md-sys-color-on-error-container": "#ffdad6",
  "--brand-presence-online": "#55c93f",
  "--brand-presence-idle": "#f2b84b",
  "--brand-presence-busy": "#e85d4a",
  "--brand-presence-focus": "#5bb7d8",
  "--brand-presence-invisible": "#78906f",
  "--gradient-primary": "linear-gradient(135deg, #55c93f 0%, #5bb7d8 100%)",
  "--gradient-subtle":
    "repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.08) 0 1px, transparent 1px 32px), repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.04) 0 1px, transparent 1px 32px), linear-gradient(to bottom, #5fcf45 0 16%, #76502f 16% 100%)",
  "--minecraft-block-shadow": "#3f2b1b",
} as const;

function createTriplets(colors: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(colors)
      .filter(
        ([key, value]) => key.includes("md-sys-color") && value.startsWith("#"),
      )
      .map(([key, value]) => [
        key.replace("md-sys-color", "mdui-color"),
        hexToRgbTriplet(value),
      ]),
  );
}

function createTailsTalk2Colours(darkMode: boolean) {
  void darkMode;
  return tailsTalk2Colors;
}

function createCustomColours(theme: NonNullable<SelectedTheme["custom"]>) {
  return {
    "--md-sys-color-surface-dim": theme.background,
    "--md-sys-color-surface": theme.surface,
    "--md-sys-color-surface-bright": theme.surfaceHigh,
    "--md-sys-color-surface-container-lowest": theme.background,
    "--md-sys-color-surface-container-low": theme.surface,
    "--md-sys-color-surface-container": theme.surface,
    "--md-sys-color-surface-container-high": theme.surfaceHigh,
    "--md-sys-color-surface-container-highest": theme.surfaceHigh,
    "--md-sys-color-on-surface": theme.onSurface,
    "--md-sys-color-on-surface-variant": theme.onSurface,
    "--md-sys-color-outline": theme.onSurface,
    "--md-sys-color-outline-variant": theme.surfaceHigh,
    "--md-sys-color-primary": theme.primary,
    "--md-sys-color-on-primary": theme.onSurface,
    "--md-sys-color-primary-container": theme.surfaceHigh,
    "--md-sys-color-on-primary-container": theme.onSurface,
    "--md-sys-color-secondary": theme.secondary,
    "--md-sys-color-on-secondary": theme.onSurface,
    "--md-sys-color-secondary-container": theme.surfaceHigh,
    "--md-sys-color-on-secondary-container": theme.onSurface,
    "--md-sys-color-tertiary": theme.secondary,
    "--md-sys-color-on-tertiary": theme.onSurface,
    "--md-sys-color-tertiary-container": theme.surfaceHigh,
    "--md-sys-color-on-tertiary-container": theme.onSurface,
    "--highlight-message-background": theme.primary,
    "--md-sys-color-error": "#f87171",
    "--md-sys-color-on-error": "#ffffff",
    "--gradient-primary": theme.gradient,
    "--gradient-subtle": `linear-gradient(135deg, ${theme.background} 0%, ${theme.surface} 100%)`,
  };
}

/**
 * Component for loading theme variables into root
 */
export function LoadTheme() {
  const state = useState();

  createEffect(() => {
    const activeTheme = state.theme.activeTheme;

    FONTS[state.theme.interfaceFont].load();
    MONOSPACE_FONTS[state.theme.monospaceFont].load();

    const colourVariables = activeTheme.custom
      ? createCustomColours(activeTheme.custom)
      : activeTheme.preset === "stoat"
        ? createMaterialColourVariables(activeTheme, "--md-sys-color-")
        : activeTheme.preset === "discord"
          ? discordColors
          : activeTheme.preset === "minecraft"
            ? minecraftColors
            : createTailsTalk2Colours(activeTheme.darkMode);
    const webVariables =
      activeTheme.preset === "minecraft"
        ? {
            "--borderRadius-xs": "0px",
            "--borderRadius-sm": "0px",
            "--borderRadius-md": "0px",
            "--borderRadius-lg": "0px",
            "--borderRadius-li": "0px",
            "--borderRadius-xl": "0px",
            "--borderRadius-xli": "0px",
            "--borderRadius-xxl": "0px",
          }
        : {};
    const triplets = createTriplets(colourVariables);

    for (const [key, value] of Object.entries({
      ...Object.keys(legacyThemeUnsetShim().colours).reduce(
        (d, k) => ({
          ...d,
          [`--colours-${k}`]: k.includes("background")
            ? "var(--unset-bg)"
            : "var(--unset-fg)",
        }),
        {},
      ),
      ...createTailsTalk2WebVariables(activeTheme),
      ...webVariables,
      ...colourVariables,
      ...triplets,
    })) {
      document.body.style.setProperty(key, value);
    }
  });

  return <Masks />;
}

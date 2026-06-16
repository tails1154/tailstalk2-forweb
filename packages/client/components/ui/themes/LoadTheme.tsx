function hexToRgbTriplet(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

const discordColors = {
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
  "--gradient-primary": "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #2563eb 100%)",
  "--gradient-subtle": "linear-gradient(135deg, #0e2a3a 0%, #1a1d2e 100%)",
} as const;

const discordTriplets = Object.fromEntries(
  Object.entries(discordColors)
    .filter(([key]) => key.includes("md-sys-color"))
    .map(([key, hex]) => [
      key.replace("md-sys-color", "mdui-color"),
      hexToRgbTriplet(hex),
    ]),
);

import { createEffect } from "solid-js";

import { useState } from "@revolt/state";

import { createTailsTalk2WebVariables } from ".";
import { Masks } from "./Masks";
import { FONTS, MONOSPACE_FONTS } from "./fonts";
import { legacyThemeUnsetShim } from "./legacyThemeGeneratorCode";

/**
 * Component for loading theme variables into root
 */
export function LoadTheme() {
  const state = useState();

  createEffect(() => {
    const activeTheme = state.theme.activeTheme;

    FONTS[state.theme.interfaceFont].load();
    MONOSPACE_FONTS[state.theme.monospaceFont].load();

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
      ...discordColors,
      ...discordTriplets,
    })) {
      document.body.style.setProperty(key, value);
    }
  });

  return <Masks />;
}

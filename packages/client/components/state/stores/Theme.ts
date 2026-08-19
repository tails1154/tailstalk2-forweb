import { Accessor, createSignal } from "solid-js";

import {
  FONT_KEYS,
  Fonts,
  MONOSPACE_FONT_KEYS,
  MonospaceFonts,
} from "@revolt/ui/themes/fonts";

import { State } from "..";

import { AbstractStore } from ".";

export type TypeTheme = {
  /**
   * Base theme preset
   */
  preset: "tailstalk2" | "stoat" | "discord" | "custom";

  /** User-created palettes kept in the local theme library. */
  customThemes: CustomTheme[];

  /** The selected user-created theme, when preset is custom. */
  customThemeId?: string;

  /**
   * Light/dark mode
   */
  mode: "light" | "dark" | "system";

  /**
   * Accent
   * (Material You)
   */
  m3Accent: string;

  /**
   * Constrast
   * (Material You)
   */
  m3Contrast: number;

  /**
   * Variant
   * (Material You)
   */
  m3Variant:
    | "monochrome"
    | "neutral"
    | "tonal_spot"
    | "vibrant"
    | "expressive"
    | "fidelity"
    | "content"
    | "rainbow"
    | "fruit_salad";

  /**
   * Whether to permit blurry surfaces
   */
  blur: boolean;

  /**
   * Interface font
   */
  interfaceFont: Fonts;

  /**
   * Monospace font
   */
  monospaceFont: MonospaceFonts;

  /**
   * Message size
   */
  messageSize: number;

  /**
   * Spacing between message groups
   */
  messageGroupSpacing: number;
};

export type CustomTheme = {
  id: string;
  name: string;
  description?: string;
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceHigh: string;
  onSurface: string;
  gradient: string;
};

export type SelectedTheme = Pick<
  TypeTheme,
  | "blur"
  | "interfaceFont"
  | "monospaceFont"
  | "messageSize"
  | "messageGroupSpacing"
> & {
  preset: TypeTheme["preset"];
  darkMode: boolean;

  accent: string;
  contrast: number;
  variant: TypeTheme["m3Variant"];
  custom?: CustomTheme;
};

/**
 * Manages theme information
 */
export class Theme extends AbstractStore<"theme", TypeTheme> {
  prefersDark: Accessor<boolean>;

  /**
   * Construct store
   * @param state State
   */
  constructor(state: State) {
    super(state, "theme");

    // handle prefers-color-scheme value and changes
    const [prefersDark, setPrefersDark] = createSignal(
      window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches,
    );

    this.prefersDark = prefersDark;

    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (event) => setPrefersDark(event.matches));

    this.toggleBlur = this.toggleBlur.bind(this);
  }

  /**
   * Hydrate external context
   */
  hydrate(): void {
    /** nothing needs to be done */
  }

  /**
   * Generate default values
   */
  default(): TypeTheme {
    return {
      preset: "tailstalk2",
      customThemes: [],
      mode: "system",

      m3Accent: "#5865f2",
      m3Contrast: 0.0,
      m3Variant: "tonal_spot",

      interfaceFont: "Inter",
      monospaceFont: "Fira Code",

      blur: true,
      messageSize: 14,
      messageGroupSpacing: 12,
    };
  }

  /**
   * Validate the given data to see if it is compliant and return a compliant object
   */
  clean(input: Partial<TypeTheme>): TypeTheme {
    const data: TypeTheme = this.default();

    if (["light", "dark", "system"].includes(input.mode!)) {
      data.mode = input.mode!;
    }

    const preset = (input as { preset?: unknown }).preset;
    if (["tailstalk2", "stoat", "discord", "custom"].includes(preset!)) {
      data.preset = preset as TypeTheme["preset"];
    } else if (preset === "you" || preset === "neutral") {
      // Migrate the former Material You presets to Stoat.
      data.preset = "stoat";
    }

    const isHex = (value: unknown): value is string =>
      typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
    if (Array.isArray(input.customThemes)) {
      data.customThemes = input.customThemes
        .filter((theme): theme is CustomTheme =>
          !!theme &&
          typeof theme.id === "string" &&
          typeof theme.name === "string" &&
          (typeof theme.description === "undefined" ||
            typeof theme.description === "string") &&
          isHex(theme.primary) &&
          isHex(theme.secondary) &&
          isHex(theme.background) &&
          isHex(theme.surface) &&
          isHex(theme.surfaceHigh) &&
          isHex(theme.onSurface) &&
          typeof theme.gradient === "string" &&
          /^linear-gradient\(/.test(theme.gradient),
        )
        .slice(0, 100);
    }
    if (typeof input.customThemeId === "string") {
      data.customThemeId = input.customThemeId;
    }

    if (typeof input.m3Contrast === "number") {
      data.m3Contrast = input.m3Contrast;
    }

    if (
      input.m3Accent &&
      input.m3Accent.match(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})/)
    ) {
      data.m3Accent = input.m3Accent;
    }

    if (
      [
        "monochrome",
        "neutral",
        "tonal_spot",
        "vibrant",
        "expressive",
        "fidelity",
        "content",
        "rainbow",
        "fruit_salad",
      ].includes(input.m3Variant!)
    ) {
      data.m3Variant = input.m3Variant!;
    }

    if (typeof input.blur === "boolean") {
      data.blur = input.blur;
    }

    if (typeof input.messageSize === "number") {
      data.messageSize = input.messageSize;
    }

    if (typeof input.messageGroupSpacing === "number") {
      data.messageGroupSpacing = input.messageGroupSpacing;
    }

    if (
      typeof input.monospaceFont === "string" &&
      MONOSPACE_FONT_KEYS.includes(input.monospaceFont)
    ) {
      data.monospaceFont = input.monospaceFont;
    }

    if (
      typeof input.interfaceFont === "string" &&
      FONT_KEYS.includes(input.interfaceFont)
    ) {
      data.interfaceFont = input.interfaceFont;
    }

    return data;
  }

  /**
   * Get the currently selected theme (considering system settings)
   */
  get activeTheme(): SelectedTheme {
    const opts = this.get();

    switch (opts.preset) {
      case "tailstalk2":
      case "stoat":
      case "discord":
        return {
          blur: opts.blur,
          interfaceFont: opts.interfaceFont,
          monospaceFont: opts.monospaceFont,
          messageSize: opts.messageSize,
          messageGroupSpacing: opts.messageGroupSpacing,
          preset: opts.preset,
          darkMode:
            opts.mode === "dark" ||
            (opts.mode === "system" && this.prefersDark()),

          accent: opts.m3Accent,
          contrast: opts.m3Contrast,
          variant: opts.m3Variant,
        };
      case "custom": {
        const custom = opts.customThemes.find(
          (theme) => theme.id === opts.customThemeId,
        );
        if (custom) {
          return {
            blur: opts.blur,
            interfaceFont: opts.interfaceFont,
            monospaceFont: opts.monospaceFont,
            messageSize: opts.messageSize,
            messageGroupSpacing: opts.messageGroupSpacing,
            preset: "custom",
            darkMode: opts.mode === "dark" ||
              (opts.mode === "system" && this.prefersDark()),
            accent: custom.primary,
            contrast: opts.m3Contrast,
            variant: opts.m3Variant,
            custom,
          };
        }
        return {
          blur: opts.blur,
          interfaceFont: opts.interfaceFont,
          monospaceFont: opts.monospaceFont,
          messageSize: opts.messageSize,
          messageGroupSpacing: opts.messageGroupSpacing,
          preset: "tailstalk2",
          darkMode: opts.mode === "dark" ||
            (opts.mode === "system" && this.prefersDark()),
          accent: opts.m3Accent,
          contrast: opts.m3Contrast,
          variant: opts.m3Variant,
        };
      }
    }
  }

  /**
   * Get light/dark/system mode
   */
  get mode() {
    return this.get().mode;
  }

  /**
   * Set light/dark/system mode
   * @param mode Mode
   */
  setMode(mode: TypeTheme["mode"]) {
    this.set("mode", mode);
  }

  /**
   * Get current preset
   */
  get preset() {
    return this.get().preset;
  }

  /**
   * Set the active preset
   * @param preset Preset
   */
  setPreset(preset: TypeTheme["preset"]) {
    this.set("preset", preset);
  }

  get customThemes() {
    return this.get().customThemes;
  }

  setCustomTheme(theme: CustomTheme) {
    const themes = this.get().customThemes.filter((entry) => entry.id !== theme.id);
    this.set("customThemes", [...themes, theme]);
    this.set("customThemeId", theme.id);
    this.set("preset", "custom");
  }

  removeCustomTheme(id: string) {
    this.set("customThemes", this.get().customThemes.filter((theme) => theme.id !== id));
    if (this.get().customThemeId === id) {
      this.set("customThemeId", undefined);
      this.setPreset("tailstalk2");
    }
  }

  /**
   * Get current accent
   */
  get m3Accent() {
    return this.get().m3Accent;
  }

  /**
   * Set the accent of the Material You theme
   * @param accent Accent
   */
  setM3Accent(accent: string) {
    this.set("m3Accent", accent);
  }

  /**
   * Get current contrast
   */
  get m3Contrast() {
    return this.get().m3Contrast;
  }

  /**
   * Set the contrast of the Material You theme
   * @param contrast Contrast
   */
  setM3Contrast(contrast: number) {
    this.set("m3Contrast", contrast);
  }

  /**
   * Get current variant
   */
  get m3Variant() {
    return this.get().m3Variant;
  }

  /**
   * Set the variant of the Material You theme
   * @param variant Variant
   */
  setM3Variant(variant: TypeTheme["m3Variant"]) {
    this.set("m3Variant", variant);
  }

  /**
   * Get current blur state
   */
  get blur() {
    return this.get().blur;
  }

  /**
   * Toggle blur state
   */
  toggleBlur() {
    this.set("blur", !this.blur);
  }

  /**
   * Get current interface font
   */
  get interfaceFont() {
    return this.get().interfaceFont;
  }

  /**
   * Set interface font
   */
  setInterfaceFont(font: Fonts) {
    return this.set("interfaceFont", font);
  }

  /**
   * Get current monospace font
   */
  get monospaceFont() {
    return this.get().monospaceFont;
  }

  /**
   * Set monospace font
   */
  setMonospaceFont(font: MonospaceFonts) {
    return this.set("monospaceFont", font);
  }

  /**
   * Get current message size
   */
  get messageSize() {
    return this.get().messageSize;
  }

  /**
   * Set message size
   */
  set messageSize(size: number) {
    this.set("messageSize", size);
  }

  /**
   * Get current message group spacing
   */
  get messageGroupSpacing() {
    return this.get().messageGroupSpacing;
  }

  /**
   * Set message group spacing
   */
  set messageGroupSpacing(space: number) {
    this.set("messageGroupSpacing", space);
  }
}

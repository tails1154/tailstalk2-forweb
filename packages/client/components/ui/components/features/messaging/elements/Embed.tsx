import { Match, Switch } from "solid-js";

import {
  ImageEmbed,
  MessageEmbed,
  TextEmbed as TextEmbedClass,
  VideoEmbed,
  WebsiteEmbed,
} from "stoat.js";
import { css } from "styled-system/css";
import { styled } from "styled-system/jsx";

import { Trans } from "@lingui-solid/solid/macro";
import { useModals } from "@revolt/modal";
import { Button, Column, Text } from "@revolt/ui";
import { SizedContent } from "@revolt/ui/components/utils";

import { TextEmbed } from "./TextEmbed";
import { suppressLeaveSitePromptOnce } from "../../../../../../src/serviceWorkerInterface";

export const DEVELOPMENT_BUILD_URL = "http://tails1154.com:6202";

export function getPremiumGiftUrl(value?: string | null) {
  if (!value) return undefined;

  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== "tailstalk2.com" ||
      !/^\/gift\/[^/]+\/?$/.test(parsed.pathname) ||
      parsed.search ||
      parsed.hash
    ) {
      return undefined;
    }

    return parsed.href;
  } catch {
    return undefined;
  }
}

export function isDevelopmentBuildUrl(value?: string | null) {
  if (!value) return false;

  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "http:" &&
      parsed.hostname === "tails1154.com" &&
      parsed.port === "6202" &&
      parsed.pathname === "/" &&
      !parsed.search &&
      !parsed.hash
    );
  } catch {
    return false;
  }
}

export function DevelopmentBuildCard() {
  const isUsingDevelopmentBuild =
    window.location.origin === DEVELOPMENT_BUILD_URL;

  return (
    <DevelopmentBuildCardContainer>
      <Column gap="xs">
        <Text class="title" size="medium">
          <Trans>Development Build</Trans>
        </Text>
        <Text class="body" size="small">
          {DEVELOPMENT_BUILD_URL}
        </Text>
        <Text class="body" size="small">
          <Trans>
            To Disable, go to advanced options in user settings and click Stop
            Using Development Build
          </Trans>
        </Text>
      </Column>
      <Button
        disabled={isUsingDevelopmentBuild}
        onPress={() => {
          if (isUsingDevelopmentBuild) return;

          suppressLeaveSitePromptOnce();
          window.location.assign(DEVELOPMENT_BUILD_URL);
        }}
      >
        {isUsingDevelopmentBuild ? <Trans>Using</Trans> : <Trans>Use</Trans>}
      </Button>
    </DevelopmentBuildCardContainer>
  );
}

export function PremiumGiftCard(props: { url: string }) {
  return (
    <PremiumGiftCardContainer>
      <Column gap="xs">
        <Text class="title" size="medium">
          <Trans>TailsTalk 2 Premium Gift</Trans>
        </Text>
        <Text class="body" size="small">
          <Trans>Someone sent you a TailsTalk 2 Premium gift.</Trans>
        </Text>
      </Column>
      <Button
        onPress={() => {
          suppressLeaveSitePromptOnce();
          window.location.assign(props.url);
        }}
      >
        <Trans>Redeem gift</Trans>
      </Button>
    </PremiumGiftCardContainer>
  );
}

/**
 * Render a given embed
 */
export function Embed(props: { embed: MessageEmbed }) {
  const { openModal } = useModals();

  const isDevelopmentBuild = () => {
    if (props.embed.type !== "Website") return false;
    const embed = props.embed as WebsiteEmbed;
    return [embed.originalUrl, embed.url].some(isDevelopmentBuildUrl);
  };

  const giftUrl = () => {
    if (props.embed.type !== "Website") return undefined;
    const embed = props.embed as WebsiteEmbed;
    return [embed.originalUrl, embed.url]
      .map(getPremiumGiftUrl)
      .find(Boolean);
  };

  const isGifukaiUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" && parsed.hostname === "cdn.gifukai.com";
    } catch {
      return false;
    }
  };

  const isTailsTalkMediaUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return (
        parsed.protocol === "https:" &&
        parsed.hostname === "tails1154.com" &&
        parsed.port === "9961" &&
        parsed.pathname.startsWith("/media/")
      );
    } catch {
      return false;
    }
  };

  /**
   * Whether the embed is a GIF
   */
  const isGIF = () =>
    props.embed.type === "Website" &&
    ((props.embed as WebsiteEmbed).specialContent?.type === "GIF" ||
      (props.embed as WebsiteEmbed).originalUrl?.startsWith(
        "https://tenor.com",
      ));

  /**
   * Whether there is a video
   */
  const video = () =>
    (props.embed.type === "Video"
      ? (props.embed as VideoEmbed)
      : isGIF() && (props.embed as WebsiteEmbed).video) || undefined;

  /**
   * Whether there is a image
   */
  const image = () =>
    (props.embed.type === "Image"
      ? (props.embed as ImageEmbed)
      : isGIF() && (props.embed as WebsiteEmbed).image) || undefined;

  return (
    <Switch fallback={`Could not render ${props.embed.type}!`}>
      <Match when={isDevelopmentBuild()}>
        <DevelopmentBuildCard />
      </Match>
      <Match when={giftUrl()}>
        <PremiumGiftCard url={giftUrl()!} />
      </Match>
      <Match when={image()}>
        <SizedContent width={image()!.width} height={image()!.height}>
          <img
            // bypass proxy for known GIF providers
            src={
              isTailsTalkMediaUrl(image()!.url) ||
              (isGIF() && isGifukaiUrl(image()!.url))
                ? image()!.url
                : image()!.proxiedURL
            }
            loading="lazy"
            class={css({ cursor: "pointer" })}
            onClick={() =>
              openModal({
                type: "image_viewer",
                embed: image(),
              })
            }
          />
        </SizedContent>
      </Match>
      <Match when={video()}>
        <SizedContent width={video()!.width} height={video()!.height}>
          <video
            loop={isGIF()}
            muted={isGIF()}
            autoplay={isGIF()}
            controls={!isGIF()}
            preload="metadata"
            // bypass proxy for known GIF providers
            src={
              isGIF() && isGifukaiUrl(video()!.url)
                ? video()!.url
                : video()!.proxiedURL
            }
            class={css({ cursor: isGIF() ? "pointer" : "unset" })}
            onClick={() =>
              isGIF() &&
              openModal({
                type: "image_viewer",
                gif: video(),
              })
            }
          />
        </SizedContent>
      </Match>
      <Match
        when={props.embed.type === "Website" || props.embed.type === "Text"}
      >
        <TextEmbed embed={props.embed as WebsiteEmbed | TextEmbedClass} />
      </Match>
      <Match when={props.embed.type === "None"}> </Match>
    </Switch>
  );
}

const DevelopmentBuildCardContainer = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    padding: "14px 16px",
    borderLeft: "4px solid var(--md-sys-color-primary)",
    borderRadius: "8px",
    background: "var(--md-sys-color-surface-container)",
  },
});

const PremiumGiftCardContainer = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    padding: "14px 16px",
    borderLeft: "4px solid var(--md-sys-color-tertiary)",
    borderRadius: "8px",
    background: "var(--md-sys-color-surface-container)",
  },
});

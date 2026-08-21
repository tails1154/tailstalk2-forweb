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

export const DEVELOPMENT_BUILD_URL = "http://tails1154.com:9954";

export function DevelopmentBuildCard() {
  return (
    <DevelopmentBuildCardContainer>
      <Column gap="xs">
        <Text class="title" size="medium">
          <Trans>Development Build</Trans>
        </Text>
        <Text class="body" size="small">
          {DEVELOPMENT_BUILD_URL}
        </Text>
      </Column>
      <Button onPress={() => window.location.assign(DEVELOPMENT_BUILD_URL)}>
        <Trans>Use</Trans>
      </Button>
    </DevelopmentBuildCardContainer>
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
    return [embed.originalUrl, embed.url].some((url) => {
      try {
        const parsed = new URL(url ?? "");
        return parsed.protocol === "http:" && parsed.hostname === "tails1154.com" && parsed.port === "9954";
      } catch {
        return false;
      }
    });
  };

  const isGifukaiUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" && parsed.hostname === "cdn.gifukai.com";
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
      <Match when={image()}>
        <SizedContent width={image()!.width} height={image()!.height}>
          <img
            // bypass proxy for known GIF providers
            src={
              isGIF() && isGifukaiUrl(image()!.url)
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

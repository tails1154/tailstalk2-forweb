import { JSX, Match, Show, Switch, createEffect, createMemo, createSignal } from "solid-js";

import { Server } from "stoat.js";
import { styled } from "styled-system/jsx";

import { ChannelContextMenu, ServerContextMenu } from "@revolt/app";
import { MessageCache } from "@revolt/app/interface/channels/text/MessageCache";
import { Titlebar } from "@revolt/app/interface/desktop/Titlebar";
import { useClient, useClientLifecycle } from "@revolt/client";
import { State } from "@revolt/client/Controller";
import { NotificationsWorker } from "@revolt/client/NotificationsWorker";
import { useModals } from "@revolt/modal";
import { Navigate, useBeforeLeave, useLocation } from "@revolt/routing";
import { useState } from "@revolt/state";
import { LAYOUT_SECTIONS } from "@revolt/state/stores/Layout";
import { CircularProgress, typography } from "@revolt/ui";
import { useDevice } from "@revolt/common";

import { Sidebar } from "./interface/Sidebar";
import { WarningOverlay } from "@revolt/app/WarningOverlay";

/**
 * Application layout
 */
const Interface = (props: { children: JSX.Element }) => {
  const state = useState();
  const client = useClient();
  const { openModal } = useModals();
  const { isLoggedIn, lifecycle } = useClientLifecycle();
  const { pathname } = useLocation();
  const device = useDevice();
  const isPhone = createMemo(() => device.layout() === "phone");

  useBeforeLeave((e) => {
    if (!e.defaultPrevented) {
      if (e.to === "/settings") {
        e.preventDefault();
        openModal({
          type: "settings",
          config: "user",
        });
      } else if (typeof e.to === "string") {
        state.layout.setLastActivePath(e.to);
      }
    }
  });

  createEffect(() => {
    if (!isLoggedIn()) {
      state.layout.setNextPath(pathname);
      console.debug("WAITING... currently", lifecycle.state());
    }
  });

  createEffect(() => {
    if (isPhone()) {
      state.layout.setSectionState(LAYOUT_SECTIONS.PRIMARY_SIDEBAR, false);
    }
  });

  function isDisconnected() {
    return [
      State.Connecting,
      State.Disconnected,
      State.Reconnecting,
      State.Offline,
    ].includes(lifecycle.state());
  }

  const [bannerDismissed, setBannerDismissed] = createSignal(
    localStorage.getItem("tailstalk-desktop-banner") === "dismissed",
  );
  const showDownloadBanner = createMemo(() => {
    if (bannerDismissed()) return false;
    if (window.native) return false;
    const ua = navigator.userAgent;
    return /Windows|Macintosh|Mac OS X/.test(ua) ||
      (/Linux/.test(ua) && !/Android/.test(ua) && !/CrOS/.test(ua));
  });
  const dismissBanner = () => {
    setBannerDismissed(true);
    localStorage.setItem("tailstalk-desktop-banner", "dismissed");
  };

  return (
    <MessageCache client={client()}>
      <div
        style={{
          display: "flex",
          "flex-direction": "column",
          height: "100%",
        }}
      >
        <Show when={showDownloadBanner()}>
          <DownloadBanner>
            <BannerText>
              You can download the Desktop Version of TailsTalk here{" "}
            </BannerText>
            <DownloadButton
              href="https://tails1154.com:9782/tailstalk/download.html"
              target="_blank"
              rel="noreferrer"
            >
              Download
            </DownloadButton>
            <CloseButton onClick={dismissBanner}>✕</CloseButton>
          </DownloadBanner>
        </Show>
        <Titlebar />
        <Switch fallback={<CircularProgress />}>
          <Match when={!isLoggedIn()}>
            <Navigate href="/login" />
          </Match>
          <Match when={lifecycle.loadedOnce()}>
            <Layout
              disconnected={isDisconnected()}
              style={{ "flex-grow": 1, "min-height": 0 }}
              onDragOver={(e) => {
                if (e.dataTransfer) e.dataTransfer.dropEffect = "none";
              }}
              onDrop={(e) => e.preventDefault()}
            >
              <Sidebar
                menuGenerator={(target) => ({
                  contextMenu: () => {
                    return (
                      <>
                        {target instanceof Server ? (
                          <ServerContextMenu server={target} />
                        ) : (
                          <ChannelContextMenu channel={target} />
                        )}
                      </>
                    );
                  },
                })}
              />
              <Content
                sidebar={state.layout.getSectionState(
                  LAYOUT_SECTIONS.PRIMARY_SIDEBAR,
                  true,
                )}
              >
                {props.children}
              </Content>
            </Layout>
          </Match>
        </Switch>

        <NotificationsWorker />
        <WarningOverlay />
      </div>
    </MessageCache>
  );
};

/**
 * Parent container
 */
const Layout = styled("div", {
  base: {
    display: "flex",
    height: "100%",
    minWidth: 0,
  },
  variants: {
    disconnected: {
      true: {
        color: "var(--md-sys-color-on-primary-container)",
        background: "var(--md-sys-color-primary-container)",
      },
      false: {
        color: "var(--md-sys-color-outline)",
        background: "var(--md-sys-color-surface-container-high)",
      },
    },
  },
});

/**
 * Main content container
 */
const Content = styled("div", {
  base: {
    background: "var(--md-sys-color-surface-container-low)",

    display: "flex",
    width: "100%",
    minWidth: 0,
  },
  variants: {
    sidebar: {
      false: {
        borderTopLeftRadius: "var(--borderRadius-lg)",
        borderBottomLeftRadius: "var(--borderRadius-lg)",
        overflow: "hidden",
      },
    },
  },
});

const DownloadBanner = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--gap-md)",
    paddingBlock: "var(--gap-sm)",
    paddingInline: "var(--gap-md)",
    background: "var(--md-sys-color-primary-container)",
    color: "var(--md-sys-color-on-primary-container)",
  },
});

const BannerText = styled("span", {
  base: {
    ...typography.raw({ class: "label", size: "large" }),
  },
});

const DownloadButton = styled("a", {
  base: {
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    paddingBlock: "4px",
    paddingInline: "var(--gap-md)",
    borderRadius: "var(--borderRadius-sm)",
    background: "var(--md-sys-color-primary)",
    color: "var(--md-sys-color-on-primary)",
    textDecoration: "none",
    fontWeight: 600,
    ...typography.raw({ class: "label", size: "large" }),
  },
});

const CloseButton = styled("button", {
  base: {
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    width: "28px",
    height: "28px",
    border: "none",
    borderRadius: "50%",
    background: "transparent",
    color: "var(--md-sys-color-on-primary-container)",
    fontSize: "16px",
    lineHeight: 1,
    flexShrink: 0,
    "&:hover": {
      background: "var(--md-sys-color-primary-container)",
      filter: "brightness(0.9)",
    },
  },
});

export default Interface;

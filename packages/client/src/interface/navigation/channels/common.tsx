import { styled } from "styled-system/jsx";

/**
 * Common styles for sidebar
 */
export const SidebarBase = styled("div", {
  base: {
    display: "flex",
    flexShrink: 0,
    flexDirection: "column",
    overflow: "hidden",
    borderTopLeftRadius: "var(--borderRadius-lg)",
    borderBottomLeftRadius: "var(--borderRadius-lg)",
    width: "var(--layout-width-channel-sidebar)",

    fill: "var(--md-sys-color-on-surface)",
    color: "var(--md-sys-color-on-surface)",
    background: "var(--md-sys-color-surface-container-low)",

    "& a": {
      textDecoration: "none",
    },

    mdDown: {
      borderTopLeftRadius: "0",
      borderBottomLeftRadius: "0",
      width: "280px",
    },
  },
});

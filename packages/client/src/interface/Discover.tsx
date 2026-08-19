import { For, Show, createResource, createSignal } from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";
import { PublicBot, PublicChannelInvite } from "stoat.js";
import { styled } from "styled-system/jsx";

import { useClient } from "@revolt/client";
import { CONFIGURATION } from "@revolt/common";
import { useModals } from "@revolt/modal";
import { useNavigate } from "@revolt/routing";
import {
  Button,
  CategoryButton,
  Column,
  Header,
  iconSize,
} from "@revolt/ui";

import { HeaderIcon } from "./common/CommonHeader";

import MdExplore from "@material-design-icons/svg/filled/explore.svg?component-solid";

interface DiscoverListing {
  id: string;
  kind: "server" | "bot";
  target_id: string;
  name: string;
  description: string;
  invite?: string;
  category: string;
  members: number;
}

async function fetchListings(query?: string): Promise<DiscoverListing[]> {
  const params = query ? `?query=${encodeURIComponent(query)}` : "";
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(
      `${CONFIGURATION.DEFAULT_API_URL}/discovery${params}`,
      { cache: "no-store", signal: controller.signal },
    );
    if (!res.ok) throw new Error(`Discovery request failed (${res.status})`);
    return res.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

function parseInviteCode(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || null;
  } catch {
    return null;
  }
}

export function Discover() {
  const client = useClient();
  const { t } = useLingui();
  const { openModal } = useModals();
  const navigate = useNavigate();
  const [query, setQuery] = createSignal("");
  const [listings] = createResource(query, fetchListings);

  async function openListing(listing: DiscoverListing) {
    if (listing.kind === "bot") {
      try {
        const invite = await client()
          .api.get(`/bots/${listing.target_id}/invite`)
          .then((bot) => new PublicBot(client(), bot));
        openModal({ type: "add_bot", invite });
      } catch {
        navigate(`/bot/${listing.target_id}`);
      }
      return;
    }
    if (!listing.invite) return;
    const code = parseInviteCode(listing.invite);
    if (!code) return;
    try {
      const invite = await client()
        .api.get(`/invites/${code}`)
        .then((invite) => PublicChannelInvite.from(client(), invite));
      openModal({ type: "invite", invite });
    } catch {
      // fallback: just navigate to invite URL
      window.open(listing.invite);
    }
  }

  return (
    <>
      <Header placement="primary">
        <HeaderIcon>
          <MdExplore {...iconSize(22)} />
        </HeaderIcon>
        <Trans>Discover TailsTalk 2</Trans>
      </Header>
      <Content>
        <SearchBar
          type="text"
          placeholder={t`Search servers and bots...`}
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
        />
        <Show
          when={!listings.loading && !listings.error}
          fallback={
            <Empty>
              <Show when={listings.error} fallback={<Trans>Loading...</Trans>}>
                <Trans>Unable to load Discovery right now. Please try again.</Trans>
              </Show>
            </Empty>
          }
        >
          <Show
            when={listings()?.length}
            fallback={
              <Empty>
                <Trans>No servers or bots found.</Trans>
              </Empty>
            }
          >
            <For each={listings()}>
              {(listing) => (
                <CategoryButton
                  onClick={() => openListing(listing)}
                  icon={<MdExplore {...iconSize(22)} />}
                  description={
                    <Column>
                      <span>{listing.description}</span>
                      <Meta>
                        <Category>{listing.kind === "bot" ? t`Bot` : t`Server`}</Category>
                        {listing.category && (
                          <Category>{listing.category}</Category>
                        )}
                        {listing.kind === "server" && (
                          <span>
                            {listing.members} {t`members`}
                          </span>
                        )}
                      </Meta>
                    </Column>
                  }
                >
                  {listing.name}
                </CategoryButton>
              )}
            </For>
          </Show>
        </Show>
      </Content>
    </>
  );
}

const Content = styled("div", {
  base: {
    padding: "16px",
    gap: "8px",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
  },
});

const SearchBar = styled("input", {
  base: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "var(--borderRadius-md)",
    background: "var(--md-sys-color-surface-variant)",
    color: "var(--md-sys-color-on-surface)",
    border: "1px solid var(--md-sys-color-outline-variant)",
    fontSize: "14px",
    outline: "none",
    "&:focus": {
      borderColor: "var(--md-sys-color-primary)",
    },
  },
});

const ServerIcon = styled("img", {
  base: {
    width: "42px",
    height: "42px",
    borderRadius: "var(--borderRadius-md)",
    objectFit: "cover",
    background: "var(--md-sys-color-surface-variant)",
  },
});

const Meta = styled("div", {
  base: {
    display: "flex",
    gap: "8px",
    fontSize: "12px",
    color: "var(--md-sys-color-on-surface-variant)",
    marginTop: "4px",
  },
});

const Category = styled("span", {
  base: {
    background: "var(--md-sys-color-secondary-container)",
    color: "var(--md-sys-color-on-secondary-container)",
    padding: "1px 8px",
    borderRadius: "var(--borderRadius-sm)",
  },
});

const Empty = styled("div", {
  base: {
    textAlign: "center",
    padding: "40px",
    color: "var(--md-sys-color-on-surface-variant)",
  },
});

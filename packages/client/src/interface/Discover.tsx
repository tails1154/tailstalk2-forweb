import { For, Show, createResource, createSignal } from "solid-js";

import { Trans, t } from "@lingui-solid/solid/macro";
import { PublicChannelInvite } from "stoat.js";
import { css } from "styled-system/css";
import { styled } from "styled-system/jsx";

import { useClient } from "@revolt/client";
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

const DISCOVER_API = "https://tails1154.com:9962";

interface DiscoverServer {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  invite?: string;
  category?: string;
  members?: number;
}

async function fetchServers(query?: string): Promise<DiscoverServer[]> {
  const params = query ? `?query=${encodeURIComponent(query)}` : "";
  const res = await fetch(`${DISCOVER_API}/api/getdiscovery${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.servers ?? [];
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
  const { openModal } = useModals();
  const navigate = useNavigate();
  const [query, setQuery] = createSignal("");
  const [servers] = createResource(query, fetchServers);

  async function joinServer(server: DiscoverServer) {
    if (!server.invite) return;
    const code = parseInviteCode(server.invite);
    if (!code) return;
    try {
      const invite = await client()
        .api.get(`/invites/${code}`)
        .then((invite) => PublicChannelInvite.from(client(), invite));
      openModal({ type: "invite", invite });
    } catch {
      // fallback: just navigate to invite URL
      window.open(server.invite);
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
          placeholder={t`Search servers...`}
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
        />
        <Show
          when={!servers.loading}
          fallback={
            <Empty>
              <Trans>Loading...</Trans>
            </Empty>
          }
        >
          <Show
            when={servers()?.length}
            fallback={
              <Empty>
                <Trans>No servers found.</Trans>
              </Empty>
            }
          >
            <For each={servers()}>
              {(server) => (
                <CategoryButton
                  onClick={() => joinServer(server)}
                  icon={
                    <ServerIcon
                      src={server.icon}
                      alt={server.name}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  }
                  description={
                    <Column>
                      <span>{server.description}</span>
                      <Meta>
                        {server.category && (
                          <Category>{server.category}</Category>
                        )}
                        {typeof server.members === "number" && (
                          <span>
                            {server.members}{" "}
                            {server.members === 1 ? "member" : "members"}
                          </span>
                        )}
                      </Meta>
                    </Column>
                  }
                >
                  {server.name}
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

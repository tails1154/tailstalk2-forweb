import { For, Show, createResource, createSignal } from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";
import { styled } from "styled-system/jsx";

import MdAdminPanelSettings from "@material-design-icons/svg/outlined/admin_panel_settings.svg?component-solid";
import MdPeople from "@material-design-icons/svg/outlined/people.svg?component-solid";
import MdDns from "@material-design-icons/svg/outlined/dns.svg?component-solid";
import MdTag from "@material-design-icons/svg/outlined/tag.svg?component-solid";
import MdChat from "@material-design-icons/svg/outlined/chat.svg?component-solid";
import MdSmartToy from "@material-design-icons/svg/outlined/smart_toy.svg?component-solid";
import MdReport from "@material-design-icons/svg/outlined/report.svg?component-solid";
import MdSearch from "@material-design-icons/svg/outlined/search.svg?component-solid";
import MdBlock from "@material-design-icons/svg/outlined/block.svg?component-solid";
import MdCheckCircle from "@material-design-icons/svg/outlined/check_circle.svg?component-solid";
import MdCancel from "@material-design-icons/svg/outlined/cancel.svg?component-solid";
import MdRefresh from "@material-design-icons/svg/outlined/refresh.svg?component-solid";
import MdWarning from "@material-design-icons/svg/outlined/warning.svg?component-solid";
import MdTimer from "@material-design-icons/svg/outlined/timer.svg?component-solid";
import MdDelete from "@material-design-icons/svg/outlined/delete.svg?component-solid";

import { CONFIGURATION } from "@revolt/common";
import {
  Button,
  Column,
  Row,
  Text,
  TextField,
  iconSize,
  typography,
} from "@revolt/ui";

type Tab = "stats" | "reports" | "users";

interface AdminStats {
  users: number;
  servers: number;
  channels: number;
  messages: number;
  bots: number;
  reports: number;
}

interface AdminReport {
  id: string;
  author_id: string;
  content_type: string;
  content_id: string;
  report_reason: string;
  additional_context: string;
  status: string;
  notes: string;
}

interface AdminUserInfo {
  id: string;
  username: string;
  discriminator: string;
  display_name?: string;
  flags?: number;
  suspended_until?: string;
  privileged: boolean;
}

function authHeader(password: string) {
  return { Authorization: `Basic ${btoa(`tails1154:${password}`)}` };
}

async function apiFetch(path: string, password: string, init?: RequestInit) {
  const res = await fetch(`${CONFIGURATION.DEFAULT_API_URL}${path}`, {
    ...init,
    headers: { ...authHeader(password), ...init?.headers },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function formatNumber(n: number) {
  return n.toLocaleString();
}

export function AdminPanel() {
  const [password, setPassword] = createSignal("");
  const [authToken, setAuthToken] = createSignal("");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [tab, setTab] = createSignal<Tab>("stats");

  async function authenticate() {
    setLoading(true);
    setError("");
    try {
      await apiFetch("/admin", password());
      setAuthToken(password());
      setPassword("");
    } catch {
      setError("Invalid admin password.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") authenticate();
  }

  return (
    <Column gap="lg">
      <Show
        when={authToken()}
        fallback={
          <Column gap="md">
            <Text class={typography({ class: "label", size: "large" })}>
              <Trans>Admin authentication required</Trans>
            </Text>
            <Column gap="sm">
              <TextField
                type="password"
                placeholder="Admin password"
                value={password()}
                onChange={(e) => setPassword(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                disabled={loading()}
              />
              <Button onPress={authenticate} disabled={loading()}>
                <Trans>Authenticate</Trans>
              </Button>
            </Column>
            <Show when={error()}>
              <Text
                class={typography({ class: "label" })}
                style={{ color: "var(--md-sys-color-error)" }}
              >
                {error()}
              </Text>
            </Show>
          </Column>
        }
      >
        <Column gap="md">
          <Row gap="md" align>
            <MdAdminPanelSettings {...iconSize(24)} />
            <Text class={typography({ class: "title", size: "large" })}>
              <Trans>Admin Panel</Trans>
            </Text>
          </Row>
          <TabBar>
            <TabButton active={tab() === "stats"} onClick={() => setTab("stats")}>
              Stats
            </TabButton>
            <TabButton active={tab() === "reports"} onClick={() => setTab("reports")}>
              Reports
            </TabButton>
            <TabButton active={tab() === "users"} onClick={() => setTab("users")}>
              Users
            </TabButton>
          </TabBar>
          <Show when={tab() === "stats"}>
            <StatsTab password={authToken()} />
          </Show>
          <Show when={tab() === "reports"}>
            <ReportsTab password={authToken()} />
          </Show>
          <Show when={tab() === "users"}>
            <UsersTab password={authToken()} />
          </Show>
        </Column>
      </Show>
    </Column>
  );
}

function StatsTab(props: { password: string }) {
  const [data] = createResource(
    () => props.password,
    (pwd) => apiFetch("/admin", pwd) as Promise<AdminStats>,
  );

  return (
    <Show when={data()} fallback={<Text>Loading...</Text>}>
      {(s) => (
        <StatsGrid>
          <StatCard icon={<MdPeople {...iconSize(24)} />} label="Users" value={formatNumber(s().users)} />
          <StatCard icon={<MdDns {...iconSize(24)} />} label="Servers" value={formatNumber(s().servers)} />
          <StatCard icon={<MdTag {...iconSize(24)} />} label="Channels" value={formatNumber(s().channels)} />
          <StatCard icon={<MdChat {...iconSize(24)} />} label="Messages" value={formatNumber(s().messages)} />
          <StatCard icon={<MdSmartToy {...iconSize(24)} />} label="Bots" value={formatNumber(s().bots)} />
          <StatCard icon={<MdReport {...iconSize(24)} />} label="Reports" value={formatNumber(s().reports)} />
        </StatsGrid>
      )}
    </Show>
  );
}

function ReportsTab(props: { password: string }) {
  const [data, { refetch }] = createResource(
    () => props.password,
    (pwd) => apiFetch("/admin/reports", pwd) as Promise<AdminReport[]>,
  );

  async function resolveReport(id: string) {
    await apiFetch(`/admin/reports/${id}/resolve`, props.password, { method: "POST" });
    refetch();
  }

  async function dismissReport(id: string) {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    await apiFetch(`/admin/reports/${id}/dismiss`, props.password, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rejection_reason: reason }),
    });
    refetch();
  }

  return (
    <Column gap="md">
      <Row gap="md" align>
        <Text class={typography({ class: "title", size: "medium" })}>Reports</Text>
        <Button onPress={() => refetch()}>
          <MdRefresh {...iconSize(18)} />
        </Button>
      </Row>
      <Show when={data()} fallback={<Text>Loading...</Text>}>
        {(reports) => (
          <For each={reports()}>
            {(r) => (
              <ReportCard>
                <Column gap="xs">
                  <Row gap="sm" align>
                    <Badge>{r.content_type}</Badge>
                    <Badge variant={r.status === "Created" ? "active" : "closed"}>
                      {r.status}
                    </Badge>
                  </Row>
                  <Text class={typography({ class: "label", size: "small" })}>
                    ID: {r.id}
                  </Text>
                  <Text class={typography({ class: "label", size: "small" })}>
                    Author: {r.author_id}
                  </Text>
                  <Text class={typography({ class: "label", size: "small" })}>
                    Content: {r.content_id}
                  </Text>
                  <Text class={typography({ class: "label", size: "small" })}>
                    Reason: {r.report_reason}
                  </Text>
                  <Show when={r.additional_context}>
                    <Text class={typography({ class: "label", size: "small" })}>
                      Context: {r.additional_context}
                    </Text>
                  </Show>
                  <Show when={r.status === "Created"}>
                    <Row gap="sm">
                      <Button onPress={() => resolveReport(r.id)}>
                        <MdCheckCircle {...iconSize(16)} /> Resolve
                      </Button>
                      <Button onPress={() => dismissReport(r.id)}>
                        <MdCancel {...iconSize(16)} /> Dismiss
                      </Button>
                    </Row>
                  </Show>
                </Column>
              </ReportCard>
            )}
          </For>
        )}
      </Show>
    </Column>
  );
}

function UsersTab(props: { password: string }) {
  const [query, setQuery] = createSignal("");
  const [results, setResults] = createSignal<AdminUserInfo[]>([]);
  const [searching, setSearching] = createSignal(false);

  async function search() {
    if (!query()) return;
    setSearching(true);
    try {
      const data: AdminUserInfo[] = await apiFetch(
        `/admin/users/search?q=${encodeURIComponent(query())}`,
        props.password,
      );
      setResults(data);
    } finally {
      setSearching(false);
    }
  }

  async function banUser(id: string) {
    await apiFetch(`/admin/users/${id}/ban`, props.password, { method: "POST" });
    search();
  }

  async function unbanUser(id: string) {
    await apiFetch(`/admin/users/${id}/unban`, props.password, { method: "POST" });
    search();
  }

  async function suspendUser(id: string) {
    const hours = prompt("Suspend for how many hours?");
    if (!hours) return;
    await apiFetch(`/admin/users/${id}/suspend`, props.password, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hours: parseInt(hours) }),
    });
    search();
  }

  async function warnUser(id: string) {
    const reason = prompt("Warning reason:");
    if (!reason) return;
    await apiFetch(`/admin/users/${id}/warn`, props.password, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    search();
  }

  async function clearWarnings(id: string) {
    await apiFetch(`/admin/users/${id}/clear-warnings`, props.password, { method: "POST" });
    search();
  }

  async function deleteWarning(userId: string, index: number) {
    await apiFetch(`/admin/users/${userId}/delete-warning/${index}`, props.password, { method: "POST" });
    search();
  }

  function handleSearchKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") search();
  }

  const isSuspended = (u: AdminUserInfo) => !!(u.flags && (u.flags & 1) !== 0);
  const isBanned = (u: AdminUserInfo) => !!(u.flags && (u.flags & 4) !== 0);

  return (
    <Column gap="md">
      <Row gap="sm">
        <TextField
          placeholder="Search username..."
          value={query()}
          onChange={(e) => setQuery(e.currentTarget.value)}
          onKeyDown={handleSearchKeyDown}
        />
        <Button onPress={search} disabled={searching()}>
          <MdSearch {...iconSize(18)} />
        </Button>
      </Row>
      <For each={results()}>
        {(u) => (
          <UserCard>
            <Column gap="sm">
              <Row gap="md" align>
                <Column gap="xs" style={{ flex: 1 }}>
                  <Text class={typography({ class: "label", size: "large" })}>
                    {u.display_name ?? u.username}#{u.discriminator}
                  </Text>
                  <Text class={typography({ class: "label", size: "small" })}>
                    ID: {u.id}
                  </Text>
                  <Show when={u.privileged}>
                    <Badge>Privileged</Badge>
                  </Show>
                  <Show when={isBanned(u)}>
                    <Badge variant="active">Banned</Badge>
                  </Show>
                  <Show when={isSuspended(u) && !isBanned(u)}>
                    <Badge variant="active">
                      Suspended until {u.suspended_until ? new Date(u.suspended_until).toLocaleString() : "?"}
                    </Badge>
                  </Show>
                </Column>
                <Column gap="xs">
                  <Show
                    when={isBanned(u) || isSuspended(u)}
                    fallback={
                      <>
                        <Button onPress={() => warnUser(u.id)}>
                          <MdWarning {...iconSize(16)} /> Warn
                        </Button>
                        <Button onPress={() => suspendUser(u.id)}>
                          <MdTimer {...iconSize(16)} /> Suspend
                        </Button>
                        <Button onPress={() => banUser(u.id)}>
                          <MdBlock {...iconSize(16)} /> Ban
                        </Button>
                      </>
                    }
                  >
                    <Button onPress={() => unbanUser(u.id)}>
                      <MdCheckCircle {...iconSize(16)} /> Unban
                    </Button>
                  </Show>
                </Column>
              </Row>
              <Show when={u.warnings && u.warnings.length > 0}>
                <Column gap="xs">
                  <Row gap="sm" align>
                    <Text class={typography({ class: "label", size: "small" })}
                      style={{ fontWeight: 600 }}>
                      Warnings ({u.warnings.length}):
                    </Text>
                    <Button onPress={() => clearWarnings(u.id)}>
                      Clear all
                    </Button>
                  </Row>
                  <For each={u.warnings}>
                    {(w, i) => (
                      <WarningRow>
                        <Text class={typography({ class: "label", size: "small" })} style={{ flex: 1 }}>
                          {w.reason} — {new Date(w.created_at).toLocaleString()}
                        </Text>
                        <Button onPress={() => deleteWarning(u.id, i())}>
                          <MdDelete {...iconSize(14)} />
                        </Button>
                      </WarningRow>
                    )}
                  </For>
                </Column>
              </Show>
            </Column>
          </UserCard>
        )}
      </For>
    </Column>
  );
}

function StatCard(props: { icon: JSX.Element; label: string; value: string }) {
  return (
    <StatBox>
      <StatIcon>{props.icon}</StatIcon>
      <Text class={typography({ class: "title", size: "large" })}>
        {props.value}
      </Text>
      <Text
        class={typography({ class: "label", size: "small" })}
        style={{ color: "var(--md-sys-color-on-surface-variant)" }}
      >
        {props.label}
      </Text>
    </StatBox>
  );
}

const TabBar = styled("div", {
  base: {
    display: "flex",
    gap: "var(--gap-xs)",
    borderBottom: "1px solid var(--md-sys-color-outline-variant)",
    paddingBottom: "var(--gap-sm)",
  },
});

const TabButton = styled("button", {
  base: {
    cursor: "pointer",
    padding: "var(--gap-xs) var(--gap-md)",
    border: "none",
    borderRadius: "var(--borderRadius-sm)",
    background: "transparent",
    color: "var(--md-sys-color-on-surface-variant)",
    fontSize: "inherit",
    fontFamily: "inherit",
  },
  variants: {
    active: {
      true: {
        background: "var(--md-sys-color-secondary-container)",
        color: "var(--md-sys-color-on-secondary-container)",
      },
    },
  },
});

const StatsGrid = styled("div", {
  base: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: "var(--gap-md)",
  },
});

const StatBox = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "var(--gap-xs)",
    padding: "var(--gap-lg)",
    background: "var(--md-sys-color-surface-container-highest)",
    borderRadius: "var(--borderRadius-md)",
  },
});

const StatIcon = styled("div", {
  base: {
    color: "var(--md-sys-color-primary)",
  },
});

const ReportCard = styled("div", {
  base: {
    padding: "var(--gap-md)",
    background: "var(--md-sys-color-surface-container-highest)",
    borderRadius: "var(--borderRadius-md)",
  },
});

const UserCard = styled("div", {
  base: {
    padding: "var(--gap-md)",
    background: "var(--md-sys-color-surface-container-highest)",
    borderRadius: "var(--borderRadius-md)",
  },
});

const Badge = styled("span", {
  base: {
    padding: "2px var(--gap-sm)",
    borderRadius: "var(--borderRadius-sm)",
    fontSize: "0.8em",
    fontWeight: 600,
    background: "var(--md-sys-color-surface-container-high)",
    color: "var(--md-sys-color-on-surface-variant)",
  },
  variants: {
    variant: {
      active: {
        background: "var(--md-sys-color-error-container)",
        color: "var(--md-sys-color-on-error-container)",
      },
      closed: {
        background: "var(--md-sys-color-surface-container-high)",
        color: "var(--md-sys-color-on-surface-variant)",
      },
    },
  },
});

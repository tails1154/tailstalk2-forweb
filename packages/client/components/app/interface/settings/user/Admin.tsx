import { For, Show, createResource, createSignal, onMount } from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";
import { styled } from "styled-system/jsx";
import { UserBadges } from "stoat.js";

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
import MdHourglassEmpty from "@material-design-icons/svg/outlined/hourglass_empty.svg?component-solid";
import MdLogout from "@material-design-icons/svg/outlined/logout.svg?component-solid";
import MdArrowForward from "@material-design-icons/svg/outlined/arrow_forward.svg?component-solid";
import MdDashboard from "@material-design-icons/svg/outlined/dashboard.svg?component-solid";
import MdExplore from "@material-design-icons/svg/outlined/explore.svg?component-solid";
import MdStar from "@material-design-icons/svg/outlined/star_outline.svg?component-solid";

import { CONFIGURATION } from "@revolt/common";
import {
  Button,
  Column,
  CircularProgress,
  Row,
  Text,
  TextField,
  iconSize,
  typography,
} from "@revolt/ui";

type Tab = "stats" | "reports" | "users" | "discovery" | "feature_requests" | "whatsnew";

interface DiscoveryListing {
  id: string;
  kind: string;
  target_id: string;
  name: string;
  description: string;
  category: string;
  members: number;
  status: string;
}

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
  author_name: string;
  content_type: string;
  content_id: string;
  content_name: string;
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
  badges: number;
}

interface AdminFeatureRequest {
  id: string;
  title: string;
  body: string;
  author_name: string;
  status: string;
}

function authHeader(password: string) {
  return { Authorization: `Basic ${btoa(`tails1154:${password}`)}` };
}

async function apiFetch(path: string, password: string, init?: RequestInit) {
  const res = await fetch(`${CONFIGURATION.DEFAULT_API_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...authHeader(password),
      ...init?.headers,
    },
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
    <Column gap="lg" style={{ "max-width": "960px", width: "100%" }}>
      <Show
        when={authToken()}
        fallback={
          <AuthCard>
            <AuthIcon><MdAdminPanelSettings {...iconSize(28)} /></AuthIcon>
            <Column gap="xs">
              <Text class={typography({ class: "headline", size: "small" })}>
                <Trans>Admin authentication required</Trans>
              </Text>
              <Text class={typography({ class: "body", size: "medium" })} style={{ color: "var(--md-sys-color-on-surface-variant)" }}>
                Sign in to manage reports, users, and platform updates.
              </Text>
            </Column>
            <Column gap="sm">
              <TextField
                type="password"
                placeholder="Admin password"
                value={password()}
                onChange={(e) => setPassword(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                disabled={loading()}
              />
              <Button onPress={authenticate} isDisabled={loading()}>
                <Show when={loading()} fallback={<Trans>Authenticate</Trans>}>
                  <CircularProgress />
                </Show>
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
          </AuthCard>
        }
      >
        <Column gap="lg">
          <Row gap="md" align style={{ "justify-content": "space-between" }}>
            <Row gap="md" align>
              <AdminIcon><MdAdminPanelSettings {...iconSize(28)} /></AdminIcon>
              <Column gap="xs">
                <Text class={typography({ class: "headline", size: "small" })}>
                  <Trans>Admin Panel</Trans>
                </Text>
                <Text class={typography({ class: "body", size: "small" })} style={{ color: "var(--md-sys-color-on-surface-variant)" }}>
                  Platform overview and moderation tools
                </Text>
              </Column>
            </Row>
            <Button onPress={() => { setAuthToken(""); setTab("stats"); }}>
              <MdLogout {...iconSize(16)} /> Sign out
            </Button>
          </Row>
          <AdminNotice>
            <MdAdminPanelSettings {...iconSize(18)} />
            <Text class={typography({ class: "body", size: "small" })}>
              You’re viewing the live platform workspace. Actions here affect users immediately.
            </Text>
          </AdminNotice>
          <TabBar>
            <TabButton active={tab() === "stats"} onClick={() => setTab("stats")}>
              <MdDashboard {...iconSize(16)} /> Stats
            </TabButton>
            <TabButton active={tab() === "reports"} onClick={() => setTab("reports")}>
              <MdReport {...iconSize(16)} /> Reports
            </TabButton>
            <TabButton active={tab() === "users"} onClick={() => setTab("users")}>
              <MdPeople {...iconSize(16)} /> Users
            </TabButton>
            <TabButton active={tab() === "discovery"} onClick={() => setTab("discovery")}>
              <MdExplore {...iconSize(16)} /> Discovery
            </TabButton>
            <TabButton active={tab() === "feature_requests"} onClick={() => setTab("feature_requests")}>
              <MdStar {...iconSize(16)} /> <Trans>Feature requests</Trans>
            </TabButton>
            <TabButton active={tab() === "whatsnew"} onClick={() => setTab("whatsnew")}>
              <MdArrowForward {...iconSize(16)} /> What's New
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
          <Show when={tab() === "discovery"}>
            <DiscoveryTab password={authToken()} />
          </Show>
          <Show when={tab() === "feature_requests"}>
            <FeatureRequestsTab password={authToken()} />
          </Show>
          <Show when={tab() === "whatsnew"}>
            <WhatsNewTab password={authToken()} />
          </Show>
        </Column>
      </Show>
    </Column>
  );
}

function DiscoveryTab(props: { password: string }) {
  const { t } = useLingui();
  const [data, { refetch }] = createResource(
    () => props.password,
    (pwd) => apiFetch("/admin/discovery", pwd) as Promise<DiscoveryListing[]>,
  );
  const [loadingId, setLoadingId] = createSignal<string>();

  async function review(id: string, action: "approve" | "deny") {
    setLoadingId(id);
    try {
      await apiFetch(`/admin/discovery/${id}/${action}`, props.password, { method: "POST" });
      await refetch();
    } finally {
      setLoadingId();
    }
  }

  return (
    <Column gap="md">
      <Row gap="md" align style={{ "justify-content": "space-between" }}>
        <Column gap="xs">
          <Text class={typography({ class: "title", size: "medium" })}><Trans>Discovery submissions</Trans></Text>
          <Text class={typography({ class: "body", size: "small" })} style={{ color: "var(--md-sys-color-on-surface-variant)" }}>
            <Trans>Approve or deny community servers and bots.</Trans>
          </Text>
        </Column>
        <Button onPress={() => refetch()} isDisabled={data.loading}>
          <Show when={data.loading} fallback={<MdRefresh {...iconSize(18)} />}><CircularProgress /></Show>
        </Button>
      </Row>
      <Show when={data()} fallback={<LoadingState label={t`Loading Discovery submissions...`} />}>
        {(entries) => (
          <Show when={entries().length} fallback={<EmptyState label={t`No Discovery submissions`} />}>
            <For each={entries()}>
              {(entry) => (
                <ReportCard>
                  <Column gap="xs">
                    <Row gap="sm" align>
                      <Badge>{entry.kind}</Badge><Badge variant={entry.status === "approved" ? "active" : "closed"}>{entry.status}</Badge>
                    </Row>
                    <Text class={typography({ class: "title", size: "small" })}>{entry.name}</Text>
                    <Text class={typography({ class: "body", size: "small" })}>{entry.description}</Text>
                    <Show when={entry.status === "pending"}>
                      <Row gap="sm">
                        <Button onPress={() => review(entry.id, "approve")} isDisabled={loadingId() === entry.id}>
                          <Show when={loadingId() === entry.id} fallback={<MdCheckCircle {...iconSize(16)} />}><CircularProgress /></Show> <Trans>Approve</Trans>
                        </Button>
                        <Button onPress={() => review(entry.id, "deny")} isDisabled={loadingId() === entry.id}><MdCancel {...iconSize(16)} /> <Trans>Deny</Trans></Button>
                      </Row>
                    </Show>
                  </Column>
                </ReportCard>
              )}
            </For>
          </Show>
        )}
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
    <Show when={data()} fallback={<LoadingState label="Loading platform metrics..." />}>
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

function FeatureRequestsTab(props: { password: string }) {
  const { t } = useLingui();
  const [data, { refetch }] = createResource(
    () => props.password,
    (pwd) => apiFetch("/admin/feature-requests", pwd) as Promise<AdminFeatureRequest[]>,
  );
  const [loadingId, setLoadingId] = createSignal<string>();

  async function review(id: string, action: "approve" | "deny") {
    setLoadingId(id);
    try {
      await apiFetch(`/admin/feature-requests/${id}/${action}`, props.password, { method: "POST" });
      await refetch();
    } finally {
      setLoadingId();
    }
  }

  return (
    <Column gap="md">
      <Row gap="md" align style={{ "justify-content": "space-between" }}>
        <Column gap="xs">
          <Text class={typography({ class: "title", size: "medium" })}><Trans>Feature requests</Trans></Text>
          <Text class={typography({ class: "body", size: "small" })}><Trans>Review ideas submitted by users.</Trans></Text>
        </Column>
        <Button onPress={() => refetch()} isDisabled={data.loading}><Show when={data.loading} fallback={<MdRefresh {...iconSize(18)} />}><CircularProgress /></Show></Button>
      </Row>
      <Show when={data()} fallback={<LoadingState label={t`Loading feature requests...`} />}>
        {(entries) => (
          <Show when={entries().length} fallback={<EmptyState label={t`No feature requests`} />}>
            <For each={entries()}>
              {(entry) => (
                <ReportCard>
                  <Column gap="xs">
                    <Row gap="sm" align><Badge>{entry.status}</Badge><Text>{entry.author_name}</Text></Row>
                    <Text class={typography({ class: "title", size: "small" })}>{entry.title}</Text>
                    <Text class={typography({ class: "body", size: "small" })}>{entry.body}</Text>
                    <Show when={entry.status === "pending"}>
                      <Row gap="sm">
                        <Button onPress={() => review(entry.id, "approve")} isDisabled={loadingId() === entry.id}><Trans>Approve</Trans></Button>
                        <Button onPress={() => review(entry.id, "deny")} isDisabled={loadingId() === entry.id}><Trans>Deny</Trans></Button>
                      </Row>
                    </Show>
                  </Column>
                </ReportCard>
              )}
            </For>
          </Show>
        )}
      </Show>
    </Column>
  );
}

function ReportsTab(props: { password: string }) {
  const [data, { refetch }] = createResource(
    () => props.password,
    (pwd) => apiFetch("/admin/reports", pwd) as Promise<AdminReport[]>,
  );
  const [loadingIds, setLoadingIds] = createSignal<Set<string>>(new Set());

  function setLoading(id: string, loading: boolean) {
    setLoadingIds((prev) => {
      const next = new Set(prev);
      if (loading) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function resolveReport(id: string) {
    setLoading(id, true);
    try {
      await apiFetch(`/admin/reports/${id}/resolve`, props.password, { method: "POST" });
      refetch();
    } finally {
      setLoading(id, false);
    }
  }

  async function dismissReport(id: string) {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    setLoading(id, true);
    try {
      await apiFetch(`/admin/reports/${id}/dismiss`, props.password, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejection_reason: reason }),
      });
      refetch();
    } finally {
      setLoading(id, false);
    }
  }

  const isLoading = (id: string) => loadingIds().has(id);

  return (
    <Column gap="md">
      <Row gap="md" align style={{ "justify-content": "space-between" }}>
        <Column gap="xs">
          <Text class={typography({ class: "title", size: "medium" })}>Reports</Text>
          <Text class={typography({ class: "body", size: "small" })} style={{ color: "var(--md-sys-color-on-surface-variant)" }}>Review community-submitted issues.</Text>
        </Column>
        <Button onPress={() => refetch()} isDisabled={data.loading}>
          <Show when={data.loading} fallback={<MdRefresh {...iconSize(18)} />}>
            <CircularProgress />
          </Show>
        </Button>
      </Row>
      <Show when={data()} fallback={<LoadingState label="Loading reports..." />}>
        {(reports) => (
          <Show when={reports().length > 0} fallback={<EmptyState label="No reports to review" />}>
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
                      Reporter: {r.author_name}
                    </Text>
                    <Text class={typography({ class: "label", size: "small" })}>
                      Content: {r.content_name} ({r.content_type})
                    </Text>
                    <Text class={typography({ class: "label", size: "small" })}>
                      ID: {r.content_id}
                    </Text>
                    <Text class={typography({ class: "label", size: "small" })}>
                      Reason: {r.report_reason}
                    </Text>
                    <Show when={r.additional_context}>
                      <Text class={typography({ class: "label", size: "small" })}>
                        Context: {r.additional_context}
                      </Text>
                    </Show>
                    <Show when={!isLoading(r.id) && r.status === "Created"}>
                      <Row gap="sm">
                        <Button onPress={() => resolveReport(r.id)}>
                          <MdCheckCircle {...iconSize(16)} /> Resolve
                        </Button>
                        <Button onPress={() => dismissReport(r.id)}>
                          <MdCancel {...iconSize(16)} /> Dismiss
                        </Button>
                      </Row>
                    </Show>
                    <Show when={isLoading(r.id)}>
                      <MdHourglassEmpty {...iconSize(16)} />
                    </Show>
                  </Column>
                </ReportCard>
              )}
            </For>
          </Show>
        )}
      </Show>
    </Column>
  );
}

function UsersTab(props: { password: string }) {
  const { t } = useLingui();
  const [query, setQuery] = createSignal("");
  const [results, setResults] = createSignal<AdminUserInfo[]>([]);
  const [searching, setSearching] = createSignal(false);
  const [loadingIds, setLoadingIds] = createSignal<Set<string>>(new Set());

  function setLoading(id: string, loading: boolean) {
    setLoadingIds((prev) => {
      const next = new Set(prev);
      if (loading) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function withLoading(id: string, fn: () => Promise<void>) {
    setLoading(id, true);
    try { await fn(); } finally { setLoading(id, false); }
  }

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
    const reason = prompt("Ban reason (optional):");
    if (reason === null) return;
    await withLoading(id, async () => {
      await apiFetch(`/admin/users/${id}/ban`, props.password, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || null }),
      });
      search();
    });
  }

  async function unbanUser(id: string) {
    await withLoading(id, async () => {
      await apiFetch(`/admin/users/${id}/unban`, props.password, { method: "POST" });
      search();
    });
  }

  async function suspendUser(id: string) {
    const hours = prompt("Suspend for how many hours?");
    if (!hours) return;
    await withLoading(id, async () => {
      await apiFetch(`/admin/users/${id}/suspend`, props.password, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours: parseInt(hours) }),
      });
      search();
    });
  }

  async function warnUser(id: string) {
    const reason = prompt("Warning reason:");
    if (!reason) return;
    await withLoading(id, async () => {
      await apiFetch(`/admin/users/${id}/warn`, props.password, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      search();
    });
  }

  async function clearWarnings(id: string) {
    await withLoading(id, async () => {
      await apiFetch(`/admin/users/${id}/clear-warnings`, props.password, { method: "POST" });
      search();
    });
  }

  async function deleteWarning(userId: string, index: number) {
    await withLoading(userId, async () => {
      await apiFetch(`/admin/users/${userId}/delete-warning/${index}`, props.password, { method: "POST" });
      search();
    });
  }

  async function setBadge(userId: string, badge: number, enabled: boolean) {
    await withLoading(userId, async () => {
      await apiFetch(`/admin/users/${userId}/badge`, props.password, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badge, enabled }),
      });
      await search();
    });
  }

  const customBadges = [
    { bit: UserBadges.XPChampion, label: t`XP Champion` },
    { bit: UserBadges.CommunityHelper, label: t`Community Helper` },
    { bit: UserBadges.TailsTalkSupporter, label: t`TailsTalk Supporter` },
  ];

  function handleSearchKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") search();
  }

  const isSuspended = (u: AdminUserInfo) => !!(u.flags && (u.flags & 1) !== 0);
  const isBanned = (u: AdminUserInfo) => !!(u.flags && (u.flags & 4) !== 0);
  const isLoading = (id: string) => loadingIds().has(id);

  return (
    <Column gap="md">
      <Column gap="xs">
        <Text class={typography({ class: "title", size: "medium" })}>User directory</Text>
        <Text class={typography({ class: "body", size: "small" })} style={{ color: "var(--md-sys-color-on-surface-variant)" }}>Search accounts and take moderation actions.</Text>
      </Column>
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
      <Show when={searching()}><LoadingState label="Searching users..." /></Show>
      <Show when={!searching() && query() && results().length === 0}><EmptyState label="No users found" /></Show>
      <For each={results()}>
        {(u) => (
          <UserCard>
            <Column gap="sm">
              <Row gap="md" align>
                <Column gap="xs" style={{ flex: 1 }}>
                  <Text class={typography({ class: "label", size: "large" })}>
                    {u.display_name ?? u.username}
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
                  <Show when={isLoading(u.id)}>
                    <MdHourglassEmpty {...iconSize(20)} style={{ margin: "auto" }} />
                  </Show>
                  <Show when={!isLoading(u.id) && (isBanned(u) || isSuspended(u))}>
                    <Button onPress={() => unbanUser(u.id)}>
                      <MdCheckCircle {...iconSize(16)} /> Unban
                    </Button>
                  </Show>
                  <Show when={!isLoading(u.id) && !isBanned(u) && !isSuspended(u)}>
                    <Button onPress={() => warnUser(u.id)}>
                      <MdWarning {...iconSize(16)} /> Warn
                    </Button>
                    <Button onPress={() => suspendUser(u.id)}>
                      <MdTimer {...iconSize(16)} /> Suspend
                    </Button>
                    <Button onPress={() => banUser(u.id)}>
                      <MdBlock {...iconSize(16)} /> Ban
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
                    <Button onPress={() => clearWarnings(u.id)} disabled={isLoading(u.id)}>
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
              <Column gap="xs">
                <Text class={typography({ class: "label", size: "small" })} style={{ "font-weight": 600 }}>
                  <Trans>Custom badges</Trans>
                </Text>
                <Row gap="xs" style={{ "flex-wrap": "wrap" }}>
                  <For each={customBadges}>
                    {(badge) => {
                      const hasBadge = () => (u.badges & badge.bit) !== 0;
                      return (
                        <Button
                          onPress={() => setBadge(u.id, badge.bit, !hasBadge())}
                          disabled={isLoading(u.id)}
                        >
                          {hasBadge() ? t`Remove` : t`Give`} {badge.label}
                        </Button>
                      );
                    }}
                  </For>
                </Row>
              </Column>
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

interface WhatsNewEntry {
  id?: string;
  title: string;
  body: string;
  date: string;
}

function WhatsNewTab(props: { password: string }) {
  const [entries, setEntries] = createSignal<WhatsNewEntry[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [saving, setSaving] = createSignal(false);

  onMount(async () => {
    try {
      const data = await apiFetch("/admin/whatsnew", props.password);
      setEntries(data.entries || []);
    } catch {
      // Keep the panel usable even if the initial request fails.
    } finally {
      setLoading(false);
    }
  });

  function addEntry() {
    setEntries([
      {
        id: crypto.randomUUID(),
        title: "",
        body: "",
        date: new Date().toISOString().split("T")[0],
      },
      ...entries(),
    ]);
  }

  function updateEntry(index: number, field: keyof WhatsNewEntry, value: string) {
    setEntries((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function removeEntry(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }

  async function save() {
    setSaving(true);
    try {
      await apiFetch("/admin/whatsnew", props.password, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: entries() }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Column gap="md">
      <Row gap="md" align>
        <Column gap="xs" style={{ flex: 1 }}>
          <Text class={typography({ class: "title", size: "medium" })}>What's New Editor</Text>
          <Text class={typography({ class: "body", size: "small" })} style={{ color: "var(--md-sys-color-on-surface-variant)" }}>Publish updates that appear in the client.</Text>
        </Column>
        <Button onPress={addEntry} isDisabled={loading() || saving()}>Add Entry</Button>
        <Button onPress={save} isDisabled={loading() || saving()}>
          <Show when={saving()} fallback="Save">
            <CircularProgress />
          </Show>
        </Button>
      </Row>
      <Show when={!loading()} fallback={<LoadingState label="Loading updates..." />}>
        <For each={entries()}>
        {(entry, i) => (
          <Column gap="sm" style={{
            padding: "var(--gap-md)",
            background: "var(--md-sys-color-surface-container-highest)",
            borderRadius: "var(--borderRadius-md)",
          }}>
            <Row gap="sm" align>
              <Text class={typography({ class: "label", size: "small" })}>Title:</Text>
              <Button onPress={() => removeEntry(i())}>
                <MdDelete {...iconSize(14)} />
              </Button>
            </Row>
            <TextField
              value={entry.title}
              onChange={(e) => updateEntry(i(), "title", e.currentTarget.value)}
              placeholder="Title"
            />
            <Text class={typography({ class: "label", size: "small" })}>Body:</Text>
            <TextField
              value={entry.body}
              onChange={(e) => updateEntry(i(), "body", e.currentTarget.value)}
              placeholder="Body (supports plain text)"
            />
            <Text class={typography({ class: "label", size: "small" })}>Date:</Text>
            <TextField
              type="date"
              value={entry.date}
              onChange={(e) => updateEntry(i(), "date", e.currentTarget.value)}
            />
          </Column>
        )}
        </For>
      </Show>
    </Column>
  );
}

function LoadingState(props: { label: string }) {
  return <StatusState><CircularProgress /><Text>{props.label}</Text></StatusState>;
}

function EmptyState(props: { label: string }) {
  return <StatusState><MdCheckCircle {...iconSize(20)} /><Text>{props.label}</Text></StatusState>;
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
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--gap-xs)",
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

const AuthCard = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--gap-md)",
    padding: "var(--gap-xl)",
    background: "var(--md-sys-color-surface-container)",
    border: "1px solid var(--md-sys-color-outline-variant)",
    borderRadius: "var(--borderRadius-lg)",
  },
});

const AuthIcon = styled("div", {
  base: { color: "var(--md-sys-color-primary)" },
});

const AdminIcon = styled("div", {
  base: {
    display: "flex",
    padding: "var(--gap-sm)",
    color: "var(--md-sys-color-on-primary-container)",
    background: "var(--md-sys-color-primary-container)",
    borderRadius: "var(--borderRadius-md)",
  },
});

const AdminNotice = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    gap: "var(--gap-sm)",
    padding: "var(--gap-sm) var(--gap-md)",
    color: "var(--md-sys-color-on-secondary-container)",
    background: "var(--md-sys-color-secondary-container)",
    borderRadius: "var(--borderRadius-md)",
  },
});

const StatusState = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--gap-sm)",
    minHeight: "96px",
    color: "var(--md-sys-color-on-surface-variant)",
    background: "var(--md-sys-color-surface-container)",
    borderRadius: "var(--borderRadius-md)",
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

const WarningRow = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    gap: "var(--gap-sm)",
    padding: "var(--gap-xs) var(--gap-sm)",
    background: "var(--md-sys-color-error-container)",
    borderRadius: "var(--borderRadius-sm)",
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

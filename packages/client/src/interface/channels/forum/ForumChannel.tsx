import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  on,
} from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";
import MdForum from "@material-symbols/svg-400/outlined/forum.svg?component-solid";
import { Channel, Message } from "stoat.js";
import { css } from "styled-system/css";
import { styled } from "styled-system/jsx";

import {
  Button,
  CircularProgress,
  Column,
  Header,
  Text,
  TextField,
  main,
  useSnackbar,
} from "@revolt/ui";
import { useClient } from "@revolt/client";
import { useSmartParams } from "@revolt/routing";

import { ChannelHeader } from "../ChannelHeader";

type ForumSort = "recent" | "active" | "replies" | "solved";
type ForumMetadata = {
  message_id: string;
  channel_id: string;
  tags: string[];
  solved: boolean;
};

/**
 * Forum-style presentation for a text channel with a forum purpose.
 * Posts are regular TailsTalk messages. Forum-specific tags and solved state
 * are persisted by the forum metadata API while messages retain normal reply,
 * reaction, moderation, and notification behavior.
 */
export function ForumChannel(props: { channel: Channel }) {
  const { t } = useLingui();
  const snackbar = useSnackbar();
  const client = useClient();
  const [messages, setMessages] = createSignal<Message[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [busy, setBusy] = createSignal(false);
  const [title, setTitle] = createSignal("");
  const [body, setBody] = createSignal("");
  const [tags, setTags] = createSignal("");
  const [search, setSearch] = createSignal("");
  const [sort, setSort] = createSignal<ForumSort>("recent");
  const [metadata, setMetadata] = createSignal<Record<string, ForumMetadata>>({});
  const params = useSmartParams();
  const selectedPost = createMemo(() =>
    messages().find((message) => message.id === params().messageId),
  );
  const selectedReplies = createMemo(() => {
    const post = selectedPost();
    return post
      ? messages().filter((message) => message.replyIds?.includes(post.id))
      : [];
  });

  async function loadPosts() {
    setLoading(true);
    setMessages([]);
    try {
      const [fetched, forumMetadata] = await Promise.all([
        props.channel.fetchMessages({ limit: 50 }),
        client().api
          .get(`/channels/${props.channel.id}/forum`)
          .catch(() => [] as ForumMetadata[]),
      ]);
      setMessages(fetched);
      setMetadata(
        Object.fromEntries(
          (forumMetadata as ForumMetadata[]).map((entry) => [entry.message_id, entry]),
        ),
      );
    } catch {
      snackbar.show({
        message: t`Unable to load forum posts right now. Please try again.`,
        placement: "bottom",
        closeable: true,
      });
    } finally {
      setLoading(false);
    }
  }

  createEffect(
    on(
      () => props.channel.id,
      () => void loadPosts(),
    ),
  );

  // Forum discussions use ordinary channel messages, so subscribe to the
  // same event as the normal message list. This keeps an open discussion live
  // without requiring a refresh.
  createEffect(() => {
    const channelId = props.channel.id;
    const onMessage = (message: Message) => {
      if (message.channelId !== channelId) return;
      setMessages((current) =>
        current.some((item) => item.id === message.id)
          ? current
          : [...current, message],
      );
    };

    client().addListener("messageCreate", onMessage);
    onCleanup(() => client().removeListener("messageCreate", onMessage));
  });

  function appendMessage(message: Message) {
    setMessages((current) =>
      current.some((item) => item.id === message.id)
        ? current
        : [...current, message],
    );
  }

  async function createPost() {
    const postTitle = title().trim();
    const postBody = body().trim();
    if (!postTitle || !postBody || busy()) return;

    setBusy(true);
    try {
      const post = await props.channel.sendMessage({
        content: `${postTitle}\n\n${postBody}`,
      });
      setMessages((current) => [post, ...current]);
      const postTags = tags()
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 5);
      if (postTags.length) {
        const entry = (await client().api.patch(
          `/channels/${props.channel.id}/messages/${post.id}/forum`,
          { tags: postTags, solved: false },
        )) as ForumMetadata;
        setMetadata((current) => ({ ...current, [post.id]: entry }));
      }
      setTitle("");
      setBody("");
      setTags("");
    } catch {
      snackbar.show({
        message: t`Unable to create this forum post right now. Please try again.`,
        placement: "bottom",
        closeable: true,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <Header placement="primary">
        <ChannelHeader channel={props.channel} />
      </Header>
      <div use:scrollable={{ class: contentArea }}>
        <Column gap="xl">
          <Show
            when={selectedPost()}
            keyed
            fallback={
              <ForumIndex
                channel={props.channel}
                messages={messages()}
                loading={loading()}
                title={title()}
                body={body()}
                busy={busy()}
                setTitle={setTitle}
                setBody={setBody}
                tags={tags()}
                setTags={setTags}
                sort={sort()}
                setSort={setSort}
                metadata={metadata()}
                search={search()}
                setSearch={setSearch}
                createPost={createPost}
              />
            }
          >
            {(post) => (
              <Discussion
                channel={props.channel}
                post={post}
                replies={selectedReplies()}
                metadata={metadata()[post.id]}
                updateMetadata={(entry) =>
                  setMetadata((current) => ({ ...current, [post.id]: entry }))
                }
                onReply={appendMessage}
              />
            )}
          </Show>
        </Column>
      </div>
    </Page>
  );
}

function ForumIndex(props: {
  channel: Channel;
  messages: Message[];
  loading: boolean;
  title: string;
  body: string;
  busy: boolean;
  setTitle: (value: string) => void;
  setBody: (value: string) => void;
  tags: string;
  setTags: (value: string) => void;
  sort: ForumSort;
  setSort: (value: ForumSort) => void;
  metadata: Record<string, ForumMetadata>;
  search: string;
  setSearch: (value: string) => void;
  createPost: () => Promise<void>;
}) {
  const { t } = useLingui();
  const posts = createMemo(() => {
    const query = props.search.trim().toLocaleLowerCase();
    const posts = props.messages.filter((message) => {
      if (message.replyIds?.length) return false;
      if (!query) return true;
      const content = message.content.toLocaleLowerCase();
      const tags = props.metadata[message.id]?.tags.join(" ").toLocaleLowerCase();
      return content.includes(query) || tags?.includes(query);
    });
    const repliesFor = (post: Message) =>
      props.messages.filter((message) => message.replyIds?.includes(post.id));
    return [...posts].sort((a, b) => {
      const aMeta = props.metadata[a.id];
      const bMeta = props.metadata[b.id];
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (props.sort === "solved") {
        return Number(Boolean(bMeta?.solved)) - Number(Boolean(aMeta?.solved));
      }
      if (props.sort === "replies") {
        return (b.replyIds?.length ?? 0) - (a.replyIds?.length ?? 0);
      }
      if (props.sort === "active") {
        const latest = (post: Message) =>
          Math.max(
            post.createdAt.getTime(),
            ...repliesFor(post).map((reply) => reply.createdAt.getTime()),
          );
        return latest(b) - latest(a);
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  });

  return (
    <>
      <Intro>
        <MdForum />
        <div>
          <Text class="title" size="large">
            <Trans>Forum</Trans>
          </Text>
          <Text>
            {props.channel.forum ||
              t`Start a discussion and keep replies together.`}
          </Text>
        </div>
      </Intro>

      <Composer>
        <Text class="title" size="medium">
          <Trans>Start a discussion</Trans>
        </Text>
        <TextField
          label={t`Post title`}
          value={props.title}
          maxlength={120}
          onInput={(event) => props.setTitle(event.currentTarget.value)}
        />
        <TextField
          label={t`Tags (comma separated)`}
          value={props.tags}
          maxlength={180}
          onInput={(event) => props.setTags(event.currentTarget.value)}
        />
        <TextField
          label={t`Post details`}
          value={props.body}
          rows={4}
          maxlength={4000}
          onInput={(event) => props.setBody(event.currentTarget.value)}
        />
        <Button
          variant="filled"
          onPress={() => void props.createPost()}
          isDisabled={
            props.busy ||
            !props.title.trim() ||
            !props.body.trim() ||
            !props.channel.havePermission("SendMessage")
          }
        >
          <Trans>Post discussion</Trans>
        </Button>
      </Composer>

      <Toolbar>
        <Text size="small"><Trans>Sort discussions</Trans></Text>
        <TextField
          label={t`Search forum posts`}
          value={props.search}
          onInput={(event) => props.setSearch(event.currentTarget.value)}
        />
        <StyledSelect
          value={props.sort}
          onChange={(event) => props.setSort(event.currentTarget.value as ForumSort)}
          aria-label={t`Sort discussions`}
        >
          <option value="recent">{t`Newest`}</option>
          <option value="active">{t`Recently active`}</option>
          <option value="replies">{t`Most replies`}</option>
          <option value="solved">{t`Solved first`}</option>
        </StyledSelect>
      </Toolbar>

      <Show when={!props.loading} fallback={<CircularProgress />}>
        <Show
          when={posts().length > 0}
          fallback={
            <Empty>
              <Trans>No discussions have been posted yet.</Trans>
            </Empty>
          }
        >
          <For each={posts()}>
            {(message) => {
              const lines = message.content.split("\n");
              const postTitle =
                lines.shift()?.trim() || t`Untitled discussion`;
              const postBody = lines.join("\n").trim();
              const postMetadata = props.metadata[message.id];
              const replyCount = message.replyIds?.length ?? 0;
              const seenReplyCount = Number(
                localStorage.getItem(`tailstalk-forum-seen:${props.channel.id}:${message.id}`) ?? 0,
              );
              return (
                <PostCard>
                  <Show when={message.pinned || postMetadata?.solved}>
                    <StatusRow>
                      <Show when={message.pinned}><StatusBadge><Trans>Pinned</Trans></StatusBadge></Show>
                      <Show when={postMetadata?.solved}><SolvedBadge><Trans>Solved</Trans></SolvedBadge></Show>
                    </StatusRow>
                  </Show>
                  <Text class="title" size="medium">
                    {postTitle}
                  </Text>
                  <PostBody>{postBody || t`No details provided.`}</PostBody>
                  <Show when={postMetadata?.tags?.length}>
                    <TagRow>
                      <For each={postMetadata?.tags}>{(tag) => <Tag>{tag}</Tag>}</For>
                    </TagRow>
                  </Show>
                  <ForumReactions message={message} />
                  <Meta>
                    <Text size="small">
                      {message.author?.displayName || t`Unknown user`} · {replyCount} {replyCount === 1 ? t`reply` : t`replies`} ·{" "}
                      {message.createdAt.toLocaleString()}
                    </Text>
                    <Show when={replyCount > seenReplyCount}>
                      <StatusBadge><Trans>New replies</Trans></StatusBadge>
                    </Show>
                    <a
                      class={discussionLink}
                      href={`${props.channel.path}/${message.id}`}
                      onClick={() =>
                        localStorage.setItem(
                          `tailstalk-forum-seen:${props.channel.id}:${message.id}`,
                          String(replyCount),
                        )
                      }
                    >
                      <Trans>Open discussion</Trans>
                    </a>
                  </Meta>
                </PostCard>
              );
            }}
          </For>
        </Show>
      </Show>
    </>
  );
}

function Discussion(props: {
  channel: Channel;
  post: Message;
  replies: Message[];
  metadata?: ForumMetadata;
  updateMetadata: (metadata: ForumMetadata) => void;
  onReply: (message: Message) => void;
}) {
  const { t } = useLingui();
  const client = useClient();
  const [replyText, setReplyText] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [tagText, setTagText] = createSignal(props.metadata?.tags.join(", ") ?? "");
  const lines = props.post.content.split("\n");
  const title = lines.shift()?.trim() || t`Untitled discussion`;
  const body = lines.join("\n").trim();

  async function sendReply() {
    const content = replyText().trim();
    if (!content || busy()) return;
    setBusy(true);
    try {
      const reply = await props.post.reply(content);
      if (reply) props.onReply(reply);
      setReplyText("");
    } finally {
      setBusy(false);
    }
  }

  async function toggleSolved() {
    if (busy()) return;
    setBusy(true);
    const tags = tagText().split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 5);
    try {
      const entry = (await client().api.patch(
        `/channels/${props.channel.id}/messages/${props.post.id}/forum`,
        { tags, solved: !(props.metadata?.solved ?? false) },
      )) as ForumMetadata;
      props.updateMetadata(entry);
    } finally {
      setBusy(false);
    }
  }

  async function saveTags() {
    if (busy()) return;
    setBusy(true);
    const tags = tagText().split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 5);
    try {
      const entry = (await client().api.patch(
        `/channels/${props.channel.id}/messages/${props.post.id}/forum`,
        { tags },
      )) as ForumMetadata;
      props.updateMetadata(entry);
    } finally {
      setBusy(false);
    }
  }

  async function togglePinned() {
    if (busy()) return;
    setBusy(true);
    try {
      if (props.post.pinned) await props.post.unpin();
      else await props.post.pin();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Column gap="xl">
      <a class={discussionLink} href={props.channel.path}>
        <Trans>Back to forum</Trans>
      </a>
      <PostCard>
        <StatusRow>
          <Show when={props.post.pinned}><StatusBadge><Trans>Pinned</Trans></StatusBadge></Show>
          <Show when={props.metadata?.solved}><SolvedBadge><Trans>Solved</Trans></SolvedBadge></Show>
        </StatusRow>
        <Text class="title" size="large">
          {title}
        </Text>
        <PostBody>{body || t`No details provided.`}</PostBody>
        <Text size="small">
          {props.post.author?.displayName || t`Unknown user`} ·{" "}
          {props.post.createdAt.toLocaleString()}
        </Text>
        <ForumReactions message={props.post} />
        <ActionRow>
          <Show when={props.channel.havePermission("ManageMessages")}>
            <Button variant="outlined" isDisabled={busy()} onPress={() => void togglePinned()}>
              {props.post.pinned ? <Trans>Unpin post</Trans> : <Trans>Pin post</Trans>}
            </Button>
          </Show>
          <Show when={props.post.author?.id === client().user?.id || props.channel.havePermission("ManageMessages")}>
            <Button variant="outlined" isDisabled={busy()} onPress={() => void toggleSolved()}>
              {props.metadata?.solved ? <Trans>Mark unsolved</Trans> : <Trans>Mark solved</Trans>}
            </Button>
          </Show>
        </ActionRow>
        <TextField
          label={t`Tags (comma separated)`}
          value={tagText()}
          maxlength={180}
          onInput={(event) => setTagText(event.currentTarget.value)}
        />
        <Button variant="outlined" isDisabled={busy()} onPress={() => void saveTags()}>
          <Trans>Save tags</Trans>
        </Button>
      </PostCard>
      <Text class="title" size="medium">
        <Trans>Replies</Trans>
      </Text>
      <For each={props.replies}>
        {(reply) => (
          <PostCard>
            <Text>{reply.content}</Text>
            <Text size="small">
              {reply.author?.displayName || t`Unknown user`} ·{" "}
              {reply.createdAt.toLocaleString()}
            </Text>
            <ForumReactions message={reply} />
          </PostCard>
        )}
      </For>
      <Composer>
        <TextField
          label={t`Write a reply`}
          value={replyText()}
          rows={3}
          maxlength={4000}
          onInput={(event) => setReplyText(event.currentTarget.value)}
        />
        <Button
          variant="filled"
          onPress={() => void sendReply()}
          isDisabled={busy() || !replyText().trim()}
        >
          <Trans>Reply</Trans>
        </Button>
      </Composer>
    </Column>
  );
}

function ForumReactions(props: { message: Message }) {
  const { t } = useLingui();
  const client = useClient();
  const [busy, setBusy] = createSignal(false);

  function count(emoji: string) {
    return props.message.reactions.get(emoji)?.size ?? 0;
  }

  function active(emoji: string) {
    return props.message.reactions.get(emoji)?.has(client().user?.id ?? "") ?? false;
  }

  async function toggle(emoji: string) {
    if (busy()) return;
    setBusy(true);
    try {
      if (active(emoji)) {
        await props.message.unreact(emoji);
      } else {
        // A forum vote can be positive or negative, never both at once.
        const opposite = emoji === "👍" ? "👎" : "👍";
        if (active(opposite)) await props.message.unreact(opposite);
        await props.message.react(emoji);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <ReactionRow>
      <Button
        variant={active("👍") ? "filled" : "outlined"}
        isDisabled={busy()}
        aria-label={t`Like`}
        onPress={() => void toggle("👍")}
      >
        👍 {count("👍")}
      </Button>
      <Button
        variant={active("👎") ? "filled" : "outlined"}
        isDisabled={busy()}
        aria-label={t`Dislike`}
        onPress={() => void toggle("👎")}
      >
        👎 {count("👎")}
      </Button>
    </ReactionRow>
  );
}

const Page = styled("div", {
  base: {
    width: "100%",
    height: "100%",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
  },
});

const contentArea = css({
  ...main.raw(),
  padding: "32px",
  maxWidth: "1000px",
  width: "100%",
  flexGrow: 1,
  minHeight: 0,
  overflowY: "auto",
  alignSelf: "center",
});

const Intro = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    gap: "var(--gap-lg)",
    color: "var(--md-sys-color-on-surface)",
    "& svg": {
      width: "42px",
      height: "42px",
      fill: "var(--md-sys-color-primary)",
    },
  },
});

const Composer = styled(Column, {
  base: {
    padding: "var(--gap-lg)",
    borderRadius: "var(--borderRadius-lg)",
    background: "var(--md-sys-color-surface-container)",
  },
});

const PostCard = styled(Column, {
  base: {
    padding: "var(--gap-lg)",
    borderRadius: "var(--borderRadius-lg)",
    background: "var(--md-sys-color-surface-container-low)",
    gap: "var(--gap-md)",
  },
});

const Meta = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "var(--gap-md)",
    flexWrap: "wrap",
  },
});

const PostBody = styled("div", { base: { whiteSpace: "pre-wrap" } });
const Empty = styled("div", { base: { padding: "var(--gap-lg) 0" } });
const Toolbar = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "var(--gap-md)",
    flexWrap: "wrap",
  },
});
const StyledSelect = styled("select", {
  base: {
    padding: "0.55rem 0.75rem",
    borderRadius: "var(--borderRadius-md)",
    border: "1px solid var(--md-sys-color-outline)",
    background: "var(--md-sys-color-surface-container)",
    color: "var(--md-sys-color-on-surface)",
  },
});
const StatusRow = styled("div", {
  base: { display: "flex", gap: "var(--gap-sm)", flexWrap: "wrap" },
});
const StatusBadge = styled("span", {
  base: {
    padding: "0.2rem 0.55rem",
    borderRadius: "var(--borderRadius-full)",
    background: "var(--md-sys-color-secondary-container)",
    color: "var(--md-sys-color-on-secondary-container)",
    fontSize: "0.8rem",
    fontWeight: 600,
  },
});
const SolvedBadge = styled(StatusBadge, {
  base: {
    background: "var(--md-sys-color-tertiary-container)",
    color: "var(--md-sys-color-on-tertiary-container)",
  },
});
const TagRow = styled("div", {
  base: { display: "flex", gap: "var(--gap-sm)", flexWrap: "wrap" },
});
const Tag = styled("span", {
  base: {
    padding: "0.2rem 0.55rem",
    borderRadius: "var(--borderRadius-full)",
    background: "var(--md-sys-color-primary-container)",
    color: "var(--md-sys-color-on-primary-container)",
    fontSize: "0.8rem",
  },
});
const ActionRow = styled("div", {
  base: { display: "flex", gap: "var(--gap-sm)", flexWrap: "wrap" },
});
const ReactionRow = styled("div", {
  base: {
    display: "flex",
    gap: "var(--gap-sm)",
    flexWrap: "wrap",
  },
});
const discussionLink = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0.5rem 1rem",
  borderRadius: "var(--borderRadius-full)",
  color: "var(--md-sys-color-on-secondary-container)",
  background: "var(--md-sys-color-secondary-container)",
  textDecoration: "none",
  fontWeight: 600,
});

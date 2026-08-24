import { Trans, useLingui } from "@lingui-solid/solid/macro";
import MdPost from "@material-symbols/svg-400/outlined/article.svg?component-solid";
import MdDelete from "@material-symbols/svg-400/outlined/delete.svg?component-solid";
import { useClient } from "@revolt/client";
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
import { For, Show, createSignal, onMount } from "solid-js";
import { css } from "styled-system/css";
import { styled } from "styled-system/jsx";
import { requestClientJson } from "../../components/client/customApi";
import { HeaderIcon } from "./common/CommonHeader";

type Tailslet = {
  id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
};

export function Tailslets() {
  const { t } = useLingui();
  const client = useClient();
  const snackbar = useSnackbar();
  const [content, setContent] = createSignal("");
  const [posts, setPosts] = createSignal<Tailslet[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [busy, setBusy] = createSignal(false);

  async function load() {
    try {
      setPosts(
        await requestClientJson<Tailslet[]>(
          client().api,
          "GET",
          "/tailslets?limit=20",
        ),
      );
    } catch {
      snackbar.show({
        message: t`Unable to load Tailslets right now. Please try again.`,
        placement: "bottom",
        closeable: true,
      });
    } finally {
      setLoading(false);
    }
  }
  onMount(() => void load());

  async function publish() {
    if (!content().trim()) return;
    setBusy(true);
    try {
      const post = await requestClientJson<Tailslet>(
        client().api,
        "POST",
        "/tailslets",
        { content: content().trim() },
      );
      setPosts((current) => [post, ...current]);
      setContent("");
    } catch {
      snackbar.show({
        message: t`Unable to publish this Tailslet right now. Please try again.`,
        placement: "bottom",
        closeable: true,
      });
    } finally {
      setBusy(false);
    }
  }

  async function remove(post: Tailslet) {
    if (!window.confirm(t`Delete this Tailslet?`)) return;
    try {
      await requestClientJson<void>(
        client().api,
        "DELETE",
        `/tailslets/${post.id}`,
      );
      setPosts((current) => current.filter((item) => item.id !== post.id));
      snackbar.show({
        message: t`Tailslet deleted.`,
        placement: "bottom",
        closeable: true,
      });
    } catch {
      snackbar.show({
        message: t`Unable to delete this Tailslet right now. Please try again.`,
        placement: "bottom",
        closeable: true,
      });
    }
  }

  return (
    <Page>
      <Header placement="primary">
        <HeaderIcon>
          <MdPost />
        </HeaderIcon>
        <Trans>Tailslets</Trans>
      </Header>
      <div use:scrollable={{ class: contentArea }}>
        <Column gap="xl">
          <Column gap="sm">
            <Text class="title" size="large">
              <Trans>Tailslets</Trans>
            </Text>
            <Text>
              <Trans>Share quick updates with your TailsTalk 2 account.</Trans>
            </Text>
          </Column>
          <Composer>
            <TextField
              label={t`What do you want to share?`}
              value={content()}
              maxlength={2000}
              onInput={(event) => setContent(event.currentTarget.value)}
            />
            <Button onPress={publish} isDisabled={busy() || !content().trim()}>
              <Trans>Publish Tailslet</Trans>
            </Button>
          </Composer>
          <Show when={!loading()} fallback={<CircularProgress />}>
            <Show
              when={posts().length > 0}
              fallback={
                <Text>
                  <Trans>No Tailslets have been posted yet.</Trans>
                </Text>
              }
            >
              <For each={posts()}>
                {(post) => (
                  <PostCard>
                    <Text class="title" size="medium">
                      {post.author_name}
                    </Text>
                    <Text>{post.content}</Text>
                    <Show when={post.author_id === client().user?.id}>
                      <Button
                        variant="outlined"
                        onPress={() => void remove(post)}
                        aria-label={t`Delete Tailslet`}
                      >
                        <MdDelete />
                        <Trans>Delete Tailslet</Trans>
                      </Button>
                    </Show>
                  </PostCard>
                )}
              </For>
            </Show>
          </Show>
        </Column>
      </div>
    </Page>
  );
}

const Page = styled("div", {
  base: { width: "100%", display: "flex", flexDirection: "column" },
});
const contentArea = css({
  ...main.raw(),
  padding: "32px",
  maxWidth: "900px",
  width: "100%",
  alignSelf: "center",
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
    whiteSpace: "pre-wrap",
  },
});

import { For, Show, createSignal, onCleanup, onMount } from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";
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
import { css } from "styled-system/css";
import { styled } from "styled-system/jsx";

import MdDelete from "@material-symbols/svg-400/outlined/delete.svg?component-solid";
import MdMovie from "@material-symbols/svg-400/outlined/movie-fill.svg?component-solid";

import { requestClientJson } from "../../components/client/customApi";
import { HeaderIcon } from "./common/CommonHeader";

type VideoPost = {
  id: string;
  author_name: string;
  attachment_id: string;
  caption: string;
  created_at: string;
};

export function Videos() {
  const { t } = useLingui();
  const client = useClient();
  const snackbar = useSnackbar();
  const [caption, setCaption] = createSignal("");
  const [file, setFile] = createSignal<File>();
  const [busy, setBusy] = createSignal(false);
  const [videos, setVideos] = createSignal<VideoPost[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [hasMore, setHasMore] = createSignal(true);
  const [sentinel, setSentinel] = createSignal<HTMLDivElement>();
  let videoInput: HTMLInputElement | undefined;

  async function loadMore() {
    if (loading() || !hasMore()) return;
    setLoading(true);
    try {
      const last = videos().at(-1);
      const query = new URLSearchParams({ limit: "20" });
      if (last) query.set("before", last.created_at);
      const next = await requestClientJson<VideoPost[]>(
        client().api,
        "GET",
        `/videos?${query.toString()}`,
      );
      setVideos((current) => [...current, ...next]);
      setHasMore(next.length === 20);
    } catch {
      snackbar.show({
        message: t`Unable to load videos right now. Please try again.`,
        placement: "bottom",
        closeable: true,
      });
    } finally {
      setLoading(false);
    }
  }

  onMount(() => {
    void loadMore();
    const target = sentinel();
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && void loadMore(),
      { rootMargin: "600px" },
    );
    observer.observe(target);
    onCleanup(() => observer.disconnect());
  });

  async function publish() {
    const selected = file();
    if (!selected || !selected.type.startsWith("video/")) return;
    setBusy(true);
    try {
      const attachmentId = await client().uploadFile(
        "attachments",
        selected,
        client().configuration?.features.autumn.url,
      );
      const post = await requestClientJson<VideoPost>(
        client().api,
        "POST",
        "/videos",
        {
          attachment_id: attachmentId,
          caption: caption().trim(),
        },
      );
      setCaption("");
      setFile(undefined);
      setVideos((current) => [post, ...current]);
    } catch {
      snackbar.show({
        message: t`Unable to post this video right now. Please try again.`,
        placement: "bottom",
        closeable: true,
      });
    } finally {
      setBusy(false);
    }
  }

  async function remove(video: VideoPost) {
    if (!window.confirm(t`Delete this video?`)) return;
    try {
      await requestClientJson<void>(
        client().api,
        "DELETE",
        `/videos/${video.id}`,
      );
      setVideos((current) => current.filter((item) => item.id !== video.id));
      snackbar.show({
        message: t`Video deleted.`,
        placement: "bottom",
        closeable: true,
      });
    } catch {
      snackbar.show({
        message: t`Unable to delete this video right now. Please try again.`,
        placement: "bottom",
        closeable: true,
      });
    }
  }

  return (
    <Page>
      <Header placement="primary">
        <HeaderIcon>
          <MdMovie />
        </HeaderIcon>
        <Trans>Videos</Trans>
      </Header>
      <div use:scrollable={{ class: content }}>
        <Column gap="xl">
          <Column gap="sm">
            <Text class="title" size="large">
              <Trans>Video feed</Trans>
            </Text>
            <Text>
              <Trans>Share short videos with your TailsTalk 2 account.</Trans>
            </Text>
          </Column>
          <Composer>
            <Text class="title" size="medium">
              <Trans>Post a video</Trans>
            </Text>
            <input
              ref={videoInput}
              type="file"
              accept="video/*"
              hidden
              onChange={(event) => setFile(event.currentTarget.files?.[0])}
            />
            <Button
              variant="outlined"
              onPress={() => videoInput?.click()}
              isDisabled={busy()}
            >
              <Trans>Choose video</Trans>
            </Button>
            <Show when={file()}>
              {(selected) => <Text>{selected().name}</Text>}
            </Show>
            <TextField
              label={t`Caption`}
              value={caption()}
              maxlength={500}
              onInput={(event) => setCaption(event.currentTarget.value)}
            />
            <Button onPress={publish} isDisabled={busy() || !file()}>
              <Trans>Post video</Trans>
            </Button>
          </Composer>
          <Show
            when={videos().length > 0}
            fallback={
              <Show when={!loading()}>
                <Text>
                  <Trans>No videos have been posted yet.</Trans>
                </Text>
              </Show>
            }
          >
            <For each={videos()}>
              {(video) => (
                <VideoCard>
                  <video
                    controls
                    preload="metadata"
                    playsInline
                    src={`${client().configuration?.features.autumn.url}/attachments/${video.attachment_id}/original`}
                    onError={(event) => {
                      const element = event.currentTarget;
                      if (element.src.endsWith("/original")) {
                        element.src = element.src.slice(0, -"/original".length);
                      }
                    }}
                  />
                  <Text class="title" size="medium">
                    {video.author_name}
                  </Text>
                  <Show when={video.caption}>
                    <Text>{video.caption}</Text>
                  </Show>
                  <Show when={video.author_id === client().user?.id}>
                    <Button
                      variant="outlined"
                      onPress={() => void remove(video)}
                      aria-label={t`Delete video`}
                    >
                      <MdDelete />
                      <Trans>Delete video</Trans>
                    </Button>
                  </Show>
                </VideoCard>
              )}
            </For>
          </Show>
          <div ref={setSentinel} style={{ "min-height": "1px" }}>
            <Show when={loading()}>
              <CircularProgress />
            </Show>
          </div>
        </Column>
      </div>
    </Page>
  );
}

const Page = styled("div", {
  base: { width: "100%", display: "flex", flexDirection: "column" },
});
const content = css({
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
const VideoCard = styled(Column, {
  base: {
    padding: "var(--gap-lg)",
    borderRadius: "var(--borderRadius-lg)",
    background: "var(--md-sys-color-surface-container-low)",
    "& video": {
      width: "100%",
      maxHeight: "600px",
      borderRadius: "var(--borderRadius-md)",
    },
  },
});

import { Suspense, Switch, createMemo, createSignal, useContext } from "solid-js";

import { useLingui } from "@lingui-solid/solid/macro";
import { VirtualContainer } from "@minht11/solid-virtual-container";
import { useQuery } from "@tanstack/solid-query";
import { styled } from "styled-system/jsx";

import {
  CircularProgress,
  TextField,
} from "@revolt/ui/components/design";
import { useClient } from "@revolt/client";

import { CompositionMediaPickerContext } from "./CompositionMediaPicker";
import { CONFIGURATION } from "@revolt/common";

const GIFBOX_API = `${new URL(CONFIGURATION.DEFAULT_API_URL).origin}/gifbox`;

type GifResult = {
  url: string;
  action?: string;
};

type GifboxResult = {
  url: string;
  media_formats: Record<string, { url: string }>;
};

function gifUrl(result: GifboxResult) {
  const rawUrl =
    result.media_formats.tinywebm?.url ??
    result.media_formats.webm?.url ??
    result.media_formats.gif?.url ??
    result.url;
  return new URL(rawUrl, GIFBOX_API).toString();
}

async function fetchGifbox(path: string, headers: Record<string, string>) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${GIFBOX_API}${path}`, {
      cache: "no-store",
      signal: controller.signal,
      headers,
    });
    if (!response.ok) throw new Error(`GIF request failed (${response.status})`);
    return response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

export function GifPicker() {
  const { t } = useLingui();
  const client = useClient();
  const [filter, setFilter] = createSignal("");
  const [searchQuery, setSearchQuery] = createSignal("");
  const headers = () => {
    const [name, value] = client().authenticationHeader;
    return { [name]: value };
  };

  const commitSearch = () => {
    setSearchQuery(filter().toLowerCase());
  };

  return (
    <Stack>
      <TextField
        autoFocus
        variant="filled"
        placeholder={t`Search for GIFs...`}
        value={filter()}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }}
        onChange={(e) => setFilter(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitSearch();
          }
        }}
      />
      <Suspense fallback={<CircularProgress />}>
        <Switch
          fallback={
            <Categories headers={headers()} />
          }
        >
          <Match when={searchQuery()}>
            <GifSearch query={searchQuery()} headers={headers()} />
          </Match>
        </Switch>
      </Suspense>
    </Stack>
  );
}

const Stack = styled("div", {
  base: {
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
  },
});

type RecentResponse = { results: GifboxResult[] };

function Categories(props: { headers: Record<string, string> }) {
  let targetElement!: HTMLDivElement;

  const recentGifs = useQuery<GifResult[]>(() => ({
    queryKey: ["localGifboxRecent"],
    queryFn: async () => {
      const response = (await fetchGifbox(
        "/recent?limit=100",
        props.headers,
      )) as RecentResponse;
      return response.results.map((result) => ({ url: gifUrl(result) }));
    },
    retry: false,
    staleTime: 10 * 60 * 1000,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  }));

  const items = createMemo(() => {
    return recentGifs.data ?? [];
  });

  return (
    <div ref={targetElement} use:invisibleScrollable>
      <VirtualContainer
        items={items()}
        scrollTarget={targetElement}
        itemSize={{ height: 120, width: 200 }}
        crossAxisCount={(measurements) =>
          Math.floor(measurements.container.cross / measurements.itemSize.cross)
        }
      >
        {RecentGifItem}
      </VirtualContainer>
    </div>
  );
}

const RecentGifItem = (props: {
  style: unknown;
  tabIndex: number;
  item: GifResult;
}) => {
  const { onMessage } = useContext(CompositionMediaPickerContext);
  return (
    <Gif
      src={props.item.url}
      alt="Uploaded GIF"
      role="listitem"
      style={props.style as string}
      tabIndex={props.tabIndex}
      onClick={() => onMessage(props.item.url)}
    />
  );
};

function GifSearch(props: {
  query: string;
  headers: Record<string, string>;
}) {
  let targetElement!: HTMLDivElement;

  const search = useQuery<GifResult[]>(() => ({
    queryKey: ["gifs", props.query],
    queryFn: async () => {
      const response = (await fetchGifbox(
        `/search?query=${encodeURIComponent(props.query)}&locale=en_US&limit=50`,
        props.headers,
      )) as { results: GifboxResult[] };
      return response.results.map((result) => ({ url: gifUrl(result) }));
    },
    retry: false,
    staleTime: 60 * 1000,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  }));

  return (
    <div ref={targetElement} use:invisibleScrollable>
      <VirtualContainer
        items={search.data as never /* resource */}
        scrollTarget={targetElement}
        itemSize={{ height: 120, width: 200 }}
        crossAxisCount={(measurements) =>
          Math.floor(measurements.container.cross / measurements.itemSize.cross)
        }
      >
        {GifItem}
      </VirtualContainer>
    </div>
  );
}

const GifItem = (props: {
  style: unknown;
  tabIndex: number;
  item: GifResult;
}) => {
  const { onMessage } = useContext(CompositionMediaPickerContext);

  return (
    <Gif
      src={props.item.url}
      alt={props.item.action}
      role="listitem"
      style={props.style as string}
      tabIndex={props.tabIndex}
      onClick={() =>
        onMessage(props.item.url)
      }
    />
  );
};

const Gif = styled("img", {
  base: {
    width: "200px",
    height: "120px",
    cursor: "pointer",
    objectFit: "cover",
  },
});

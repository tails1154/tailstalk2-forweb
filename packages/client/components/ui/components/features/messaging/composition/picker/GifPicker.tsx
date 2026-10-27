import {
  Match,
  Suspense,
  Switch,
  createContext,
  createMemo,
  createSignal,
  useContext,
} from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";
import { VirtualContainer } from "@minht11/solid-virtual-container";
import { useQuery } from "@tanstack/solid-query";
import { styled } from "styled-system/jsx";

import {
  CircularProgress,
  TextField,
  typography,
} from "@revolt/ui/components/design";
import { useClient } from "@revolt/client";

import { CompositionMediaPickerContext } from "./CompositionMediaPicker";
import { CONFIGURATION } from "@revolt/common";

const GIFBOX_API = `${new URL(CONFIGURATION.DEFAULT_API_URL).origin}/gifbox`;

type GifCategory = { title: string; image: string; action: string };

type GifResult = {
  url: string;
  action?: string;
};

type GifboxResult = {
  url: string;
  media_formats: Record<string, { url: string }>;
};

function gifUrl(result: GifboxResult) {
  return (
    result.media_formats.tinywebm?.url ??
    result.media_formats.webm?.url ??
    result.media_formats.gif?.url ??
    result.url
  );
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

const FilterContext = createContext<(value: string) => void>();

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
            <FilterContext.Provider value={setFilter}>
              <Categories headers={headers()} />
            </FilterContext.Provider>
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

type CategoryItem =
  | {
      /**
       * Category entry
       */
      t: 0;
      category: GifCategory;
    }
  | {
      /**
       * Trending entry
       */
      t: 1;
      gif: GifResult | null;
    };

function Categories(props: { headers: Record<string, string> }) {
  let targetElement!: HTMLDivElement;

  const trendingCategories = useQuery<GifCategory[]>(() => ({
    queryKey: ["trendingGifCategories"],
    queryFn: async () => {
      const categories = (await fetchGifbox(
        "/categories?locale=en_US",
        props.headers,
      )) as { title: string; image: string }[];
      return categories.map((category) => ({
        ...category,
        action: category.title,
      }));
    },
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  }));

  const trendingGif = useQuery<GifResult | null>(() => ({
    queryKey: ["trendingGif1"],
    queryFn: async () => {
      const response = (await fetchGifbox(
        "/featured?locale=en_US&limit=1",
        props.headers,
      )) as { results: GifboxResult[] };
      const result = response.results[0];
      return result ? { url: gifUrl(result), action: "trending" } : null;
    },
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    initialData: null,
  }));

  const items = createMemo(() => {
    return [
      {
        t: 1,
        gif: trendingGif.data,
      },
      ...(trendingCategories.data?.map((category) => ({ t: 0, category })) ??
        []),
    ] as CategoryItem[];
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
        {CategoryItem}
      </VirtualContainer>
    </div>
  );
}

const CategoryItem = (props: {
  style: unknown;
  tabIndex: number;
  item: CategoryItem;
}) => {
  const setFilter = useContext(FilterContext);

  return (
    <Category
      style={{
        ...(props.style as object),
        "background-image": `linear-gradient(to right, #0006, #0006), url("${props.item.t === 0 ? props.item.category.image : props.item.gif?.url}")`,
      }}
      tabIndex={props.tabIndex}
      role="listitem"
      onClick={() =>
        setFilter!(props.item.t === 0 ? props.item.category.action : "trending")
      }
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }}
    >
      <Switch fallback={<Trans>Trending GIFs</Trans>}>
        <Match when={props.item.t === 0}>
          {(props.item as CategoryItem & { t: 0 }).category.title}
        </Match>
      </Switch>
    </Category>
  );
};

const Category = styled("div", {
  base: {
    ...typography.raw({ class: "title", size: "small" }),

    width: "200px",
    height: "120px",
    backgroundSize: "cover",
    backgroundPosition: "center",

    color: "white",
    display: "flex",
    padding: "var(--gap-md)",

    alignItems: "end",
    justifyContent: "end",

    cursor: "pointer",
  },
});

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

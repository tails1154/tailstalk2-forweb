import {
  Match,
  Suspense,
  Switch,
  createContext,
  createMemo,
  createSignal,
  useContext,
} from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";
import { VirtualContainer } from "@minht11/solid-virtual-container";
import { useQuery } from "@tanstack/solid-query";
import { styled } from "styled-system/jsx";

import {
  CircularProgress,
  TextField,
  typography,
} from "@revolt/ui/components/design";

import { CompositionMediaPickerContext } from "./CompositionMediaPicker";

const GIF_API = "https://api.gifukai.com/v1";
const GIF_ACTIONS = [
  "angry",
  "blush",
  "cry",
  "dance",
  "happy",
  "hug",
  "kiss",
  "laugh",
  "pat",
  "slap",
  "smile",
  "wave",
] as const;

type GifCategory = { title: string; image: string; action: string };

type GifResult = {
  url: string;
  action: string;
};

const FilterContext = createContext<(value: string) => void>();

export function GifPicker() {
  const [filter, setFilter] = createSignal("");
  const [searchQuery, setSearchQuery] = createSignal("");

  const commitSearch = () => {
    setSearchQuery(filter().toLowerCase());
  };

  return (
    <Stack>
      <TextField
        autoFocus
        variant="filled"
        placeholder="Search for GIFs..."
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
              <Categories />
            </FilterContext.Provider>
          }
        >
          <Match when={searchQuery()}>
            <GifSearch query={searchQuery()} />
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

function Categories() {
  let targetElement!: HTMLDivElement;

  const trendingCategories = useQuery<GifCategory[]>(() => ({
    queryKey: ["trendingGifCategories"],
    queryFn: async () =>
      Promise.all(
        GIF_ACTIONS.map(async (action) => {
          const response = await fetch(`${GIF_API}/${action}`);
          const gif = (await response.json()) as GifResult;
          return { title: action, action, image: gif.url };
        }),
      ),
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  }));

  const trendingGif = useQuery<GifResult | null>(() => ({
    queryKey: ["trendingGif1"],
    queryFn: async () => {
      const action = GIF_ACTIONS[Math.floor(Math.random() * GIF_ACTIONS.length)];
      const response = await fetch(`${GIF_API}/${action}`);
      return (await response.json()) as GifResult;
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

function GifSearch(props: { query: string }) {
  let targetElement!: HTMLDivElement;

  const search = useQuery<GifResult[]>(() => ({
    queryKey: ["gifs", props.query],
    queryFn: async () => {
      const requestedAction = props.query.toLowerCase();
      const actions = GIF_ACTIONS.includes(requestedAction as never)
        ? [requestedAction]
        : GIF_ACTIONS;
      const results = await Promise.all(
        Array.from({ length: 12 }, async (_, index) => {
          const action = actions[index % actions.length];
          const response = await fetch(`${GIF_API}/${action}`);
          return (await response.json()) as GifResult;
        }),
      );
      return results;
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
      onClick={() => onMessage(props.item.url)}
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

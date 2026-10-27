import { Match, Show, Switch, createSignal } from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";
import { PublicChannelInvite } from "stoat.js";
import { css, cva } from "styled-system/css";
import { styled } from "styled-system/jsx";

import { IS_DEV, useClient } from "@revolt/client";
import { useModals } from "@revolt/modal";
import { useNavigate } from "@revolt/routing";
import { CONFIGURATION } from "@revolt/common";
import {
  Button,
  CategoryButton,
  Column,
  Header,
  iconSize,
  main,
  useSnackbar,
} from "@revolt/ui";

import MdAddCircle from "@material-design-icons/svg/filled/add_circle.svg?component-solid";
import MdExplore from "@material-design-icons/svg/filled/explore.svg?component-solid";
import MdFileUpload from "@material-design-icons/svg/filled/file_upload.svg?component-solid";
import MdGroups3 from "@material-design-icons/svg/filled/groups_3.svg?component-solid";
import MdHome from "@material-design-icons/svg/filled/home.svg?component-solid";

import MdRateReview from "@material-design-icons/svg/filled/rate_review.svg?component-solid";
import MdSettings from "@material-design-icons/svg/filled/settings.svg?component-solid";

import Wordmark from "../../public/assets/web/wordmark.svg?component-solid";

import { HeaderIcon } from "./common/CommonHeader";

/**
 * Base layout of the home page (i.e. the header/background)
 */
const Base = styled("div", {
  base: {
    width: "100%",
    display: "flex",
    flexDirection: "column",

    color: "var(--md-sys-color-on-surface)",
  },
});

/**
 * Layout of the content as a whole
 */
const content = cva({
  base: {
    ...main.raw(),

    padding: "48px 0",

    gap: "32px",
    alignItems: "center",
    justifyContent: "center",
  },
});

/**
 * Layout of the buttons
 */
const Buttons = styled("div", {
  base: {
    gap: "8px",
    padding: "8px",
    display: "flex",
    borderRadius: "var(--borderRadius-lg)",

    color: "var(--md-sys-color-on-surface-variant)",
    background: "var(--md-sys-color-surface-variant)",
  },
});

/**
 * Make sure the columns are separated
 */
const SeparatedColumn = styled(Column, {
  base: {
    justifyContent: "stretch",
    marginInline: "0.25em",
    width: "260px",
    "& > *": {
      flexGrow: 1,
    },
  },
});

const GIFBOX_API = `${new URL(CONFIGURATION.DEFAULT_API_URL).origin}/gifbox`;

/**
 * Home page
 */
export function HomePage() {
  const { t } = useLingui();
  const { openModal } = useModals();
  const snackbar = useSnackbar();
  const navigate = useNavigate();
  const client = useClient();
  const [uploadingGif, setUploadingGif] = createSignal(false);
  let gifInput!: HTMLInputElement;

  async function uploadGif(file?: File) {
    if (!file) return;
    gifInput.value = "";

    if (file.type !== "image/gif") {
      snackbar.show({
        message: t`Please choose a GIF file.`,
        placement: "bottom",
        closeable: true,
      });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      snackbar.show({
        message: t`GIFs must be smaller than 20 MB.`,
        placement: "bottom",
        closeable: true,
      });
      return;
    }

    setUploadingGif(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const [authHeader, authValue] = client().authenticationHeader;
      const response = await fetch(`${GIFBOX_API}/upload`, {
        method: "POST",
        headers: { [authHeader]: authValue },
        body,
      });
      if (!response.ok) throw new Error(`Gifbox upload failed (${response.status})`);
      const result = (await response.json()) as { url: string };
      const url = new URL(result.url, GIFBOX_API).toString();
      await navigator.clipboard.writeText(url);
      snackbar.show({
        message: t`GIF uploaded and URL copied to your clipboard.`,
        placement: "bottom",
        closeable: true,
      });
    } catch {
      snackbar.show({
        message: t`Unable to upload this GIF right now.`,
        placement: "bottom",
        closeable: true,
      });
    } finally {
      setUploadingGif(false);
    }
  }

  const isInLounge =
    client()!.servers.get("01F7ZSBSFHQ8TA81725KQCSDDP") !== undefined;

  return (
    <Base>
      <Header placement="primary">
        <HeaderIcon>
          <MdHome {...iconSize(22)} />
        </HeaderIcon>
        <Trans>Home</Trans>
      </Header>
      <div use:scrollable={{ class: content() }}>
        <Column>
          <Wordmark
            class={css({
              width: "160px",
              fill: "var(--md-sys-color-on-surface)",
            })}
          />
        </Column>
        <Buttons>
          <SeparatedColumn>
            <CategoryButton
              onClick={() =>
                openModal({
                  type: "create_group_or_server",
                  client: client()!,
                })
              }
              description={
                <Trans>
                  Invite all of your friends, some cool bots, and throw a big
                  party.
                </Trans>
              }
              icon={<MdAddCircle />}
            >
              <Trans>Create a group or server</Trans>
            </CategoryButton>
            <CategoryButton
              onClick={() => window.open("https://tailstalk2.com/invite/tailstalk2")}
              description={
                <Trans>Join our official server to connect with the community!</Trans>
              }
              icon={<MdGroups3 />}
            >
              <Trans>Join Official Server</Trans>
            </CategoryButton>
            <CategoryButton
              onClick={() => navigate("/discover")}
              description={<Trans>Find community servers and useful bots.</Trans>}
              icon={<MdExplore />}
            >
              <Trans>Discover servers and bots</Trans>
            </CategoryButton>
          </SeparatedColumn>
          <SeparatedColumn>
            <CategoryButton
              onClick={() => gifInput.click()}
              description={
                <Trans>Upload a GIF and copy its hosted URL for sharing.</Trans>
              }
              icon={<MdFileUpload />}
              disabled={uploadingGif()}
            >
              <Trans>Upload to Gifbox</Trans>
            </CategoryButton>
          </SeparatedColumn>
        </Buttons>
        <input
          ref={gifInput}
          type="file"
          accept="image/gif,.gif"
          hidden
          onChange={(event) => void uploadGif(event.currentTarget.files?.[0])}
        />
        <Show when={IS_DEV}>
          <Button onPress={() => navigate("/dev")}>
            Open Development Page
          </Button>
        </Show>
      </div>
    </Base>
  );
}

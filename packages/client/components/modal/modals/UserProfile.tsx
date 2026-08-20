import { Trans } from "@lingui-solid/solid/macro";
import { useQuery } from "@tanstack/solid-query";
import { styled } from "styled-system/jsx";

import { useClient } from "@revolt/client";
import { Dialog, DialogProps, Profile } from "@revolt/ui";

import { useModals } from "..";
import { Modals } from "../types";

export function UserProfileModal(
  props: DialogProps & Modals & { type: "user_profile" },
) {
  const client = useClient();
  const { openModal } = useModals();

  const query = useQuery(() => ({
    queryKey: ["profile", props.user.id],
    queryFn: () => props.user.fetchProfile(),
  }));

  const xp = useQuery(() => ({
    queryKey: ["xp", props.user.id],
    queryFn: () =>
      client().api.get(`/users/${props.user.id}/xp`) as Promise<{
        xp: number;
        level: number;
        next_level_xp: number;
      }>,
  }));

  const decorations = useQuery(() => ({
    queryKey: ["profile-decorations"],
    queryFn: () =>
      client().api.get("/decorations" as never) as Promise<Array<{ id: string; image: string }>>,
  }));

  return (
    <Dialog
      show={props.show}
      onClose={props.onClose}
      minWidth={560}
      padding={8}
    >
      <Grid>
        <Profile.Banner
          width={3}
          user={props.user}
          bannerUrl={query.data?.animatedBannerURL}
          decorationUrl={decorations.data?.find((entry) => entry.id === query.data?.decoration)?.image}
          onClick={
            query.data?.banner
              ? () =>
                  openModal({ type: "image_viewer", file: query.data!.banner! })
              : undefined
          }
          onClickAvatar={(e) => {
            e.stopPropagation();

            if (props.user.avatar) {
              openModal({ type: "image_viewer", file: props.user.avatar });
            }
          }}
        />

        <Profile.Actions user={props.user} width={3} />
        <Show when={xp.data}>
          <XPBadge>
            <strong><Trans>Level {xp.data!.level}</Trans></strong>
            <span>
              {xp.data!.xp} / {xp.data!.next_level_xp} <Trans>XP</Trans>
            </span>
          </XPBadge>
        </Show>
        <Profile.Status user={props.user} />
        <Profile.Badges user={props.user} />
        <Profile.Joined user={props.user} />
        <Profile.Mutuals user={props.user} />
        <Profile.Bio content={query.data?.content} full />
      </Grid>
    </Dialog>
  );
}

const Grid = styled("div", {
  base: {
    display: "grid",
    gap: "var(--gap-md)",
    padding: "var(--gap-md)",
    gridTemplateColumns: "repeat(3, 1fr)",
  },
});

const XPBadge = styled("div", {
  base: {
    gridColumn: "1 / -1",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    borderRadius: "var(--borderRadius-md)",
    background: "var(--md-sys-color-secondary-container)",
    color: "var(--md-sys-color-on-secondary-container)",
  },
});

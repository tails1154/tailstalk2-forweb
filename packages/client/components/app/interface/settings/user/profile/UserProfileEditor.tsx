import { createFormControl, createFormGroup } from "solid-forms";
import { For, Show, createEffect, createSignal, on } from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";
import { useQuery, useQueryClient } from "@tanstack/solid-query";
import { API, User } from "stoat.js";

import { useClient } from "@revolt/client";
import { CONFIGURATION } from "@revolt/common";
import {
  CategoryButton,
  CircularProgress,
  Column,
  Button,
  Form2,
  Row,
  Text,
} from "@revolt/ui";

import MdBadge from "@material-design-icons/svg/filled/badge.svg?component-solid";

import { useSettingsNavigation } from "../../Settings";

interface Props {
  user: User;
}

interface AvatarDecoration {
  id: string;
  name: string;
  asset_url: string;
  price_xp: number;
  enabled: boolean;
  owned: boolean;
}

export function UserProfileEditor(props: Props) {
  const { t } = useLingui();
  const client = useClient();
  const queryClient = useQueryClient();

  const profile = useQuery(() => ({
    queryKey: ["profile", props.user.id],
    queryFn: () => props.user.fetchProfile(),
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  }));

  const decorations = useQuery(() => ({
    queryKey: ["profile-decorations"],
    queryFn: () => client().api.get("/users/profile-decorations") as Promise<AvatarDecoration[]>,
    retry: false,
  }));
  const [selectedDecoration, setSelectedDecoration] = createSignal("");
  const [decorationFile, setDecorationFile] = createSignal<File>();
  const [decorationName, setDecorationName] = createSignal("");
  const [decorationPrice, setDecorationPrice] = createSignal("0");

  const { navigate } = useSettingsNavigation();

  /* eslint-disable solid/reactivity */
  const editGroup = createFormGroup({
    displayName: createFormControl(props.user.displayName),
    // username: createFormControl(props.user.username),
    avatar: createFormControl<string | File[] | null>(
      props.user.animatedAvatarURL,
    ),
    banner: createFormControl<string | File[] | null>(null),
    bio: createFormControl(""),
  });
  /* eslint-enable solid/reactivity */

  // unlike the other forms, this one does not react to
  // further changes outside of our control because it's
  // unlikely that the user is going to be doing this

  const [initialBio, setInitialBio] = createSignal<readonly [string]>();

  // once profile data is loaded, copy it into the form
  createEffect(
    on(
      () => profile.data,
      (profileData) => {
        if (profileData) {
          editGroup.controls.banner.setValue(
            profileData.animatedBannerURL || null,
          );

          editGroup.controls.bio.setValue(profileData.content || "");
          setInitialBio([profileData.content || ""]);
          setSelectedDecoration(profileData.avatarDecoration || "");
        }
      },
    ),
  );

  function onReset() {
    editGroup.controls.displayName.setValue(props.user.displayName);
    editGroup.controls.avatar.setValue(props.user.animatedAvatarURL);

    if (profile.data) {
      editGroup.controls.banner.setValue(
        profile.data.animatedBannerURL || null,
      );
      editGroup.controls.bio.setValue(profile.data.content || "");
      setInitialBio([profile.data.content || ""]);
    }
  }

  async function onSubmit() {
    const changes: API.DataEditUser = {
      remove: [],
    };

    if (editGroup.controls.displayName.isDirty) {
      changes.display_name = editGroup.controls.displayName.value.trim();
    }

    if (editGroup.controls.avatar.isDirty) {
      if (!editGroup.controls.avatar.value) {
        changes.remove!.push("Avatar");
      } else if (Array.isArray(editGroup.controls.avatar.value)) {
        changes.avatar = await client().uploadFile(
          "avatars",
          editGroup.controls.avatar.value[0],
          CONFIGURATION.DEFAULT_MEDIA_URL,
        );
      }
    }

    if (editGroup.controls.bio.isDirty) {
      if (!editGroup.controls.bio.value) {
        changes.remove!.push("ProfileContent");
      } else {
        changes.profile ??= {};
        changes.profile.content = editGroup.controls.bio.value;
      }
    }

    let newBannerUrl: string | null = null;

    if (editGroup.controls.banner.isDirty) {
      if (!editGroup.controls.banner.value) {
        changes.remove!.push("ProfileBackground");
      } else if (Array.isArray(editGroup.controls.banner.value)) {
        changes.profile ??= {};
        changes.profile.background = await client().uploadFile(
          "backgrounds",
          editGroup.controls.banner.value[0],
          CONFIGURATION.DEFAULT_MEDIA_URL,
        );

        newBannerUrl = `${CONFIGURATION.DEFAULT_MEDIA_URL}/backgrounds/${changes.profile.background}`;
      } else {
        newBannerUrl = editGroup.controls.banner.value;
      }
    }

    await props.user.edit(changes);

    if (editGroup.controls.banner.isDirty && profile.data) {
      queryClient.setQueryData(["profile", props.user.id], {
        ...profile.data,
        animatedBannerURL: newBannerUrl,
        bannerURL: newBannerUrl,
      });
    }
  }

  async function saveDecoration() {
    if (selectedDecoration()) {
      await client().api.post(`/users/profile-decorations/${selectedDecoration()}/equip`);
    } else {
      await client().api.delete("/users/profile-decorations/equip");
    }
    await queryClient.invalidateQueries({ queryKey: ["profile", props.user.id] });
  }

  async function buyDecoration(id: string) {
    await client().api.post(`/users/profile-decorations/${id}/purchase`);
    await decorations.refetch();
  }

  async function uploadDecoration() {
    const file = decorationFile();
    if (!file || !decorationName().trim()) return;
    const assetId = await client().uploadFile(
      "attachments",
      file,
      CONFIGURATION.DEFAULT_MEDIA_URL,
    );
    await client().api.post("/users/profile-decorations", {
      name: decorationName().trim(),
      asset_id: assetId,
      price_xp: Math.max(0, Number(decorationPrice()) || 0),
    });
    setDecorationFile(undefined);
    setDecorationName("");
    setDecorationPrice("0");
    await decorations.refetch();
  }

  const submit = Form2.useSubmitHandler(editGroup, onSubmit, onReset);

  return (
    <form onSubmit={submit}>
      <Column>
        <Form2.FileInput
          control={editGroup.controls.avatar}
          accept="image/*"
          label={t`Avatar`}
          imageJustify={false}
        />
        <Show when={decorations.data}>
          <label>
            <Text class="label"><Trans>Avatar decoration</Trans></Text>
            <select
              value={selectedDecoration()}
              onChange={(event) => setSelectedDecoration(event.currentTarget.value)}
            >
              <option value=""><Trans>No decoration</Trans></option>
              <For each={decorations.data}>
                {(decoration) => (
                  <option value={decoration.id} disabled={!decoration.owned}>
                    {decoration.name} — {decoration.owned ? <Trans>Owned</Trans> : `${decoration.price_xp} XP`}
                  </option>
                )}
              </For>
            </select>
          </label>
          <Row>
            <Button onPress={() => void saveDecoration()}><Trans>Equip decoration</Trans></Button>
            <For each={decorations.data.filter((decoration) => !decoration.owned)}>
              {(decoration) => (
                <Button onPress={() => void buyDecoration(decoration.id)}>
                  <Trans>Buy</Trans> {decoration.name} ({decoration.price_xp} XP)
                </Button>
              )}
            </For>
          </Row>
          <Show when={props.user.privileged || (props.user.badges & 32) !== 0}>
            <Text class="label"><Trans>Moderator decoration uploader</Trans></Text>
            <input
              type="file"
              accept="image/png,image/webp,image/gif"
              onChange={(event) => setDecorationFile(event.currentTarget.files?.[0])}
            />
            <input
              type="text"
              placeholder={t`Decoration name`}
              value={decorationName()}
              onInput={(event) => setDecorationName(event.currentTarget.value)}
            />
            <input
              type="number"
              min="0"
              placeholder={t`XP price`}
              value={decorationPrice()}
              onInput={(event) => setDecorationPrice(event.currentTarget.value)}
            />
            <Button onPress={() => void uploadDecoration()}>
              <Trans>Upload avatar decoration</Trans>
            </Button>
          </Show>
        </Show>
        <Form2.FileInput
          control={editGroup.controls.banner}
          accept="image/*"
          label={t`Banner`}
          imageAspect="232/100"
          imageRounded={false}
          imageJustify={false}
        />
        <Form2.TextField
          minlength={2}
          maxlength={32}
          counter
          name="displayName"
          control={editGroup.controls.displayName}
          label={t`Display Name`}
        />

        <Show when={!props.user.bot}>
          <CategoryButton
            icon={<MdBadge />}
            action="chevron"
            description={
              <Trans>Go to account settings to edit your username</Trans>
            }
            onClick={() => navigate("account")}
          >
            <Trans>Want to change username?</Trans>
          </CategoryButton>
        </Show>

        <Text class="label">
          <Trans>Profile Bio</Trans>
        </Text>
        <Form2.TextEditor
          initialValue={initialBio()}
          control={editGroup.controls.bio}
          placeholder={t`Something cool about me...`}
        />

        <Row>
          <Form2.Reset group={editGroup} onReset={onReset} />
          <Form2.Submit group={editGroup} requireDirty>
            <Trans>Save</Trans>
          </Form2.Submit>
          <Show when={editGroup.isPending}>
            <CircularProgress />
          </Show>
        </Row>
      </Column>
    </form>
  );
}

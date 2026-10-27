import type { UserProfile as APIUserProfile } from "stoat-api";

import type { Client } from "../Client.js";

import { File } from "./File.js";

/**
 * User Profile Class
 */
export class UserProfile {
  readonly content?: string;
  readonly banner?: File;
  readonly avatarDecoration?: string;

  /**
   * Construct Public Bot
   * @param client Client
   * @param data Data
   */
  constructor(client: Client, data: APIUserProfile) {
    this.content = data.content!;
    this.avatarDecoration = (data as APIUserProfile & { avatar_decoration?: string })
      .avatar_decoration;
    this.banner = data.background
      ? new File(client, data.background)
      : undefined;
  }

  /**
   * URL to the user's banner
   */
  get bannerURL(): string | undefined {
    return this.banner?.createFileURL();
  }

  /**
   * URL to the user's animated banner
   */
  get animatedBannerURL(): string | undefined {
    return this.banner?.createFileURL(true);
  }

  /** URL to the user's avatar decoration. */
  get avatarDecorationURL(): string | undefined {
    return this.avatarDecoration;
  }
}

import { batch } from "solid-js";

import type { ChannelUnread as APIChannelUnread } from "stoat-api";

import { ChannelUnread } from "../classes/ChannelUnread.js";
import { Channel } from "../classes/index.js";
import type { HydratedChannelUnread } from "../hydration/channelUnread.js";
import { hydrate } from "../hydration/index.js";

import { ClassCollection } from "./Collection.js";

/**
 * Collection of Channel Unreads
 */
export class ChannelUnreadCollection extends ClassCollection<
  ChannelUnread,
  HydratedChannelUnread
> {
  #syncGeneration = 0;

  /**
   * Load unread information from server
   */
  async sync(): Promise<void> {
    const generation = ++this.#syncGeneration;
    const unreads = await this.client.api.get("/sync/unreads");

    // A reconnect can leave multiple sync requests in flight. Never allow an
    // older response to overwrite a newer unread state.
    if (generation !== this.#syncGeneration) return;

    batch(() => {
      const existing = new Map(
        [...this.entries()].map(([id, unread]) => [
          id,
          {
            lastMessageId: unread.lastMessageId,
            mentions: [...unread.messageMentionIds],
          },
        ]),
      );
      const received = new Set<string>();

      this.reset();
      for (const unread of unreads) {
        const id = unread._id.channel;
        const local = existing.get(id);
        const serverLast = unread.last_id ?? undefined;
        const localIsNewer =
          !!local?.lastMessageId &&
          (!serverLast || local.lastMessageId > serverLast);

        this.getOrCreate(id, {
          ...unread,
          last_id: localIsNewer ? local.lastMessageId! : unread.last_id,
          mentions: localIsNewer ? local.mentions : unread.mentions,
        });
        received.add(id);
      }

      // A channel omitted from the server response is no longer unread.
      for (const id of [...this.keys()]) {
        if (!received.has(id)) this.delete(id);
      }
    });
  }

  /**
   * Clear all unread data
   */
  reset(): void {
    for (const id of [...this.keys()]) this.delete(id);
  }

  /**
   * Get or create
   * @param id Id
   * @param data Data
   */
  getOrCreate(id: string, data: APIChannelUnread): ChannelUnread {
    if (this.has(id)) {
      this.updateUnderlyingObject(
        id,
        hydrate("channelUnread", data, this.client),
      );
      return this.get(id)!;
    } else {
      const instance = new ChannelUnread(this, id);
      this.create(id, "channelUnread", instance, this.client, data);
      return instance;
    }
  }

  /**
   * Get channel unread data for a specific Channel
   * @param channel Channel
   * @returns Unread
   */
  for(channel: Channel): ChannelUnread {
    return this.getOrCreate(channel.id, {
      _id: {
        channel: channel.id,
        user: this.client.user!.id,
      },
      last_id: null,
      mentions: [],
    });
  }
}

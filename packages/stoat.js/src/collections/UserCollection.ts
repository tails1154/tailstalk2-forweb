import type { User as APIUser } from "stoat-api";

import type { Client } from "../Client.js";
import { User } from "../classes/User.js";
import type { HydratedUser } from "../hydration/user.js";
import { hydrate } from "../hydration/index.js";

import { ClassCollection } from "./Collection.js";

/**
 * Collection of Users
 */
export class UserCollection extends ClassCollection<User, HydratedUser> {
  #pendingPresence = new Map<string, boolean>();

  /**
   * Construct User collection
   */
  constructor(client: Client) {
    super(client);

    const SYSTEM_ID = "0".repeat(26);
    this.getOrCreate(SYSTEM_ID, {
      _id: SYSTEM_ID,
      username: "Revolt",
      discriminator: "0000",
      online: true,
      relationship: "None",
    });
  }

  /**
   * Fetch user by ID
   * @param id Id
   * @returns User
   */
  async fetch(id: string): Promise<User> {
    const user = this.get(id);
    if (user && !this.isPartial(id)) return user;
    const data = await this.client.api.get(`/users/${id as ""}`);
    return this.getOrCreate(data._id, data);
  }

  /**
   * Get or create
   * @param id Id
   * @param data Data
   * @param isNew Whether this object is new
   */
  getOrCreate(id: string, data: APIUser): User {
    if (this.has(id) && !this.isPartial(id)) {
      const changes = hydrate("user", data, this.client, false);
      const pendingPresence = this.#pendingPresence.get(id);
      if (pendingPresence !== undefined) {
        changes.online = pendingPresence;
        this.#pendingPresence.delete(id);
      }
      this.updateUnderlyingObject(id, (current) => ({
        ...current,
        ...changes,
        ...(changes.status
          ? { status: { ...(current.status ?? {}), ...changes.status } }
          : {}),
      }));
      return this.get(id)!;
    }

    const instance = new User(this, id);
    this.create(id, "user", instance, this.client, data);
    const pendingPresence = this.#pendingPresence.get(id);
    if (pendingPresence !== undefined) {
      this.updateUnderlyingObject(id, "online", pendingPresence);
      this.#pendingPresence.delete(id);
    }
    return instance;
  }

  /** Apply presence even when the user payload arrives later. */
  updatePresence(id: string, online: boolean): void {
    if (!this.has(id)) {
      this.#pendingPresence.set(id, online);
      return;
    }
    this.updateUnderlyingObject(id, "online", online);
  }

  /**
   * Get or return partial
   * @param id Id
   */
  getOrPartial(id: string): User | undefined {
    if (this.has(id)) {
      return this.get(id)!;
    } else if (this.client.options.partials) {
      const instance = new User(this, id);
      this.create(id, "user", instance, this.client, {
        id,
        partial: true,
      });
      return instance;
    }
  }
}

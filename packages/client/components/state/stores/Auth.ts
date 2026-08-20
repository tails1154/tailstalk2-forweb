import { CONFIGURATION } from "@revolt/common";

import { State } from "..";

import { AbstractStore } from ".";

export type Session = {
  _id: string;
  token: string;
  userId: string;
  valid: boolean;
  username?: string;
  displayName?: string;
  avatar?: string;
};

export type TypeAuth = {
  /**
   * Session information
   */
  session?: Session;
  accounts: Session[];
};

/**
 * Authentication details store
 */
export class Auth extends AbstractStore<"auth", TypeAuth> {
  /**
   * Construct store
   * @param state State
   */
  constructor(state: State) {
    super(state, "auth");
  }

  /**
   * Hydrate external context
   */
  hydrate(): void {
    if (CONFIGURATION.DEVELOPMENT_TOKEN && CONFIGURATION.DEVELOPMENT_USER_ID) {
      this.setSession({
        _id: CONFIGURATION.DEVELOPMENT_SESSION_ID ?? "0",
        token: CONFIGURATION.DEVELOPMENT_TOKEN,
        userId: CONFIGURATION.DEVELOPMENT_USER_ID,
        valid: true,
      });
    }
  }

  /**
   * Generate default values
   */
  default(): TypeAuth {
    return {
      session: undefined,
      accounts: [],
    };
  }

  /**
   * Validate the given data to see if it is compliant and return a compliant object
   */
  clean(input: Partial<TypeAuth>): TypeAuth {
    const cleanSession = (value: unknown): Session | undefined => {
      if (!value || typeof value !== "object") return;
      const candidate = value as Partial<Session>;
      if (
        typeof candidate._id !== "string" ||
        typeof candidate.token !== "string" ||
        typeof candidate.userId !== "string" ||
        !candidate.valid
      ) {
        return;
      }
      return {
        _id: candidate._id,
        token: candidate.token,
        userId: candidate.userId,
        valid: true,
        ...(typeof candidate.username === "string"
          ? { username: candidate.username }
          : {}),
        ...(typeof candidate.displayName === "string"
          ? { displayName: candidate.displayName }
          : {}),
        ...(typeof candidate.avatar === "string"
          ? { avatar: candidate.avatar }
          : {}),
      };
    };

    const accounts: Session[] = [];
    if (Array.isArray(input.accounts)) {
      for (const account of input.accounts.map(cleanSession)) {
        if (
          account &&
          !accounts.some((stored) => stored.userId === account.userId)
        ) {
          accounts.push(account);
        }
      }
    }
    const session = cleanSession(input.session);

    if (session) {
      const existing = accounts.findIndex(
        (account) => account.userId === session.userId,
      );
      if (existing >= 0) accounts.splice(existing, 1);
      accounts.unshift(session);
    }

    return {
      session,
      accounts,
    };
  }

  /**
   * Get current session.
   * @returns Session
   */
  getSession() {
    return this.get().session;
  }

  /**
   * Add a new session to the auth manager.
   * @param session Session
   */
  setSession(session: Session) {
    const accounts = [
      session,
      ...this.get().accounts.filter(
        (account) => account.userId !== session.userId,
      ),
    ];
    this.set("session", session);
    this.set("accounts", accounts);
  }

  getAccounts() {
    return this.get().accounts;
  }

  updateSessionProfile(profile: Pick<Session, "username" | "displayName" | "avatar">) {
    const current = this.get().session;
    if (!current) return;

    const updated = { ...current, ...profile };
    this.setSession(updated);
  }

  removeAccount(sessionId: string) {
    this.set(
      "accounts",
      this.get().accounts.filter((account) => account._id !== sessionId),
    );
  }

  /**
   * Remove existing session.
   */
  removeSession() {
    this.set("session", undefined!);
  }

  /**
   * Mark current session as valid
   */
  markValid() {
    const session = this.get().session;
    if (session && !session.valid) {
      this.set("session", "valid", true);
    }
  }
}

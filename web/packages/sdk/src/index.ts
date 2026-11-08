/**
 * @javadaba/sdk — typed client for the Javadaba account API (`/account/v1`).
 *
 * One shared account ("Meta-style") owns a single credit balance, in US dollars, and a
 * cross-app achievement profile. Credit is bought (top-up) or earned
 * (achievements, referrals) and spent on API usage and unlockables. Every amount the client
 * hands back is a dollar amount as a decimal string; `wire.ts` joins it to the server's old field names.
 *
 * Usage:
 *   const jd = createJavadabaClient({ baseUrl: "/api" }); // Traefik routes /api -> Quarkus
 *   await jd.auth.devLogin();
 *   const wallet = await jd.wallet.get();
 */

import {
  achievementFrom,
  checkoutFrom,
  referralFrom,
  transactionFrom,
  unlockableFrom,
  unlockedFrom,
  walletFrom,
  type WireAchievement,
  type WireCheckout,
  type WireReferral,
  type WireTransaction,
  type WireUnlockable,
  type WireUnlocked,
  type WireWallet,
} from "./wire";

export interface JavadabaClientOptions {
  /** API origin/prefix. Behind Traefik use "/api"; in raw dev "http://localhost:8080". */
  baseUrl?: string;
  /** Optional fetch override (tests/SSR). */
  fetch?: typeof fetch;
}

export type TransactionType =
  | "TOP_UP" | "CHARGE" | "REFUND" | "ADJUSTMENT"
  | "HOLD" | "RELEASE" | "REWARD" | "SPEND";

export type TokenProvenance =
  | "purchase" | "api_usage" | "achievement" | "referral" | "streak" | "unlock" | "adjustment";

export interface WalletTransaction {
  type: TransactionType;
  /** Dollars, signed: a charge is negative. */
  amount: string;
  provenance: TokenProvenance | null;
  referenceId: string | null;
  at: string;
}

export interface Wallet {
  accountId: string;
  /** Dollars. */
  balance: string;
  updatedAt: string;
  recent: WalletTransaction[];
}

/** Mirrors `PaymentGateway.CheckoutStatus` in javadaba-api: synchronous providers (dev)
 *  settle as COMPLETED immediately; asynchronous ones (Stripe) start PENDING and complete
 *  later via webhook. */
export type CheckoutStatus = "PENDING" | "COMPLETED";

/** Response of `POST /account/v1/wallet/topup` (self-serve checkout). */
export interface CheckoutSession {
  checkoutId: string;
  /** Null when the provider settles synchronously (dev: nothing to redirect to). Set for
   *  asynchronous providers like Stripe, where the caller should navigate the user there. */
  redirectUrl: string | null;
  status: CheckoutStatus;
  /** Wallet balance after this call, in dollars: already credited if `status` is COMPLETED. */
  balance: string;
}

export interface AccountSession {
  accountId: string;
  email: string;
  expiresAt?: string;
  /** Platform operator flag (JDB-148). Absent on responses older than the field. */
  admin?: boolean;
}

export interface Achievement {
  code: string;
  name: string;
  description: string;
  category: string;
  tier: "BRONZE" | "SILVER" | "GOLD";
  threshold: number;
  progress: number;
  unlocked: boolean;
  /** Dollars of credit the achievement pays. */
  reward: string;
  unlockedAt: string | null;
}

export interface UnlockedAchievement {
  code: string;
  name: string;
  reward: string;
}

export interface Unlockable {
  code: string;
  name: string;
  description: string;
  kind: string;
  /** Dollars of credit it costs. */
  price: string;
}

export interface Entitlement {
  accountId: string;
  unlockableCode: string;
  acquiredAt: string;
}

export interface ReferralRedemption {
  inviterAccountId: string;
  refereeAccountId: string;
  inviterReward: string;
  refereeReward: string;
}

export class JavadabaApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "JavadabaApiError";
  }
}

export function createJavadabaClient(options: JavadabaClientOptions = {}) {
  const baseUrl = (options.baseUrl ?? "").replace(/\/$/, "");
  const doFetch = options.fetch ?? globalThis.fetch;

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await doFetch(`${baseUrl}${path}`, {
      method,
      credentials: "include",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      throw new JavadabaApiError(res.status, data?.error ?? "error", data?.message ?? res.statusText);
    }
    return data as T;
  }

  return {
    auth: {
      /** Exchange a Firebase ID token (Google sign-in) for a Javadaba session. */
      firebase: (idToken: string) =>
        request<AccountSession>("POST", "/account/v1/auth/firebase", { idToken }),
      /** Local-only dev login (stub); disabled in production. */
      devLogin: (input?: { accountId?: string; email?: string }) =>
        request<AccountSession>("POST", "/account/v1/auth/dev-login", input ?? {}),
      /**
       * Who is signed in, or `null`. The API answers "no session yet" with 204 (JAVA-204); a 401
       * from an older revision means the same, so both come back as `null`, never as a throw.
       */
      me: async (): Promise<AccountSession | null> => {
        try {
          return await request<AccountSession | null>("GET", "/account/v1/auth/me");
        } catch (error) {
          if (error instanceof JavadabaApiError && error.status === 401) return null;
          throw error;
        }
      },
      logout: () => request<{ ok: boolean }>("POST", "/account/v1/auth/logout"),
    },
    wallet: {
      get: async () => walletFrom(await request<WireWallet>("GET", "/account/v1/wallet")),
      /**
       * Self-serve top-up through the configured payment gateway (real checkout flow).
       * With the dev provider the checkout settles instantly and `balance` already
       * reflects the credit (`redirectUrl: null`); with Stripe, `redirectUrl` is set and the
       * balance only updates once the provider confirms payment via webhook.
       */
      topupCheckout: async (amount: string) =>
        checkoutFrom(await request<WireCheckout>("POST", "/account/v1/wallet/topup", { amountTokensJ: amount })),
      /**
       * @deprecated Dev only: returns 404 `dev_top_up_disabled` unless the backend is
       * running with `javadaba.payments.provider=dev` (never in prod, see
       * `ProductionSecurityValidator`). Credits the wallet directly without going through
       * any payment gateway. Use `topupCheckout` for the real purchase flow.
       */
      topUp: async (amount: string, referenceId?: string) =>
        walletFrom(await request<WireWallet>("POST", "/account/v1/wallet/top-ups", { amountTokensJ: amount, referenceId })),
      transactions: async (limit = 50) =>
        (await request<WireTransaction[]>("GET", `/account/v1/wallet/transactions?limit=${limit}`)).map(transactionFrom),
    },
    achievements: {
      list: async () => (await request<WireAchievement[]>("GET", "/account/v1/achievements")).map(achievementFrom),
      recordEvent: async (event: string, amount = 1) => {
        const { unlocked } = await request<{ unlocked: WireUnlocked[] }>("POST", "/account/v1/achievements/events", { event, amount });
        return { unlocked: unlocked.map(unlockedFrom) };
      },
    },
    unlockables: {
      list: async () => {
        const { catalog, owned } = await request<{ catalog: WireUnlockable[]; owned: Entitlement[] }>("GET", "/account/v1/unlockables");
        return { catalog: catalog.map(unlockableFrom), owned };
      },
      purchase: async (code: string) => {
        const { priceTokensJ, ...rest } = await request<{ code: string; priceTokensJ: string; acquiredAt: string }>(
          "POST", `/account/v1/unlockables/${encodeURIComponent(code)}/purchase`);
        return { ...rest, price: priceTokensJ };
      },
    },
    referrals: {
      get: () => request<{ code: string }>("GET", "/account/v1/referrals"),
      redeem: async (code: string) =>
        referralFrom(await request<WireReferral>("POST", "/account/v1/referrals/redeem", { code })),
    },
  };
}

export type JavadabaClient = ReturnType<typeof createJavadabaClient>;

/** Host↔app iframe shell protocol (ADR 0001). */
export * from "./shell";

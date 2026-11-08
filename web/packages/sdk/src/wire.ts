/**
 * The account API's money fields as the server still spells them.
 *
 * Nobody holds a "Tokens J" balance (owner decision X05): money is US dollars everywhere, so the
 * client exposes `balance`, `amount`, `reward` and `price`. The JSON the server sends and expects
 * still carries the old names, and no Java changes in the redesign, so the two are joined here and
 * nowhere else.
 *
 * TODO(backend): MIG-B017 rename the JSON fields `balanceTokensJ`, `amountTokensJ`, `rewardTokensJ`,
 * `priceTokensJ`, `inviterRewardTokensJ` and `refereeRewardTokensJ` to the names the client uses,
 * then delete this file and read the responses as they come.
 */
import type {
  Achievement,
  CheckoutSession,
  ReferralRedemption,
  Unlockable,
  UnlockedAchievement,
  Wallet,
  WalletTransaction,
} from "./index";

export type WireTransaction = Omit<WalletTransaction, "amount"> & { amountTokensJ: string };
export type WireWallet = Omit<Wallet, "balance" | "recent"> & { balanceTokensJ: string; recent: WireTransaction[] };
export type WireCheckout = Omit<CheckoutSession, "balance"> & { balanceTokensJ: string };
export type WireAchievement = Omit<Achievement, "reward"> & { rewardTokensJ: string };
export type WireUnlocked = Omit<UnlockedAchievement, "reward"> & { rewardTokensJ: string };
export type WireUnlockable = Omit<Unlockable, "price"> & { priceTokensJ: string };
export type WireReferral = Omit<ReferralRedemption, "inviterReward" | "refereeReward"> & {
  inviterRewardTokensJ: string;
  refereeRewardTokensJ: string;
};

export function transactionFrom({ amountTokensJ, ...rest }: WireTransaction): WalletTransaction {
  return { ...rest, amount: amountTokensJ };
}

export function walletFrom({ balanceTokensJ, recent, ...rest }: WireWallet): Wallet {
  return { ...rest, balance: balanceTokensJ, recent: recent.map(transactionFrom) };
}

export function checkoutFrom({ balanceTokensJ, ...rest }: WireCheckout): CheckoutSession {
  return { ...rest, balance: balanceTokensJ };
}

export function achievementFrom({ rewardTokensJ, ...rest }: WireAchievement): Achievement {
  return { ...rest, reward: rewardTokensJ };
}

export function unlockedFrom({ rewardTokensJ, ...rest }: WireUnlocked): UnlockedAchievement {
  return { ...rest, reward: rewardTokensJ };
}

export function unlockableFrom({ priceTokensJ, ...rest }: WireUnlockable): Unlockable {
  return { ...rest, price: priceTokensJ };
}

export function referralFrom({ inviterRewardTokensJ, refereeRewardTokensJ, ...rest }: WireReferral): ReferralRedemption {
  return { ...rest, inviterReward: inviterRewardTokensJ, refereeReward: refereeRewardTokensJ };
}

export type SubscriptionTier = "gratis" | "plus" | "pro";

export const tierRank: Record<SubscriptionTier, number> = {
  gratis: 0,
  plus: 1,
  pro: 2,
};

export function hasTier(current: SubscriptionTier, required: SubscriptionTier) {
  return tierRank[current] >= tierRank[required];
}

export const planNames: Record<SubscriptionTier, string> = {
  gratis: "Gratis",
  plus: "Plus",
  pro: "Pro",
};

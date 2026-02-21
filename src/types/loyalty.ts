import { PublicKey } from "@solana/web3.js";

export enum BadgeTier {
  None = 0,
  Bronze = 1,
  Silver = 2,
  Gold = 3,
  Platinum = 4,
}

export const TIER_THRESHOLDS: Record<BadgeTier, number> = {
  [BadgeTier.None]: 0,
  [BadgeTier.Bronze]: 1,
  [BadgeTier.Silver]: 3,
  [BadgeTier.Gold]: 5,
  [BadgeTier.Platinum]: 10,
};

export const TIER_NAMES: Record<BadgeTier, string> = {
  [BadgeTier.None]: "None",
  [BadgeTier.Bronze]: "Bronze",
  [BadgeTier.Silver]: "Silver",
  [BadgeTier.Gold]: "Gold",
  [BadgeTier.Platinum]: "Platinum",
};

export const TIER_BENEFITS: Record<BadgeTier, TierBenefits> = {
  [BadgeTier.None]: {
    tier: BadgeTier.None,
    merchantDiscountPercent: 0,
    ticketDiscountPercent: 0,
    earlyAccessHours: 0,
    hasPriorityEntry: false,
    hasVipLounge: false,
    hasFreeParking: false,
    hasConciergeSupport: false,
  },
  [BadgeTier.Bronze]: {
    tier: BadgeTier.Bronze,
    merchantDiscountPercent: 10,
    ticketDiscountPercent: 5,
    earlyAccessHours: 0,
    hasPriorityEntry: false,
    hasVipLounge: false,
    hasFreeParking: false,
    hasConciergeSupport: false,
  },
  [BadgeTier.Silver]: {
    tier: BadgeTier.Silver,
    merchantDiscountPercent: 15,
    ticketDiscountPercent: 10,
    earlyAccessHours: 24,
    hasPriorityEntry: true,
    hasVipLounge: false,
    hasFreeParking: false,
    hasConciergeSupport: false,
  },
  [BadgeTier.Gold]: {
    tier: BadgeTier.Gold,
    merchantDiscountPercent: 20,
    ticketDiscountPercent: 15,
    earlyAccessHours: 48,
    hasPriorityEntry: true,
    hasVipLounge: true,
    hasFreeParking: true,
    hasConciergeSupport: false,
  },
  [BadgeTier.Platinum]: {
    tier: BadgeTier.Platinum,
    merchantDiscountPercent: 25,
    ticketDiscountPercent: 20,
    earlyAccessHours: 72,
    hasPriorityEntry: true,
    hasVipLounge: true,
    hasFreeParking: true,
    hasConciergeSupport: true,
  },
};

export interface TierBenefits {
  tier: BadgeTier;
  merchantDiscountPercent: number;
  ticketDiscountPercent: number;
  earlyAccessHours: number;
  hasPriorityEntry: boolean;
  hasVipLounge: boolean;
  hasFreeParking: boolean;
  hasConciergeSupport: boolean;
}

export interface LoyaltyBenefitsResponse {
  currentTier: BadgeTier;
  merchantDiscount: number;
  ticketDiscount: number;
  earlyAccessHours: number;
  hasPriorityEntry: boolean;
  hasVipLounge: boolean;
  hasFreeParking: boolean;
  hasConciergeSupport: boolean;
  currentStreak: number;
  streakBonusMultiplier: number;
  totalEvents: number;
  lifetimeSpend: number;
}

export interface UserAttendanceRecord {
  user: PublicKey;
  totalEvents: number;
  currentTier: BadgeTier;
  lifetimeSpend: number;
  currentStreak: number;
  longestStreak: number;
  lastAttendanceDate: number;
  streakBonusMultiplier: number;
  createdAt: number;
  lastUpdated: number;
  bump: number;
}

export interface BadgeCollectionData {
  authority: PublicKey;
  totalIssued: number;
  bronzeBadgeMint: PublicKey;
  silverBadgeMint: PublicKey;
  goldBadgeMint: PublicKey;
  platinumBadgeMint: PublicKey;
  collectionName: string;
  collectionSymbol: string;
  collectionUri: string;
  bump: number;
}

export interface EnableDynamicPricingParams {
  minPrice: number;
  maxPrice: number;
  demandFactor: number;
  timeFactor: number;
  scarcityPremium: number;
  updateInterval: number;
}

export function getNextTier(current: BadgeTier): BadgeTier | null {
  if (current === BadgeTier.Platinum) return null;
  return current + 1;
}

export function getEventsToNextTier(currentEvents: number, currentTier: BadgeTier): number {
  const next = getNextTier(currentTier);
  if (next === null) return 0;
  return Math.max(0, TIER_THRESHOLDS[next] - currentEvents);
}

export function parseBadgeTier(tierObj: any): BadgeTier {
  if (tierObj === null || tierObj === undefined) return BadgeTier.None;
  if (typeof tierObj === "number") return tierObj;
  if (tierObj.none !== undefined) return BadgeTier.None;
  if (tierObj.bronze !== undefined) return BadgeTier.Bronze;
  if (tierObj.silver !== undefined) return BadgeTier.Silver;
  if (tierObj.gold !== undefined) return BadgeTier.Gold;
  if (tierObj.platinum !== undefined) return BadgeTier.Platinum;
  return BadgeTier.None;
}

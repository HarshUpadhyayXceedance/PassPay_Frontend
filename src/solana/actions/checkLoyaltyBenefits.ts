import { PublicKey, Connection } from "@solana/web3.js";
import { findUserAttendancePda } from "../pda";
import { DEVNET_RPC } from "../config/constants";
import {
  LoyaltyBenefitsResponse,
  UserAttendanceRecord,
  BadgeTier,
  TIER_BENEFITS,
} from "../../types/loyalty";

function readU32(data: Uint8Array, offset: number): number {
  return (
    data[offset] |
    (data[offset + 1] << 8) |
    (data[offset + 2] << 16) |
    ((data[offset + 3] << 24) >>> 0)
  );
}

function readU64(data: Uint8Array, offset: number): number {
  const lo = readU32(data, offset);
  const hi = readU32(data, offset + 4);
  return lo + hi * 0x100000000;
}

function readI64(data: Uint8Array, offset: number): number {
  return readU64(data, offset);
}

function tierFromU8(value: number): BadgeTier {
  switch (value) {
    case 0: return BadgeTier.None;
    case 1: return BadgeTier.Bronze;
    case 2: return BadgeTier.Silver;
    case 3: return BadgeTier.Gold;
    case 4: return BadgeTier.Platinum;
    default: return BadgeTier.None;
  }
}

const DEFAULT_BENEFITS: LoyaltyBenefitsResponse = {
  currentTier: BadgeTier.None,
  merchantDiscount: 0,
  ticketDiscount: 0,
  earlyAccessHours: 0,
  hasPriorityEntry: false,
  hasVipLounge: false,
  hasFreeParking: false,
  hasConciergeSupport: false,
  currentStreak: 0,
  streakBonusMultiplier: 100,
  totalEvents: 0,
  lifetimeSpend: 0,
};

export async function checkLoyaltyBenefits(
  userPubkey: PublicKey
): Promise<{
  attendance: UserAttendanceRecord | null;
  benefits: LoyaltyBenefitsResponse;
}> {
  const connection = new Connection(DEVNET_RPC, "confirmed");
  const [attendancePda] = findUserAttendancePda(userPubkey);

  const accountInfo = await connection.getAccountInfo(attendancePda);

  if (!accountInfo || !accountInfo.data) {
    return { attendance: null, benefits: DEFAULT_BENEFITS };
  }

  const data = new Uint8Array(accountInfo.data);

  if (data.length < 87) {
    console.warn("UserAttendanceRecord too small:", data.length);
    return { attendance: null, benefits: DEFAULT_BENEFITS };
  }

  const userBytes = data.slice(8, 40);
  const user = new PublicKey(userBytes);

  const totalEvents = readU32(data, 40);
  const currentTier = tierFromU8(data[44]);
  const lifetimeSpend = readU64(data, 45);
  const currentStreak = readU32(data, 53);
  const longestStreak = readU32(data, 57);
  const lastAttendanceDate = readI64(data, 61);
  const streakBonusMultiplier = data[69];
  const createdAt = readI64(data, 70);
  const lastUpdated = readI64(data, 78);
  const bump = data[86];

  const attendance: UserAttendanceRecord = {
    user,
    totalEvents,
    currentTier,
    lifetimeSpend,
    currentStreak,
    longestStreak,
    lastAttendanceDate,
    streakBonusMultiplier,
    createdAt,
    lastUpdated,
    bump,
  };

  const tierBenefits = TIER_BENEFITS[currentTier];

  const benefits: LoyaltyBenefitsResponse = {
    currentTier,
    merchantDiscount: tierBenefits.merchantDiscountPercent,
    ticketDiscount: tierBenefits.ticketDiscountPercent,
    earlyAccessHours: tierBenefits.earlyAccessHours,
    hasPriorityEntry: tierBenefits.hasPriorityEntry,
    hasVipLounge: tierBenefits.hasVipLounge,
    hasFreeParking: tierBenefits.hasFreeParking,
    hasConciergeSupport: tierBenefits.hasConciergeSupport,
    currentStreak,
    streakBonusMultiplier,
    totalEvents,
    lifetimeSpend,
  };

  return { attendance, benefits };
}

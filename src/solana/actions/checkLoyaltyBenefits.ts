import { PublicKey, Connection } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findUserAttendancePda } from "../pda";
import { DEVNET_RPC } from "../config/constants";
import {
  LoyaltyBenefitsResponse,
  UserAttendanceRecord,
  parseBadgeTier,
  BadgeTier,
  TIER_BENEFITS,
} from "../../types/loyalty";

/**
 * Fetch user's attendance record and compute loyalty benefits locally.
 * Falls back to defaults if no attendance record exists.
 */
export async function checkLoyaltyBenefits(
  userPubkey: PublicKey
): Promise<{
  attendance: UserAttendanceRecord | null;
  benefits: LoyaltyBenefitsResponse;
}> {
  const connection = new Connection(DEVNET_RPC, "confirmed");
  const provider = new AnchorProvider(
    connection,
    {} as any,
    { commitment: "confirmed" }
  );
  const program = getProgram(provider);

  const [attendancePda] = findUserAttendancePda(userPubkey);

  try {
    const account = await program.account.userAttendanceRecord.fetch(attendancePda);

    const tier = parseBadgeTier(account.currentTier);
    const benefits = TIER_BENEFITS[tier];

    const attendance: UserAttendanceRecord = {
      user: account.user,
      totalEvents: account.totalEvents,
      currentTier: tier,
      lifetimeSpend: account.lifetimeSpend.toNumber(),
      currentStreak: account.currentStreak,
      longestStreak: account.longestStreak,
      lastAttendanceDate: account.lastAttendanceDate.toNumber(),
      streakBonusMultiplier: account.streakBonusMultiplier,
      createdAt: account.createdAt.toNumber(),
      lastUpdated: account.lastUpdated.toNumber(),
      bump: account.bump,
    };

    const loyaltyBenefits: LoyaltyBenefitsResponse = {
      currentTier: tier,
      merchantDiscount: benefits.merchantDiscountPercent,
      ticketDiscount: benefits.ticketDiscountPercent,
      earlyAccessHours: benefits.earlyAccessHours,
      hasPriorityEntry: benefits.hasPriorityEntry,
      hasVipLounge: benefits.hasVipLounge,
      hasFreeParking: benefits.hasFreeParking,
      hasConciergeSupport: benefits.hasConciergeSupport,
      currentStreak: attendance.currentStreak,
      streakBonusMultiplier: attendance.streakBonusMultiplier,
      totalEvents: attendance.totalEvents,
      lifetimeSpend: attendance.lifetimeSpend,
    };

    return { attendance, benefits: loyaltyBenefits };
  } catch {
    // No attendance record - return defaults
    const defaultBenefits: LoyaltyBenefitsResponse = {
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

    return { attendance: null, benefits: defaultBenefits };
  }
}

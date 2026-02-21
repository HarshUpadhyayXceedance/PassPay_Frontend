import { PublicKey, Connection } from "@solana/web3.js";
import { findUserAttendancePda } from "../pda";
import { DEVNET_RPC } from "../config/constants";
import {
  LoyaltyBenefitsResponse,
  UserAttendanceRecord,
  BadgeTier,
  TIER_BENEFITS,
} from "../../types/loyalty";

/**
 * On-chain UserAttendanceRecord byte layout (matches Rust struct with #[repr(u8)] BadgeTier):
 *
 * offset 0-7:   discriminator (8 bytes)
 * offset 8-39:  user (32 bytes - Pubkey)
 * offset 40-43: total_events (4 bytes - u32 LE)
 * offset 44:    current_tier (1 byte - u8, BadgeTier #[repr(u8)])
 * offset 45-52: lifetime_spend (8 bytes - u64 LE)
 * offset 53-56: current_streak (4 bytes - u32 LE)
 * offset 57-60: longest_streak (4 bytes - u32 LE)
 * offset 61-68: last_attendance_date (8 bytes - i64 LE)
 * offset 69:    streak_bonus_multiplier (1 byte - u8)
 * offset 70-77: created_at (8 bytes - i64 LE)
 * offset 78-85: last_updated (8 bytes - i64 LE)
 * offset 86:    bump (1 byte - u8)
 * Total: 87 bytes
 */

/** Read a u32 LE from a Uint8Array */
function readU32(data: Uint8Array, offset: number): number {
  return (
    data[offset] |
    (data[offset + 1] << 8) |
    (data[offset + 2] << 16) |
    ((data[offset + 3] << 24) >>> 0) // >>> 0 to treat as unsigned
  );
}

/** Read a u64 LE from a Uint8Array as a JS number (safe for values < 2^53) */
function readU64(data: Uint8Array, offset: number): number {
  const lo = readU32(data, offset);
  const hi = readU32(data, offset + 4);
  return lo + hi * 0x100000000;
}

/** Read a i64 LE from a Uint8Array as a JS number (safe for timestamps) */
function readI64(data: Uint8Array, offset: number): number {
  // For timestamps and lamport amounts, values are positive and fit in Number
  return readU64(data, offset);
}

/** Convert raw u8 tier value to BadgeTier enum */
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

/**
 * Fetch user's attendance record using raw byte parsing (bypasses Anchor BorshCoder).
 *
 * Anchor's BorshCoder fails on #[repr(u8)] enums because the IDL marks them
 * as repr.kind="rust" which expects u32 discriminators. We parse the raw
 * account data manually using the exact byte offsets from the Rust struct.
 */
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
    // No attendance record yet — user hasn't been checked in
    return { attendance: null, benefits: DEFAULT_BENEFITS };
  }

  const data = new Uint8Array(accountInfo.data);

  // Validate minimum size (87 bytes)
  if (data.length < 87) {
    console.warn("UserAttendanceRecord too small:", data.length);
    return { attendance: null, benefits: DEFAULT_BENEFITS };
  }

  // Parse each field at its byte offset (skip 8-byte discriminator)
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

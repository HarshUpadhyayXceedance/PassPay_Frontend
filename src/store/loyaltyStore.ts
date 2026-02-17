import { create } from "zustand";
import {
  BadgeTier,
  LoyaltyBenefitsResponse,
  UserAttendanceRecord,
  BadgeCollectionData,
} from "../types/loyalty";

interface LoyaltyState {
  userAttendance: UserAttendanceRecord | null;
  loyaltyBenefits: LoyaltyBenefitsResponse | null;
  badgeCollection: BadgeCollectionData | null;
  isLoading: boolean;
  error: string | null;

  setUserAttendance: (attendance: UserAttendanceRecord | null) => void;
  setLoyaltyBenefits: (benefits: LoyaltyBenefitsResponse | null) => void;
  setBadgeCollection: (collection: BadgeCollectionData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearLoyaltyData: () => void;
}

export const useLoyaltyStore = create<LoyaltyState>((set) => ({
  userAttendance: null,
  loyaltyBenefits: null,
  badgeCollection: null,
  isLoading: false,
  error: null,

  setUserAttendance: (attendance) => set({ userAttendance: attendance }),

  setLoyaltyBenefits: (benefits) => set({ loyaltyBenefits: benefits }),

  setBadgeCollection: (collection) => set({ badgeCollection: collection }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  clearLoyaltyData: () =>
    set({
      userAttendance: null,
      loyaltyBenefits: null,
      badgeCollection: null,
      isLoading: false,
      error: null,
    }),
}));

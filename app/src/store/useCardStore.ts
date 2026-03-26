import { create } from "zustand";
import { CardIdentity, PricingResult } from "../api/client";

interface CardStore {
  card: CardIdentity | null;
  pricing: PricingResult | null;
  imageUri: string | null;
  loading: boolean;
  error: string | null;
  setCard: (card: CardIdentity) => void;
  setPricing: (pricing: PricingResult) => void;
  setImageUri: (uri: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useCardStore = create<CardStore>((set) => ({
  card: null,
  pricing: null,
  imageUri: null,
  loading: false,
  error: null,
  setCard: (card) => set({ card }),
  setPricing: (pricing) => set({ pricing }),
  setImageUri: (imageUri) => set({ imageUri }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set({ card: null, pricing: null, imageUri: null, loading: false, error: null }),
}));

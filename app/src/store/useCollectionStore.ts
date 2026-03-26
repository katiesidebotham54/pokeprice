import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface SavedCard {
  id: string;           // pokemontcg.io card id or fallback uuid
  name: string;
  set: string;
  number: string;
  rarity: string;
  imageUrl: string | null;
  tcgplayerUrl: string | null;
  lastPrice: number | null;
  savedAt: string;      // ISO date string
}

interface CollectionStore {
  cards: SavedCard[];
  loaded: boolean;
  load: () => Promise<void>;
  save: (card: SavedCard) => Promise<void>;
  remove: (id: string) => Promise<void>;
  has: (id: string) => boolean;
}

const STORAGE_KEY = "cardsnap:collection";

export const useCollectionStore = create<CollectionStore>((set, get) => ({
  cards: [],
  loaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const cards: SavedCard[] = raw ? JSON.parse(raw) : [];
      set({ cards, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  save: async (card) => {
    const existing = get().cards.filter((c) => c.id !== card.id);
    const updated = [card, ...existing];
    set({ cards: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  remove: async (id) => {
    const updated = get().cards.filter((c) => c.id !== id);
    set({ cards: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  has: (id) => get().cards.some((c) => c.id === id),
}));

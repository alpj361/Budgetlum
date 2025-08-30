import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CurrencyCode, getCurrency } from "../types/currency";

interface SettingsStore {
  primaryCurrency: CurrencyCode;
  setPrimaryCurrency: (code: CurrencyCode) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      primaryCurrency: "USD",
      setPrimaryCurrency: (code) => set({ primaryCurrency: code }),
    }),
    {
      name: "settings-store",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);

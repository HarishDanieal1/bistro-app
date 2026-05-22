import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string; // 'customer' | 'admin'
}

export interface DiningPreferences {
  dietary: string; // 'None' | 'Vegan' | 'Vegetarian' | 'Gluten-Free' | 'Keto' | 'Halal'
  spice: string; // 'Mild' | 'Medium' | 'Hot' | 'Extra Hot'
  allergies: string[]; // e.g. ['Nuts', 'Dairy']
  tasteNote: string; // custom string
}

interface UserState {
  currentUser: User | null;
  tableNumber: string | null;
  preferences: DiningPreferences;
  setCurrentUser: (user: User | null) => void;
  setTableNumber: (num: string | null) => void;
  setPreferences: (prefs: Partial<DiningPreferences>) => void;
  logout: () => void;
}

const DEFAULT_PREFERENCES: DiningPreferences = {
  dietary: 'None',
  spice: 'Medium',
  allergies: [],
  tasteNote: '',
};

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      currentUser: null,
      tableNumber: null,
      preferences: DEFAULT_PREFERENCES,
      setCurrentUser: (user) => set({ currentUser: user }),
      setTableNumber: (num) => set({ tableNumber: num }),
      setPreferences: (prefs) =>
        set((state) => ({
          preferences: { ...state.preferences, ...prefs },
        })),
      logout: () => set({ currentUser: null, tableNumber: null, preferences: DEFAULT_PREFERENCES }),
    }),
    {
      name: 'bistro-user-storage',
    }
  )
);

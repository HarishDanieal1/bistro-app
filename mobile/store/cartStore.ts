import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  icon?: string;
}

interface CartState {
  items: CartItem[];
  guestOrders: any[];
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  removeItemCompletely: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setCartItems: (items: CartItem[]) => void;
  addGuestOrder: (order: any) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      guestOrders: [],
      
      addItem: (item) =>
        set((state) => {
          const existingItem = state.items.find((i) => i.id === item.id);
          const addQty = item.quantity ?? 1;
          
          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + addQty } : i
              ),
            };
          }
          
          return {
            items: [...state.items, { ...item, quantity: addQty } as CartItem],
          };
        }),
        
      removeItem: (id) =>
        set((state) => {
          const existingItem = state.items.find((i) => i.id === id);
          if (!existingItem) return {};
          
          if (existingItem.quantity <= 1) {
            return {
              items: state.items.filter((i) => i.id !== id),
            };
          }
          
          return {
            items: state.items.map((i) =>
              i.id === id ? { ...i, quantity: i.quantity - 1 } : i
            ),
          };
        }),
        
      removeItemCompletely: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),
        
      updateQuantity: (id, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter((i) => i.id !== id),
            };
          }
          return {
            items: state.items.map((i) =>
              i.id === id ? { ...i, quantity } : i
            ),
          };
        }),
        
      clearCart: () => set({ items: [] }),
      
      setCartItems: (items) => set({ items }),

      addGuestOrder: (order) => set((state) => ({ guestOrders: [order, ...state.guestOrders] })),
    }),
    {
      name: 'bistro-cart-storage',
    }
  )
);

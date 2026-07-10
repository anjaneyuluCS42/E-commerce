import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '../types';

interface CartStore {
  cartItems: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
  setCartItems: (items: CartItem[]) => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      cartItems: [],

      setCartItems: (items) => set({ cartItems: items }),

      addItem: (item) => {
        const existing = get().cartItems.find((i) => i.id === item.id);
        if (existing) {
          set({
            cartItems: get().cartItems.map((i) =>
              i.id === item.id
                ? { ...i, cartQuantity: i.cartQuantity + item.cartQuantity }
                : i
            ),
          });
        } else {
          set({ cartItems: [...get().cartItems, item] });
        }
      },

      removeItem: (productId) =>
        set({ cartItems: get().cartItems.filter((i) => i.id !== productId) }),

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
        } else {
          set({
            cartItems: get().cartItems.map((i) =>
              i.id === productId ? { ...i, cartQuantity: quantity } : i
            ),
          });
        }
      },

      clearCart: () => set({ cartItems: [] }),

      getTotalPrice: () =>
        get().cartItems.reduce(
          (total, item) => total + item.price * item.cartQuantity,
          0
        ),

      getTotalItems: () =>
        get().cartItems.reduce((total, item) => total + item.cartQuantity, 0),
    }),
    {
      name: 'cart-storage', // localStorage key
    }
  )
);

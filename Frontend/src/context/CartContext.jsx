import { createContext, useEffect } from 'react';
import { useCartStore } from '../store/cartStore';
import cartService from '../services/cartService';
import productService from '../services/productService';
import { useAuth } from '../hooks/useAuth';

export const CartContext = createContext();

/**
 * CartProvider now acts as a thin bridge that:
 * 1. Syncs the backend Redis cart → Zustand store on login
 * 2. Exposes the same API surface that existing components expect via Context
 */
export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const store = useCartStore();

  const syncCart = async () => {
    if (!localStorage.getItem('token')) return;
    try {
      const data = await cartService.getCart();
      if (data.cart) {
        const entries = Object.entries(data.cart);
        const itemPromises = entries.map(async ([productId, quantity]) => {
          try {
            const product = await productService.getProductById(parseInt(productId));
            return { ...product, cartQuantity: parseInt(quantity) };
          } catch {
            return null;
          }
        });
        const items = (await Promise.all(itemPromises)).filter(Boolean);
        store.setCartItems(items);
      } else {
        store.setCartItems([]);
      }
    } catch (err) {
      console.error('Cart sync error:', err);
    }
  };

  // Sync backend cart to Zustand whenever user logs in
  useEffect(() => {
    if (user) {
      syncCart();
    } else {
      store.clearCart();
    }
  }, [user]);

  // Wrap store actions so components using useCart() keep working unchanged
  const addToCart = async (productId, quantity = 1) => {
    await cartService.addToCart(productId, quantity);
    await syncCart();
    return true;
  };

  const removeFromCart = async (productId) => {
    await cartService.removeFromCart(productId);
    store.removeItem(productId);
  };

  const updateQuantity = async (productId, quantity) => {
    if (quantity <= 0) {
      await removeFromCart(productId);
    } else {
      await cartService.updateQuantity(productId, quantity);
      store.updateQuantity(productId, quantity);
    }
  };

  const clearCart = async () => {
    try {
      await cartService.clearCart();
    } catch { /* ignore */ }
    store.clearCart();
  };

  const value = {
    cartItems: store.cartItems,
    loading: false,
    error: null,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    fetchCart: syncCart,
    getTotalPrice: store.getTotalPrice,
    getTotalItems: store.getTotalItems,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

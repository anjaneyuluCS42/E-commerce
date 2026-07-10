import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../../store/cartStore.ts';
import type { CartItem } from '../../types';

const product1: CartItem = {
  id: 1, name: 'Product A', description: '', price: 100, stock: 20, category: 'Electronics',
  cartQuantity: 1,
};

const product2: CartItem = {
  id: 2, name: 'Product B', description: '', price: 250, stock: 5, category: 'Fashion',
  cartQuantity: 2,
};

describe('cartStore (Zustand)', () => {
  beforeEach(() => {
    // Reset store between tests
    useCartStore.setState({ cartItems: [] });
  });

  it('starts with an empty cart', () => {
    const { cartItems } = useCartStore.getState();
    expect(cartItems).toHaveLength(0);
  });

  it('adds an item to the cart', () => {
    useCartStore.getState().addItem(product1);
    expect(useCartStore.getState().cartItems).toHaveLength(1);
  });

  it('increments quantity when adding an existing item', () => {
    useCartStore.getState().addItem(product1);
    useCartStore.getState().addItem({ ...product1, cartQuantity: 3 });
    const item = useCartStore.getState().cartItems[0];
    expect(item.cartQuantity).toBe(4);
  });

  it('removes an item from the cart', () => {
    useCartStore.getState().addItem(product1);
    useCartStore.getState().removeItem(1);
    expect(useCartStore.getState().cartItems).toHaveLength(0);
  });

  it('updates quantity of an item', () => {
    useCartStore.getState().addItem(product1);
    useCartStore.getState().updateQuantity(1, 7);
    expect(useCartStore.getState().cartItems[0].cartQuantity).toBe(7);
  });

  it('removes item when updateQuantity called with 0', () => {
    useCartStore.getState().addItem(product1);
    useCartStore.getState().updateQuantity(1, 0);
    expect(useCartStore.getState().cartItems).toHaveLength(0);
  });

  it('clears all cart items', () => {
    useCartStore.getState().addItem(product1);
    useCartStore.getState().addItem(product2);
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().cartItems).toHaveLength(0);
  });

  it('calculates getTotalPrice correctly', () => {
    useCartStore.getState().addItem(product1);  // 100 × 1
    useCartStore.getState().addItem(product2);  // 250 × 2
    const total = useCartStore.getState().getTotalPrice();
    expect(total).toBe(600); // 100 + 500
  });

  it('calculates getTotalItems correctly', () => {
    useCartStore.getState().addItem(product1);  // qty 1
    useCartStore.getState().addItem(product2);  // qty 2
    expect(useCartStore.getState().getTotalItems()).toBe(3);
  });

  it('setCartItems replaces the entire cart', () => {
    useCartStore.getState().addItem(product1);
    useCartStore.getState().setCartItems([product2]);
    expect(useCartStore.getState().cartItems).toHaveLength(1);
    expect(useCartStore.getState().cartItems[0].id).toBe(2);
  });
});

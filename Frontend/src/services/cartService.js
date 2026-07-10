import api from '../api/axios';

const cartService = {
  // Add item to cart
  addToCart: async (productId, quantity = 1) => {
    try {
      const response = await api.post(`/cart/add/${productId}?quantity=${quantity}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get cart items
  getCart: async () => {
    try {
      const response = await api.get('/cart/');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Remove item from cart
  removeFromCart: async (productId) => {
    try {
      const response = await api.delete(`/cart/remove/${productId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Clear entire cart
  clearCart: async () => {
    try {
      const response = await api.delete('/cart/clear');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update cart quantity
  updateQuantity: async (productId, quantity) => {
    try {
      const response = await api.post(`/cart/add/${productId}?quantity=${quantity}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default cartService;
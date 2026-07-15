import api from '../api/axios';

const orderService = {
  // Place a new order
  placeOrder: async (checkoutData) => {
    try {
      const response = await api.post('/orders/checkout', checkoutData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get user's order history
  getOrders: async () => {
    try {
      const response = await api.get('/orders/history');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get order details by ID
  getOrderById: async (orderId) => {
    try {
      const response = await api.get(`/orders/${orderId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Cancel order
  cancelOrder: async (orderId) => {
    try {
      const response = await api.post(`/orders/${orderId}/cancel`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get order status
  getOrderStatus: async (orderId) => {
    try {
      const response = await api.get(`/orders/${orderId}/status`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Trigger PDF invoice generation (Celery Task)
  triggerInvoice: async (orderId) => {
    try {
      const response = await api.post(`/orders/${orderId}/invoice`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Download PDF invoice file
  downloadInvoice: async (orderId) => {
    try {
      const response = await api.get(`/orders/${orderId}/invoice/download`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default orderService;
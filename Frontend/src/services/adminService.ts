import api from '../api/axios';
import type { Order } from '../types';

const adminService = {
  /** Get all orders (admin) */
  getAllOrders: async (): Promise<Order[]> => {
    try {
      const response = await api.get('/orders/all');
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  /** Update order status (admin) */
  updateOrderStatus: async (orderId: number, status: string, current_location?: string): Promise<Order> => {
    try {
      const response = await api.patch(`/orders/${orderId}/status`, { status, current_location });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  /** Get dashboard stats */
  getDashboardStats: async () => {
    try {
      const [products, orders] = await Promise.all([
        api.get('/products'),
        api.get('/orders/all').catch(() => ({ data: [] })),
      ]);
      const productList = products.data || [];
      const orderList = orders.data || [];
      const revenue = orderList.reduce(
        (sum: number, o: Order) => sum + (o.total_price || 0),
        0
      );
      const uniqueUsers = new Set(orderList.map((o: any) => o.user_id)).size;
      const productsSold = orderList.reduce(
        (sum: number, o: any) =>
          sum +
          (o.items || []).reduce((itemSum: number, item: any) => itemSum + item.quantity, 0),
        0
      );
      return {
        totalProducts: productList.length,
        totalOrders: orderList.length,
        revenue,
        uniqueUsers,
        productsSold,
      };
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },
};

export default adminService;

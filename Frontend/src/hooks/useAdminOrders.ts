import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminService from '../services/adminService';
import { QUERY_KEYS } from '../constants';
import type { Order } from '../types';

/** Fetch all orders (admin) */
export function useAllOrders() {
  return useQuery<Order[]>({
    queryKey: QUERY_KEYS.allOrders,
    queryFn: adminService.getAllOrders,
    // Gracefully handle 404 (endpoint may not exist in demo backend)
    retry: false,
  });
}

/** Update order status (admin) */
export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation<Order, Error, { orderId: number; status: string }>({
    mutationFn: ({ orderId, status }) =>
      adminService.updateOrderStatus(orderId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.allOrders });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.orders });
    },
  });
}

/** Admin dashboard stats */
export function useDashboardStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminService.getDashboardStats,
    retry: false,
  });
}

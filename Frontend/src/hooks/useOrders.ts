import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import orderService from '../services/orderService';
import { QUERY_KEYS } from '../constants';
import type { Order } from '../types';

/** Fetch the current user's order history */
export function useOrders(enabled = true) {
  return useQuery<Order[]>({
    queryKey: QUERY_KEYS.orders,
    queryFn: orderService.getOrders,
    enabled,
  });
}

/** Place a new order from the current cart */
export function usePlaceOrder() {
  const qc = useQueryClient();
  return useMutation<Order, Error, any>({
    mutationFn: (data) => orderService.placeOrder(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.orders });
    },
  });
}

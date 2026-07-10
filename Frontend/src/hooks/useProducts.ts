import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import productService from '../services/productService';
import { QUERY_KEYS } from '../constants';
import type { Product } from '../types';

/** Fetch all products with query parameters */
export function useProducts(params?: Record<string, any>) {
  return useQuery<Product[]>({
    queryKey: [QUERY_KEYS.products[0], params],
    queryFn: () => productService.getAllProducts(params),
  });
}

/** Fetch a single product by ID */
export function useProduct(id: number | string) {
  return useQuery<Product>({
    queryKey: QUERY_KEYS.product(id),
    queryFn: () => productService.getProductById(id),
    enabled: !!id,
  });
}

/** Create a new product (admin) */
export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation<Product, Error, Partial<Product>>({
    mutationFn: (data) => productService.createProduct(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.products });
    },
  });
}

/** Update an existing product (admin) */
export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation<Product, Error, { id: number; data: Partial<Product> }>({
    mutationFn: ({ id, data }) => productService.updateProduct(id, data),
    onSuccess: (updated) => {
      // Optimistically update the cache
      qc.setQueryData<Product[]>(QUERY_KEYS.products, (old) =>
        old ? old.map((p) => (p.id === updated.id ? updated : p)) : old
      );
      qc.invalidateQueries({ queryKey: QUERY_KEYS.products });
    },
  });
}

/** Delete a product (admin) */
export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => productService.deleteProduct(id),
    onMutate: async (id) => {
      // Optimistic update
      await qc.cancelQueries({ queryKey: QUERY_KEYS.products });
      const prev = qc.getQueryData<Product[]>(QUERY_KEYS.products);
      qc.setQueryData<Product[]>(QUERY_KEYS.products, (old) =>
        old ? old.filter((p) => p.id !== id) : old
      );
      return { prev };
    },
    onError: (_err, _id, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(QUERY_KEYS.products, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.products });
    },
  });
}

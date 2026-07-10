// Application-wide constants

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const IMAGE_BASE_URL = `${API_BASE_URL}/`;

export const QUERY_KEYS = {
  products: ['products'] as const,
  product: (id: number | string) => ['products', id] as const,
  orders: ['orders'] as const,
  allOrders: ['admin', 'orders'] as const,
  cart: ['cart'] as const,
} as const;

export const ORDER_STATUSES = {
  delivered: {
    label: 'Delivered',
    color: 'text-green-600 bg-green-50 border-green-200',
  },
  processing: {
    label: 'Processing',
    color: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  },
  shipped: {
    label: 'Shipped',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-600 bg-red-50 border-red-200',
  },
  pending: {
    label: 'Pending',
    color: 'text-gray-600 bg-gray-50 border-gray-200',
  },
} as const;

export const CATEGORIES = [
  { name: 'All Products', path: '/products' },
  { name: 'Electronics', path: '/products?category=Electronics' },
  { name: 'Fashion', path: '/products?category=Fashion' },
  { name: 'Mobiles', path: '/products?category=Mobiles' },
  { name: 'Home & Kitchen', path: '/products?category=Home' },
  { name: 'Books', path: '/products?category=Books' },
  { name: 'Sports', path: '/products?category=Sports' },
];

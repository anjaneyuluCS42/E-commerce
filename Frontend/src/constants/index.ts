// Application-wide constants

const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  // If the env variable is set and is a full URL, use it
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl;
  }
  // Check if we are running in production/on a deployed host
  const isLocalhost = 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1';
  if (!isLocalhost) {
    return 'https://e-commerce-pice.onrender.com';
  }
  // Otherwise, in development, Vite handles proxy of /api
  return envUrl || 'http://localhost:8000';
};

export const API_BASE_URL = getApiBaseUrl();

export const IMAGE_BASE_URL = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;

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

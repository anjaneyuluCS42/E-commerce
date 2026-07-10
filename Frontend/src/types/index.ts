// Shared type definitions for the e-commerce app

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image_url?: string;
}

export interface CartItem extends Product {
  cartQuantity: number;
}

export interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  price: number;
  product?: Product;
}

export interface Order {
  id: number;
  user_id: number;
  total_price: number;
  status?: string;
  created_at?: string;
  items?: OrderItem[];
}

export interface User {
  id?: number;
  email: string;
  username?: string;
}

export type Theme = 'light' | 'dark';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export interface CheckoutFormData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

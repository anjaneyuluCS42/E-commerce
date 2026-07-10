import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import CartItem from '../components/CartItem.tsx';
import EmptyState from '../components/ui/EmptyState.tsx';
import { toast } from '../store/toastStore.ts';
import { formatPrice } from '../utils/formatters.ts';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  FaShoppingBag, FaArrowRight, FaShieldAlt, FaTruck, FaTag,
} from 'react-icons/fa';

export default function Cart() {
  const navigate = useNavigate();
  const { cartItems, loading, removeFromCart, updateQuantity, getTotalPrice, getTotalItems } = useCart();
  const { isLoggedIn } = useAuth();
  const [removingId, setRemovingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const handleQuantityChange = async (productId, newQuantity) => {
    if (newQuantity < 1) return;
    try {
      setUpdatingId(productId);
      await updateQuantity(productId, newQuantity);
    } catch {
      toast.error('Failed to update quantity');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (productId) => {
    try {
      setRemovingId(productId);
      await removeFromCart(productId);
      toast.success('Item removed from cart');
    } catch {
      toast.error('Failed to remove item');
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) return <div className="py-24"><LoadingSpinner /></div>;

  if (!isLoggedIn) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-10">
          <FaShoppingBag className="text-5xl text-blue-200 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 mb-2">Please Log In</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Sign in to see your cart items.</p>
          <Link to="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-md inline-block">
            Log In Now
          </Link>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20">
        <EmptyState
          emoji="🛒"
          title="Your Cart is Empty"
          message="Looks like you haven't added anything yet. Explore thousands of products now!"
          ctaText="Start Shopping"
          ctaLink="/products"
        />
      </div>
    );
  }

  const subtotal = getTotalPrice();
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="flex items-center gap-3 mb-8">
          <FaShoppingBag className="text-blue-600 text-2xl" />
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Shopping Cart</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{getTotalItems()} item{getTotalItems() !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                isRemoving={removingId === item.id}
                isUpdating={updatingId === item.id}
                onRemove={handleRemove}
                onQuantityChange={handleQuantityChange}
              />
            ))}
            <Link to="/products" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold text-sm mt-2">
              ← Continue Shopping
            </Link>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1 space-y-4">
            {/* Coupon */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-blue-300 dark:border-blue-700 p-4 flex items-center gap-3">
              <FaTag className="text-blue-500 flex-shrink-0" />
              <div className="flex-grow">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Have a coupon code?</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Savings applied at checkout</p>
              </div>
              <button className="text-xs font-black text-blue-600 hover:underline">Apply</button>
            </div>

            {/* Price Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 sticky top-24">
              <h2 className="text-lg font-black text-gray-900 dark:text-white mb-5 pb-4 border-b border-gray-100 dark:border-gray-700">
                Price Details
              </h2>

              <div className="space-y-3 text-sm mb-5">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Price ({getTotalItems()} items)</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Discount</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">− {formatPrice(subtotal * 0.3)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Delivery Charges</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">FREE</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Tax (10% GST)</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(tax)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-200 dark:border-gray-600 pt-4 mb-5">
                <div className="flex justify-between items-center">
                  <span className="text-base font-black text-gray-900 dark:text-white">Total Amount</span>
                  <span className="text-2xl font-black text-gray-900 dark:text-white">{formatPrice(total)}</span>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 font-bold mt-1 text-right">
                  You save {formatPrice(subtotal * 0.3)} on this order 🎉
                </p>
              </div>

              <button
                onClick={() => navigate('/checkout')}
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-blue-900 font-black py-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm"
              >
                Proceed to Checkout <FaArrowRight className="text-xs" />
              </button>

              <div className="mt-5 space-y-2 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <FaShieldAlt className="text-green-500" />
                  <span>Safe and Secure Payments</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaTruck className="text-blue-500" />
                  <span>Free delivery on orders over ₹500</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
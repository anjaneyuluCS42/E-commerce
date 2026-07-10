import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCart } from '../hooks/useCart';
import { usePlaceOrder } from '../hooks/useOrders';
import { checkoutSchema } from '../schemas/checkoutSchema.ts';
import { toast } from '../store/toastStore.ts';
import { formatPrice } from '../utils/formatters.ts';
import { getImageUrl } from '../utils/formatters.ts';
import { FaMapMarkerAlt, FaCreditCard, FaCheckCircle, FaSpinner, FaExclamationCircle } from 'react-icons/fa';

// Individual form field with error display
function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
          <FaExclamationCircle className="text-xs flex-shrink-0" /> {error.message}
        </p>
      )}
    </div>
  );
}

const inputClass =
  'w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:focus:ring-amber-400';

export default function Checkout() {
  const navigate = useNavigate();
  const { cartItems, clearCart, getTotalPrice, getTotalItems } = useCart();
  const { mutateAsync: placeOrder, isPending } = usePlaceOrder();
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [upiId, setUpiId] = useState('');
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '' });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(checkoutSchema),
    mode: 'onTouched',
  });

  const onSubmit = async () => {
    try {
      await placeOrder();
      clearCart();
      setOrderPlaced(true);
      toast.success('Order placed successfully! 🎉');
      setTimeout(() => navigate('/orders'), 3000);
    } catch (err) {
      const msg = err?.detail || 'Failed to place order. Please try again.';
      toast.error(msg);
    }
  };

  if (cartItems.length === 0 && !orderPlaced) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-md max-w-md mx-auto border border-gray-100 dark:border-gray-700">
          <p className="text-6xl mb-4">🛒</p>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Your Cart is Empty</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Add items to your cart before checking out.</p>
          <Link to="/products" className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-md">
            Go Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-10 text-center flex flex-col items-center border border-green-100 dark:border-green-900">
          <FaCheckCircle className="text-green-500 text-7xl mb-4 animate-bounce" />
          <h2 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100 mb-2">Order Confirmed!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Thank you for your purchase. Your order was placed successfully.
          </p>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg w-full mb-6 text-sm text-gray-500 dark:text-gray-400">
            Redirecting to your orders dashboard...
          </div>
          <Link to="/orders" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold transition-colors">
            View Orders Now
          </Link>
        </div>
      </div>
    );
  }

  const subtotal = getTotalPrice();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* Progress */}
      <div className="flex items-center justify-center mb-8 gap-4 text-sm font-semibold">
        <span className="text-amber-600 dark:text-amber-400">Cart</span>
        <span className="text-gray-300">——</span>
        <span className="bg-amber-500 text-white rounded-full w-6 h-6 inline-flex items-center justify-center">2</span>
        <span className="text-gray-800 dark:text-gray-200">Checkout</span>
        <span className="text-gray-300">——</span>
        <span className="border border-gray-300 text-gray-400 rounded-full w-6 h-6 inline-flex items-center justify-center">3</span>
        <span className="text-gray-400">Order History</span>
      </div>

      <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-8 tracking-tight">Secure Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-8 space-y-6">

          {/* Shipping Details */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 border-b dark:border-gray-600 pb-4 mb-5">
              <FaMapMarkerAlt className="text-amber-500 text-xl" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Shipping Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Field label="Full Name" error={errors.fullName}>
                  <input
                    {...register('fullName')}
                    type="text"
                    placeholder="Jane Doe"
                    className={`${inputClass} ${errors.fullName ? 'border-red-400 focus:ring-red-400' : 'border-gray-300'}`}
                  />
                </Field>
              </div>
              <Field label="Email Address" error={errors.email}>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="jane@example.com"
                  className={`${inputClass} ${errors.email ? 'border-red-400 focus:ring-red-400' : 'border-gray-300'}`}
                />
              </Field>
              <Field label="Mobile Number" error={errors.phone}>
                <input
                  {...register('phone')}
                  type="tel"
                  placeholder="10-digit number"
                  className={`${inputClass} ${errors.phone ? 'border-red-400 focus:ring-red-400' : 'border-gray-300'}`}
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Address" error={errors.address}>
                  <input
                    {...register('address')}
                    type="text"
                    placeholder="123 Main St, Apt 4B"
                    className={`${inputClass} ${errors.address ? 'border-red-400 focus:ring-red-400' : 'border-gray-300'}`}
                  />
                </Field>
              </div>
              <Field label="City" error={errors.city}>
                <input
                  {...register('city')}
                  type="text"
                  placeholder="Mumbai"
                  className={`${inputClass} ${errors.city ? 'border-red-400 focus:ring-red-400' : 'border-gray-300'}`}
                />
              </Field>
              <Field label="State" error={errors.state}>
                <input
                  {...register('state')}
                  type="text"
                  placeholder="Maharashtra"
                  className={`${inputClass} ${errors.state ? 'border-red-400 focus:ring-red-400' : 'border-gray-300'}`}
                />
              </Field>
              <Field label="Pincode / ZIP Code" error={errors.zipCode}>
                <input
                  {...register('zipCode')}
                  type="text"
                  placeholder="400001"
                  className={`${inputClass} ${errors.zipCode ? 'border-red-400 focus:ring-red-400' : 'border-gray-300'}`}
                />
              </Field>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 border-b dark:border-gray-600 pb-4 mb-5">
              <FaCreditCard className="text-amber-500 text-xl" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Payment Method</h2>
            </div>
            <div className="space-y-4">
              {/* Card */}
              <label className={`flex flex-col p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'card' ? 'border-amber-500 bg-amber-50/30 dark:bg-amber-900/10' : 'border-gray-200 dark:border-gray-600'}`}>
                <div className="flex items-center gap-3 font-semibold text-gray-800 dark:text-gray-200">
                  <input type="radio" name="payment" value="card" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} className="text-amber-500 focus:ring-amber-500" />
                  <span>Credit / Debit Card</span>
                </div>
                {paymentMethod === 'card' && (
                  <div className="mt-4 grid grid-cols-3 gap-3 animate-fadeIn">
                    <div className="col-span-3">
                      <input type="text" placeholder="Card Number" value={cardDetails.number} onChange={(e) => setCardDetails(p => ({ ...p, number: e.target.value }))}
                        className={`${inputClass} border-gray-300`} />
                    </div>
                    <div className="col-span-2">
                      <input type="text" placeholder="MM/YY" value={cardDetails.expiry} onChange={(e) => setCardDetails(p => ({ ...p, expiry: e.target.value }))}
                        className={`${inputClass} border-gray-300`} />
                    </div>
                    <div>
                      <input type="password" placeholder="CVV" value={cardDetails.cvv} onChange={(e) => setCardDetails(p => ({ ...p, cvv: e.target.value }))}
                        className={`${inputClass} border-gray-300`} />
                    </div>
                  </div>
                )}
              </label>

              {/* UPI */}
              <label className={`flex flex-col p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'upi' ? 'border-amber-500 bg-amber-50/30 dark:bg-amber-900/10' : 'border-gray-200 dark:border-gray-600'}`}>
                <div className="flex items-center gap-3 font-semibold text-gray-800 dark:text-gray-200">
                  <input type="radio" name="payment" value="upi" checked={paymentMethod === 'upi'} onChange={() => setPaymentMethod('upi')} className="text-amber-500 focus:ring-amber-500" />
                  <span>UPI (Google Pay, PhonePe, BHIM)</span>
                </div>
                {paymentMethod === 'upi' && (
                  <div className="mt-3 animate-fadeIn">
                    <input type="text" placeholder="yourname@okaxis" value={upiId} onChange={(e) => setUpiId(e.target.value)}
                      className={`${inputClass} border-gray-300`} />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter your virtual payment address.</p>
                  </div>
                )}
              </label>

              {/* COD */}
              <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-amber-500 bg-amber-50/30 dark:bg-amber-900/10' : 'border-gray-200 dark:border-gray-600'}`}>
                <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="text-amber-500 focus:ring-amber-500" />
                <div className="font-semibold text-gray-800 dark:text-gray-200">Cash on Delivery (COD)</div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Link to="/cart" className="flex-1 py-3.5 px-4 text-center font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-all border border-gray-200 dark:border-gray-600">
              Return to Cart
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="flex-2 w-full flex items-center justify-center gap-2 py-3.5 px-6 font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl transition-all shadow-md disabled:opacity-50"
            >
              {isPending ? <><FaSpinner className="animate-spin" /> Placing Order...</> : 'Confirm & Pay'}
            </button>
          </div>
        </form>

        {/* Order Summary */}
        <div className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 sticky top-24">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 border-b dark:border-gray-600 pb-4 mb-4">Summary</h2>
          <div className="max-h-48 overflow-y-auto divide-y dark:divide-gray-600 mb-4">
            {cartItems.map((item) => (
              <div key={item.id} className="flex gap-3 py-3 items-center">
                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden border dark:border-gray-600 flex-shrink-0">
                  <img src={getImageUrl(item.image_url)} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-grow min-w-0">
                  <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">{item.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Qty: {item.cartQuantity}</p>
                </div>
                <p className="font-semibold text-sm text-amber-600 dark:text-amber-400 text-right">
                  {formatPrice(item.price * item.cartQuantity)}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-3 pt-4 border-t dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-400">
            <div className="flex justify-between">
              <span>Subtotal ({getTotalItems()} items):</span>
              <span className="text-gray-900 dark:text-white">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping:</span>
              <span className="text-green-600 dark:text-green-400">FREE</span>
            </div>
            <div className="flex justify-between">
              <span>Taxes (10%):</span>
              <span className="text-gray-900 dark:text-white">{formatPrice(subtotal * 0.1)}</span>
            </div>
            <div className="flex justify-between items-center text-lg text-gray-900 dark:text-white pt-3 border-t dark:border-gray-600">
              <span>Order Total:</span>
              <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                {formatPrice(subtotal * 1.1)}
              </span>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl text-xs text-amber-800 dark:text-amber-300 mt-6 border border-amber-100 dark:border-amber-800 flex items-start gap-2">
            <span>🛡️</span>
            <span>All transactions are secure and encrypted. Buy with confidence.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

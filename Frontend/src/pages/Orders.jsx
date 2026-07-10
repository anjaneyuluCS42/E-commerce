import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOrders } from '../hooks/useOrders';
import { useAuth } from '../hooks/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import { QUERY_KEYS } from '../constants';
import OrderCard from '../components/OrderCard.tsx';
import { OrderCardSkeleton } from '../components/ui/SkeletonLoader.tsx';
import ErrorState from '../components/ui/ErrorState.tsx';
import EmptyState from '../components/ui/EmptyState.tsx';
import { FaClipboardList, FaShoppingBag } from 'react-icons/fa';

export default function Orders() {
  const { isLoggedIn } = useAuth();
  const { data: orders = [], isLoading, isError, error, refetch } = useOrders(isLoggedIn);
  const { lastMessage } = useWebSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'order_update') {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.orders });
    }
  }, [lastMessage, queryClient]);

  if (!isLoggedIn) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-10">
          <FaShoppingBag className="text-5xl text-blue-200 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 mb-2">Please Log In</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Sign in to view your order history.</p>
          <Link
            to="/login"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-md inline-block"
          >
            Log In Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <FaClipboardList className="text-blue-600 text-2xl" />
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">My Orders</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Track and manage all your purchases</p>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <OrderCardSkeleton key={i} />)}
          </div>
        )}

        {isError && (
          <ErrorState
            title="Failed to load orders"
            message={error?.message || 'Could not fetch your orders.'}
            onRetry={refetch}
          />
        )}

        {!isLoading && !isError && orders.length === 0 && (
          <EmptyState
            emoji="📦"
            title="No Orders Yet"
            message="You haven't placed any orders. Start shopping to fill your order history!"
            ctaText="Start Shopping"
            ctaLink="/products"
          />
        )}

        {!isLoading && !isError && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
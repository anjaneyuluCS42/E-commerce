import React from 'react';
import { Link } from 'react-router-dom';
import { getImageUrl, formatPrice, getFallbackImageUrl } from '../utils/formatters';
import type { CartItem as CartItemType } from '../types';
import { FaTrashAlt, FaMinus, FaPlus } from 'react-icons/fa';

interface CartItemProps {
  item: CartItemType;
  isRemoving?: boolean;
  isUpdating?: boolean;
  onRemove: (id: number) => void;
  onQuantityChange: (id: number, qty: number) => void;
}

const CartItem: React.FC<CartItemProps> = ({
  item,
  isRemoving = false,
  isUpdating = false,
  onRemove,
  onQuantityChange,
}) => (
  <div
    className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 transition-opacity ${
      isRemoving ? 'opacity-40 pointer-events-none' : ''
    }`}
  >
    <div className="flex gap-4">
      {/* Image */}
      <Link to={`/product/${item.id}`} className="flex-shrink-0">
        <div className="w-24 h-24 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden flex items-center justify-center">
          <img
            src={getImageUrl(item.image_url)}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const currentSrc = e.currentTarget.src;
              if (currentSrc.startsWith('data:image/svg+xml')) {
                e.currentTarget.onerror = null;
                return;
              }
              const fallbackUrl = getFallbackImageUrl(item.name, item.category || item.category_id);
              if (currentSrc !== fallbackUrl) {
                e.currentTarget.src = fallbackUrl;
              } else {
                e.currentTarget.onerror = null;
                e.currentTarget.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" fill="%239ca3af">${encodeURIComponent(item.name)}</text></svg>`;
              }
            }}
          />
        </div>
      </Link>

      {/* Details */}
      <div className="flex-grow min-w-0">
        <Link
          to={`/product/${item.id}`}
          className="font-bold text-gray-900 dark:text-gray-100 hover:text-blue-600 transition-colors line-clamp-2 text-sm md:text-base"
        >
          {item.name}
        </Link>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{item.description}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-green-600 text-xs font-bold bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded">In Stock</span>
          <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Free Delivery</span>
        </div>

        {/* Price + Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3 mt-4">
          <div>
            <span className="text-lg font-black text-gray-900 dark:text-white">
              {formatPrice(item.price * item.cartQuantity)}
            </span>
            <span className="text-xs text-gray-400 ml-2">({formatPrice(item.price)} each)</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quantity */}
            <div
              className={`flex items-center border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden shadow-sm ${
                isUpdating ? 'opacity-60' : ''
              }`}
            >
              <button
                onClick={() => onQuantityChange(item.id, item.cartQuantity - 1)}
                disabled={item.cartQuantity <= 1 || isUpdating}
                className="px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
                aria-label="Decrease quantity"
              >
                <FaMinus className="text-xs" />
              </button>
              <span className="px-4 py-2 font-black text-gray-900 dark:text-white border-l border-r border-gray-200 dark:border-gray-600 min-w-10 text-center text-sm">
                {item.cartQuantity}
              </span>
              <button
                onClick={() => onQuantityChange(item.id, item.cartQuantity + 1)}
                disabled={item.cartQuantity >= item.stock || isUpdating}
                className="px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
                aria-label="Increase quantity"
              >
                <FaPlus className="text-xs" />
              </button>
            </div>

            {/* Remove */}
            <button
              onClick={() => onRemove(item.id)}
              disabled={isRemoving}
              className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all px-3 py-2 rounded-xl border border-red-100 dark:border-red-900"
            >
              <FaTrashAlt /> Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default CartItem;

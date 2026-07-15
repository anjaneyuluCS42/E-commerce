import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useCartStore } from '../store/cartStore';
import { useAuth } from '../hooks/useAuth';
import { toast } from '../store/toastStore';
import cartService from '../services/cartService';
import productService from '../services/productService';
import { QUERY_KEYS } from '../constants';
import { formatPrice, deriveRating, deriveReviewCount, getImageUrl, getFallbackImageUrl } from '../utils/formatters';
import type { Product } from '../types';
import { FaStar, FaStarHalfAlt, FaShoppingCart, FaBolt } from 'react-icons/fa';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addItem } = useCartStore();
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handlePrefetchProduct = () => {
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.product(product.id),
      queryFn: () => productService.getProductById(product.id),
      staleTime: 1000 * 60 * 5, // Cache valid for 5 minutes
    });
  };

  const rating = parseFloat(deriveRating(product.id));
  const reviewsCount = deriveReviewCount(product.id);
  const isOutOfStock = product.stock <= 0;

  const renderStars = (r: number) => {
    const stars: React.ReactNode[] = [];
    const full = Math.floor(r);
    const half = r % 1 >= 0.5;
    for (let i = 1; i <= 5; i++) {
      if (i <= full)
        stars.push(<FaStar key={i} className="text-yellow-500 text-sm" />);
      else if (i === full + 1 && half)
        stars.push(<FaStarHalfAlt key={i} className="text-yellow-500 text-sm" />);
      else
        stars.push(<FaStar key={i} className="text-gray-300 text-sm" />);
    }
    return stars;
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isLoggedIn) { navigate('/login'); return; }
    try {
      setLoading(true);
      // Sync with backend cart
      await cartService.addToCart(product.id, 1);
      // Update Zustand store
      addItem({ ...product, cartQuantity: 1 });
      setStatusMessage('Added!');
      toast.success(`${product.name} added to cart`);
      setTimeout(() => setStatusMessage(''), 2000);
    } catch (err: any) {
      setStatusMessage('Failed');
      toast.error('Failed to add to cart');
      setTimeout(() => setStatusMessage(''), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNow = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isLoggedIn) { navigate('/login'); return; }
    try {
      setLoading(true);
      await cartService.addToCart(product.id, 1);
      addItem({ ...product, cartQuantity: 1 });
      navigate('/checkout');
    } catch {
      toast.error('Failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onMouseEnter={handlePrefetchProduct}
      className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg border border-gray-100 dark:border-gray-700 hover:border-gray-200 transition-all duration-300 flex flex-col h-full overflow-hidden relative transform hover:-translate-y-1"
    >
      <Link to={`/product/${product.id}`} className="flex flex-col h-full flex-grow">

        {/* Image */}
        <div className="relative bg-gray-50 dark:bg-gray-900 h-56 flex items-center justify-center overflow-hidden border-b border-gray-100 dark:border-gray-700 p-4">
          <img
            src={getImageUrl(product.image_url)}
            alt={product.name}
            className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              const currentSrc = e.currentTarget.src;
              if (currentSrc.startsWith('data:image/svg+xml')) {
                e.currentTarget.onerror = null;
                return;
              }
              const fallbackUrl = getFallbackImageUrl(product.name, product.category || product.category_id);
              if (currentSrc !== fallbackUrl) {
                e.currentTarget.src = fallbackUrl;
              } else {
                e.currentTarget.onerror = null;
                e.currentTarget.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" fill="%239ca3af">${encodeURIComponent(product.name)}</text></svg>`;
              }
            }}
          />
          {isOutOfStock && (
            <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 flex items-center justify-center">
              <span className="bg-red-600 text-white font-extrabold text-xs px-3 py-1.5 rounded-full shadow-md uppercase">
                Out of Stock
              </span>
            </div>
          )}
          {product.stock > 0 && product.stock <= 5 && (
            <span className="absolute top-3 left-3 bg-orange-500 text-white font-black text-xs px-2 py-0.5 rounded shadow">
              Only {product.stock} Left
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-grow">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm md:text-base line-clamp-2 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-grow">
            {product.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1.5 mt-2 mb-1.5">
            <span className="bg-green-600 text-white font-bold text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5">
              {rating.toFixed(1)} <FaStar className="text-xs" />
            </span>
            <div className="flex items-center">{renderStars(rating)}</div>
            <span className="text-xs text-gray-500 dark:text-gray-400">({reviewsCount})</span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2 mt-auto">
            <span className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">
              {formatPrice(product.price)}
            </span>
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(product.price * 1.3)}
            </span>
            <span className="text-xs text-green-600 font-bold">30% Off</span>
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">Free Delivery</div>
        </div>
      </Link>

      {/* Action Buttons */}
      <div className="p-4 pt-0 border-t border-gray-50 dark:border-gray-700 mt-auto flex gap-2">
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock || loading}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-bold rounded-lg transition-colors border select-none ${
            isOutOfStock
              ? 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-white dark:bg-gray-800 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30'
          }`}
        >
          <FaShoppingCart className="text-xs" />
          <span>{statusMessage || 'Add to Cart'}</span>
        </button>

        <button
          onClick={handleBuyNow}
          disabled={isOutOfStock || loading}
          className={`flex-1 flex items-center justify-center gap-1 py-2 px-1 text-xs font-bold rounded-lg transition-colors select-none text-white ${
            isOutOfStock
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 shadow-sm'
          }`}
        >
          <FaBolt className="text-xs" />
          <span>Buy Now</span>
        </button>
      </div>
    </div>
  );
};

export default ProductCard;

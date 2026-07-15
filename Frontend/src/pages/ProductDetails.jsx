import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import productService from '../services/productService';
import LoadingSpinner from '../components/LoadingSpinner';
import ProductCard from '../components/ProductCard.tsx';
import { getImageUrl, getFallbackImageUrl } from '../utils/formatters.ts';
import { toast } from '../store/toastStore.ts';
import {
  FaStar, FaStarHalfAlt, FaShoppingCart, FaBolt, FaCheckCircle,
  FaShieldAlt, FaUndo, FaTruck, FaHeadset, FaChevronLeft, FaChevronRight, FaShareAlt,
} from 'react-icons/fa';

const getRelatedProducts = (currentProduct, allProducts) => {
  if (!currentProduct || !allProducts) return [];
  
  // Exclude current product
  const candidates = allProducts.filter(p => p.id !== currentProduct.id);
  
  // Extract keywords for similarity matching
  const getKeywords = (prod) => {
    const text = `${prod.name} ${prod.description || ''}`.toLowerCase();
    const keywords = [];
    
    // Categorize
    if (text.includes('phone') || text.includes('mobile') || text.includes('iphone') || text.includes('samsung') || text.includes('vivo')) {
      keywords.push('category:mobile');
    }
    if (text.includes('laptop') || text.includes('notebook') || text.includes('computer') || text.includes('dell')) {
      keywords.push('category:laptop');
    }
    
    // Brand detection
    ['apple', 'iphone', 'samsung', 'vivo', 'dell'].forEach(brand => {
      if (text.includes(brand)) keywords.push(`brand:${brand}`);
    });
    
    return keywords;
  };
  
  const currentKeywords = getKeywords(currentProduct);
  
  const scored = candidates.map(prod => {
    const candidateKeywords = getKeywords(prod);
    
    // Calculate matching keywords score
    const matches = candidateKeywords.filter(kw => currentKeywords.includes(kw));
    let score = matches.length * 15;
    
    // Score based on price proximity (closer price = higher score, max additional 10 points)
    const priceDiff = Math.abs(prod.price - currentProduct.price);
    const maxPrice = Math.max(prod.price, currentProduct.price) || 1;
    const priceScore = (1 - (priceDiff / maxPrice)) * 10;
    score += priceScore;
    
    return { product: prod, score };
  });
  
  // Sort candidates by score descending and return the top 4
  return scored
    .sort((a, b) => b.score - a.score)
    .map(s => s.product)
    .slice(0, 4);
};

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isLoggedIn } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const { data: product, loading: fetching, error } = useFetch(
    () => productService.getProductById(id),
    [id]
  );

  const { data: allProducts, loading: loadingRelated } = useFetch(
    () => productService.getAllProducts(),
    []
  );

  const relatedProducts = allProducts && product
    ? getRelatedProducts(product, allProducts)
    : [];

  const productImages = product && product.images && product.images.length > 0
    ? product.images
    : product ? [product.image_url] : [];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveImageIndex(0);
  }, [id]);

  useEffect(() => {
    if (productImages.length <= 1) return;
    const interval = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % productImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeImageIndex, productImages.length]);

  const rating = product ? ((product.id % 15) * 0.1 + 3.5).toFixed(1) : 0;
  const reviewsCount = product ? (product.id * 37) % 450 + 12 : 0;
  const mrp = product ? (product.price * 1.3).toFixed(0) : 0;
  const discount = '30% off';

  const renderStars = (r) => {
    const stars = [];
    const full = Math.floor(r);
    const half = r % 1 >= 0.5;
    for (let i = 1; i <= 5; i++) {
      if (i <= full) stars.push(<FaStar key={i} className="text-yellow-500" />);
      else if (i === full + 1 && half) stars.push(<FaStarHalfAlt key={i} className="text-yellow-500" />);
      else stars.push(<FaStar key={i} className="text-gray-300" />);
    }
    return stars;
  };

  const setMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 2500);
  };

  const handleShareLink = () => {
    const productUrl = window.location.href;
    navigator.clipboard.writeText(productUrl)
      .then(() => {
        toast.success('Product link copied to clipboard!');
      })
      .catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = productUrl;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          toast.success('Product link copied to clipboard!');
        } catch (err) {
          toast.error('Failed to copy link.');
        }
        document.body.removeChild(textArea);
      });
  };

  const handleAddToCart = async () => {
    if (!isLoggedIn) { navigate('/login'); return; }
    try {
      setLoading(true);
      await addToCart(parseInt(id), quantity);
      setMsg('Added to cart successfully!', 'success');
    } catch {
      setMsg('Failed to add to cart.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNow = async () => {
    if (!isLoggedIn) { navigate('/login'); return; }
    try {
      setLoading(true);
      await addToCart(parseInt(id), quantity);
      navigate('/checkout');
    } catch {
      setMsg('Failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="py-24"><LoadingSpinner /></div>;

  if (error || !product) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">😕</p>
        <p className="text-red-600 font-bold text-lg mb-6">{error || 'Product not found'}</p>
        <button
          onClick={() => navigate('/products')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold"
        >
          Back to Products
        </button>
      </div>
    );
  }

  const isOutOfStock = product.stock <= 0;
  const stockWarning = product.stock > 0 && product.stock <= 5;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Breadcrumb */}
        <button
          onClick={() => navigate('/products')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm mb-6"
        >
          <FaChevronLeft className="text-xs" /> Back to Products
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">

            {/* Left: Product Image Slider & Thumbnails */}
            <div className="relative bg-gray-50 flex flex-col items-center justify-center p-8 border-r border-gray-100 min-h-96">
              {/* Main Image Slider */}
              <div className="w-full flex-grow flex items-center justify-center min-h-[320px] relative group">
                <img
                  src={getImageUrl(productImages[activeImageIndex])}
                  alt={product.name}
                  className="max-h-80 max-w-full object-contain transition-all duration-500 ease-in-out transform hover:scale-105"
                  key={activeImageIndex}
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
                {productImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImageIndex((prev) => (prev - 1 + productImages.length) % productImages.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 p-2 rounded-full shadow-md border border-gray-100 dark:border-gray-700 transition-all opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer z-10"
                      title="Previous Image"
                    >
                      <FaChevronLeft className="text-sm" />
                    </button>
                    <button
                      onClick={() => setActiveImageIndex((prev) => (prev + 1) % productImages.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 p-2 rounded-full shadow-md border border-gray-100 dark:border-gray-700 transition-all opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer z-10"
                      title="Next Image"
                    >
                      <FaChevronRight className="text-sm" />
                    </button>
                  </>
                )}
                {isOutOfStock && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-xxs flex items-center justify-center">
                    <span className="bg-red-600 text-white font-black text-sm px-6 py-2.5 rounded-full shadow-lg">
                      Out of Stock
                    </span>
                  </div>
                )}
                {stockWarning && (
                  <span className="absolute top-4 left-4 bg-orange-500 text-white text-xs font-black px-3 py-1.5 rounded-full shadow">
                    Only {product.stock} Left!
                  </span>
                )}
              </div>

              {/* Thumbnails Row */}
              {productImages.length > 1 && (
                <div className="flex gap-2.5 mt-6 overflow-x-auto py-1 scrollbar-none justify-center w-full">
                  {productImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      onMouseEnter={() => setActiveImageIndex(idx)}
                      className={`w-14 h-14 rounded-xl overflow-hidden bg-white border-2 transition-all duration-200 shadow-sm transform hover:scale-105 active:scale-95 ${
                        activeImageIndex === idx
                          ? 'border-blue-600 ring-2 ring-blue-500/20'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                      }`}
                    >
                      <img
                        src={getImageUrl(img)}
                        alt={`Thumbnail ${idx}`}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          e.currentTarget.src = 'https://placehold.co/100x100/e2e8f0/475569?text=ShopHub';
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Product Details */}
            <div className="p-8 flex flex-col">

              {/* Title */}
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight mb-3">
                {product.name}
              </h1>

              {/* Rating Row with Share Button */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="bg-green-600 text-white font-black text-xs px-2.5 py-1 rounded flex items-center gap-1">
                    {rating} <FaStar className="text-xxs" />
                  </span>
                  <div className="flex items-center gap-0.5">
                    {renderStars(parseFloat(rating))}
                  </div>
                  <span className="text-sm text-gray-500">({reviewsCount.toLocaleString()} ratings)</span>
                </div>
                <button
                  onClick={handleShareLink}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl px-3 py-1.5 transition-colors shadow-sm cursor-pointer"
                  title="Copy Product Link"
                >
                  <FaShareAlt className="text-xs" /> Share Link
                </button>
              </div>

              <div className="border-t border-gray-100 pt-4 mb-4">
                {/* Pricing */}
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="text-3xl font-black text-gray-900">
                    ₹{product.price.toLocaleString('en-IN')}
                  </span>
                  <span className="text-base text-gray-400 line-through">₹{parseInt(mrp).toLocaleString('en-IN')}</span>
                  <span className="text-base font-bold text-green-600">{discount}</span>
                </div>
                <p className="text-xs text-gray-500">Inclusive of all taxes. Free delivery available.</p>

                {/* Stock Status */}
                <div className="mt-3">
                  {isOutOfStock ? (
                    <span className="text-red-600 font-bold text-sm">Out of Stock</span>
                  ) : (
                    <span className="text-green-600 font-bold text-sm flex items-center gap-1.5">
                      <FaCheckCircle /> In Stock
                      {stockWarning && <span className="text-orange-600 ml-1">— Hurry! Only {product.stock} left</span>}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-600 text-sm leading-relaxed mb-6 border-b border-gray-100 pb-6">
                {product.description || 'No description available for this product.'}
              </p>

              {/* Quantity Selector */}
              {!isOutOfStock && (
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-sm font-bold text-gray-700">Qty:</span>
                  <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden shadow-sm">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 transition-colors font-bold text-lg leading-none"
                    >
                      −
                    </button>
                    <span className="w-12 text-center font-black text-gray-900 border-l border-r border-gray-300 py-2.5">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 transition-colors font-bold text-lg leading-none"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs text-gray-500">{product.stock} units available</span>
                </div>
              )}

              {/* Status Message */}
              {message.text && (
                <div
                  className={`mb-4 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                    message.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {message.type === 'success' ? <FaCheckCircle /> : '⚠️'} {message.text}
                </div>
              )}

              {/* CTA Buttons */}
              <div className="flex gap-3 flex-col sm:flex-row mt-auto">
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || loading}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-black text-sm transition-all border-2 ${
                    isOutOfStock
                      ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'border-blue-600 text-blue-600 bg-white hover:bg-blue-50 shadow-sm'
                  }`}
                >
                  <FaShoppingCart /> Add to Cart
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock || loading}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-black text-sm transition-all text-white shadow-md ${
                    isOutOfStock
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600'
                  }`}
                >
                  <FaBolt /> Buy Now
                </button>
              </div>

              {/* Assurances */}
              <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-gray-100 text-xs text-gray-600">
                <div className="flex items-start gap-2">
                  <FaTruck className="text-blue-600 text-base mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-gray-800">Free Delivery</p>
                    <p>On orders over ₹500</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FaUndo className="text-blue-600 text-base mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-gray-800">7-Day Returns</p>
                    <p>Hassle-free return policy</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FaShieldAlt className="text-blue-600 text-base mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-gray-800">Secure Payment</p>
                    <p>100% secure checkout</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FaHeadset className="text-blue-600 text-base mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-gray-800">24/7 Support</p>
                    <p>Get help whenever needed</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* You Might Also Like Section */}
        <div className="mt-12 mb-6">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <span>You Might Also Like</span>
            <span className="h-0.5 flex-1 bg-gray-200 dark:bg-gray-800 rounded-full ml-4 hidden sm:block"></span>
          </h2>
          
          {loadingRelated ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 h-80 animate-pulse flex flex-col justify-between">
                  <div className="bg-gray-100 dark:bg-gray-900 rounded-lg h-44 w-full"></div>
                  <div className="space-y-3 mt-4">
                    <div className="h-4 bg-gray-100 dark:bg-gray-900 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-100 dark:bg-gray-900 rounded w-1/2"></div>
                  </div>
                  <div className="h-8 bg-gray-100 dark:bg-gray-900 rounded w-full mt-4"></div>
                </div>
              ))}
            </div>
          ) : relatedProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
              <p className="text-gray-500 text-sm">No related products found.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
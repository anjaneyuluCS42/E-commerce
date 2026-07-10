import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import ProductCard from '../components/ProductCard.tsx';
import { SkeletonGrid } from '../components/ui/SkeletonLoader.tsx';
import ErrorState from '../components/ui/ErrorState.tsx';
import { FaChevronLeft, FaChevronRight, FaShippingFast, FaLock, FaUndo, FaHeadset, FaArrowRight } from 'react-icons/fa';

export default function Home() {
  const { data: products = [], isLoading, isError, error, refetch } = useProducts();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Mega Electronics Days",
      subtitle: "Up to 50% Off on Laptops, Headphones & More",
      bgClass: "from-blue-600 via-indigo-600 to-purple-700",
      ctaText: "Shop Electronics",
      link: "/products?category=Electronics",
      tag: "Limited Time Offer"
    },
    {
      title: "Fashion Carnival Live",
      subtitle: "Styles for men, women & kids. Extra 10% off for new users",
      bgClass: "from-pink-500 via-rose-500 to-orange-500",
      ctaText: "Explore Fashion",
      link: "/products?category=Fashion",
      tag: "Trending Styles"
    },
    {
      title: "Upgrade Your Smart Living",
      subtitle: "Deals on Home Appliances, Kitchenwares & Decors",
      bgClass: "from-teal-600 via-emerald-600 to-green-700",
      ctaText: "Shop Home Deals",
      link: "/products?category=Home",
      tag: "Best Sellers"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);

  const featuredProducts = products.slice(0, 4);
  const trendingProducts = products.slice(4, 8);

  const categories = [
    { name: 'Electronics', icon: '📱', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    { name: 'Fashion', icon: '👕', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
    { name: 'Mobiles', icon: '📞', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
    { name: 'Home & Kitchen', icon: '🍳', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    { name: 'Books', icon: '📚', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
    { name: 'Sports', icon: '⚽', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  ];

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen transition-colors">

      {/* Category Quick Nav */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between overflow-x-auto whitespace-nowrap gap-6 scrollbar-hide">
            {categories.map((cat, idx) => (
              <Link
                key={idx}
                to={`/products?category=${encodeURIComponent(cat.name)}`}
                className="flex flex-col items-center gap-1.5 min-w-[70px] group cursor-pointer"
              >
                <div className={`w-14 h-14 rounded-full ${cat.color} flex items-center justify-center text-2xl shadow-sm transition-transform duration-300 group-hover:scale-110`}>
                  {cat.icon}
                </div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition-colors">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Hero Carousel */}
      <div className="relative overflow-hidden h-72 md:h-96 shadow-inner bg-gray-900 group">
        <div
          className="flex h-full transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`w-full h-full flex-shrink-0 bg-gradient-to-r ${slide.bgClass} flex items-center relative text-white px-8 sm:px-16 md:px-24`}
            >
              <div className="absolute right-0 top-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10" />
              <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10" />
              <div className="max-w-2xl z-10 animate-fadeIn">
                <span className="inline-block bg-white/20 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider mb-3">
                  {slide.tag}
                </span>
                <h1 className="text-3xl md:text-5xl font-black mb-3 leading-tight tracking-tight">
                  {slide.title}
                </h1>
                <p className="text-sm md:text-lg mb-6 text-white/90 font-medium">{slide.subtitle}</p>
                <Link
                  to={slide.link}
                  className="inline-flex items-center gap-2 bg-yellow-400 text-blue-900 font-extrabold px-6 py-3 rounded-lg hover:bg-yellow-300 transition-all shadow-md transform hover:-translate-y-0.5"
                >
                  <span>{slide.ctaText}</span>
                  <FaArrowRight className="text-xs" />
                </Link>
              </div>
            </div>
          ))}
        </div>
        <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white w-10 h-10 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20">
          <FaChevronLeft className="text-lg" />
        </button>
        <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white w-10 h-10 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20">
          <FaChevronRight className="text-lg" />
        </button>
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all ${currentSlide === index ? 'bg-yellow-400 w-6' : 'bg-white/50 hover:bg-white'}`}
            />
          ))}
        </div>
      </div>

      {/* Services */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          {[
            { Icon: FaShippingFast, title: 'Free Shipping', sub: 'On all orders above ₹500' },
            { Icon: FaLock,         title: 'Secure Payment', sub: '100% encrypted checkout' },
            { Icon: FaUndo,         title: 'Easy Returns',   sub: '7-day hassle-free returns' },
            { Icon: FaHeadset,      title: '24/7 Support',   sub: 'Get help whenever you need' },
          ].map(({ Icon, title, sub }) => (
            <div key={title} className="flex items-center gap-3">
              <Icon className="text-blue-600 text-2xl md:text-3xl flex-shrink-0" />
              <div>
                <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">{title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Products Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {isLoading ? (
          <div className="space-y-12">
            <div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6 animate-pulse" />
              <SkeletonGrid count={4} />
            </div>
          </div>
        ) : isError ? (
          <ErrorState
            title="Failed to load products"
            message={error?.message || 'Could not fetch products from the server.'}
            onRetry={refetch}
          />
        ) : products.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8 shadow-sm">
            <p className="text-gray-600 dark:text-gray-400 font-bold mb-2">No Products Available</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">Connect to your FastAPI backend and verify that products are seeded.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {featuredProducts.length > 0 && (
              <div>
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">Featured Products</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Top-picked recommendations for you</p>
                  </div>
                  <Link to="/products" className="text-blue-600 hover:text-blue-700 font-extrabold text-sm flex items-center gap-1">
                    <span>View All</span><FaArrowRight className="text-xs" />
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {featuredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            )}

            {trendingProducts.length > 0 && (
              <div>
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">Trending Now</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">Bestsellers trending in the last 24 hours</p>
                  </div>
                  <Link to="/products" className="text-blue-600 hover:text-blue-700 font-extrabold text-sm flex items-center gap-1">
                    <span>View All</span><FaArrowRight className="text-xs" />
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {trendingProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Newsletter */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold mb-3 leading-tight tracking-tight">Stay updated with latest deals</h2>
          <p className="text-blue-100 text-sm md:text-base mb-8 max-w-lg mx-auto font-medium">
            Sign up to receive notification warnings, exclusive coupons, and special festive offers.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email address"
              className="flex-1 px-4 py-3 rounded-lg text-gray-800 focus:outline-none text-sm placeholder-gray-400 font-medium"
            />
            <button className="bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-black px-6 py-3 rounded-lg transition-colors text-sm shadow">
              Subscribe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

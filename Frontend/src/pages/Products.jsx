import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import ProductCard from '../components/ProductCard.tsx';
import { SkeletonGrid } from '../components/ui/SkeletonLoader.tsx';
import ErrorState from '../components/ui/ErrorState.tsx';
import {
  FaSearch, FaSlidersH, FaSort, FaTimes, FaFilter
} from 'react-icons/fa';

const SORT_OPTIONS = [
  { label: 'Relevance', value: 'latest' },
  { label: 'Price: Low to High', value: 'price-low' },
  { label: 'Price: High to Low', value: 'price-high' },
  { label: 'Top Rated', value: 'rating' },
];

const PRICE_RANGES = [
  { label: 'Under ₹500', min: 0, max: 500 },
  { label: '₹500 – ₹2,000', min: 500, max: 2000 },
  { label: '₹2,000 – ₹10,000', min: 2000, max: 10000 },
  { label: 'Above ₹10,000', min: 10000, max: Infinity },
];

const FilterPanel = ({
  sortBy,
  setSortBy,
  selectedPriceRange,
  setSelectedPriceRange,
  inStockOnly,
  setInStockOnly,
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 space-y-6 text-sm">
    {/* Sort */}
    <div>
      <h3 className="font-black text-gray-800 flex items-center gap-2 mb-3">
        <FaSort className="text-blue-600" /> Sort By
      </h3>
      <div className="space-y-2">
        {SORT_OPTIONS.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="sort"
              value={opt.value}
              checked={sortBy === opt.value}
              onChange={() => setSortBy(opt.value)}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span className={sortBy === opt.value ? 'font-bold text-blue-600' : 'text-gray-700'}>
              {opt.label}
            </span>
          </label>
        ))}
      </div>
    </div>

    <div className="border-t border-gray-100" />

    {/* Price Range */}
    <div>
      <h3 className="font-black text-gray-800 flex items-center gap-2 mb-3">
        <FaSlidersH className="text-blue-600" /> Price Range
      </h3>
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="price"
            checked={selectedPriceRange === null}
            onChange={() => setSelectedPriceRange(null)}
            className="text-blue-600 focus:ring-blue-500"
          />
          <span className={!selectedPriceRange ? 'font-bold text-blue-600' : 'text-gray-700'}>
            All Prices
          </span>
        </label>
        {PRICE_RANGES.map((range) => (
          <label key={range.label} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="price"
              checked={selectedPriceRange?.label === range.label}
              onChange={() => setSelectedPriceRange(range)}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span
              className={
                selectedPriceRange?.label === range.label
                  ? 'font-bold text-blue-600'
                  : 'text-gray-700'
              }
            >
              {range.label}
            </span>
          </label>
        ))}
      </div>
    </div>

    <div className="border-t border-gray-100" />

    {/* Availability */}
    <div>
      <h3 className="font-black text-gray-800 mb-3">Availability</h3>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={inStockOnly}
          onChange={(e) => setInStockOnly(e.target.checked)}
          className="rounded text-blue-600 focus:ring-blue-500"
        />
        <span className="text-gray-700">In Stock Only</span>
      </label>
    </div>

    {/* Reset Filters */}
    {(selectedPriceRange || inStockOnly || sortBy !== 'latest') && (
      <button
        onClick={() => {
          setSelectedPriceRange(null);
          setInStockOnly(false);
          setSortBy('latest');
        }}
        className="w-full text-center text-xs font-bold text-red-600 hover:text-red-700 flex items-center justify-center gap-1 border border-red-200 rounded-lg py-2"
      >
        <FaTimes className="text-xs" /> Clear Filters
      </button>
    )}
  </div>
);

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState('latest');
  const [selectedPriceRange, setSelectedPriceRange] = useState(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const currentSearch = searchParams.get('search') || '';

  // Synchronize searchQuery with search URL parameters on changes (e.g. back navigation)
  useEffect(() => {
    setSearchQuery(currentSearch);
  }, [currentSearch]);

  // Debounced search query parameter updates to prevent flooding the backend
  useEffect(() => {
    const handler = setTimeout(() => {
      const currentCategory = searchParams.get('category');
      const nextParams = {};
      if (currentCategory) nextParams.category = currentCategory;
      if (searchQuery.trim()) nextParams.search = searchQuery.trim();
      
      setSearchParams(nextParams);
      setCurrentPage(1); // Reset to page 1 on search change
    }, 450);

    return () => clearTimeout(handler);
  }, [searchQuery, setSearchParams, searchParams]);

  // Reset to page 1 if other filters or sorting options are changed
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPriceRange, sortBy, inStockOnly]);

  // Map category name parameter to database ID
  const CATEGORY_MAP = {
    'Electronics': 1,
    'Fashion': 2,
    'Mobiles': 3,
    'Home & Kitchen': 4,
    'Home': 4,
    'Books': 5,
    'Sports': 6,
  };
  const categoryParam = searchParams.get('category');
  const categoryId = categoryParam ? CATEGORY_MAP[categoryParam] : undefined;

  // Resolve sort order key for the backend
  const backendSortBy = useMemo(() => {
    if (sortBy === 'price-low') return 'price_asc';
    if (sortBy === 'price-high') return 'price_desc';
    if (sortBy === 'newest') return 'newest';
    return undefined; // Default search relevance or id sort
  }, [sortBy]);

  // Fetch paginated, filtered, and searched products from Postgres
  const { data: rawProducts = [], isLoading: loading, isError, refetch } = useProducts({
    search: currentSearch.trim() ? currentSearch.trim() : undefined,
    category_id: categoryId,
    min_price: selectedPriceRange?.min,
    max_price: selectedPriceRange?.max === Infinity ? undefined : selectedPriceRange?.max,
    sort_by: backendSortBy,
    skip: (currentPage - 1) * 12,
    limit: 13, // Fetch 13 items to check if there is a next page
  });

  const error = isError ? 'Failed to load products' : null;

  // Local filter for stock availability (stock check can remain local or be added as DB query filter)
  const products = useMemo(() => {
    if (inStockOnly) {
      return rawProducts.filter(p => p.stock > 0);
    }
    return rawProducts;
  }, [rawProducts, inStockOnly]);

  // Keyset / Lookahead pagination calculations
  const hasMore = products.length > 12;
  const displayedProducts = useMemo(() => {
    return hasMore ? products.slice(0, 12) : products;
  }, [products, hasMore]);

  const clearSearch = () => {
    setSearchQuery('');
    setSearchParams({});
    setCurrentPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">
          {currentSearch 
            ? `Results for "${currentSearch}"` 
            : searchParams.get('category') 
              ? searchParams.get('category') 
              : 'All Products'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {!loading && `Showing ${displayedProducts.length} products on page ${currentPage}`}
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex gap-2">
        <div className="flex-1 relative">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            placeholder="Search for products, brands and more..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm shadow-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FaTimes />
            </button>
          )}
        </div>
        
        {/* Mobile Filter Toggle */}
        <button
          type="button"
          onClick={() => setShowMobileFilters(true)}
          className="lg:hidden bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-xl flex items-center gap-2 shadow-sm text-sm font-semibold"
        >
          <FaFilter /> Filters
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Sidebar: Desktop */}
        <div className="hidden lg:block lg:col-span-1 sticky top-24">
          <FilterPanel
            sortBy={sortBy}
            setSortBy={setSortBy}
            selectedPriceRange={selectedPriceRange}
            setSelectedPriceRange={setSelectedPriceRange}
            inStockOnly={inStockOnly}
            setInStockOnly={setInStockOnly}
          />
        </div>

        {/* Mobile Filter Drawer */}
        {showMobileFilters && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowMobileFilters(false)}
            />
            <div className="relative ml-auto w-80 max-w-full bg-white h-full overflow-y-auto shadow-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-black text-gray-900 text-lg">Filters</h2>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  <FaTimes className="text-gray-500" />
                </button>
              </div>
              <FilterPanel
                sortBy={sortBy}
                setSortBy={setSortBy}
                selectedPriceRange={selectedPriceRange}
                setSelectedPriceRange={setSelectedPriceRange}
                inStockOnly={inStockOnly}
                setInStockOnly={setInStockOnly}
              />
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Main Products Area */}
        <div className="lg:col-span-3">
          {loading && <SkeletonGrid count={6} />}

          {error && !loading && (
            <ErrorState
              title="Failed to load products"
              message={error}
              onRetry={refetch}
            />
          )}

          {!loading && !error && displayedProducts.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border p-8 shadow-sm">
              <p className="text-5xl mb-4">🔍</p>
              <p className="font-bold text-gray-700 text-lg mb-2">No products found</p>
              <p className="text-sm text-gray-500 mb-6">
                {currentSearch
                  ? `We couldn't find anything matching "${currentSearch}".`
                  : 'Try adjusting your filters.'}
              </p>
              <button
                onClick={clearSearch}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm"
              >
                Clear Search
              </button>
            </div>
          )}

          {!loading && !error && displayedProducts.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {displayedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Lookahead Pagination Controls */}
              <div className="flex justify-center items-center gap-4 mt-8">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-4 py-2 border border-gray-200 rounded-xl bg-white dark:bg-gray-800 disabled:opacity-50 font-semibold text-sm cursor-pointer transition-opacity"
                >
                  Previous
                </button>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  Page {currentPage}
                </span>
                <button
                  disabled={!hasMore}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="px-4 py-2 border border-gray-200 rounded-xl bg-white dark:bg-gray-800 disabled:opacity-50 font-semibold text-sm cursor-pointer transition-opacity"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';

export default function Sidebar({ onFilterChange }) {
  const [priceRange, setPriceRange] = useState([0, 100000]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortBy, setSortBy] = useState('latest');

  const categories = [
    'Electronics',
    'Clothing',
    'Books',
    'Home & Garden',
    'Sports',
    'Toys',
  ];

  const handleCategoryChange = (category) => {
    const updated = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];
    setSelectedCategories(updated);
    onFilterChange({ categories: updated, priceRange, sortBy });
  };

  const handlePriceChange = (e) => {
    const newRange = [0, parseInt(e.target.value)];
    setPriceRange(newRange);
    onFilterChange({ categories: selectedCategories, priceRange: newRange, sortBy });
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    onFilterChange({ categories: selectedCategories, priceRange, sortBy: e.target.value });
  };

  const handleReset = () => {
    setPriceRange([0, 100000]);
    setSelectedCategories([]);
    setSortBy('latest');
    onFilterChange({ categories: [], priceRange: [0, 100000], sortBy: 'latest' });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Filters</h2>

      {/* Sort By */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Sort By</h3>
        <select
          value={sortBy}
          onChange={handleSortChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="latest">Latest</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="rating">Top Rated</option>
        </select>
      </div>

      {/* Price Range */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Price Range</h3>
        <input
          type="range"
          min="0"
          max="100000"
          value={priceRange[1]}
          onChange={handlePriceChange}
          className="w-full"
        />
        <p className="text-sm text-gray-600 mt-2">
          ₹0 - ₹{priceRange[1].toLocaleString('en-IN')}
        </p>
      </div>

      {/* Categories */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Categories</h3>
        <div className="space-y-3">
          {categories.map(category => (
            <label key={category} className="flex items-center">
              <input
                type="checkbox"
                checked={selectedCategories.includes(category)}
                onChange={() => handleCategoryChange(category)}
                className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
              />
              <span className="ml-3 text-gray-700">{category}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Reset Filters */}
      <button
        onClick={handleReset}
        className="w-full py-2 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors font-semibold"
      >
        Reset Filters
      </button>
    </div>
  );
}

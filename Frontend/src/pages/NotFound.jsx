import { Link } from 'react-router-dom';
import { FaHome, FaShoppingBag } from 'react-icons/fa';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* 404 Number */}
        <div className="relative mb-6">
          <p className="text-9xl font-black text-blue-100 select-none">404</p>
          <p className="absolute inset-0 text-9xl font-black text-blue-600 opacity-10 blur-sm select-none">404</p>
        </div>
        
        <p className="text-6xl mb-6">🛍️</p>
        <h1 className="text-3xl font-black text-gray-900 mb-3">Page Not Found</h1>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          Oops! The page you're looking for doesn't exist or may have been moved.
          Let's get you back to shopping!
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-md transition-all"
          >
            <FaHome /> Go Home
          </Link>
          <Link
            to="/products"
            className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold shadow-sm transition-all"
          >
            <FaShoppingBag /> Browse Products
          </Link>
        </div>
      </div>
    </div>
  );
}

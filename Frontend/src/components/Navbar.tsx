import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCartStore } from '../store/cartStore';
import { useThemeStore, applyTheme } from '../store/themeStore';
import { CATEGORIES } from '../constants';
import WebSocketStatus from './WebSocketStatus';
import {
  FaShoppingCart, FaSearch, FaUser, FaSignOutAlt, FaBars,
  FaTimes, FaShoppingBag, FaTag, FaChevronDown, FaSun, FaMoon,
  FaUserShield, FaBell, FaHeadset,
} from 'react-icons/fa';
import NotificationPanel from './NotificationPanel';
import { useWebSocket } from '../hooks/useWebSocket';

const Navbar: React.FC = () => {
  const { user, isLoggedIn, logout } = useAuth();
  const { getTotalItems } = useCartStore();
  const { theme, toggleTheme } = useThemeStore();
  const { unreadCount } = useWebSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Apply saved theme on mount
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Close profile dropdown and notification dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
    navigate('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
      setIsMenuOpen(false);
    }
  };

  const totalItems = getTotalItems();

  return (
    <nav className="bg-blue-600 dark:bg-gray-900 text-white shadow-md sticky top-0 z-50 transition-colors">
      {/* Top Tier */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0 group">
            <div className="bg-yellow-400 text-blue-900 rounded-lg w-9 h-9 flex items-center justify-center font-black text-2xl shadow-sm transition-transform group-hover:scale-105">
              S
            </div>
            <span className="text-2xl font-black tracking-tight hidden sm:inline-block">
              Shop<span className="text-yellow-400">Hub</span>
            </span>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl relative">
            <input
              type="text"
              placeholder="Search for products, brands and more"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 text-gray-900 bg-white rounded-l-md focus:outline-none placeholder-gray-500 font-medium border-r border-gray-200"
            />
            <button
              type="submit"
              className="bg-yellow-400 hover:bg-yellow-500 text-blue-900 px-6 py-2 rounded-r-md transition-colors flex items-center justify-center font-bold"
            >
              <FaSearch className="text-lg" />
            </button>
          </form>

          {/* Desktop Right Nav */}
          <div className="hidden md:flex items-center gap-5 flex-shrink-0 font-semibold">
            {isLoggedIn && <WebSocketStatus />}

            {/* Notifications */}
            {isLoggedIn && (
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="relative p-1.5 text-white hover:text-yellow-300 transition-colors focus:outline-none"
                  aria-label="View notifications"
                >
                  <FaBell className="text-lg" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xxs font-black rounded-full min-w-4 h-4 px-0.5 flex items-center justify-center border border-blue-600 dark:border-gray-900 animate-bounce">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {isNotificationsOpen && (
                  <NotificationPanel onClose={() => setIsNotificationsOpen(false)} />
                )}
              </div>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="text-white hover:text-yellow-300 transition-colors p-1.5 rounded-lg hover:bg-white/10"
              aria-label="Toggle theme"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'dark' ? <FaSun className="text-lg" /> : <FaMoon className="text-lg" />}
            </button>

            {/* Home Link */}
            <Link to="/" className="text-white hover:text-yellow-300 transition-colors text-sm flex items-center gap-1.5">
              <span>Home</span>
            </Link>

            {/* Orders */}
            <Link to="/orders" className="text-white hover:text-yellow-300 transition-colors text-sm flex items-center gap-1.5">
              <FaShoppingBag className="text-sm" />
              <span>Orders</span>
            </Link>

            {/* Support */}
            {isLoggedIn && (
              <Link to="/support" className="text-white hover:text-yellow-300 transition-colors text-sm flex items-center gap-1.5">
                <FaHeadset className="text-sm" />
                <span>Support</span>
              </Link>
            )}

            {/* Admin (shown when logged in and role is admin) */}
            {isLoggedIn && user?.role === 'admin' && (
              <Link to="/admin" className="text-white hover:text-yellow-300 transition-colors text-sm flex items-center gap-1.5">
                <FaUserShield className="text-sm" />
                <span>Admin</span>
              </Link>
            )}

            {/* Profile Dropdown */}
            {isLoggedIn ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-1 text-white hover:text-yellow-300 transition-colors text-sm focus:outline-none"
                >
                  <FaUser className="text-sm" />
                  <span className="max-w-28 truncate">{user?.email?.split('@')[0]}</span>
                  <FaChevronDown className="text-xs ml-0.5" />
                </button>
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-50 animate-fadeIn">
                    <div className="px-4 py-2 border-b dark:border-gray-700 text-xs text-gray-500 font-semibold truncate">
                      {user?.email}
                    </div>
                    <Link to="/profile" onClick={() => setIsProfileOpen(false)} className="block px-4 py-2 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 transition-colors text-sm">
                      My Profile
                    </Link>
                    <Link to="/orders" onClick={() => setIsProfileOpen(false)} className="block px-4 py-2 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 transition-colors text-sm">
                      My Orders
                    </Link>
                    {user?.role === 'admin' && (
                      <Link to="/admin" onClick={() => setIsProfileOpen(false)} className="block px-4 py-2 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 transition-colors text-sm">
                        Admin Panel
                      </Link>
                    )}
                    <div className="border-t dark:border-gray-700 my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-sm flex items-center gap-2 font-semibold"
                    >
                      <FaSignOutAlt /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-white hover:text-yellow-300 transition-colors text-sm">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-yellow-400 hover:bg-yellow-500 text-blue-900 px-4 py-1.5 rounded-lg transition-all shadow-sm hover:shadow text-sm font-bold"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Cart */}
            <Link to="/cart" className="relative group flex items-center gap-1.5 text-sm hover:text-yellow-300 transition-colors">
              <div className="relative p-1">
                <FaShoppingCart className="text-xl" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-black rounded-full min-w-5 h-5 px-1 flex items-center justify-center border-2 border-blue-600 dark:border-gray-900 animate-pulse">
                    {totalItems}
                  </span>
                )}
              </div>
              <span className="font-bold">Cart</span>
            </Link>
          </div>

          {/* Mobile Controls */}
          <div className="flex md:hidden items-center gap-3 flex-shrink-0">
            <button
              onClick={toggleTheme}
              className="text-white p-1.5"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <FaSun /> : <FaMoon />}
            </button>
            <Link to="/cart" className="relative p-2">
              <FaShoppingCart className="text-xl" />
              {totalItems > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white focus:outline-none p-1"
            >
              {isMenuOpen ? <FaTimes className="text-2xl" /> : <FaBars className="text-2xl" />}
            </button>
          </div>
        </div>
      </div>

      {/* Category Ribbon (Desktop) */}
      <div className="bg-blue-700 dark:bg-gray-800 text-sm font-semibold border-t border-blue-800 dark:border-gray-700 hidden md:block transition-colors">
        <div className="max-w-7xl mx-auto px-8 flex gap-6 overflow-x-auto whitespace-nowrap py-2.5">
          {CATEGORIES.map((cat, idx) => (
            <Link
              key={idx}
              to={cat.path}
              className={`hover:text-yellow-300 transition-colors flex items-center gap-1.5 ${
                location.pathname + location.search === cat.path ? 'text-yellow-300' : ''
              }`}
            >
              <FaTag className="text-xs opacity-75" />
              {cat.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMenuOpen && (
        <div className="md:hidden bg-blue-800 dark:bg-gray-900 text-white border-t border-blue-900 dark:border-gray-700 py-4 px-4 space-y-4 animate-slideDown">
          <form onSubmit={handleSearch} className="flex relative">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-gray-900 bg-white rounded-l-md focus:outline-none text-sm"
            />
            <button type="submit" className="bg-yellow-400 text-blue-900 px-4 rounded-r-md flex items-center justify-center font-bold">
              <FaSearch />
            </button>
          </form>

          <div className="border-b border-blue-700 dark:border-gray-700 pb-3">
            <p className="text-xs uppercase text-gray-400 font-bold mb-2">Categories</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {CATEGORIES.map((cat, idx) => (
                <Link key={idx} to={cat.path} onClick={() => setIsMenuOpen(false)} className="py-1.5 hover:text-yellow-300 transition-colors">
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-3 font-semibold text-sm">
            <Link to="/" onClick={() => setIsMenuOpen(false)} className="block py-1 hover:text-yellow-300">Home</Link>
            <Link to="/orders" onClick={() => setIsMenuOpen(false)} className="block py-1 hover:text-yellow-300">My Orders</Link>
            {isLoggedIn && user?.role === 'admin' && (
              <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="block py-1 hover:text-yellow-300 flex items-center gap-2">
                <FaUserShield /> Admin Panel
              </Link>
            )}
            {isLoggedIn ? (
              <>
                <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="block py-1 hover:text-yellow-300">
                  Profile ({user?.email})
                </Link>
                <button
                  onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                  className="w-full text-left py-2 text-red-400 hover:text-red-300 flex items-center gap-2"
                >
                  <FaSignOutAlt /> Log Out
                </button>
              </>
            ) : (
              <div className="flex gap-4 pt-2">
                <Link to="/login" onClick={() => setIsMenuOpen(false)} className="flex-1 text-center py-2 bg-blue-700 dark:bg-gray-700 hover:bg-blue-600 rounded-lg text-white border border-blue-500">
                  Log In
                </Link>
                <Link to="/register" onClick={() => setIsMenuOpen(false)} className="flex-1 text-center py-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 rounded-lg">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

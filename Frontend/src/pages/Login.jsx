import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FaEye, FaEyeSlash, FaEnvelope, FaLock } from 'react-icons/fa';
import authService from '../services/authService';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Forgot Password Modal States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    if (!forgotEmail) { setForgotError('Please enter your email'); return; }
    try {
      setForgotLoading(true);
      await authService.forgotPassword(forgotEmail);
      setForgotSuccess('If the account exists, a password reset link has been sent to your email.');
    } catch (err) {
      setForgotError(err?.message || err || 'Failed to request password reset link.');
    } finally {
      setForgotLoading(false);
    }
  };

  const searchParams = new URLSearchParams(location.search);
  const isVerified = searchParams.get('verified') === 'true';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields'); return; }

    try {
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch (err) {
      const message = err?.message || err?.detail || 'Invalid email or password. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

          {/* Top Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-8 text-white text-center">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <div className="bg-yellow-400 text-blue-900 rounded-lg w-9 h-9 flex items-center justify-center font-black text-2xl">
                S
              </div>
              <span className="text-2xl font-black">Shop<span className="text-yellow-300">Hub</span></span>
            </Link>
            <h1 className="text-2xl font-black">Welcome Back!</h1>
            <p className="text-blue-100 text-sm mt-1">Login to access your account</p>
          </div>

          {/* Form Area */}
          <div className="px-8 py-8">
            {isVerified && (
              <div className="mb-5 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-semibold flex items-center gap-2">
                ✅ Email verified successfully! You can now log in.
              </div>
            )}

            {error && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-semibold flex items-center gap-2">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                  <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => { setShowForgotModal(true); setForgotError(''); setForgotSuccess(''); }}
                  className="text-blue-600 hover:text-blue-700 font-bold focus:outline-none"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 rounded-xl font-black text-sm transition-all shadow-md ${
                  loading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white'
                }`}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-bold">OR</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* New User CTA */}
            <p className="text-center text-sm text-gray-600">
              New to ShopHub?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-700 font-black">
                Create Account
              </Link>
            </p>
          </div>
        </div>

        {/* Benefits Teaser */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {['🔒 Secure', '🚚 Fast Delivery', '↩ Easy Returns'].map((item) => (
            <div key={item} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center text-xs font-bold text-gray-600">
              {item}
            </div>
          ))}
        </div>
      </div>
      
      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl relative border border-gray-100">
            <button 
              type="button" 
              onClick={() => { setShowForgotModal(false); setForgotError(''); setForgotSuccess(''); }} 
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-650 text-xl font-bold"
            >
              &times;
            </button>
            <h3 className="text-xl font-black text-gray-900 mb-2">Reset Password</h3>
            <p className="text-gray-600 text-xs mb-6">
              Enter your email address below and we'll request a password reset link from Supabase Auth to your inbox.
            </p>
            
            {forgotError && (
              <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                ⚠️ {forgotError}
              </div>
            )}
            
            {forgotSuccess && (
              <div className="mb-4 p-3.5 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-semibold">
                ✅ {forgotSuccess}
              </div>
            )}
            
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 text-left">Email Address</label>
                <input 
                  type="email" 
                  value={forgotEmail} 
                  onChange={(e) => setForgotEmail(e.target.value)} 
                  placeholder="you@example.com" 
                  required 
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                />
              </div>
              <button 
                type="submit" 
                disabled={forgotLoading}
                className={`w-full py-3 rounded-xl font-black text-sm transition-all shadow-md ${
                  forgotLoading 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white'
                }`}
              >
                {forgotLoading ? 'Sending Link...' : 'Send Reset Link'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FaEye, FaEyeSlash, FaEnvelope, FaLock } from 'react-icons/fa';
import authService from '../services/authService';
import { API_BASE_URL } from '../constants';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithOAuth } = useAuth();
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

  // Handle Google OAuth Callback from hash params
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const hash = location.hash || window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.replace('#', '?'));
        const accessToken = params.get('access_token');
        const errorDescription = params.get('error_description');

        if (errorDescription) {
          setError(decodeURIComponent(errorDescription.replace(/\+/g, ' ')));
          window.history.replaceState(null, '', window.location.pathname);
          return;
        }

        if (accessToken) {
          try {
            setLoading(true);
            setError('');
            await loginWithOAuth(accessToken);
            window.history.replaceState(null, '', window.location.pathname);
            navigate('/');
          } catch (err) {
            setError(err?.message || err || 'Failed to complete Google sign in');
            window.history.replaceState(null, '', window.location.pathname);
          } finally {
            setLoading(false);
          }
        }
      }
    };

    handleOAuthCallback();
  }, [location, loginWithOAuth, navigate]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_BASE_URL}/auth/google/url`);
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Failed to get Google authorization URL.');
      }
    } catch (err) {
      setError(err?.message || 'Failed to initiate Google sign in.');
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

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full mb-5 flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 py-3 rounded-xl font-bold text-sm shadow-sm transition-all hover:border-gray-300 cursor-pointer"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign In with Google
            </button>

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
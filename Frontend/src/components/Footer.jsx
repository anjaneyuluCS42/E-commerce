import { Link } from 'react-router-dom';
import {
  FaFacebook, FaTwitter, FaInstagram, FaYoutube,
  FaShieldAlt, FaTruck, FaUndo, FaHeadset,
} from 'react-icons/fa';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const links = {
    'About Us': [
      { label: 'About ShopHub', path: '#' },
      { label: 'Careers', path: '#' },
      { label: 'Press', path: '#' },
      { label: 'Corporate Info', path: '#' },
    ],
    'Help': [
      { label: 'Payments', path: '#' },
      { label: 'Shipping', path: '#' },
      { label: 'Cancellation & Returns', path: '#' },
      { label: 'FAQ', path: '#' },
    ],
    'Consumer Policy': [
      { label: 'Return Policy', path: '#' },
      { label: 'Terms of Use', path: '#' },
      { label: 'Security', path: '#' },
      { label: 'Privacy', path: '#' },
    ],
    'Quick Links': [
      { label: 'All Products', path: '/products' },
      { label: 'My Orders', path: '/orders' },
      { label: 'My Cart', path: '/cart' },
      { label: 'My Account', path: '/profile' },
    ],
  };

  return (
    <footer className="bg-gray-900 text-gray-300">

      {/* Trust Badges Banner */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <FaTruck className="text-yellow-400 text-2xl flex-shrink-0" />
              <div>
                <p className="text-white text-sm font-bold">Free Delivery</p>
                <p className="text-gray-500 text-xs">On orders above ₹500</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FaUndo className="text-yellow-400 text-2xl flex-shrink-0" />
              <div>
                <p className="text-white text-sm font-bold">Easy Returns</p>
                <p className="text-gray-500 text-xs">7-day return window</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FaShieldAlt className="text-yellow-400 text-2xl flex-shrink-0" />
              <div>
                <p className="text-white text-sm font-bold">Secure Payments</p>
                <p className="text-gray-500 text-xs">100% encrypted checkout</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FaHeadset className="text-yellow-400 text-2xl flex-shrink-0" />
              <div>
                <p className="text-white text-sm font-bold">24/7 Support</p>
                <p className="text-gray-500 text-xs">We're always available</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">

          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <div className="bg-yellow-400 text-blue-900 rounded-lg w-9 h-9 flex items-center justify-center font-black text-2xl">
                S
              </div>
              <span className="text-xl font-black text-white">
                Shop<span className="text-yellow-400">Hub</span>
              </span>
            </Link>
            <p className="text-gray-400 text-xs leading-relaxed mb-5">
              India's fastest-growing e-commerce platform. Shop millions of products with the best prices and fastest delivery.
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-3">
              {[FaFacebook, FaTwitter, FaInstagram, FaYoutube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-8 h-8 bg-gray-800 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-colors"
                >
                  <Icon className="text-gray-300 hover:text-white text-sm" />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <h3 className="text-white font-black text-xs uppercase tracking-wider mb-4">{title}</h3>
              <ul className="space-y-2.5">
                {items.map(({ label, path }) => (
                  <li key={label}>
                    <Link
                      to={path}
                      className="text-gray-400 hover:text-yellow-400 text-xs transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <p>© {currentYear} ShopHub. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-gray-300 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Terms of Use</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

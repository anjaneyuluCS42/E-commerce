# 🛍️ ShopHub — E-Commerce Frontend

> **Mini-Project III | Week 5 — Knowledge Factory Internship**  
> A full-featured React e-commerce frontend built with **Vite + Tailwind CSS v4 + React Router v7 + Axios**  
> Connects to a FastAPI backend (Week 4 project) running at `http://localhost:8000`

---

## 📸 Project Overview

**ShopHub** is a modern, responsive e-commerce web application that demonstrates real-world frontend concepts including:

- 🔐 JWT-based authentication (Login / Register)
- 🛒 Shopping cart with real-time sync
- 🔍 Product search, category filter & price sort
- 📦 Product listing & detail pages with images
- 🏠 Checkout flow with shipping & payment forms
- 🧾 Order history page
- 👤 User profile management
- 🔒 Protected routes for authenticated users
- 📡 Axios service layer with request/response interceptors
- ⚛️ Context API for global state (Auth + Cart)
- 🎨 Fully responsive design (mobile-first)

---

## 🗂️ Project Structure

```
ecommerce-frontend/
├── public/                    # Static assets (favicon etc.)
├── src/
│   ├── api/
│   │   └── axios.js           # Axios instance + interceptors
│   ├── components/
│   │   ├── Footer.jsx         # Site footer
│   │   ├── LoadingSpinner.jsx # Reusable loading indicator
│   │   ├── Navbar.jsx         # Top navigation bar
│   │   ├── ProductCard.jsx    # Product grid card
│   │   ├── ProtectedRoute.jsx # Auth-guard wrapper
│   │   ├── SearchBar.jsx      # Search bar component
│   │   └── Sidebar.jsx        # Sidebar component
│   ├── context/
│   │   ├── AuthContext.jsx    # Auth global state (login/logout/user)
│   │   └── CartContext.jsx    # Cart global state (add/remove/quantity)
│   ├── hooks/
│   │   ├── useAuth.js         # Custom hook → AuthContext
│   │   ├── useCart.js         # Custom hook → CartContext
│   │   └── useFetch.js        # Generic async data-fetching hook
│   ├── layouts/
│   │   └── MainLayout.jsx     # Wraps all pages with Navbar + Footer
│   ├── pages/
│   │   ├── Home.jsx           # Landing page with hero + product grid
│   │   ├── Products.jsx       # All products, search, filter & sort
│   │   ├── ProductDetails.jsx # Single product detail view
│   │   ├── Login.jsx          # User login form
│   │   ├── Register.jsx       # User registration form
│   │   ├── Cart.jsx           # Shopping cart page
│   │   ├── Checkout.jsx       # Checkout form (address + payment)
│   │   ├── Orders.jsx         # Order history
│   │   ├── Profile.jsx        # User profile settings
│   │   └── NotFound.jsx       # 404 fallback
│   ├── services/
│   │   ├── authService.js     # Auth API calls (login, register, logout)
│   │   ├── cartService.js     # Cart API calls (add, remove, clear)
│   │   ├── orderService.js    # Order API calls (place, list)
│   │   ├── productService.js  # Product API calls (list, detail, upload)
│   │   └── userService.js     # User profile API calls
│   ├── App.jsx                # Root app with Router + Providers
│   ├── index.css              # Global styles + Tailwind base
│   └── main.jsx               # React DOM entry point
├── index.html                 # HTML shell
├── vite.config.js             # Vite configuration
├── package.json               # Dependencies
└── README.md                  # This file
```

---

## 🧩 Key Concepts Demonstrated

### 1. Project Setup — Vite + React + Tailwind CSS v4

```bash
npm create vite@latest ecommerce-frontend -- --template react
cd ecommerce-frontend
npm install
npm install tailwindcss @tailwindcss/vite
```

**`vite.config.js`** uses `@tailwindcss/vite` plugin — Tailwind v4 no longer requires a config file or `postcss.config.js`.

```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

**`src/index.css`** bootstraps Tailwind:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
@import "tailwindcss";
```

---

### 2. React Router v7 — Routing & Protected Routes

`App.jsx` defines all routes wrapped in `<BrowserRouter>`.

```jsx
// Public routes
<Route path="/"           element={<Home />} />
<Route path="/products"   element={<Products />} />
<Route path="/product/:id" element={<ProductDetails />} />
<Route path="/login"      element={<Login />} />
<Route path="/register"   element={<Register />} />

// Protected routes — require auth
<Route path="/cart"     element={<ProtectedRoute><Cart /></ProtectedRoute>} />
<Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
<Route path="/orders"   element={<ProtectedRoute><Orders /></ProtectedRoute>} />
<Route path="/profile"  element={<ProtectedRoute><Profile /></ProtectedRoute>} />

// 404 fallback
<Route path="*" element={<NotFound />} />
```

**`ProtectedRoute.jsx`** checks auth state and redirects unauthenticated users to `/login`:

```jsx
export default function ProtectedRoute({ children }) {
  const { isLoggedIn, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return children;
}
```

---

### 3. Axios Service Layer with Interceptors

**`src/api/axios.js`** creates a configured Axios instance:

```js
const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
});

// REQUEST interceptor: automatically attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// RESPONSE interceptor: auto-logout on 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

All service files (`authService.js`, `productService.js`, etc.) import this `api` instance.

---

### 4. Context API — Global State Management

#### AuthContext (`src/context/AuthContext.jsx`)

Provides auth state across the entire app:

| Value | Type | Description |
|-------|------|-------------|
| `user` | Object / null | Current logged-in user data |
| `loading` | Boolean | Initial auth check in progress |
| `error` | String / null | Last auth error message |
| `isLoggedIn` | Boolean | Derived: user exists AND token present |
| `login(email, password)` | Async Function | Calls auth API, stores token in localStorage |
| `register(username, email, password)` | Async Function | Calls register API |
| `logout()` | Function | Clears localStorage, resets user state |

On mount, reads `localStorage` to restore session without a round-trip to the server.

#### CartContext (`src/context/CartContext.jsx`)

Provides cart state with backend sync:

| Value | Type | Description |
|-------|------|-------------|
| `cartItems` | Array | Items with full product info + `cartQuantity` |
| `loading` | Boolean | Cart operation in progress |
| `addToCart(productId, qty)` | Async Function | POST to backend, refetch cart |
| `removeFromCart(productId)` | Async Function | DELETE from backend |
| `updateQuantity(productId, qty)` | Async Function | Update item quantity |
| `clearCart()` | Async Function | Clear entire cart |
| `getTotalItems()` | Function | Sum of all item quantities |
| `getTotalPrice()` | Function | Total price across all items |

When user logs in, cart is automatically fetched. When user logs out, cart is cleared locally.

---

### 5. Custom Hooks

#### `useFetch(fetchFn, deps)` — Generic Data Fetcher

```js
// Usage in ProductDetails.jsx
const { data: product, loading, error } = useFetch(
  () => productService.getProductById(id),
  [id]
);
```

Returns `{ data, loading, error }`. Handles cleanup (isMounted pattern) to prevent state updates on unmounted components.

#### `useAuth()` — Auth Context Shorthand

```js
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
export const useAuth = () => useContext(AuthContext);
```

#### `useCart()` — Cart Context Shorthand

```js
import { useContext } from 'react';
import { CartContext } from '../context/CartContext';
export const useCart = () => useContext(CartContext);
```

---

### 6. Pages & Features

#### 🏠 Home Page (`src/pages/Home.jsx`)
- Auto-advancing hero banner carousel (3 slides, 5-second interval)
- Category quick-navigation icons (Flipkart-style)
- Featured products grid (first 4 from API)
- Trending products grid (next 4 from API)
- Trust badges (Free Shipping, Secure Payment, Easy Returns, 24/7 Support)
- Newsletter subscription banner

#### 📦 Products Page (`src/pages/Products.jsx`)
- Fetches all products from FastAPI backend
- **Search** by name/description (URL param: `?search=...`)
- **Filter** by price range (Under ₹500, ₹500-₹2000, etc.)
- **Filter** by availability (In Stock Only)
- **Sort** by Relevance, Price Low→High, Price High→Low, Top Rated
- Mobile filter drawer
- Sticky desktop sidebar

#### 🔍 Product Detail Page (`src/pages/ProductDetails.jsx`)
- Product image with hover zoom
- Star rating (deterministic from product ID)
- MRP vs sale price with discount %
- Stock status badge (In Stock / Out of Stock / Only N Left)
- Quantity selector (capped at stock count)
- Add to Cart + Buy Now buttons
- Assurance grid (Delivery, Returns, Security, Support)

#### 🔐 Login Page (`src/pages/Login.jsx`)
- Email + password form with show/hide toggle
- Client-side validation
- Calls `POST /auth/login` (form-url-encoded for OAuth2 compatibility)
- Stores JWT token in `localStorage`
- Redirects to home on success

#### 📝 Register Page (`src/pages/Register.jsx`)
- Username, email, password, confirm password
- Live password strength indicator (Weak / Moderate / Strong)
- Password mismatch live validation
- Terms & Conditions checkbox
- Calls `POST /auth/register`
- Success redirect to `/login`

#### 🛒 Cart Page (`src/pages/Cart.jsx`)
- Lists all cart items with image, name, price, quantity
- Quantity +/- controls with backend sync
- Remove individual items
- Price summary: subtotal, discount, taxes, grand total
- Proceed to Checkout button

#### 💳 Checkout Page (`src/pages/Checkout.jsx`)
- Checkout progress tracker (Cart → Checkout → Orders)
- Shipping form: name, phone, address, city, state, pincode
- Payment methods: Credit/Debit Card, UPI, Cash on Delivery
- Order summary sidebar (sticky) with item list
- On success: animated confirmation + auto-redirect to `/orders`

#### 📋 Orders Page (`src/pages/Orders.jsx`)
- Fetches user's order history from `GET /orders/`
- Displays order status, date, total, item list

#### 👤 Profile Page (`src/pages/Profile.jsx`)
- Fetches current user profile from `GET /profile`
- Allows updating username/email/password

---

### 7. Service Layer

All API calls are centralized in `src/services/`:

```
authService.js     → /auth/register, /auth/login, /profile
productService.js  → /products, /products/:id, /products/:id/upload-image
cartService.js     → /cart/, /cart/add/:id, /cart/remove/:id, /cart/clear
orderService.js    → /orders/, /orders/place
userService.js     → /profile (GET + PUT)
```

Each service method:
1. Uses the shared `api` Axios instance (auto-attaches token)
2. Returns `response.data` on success
3. Throws `error.response?.data` on failure (so components get the FastAPI `detail` field)

---

### 8. Responsive Design

The app is fully responsive using Tailwind's breakpoint prefixes:

| Breakpoint | Prefix | Width |
|-----------|--------|-------|
| Mobile (default) | — | < 640px |
| Small | `sm:` | ≥ 640px |
| Medium | `md:` | ≥ 768px |
| Large | `lg:` | ≥ 1024px |
| XL | `xl:` | ≥ 1280px |

Key responsive patterns:
- **Navbar**: full desktop with search bar → mobile hamburger menu with drawer
- **Products**: 1 → 2 → 3 columns product grid
- **Filter panel**: sticky sidebar on desktop → slide-in drawer on mobile
- **Checkout**: stacked on mobile → 2-column on desktop

---

## 🚀 Getting Started — From Scratch to Localhost

### Prerequisites

Make sure you have installed:

| Tool | Version | Check |
|------|---------|-------|
| Node.js | ≥ 18.x | `node -v` |
| npm | ≥ 9.x | `npm -v` |
| Git | Any | `git --version` |

### Step 1: Clone or Download the Project

```bash
# If using git
git clone <your-repo-url>
cd week-5/ecommerce-frontend

# Or navigate to the existing folder
cd D:/knowledge_factory_internship/week-5/ecommerce-frontend
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs all packages listed in `package.json`:

**Runtime Dependencies:**

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^19.2.6 | UI library |
| `react-dom` | ^19.2.6 | DOM renderer |
| `react-router-dom` | ^7.18.0 | Client-side routing |
| `axios` | ^1.18.0 | HTTP client with interceptors |
| `react-icons` | ^5.6.0 | Icon library (FA, etc.) |

**Dev Dependencies:**

| Package | Purpose |
|---------|---------|
| `vite` | Build tool & dev server |
| `@vitejs/plugin-react` | React + Fast Refresh for Vite |
| `tailwindcss` | Utility-first CSS framework |
| `@tailwindcss/vite` | Tailwind v4 Vite plugin |
| `eslint` | JavaScript linter |

### Step 3: Start the Backend (FastAPI)

This frontend requires the FastAPI backend from Week 4 to be running:

```bash
# Navigate to your Week 4 FastAPI project
cd D:/knowledge_factory_internship/week-4/fastapi-backend

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Run FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend must be available at **`http://localhost:8000`**

You can verify it's running by visiting: http://localhost:8000/docs

### Step 4: Start the Frontend Dev Server

```bash
# Inside ecommerce-frontend/
npm run dev
```

Expected output:
```
  VITE v8.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

### Step 5: Open in Browser

Navigate to: **http://localhost:5173**

---

## 🔗 Backend API Endpoints Used

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/auth/register` | ❌ | Register new user |
| POST | `/auth/login` | ❌ | Login (returns JWT) |
| GET | `/profile` | ✅ | Get current user profile |
| PUT | `/profile` | ✅ | Update user profile |
| GET | `/products` | ❌ | Get all products |
| GET | `/products/:id` | ❌ | Get product by ID |
| POST | `/products` | ✅ Admin | Create product |
| PUT | `/products/:id` | ✅ Admin | Update product |
| DELETE | `/products/:id` | ✅ Admin | Delete product |
| POST | `/products/:id/upload-image` | ✅ Admin | Upload product image |
| GET | `/cart/` | ✅ | Get user's cart |
| POST | `/cart/add/:id?quantity=N` | ✅ | Add item to cart |
| DELETE | `/cart/remove/:id` | ✅ | Remove item from cart |
| DELETE | `/cart/clear` | ✅ | Clear entire cart |
| GET | `/orders/` | ✅ | Get user's orders |
| POST | `/orders/place` | ✅ | Place an order |

---

## ⚙️ Environment & Configuration

The base API URL is configured in `src/api/axios.js`:

```js
const API_BASE_URL = 'http://localhost:8000';
```

To change the backend URL (e.g., for staging/production):
1. Update `API_BASE_URL` in `src/api/axios.js`
2. Update image URL prefixes in `ProductCard.jsx` and `ProductDetails.jsx`:
   ```js
   // Current (for dev):
   'http://127.0.0.1:8000/' + product.image_url
   ```

---

## 📋 Available npm Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR at http://localhost:5173 |
| `npm run build` | Build optimized production bundle to `/dist` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint on all source files |

---

## 🏗️ Architecture Decisions

### Why Vite instead of Create React App?
- Vite is significantly faster (native ESM, no bundling in dev)
- Built-in HMR (Hot Module Replacement) is near-instant
- Smaller config footprint

### Why Tailwind CSS v4?
- No config file needed (Tailwind v4 uses CSS-first config)
- Integrated via `@tailwindcss/vite` plugin
- Utility classes enable rapid prototyping with consistent design

### Why Context API instead of Redux?
- The app's state needs (auth + cart) are straightforward
- Context + custom hooks provide clean, component-level access
- No extra dependencies required

### Why Axios instead of fetch()?
- Interceptors allow automatic JWT attachment on every request
- Automatic 401 handling (redirect to login)
- Cleaner error handling with `.response?.data`

---

## 🐛 Troubleshooting

### "CORS error" in browser console
Ensure your FastAPI backend has CORS middleware configured:
```python
# In main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### "Cannot connect to backend" / All products fail to load
- Verify FastAPI is running: visit http://localhost:8000/docs
- Check that port 8000 is not blocked by firewall
- Confirm `API_BASE_URL` in `src/api/axios.js` matches your backend URL

### Tailwind classes not applying
- Ensure `@import "tailwindcss";` is in `src/index.css`
- Ensure `@tailwindcss/vite` is in `vite.config.js` plugins array
- Run `npm install` to ensure all dev dependencies are present

### Login redirects to login page immediately after logging in
- Check that your FastAPI `/auth/login` returns `{ "access_token": "...", "token_type": "bearer" }`
- Verify that `localStorage` is not blocked in your browser settings

---

## 📚 Concepts Reference

| Concept | Where Used | File(s) |
|---------|-----------|---------|
| React Functional Components | Every component | All `.jsx` files |
| useState | Form state, UI toggles, data | All pages/components |
| useEffect | Data fetching, side effects | Home, Products, Cart, Auth |
| useContext | Consuming global state | Via `useAuth`, `useCart` |
| createContext + Provider | Global state definition | `AuthContext.jsx`, `CartContext.jsx` |
| Custom Hooks | Abstracting context logic | `useAuth.js`, `useCart.js`, `useFetch.js` |
| React Router v7 | Navigation, URL params | `App.jsx`, all pages |
| Protected Routes | Auth-gating pages | `ProtectedRoute.jsx` |
| Axios Interceptors | Token attach + 401 handling | `api/axios.js` |
| Service Layer pattern | API calls separation | `services/*.js` |
| Responsive design | Mobile-first layout | Tailwind `sm:`, `md:`, `lg:` |
| localStorage | Token + user persistence | `authService.js` |
| URL search params | Search/filter state | `Products.jsx` (`useSearchParams`) |
| Conditional rendering | Loading/error/empty states | All pages |
| Array methods | Filter, sort, map | `Products.jsx`, `CartContext.jsx` |
| Async/Await | All API calls | All services + context |
| Error boundaries (manual) | try/catch in every action | All pages |
| Component composition | Layout wrapping pages | `MainLayout.jsx` |

---

## 👨‍💻 Author

**Anjaneyulu** — Knowledge Factory Internship, Week 5  
*Mini-Project III: E-Commerce Frontend (Part 1)*

---

## 📄 License

This project is created for educational purposes as part of the Knowledge Factory Internship program.

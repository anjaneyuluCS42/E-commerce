import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductCard from '../../components/ProductCard.tsx';

// ── Mocks ──────────────────────────────────────────────────────────────────
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ isLoggedIn: true, user: { email: 'test@test.com' } }),
}));

vi.mock('../../store/cartStore', () => ({
  useCartStore: () => ({
    addItem: vi.fn(),
    getTotalItems: () => 0,
  }),
}));

vi.mock('../../services/cartService', () => ({
  default: {
    addToCart: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../../store/toastStore', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const mockProduct = {
  id: 1,
  name: 'Test Product',
  description: 'A great product',
  price: 999,
  stock: 10,
  category: 'Electronics',
  image_url: '',
};

const outOfStockProduct = { ...mockProduct, id: 2, stock: 0 };

function renderCard(product = mockProduct) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ProductCard product={product} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe('ProductCard', () => {
  it('renders product name', () => {
    renderCard();
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });

  it('renders product price', () => {
    renderCard();
    expect(screen.getByText(/₹999/)).toBeInTheDocument();
  });

  it('renders Add to Cart button', () => {
    renderCard();
    expect(screen.getByText('Add to Cart')).toBeInTheDocument();
  });

  it('renders Buy Now button', () => {
    renderCard();
    expect(screen.getByText('Buy Now')).toBeInTheDocument();
  });

  it('shows Out of Stock overlay when stock is 0', () => {
    renderCard(outOfStockProduct);
    expect(screen.getByText(/Out of Stock/i)).toBeInTheDocument();
  });

  it('disables buttons when out of stock', () => {
    renderCard(outOfStockProduct);
    const addBtn = screen.getByText('Add to Cart').closest('button');
    expect(addBtn).toBeDisabled();
  });

  it('shows stock warning when stock is low', () => {
    renderCard({ ...mockProduct, stock: 3 });
    expect(screen.getByText(/Only 3 Left/i)).toBeInTheDocument();
  });

  it('displays a rating badge', () => {
    renderCard();
    // Rating badge is a green span — use getAllByText since price may also contain digits
    const badges = screen.getAllByText(/\d\.\d/);
    expect(badges.length).toBeGreaterThan(0);
  });

  it('shows discount percentage', () => {
    renderCard();
    expect(screen.getByText(/30% Off/i)).toBeInTheDocument();
  });

  it('shows Added! feedback after clicking Add to Cart', async () => {
    renderCard();
    const addBtn = screen.getByText('Add to Cart').closest('button');
    fireEvent.click(addBtn);
    await waitFor(() => {
      expect(screen.getByText(/Added!/i)).toBeInTheDocument();
    });
  });
});

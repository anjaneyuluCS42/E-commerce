import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../../App.jsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the useProducts hook so we don't fetch real data
vi.mock('../../hooks/useProducts', () => ({
  useProducts: () => ({
    data: [
      { id: 1, name: 'Mock Product 1', price: 100, stock: 10, image_url: '' },
    ],
    isLoading: false,
    isError: false,
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('Navbar Navigation', () => {
  it('navigates to Home page when clicking the Logo', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );

    // Let's check that we can see the product name "Mock Product 1" (we are on Home page initially)
    await waitFor(() => {
      expect(screen.getByText('Mock Product 1')).toBeInTheDocument();
    });

    const logoLink = screen.getAllByText('Hub')
      .map(el => el.closest('a'))
      .find(a => a?.getAttribute('href') === '/');
    expect(logoLink).toBeInTheDocument();
    if (logoLink) {
      fireEvent.click(logoLink);
    }

    // Verify we are still on the Home page and no errors occurred
    expect(screen.getByText('Mock Product 1')).toBeInTheDocument();
  });
});

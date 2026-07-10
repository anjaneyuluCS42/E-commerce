import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CartItem from '../../components/CartItem.tsx';

const mockItem = {
  id: 1,
  name: 'Test Product',
  description: 'A product description',
  price: 500,
  stock: 10,
  cartQuantity: 2,
  category: 'Electronics',
  image_url: '',
};

function renderItem(overrides = {}, handlers = {}) {
  const onRemove = handlers.onRemove || vi.fn();
  const onQuantityChange = handlers.onQuantityChange || vi.fn();
  return render(
    <MemoryRouter>
      <CartItem
        item={{ ...mockItem, ...overrides }}
        onRemove={onRemove}
        onQuantityChange={onQuantityChange}
      />
    </MemoryRouter>
  );
}

describe('CartItem', () => {
  it('renders product name', () => {
    renderItem();
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });

  it('renders total price (price × quantity)', () => {
    renderItem();
    expect(screen.getByText(/₹1,000/)).toBeInTheDocument(); // 500 × 2
  });

  it('renders current quantity', () => {
    renderItem();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('calls onRemove with item id on Remove click', () => {
    const onRemove = vi.fn();
    renderItem({}, { onRemove });
    fireEvent.click(screen.getByText(/Remove/i));
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it('calls onQuantityChange to increase', () => {
    const onQuantityChange = vi.fn();
    renderItem({}, { onQuantityChange });
    fireEvent.click(screen.getByLabelText('Increase quantity'));
    expect(onQuantityChange).toHaveBeenCalledWith(1, 3);
  });

  it('calls onQuantityChange to decrease', () => {
    const onQuantityChange = vi.fn();
    renderItem({}, { onQuantityChange });
    fireEvent.click(screen.getByLabelText('Decrease quantity'));
    expect(onQuantityChange).toHaveBeenCalledWith(1, 1);
  });

  it('disables decrease button when quantity is 1', () => {
    renderItem({ cartQuantity: 1 });
    expect(screen.getByLabelText('Decrease quantity')).toBeDisabled();
  });

  it('disables increase button when quantity equals stock', () => {
    renderItem({ cartQuantity: 10, stock: 10 });
    expect(screen.getByLabelText('Increase quantity')).toBeDisabled();
  });

  it('shows opacity when isRemoving prop is true', () => {
    const { container } = renderItem({}, {});
    // re-render with isRemoving
    render(
      <MemoryRouter>
        <CartItem
          item={mockItem}
          isRemoving={true}
          onRemove={vi.fn()}
          onQuantityChange={vi.fn()}
        />
      </MemoryRouter>
    );
    // opacity-40 class should be present
    expect(document.querySelector('.opacity-40')).toBeInTheDocument();
  });

  it('renders In Stock badge', () => {
    renderItem();
    expect(screen.getByText(/In Stock/i)).toBeInTheDocument();
  });
});

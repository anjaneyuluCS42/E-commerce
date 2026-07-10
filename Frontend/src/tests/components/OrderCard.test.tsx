import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OrderCard from '../../components/OrderCard.tsx';
import type { Order } from '../../types';

const mockOrder: Order = {
  id: 42,
  user_id: 1,
  total_price: 2500,
  status: 'processing',
  created_at: '2024-06-01T10:30:00Z',
};

const deliveredOrder: Order = { ...mockOrder, id: 43, status: 'delivered' };
const shippedOrder: Order = { ...mockOrder, id: 44, status: 'shipped' };
const cancelledOrder: Order = { ...mockOrder, id: 45, status: 'cancelled' };

function renderCard(order: Order) {
  return render(
    <MemoryRouter>
      <OrderCard order={order} />
    </MemoryRouter>
  );
}

describe('OrderCard', () => {
  it('renders order ID', () => {
    renderCard(mockOrder);
    expect(screen.getByText('#42')).toBeInTheDocument();
  });

  it('renders total price', () => {
    renderCard(mockOrder);
    expect(screen.getByText(/₹2,500/)).toBeInTheDocument();
  });

  it('shows Processing status badge', () => {
    renderCard(mockOrder);
    // "Processing" appears in status badge and optionally in progress tracker
    const els = screen.getAllByText('Processing');
    expect(els.length).toBeGreaterThan(0);
  });

  it('shows Delivered status badge for delivered order', () => {
    renderCard(deliveredOrder);
    // "Delivered" appears in status badge AND progress tracker step
    const els = screen.getAllByText('Delivered');
    expect(els.length).toBeGreaterThan(0);
  });

  it('shows Shipped status badge', () => {
    renderCard(shippedOrder);
    const els = screen.getAllByText('Shipped');
    expect(els.length).toBeGreaterThan(0);
  });

  it('shows Cancelled status badge', () => {
    renderCard(cancelledOrder);
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('shows Buy Again link for delivered order', () => {
    renderCard(deliveredOrder);
    expect(screen.getByText('Buy Again')).toBeInTheDocument();
  });

  it('does not show Buy Again for non-delivered orders', () => {
    renderCard(mockOrder);
    expect(screen.queryByText('Buy Again')).not.toBeInTheDocument();
  });

  it('renders progress tracker steps', () => {
    renderCard(mockOrder);
    expect(screen.getByText('Order Placed')).toBeInTheDocument();
    expect(screen.getByText('Delivered')).toBeInTheDocument();
  });

  it('renders formatted date', () => {
    renderCard(mockOrder);
    // Date should render in Indian locale "1 Jun 2024"
    expect(screen.getByText(/Jun 2024/i)).toBeInTheDocument();
  });
});

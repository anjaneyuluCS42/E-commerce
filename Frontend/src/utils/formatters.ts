// Shared utility / formatting helpers
import { API_BASE_URL } from '../constants';

/**
 * Format a number as Indian Rupee currency.
 */
export function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

/**
 * Format an ISO date string or Date object into a readable Indian locale date.
 */
export function formatDate(date?: string | Date | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Derive a deterministic mock rating (3.5–4.9) based on product id.
 */
export function deriveRating(productId: number): string {
  return ((productId % 15) * 0.1 + 3.5).toFixed(1);
}

/**
 * Derive a deterministic review count based on product id.
 */
export function deriveReviewCount(productId: number): number {
  return (productId * 37) % 450 + 12;
}

/**
 * Build the full image URL from the relative path returned by FastAPI.
 */
export function getImageUrl(imagePath?: string | null): string {
  if (!imagePath || imagePath.includes('auto_')) {
    return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="250" height="250" viewBox="0 0 250 250"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" fill="%239ca3af">No Image Available</text></svg>';
  }
  if (imagePath.startsWith('http')) return imagePath;
  const apiBaseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return `${apiBaseUrl}/${imagePath}`;
}

/**
 * Truncate a string to a max length and append ellipsis.
 */
export function truncate(text: string, maxLength = 80): string {
  return text.length > maxLength ? text.slice(0, maxLength) + '…' : text;
}

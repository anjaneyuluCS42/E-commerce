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

/**
 * Generate a beautiful fallback product image from Unsplash or inline SVG.
 */
export function getFallbackImageUrl(productName: string, categoryIdOrName?: number | string | null): string {
  const name = productName.toLowerCase();
  const cat = String(categoryIdOrName || '').toLowerCase();
  
  if (name.includes('laptop') || name.includes('desktop') || name.includes('monitor') || name.includes('keyboard') || name.includes('mouse') || cat === '1' || cat.includes('electronics') || cat.includes('laptop')) {
    return 'https://images.unsplash.com/photo-1496181130204-755241544e35?w=600&auto=format&fit=crop&q=60';
  }
  if (name.includes('phone') || name.includes('mobile') || name.includes('smartphone') || name.includes('iphone') || cat === '3' || cat.includes('mobiles') || cat.includes('phone')) {
    return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=60';
  }
  if (name.includes('shirt') || name.includes('jeans') || name.includes('jacket') || name.includes('shoes') || name.includes('dress') || name.includes('socks') || cat === '2' || cat.includes('fashion') || cat.includes('clothing')) {
    return 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop&q=60';
  }
  if (name.includes('fryer') || name.includes('blender') || name.includes('cookware') || name.includes('kitchen') || name.includes('kettle') || cat === '4' || cat.includes('kitchen') || cat.includes('home')) {
    return 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&auto=format&fit=crop&q=60';
  }
  if (name.includes('novel') || name.includes('book') || name.includes('history') || name.includes('python') || cat === '5' || cat.includes('books')) {
    return 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=60';
  }
  if (name.includes('ball') || name.includes('dumbbells') || name.includes('sports') || name.includes('yoga') || name.includes('fitness') || cat === '6' || cat.includes('sports')) {
    return 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&auto=format&fit=crop&q=60';
  }
  
  // Safe dynamic inline SVG fallback that never fails network load
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" fill="%239ca3af">${encodeURIComponent(productName)}</text></svg>`;
}

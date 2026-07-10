import React from 'react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  emoji?: string;
  title: string;
  message?: string;
  ctaText?: string;
  ctaLink?: string;
  onCta?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  emoji = '📦',
  title,
  message,
  ctaText,
  ctaLink,
  onCta,
}) => (
  <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
    <p className="text-7xl mb-5">{emoji}</p>
    <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 mb-2">
      {title}
    </h2>
    {message && (
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 max-w-sm">
        {message}
      </p>
    )}
    {ctaText && ctaLink && (
      <Link
        to={ctaLink}
        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-black shadow-md inline-flex items-center gap-2 transition-colors"
      >
        {ctaText}
      </Link>
    )}
    {ctaText && onCta && (
      <button
        onClick={onCta}
        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-black shadow-md inline-flex items-center gap-2 transition-colors"
      >
        {ctaText}
      </button>
    )}
  </div>
);

export default EmptyState;

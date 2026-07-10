import React from 'react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
    <div className="text-6xl mb-4">⚠️</div>
    <h2 className="text-xl font-black text-gray-800 dark:text-gray-100 mb-2">
      {title}
    </h2>
    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
      {message}
    </p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl transition-colors shadow-sm"
      >
        Try Again
      </button>
    )}
  </div>
);

export default ErrorState;

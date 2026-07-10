import React from 'react';

// ---------- Product Card Skeleton ----------
export const ProductCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-pulse h-full flex flex-col">
    <div className="bg-gray-200 dark:bg-gray-700 h-56 w-full" />
    <div className="p-4 space-y-3 flex-grow">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mt-auto" />
    </div>
    <div className="p-4 pt-0 flex gap-2">
      <div className="flex-1 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      <div className="flex-1 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg" />
    </div>
  </div>
);

// ---------- Order Card Skeleton ----------
export const OrderCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-pulse">
    <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-between items-center">
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-24" />
        <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-16" />
      </div>
      <div className="h-7 bg-gray-200 dark:bg-gray-600 rounded-full w-24" />
    </div>
    <div className="px-6 py-4 space-y-2">
      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-full" />
      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-2/3" />
    </div>
  </div>
);

// ---------- Table Row Skeleton ----------
export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 5 }) => (
  <tr className="animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
      </td>
    ))}
  </tr>
);

// ---------- Generic Skeleton Grid ----------
interface SkeletonGridProps {
  count?: number;
  Component?: React.FC;
}
export const SkeletonGrid: React.FC<SkeletonGridProps> = ({
  count = 8,
  Component = ProductCardSkeleton,
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <Component key={i} />
    ))}
  </div>
);

export default SkeletonGrid;

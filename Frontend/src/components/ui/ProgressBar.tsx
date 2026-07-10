import React from 'react';

interface ProgressBarProps {
  progress: number;
  status: string;
  animate?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, status, animate = true }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'SUCCESS': return 'bg-green-500';
      case 'FAILURE': return 'bg-red-500';
      case 'REVOKED': return 'bg-gray-400';
      case 'PENDING': return 'bg-blue-400';
      default: return 'bg-blue-600';
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
        <span>{status}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${getStatusColor()} ${animate && status === 'PROGRESS' ? 'animate-pulse' : ''}`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
};

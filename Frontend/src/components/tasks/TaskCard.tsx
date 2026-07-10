import React from 'react';
import { ProgressBar } from '../ui/ProgressBar';
import { FaDownload, FaTimes, FaRedo, FaExclamationTriangle, FaClock } from 'react-icons/fa';

interface TaskCardProps {
  status: string;
  progress: number;
  error: string | null;
  result: any;
  isPolling: boolean;
  onCancel?: () => void;
  onRetry?: () => void;
  title?: string;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  status,
  progress,
  error,
  result,
  isPolling,
  onCancel,
  onRetry,
  title = "Background Task"
}) => {
  const getStatusBadgeClass = () => {
    switch (status) {
      case 'SUCCESS': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'FAILURE': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'REVOKED': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 animate-pulse';
      case 'PROGRESS':
      case 'STARTED':
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBackendUrl = () => {
    return import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm space-y-4">
      <div className="flex justify-between items-center gap-3">
        <h4 className="font-black text-gray-800 dark:text-gray-100 text-base">{title}</h4>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusBadgeClass()}`}>
          {status}
        </span>
      </div>

      {(status === 'PENDING' || status === 'IDLE') && isPolling && (
        <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-xl border border-yellow-100 dark:border-yellow-900/30">
          <FaClock className="animate-spin" />
          <span>Task queued. Waiting for an active worker to accept...</span>
        </div>
      )}

      {isPolling && (status === 'PROGRESS' || status === 'STARTED' || status === 'PROCESSING' || status === 'PENDING') && (
        <div className="space-y-2">
          <ProgressBar progress={progress} status={status} />
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-xs text-red-500 hover:text-red-600 font-bold flex items-center gap-1 mt-2 cursor-pointer"
            >
              <FaTimes /> Cancel Task
            </button>
          )}
        </div>
      )}

      {status === 'SUCCESS' && result && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium text-gray-500">Task completed successfully!</p>
          {result.download_url && (
            <a
              href={`${getBackendUrl()}${result.download_url}`}
              download
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors shadow-sm w-fit"
            >
              <FaDownload /> Download File
            </a>
          )}
        </div>
      )}

      {status === 'FAILURE' && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
            <FaExclamationTriangle className="mt-0.5 flex-shrink-0" />
            <div className="break-all font-semibold">
              <p className="font-bold mb-1">Task Failed</p>
              <p>{error || 'An unexpected error occurred during execution.'}</p>
            </div>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors shadow-sm"
            >
              <FaRedo /> Retry Task
            </button>
          )}
        </div>
      )}
    </div>
  );
};

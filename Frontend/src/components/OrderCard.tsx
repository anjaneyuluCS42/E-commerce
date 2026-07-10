import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice, formatDate } from '../utils/formatters';
import { ORDER_STATUSES } from '../constants';
import type { Order } from '../types';
import {
  FaCheckCircle, FaHourglassHalf, FaBoxOpen, FaTimesCircle, FaCircle,
} from 'react-icons/fa';
import { useTaskStatus } from '../hooks/useTaskStatus';
import orderService from '../services/orderService';

interface OrderCardProps {
  order: Order;
  onCancel?: (id: number) => void;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  delivered: <FaCheckCircle />,
  processing: <FaHourglassHalf />,
  shipped: <FaBoxOpen />,
  cancelled: <FaTimesCircle />,
  pending: <FaCircle />,
};

const PROGRESS_MAP: Record<string, number> = {
  delivered: 4,
  shipped: 3,
  processing: 2,
  cancelled: 1,
  pending: 1,
};


const STEPS = ['Order Placed', 'Processing', 'Shipped', 'Delivered'];

const OrderCard: React.FC<OrderCardProps> = ({ order, onCancel }) => {
  const { status, progress: taskProgress, startPolling, isPolling } = useTaskStatus();

  const handleDownloadInvoice = async () => {
    try {
      const response = await orderService.triggerInvoice(order.id);
      if (response.task_id) {
        startPolling(response.task_id);
      }
    } catch (err: any) {
      console.error('Invoice generation trigger failed:', err);
    }
  };

  useEffect(() => {
    if (status === 'SUCCESS' && !isPolling) {
      const download = async () => {
        try {
          const blob = await orderService.downloadInvoice(order.id);
          const url = window.URL.createObjectURL(new Blob([blob]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `invoice_order_${order.id}.pdf`);
          document.body.appendChild(link);
          link.click();
          link.parentNode?.removeChild(link);
        } catch (err) {
          console.error('Invoice download failed:', err);
        }
      };
      download();
    }
  }, [status, isPolling, order.id]);

  const rawStatus = (order.status || 'processing').toLowerCase();
  const statusKey = rawStatus in ORDER_STATUSES ? rawStatus : 'processing';
  const statusCfg = ORDER_STATUSES[statusKey as keyof typeof ORDER_STATUSES];
  const progress = PROGRESS_MAP[statusKey] ?? 1;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Order ID</p>
              <p className="text-base font-black text-gray-900 dark:text-white">#{order.id}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ordered On</p>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                {formatDate(order.created_at)}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total</p>
              <p className="text-lg font-black text-gray-900 dark:text-white">
                {formatPrice(order.total_price || 0)}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full border ${statusCfg.color}`}
          >
            {STATUS_ICONS[statusKey]} {statusCfg.label}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-0">
          {STEPS.map((step, i) => {
            const isActive = i < progress;
            const isCurrent = i === progress - 1;
            return (
              <div key={step} className="flex-1 flex flex-col items-center relative">
                {i > 0 && (
                  <div
                    className={`absolute top-3 -left-1/2 w-full h-0.5 ${
                      isActive ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  />
                )}
                <div
                  className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                    isCurrent
                      ? 'bg-blue-600 text-white ring-2 ring-blue-300 ring-offset-1'
                      : isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-400'
                  }`}
                >
                  {isActive ? '✓' : i + 1}
                </div>
                <p
                  className={`text-xs mt-1 font-bold text-center ${
                    isCurrent
                      ? 'text-blue-600'
                      : isActive
                      ? 'text-gray-700 dark:text-gray-300'
                      : 'text-gray-400'
                  }`}
                >
                  {step}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {statusKey === 'delivered'
            ? '🎉 Your order was delivered successfully!'
            : statusKey === 'shipped'
            ? '🚚 Your order is on the way!'
            : statusKey === 'processing'
            ? '⏳ We are preparing your order.'
            : '❌ This order was cancelled.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleDownloadInvoice}
            disabled={isPolling}
            className={`text-xs font-bold border rounded-xl px-4 py-2 transition-colors flex items-center gap-1.5 ${
              isPolling
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {isPolling ? `Generating (${taskProgress}%)` : 'Invoice'}
          </button>
          {statusKey === 'delivered' && (
            <Link
              to="/products"
              className="text-xs font-bold text-blue-600 border border-blue-200 dark:border-blue-700 rounded-xl px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            >
              Buy Again
            </Link>
          )}
          {onCancel && statusKey === 'processing' && (
            <button
              onClick={() => onCancel(order.id)}
              className="text-xs font-bold text-red-600 border border-red-200 dark:border-red-700 rounded-xl px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderCard;

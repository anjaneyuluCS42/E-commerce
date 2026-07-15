import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice, formatDate } from '../utils/formatters';
import { ORDER_STATUSES } from '../constants';
import type { Order } from '../types';
import {
  FaCheckCircle, FaHourglassHalf, FaBoxOpen, FaTimesCircle, FaCircle,
} from 'react-icons/fa';
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
  const [showTracking, setShowTracking] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadInvoice = async () => {
    try {
      setDownloading(true);
      const blob = await orderService.downloadInvoice(order.id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_order_${order.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      console.error('Invoice download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  const rawStatus = (order.status || order.order_status || 'processing').toLowerCase();
  const statusKey = rawStatus in ORDER_STATUSES ? rawStatus : 'processing';
  const statusCfg = ORDER_STATUSES[statusKey as keyof typeof ORDER_STATUSES];
  const progress = PROGRESS_MAP[statusKey] ?? 1;

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  let trackingEvents = [];
  if (order.tracking_history) {
    try {
      trackingEvents = JSON.parse(order.tracking_history);
    } catch (e) {
      trackingEvents = [];
    }
  }

  if (trackingEvents.length === 0) {
    trackingEvents = [
      {
        status: order.order_status || order.status || 'Pending',
        location: order.current_location || 'Warehouse',
        timestamp: order.created_at || new Date().toISOString(),
      },
    ];
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-6 flex-wrap">
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
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment Method</p>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                {order.payment_method || 'Credit Card'}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment Status</p>
              <span className={`inline-block text-[10px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wide ${
                order.payment_status === 'Completed'
                  ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400'
                  : order.payment_status === 'Failed'
                  ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400'
                  : 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-950/30 dark:border-yellow-800 dark:text-yellow-400'
              }`}>
                {order.payment_status || 'Pending'}
              </span>
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

      {/* Expandable Shipment Journey Vertical Timeline */}
      {showTracking && (
        <div className="px-6 py-5 bg-gray-50/50 dark:bg-gray-900/20 border-b border-gray-100 dark:border-gray-700 animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
              📍 Shipment Journey
            </h4>
            {order.current_location && (
              <span className="text-xs font-extrabold text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-900">
                Current Location: {order.current_location}
              </span>
            )}
          </div>
          
          <div className="relative border-l-2 border-blue-250 dark:border-blue-900 ml-3.5 pl-6 space-y-5">
            {trackingEvents.map((evt: any, idx: number) => {
              const isLatest = idx === trackingEvents.length - 1;
              return (
                <div key={idx} className="relative">
                  <span className={`absolute -left-[31px] top-1 rounded-full w-4 h-4 flex items-center justify-center ring-4 ${
                    isLatest 
                      ? 'bg-green-500 ring-green-150 animate-pulse' 
                      : 'bg-blue-500 ring-blue-100 dark:ring-blue-950'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  </span>
                  
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`text-xs font-black capitalize ${isLatest ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                        {evt.status}
                      </p>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold">•</span>
                      <p className="text-[10px] text-gray-500 dark:text-gray-450 font-bold">
                        {evt.location || 'Warehouse'}
                      </p>
                    </div>
                    <p className="text-[9px] text-gray-400 dark:text-gray-500 font-semibold mt-0.5">
                      {formatDateTime(evt.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
            onClick={() => setShowTracking(!showTracking)}
            className="text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-2 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {showTracking ? 'Hide Tracking' : 'Track Shipment'}
          </button>
          <button
            onClick={handleDownloadInvoice}
            disabled={downloading}
            className={`text-xs font-bold border rounded-xl px-4 py-2 transition-colors flex items-center gap-1.5 ${
              downloading
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {downloading ? 'Downloading...' : 'Invoice'}
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

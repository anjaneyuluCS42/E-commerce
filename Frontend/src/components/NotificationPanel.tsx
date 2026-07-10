import React from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

interface NotificationPanelProps {
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ onClose }) => {
  const { notifications, unreadCount, markAsRead, clearNotifications } = useWebSocket();

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-50 animate-fadeIn max-h-96 overflow-y-auto">
      <div className="px-4 py-2 border-b dark:border-gray-700 flex justify-between items-center font-bold text-sm">
        <span className="flex items-center gap-1.5">
          Notifications 
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </span>
        {notifications.length > 0 && (
          <button 
            onClick={clearNotifications}
            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-bold"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-gray-400 font-semibold">
            No notifications yet 📦
          </div>
        ) : (
          notifications.map((n) => (
            <div 
              key={n.id} 
              onClick={() => { markAsRead(n.id); }}
              className={`p-4 hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer flex gap-2.5 items-start ${!n.read ? 'bg-blue-50/20 dark:bg-blue-900/10' : ''}`}
            >
              {!n.read && (
                <span className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 flex-shrink-0 animate-pulse"></span>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <p className="text-xs font-black truncate text-gray-900 dark:text-white">{n.title}</p>
                  <span className="text-xxs text-gray-400 whitespace-nowrap ml-2">{n.timestamp}</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-semibold">{n.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;

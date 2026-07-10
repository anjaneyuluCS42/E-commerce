import React, { useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

const WebSocketStatus: React.FC = () => {
  const { connectionStatus, connect, disconnect, retryCount, lastConnectedTime, error } = useWebSocket();
  const [showTooltip, setShowTooltip] = useState(false);

  const statusMap = {
    connected: { color: 'bg-green-500 shadow-green-500/50', label: 'Connected', icon: '🟢' },
    connecting: { color: 'bg-yellow-500 shadow-yellow-500/50 animate-pulse', label: 'Connecting', icon: '🟡' },
    reconnecting: { color: 'bg-gray-800 shadow-gray-800/50 animate-pulse', label: `Reconnecting (${retryCount}/5)`, icon: '⚫' },
    disconnected: { color: 'bg-red-500 shadow-red-500/50', label: 'Disconnected', icon: '🔴' }
  };

  const current = statusMap[connectionStatus] || statusMap.disconnected;

  return (
    <div 
      className="relative flex items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button 
        onClick={connectionStatus === 'disconnected' ? connect : disconnect}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors text-xs font-bold text-gray-700 shadow-sm"
        title={`Click to ${connectionStatus === 'disconnected' ? 'connect' : 'disconnect'}`}
      >
        <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${current.color}`}></span>
        <span>{current.label}</span>
      </button>

      {showTooltip && (
        <div className="absolute right-0 top-10 z-[1000] w-64 p-4 bg-white border border-gray-200 rounded-xl shadow-xl text-xs text-gray-700 space-y-2">
          <p className="font-bold border-b border-gray-100 pb-1.5 text-gray-900 flex justify-between items-center">
            <span>WebSocket Status</span>
            <span>{current.icon}</span>
          </p>
          <div className="space-y-1">
            <p><span className="font-semibold text-gray-400">Status:</span> {connectionStatus.toUpperCase()}</p>
            {lastConnectedTime && <p><span className="font-semibold text-gray-400">Last Connected:</span> {lastConnectedTime}</p>}
            {retryCount > 0 && <p><span className="font-semibold text-gray-400">Retry Attempt:</span> {retryCount} / 5</p>}
            {error && <p className="text-red-500"><span className="font-semibold text-red-600">Error:</span> {error}</p>}
          </div>
          {connectionStatus === 'disconnected' && (
            <button 
              onClick={connect}
              className="w-full mt-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors"
            >
              Reconnect Now
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default WebSocketStatus;

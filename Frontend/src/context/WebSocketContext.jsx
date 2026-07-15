import { createContext, useState, useEffect, useRef, useCallback, useContext } from 'react';
import websocketService from '../services/websocketService';
import { toast } from '../store/toastStore';
import { API_BASE_URL } from '../constants';
import { AuthContext } from './AuthContext';

export const WebSocketContext = createContext(null);

const MAX_RETRIES = 5;

export const WebSocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastConnectedTime, setLastConnectedTime] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [typingStates, setTypingStates] = useState({});

  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isIntentionalDisconnectRef = useRef(false);
  
  // Use ref to track retryCount synchronously in closure handlers
  const retryCountRef = useRef(0);
  const connectRef = useRef(null);

  const send = useCallback((data) => {
    return websocketService.send(data);
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    send({ action: 'mark_read', notification_id: id });
  }, [send]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const disconnect = useCallback(() => {
    isIntentionalDisconnectRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setConnectionStatus('disconnected');
    websocketService.disconnect();
    socketRef.current = null;
    setRetryCount(0);
    retryCountRef.current = 0;
  }, []);

  const connect = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No authentication token found.');
      setConnectionStatus('disconnected');
      return;
    }

    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    isIntentionalDisconnectRef.current = false;
    setLoading(true);
    setConnectionStatus(retryCountRef.current > 0 ? 'reconnecting' : 'connecting');
    setError(null);

    let url;
    const apiBaseUrl = API_BASE_URL;

    if (apiBaseUrl.startsWith('http')) {
      const parsedUrl = new URL(apiBaseUrl);
      const wsProtocol = parsedUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      const isProxy = parsedUrl.port === '5173' || parsedUrl.port === '5174';
      const pathSuffix = isProxy ? '/api/ws' : '/ws';
      url = `${wsProtocol}//${parsedUrl.host}${pathSuffix}?token=${token}`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      url = `${protocol}//${host}${apiBaseUrl}/ws?token=${token}`;
    }

    try {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      const socket = websocketService.connect(url);
      socketRef.current = socket;

      socket.onopen = () => {
        setConnectionStatus('connected');
        setLoading(false);
        setError(null);
        setRetryCount(0);
        retryCountRef.current = 0;
        setLastConnectedTime(new Date().toLocaleTimeString());
      };

      socket.onclose = (event) => {
        socketRef.current = null;
        setLoading(false);

        if (event.code === 4001 || event.code === 401) {
          setError('Authentication failed.');
          setConnectionStatus('disconnected');
          return;
        }

        // Trigger auto reconnect if not intentional
        if (!isIntentionalDisconnectRef.current) {
          if (retryCountRef.current < MAX_RETRIES) {
            setConnectionStatus('reconnecting');
            const delay = Math.pow(2, retryCountRef.current) * 1000;
            
            reconnectTimeoutRef.current = setTimeout(() => {
              retryCountRef.current += 1;
              setRetryCount(retryCountRef.current);
              if (connectRef.current) {
                connectRef.current();
              }
            }, delay);
          } else {
            setConnectionStatus('disconnected');
            setError('Max reconnection retries reached. Click Connect to try again.');
            toast.error('WebSocket connection lost permanently. Reached retry limit.');
          }
        } else {
          setConnectionStatus('disconnected');
        }
      };

      socket.onerror = () => {
        setError('WebSocket connection error.');
      };

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          setLastMessage(parsed);

          if (parsed.type === 'notification' || parsed.type === 'order_update') {
            const newNotif = {
              id: `notif-${Date.now()}-${Math.random()}`,
              title: parsed.title || (parsed.type === 'order_update' ? 'Order Update' : 'New Notification'),
              message: parsed.message || 'You received a new update.',
              read: false,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              type: parsed.type,
              ...parsed
            };
            setNotifications((prev) => [newNotif, ...prev]);

            if (!parsed.is_history) {
              if (parsed.type === 'order_update') {
                toast.success(newNotif.message);
              } else {
                toast.info(newNotif.message);
              }
            }
          } else if (parsed.type === 'chat_message') {
            setChatMessages((prev) => {
              if (prev.some((m) => m.id === parsed.id || (m.timestamp === parsed.timestamp && m.sender_id === parsed.sender_id && m.text === parsed.text))) {
                return prev;
              }
              return [...prev, {
                id: parsed.id || `msg-${Date.now()}-${Math.random()}`,
                sender_id: parsed.sender_id,
                receiver_id: parsed.receiver_id,
                text: parsed.text,
                timestamp: parsed.timestamp || new Date().toISOString()
              }];
            });
          } else if (parsed.type === 'chat_typing') {
            setTypingStates((prev) => ({
              ...prev,
              [parsed.sender_id]: parsed.is_typing
            }));
          }
        } catch {
          setLastMessage(event.data);
        }
      };
    } catch (err) {
      setError(err.message || 'Failed to establish WebSocket connection.');
      setConnectionStatus('disconnected');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);



  // Heartbeat ping interval to keep connection alive
  useEffect(() => {
    if (connectionStatus !== 'connected') return;

    const interval = setInterval(() => {
      send({ action: 'ping' });
    }, 30000);

    return () => clearInterval(interval);
  }, [connectionStatus, send]);

  // Monitor network online/offline state
  useEffect(() => {
    const handleOnline = () => {
      toast.info('Browser went online. Reconnecting WebSockets...');
      setRetryCount(0);
      retryCountRef.current = 0;
      connect();
    };

    const handleOffline = () => {
      toast.warning('Browser went offline. WebSockets disconnected.');
      setConnectionStatus('disconnected');
      setError('Browser is offline.');
      if (socketRef.current) {
        websocketService.disconnect();
        socketRef.current = null;
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connect]);

  // Connect automatically if token exists and user is authenticated. Disconnects if logged out.
  // Uses a 50ms delay to prevent connecting and immediately disconnecting in React Strict Mode.
  useEffect(() => {
    let active = true;
    const delayTimer = setTimeout(() => {
      const token = localStorage.getItem('token');
      if (active) {
        if (token && user) {
          connect();
        } else if (!token || !user) {
          disconnect();
        }
      }
    }, 50);

    return () => {
      active = false;
      clearTimeout(delayTimer);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      websocketService.disconnect();
    };
  }, [connect, disconnect, user]);

  const value = {
    connect,
    disconnect,
    send,
    lastMessage,
    connectionStatus,
    error,
    loading,
    retryCount,
    lastConnectedTime,
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    markAsRead,
    clearNotifications,
    chatMessages,
    typingStates,
    setChatMessages,
    joinRoom: useCallback((room) => websocketService.joinRoom(room), []),
    leaveRoom: useCallback((room) => websocketService.leaveRoom(room), []),
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

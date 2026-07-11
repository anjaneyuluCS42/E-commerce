import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import { FaPaperPlane, FaUser, FaHeadset, FaTimes, FaCircle } from 'react-icons/fa';

const ADMIN_ID = 1; // Admin user ID

const Support: React.FC = () => {
  const { user, isLoggedIn } = useAuth();
  const { chatMessages, typingStates, send, connectionStatus } = useWebSocket();
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Scroll to bottom of message logs on change
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, typingStates]);

  // Filter messages for this customer-admin chat
  const messages = chatMessages.filter(
    (m) =>
      (m.sender_id === user?.id && m.receiver_id === ADMIN_ID) ||
      (m.sender_id === ADMIN_ID && m.receiver_id === user?.id)
  );

  // Check if admin is typing
  const isAdminTyping = typingStates[ADMIN_ID];

  // Send message
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;

    // Send chat action via WebSocket
    send({
      action: 'send_chat',
      receiver_id: ADMIN_ID,
      text: inputText.trim(),
      timestamp: new Date().toISOString(),
    });

    setInputText('');
    
    // Stop typing indicator
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    send({
      action: 'typing',
      receiver_id: ADMIN_ID,
      is_typing: false,
    });
    setIsTyping(false);
  };

  // Handle typing state
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!user) return;

    if (!isTyping) {
      setIsTyping(true);
      send({
        action: 'typing',
        receiver_id: ADMIN_ID,
        is_typing: true,
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      send({
        action: 'typing',
        receiver_id: ADMIN_ID,
        is_typing: false,
      });
      setIsTyping(false);
    }, 1500);
  };

  if (!isLoggedIn || !user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-10">
          <FaHeadset className="text-5xl text-blue-200 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 mb-2">Please Log In</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Sign in to contact customer support.</p>
          <Link
            to="/login"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-md inline-block"
          >
            Log In Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950 py-8 transition-colors">
      <div className="max-w-3xl mx-auto px-4">
        {/* Chat Window Box */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg flex flex-col h-[600px] overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 dark:bg-blue-700 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <FaHeadset className="text-lg" />
              </div>
              <div>
                <h2 className="font-bold text-sm leading-tight">Live Chat Support</h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <FaCircle className={`text-xxs ${connectionStatus === 'connected' ? 'text-green-400 animate-pulse' : 'text-gray-300'}`} />
                  <span className="text-[10px] text-blue-100 font-medium">
                    {connectionStatus === 'connected' ? 'Agent Online' : 'Connecting...'}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={() => navigate('/')} className="text-white/80 hover:text-white p-1">
              <FaTimes className="text-lg" />
            </button>
          </div>

          {/* Messages Area */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50 dark:bg-gray-900/50">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2">
                <p className="text-5xl">👋</p>
                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">Welcome to Live Support!</h3>
                <p className="text-xs text-gray-400 max-w-xs font-semibold">How can we assist you today? Send a message to start chatting with our agent.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender_id === user.id;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-end gap-2 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] shadow-sm flex-shrink-0 ${isMe ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                        {isMe ? <FaUser /> : <FaHeadset />}
                      </div>
                      <div className={`px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-sm border ${isMe ? 'bg-blue-600 border-blue-600 text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-150 border-gray-200 dark:border-gray-700 rounded-tl-none'}`}>
                        <p className="break-words whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        <span className={`block text-[9px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing status */}
            {isAdminTyping && (
              <div className="flex items-start gap-2 pl-0.5">
                <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center text-[10px] shadow-sm flex-shrink-0">
                  <FaHeadset />
                </div>
                <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-4 py-3 rounded-2xl rounded-tl-none border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
          </div>

          {/* Form Input */}
          <form onSubmit={handleSend} className="p-4 border-t border-gray-150 dark:border-gray-700 bg-white dark:bg-gray-800 flex gap-3 items-center">
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              placeholder="Type your message to support..."
              className="flex-grow px-4 py-2.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-100 placeholder-gray-400"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl transition-all shadow-md flex items-center justify-center cursor-pointer active:scale-95"
            >
              <FaPaperPlane className="text-xs" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Support;

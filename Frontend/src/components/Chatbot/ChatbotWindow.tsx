import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes, FaMinus, FaTrashAlt, FaPaperPlane, FaRobot, FaUser } from 'react-icons/fa';
import { Message } from './index';
import { getImageUrl } from '../../utils/formatters';

interface ChatbotWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onClearChat: () => void;
  messages: Message[];
  isTyping: boolean;
  onSendMessage: (text: string) => void;
}

const ChatbotWindow: React.FC<ChatbotWindowProps> = ({
  isOpen,
  onClose,
  onClearChat,
  messages,
  isTyping,
  onSendMessage,
}) => {
  const navigate = useNavigate();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of message history
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      // Small timeout to allow transition to finish
      setTimeout(scrollToBottom, 50);
    }
  }, [messages, isTyping, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleSuggestionClick = (suggestionText: string) => {
    // If the suggestion is a link like "Go to Cart", we can either navigate directly OR send the message.
    // To make it look interactive, we send it as a message, and the AI replies.
    // If it's a page link instruction, let's also navigate directly when clicked, OR let the user submit it.
    // Let's inspect the text:
    const lowerText = suggestionText.toLowerCase();
    if (lowerText === 'go to cart') {
      navigate('/cart');
      onSendMessage(suggestionText);
    } else if (lowerText === 'go to my orders') {
      navigate('/orders');
      onSendMessage(suggestionText);
    } else if (lowerText === 'go to laptops page') {
      navigate('/products?category=Electronics'); // Or Laptops if categories are structured
      onSendMessage(suggestionText);
    } else {
      onSendMessage(suggestionText);
    }
  };

  // Helper to format text replacing **bold** and [label](/path)
  const renderFormattedText = (text: string, isUser: boolean) => {
    const regex = /(\*\*.*?\*\*|\[.*?\]\(.*?\))/g;
    const parts = text.split(regex);
    const linkClass = isUser
      ? 'underline text-yellow-300 hover:text-yellow-200 font-bold cursor-pointer transition-colors'
      : 'underline text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold cursor-pointer transition-colors';

    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-extrabold">
            {part.slice(2, -2)}
          </strong>
        );
      } else if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
        const match = part.match(/\[(.*?)\]\((.*?)\)/);
        if (match) {
          const [_, label, url] = match;
          if (url.startsWith('/')) {
            return (
              <button
                key={index}
                onClick={() => navigate(url)}
                className={linkClass}
              >
                {label}
              </button>
            );
          } else {
            return (
              <a
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                {label}
              </a>
            );
          }
        }
      }
      return part;
    });
  };

  return (
    <div
      className="fixed bottom-0 right-0 w-full h-full max-h-full rounded-none sm:bottom-24 sm:right-6 sm:w-96 sm:h-[550px] sm:max-h-[calc(100vh-8rem)] sm:rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col z-50 overflow-hidden bg-white dark:bg-gray-900 transition-all duration-300 transform origin-bottom-right animate-fadeIn"
      role="dialog"
      aria-label="AI Shopping Assistant Chatbot"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-800 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
            <FaRobot className="text-lg animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight">ShopHub Assistant</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></span>
              <span className="text-[10px] text-blue-100 font-medium">AI Assistant Online</span>
            </div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={onClearChat}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Clear Chat History"
            aria-label="Clear chat history"
          >
            <FaTrashAlt className="text-xs text-blue-100 hover:text-white" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Minimize Assistant"
            aria-label="Minimize chatbot window"
          >
            <FaMinus className="text-xs text-blue-100 hover:text-white" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer sm:hidden"
            title="Close Assistant"
            aria-label="Close chatbot window"
          >
            <FaTimes className="text-sm text-blue-100 hover:text-white" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-950 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800"
      >
        {messages.map((msg, index) => {
          const isUser = msg.sender === 'user';
          return (
            <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div className={`flex items-end gap-1.5 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-sm flex-shrink-0 ${
                    isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-850 text-indigo-600 border border-gray-100 dark:border-gray-800'
                  }`}
                >
                  {isUser ? <FaUser /> : <FaRobot />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`px-3.5 py-2.5 rounded-2xl shadow-sm text-sm transition-all duration-200 border ${
                    isUser
                      ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 border-blue-600 text-white rounded-tr-none'
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-150 border-gray-200/50 dark:border-gray-700/50 rounded-tl-none'
                  }`}
                >
                  <p className="leading-relaxed break-words whitespace-pre-wrap">
                    {renderFormattedText(msg.text, isUser)}
                  </p>
                  
                  {/* Timestamp */}
                  <span
                    className={`block text-[9px] mt-1 text-right select-none ${
                      isUser ? 'text-blue-200' : 'text-gray-400'
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {/* Product Recommendations */}
              {!isUser && msg.products && msg.products.length > 0 && (
                <div className="mt-3 pl-7 pr-1 w-full space-y-3">
                  {msg.products.map((product) => {
                    return (
                      <div
                        key={product.id}
                        className="bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700/80 rounded-xl p-3 shadow-sm hover:shadow-md transition-all hover:border-blue-400 dark:hover:border-blue-500 flex gap-3 cursor-pointer select-none"
                        onClick={() => {
                          onClose(); // Minimize chat
                          navigate(`/product/${product.id}`);
                        }}
                        title={`Click to view ${product.name}`}
                      >
                        {/* Product Image */}
                        <div className="w-14 h-14 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-100 dark:border-gray-750">
                          <img
                            src={getImageUrl(product.image_url)}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Product Info */}
                        <div className="flex-grow min-w-0 flex flex-col justify-center">
                          <h4 className="font-bold text-gray-850 dark:text-gray-100 text-xs truncate group-hover:text-blue-600">
                            {product.name}
                          </h4>
                          <div className="text-blue-600 dark:text-blue-400 font-extrabold text-[11px] mt-0.5">
                            ₹{product.price.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-950/20 px-2 py-1 rounded border border-green-100/70 dark:border-green-900/20 mt-1 leading-normal font-medium">
                            {product.match_reason}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Suggestions (Chips) - only rendered for the absolute last message if it's from AI */}
              {!isUser && index === messages.length - 1 && msg.suggestions && msg.suggestions.length > 0 && (
                <div className="flex flex-wrap mt-2 pl-7 max-w-full">
                  {msg.suggestions.map((suggestion, sIdx) => (
                    <button
                      key={sIdx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="border border-blue-500/20 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/70 dark:hover:bg-blue-900/40 rounded-full px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer mr-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm active:scale-95"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-start gap-1.5 pl-0.5">
            <div className="w-6 h-6 rounded-full bg-white dark:bg-gray-850 text-indigo-600 border border-gray-100 dark:border-gray-800 flex items-center justify-center text-[10px] shadow-sm flex-shrink-0">
              <FaRobot />
            </div>
            <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-4 py-3 rounded-2xl rounded-tl-none border border-gray-200/50 dark:border-gray-700/50 shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex gap-2 items-center"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask me anything..."
          className="flex-grow px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 dark:text-gray-100 placeholder-gray-400"
          aria-label="Type your message"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl transition-all shadow-md flex items-center justify-center cursor-pointer hover:shadow-blue-500/10 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Send message"
        >
          <FaPaperPlane className="text-xs" />
        </button>
      </form>
    </div>
  );
};

export default ChatbotWindow;

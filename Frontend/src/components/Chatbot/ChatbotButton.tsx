import React, { useState, useEffect } from 'react';
import { FaCommentDots, FaTimes, FaRobot } from 'react-icons/fa';

interface ChatbotButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

const ChatbotButton: React.FC<ChatbotButtonProps> = ({ isOpen, onClick }) => {
  const [showTooltip, setShowTooltip] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Start fade out transition after 4 seconds (takes 1 second to complete)
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 4000);

    // Completely unmount/hide the tooltip after 5 seconds
    const hideTimer = setTimeout(() => {
      setShowTooltip(false);
    }, 5000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  // Permanently hide the tooltip if the user opens the chat
  useEffect(() => {
    if (isOpen) {
      setShowTooltip(false);
    }
  }, [isOpen]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Hover Tooltip (Speech Bubble) */}
      {!isOpen && showTooltip && (
        <div className={`absolute right-0 bottom-16 mb-2 hidden md:block transition-all duration-1000 transform ${
          isFading ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
        }`}>
          <div className="bg-gray-900 dark:bg-gray-800 text-white text-xs font-bold py-2 px-3 rounded-xl shadow-lg border border-gray-800 dark:border-gray-700 whitespace-nowrap relative animate-fadeIn">
            <span>Chat with ShopHub AI!</span>
            <div className="absolute top-full right-6 -mt-1 w-3 h-3 bg-gray-900 dark:bg-gray-800 transform rotate-45 border-r border-b border-gray-800 dark:border-gray-700"></div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={onClick}
        className={`relative w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 cursor-pointer ${
          isOpen
            ? 'bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 rotate-90 scale-90'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 hover:scale-110 hover:shadow-blue-500/20'
        }`}
        aria-label={isOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
      >
        {/* Glow/Pulse Effect when closed */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-blue-500/30 dark:bg-blue-400/30 animate-ping pointer-events-none"></span>
        )}

        {/* Action Icon */}
        <div className="relative flex items-center justify-center">
          {isOpen ? (
            <FaTimes className="text-xl" />
          ) : (
            <div className="relative">
              <FaRobot className="text-2xl animate-bounce duration-1000" style={{ animationDuration: '3s' }} />
              {/* Online Indicator Badge on the icon itself */}
              <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
            </div>
          )}
        </div>
      </button>
    </div>
  );
};

export default ChatbotButton;

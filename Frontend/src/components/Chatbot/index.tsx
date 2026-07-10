import React, { useState, useEffect } from 'react';
import ChatbotButton from './ChatbotButton';
import ChatbotWindow from './ChatbotWindow';
import { fetchMockChatResponse } from '../../services/mockChatService';

export interface ProductRecommendation {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url?: string | null;
  match_reason: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  suggestions?: string[];
  products?: ProductRecommendation[];
}

const LOCAL_STORAGE_KEY = 'shophub_chat_history';

const INITIAL_MESSAGE: Message = {
  id: 'welcome',
  sender: 'ai',
  text: "Hello! I'm your ShopHub AI Shopping Assistant. How can I help you find the perfect product today? You can search for products, check return policies, ask about active sales, or track orders.",
  timestamp: new Date(),
  suggestions: ['Recommend a laptop', 'Track my order', 'Are there any sales?'],
};

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  // Load message history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Message[];
        // Convert timestamp strings back to Date objects
        const messagesWithDates = parsed.map((m) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        setMessages(messagesWithDates);
      } else {
        setMessages([INITIAL_MESSAGE]);
      }
    } catch (e) {
      console.error('Failed to load chat history from localStorage', e);
      setMessages([INITIAL_MESSAGE]);
    }
  }, []);

  // Save messages to localStorage when updated
  const saveMessages = (newMessages: Message[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newMessages));
    } catch (e) {
      console.error('Failed to save chat history to localStorage', e);
    }
  };

  const toggleChat = () => {
    setIsOpen((prev) => !prev);
  };

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear your chat history?')) {
      const resetMessages = [{ ...INITIAL_MESSAGE, timestamp: new Date() }];
      setMessages(resetMessages);
      saveMessages(resetMessages);
    }
  };

  const handleSendMessage = async (text: string) => {
    // 1. Create and add user message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    saveMessages(updatedMessages);

    // 2. Set typing indicator
    setIsTyping(true);

    // 3. Create a placeholder AI message
    const aiMsgId = `ai-${Date.now()}`;
    const aiMsg: Message = {
      id: aiMsgId,
      sender: 'ai',
      text: '',
      timestamp: new Date(),
      suggestions: [],
      products: [],
    };

    let activeMessages = [...updatedMessages, aiMsg];
    setMessages(activeMessages);

    const apiBaseUrl = import.meta.env.VITE_API_URL === '/api' ? '/api' : (import.meta.env.VITE_API_URL || 'http://localhost:8000');
    const streamUrl = `${apiBaseUrl}/ai/chat/stream`;

    try {
      const response = await fetch(streamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      setIsTyping(false); // Turn off typing once streaming starts

      let accumulatedText = "";
      let productsList: ProductRecommendation[] = [];
      let suggestionsList: string[] = [];

      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split buffer by event boundaries
        const parts = buffer.split('\n\n');
        // Keep the last partial event in the buffer
        buffer = parts.pop() || "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();

          if (dataStr === '[DONE]') {
            break;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.type === 'token') {
              accumulatedText += parsed.content;
              // Update state in real-time
              activeMessages = activeMessages.map((m) =>
                m.id === aiMsgId ? { ...m, text: accumulatedText } : m
              );
              setMessages(activeMessages);
            } else if (parsed.type === 'products') {
              productsList = parsed.products || [];
            } else if (parsed.type === 'suggestions') {
              suggestionsList = parsed.suggestions || [];
            }
          } catch (e) {
            console.error("Failed to parse stream chunk", e);
          }
        }
      }

      // Update final state with products and suggestions
      activeMessages = activeMessages.map((m) =>
        m.id === aiMsgId
          ? { ...m, text: accumulatedText || m.text, products: productsList, suggestions: suggestionsList }
          : m
      );
      setMessages(activeMessages);
      saveMessages(activeMessages);

    } catch (error) {
      console.error('Error fetching chat response', error);
      
      const errorMsg: Message = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: "I'm having trouble connecting right now. Please try again in a few moments.",
        timestamp: new Date(),
      };
      
      const cleanedMessages = activeMessages.filter(m => m.id !== aiMsgId);
      const finalMessages = [...cleanedMessages, errorMsg];
      setMessages(finalMessages);
      saveMessages(finalMessages);
      setIsTyping(false);
    }
  };

  return (
    <>
      <ChatbotButton isOpen={isOpen} onClick={toggleChat} />
      <ChatbotWindow
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onClearChat={handleClearChat}
        messages={messages}
        isTyping={isTyping}
        onSendMessage={handleSendMessage}
      />
    </>
  );
};

export default Chatbot;

// frontend/pages/chatbot.tsx
import React, { useState, FormEvent, useRef, useEffect } from 'react';
import ProtectedRoute from '../components/ProtectedRoute';
import { ChatMessage } from '../../types'; 
import apiClient from '../services/apiClient'; 
import { useAuth } from '../contexts/AuthContext'; // Для получения информации о пользователе

const ChatbotPageContent = () => {
  const { user } = useAuth(); // Получаем текущего пользователя
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // Начальное приветственное сообщение от бота
  useEffect(() => {
    if (user) { // Показываем приветствие, только если пользователь загружен
        setMessages([
            {
                id: 'initial_bot_greeting',
                sender: 'bot',
                text: `Hello ${user.username}! I'm your AI assistant. How can I help you today?`,
                timestamp: Date.now()
            }
        ]);
    }
  }, [user]);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessageText = inputValue;
    const userMessage: ChatMessage = {
      id: Date.now().toString() + '_user', // Более уникальный ID
      sender: 'user',
      text: userMessageText,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Реальный запрос к API бэкенда
      const response = await apiClient.post<{ reply: string }>('/chatbot/ask', { message: userMessageText });
      const botReplyText = response.data.reply;

      const botMessage: ChatMessage = {
        id: Date.now().toString() + '_bot', // Более уникальный ID
        sender: 'bot',
        text: botReplyText,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error: any) {
      console.error("Error sending message to chatbot:", error);
      const errorReplyText = error.response?.data?.reply || 
                             error.response?.data?.msg || 
                             "Sorry, I couldn't process your request right now. Please try again later.";
      const errorMessage: ChatMessage = {
         id: Date.now().toString() + '_bot_error', // Более уникальный ID
         sender: 'bot',
         text: errorReplyText,
         timestamp: Date.now(),
       };
       setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-w-3xl mx-auto bg-white shadow-xl rounded-lg">
      <header className="bg-indigo-600 text-white p-4 rounded-t-lg">
        <h1 className="text-xl font-semibold">AI Chat Assistant</h1>
      </header>
      <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-gray-50">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-xl shadow ${
                msg.sender === 'user'
                  ? 'bg-indigo-500 text-white rounded-br-none'
                  : 'bg-gray-200 text-gray-800 rounded-bl-none'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p> {/* `whitespace-pre-wrap` для сохранения переносов строк от ИИ */}
              <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-indigo-200' : 'text-gray-500'} text-right`}>
                 {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
        <div className="flex items-center">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Ask me anything..."
            disabled={isLoading || !user} // Отключаем ввод, если пользователь не загружен
            className="flex-grow px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim() || !user}
            className="bg-indigo-600 text-white px-6 py-2 rounded-r-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Thinking...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Чат доступен всем авторизованным
const ChatbotPage = ProtectedRoute(ChatbotPageContent); 
export default ChatbotPage;
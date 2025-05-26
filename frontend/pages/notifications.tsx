// pages/notifications.tsx
import React, { useEffect, useState } from 'react';
import ProtectedRoute from '../components/ProtectedRoute';
import { Notification } from '../types'; // Убедитесь, что тип Notification определен
import apiClient from '../services/apiClient';
import Link from 'next/link';

// Иконки для разных типов уведомлений (пример)
const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'task': return '📝';
    case 'test_result': return '📊';
    case 'news': return '📰';
    default: return '🔔';
  }
};


const NotificationsPageContent = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<Notification[]>('/notifications');
        setNotifications(response.data);
      } catch (err: any) {
        setError(err.response?.data?.msg || 'Failed to fetch notifications.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const markAsRead = (id: number | string) => {
     // TODO: Реализовать запрос к API для пометки как прочитанное
     console.log(`Marking notification ${id} as read (API call needed)`);
     setNotifications(prev => 
         prev.map(n => n.id === id ? {...n, read: true} : n)
     );
  };

  if (isLoading) {
    return <div className="text-center py-10">Loading notifications...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Your Notifications</h1>
      {notifications.length === 0 ? (
        <p className="text-gray-600 text-center">You have no new notifications.</p>
      ) : (
        <div className="space-y-4">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg shadow-md flex items-start space-x-3 transition-colors ${
                notification.read ? 'bg-gray-100 text-gray-600' : 'bg-white hover:bg-indigo-50'
              }`}
            >
              <span className="text-2xl pt-1">{getNotificationIcon(notification.type)}</span>
              <div className="flex-grow">
                <p className={`text-sm ${notification.read ? 'text-gray-700' : 'text-gray-800 font-medium'}`}>
                  {notification.message}
                </p>
                {notification.created_at && (
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                )}
                <div className="mt-2 space-x-3">
                 {notification.link && (
                     <Link href={notification.link}
                         className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
                         View Details
                     </Link>
                 )}
                 {!notification.read && (
                     <button 
                         onClick={() => markAsRead(notification.id)}
                         className="text-xs text-gray-500 hover:text-gray-700 font-semibold"
                     >
                         Mark as read
                     </button>
                 )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const NotificationsPage = ProtectedRoute(NotificationsPageContent);
export default NotificationsPage;
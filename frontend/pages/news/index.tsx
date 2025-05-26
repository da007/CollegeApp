// pages/news/index.tsx
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '../../services/apiClient';
import { NewsItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns'; // Для форматирования времени " назад"

const NewsListPage = () => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<NewsItem[]>('/news');
        setNewsItems(response.data);
      } catch (err: any) {
        setError(err.response?.data?.msg || 'Failed to fetch news.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  const handleDeleteNews = async (newsId: number) => {
    if (!window.confirm("Are you sure you want to delete this news item?")) return;
    try {
      await apiClient.delete(`/news/${newsId}`);
      setNewsItems(prevNews => prevNews.filter(item => item.id !== newsId));
    } catch (err: any) {
      alert(err.response?.data?.msg || `Failed to delete news item.`);
      console.error(err);
    }
  };

  if (loading || authLoading) {
    return <div className="text-center py-10 animate-pulse">Loading news...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-600 bg-red-50 p-4 rounded-md">Error: {error}</div>;
  }

  const canManageNews = isAuthenticated() && user && (user.role.name === 'admin' || user.role.name === 'teacher');

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <h1 className="text-4xl font-bold text-gray-800">News Feed</h1>
        {canManageNews && (
          <Link href="/news/create"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-5 rounded-lg shadow-md transition duration-150 ease-in-out text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-2 -ml-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v4h4a1 1 0 110 2h-4v4a1 1 0 11-2 0v-4H5a1 1 0 110-2h4V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add News
          </Link>
        )}
      </div>

      {newsItems.length === 0 ? (
        <p className="text-gray-600 text-center text-lg py-10">No news items available at the moment.</p>
      ) : (
        <div className="space-y-8">
          {newsItems.map((item) => (
            <article key={item.id} className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
              <header className="mb-3">
                <h2 className="text-2xl font-semibold text-gray-900 hover:text-indigo-700 transition-colors">
                  <Link href={`/news/${item.id}`}>{item.title}</Link>
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  By <span className="font-medium text-gray-700">{item.author.username}</span>
                  <span className="mx-2 text-gray-300">|</span>
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </p>
              </header>
              <div className="prose prose-sm max-w-none text-gray-700 mb-4">
                <p>{item.content.substring(0, 300)}{item.content.length > 300 ? '...' : ''}</p>
              </div>
              <footer className="flex justify-between items-center">
                <Link href={`/news/${item.id}`}
                  className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors text-sm">
                  Read more →
                </Link>
                {isAuthenticated() && user && (user.role.name === 'admin' || item.author.id === user.id) && (
                  <div className="flex space-x-3">
                    <Link href={`/news/edit/${item.id}`}
                      className="text-xs text-blue-500 hover:text-blue-700 px-3 py-1 rounded-md hover:bg-blue-50 transition-colors">
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDeleteNews(item.id)}
                      className="text-xs text-red-500 hover:text-red-700 px-3 py-1 rounded-md hover:bg-red-50 transition-colors">
                      Delete
                    </button>
                  </div>
                )}
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

// Новости доступны всем, поэтому ProtectedRoute не нужен для обертки всей страницы,
// но кнопки управления (Add, Edit, Delete) будут видны только авторизованным ролям.
export default NewsListPage;
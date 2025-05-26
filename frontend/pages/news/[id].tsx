// pages/news/[id].tsx
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import apiClient from '../../services/apiClient';
import { NewsItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

const NewsDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [newsItem, setNewsItem] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (id && typeof id === 'string') {
      const fetchNewsItem = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await apiClient.get<NewsItem>(`/news/${id}`);
          setNewsItem(response.data);
        } catch (err: any) {
          if (err.response?.status === 404) {
            setError('News item not found.');
          } else {
            setError(err.response?.data?.msg || 'Failed to fetch news details.');
          }
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchNewsItem();
    } else if (id === undefined && !router.isReady) {
      // id еще не доступен
    } else if (id) {
        setError("Invalid news item ID.");
        setLoading(false);
    }
  }, [id, router.isReady]);

  const handleDeleteNews = async () => {
    if (!newsItem || !window.confirm("Are you sure you want to delete this news item?")) return;
    try {
      await apiClient.delete(`/news/${newsItem.id}`);
      router.push('/news');
    } catch (err: any) {
      alert(err.response?.data?.msg || `Failed to delete news item.`);
      console.error(err);
    }
  };

  if (loading || authLoading) {
    return <div className="text-center py-20 animate-pulse">Loading news item...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-600 bg-red-50 p-4 rounded-md">
        <p className="text-2xl mb-4">Error</p>
        <p>{error}</p>
        <Link href="/news"
            className="mt-6 inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md">
            Back to News Feed
        </Link>
      </div>
    );
  }

  if (!newsItem) {
    return <div className="text-center py-20">News item not found.</div>;
  }
  
  const canManageThisItem = isAuthenticated() && user && (user.role.name === 'admin' || newsItem.author.id === user.id);

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
      <article className="bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="p-6 md:p-10">
          <header className="mb-6 border-b pb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">{newsItem.title}</h1>
            <p className="text-md text-gray-500">
              Published by <span className="font-semibold text-gray-700">{newsItem.author.username}</span>
              <span className="mx-2 text-gray-300">•</span>
              {formatDistanceToNow(new Date(newsItem.created_at), { addSuffix: true })}
            </p>
          </header>

          <div className="prose prose-lg max-w-none text-gray-800 whitespace-pre-wrap">
            {newsItem.content}
          </div>

          <footer className="mt-10 pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <Link href="/news"
                className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                ← Back to News Feed
            </Link>
            {canManageThisItem && (
              <div className="flex space-x-3">
                <Link href={`/news/edit/${newsItem.id}`}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors text-sm">
                    Edit
                </Link>
                <button
                  onClick={handleDeleteNews}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors text-sm"
                >
                  Delete
                </button>
              </div>
            )}
          </footer>
        </div>
      </article>
    </div>
  );
};

// Детали новости доступны всем
export default NewsDetailPage;
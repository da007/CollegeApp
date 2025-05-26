// pages/news/edit/[id].tsx
import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { useRouter } from 'next/router';
import apiClient from '../../../services/apiClient';
import { NewsItem, NewsItemPayload } from '../../../types';
import ProtectedRoute from '../../../components/ProtectedRoute';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';

const EditNewsPageContent = () => {
  const router = useRouter();
  const { id } = router.query;
  const { control, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<NewsItemPayload>();
  const [newsItem, setNewsItem] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (id && typeof id === 'string' && user) { // Ждем загрузки user для проверки прав
      const fetchNewsDetails = async () => {
        setLoading(true);
        setPageError(null);
        try {
          const response = await apiClient.get<NewsItem>(`/news/${id}`);
          const itemData = response.data;

          if (user.role.name !== 'admin' && itemData.author.id !== user.id) {
            setPageError("You don't have permission to edit this news item.");
            setNewsItem(null);
            return;
          }
          
          setNewsItem(itemData);
          setValue('title', itemData.title);
          setValue('content', itemData.content);
        } catch (err: any) {
          if (err.response?.status === 404) setPageError('News item not found.');
          else if (err.response?.status === 403) setPageError("Permission denied to access this news item for editing.");
          else setPageError(err.response?.data?.msg || 'Failed to fetch news details.');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchNewsDetails();
    } else if (id && !user && !authLoading) {
        setPageError("Authentication required to edit news.");
        setLoading(false);
    }
  }, [id, setValue, user, authLoading]);

  const onSubmit: SubmitHandler<NewsItemPayload> = async (data) => {
    setSubmitError(null);
    if (!id || !newsItem) {
      setSubmitError("News item ID or data is missing.");
      return;
    }
    try {
      await apiClient.put(`/news/${id}`, data);
      router.push(`/news/${id}`); 
    } catch (error: any) {
      setSubmitError(error.response?.data?.msg || "Failed to update news item.");
      console.error(error);
    }
  };

  if (loading || authLoading) {
    return <div className="text-center py-20 animate-pulse">Loading news data for editing...</div>;
  }

  if (pageError) {
     return (
      <div className="text-center py-20 text-red-600 bg-red-50 p-4 rounded-md">
        <p className="text-2xl mb-4">Error</p>
        <p>{pageError}</p>
        <Link href="/news" className="mt-6 inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg">
            Back to News
        </Link>
      </div>
    );
  }
  
  if (!newsItem && !loading) { 
    return <div className="text-center py-20">News item not found or could not be loaded.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-xl mt-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">Edit News Item</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <Controller
            name="title"
            control={control}
            defaultValue={newsItem?.title || ""}
            rules={{ required: 'Title is required' }}
            render={({ field }) => (
              <input id="title" type="text" {...field}
                className={`mt-1 block w-full px-4 py-2 border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500`}
              />
            )}
          />
          {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">Content</label>
          <Controller
            name="content"
            control={control}
            defaultValue={newsItem?.content || ""}
            rules={{ required: 'Content is required' }}
            render={({ field }) => (
              <textarea id="content" rows={10} {...field}
                className={`mt-1 block w-full px-4 py-2 border ${errors.content ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500`}
              />
            )}
          />
          {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content.message}</p>}
        </div>

        {submitError && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-md">{submitError}</p>}

        <div className="flex items-center justify-end space-x-4 pt-4">
          <Link href={newsItem ? `/news/${newsItem.id}` : '/news'}
            className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </Link>
          <button type="submit" disabled={isSubmitting || loading}
            className="px-8 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70">
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Защищаем маршрут; дополнительная проверка на автора/админа внутри компонента
const EditNewsPage = ProtectedRoute(EditNewsPageContent, ['admin', 'teacher']);
export default EditNewsPage;
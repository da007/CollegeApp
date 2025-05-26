// pages/news/create.tsx
import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useRouter } from 'next/router';
import apiClient from '../../services/apiClient';
import { NewsItemPayload } from '../../types';
import ProtectedRoute from '../../components/ProtectedRoute';
import Link from 'next/link';

const CreateNewsPageContent = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<NewsItemPayload>();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onSubmit: SubmitHandler<NewsItemPayload> = async (data) => {
    setSubmitError(null);
    try {
      await apiClient.post('/news', data);
      router.push('/news'); // Перенаправить на список новостей после успеха
    } catch (error: any) {
      setSubmitError(error.response?.data?.msg || "Failed to create news item.");
      console.error(error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-xl mt-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">Create New News Item</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            id="title"
            type="text"
            {...register('title', { required: 'Title is required' })}
            className={`mt-1 block w-full px-4 py-2 border ${errors.title ? 'border-red-500 placeholder-red-400' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
            placeholder="Enter news title"
          />
          {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">Content</label>
          <textarea
            id="content"
            rows={10}
            {...register('content', { required: 'Content is required' })}
            className={`mt-1 block w-full px-4 py-2 border ${errors.content ? 'border-red-500 placeholder-red-400' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
            placeholder="Write your news content here..."
          />
          {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content.message}</p>}
        </div>

        {submitError && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-md">{submitError}</p>}

        <div className="flex items-center justify-end space-x-4 pt-4">
           <Link href="/news"
            className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 transition-colors"
          >
            {isSubmitting ? 'Publishing...' : 'Publish News'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Защищаем маршрут, разрешая доступ только admin и teacher
const CreateNewsPage = ProtectedRoute(CreateNewsPageContent, ['admin', 'teacher']);
export default CreateNewsPage;
// pages/books/create.tsx
import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useRouter } from 'next/router';
import apiClient from '../../services/apiClient';
import { BookPayload } from '../../types';
import ProtectedRoute from '../../components/ProtectedRoute';

const CreateBookPageContent = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<BookPayload>();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onSubmit: SubmitHandler<BookPayload> = async (data) => {
    setSubmitError(null);
    try {
      await apiClient.post('/books', data);
      router.push('/books'); // Перенаправить на список книг после успеха
    } catch (error: any) {
      setSubmitError(error.response?.data?.msg || "Failed to create book.");
      console.error(error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-xl">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">Add a New Book</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
          <input
            id="title"
            type="text"
            {...register('title', { required: 'Title is required' })}
            className={`mt-1 block w-full px-4 py-2 border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
          />
          {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
        </div>

        <div>
          <label htmlFor="author" className="block text-sm font-medium text-gray-700">Author (Optional)</label>
          <input
            id="author"
            type="text"
            {...register('author')}
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="file_url" className="block text-sm font-medium text-gray-700">File URL (e.g., /books/adv_python.pdf - Optional)</label>
          <input
            id="file_url"
            type="text"
            {...register('file_url')}
            placeholder="Relative path or full URL"
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          {/* Для загрузки файлов потребуется <input type="file" /> и другая логика на бэкенде */}
        </div>

        {submitError && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-md">{submitError}</p>}

        <div className="flex items-center justify-end space-x-4 pt-4">
           <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create Book'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Защищаем маршрут, разрешая доступ только admin и teacher
const CreateBookPage = ProtectedRoute(CreateBookPageContent, ['admin', 'teacher']);
export default CreateBookPage;
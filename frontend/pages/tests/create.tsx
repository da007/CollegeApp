// pages/tests/create.tsx
import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useRouter } from 'next/router';
import apiClient from '../../services/apiClient';
import { TestPayload } from '../../types';
import ProtectedRoute from '../../components/ProtectedRoute';
import Link from 'next/link';

const CreateTestPageContent = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<TestPayload>();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onSubmit: SubmitHandler<TestPayload> = async (data) => {
    setSubmitError(null);
    try {
      const response = await apiClient.post('/tests', data);
      const newTestId = response.data.id;
      // Перенаправляем на страницу редактирования этого теста, чтобы добавить вопросы
      router.push(`/tests/edit/${newTestId}`);
    } catch (error: any) {
      setSubmitError(error.response?.data?.msg || "Failed to create test.");
      console.error(error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-xl mt-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">Create New Test</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Test Title</label>
          <input
            id="title"
            type="text"
            {...register('title', { required: 'Title is required' })}
            className={`mt-1 block w-full px-4 py-2 border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500`}
            placeholder="e.g., Python Basics Quiz"
          />
          {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
          <textarea
            id="description"
            rows={4}
            {...register('description')}
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="A brief description of the test content or instructions."
          />
        </div>

        {submitError && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-md">{submitError}</p>}

        <div className="flex items-center justify-end space-x-4 pt-4">
           <Link href="/tests"
            className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70">
            {isSubmitting ? 'Creating...' : 'Create and Add Questions'}
          </button>
        </div>
      </form>
    </div>
  );
};

const CreateTestPage = ProtectedRoute(CreateTestPageContent, ['admin', 'teacher']);
export default CreateTestPage;
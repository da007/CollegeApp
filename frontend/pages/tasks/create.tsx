// pages/tasks/create.tsx
import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useRouter } from 'next/router';
import apiClient from '../../services/apiClient';
import { TaskPayload } from '../../types';
import ProtectedRoute from '../../components/ProtectedRoute';

const CreateTaskPageContent = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<TaskPayload>();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onSubmit: SubmitHandler<TaskPayload> = async (data) => {
    setSubmitError(null);
    try {
      // Форматируем дату, если она есть
      const payload = { ...data };
      if (payload.due_date) {
        payload.due_date = new Date(payload.due_date).toISOString();
      } else {
        delete payload.due_date; // Удаляем, если пустая, чтобы API получил null или undefined
      }

      await apiClient.post('/tasks', payload);
      router.push('/tasks'); 
    } catch (error: any) {
      setSubmitError(error.response?.data?.msg || "Failed to create task.");
      console.error(error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-xl">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">Create New Task</h1>
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
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description (Optional)</label>
          <textarea
            id="description"
            rows={4}
            {...register('description')}
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">Due Date (Optional)</label>
          <input
            id="due_date"
            type="datetime-local" // Для выбора даты и времени
            {...register('due_date')}
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
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
            {isSubmitting ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
};

const CreateTaskPage = ProtectedRoute(CreateTaskPageContent, ['admin', 'teacher']);
export default CreateTaskPage;
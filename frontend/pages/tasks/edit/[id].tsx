// frontend/pages/tasks/edit/[id].tsx
import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { useRouter } from 'next/router';
import apiClient from '../../../services/apiClient';
import { Task, TaskPayload } from '../../../types';
import ProtectedRoute from '../../../components/ProtectedRoute';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';

// Функция для форматирования даты для input type="datetime-local"
const formatDateForInput = (isoDate?: string): string => {
    if (!isoDate) return '';
    try {
        const date = new Date(isoDate);
        // Проверка на валидность даты
        if (isNaN(date.getTime())) return '';
        
        // Сдвигаем на часовой пояс пользователя для корректного отображения в input
        const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
        return localDate.toISOString().slice(0, 16);
    } catch (e) {
        console.error("Error formatting date:", e);
        return '';
    }
};


const EditTaskPageContent = () => {
  const router = useRouter();
  const { id } = router.query;
  const { control, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<TaskPayload>();
  const [task, setTask] = useState<Task | null>(null); // Храним полную информацию о задаче
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const { user, isLoading: authLoading } = useAuth();


  useEffect(() => {
    if (id && user) { // Ждем загрузки пользователя для проверки прав
      const fetchTaskDetails = async () => {
        setLoading(true);
        setPageError(null);
        try {
          const response = await apiClient.get<Task>(`/tasks/${id}`);
          const taskData = response.data;

          // Проверка прав: только создатель или админ могут редактировать
          if (user.role.name !== 'admin' && taskData.creator.id !== user.id) {
            setPageError("You don't have permission to edit this task.");
            setTask(null); // Не сохраняем данные задачи, если нет прав
            return;
          }
          
          setTask(taskData);
          setValue('title', taskData.title);
          setValue('description', taskData.description || '');
          setValue('due_date', taskData.due_date ? formatDateForInput(taskData.due_date) : '');

        } catch (err: any) {
          if (err.response?.status === 404) {
            setPageError('Task not found. Cannot edit.');
          } else if (err.response?.status === 403) {
            setPageError("You don't have permission to access this task for editing.");
          }
          else {
            setPageError(err.response?.data?.msg || 'Failed to fetch task details.');
          }
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchTaskDetails();
    } else if (!user && !authLoading) { // Если пользователь не загружен (например, не авторизован)
        setPageError("Authentication required to edit tasks.");
        setLoading(false);
    }
  }, [id, setValue, user, authLoading]);

  const onSubmitHandler: SubmitHandler<TaskPayload> = async (data) => {
    setSubmitError(null);
    if (!id || !task) { // Добавил проверку на task
      setSubmitError("Task ID or task data is missing.");
      return;
    }
    try {
      const payload = { ...data };
      if (payload.due_date) {
        payload.due_date = new Date(payload.due_date).toISOString();
      } else {
        // Если дата не указана, отправляем null, чтобы бэкенд мог ее очистить
        payload.due_date = null as any; // Приведение типа, т.к. TaskPayload ожидает string или undefined
      }
      await apiClient.put(`/tasks/${id}`, payload);
      router.push(`/tasks/${id}`); 
    } catch (error: any) {
      setSubmitError(error.response?.data?.msg || "Failed to update task.");
      console.error(error);
    }
  };
  
  if (loading || authLoading) {
    return <div className="text-center py-20">Loading task data for editing...</div>;
  }

  if (pageError) {
     return (
      <div className="text-center py-20 text-red-500">
        <p className="text-2xl mb-4">Error</p>
        <p>{pageError}</p>
        <Link href="/tasks"
            className="mt-6 inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out">
            Back to Tasks
        </Link>
      </div>
    );
  }
  
  if (!task && !loading) { 
    return <div className="text-center py-20">Task not found or could not be loaded for editing.</div>;
  }


  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-xl">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">Edit Task</h1>
      <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
          <Controller
            name="title"
            control={control}
            defaultValue={task?.title || ""}
            rules={{ required: 'Title is required' }}
            render={({ field }) => (
              <input
                id="title"
                type="text"
                {...field}
                className={`mt-1 block w-full px-4 py-2 border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
              />
            )}
          />
          {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description (Optional)</label>
          <Controller
            name="description"
            control={control}
            defaultValue={task?.description || ""}
            render={({ field }) => (
              <textarea
                id="description"
                rows={4}
                {...field}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            )}
          />
        </div>

        <div>
          <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">Due Date (Optional)</label>
          <Controller
            name="due_date"
            control={control}
            defaultValue={task?.due_date ? formatDateForInput(task.due_date) : ''}
            render={({ field }) => (
              <input
                id="due_date"
                type="datetime-local"
                {...field}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            )}
          />
        </div>

        {submitError && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-md">{submitError}</p>}

        <div className="flex items-center justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={() => router.push(task ? `/tasks/${task.id}` : '/tasks')}
            className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 transition-colors"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Защищаем маршрут, разрешая доступ только admin и teacher.
// Дополнительная проверка на создателя задачи происходит внутри компонента.
const EditTaskPage = ProtectedRoute(EditTaskPageContent, ['admin', 'teacher']);
export default EditTaskPage;
// pages/tasks/[id].tsx
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import apiClient from '../../services/apiClient';
import { Task, User } from '../../types'; // Убедитесь, что User импортирован, если нужен
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';

const TaskDetailPageContent = () => {
  const router = useRouter();
  const { id } = router.query;
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (id && typeof id === 'string') { // Добавлена проверка типа id
      const fetchTask = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await apiClient.get<Task>(`/tasks/${id}`);
          setTask(response.data);
        } catch (err: any) {
          if (err.response?.status === 404) {
            setError('Task not found.');
          } else if (err.response?.status === 403) {
            setError('You do not have permission to view this task.');
          }
          else {
            setError(err.response?.data?.msg || 'Failed to fetch task details.');
          }
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchTask();
    } else if (id === undefined && !router.isReady) {
        // id еще не доступен, ждем готовности роутера
    } else if (id) {
        // id есть, но не строка, или другая проблема
        setError("Invalid task ID.");
        setLoading(false);
    }

  }, [id, router.isReady]); // Добавлен router.isReady в зависимости

  const handleDeleteTask = async () => {
    if (!task || !window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await apiClient.delete(`/tasks/${task.id}`);
      router.push('/tasks'); // Перенаправить на список задач после удаления
    } catch (err: any) {
      alert(err.response?.data?.msg || `Failed to delete task.`);
      console.error(err);
    }
  };

  if (loading || authLoading) {
    return <div className="text-center py-20">Loading task details...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-500">
        <p className="text-2xl mb-4">Error</p>
        <p>{error}</p>
        <Link href="/tasks"
            className="mt-6 inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out">
            Back to Tasks
        </Link>
      </div>
    );
  }

  if (!task) {
    return <div className="text-center py-20">Task not found.</div>;
  }

  const canManageTask = user && (user.role.name === 'admin' || task.creator.id === user.id);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="p-6 md:p-10">
          <div className="flex flex-col sm:flex-row justify-between items-start mb-6">
            <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{task.title}</h1>
                <p className="text-sm text-gray-500">
                    Created by: {task.creator.username} on {new Date(task.created_at).toLocaleDateString()}
                </p>
                {task.due_date && (
                    <p className="text-sm text-red-600 font-medium">
                    Due Date: {new Date(task.due_date).toLocaleString()}
                    </p>
                )}
            </div>
            {canManageTask && (
              <div className="flex space-x-3 mt-4 sm:mt-0 flex-shrink-0">
                <Link href={`/tasks/edit/${task.id}`}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors text-sm">
                    Edit
                </Link>
                <button
                  onClick={handleDeleteTask}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors text-sm"
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          {task.description && (
            <div className="prose max-w-none text-gray-700 mb-6 whitespace-pre-wrap">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Description:</h3>
              <p>{task.description}</p>
            </div>
          )}

          {/* Здесь можно добавить информацию о назначенных студентах, если она есть и нужна */}
          {task.assigned_to_users && task.assigned_to_users.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Assigned to:</h3>
              <ul className="list-disc list-inside pl-5 text-gray-700">
                {task.assigned_to_users.map(assignedUser => (
                  <li key={assignedUser.id}>{assignedUser.username}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <Link href="/tasks"
                className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                ← Back to All Tasks
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// Защищаем маршрут, все авторизованные пользователи могут просматривать детали задачи
// (дополнительные проверки на право доступа к конкретной задаче внутри компонента)
const TaskDetailPage = ProtectedRoute(TaskDetailPageContent);
export default TaskDetailPage;
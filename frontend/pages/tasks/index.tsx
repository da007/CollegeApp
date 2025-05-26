// pages/tasks/index.tsx
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '../../services/apiClient';
import { Task } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';

const TasksPageContent = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<Task[]>('/tasks');
      setTasks(response.data);
    } catch (err: any) {
      setError(err.response?.data?.msg || 'Failed to fetch tasks.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated()) { // Задачи доступны только авторизованным
      fetchTasks();
    } else if (!authLoading) { // Если не авторизован и загрузка auth завершена
      setLoading(false);
      setError("You need to be logged in to view tasks.");
    }
  }, [isAuthenticated, authLoading]);

  const handleDeleteTask = async (taskId: number) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await apiClient.delete(`/tasks/${taskId}`);
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    } catch (err: any) {
        alert(err.response?.data?.msg || `Failed to delete task.`);
        console.error(err);
    }
  }

  if (loading || authLoading) return <div className="text-center py-10">Loading tasks...</div>;
  
  // Если isAuthenticated() false и загрузка auth завершена, ProtectedRoute должен был бы редиректнуть,
  // но на всякий случай, если страница как-то загрузилась:
  if (!isAuthenticated() && !authLoading) {
     return (
         <div className="text-center py-10">
             <p className="text-red-500 mb-4">{error || "Please log in to view tasks."}</p>
             <Link href="/login" className="text-indigo-600 hover:text-indigo-800">Go to Login</Link>
         </div>
     );
  }
  if (error && !tasks.length) return <div className="text-center py-10 text-red-500">Error: {error}</div>;


  const canManageTasks = user && (user.role.name === 'admin' || user.role.name === 'teacher');

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Tasks</h1>
        {canManageTasks && (
          <Link href="/tasks/create"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out">
            + Add New Task
          </Link>
        )}
      </div>

      {tasks.length === 0 && !error ? (
        <p className="text-gray-600 text-center text-lg">No tasks available at the moment.</p>
      ) : error && !tasks.length ? (
         <p className="text-red-500 text-center text-lg">{error}</p>
      ) : (
        <div className="space-y-6">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition-shadow duration-300">
              <div className="flex justify-between items-start">
                 <div>
                     <h2 className="text-2xl font-semibold text-gray-900 mb-2">{task.title}</h2>
                     {task.creator && <p className="text-sm text-gray-500 mb-1">Created by: {task.creator.username}</p>}
                     <p className="text-sm text-gray-500 mb-3">
                         Created: {new Date(task.created_at).toLocaleDateString()}
                         {task.due_date && ` | Due: ${new Date(task.due_date).toLocaleDateString()}`}
                     </p>
                 </div>
                 {canManageTasks && task.creator.id === user?.id && ( // Учитель может редактировать/удалять только свои
                     <div className="flex space-x-2 flex-shrink-0">
                         <Link href={`/tasks/edit/${task.id}`}
                         className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1 rounded hover:bg-blue-100 transition-colors">
                         Edit
                         </Link>
                         <button
                         onClick={() => handleDeleteTask(task.id)}
                         className="text-sm text-red-600 hover:text-red-800 font-medium px-3 py-1 rounded hover:bg-red-100 transition-colors">
                         Delete
                         </button>
                     </div>
                 )}
              </div>
              {task.description && <p className="text-gray-700 mt-2 whitespace-pre-wrap">{task.description}</p>}
              <div className="mt-4">
                 <Link href={`/tasks/${task.id}`}
                     className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                     View Details →
                 </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Защищаем маршрут, доступно всем авторизованным
const TasksPage = ProtectedRoute(TasksPageContent);
export default TasksPage;
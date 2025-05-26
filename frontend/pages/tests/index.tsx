// pages/tests/index.tsx
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '../../services/apiClient';
import { Test } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute'; // Все должны быть авторизованы для доступа к тестам
import { formatDistanceToNow } from 'date-fns';

const TestsPageContent = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isLoading: authLoading } = useAuth(); // user здесь нужен для определения роли

  useEffect(() => {
    const fetchTests = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<Test[]>('/tests');
        setTests(response.data);
      } catch (err: any) {
        setError(err.response?.data?.msg || 'Failed to fetch tests.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (!authLoading && user) { // Загружаем тесты, только если аутентификация завершена и есть пользователь
        fetchTests();
    } else if (!authLoading && !user) {
        setError("Please log in to view tests."); // Сообщение, если не авторизован (хотя ProtectedRoute должен редиректить)
        setLoading(false);
    }
  }, [authLoading, user]);

  const handleDeleteTest = async (testId: number) => {
    if (!window.confirm("Are you sure you want to delete this test and all its questions/results?")) return;
    try {
      await apiClient.delete(`/tests/${testId}`);
      setTests(prevTests => prevTests.filter(test => test.id !== testId));
    } catch (err: any) {
      alert(err.response?.data?.msg || `Failed to delete test.`);
      console.error(err);
    }
  };

  if (loading || authLoading) {
    return <div className="text-center py-10 animate-pulse">Loading tests...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-600 bg-red-50 p-4 rounded-md">Error: {error}</div>;
  }

  const canCreateTests = user && (user.role.name === 'admin' || user.role.name === 'teacher');

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <h1 className="text-4xl font-bold text-gray-800">Available Tests</h1>
        {canCreateTests && (
          <Link href="/tests/create"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-5 rounded-lg shadow-md transition duration-150 ease-in-out text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-2 -ml-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v4h4a1 1 0 110 2h-4v4a1 1 0 11-2 0v-4H5a1 1 0 110-2h4V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
            Create New Test
          </Link>
        )}
      </div>

      {tests.length === 0 ? (
        <p className="text-gray-600 text-center text-lg py-10">No tests available at the moment.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test) => (
            <div key={test.id} className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col hover:shadow-2xl transition-shadow duration-300">
              <div className="p-6 flex flex-col flex-grow">
                <h2 className="text-xl font-semibold text-gray-900 mb-2 truncate" title={test.title}>{test.title}</h2>
                <p className="text-sm text-gray-500 mb-1">
                  Created by: <span className="font-medium">{test.created_by.username}</span>
                </p>
                <p className="text-sm text-gray-500 mb-3">
                  {formatDistanceToNow(new Date(test.created_at), { addSuffix: true })}
                </p>
                {test.description && (
                  <p className="text-gray-600 text-sm mb-4 flex-grow min-h-[60px]">
                    {test.description.substring(0,100)}{test.description.length > 100 ? '...' : ''}
                  </p>
                )}
                 <div className="mt-auto border-t pt-4 space-y-2">
                  {user?.role.name === 'student' && (
                    <Link href={`/tests/take/${test.id}`}
                      className="block w-full text-center bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out">
                      Take Test
                    </Link>
                  )}
                  {(user?.role.name === 'admin' || (user?.role.name === 'teacher' && test.created_by.id === user?.id)) && (
                    <>
                      <Link href={`/tests/edit/${test.id}`}
                        className="block w-full text-center bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out">
                        Manage Test
                      </Link>
                       <button
                        onClick={() => handleDeleteTest(test.id)}
                        className="block w-full text-center bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out mt-2">
                        Delete Test
                      </button>
                    </>
                  )}
                  {/* Ссылка на просмотр деталей теста (информации, не прохождение) */}
                  <Link href={`/tests/details/${test.id}`} // Предполагаем, что будет такая страница
                      className="block w-full text-center bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out">
                      View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Все авторизованные пользователи могут видеть список тестов
const TestsPage = ProtectedRoute(TestsPageContent);
export default TestsPage;
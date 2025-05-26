// pages/tests/details/[id].tsx
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import apiClient from '../../../services/apiClient';
import { Test } from '../../../types';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../contexts/AuthContext';
import { format } from 'date-fns';

const TestDetailsPageContent = () => {
  const router = useRouter();
  const { id } = router.query;
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (id && typeof id === 'string') {
      const fetchTestDetails = async () => {
        setLoading(true);
        setError(null);
        try {
          // Бэкенд /api/tests/:id отдает вопросы, но скрывает ответы для студентов
          const response = await apiClient.get<Test>(`/tests/${id}`);
          setTest(response.data);
        } catch (err: any) {
          if (err.response?.status === 404) setError('Test not found.');
          else setError(err.response?.data?.msg || 'Failed to fetch test details.');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchTestDetails();
    }
  }, [id]);

  if (loading || authLoading) {
    return <div className="text-center py-10 animate-pulse">Loading test details...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-600 bg-red-50 p-4 rounded-md">Error: {error}</div>;
  }

  if (!test) {
    return <div className="text-center py-10">Test not found.</div>;
  }

  const canManageTest = user && (user.role.name === 'admin' || (user.role.name === 'teacher' && test.created_by.id === user.id));

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-xl mt-8">
      <header className="border-b pb-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">{test.title}</h1>
        <p className="text-sm text-gray-500">
          Created by: <span className="font-medium">{test.created_by.username}</span> on {format(new Date(test.created_at), 'PPP')}
        </p>
      </header>

      {test.description && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Description</h2>
          <p className="text-gray-600 whitespace-pre-wrap">{test.description}</p>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Test Information</h2>
        <ul className="list-disc list-inside text-gray-600 space-y-1">
          <li>Number of questions: {test.questions?.length || 0}</li>
          {/* Можно добавить другую информацию, например, примерное время на выполнение, если есть */}
        </ul>
      </div>
      
      {/* Предварительный просмотр вопросов (только текст, без вариантов/ответов) */}
      {user?.role.name !== 'student' && test.questions && test.questions.length > 0 && (
          <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Questions Preview (for staff):</h3>
              <ul className="list-decimal list-inside space-y-2 pl-5">
                  {test.questions.map(q => <li key={q.id} className="text-sm text-gray-600">{q.content.substring(0,100)}{q.content.length > 100 ? '...' : ''}</li>)}
              </ul>
          </div>
      )}


      <footer className="mt-8 pt-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
        <Link href="/tests" className="text-indigo-600 hover:text-indigo-800 font-medium">
          ← Back to All Tests
        </Link>
        <div className="flex gap-3">
            {user?.role.name === 'student' && (
            <Link href={`/tests/take/${test.id}`}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-md shadow-sm">
                Start Test
            </Link>
            )}
            {canManageTest && (
            <Link href={`/tests/edit/${test.id}`}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-md shadow-sm">
                Manage Test & Questions
            </Link>
            )}
        </div>
      </footer>
    </div>
  );
};

const TestDetailsPage = ProtectedRoute(TestDetailsPageContent);
export default TestDetailsPage;
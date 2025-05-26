// frontend/pages/books/[id].tsx
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import apiClient from '../../services/apiClient';
import { Book } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const BookDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (id) {
      const fetchBook = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await apiClient.get<Book>(`/books/${id}`);
          setBook(response.data);
        } catch (err: any) {
          if (err.response?.status === 404) {
            setError('Book not found.');
          } else {
            setError(err.response?.data?.msg || 'Failed to fetch book details.');
          }
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchBook();
    }
  }, [id]);

  const handleDeleteBook = async () => {
    if (!book || !window.confirm("Are you sure you want to delete this book?")) return;
    try {
      await apiClient.delete(`/books/${book.id}`);
      router.push('/books'); // Перенаправить на список книг после удаления
    } catch (err: any) {
      alert(err.response?.data?.msg || `Failed to delete book.`);
      console.error(err);
    }
  };

  if (loading || authLoading) {
    return <div className="text-center py-20">Loading book details...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-500">
        <p className="text-2xl mb-4">Error</p>
        <p>{error}</p>
        <Link href="/books"
            className="mt-6 inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out">
            Back to Library
        </Link>
      </div>
    );
  }

  if (!book) {
    // Это состояние не должно быть достигнуто, если есть ошибка 404
    return <div className="text-center py-20">Book not found.</div>;
  }

  const canManageBook = isAuthenticated() && user && (user.role.name === 'admin' || user.role.name === 'teacher');

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="bg-white shadow-xl rounded-lg overflow-hidden">
        {/* Можно добавить обложку книги, если будет поле для URL изображения */}
        {/* <img src={book.cover_url || '/placeholder-cover.jpg'} alt={book.title} className="w-full h-64 object-cover" /> */}
        
        <div className="p-6 md:p-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">{book.title}</h1>
          {book.author && (
            <p className="text-xl text-gray-600 mb-6">By {book.author}</p>
          )}

          {/* Здесь можно добавить больше деталей о книге, если они есть в модели, например, описание */}
          {/* <p className="text-gray-700 mb-6">{book.description || "No description available."}</p> */}

          {book.file_url && (
            <div className="my-6">
              <a
                href={book.file_url} // Предполагается, что это прямая ссылка
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                <svg className="w-5 h-5 mr-2 -ml-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                Download / View File
              </a>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <Link href="/books"
                className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                ← Back to Library
            </Link>
            {canManageBook && (
              <div className="flex space-x-3">
                <Link href={`/books/edit/${book.id}`}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors">
                    Edit
                </Link>
                <button
                  onClick={handleDeleteBook}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetailPage;
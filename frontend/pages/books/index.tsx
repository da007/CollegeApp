// pages/books/index.tsx
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '../../services/apiClient';
import { Book } from '../../types';
import { useAuth } from '../../contexts/AuthContext'; // Для проверки ролей

const BooksPage = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const fetchBooks = async () => {
    setLoading(true);
    setError(null);
    try {
      // Бэкенд позволяет неавторизованным пользователям просматривать книги
      const response = await apiClient.get<Book[]>('/books');
      setBooks(response.data);
    } catch (err: any) {
      setError(err.response?.data?.msg || 'Failed to fetch books.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleDeleteBook = async (bookId: number) => {
    if (!window.confirm("Are you sure you want to delete this book?")) return;
    try {
      await apiClient.delete(`/books/${bookId}`);
      setBooks(prevBooks => prevBooks.filter(book => book.id !== bookId));
    } catch (err: any) {
        alert(err.response?.data?.msg || `Failed to delete book.`);
        console.error(err);
    }
  }

  if (loading || authLoading) return <div className="text-center py-10">Loading books...</div>;
  if (error) return <div className="text-center py-10 text-red-500">Error: {error}</div>;

  const canManageBooks = isAuthenticated() && user && (user.role.name === 'admin' || user.role.name === 'teacher');

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Library</h1>
        {canManageBooks && (
          <Link href="/books/create"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out">
            + Add New Book
          </Link>
        )}
      </div>

      {books.length === 0 ? (
        <p className="text-gray-600 text-center text-lg">No books available at the moment.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {books.map((book) => (
            <div key={book.id} className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col hover:shadow-2xl transition-shadow duration-300">
              {/* Можно добавить изображение книги, если есть */}
              {/* <img src="/placeholder-book.jpg" alt={book.title} className="w-full h-48 object-cover"/> */}
              <div className="p-6 flex flex-col flex-grow">
                <h2 className="text-xl font-semibold text-gray-900 mb-2 truncate" title={book.title}>{book.title}</h2>
                {book.author && <p className="text-gray-500 text-sm mb-3">By: {book.author}</p>}
                <div className="mt-auto space-y-3">
                  <Link href={`/books/${book.id}`}
                    className="block w-full text-center bg-gray-100 hover:bg-gray-200 text-indigo-700 font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out">
                    View Details
                  </Link>
                  {book.file_url && (
                    <a
                        href={book.file_url} // Предполагаем, что file_url - прямая ссылка или бэкенд ее отдает
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                    >
                        Download/View
                    </a>
                  )}
                  {canManageBooks && (
                    <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200">
                       <Link href={`/books/edit/${book.id}`}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDeleteBook(book.id)}
                        className="text-sm text-red-600 hover:text-red-800 font-medium">
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BooksPage;
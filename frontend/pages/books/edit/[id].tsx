// frontend/pages/books/edit/[id].tsx
import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { useRouter } from 'next/router';
import apiClient from '../../../services/apiClient';
import { Book, BookPayload } from '../../../types';
import ProtectedRoute from '../../../components/ProtectedRoute';
import Link from 'next/link';

const EditBookPageContent = () => {
  const router = useRouter();
  const { id } = router.query;
  const { register, handleSubmit, control, setValue, formState: { errors, isSubmitting } } = useForm<BookPayload>();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);


  useEffect(() => {
    if (id) {
      const fetchBookDetails = async () => {
        setLoading(true);
        setPageError(null);
        try {
          const response = await apiClient.get<Book>(`/books/${id}`);
          setBook(response.data);
          // Заполняем форму значениями из загруженной книги
          setValue('title', response.data.title);
          setValue('author', response.data.author || '');
          setValue('file_url', response.data.file_url || '');
        } catch (err: any) {
          if (err.response?.status === 404) {
            setPageError('Book not found. Cannot edit.');
          } else {
            setPageError(err.response?.data?.msg || 'Failed to fetch book details.');
          }
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchBookDetails();
    }
  }, [id, setValue]);

  const onSubmit: SubmitHandler<BookPayload> = async (data) => {
    setSubmitError(null);
    if (!id) {
      setSubmitError("Book ID is missing.");
      return;
    }
    try {
      await apiClient.put(`/books/${id}`, data);
      router.push(`/books/${id}`); // Перенаправить на страницу деталей книги после успеха
    } catch (error: any) {
      setSubmitError(error.response?.data?.msg || "Failed to update book.");
      console.error(error);
    }
  };

  if (loading) {
    return <div className="text-center py-20">Loading book data for editing...</div>;
  }

  if (pageError) {
     return (
      <div className="text-center py-20 text-red-500">
        <p className="text-2xl mb-4">Error</p>
        <p>{pageError}</p>
        <Link href="/books"
            className="mt-6 inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out">
            Back to Library
        </Link>
      </div>
    );
  }
  
  if (!book && !loading) { // Если книга не найдена после загрузки
    return <div className="text-center py-20">Book not found or could not be loaded.</div>;
  }


  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-xl">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">Edit Book</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
          <Controller
            name="title"
            control={control}
            defaultValue={book?.title || ""}
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
          <label htmlFor="author" className="block text-sm font-medium text-gray-700">Author (Optional)</label>
          <Controller
            name="author"
            control={control}
            defaultValue={book?.author || ""}
            render={({ field }) => (
              <input
                id="author"
                type="text"
                {...field}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            )}
          />
        </div>

        <div>
          <label htmlFor="file_url" className="block text-sm font-medium text-gray-700">File URL (e.g., /books/adv_python.pdf - Optional)</label>
          <Controller
            name="file_url"
            control={control}
            defaultValue={book?.file_url || ""}
            render={({ field }) => (
              <input
                id="file_url"
                type="text"
                {...field}
                placeholder="Relative path or full URL"
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            )}
          />
        </div>

        {submitError && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-md">{submitError}</p>}

        <div className="flex items-center justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={() => router.push(book ? `/books/${book.id}` : '/books')}
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

// Защищаем маршрут, разрешая доступ только admin и teacher
const EditBookPage = ProtectedRoute(EditBookPageContent, ['admin', 'teacher']);
export default EditBookPage;
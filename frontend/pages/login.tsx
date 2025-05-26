// pages/login.tsx
import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/router';

type LoginFormInputs = {
  username?: string;
  password?: string;
};

const LoginPage = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormInputs>();
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/'); // Если уже авторизован, перенаправить на главную
    }
  }, [isAuthenticated, router]);


  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    setLoginError(null);
    try {
      await login({ username: data.username, password: data.password });
      // Редирект происходит внутри функции login в AuthContext
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        // Если это ошибка 401 (неверные учетные данные)
        setLoginError("Неверное имя пользователя или пароль."); // Ваше кастомное общее сообщение
      } else {
        // Для других ошибок (сетевые, серверные 500 и т.д.)
        setLoginError("Произошла ошибка входа. Пожалуйста, попробуйте позже.");
      }
      console.warn("Login attempt failed:", error); // Оставляем для отладки
    }
  };

  return (
    <div className="min-h-[calc(100vh-150px)] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          {router.query.registered && (
            <p className="mt-2 text-center text-sm text-green-600 bg-green-50 p-3 rounded-md">
              Registration successful! Please log in.
            </p>
          )}
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">Username</label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                {...register('username', { required: 'Username is required' })}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${errors.username ? 'border-red-500 text-red-700 placeholder-red-400' : 'border-gray-300 text-gray-900 placeholder-gray-500'} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm rounded-t-md`}
                placeholder="Username"
              />
              {errors.username && <p className="text-red-500 text-xs mt-1 px-1">{errors.username.message}</p>}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password', { required: 'Password is required' })}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${errors.password ? 'border-red-500 text-red-700 placeholder-red-400' : 'border-gray-300 text-gray-900 placeholder-gray-500'} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm rounded-b-md`}
                placeholder="Password"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1 px-1">{errors.password.message}</p>}
            </div>
          </div>

          {loginError && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-md">{loginError}</p>}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
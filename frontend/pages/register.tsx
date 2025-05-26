// pages/register.tsx
import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/router';

// Определяем роли для регистрации
const roleOptions = [
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Teacher' },
  // Регистрация администратора может быть отдельным процессом или только для администраторов
];

type RegisterFormInputs = {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
};

const RegisterPage = () => {
  const { register: formRegister, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterFormInputs>({
    defaultValues: { role: 'student' } // Роль по умолчанию
  });
  const { register: authRegister, isAuthenticated } = useAuth();
  const router = useRouter();
  const [registerError, setRegisterError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/'); // Если уже авторизован, перенаправить на главную
    }
  }, [isAuthenticated, router]);

  const password = watch('password'); // Для проверки совпадения паролей

  const onSubmit: SubmitHandler<RegisterFormInputs> = async (data) => {
    setRegisterError(null);
    const { confirmPassword, ...registrationData } = data; // Исключаем confirmPassword
    try {
      await authRegister(registrationData as any); // API ожидает password и role
      // Редирект происходит внутри функции register в AuthContext (на страницу логина)
    } catch (error: any) {
      setRegisterError(error.response?.data?.msg || "Registration failed. Please try again.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-150px)] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
            <input id="username" type="text" {...formRegister('username', { required: 'Username is required' })}
                   className={`mt-1 appearance-none block w-full px-3 py-2 border ${errors.username ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} />
            {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
          </div>
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
            <input id="email" type="email" {...formRegister('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/i, message: "Invalid email address" }})}
                   className={`mt-1 appearance-none block w-full px-3 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input id="password" type="password" {...formRegister('password', { required: 'Password is required', minLength: { value: 8, message: "Password must be at least 8 characters" }})}
                   className={`mt-1 appearance-none block w-full px-3 py-2 border ${errors.password ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <input id="confirmPassword" type="password" {...formRegister('confirmPassword', { required: 'Please confirm your password', validate: value => value === password || "Passwords do not match" })}
                   className={`mt-1 appearance-none block w-full px-3 py-2 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} />
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
          </div>
          {/* Role */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
            <select id="role" {...formRegister('role', { required: "Role is required" })}
                    className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border ${errors.role ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white`}>
              {roleOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role.message}</p>}
          </div>

          {registerError && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-md">{registerError}</p>}

          <div>
            <button type="submit" disabled={isSubmitting}
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60">
              {isSubmitting ? 'Registering...' : 'Register'}
            </button>
          </div>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
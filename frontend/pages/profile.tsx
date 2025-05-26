// pages/profile.tsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute'; // Импортируем HOC

const ProfilePageContent = () => {
  const { user } = useAuth(); // user должен быть доступен здесь, т.к. HOC его загружает

  if (!user) {
    // Эта ветка не должна часто срабатывать из-за логики в HOC, но для безопасности
    return <p>Loading user data...</p>;
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Your Profile</h1>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-500">Username</p>
          <p className="text-lg text-gray-900">{user.username}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Email</p>
          <p className="text-lg text-gray-900">{user.email}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Role</p>
          <p className="text-lg text-gray-900 capitalize">{user.role.name}</p>
        </div>
      </div>
    </div>
  );
};

// Оборачиваем наш компонент контентом в HOC
const ProfilePage = ProtectedRoute(ProfilePageContent);

export default ProfilePage;
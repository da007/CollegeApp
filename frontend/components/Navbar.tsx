// frontend/components/Navbar.tsx
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';

const Navbar = () => {
  const { user, logout, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const isActive = (pathname: string) => router.pathname === pathname || router.pathname.startsWith(pathname + '/'); // Учитываем вложенные пути

  return (
    <nav className="bg-gray-800 p-4 text-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold hover:text-gray-300 transition-colors">
          CollegeApp
        </Link>
        <div className="space-x-1 md:space-x-2 flex items-center flex-wrap"> {/* Уменьшил space-x, добавил flex-wrap */}
          <Link
            href="/books"
            className={`px-2 py-1 rounded-md text-sm md:text-base hover:bg-gray-700 transition-colors ${isActive('/books') ? 'bg-gray-700 font-semibold' : ''}`}
          >
            Books
          </Link>
          
          {isAuthenticated() && user && (
            <>
              <Link
                href="/tasks"
                className={`px-2 py-1 rounded-md text-sm md:text-base hover:bg-gray-700 transition-colors ${isActive('/tasks') ? 'bg-gray-700 font-semibold' : ''}`}
              >
                Tasks
              </Link>

              <Link
                href="/news"
                className={`px-2 py-1 rounded-md text-sm md:text-base hover:bg-gray-700 transition-colors ${isActive('/news') ? 'bg-gray-700 font-semibold' : ''}`}
              >
                News
              </Link>

              <Link
                href="/tests"
                className={`px-2 py-1 rounded-md text-sm md:text-base hover:bg-gray-700 transition-colors ${isActive('/tests') ? 'bg-gray-700 font-semibold' : ''}`}
              >
                Tests
              </Link>

              {/* Можно добавить ссылку на чат-бота и уведомления позже */}
               <Link
                 href="/chatbot"
                 className={`px-2 py-1 rounded-md text-sm md:text-base hover:bg-gray-700 transition-colors ${isActive('/chatbot') ? 'bg-gray-700 font-semibold' : ''}`}
               >
                 Chatbot
               </Link>
               <Link
                 href="/notifications"
                 className={`px-2 py-1 rounded-md text-sm md:text-base hover:bg-gray-700 transition-colors ${isActive('/notifications') ? 'bg-gray-700 font-semibold' : ''}`}
               >
                 Notifications
               </Link>
            </>
          )}


          {isLoading ? (
            <span className="text-sm px-2 py-1">Loading...</span>
          ) : isAuthenticated() && user ? (
            <>
              <Link
                href="/profile"
                className={`px-2 py-1 rounded-md text-sm md:text-base hover:bg-gray-700 transition-colors ${isActive('/profile') ? 'bg-gray-700 font-semibold' : ''}`}
              >
                {user.username} <span className="hidden md:inline">({user.role.name})</span>
              </Link>
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-md text-sm md:text-base transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`px-2 py-1 rounded-md text-sm md:text-base hover:bg-gray-700 transition-colors ${isActive('/login') ? 'bg-gray-700 font-semibold' : ''}`}
              >
                Login
              </Link>
              <Link
                href="/register"
                className={`bg-indigo-500 hover:bg-indigo-600 px-3 py-1 rounded-md text-sm md:text-base transition-colors ${isActive('/register') ? 'bg-indigo-600' : ''}`}
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
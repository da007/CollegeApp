import { useRouter } from 'next/router';
import React, { useEffect, ComponentType, ReactElement, useCallback } from 'react'; // Добавлен useCallback
import { useAuth } from '../contexts/AuthContext';
import hoistNonReactStatics from 'hoist-non-react-statics';

interface WithAuthProps {}

const ProtectedRoute = <P extends object>(
  WrappedComponent: ComponentType<P>,
  allowedRoles?: string[]
): ComponentType<P & WithAuthProps> => {
  const ComponentWithAuth = (props: P): ReactElement | null => {
    const { isAuthenticated, isLoading, user, fetchCurrentUser } = useAuth();
    const router = useRouter();
    const { asPath, pathname } = router; // Используем деструктурированные значения для стабильности в зависимостях

    // Мемоизированная функция для выполнения редиректа, чтобы избежать ее создания на каждый рендер
    const performRedirect = useCallback((targetPath: string) => {
        // Проверяем, не находимся ли мы уже на целевом пути или в процессе перехода на него
        if (router.asPath !== targetPath) {
            console.log(`ProtectedRoute: Redirecting from ${router.asPath} to ${targetPath}`);
            router.replace(targetPath);
        } else {
            console.log(`ProtectedRoute: Already at or redirecting to ${targetPath}, no action.`);
        }
    }, [router]); // router может оставаться зависимостью, т.к. сама функция replace стабильна

    useEffect(() => {
      // Если данные пользователя еще загружаются, ничего не делаем, ждем.
      if (isLoading) {
        console.log("ProtectedRoute Effect: Auth is loading, waiting...");
        return;
      }

      // Если пользователь не аутентифицирован, перенаправляем на страницу входа.
      if (!isAuthenticated()) {
        console.log(`ProtectedRoute Effect: Not authenticated, current path: ${asPath}`);
        const redirectUrl = '/login?redirect=' + encodeURIComponent(asPath);
        performRedirect(redirectUrl);
        return; // Важно завершить выполнение эффекта здесь
      }

      // Если пользователь аутентифицирован, но данные пользователя еще не загружены (маловероятно, но возможно)
      // Это условие нужно тщательно проверить, так как fetchCurrentUser может вызываться из AuthContext
      if (!user) {
        console.warn("ProtectedRoute Effect: Authenticated but user data is pending. Consider fetching.");
        // fetchCurrentUser(); // Если нужно принудительно запросить, но это может вызвать циклы.
                             // Лучше, чтобы AuthContext сам обрабатывал загрузку пользователя при наличии токена.
        return; // Ждем, пока user загрузится (если fetchCurrentUser уже запущен AuthContext'ом)
      }
      
      // Если пользователь аутентифицирован и его роль не соответствует разрешенным.
      if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role.name)) {
        console.log(`ProtectedRoute Effect: Role mismatch (User: ${user.role.name}, Allowed: ${allowedRoles.join(',')}), current path: ${asPath}`);
        performRedirect('/unauthorized');
        return; // Важно завершить выполнение эффекта здесь
      }

      console.log("ProtectedRoute Effect: All checks passed, user can access.", { userRole: user.role.name, allowedRoles });

    // Убираем 'router' из зависимостей, используем 'asPath' и 'performRedirect' (которая имеет router в своих зависимостях)
    // 'fetchCurrentUser' также должна быть обернута в useCallback в AuthContext для стабильности.
    }, [isLoading, isAuthenticated, user, asPath, allowedRoles, fetchCurrentUser, performRedirect]);


    // Логика отображения
    if (isLoading) {
      return <div className="flex justify-center items-center h-screen"><p>Loading authentication status...</p></div>;
    }

    if (!isAuthenticated()) {
      // Пользователь не аутентифицирован, useEffect должен был начать редирект.
      // Показываем заглушку, пока редирект не завершится.
      return <div className="flex justify-center items-center h-screen"><p>Redirecting to login...</p></div>;
    }

    if (!user) {
        // Аутентифицирован (токен есть), но данные пользователя еще не загрузились.
        // Это состояние должно быть временным, если AuthContext корректно загружает user.
        return <div className="flex justify-center items-center h-screen"><p>Loading user data...</p></div>;
    }

    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role.name)) {
      // Роль не соответствует, useEffect должен был начать редирект.
      // Показываем заглушку.
      return <div className="flex justify-center items-center h-screen"><p>Access Denied. Redirecting...</p></div>;
    }

    // Все проверки пройдены, пользователь аутентифицирован, данные есть, роль подходит.
    return <WrappedComponent {...props} />;
  };

  hoistNonReactStatics(ComponentWithAuth, WrappedComponent);

  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  ComponentWithAuth.displayName = `withAuth(${displayName})`;

  return ComponentWithAuth;
};

export default ProtectedRoute;
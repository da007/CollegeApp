import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { GeistSans } from 'geist/font/sans'; // <--- ДОБАВИТЬ
import { GeistMono } from 'geist/font/mono';   // <--- ДОБАВИТЬ

function MyApp({ Component, pageProps }: AppProps) {
  return (
    // Оборачиваем в div с классами переменных шрифтов
    <div className={`${GeistSans.variable} ${GeistMono.variable}`}> {/* <--- ДОБАВИТЬ ОБЕРТКУ */}
      <AuthProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </AuthProvider>
    </div> // <--- ЗАКРЫТЬ ОБЕРТКУ
  );
}

export default MyApp;
import { Link } from 'react-router-dom';
import PageTitle from '../../components/PageTitle';

const NotFoundPage = () => {
  return (
    <>
      <PageTitle title="404 - Страница не найдена" />
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-boxdark">
        <div className="text-center">
          <div className="mb-8 flex justify-center">
            <svg
              width="120"
              height="120"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-primary"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9 9H9.01"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M15 9H15.01"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          
          <h1 className="mb-4 text-6xl font-bold text-slate-800 dark:text-white">
            404
          </h1>
          
          <h2 className="mb-4 text-2xl font-semibold text-slate-700 dark:text-slate-200">
            Страница не найдена
          </h2>
          
          <p className="mb-8 text-slate-500 dark:text-slate-400">
            Извините, запрашиваемая страница не существует или была перемещена
          </p>
          
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-white transition hover:bg-opacity-90"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9 22V12H15V22"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Вернуться на главную
          </Link>
        </div>
      </div>
    </>
  );
};

export default NotFoundPage;

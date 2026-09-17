import { Link } from 'react-router-dom';
interface BreadcrumbProps {
  pageName: string;
}
const Breadcrumb = ({ pageName }: BreadcrumbProps) => {
  return (
    <div className="mb-6 flex flex-col gap-3  sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-2xl sm:text-title-md2 font-semibold text-black dark:text-white">
        {pageName}
      </h2>

      <nav >
        <ol className="sm:flex hidden items-center gap-2">
          <li>
            <Link className="font-medium" to="/">
            Главная страница /
            </Link>
          </li>
          <li className="font-medium text-primary">{pageName}</li>
        </ol>
      </nav>
    </div>
  );
};

export default Breadcrumb;

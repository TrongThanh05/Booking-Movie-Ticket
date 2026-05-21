/**
 * PageBreadCrumb.jsx — Breadcrumb navigation component
 */
import { Link } from 'react-router-dom';

const PageBreadCrumb = ({ pageTitle, items = [] }) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
        {pageTitle}
      </h2>
      <nav>
        <ol className="flex items-center gap-1.5 text-sm">
          <li>
            <Link
              to="/admin"
              className="text-gray-500 hover:text-brand-500 dark:text-gray-400"
            >
              Dashboard
            </Link>
          </li>
          {items.map((item, idx) => (
            <li key={idx} className="flex items-center gap-1.5">
              <span className="text-gray-400 dark:text-gray-500">/</span>
              {item.path ? (
                <Link
                  to={item.path}
                  className="text-gray-500 hover:text-brand-500 dark:text-gray-400"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-gray-800 dark:text-white/90">
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
};

export default PageBreadCrumb;

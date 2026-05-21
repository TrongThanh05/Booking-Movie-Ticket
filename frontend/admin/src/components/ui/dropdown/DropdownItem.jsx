/**
 * DropdownItem.jsx — Individual dropdown menu item
 */
export const DropdownItem = ({
  children,
  onClick,
  className = '',
  danger = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
      ${danger
        ? 'text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10'
        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5'
      } ${className}`}
  >
    {children}
  </button>
);

export default DropdownItem;

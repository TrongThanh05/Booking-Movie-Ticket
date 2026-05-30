/**
 * Dropdown.jsx — Generic dropdown container
 * Used by NotificationDropdown, UserDropdown, etc.
 */
import { useRef, useEffect } from 'react';

export const Dropdown = ({ isOpen, onClose, children, className = '', align = 'right' }) => {
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const alignClass = align === 'right' ? 'right-0' : 'left-0';

  return (
    <div
      ref={ref}
      className={`absolute ${alignClass} z-99 mt-2 rounded-xl border border-gray-200 bg-white shadow-theme-lg
        dark:border-gray-800 dark:bg-gray-900 ${className}`}
    >
      {children}
    </div>
  );
};

export default Dropdown;

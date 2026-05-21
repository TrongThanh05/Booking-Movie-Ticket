/**
 * Badge.jsx — Status / label badge component
 * Variants: light (default) | solid
 * Colors: primary, success, error, warning, info, light, dark
 */
const colorMap = {
  light: {
    primary: 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400',
    success: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400',
    error: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400',
    warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400',
    info: 'bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400',
    light: 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-400',
    dark: 'bg-gray-800 text-white dark:bg-white/10 dark:text-white/80',
  },
  solid: {
    primary: 'bg-brand-500 text-white',
    success: 'bg-success-500 text-white',
    error: 'bg-error-500 text-white',
    warning: 'bg-warning-500 text-white',
    info: 'bg-blue-light-500 text-white',
    light: 'bg-gray-200 text-gray-800',
    dark: 'bg-gray-800 text-white',
  },
};

const Badge = ({ children, variant = 'light', color = 'primary', size = 'md', className = '' }) => {
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-sm';
  const colorClass = colorMap[variant]?.[color] || colorMap.light.primary;

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${colorClass} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;

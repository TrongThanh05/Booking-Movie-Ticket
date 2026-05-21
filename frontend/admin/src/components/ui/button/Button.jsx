/**
 * Button.jsx — Reusable button component
 */
const variants = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 shadow-theme-xs',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700',
  danger: 'bg-error-500 text-white hover:bg-error-600',
  ghost: 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5',
  outline: 'border border-brand-500 text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  onClick,
  ...rest
}) => {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 
        ${variants[variant]} ${sizes[size]} 
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''} 
        ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button;

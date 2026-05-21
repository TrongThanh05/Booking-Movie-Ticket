/**
 * InputField.jsx — Reusable form input component
 */
const InputField = ({
  label,
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  className = '',
  ...rest
}) => {
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && <span className="text-error-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 transition-colors
          bg-white border-gray-300 placeholder:text-gray-400
          focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10
          disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500
          dark:bg-gray-900 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-gray-500
          dark:focus:border-brand-400 dark:focus:ring-brand-400/10
          dark:disabled:bg-gray-800 dark:disabled:text-gray-500
          ${error ? 'border-error-500 focus:border-error-500 focus:ring-error-500/10' : ''}`}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-error-500">{error}</p>}
    </div>
  );
};

export default InputField;

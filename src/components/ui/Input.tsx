import { type InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className = '', ...props }, ref) => {
  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {label && <label className="text-sm text-secondary">{label}</label>}
      <input ref={ref} {...props} />
      {error && <span className="text-sm" style={{ color: 'var(--danger)' }}>{error}</span>}
    </div>
  );
});
Input.displayName = 'Input';

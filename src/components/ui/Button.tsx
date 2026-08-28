import React, { type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export const Button = ({ children, variant = 'primary', isLoading, className = '', style = {}, ...props }: ButtonProps) => {
  let baseStyle: React.CSSProperties = {
    padding: '10px 20px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    ...style
  };

  if (variant === 'primary') {
    baseStyle = { ...baseStyle, background: 'var(--accent-primary)', color: '#fff' };
  } else if (variant === 'secondary') {
    baseStyle = { ...baseStyle, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: '#fff' };
  } else if (variant === 'danger') {
    baseStyle = { ...baseStyle, background: 'var(--danger)', color: '#fff' };
  }

  return (
    <button style={baseStyle} className={className} disabled={isLoading || props.disabled} {...props}>
      {isLoading ? "Loading..." : children}
    </button>
  );
};

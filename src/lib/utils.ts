export const formatDate = (dateString: string | Date | undefined | null) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export const selectStyles = {
  control: (base: any) => ({ 
    ...base, 
    background: 'var(--bg-main)', 
    borderColor: 'var(--border-light)', 
    minHeight: '42px', 
    height: '100%',
    borderRadius: '8px',
    boxShadow: 'none', 
    '&:hover': { borderColor: 'var(--accent-blue)' } 
  }),
  valueContainer: (base: any) => ({ ...base, padding: '0 14px' }),
  input: (base: any) => ({ ...base, color: 'var(--text-primary)', margin: 0, padding: 0 }),
  dropdownIndicator: (base: any) => ({ ...base, padding: '8px 14px' }),
  clearIndicator: (base: any) => ({ ...base, padding: '8px 14px' }),
  singleValue: (base: any) => ({ ...base, color: 'var(--text-primary)' }),
  menu: (base: any) => ({ ...base, background: 'var(--bg-card)', zIndex: 999, border: '1px solid var(--border-light)', borderRadius: '8px', marginTop: '4px' }),
  option: (base: any, state: any) => ({ 
    ...base, 
    background: state.isFocused ? 'var(--bg-hover)' : 'transparent', 
    color: 'var(--text-primary)', 
    cursor: 'pointer', 
    padding: '10px 14px',
    '&:active': { background: 'var(--accent-blue)', color: 'white' } 
  }),
};

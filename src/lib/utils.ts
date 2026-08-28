export const formatDate = (dateString: string | Date | undefined | null) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export const selectStyles = {
  control: (base: any) => ({ ...base, background: 'var(--bg-card)', borderColor: 'var(--border-light)', minHeight: '40px', boxShadow: 'none', '&:hover': { borderColor: 'var(--accent-blue)' } }),
  singleValue: (base: any) => ({ ...base, color: 'var(--text-primary)' }),
  menu: (base: any) => ({ ...base, background: 'var(--bg-card)', zIndex: 999, border: '1px solid var(--border-light)' }),
  option: (base: any, state: any) => ({ ...base, background: state.isFocused ? 'var(--bg-hover)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer', '&:active': { background: 'var(--accent-blue)', color: 'white' } }),
  input: (base: any) => ({ ...base, color: 'var(--text-primary)' }),
};

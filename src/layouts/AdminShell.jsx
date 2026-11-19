import AppShell from './AppShell.jsx';

/** Admin area — thin wrapper kept for existing pages; layout lives in AppShell. */
export default function AdminShell({ children, breadcrumb, searchValue, onSearchChange, searchPlaceholder }) {
  return (
    <AppShell
      roleKey="Admin"
      breadcrumb={breadcrumb}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder={searchPlaceholder}
    >
      {children}
    </AppShell>
  );
}

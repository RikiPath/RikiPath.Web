import AppShell from './AppShell.jsx';

/** ContentAuthor area — thin wrapper kept for existing pages; layout lives in AppShell. */
export default function ContentAuthorShell({ children, breadcrumb, searchValue, onSearchChange, searchPlaceholder }) {
  return (
    <AppShell
      roleKey="ContentAuthor"
      breadcrumb={breadcrumb}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder={searchPlaceholder}
    >
      {children}
    </AppShell>
  );
}

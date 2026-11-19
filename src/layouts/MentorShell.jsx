import AppShell from './AppShell.jsx';

/** Mentor area — thin wrapper kept for existing pages; layout lives in AppShell. */
export default function MentorShell({ children, breadcrumb, searchValue, onSearchChange, searchPlaceholder }) {
  return (
    <AppShell
      roleKey="Mentor"
      breadcrumb={breadcrumb}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder={searchPlaceholder}
    >
      {children}
    </AppShell>
  );
}

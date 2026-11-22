import AppShell from './AppShell.jsx';

/** Learner area — thin wrapper kept for existing pages; layout lives in AppShell. */
export default function LearnerShell({ children, breadcrumb, searchValue, onSearchChange, searchPlaceholder }) {
  return (
    <AppShell
      roleKey="Learner"
      breadcrumb={breadcrumb}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder={searchPlaceholder}
    >
      {children}
    </AppShell>
  );
}

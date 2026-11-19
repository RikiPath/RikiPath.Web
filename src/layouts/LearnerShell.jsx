import AppShell from './AppShell.jsx';
import { SmartNotebookProvider } from '@/features/notebook/context/SmartNotebookContext.jsx';
import FloatingNotebookWidget from '@/features/notebook/components/FloatingNotebookWidget.jsx';
import LearnerSelectionCaptureLayer from '@/features/notebook/components/LearnerSelectionCaptureLayer.jsx';

/** Learner area — mounts Smart Notebook floating dock & contextual selection capture for Learners. */
export default function LearnerShell({ children, breadcrumb, searchValue, onSearchChange, searchPlaceholder }) {
  return (
    <SmartNotebookProvider roleKey="Learner">
      <AppShell
        roleKey="Learner"
        breadcrumb={breadcrumb}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
      >
        {children}
      </AppShell>
      <LearnerSelectionCaptureLayer />
      <FloatingNotebookWidget />
    </SmartNotebookProvider>
  );
}

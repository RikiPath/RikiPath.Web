import { lazy, Suspense } from 'react';
import AppShell from './AppShell.jsx';
import { FloatingWidgetProvider } from '@/features/floating-widgets';
import { SmartNotebookProvider } from '@/features/notebook/context/SmartNotebookContext.jsx';
import FloatingNotebookWidget from '@/features/notebook/components/FloatingNotebookWidget.jsx';
import LearnerSelectionCaptureLayer from '@/features/notebook/components/LearnerSelectionCaptureLayer.jsx';

// Learning Moments: one app-level celebration coordinator (lazy: loads only for learner pages).
const LearningMomentsManager = lazy(() => import('@/features/learning-moments/LearningMomentsManager.jsx'));

/** Learner area — mounts Smart Notebook dock on a shared draggable collision-aware dock layer. */
export default function LearnerShell({ children, breadcrumb, searchValue, onSearchChange, searchPlaceholder }) {
  return (
    <SmartNotebookProvider roleKey="Learner">
      <FloatingWidgetProvider>
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
        <Suspense fallback={null}>
          <LearningMomentsManager />
        </Suspense>
      </FloatingWidgetProvider>
    </SmartNotebookProvider>
  );
}

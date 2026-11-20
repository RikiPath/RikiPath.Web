import { createContext, useContext, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ACCESS } from '@/features/entitlements/featureAccess.js';
import { useStudyAccess } from '@/features/entitlements/useStudyAccess.js';
import { useSmartNotebook } from '@/features/notebook/hooks/useSmartNotebook.js';
import { isNotebookCaptureSupportedOnPath } from '@/features/notebook/utils/notebookModel.js';

const SmartNotebookContext = createContext(null);

export function SmartNotebookProvider({ roleKey = '', children }) {
  const location = useLocation();
  const isLearner = String(roleKey || '').toLowerCase() === 'learner';
  const { status: studyStatus, isLocked } = useStudyAccess();
  // Notebook routes (`/kanji-notebook`, `/vocabulary`) require the Self-Study plan.
  // When locked (or still checking subscription), hide the floating dock & skip 403 API fetches.
  const notebookLocked = isLearner && (
    studyStatus === ACCESS.LOADING
    || studyStatus === ACCESS.FORBIDDEN
    || isLocked('/kanji-notebook')
    || isLocked('/vocabulary')
  );
  const notebookAvailable = isLearner && !notebookLocked;

  const notebook = useSmartNotebook({ enabled: notebookAvailable });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeHighlightDetail, setActiveHighlightDetail] = useState(null);
  const [quickSaveRequest, setQuickSaveRequest] = useState(null);

  const policy = useMemo(
    () => isNotebookCaptureSupportedOnPath(location.pathname),
    [location.pathname]
  );

  const currentUrlKey = `${location.pathname}${location.search || ''}`;
  const pageHighlights = useMemo(
    () => (notebookAvailable ? notebook.highlightsForPath(currentUrlKey) : []),
    [notebookAvailable, notebook, currentUrlKey]
  );

  const value = useMemo(() => ({
    ...notebook,
    isLearner,
    notebookLocked,
    notebookAvailable,
    policy,
    currentUrlKey,
    pageHighlights,
    drawerOpen: notebookAvailable ? drawerOpen : false,
    setDrawerOpen,
    activeHighlightDetail: notebookAvailable ? activeHighlightDetail : null,
    setActiveHighlightDetail,
    quickSaveRequest: notebookAvailable ? quickSaveRequest : null,
    setQuickSaveRequest,
  }), [
    notebook,
    isLearner,
    notebookLocked,
    notebookAvailable,
    policy,
    currentUrlKey,
    pageHighlights,
    drawerOpen,
    activeHighlightDetail,
    quickSaveRequest,
  ]);

  return (
    <SmartNotebookContext.Provider value={value}>
      {children}
    </SmartNotebookContext.Provider>
  );
}

export function useOptionalSmartNotebook() {
  return useContext(SmartNotebookContext);
}

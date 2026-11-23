import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useStudyAccess } from '@/features/entitlements/useStudyAccess.js';
import { useSmartNotebook } from '@/features/notebook/hooks/useSmartNotebook.js';
import { isNotebookCaptureSupportedOnPath } from '@/features/notebook/utils/notebookModel.js';

import { SmartNotebookContext } from './smartNotebookState.js';

export function SmartNotebookProvider({ roleKey = '', children }) {
  const location = useLocation();
  const isLearner = String(roleKey || '').toLowerCase() === 'learner';
  const { featureByCode, isLocked } = useStudyAccess();
  // Sổ tay cá nhân (`PERSONAL_NOTEBOOK`) is Core Free for learners unless Admin explicitly restricts it.
  const notebookPolicy = featureByCode?.PERSONAL_NOTEBOOK;
  const notebookLocked = isLearner && (
    notebookPolicy ? notebookPolicy.allowed !== true : isLocked('/kanji-notebook')
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
    () => (isLearner ? notebook.highlightsForPath(currentUrlKey) : []),
    [isLearner, notebook, currentUrlKey]
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
    activeHighlightDetail: isLearner ? activeHighlightDetail : null,
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

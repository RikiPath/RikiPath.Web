import { createContext, useContext, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSmartNotebook } from '@/features/notebook/hooks/useSmartNotebook.js';
import { isNotebookCaptureSupportedOnPath } from '@/features/notebook/utils/notebookModel.js';

const SmartNotebookContext = createContext(null);

export function SmartNotebookProvider({ roleKey = '', children }) {
  const location = useLocation();
  const isLearner = String(roleKey || '').toLowerCase() === 'learner';
  const notebook = useSmartNotebook({ enabled: isLearner });
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
    policy,
    currentUrlKey,
    pageHighlights,
    drawerOpen,
    setDrawerOpen,
    activeHighlightDetail,
    setActiveHighlightDetail,
    quickSaveRequest,
    setQuickSaveRequest,
  }), [
    notebook,
    isLearner,
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
